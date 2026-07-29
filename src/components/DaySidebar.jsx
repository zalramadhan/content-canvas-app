import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, FileText,
  Lightbulb, Quote, PenTool, Camera, Scissors,
  ExternalLink, GripVertical
} from 'lucide-react'
import VideoEmbed from './VideoEmbed'
import AddVideoForm from './AddVideoForm'
import { parseVideoUrl, getPlatformName } from '../utils/videoParser'

const NOTE_FIELDS = [
  { key: 'notes', label: 'Notes', icon: FileText, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/40', border: 'border-gray-200 dark:border-gray-700/50' },
  { key: 'concept', label: 'Concept', icon: Lightbulb, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-700/50' },
  { key: 'hook', label: 'Hook', icon: Quote, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700/50' },
  { key: 'scripting', label: 'Scripting', icon: PenTool, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700/50' },
  { key: 'shooting', label: 'Shooting', icon: Camera, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-700/50' },
  { key: 'editing', label: 'Editing', icon: Scissors, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-700/50' },
]

function NoteField({ field, value, onChange }) {
  const Icon = field.icon
  const [expanded, setExpanded] = useState(!!value)

  return (
    <div className={`rounded-xl border ${field.border} overflow-hidden transition-all duration-200`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-3 py-2.5 ${field.bg} hover:opacity-80 transition-colors`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${field.color}`} />
          <span className="text-xs font-semibold text-text">{field.label}</span>
          {value && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded">
              {value.length > 20 ? value.slice(0, 20) + '...' : value}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>
      {expanded && (
        <div className="p-3 bg-surface">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={`Write your ${field.label.toLowerCase()} here...`}
            rows={3}
            className="w-full text-sm text-text bg-transparent border-none outline-none resize-none
                       placeholder:text-text-muted leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}

function PlatformBadge({ platform, size = 'sm' }) {
  const isLg = size === 'lg'
  const sizeClasses = isLg ? 'w-8 h-8' : 'w-5 h-5'

  const config = {
    youtube: {
      bg: '#FF0000',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    },
    tiktok: {
      bg: '#16161a',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    },
    instagram: {
      bg: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        </svg>
      )
    },
    pinterest: {
      bg: '#e60023',
      icon: <span className={`${isLg ? 'text-sm' : 'text-[10px]'} font-bold text-white`}>P</span>
    },
    image: {
      bg: '#8b5cf6',
      icon: <span className={isLg ? 'text-sm' : 'text-[10px]'}>🖼️</span>
    },
    unknown: {
      bg: '#6b7280',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className={isLg ? 'w-4 h-4' : 'w-3 h-3'}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" stroke="white" strokeWidth="2" fill="none" />
          <circle cx="12" cy="8" r="1" fill="white" />
        </svg>
      )
    }
  }

  const c = config[platform] || config.unknown

  return (
    <span
      className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10`}
      style={{ background: c.bg }}
      title={getPlatformName(platform)}
    >
      {c.icon}
    </span>
  )
}

function VideoCard({ entry, onUpdate, onDelete, index, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, isDropTarget }) {
  const [collapsed, setCollapsed] = useState(true)
  const video = parseVideoUrl(entry.url)
  const hasNotes = entry.notes || entry.concept || entry.hook || entry.scripting || entry.shooting || entry.editing

  const updateField = (key, value) => {
    onUpdate(entry.id, { [key]: value })
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', entry.id)
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => {
      onDragStart(entry.id)
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(entry.id, e.clientY)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId !== entry.id) {
      onDrop(draggedId, entry.id)
    }
  }

  const handleDragEnd = () => {
    onDragEnd()
  }

  return (
    <div
      className={`
        bg-surface rounded-xl border overflow-hidden card-shadow
        transition-all duration-200
        ${isDragging
          ? 'opacity-40 scale-[0.97] border-primary-400 dark:border-primary-500 shadow-lg shadow-primary-200/30 dark:shadow-primary-800/40'
          : collapsed ? 'border-border' : 'hover:card-shadow-hover border-border'
        }
        ${collapsed ? 'hover:bg-surface-hover/50 cursor-pointer' : ''}
        ${isDropTarget === 'before' ? 'border-t-2 border-t-primary-500' : ''}
        ${isDropTarget === 'after' ? 'border-b-2 border-b-primary-500' : ''}
      `}
      onClick={() => setCollapsed(!collapsed)}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Collapsed: minimal row view */}
      {collapsed ? (
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="cursor-grab active:cursor-grabbing p-0.5 rounded
                         text-text-muted hover:text-primary-500 hover:bg-primary-50
                         dark:hover:text-primary-400 dark:hover:bg-primary-900/30
                         transition-colors duration-150"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-semibold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full shrink-0">
              #{index + 1}
            </span>
            <PlatformBadge platform={video.platform} size="sm" />
            <span className="text-xs text-text-muted truncate min-w-0">{getPlatformName(video.platform)}</span>
            {hasNotes && (
              <span className="hidden xs:inline text-[10px] text-text-muted truncate min-w-0 border-l border-border-light pl-2 ml-1">
                {entry.notes || entry.concept || entry.hook || ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(false) }}
              className="p-1 rounded-lg text-primary-500 hover:bg-primary-50 transition-all"
              title="Expand"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Entry Header - Top */}
          <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-border-light">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="cursor-grab active:cursor-grabbing p-0.5 rounded
                           text-text-muted hover:text-primary-500 hover:bg-primary-50
                           dark:hover:text-primary-400 dark:hover:bg-primary-900/30
                           transition-colors duration-150"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title="Drag to reorder"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-semibold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full shrink-0">
                #{index + 1}
              </span>
              <PlatformBadge platform={video.platform} size="lg" />
              <span className="text-xs font-semibold text-text truncate min-w-0">{getPlatformName(video.platform)}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
                title="Collapse"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Video Embed */}
          <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
            <VideoEmbed url={entry.url} />
          </div>

          {/* Notes Section */}
          <div className="p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {NOTE_FIELDS.map(field => (
              <NoteField
                key={field.key}
                field={field}
                value={entry[field.key]}
                onChange={updateField}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function DaySidebar({ date, entries, onAddEntry, onUpdateEntry, onDeleteEntry, onReorderEntry, onClose }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [dragState, setDragState] = useState({ draggedId: null, targetId: null, position: null })
  const dateStr = format(date, 'EEEE, MMMM d, yyyy')

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Drag & Drop ──
  const handleDragStart = useCallback((id) => {
    setDragState(prev => ({ ...prev, draggedId: id }))
  }, [])

  const handleDragOver = useCallback((targetId, clientY) => {
    setDragState(prev => {
      if (prev.draggedId === targetId) return { ...prev, targetId: null, position: null }
      const targetEl = document.querySelector(`[data-entry-id="${targetId}"]`)
      if (!targetEl) return { ...prev, targetId, position: 'after' }
      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      return { ...prev, targetId, position: clientY < midY ? 'before' : 'after' }
    })
  }, [])

  const handleDrop = useCallback((draggedId, targetId) => {
    const currentIndex = entries.findIndex(e => e.id === draggedId)
    const targetIndex = entries.findIndex(e => e.id === targetId)
    if (currentIndex === -1 || targetIndex === -1) {
      setDragState({ draggedId: null, targetId: null, position: null })
      return
    }
    const { position } = dragState
    let newIndex
    if (currentIndex < targetIndex) {
      newIndex = position === 'before' ? targetIndex - 1 : targetIndex
    } else if (currentIndex > targetIndex) {
      newIndex = position === 'after' ? targetIndex + 1 : targetIndex
    } else {
      newIndex = currentIndex
    }
    newIndex = Math.max(0, Math.min(entries.length - 1, newIndex))
    if (newIndex !== currentIndex) {
      onReorderEntry(date, draggedId, newIndex)
    }
    setDragState({ draggedId: null, targetId: null, position: null })
  }, [entries, dragState, onReorderEntry, date])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, targetId: null, position: null })
  }, [])

  return (
    <aside
      className="
        w-full h-auto max-h-[calc(100vh-8rem)] shadow-lg border rounded-2xl
        bg-surface border-border
        shadow-black/10
        flex flex-col overflow-hidden
      "
    >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border-light flex items-center justify-between bg-surface">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text truncate">
              {format(date, 'MMMM d')}
            </h2>
            <p className="text-[11px] text-text-muted truncate">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover 
                         transition-all duration-150"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Video - fixed top section */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border-light bg-surface">
          {/* Drag hint */}
          {dragState.draggedId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30
                            rounded-xl border border-primary-200 dark:border-primary-700/50 text-xs text-primary-700 dark:text-primary-300">
              <GripVertical className="w-3.5 h-3.5" />
              <span>Drag to reorder</span>
            </div>
          )}

          {/* Add Form or Button */}
          {showAddForm ? (
            <div className="bg-surface-muted rounded-xl p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text">New Video</h3>
                <button onClick={() => setShowAddForm(false)} className="text-xs text-text-muted hover:text-text">
                  Cancel
                </button>
              </div>
              <AddVideoForm
                onAdd={(entry) => {
                  onAddEntry(date, entry)
                  setShowAddForm(false)
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                         border-2 border-dashed border-border hover:border-primary-300
                         text-text-muted hover:text-primary-600 hover:bg-primary-50/50
                         transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-sm font-medium">Add Video</span>
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
          {/* Empty State */}
          {entries.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-3">
                <ExternalLink className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-sm font-semibold text-text mb-1">No content yet</h3>
              <p className="text-xs text-text-muted">
                Add videos from YouTube, TikTok, or Instagram.
              </p>
            </div>
          )}

          {/* Video Cards */}
          {entries.map((entry, idx) => {
            const isDragging = dragState.draggedId === entry.id
            const isDropTarget = !isDragging && dragState.targetId === entry.id ? dragState.position : null

            return (
              <div key={entry.id} data-entry-id={entry.id}>
                <VideoCard
                  entry={entry}
                  index={idx}
                  onUpdate={(id, updated) => onUpdateEntry(date, id, updated)}
                  onDelete={(id) => onDeleteEntry(date, id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  isDragging={isDragging}
                  isDropTarget={isDropTarget}
                />
              </div>
            )
          })}
        </div>
      </aside>
  )
}
