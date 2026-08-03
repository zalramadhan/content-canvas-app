import { useState } from 'react'
import { X, Sparkles, KeyRound, ExternalLink, Check } from 'lucide-react'
import { PROVIDERS, loadAIConfig, saveAIConfig, clearAIConfig } from '../utils/ai'

const SETUP_URLS = {
  gemini: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
}

export default function AISettingsModal({ onClose }) {
  const initial = loadAIConfig() || {}
  const [provider, setProvider] = useState(initial.provider || 'gemini')
  const [apiKey, setApiKey] = useState(initial.apiKey || '')
  const [model, setModel] = useState(initial.model || '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    saveAIConfig({ provider, apiKey: apiKey.trim(), model: model.trim() || undefined })
    setSaved(true)
    setTimeout(() => onClose(), 700)
  }

  const clear = () => {
    clearAIConfig()
    setApiKey('')
    setSaved(true)
    setTimeout(() => onClose(), 700)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden modal-content">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600
                            flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">AI Assistant Settings</h2>
              <p className="text-[10px] text-text-muted">Key disimpan aman di perangkat ini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted mb-1.5 block">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PROVIDERS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setModel('') }}
                  className={`p-3 rounded-xl border text-left transition-all
                              ${provider === p.id
                                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-400'
                                : 'border-border hover:border-violet-200 dark:hover:border-violet-700'}`}
                >
                  <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                    {p.label}
                    {provider === p.id && <Check className="w-3 h-3 text-violet-500" />}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Paste ${PROVIDERS[provider].label} API key…`}
              className="w-full text-xs bg-surface-muted border border-border rounded-lg px-3 py-2.5 text-text outline-none
                         focus:border-violet-400 transition-colors placeholder:text-text-muted"
            />
            <a
              href={SETUP_URLS[provider]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {provider === 'gemini'
                ? 'Ambil key gratis di Google AI Studio'
                : 'Ambil key di console.groq.com'}
            </a>
          </div>

          {/* Model */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted mb-1.5 block">Model</label>
            <select
              value={model || PROVIDERS[provider].defaultModel}
              onChange={(e) => setModel(e.target.value)}
              className="w-full text-xs bg-surface-muted border border-border rounded-lg px-3 py-2.5 text-text outline-none
                         focus:border-violet-400 transition-colors"
            >
              {PROVIDERS[provider].models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {saved && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Tersimpan!
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between gap-2">
          {loadAIConfig()?.apiKey && (
            <button
              onClick={clear}
              className="px-3 py-2 text-[11px] font-medium text-text-muted hover:text-red-500 hover:bg-red-50
                         dark:hover:bg-red-900/30 rounded-lg transition-all"
            >
              Clear key
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 text-[11px] font-medium text-text-secondary hover:text-text hover:bg-surface-hover rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!apiKey.trim()}
            className="px-4 py-2 text-[11px] font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500
                       hover:from-violet-600 hover:to-fuchsia-600 rounded-lg shadow-sm shadow-violet-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
