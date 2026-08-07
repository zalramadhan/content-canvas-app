import { useState, useMemo, useEffect } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import {
  Wallet, Plus, Trash2, Pencil, X, Check, TrendingUp, TrendingDown,
  Target, ChevronLeft, ChevronRight, Loader2, CloudCheck, CloudOff,
  ArrowLeftRight,
} from 'lucide-react'

// ── Konstanta ──
const EXPENSE_CATEGORIES = [
  { name: 'Makanan', emoji: '🍜' },
  { name: 'Transport', emoji: '🚗' },
  { name: 'Belanja', emoji: '🛒' },
  { name: 'Tagihan', emoji: '💡' },
  { name: 'Hiburan', emoji: '🎬' },
  { name: 'Kesehatan', emoji: '💊' },
  { name: 'Pendidikan', emoji: '📚' },
  { name: 'Lainnya', emoji: '📦' },
]
const INCOME_CATEGORIES = [
  { name: 'Gaji', emoji: '💰' },
  { name: 'Bonus', emoji: '🎁' },
  { name: 'Bisnis', emoji: '💼' },
  { name: 'Investasi', emoji: '📈' },
  { name: 'Lainnya', emoji: '📦' },
]
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

const WALLET_EMOJIS = ['💵', '🏦', '📱', '💳', '💰', '🏧', '👛', '💼']
const WALLET_COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#ec4899']

const fmtIDR = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n || 0)

const catEmoji = (name) =>
  (ALL_CATEGORIES.find(c => c.name === name) || { emoji: '🏷️' }).emoji

const monthPrefix = (date) => format(date, 'yyyy-MM')

export default function FinanceTracker({
  wallets,
  transactions,
  budgets,
  syncState,
  retrySync,
  onAddWallet,
  onUpdateWallet,
  onDeleteWallet,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  onAddTransfer,
  onAddBudget,
  onDeleteBudget,
}) {
  const [tab, setTab] = useState('ringkasan') // ringkasan | transaksi | budget | dompet
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [txModal, setTxModal] = useState(null) // null | { type } | { editing }
  const [transferModal, setTransferModal] = useState(null) // null | {} | { editing }
  const [walletModal, setWalletModal] = useState(null) // null | wallet (edit)
  const [budgetModal, setBudgetModal] = useState(false)
  const [confirmTxId, setConfirmTxId] = useState(null)
  const [confirmWalletId, setConfirmWalletId] = useState(null)

  const mPrefix = monthPrefix(month)
  const monthTx = useMemo(() => {
    return transactions
      .filter(t => (t.date || '').startsWith(mPrefix))
      .sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')))
  }, [transactions, mPrefix])

  const walletById = (id) => wallets.find(w => w.id === id)

  const walletBalance = (wallet) => {
    if (!wallet) return 0
    return transactions.reduce((sum, t) => {
      // Transfer: keluar dari dompet asal, masuk ke dompet tujuan
      if (t.type === 'transfer') {
        if (t.fromWalletId === wallet.id) return sum - t.amount
        if (t.toWalletId === wallet.id) return sum + t.amount
        return sum
      }
      if (t.walletId !== wallet.id) return sum
      return sum + (t.type === 'income' ? t.amount : -t.amount)
    }, wallet.initialBalance || 0)
  }

  // ── Statistik bulan ini ──
  const monthIncome = useMemo(
    () => monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthTx]
  )
  const monthExpense = useMemo(
    () => monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [monthTx]
  )
  const net = monthIncome - monthExpense
  const totalWallet = wallets.reduce((s, w) => s + walletBalance(w), 0)

  const expenseByCat = useMemo(() => {
    const map = {}
    for (const t of monthTx) {
      if (t.type !== 'expense') continue
      map[t.category] = (map[t.category] || 0) + t.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthTx])

  const monthBudgets = useMemo(() => budgets.filter(b => b.month === mPrefix), [budgets, mPrefix])
  const budgetSpent = (category) =>
    monthTx.filter(t => t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0)

  // Tren 6 bulan: pemasukan vs pengeluaran per bulan (berakhir di bulan yang dilihat)
  const trend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(month, i)
      months.push({ key: monthPrefix(m), label: format(m, 'MMM'), income: 0, expense: 0 })
    }
    for (const t of transactions) {
      if (t.type === 'transfer') continue
      const bucket = months.find(b => b.key === (t.date || '').slice(0, 7))
      if (!bucket) continue
      if (t.type === 'income') bucket.income += t.amount
      else bucket.expense += t.amount
    }
    return months
  }, [transactions, month])

  const syncChip = syncState.status === 'syncing'
    ? { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Menyinkronkan…', cls: 'text-text-muted', retry: false }
    : syncState.status === 'synced'
      ? { icon: <CloudCheck className="w-3 h-3 text-emerald-500" />, label: 'Tersimpan', cls: 'text-emerald-600 dark:text-emerald-400', retry: false }
      : syncState.status === 'offline'
        ? { icon: <CloudOff className="w-3 h-3 text-amber-500" />, label: 'Offline', cls: 'text-amber-600 dark:text-amber-400', retry: true }
        : null

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: TrendingUp },
    { id: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'budget', label: 'Budget', icon: Target },
    { id: 'dompet', label: 'Dompet', icon: Wallet },
  ]

  // Edit transaksi: transfer dibuka lewat modal transfer, sisanya modal transaksi
  const handleEditTx = (tx) => {
    if (tx.type === 'transfer') setTransferModal({ editing: tx })
    else setTxModal({ editing: tx })
  }

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {syncChip && (
          <button
            onClick={syncChip.retry ? retrySync : undefined}
            title={syncState.error || 'Status sinkronisasi finance'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border/50 ${syncChip.cls}
                        ${syncChip.retry ? 'cursor-pointer hover:bg-surface-hover active:scale-[0.97] transition-all' : 'cursor-default'}`}
          >
            {syncChip.icon}
            <span className="text-[11px] font-medium">{syncChip.label}</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Navigasi bulan */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border/50">
            <button
              onClick={() => setMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-text px-1.5 min-w-[92px] text-center">{format(month, 'MMMM yyyy')}</span>
            <button
              onClick={() => setMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }}
              className="px-2 py-1 rounded-md text-[11px] font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              Hari ini
            </button>
          </div>

          {/* Transfer antar dompet */}
          <button
            onClick={() => setTransferModal({})}
            disabled={wallets.length < 2}
            title={wallets.length < 2 ? 'Buat minimal 2 dompet dulu untuk transfer' : 'Transfer antar dompet'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-muted border border-border
                       text-text-secondary hover:text-text disabled:opacity-40 disabled:cursor-not-allowed
                       text-xs font-semibold transition-all duration-150 active:scale-[0.97]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transfer
          </button>

          {/* Tambah transaksi */}
          <button
            onClick={() => setTxModal({ type: 'expense' })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600
                       text-white text-xs font-semibold shadow-sm shadow-orange-500/20
                       transition-all duration-150 active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah transaksi
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted border border-border/50 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                        ${tab === id ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Ringkasan ── */}
      {tab === 'ringkasan' && (
        <SummaryTab
          month={month}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          net={net}
          totalWallet={totalWallet}
          expenseByCat={expenseByCat}
          monthTx={monthTx}
          monthBudgets={monthBudgets}
          budgetSpent={budgetSpent}
          trend={trend}
          walletById={walletById}
          onAdd={() => setTxModal({ type: 'expense' })}
        />
      )}

      {/* ── Transaksi ── */}
      {tab === 'transaksi' && (
        <TransactionsTab
          monthTx={monthTx}
          wallets={wallets}
          walletById={walletById}
          onAdd={() => setTxModal({ type: 'expense' })}
          onEdit={handleEditTx}
          onDelete={onDeleteTransaction}
          confirmTxId={confirmTxId}
          setConfirmTxId={setConfirmTxId}
        />
      )}

      {/* ── Budget ── */}
      {tab === 'budget' && (
        <BudgetTab
          monthBudgets={monthBudgets}
          budgetSpent={budgetSpent}
          onAdd={() => setBudgetModal(true)}
          onDelete={onDeleteBudget}
        />
      )}

      {/* ── Dompet ── */}
      {tab === 'dompet' && (
        <WalletsTab
          wallets={wallets}
          walletBalance={walletBalance}
          totalWallet={totalWallet}
          onAdd={() => setWalletModal({})}
          onEdit={(w) => setWalletModal(w)}
          onDelete={onDeleteWallet}
          confirmWalletId={confirmWalletId}
          setConfirmWalletId={setConfirmWalletId}
        />
      )}

      {/* ── Modal transaksi ── */}
      {txModal && (
        <TransactionModal
          initial={txModal.editing || null}
          wallets={wallets}
          onClose={() => setTxModal(null)}
          onSave={(payload) => {
            if (txModal.editing) onUpdateTransaction(txModal.editing.id, payload)
            else onAddTransaction(payload)
            setTxModal(null)
          }}
        />
      )}

      {/* ── Modal transfer ── */}
      {transferModal && (
        <TransferModal
          initial={transferModal.editing || null}
          wallets={wallets}
          onClose={() => setTransferModal(null)}
          onSave={(payload) => {
            if (transferModal.editing) onUpdateTransaction(transferModal.editing.id, payload)
            else onAddTransfer(payload)
            setTransferModal(null)
          }}
        />
      )}

      {/* ── Modal dompet ── */}
      {walletModal && (
        <WalletModal
          initial={walletModal.id ? walletModal : null}
          onClose={() => setWalletModal(null)}
          onSave={(payload) => {
            if (walletModal.id) onUpdateWallet(walletModal.id, payload)
            else onAddWallet(payload)
            setWalletModal(null)
          }}
        />
      )}

      {/* ── Modal budget ── */}
      {budgetModal && (
        <BudgetModal
          initialMonth={month}
          onClose={() => setBudgetModal(false)}
          onSave={(payload) => { onAddBudget(payload); setBudgetModal(false) }}
        />
      )}
    </div>
  )
}

/* ═══════════════════ RINGKASAN ═══════════════════ */
function SummaryTab({ month, monthIncome, monthExpense, net, totalWallet, expenseByCat, monthTx, monthBudgets, budgetSpent, trend, walletById, onAdd }) {
  const stats = [
    { label: 'Pemasukan', value: fmtIDR(monthIncome), icon: TrendingUp, cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pengeluaran', value: fmtIDR(monthExpense), icon: TrendingDown, cls: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Saldo bersih', value: fmtIDR(net), icon: ArrowLeftRight, cls: net >= 0 ? 'text-text' : 'text-red-500', bg: 'bg-surface-muted' },
    { label: 'Total dompet', value: fmtIDR(totalWallet), icon: Wallet, cls: 'text-text', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ]
  const maxCat = expenseByCat[0]?.[1] || 0
  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0)
  const spentBudgeted = monthBudgets.reduce((s, b) => s + budgetSpent(b.category), 0)

  return (
    <div className="space-y-4">
      {/* Kartu statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, cls, bg }) => (
          <div key={label} className="bg-surface rounded-2xl border border-border/60 p-4 card-shadow">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2.5`}>
              <Icon className={`w-4.5 h-4.5 ${cls}`} />
            </div>
            <p className="text-base sm:text-lg font-bold text-text leading-tight truncate">{value}</p>
            <p className="text-[11px] text-text-muted mt-1">{label} · {format(month, 'MMM')}</p>
          </div>
        ))}
      </div>

      {/* Tren 6 bulan */}
      <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <p className="text-xs font-semibold text-text">Tren 6 bulan</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Pemasukan
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Pengeluaran
            </span>
          </div>
        </div>
        {trend.reduce((s, m) => s + m.income + m.expense, 0) === 0 ? (
          <p className="text-xs text-text-muted py-8 text-center">
            Belum ada data untuk tren. Catat transaksi untuk melihat grafik 6 bulan.
          </p>
        ) : (
          <TrendChart trend={trend} />
        )}
      </div>

      {/* Budget bulanan */}
      {totalBudget > 0 && (
        <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-text-muted" />
              Budget bulan ini
            </p>
            <span className={`text-[11px] font-semibold ${spentBudgeted > totalBudget ? 'text-red-500' : 'text-text-muted'}`}>
              {fmtIDR(spentBudgeted)} / {fmtIDR(totalBudget)}
            </span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${spentBudgeted > totalBudget ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(100, Math.round((spentBudgeted / totalBudget) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pengeluaran per kategori */}
        <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow">
          <p className="text-xs font-semibold text-text mb-3">Pengeluaran per kategori</p>
          {expenseByCat.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">
              Belum ada pengeluaran bulan ini.
              <br />
              <button onClick={onAdd} className="mt-2 text-orange-500 hover:text-orange-600 font-medium">+ Catat pengeluaran</button>
            </p>
          ) : (
            <div className="space-y-2.5">
              {expenseByCat.map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-base shrink-0">{catEmoji(cat)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-text-secondary truncate">{cat}</span>
                      <span className="text-text font-medium shrink-0">{fmtIDR(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${maxCat > 0 ? Math.round((amount / maxCat) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaksi terbaru */}
        <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow">
          <p className="text-xs font-semibold text-text mb-3">Transaksi terbaru</p>
          {monthTx.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">Belum ada transaksi bulan ini.</p>
          ) : (
            <div className="space-y-1">
              {monthTx.slice(0, 6).map(t => {
                const w = walletById(t.walletId)
                if (t.type === 'transfer') {
                  const fromW = walletById(t.fromWalletId)
                  const toW = walletById(t.toWalletId)
                  return (
                    <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                      <span className="text-base shrink-0">🔄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">{t.note || 'Transfer'}</p>
                        <p className="text-[10px] text-text-muted">
                          {fromW ? fromW.emoji : ''} {fromW?.name || '—'} → {toW ? toW.emoji : ''} {toW?.name || '—'} · {t.date}
                        </p>
                      </div>
                      <span className="text-xs font-semibold shrink-0 text-sky-600 dark:text-sky-400">⇄ {fmtIDR(t.amount)}</span>
                    </div>
                  )
                }
                return (
                  <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="text-base shrink-0">{catEmoji(t.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{t.note || t.category}</p>
                      <p className="text-[10px] text-text-muted">
                        {t.category} · {w ? `${w.emoji} ${w.name}` : '—'} · {t.date}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '−'}{fmtIDR(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════ TREN 6 BULAN (bar chart) ═══════════════════ */
function TrendChart({ trend }) {
  const maxVal = Math.max(1, ...trend.flatMap(m => [m.income, m.expense]))

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: 160 }}>
      {trend.map(m => (
        <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
          <div className="flex items-end justify-center gap-1 w-full flex-1">
            <div
              className="w-3 sm:w-4 rounded-t-md bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
              style={{ height: `${Math.round((m.income / maxVal) * 100)}%` }}
              title={`${m.label}: Pemasukan ${fmtIDR(m.income)}`}
            />
            <div
              className="w-3 sm:w-4 rounded-t-md bg-red-400/80 hover:bg-red-400 transition-colors"
              style={{ height: `${Math.round((m.expense / maxVal) * 100)}%` }}
              title={`${m.label}: Pengeluaran ${fmtIDR(m.expense)}`}
            />
          </div>
          <span className="text-[10px] text-text-muted truncate">{m.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════ TRANSAKSI ═══════════════════ */
function TransactionsTab({ monthTx, wallets, walletById, onAdd, onEdit, onDelete, confirmTxId, setConfirmTxId }) {
  const [catFilter, setCatFilter] = useState('all')
  const [walletFilter, setWalletFilter] = useState('all')

  // Filter undefined (transfer tidak punya kategori) agar tidak muncul opsi kosong
  const cats = useMemo(
    () => ['all', ...new Set(monthTx.map(t => t.category).filter(Boolean))],
    [monthTx]
  )

  // Reset filter jika nilainya tidak lagi tersedia (pindah bulan / dompet dihapus)
  useEffect(() => {
    if (catFilter !== 'all' && !cats.includes(catFilter)) setCatFilter('all')
  }, [cats, catFilter])
  useEffect(() => {
    if (walletFilter !== 'all' && !wallets.some(w => w.id === walletFilter)) setWalletFilter('all')
  }, [wallets, walletFilter])

  const filtered = monthTx.filter(t => {
    if (catFilter !== 'all' && t.category !== catFilter) return false
    if (walletFilter === 'all') return true
    if (t.type === 'transfer') {
      return t.fromWalletId === walletFilter || t.toWalletId === walletFilter
    }
    return t.walletId === walletFilter
  })

  if (monthTx.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border/60 card-shadow px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
          <ArrowLeftRight className="w-7 h-7 text-orange-500" />
        </div>
        <h3 className="text-sm font-bold text-text">Belum ada transaksi</h3>
        <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
          Catat pemasukan & pengeluaran harianmu untuk mulai melacak keuangan.
        </p>
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                     text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.97]"
        >
          <Plus className="w-3.5 h-3.5" />
          Catat transaksi pertama
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-2xl border border-border/60 card-shadow">
      {/* Filter */}
      <div className="p-4 border-b border-border-light flex items-center gap-2 flex-wrap">
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border text-xs text-text outline-none focus:border-orange-400 transition-colors"
        >
          <option value="all">Semua kategori</option>
          {cats.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{catEmoji(c)} {c}</option>
          ))}
        </select>
        <select
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border text-xs text-text outline-none focus:border-orange-400 transition-colors"
        >
          <option value="all">Semua dompet</option>
          {wallets.map(w => (
            <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-text-muted">{filtered.length} transaksi</span>
      </div>

      {/* Daftar */}
      <div className="divide-y divide-border-light">
        {filtered.length === 0 ? (
          <p className="text-xs text-text-muted py-10 text-center">Tidak ada transaksi yang cocok.</p>
        ) : filtered.map(t => {
          const w = walletById(t.walletId)
          const isTransfer = t.type === 'transfer'
          const fromW = walletById(t.fromWalletId)
          const toW = walletById(t.toWalletId)
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/50 transition-colors">
              <span className="text-lg shrink-0">{isTransfer ? '🔄' : catEmoji(t.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">
                  {isTransfer ? (t.note || 'Transfer') : (t.note || t.category)}
                </p>
                {isTransfer ? (
                  <p className="text-[10px] text-text-muted">
                    {fromW ? `${fromW.emoji} ${fromW.name}` : 'Dompet terhapus'} → {toW ? `${toW.emoji} ${toW.name}` : 'Dompet terhapus'} · {t.date}
                  </p>
                ) : (
                  <p className="text-[10px] text-text-muted">
                    {catEmoji(t.category)} {t.category} · {w ? `${w.emoji} ${w.name}` : (t.walletId ? 'Dompet terhapus' : 'Tanpa dompet')} · {t.date}
                  </p>
                )}
              </div>
              <span className={`text-xs font-bold shrink-0 ${isTransfer ? 'text-sky-600 dark:text-sky-400' : (t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}`}>
                {isTransfer ? '⇄ ' : (t.type === 'income' ? '+' : '−')}{fmtIDR(t.amount)}
              </span>
              <button
                onClick={() => onEdit(t)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors shrink-0"
                aria-label="Edit transaksi"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {confirmTxId === t.id ? (
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { onDelete(t.id); setConfirmTxId(null) }}
                    className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setConfirmTxId(null)}
                    className="px-2 py-1 rounded-lg bg-surface-muted text-text-muted text-[11px] hover:text-text transition-colors"
                  >
                    Batal
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmTxId(t.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  aria-label="Hapus transaksi"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════ BUDGET ═══════════════════ */
function BudgetTab({ monthBudgets, budgetSpent, onAdd, onDelete }) {
  if (monthBudgets.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border/60 card-shadow px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
          <Target className="w-7 h-7 text-orange-500" />
        </div>
        <h3 className="text-sm font-bold text-text">Belum ada budget bulan ini</h3>
        <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
          Tetapkan batas pengeluaran per kategori supaya keuangan tetap terkontrol.
        </p>
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                     text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.97]"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah budget
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {monthBudgets.map(b => {
        const spent = budgetSpent(b.category)
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        const over = spent > b.amount
        return (
          <div key={b.id} className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow card-enter">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{catEmoji(b.category)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{b.category}</p>
                <p className={`text-[11px] font-medium ${over ? 'text-red-500' : 'text-text-muted'}`}>
                  {over ? `Melebihi budget ${fmtIDR(spent - b.amount)}!` : `Sisa ${fmtIDR(b.amount - spent)}`}
                </p>
              </div>
              <span className={`text-xs font-bold shrink-0 ${over ? 'text-red-500' : 'text-text'}`}>{fmtIDR(b.amount)}</span>
              <button
                onClick={() => onDelete(b.id)}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                aria-label={`Hapus budget ${b.category}`}
                title="Hapus budget"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-text-muted mb-1">
                <span>Terpakai</span>
                <span>{fmtIDR(spent)} ({pct}%)</span>
              </div>
              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed
                   border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400
                   text-xs font-medium hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Tambah budget kategori lain
      </button>
    </div>
  )
}

/* ═══════════════════ DOMPET ═══════════════════ */
function WalletsTab({ wallets, walletBalance, totalWallet, onAdd, onEdit, onDelete, confirmWalletId, setConfirmWalletId }) {
  if (wallets.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border/60 card-shadow px-6 py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
          <Wallet className="w-7 h-7 text-orange-500" />
        </div>
        <h3 className="text-sm font-bold text-text">Belum ada dompet</h3>
        <p className="text-xs text-text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
          Buat dompet untuk uang tunai, rekening bank, atau e-wallet — saldo dihitung otomatis dari transaksi.
        </p>
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                     text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition-all active:scale-[0.97]"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat dompet pertama
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-text leading-none truncate">{fmtIDR(totalWallet)}</p>
          <p className="text-[11px] text-text-muted mt-1">Total saldo semua dompet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wallets.map(w => {
          const bal = walletBalance(w)
          return (
            <div key={w.id} className="bg-surface rounded-2xl border border-border/60 p-4 sm:p-5 card-shadow card-enter">
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                  style={{ backgroundColor: w.color }}
                >
                  {w.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text truncate">{w.name}</p>
                  <p className="text-[10px] text-text-muted">Saldo awal {fmtIDR(w.initialBalance || 0)}</p>
                </div>
                <button
                  onClick={() => onEdit(w)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors shrink-0"
                  aria-label={`Edit ${w.name}`}
                  title="Edit dompet"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {confirmWalletId === w.id ? (
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { onDelete(w.id); setConfirmWalletId(null) }}
                      className="px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setConfirmWalletId(null)}
                      className="px-2 py-1 rounded-lg bg-surface-muted text-text-muted text-[11px] hover:text-text transition-colors"
                    >
                      Batal
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmWalletId(w.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    aria-label={`Hapus ${w.name}`}
                    title="Hapus dompet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-lg font-bold text-text">{fmtIDR(bal)}</p>
            </div>
          )
        })}
      </div>

      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed
                   border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400
                   text-xs font-medium hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Tambah dompet
      </button>
    </div>
  )
}

/* ═══════════════════ MODAL TRANSAKSI ═══════════════════ */
function TransactionModal({ initial, wallets, onSave, onClose }) {
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || (type === 'income' ? 'Gaji' : 'Makanan'))
  const [walletId, setWalletId] = useState(
    (initial?.walletId && wallets.some(w => w.id === initial.walletId))
      ? initial.walletId
      : wallets[0]?.id || ''
  )
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(initial?.note || '')

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const switchType = (t) => {
    setType(t)
    setCategory(t === 'income' ? 'Gaji' : 'Makanan')
  }

  const submit = (e) => {
    e.preventDefault()
    const val = Number(amount)
    if (!val || val <= 0) return
    onSave({ type, amount: val, category, walletId: walletId || null, date, note })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">{initial ? 'Edit transaksi' : 'Transaksi baru'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Tipe */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border/50">
            <button
              type="button"
              onClick={() => switchType('expense')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors
                          ${type === 'expense' ? 'bg-surface text-red-500 shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => switchType('income')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors
                          ${type === 'income' ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Pemasukan
            </button>
          </div>

          {/* Jumlah */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Jumlah (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="cth: 50000"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Kategori</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {cats.map(c => (
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

          {/* Dompet */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Dompet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         focus:border-orange-400 transition-colors"
            >
              {wallets.length === 0 && <option value="">Belum ada dompet — buat dulu di tab Dompet</option>}
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="cth: Makan siang, bensin, gaji bulanan"
              maxLength={80}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!amount || Number(amount) <= 0}
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

/* ═══════════════════ MODAL DOMPET ═══════════════════ */
function WalletModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '💵')
  const [color, setColor] = useState(initial?.color || '#f97316')
  const [balance, setBalance] = useState(initial?.initialBalance != null ? String(initial.initialBalance) : '')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), emoji, color, initialBalance: Number(balance) || 0 })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">{initial ? 'Edit dompet' : 'Dompet baru'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Nama dompet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Tunai, Bank BCA, OVO"
              autoFocus
              maxLength={30}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Ikon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {WALLET_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all
                              ${emoji === e ? 'bg-orange-50 dark:bg-orange-900/30 ring-2 ring-orange-400 scale-105' : 'bg-surface-muted hover:bg-surface-hover'}`}
                  aria-label={`Ikon ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Warna</label>
            <div className="flex items-center gap-2 flex-wrap">
              {WALLET_COLORS.map(c => (
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

          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">
              Saldo awal (Rp) {initial ? '— mengubah saldo dasar dompet' : ''}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="cth: 500000"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all duration-150 active:scale-[0.98]">
              {initial ? 'Simpan perubahan' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ═══════════════════ MODAL BUDGET ═══════════════════ */
function BudgetModal({ initialMonth, onSave, onClose }) {
  const [category, setCategory] = useState('Makanan')
  const [amount, setAmount] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const val = Number(amount)
    if (!val || val <= 0) return
    onSave({ category, amount: val, month: monthPrefix(initialMonth) })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <Target className="w-4 h-4 text-text-muted" />
            Budget {format(initialMonth, 'MMMM yyyy')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Kategori</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {EXPENSE_CATEGORIES.map(c => (
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
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Batas budget (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="cth: 1000000"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!amount || Number(amount) <= 0}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-orange-500/20 transition-all duration-150 active:scale-[0.98]">
              Simpan budget
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ═══════════════════ MODAL TRANSFER ═══════════════════ */
function TransferModal({ initial, wallets, onSave, onClose }) {
  const [fromId, setFromId] = useState(initial?.fromWalletId || wallets[0]?.id || '')
  const [toId, setToId] = useState(initial?.toWalletId || wallets[1]?.id || '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(initial?.note || '')

  const canSubmit =
    fromId && toId && fromId !== toId && Number(amount) > 0 &&
    wallets.some(w => w.id === fromId) && wallets.some(w => w.id === toId)

  const swap = () => {
    setFromId(toId)
    setToId(fromId)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSave({ fromWalletId: fromId, toWalletId: toId, amount: Number(amount), date, note })
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-sky-500" />
            {initial ? 'Edit transfer' : 'Transfer antar dompet'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Dari → Ke */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Dari dompet</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                           focus:border-orange-400 transition-colors"
              >
                {wallets.filter(w => w.id !== toId).map(w => (
                  <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={swap}
              className="mb-0.5 p-2.5 rounded-lg bg-surface-muted border border-border text-text-muted hover:text-sky-500
                         hover:border-sky-300 transition-colors"
              aria-label="Tukar dari dan ke"
              title="Tukar arah"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Ke dompet</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                           focus:border-orange-400 transition-colors"
              >
                {wallets.filter(w => w.id !== fromId).map(w => (
                  <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jumlah */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Jumlah (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="cth: 100000"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Catatan (opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="cth: Pindah ke tabungan"
              maxLength={80}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-muted/50 outline-none text-sm text-text
                         placeholder:text-text-muted focus:border-orange-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50
                         text-white text-sm font-semibold shadow-sm shadow-sky-500/20 transition-all duration-150 active:scale-[0.98]">
              {initial ? 'Simpan perubahan' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
