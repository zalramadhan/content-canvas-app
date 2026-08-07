import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  StickyNote, ListTodo, Plus, Trash2, Pencil, X, Check, Pin,
  Loader2, CloudCheck, CloudOff, Flag,
} from 'lucide-react'

// ── Konstanta ──
const NOTE_COLORS = [
  { id: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800/60', dot: 'bg-amber-400' },
  { id: 'sky', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/60', dot: 'bg-sky-400' },
  { id: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/60', dot: 'bg-rose-400' },
  { id: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-400' },
  { id: 'violet', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800/60', dot: 'bg-violet-400' },
  { id: 'slate', bg: 'bg-slate-100 dark:bg-slate-900/40', border: 'border-slate-200 dark:border-slate-800/60', dot: 'bg-slate-400' },
]
const NOTE_COLOR_MAP = Object.fromEntries(NOTE_COLORS.map(c => [c.id, c]))

const TODO_CATEGORIES = [
  { name: 'Kantor', emoji: '🏢' },
  { name: 'Pribadi', emoji: '🏠' },
  { name: 'Belajar', emoji: '📚' },
  { name: 'Kesehatan', emoji: '💪' },
  { name: 'Lainnya', emoji: '📌' },
]
const catEmoji = (name) =>
  (TODO_CATEGORIES.find(c => c.name === name) || { emoji: '📌' }).emoji

const PRIORITIES = [
  { id: 'high', label: 'Penting', cls: 'text-red-500', dot: 'bg-red-500', active: 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-400' },
  { id: 'medium', label: 'Sedang', cls: 'text-amber-500', dot: 'bg-amber-500', active: 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-400' },
  { id: 'low', label: 'Rendah', cls: 'text-slate-500', dot: 'bg-slate-400', active: 'bg-slate-100 dark:bg-slate-900/30 ring-1 ring-slate-400' },
]
const priorityInfo = (id) => PRIORITIES.find(p => p.id === id) || PRIORITIES[1]

const fmtDate = (key) => {
  if (!key) return ''
  try {
    return format(parseISO(key), 'd MMM')
  } catch {
    return key
  }
}

const localDateKey = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function NotesTracker({
  notes,
  todos,
  syncState,
  retrySync,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleTodo,
}) {
  const [tab, setTab] = useState('tugas') // catatan | tugas
  const [noteModal, setNoteModal] = useState(null) // null | {} | note (edit)
  const [todoModal, setTodoModal] = useState(null) // null | {} | todo (edit)
  const [confirmNoteId, setConfirmNoteId] = useState(null)
  const [confirmTodoId, setConfirmTodoId] = useState(null)

  const today = localDateKey()

  const doneCount = todos.filter(t => t.done).length
  const progress = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0
  const overdueCount = todos.filter(t => !t.done && t.dueDate && t.dueDate < today).length

  // Urutkan: belum selesai dulu → jatuh tempo terdekat → prioritas tertinggi
  const sortedTodos = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 }
    return [...todos].sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1
      const da = a.dueDate || '9999-99-99'
      const db = b.dueDate || '9999-99-99'
      if (da !== db) return da < db ? -1 : 1
      return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
    })
  }, [todos])

  // Urutkan: di-pin dulu, lalu terbaru di atas
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      return (b.updatedAt || '').localeCompare(a.updatedAt || '')
    })
  }, [notes])

  const syncChip = syncState.status === 'syncing'
    ? { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Menyinkronkan…', cls: 'text-text-muted', retry: false }
    : syncState.status === 'synced'
      ? { icon: <CloudCheck className="w-3 h-3 text-emerald-500" />, label: 'Tersimpan', cls: 'text-emerald-600 dark:text-emerald-400', retry: false }
      : syncState.status === 'offline'
        ? { icon: <CloudOff className="w-3 h-3 text-amber-500" />, label: 'Offline', cls: 'text-amber-600 dark:text-amber-400', retry: true }
        : null

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {syncChip && (
          <button
            onClick={syncChip.retry ? retrySync : undefined}
            title={syncState.error || 'Status sinkronisasi notes & todo'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border/50 ${syncChip.cls}
                        ${syncChip.retry ? 'cursor-pointer hover:bg-surface-hover active:scale-[0.97] transition-all' : 'cursor-default'}`}
          >
            {syncChip.icon}
            <span className="text-[11px] font-medium">{syncChip.label}</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Tab Catatan / Tugas */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border/50">
            <button
              onClick={() => setTab('catatan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                          ${tab === 'catatan' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              Catatan
              {notes.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === 'catatan' ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/30' : 'bg-surface-muted text-text-muted'}`}>
                  {notes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('tugas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                          ${tab === 'tugas' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Tugas
              {todos.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === 'tugas' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-surface-muted text-text-muted'}`}>
                  {doneCount}/{todos.length}
                </span>
              )}
            </button>
          </div>

          {/* Tambah */}
          <button
            onClick={() => tab === 'tugas' ? setTodoModal({}) : setNoteModal({})}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600
                       text-white text-xs font-semibold shadow-sm shadow-orange-500/20
                       transition-all duration-150 active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            {tab === 'tugas' ? 'Tambah tugas' : 'Tambah catatan'}
          </button>
        </div>
      </div>

      {/* ── Tab Tugas ── */}
      {tab === 'tugas' && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <ListTodo className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-bold text-text leading-tight truncate">
                    {doneCount} dari {todos.length} tugas selesai
                  </p>
                  <p className={`text-[11px] mt-0.5 ${overdueCount > 0 ? 'text-red-500 font-medium' : 'text-text-muted'}`}>
                    {overdueCount > 0
                      ? `⚠ ${overdueCount} tugas terlambat dari jadwal`
                      : todos.length > 0 ? 'Semua tugas sesuai jadwal' : 'Belum ada tugas'}
                  </p>
                </div>
              </div>
              {todos.length > 0 && (
                <span className="text-xl font-bold text-text shrink-0">{progress}%</span>
              )}
            </div>
            <div className="mt-3 h-2 bg-surface-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Daftar tugas */}
          {sortedTodos.length === 0 ? (
            <EmptyState
              icon={<ListTodo className="w-7 h-7 text-orange-500" />}
              title="Belum ada tugas"
              desc="Catat daftar tugas harianmu — dengan prioritas, kategori, dan tanggal jatuh tempo."
              cta="Tambah tugas pertama"
              onClick={() => setTodoModal({})}
            />
          ) : (
            <div className="bg-surface rounded-2xl border border-border/60 card-shadow divide-y divide-border-light">
              {sortedTodos.map(t => {
                const p = priorityInfo(t.priority)
                const overdue = !t.done && t.dueDate && t.dueDate < today
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50 transition-colors">
                    <button
                      onClick={() => onToggleTodo(t.id)}
                      className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all active:scale-90
                                  ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-emerald-400'}`}
                      aria-label={t.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                      title={t.done ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {t.done && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${t.done ? 'text-text-muted line-through' : 'text-text'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${p.cls}`}>
                          <Flag className="w-3 h-3" />
                          {p.label}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {catEmoji(t.category)} {t.category}
                        </span>
                        {t.dueDate && (
                          <span className={`text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-text-muted'}`}>
                            📅 {fmtDate(t.dueDate)}{overdue ? ' · Terlambat' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setTodoModal(t)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors shrink-0"
                      aria-label="Edit tugas"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmTodoId === t.id ? (
                      <span className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { onDeleteTodo(t.id); setConfirmTodoId(null) }}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => setConfirmTodoId(null)}
                          className="px-2 py-1 rounded-lg bg-surface-muted text-text-muted text-[11px] hover:text-text transition-colors"
                        >
                          Batal
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmTodoId(t.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                        aria-label="Hapus tugas"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Catatan ── */}
      {tab === 'catatan' && (
        sortedNotes.length === 0 ? (
          <EmptyState
            icon={<StickyNote className="w-7 h-7 text-orange-500" />}
            title="Belum ada catatan"
            desc="Buat catatan cepat seperti sticky notes — bisa diberi warna dan di-pin ke atas."
            cta="Tambah catatan pertama"
            onClick={() => setNoteModal({})}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedNotes.map(n => {
              const color = NOTE_COLOR_MAP[n.color] || NOTE_COLOR_MAP.amber
              return (
                <div key={n.id} className={`rounded-2xl border ${color.bg} ${color.border} p-4 card-shadow card-enter flex flex-col`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {n.pinned && <Pin className="w-3 h-3 text-orange-500 fill-current shrink-0" />}
                      <p className={`text-xs font-bold text-text truncate ${n.title ? '' : 'italic text-text-muted'}`}>
                        {n.title || 'Tanpa judul'}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                      <button
                        onClick={() => onUpdateNote(n.id, { pinned: !n.pinned })}
                        className={`p-1.5 rounded-lg transition-colors ${n.pinned ? 'text-orange-500' : 'text-text-muted hover:text-text'} hover:bg-surface-muted`}
                        aria-label={n.pinned ? 'Lepas pin' : 'Pin ke atas'}
                        title={n.pinned ? 'Lepas pin' : 'Pin ke atas'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setNoteModal(n)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                        aria-label="Edit catatan"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmNoteId === n.id ? (
                        <button
                          onClick={() => { onDeleteNote(n.id); setConfirmNoteId(null) }}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          Hapus?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmNoteId(n.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-surface-muted transition-colors"
                          aria-label="Hapus catatan"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {n.content && (
                    <p className="mt-2 text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed line-clamp-6 flex-1">
                      {n.content}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                    <span className="flex items-center gap-1 text-[9px] text-text-muted">
                      <span className={`w-2 h-2 rounded-full ${color.dot} inline-block`} />
                      {n.updatedAt ? fmtDate(n.updatedAt) : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Modal tugas ── */}
      {todoModal && (
        <TodoModal
          initial={todoModal.id ? todoModal : null}
          onClose={() => setTodoModal(null)}
          onSave={(payload) => {
            if (todoModal.id) onUpdateTodo(todoModal.id, payload)
            else onAddTodo(payload)
            setTodoModal(null)
          }}
        />
      )}

      {/* ── Modal catatan ── */}
      {noteModal && (
        <NoteModal
          initial={noteModal.id ? noteModal : null}
          onClose={() => setNoteModal(null)}
          onSave={(payload) => {
            if (noteModal.id) onUpdateNote(noteModal.id, payload)
            else onAddNote(payload)
            setNoteModal(null)
          }}
        />
      )}
    </div>
  )
}

/* ═══════════════════ EMPTY STATE ═══════════════════ */
function EmptyState({ icon, title, desc, cta, onClick }) {
  return (
    <div className="bg-surface rounded-2xl border border-border/60 card-shadow px-6 py-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-text">{title}</h3>
      <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">{desc}</p>
      <button
        onClick={onClick}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                   text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.97]"
      >
        <Plus className="w-3.5 h-3.5" />
        {cta}
      </button>
    </div>
  )
}

/* ═══════════════════ MODAL TUGAS ═══════════════════ */
function TodoModal({ initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [priority, setPriority] = useState(initial?.priority || 'medium')
  const [category, setCategory] = useState(initial?.category || 'Pribadi')
  const [dueDate, setDueDate] = useState(initial?.dueDate || '')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), priority, category, dueDate })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">{initial ? 'Edit tugas' : 'Tugas baru'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Nama tugas</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: Selesaikan draft konten minggu ini"
              autoFocus
              maxLength={80}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Prioritas</label>
            <div className="flex items-center gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
                              ${priority === p.id ? `${p.active} ${p.cls}` : 'bg-surface-muted text-text-muted hover:text-text'}`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Kategori</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TODO_CATEGORIES.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                              ${category === c.name
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-surface-muted text-text-secondary hover:bg-surface-hover'}`}
                >
                  <span>{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">
              Tanggal jatuh tempo <span className="text-text-muted/60">(opsional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all duration-150 active:scale-[0.98]">
              {initial ? 'Simpan perubahan' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ═══════════════════ MODAL CATATAN ═══════════════════ */
function NoteModal({ initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [color, setColor] = useState(initial?.color || 'amber')
  const [pinned, setPinned] = useState(initial?.pinned || false)

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    onSave({ title: title.trim(), content: content.trim(), color, pinned })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">{initial ? 'Edit catatan' : 'Catatan baru'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: Ide konten bulan depan"
              autoFocus
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Isi catatan</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis catatanmu di sini…"
              rows={5}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Warna</label>
            <div className="flex items-center gap-2 flex-wrap">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.dot} transition-all
                              ${color === c.id ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'}`}
                  aria-label={`Warna ${c.id}`}
                >
                  {color === c.id && <Check className="w-3.5 h-3.5 text-white mx-auto" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-surface-muted/40 cursor-pointer hover:bg-surface-hover transition-colors">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <Pin className={`w-3.5 h-3.5 ${pinned ? 'text-orange-500 fill-current' : 'text-text-muted'}`} />
            <span className="text-xs font-medium text-text">Pin ke atas</span>
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!title.trim() && !content.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all duration-150 active:scale-[0.98]">
              {initial ? 'Simpan perubahan' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
