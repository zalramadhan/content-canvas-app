import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  PenSquare, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, ArrowRight, ShieldCheck, Cloud
} from 'lucide-react'

// Where to send users after email confirm / password reset.
// Works both locally (localhost) and on GitHub Pages subpaths.
function redirectBase() {
  return window.location.origin + window.location.pathname
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setError('')
    setInfo('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Isi email dan password terlebih dahulu.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) setError(err.message)
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectBase() },
        })
        if (err) {
          setError(err.message)
        } else if (!data.session) {
          // Email confirmation may be enabled
          setInfo(
            'Pendaftaran berhasil! Cek email kamu untuk konfirmasi, lalu masuk kembali.'
          )
        }
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Masukkan email kamu dulu untuk reset password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectBase(),
      })
      if (err) {
        setError(err.message)
      } else {
        setInfo('Link reset password sudah dikirim. Cek email kamu.')
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600
                          flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
            <PenSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">ContentCanvas</h1>
          <p className="text-sm text-text-muted mt-1.5 text-center max-w-xs">
            Masuk untuk menyinkronkan data kamu di semua perangkat — HP, PC, atau tablet.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-border/60 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-text mb-1">
            {mode === 'login' ? 'Selamat datang kembali 👋' : 'Buat akun baru'}
          </h2>
          <p className="text-xs text-text-muted mb-6">
            {mode === 'login'
              ? 'Masuk dengan akun yang sama di semua perangkat agar data tetap sinkron.'
              : 'Cukup sekali daftar — lalu masuk di perangkat lain.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-medium text-text-muted mb-1.5 block">
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-muted/50
                              focus-within:border-orange-400 transition-colors">
                <Mail className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kamu@contoh.com"
                  autoComplete="email"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-text placeholder:text-text-muted"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-medium text-text-muted mb-1.5 block">
                Password
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-muted/50
                              focus-within:border-orange-400 transition-colors">
                <Lock className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-text placeholder:text-text-muted"
                />
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={loading}
                  className="mt-1.5 text-[11px] text-orange-500 hover:text-orange-600 font-medium transition-colors disabled:opacity-50"
                >
                  Lupa password?
                </button>
              )}
            </div>

            {/* Error / Info */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20
                              border border-red-100 dark:border-red-900/40">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20
                              border border-emerald-100 dark:border-emerald-900/40">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">{info}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                         text-white text-sm font-semibold
                         transition-all duration-150 active:scale-[0.98] shadow-sm shadow-orange-500/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {mode === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-xs text-text-muted text-center mt-6">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              onClick={switchMode}
              className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center gap-0.5 transition-colors"
            >
              {mode === 'login' ? 'Daftar' : 'Masuk'}
              <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>

        {/* Footer note */}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted mt-6">
          <Cloud className="w-3.5 h-3.5" />
          Data tersimpan aman di cloud &amp; dicadangkan otomatis di perangkat kamu.
        </p>
      </div>
    </div>
  )
}
