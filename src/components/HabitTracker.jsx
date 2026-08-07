import { useState, useMemo } from 'react'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'
import {
  Plus, Flame, Trash2, Pencil, Check, X, Target, CalendarCheck2,
  TrendingUp, Repeat, Loader2, CloudCheck, CloudOff, Minus,
} from 'lucide-react'

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const EMOJIS = ['💪', '🏃', '📚', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🚭', '☀️', '🎸', '🧹', '💰', '💊', '🦷']

const COLORS = [
  '#f97316', '#ef4444', '#8b5cf6', '#3b82f6',
  '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#64748b',
]

const dk = (date) => format(date, 'yyyy-MM-dd')

/** Jumlah hari beruntun sampai hari ini (atau kemarin jika hari ini belum dicentang). */
function streakOf(habit, today) {
  let streak = 0
  let d = new Date(today)
  if (!habit.checkins?.[dk(d)]) d = subDays(d, 1)
  while (habit.checkins?.[dk(d)]) {
    streak++
    d = subDays(d, 1)
  }
  return streak
}

/** Progress target mingguan (Sen–Minggu). */
function weekProgress(habit, today) {
  const start = startOfWeek(today, { weekStartsOn: 1 })
  let done = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (habit.checkins?.[dk(d)]) done++
  }
  return { done, target: habit.weeklyTarget || 3 }
}

/** Statistik bulan berjalan: berapa hari dicentang dari hari yang sudah lewat. */
function monthStats(habit, today) {
  const start = startOfMonth(today)
  const daysElapsed = today.getDate()
  let done = 0
  for (let i = 0; i < daysElapsed; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (habit.checkins?.[dk(d)]) done++
  }
  const pct = daysElapsed > 0 ? Math.round((done / daysElapsed) * 100) : 0
  return { done, daysElapsed, pct }
}

export default function HabitTracker({
  habits,
  syncState,
  retrySync,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  onToggleCheckin,
}) {
  const [range, setRange] = useState(7) // 7 | 14 hari terakhir
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  const today = useMemo(() => new Date(), [])

  const dayKeys = useMemo(() => (
    Array.from({ length: range }, (_, i) => {
      const date = subDays(today, range - 1 - i)
      return { key: dk(date), date, isToday: i === range - 1 }
    })
  ), [range, today])

  const bestStreak = useMemo(
    () => habits.reduce((m, h) => Math.max(m, streakOf(h, today)), 0),
    [habits, today]
  )
  const avgMonth = useMemo(() => {
    if (habits.length === 0) return 0
    const sum = habits.reduce((s, h) => s + monthStats(h, today).pct, 0)
    return Math.round(sum / habits.length)
  }, [habits, today])

  const syncChip = syncState.status === 'syncing'
    ? { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Menyinkronkan…', cls: 'text-text-muted', retry: false }
    : syncState.status === 'synced'
      ? { icon: <CloudCheck className="w-3 h-3 text-emerald-500" />, label: 'Tersimpan', cls: 'text-emerald-600 dark:text-emerald-400', retry: false }
      : syncState.status === 'offline'
        ? { icon: <CloudOff className="w-3 h-3 text-amber-500" />, label: 'Offline', cls: 'text-amber-600 dark:text-amber-400', retry: true }
        : null

  const openAdd = () => { setEditingId(null); setModalOpen(true) }
  const openEdit = (habit) => { setEditingId(habit.id); setModalOpen(true) }

  const stats = [
    { icon: Repeat, label: 'Habit aktif', value: habits.length, suffix: '' },
    { icon: Flame, label: 'Streak terbaik', value: bestStreak, suffix: ' hari' },
    { icon: TrendingUp, label: 'Konsistensi bulan ini', value: `${avgMonth}%`, suffix: '' },
  ]

  return (
    <div className="space-y-5">
      {/* ── Statistik ringkas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value, suffix }) => (
          <div key={label} className="bg-surface rounded-2xl border border-border/60 p-4 card-shadow flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-text leading-none">{value}{suffix}</p>
              <p className="text-[11px] text-text-muted mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {syncChip && (
          <button
            onClick={syncChip.retry ? retrySync : undefined}
            title={syncState.error || 'Status sinkronisasi habit'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border/50 ${syncChip.cls}
                        ${syncChip.retry ? 'cursor-pointer hover:bg-surface-hover active:scale-[0.97] transition-all' : 'cursor-default'}`}
          >
            {syncChip.icon}
            <span className="text-[11px] font-medium">{syncChip.label}</span>
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {/* Toggle rentang */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border/50">
            {[7, 14].map(n => (
              <button
                key={n}
                onClick={() => setRange(n)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                            ${range === n ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
              >
                {n} hari
              </button>
            ))}
          </div>
          {/* Tambah */}
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600
                       text-white text-xs font-semibold shadow-sm shadow-orange-500/20
                       transition-all duration-150 active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah habit
          </button>
        </div>
      </div>

      {/* ── Daftar habit ── */}
      {habits.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border/60 card-shadow px-6 py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
            <CalendarCheck2 className="w-7 h-7 text-orange-500" />
          </div>
          <h3 className="text-sm font-bold text-text">Belum ada habit</h3>
          <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
            Mulai dari hal kecil — minum air, olahraga, atau baca buku. Klik "Tambah habit" untuk membuat yang pertama.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                       text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat habit pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map(habit => {
            const streak = streakOf(habit, today)
            const { done, target } = weekProgress(habit, today)
            const ms = monthStats(habit, today)
            const weekPct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
            return (
              <div key={habit.id} className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow card-enter">
                {/* Header habit */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{habit.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text truncate">{habit.name}</p>
                    <p className="text-[11px] text-text-muted">Target {target}x / minggu</p>
                  </div>
                  {streak > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20
                                     text-orange-600 dark:text-orange-400 text-[11px] font-semibold shrink-0">
                      <Flame className="w-3.5 h-3.5" />
                      {streak} hari
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(habit)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors shrink-0"
                    aria-label={`Edit ${habit.name}`}
                    title="Edit habit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {confirmingId === habit.id ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { onDeleteHabit(habit.id); setConfirmingId(null) }}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="px-2 py-1 rounded-lg bg-surface-muted text-text-muted text-[11px] hover:text-text transition-colors"
                      >
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(habit.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50
                                 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      aria-label={`Hapus ${habit.name}`}
                      title="Hapus habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Progress mingguan */}
                <div className="mt-3.5">
                  <div className="flex justify-between text-[11px] text-text-muted mb-1">
                    <span>Minggu ini</span>
                    <span className={done >= target ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                      {done}/{target}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${weekPct}%`, background: habit.color }}
                    />
                  </div>
                </div>

                {/* Grid check-in */}
                <div className="mt-4 flex items-start gap-1.5 overflow-x-auto pb-1">
                  {dayKeys.map(({ key, date, isToday }) => {
                    const checked = !!habit.checkins?.[key]
                    return (
                      <div key={key} className="flex flex-col items-center gap-1 min-w-[40px] flex-1">
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${isToday ? 'text-orange-500' : 'text-text-muted'}`}>
                          {WEEKDAYS[date.getDay()]}
                        </span>
                        <span className={`text-[10px] font-medium ${isToday ? 'text-orange-500 font-bold' : 'text-text-secondary'}`}>
                          {date.getDate()}
                        </span>
                        <button
                          onClick={() => onToggleCheckin(habit.id, key)}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center
                                      transition-all duration-150 active:scale-75
                                      ${checked
                                        ? 'text-white shadow-sm'
                                        : 'text-transparent border-border bg-surface-muted hover:bg-surface-hover'}`}
                          style={checked ? { borderColor: habit.color, backgroundColor: habit.color } : undefined}
                          aria-label={`${checked ? 'Batalkan' : 'Tandai'} ${habit.name} ${date.getDate()} ${WEEKDAYS[date.getDay()]}`}
                          title={`${date.getDate()} ${WEEKDAYS[date.getDay()]}`}
                        >
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Statistik bulan ini */}
                <div className="mt-3.5 flex items-center gap-3">
                  <TrendingUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${ms.pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted whitespace-nowrap">
                    Bulan ini: {ms.done}/{ms.daysElapsed} hari ({ms.pct}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal tambah/edit habit ── */}
      {modalOpen && (
        <HabitModal
          initial={editingId ? habits.find(h => h.id === editingId) : null}
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            if (editingId) onUpdateHabit(editingId, payload)
            else onAddHabit(payload)
            setModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal tambah / edit habit
   ───────────────────────────────────────────── */
function HabitModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '🎯')
  const [color, setColor] = useState(initial?.color || '#f97316')
  const [target, setTarget] = useState(initial?.weeklyTarget || 3)

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), emoji, color, weeklyTarget: target })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">
            {initial ? 'Edit habit' : 'Habit baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Nama */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Nama habit</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Olahraga 30 menit"
              autoFocus
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50
                         outline-none text-sm text-text placeholder:text-text-muted
                         focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Ikon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all
                              ${emoji === e
                                ? 'bg-orange-50 dark:bg-orange-900/30 ring-2 ring-orange-400 scale-105'
                                : 'bg-surface-muted hover:bg-surface-hover'}`}
                  aria-label={`Ikon ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Warna */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Warna</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                              ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c, ['--tw-ring-color']: c }}
                  aria-label={`Warna ${c}`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Target mingguan */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Target mingguan</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTarget(t => Math.max(1, t - 1))}
                className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center
                           text-text hover:bg-surface-hover transition-colors"
                aria-label="Kurangi target"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex items-baseline gap-1 min-w-[64px] justify-center">
                <span className="text-xl font-bold text-text">{target}</span>
                <span className="text-[11px] text-text-muted">x/minggu</span>
              </div>
              <button
                type="button"
                onClick={() => setTarget(t => Math.min(7, t + 1))}
                className="w-9 h-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center
                           text-text hover:bg-surface-hover transition-colors"
                aria-label="Tambah target"
              >
                <Plus className="w-4 h-4" />
              </button>
              <Target className="w-4 h-4 text-text-muted ml-auto" />
            </div>
          </div>

          {/* Aksi */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-orange-500/20
                         transition-all duration-150 active:scale-[0.98]"
            >
              {initial ? 'Simpan perubahan' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
