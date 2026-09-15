import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fileStore } from '@/lib/store/filesystem'
import { renderMarkdown } from '@/lib/markdown'
import { Prose } from '@/components/Prose'
import { linkTarget } from '@/lib/links'
import { SiteHeader, SiteFooter } from '@/components/SiteChrome'

// Shared shell for the standing reference pages (/resources, /knowledge).
// They read the same block-structured markdown as a session but belong to the
// program rather than a week, so there is no date line and no run-of-show
// stepper — just intro, then sections top to bottom.

/** Title/description from the page's own frontmatter. */
export async function standingPageMetadata(slug: string): Promise<Metadata> {
  const doc = await fileStore().getPage(slug)
  if (!doc) return { title: 'Not found' }
  return {
    title: doc.meta.title,
    description: doc.meta.summary,
  }
}

export async function StandingPage({
  slug,
  eyebrow,
}: {
  slug: string
  eyebrow: string
}) {
  const doc = await fileStore().getPage(slug)
  if (!doc || !doc.meta.published) notFound()

  const { meta } = doc
  const introHtml = await renderMarkdown(doc.intro)
  const blockHtml = await Promise.all(
    doc.blocks.map((b) => renderMarkdown(b.body)),
  )

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="mb-3 font-display text-4xl text-ink">{meta.title}</h1>
        {introHtml && (
          <Prose html={introHtml} className="mb-10 max-w-2xl text-ink-soft" />
        )}

        {doc.blocks.length === 0 ? (
          <p className="text-ink-soft">Nothing here yet.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {doc.blocks.map((b, i) => (
              <section key={b.index}>
                <h2 className="font-display text-2xl text-ink">{b.title}</h2>
                {b.meta.takeaway && (
                  <p className="mt-2 border-l-[3px] border-gold pl-3 italic text-ink">
                    {b.meta.takeaway}
                  </p>
                )}
                {blockHtml[i] && <Prose html={blockHtml[i]} className="mt-3" />}
                {b.meta.links.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {b.meta.links.map((l, j) => (
                      <li key={j}>
                        <a href={l.url} {...linkTarget(l)}>
                          {l.label}
                        </a>
                        {l.description && (
                          <p className="text-ink-soft">{l.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
