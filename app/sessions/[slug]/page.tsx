import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { fileStore } from '@/lib/store/filesystem'
import { publishedSessions } from '@/lib/public-data'
import { renderMarkdown } from '@/lib/markdown'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'
import { PhotoStrip } from '@/components/PhotoStrip'
import { SessionReader } from '@/components/SessionReader'
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
  if (!s) return { title: 'Session not found' }
  return {
    title: s.meta.title,
    description: s.meta.summary,
    openGraph: {
      title: s.meta.title,
      description: s.meta.summary,
      type: 'article',
    },
  }
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await fileStore().get(slug)
  if (!session || !session.meta.published) notFound()

  const { meta } = session
  const wk = weekNumber(meta.date)

  // Render each block body once, server-side (shared parser + pipeline).
  const introHtml = await renderMarkdown(session.intro)
  const blockHtml = await Promise.all(
    session.blocks.map((b) => renderMarkdown(b.body)),
  )

  // prev / next across the published archive (newest first).
  const all = await publishedSessions()
  const idx = all.findIndex((s) => s.slug === slug)
  const newer = idx > 0 ? all[idx - 1] : null
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: meta.title,
    startDate: meta.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: 'The Foundry',
      address: meta.location ?? SITE.location,
    },
    organizer: { '@type': 'Organization', name: 'PEI IT Alliance' },
    description: meta.summary,
    ...(meta.photos[0]
      ? {
          image: {
            '@type': 'ImageObject',
            url: `${SITE.url}${meta.photos[0].src}`,
            caption: meta.photos[0].alt,
          },
        }
      : {}),
  }

  return (
    <div>
      <SiteHeader />

      {/* Lead photo + title */}
      <header className="mx-auto max-w-5xl px-5 pt-10">
        {meta.photos[0] && (
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-panel-2">
            <Image
              src={meta.photos[0].src}
              alt={meta.photos[0].alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        )}
        <p className="eyebrow mt-6">
          {wk ? `Week ${wk} · ` : ''}
          {formatDate(meta.date)}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.05] text-ink sm:text-5xl">
          {meta.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span>Hosted by {meta.host}</span>
          {typeof meta.attendance === 'number' && (
            <span className="mono">{meta.attendance} in the room</span>
          )}
          <Link
            href={`/sessions/${slug}/recap`}
            className="no-underline hover:underline"
          >
            Print / share view →
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-3xl px-5">
        {introHtml && (
          <div className="mb-8 border-b border-rule pb-6">
            <div
              className="prose text-lg"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        )}

        {/* Stepped reader: run-of-show on top, one step visible at a time. */}
        <SessionReader blocks={session.blocks} blockHtml={blockHtml} />

        <div>
          {/* Photo strip */}
          {meta.photos.length > 1 && (
            <div className="mt-14">
              <p className="eyebrow mb-4">From the room</p>
              <PhotoStrip photos={meta.photos} />
            </div>
          )}

          {/* Prev / next */}
          <nav className="mt-16 grid grid-cols-2 gap-4 border-t border-rule pt-8">
            {older ? (
              <Link
                href={`/sessions/${older.slug}`}
                className="rounded-xl border border-rule p-4 no-underline transition-colors hover:border-rule-strong"
              >
                <span className="mono text-[0.7rem] uppercase tracking-wider text-ink-soft">
                  ← Earlier
                </span>
                <span className="mt-1 block font-display text-ink">
                  {older.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={`/sessions/${newer.slug}`}
                className="rounded-xl border border-rule p-4 text-right no-underline transition-colors hover:border-rule-strong"
              >
                <span className="mono text-[0.7rem] uppercase tracking-wider text-ink-soft">
                  Later →
                </span>
                <span className="mt-1 block font-display text-ink">
                  {newer.meta.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
