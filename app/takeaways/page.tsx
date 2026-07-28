import type { Metadata } from 'next'
import Link from 'next/link'
import { publishedSessions } from '@/lib/public-data'
import { buildTakeaways } from '@/lib/derive'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'
import { KindBadge } from '@/components/KindBadge'
import { formatDateShort } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Takeaways',
  description: 'Every takeaway from every AI Together session. Scan and steal.',
}

export default async function TakeawaysPage() {
  const takeaways = buildTakeaways(await publishedSessions())

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow mb-3">Scan and steal</p>
        <h1 className="mb-3 font-display text-4xl text-ink">Every takeaway</h1>
        <p className="mb-10 max-w-2xl text-ink-soft">
          One line from every block worth remembering. {takeaways.length} and
          counting.
        </p>

        {takeaways.length === 0 ? (
          <p className="text-ink-soft">No takeaways yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {takeaways.map((t, i) => (
              <li key={i} className="flex gap-4 py-5">
                <span className="mono mt-1 w-6 shrink-0 text-right text-[0.7rem] text-ink-soft">
                  {String(takeaways.length - i).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-[1.05rem] leading-snug text-ink">
                    {t.takeaway}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                    <KindBadge kind={t.kind} />
                    {t.presenter && <span>{t.presenter}</span>}
                    <span aria-hidden>·</span>
                    <Link
                      href={`/sessions/${t.slug}`}
                      className="no-underline hover:underline"
                    >
                      {t.sessionTitle}
                    </Link>
                    <span className="mono text-[0.7rem] uppercase tracking-wider">
                      {formatDateShort(t.date)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
