import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fileStore } from '@/lib/store/filesystem'
import { renderMarkdown } from '@/lib/markdown'
import { KindBadge } from '@/components/KindBadge'
import { Prose } from '@/components/Prose'
import { SITE, formatDate, weekNumber } from '@/lib/site'

export async function generateStaticParams() {
  const list = await fileStore().list()
  return list.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const s = await fileStore().get(slug)
  return {
    title: s ? `${s.meta.title} — recap` : 'Recap',
    robots: { index: false },
  }
}

// Clean single-column print/share view (PRD §9). No navigation.
export default async function RecapPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await fileStore().get(slug)
  if (!session || !session.meta.published) notFound()

  const { meta } = session
  const wk = weekNumber(meta.date)
  const blockHtml = await Promise.all(
    session.blocks.map((b) => renderMarkdown(b.body)),
  )

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 print:py-4">
      <p className="eyebrow">
        {SITE.name} · {wk ? `Week ${wk} · ` : ''}
        {formatDate(meta.date)}
      </p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        {meta.title}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Hosted by {meta.host}
        {typeof meta.attendance === 'number'
          ? ` · ${meta.attendance} in the room`
          : ''}
        {meta.location ? ` · ${meta.location}` : ''}
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {session.blocks.map((b, i) => (
          <section key={b.index} className="break-inside-avoid">
            <div className="mb-1 flex items-center gap-2">
              <span className="mono text-[0.75rem] text-ink-soft">
                {String(b.index + 1).padStart(2, '0')}
              </span>
              <KindBadge kind={b.meta.kind} />
              {b.meta.presenter && (
                <span className="text-sm text-ink-soft">{b.meta.presenter}</span>
              )}
            </div>
            <h2 className="font-display text-xl text-ink">{b.title}</h2>
            {b.meta.takeaway && (
              <p className="mt-1 border-l-[3px] border-gold pl-3 italic text-ink">
                {b.meta.takeaway}
              </p>
            )}
            {blockHtml[i] && (
              <Prose html={blockHtml[i]} className="mt-2 text-[0.95rem]" />
            )}
            {b.meta.links.length > 0 && (
              <ul className="mt-2 text-sm">
                {b.meta.links.map((l, j) => (
                  <li key={j} className="text-ink-soft">
                    {l.label}: <span className="mono">{l.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mono mt-10 border-t border-rule pt-4 text-[0.72rem] uppercase tracking-wider text-ink-soft">
        {SITE.domain}/sessions/{slug}
      </p>
    </main>
  )
}
