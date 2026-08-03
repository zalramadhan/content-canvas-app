import { useState, useRef, useEffect } from 'react'
import { Tag, X } from 'lucide-react'
import { colorForTag } from '../utils/tags'

/**
 * Tag chips editor with suggestion dropdown.
 * Props: tags (string[]), onChange(tags), suggestions (string[]), placeholder
 */
export default function TagInput({ tags = [], onChange, suggestions = [], placeholder = 'Tambah tag…' }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapRef = useRef(null)

  const q = input.trim().toLowerCase()
  const filteredSuggestions = suggestions
    .filter(s => !tags.includes(s) && (!q || s.toLowerCase().includes(q)))
    .slice(0, 6)

  // Close suggestions on outside click
  useEffect(() => {
    if (!showSuggestions) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSuggestions])

  const addTag = (raw) => {
    const tag = raw.trim().replace(/^#/, '')
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapRef}>
      <label className="text-[10px] font-medium text-text-muted mb-1.5 flex items-center gap-1">
        <Tag className="w-3 h-3 text-fuchsia-500" />
        <span>Tags / Kategori</span>
        {tags.length > 0 && (
          <span className="text-[9px] text-fuchsia-400 font-medium">{tags.length}</span>
        )}
      </label>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, idx) => {
            const c = colorForTag(tag)
            return (
              <span
                key={`${tag}-${idx}`}
                className="group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           text-[10px] font-medium border"
                style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
              >
                <span>{tag}</span>
                <button
                  onClick={() => onChange(tags.filter((_, i) => i !== idx))}
                  className="p-0.5 rounded-full opacity-0 group-hover/tag:opacity-100 transition-opacity"
                  style={{ color: c.text }}
                  title="Hapus tag"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full text-xs bg-surface border border-fuchsia-200 dark:border-fuchsia-800/60
                     rounded-lg px-2.5 py-1.5 text-text outline-none
                     focus:border-fuchsia-400 transition-colors placeholder:text-text-muted"
        />

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg
                          shadow-xl shadow-black/10 z-30 p-1 modal-content overflow-hidden">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                onClick={() => { addTag(s); setShowSuggestions(false) }}
                className="w-full text-left text-[11px] text-text px-2 py-1.5 rounded-md
                           hover:bg-surface-hover transition-colors flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorForTag(s).text }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[9px] text-text-muted mt-1">
        Tekan Enter untuk menambah. Backspace untuk hapus terakhir.
      </p>
    </div>
  )
}
