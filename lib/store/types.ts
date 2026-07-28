import type { Bundle, Session, SessionSummary } from '../types'

// Every read and write goes through this interface (PRD §5.2). Swapping the
// implementation that backs a route is a one-file change (acceptance §13).

export type StoreKind = 'local' | 'filesystem' | 'supabase'

export interface SessionStore {
  readonly kind: StoreKind
  list(): Promise<SessionSummary[]>
  get(slug: string): Promise<Session | null>
  /** Persist a session. No-op on read-only stores (filesystem). */
  save(session: Session): Promise<Session>
  /** Remove a session. No-op on read-only stores (filesystem). */
  remove(slug: string): Promise<void>
  exportBundle(slug: string): Promise<Bundle>
  exportArchive(): Promise<Bundle>
  importMarkdown(file: File): Promise<Session>
  importArchive(file: File): Promise<Session[]>
}
