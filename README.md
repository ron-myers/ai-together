# AI Together Sessions

A Next.js app for running and archiving the weekly **AI Together** sessions at
The Foundry. Three jobs: **author** a session in Markdown, **run** it in the
room on a TV one block at a time, and **publish** it as a permanent public
archive entry.

Markdown is the source of truth. Local storage holds work in progress. Export
produces a folder of Markdown plus images, ready to commit and ship.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · CodeMirror 6 ·
`gray-matter` / `remark` / `rehype` / `js-yaml` / `zod` / `jszip`. Deployed on
Vercel with static generation for the public routes.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # parser + bundle unit tests (vitest)
pnpm build      # production build + static generation
pnpm lint
```

## Routes

**Public** (static / SSG): `/`, `/sessions`, `/sessions/[slug]`,
`/sessions/[slug]/recap`, `/presenters`, `/presenters/[name]`, `/takeaways`.

**Host** (client only, `noindex`): `/studio`, `/studio/[slug]`,
`/studio/[slug]/present`.

## Publishing a session (the handoff)

1. Write the run sheet in `/studio`. It autosaves to your browser.
2. Click **Export** to download `<slug>.zip` — a folder with the Markdown file
   and an `images/` folder.
3. Drop the Markdown into `content/sessions/<slug>.md` and any photos into
   `public/sessions/<slug>/`. Image paths in the frontmatter are repo-relative,
   so no rewriting is needed.
4. Set `published: true`, commit, and Vercel ships the page.

## Markdown shape

Session frontmatter (only `title`, `date`, `host` are required) followed by
level-2 headings, each an optional leading `yaml` fence for block metadata:

````markdown
---
title: Prompting patterns
date: 2026-08-12
host: Ron Myers
photos:
  - src: /sessions/2026-08-12/group.jpg
    alt: The room
published: true
---

## Share a win

```yaml
kind: win
presenter: Jennifer MacIsaac
takeaway: Voice note to summary in four minutes
links:
  - label: The tool
    url: https://example.com
```

Prose renders normally here.
````

Block `kind` drives the level badge: `welcome`, `win`, `starter`,
`intermediate`, `advanced`, `build`. Unknown or absent kinds render neutral.

## Architecture

- **Parser** (`lib/parse.ts`) — one pure, synchronous parser shared by studio
  preview, present mode, and the static build. Fence-aware block splitting with
  line-accurate error reporting.
- **Storage** (`lib/store/*`) — everything goes through the `SessionStore`
  interface. `LocalSessionStore` backs `/studio` (localStorage);
  `FileSessionStore` backs the public routes (reads `content/sessions` at
  build). Swapping in Supabase later touches one file.
- **The spine** (`components/Spine.tsx`) — the signature element. One component
  in three contexts: studio outline, present-mode progress, public recap
  timeline.

