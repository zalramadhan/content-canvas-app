import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchFinance,
  upsertFinance,
  mergeFinance,
  subscribeToFinance,
  isTableMissingError,
} from '../lib/sync'

const STORAGE_KEY = 'contentcanvas_finance'
const EMPTY = { wallets: [], transactions: [], budgets: [] }

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return {
      wallets: parsed.wallets || [],
      transactions: parsed.transactions || [],
      budgets: parsed.budgets || [],
    }
  } catch {
    return { ...EMPTY }
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save finance data to localStorage:', e)
  }
}

const INITIAL_SYNC_STATE = { status: 'local', lastSyncedAt: null }

/**
 * Local-first financial tracker data with optional Supabase cloud sync.
 * One row per user in the `finance` table: { wallets, transactions, budgets }.
 */
export function useFinance({ userId } = {}) {
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
        const cloud = await fetchFinance(userId)
        if (cancelled) return

        const merged = mergeFinance(dataRef.current, cloud)
        if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
          await upsertFinance(userId, merged)
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
              ? 'Tabel finance belum dibuat. Jalankan schema.sql di Supabase SQL Editor.'
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
        await upsertFinance(userId, dataRef.current)
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

    const unsubscribe = subscribeToFinance(userId, (cloud) => {
      // Own echo: we just pushed this exact payload → ignore
      if (JSON.stringify(lastPushedRef.current) === JSON.stringify(cloud)) return

      const merged = mergeFinance(dataRef.current, cloud)
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
          const cloud = await fetchFinance(userId)
          const merged = mergeFinance(dataRef.current, cloud)
          if (JSON.stringify(merged) !== JSON.stringify(cloud)) {
            await upsertFinance(userId, merged)
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

  // ── Wallets ──
  const addWallet = useCallback(({ name, emoji, color, initialBalance }) => {
    const wallet = {
      id: newId(),
      name: String(name || '').trim(),
      emoji: emoji || '💵',
      color: color || '#f97316',
      initialBalance: Math.max(0, Number(initialBalance) || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (!wallet.name) return
    commit(prev => ({ ...prev, wallets: [...(prev.wallets || []), wallet] }))
  }, [commit])

  const updateWallet = useCallback((id, updates) => {
    commit(prev => ({
      ...prev,
      wallets: (prev.wallets || []).map(w =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
      ),
    }))
  }, [commit])

  const deleteWallet = useCallback((id) => {
    commit(prev => ({
      ...prev,
      wallets: (prev.wallets || []).filter(w => w.id !== id),
    }))
  }, [commit])

  // ── Transactions ──
  const addTransaction = useCallback(({ type, amount, category, walletId, date, note }) => {
    const tx = {
      id: newId(),
      type: type === 'income' ? 'income' : 'expense',
      amount: Math.max(0, Number(amount) || 0),
      category: String(category || 'Lainnya'),
      walletId: walletId || null,
      date: String(date || new Date().toISOString().slice(0, 10)),
      note: String(note || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (tx.amount <= 0) return
    commit(prev => ({ ...prev, transactions: [...(prev.transactions || []), tx] }))
  }, [commit])

  const deleteTransaction = useCallback((id) => {
    commit(prev => ({
      ...prev,
      transactions: (prev.transactions || []).filter(t => t.id !== id),
    }))
  }, [commit])

  // ── Budgets (per kategori per bulan) ──
  const addBudget = useCallback(({ category, amount, month }) => {
    const budget = {
      id: newId(),
      category: String(category || 'Lainnya'),
      amount: Math.max(0, Number(amount) || 0),
      month: String(month || new Date().toISOString().slice(0, 7)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (budget.amount <= 0) return
    commit(prev => {
      const existing = (prev.budgets || []).find(
        b => b.month === budget.month && b.category === budget.category
      )
      if (existing) {
        return {
          ...prev,
          budgets: (prev.budgets || []).map(b =>
            b.id === existing.id
              ? { ...b, amount: budget.amount, updatedAt: new Date().toISOString() }
              : b
          ),
        }
      }
      return { ...prev, budgets: [...(prev.budgets || []), budget] }
    })
  }, [commit])

  const deleteBudget = useCallback((id) => {
    commit(prev => ({
      ...prev,
      budgets: (prev.budgets || []).filter(b => b.id !== id),
    }))
  }, [commit])

  const retrySync = useCallback(() => {
    setSyncRetryTick(t => t + 1)
  }, [])

  return {
    wallets: data.wallets || [],
    transactions: data.transactions || [],
    budgets: data.budgets || [],
    syncState,
    retrySync,
    addWallet,
    updateWallet,
    deleteWallet,
    addTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
  }
}
