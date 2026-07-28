'use client'

import { zipBundle } from './bundle'
import type { Bundle } from './types'

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Zip a bundle and download it as <name>.zip. */
export async function downloadBundle(bundle: Bundle): Promise<void> {
  const blob = await zipBundle(bundle)
  downloadBlob(blob, `${bundle.name}.zip`)
}
