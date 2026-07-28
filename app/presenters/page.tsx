import type { Metadata } from 'next'
import Link from 'next/link'
import { publishedSessions } from '@/lib/public-data'
import { buildPresenterIndex } from '@/lib/derive'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'
import { formatDateShort } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Presenters',
  description: 'Everyone who has led a block at AI Together.',
}

export default async function PresentersPage() {
  const presenters = buildPresenterIndex(await publishedSessions())

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow mb-3">The people</p>
        <h1 className="mb-3 font-display text-4xl text-ink">Presenters</h1>
        <p className="mb-10 max-w-2xl text-ink-soft">
          Everyone who has stood up and shared. {presenters.length} so far.
        </p>

        {presenters.length === 0 ? (
          <p className="text-ink-soft">No presenters credited yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {presenters.map((p) => (
              <li key={p.key}>
                <Link
                  href={`/presenters/${p.key}`}
                  className="block rounded-xl border border-rule bg-paper p-4 no-underline transition-colors hover:border-rule-strong"
                >
                  <span className="font-display text-lg text-ink">{p.name}</span>
                  <p className="mt-1 text-sm text-ink-soft">
                    {p.blocks.length} block{p.blocks.length === 1 ? '' : 's'} ·
                    last on {formatDateShort(p.blocks[0].date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
