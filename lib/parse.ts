import matter from 'gray-matter'
import { load as yamlLoad } from 'js-yaml'
import {
  BlockMetaSchema,
  SessionMetaSchema,
  type Block,
  type BlockMeta,
  type Link,
  type ParseError,
  type Session,
  type SessionMeta,
  type SessionSummary,
} from './types'
import { kindMeta } from './kinds'

// One parser, one behaviour. Pure and synchronous so studio preview, present
// mode, and the static build all agree (PRD §5.3). No DOM, no fs.

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/
const H2 = /^##(?!#)\s+(.+?)\s*$/

// Empty YAML keys (`presenter:` with no value) parse as null. Treat them as
// absent so optional fields don't error — this is the common state of a fresh
// template. Also drops incomplete link rows so an in-progress fence stays
// graceful rather than nuking the whole block's metadata.
function cleanYaml(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    if (k === 'links' && Array.isArray(v)) {
      const links = v.filter(
        (l) => l && typeof l === 'object' && (l as Link).label && (l as Link).url,
      )
      if (links.length) out[k] = links
      continue
    }
    out[k] = v
  }
  return out
}

interface FenceState {
  open: boolean
  marker: string // the run of ` or ~ that opened the fence
}

function fenceToggle(line: string, state: FenceState): void {
  const m = line.match(FENCE)
  if (!m) return
  const marker = m[2]
  if (!state.open) {
    state.open = true
    state.marker = marker[0].repeat(3) // remember ` vs ~
  } else if (marker[0] === state.marker[0] && marker.length >= 3) {
    // Closing fence: same type, no info string.
    if (m[3].trim() === '') state.open = false
  }
}

/** Count the lines the frontmatter block occupies, so body line numbers map
 * back to the original file. Returns 0 when there is no frontmatter. */
function frontmatterLineCount(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return 0
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === '---' || t === '...') return i + 1
  }
  return 0
}

/** Map a failed frontmatter key to its source line for a precise error. */
function frontmatterKeyLine(lines: string[], key: string): number {
  const re = new RegExp(`^\\s*${key}\\s*:`)
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1
  }
  return 1
}

function parseFrontmatter(
  raw: string,
): { meta: SessionMeta; errors: ParseError[] } {
  const lines = raw.split('\n')
  let data: Record<string, unknown> = {}
  try {
    data = matter(raw).data as Record<string, unknown>
  } catch (e) {
    return {
      meta: fallbackMeta(),
      errors: [{ line: 1, message: `Frontmatter YAML failed to parse: ${errMsg(e)}` }],
    }
  }

  const result = SessionMetaSchema.safeParse(cleanYaml(data))
  if (result.success) return { meta: result.data, errors: [] }

  const errors: ParseError[] = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? '')
    return {
      line: key ? frontmatterKeyLine(lines, key) : 1,
      message: key ? `${key}: ${issue.message}` : issue.message,
    }
  })
  // Still return a best-effort meta so the rest of the file renders.
  return { meta: { ...fallbackMeta(), ...coerceMeta(data) }, errors }
}

function fallbackMeta(): SessionMeta {
  return {
    title: 'Untitled session',
    date: '',
    host: '',
    tags: [],
    photos: [],
    published: true,
  }
}

// Salvage whatever fields are individually valid from bad frontmatter.
function coerceMeta(data: Record<string, unknown>): Partial<SessionMeta> {
  const out: Partial<SessionMeta> = {}
  if (typeof data.title === 'string') out.title = data.title
  if (typeof data.host === 'string') out.host = data.host
  if (data.date instanceof Date) out.date = data.date.toISOString().slice(0, 10)
  else if (typeof data.date === 'string') out.date = data.date
  if (typeof data.summary === 'string') out.summary = data.summary
  if (typeof data.location === 'string') out.location = data.location
  if (Array.isArray(data.tags)) out.tags = data.tags.filter((t) => typeof t === 'string')
  return out
}

interface RawBlock {
  title: string
  /** absolute line (1-based) of the heading */
  headingLine: number
  /** body lines with their absolute line numbers */
  lines: { text: string; line: number }[]
}

/** Split body into intro + raw blocks, fence-aware so a `##` inside a code
 * fence never starts a block. */
function splitBlocks(
  body: string,
  offset: number,
): { intro: string; blocks: RawBlock[] } {
  const bodyLines = body.split('\n')
  const state: FenceState = { open: false, marker: '```' }
  const introLines: string[] = []
  const blocks: RawBlock[] = []
  let current: RawBlock | null = null

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i]
    const absLine = offset + i + 1
    const h2 = !state.open ? line.match(H2) : null

    if (h2) {
      current = { title: h2[1], headingLine: absLine, lines: [] }
      blocks.push(current)
    } else if (current) {
      current.lines.push({ text: line, line: absLine })
    } else {
      introLines.push(line)
    }
    fenceToggle(line, state)
  }

  return { intro: introLines.join('\n').trim(), blocks }
}

/** Extract a leading YAML fence (if any) from a block's lines and parse it.
 * Returns the metadata (or error) plus the remaining body markdown. */
function extractBlockMeta(rb: RawBlock): {
  meta: BlockMeta
  body: string
  error?: ParseError
} {
  const emptyMeta = BlockMetaSchema.parse({})
  const lines = rb.lines
  let i = 0
  while (i < lines.length && lines[i].text.trim() === '') i++ // skip blanks

  const openMatch = lines[i]?.text.match(FENCE)
  const isYaml =
    openMatch && /^(yaml|yml)?\s*$/i.test(openMatch[3].trim())
  if (!openMatch || !isYaml) {
    return { meta: emptyMeta, body: joinBody(lines) }
  }

  // Collect fence content until the closing fence.
  const marker = openMatch[2][0]
  const contentStart = i + 1
  let close = -1
  for (let j = contentStart; j < lines.length; j++) {
    const cm = lines[j].text.match(FENCE)
    if (cm && cm[2][0] === marker && cm[3].trim() === '') {
      close = j
      break
    }
  }
  if (close === -1) {
    return {
      meta: emptyMeta,
      body: joinBody(lines),
      error: {
        line: lines[i].line,
        message: 'Metadata fence is never closed. Add a closing ``` line.',
      },
    }
  }

  const yamlText = lines
    .slice(contentStart, close)
    .map((l) => l.text)
    .join('\n')
  const restBody = joinBody(lines.slice(close + 1))
  const fenceContentLine = lines[contentStart]?.line ?? lines[i].line

  let data: unknown
  try {
    data = yamlLoad(yamlText) ?? {}
  } catch (e) {
    return {
      meta: emptyMeta,
      body: restBody,
      error: {
        line: yamlErrorLine(e, fenceContentLine),
        message: `Metadata failed to parse. ${yamlErrorHint(e)}`,
      },
    }
  }

  const parsed = BlockMetaSchema.safeParse(cleanYaml(data))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const key = String(issue.path[0] ?? '')
    return {
      meta: emptyMeta,
      body: restBody,
      error: {
        line: fenceContentLine,
        message: `Metadata ${key ? `field "${key}" ` : ''}is invalid: ${issue.message}`,
      },
    }
  }

  return { meta: parsed.data, body: restBody }
}

function joinBody(lines: { text: string }[]): string {
  return lines.map((l) => l.text).join('\n').trim()
}

interface YamlErrorLike {
  mark?: { line?: number }
  reason?: string
  message?: string
}

function yamlErrorLine(e: unknown, base: number): number {
  const mark = (e as YamlErrorLike)?.mark
  if (mark && typeof mark.line === 'number') return base + mark.line
  return base
}
function yamlErrorHint(e: unknown): string {
  const r = (e as YamlErrorLike)?.reason
  return r ? `Check indentation. ${r}.` : 'Check indentation.'
}
function errMsg(e: unknown): string {
  return (e as YamlErrorLike)?.message ?? String(e)
}

/**
 * Parse a session Markdown file into the shared Session model.
 * @param raw the full file contents
 * @param slug the session slug (usually the filename without extension)
 */
export function parseSession(raw: string, slug: string): Session {
  const lines = raw.split('\n')
  const offset = frontmatterLineCount(lines)
  const body = lines.slice(offset).join('\n')

  const { meta, errors } = parseFrontmatter(raw)
  const { intro, blocks: rawBlocks } = splitBlocks(body, offset)

  const blocks: Block[] = rawBlocks.map((rb, index) => {
    const { meta: bMeta, body: bBody, error } = extractBlockMeta(rb)
    return {
      index,
      headingLine: rb.headingLine,
      title: rb.title,
      meta: bMeta,
      body: bBody,
      error,
    }
  })

  // summary fallback: first paragraph of the first block, else intro (PRD §7.1)
  let summary = meta.summary
  if (!summary) summary = firstParagraph(blocks[0]?.body ?? intro)

  return {
    slug,
    meta: { ...meta, summary },
    intro,
    blocks,
    errors,
    raw,
  }
}

function firstParagraph(md: string): string {
  const para = md.split(/\n\s*\n/).map((p) => p.trim()).find(Boolean)
  return para ? para.replace(/\s+/g, ' ').slice(0, 240) : ''
}

/** Distinct presenter names across a session's blocks, trimmed. */
export function sessionPresenters(session: Session): string[] {
  const seen = new Map<string, string>() // lower -> display
  for (const b of session.blocks) {
    const name = b.meta.presenter?.trim()
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  return [...seen.values()]
}

export function toSummary(session: Session): SessionSummary {
  return {
    slug: session.slug,
    title: session.meta.title,
    date: session.meta.date,
    host: session.meta.host,
    summary: session.meta.summary ?? '',
    tags: session.meta.tags,
    presenters: sessionPresenters(session),
    leadPhoto: session.meta.photos[0],
    published: session.meta.published,
    blockCount: session.blocks.length,
  }
}

/** All distinct kinds present in a session, for archive filtering. */
export function sessionKinds(session: Session): string[] {
  const set = new Set<string>()
  for (const b of session.blocks) {
    const meta = kindMeta(b.meta.kind)
    if (meta) set.add(meta.kind)
  }
  return [...set]
}
