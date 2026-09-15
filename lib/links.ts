import type { Link } from '@/lib/types'

/**
 * Anchor props for a link out of a block. External URLs open in a new tab so
 * the session page keeps its place; internal paths and anchors navigate in
 * place. `newTab` on the link overrides either default.
 */
export function linkTarget(link: Link): {
  target?: string
  rel?: string
} {
  const external = /^(https?:)?\/\//i.test(link.url)
  const newTab = link.newTab ?? external
  return newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}
