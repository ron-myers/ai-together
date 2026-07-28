import Link from 'next/link'
import { fileStore } from '@/lib/store/filesystem'
import { SiteFooter } from '@/components/SiteChrome'
import { SITE, formatDateShort, weekNumber } from '@/lib/site'

export default async function HomePage() {
  const sessions = await fileStore().list()
  const recent = sessions.slice(0, 3)

  return (
    <div>
      {/* Hero — solid lighter red sampled from the live page (#CB343A, the
          mid stop of its hero gradient). Gold display. */}
      <section
        className="relative text-[#fbeede]"
        style={{ background: '#cb343a' }}
      >
        {/* Slim utility nav for orientation. */}
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-5">
          <span className="font-display text-base font-semibold text-[#fbeede]">
            AI&nbsp;Together
          </span>
          <nav className="flex items-center gap-4 text-[0.85rem] text-[#fbeede]/85">
            <Link href="/sessions" className="no-underline hover:text-[#fbeede]">
              Archive
            </Link>
            <a
              href={SITE.parentUrl}
              className="mono hidden text-[0.7rem] uppercase tracking-wider no-underline hover:text-[#fbeede] sm:inline"
            >
              PEI IT Alliance ↗
            </a>
          </nav>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-20 pt-14 sm:pt-20">
          <p className="eyebrow mb-6" style={{ color: 'var(--gold)' }}>
            A PEI IT Alliance program
          </p>
          <h1
            className="font-display font-semibold leading-[0.95] tracking-tight"
            style={{
              fontSize: 'clamp(2.75rem, 9vw, 6.5rem)',
              color: 'var(--gold)',
            }}
          >
            AI Together
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#f0e4d2]/90">
            Write the run sheet, run the room from a laptop, publish the recap
            after. One tool for every Wednesday at The Foundry.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/studio"
              className="rounded-full bg-[#fcfcfa] px-5 py-2.5 font-medium text-[#b5242f] no-underline transition-transform hover:-translate-y-0.5"
            >
              Open the studio →
            </Link>
            <Link
              href="/sessions"
              className="rounded-full border border-[#f4e9d6]/40 px-5 py-2.5 text-[#f4e9d6] no-underline transition-colors hover:border-[#f4e9d6]"
            >
              Browse the archive
            </Link>
          </div>
        </div>
        <div className="h-1.5 w-full" style={{ background: 'var(--gold)' }} />
      </section>

      <main className="mx-auto max-w-5xl px-5">
        {/* Primary focus: building and running a session. */}
        <section className="py-16">
          <p className="eyebrow mb-3">Run of show</p>
          <h2 className="mb-10 max-w-2xl font-display text-3xl leading-tight text-ink">
            Three jobs, one screen.
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-rule bg-paper p-6"
              >
                <span className="mono text-[0.8rem] text-gold-deep">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-display text-xl text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/studio"
              className="rounded-full bg-red px-5 py-2.5 font-medium text-white no-underline transition-transform hover:-translate-y-0.5"
            >
              Start Wednesday&rsquo;s run sheet
            </Link>
          </div>
        </section>

        {/* History — secondary. */}
        {recent.length > 0 && (
          <section className="border-t border-rule py-14">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-xl text-ink">
                From the archive
              </h2>
              <Link
                href="/sessions"
                className="text-sm no-underline hover:underline"
              >
                All sessions →
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-rule">
              {recent.map((s) => {
                const wk = weekNumber(s.date)
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/sessions/${s.slug}`}
                      className="flex items-baseline justify-between gap-4 py-3 no-underline"
                    >
                      <span className="min-w-0">
                        <span className="font-display text-ink">{s.title}</span>
                      </span>
                      <span className="mono shrink-0 text-[0.72rem] uppercase tracking-wider text-ink-soft">
                        {wk ? `Wk ${wk} · ` : ''}
                        {formatDateShort(s.date)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

const STEPS = [
  {
    title: 'Author',
    body: 'Write five or six blocks in Markdown with a live preview. No slide deck to maintain.',
  },
  {
    title: 'Run',
    body: 'Present mode drives the TV one block at a time, with keyboard nav and a live progress spine.',
  },
  {
    title: 'Publish',
    body: 'Export the session, commit, and it ships as a permanent recap with presenters and takeaways.',
  },
]
