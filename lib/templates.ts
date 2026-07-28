// Markdown generators for new sessions and editor toolbar inserts.
// Markdown is the source of truth (PRD §1), so these emit source text, not
// parsed objects.

import { KIND_ORDER, KINDS } from './kinds'

/** A fresh run sheet with the default six-block skeleton (PRD §6). */
export function starterMarkdown(date: string, host = 'Ron Myers'): string {
  const blocks = KIND_ORDER.map((kind) => {
    const k = KINDS[kind]
    return `## ${k.label}\n\n\`\`\`yaml\nkind: ${kind}\npresenter:\n\`\`\`\n\nWrite the ${k.hint.toLowerCase()} here.\n`
  }).join('\n')

  return `---
title: New session
date: ${date}
host: ${host}
hostContact:
location: The Foundry, 163 Great George Street, Charlottetown
summary:
tags: []
published: false
---

Intro line for the room. Anything above the first heading is the session intro.

${blocks}`
}

/** A single block scaffold for the "insert block" toolbar button. */
export function blockSnippet(kind = 'starter'): string {
  const label = KINDS[kind as keyof typeof KINDS]?.label ?? 'New block'
  return `\n## ${label}\n\n\`\`\`yaml\nkind: ${kind}\npresenter:\ntakeaway:\n\`\`\`\n\nBlock body here.\n`
}

export const YAML_FENCE_SNIPPET = `\`\`\`yaml
kind:
presenter:
contact:
takeaway:
links:
  - label:
    url:
\`\`\`
`

export function photoSnippet(slug: string): string {
  return `\n> Photo referenced from disk: place the file in \`public/sessions/${slug}/\` and add it under \`photos:\` in the frontmatter.\n`
}

export const LINK_SNIPPET = `[link text](https://example.com)`

/** Default slug for a new session: today, or next Wednesday could be nicer,
 * but the host sets the real date in frontmatter. */
export function slugForDate(date: string): string {
  return date
}
