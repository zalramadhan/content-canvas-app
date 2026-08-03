import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2, X } from 'lucide-react'
import { exportToCSV, exportToPDF } from '../utils/exportData'
import { STATUSES } from '../utils/status'

export default function ExportDropdown({ data, currentYear, currentMonth, embedded = false }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(null) // 'csv-month' | 'csv-all' | 'pdf-month' | 'pdf-all'
  const [statusFilter, setStatusFilter] = useState(null) // null = all statuses
  const dropdownRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open || embedded) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    // Delay to avoid immediate close from the toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, embedded])

  const handleExport = async (type, scope) => {
    setExporting(`${type}-${scope}`)

    // Small delay to show loading state
    await new Promise(r => setTimeout(r, 50))

    try {
      if (type === 'csv') {
        exportToCSV(data, scope, currentYear, currentMonth, statusFilter)
      } else {
        await exportToPDF(data, scope, currentYear, currentMonth, statusFilter)
      }
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    }

    setExporting(null)
    setOpen(false)
  }

  const isLoading = (type, scope) => exporting === `${type}-${scope}`

  const filterSummary = statusFilter
    ? STATUSES.find(s => s.id === statusFilter)?.label || statusFilter
    : null

  const options = [
    {
      id: 'csv-month',
      type: 'csv',
      scope: 'month',
      icon: FileSpreadsheet,
      label: 'Export Month as CSV',
      desc: filterSummary ? `Bulan ini · ${filterSummary}` : 'Current month only',
    },
    {
      id: 'csv-all',
      type: 'csv',
      scope: 'all',
      icon: FileSpreadsheet,
      label: 'Export All as CSV',
      desc: filterSummary ? `Semua data · ${filterSummary}` : 'Complete data',
    },
    {
      id: 'pdf-month',
      type: 'pdf',
      scope: 'month',
      icon: FileText,
      label: 'Export Month as PDF',
      desc: filterSummary ? `Bulan ini · ${filterSummary}` : 'Formatted report',
    },
    {
      id: 'pdf-all',
      type: 'pdf',
      scope: 'all',
      icon: FileText,
      label: 'Export All as PDF',
      desc: filterSummary ? `Semua data · ${filterSummary}` : 'Complete report',
    },
  ]

  const content = (
    <>
      {/* Status filter */}
      <div className="px-3 pt-3 pb-2 border-b border-border-light">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Filter status</p>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="flex items-center gap-1 text-[10px] font-medium text-text-muted hover:text-text
                         hover:bg-surface-hover px-1.5 py-0.5 rounded transition-colors"
            >
              <X className="w-2.5 h-2.5" /> Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all duration-150
                        ${!statusFilter
                          ? 'bg-surface-muted text-text border-border'
                          : 'text-text-muted hover:text-text hover:bg-surface-hover border-border/50'}`}
          >
            Semua
          </button>
          {STATUSES.map(s => {
            const active = statusFilter === s.id
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(active ? null : s.id)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all duration-150
                            ${active
                              ? `${s.softBg} ${s.softText} ${s.border}`
                              : 'text-text-muted hover:text-text hover:bg-surface-hover border-border/50'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-1.5 space-y-0.5">
        {options.map(opt => {
          const Icon = opt.icon
          const loading = isLoading(opt.type, opt.scope)

          return (
            <button
              key={opt.id}
              onClick={() => handleExport(opt.type, opt.scope)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                         hover:bg-surface-hover transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {/* Icon container */}
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30
                              flex items-center justify-center shrink-0
                              group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50
                              transition-colors duration-150">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium text-text">{opt.label}</div>
                <div className="text-[10px] text-text-muted">{opt.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border-light">
        <p className="text-[10px] text-text-muted text-center">
          {filterSummary
            ? `Hanya konten berstatus ${filterSummary} yang diekspor`
            : 'Data exported from your local storage'}
        </p>
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {content}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                   text-text-secondary hover:text-text hover:bg-surface-hover
                   rounded-lg transition-all duration-150"
        title={filterSummary ? `Ekspor (filter: ${filterSummary})` : 'Ekspor'}
      >
        {statusFilter && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-surface" />
        )}
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-surface border border-border
                        shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden z-50
                        modal-content origin-top-right"
        >
          {content}
        </div>
      )}
    </div>
  )
}
