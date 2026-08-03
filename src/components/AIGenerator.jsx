import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp, RefreshCw, Wand2, AlertCircle } from 'lucide-react'
import { loadAIConfig, generateHooks, generateCaptions, generateHashtags } from '../utils/ai'
import { useSmoothExpand } from '../utils/collapse'

const TASKS = {
  hooks: {
    label: 'Hooks',
    icon: '💬',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    run: generateHooks,
    hint: 'Pertanyaan / kalimat pembuka yang bikin berhenti scroll.',
  },
  caption: {
    label: 'Caption',
    icon: '💬',
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    run: generateCaptions,
    hint: 'Caption siap pakai dengan emoji + CTA.',
  },
  hashtags: {
    label: 'Hashtags',
    icon: '#',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    run: generateHashtags,
    hint: 'Campuran hashtag populer & niche.',
  },
}

function readStrategy(strategyStr) {
  try {
    const p = JSON.parse(strategyStr || '{}')
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

function writeStrategy(strategy, onChange) {
  const has =
    strategy.keyMessage || strategy.hooks?.length || strategy.storytelling?.length || strategy.cta || strategy.hashtags?.length
  onChange('strategy', has ? JSON.stringify(strategy) : '')
}

/**
 * Compact generate button used inline (e.g. caption row).
 * Props: type, entry, onResult(texts[]), onOpenSettings, iconOnly, label
 */
export function AIGenerateButton({ type, entry, onResult, onOpenSettings, iconOnly, label }) {
  const [state, setState] = useState({ loading: false, results: [], error: '' })

  const run = async () => {
    const cfg = loadAIConfig()
    if (!cfg?.apiKey) {
      onOpenSettings?.()
      return
    }
    setState({ loading: true, results: [], error: '' })
    try {
      const results = await TASKS[type].run(cfg, entry)
      setState({ loading: false, results })
    } catch (e) {
      setState({ loading: false, results: [], error: e.message || 'Gagal generate.' })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={run}
        disabled={state.loading}
        title={label}
        className={`inline-flex items-center gap-1 rounded-lg font-medium transition-all active:scale-95
                    ${iconOnly ? 'p-1' : 'px-2 py-1 text-[11px]'}
                    text-violet-600 dark:text-violet-400
                    ${state.loading ? 'opacity-60 cursor-wait' : 'hover:bg-violet-50 dark:hover:bg-violet-900/30'}`}
      >
        {state.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {!iconOnly && <span>{label}</span>}
      </button>

      {state.results.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-surface border border-border
                        shadow-xl z-40 p-2 space-y-1 modal-content">
          {state.results.map((r, i) => (
            <button
              key={i}
              onClick={() => { onResult([r]); setState({ loading: false, results: [], error: '' }) }}
              className="w-full text-left text-[11px] text-text px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors border border-border/40"
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {state.error && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-surface border border-red-200 dark:border-red-800
                        shadow-xl z-40 p-2 modal-content">
          <p className="text-[11px] text-red-500 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" /> {state.error}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Full AI Assistant section for the entry editor.
 * Props: entry, onUpdate(field, value), onOpenSettings
 */
export default function AIGenerator({ entry, onUpdate, onOpenSettings }) {
  const [expanded, setExpanded] = useState(false)
  const visible = useSmoothExpand(expanded)
  const [states, setStates] = useState({ hooks: {}, caption: {}, hashtags: {} })
  const hasResults = Object.values(states).some((s) => s.results?.length)

  const runTask = async (type) => {
    const cfg = loadAIConfig()
    if (!cfg?.apiKey) {
      onOpenSettings?.()
      return
    }
    setStates((prev) => ({ ...prev, [type]: { loading: true, results: [], error: '' } }))
    try {
      const results = await TASKS[type].run(cfg, entry)
      setStates((prev) => ({ ...prev, [type]: { loading: false, results } }))
    } catch (e) {
      setStates((prev) => ({ ...prev, [type]: { loading: false, error: e.message || 'Gagal generate.' } }))
    }
  }

  const insertHooks = (results) => {
    const s = readStrategy(entry.strategy)
    const existing = new Set(s.hooks || [])
    s.hooks = [...(s.hooks || []), ...results.filter((h) => !existing.has(h))]
    writeStrategy(s, onUpdate)
  }

  const insertHashtags = (results) => {
    const s = readStrategy(entry.strategy)
    const existing = new Set(s.hashtags || [])
    s.hashtags = [...(s.hashtags || []), ...results.filter((h) => !existing.has(h))].slice(0, 30)
    writeStrategy(s, onUpdate)
  }

  const insertCaption = (results) => {
    onUpdate('caption', results[0] || '')
  }

  const inserters = { hooks: insertHooks, caption: insertCaption, hashtags: insertHashtags }

  return (
    <div className="mt-3 first:mt-0 border border-border/70 rounded-lg px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between hover:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Wand2 className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="text-xs font-semibold text-text">✨ AI Assistant</span>
          {hasResults && <span className="text-[10px] text-violet-500 font-medium">✓</span>}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />}
      </button>

      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: expanded ? '3000px' : '0', opacity: expanded ? 1 : 0 }}>
        {visible && (
          <div className="pt-2 -mx-1 px-1 space-y-2 slide-down">
            {!loadAIConfig()?.apiKey && (
              <button
                onClick={onOpenSettings}
                className="w-full text-left px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20
                           border border-dashed border-violet-300 dark:border-violet-700
                           text-[11px] text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                ⚙️ Belum ada API key — klik untuk mengatur AI (gratis, Google Gemini)
              </button>
            )}

            {Object.entries(TASKS).map(([type, task]) => {
              const st = states[type]
              return (
                <div key={type} className="rounded-lg border border-border/60 bg-surface-muted/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-text flex items-center gap-1">
                        <span>{task.icon}</span> Generate {task.label}
                      </p>
                      <p className="text-[9px] text-text-muted truncate">{task.hint}</p>
                    </div>
                    <button
                      onClick={() => runTask(type)}
                      disabled={st?.loading}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg
                                  text-white bg-gradient-to-r from-violet-500 to-fuchsia-500
                                  hover:from-violet-600 hover:to-fuchsia-600
                                  shadow-sm shadow-violet-500/20
                                  disabled:opacity-60 disabled:cursor-wait transition-all active:scale-95`}
                    >
                      {st?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {st?.loading ? 'Generating…' : 'Generate'}
                    </button>
                  </div>

                  {st?.error && (
                    <p className="mt-1.5 text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {st.error}
                    </p>
                  )}

                  {st?.results?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {st.results.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => inserters[type](type === 'caption' ? [r] : st.results)}
                          className="w-full text-left text-[11px] text-text bg-surface border border-border/50
                                     rounded-lg px-2 py-1.5 hover:border-violet-300 dark:hover:border-violet-700
                                     hover:bg-violet-50/40 dark:hover:bg-violet-900/20 transition-colors"
                          title="Klik untuk memasukkan"
                        >
                          {type === 'caption' && r.length > 140 ? r.slice(0, 140) + '…' : r}
                        </button>
                      ))}
                      <button
                        onClick={() => runTask(type)}
                        className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-text-muted hover:text-violet-600 transition-colors"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
