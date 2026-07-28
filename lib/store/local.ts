'use client'

import JSZip from 'jszip'
import { parseSession, toSummary } from '../parse'
import type { Session, SessionSummary, Bundle } from '../types'
import {
  buildArchiveBundle,
  buildSessionBundle,
  type ImageBlob,
} from '../bundle'
import type { SessionStore, StoreKind } from './types'

// Draft layer for /studio (PRD §5.1). Everything lives in localStorage until
// export. Image blobs are held in memory only — they do not survive a refresh
// (accepted in §14), so previews fall back to the path string.

const INDEX_KEY = 'ait:index'
const rawKey = (slug: string) => `ait:s:${slug}`
const tsKey = (slug: string) => `ait:ts:${slug}`

// slug -> filename -> Blob. Session-lifetime only.
const imageMemory = new Map<string, Map<string, Blob>>()

function ls(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('LocalSessionStore is client-only')
  }
  return window.localStorage
}

function readIndex(): string[] {
  try {
    const raw = ls().getItem(INDEX_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeIndex(slugs: string[]): void {
  ls().setItem(INDEX_KEY, JSON.stringify([...new Set(slugs)]))
}

export function slugFromFilename(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export class LocalSessionStore implements SessionStore {
  readonly kind: StoreKind = 'local'

  has(slug: string): boolean {
    return readIndex().includes(slug)
  }

  updatedAt(slug: string): number | null {
    const v = ls().getItem(tsKey(slug))
    return v ? Number(v) : null
  }

  async list(): Promise<SessionSummary[]> {
    const summaries = readIndex()
      .map((slug) => {
        const raw = ls().getItem(rawKey(slug))
        if (raw == null) return null
        return toSummary(parseSession(raw, slug))
      })
      .filter((s): s is SessionSummary => s !== null)
    return summaries.sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  async get(slug: string): Promise<Session | null> {
    const raw = ls().getItem(rawKey(slug))
    return raw == null ? null : parseSession(raw, slug)
  }

  async save(session: Session): Promise<Session> {
    ls().setItem(rawKey(session.slug), session.raw)
    ls().setItem(tsKey(session.slug), String(nowMs()))
    writeIndex([...readIndex(), session.slug])
    return parseSession(session.raw, session.slug)
  }

  /** Persist raw markdown directly (the editor's hot path). */
  async saveRaw(slug: string, raw: string): Promise<Session> {
    return this.save({ ...parseSession(raw, slug), raw, slug })
  }

  async remove(slug: string): Promise<void> {
    ls().removeItem(rawKey(slug))
    ls().removeItem(tsKey(slug))
    writeIndex(readIndex().filter((s) => s !== slug))
    imageMemory.delete(slug)
  }

  // --- images held for export ---------------------------------------------

  putImage(slug: string, filename: string, blob: Blob): void {
    if (!imageMemory.has(slug)) imageMemory.set(slug, new Map())
    imageMemory.get(slug)!.set(filename, blob)
  }

  getImages(slug: string): ImageBlob[] {
    const m = imageMemory.get(slug)
    if (!m) return []
    return [...m.entries()].map(([filename, data]) => ({ filename, data }))
  }

  // --- export --------------------------------------------------------------

  async exportBundle(slug: string): Promise<Bundle> {
    const session = await this.get(slug)
    if (!session) throw new Error(`No session "${slug}" to export`)
    return buildSessionBundle(session, this.getImages(slug))
  }

  async exportArchive(): Promise<Bundle> {
    const summaries = await this.list()
    const entries = []
    for (const s of summaries) {
      const session = await this.get(s.slug)
      if (session) entries.push({ session, images: this.getImages(s.slug) })
    }
    return buildArchiveBundle(entries)
  }

  // --- import (parse only; caller resolves collisions then saves) ---------

  async importMarkdown(file: File): Promise<Session> {
    const text = await file.text()
    const slug = slugFromFilename(file.name) || 'imported-session'
    return parseSession(text, slug)
  }

  async importArchive(file: File): Promise<Session[]> {
    const zip = await JSZip.loadAsync(file)
    const out: Session[] = []
    const entries = Object.values(zip.files).filter(
      (f) => !f.dir && /\.md$/i.test(f.name),
    )
    for (const entry of entries) {
      const text = await entry.async('string')
      const base = entry.name.split('/').pop() ?? entry.name
      out.push(parseSession(text, slugFromFilename(base)))
    }
    return out
  }
}

// Date.now is unavailable in some sandboxes; guard so the store still works.
function nowMs(): number {
  try {
    return Date.now()
  } catch {
    return 0
  }
}

let singleton: LocalSessionStore | null = null
export function localStore(): LocalSessionStore {
  if (!singleton) singleton = new LocalSessionStore()
  return singleton
}
