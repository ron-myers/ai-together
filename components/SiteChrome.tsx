import Link from 'next/link'
import { SITE } from '@/lib/site'

const NAV = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/presenters', label: 'Presenters' },
  { href: '/takeaways', label: 'Takeaways' },
]

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="no-underline">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            AI&nbsp;Together
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-[0.95rem] sm:gap-5">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              className={`text-ink-soft no-underline transition-colors hover:text-ink ${
                i === 0 ? '' : 'hidden sm:inline'
              }`}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/studio"
            className="rounded-full bg-red px-3.5 py-1.5 text-[0.85rem] font-medium text-white no-underline transition-transform hover:-translate-y-0.5"
          >
            Studio
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-10 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SITE.name} · A PEI IT Alliance program · {SITE.location}
        </p>
        <p className="mono text-[0.75rem] uppercase tracking-wider">
          Wednesdays at The Foundry
        </p>
      </div>
    </footer>
  )
}
