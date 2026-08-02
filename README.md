# 🎨 ContentCanvas — Social Media Content Planner

Aplikasi **perencana konten sosial media** berbasis web (PWA) yang bisa dipakai di HP, PC, dan tablet. Rencanakan konten harianmu di kalender, lengkapi dengan strategi konten, skrip video, referensi visual, hingga ekspor laporan — **semua data tersinkron otomatis antar perangkat**.

> 🌟 **Fitur utama:** Data tersimpan di cloud (Supabase), jadi data yang kamu input di HP akan langsung muncul di PC dan sebaliknya.

---

## ✨ Fitur-Fitur

### 🗓️ Kalender Konten
- Tampilan kalender bulanan dengan navigasi antar bulan + tombol **Today**
- Badge jumlah konten per hari + preview mini (thumbnail YouTube, badge platform, cuplikan catatan)
- Highlight hari ini (oranye) dan indikator hari yang punya konten

### 📝 Editor Perencanaan Harian
Klik hari mana pun untuk membuka panel perencanaan lengkap:

| Bagian | Fungsi |
|---|---|
| **Link Konten** | Tempel URL video/referensi — YouTube, TikTok, Instagram, Pinterest, atau gambar langsung — otomatis dideteksi & ditampilkan preview |
| **Catatan & Ide** | Concept, hook, notes, scripting, shooting, editing |
| **Image References** | Kumpulan gambar referensi per konten (termasuk preview Pinterest) |
| **🎯 Content Strategy** | Key message, daftar **hooks**, **storytelling beats**, Call-to-Action, dan hashtag |
| **📷 Carousel Canvas** | Rancang slide carousel: skrip + panduan desain (palet warna, tipografi, layout) per slide |
| **🎬 Scene Cards** | Skrip per scene, durasi, camera angle, shot type, lokasi, editing, checklist, drag-&-drop reorder, dan **simpan sebagai template** |

### 📤 Ekspor Laporan
- **CSV** — cocok untuk Excel/Google Sheets (dengan BOM Unicode agar huruf/emoji aman)
- **PDF** — laporan rapi berwarna (jsPDF + autotable), bisa dipilih **semua data** atau **per bulan**

### ☁️ Sinkronisasi Cloud (Supabase)
- Login dengan **email & password** — cukup daftar sekali, lalu masuk di perangkat lain
- Data **otomatis tersinkron realtime** antar perangkat (perubahan langsung muncul, tanpa refresh)
- **Merge cerdas saat pertama kali masuk**: data lama di perangkat tidak hilang — digabung dengan data cloud berdasarkan ID konten & waktu edit
- Tetap bisa **offline** (data disimpan juga di localStorage perangkat)

### 🌗 Lainnya
- Dark mode (otomatis ikut sistem + bisa diubah manual)
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

Script tersebut membuat tabel `entries`, aturan keamanan baris (RLS — tiap user hanya bisa akses datanya sendiri), dan mengaktifkan realtime.

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
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Perangkat A │◄──────►│  Supabase Cloud   │◄──────►│  Perangkat B │
│  (HP)        │  realtime & upsert  │  (tabel entries)  │  realtime  │  (PC)        │
└─────────────┘         └──────────────────┘         └─────────────┘
```

1. **Masuk** → aplikasi menarik data dari cloud dan **menggabungkan** dengan data lokal perangkat
2. **Edit konten** → perubahan disimpan ke perangkat (instan) lalu dikirim ke cloud
3. **Perangkat lain online** → menerima perubahan lewat *realtime subscription* tanpa perlu refresh

**Struktur data:** satu baris per (user, tanggal) → kolom `data` (JSON) berisi daftar konten hari itu. Penggabungan konflik dilakukan per-konten berdasarkan ID + waktu edit terakhir.

---

## 🚢 Deployment ke GitHub Pages

Project sudah siap deploy otomatis ke **GitHub Pages** lewat GitHub Actions. URL hasilnya: `https://<username>.github.io/content-canvas-app/`

### Langkah pertama kali (sekali saja):

1. **Push kode ke GitHub** (sudah ada remote `origin`):

   ```bash
   git add -A
   git commit -m "update"
   git push origin main
   ```

2. **Tambahkan 2 repository secrets** (nilainya sama dengan `.env`):
   - Repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   - `VITE_SUPABASE_URL` = URL project Supabase
   - `VITE_SUPABASE_ANON_KEY` = anon public key

3. **Aktifkan GitHub Pages:**
   - Repo GitHub → **Settings → Pages**
   - *Build and deployment → Source* → pilih **GitHub Actions**

4. Workflow (`.github/workflows/deploy.yml`) otomatis menjalankan build & deploy setiap ada push ke `main`. Pantau progress di tab **Actions**.

> 💡 Setelah ini, setiap push ke `main` akan otomatis membangun & menerbitkan versi terbaru.

---

## 📁 Struktur Project

```
├── .github/workflows/deploy.yml   # Auto-deploy GitHub Pages
├── public/                        # favicon & ikon PWA
├── supabase/schema.sql            # Skema database Supabase
├── src/
│   ├── components/                # UI: Calendar, DaySidebar, AddVideoForm,
│   │                              #      AuthScreen, VideoEmbed, ImagePreview, dll.
│   ├── hooks/                     # useLocalStorage (data + sinkronisasi),
│   │                              # useTheme (dark mode)
│   ├── lib/                       # supabase.js (client) & sync.js (sinkronisasi)
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
| Data di perangkat ini hilang? | Tenang — data juga tersimpan di localStorage perangkat. Saat login, data lokal otomatis digabung ke cloud |
| Build gagal di GitHub Actions | Pastikan kedua repository secrets sudah diisi dengan benar |

---

## 📝 Lisensi

Private project — semua hak cipta milik pemilik repository.
