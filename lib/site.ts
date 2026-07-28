// Site-wide constants and date helpers. Only string-argument Date construction
// is used (no Date.now / argless new Date) so this runs anywhere.

export const SITE = {
  name: 'AI Together',
  tagline: 'The weekly session at The Foundry',
  domain: 'aitogether.peiitalliance.com',
  url: 'https://aitogether.peiitalliance.com',
  parentUrl: 'https://peiitalliance.com/ai-together',
  location: 'The Foundry, 163 Great George Street, Charlottetown',
  invite: 'New here? You need nothing prepared. Just say hello.',
}

// Week 1 is 2026-07-29 (so 2026-08-05 is week 2).
const PROGRAM_EPOCH = '2026-07-29'
const DAY = 86_400_000

function toDate(iso: string): Date | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function weekNumber(iso: string): number | null {
  const d = toDate(iso)
  const epoch = toDate(PROGRAM_EPOCH)
  if (!d || !epoch) return null
  const diff = Math.round((d.getTime() - epoch.getTime()) / DAY)
  return Math.floor(diff / 7) + 1
}

const LONG = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})
const SHORT = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  const d = toDate(iso)
  return d ? LONG.format(d) : iso
}
export function formatDateShort(iso: string): string {
  const d = toDate(iso)
  return d ? SHORT.format(d) : iso
}
