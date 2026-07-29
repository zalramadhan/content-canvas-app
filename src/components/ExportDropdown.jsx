import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'
import { exportToCSV, exportToPDF } from '../utils/exportData'

export default function ExportDropdown({ data, currentYear, currentMonth }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(null) // 'csv-month' | 'csv-all' | 'pdf-month' | 'pdf-all'
  const dropdownRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
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
  }, [open])

  const handleExport = async (type, scope) => {
    setExporting(`${type}-${scope}`)

    // Small delay to show loading state
    await new Promise(r => setTimeout(r, 50))

    try {
      if (type === 'csv') {
        exportToCSV(data, scope, currentYear, currentMonth)
      } else {
        await exportToPDF(data, scope, currentYear, currentMonth)
      }
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    }

    setExporting(null)
    setOpen(false)
  }

  const isLoading = (type, scope) => exporting === `${type}-${scope}`

  const options = [
    {
      id: 'csv-month',
      type: 'csv',
      scope: 'month',
      icon: FileSpreadsheet,
      label: 'Export Month as CSV',
      desc: 'Current month only',
    },
    {
      id: 'csv-all',
      type: 'csv',
      scope: 'all',
      icon: FileSpreadsheet,
      label: 'Export All as CSV',
      desc: 'Complete data',
    },
    {
      id: 'pdf-month',
      type: 'pdf',
      scope: 'month',
      icon: FileText,
      label: 'Export Month as PDF',
      desc: 'Formatted report',
    },
    {
      id: 'pdf-all',
      type: 'pdf',
      scope: 'all',
      icon: FileText,
      label: 'Export All as PDF',
      desc: 'Complete report',
    },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                   text-text-secondary hover:text-text hover:bg-surface-hover
                   rounded-lg transition-all duration-150"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-surface border border-border
                        shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden z-50
                        modal-content origin-top-right"
        >
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
              Data exported from your local storage
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
