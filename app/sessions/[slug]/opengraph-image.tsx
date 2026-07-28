import { ImageResponse } from 'next/og'
import { fileStore } from '@/lib/store/filesystem'
import { formatDate, weekNumber } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'AI Together session'

// Per-session Open Graph card: title, date, week number (PRD §10.3).
export default async function OgImage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await fileStore().get(params.slug)
  const title = session?.meta.title ?? 'AI Together'
  const date = session?.meta.date ?? ''
  const wk = weekNumber(date)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(150deg, #7a2a24 0%, #4a1116 45%, #2e0a0e 100%)',
          color: '#f4e9d6',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#fbcf5c',
          }}
        >
          AI Together{wk ? `  ·  Week ${wk}` : ''}
        </div>
        <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.05, maxWidth: 1000, color: '#fbcf5c' }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#f0e4d2' }}>
          {date ? formatDate(date) : 'The Foundry, Charlottetown'}
        </div>
      </div>
    ),
    size,
  )
}
