'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { localStore } from '@/lib/store/local'
import { starterMarkdown } from '@/lib/templates'
import { parseSession } from '@/lib/parse'
import { downloadBundle } from '@/lib/download'
import type { Session, SessionSummary } from '@/lib/types'
import { formatDateShort } from '@/lib/site'

function nextWednesdayISO(): string {
  const d = new Date()
  const day = d.getDay() // 0 Sun .. 3 Wed
  const add = (3 - day + 7) % 7 || 7
  d.setDate(d.getDate() + add)
  return d.toISOString().slice(0, 10)
}

export function StudioList({ publishedSlugs }: { publishedSlugs: string[] }) {
  const [items, setItems] = useState<SessionSummary[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const published = new Set(publishedSlugs)

  async function reload() {
    setItems(await localStore().list())
  }
  useEffect(() => {
    reload()
  }, [])

  async function newSession() {
    const store = localStore()
    let slug = nextWednesdayISO()
    let n = 2
    while (store.has(slug)) slug = `${nextWednesdayISO()}-${n++}`
    const raw = starterMarkdown(slug)
    await store.save({ ...parseSession(raw, slug), raw, slug })
    router.push(`/studio/${slug}`)
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const store = localStore()
    try {
      const isZip = /\.zip$/i.test(file.name)
      const sessions: Session[] = isZip
        ? await store.importArchive(file)
        : [await store.importMarkdown(file)]
      let saved = 0
      for (const s of sessions) {
        let slug = s.slug
        if (store.has(slug)) {
          const replace = window.confirm(
            `A draft "${slug}" already exists. OK to replace it, Cancel to keep both.`,
          )
          if (!replace) {
            let n = 2
            while (store.has(`${slug}-${n}`)) n++
            slug = `${slug}-${n}`
          }
        }
        await store.save({ ...s, slug, raw: s.raw })
        saved++
      }
      setMsg(`Imported ${saved} session${saved === 1 ? '' : 's'}.`)
      reload()
    } catch (err) {
      setMsg(`Import failed: ${(err as Error).message}`)
    }
  }

  async function exportArchive() {
    await downloadBundle(await localStore().exportArchive())
  }
  async function exportOne(slug: string) {
    await downloadBundle(await localStore().exportBundle(slug))
  }
  async function del(slug: string) {
    if (!window.confirm(`Delete draft "${slug}"? This cannot be undone.`)) return
    await localStore().remove(slug)
    reload()
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={newSession}
          className="rounded-full bg-red px-4 py-2 font-medium text-white transition-transform hover:-translate-y-0.5"
        >
          New session
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-rule-strong px-4 py-2 text-ink-soft transition-colors hover:border-red hover:text-red"
        >
          Import .md / .zip
        </button>
        {items && items.length > 0 && (
          <button
            type="button"
            onClick={exportArchive}
            className="rounded-full border border-rule-strong px-4 py-2 text-ink-soft transition-colors hover:border-red hover:text-red"
          >
            Export archive
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.zip"
          onChange={onImport}
          className="hidden"
        />
      </div>

      {msg && (
        <p className="mb-6 rounded-lg border border-rule bg-panel px-4 py-2 text-sm text-ink-soft">
          {msg}
        </p>
      )}

      {items === null ? (
        <p className="text-ink-soft">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule-strong p-12 text-center">
          <p className="font-display text-xl text-ink">No sessions yet.</p>
          <p className="mt-1 text-ink-soft">
            Start Wednesday&rsquo;s run sheet.
          </p>
          <button
            type="button"
            onClick={newSession}
            className="mt-5 rounded-full bg-red px-4 py-2 font-medium text-white"
          >
            New session
          </button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-rule">
          {items.map((s) => {
            const updated = localStore().updatedAt(s.slug)
            return (
              <li
                key={s.slug}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/studio/${s.slug}`}
                      className="font-display text-lg text-ink no-underline hover:underline"
                    >
                      {s.title || 'Untitled'}
                    </Link>
                    {published.has(s.slug) && (
                      <span
                        className="mono rounded-full border border-gold-deep/40 bg-gold/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-gold-deep"
                        title="A published session with this slug already exists in the repo."
                      >
                        Published
                      </span>
                    )}
                  </div>
                  <p className="mono text-[0.72rem] uppercase tracking-wider text-ink-soft">
                    {s.slug} · {s.blockCount} blocks
                    {updated ? ` · saved ${formatDateShort(new Date(updated).toISOString().slice(0, 10))}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/studio/${s.slug}`}
                    className="rounded-md border border-rule px-2.5 py-1 no-underline hover:border-rule-strong"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/studio/${s.slug}/present`}
                    className="rounded-md border border-rule px-2.5 py-1 no-underline hover:border-rule-strong"
                  >
                    Present
                  </Link>
                  <button
                    type="button"
                    onClick={() => exportOne(s.slug)}
                    className="rounded-md border border-rule px-2.5 py-1 hover:border-rule-strong"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => del(s.slug)}
                    className="rounded-md border border-rule px-2.5 py-1 text-red hover:border-red"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
