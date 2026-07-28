'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SessionSummary } from '@/lib/types'
import { KINDS, type BlockKind } from '@/lib/kinds'
import { formatDateShort, weekNumber } from '@/lib/site'

export interface BrowserItem extends SessionSummary {
  kinds: string[]
}

export function SessionsBrowser({ items }: { items: BrowserItem[] }) {
  const [tag, setTag] = useState<string | null>(null)
  const [kind, setKind] = useState<string | null>(null)

  const allTags = useMemo(
    () => [...new Set(items.flatMap((i) => i.tags))].sort(),
    [items],
  )
  const allKinds = useMemo(
    () => [...new Set(items.flatMap((i) => i.kinds))],
    [items],
  )

  const filtered = items.filter(
    (i) =>
      (!tag || i.tags.includes(tag)) && (!kind || i.kinds.includes(kind)),
  )

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 border-b border-rule pb-6">
        <FilterRow label="Tag" active={tag} onClear={() => setTag(null)}>
          {allTags.map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Level" active={kind} onClear={() => setKind(null)}>
          {allKinds.map((k) => (
            <Chip
              key={k}
              active={kind === k}
              onClick={() => setKind(kind === k ? null : k)}
            >
              {KINDS[k as BlockKind]?.level ?? k}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-soft">No sessions match that filter.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filtered.map((s) => {
            const wk = weekNumber(s.date)
            return (
              <Link
                key={s.slug}
                href={`/sessions/${s.slug}`}
                className="group flex gap-4 rounded-xl border border-rule bg-paper p-3 no-underline transition-colors hover:border-rule-strong"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                  {s.leadPhoto && (
                    <Image
                      src={s.leadPhoto.src}
                      alt={s.leadPhoto.alt}
                      fill
                      sizes="128px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mono text-[0.68rem] uppercase tracking-wider text-ink-soft">
                    {wk ? `Week ${wk} · ` : ''}
                    {formatDateShort(s.date)}
                  </p>
                  <h3 className="font-display text-[1.05rem] leading-snug text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                    {s.summary}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterRow({
  label,
  active,
  onClear,
  children,
}: {
  label: string
  active: string | null
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mono w-14 text-[0.7rem] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      {children}
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="mono text-[0.7rem] uppercase tracking-wider text-red hover:underline"
        >
          clear
        </button>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-sm transition-colors"
      style={{
        borderColor: active ? 'var(--red)' : 'var(--rule-strong)',
        background: active ? 'color-mix(in srgb, var(--red) 8%, var(--paper))' : 'var(--paper)',
        color: active ? 'var(--red)' : 'var(--ink-soft)',
      }}
    >
      {children}
    </button>
  )
}
