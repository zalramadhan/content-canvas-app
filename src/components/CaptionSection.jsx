import { useState } from 'react'
import {
  Bookmark, BookMarked, ChevronDown, ChevronUp,
  Trash2, MessageSquareText, X,
} from 'lucide-react'
import {
  loadCaptions, addCaptionToLibrary, deleteCaptionFromLibrary,
} from '../utils/library'
import { useSmoothExpand } from '../utils/collapse'
import { AIGenerateButton } from './AIGenerator'

/**
 * Caption editor with reusable library + AI generation.
 * Props: entry, onUpdate(field, value), onOpenSettings
 */
export default function CaptionSection({ entry, onUpdate, onOpenSettings }) {
  const [expanded, setExpanded] = useState(false)
  const visible = useSmoothExpand(expanded)
  const [showLibrary, setShowLibrary] = useState(false)
  const [captions, setCaptions] = useState(loadCaptions)
  const caption = entry.caption || ''

  const refreshLibrary = () => setCaptions(loadCaptions())

  const handleSave = () => {
    if (!caption.trim()) return
    addCaptionToLibrary({ text: caption, title: entry.headline })
    refreshLibrary()
  }

  const handleInsert = (text) => {
    onUpdate('caption', text)
    setShowLibrary(false)
  }

  return (
    <div className="mt-3 first:mt-0 border border-border/70 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 min-w-0 hover:opacity-70 transition-opacity"
        >
          <MessageSquareText className="w-4 h-4 text-sky-500 shrink-0" />
          <span className="text-xs font-semibold text-text">💬 Caption</span>
          {caption && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
              {caption.length > 20 ? caption.slice(0, 20) + '…' : caption}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />}
        </button>

        {expanded && (
          <div className="flex items-center gap-0.5 shrink-0">
            <AIGenerateButton
              type="caption"
              entry={entry}
              onResult={(texts) => onUpdate('caption', texts[0] || '')}
              onOpenSettings={onOpenSettings}
              iconOnly
              label="Generate caption"
            />
            <button
              onClick={handleSave}
              disabled={!caption.trim()}
              title="Save caption to library"
              className="p-1 rounded-lg text-text-muted hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowLibrary(!showLibrary); refreshLibrary() }}
              title="Insert from library"
              className={`p-1 rounded-lg transition-all ${showLibrary
                ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/30'
                : 'text-text-muted hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30'}`}
            >
              <BookMarked className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: expanded ? '3000px' : '0', opacity: expanded ? 1 : 0 }}>
        {visible && (
          <div className="pt-2 -mx-1 px-1 space-y-2 slide-down">
            <textarea
              value={caption}
              onChange={(e) => onUpdate('caption', e.target.value)}
              placeholder="Tulis caption postingan di sini — atau generate dengan AI / ambil dari library…"
              rows={4}
              className="w-full text-sm text-text bg-surface border border-border rounded-lg px-3 py-2
                         outline-none focus:border-sky-400 transition-colors
                         resize-none placeholder:text-text-muted"
            />

            {showLibrary && (
              <div className="rounded-lg border border-border bg-surface-muted/60 p-2 space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-semibold text-text-muted">Caption Library ({captions.length})</p>
                  <button onClick={() => setShowLibrary(false)} className="p-0.5 text-text-muted hover:text-text">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {captions.length === 0 && (
                  <p className="text-[11px] text-text-muted px-1 py-2">
                    Belum ada caption tersimpan. Klik ikon bookmark di atas untuk menyimpan caption ini.
                  </p>
                )}
                {captions.map((c) => (
                  <div key={c.id} className="group flex items-start gap-2 px-2 py-1.5 rounded-lg bg-surface border border-border/60 hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
                    <button
                      onClick={() => handleInsert(c.text)}
                      className="flex-1 min-w-0 text-left"
                      title="Insert"
                    >
                      <p className="text-[11px] font-medium text-text truncate">{c.title}</p>
                      <p className="text-[10px] text-text-muted line-clamp-2">{c.text}</p>
                    </button>
                    <button
                      onClick={() => { deleteCaptionFromLibrary(c.id); refreshLibrary() }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-red-500 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
