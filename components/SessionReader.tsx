'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Block } from '@/lib/types'
import { kindMeta } from '@/lib/kinds'
import { KindBadge } from './KindBadge'
import { Prose } from './Prose'

// Public recap as separate "documents": one step visible at a time, the rest
// hidden. The run-of-show spine sits horizontally across the top so the block
// content gets the full width. (The /recap route keeps the full single-page
// view for print and share.)
export function SessionReader({
  blocks,
  blockHtml,
}: {
  blocks: Block[]
  blockHtml: string[]
}) {
  const [active, setActive] = useState(0)
  const last = blocks.length - 1

  const go = useCallback(
    (delta: number) => setActive((i) => Math.max(0, Math.min(last, i + delta))),
    [last],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (blocks.length === 0) return null
  const block = blocks[active]
  const meta = kindMeta(block.meta.kind)

  return (
    <div>
      {/* Horizontal run-of-show spine */}
      <nav
        aria-label="Run of show"
        className="sticky top-0 z-20 -mx-5 border-b border-rule bg-paper/95 px-5 py-4 backdrop-blur"
      >
        <ol className="flex items-center">
          {blocks.map((b, i) => {
            const done = i < active
            const current = i === active
            return (
              <li key={b.index} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={current ? 'step' : undefined}
                  title={b.title}
                  className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[0.7rem] font-medium transition-colors"
                  style={nodeStyle(current, done, Boolean(b.error))}
                >
                  {b.error ? '!' : String(i + 1).padStart(2, '0')}
                </button>
                {i < last && (
                  <span
                    aria-hidden
                    className="mx-1 h-px flex-1"
                    style={{ background: done ? 'var(--gold-deep)' : 'var(--rule-strong)' }}
                  />
                )}
              </li>
            )
          })}
        </ol>
        <p className="mono mt-3 text-[0.72rem] uppercase tracking-wider text-ink-soft">
          Step {active + 1} of {blocks.length}
          {meta ? ` · ${meta.level}` : ''}
        </p>
      </nav>

      {/* Active step only */}
      <article key={active} className="fade-up min-h-[50vh] pt-10">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="mono text-[0.8rem] text-ink-soft">
            {String(active + 1).padStart(2, '0')}
          </span>
          <KindBadge kind={block.meta.kind} />
          {block.meta.presenter && (
            <span className="text-sm text-ink-soft">{block.meta.presenter}</span>
          )}
        </div>

        <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
          {block.title}
        </h2>

        {block.meta.takeaway && (
          <p className="mt-5 border-l-[3px] border-gold pl-4 text-xl italic text-ink">
            {block.meta.takeaway}
          </p>
        )}

        {blockHtml[active] && (
          <Prose html={blockHtml[active]} className="mt-5 text-[1.05rem]" />
        )}

        {block.meta.links.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2">
            {block.meta.links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-red"
                >
                  <span aria-hidden>↗</span>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Step controls */}
      <div className="mt-10 flex items-center justify-between border-t border-rule pt-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={active === 0}
          className="rounded-full border border-rule-strong px-4 py-2 text-sm text-ink-soft transition-colors hover:border-red hover:text-red disabled:opacity-40 disabled:hover:border-rule-strong disabled:hover:text-ink-soft"
        >
          ← Previous
        </button>
        <span className="mono text-[0.72rem] uppercase tracking-wider text-ink-soft">
          {active < last ? blocks[active + 1].title : 'End of session'}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={active === last}
          className="rounded-full bg-red px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function nodeStyle(
  current: boolean,
  done: boolean,
  error: boolean,
): React.CSSProperties {
  if (error)
    return {
      background: 'color-mix(in srgb, var(--red) 14%, var(--paper))',
      borderColor: 'var(--red)',
      color: 'var(--red)',
    }
  if (current)
    return {
      background: 'var(--gold)',
      borderColor: 'var(--gold-deep)',
      color: 'var(--maroon)',
      boxShadow: '0 0 0 3px color-mix(in srgb, var(--gold) 30%, transparent)',
    }
  if (done)
    return {
      background: 'var(--gold-deep)',
      borderColor: 'var(--gold-deep)',
      color: 'var(--paper)',
    }
  return {
    background: 'var(--paper)',
    borderColor: 'var(--rule-strong)',
    color: 'var(--ink-soft)',
  }
}
