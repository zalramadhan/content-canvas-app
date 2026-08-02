-- ═══════════════════════════════════════════════════════════════
--  ContentCanvas — Supabase Schema
--  Jalankan script ini SEKALI di: Supabase Dashboard → SQL Editor
--  (Project kamu → SQL Editor → New query → paste → Run)
-- ═══════════════════════════════════════════════════════════════

-- ── 1) Tabel entri: satu baris per user per tanggal ──
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date text not null,                          -- 'yyyy-MM-dd'
  data jsonb not null default '[]'::jsonb,     -- daftar entri hari itu
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ── 2) Keamanan baris (RLS): user hanya bisa akses datanya sendiri ──
alter table public.entries enable row level security;

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

-- ── 3) Aktifkan Realtime (agar perubahan langsung muncul antar perangkat) ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;
