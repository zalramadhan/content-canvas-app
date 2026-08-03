// ── Shared drag-and-drop format for moving entries between dates ──
// Used by the calendar (drop targets) and the day sidebar (drag source).

export const ENTRY_MIME = 'application/x-cc-entry'

export function encodeEntryDrag(dateKey, entryId) {
  return JSON.stringify({ dateKey, id: entryId })
}

export function decodeEntryDrag(raw) {
  if (!raw) return null
  try {
    const d = JSON.parse(raw)
    return d && d.dateKey && d.id ? { dateKey: d.dateKey, id: d.id } : null
  } catch {
    return null
  }
}

// ── Module-level flag so the calendar can show the drop hint for any entry drag ──
let entryDragActive = false

export function setEntryDragActive(v) {
  entryDragActive = v
}

export function isEntryDragActive() {
  return entryDragActive
}
