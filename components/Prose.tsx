// Renders pre-computed markdown HTML. Server pages call renderMarkdown() and
// pass the string; client callers (studio preview) do the same in an effect.
export function Prose({
  html,
  className = '',
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={`prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
