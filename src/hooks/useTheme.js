import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'contentcanvas_theme'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
  } catch {}

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme)

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  // Listen for system preference changes (only when no stored preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e) => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
          setThemeState(e.matches ? 'dark' : 'light')
        }
      } catch {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme)
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setTheme,
  }
}
