import { useMemo, useState, useCallback } from 'react'
import { format, parse, isBefore, startOfToday } from 'date-fns'
import { GripVertical, CalendarDays, CheckSquare, X, Trash2, Check, Tag as TagIcon, PenLine } from 'lucide-react'
import { STATUSES } from '../utils/status'
import { parseVideoUrl, getPlatformIcon, getPlatformColor } from '../utils/videoParser'
import { colorForTag } from '../utils/tags'
import AddVideoForm from './AddVideoForm'

const keyOf = (dateKey, id) => `${dateKey}::${id}`
const splitKey = (k) => {
  const i = k.lastIndexOf('::')
  return { dateKey: k.slice(0, i), id: k.slice(i + 2) }
}

/**
 * Kanban board grouped by status pipeline. Drag cards between columns to change status,
 * or use selection mode for bulk operations.
 * Props: data, onOpenEntry, onUpdateEntry, tagFilter, bulkUpdate, bulkDelete, bulkAddTag
 */
export default function KanbanBoard({ data, onOpenEntry, onUpdateEntry, tagFilter, bulkUpdate, bulkDelete, bulkAddTag }) {
  const [dragId, setDragId] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const today = startOfToday()

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map((s) => [s.id, []]))
    for (const [dateKey, entries] of Object.entries(data || {})) {
      for (const entry of entries || []) {
        if (tagFilter && !(entry.tags || []).includes(tagFilter)) continue
        const id = entry.status && map[entry.status] ? entry.status : 'idea'
        map[id].push({ dateKey, entry })
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    }
    return map
  }, [data, tagFilter])

  const targets = useMemo(
    () => [...selected].map(splitKey),
    [selected]
  )

  const toggleSelect = useCallback((dateKey, id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const k = keyOf(dateKey, id)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmDelete(false)
    setTagInput('')
  }

  // ── Drag & drop between columns ──
  const handleDragStart = useCallback((e, dateKey, id) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ dateKey, id }))
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => setDragId(`${dateKey}-${id}`))
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e, statusId) => {
    e.preventDefault()
    try {
      const { dateKey, id } = JSON.parse(e.dataTransfer.getData('text/plain'))
      onUpdateEntry(dateKey, id, { status: statusId })
    } catch { /* ignore */ }
    setDragId(null)
  }, [onUpdateEntry])

  const handleDragEnd = useCallback(() => setDragId(null), [])

  const totalItems = Object.values(byStatus).reduce((a, list) => a + list.length, 0)

  return (
    <div>
      {/* Bulk toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border
                      transition-all duration-150 active:scale-95
                      ${selectMode
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'text-text-secondary hover:text-text hover:bg-surface-hover border-border/60'}`}
        >
          {selectMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
          {selectMode ? 'Selesai pilih' : 'Pilih konten'}
        </button>

        {selectMode && selected.size > 0 && (
          <>
            <span className="text-[11px] font-bold text-text bg-surface-muted px-2 py-1 rounded-lg">
              {selected.size} terpilih
            </span>

            {/* Bulk status */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) bulkUpdate(targets, { status: e.target.value })
                e.target.value = ''
              }}
              className="text-[11px] font-medium bg-surface border border-border rounded-lg px-2 py-1.5
                         text-text outline-none focus:border-primary-400 transition-colors"
            >
              <option value="">Ubah status…</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            {/* Bulk add tag */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface">
                <TagIcon className="w-3 h-3 text-fuchsia-500 shrink-0" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      bulkAddTag(targets, tagInput.trim())
                      setTagInput('')
                    }
                  }}
                  placeholder="Tambah tag…"
                  className="w-24 text-[11px] bg-transparent border-none outline-none text-text placeholder:text-text-muted"
                />
              </div>
              <button
                onClick={() => { if (tagInput.trim()) { bulkAddTag(targets, tagInput.trim()); setTagInput('') } }}
                disabled={!tagInput.trim()}
                className="px-2 py-1.5 text-[11px] font-semibold text-white bg-fuchsia-500 hover:bg-fuchsia-600
                           rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Tag
              </button>
            </div>

            {/* Bulk delete */}
            {confirmDelete ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-red-500">Hapus {selected.size} konten?</span>
                <button
                  onClick={() => { bulkDelete(targets); setConfirmDelete(false); setSelected(new Set()) }}
                  className="px-2 py-1.5 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all active:scale-95"
                >
                  Ya
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-all"
                >
                  Batal
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600
                           hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}

            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover px-2 py-1.5 rounded-lg transition-all"
            >
              Bersihkan pilihan
            </button>
          </>
        )}

        {!selectMode && (
          <span className="text-[11px] text-text-muted ml-auto">
            {totalItems} konten {tagFilter ? `· filter: ${tagFilter}` : ''}
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
        {STATUSES.map((s) => {
          const items = byStatus[s.id] || []
          const overdue = items.filter((i) => isBefore(parse(i.dateKey, 'yyyy-MM-dd', new Date()), today)).length
          return (
            <div
              key={s.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s.id)}
              className={`flex-shrink-0 w-64 sm:w-72 rounded-2xl border flex flex-col max-h-[calc(100vh-16rem)]
                          transition-all duration-200 ${dragId ? 'border-dashed' : ''} ${s.border} bg-surface/60`}
            >
              {/* Column header */}
              <div className={`px-3 py-2.5 border-b flex items-center justify-between rounded-t-2xl ${s.softBg}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                  <span className={`text-xs font-bold ${s.softText}`}>{s.label}</span>
                  <span className="text-[10px] font-semibold text-text-muted bg-surface/70 px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                {overdue > 0 && (
                  <span className="text-[9px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                    {overdue} overdue
                  </span>
                )}
              </div>

              {/* Column body */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.length === 0 && (
                  <div className={`text-center text-[10px] ${s.softText} py-8 rounded-xl border border-dashed ${s.border} opacity-60`}>
                    Drop konten di sini
                  </div>
                )}
                {items.map(({ dateKey, entry }) => {
                  const video = parseVideoUrl(entry.url || '')
                  const d = parse(dateKey, 'yyyy-MM-dd', new Date())
                  const isLate = isBefore(d, today) && s.id !== 'posted'
                  const isDragging = dragId === `${dateKey}-${entry.id}`
                  const isSelected = selected.has(keyOf(dateKey, entry.id))
                  const isEditing = editingKey === keyOf(dateKey, entry.id)
                  return (
                    <div
                      key={`${dateKey}-${entry.id}`}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, dateKey, entry.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isEditing) return
                        if (selectMode) toggleSelect(dateKey, entry.id)
                        else onOpenEntry(dateKey, entry.id)
                      }}
                      className={`group cursor-pointer rounded-xl bg-surface border p-3
                                  shadow-sm hover:shadow-md transition-all duration-150 active:scale-[0.98]
                                  ${isEditing ? 'border-primary-400' : 'border-border/60 hover:border-primary-300 dark:hover:border-primary-700'}
                                  ${!isEditing && isDragging ? 'opacity-40 scale-95 border-primary-400' : ''}
                                  ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/60 dark:bg-primary-900/20 border-primary-400' : ''}`}
                    >
                      {isEditing ? (
                        <div className="p-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-text flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                              ✏️ Edit Idea
                            </h3>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-hover px-2 py-1 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                          <AddVideoForm
                            initial={entry}
                            onSave={(updates) => { onUpdateEntry(dateKey, entry.id, updates); setEditingKey(null) }}
                            onCancel={() => setEditingKey(null)}
                          />
                        </div>
                      ) : (
                        <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {selectMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(dateKey, entry.id) }}
                              className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all active:scale-90
                                          ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-text-muted/40 hover:border-orange-400'}`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                            </button>
                          )}
                          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[6px] font-bold shrink-0"
                                style={{ backgroundColor: getPlatformColor(video.platform) }}>
                            {getPlatformIcon(video.platform)}
                          </span>
                          <span className="text-[9px] font-semibold text-text-muted flex items-center gap-1">
                            <CalendarDays className="w-2.5 h-2.5" />
                            {format(d, 'd MMM')}
                          </span>
                          {isLate && (
                            <span className="text-[8px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1 py-0.5 rounded-full">
                              late
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingKey(keyOf(dateKey, entry.id)) }}
                            className="p-1 rounded-md text-text-muted opacity-0 group-hover:opacity-100
                                       hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
                            title="Edit idea"
                          >
                            <PenLine className="w-3 h-3" />
                          </button>
                          <GripVertical className="w-3 h-3 text-text-muted/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      <p className={`text-xs font-semibold mt-1.5 leading-snug ${entry.status === 'posted' ? 'text-text-muted line-through' : 'text-text'}`}>
                        {entry.headline || 'Tanpa judul'}
                      </p>

                      {entry.concept && (
                        <p className="text-[10px] text-text-muted mt-1 truncate">{entry.concept}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <span className="text-[9px] font-medium text-text-muted bg-surface-muted px-1.5 py-0.5 rounded-full">
                          {entry.contentType === 'carousel' ? '📷 Carousel' : '🎬 Reel/Shorts'}
                        </span>
                        {(entry.tags || []).slice(0, 3).map(t => {
                          const c = colorForTag(t)
                          return (
                            <span
                              key={t}
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border"
                              style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                            >
                              {t}
                            </span>
                          )
                        })}
                        {(entry.tags || []).length > 3 && (
                          <span className="text-[9px] text-text-muted">+{(entry.tags || []).length - 3}</span>
                        )}
                        {entry.postedUrl && (
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full truncate max-w-[110px]">
                            🔗 {entry.postedUrl}
                          </span>
                        )}
                      </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
