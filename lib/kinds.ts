// Block kinds drive the level badge in every view. Order matches the default
// run of show in the room. Unknown/absent kinds render neutral.

export type BlockKind =
  | 'welcome'
  | 'win'
  | 'starter'
  | 'intermediate'
  | 'advanced'
  | 'build'

export interface KindMeta {
  kind: BlockKind
  label: string
  /** Short level word shown in the badge. */
  level: string
  /** Longer description for tooltips / a11y. */
  hint: string
}

export const KINDS: Record<BlockKind, KindMeta> = {
  welcome: {
    kind: 'welcome',
    label: 'Welcome',
    level: 'Open',
    hint: 'Host opens the room',
  },
  win: {
    kind: 'win',
    label: 'Share a win',
    level: 'Win',
    hint: 'A tool or a small win from the week',
  },
  starter: {
    kind: 'starter',
    label: 'Starter',
    level: 'Starter',
    hint: 'Plain-language on-ramp',
  },
  intermediate: {
    kind: 'intermediate',
    label: 'Next level',
    level: 'Next level',
    hint: 'For people already using AI',
  },
  advanced: {
    kind: 'advanced',
    label: 'Going deeper',
    level: 'Deeper',
    hint: 'Multi-step and agentic work',
  },
  build: {
    kind: 'build',
    label: 'Build & connect',
    level: 'Build',
    hint: 'Peer help and hands-on time',
  },
}

export const KIND_ORDER: BlockKind[] = [
  'welcome',
  'win',
  'starter',
  'intermediate',
  'advanced',
  'build',
]

export function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === 'string' && value in KINDS
}

/** Resolve a kind string to its metadata, or null when unknown/absent. */
export function kindMeta(value: string | undefined | null): KindMeta | null {
  if (value && isBlockKind(value)) return KINDS[value]
  return null
}
