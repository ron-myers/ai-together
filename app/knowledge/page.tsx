import type { Metadata } from 'next'
import { StandingPage, standingPageMetadata } from '@/components/StandingPage'

export function generateMetadata(): Promise<Metadata> {
  return standingPageMetadata('knowledge')
}

export default function KnowledgePage() {
  return <StandingPage slug="knowledge" eyebrow="Tips and tricks" />
}
