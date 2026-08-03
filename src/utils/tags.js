// ── Content tag/category helpers ──

/** Collect all unique tags from data → [{ name, count }] sorted by count desc. */
export function getAllTags(data) {
  const counts = {}
  for (const entries of Object.values(data || {})) {
    for (const entry of entries || []) {
      for (const t of entry.tags || []) {
        if (typeof t === 'string' && t.trim()) {
          const name = t.trim()
          counts[name] = (counts[name] || 0) + 1
        }
      }
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// Soft pastel palette (bg / text / border) for tag chips
const PALETTE = [
  { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
  { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
  { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  { bg: '#f5f5f4', text: '#44403c', border: '#d6d3d1' },
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
]

/** Deterministic color for a tag name (stable across renders). */
export function colorForTag(tag) {
  let h = 0
  const s = String(tag)
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return PALETTE[h % PALETTE.length]
}
