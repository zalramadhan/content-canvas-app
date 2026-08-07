import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchHabits,
  upsertHabits,
  mergeHabits,
  subscribeToHabits,
  isTableMissingError,
} from '../lib/sync'

const STORAGE_KEY = 'contentcanvas_habits'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { habits: [] }
    const parsed = JSON.parse(raw)
    return (parsed && parsed.habits) ? parsed : { habits: [] }
  } catch {
    return { habits: [] }
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save habits to localStorage:', e)
  }
}

const INITIAL_SYNC_STATE = { status: 'local', lastSyncedAt: null }

/**
 * Local-first habit tracker data with optional Supabase cloud sync.
 *
 * - Always persists to localStorage (works offline).
 * - When `userId` is provided: pulls the cloud row, merges with local,
 *   pushes local changes (debounced) and subscribes to realtime updates.
 * - One row per user in the `habits` table (data: { habits: [...] }).
 */
export function useHabits({ userId } = {}) {
  const [data, setData] = useState(loadFromStorage)
  const [syncState, setSyncState] = useState(INITIAL_SYNC_STATE)
  const [syncRetryTick, setSyncRetryTick] = useState(0)

  const dataRef = useRef(data)
  dataRef.current = data

  const lastPushedRef = useRef(null)
  const firstSyncDoneRef = useRef(false)

  // ── Persist to localStorage on every change (cache / offline) ──
  useEffect(() => {
    saveToStorage(data)
  }, [data])

  // ── Initial sync: pull cloud → merge → push local-only changes ──
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
        const cloud = await fetchHabits(userId)
        if (cancelled) return

        const merged = mergeHabits(dataRef.current, cloud)
        if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
          await upsertHabits(userId, merged)
        }
        lastPushedRef.current = merged

        if (cancelled) return
        dataRef.current = merged
        setData(merged)
        firstSyncDoneRef.current = true
        setSyncState({ status: 'synced', lastSyncedAt: Date.now() })
      } catch (e) {
        if (!cancelled) {
          firstSyncDoneRef.current = true
          setSyncState({
            status: 'offline',
            lastSyncedAt: null,
            error: isTableMissingError(e)
              ? 'Tabel habits belum dibuat. Jalankan schema.sql di Supabase SQL Editor.'
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
    if (JSON.stringify(lastPushedRef.current) === JSON.stringify(data)) return

    const timer = setTimeout(async () => {
      try {
        await upsertHabits(userId, dataRef.current)
        lastPushedRef.current = dataRef.current
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

    const unsubscribe = subscribeToHabits(userId, (cloud) => {
      // Own echo: we just pushed this exact payload → ignore
      if (JSON.stringify(lastPushedRef.current) === JSON.stringify(cloud)) return

      const merged = mergeHabits(dataRef.current, cloud)
      // lastPushedRef must reflect what the CLOUD holds (not the merge result), so
      // any local-only check-ins added by the merge get uploaded by the push effect.
      lastPushedRef.current = cloud
      dataRef.current = merged
      setData(merged)
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
          const cloud = await fetchHabits(userId)
          const merged = mergeHabits(dataRef.current, cloud)
          if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
            await upsertHabits(userId, merged)
          }
          lastPushedRef.current = merged
          dataRef.current = merged
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

  // ── Mutations ──
  const commit = useCallback((mutator) => {
    const prev = dataRef.current
    const next = mutator(prev)
    if (next === prev) return
    dataRef.current = next
    setData(next)
  }, [])

  const newId = () =>
    crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)

  const addHabit = useCallback(({ name, emoji, color, weeklyTarget }) => {
    const habit = {
      id: newId(),
      name: String(name || '').trim(),
      emoji: emoji || '✅',
      color: color || '#f97316',
      weeklyTarget: Math.min(7, Math.max(1, Number(weeklyTarget) || 3)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkins: {},
    }
    if (!habit.name) return
    commit(prev => ({
      ...prev,
      habits: [...(prev.habits || []), habit],
    }))
  }, [commit])

  const updateHabit = useCallback((id, updates) => {
    commit(prev => ({
      ...prev,
      habits: (prev.habits || []).map(h =>
        h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
      ),
    }))
  }, [commit])

  const deleteHabit = useCallback((id) => {
    commit(prev => ({
      ...prev,
      habits: (prev.habits || []).filter(h => h.id !== id),
    }))
  }, [commit])

  const toggleCheckin = useCallback((id, dateKey) => {
    commit(prev => ({
      ...prev,
      habits: (prev.habits || []).map(h => {
        if (h.id !== id) return h
        const checkins = { ...(h.checkins || {}) }
        if (checkins[dateKey]) delete checkins[dateKey]
        else checkins[dateKey] = 1
        return { ...h, checkins, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [commit])

  const retrySync = useCallback(() => {
    setSyncRetryTick(t => t + 1)
  }, [])

  return {
    habits: data.habits || [],
    syncState,
    retrySync,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCheckin,
  }
}
