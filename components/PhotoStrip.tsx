'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Photo } from '@/lib/types'

// Photo strip with a lightbox (PRD §10.3). Keyboard: arrows to move, Esc to
// close.
export function PhotoStrip({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    if (open === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight')
        setOpen((i) => (i === null ? i : (i + 1) % photos.length))
      if (e.key === 'ArrowLeft')
        setOpen((i) =>
          i === null ? i : (i - 1 + photos.length) % photos.length,
        )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos.length])

  if (photos.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            className="relative aspect-[4/3] overflow-hidden rounded-lg bg-panel-2"
          >
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photos[open].alt}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="relative h-[75vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[open].src}
              alt={photos[open].alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          {photos[open].caption && (
            <p className="mt-3 text-sm text-white/80">{photos[open].caption}</p>
          )}
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="mono absolute right-5 top-5 rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-wider text-white"
          >
            Close ✕
          </button>
        </div>
      )}
    </div>
  )
}
