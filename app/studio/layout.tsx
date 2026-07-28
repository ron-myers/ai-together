import type { Metadata } from 'next'

// /studio is client-only and unlinked from public nav. noindex so the URL
// stays private (PRD §9, §14).
export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen">{children}</div>
}
