import type { Metadata } from 'next'
import { StandingPage, standingPageMetadata } from '@/components/StandingPage'

export function generateMetadata(): Promise<Metadata> {
  return standingPageMetadata('resources')
}

export default function ResourcesPage() {
  return <StandingPage slug="resources" eyebrow="Keep these open" />
}
