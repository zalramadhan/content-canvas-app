import { supabase } from './supabase'

/**
 * Data model in Supabase:
 *   table: public.entries
 *   row:   { id, user_id, date: 'yyyy-MM-dd', data: jsonb (entries[]), updated_at }
 * One row per user per date. RLS restricts access to the owner (auth.uid()).
 */

/** Fetch all date entries for a user → { 'yyyy-MM-dd': entries[] } */
export async function fetchAllEntries(userId) {
  const { data: rows, error } = await supabase
    .from('entries')
    .select('date, data')
    .eq('user_id', userId)

  if (error) throw error

  const map = {}
  for (const row of rows || []) {
    map[row.date] = Array.isArray(row.data) ? row.data : []
  }
  return map
}

/** Upsert rows for the given date keys. data = full { dateKey: entries[] } map. */
export async function upsertDateRows(userId, keys, data) {
  const rows = keys
    .filter((k) => data[k] !== undefined)
    .map((k) => ({
      user_id: userId,
      date: k,
      data: data[k],
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return

  const { error } = await supabase
    .from('entries')
    .upsert(rows, { onConflict: 'user_id,date' })

  if (error) throw error
}

/**
 * Merge local + cloud data at the entry level.
 * - Dates present on only one side are kept.
 * - Dates present on both sides merge by entry id; newer (updatedAt/createdAt) wins.
 * Returns a new { dateKey: entries[] } map.
 */
export function mergeEntries(local, cloud) {
  const keys = new Set([...Object.keys(local), ...Object.keys(cloud)])
  const merged = {}

  for (const key of keys) {
    const localEntries = local[key] || []
    const cloudEntries = cloud[key] || []

    const byId = new Map()
    for (const entry of cloudEntries) byId.set(entry.id, entry)

    for (const entry of localEntries) {
      const existing = byId.get(entry.id)
      if (!existing) {
        byId.set(entry.id, entry)
      } else if (timestampOf(entry) > timestampOf(existing)) {
        byId.set(entry.id, entry)
      }
    }

    merged[key] = Array.from(byId.values())
  }

  return merged
}

function timestampOf(entry) {
  if (!entry) return 0
  return new Date(entry.updatedAt || entry.createdAt || 0).getTime() || 0
}

/** Keys whose serialized value differs between two data maps. */
export function changedKeysBetween(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const changed = []
  for (const key of keys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) changed.push(key)
  }
  return changed
}

/**
 * Subscribe to realtime changes on this user's entries.
 * Returns an unsubscribe function.
 */
export function subscribeToEntries(userId, onChange) {
  const channel = supabase
    .channel(`entries-sync-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'entries',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // DELETE is ignored: the app never deletes rows (only sets empty arrays),
        // so local data is always the safer source of truth.
        if (payload.eventType === 'DELETE') return
        const row = payload.new
        if (!row) return
        onChange(row.date, Array.isArray(row.data) ? row.data : [])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** True when the error is caused by a required table not existing yet. */
export function isTableMissingError(error) {
  if (!error) return false
  const code = error.code || error.status
  if (code === '42P01' || code === 'PGRST205') return true
  return /could not find the table|relation .* does not exist/i.test(String(error.message || ''))
}

// ═══════════════════════════════════════════════════════════════
//  HABIT TRACKER SYNC
//  Data model: table public.habits, SATU baris per user:
//    row: { id, user_id, data: jsonb (habits[]), updated_at }
//  data shape: { habits: [ { id, name, emoji, color, weeklyTarget,
//                            createdAt, updatedAt, checkins: { 'yyyy-MM-dd': 1 } } ] }
// ═══════════════════════════════════════════════════════════════

/** Fetch the user's habit data (single row) → { habits: [...] } */
export async function fetchHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return (data && data.data) || { habits: [] }
}

/** Upsert the user's whole habit payload. */
export async function upsertHabits(userId, habitsData) {
  const { error } = await supabase
    .from('habits')
    .upsert(
      {
        user_id: userId,
        data: habitsData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) throw error
}

/**
 * Merge local + cloud habit data (last-writer-wins per habit, but
 * check-ins are unioned so nothing gets lost between devices).
 */
export function mergeHabits(localData, cloudData) {
  const local = (localData && localData.habits) || []
  const cloud = (cloudData && cloudData.habits) || []

  const byId = new Map()
  for (const h of cloud) byId.set(h.id, h)

  for (const h of local) {
    const existing = byId.get(h.id)
    if (!existing) {
      byId.set(h.id, h)
    } else {
      const newer = timestampOf(h) > timestampOf(existing) ? h : existing
      const older = newer === h ? existing : h
      byId.set(h.id, {
        ...newer,
        checkins: { ...(older.checkins || {}), ...(newer.checkins || {}) },
      })
    }
  }

  return { habits: Array.from(byId.values()) }
}

/**
 * Subscribe to realtime changes on this user's habits row.
 * Returns an unsubscribe function.
 */
export function subscribeToHabits(userId, onChange) {
  const channel = supabase
    .channel(`habits-sync-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'habits',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // DELETE is ignored (the app never deletes the row — local is the source of truth).
        if (payload.eventType === 'DELETE') return
        const row = payload.new
        if (!row) return
        onChange((row.data && row.data.habits) ? row.data : { habits: [] })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
