import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSession, toSummary } from '../parse'
import type { Session, SessionSummary, Bundle } from '../types'
import { buildArchiveBundle, buildSessionBundle } from '../bundle'
import type { SessionStore, StoreKind } from './types'

// Published layer for the public routes (PRD §5.1). Reads committed markdown
// at build time. Read-only: save/remove/import are no-ops. Swapping this for a
// Supabase store touches only this file (acceptance §13).

const CONTENT_DIR = path.join(process.cwd(), 'content', 'sessions')

async function readAllRaw(): Promise<{ slug: string; raw: string }[]> {
  let names: string[]
  try {
    names = await fs.readdir(CONTENT_DIR)
  } catch {
    return [] // no content dir yet
  }
  const md = names.filter((n) => n.endsWith('.md'))
  return Promise.all(
    md.map(async (name) => ({
      slug: name.replace(/\.md$/, ''),
      raw: await fs.readFile(path.join(CONTENT_DIR, name), 'utf8'),
    })),
  )
}

export class FileSessionStore implements SessionStore {
  readonly kind: StoreKind = 'filesystem'

  async list(): Promise<SessionSummary[]> {
    const all = await readAllRaw()
    return all
      .map(({ slug, raw }) => toSummary(parseSession(raw, slug)))
      .filter((s) => s.published)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  async get(slug: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(path.join(CONTENT_DIR, `${slug}.md`), 'utf8')
      return parseSession(raw, slug)
    } catch {
      return null
    }
  }

  async save(session: Session): Promise<Session> {
    return session // no-op: publishing happens via git commit
  }

  async remove(): Promise<void> {
    // no-op
  }

  async exportBundle(slug: string): Promise<Bundle> {
    const session = await this.get(slug)
    if (!session) throw new Error(`No session "${slug}"`)
    return buildSessionBundle(session)
  }

  async exportArchive(): Promise<Bundle> {
    const all = await readAllRaw()
    return buildArchiveBundle(
      all.map(({ slug, raw }) => ({ session: parseSession(raw, slug) })),
    )
  }

  async importMarkdown(): Promise<Session> {
    throw new Error('FileSessionStore is read-only')
  }

  async importArchive(): Promise<Session[]> {
    throw new Error('FileSessionStore is read-only')
  }
}

let singleton: FileSessionStore | null = null
export function fileStore(): FileSessionStore {
  if (!singleton) singleton = new FileSessionStore()
  return singleton
}
