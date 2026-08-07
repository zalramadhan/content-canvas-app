# 🎨 ContentCanvas — Social Media Content Planner

Aplikasi **perencana konten sosial media** berbasis web (PWA) yang bisa dipakai di HP, PC, dan tablet. Rencanakan konten harianmu di kalender, lengkapi dengan strategi konten, skrip video, referensi visual, hingga ekspor laporan — **semua data tersinkron otomatis antar perangkat**.

> 🌟 **Fitur utama:** Data tersimpan di cloud (Supabase), jadi data yang kamu input di HP akan langsung muncul di PC dan sebaliknya.

---

## ✨ Fitur-Fitur

### 🗓️ Kalender Konten
- Tampilan kalender bulanan dengan navigasi antar bulan + tombol **Today**
- Badge jumlah konten per hari + preview mini (thumbnail YouTube, badge platform, cuplikan catatan)
- Highlight hari ini (oranye) dan indikator hari yang punya konten
- **Drag & drop** konten antar tanggal — seret preview/kartu ke hari lain untuk memindahkan (hari tujuan otomatis terbuka)

### 📝 Editor Perencanaan Harian
Klik hari mana pun untuk membuka panel perencanaan lengkap:
- **✏️ Edit Idea** — ubah judul (headline), link referensi, dan tipe konten (Reel/Carousel) dari konten yang sudah ada via ikon pensil di kartu

| Bagian | Fungsi |
|---|---|
| **Link Konten** | Tempel URL video/referensi — YouTube, TikTok, Instagram, Pinterest, atau gambar langsung — otomatis dideteksi & ditampilkan preview |
| **Catatan & Ide** | Concept, hook, notes, scripting, shooting, editing |
| **Image References** | Kumpulan gambar referensi per konten (termasuk preview Pinterest) |
| **🎯 Content Strategy** | Key message, daftar **hooks**, **storytelling beats**, Call-to-Action, dan hashtag |
| **📷 Carousel Canvas** | Rancang slide carousel: skrip + panduan desain (palet warna, tipografi, layout) per slide |
| **🎬 Scene Cards** | Skrip per scene, durasi, camera angle, shot type, lokasi, editing, checklist, drag-&-drop reorder, dan **simpan sebagai template** |

### 🚦 Production Pipeline (Kanban)
- Status konten: **Idea → Planning → Scripting → Recording → Editing → Ready → Posted**
- Tampilan **Kanban** di navbar — seret kartu antar kolom untuk mengubah status
- **Mark as posted** langsung dari badge status (+ link postingan asli & tanggal)
- **Mode pilih (bulk)**: centang banyak kartu → ubah status, tambah tag, atau hapus sekaligus
- **✏️ Edit idea langsung di kartu** — ikon pensil untuk ubah judul/link/tipe tanpa keluar dari kanban
- Badge status berwarna di kalender & editor harian, indikator *overdue* di kanban

### 📊 Dashboard & Insights
- Statistik: total konten, sudah diposting, siap upload, dalam proses, **streak posting** & total views
- Tren 6 bulan, distribusi hari paling produktif, breakdown platform & tipe konten
- **Performa konten**: ringkasan views/likes/comments/shares, top 5 konten, tren views 6 bulan
- Pipeline produksi, progress checklist scene, dan jadwal 7 hari ke depan

### 🔍 Search Global
- Cari semua konten (headline, hook, skrip, caption, hashtag, konsep) — `Ctrl+K` atau lewat menu hamburger
- Klik hasil → langsung buka tanggal & kartu terkait

### ✨ AI Assistant
- Generate **hooks**, **caption**, dan **hashtag** langsung di editor
- Provider: **Google Gemini** (gratis) atau **Groq** — API key disimpan lokal di perangkat
- Pengaturan di ikon ✨ di navbar → ambil key di AI Studio / console.groq.com

### 💬 Caption & Hashtag Library
- Simpan caption favorit (ikon bookmark) & sisipkan dari library kapan saja
- Simpan **set hashtag** ke library & sisipkan sekali klik (di seksi Hashtags)
- **📊 Metrics**: catat views/likes/comments/shares per konten — muncul di Dashboard
- Copy konten ke tanggal lain (ikon salin di kartu konten)

### 🏷️ Tags / Kategori
- Beri **tag/kategori** ke tiap konten (misal: #kampanye, #series, #reels, #tutorial) langsung di kartu konten — dengan saran tag yang sudah dipakai
- **Filter tag** di kalender & kanban: klik chip tag untuk menampilkan hanya konten bertag itu (dengan hitungan & warna otomatis per tag)
- **Kelola tag** (ikon ⚙️ di bar filter): **rename** tag di semua konten sekaligus (otomatis gabung jika nama sudah ada) atau **hapus** tag dari semua konten — dengan konfirmasi & bisa di-undo
- Tag ikut tersinkron antar perangkat & bisa dicari lewat search global

### ↩️ Undo / Redo & Notifikasi
- **Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y** untuk undo-redo semua edit — tombol Undo/Redo di navbar (semua ukuran layar)
- Lonceng 🔔 di navbar: daftar konten 7 hari ke depan + aktifkan **notifikasi browser** saat konten jatuh tempo hari ini

### 📤 Ekspor Laporan
- **CSV** — cocok untuk Excel/Google Sheets (dengan BOM Unicode agar huruf/emoji aman)
- **PDF** — laporan rapi berwarna (jsPDF + autotable), bisa dipilih **semua data** atau **per bulan**
- **Filter status** — ekspor hanya konten dengan status tertentu (misal hanya **Posted**); nama file & header laporan ikut menyebutkan filternya
- Akses lewat **menu hamburger** (☰ di pojok kanan atas) — header kini bersih & fokus

### ✅ Habit Tracker
- Menu baru **Habits** di navigasi (☰) untuk melacak kebiasaan harian pribadi
- **Check-in harian**: grid 7 atau 14 hari terakhir — cukup tap kotak untuk menandai selesai
- **🔥 Streak counter** — jumlah hari beruntun per habit (otomatis, berhenti jika bolos)
- **🎯 Target mingguan** — set target 1–7× per minggu, tampil sebagai progress bar
- **📊 Statistik bulanan** — persentase konsistensi & jumlah hari tercapai di bulan berjalan
- Tambah/edit/hapus habit dengan **ikon emoji & warna** pilihan, tersinkron antar perangkat

### ☁️ Sinkronisasi Cloud (Supabase)
- Login dengan **email & password** — cukup daftar sekali, lalu masuk di perangkat lain
- Data **otomatis tersinkron realtime** antar perangkat (perubahan langsung muncul, tanpa refresh)
- **Merge cerdas saat pertama kali masuk**: data lama di perangkat tidak hilang — digabung dengan data cloud berdasarkan ID konten & waktu edit
- Tetap bisa **offline** (data disimpan juga di localStorage perangkat)
- **Keamanan login**: password minimal **8 karakter** (dengan indikator kekuatan saat daftar) + **rate-limit** — setelah 5 percobaan gagal dalam 10 menit, login dikunci sementara 60 detik dengan hitung mundur

### 💰 Financial Tracker
- Menu baru **Finance** di navigasi (☰) untuk mengelola keuangan pribadi (mata uang Rupiah)
- **👛 Dompet** — buat beberapa dompet (Tunai, Bank, E-Wallet) dengan ikon & warna; saldo dihitung otomatis dari transaksi
- **💸 Pencatatan transaksi** — pemasukan & pengeluaran dengan jumlah, kategori (preset), dompet, tanggal, dan catatan; bisa **diedit** (klik ikon pensil)
- **🔄 Transfer antar dompet** — pindahkan uang antar dompet (tombol Transfer); tidak dihitung sebagai pemasukan/pengeluaran, tapi saldo kedua dompet ikut berubah
- **🎯 Budget bulanan** — batas pengeluaran per kategori per bulan, progress bar + peringatan merah jika melebihi
- **📊 Ringkasan & grafik** — total pemasukan/pengeluaran/saldo bulan ini, grafik pengeluaran per kategori (bar)
- **🗂 Riwayat transaksi** — daftar transaksi per bulan, bisa difilter kategori/dompet, hapus dengan konfirmasi

### 👤 Pengaturan Profil
- **Nama tampilan**, **avatar emoji + warna**, dan **preferensi bahasa** — dibuka dari menu hamburger (☰) → kartu profil di bagian bawah
- Preview avatar live sebelum disimpan, disimpan ke **Supabase Auth (user_metadata)** → otomatis sinkron ke semua perangkat **tanpa perlu tabel SQL baru**
- Avatar & nama tampil di menu hamburger dan mengikuti akun di mana pun kamu login

### 🌗 Lainnya
- **Menu hamburger** (☰) berisi: navigasi (Calendar/Kanban/Dashboard/**Habits**/**Finance**), search, ekspor, **dark/light mode**, dan logout — tersedia di semua ukuran layar; navigasi kini hanya lewat hamburger (header tetap bersih)
- Notifikasi, Undo/Redo, dan AI Assistant selalu terlihat di navbar
- Dark mode (otomatis ikut sistem + bisa diubah manual dari menu hamburger)
- PWA — bisa **di-install** ke layar beranda HP seperti aplikasi native
- Cache thumbnail YouTube untuk loading cepat

---

## 🧰 Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Library | date-fns, lucide-react, jspdf + jspdf-autotable |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| PWA | vite-plugin-pwa (service worker + manifest) |
| Linter | Oxlint |

---

## 🚀 Menjalankan di Lokal (Development)

### 1. Prasyarat
- **Node.js** versi 20.19+ atau 22.12+ (disarankan 22)
- Akun [Supabase](https://supabase.com) gratis

### 2. Install dependencies

```bash
npm install
```

### 3. Siapkan kredensial Supabase

Buat file `.env` di root project (contoh ada di `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> Cara mengambilnya: **Supabase Dashboard → Project Settings → API** — salin *Project URL* dan *anon public* key.
> ⚠️ Jangan pernah memasukkan *service_role* key ke aplikasi!

### 4. Buat tabel database (sekali saja)

Buka **Supabase Dashboard → SQL Editor → New query**, paste isi file [`supabase/schema.sql`](supabase/schema.sql), lalu klik **Run**.

Script tersebut membuat tabel `entries` (konten kalender), `habits` (habit tracker), **dan** `finance` (financial tracker), aturan keamanan baris (RLS — tiap user hanya bisa akses datanya sendiri), serta mengaktifkan realtime.

> 💡 **Sudah pernah menjalankan schema.sql sebelumnya?** Tidak perlu run ulang dari nol — cukup buka bagian yang belum pernah dijalankan (**HABIT TRACKER** untuk tabel `habits`, atau **FINANCIAL TRACKER** untuk tabel `finance`) di file yang sama dan Run bagian itu saja.

> 💡 **Tips:** Disarankan mematikan *Confirm email* di **Authentication → Providers → Email**, agar pendaftaran langsung masuk tanpa perlu verifikasi email.

### 5. Jalankan

```bash
npm run dev
```

Buka `http://localhost:5173`, daftar akun, dan mulai merencanakan konten! 🎉

---

## 📦 Script yang Tersedia

| Command | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development (hot reload) |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Pratinjau hasil build secara lokal |
| `npm run lint` | Menjalankan linter (Oxlint) |

---

## ☁️ Cara Kerja Sinkronisasi Data

```
┌─────────────┐         ┌────────────────────────┐         ┌─────────────┐
│  Perangkat A │◄──────►│  Supabase Cloud        │◄──────►│  Perangkat B │
│  (HP)        │ realtime │  • tabel entries       │ realtime │  (PC)        │
│              │ & upsert  │  • tabel habits        │          │              │
└─────────────┘         └────────────────────────┘         └─────────────┘
```

1. **Masuk** → aplikasi menarik data dari cloud dan **menggabungkan** dengan data lokal perangkat
2. **Edit konten/habit** → perubahan disimpan ke perangkat (instan) lalu dikirim ke cloud
3. **Perangkat lain online** → menerima perubahan lewat *realtime subscription* tanpa perlu refresh

**Struktur data konten:** satu baris per (user, tanggal) → kolom `data` (JSON) berisi daftar konten hari itu. Penggabungan konflik dilakukan per-konten berdasarkan ID + waktu edit terakhir.

**Struktur data habits:** satu baris per user → kolom `data` (JSON) berisi daftar habit + check-in harian. Check-in digabung (union) antar perangkat agar tidak ada yang hilang.

---

## 🚢 Deployment ke Vercel

Cara paling mudah: **import repository GitHub ke Vercel** — setiap push ke `main` otomatis build & deploy (tanpa perlu subpath seperti GitHub Pages).

### Langkah pertama kali (sekali saja):

1. **Buka [vercel.com/new](https://vercel.com/new)** → pilih repo GitHub `content-canvas-app` → **Import**
2. Vercel otomatis mendeteksi Vite (build command: `npm run build`, output: `dist`)
3. **Set Environment Variables** di halaman konfigurasi (atau nanti di **Project → Settings → Environment Variables**):

   | Nama | Nilai |
   |---|---|
   | `VITE_SUPABASE_URL` | URL project Supabase kamu |
   | `VITE_SUPABASE_ANON_KEY` | anon public key Supabase |

   > ⚠️ Set variabelnya untuk *Production* (dan *Preview* bila perlu), lalu **Redeploy**.
4. Klik **Deploy** — selesai! URL aplikasi: `https://<project>.vercel.app`

> 💡 Setelah ini, setiap `git push` ke `main` akan otomatis membangun & menerbitkan versi terbaru di Vercel.

### Login & sinkronisasi di Vercel

Login bekerja sama persis seperti di lokal:

- Buka URL Vercel → **Daftar** (email + password) atau **Masuk** dengan akun yang sama
- Data otomatis tersinkron karena semua perangkat (lokal, HP, Vercel) terhubung ke **project Supabase yang sama**
- Untuk *password reset*: pastikan URL Vercel kamu ditambahkan di **Supabase → Authentication → URL Configuration → Redirect URLs**

### ⚠️ Wajib: Set Site URL & Redirect URLs (sekali saja)

**Gejala kalau belum diset:** email konfirmasi / reset password mengarah ke `http://localhost:3000` (default Supabase) padahal kamu daftar di Vercel.

1. Buka **Supabase Dashboard → Authentication → URL Configuration**
2. **Site URL** → isi: `https://content-canvas-app.vercel.app`
3. **Redirect URLs** → tambahkan:
   - `https://content-canvas-app.vercel.app`
   - `http://localhost:5173` (untuk development lokal)
4. Klik **Save** — lalu coba daftar/konfirmasi lagi.

> 💡 Setelah ini, link email konfirmasi akan membawa pengguna kembali ke situs yang benar (Vercel saat daftar di Vercel, localhost saat develop lokal).

---

## 📁 Struktur Project

```
├── .github/workflows/deploy.yml   # Auto-deploy GitHub Pages
├── public/                        # favicon & ikon PWA
├── supabase/schema.sql            # Skema database Supabase
├── src/
│   ├── components/                # UI: Calendar, DaySidebar, AddVideoForm,
│   │                              #      AuthScreen, VideoEmbed, ImagePreview, dll.
│   ├── hooks/                     # useLocalStorage (data konten + sinkronisasi),
│   │                              # useHabits (data habit + sinkronisasi),
│   │                              # useTheme (dark mode)
│   ├── lib/                       # supabase.js (client) & sync.js (sinkronisasi
│   │                              # konten + habits)
│   ├── utils/                     # videoParser.js (deteksi platform URL),
│   │                              # exportData.js (CSV/PDF)
│   ├── App.jsx                    # Kerangka aplikasi & navigasi
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Tema Tailwind (palet warna, animasi)
├── .env.example                   # Contoh kredensial (salin ke .env)
├── index.html
├── vite.config.js
└── package.json
```

---

## 🛠️ Pemecahan Masalah

| Masalah | Solusi |
|---|---|
| Status **"Offline"** di header | 1) Pastikan tabel sudah dibuat (jalankan `supabase/schema.sql`). 2) Cek koneksi internet. 3) Klik **"Coba lagi"** di banner kuning |
| Data tidak muncul di perangkat lain | Pastikan **login dengan akun email yang sama** di semua perangkat |
| Gagal daftar / harus konfirmasi email | Matikan *Confirm email* di Supabase → **Authentication → Providers → Email** |
| Email konfirmasi mengarah ke `localhost:3000` | Set **Site URL** & **Redirect URLs** di Supabase → **Authentication → URL Configuration** (lihat bagian Deployment) |
| Login gagal padahal akun sudah didaftar di perangkat lain | Akun kemungkinan **belum dikonfirmasi** (lihat baris di atas), atau cek email/password sudah benar |
| Login terkunci "Terlalu banyak percobaan" | Ini **rate-limit**: tunggu hitung mundur 60 detik selesai (otomatis), atau periksa email/password dulu. Setelah login sukses, penghitung direset |
| Data di perangkat ini hilang? | Tenang — data juga tersimpan di localStorage perangkat. Saat login, data lokal otomatis digabung ke cloud |
| Status **"Offline"** di menu Habits | Jalankan bagian **HABIT TRACKER** dari `supabase/schema.sql` (tabel `habits`) di SQL Editor, lalu klik chip **Offline** untuk mencoba lagi |
| Status **"Offline"** di menu Finance | Jalankan bagian **FINANCIAL TRACKER** dari `supabase/schema.sql` (tabel `finance`) di SQL Editor, lalu klik chip **Offline** untuk mencoba lagi |
| Build gagal di GitHub Actions | Pastikan kedua repository secrets sudah diisi dengan benar |

---

## 📝 Lisensi

Private project — semua hak cipta milik pemilik repository.
