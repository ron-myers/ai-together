import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas. One source of truth for parse and import validation (PRD §12).
// Kept permissive: nearly everything is optional so a title/date/host-only
// session parses cleanly (acceptance criteria §13).
// ---------------------------------------------------------------------------

export const LinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
})
export type Link = z.infer<typeof LinkSchema>

export const PhotoSchema = z.object({
  src: z.string().min(1),
  alt: z.string().optional().default(''),
  caption: z.string().optional(),
})
export type Photo = z.infer<typeof PhotoSchema>

// Frontmatter as written in the file. `date` accepted as string or Date
// (gray-matter/js-yaml turns bare YAML dates into Date objects).
export const SessionMetaSchema = z.object({
  title: z.string().min(1, 'title is required'),
  date: z
    .union([z.string(), z.date()])
    .transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
  host: z.string().min(1, 'host is required'),
  hostContact: z.string().optional(),
  location: z.string().optional(),
  attendance: z.number().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  photos: z.array(PhotoSchema).optional().default([]),
  published: z.boolean().optional().default(true),
})
export type SessionMeta = z.infer<typeof SessionMetaSchema>

// Per-block YAML fence metadata. All optional.
export const BlockMetaSchema = z.object({
  kind: z.string().optional(),
  presenter: z.string().optional(),
  contact: z.string().optional(),
  takeaway: z.string().optional(),
  links: z.array(LinkSchema).optional().default([]),
})
export type BlockMeta = z.infer<typeof BlockMetaSchema>

// ---------------------------------------------------------------------------
// Parsed shapes (not schemas — produced by the parser).
// ---------------------------------------------------------------------------

export interface ParseError {
  /** 1-based line number in the source file. */
  line: number
  message: string
}

export interface Block {
  /** 0-based position in the file = order in the room. */
  index: number
  /** 1-based line of the block's heading, for editor jump-to. */
  headingLine: number
  /** Heading text = display title. */
  title: string
  meta: BlockMeta
  /** Body markdown after the (optional) YAML fence. */
  body: string
  /** Set when the block's YAML fence failed to parse; body still renders. */
  error?: ParseError
}

export interface Session {
  slug: string
  meta: SessionMeta
  /** Markdown above the first level-2 heading (session intro). */
  intro: string
  blocks: Block[]
  /** File-level parse errors (frontmatter). Body still renders when possible. */
  errors: ParseError[]
  /** Raw source, round-trippable. */
  raw: string
}

export interface SessionSummary {
  slug: string
  title: string
  date: string
  host: string
  summary: string
  tags: string[]
  presenters: string[]
  leadPhoto?: Photo
  published: boolean
  blockCount: number
}

// Export bundle: a virtual folder of files, zipped by the caller.
export interface BundleFile {
  path: string
  /** Text content, or binary for images. */
  data: string | Uint8Array | Blob
}
export interface Bundle {
  name: string
  files: BundleFile[]
}
