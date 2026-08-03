import { useState, useRef, useEffect } from 'react'
import { format, parse, isToday } from 'date-fns'
import { Bell, BellRing, Loader2, CheckCircle2 } from 'lucide-react'
import { getUpcomingItems, notificationsSupported, notificationPermission, requestNotificationPermission } from '../utils/notifications'

/**
 * Notification bell dropdown (or inline list when embedded).
 * Props: data, onOpenDate(dateKey), embedded
 */
export default function NotificationsPanel({ data, onOpenDate, embedded = false }) {
  const [open, setOpen] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const ref = useRef(null)
  const items = getUpcomingItems(data, 7)
  const perm = notificationPermission()
  const granted = perm === 'granted'

  useEffect(() => {
    if (!open || embedded) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, embedded])

  const enable = async () => {
    setRequesting(true)
    await requestNotificationPermission()
    setRequesting(false)
  }

  // Group by date
  const byDate = []
  for (const item of items) {
    const last = byDate[byDate.length - 1]
    if (last && last.dateKey === item.dateKey) last.entries.push(item)
    else byDate.push({ dateKey: item.dateKey, entries: [item] })
  }

  const content = (
    <>
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <p className="text-xs font-semibold text-text">Upcoming content</p>
        <span className="text-[10px] text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
          {items.length} dalam 7 hari
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {items.length === 0 && (
          <p className="text-center text-[11px] text-text-muted py-8 px-4">
            🎉 Tidak ada konten belum ter-posting dalam 7 hari ke depan.
          </p>
        )}

        {byDate.map((group) => (
          <div key={group.dateKey} className="mb-2 last:mb-0">
            <p className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wide">
              {isToday(parse(group.dateKey, 'yyyy-MM-dd', new Date()))
                ? 'Hari ini'
                : format(parse(group.dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMM d')}
            </p>
            <div className="space-y-1">
              {group.entries.map(({ entry }) => (
                <button
                  key={entry.id}
                  onClick={() => { setOpen(false); onOpenDate(group.dateKey) }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    {entry.contentType === 'carousel' ? '📷' : '🎬'}
                  </div>
                  <span className="text-[11px] font-medium text-text truncate flex-1 min-w-0">
                    {entry.headline || 'Tanpa judul'}
                  </span>
                  {entry.status && (
                    <span className="text-[9px] text-text-muted capitalize shrink-0">
                      {entry.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Permission footer */}
      <div className="px-4 py-3 border-t border-border/60 bg-surface-muted/40">
        {!notificationsSupported() ? (
          <p className="text-[10px] text-text-muted">Browser ini tidak mendukung notifikasi.</p>
        ) : granted ? (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Notifikasi aktif — diingatkan saat konten jatuh tempo hari ini.
          </p>
        ) : (
          <button
            onClick={enable}
            disabled={requesting}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold
                       text-white bg-orange-500 hover:bg-orange-600 rounded-lg
                       disabled:opacity-60 transition-all active:scale-95"
          >
            {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
            Aktifkan notifikasi hari-H
          </button>
        )}
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {content}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-all duration-200
                    ${open || items.length > 0
                      ? 'text-text hover:bg-surface-hover'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover'}`}
        aria-label="Notifications"
        title="Notifikasi & jadwal konten"
      >
        {granted ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {items.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-4 px-0.5 rounded-full
                           bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl bg-surface border border-border
                        shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden z-50 modal-content">
          {content}
        </div>
      )}
    </div>
  )
}
