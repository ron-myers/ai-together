'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { localStore } from '@/lib/store/local'
import { parseSession } from '@/lib/parse'
import { renderMarkdown } from '@/lib/markdown'
import { getBlockText, replaceBlockText } from '@/lib/segments'
import type { Session } from '@/lib/types'
import { KindBadge } from '@/components/KindBadge'
import { Spine, type SpineNode } from '@/components/Spine'
import { SITE, formatDate, weekNumber } from '@/lib/site'

// Present mode for a 70" TV at ten feet (PRD §10.2). Index runs -1 (title
// screen) .. blocks.length (closing screen). Completion state persists so an
// accidental refresh loses nothing. The host can also edit the current block
// inline (press E) and it saves straight back to the draft.

const posKey = (slug: string) => `ait:present:pos:${slug}`
const doneKey = (slug: string) => `ait:present:done:${slug}`

export function Present({ slug }: { slug: string }) {
  const router = useRouter()
  const [raw, setRaw] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [blockHtml, setBlockHtml] = useState<string[]>([])
  const [index, setIndex] = useState(-1)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [grid, setGrid] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const loaded = useRef(false)
  const dirty = useRef(false)

  const session: Session | null = useMemo(
    () => (raw != null ? parseSession(raw, slug) : null),
    [raw, slug],
  )
  const last = session ? session.blocks.length : 0

  // Load session + persisted state.
  useEffect(() => {
    localStore()
      .get(slug)
      .then((s) => {
        if (!s) {
          setNotFound(true)
          return
        }
        setRaw(s.raw)
        try {
          const pos = window.localStorage.getItem(posKey(slug))
          if (pos != null) setIndex(Number(pos))
          const d = window.localStorage.getItem(doneKey(slug))
          if (d) setDone(new Set(JSON.parse(d) as number[]))
        } catch {
          /* ignore */
        }
        loaded.current = true
      })
  }, [slug])

  // Re-render block bodies whenever the source changes (live while editing).
  useEffect(() => {
    if (!session) return
    let cancelled = false
    const t = setTimeout(async () => {
      const html = await Promise.all(
        session.blocks.map((b) => renderMarkdown(b.body)),
      )
      if (!cancelled) setBlockHtml(html)
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [session])

  // Autosave edits back to the draft (skip the initial load).
  useEffect(() => {
    if (raw == null || !dirty.current) return
    const t = setTimeout(async () => {
      await localStore().saveRaw(slug, raw)
      setSaving(false)
    }, 400)
    return () => clearTimeout(t)
  }, [raw, slug])

  // Persist position + completion.
  useEffect(() => {
    if (!loaded.current) return
    try {
      window.localStorage.setItem(posKey(slug), String(index))
    } catch {
      /* ignore */
    }
  }, [index, slug])
  useEffect(() => {
    if (!loaded.current) return
    try {
      window.localStorage.setItem(doneKey(slug), JSON.stringify([...done]))
    } catch {
      /* ignore */
    }
  }, [done, slug])

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.max(-1, Math.min(last, i + delta))),
    [last],
  )
  const toggleDone = useCallback((blockIndex: number) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(blockIndex)) next.delete(blockIndex)
      else next.add(blockIndex)
      return next
    })
  }, [])

  const startEdit = useCallback(() => {
    if (!session || index < 0 || index >= last) return
    setEditText(getBlockText(raw ?? '', session, index))
    setEditing(true)
  }, [session, raw, index, last])

  const onEdit = useCallback(
    (v: string) => {
      if (!session) return
      setEditText(v)
      dirty.current = true
      setSaving(true)
      setRaw((r) => (r == null ? r : replaceBlockText(r, session, index, v)))
    },
    [session, index],
  )

  // Keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) {
        if (e.key === 'Escape') setEditing(false)
        return // let the textarea handle everything else
      }
      if (e.key === 'Escape') {
        if (grid) setGrid(false)
        else router.push(`/studio/${slug}`)
        return
      }
      if (e.key === 'g' || e.key === 'G') {
        setGrid((g) => !g)
        return
      }
      if (grid) return
      if ((e.key === 'e' || e.key === 'E') && index >= 0 && index < last) {
        e.preventDefault()
        startEdit()
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Enter' && index >= 0 && index < last) {
        toggleDone(index)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, go, grid, index, last, router, slug, startEdit, toggleDone])

  const nodes: SpineNode[] = useMemo(
    () =>
      session?.blocks.map((b) => ({
        index: b.index,
        title: b.title,
        kind: b.meta.kind,
      })) ?? [],
    [session],
  )

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="font-display text-3xl text-ink">No draft “{slug}”.</p>
          <Link href="/studio" className="mt-4 inline-block text-red">
            ← Back to studio
          </Link>
        </div>
      </div>
    )
  }
  if (!session) {
    return <div className="grid min-h-screen place-items-center text-ink-soft">Loading…</div>
  }

  const block = index >= 0 && index < last ? session.blocks[index] : null
  const wk = weekNumber(session.meta.date)

  return (
    <div className="relative flex h-screen overflow-hidden bg-paper">
      {/* Progress spine down the left edge */}
      <div className="hidden w-64 shrink-0 overflow-y-auto border-r border-rule px-6 py-8 lg:block">
        <p className="eyebrow mb-4">{session.meta.title}</p>
        <Spine
          nodes={nodes}
          current={block ? block.index : undefined}
          completed={done}
          onSelect={(i) => {
            setEditing(false)
            setIndex(i)
          }}
          variant="progress"
          animate={false}
        />
        <button
          type="button"
          onClick={() => router.push(`/studio/${slug}`)}
          className="mono mt-8 text-[0.7rem] uppercase tracking-wider text-ink-soft hover:text-red"
        >
          Esc · Exit
        </button>
      </div>

      {/* Click zones (disabled while editing) */}
      {!editing && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-0 top-0 z-10 h-full w-[15%] cursor-w-resize lg:left-64"
          />
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-0 top-0 z-10 h-full w-[20%] cursor-e-resize"
          />
        </>
      )}

      {/* Stage */}
      <div className="relative flex min-w-0 flex-1 items-center justify-center px-[8vw] py-16">
        <div key={editing ? `edit-${index}` : index} className="fade-up w-full max-w-4xl">
          {index === -1 ? (
            <TitleScreen session={session} wk={wk} />
          ) : block ? (
            editing ? (
              <EditPanel
                stepNumber={index + 1}
                total={last}
                value={editText}
                saving={saving}
                onChange={onEdit}
                onDone={() => setEditing(false)}
              />
            ) : (
              <BlockScreen
                block={block}
                html={blockHtml[index]}
                total={last}
                done={done.has(block.index)}
                onToggleDone={() => toggleDone(block.index)}
                onEdit={startEdit}
              />
            )
          ) : (
            <ClosingScreen />
          )}
        </div>

        {/* Position indicator */}
        <div className="mono absolute bottom-6 right-8 text-[1.25rem] text-ink-soft">
          {index < 0 ? '—' : index >= last ? '✓' : `${index + 1} / ${last}`}
        </div>
      </div>

      {grid && (
        <GridOverview
          session={session}
          done={done}
          onPick={(i) => {
            setIndex(i)
            setGrid(false)
          }}
          onClose={() => setGrid(false)}
        />
      )}
    </div>
  )
}

function TitleScreen({ session, wk }: { session: Session; wk: number | null }) {
  const { meta } = session
  return (
    <div>
      <p
        className="mono uppercase tracking-[0.2em] text-gold-deep"
        style={{ fontSize: '24px' }}
      >
        {SITE.name}
        {wk ? ` · Week ${wk}` : ''}
      </p>
      <h1
        className="mt-6 font-display leading-[1.02] text-ink"
        style={{ fontSize: 'clamp(72px, 8vw, 128px)' }}
      >
        {meta.title}
      </h1>
      <p className="mt-8 text-ink-soft" style={{ fontSize: '32px' }}>
        {meta.date ? formatDate(meta.date) : ''} · Hosted by {meta.host}
      </p>
      <p className="mt-6 text-ink-body" style={{ fontSize: '28px' }}>
        {SITE.invite}
      </p>
      <p className="mono mt-10 text-ink-soft" style={{ fontSize: '18px' }}>
        → / space next · ← back · ⏎ mark done · E edit · G grid · Esc exit
      </p>
    </div>
  )
}

function BlockScreen({
  block,
  html,
  total,
  done,
  onToggleDone,
  onEdit,
}: {
  block: Session['blocks'][number]
  html: string
  total: number
  done: boolean
  onToggleDone: () => void
  onEdit: () => void
}) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="mono text-ink-soft" style={{ fontSize: '24px' }}>
          {String(block.index + 1).padStart(2, '0')} / {total}
        </span>
        <KindBadge kind={block.meta.kind} className="!text-base" />
        {block.meta.presenter && (
          <span className="text-ink-soft" style={{ fontSize: '24px' }}>
            {block.meta.presenter}
          </span>
        )}
        <span className="relative z-20 ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="mono rounded-full border border-rule-strong px-3 py-1 text-[0.8rem] uppercase tracking-wider text-ink-soft hover:border-red hover:text-red"
          >
            ✎ Edit
          </button>
          <button
            type="button"
            onClick={onToggleDone}
            className="mono rounded-full border px-3 py-1 text-[0.8rem] uppercase tracking-wider"
            style={{
              borderColor: done ? 'var(--gold-deep)' : 'var(--rule-strong)',
              background: done ? 'var(--gold)' : 'transparent',
              color: done ? 'var(--maroon)' : 'var(--ink-soft)',
            }}
          >
            {done ? '✓ Done' : 'Mark done ⏎'}
          </button>
        </span>
      </div>

      <h1
        className="mt-5 font-display leading-[1.05] text-ink"
        style={{ fontSize: 'clamp(72px, 7vw, 104px)' }}
      >
        {block.title}
      </h1>

      {block.meta.takeaway && (
        <p
          className="mt-6 border-l-4 border-gold pl-5 italic text-ink"
          style={{ fontSize: '34px', lineHeight: 1.3 }}
        >
          {block.meta.takeaway}
        </p>
      )}

      {html && (
        <div
          className="prose mt-6 text-ink-body"
          style={{ fontSize: '32px', lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {block.meta.links.length > 0 && (
        <ul className="mt-8 flex flex-col gap-3">
          {block.meta.links.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red"
                style={{ fontSize: '30px' }}
              >
                ↗ {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EditPanel({
  stepNumber,
  total,
  value,
  saving,
  onChange,
  onDone,
}: {
  stepNumber: number
  total: number
  value: string
  saving: boolean
  onChange: (v: string) => void
  onDone: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <span className="mono text-ink-soft" style={{ fontSize: '22px' }}>
          Editing step {stepNumber} / {total}
        </span>
        <span
          className="mono"
          style={{
            fontSize: '18px',
            color: saving ? 'var(--ink-soft)' : 'var(--gold-deep)',
          }}
        >
          {saving ? 'Saving…' : '✓ Saved'}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="mono ml-auto rounded-full bg-red px-4 py-1.5 text-[0.85rem] uppercase tracking-wider text-white"
        >
          ✓ Done · Esc
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck
        className="w-full rounded-xl border border-rule-strong bg-panel px-6 py-5 text-ink outline-none focus:border-red"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '22px',
          lineHeight: 1.5,
          height: '58vh',
          resize: 'none',
        }}
      />
      <p className="mono mt-3 text-ink-soft" style={{ fontSize: '16px' }}>
        Edits save to this draft automatically. Markdown — a ```yaml fence sets
        the block metadata.
      </p>
    </div>
  )
}

function ClosingScreen() {
  return (
    <div className="text-center">
      <p
        className="mono uppercase tracking-[0.2em] text-gold-deep"
        style={{ fontSize: '24px' }}
      >
        Before you leave
      </p>
      <h1
        className="mt-6 font-display leading-[1.05] text-ink"
        style={{ fontSize: 'clamp(64px, 7vw, 112px)' }}
      >
        Name one next step.
      </h1>
      <p className="mt-8 text-ink-soft" style={{ fontSize: '30px' }}>
        One thing you will try before next Wednesday. See you then.
      </p>
    </div>
  )
}

function GridOverview({
  session,
  done,
  onPick,
  onClose,
}: {
  session: Session
  done: Set<number>
  onPick: (i: number) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-paper/97 p-[6vw]"
      role="dialog"
      aria-modal="true"
    >
      <div className="mb-8 flex items-center justify-between">
        <p className="eyebrow">All blocks · press G or Esc to close</p>
        <button type="button" onClick={onClose} className="mono text-ink-soft">
          Close ✕
        </button>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-3">
        {session.blocks.map((b) => (
          <button
            key={b.index}
            type="button"
            onClick={() => onPick(b.index)}
            className="flex flex-col rounded-2xl border p-6 text-left transition-transform hover:-translate-y-1"
            style={{
              borderColor: done.has(b.index)
                ? 'var(--gold-deep)'
                : 'var(--rule)',
              background: done.has(b.index)
                ? 'color-mix(in srgb, var(--gold) 12%, var(--paper))'
                : 'var(--paper)',
            }}
          >
            <span className="mono text-sm text-ink-soft">
              {String(b.index + 1).padStart(2, '0')}
            </span>
            <span className="mt-2 font-display text-2xl leading-tight text-ink">
              {b.title}
            </span>
            <span className="mt-auto pt-4">
              <KindBadge kind={b.meta.kind} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
