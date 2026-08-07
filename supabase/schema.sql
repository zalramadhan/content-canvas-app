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

-- ═══════════════════════════════════════════════════════════════
--  HABIT TRACKER
--  (jalankan bagian ini SEKALI juga — aman di-run ulang)
--  Tabel habits: SATU baris per user; kolom `data` (JSON) berisi
--  daftar habit + check-in hariannya.
-- ═══════════════════════════════════════════════════════════════

-- ── 4) Tabel habits ──
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  data jsonb not null default '{"habits":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ── 5) Keamanan baris (RLS): user hanya bisa akses habitnya sendiri ──
alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- ── 6) Aktifkan Realtime untuk tabel habits ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'habits'
  ) then
    alter publication supabase_realtime add table public.habits;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  FINANCIAL TRACKER
--  (jalankan bagian ini SEKALI juga — aman di-run ulang)
--  Tabel finance: SATU baris per user; kolom `data` (JSON) berisi
--  daftar dompet, transaksi, dan budget.
-- ═══════════════════════════════════════════════════════════════

-- ── 7) Tabel finance ──
create table if not exists public.finance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  data jsonb not null default '{"wallets":[],"transactions":[],"budgets":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ── 8) Keamanan baris (RLS): user hanya bisa akses datanya sendiri ──
alter table public.finance enable row level security;

drop policy if exists "finance_select_own" on public.finance;
create policy "finance_select_own" on public.finance
  for select using (auth.uid() = user_id);

drop policy if exists "finance_insert_own" on public.finance;
create policy "finance_insert_own" on public.finance
  for insert with check (auth.uid() = user_id);

drop policy if exists "finance_update_own" on public.finance;
create policy "finance_update_own" on public.finance
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finance_delete_own" on public.finance;
create policy "finance_delete_own" on public.finance
  for delete using (auth.uid() = user_id);

-- ── 9) Aktifkan Realtime untuk tabel finance ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'finance'
  ) then
    alter publication supabase_realtime add table public.finance;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  NOTES & TODO TRACKER
--  (jalankan bagian ini SEKALI juga — aman di-run ulang)
--  Tabel notes: SATU baris per user; kolom `data` (JSON) berisi
--  daftar catatan (notes) dan daftar tugas (todos).
-- ═══════════════════════════════════════════════════════════════

-- ── 10) Tabel notes ──
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  data jsonb not null default '{"notes":[],"todos":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ── 11) Keamanan baris (RLS): user hanya bisa akses catatannya sendiri ──
alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- ── 12) Aktifkan Realtime untuk tabel notes ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
