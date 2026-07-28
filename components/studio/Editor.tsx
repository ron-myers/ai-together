'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { localStore } from '@/lib/store/local'
import { parseSession } from '@/lib/parse'
import { renderMarkdown } from '@/lib/markdown'
import { blockSnippet, YAML_FENCE_SNIPPET, LINK_SNIPPET } from '@/lib/templates'
import { downloadBundle } from '@/lib/download'
import type { ParseError, Session } from '@/lib/types'
import { KindBadge } from '@/components/KindBadge'
import { Prose } from '@/components/Prose'
import { formatDate, weekNumber } from '@/lib/site'

const cmTheme = EditorView.theme({
  '&': { fontSize: '14px', height: '100%', background: 'var(--paper)' },
  '.cm-content': {
    fontFamily: 'var(--font-mono)',
    color: 'var(--ink)',
    caretColor: 'var(--red)',
  },
  '.cm-gutters': {
    background: 'var(--panel)',
    color: 'var(--ink-soft)',
    border: 'none',
  },
  '.cm-activeLine': { background: 'color-mix(in srgb, var(--gold) 8%, transparent)' },
  '.cm-activeLineGutter': { background: 'transparent' },
  '&.cm-focused': { outline: 'none' },
})

// A "document" = one step of the run sheet. Doc 0 is the session itself
// (frontmatter + intro); each following doc is one block. The underlying file
// stays a single Markdown source of truth; we just edit one segment at a time.
interface Segment {
  key: string
  label: string
  text: string
  kind?: string
  error?: ParseError
  startLine: number
  isSession: boolean
}

function splitSegments(raw: string, session: Session): Segment[] {
  const lines = raw.split('\n')
  const blocks = session.blocks
  const firstLine = blocks[0]?.headingLine ?? lines.length + 1
  const segs: Segment[] = [
    {
      key: 'session',
      label: 'Session details',
      text: lines.slice(0, firstLine - 1).join('\n'),
      startLine: 1,
      isSession: true,
      error: session.errors[0],
    },
  ]
  blocks.forEach((b, i) => {
    const end = blocks[i + 1]?.headingLine ?? lines.length + 1
    segs.push({
      key: `b${i}`,
      label: b.title || 'Untitled block',
      text: lines.slice(b.headingLine - 1, end - 1).join('\n'),
      kind: b.meta.kind,
      error: b.error,
      startLine: b.headingLine,
      isSession: false,
    })
  })
  return segs
}

export function Editor({ slug }: { slug: string }) {
  const [raw, setRaw] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [introHtml, setIntroHtml] = useState('')
  const [blockHtml, setBlockHtml] = useState<string[]>([])
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  // Load once.
  useEffect(() => {
    localStore()
      .get(slug)
      .then((s) => {
        if (s) {
          setRaw(s.raw)
          setSavedAt(localStore().updatedAt(slug))
        } else setNotFound(true)
      })
  }, [slug])

  // Parse synchronously on every change (cheap) for the doc list + errors.
  useEffect(() => {
    if (raw == null) return
    setSession(parseSession(raw, slug))
  }, [raw, slug])

  // Debounced render (150ms) + autosave (400ms).
  useEffect(() => {
    if (raw == null || session == null) return
    const renderT = setTimeout(async () => {
      setIntroHtml(await renderMarkdown(session.intro))
      setBlockHtml(await Promise.all(session.blocks.map((b) => renderMarkdown(b.body))))
    }, 150)
    const saveT = setTimeout(async () => {
      await localStore().saveRaw(slug, raw)
      setSavedAt(localStore().updatedAt(slug))
      setSaving(false)
    }, 400)
    return () => {
      clearTimeout(renderT)
      clearTimeout(saveT)
    }
  }, [raw, session, slug])

  const segments = useMemo(
    () => (session && raw != null ? splitSegments(raw, session) : []),
    [raw, session],
  )
  const active = Math.min(activeIdx, Math.max(0, segments.length - 1))
  const activeSeg: Segment | undefined = segments[active]

  // Write an edited doc back into the full file (source of truth).
  const onDocChange = useCallback(
    (newText: string) => {
      const texts = segments.map((s) => s.text)
      texts[active] = newText
      setSaving(true)
      setRaw(texts.join('\n'))
    },
    [segments, active],
  )

  const insert = useCallback((text: string) => {
    const view = cmRef.current?.view
    if (!view) return
    const pos = view.state.selection.main.head
    view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length },
    })
    view.focus()
  }, [])

  const addBlock = useCallback(() => {
    setRaw((r) => (r ?? '') + blockSnippet())
    setSaving(true)
    setActiveIdx(9999) // clamps to the new last doc
  }, [])

  const jumpToLine = useCallback((absLine: number, seg?: Segment) => {
    const view = cmRef.current?.view
    if (!view) return
    const rel = seg ? Math.max(1, absLine - seg.startLine + 1) : absLine
    const target = view.state.doc.line(Math.min(rel, view.state.doc.lines))
    view.dispatch({
      selection: { anchor: target.from },
      effects: EditorView.scrollIntoView(target.from, { y: 'start' }),
    })
    view.focus()
  }, [])

  const extensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, cmTheme],
    [],
  )

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="font-display text-2xl text-ink">No draft “{slug}”.</p>
        <Link href="/studio" className="mt-4 inline-block text-red">
          ← Back to run sheets
        </Link>
      </div>
    )
  }
  if (raw == null || session == null || !activeSeg) {
    return <p className="px-5 py-10 text-ink-soft">Loading…</p>
  }

  const blockCount = segments.length - 1
  const stepLabel = activeSeg.isSession
    ? 'Session details'
    : `Step ${active} of ${blockCount}`

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/studio"
            className="mono shrink-0 text-[0.72rem] uppercase tracking-wider no-underline hover:underline"
          >
            ← Studio
          </Link>
          <span className="mono truncate text-sm text-ink-soft">{slug}.md</span>
          <span
            className="mono text-[0.68rem]"
            style={{ color: saving ? 'var(--ink-soft)' : 'var(--gold-deep)' }}
          >
            {saving
              ? 'Saving…'
              : savedAt
                ? `✓ Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/studio/${slug}/present`}
            className="rounded-md border border-rule px-3 py-1 no-underline hover:border-rule-strong"
          >
            Present
          </Link>
          <button
            type="button"
            onClick={async () => downloadBundle(await localStore().exportBundle(slug))}
            className="rounded-md border border-rule px-3 py-1 hover:border-rule-strong"
          >
            Export
          </button>
        </div>
      </header>

      {/* Step nav + toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-panel px-4 py-1.5 text-[0.8rem]">
        <button
          type="button"
          onClick={() => setActiveIdx(Math.max(0, active - 1))}
          disabled={active === 0}
          className="mono rounded border border-rule-strong bg-paper px-2 py-0.5 text-[0.72rem] text-ink-soft disabled:opacity-40"
        >
          ‹ Prev
        </button>
        <span className="mono min-w-28 text-center text-[0.72rem] text-ink-soft">
          {stepLabel}
        </span>
        <button
          type="button"
          onClick={() => setActiveIdx(Math.min(segments.length - 1, active + 1))}
          disabled={active === segments.length - 1}
          className="mono rounded border border-rule-strong bg-paper px-2 py-0.5 text-[0.72rem] text-ink-soft disabled:opacity-40"
        >
          Next ›
        </button>
        <span className="mx-1 h-4 w-px bg-rule-strong" />
        {!activeSeg.isSession && (
          <>
            <ToolBtn onClick={() => insert(YAML_FENCE_SNIPPET)}>+ Metadata</ToolBtn>
            <ToolBtn onClick={() => insert(`![alt text](/sessions/${slug}/photo.jpg)\n`)}>
              + Photo
            </ToolBtn>
            <ToolBtn onClick={() => insert(LINK_SNIPPET)}>+ Link</ToolBtn>
          </>
        )}
        <ToolBtn onClick={addBlock}>+ New step</ToolBtn>
      </div>

      {/* Body: doc rail | editor | preview */}
      <div className="flex min-h-0 flex-1">
        {/* Document rail */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-rule px-3 py-4 md:block">
          <p className="eyebrow mb-3 px-1">Steps</p>
          <ol className="flex flex-col gap-1">
            {segments.map((seg, i) => {
              const isActive = i === active
              return (
                <li key={seg.key}>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                    style={{
                      background: isActive
                        ? 'color-mix(in srgb, var(--gold) 14%, var(--paper))'
                        : 'transparent',
                    }}
                  >
                    <span
                      className="mono mt-0.5 w-5 shrink-0 text-[0.7rem]"
                      style={{ color: seg.error ? 'var(--red)' : 'var(--ink-soft)' }}
                    >
                      {seg.error ? '!' : seg.isSession ? '§' : String(i).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block truncate text-[0.88rem] leading-snug"
                        style={{
                          color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {seg.label}
                      </span>
                      {!seg.isSession && seg.kind && (
                        <KindBadge kind={seg.kind} className="mt-1 !text-[0.6rem]" />
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            onClick={addBlock}
            className="mono mt-3 w-full rounded-md border border-dashed border-rule-strong px-2 py-1.5 text-[0.72rem] text-ink-soft transition-colors hover:border-red hover:text-red"
          >
            + New step
          </button>
        </aside>

        {/* Editor pane — one document */}
        <div className="min-w-0 flex-1 overflow-hidden border-r border-rule">
          <CodeMirror
            key={activeSeg.key}
            ref={cmRef}
            value={activeSeg.text}
            onChange={onDocChange}
            extensions={extensions}
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
            height="100%"
            style={{ height: '100%' }}
          />
        </div>

        {/* Preview — just this document */}
        <div className="hidden min-w-0 flex-1 overflow-y-auto bg-paper lg:block">
          <ActivePreview
            seg={activeSeg}
            session={session}
            introHtml={introHtml}
            blockIndex={activeSeg.isSession ? -1 : active - 1}
            blockHtml={blockHtml}
            onFixError={(line) => jumpToLine(line, activeSeg)}
          />
        </div>
      </div>
    </div>
  )
}

function ActivePreview({
  seg,
  session,
  introHtml,
  blockIndex,
  blockHtml,
  onFixError,
}: {
  seg: Segment
  session: Session
  introHtml: string
  blockIndex: number
  blockHtml: string[]
  onFixError: (line: number) => void
}) {
  if (seg.isSession) {
    const { meta } = session
    const wk = weekNumber(meta.date)
    return (
      <div className="px-8 py-8">
        <p className="eyebrow">
          {wk ? `Week ${wk} · ` : ''}
          {meta.date ? formatDate(meta.date) : 'No date set'}
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          {meta.title || 'Untitled session'}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {meta.host ? `Hosted by ${meta.host}` : 'No host set'}
          {typeof meta.attendance === 'number' ? ` · ${meta.attendance} in the room` : ''}
        </p>
        {seg.error && <ErrorBanner error={seg.error} onFix={onFixError} />}
        {introHtml ? (
          <div
            className="prose mt-6 text-[1.02rem]"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        ) : (
          <p className="mt-6 text-ink-soft">
            Anything above the first heading is the session intro.
          </p>
        )}
        <p className="mono mt-10 text-[0.72rem] uppercase tracking-wider text-ink-soft">
          {session.blocks.length} step{session.blocks.length === 1 ? '' : 's'} in this run sheet
        </p>
      </div>
    )
  }

  const b = session.blocks[blockIndex]
  if (!b) return null
  return (
    <div className="px-8 py-8">
      <div className="mb-2 flex items-center gap-2">
        <span className="mono text-[0.75rem] text-ink-soft">
          {String(blockIndex + 1).padStart(2, '0')}
        </span>
        <KindBadge kind={b.meta.kind} />
        {b.meta.presenter && (
          <span className="text-sm text-ink-soft">{b.meta.presenter}</span>
        )}
      </div>
      <h2 className="font-display text-2xl text-ink">{b.title}</h2>
      {b.error && <ErrorBanner error={b.error} onFix={onFixError} />}
      {b.meta.takeaway && (
        <p className="mt-3 border-l-[3px] border-gold pl-4 italic text-ink">
          {b.meta.takeaway}
        </p>
      )}
      {blockHtml[blockIndex] && <Prose html={blockHtml[blockIndex]} className="mt-3" />}
      {b.meta.links.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {b.meta.links.map((l, j) => (
            <li key={j}>
              <span className="text-red">↗ {l.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ErrorBanner({
  error,
  onFix,
}: {
  error: ParseError
  onFix: (line: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onFix(error.line)}
      className="mono mt-3 block w-full rounded-md border border-red/40 bg-red/5 px-3 py-2 text-left text-[0.78rem] text-red"
    >
      Line {error.line}: {error.message}
    </button>
  )
}

function ToolBtn({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono rounded border border-rule-strong bg-paper px-2 py-0.5 text-[0.72rem] text-ink-soft transition-colors hover:border-red hover:text-red"
    >
      {children}
    </button>
  )
}
