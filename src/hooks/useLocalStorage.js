import { useState, useEffect, useCallback } from 'react'

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

export function useLocalStorage() {
  const [data, setData] = useState(loadFromStorage)

  useEffect(() => {
    saveToStorage(data)
  }, [data])

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

  return {
    data,
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
