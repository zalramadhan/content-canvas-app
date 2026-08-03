import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { STATUSES, getStatus } from '../utils/status'
import { Check, ChevronDown, Link as LinkIcon, CheckCircle2, ExternalLink } from 'lucide-react'

const MENU_W = 192 // px (w-48)
const MENU_H = 300 // approx status-list dropdown height
const POSTED_H = 230 // approx mark-as-posted form height

/**
 * Status chip + dropdown selector + "mark as posted" flow.
 * The dropdown is rendered via a portal with fixed positioning so it is never
 * clipped by the card / scroll containers, and opens up/down based on viewport space.
 * Props: entry, onUpdate(field, value), size ('sm' | 'md')
 */
export default function StatusBadge({ entry, onUpdate, size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const [postedMode, setPostedMode] = useState(false)
  const [postedUrl, setPostedUrl] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const chipRef = useRef(null)
  const menuRef = useRef(null)
  const status = getStatus(entry.status)

  const openMenu = useCallback((mode) => {
    const rect = chipRef.current?.getBoundingClientRect()
    if (rect) {
      const h = mode ? POSTED_H : MENU_H
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const up = spaceBelow < h && spaceAbove > h
      setPos({
        top: up ? spaceAbove - h : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_W - 8)),
      })
    }
    setPostedMode(!!mode)
    setOpen(true)
  }, [])

  // Close on outside click, scroll or resize
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); setPostedMode(false) }
    const handler = (e) => {
      if (menuRef.current?.contains(e.target)) return
      if (chipRef.current?.contains(e.target)) return
      close()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      window.addEventListener('scroll', close, true)
      window.addEventListener('resize', close)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const selectStatus = (id) => {
    if (id === 'posted') {
      setPostedUrl(entry.postedUrl || '')
      setPostedMode(true)
      return
    }
    onUpdate('status', id)
    if (id !== entry.status) {
      onUpdate('postedAt', '')
      onUpdate('postedUrl', '')
    }
    setOpen(false)
  }

  const confirmPosted = () => {
    onUpdate('status', 'posted')
    onUpdate('postedAt', new Date().toISOString())
    onUpdate('postedUrl', postedUrl.trim())
    setPostedMode(false)
    setOpen(false)
    setPostedUrl('')
  }

  const cancelPosted = () => {
    setPostedMode(false)
    setPostedUrl('')
  }

  const compact = size === 'sm'

  return (
    <>
      <div className="relative inline-flex items-center" ref={chipRef} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu(false))}
          title={`Status: ${status.label}`}
          className={`
            inline-flex items-center gap-1 rounded-full font-medium shrink-0
            ${status.softBg} ${status.softText}
            ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}
            hover:opacity-80 transition-all border ${status.border}
          `}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
          {entry.postedUrl && <ExternalLink className="w-2.5 h-2.5" />}
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {!open && entry.status !== 'posted' && (
          <button
            type="button"
            onClick={() => openMenu(true)}
            title="Mark as posted"
            className="ml-1 p-1 rounded-md text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all active:scale-90"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Portal dropdown — never clipped by ancestors */}
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed w-48 rounded-xl bg-surface border border-border
                     shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden z-50 modal-content"
          style={{ top: pos.top, left: pos.left }}
        >
          {postedMode ? (
            <div className="p-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-text flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Mark as posted
              </p>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Link postingan asli (opsional) — YouTube, TikTok, Instagram…
              </p>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-surface-muted">
                <LinkIcon className="w-3 h-3 text-text-muted shrink-0" />
                <input
                  type="url"
                  value={postedUrl}
                  onChange={(e) => setPostedUrl(e.target.value)}
                  placeholder="https://…"
                  autoFocus
                  className="flex-1 text-xs bg-transparent border-none outline-none text-text placeholder:text-text-muted"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmPosted() }
                    if (e.key === 'Escape') cancelPosted()
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={confirmPosted}
                  className="flex-1 px-2 py-1.5 text-[11px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all active:scale-95"
                >
                  Confirm
                </button>
                <button
                  onClick={cancelPosted}
                  className="px-2 py-1.5 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1.5">
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                Status pipeline
              </p>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStatus(s.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all
                                hover:bg-surface-hover ${entry.status === s.id ? s.softBg : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                    <span className={`text-xs font-medium ${entry.status === s.id ? s.softText : 'text-text-secondary'}`}>
                      {s.label}
                    </span>
                    {s.id === entry.status && (
                      <Check className="w-3 h-3 ml-auto text-emerald-500" />
                    )}
                    {s.id === 'posted' && s.id !== entry.status && (
                      <span className="ml-auto text-[9px] text-text-muted">set link →</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
