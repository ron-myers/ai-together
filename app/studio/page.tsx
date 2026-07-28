import Link from 'next/link'
import { fileStore } from '@/lib/store/filesystem'
import { StudioList } from '@/components/studio/StudioList'

// Server wrapper: read the published slugs (for the drift flag) and hand them
// to the client list, which reads drafts from localStorage.
export default async function StudioPage() {
  const published = await fileStore().list()
  const publishedSlugs = published.map((s) => s.slug)

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex items-baseline justify-between">
        <div>
          <p className="eyebrow mb-2">Host studio</p>
          <h1 className="font-display text-3xl text-ink">Run sheets</h1>
        </div>
        <Link
          href="/"
          className="mono text-[0.72rem] uppercase tracking-wider no-underline hover:underline"
        >
          View site ↗
        </Link>
      </div>
      <StudioList publishedSlugs={publishedSlugs} />
    </div>
  )
}
