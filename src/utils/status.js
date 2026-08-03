// ── Content Status Pipeline ──
// Each status has static Tailwind classes so the compiler can pick them up.

export const STATUSES = [
  {
    id: 'idea',
    label: 'Idea',
    color: '#6b7280',
    softBg: 'bg-gray-100 dark:bg-gray-700/40',
    softText: 'text-gray-600 dark:text-gray-300',
    chipBg: 'bg-gray-200 dark:bg-gray-700/60',
    dot: 'bg-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
  },
  {
    id: 'planning',
    label: 'Planning',
    color: '#0ea5e9',
    softBg: 'bg-sky-100 dark:bg-sky-900/30',
    softText: 'text-sky-700 dark:text-sky-300',
    chipBg: 'bg-sky-200 dark:bg-sky-900/50',
    dot: 'bg-sky-500',
    border: 'border-sky-300 dark:border-sky-700',
  },
  {
    id: 'scripting',
    label: 'Scripting',
    color: '#8b5cf6',
    softBg: 'bg-violet-100 dark:bg-violet-900/30',
    softText: 'text-violet-700 dark:text-violet-300',
    chipBg: 'bg-violet-200 dark:bg-violet-900/50',
    dot: 'bg-violet-500',
    border: 'border-violet-300 dark:border-violet-700',
  },
  {
    id: 'recording',
    label: 'Recording',
    color: '#f59e0b',
    softBg: 'bg-amber-100 dark:bg-amber-900/30',
    softText: 'text-amber-700 dark:text-amber-300',
    chipBg: 'bg-amber-200 dark:bg-amber-900/50',
    dot: 'bg-amber-500',
    border: 'border-amber-300 dark:border-amber-700',
  },
  {
    id: 'editing',
    label: 'Editing',
    color: '#ec4899',
    softBg: 'bg-pink-100 dark:bg-pink-900/30',
    softText: 'text-pink-700 dark:text-pink-300',
    chipBg: 'bg-pink-200 dark:bg-pink-900/50',
    dot: 'bg-pink-500',
    border: 'border-pink-300 dark:border-pink-700',
  },
  {
    id: 'ready',
    label: 'Ready',
    color: '#14b8a6',
    softBg: 'bg-teal-100 dark:bg-teal-900/30',
    softText: 'text-teal-700 dark:text-teal-300',
    chipBg: 'bg-teal-200 dark:bg-teal-900/50',
    dot: 'bg-teal-500',
    border: 'border-teal-300 dark:border-teal-700',
  },
  {
    id: 'posted',
    label: 'Posted',
    color: '#22c55e',
    softBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    softText: 'text-emerald-700 dark:text-emerald-300',
    chipBg: 'bg-emerald-200 dark:bg-emerald-900/50',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
]

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

export function getStatus(id) {
  return STATUS_MAP[id] || STATUSES[0]
}

export function getStatusIndex(id) {
  const idx = STATUSES.findIndex((s) => s.id === id)
  return idx === -1 ? 0 : idx
}

/** Default status for newly created entries. */
export const DEFAULT_STATUS = 'idea'
