// ── Browser Notifications for content reminders ──

const NOTIFIED_KEY = 'contentcanvas_notified'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Entries scheduled between today and today+N days that aren't posted yet. */
export function getUpcomingItems(data, days = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + days)

  const items = []
  for (const [dateKey, entries] of Object.entries(data || {})) {
    const date = new Date(`${dateKey}T00:00:00`)
    if (isNaN(date) || date < today || date > end) continue
    for (const entry of entries || []) {
      if (entry.status !== 'posted') {
        items.push({ dateKey, date, entry })
      }
    }
  }
  return items.sort((a, b) => a.date - b.date)
}

function loadNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveNotified(map) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/**
 * Show a browser notification for content due TODAY that hasn't been notified yet.
 * Returns the number of notifications shown.
 */
export function notifyDueToday(data) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return 0

  const todayKey = new Date().toISOString().slice(0, 10)
  const notified = loadNotified()
  const seen = new Set(notified[todayKey] || [])
  const items = getUpcomingItems(data, 0).filter((i) => i.dateKey === todayKey)

  let shown = 0
  for (const item of items) {
    if (seen.has(item.entry.id)) continue
    seen.add(item.entry.id)
    try {
      const n = new Notification('🎬 Konten hari ini!', {
        body: `${item.entry.headline || 'Konten tanpa judul'} — jangan lupa posting hari ini.`,
        tag: `cc-${item.entry.id}`,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
      shown++
    } catch {
      /* ignore */
    }
  }
  if (shown > 0) {
    notified[todayKey] = [...seen]
    saveNotified(notified)
  }
  return shown
}
