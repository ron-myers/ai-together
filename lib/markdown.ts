import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

// Shared markdown -> HTML pipeline. Runs the same server-side (static build)
// and client-side (studio preview, present mode). remark-gfm for tables and
// task lists, rehype-raw so inline HTML in a body renders, rehype-highlight
// for fenced code (PRD §12).

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeStringify)

/** Render a markdown string to an HTML string. Empty input -> ''. */
export async function renderMarkdown(md: string): Promise<string> {
  const src = (md ?? '').trim()
  if (!src) return ''
  const file = await processor.process(src)
  return String(file)
}
