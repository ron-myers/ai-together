'use client'

import { kindMeta } from '@/lib/kinds'

// The signature element (PRD §11). A vertical rail of numbered nodes, one per
// block. Same component in three contexts:
//   - outline   : studio jump list + parse status
//   - progress  : present-mode live progress, fills as blocks complete
//   - timeline  : public recap, marks the block in view
// One idea, three jobs.

export interface SpineNode {
  index: number
  title: string
  kind?: string | null
  error?: boolean
}

export function Spine({
  nodes,
  current,
  completed,
  onSelect,
  variant = 'outline',
  animate = true,
  className = '',
}: {
  nodes: SpineNode[]
  current?: number
  completed?: Set<number>
  onSelect?: (index: number) => void
  variant?: 'outline' | 'progress' | 'timeline'
  animate?: boolean
  className?: string
}) {
  const interactive = Boolean(onSelect)
  return (
    <ol
      className={`relative flex flex-col ${className}`}
      aria-label="Session blocks"
    >
      {nodes.map((node, i) => {
        const isCurrent = current === node.index
        const isDone = completed?.has(node.index) ?? false
        const meta = kindMeta(node.kind)
        const num = String(node.index + 1).padStart(2, '0')

        const dotState = node.error
          ? 'error'
          : isCurrent
            ? 'current'
            : isDone
              ? 'done'
              : 'idle'

        const inner = (
          <span className="flex items-start gap-3">
            <span className="relative flex flex-col items-center">
              {/* connector line to next node */}
              {i < nodes.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-7 h-[calc(100%+0.25rem)] w-px"
                  style={{
                    background: isDone
                      ? 'var(--gold-deep)'
                      : 'var(--rule-strong)',
                  }}
                />
              )}
              <span
                className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.65rem] font-medium transition-colors"
                style={spineDotStyle(dotState)}
              >
                {node.error ? '!' : num}
              </span>
            </span>
            <span className="min-w-0 pt-0.5">
              <span
                className="block truncate text-[0.9rem] leading-snug"
                style={{
                  color: isCurrent ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                {node.title || 'Untitled'}
              </span>
              {meta && variant !== 'timeline' && (
                <span className="mono text-[0.6rem] uppercase tracking-wider text-ink-soft/70">
                  {meta.level}
                </span>
              )}
            </span>
          </span>
        )

        return (
          <li
            key={node.index}
            className="relative pb-4 last:pb-0"
            style={
              animate
                ? {
                    animation: `spineIn 0.4s ease-out ${i * 0.06}s both`,
                  }
                : undefined
            }
          >
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(node.index)}
                aria-current={isCurrent ? 'step' : undefined}
                className="w-full rounded-md text-left"
              >
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ol>
  )
}

function spineDotStyle(
  state: 'idle' | 'current' | 'done' | 'error',
): React.CSSProperties {
  switch (state) {
    case 'current':
      return {
        background: 'var(--gold)',
        borderColor: 'var(--gold-deep)',
        color: 'var(--maroon)',
        boxShadow: '0 0 0 3px color-mix(in srgb, var(--gold) 30%, transparent)',
      }
    case 'done':
      return {
        background: 'var(--gold-deep)',
        borderColor: 'var(--gold-deep)',
        color: 'var(--paper)',
      }
    case 'error':
      return {
        background: 'color-mix(in srgb, var(--red) 14%, var(--paper))',
        borderColor: 'var(--red)',
        color: 'var(--red)',
      }
    default:
      return {
        background: 'var(--paper)',
        borderColor: 'var(--rule-strong)',
        color: 'var(--ink-soft)',
      }
  }
}
