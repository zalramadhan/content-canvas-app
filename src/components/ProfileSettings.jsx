import { useState } from 'react'
import { X, Check, Loader2, User, Mail, ShieldCheck, AlertCircle, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AVATAR_EMOJIS = ['👤', '🎯', '🚀', '🌟', '🔥', '💪', '🎨', '📸', '✍️', '💡', '🎬', '📱', '🧠', '😎', '🤖', '🌈']

const AVATAR_COLORS = [
  '#f97316', '#ef4444', '#8b5cf6', '#3b82f6',
  '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#64748b',
]

const LANGUAGES = [
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
]

export default function ProfileSettings({ user, onClose }) {
  const meta = user?.user_metadata || {}

  const [name, setName] = useState(meta.displayName || '')
  const [emoji, setEmoji] = useState(meta.avatarEmoji || '👤')
  const [color, setColor] = useState(meta.avatarColor || '#f97316')
  const [language, setLanguage] = useState(meta.language || 'id')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: {
          displayName: name.trim(),
          avatarEmoji: emoji,
          avatarColor: color,
          language,
        },
      })
      if (err) {
        setError(err.message)
      } else {
        setSaved(true)
        setTimeout(onClose, 900)
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md bg-surface rounded-2xl border border-border/60 shadow-xl p-6
                   max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-text">Pengaturan Profil</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all duration-200"
            style={{ backgroundColor: color, boxShadow: `0 8px 24px -6px ${color}66` }}
          >
            <span className="drop-shadow">{emoji}</span>
          </div>
          <p className="text-sm font-semibold text-text mt-3 truncate max-w-full">
            {name.trim() || (user?.email ? user.email.split('@')[0] : 'Pengguna')}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-text-muted mt-1">
            <Mail className="w-3 h-3" />
            {user?.email}
          </p>
        </div>

        {/* Nama tampilan */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-text-muted mb-1.5 block">
            Nama tampilan
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-muted/50
                          focus-within:border-orange-400 transition-colors">
            <User className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user?.email ? `cth: ${user.email.split('@')[0]}` : 'Nama kamu'}
              maxLength={40}
              className="flex-1 bg-transparent border-none outline-none text-sm text-text placeholder:text-text-muted"
            />
          </div>
          <p className="text-[10px] text-text-muted mt-1.5">
            Kosongkan untuk memakai nama dari email kamu.
          </p>
        </div>

        {/* Ikon avatar */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Ikon avatar</label>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATAR_EMOJIS.map(e => (
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

        {/* Warna avatar */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Warna avatar</label>
          <div className="flex items-center gap-2 flex-wrap">
            {AVATAR_COLORS.map(c => (
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

        {/* Bahasa */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-text-muted mb-1.5 block">Bahasa</label>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border/50">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors
                            ${language === lang.code
                              ? 'bg-surface text-text shadow-sm'
                              : 'text-text-muted hover:text-text'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Preferensi bahasa tersimpan di profil — siap digunakan fitur lain.
          </p>
        </div>

        {/* Status */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20
                          border border-red-100 dark:border-red-900/40 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
          </div>
        )}
        {saved && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20
                          border border-emerald-100 dark:border-emerald-900/40 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
              Profil tersimpan! Tersinkron di semua perangkat.
            </p>
          </div>
        )}

        {/* Aksi */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-muted text-text-muted hover:text-text text-sm font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                       disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-orange-500/20
                       transition-all duration-150 active:scale-[0.98]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Menyimpan…' : saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
