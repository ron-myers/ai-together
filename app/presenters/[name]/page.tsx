import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publishedSessions } from '@/lib/public-data'
import { buildPresenterIndex, findPresenter } from '@/lib/derive'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'
import { KindBadge } from '@/components/KindBadge'
import { formatDateShort, weekNumber } from '@/lib/site'

export async function generateStaticParams() {
  const presenters = buildPresenterIndex(await publishedSessions())
  return presenters.map((p) => ({ name: p.key }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  const p = findPresenter(await publishedSessions(), name)
  return { title: p ? p.name : 'Presenter' }
}

export default async function PresenterPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const p = findPresenter(await publishedSessions(), name)
  if (!p) notFound()

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link
          href="/presenters"
          className="mono text-[0.72rem] uppercase tracking-wider no-underline hover:underline"
        >
          ← All presenters
        </Link>
        <h1 className="mb-2 mt-4 font-display text-4xl text-ink">{p.name}</h1>
        <p className="mb-10 text-ink-soft">
          {p.blocks.length} block{p.blocks.length === 1 ? '' : 's'} across{' '}
          {new Set(p.blocks.map((b) => b.slug)).size} session
          {new Set(p.blocks.map((b) => b.slug)).size === 1 ? '' : 's'}.
        </p>

        <ul className="flex flex-col divide-y divide-rule">
          {p.blocks.map((b, i) => {
            const wk = weekNumber(b.date)
            return (
              <li key={i} className="py-5">
                <p className="mono mb-1 text-[0.7rem] uppercase tracking-wider text-ink-soft">
                  {wk ? `Week ${wk} · ` : ''}
                  {formatDateShort(b.date)}
                </p>
                <div className="flex items-baseline gap-2">
                  <KindBadge kind={b.kind} />
                  <h2 className="font-display text-lg text-ink">{b.blockTitle}</h2>
                </div>
                {b.takeaway && (
                  <p className="mt-1.5 text-ink-body">“{b.takeaway}”</p>
                )}
                <Link
                  href={`/sessions/${b.slug}`}
                  className="mt-1 inline-block text-sm no-underline hover:underline"
                >
                  {b.sessionTitle} →
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
      <SiteFooter />
    </div>
  )
}
