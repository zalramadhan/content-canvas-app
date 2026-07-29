import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, FileText,
  Lightbulb, Quote, PenTool, Camera, Scissors,
  ExternalLink, GripVertical
} from 'lucide-react'
import VideoEmbed from './VideoEmbed'
import AddVideoForm from './AddVideoForm'
import { parseVideoUrl, getPlatformIcon, getPlatformColor, getPlatformName } from '../utils/videoParser'

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

function VideoCard({ entry, onUpdate, onDelete, index, onDragStart, onDragOver, onDragEnd, onDrop, isDragging, isDropTarget }) {
  const [expanded, setExpanded] = useState(false)
  const video = parseVideoUrl(entry.url)
  const platformColor = getPlatformColor(video.platform)
  const platformIcon = getPlatformIcon(video.platform)

  const updateField = (key, value) => {
    onUpdate(entry.id, { [key]: value })
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', entry.id)
    e.dataTransfer.effectAllowed = 'move'
    // Slight delay so the drag image captures properly
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
          : 'hover:card-shadow-hover border-border'
        }
        ${isDropTarget === 'before'
          ? 'border-t-2 border-t-primary-500 mt-0'
          : ''
        }
        ${isDropTarget === 'after'
          ? 'border-b-2 border-b-primary-500 mb-0'
          : ''
        }
      `}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {/* Video Preview */}
      <div className="px-3 pt-3">
        <VideoEmbed url={entry.url} />
      </div>

      {/* Entry Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag Handle */}
          <span
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 rounded
                       text-text-muted hover:text-primary-500 hover:bg-primary-50
                       dark:hover:text-primary-400 dark:hover:bg-primary-900/30
                       transition-colors duration-150"
            onMouseDown={(e) => e.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>

          <span className="text-[10px] font-semibold text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
          <span
            className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold shrink-0"
            style={{ backgroundColor: platformColor }}
          >
            {platformIcon}
          </span>
          <span className="text-xs text-text-muted truncate">{getPlatformName(video.platform)}</span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-all"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Notes Section */}
      {expanded && (
        <div className="p-3 space-y-2">
          {NOTE_FIELDS.map(field => (
            <NoteField
              key={field.key}
              field={field}
              value={entry[field.key]}
              onChange={updateField}
            />
          ))}
        </div>
      )}

      {/* Quick summary when collapsed */}
      {!expanded && entry.notes && (
        <div className="px-3 py-2 border-t border-border-light">
          <p className="text-xs text-text-secondary line-clamp-1">{entry.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function DayModal({ date, entries, onAddEntry, onUpdateEntry, onDeleteEntry, onReorderEntry, onClose }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [dragState, setDragState] = useState({ draggedId: null, targetId: null, position: null })
  const dateStr = format(date, 'EEEE, MMMM d, yyyy')

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Drag & Drop Handlers ──
  const handleDragStart = useCallback((id) => {
    setDragState(prev => ({ ...prev, draggedId: id }))
  }, [])

  const handleDragOver = useCallback((targetId, clientY) => {
    setDragState(prev => {
      if (prev.draggedId === targetId) return { ...prev, targetId: null, position: null }

      // Determine if the drop should be before or after the target
      const targetEl = document.querySelector(`[data-entry-id="${targetId}"]`)
      if (!targetEl) return { ...prev, targetId, position: 'after' }

      const rect = targetEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position = clientY < midY ? 'before' : 'after'

      return { ...prev, targetId, position }
    })
  }, [])

  const handleDrop = useCallback((draggedId, targetId) => {
    // Calculate new index based on current entries
    const currentIndex = entries.findIndex(e => e.id === draggedId)
    const targetIndex = entries.findIndex(e => e.id === targetId)

    if (currentIndex === -1 || targetIndex === -1) {
      setDragState({ draggedId: null, targetId: null, position: null })
      return
    }

    let newIndex
    const { position } = dragState

    if (currentIndex < targetIndex) {
      // Dragging DOWN: after removal, target shifts left by 1
      // 'before' → insert at the shifted target's position (targetIndex - 1)
      // 'after'  → insert after the shifted target (targetIndex)
      newIndex = position === 'before' ? targetIndex - 1 : targetIndex
    } else if (currentIndex > targetIndex) {
      // Dragging UP: target is before the removed item, no shift
      // 'after'  → insert after the target (targetIndex + 1)
      // 'before' → insert at the target's position (targetIndex)
      newIndex = position === 'after' ? targetIndex + 1 : targetIndex
    } else {
      newIndex = currentIndex
    }

    // Clamp to valid range
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
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="modal-content w-full max-w-2xl bg-surface rounded-2xl shadow-xl border border-border
                        overflow-hidden">
          {/* Modal Header */}
          <div className="sticky top-0 bg-surface border-b border-border-light z-10">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text">
                  {format(date, 'MMMM d')}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{dateStr}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-muted bg-surface-muted px-2.5 py-1 rounded-full">
                  {entries.length} video{entries.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover 
                             transition-all duration-150"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Drag hint when dragging */}
            {dragState.draggedId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30
                              rounded-xl border border-primary-200 dark:border-primary-700/50 text-xs text-primary-700 dark:text-primary-300">
                <GripVertical className="w-3.5 h-3.5" />
                <span>Drag video cards to reorder them</span>
              </div>
            )}

            {/* Add Video Form */}
            {showAddForm ? (
              <div className="bg-surface-muted rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text">Add New Video</h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-text-muted hover:text-text"
                  >
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                           border-2 border-dashed border-border hover:border-primary-300
                           text-text-muted hover:text-primary-600 hover:bg-primary-50/50
                           transition-all duration-200 group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-medium">Add Video Link</span>
              </button>
            )}

            {/* Video List */}
            {entries.length === 0 && !showAddForm && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <ExternalLink className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-sm font-semibold text-text mb-1">No content planned yet</h3>
                <p className="text-xs text-text-muted max-w-xs">
                  Add YouTube, TikTok, or Instagram videos to start planning your content for this day.
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
        </div>
      </div>
    </div>
  )
}
