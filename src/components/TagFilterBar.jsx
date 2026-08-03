import { Tag, X, Settings2 } from 'lucide-react'
import { colorForTag } from '../utils/tags'

/**
 * Filter bar: "Semua" + one chip per tag (with count).
 * Props: tags ([{name,count}]), activeTag (string|null), onChange(tag|null), onManage()
 */
export default function TagFilterBar({ tags = [], activeTag, onChange, onManage }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-text-muted shrink-0">
        <Tag className="w-3 h-3" />
        Tag:
      </span>

      {onManage && (
        <button
          onClick={onManage}
          className="p-1 rounded-lg text-text-muted hover:text-fuchsia-600 hover:bg-fuchsia-50
                     dark:hover:bg-fuchsia-900/30 transition-all active:scale-95 shrink-0"
          title="Kelola tag (rename / hapus)"
          aria-label="Kelola tag"
        >
          <Settings2 className="w-3 h-3" />
        </button>
      )}

      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150
                    ${!activeTag
                      ? 'bg-surface-muted text-text border-border'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover border-border/50'}`}
      >
        Semua
      </button>

      {tags.map(t => {
        const active = activeTag === t.name
        const c = colorForTag(t.name)
        return (
          <button
            key={t.name}
            onClick={() => onChange(active ? null : t.name)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border
                        transition-all duration-150 active:scale-95
                        ${active ? 'shadow-sm' : 'hover:bg-surface-hover'}`}
            style={
              active
                ? { backgroundColor: c.bg, color: c.text, borderColor: c.border, boxShadow: `0 0 0 2px ${c.border}55` }
                : undefined
            }
            title={active ? 'Klik untuk hapus filter' : `Filter: ${t.name}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.text }} />
            {t.name}
            <span className="opacity-70">{t.count}</span>
            {active && <X className="w-2.5 h-2.5" />}
          </button>
        )
      })}
    </div>
  )
}
