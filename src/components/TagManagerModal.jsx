import { useState, useRef, useEffect } from 'react'
import { X, Pencil, Trash2, Check, Tags, AlertTriangle } from 'lucide-react'
import { colorForTag } from '../utils/tags'

/**
 * Global tag manager: rename or delete a tag across all entries.
 * Props: tags ([{name,count}]), onRename(old, newName), onDelete(tag), onClose
 */
export default function TagManagerModal({ tags = [], onRename, onDelete, onClose }) {
  const [editing, setEditing] = useState(null)      // tag name being renamed
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // tag name awaiting confirm
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (editing) { setEditing(null); return }
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, editing])

  const startRename = (tag) => {
    setEditing(tag)
    setRenameValue(tag)
    setConfirmDelete(null)
  }

  const submitRename = () => {
    const v = renameValue.trim()
    if (v && v !== editing) onRename(editing, v)
    setEditing(null)
  }

  const submitDelete = (tag) => {
    onDelete(tag)
    setConfirmDelete(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden modal-content">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600
                            flex items-center justify-center shadow-md shadow-fuchsia-500/20">
              <Tags className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Kelola Tag</h2>
              <p className="text-[10px] text-text-muted">Rename atau hapus tag dari semua konten</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto p-3 space-y-1.5">
          {tags.length === 0 && (
            <div className="text-center py-10">
              <Tags className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
              <p className="text-xs text-text-muted">Belum ada tag — tambahkan tag di kartu konten dulu.</p>
            </div>
          )}

          {tags.map(t => {
            const c = colorForTag(t.name)
            const isEditing = editing === t.name
            const isConfirming = confirmDelete === t.name
            return (
              <div
                key={t.name}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-surface-muted/30
                           transition-colors"
              >
                {/* Color swatch */}
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.text }} />

                {isEditing ? (
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <input
                      ref={inputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submitRename() }
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      className="flex-1 text-xs bg-surface border border-fuchsia-300 dark:border-fuchsia-700
                                 rounded-lg px-2 py-1.5 text-text outline-none focus:border-fuchsia-400
                                 transition-colors"
                    />
                    <button
                      onClick={submitRename}
                      disabled={!renameValue.trim() || renameValue.trim() === t.name}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30
                                 disabled:opacity-40 transition-all"
                      title="Simpan rename"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-all"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-medium text-text truncate flex-1 min-w-0">{t.name}</span>
                    <span className="text-[10px] text-text-muted shrink-0 bg-surface px-1.5 py-0.5 rounded-full">
                      {t.count}
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {isConfirming ? (
                        <>
                          <span className="text-[9px] text-red-500 flex items-center gap-0.5 mr-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Hapus?
                          </span>
                          <button
                            onClick={() => submitDelete(t.name)}
                            className="px-2 py-1 text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-all active:scale-95"
                          >
                            Ya
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-[10px] font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-md transition-all"
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startRename(t.name)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 transition-all"
                            title="Rename tag"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(t.name); setEditing(null) }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                            title="Hapus tag dari semua konten"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
          <p className="text-[10px] text-text-muted">
            {tags.length} tag · perubahan bisa di-undo (Ctrl+Z)
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
