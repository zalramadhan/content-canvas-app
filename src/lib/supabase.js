import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Non-null when required Supabase credentials are missing.
 * Lets the UI show a clear, helpful message instead of crashing with a blank page.
 */
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Konfigurasi Supabase belum lengkap. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah di-set di Vercel (Settings → Environment Variables) lalu klik Redeploy.'
    : null

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
