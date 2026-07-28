import type { Metadata } from 'next'
import { fileStore } from '@/lib/store/filesystem'
import { sessionKinds } from '@/lib/parse'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'
import { SessionsBrowser, type BrowserItem } from '@/components/SessionsBrowser'

export const metadata: Metadata = {
  title: 'Sessions',
  description: 'Every AI Together session, newest first.',
}

export default async function SessionsPage() {
  const store = fileStore()
  const summaries = await store.list()
  const items: BrowserItem[] = []
  for (const s of summaries) {
    const full = await store.get(s.slug)
    items.push({ ...s, kinds: full ? sessionKinds(full) : [] })
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="eyebrow mb-3">The archive</p>
        <h1 className="mb-3 font-display text-4xl text-ink">Every session</h1>
        <p className="mb-10 max-w-2xl text-ink-soft">
          A permanent record of every Wednesday. Filter by topic or by level to
          find what you missed.
        </p>
        <SessionsBrowser items={items} />
      </main>
      <SiteFooter />
    </div>
  )
}
