import { useState } from 'react'
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import { useSmoothExpand } from '../utils/collapse'

const FIELDS = [
  { key: 'views', label: 'Views', icon: '👀' },
  { key: 'likes', label: 'Likes', icon: '👍' },
  { key: 'comments', label: 'Comments', icon: '💬' },
  { key: 'shares', label: 'Shares', icon: '🔁' },
]

/** Entry metrics editor: views / likes / comments / shares. */
export default function MetricsSection({ entry, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const visible = useSmoothExpand(expanded)
  const metrics = entry.metrics || {}
  const hasData = Object.values(metrics).some(v => Number(v) > 0)

  const setMetric = (key, raw) => {
    const num = parseInt(raw, 10)
    onUpdate('metrics', { ...metrics, [key]: isNaN(num) || num < 0 ? 0 : num })
  }

  return (
    <div className="mt-3 first:mt-0 border border-border/70 rounded-lg px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between hover:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-text">📊 Metrics</span>
          {hasData && (
            <span className="text-[10px] text-text-muted bg-white/60 dark:bg-surface-hover/60 px-1.5 py-0.5 rounded-full truncate max-w-[160px]">
              👀 {metrics.views || 0} · 👍 {metrics.likes || 0}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />}
      </button>

      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: expanded ? '3000px' : '0', opacity: expanded ? 1 : 0 }}>
        {visible && (
          <div className="pt-2 -mx-1 px-1 slide-down">
            <p className="text-[10px] text-text-muted mb-2">
              Catat performa konten setelah di-post — muncul di Dashboard.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-medium text-text-muted mb-1 flex items-center gap-1">
                    <span>{f.icon}</span> {f.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={metrics[f.key] || ''}
                    onChange={(e) => setMetric(f.key, e.target.value)}
                    placeholder="0"
                    className="w-full text-sm bg-surface border border-border rounded-lg px-2.5 py-1.5
                               text-text outline-none focus:border-emerald-400 transition-colors
                               placeholder:text-text-muted"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
