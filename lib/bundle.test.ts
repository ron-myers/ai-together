import { describe, it, expect } from 'vitest'
import { parseSession } from './parse'
import {
  buildSessionBundle,
  buildArchiveBundle,
  sessionBundleFiles,
} from './bundle'

const RAW = `---
title: Round trip
date: 2026-09-02
host: Ron Myers
photos:
  - src: /sessions/2026-09-02/lead.jpg
    alt: lead
---

## Welcome

\`\`\`yaml
kind: welcome
presenter: Ron Myers
\`\`\`

Hello.
`

describe('export bundle', () => {
  const session = parseSession(RAW, '2026-09-02')

  it('produces the markdown file and an images folder', () => {
    const files = sessionBundleFiles(session)
    const paths = files.map((f) => f.path)
    expect(paths).toContain('2026-09-02/2026-09-02.md')
    expect(paths.some((p) => p.startsWith('2026-09-02/images/'))).toBe(true)
  })

  it('exports the raw markdown unchanged so a commit needs no rewriting', () => {
    const files = buildSessionBundle(session).files
    const md = files.find((f) => f.path.endsWith('.md'))!
    expect(md.data).toBe(RAW)
    // re-parsing the exported bytes yields the same session
    const round = parseSession(md.data as string, '2026-09-02')
    expect(round.meta.title).toBe('Round trip')
    expect(round.blocks[0].meta.presenter).toBe('Ron Myers')
  })

  it('archive includes a manifest listing every session', () => {
    const bundle = buildArchiveBundle([{ session }])
    const manifest = bundle.files.find((f) => f.path === 'manifest.json')!
    const data = JSON.parse(manifest.data as string)
    expect(data.count).toBe(1)
    expect(data.sessions[0].slug).toBe('2026-09-02')
    expect(data.sessions[0].presenters).toContain('Ron Myers')
  })
})
