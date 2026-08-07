import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchNotes,
  upsertNotes,
  mergeNotes,
  subscribeToNotes,
  isTableMissingError,
} from '../lib/sync'

const STORAGE_KEY = 'contentcanvas_notes'
const EMPTY = { notes: [], todos: [] }

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return {
      notes: parsed.notes || [],
      todos: parsed.todos || [],
    }
  } catch {
    return { ...EMPTY }
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save notes data to localStorage:', e)
  }
}

const INITIAL_SYNC_STATE = { status: 'local', lastSyncedAt: null }

/**
 * Local-first notes & todo tracker with optional Supabase cloud sync.
 * One row per user in the `notes` table: { notes: [], todos: [] }.
 */
export function useNotes({ userId } = {}) {
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
        const cloud = await fetchNotes(userId)
        if (cancelled) return

        const merged = mergeNotes(dataRef.current, cloud)
        if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
          await upsertNotes(userId, merged)
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
              ? 'Tabel notes belum dibuat. Jalankan schema.sql di Supabase SQL Editor.'
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
        await upsertNotes(userId, dataRef.current)
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

    const unsubscribe = subscribeToNotes(userId, (cloud) => {
      // Own echo: we just pushed this exact payload → ignore
      if (JSON.stringify(lastPushedRef.current) === JSON.stringify(cloud)) return

      const merged = mergeNotes(dataRef.current, cloud)
      // lastPushedRef reflects what the CLOUD holds so any local-only items
      // added by the merge get uploaded by the push effect.
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
          const cloud = await fetchNotes(userId)
          const merged = mergeNotes(dataRef.current, cloud)
          if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
            await upsertNotes(userId, merged)
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

  // ── Notes ──
  const addNote = useCallback(({ title, content, color, pinned }) => {
    const note = {
      id: newId(),
      title: String(title || '').trim(),
      content: String(content || '').trim(),
      color: color || 'amber',
      pinned: !!pinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (!note.title && !note.content) return
    commit(prev => ({ ...prev, notes: [...(prev.notes || []), note] }))
  }, [commit])

  const updateNote = useCallback((id, updates) => {
    commit(prev => ({
      ...prev,
      notes: (prev.notes || []).map(n =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      ),
    }))
  }, [commit])

  const deleteNote = useCallback((id) => {
    commit(prev => ({
      ...prev,
      notes: (prev.notes || []).filter(n => n.id !== id),
    }))
  }, [commit])

  // ── Todos ──
  const addTodo = useCallback(({ title, priority, category, dueDate }) => {
    const todo = {
      id: newId(),
      title: String(title || '').trim(),
      done: false,
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      category: String(category || 'Pribadi'),
      dueDate: dueDate || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (!todo.title) return
    commit(prev => ({ ...prev, todos: [...(prev.todos || []), todo] }))
  }, [commit])

  const updateTodo = useCallback((id, updates) => {
    commit(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }))
  }, [commit])

  const deleteTodo = useCallback((id) => {
    commit(prev => ({
      ...prev,
      todos: (prev.todos || []).filter(t => t.id !== id),
    }))
  }, [commit])

  const toggleTodo = useCallback((id) => {
    commit(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t =>
        t.id === id
          ? { ...t, done: !t.done, updatedAt: new Date().toISOString() }
          : t
      ),
    }))
  }, [commit])

  const retrySync = useCallback(() => {
    setSyncRetryTick(t => t + 1)
  }, [])

  return {
    notes: data.notes || [],
    todos: data.todos || [],
    syncState,
    retrySync,
    addNote,
    updateNote,
    deleteNote,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  }
}
