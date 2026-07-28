import JSZip from 'jszip'
import type { Bundle, BundleFile, Session } from './types'
import { toSummary } from './parse'

// Export bundles (PRD §7.3). One session -> a folder with the markdown file
// and an images/ folder. Archive -> one folder per session plus a manifest.
// Image paths in the markdown stay repo-relative so a commit needs no rewrite.

/** Filename inside public/sessions/<slug>/ for a frontmatter photo src. */
export function photoFilename(src: string): string {
  return src.split('/').filter(Boolean).pop() ?? src
}

export interface ImageBlob {
  filename: string
  data: Blob
}

/** Files for a single session folder. `images` are the raw uploaded blobs the
 * studio still holds in memory (may be empty; the folder is created either
 * way so the export shape is stable). */
export function sessionBundleFiles(
  session: Session,
  images: ImageBlob[] = [],
): BundleFile[] {
  const slug = session.slug
  const files: BundleFile[] = [
    { path: `${slug}/${slug}.md`, data: session.raw },
  ]
  if (images.length === 0) {
    // Keep the images folder present even with nothing to ship yet.
    files.push({
      path: `${slug}/images/.gitkeep`,
      data: '',
    })
  }
  for (const img of images) {
    files.push({ path: `${slug}/images/${img.filename}`, data: img.data })
  }
  return files
}

export function buildSessionBundle(
  session: Session,
  images: ImageBlob[] = [],
): Bundle {
  return { name: session.slug, files: sessionBundleFiles(session, images) }
}

export interface ArchiveEntry {
  session: Session
  images?: ImageBlob[]
}

export function buildArchiveBundle(entries: ArchiveEntry[]): Bundle {
  const files: BundleFile[] = []
  for (const { session, images } of entries) {
    files.push(...sessionBundleFiles(session, images ?? []))
  }
  const manifest = {
    generated: 'ai-together-archive',
    count: entries.length,
    sessions: entries.map(({ session }) => {
      const s = toSummary(session)
      return {
        slug: s.slug,
        title: s.title,
        date: s.date,
        host: s.host,
        presenters: s.presenters,
      }
    }),
  }
  files.push({
    path: 'manifest.json',
    data: JSON.stringify(manifest, null, 2),
  })
  return { name: 'ai-together-archive', files }
}

/** Zip a bundle to a Blob for download (browser). */
export async function zipBundle(bundle: Bundle): Promise<Blob> {
  const zip = new JSZip()
  for (const f of bundle.files) {
    zip.file(f.path, f.data)
  }
  return zip.generateAsync({ type: 'blob' })
}
