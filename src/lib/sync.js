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

/** True when the error is caused by the entries table not existing yet. */
export function isTableMissingError(error) {
  if (!error) return false
  const code = error.code || error.status
  if (code === '42P01') return true
  return /entries.*does not exist|relation.*does not exist/i.test(String(error.message || ''))
}
