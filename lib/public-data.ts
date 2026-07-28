import 'server-only'
import { fileStore } from './store/filesystem'
import type { Session } from './types'

// Load every published session in full, newest first. Shared by the derived
// public pages (presenters, takeaways, prev/next).
export async function publishedSessions(): Promise<Session[]> {
  const store = fileStore()
  const summaries = await store.list() // already filtered to published + sorted
  const sessions: Session[] = []
  for (const s of summaries) {
    const full = await store.get(s.slug)
    if (full) sessions.push(full)
  }
  return sessions
}
