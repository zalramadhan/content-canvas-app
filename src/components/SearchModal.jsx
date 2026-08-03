import { useMemo, useState, useRef, useEffect } from 'react'
import { format, parse } from 'date-fns'
import { Search, X, CalendarDays, FileText } from 'lucide-react'

function collectSearchText(entry) {
  const parts = []
  if (entry.headline) parts.push(entry.headline)
  if (entry.concept) parts.push(entry.concept)
  if (entry.notes) parts.push(entry.notes)
  if (entry.caption) parts.push(entry.caption)
  if (entry.postedUrl) parts.push(entry.postedUrl)
  if (entry.url) parts.push(entry.url)
  ;(entry.tags || []).forEach((t) => parts.push(t))

  try {
    const s = JSON.parse(entry.strategy || '{}')
    if (s?.keyMessage) parts.push(s.keyMessage)
    ;(s?.hooks || []).forEach((h) => parts.push(h))
    ;(s?.storytelling || []).forEach((b) => parts.push(`${b.label} ${b.text}`))
    if (s?.cta) parts.push(s.cta)
    ;(s?.hashtags || []).forEach((t) => parts.push(t))
  } catch { /* ignore */ }

  try {
    const scenes = JSON.parse(entry.scenes || '[]')
    if (Array.isArray(scenes)) {
      scenes.forEach((sc) => {
        if (sc.script) parts.push(sc.script)
        if (sc.editing) parts.push(sc.editing)
        if (sc.location) parts.push(sc.location)
        ;(sc.checklist || []).forEach((c) => parts.push(c.text))
      })
    }
  } catch { /* ignore */ }

  try {
    const slides = JSON.parse(entry.carousel || '[]')
    if (Array.isArray(slides)) {
      slides.forEach((sl) => {
        if (sl.script) parts.push(sl.script)
        if (sl.designNotes) parts.push(sl.designNotes)
      })
    }
  } catch { /* ignore */ }

  return parts.filter(Boolean).join(' ').toLowerCase()
}

function snippetFrom(text, query) {
  if (!text) return ''
  const idx = text.toLowerCase().indexOf(query)
  if (idx === -1) return text.slice(0, 80)
  const start = Math.max(0, idx - 30)
  const end = Math.min(text.length, idx + query.length + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export default function SearchModal({ data, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const out = []
    for (const [dateKey, entries] of Object.entries(data || {})) {
      for (const entry of entries || []) {
        const haystack = collectSearchText(entry)
        if (!haystack.includes(q)) continue
        out.push({
          dateKey,
          entry,
          haystack,
          snippet: snippetFrom(haystack, q),
        })
      }
    }
    return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [query, data])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-xl mx-auto mt-[12vh] px-4">
        <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden modal-content">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari hook, skrip, caption, hashtag, konsep…"
              className="flex-1 text-sm bg-transparent border-none outline-none text-text placeholder:text-text-muted"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="text-center text-xs text-text-muted py-10">
                Ketik minimal 2 huruf untuk mencari…
              </p>
            ) : results.length === 0 ? (
              <p className="text-center text-xs text-text-muted py-10">
                Tidak ada hasil untuk “{query}”.
              </p>
            ) : (
              <div className="space-y-0.5">
                {results.map((r) => (
                  <button
                    key={`${r.dateKey}-${r.entry.id}`}
                    onClick={() => onSelect(r.dateKey, r.entry.id)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 shrink-0">
                          {format(parse(r.dateKey, 'yyyy-MM-dd', new Date()), 'MMM d')}
                        </span>
                        <span className="text-xs font-semibold text-text truncate">
                          {r.entry.headline || 'Tanpa judul'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted truncate mt-0.5 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5 shrink-0" />
                        {r.snippet}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between">
            <p className="text-[10px] text-text-muted">{results.length} hasil</p>
            <p className="text-[10px] text-text-muted">Esc untuk tutup</p>
          </div>
        </div>
      </div>
    </div>
  )
}
