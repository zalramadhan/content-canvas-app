import { useState, useEffect } from 'react'

// ── Smooth Expand/Collapse Hook ──
export function useSmoothExpand(expanded, duration = 300) {
  const [visible, setVisible] = useState(expanded)

  useEffect(() => {
    if (expanded) {
      setVisible(true)
    } else {
      const timer = setTimeout(() => setVisible(false), duration)
      return () => clearTimeout(timer)
    }
  }, [expanded, duration])

  return visible
}
