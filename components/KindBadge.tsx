import { kindMeta } from '@/lib/kinds'

// The level badge. Unknown or absent kinds render neutral (PRD §7.2).
export function KindBadge({
  kind,
  className = '',
}: {
  kind?: string | null
  className?: string
}) {
  const meta = kindMeta(kind)
  return (
    <span
      className={`kind-badge ${className}`}
      data-kind={meta?.kind}
      title={meta?.hint}
    >
      {meta ? meta.level : 'Note'}
    </span>
  )
}
