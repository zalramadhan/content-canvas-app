import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchAllEntries,
  upsertDateRows,
  mergeEntries,
  changedKeysBetween,
  subscribeToEntries,
  isTableMissingError,
} from '../lib/sync'

const STORAGE_KEY = 'contentcanvas_data'
const STORAGE_VERSION = 1

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed.version !== STORAGE_VERSION) return {}
    return parsed.data || {}
  } catch {
    return {}
  }
}

function saveToStorage(data) {
  try {
    const payload = JSON.stringify({
      version: STORAGE_VERSION,
      data,
      updatedAt: new Date().toISOString(),
    })
    localStorage.setItem(STORAGE_KEY, payload)
  } catch (e) {
    console.warn('Failed to save to localStorage:', e)
  }
}

const INITIAL_SYNC_STATE = { status: 'local', lastSyncedAt: null }

/**
 * Local-first data hook with optional Supabase cloud sync.
 *
 * - Always persists to localStorage (works offline).
 * - When `userId` is provided (user logged in):
 *   1. Pulls the cloud, merges with local data, uploads anything new.
 *   2. Pushes local changes to the cloud (debounced).
 *   3. Subscribes to realtime changes from other devices.
 */
export function useLocalStorage({ userId } = {}) {
  const [data, setData] = useState(loadFromStorage)
  const [syncState, setSyncState] = useState(INITIAL_SYNC_STATE)
  const [syncRetryTick, setSyncRetryTick] = useState(0)

  // Refs mirroring current state for use inside async callbacks / effects
  const dataRef = useRef(data)
  dataRef.current = data

  const prevDataRef = useRef(data)
  const lastPushedRef = useRef({})
  const firstSyncDoneRef = useRef(false)

  // ── Persist to localStorage on every change (cache / offline) ──
  useEffect(() => {
    saveToStorage(data)
  }, [data])

  // ── Initial sync: pull cloud → merge → push local-only changes ──
  // Re-runs when `syncRetryTick` changes (manual retry from the UI).
  useEffect(() => {
    if (!userId) {
      firstSyncDoneRef.current = false
      setSyncState(INITIAL_SYNC_STATE)
      return
    }

    let cancelled = false
    firstSyncDoneRef.current = false
    setSyncState({ status: 'syncing', lastSyncedAt: null })

    ;(async () => {
      try {
        const cloud = await fetchAllEntries(userId)
        if (cancelled) return

        const local = dataRef.current
        const merged = mergeEntries(local, cloud)
        prevDataRef.current = merged

        // Upload anything that is new or newer locally
        const changedKeys = changedKeysBetween(merged, cloud)
        if (changedKeys.length > 0) {
          await upsertDateRows(userId, changedKeys, merged)
        }
        for (const key of changedKeys) {
          lastPushedRef.current[key] = merged[key]
        }

        if (cancelled) return
        dataRef.current = merged
        setData(merged)
        firstSyncDoneRef.current = true
        setSyncState({ status: 'synced', lastSyncedAt: Date.now() })
      } catch (e) {
        if (!cancelled) {
          // Table may not exist yet (run schema.sql), or network issue — stay local
          firstSyncDoneRef.current = true
          setSyncState({
            status: 'offline',
            lastSyncedAt: null,
            error: isTableMissingError(e)
              ? 'Tabel belum dibuat. Jalankan schema.sql di Supabase SQL Editor.'
              : 'Tidak dapat terhubung ke server.',
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, syncRetryTick])

  // ── Push local changes to the cloud (debounced) ──
  useEffect(() => {
    if (!userId) return
    if (!firstSyncDoneRef.current) return

    const prev = prevDataRef.current
    // Skip keys whose value matches what we last pushed (e.g. rows applied
    // via realtime) to avoid echoing our own/remote data back to the cloud.
    const changedKeys = changedKeysBetween(prev, data).filter(
      (k) => JSON.stringify(lastPushedRef.current[k]) !== JSON.stringify(data[k])
    )
    prevDataRef.current = data
    if (changedKeys.length === 0) return

    const timer = setTimeout(async () => {
      try {
        await upsertDateRows(userId, changedKeys, dataRef.current)
        for (const key of changedKeys) {
          lastPushedRef.current[key] = dataRef.current[key]
        }
        setSyncState({ status: 'synced', lastSyncedAt: Date.now() })
      } catch {
        setSyncState({ status: 'offline', lastSyncedAt: null })
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [data, userId])

  // ── Realtime: apply changes coming from other devices ──
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToEntries(userId, (dateKey, entries) => {
      const pushed = lastPushedRef.current[dateKey]
      // Own echo: we just pushed this exact payload → ignore
      if (pushed && JSON.stringify(pushed) === JSON.stringify(entries)) return

      const local = dataRef.current[dateKey] || []
      // Local has edits newer than what we pushed → don't clobber
      if (pushed && JSON.stringify(local) !== JSON.stringify(pushed)) return

      // Note: if two devices edit the same entry simultaneously, the last
      // writer wins — acceptable for a personal planner.
      lastPushedRef.current[dateKey] = entries
      setData((prev) => ({ ...prev, [dateKey]: entries }))
      setSyncState({ status: 'synced', lastSyncedAt: Date.now() })
    })

    return () => unsubscribe()
  }, [userId])

  // ── Re-pull when the network comes back ──
  useEffect(() => {
    if (!userId) return
    const handleOnline = () => {
      ;(async () => {
        try {
          const cloud = await fetchAllEntries(userId)
          const merged = mergeEntries(dataRef.current, cloud)
          const changedKeys = changedKeysBetween(merged, cloud)
          if (changedKeys.length > 0) {
            await upsertDateRows(userId, changedKeys, merged)
          }
          for (const key of changedKeys) {
            lastPushedRef.current[key] = merged[key]
          }
          dataRef.current = merged
          prevDataRef.current = merged
          setData(merged)
          setSyncState({ status: 'synced', lastSyncedAt: Date.now() })
        } catch {
          setSyncState({ status: 'offline', lastSyncedAt: null })
        }
      })()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [userId])

  // ── Data mutation API (unchanged) ──
  const getDayEntries = useCallback((dateKey) => {
    return data[dateKey] || []
  }, [data])

  const setDayEntries = useCallback((dateKey, entries) => {
    setData(prev => ({
      ...prev,
      [dateKey]: entries,
    }))
  }, [])

  const addEntry = useCallback((dateKey, entry) => {
    setData(prev => {
      const existing = prev[dateKey] || []
      const newEntry = {
        ...entry,
        id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
      }
      return {
        ...prev,
        [dateKey]: [...existing, newEntry],
      }
    })
  }, [])

  const updateEntry = useCallback((dateKey, entryId, updates) => {
    setData(prev => {
      const entries = prev[dateKey] || []
      return {
        ...prev,
        [dateKey]: entries.map(e =>
          e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
        ),
      }
    })
  }, [])

  const deleteEntry = useCallback((dateKey, entryId) => {
    setData(prev => {
      const entries = prev[dateKey] || []
      return {
        ...prev,
        [dateKey]: entries.filter(e => e.id !== entryId),
      }
    })
  }, [])

  const reorderEntry = useCallback((dateKey, entryId, newIndex) => {
    setData(prev => {
      const entries = prev[dateKey] || []
      const currentIndex = entries.findIndex(e => e.id === entryId)
      if (currentIndex === -1) return prev

      const reordered = [...entries]
      const [moved] = reordered.splice(currentIndex, 1)
      reordered.splice(newIndex, 0, moved)

      return {
        ...prev,
        [dateKey]: reordered,
      }
    })
  }, [])

  const getAllDateKeys = useCallback(() => {
    return Object.keys(data).sort()
  }, [data])

  const getMonthDateKeys = useCallback((year, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return Object.keys(data)
      .filter(key => key.startsWith(prefix))
      .sort()
  }, [data])

  const retrySync = useCallback(() => {
    setSyncRetryTick(t => t + 1)
  }, [])

  return {
    data,
    syncState,
    retrySync,
    getDayEntries,
    setDayEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntry,
    getAllDateKeys,
    getMonthDateKeys,
  }
}
