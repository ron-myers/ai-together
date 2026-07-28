import type { Session } from './types'

// Line-accurate read/replace of a single block's markdown within the full file.
// Shared by the studio editor and present-mode inline editing so both splice
// back into the one source of truth the same way.

export function getBlockText(raw: string, session: Session, i: number): string {
  const lines = raw.split('\n')
  const b = session.blocks[i]
  if (!b) return ''
  const end = session.blocks[i + 1]?.headingLine ?? lines.length + 1
  return lines.slice(b.headingLine - 1, end - 1).join('\n')
}

export function replaceBlockText(
  raw: string,
  session: Session,
  i: number,
  newText: string,
): string {
  const lines = raw.split('\n')
  const b = session.blocks[i]
  if (!b) return raw
  const end = session.blocks[i + 1]?.headingLine ?? lines.length + 1
  const before = lines.slice(0, b.headingLine - 1)
  const after = lines.slice(end - 1)
  return [...before, ...newText.split('\n'), ...after].join('\n')
}
