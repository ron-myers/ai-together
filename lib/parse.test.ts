import { describe, it, expect } from 'vitest'
import { parseSession, sessionPresenters, toSummary } from './parse'

const FULL = `---
title: Prompting patterns and a spreadsheet that fills itself
date: 2026-08-12
host: Ron Myers
hostContact: ron@peiitalliance.com
location: The Foundry, 163 Great George Street, Charlottetown
attendance: 24
summary: Better prompts, connecting AI to a spreadsheet, agents.
tags: [prompting, spreadsheets, agents]
photos:
  - src: /sessions/2026-08-12/group.jpg
    alt: Twenty four people around tables
    caption: Week 14
published: true
---

Fourteen weeks in and the room keeps growing.

## Welcome

\`\`\`yaml
kind: welcome
presenter: Ron Myers
\`\`\`

New here? You need nothing prepared.

## Share a win

\`\`\`yaml
kind: win
presenter: Jennifer MacIsaac
takeaway: Voice note to transcript to client summary
links:
  - label: The transcription tool
    url: https://example.com
\`\`\`

Jennifer runs this after every client call now.

## Build and connect

Thirty minutes of peer help.
`

describe('parseSession — full file', () => {
  const s = parseSession(FULL, '2026-08-12')

  it('reads required frontmatter', () => {
    expect(s.meta.title).toContain('Prompting patterns')
    expect(s.meta.date).toBe('2026-08-12')
    expect(s.meta.host).toBe('Ron Myers')
    expect(s.errors).toHaveLength(0)
  })

  it('parses photos and tags', () => {
    expect(s.meta.photos[0].src).toBe('/sessions/2026-08-12/group.jpg')
    expect(s.meta.tags).toEqual(['prompting', 'spreadsheets', 'agents'])
  })

  it('captures intro above first heading', () => {
    expect(s.intro).toContain('Fourteen weeks in')
  })

  it('splits blocks in file order', () => {
    expect(s.blocks.map((b) => b.title)).toEqual([
      'Welcome',
      'Share a win',
      'Build and connect',
    ])
    expect(s.blocks[0].index).toBe(0)
    expect(s.blocks[2].index).toBe(2)
  })

  it('parses block meta and links', () => {
    const win = s.blocks[1]
    expect(win.meta.kind).toBe('win')
    expect(win.meta.presenter).toBe('Jennifer MacIsaac')
    expect(win.meta.links[0].url).toBe('https://example.com')
    expect(win.meta.takeaway).toContain('Voice note')
  })

  it('keeps body after the fence', () => {
    expect(s.blocks[1].body).toContain('Jennifer runs this')
    expect(s.blocks[1].body).not.toContain('kind: win')
  })

  it('handles a block with no fence', () => {
    const build = s.blocks[2]
    expect(build.meta.kind).toBeUndefined()
    expect(build.body).toContain('Thirty minutes')
    expect(build.error).toBeUndefined()
  })

  it('derives distinct presenters', () => {
    expect(sessionPresenters(s)).toEqual(['Ron Myers', 'Jennifer MacIsaac'])
  })
})

describe('parseSession — minimal file', () => {
  it('renders with only title, date, host', () => {
    const s = parseSession(
      `---\ntitle: Tiny\ndate: 2026-01-01\nhost: Ron\n---\n\n## Only block\n\nHi.\n`,
      'tiny',
    )
    expect(s.errors).toHaveLength(0)
    expect(s.meta.title).toBe('Tiny')
    expect(s.blocks).toHaveLength(1)
    expect(s.meta.published).toBe(true) // default
  })

  it('falls back summary to first paragraph', () => {
    const s = parseSession(
      `---\ntitle: T\ndate: 2026-01-01\nhost: R\n---\n\n## B\n\nThis becomes the summary.\n\nSecond paragraph.\n`,
      't',
    )
    expect(s.meta.summary).toBe('This becomes the summary.')
  })
})

describe('parseSession — errors are specific, rest renders', () => {
  it('flags a malformed YAML fence but keeps the body and other blocks', () => {
    const raw = `---
title: T
date: 2026-01-01
host: R
---

## Bad block

\`\`\`yaml
kind: win
  presenter: broken indentation
\`\`\`

Body still here.

## Good block

Clean.
`
    const s = parseSession(raw, 't')
    expect(s.blocks).toHaveLength(2)
    const bad = s.blocks[0]
    expect(bad.error).toBeDefined()
    expect(bad.error!.line).toBeGreaterThan(0)
    expect(bad.body).toContain('Body still here')
    // Other block unaffected.
    expect(s.blocks[1].error).toBeUndefined()
    expect(s.blocks[1].body).toContain('Clean')
  })

  it('flags an unclosed fence', () => {
    const raw = `---\ntitle: T\ndate: 2026-01-01\nhost: R\n---\n\n## B\n\n\`\`\`yaml\nkind: win\n\nno close\n`
    const s = parseSession(raw, 't')
    expect(s.blocks[0].error?.message).toMatch(/never closed/i)
  })

  it('reports missing required frontmatter without throwing', () => {
    const s = parseSession(`---\ndate: 2026-01-01\n---\n\n## B\n\nHi.\n`, 'x')
    expect(s.errors.length).toBeGreaterThan(0)
    expect(s.errors.some((e) => /host/.test(e.message))).toBe(true)
    // body still parsed
    expect(s.blocks).toHaveLength(1)
  })
})

describe('parseSession — fence-aware splitting', () => {
  it('does not split on a ## inside a code fence', () => {
    const raw = `---\ntitle: T\ndate: 2026-01-01\nhost: R\n---\n\n## Real block\n\n\`\`\`bash\n## this is a shell comment, not a heading\necho hi\n\`\`\`\n\nDone.\n`
    const s = parseSession(raw, 't')
    expect(s.blocks).toHaveLength(1)
    expect(s.blocks[0].title).toBe('Real block')
    expect(s.blocks[0].body).toContain('shell comment')
  })

  it('unknown kind is preserved but not a known kind', () => {
    const raw = `---\ntitle: T\ndate: 2026-01-01\nhost: R\n---\n\n## B\n\n\`\`\`yaml\nkind: mystery\n\`\`\`\n\nx\n`
    const s = parseSession(raw, 't')
    expect(s.blocks[0].meta.kind).toBe('mystery')
  })
})

describe('parseSession — empty template fields', () => {
  it('treats empty YAML keys as absent, not errors', () => {
    // Mirrors starterMarkdown(): empty presenter/hostContact/summary.
    const raw = `---
title: New session
date: 2026-01-01
host: Ron Myers
hostContact:
summary:
tags: []
---

## Welcome

\`\`\`yaml
kind: welcome
presenter:
\`\`\`

Body.
`
    const s = parseSession(raw, 'new')
    expect(s.errors).toHaveLength(0)
    expect(s.blocks[0].error).toBeUndefined()
    // kind survives even though presenter is empty
    expect(s.blocks[0].meta.kind).toBe('welcome')
    expect(s.blocks[0].meta.presenter).toBeUndefined()
  })

  it('drops an incomplete link row instead of erroring', () => {
    const raw = `---\ntitle: T\ndate: 2026-01-01\nhost: R\n---\n\n## B\n\n\`\`\`yaml\nkind: win\nlinks:\n  - label:\n    url:\n\`\`\`\n\nx\n`
    const s = parseSession(raw, 't')
    expect(s.blocks[0].error).toBeUndefined()
    expect(s.blocks[0].meta.kind).toBe('win')
    expect(s.blocks[0].meta.links).toEqual([])
  })
})

describe('toSummary', () => {
  it('produces an archive summary', () => {
    const s = parseSession(FULL, '2026-08-12')
    const sum = toSummary(s)
    expect(sum.slug).toBe('2026-08-12')
    expect(sum.presenters).toContain('Jennifer MacIsaac')
    expect(sum.leadPhoto?.src).toContain('group.jpg')
    expect(sum.blockCount).toBe(3)
  })
})
