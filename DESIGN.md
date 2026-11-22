# Design Specification: Utility Kelas

Dokumen ini merupakan spesifikasi rancangan arsitektur dan teknis resmi untuk proyek **Utility Kelas**, yang telah divalidasi melalui proses brainstorming.

---

## 1. Understanding Summary

- **Tujuan**: Membangun sistem utilitas kelas terpadu untuk mengotomasi pengingat tugas (PR), jadwal pelajaran berbasis sistem blok mingguan, jadwal piket kebersihan, serta pengingat harian otomatis ke grup WhatsApp kelas.
- **Target Pengguna**: 1 kelas mandiri (Kelas XI-2 / RPL SMKN 1 Jenangan, ~30–40 siswa dan pengurus kelas).
- **Lingkup Antarmuka**:
    - **Tahap 1 (MVP)**: Bot WhatsApp (interaksi siswa di grup) dan Web Dashboard (manajemen data visual untuk pengurus).
    - **Tahap 2**: Bot Discord (terhubung ke _core domain services_ yang sama).
- **Hak Akses & Otorisasi**:
    - _Bot WhatsApp_: Terbuka untuk seluruh siswa di grup kelas (`.add`, `.list`, `.done`, `.del`, `.jadwal`, `.piket`, `.nb`).
    - _Web Dashboard_: Diproteksi dengan 1 Master PIN / Password Admin untuk pengurus kelas.
- **Infrastruktur & Hosting**:
    - _Development_: Laptop lokal Windows (`npm run dev`).
    - _Production_: Self-hosted di Home Proxmox Server (`awa-debian`), tepatnya di dalam VM 100 (`docker-vm` Ubuntu 24.04 LTS) via Docker Compose, dan diekspos melalui Cloudflare Tunnel (`cloudflared`).

---

## 2. Assumptions

1. **Jadwal Pelajaran Sistem Blok**: Sekolah menggunakan sistem blok semester (~20–23 minggu) di mana setiap minggu terdiri dari 5 slot waktu pelajaran (periode harian) + 1 kolom ruangan (`R`).
   - Kelima slot ini (`1` s/d `5`) merepresentasikan **5 jam pelajaran dalam sehari**, dan jadwal harian ini berlaku berulang **setiap hari (Senin s/d Jumat) selama minggu tersebut**.
   - Bila seluruh 5 slot ter-merge dengan angka (misal `1`, `2`, `3`), itu menandakan jadwal **Bengkel** (Mata Pelajaran Kejuruan) sepanjang hari, setiap hari selama seminggu penuh (ruang `Bkl`).
   - Terdapat kombinasi parsial, seperti 3 slot kejuruan (angka) ter-merge + 2 slot tersisa ter-merge dengan kode `L1` (Kewirausahaan). Berbeda dengan mapel umum yang selnya tetap terpisah meski berurutan, `L1` ter-merge saat menempati 2 periode.
   - Sel-sel ter-merge diekspansi secara otomatis ke slot waktu yang sesuai oleh parser Excel.
2. **Database SQLite Lokal**: Data disimpan dalam satu file fisik `database.db` menggunakan Prisma ORM. Portabel, hemat memori, dan dapat dimigrasikan ke PostgreSQL bila diperlukan.
3. **Penyimpanan Sesi WhatsApp**: Kredensial login Baileys disimpan di direktori persisten `./data/auth/` dengan dukungan login QR code dan 8-digit Pairing Code.
4. **Timezone**: Seluruh penjadwalan berpatokan pada Waktu Indonesia Barat (`Asia/Jakarta`, UTC+7).

---

## 3. Decision Log

| No  | Topik                     | Keputusan                                       | Alternatif Dipertimbangkan              | Alasan Pemilihan                                                                                           |
| --- | ------------------------- | ----------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Arsitektur Sistem**     | Layered Modular Monolith (Single Process)       | Microservices, Decoupled API + Worker   | Hemat RAM (< 200MB), tanpa network latency antar modul, mudah di-maintain.                                 |
| 2   | **Engine WhatsApp**       | `@whiskeysockets/baileys`                       | `whatsapp-web.js` (Puppeteer)           | Baileys berkomunikasi via direct WebSocket (Noise Protocol) tanpa browser Chrome, memori < 100MB.          |
| 3   | **Database & ORM**        | SQLite + Prisma ORM                             | PostgreSQL Cloud (Supabase), Raw SQLite | Zero-config, offline-ready di laptop, storage permanen di VPS Proxmox, type-safe schema.                   |
| 4   | **Frontend Dashboard**    | React + Vite + Tailwind CSS                     | Plain EJS HTML, Next.js Fullstack       | Developer experience modern (HMR), dikompilasi jadi file statis yang disajikan oleh backend Fastify.       |
| 5   | **Excel Parsing Engine**  | Standalone Modular Parser dengan Range Selector | Hardcoded static cell parser            | Layout file sekolah dinamis antar-tahun; parser modular bisa ditest/dikalibrasi secara independen via CLI. |
| 6   | **Bot Command Structure** | Dynamic File-based Command Handler              | Single switch-case / monolithic router  | Perintah dipisah per file (`commands/<category>/<command>.ts`), sangat rapi dan mudah diekstensi.          |
| 7   | **Standar Git**           | Conventional Commits                            | Freeform commits                        | Riwayat commit terstruktur rapi (`feat:`, `fix:`, `chore:`).                                               |

---

## 4. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Client Interfaces                     │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ WhatsApp Bot (Baileys)│       │ Web Dashboard (React) │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
└──────────────┼───────────────────────────────┼──────────────┘
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ Dynamic Command Loader│       │ Fastify REST Endpoints│  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              │                               │              │
│              ▼                               ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Core Domain Services                 │  │
│  │  - TaskService        - ScheduleService               │  │
│  │  - PiketService       - ReminderService               │  │
│  │  - Standalone Excel Parser (src/core/excel/)          │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             Prisma ORM & SQLite Storage               │  │
│  │                   (database.db)                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                              ▲                              │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │             Scheduler Engine (node-cron)              │  │
│  │      Daily 18:30 WIB Digest Builder & Dispatcher      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema (Prisma)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 1. Manajemen Tugas & PR
model Task {
  id          Int      @id @default(autoincrement())
  description String
  deadline    DateTime
  createdBy   String?
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
}

// 2. Kamus Kode Mapel & Guru (dari sheet 'daftar nama guru')
model SubjectTeacher {
  code        String   @id // Contoh: "E3", "A7", "I1", "L1"
  subjectName String   // "Sejarah Indonesia", "Pendidikan Agama Islam"
  teacherName String   // "Dwi Murdianto, SE"
}

// 3. Jadwal Pembelajaran Blok (dari sheet 'DRAF MASTER GANJIL')
model BlockSchedule {
  id         Int     @id @default(autoincrement())
  className  String  @default("RPL A")
  weekNumber Int     // Minggu ke-1 s/d 23
  slotNumber Int     // Slot Waktu 1 s/d 5
  code       String  // Kode Mapel atau Indikator ("E3", "1", "MPLS")
  room       String? // Ruangan ("Bkl", "2", "3", "4")
}

// 4. Kalender Akademik Mingguan (dari baris tanggal Excel)
model SemesterWeek {
  weekNumber Int      @id // 1 s/d 23
  startDate  DateTime
  endDate    DateTime
  isHoliday  Boolean  @default(false)
  eventNote  String?  // Agenda khusus seperti "CLASS MEETING", "LIBUR SEMESTER"
}

// 5. Override Jadwal Harian (Koreksi manual via Web Dashboard)
model ScheduleOverride {
  id          Int      @id @default(autoincrement())
  date        DateTime // Tanggal berlakunya perubahan (YYYY-MM-DD)
  slotNumber  Int      // Slot Waktu 1 s/d 5
  subjectName String
  teacherName String?
  room        String?
  note        String?
}

// 6. Petugas Piket Harian
model Piket {
  id          Int    @id @default(autoincrement())
  dayOfWeek   Int    // 1: Senin s/d 5: Jumat
  studentName String
}

// 7. Catatan Tambahan (NB)
model Note {
  id        Int      @id @default(autoincrement())
  text      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// 8. Pengaturan Sistem
model Setting {
  key   String @id
  value String
}
```

---

## 6. Standalone Excel Parser Engine

Modul parser ditempatkan secara terisolasi di `src/core/excel/` dengan kemampuan dieksekusi mandiri:

- **Deteksi 6-Kolom Mingguan**: Membaca 5 slot waktu pelajaran dan 1 slot ruangan (`R`).
- **Smart Unmerge**: Mengisi nilai sel secara merata ke seluruh slot waktu bila terdapat _merged cells_ (misal: blok bengkel 5 slot, atau proyek L1 2 slot).
- **Deteksi Event Vertikal**: Mendeteksi kolom khusus non-KBM (seperti Ulangan Akhir Semester, Class Meeting, dan Libur Semester) dan menyimpannya sebagai `eventNote` pada `SemesterWeek`.
- **CLI Standalone**: Disediakan script `npm run test:excel` untuk pengujian dan kalibrasi cepat tanpa menyalakan server/bot.

---

## 7. Dynamic WhatsApp Command Engine

Struktur folder modular:

```text
src/interfaces/whatsapp/commands/
├── tugas/
│   ├── add.ts       # .add <deadline> <deskripsi>
│   ├── list.ts      # .list
│   ├── done.ts      # .done <id>
│   └── del.ts       # .del <id>
├── jadwal/
│   ├── today.ts     # .hari-ini
│   └── tomorrow.ts  # .jadwal / .besok
├── piket/
│   └── list.ts      # .piket
└── info/
    ├── nb.ts        # .nb <teks>
    └── help.ts      # .help / .menu
```

---

## 8. Web Dashboard Interface (React + Vite + Tailwind)

1. **`/` (Dashboard Overview)**: Kartu status bot WhatsApp (koneksi, baterai/pairing), ringkasan tugas aktif, dan pratinjau rekap malam ini.
2. **`/jadwal`**: Tampilan matriks blok mingguan 20 minggu, visual range selector saat upload Excel, dan form override jadwal darurat.
3. **`/piket`**: Tabel pembagian nama piket Senin s/d Jumat.
4. **`/tugas`**: Daftar tabel tugas lengkap dengan tombol tambah, edit, dan hapus.
5. **`/settings`**: Konfigurasi jam pengingat harian (default 18:30 WIB), switch scheduler on/off, dan pergantian Master PIN Admin.

---

## 9. Phased Implementation Roadmap

1. **Fase 1: Inisialisasi Proyek & Prisma Core**
    - Setup TypeScript, Prisma ORM, konfigurasi SQLite, dan base models.
    - _Commit_: `chore: initialize project structure and prisma sqlite schema`
2. **Fase 2: Standalone Excel Parser & CLI Runner**
    - Modul parser di `src/core/excel/` dengan dukungan range mapping dan smart unmerge.
    - Script CLI `scripts/test-excel-parser.ts`.
    - _Commit_: `feat(excel): implement isolated block schedule parser and cli runner`
3. **Fase 3: Core Domain Services**
    - Layanan bisnis `TaskService`, `ScheduleService`, `PiketService`, dan `ReminderService`.
    - _Commit_: `feat(core): implement domain business logic services`
4. **Fase 4: WhatsApp Engine & Dynamic Command Handler**
    - Integrasi Baileys client, persistent auth store, command loader dinamis.
    - _Commit_: `feat(whatsapp): integrate baileys client and modular command handler`
5. **Fase 5: Scheduler Engine (Daily 18:30 WIB)**
    - Konfigurasi `node-cron` untuk rekap harian otomatis.
    - _Commit_: `feat(scheduler): implement configurable daily digest reminder cron`
6. **Fase 6: Web Dashboard SPA & Fastify Server**
    - Pembuatan REST API Fastify dan antarmuka React + Vite + Tailwind.
    - _Commit_: `feat(web): build interactive dashboard spa and api server`
7. **Fase 7: Containerization & Deployment Setup**
    - Multi-stage `Dockerfile` dan `docker-compose.yml` untuk VM 100 Proxmox `awa-debian`.
    - _Commit_: `chore(docker): create multi-stage dockerfile and compose configuration`
