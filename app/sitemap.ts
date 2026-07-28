import type { MetadataRoute } from 'next'
import { fileStore } from '@/lib/store/filesystem'
import { publishedSessions } from '@/lib/public-data'
import { buildPresenterIndex } from '@/lib/derive'
import { SITE } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sessions = await fileStore().list()
  const presenters = buildPresenterIndex(await publishedSessions())
  const u = (path: string) => `${SITE.url}${path}`

  return [
    { url: u('/'), priority: 1 },
    { url: u('/sessions'), priority: 0.9 },
    { url: u('/presenters'), priority: 0.6 },
    { url: u('/takeaways'), priority: 0.7 },
    ...sessions.map((s) => ({
      url: u(`/sessions/${s.slug}`),
      lastModified: s.date,
      priority: 0.8,
    })),
    ...presenters.map((p) => ({ url: u(`/presenters/${p.key}`), priority: 0.4 })),
  ]
}
