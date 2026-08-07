import { useState, useEffect } from 'react'
import { supabase, supabaseConfigError } from '../lib/supabase'
import {
  PenSquare, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, ArrowRight, ShieldCheck, Cloud, Clock
} from 'lucide-react'

// Where to send users after email confirm / password reset.
// Uses the current site (localhost OR Vercel) automatically.
function redirectBase() {
  return window.location.origin + window.location.pathname
}

// Terjemahkan pesan error Supabase yang umum menjadi pesan yang jelas
function friendlyAuthError(message) {
  if (!message) return 'Terjadi kesalahan. Coba lagi.'
  const m = message.toLowerCase()
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Email belum dikonfirmasi. Cek kotak masuk email kamu untuk link konfirmasi, atau gunakan akun baru jika email konfirmasi tidak diterima.'
  }
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'Email atau password salah. Periksa kembali, atau klik "Lupa password?" jika lupa.'
  }
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'Email sudah terdaftar. Silakan langsung Masuk, atau gunakan "Lupa password?" jika lupa password.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.'
  }
  return message
}

// ── Proteksi login: password minimal 8 karakter + rate-limit percobaan gagal ──
const MIN_PASSWORD_LENGTH = 8
const MAX_LOGIN_ATTEMPTS = 5
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000 // jendela 10 menit
const LOCK_DURATION_MS = 60 * 1000       // dikunci 1 menit

/** Pesan error validasi password, atau null jika valid. */
function passwordError(password) {
  if (!password) return 'Password wajib diisi.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }
  return null
}

/** Skor kekuatan password 0–4 berdasarkan panjang & variasi karakter. */
function passwordStrength(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return Math.min(4, score)
}

// ── Rate-limit login (disimpan per email di localStorage, bertahan saat reload) ──
const attemptsKey = (email) => `contentcanvas_login_${String(email || '').trim().toLowerCase()}`

function readAttempts(email) {
  try {
    const raw = localStorage.getItem(attemptsKey(email))
    if (!raw) return { count: 0, firstAttemptAt: 0, lockedUntil: 0 }
    const p = JSON.parse(raw)
    return {
      count: Number(p.count) || 0,
      firstAttemptAt: Number(p.firstAttemptAt) || 0,
      lockedUntil: Number(p.lockedUntil) || 0,
    }
  } catch {
    return { count: 0, firstAttemptAt: 0, lockedUntil: 0 }
  }
}

function saveAttempts(email, state) {
  try {
    localStorage.setItem(attemptsKey(email), JSON.stringify(state))
  } catch {
    /* penyimpanan penuh / private mode — abaikan */
  }
}

function clearAttempts(email) {
  try {
    localStorage.removeItem(attemptsKey(email))
  } catch {
    /* abaikan */
  }
}

/** Sisa detik kunci login untuk email ini (0 = tidak terkunci). */
function lockedRemainingFor(emailValue) {
  if (!emailValue) return 0
  const s = readAttempts(emailValue)
  if (!s.lockedUntil) return 0
  return Math.max(0, Math.ceil((s.lockedUntil - Date.now()) / 1000))
}

/**
 * Catat satu percobaan login gagal. Setelah MAX_LOGIN_ATTEMPTS dalam
 * jendela 10 menit, email dikunci selama LOCK_DURATION_MS.
 * Mengembalikan { locked, remaining } untuk pesan ke pengguna.
 */
function recordFailedAttempt(emailValue) {
  const now = Date.now()
  let s = readAttempts(emailValue)

  // Mulai jendela baru jika percobaan pertama sudah lama / kunci sudah lewat
  if (now - s.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    s = { count: 0, firstAttemptAt: now, lockedUntil: 0 }
  } else if (s.count === 0) {
    s.firstAttemptAt = now
  }

  s.count += 1
  if (s.count >= MAX_LOGIN_ATTEMPTS) {
    s.lockedUntil = now + LOCK_DURATION_MS
    s.count = 0
    s.firstAttemptAt = now
    saveAttempts(emailValue, s)
    return { locked: true, remaining: Math.ceil(LOCK_DURATION_MS / 1000) }
  }

  saveAttempts(emailValue, s)
  return { locked: false, remaining: MAX_LOGIN_ATTEMPTS - s.count }
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockRemaining, setLockRemaining] = useState(0)

  // Hitung mundur kunci login setiap detik
  useEffect(() => {
    if (lockRemaining <= 0) return
    const iv = setInterval(() => setLockRemaining(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(iv)
  }, [lockRemaining])

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setError('')
    setInfo('')
    setLockRemaining(0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailValue = email.trim().toLowerCase()
    if (!emailValue || !password) {
      setError('Isi email dan password terlebih dahulu.')
      return
    }

    // Validasi password: minimal 8 karakter (login & daftar)
    const pwdErr = passwordError(password)
    if (pwdErr) {
      setError(pwdErr)
      return
    }

    // Rate-limit: jangan izinkan percobaan saat email sedang dikunci
    if (mode === 'login') {
      const locked = lockedRemainingFor(emailValue)
      if (locked > 0) {
        setError('')
        setLockRemaining(locked)
        return
      }
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password,
        })
        if (err) {
          const res = recordFailedAttempt(emailValue)
          if (res.locked) {
            setError('')
            setLockRemaining(res.remaining)
          } else {
            setError(`${friendlyAuthError(err.message)} (Sisa percobaan: ${res.remaining})`)
          }
        } else {
          // Login sukses → reset penghitung untuk email ini
          clearAttempts(emailValue)
          setLockRemaining(0)
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: emailValue,
          password,
          options: { emailRedirectTo: redirectBase() },
        })
        if (err) {
          setError(friendlyAuthError(err.message))
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

  // Show a clear message instead of a broken form when env vars are missing
  if (supabaseConfigError) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-surface rounded-2xl border border-border/60 p-8 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/30
                          flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold text-text">Konfigurasi Belum Lengkap</h1>
          <p className="text-xs text-text-muted mt-3 leading-relaxed">{supabaseConfigError}</p>
        </div>
      </div>
    )
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
        setError(friendlyAuthError(err.message))
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
                  onChange={(e) => {
                    setEmail(e.target.value)
                    // Sinkronkan status kunci dengan email yang sedang diketik
                    if (mode === 'login') setLockRemaining(lockedRemainingFor(e.target.value))
                  }}
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
              {mode === 'register' && password && (
                <PasswordStrength password={password} />
              )}
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

            {/* Lock notice (rate-limit) */}
            {lockRemaining > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                              border border-amber-100 dark:border-amber-900/40">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Terlalu banyak percobaan gagal. Login dikunci sementara — coba lagi dalam{' '}
                  <span className="font-bold">{lockRemaining}</span> detik.
                </p>
              </div>
            )}

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
              disabled={loading || lockRemaining > 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                         text-white text-sm font-semibold
                         transition-all duration-150 active:scale-[0.98] shadow-sm shadow-orange-500/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : lockRemaining > 0 ? (
                <Clock className="w-4 h-4" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {lockRemaining > 0 ? `Tunggu ${lockRemaining}s` : mode === 'login' ? 'Masuk' : 'Daftar'}
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

/* ── Indikator kekuatan password (tampil live saat mendaftar) ── */
function PasswordStrength({ password }) {
  const strength = passwordStrength(password)
  const ok = password.length >= MIN_PASSWORD_LENGTH
  const meta = [
    { label: '', color: '#e9e9e9' },
    { label: 'Lemah', color: '#ef4444' },
    { label: 'Cukup', color: '#f59e0b' },
    { label: 'Bagus', color: '#84cc16' },
    { label: 'Kuat', color: '#10b981' },
  ][strength]

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(strength / 4) * 100}%`, backgroundColor: meta.color }}
          />
        </div>
        {strength > 0 && (
          <span className="text-[10px] text-text-muted font-medium w-12 text-right shrink-0">
            {meta.label}
          </span>
        )}
      </div>
      <p className={`text-[11px] flex items-center gap-1 ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'}`}>
        {ok
          ? <ShieldCheck className="w-3 h-3 shrink-0" />
          : <AlertCircle className="w-3 h-3 shrink-0" />}
        Minimal {MIN_PASSWORD_LENGTH} karakter
      </p>
    </div>
  )
}
