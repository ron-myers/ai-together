import { kindMeta } from './kinds'
import { sessionPresenters } from './parse'
import type { Session } from './types'

// Build-time derivations for /presenters and /takeaways (PRD §10.4). Names are
// normalised on trim + case-insensitive match. Contact addresses are never
// rendered publicly — only surfaced in the studio.

export interface PresenterBlockRef {
  slug: string
  date: string
  sessionTitle: string
  blockTitle: string
  kind: string | null
  takeaway?: string
}

export interface PresenterEntry {
  /** Display name (first-seen casing). */
  name: string
  /** URL-safe key. */
  key: string
  blocks: PresenterBlockRef[]
}

export function presenterKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildPresenterIndex(sessions: Session[]): PresenterEntry[] {
  const map = new Map<string, PresenterEntry>()
  // newest first for a nicer default order
  const ordered = [...sessions].sort((a, b) =>
    a.meta.date < b.meta.date ? 1 : -1,
  )
  for (const session of ordered) {
    for (const block of session.blocks) {
      const name = block.meta.presenter?.trim()
      if (!name) continue
      const key = presenterKey(name)
      if (!map.has(key)) map.set(key, { name, key, blocks: [] })
      map.get(key)!.blocks.push({
        slug: session.slug,
        date: session.meta.date,
        sessionTitle: session.meta.title,
        blockTitle: block.title,
        kind: kindMeta(block.meta.kind)?.kind ?? null,
        takeaway: block.meta.takeaway?.trim() || undefined,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function findPresenter(
  sessions: Session[],
  key: string,
): PresenterEntry | null {
  return buildPresenterIndex(sessions).find((p) => p.key === key) ?? null
}

export interface TakeawayEntry {
  takeaway: string
  slug: string
  date: string
  sessionTitle: string
  blockTitle: string
  kind: string | null
  presenter?: string
}

export function buildTakeaways(sessions: Session[]): TakeawayEntry[] {
  const out: TakeawayEntry[] = []
  for (const session of sessions) {
    for (const block of session.blocks) {
      const takeaway = block.meta.takeaway?.trim()
      if (!takeaway) continue
      out.push({
        takeaway,
        slug: session.slug,
        date: session.meta.date,
        sessionTitle: session.meta.title,
        blockTitle: block.title,
        kind: kindMeta(block.meta.kind)?.kind ?? null,
        presenter: block.meta.presenter?.trim() || undefined,
      })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Distinct presenters shown on a session for a quick credit line. */
export function sessionCredit(session: Session): string {
  const names = sessionPresenters(session)
  return names.length ? names.join(', ') : session.meta.host
}
