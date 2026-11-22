# Utility Kelas

Project untuk membantu memberi informasi _mingguan_ tentang list tugas, mengecek jadwal
pelajaran, mengecek jadwal piket, serta catatan tambahan yang dapat di-manage via bot wa,
bot discord, serta dashboard web yang sifatnya lebih advanced.

## Fitur utama:

- Multiplatform (bot discord, bot wa, dan web)
- Pencatatan tugas
- Informasi jadwal (auto parsing dari file excel)
- Informasi piket kelas
- Informasi tambahan (bisa di add secara manual)
- Pesan mingguan

## Fokus project:

- ✅ Membantu mengingatkan tugas
- ✅ Mempermudah siswa mengetahui jadwal
- ✅ Mengingatkan siswa tentang jadwal piket
- 🟨 Sebagai project open-source
- 🟥 Untuk dikomersialkan
- 🟥 Untuk dijadikan startup bisnis

## Detail

### Penjelasan teknis platform:

- **Bot Discord**: bisa menggunakan fitur slash commands yang merupakan fitur milik discord yang memang dikhususkan untuk berinteraksi antara user dengan bot, dengan prefix `/`
- **Bot WA**: bisa menggunakan prefix seperti bot pada platform chatting secara tradisional, seperti `.`, `!`, `#`, dll. yang mudah untuk di "ketik", terutama untuk user HP karena bot WA ditujukan untuk user pada HP
- **Web Dashboard**: sifatnya bebas dan yang jelas lebih advanced untuk monitoring serta konfigurasi bot, melebihi dari fitur-fitur yang bisa diakses via bot

### Contoh penggunaan:

**Bot WA (dengan prefix `.`)**

- Menambah tugas: `.add <deadline> <description` (`.add 10-18 MP Data Analyst Jobsheet 5`)
  Menambahkan tugas dengan deadline pada tanggal 18 Oktober 2026, dengan deskripsi sesuai command
- Mengecek tugas: `.list`
  Memberi list tugas yang ada, dipisah dengan newline dan diawali dengan `-` agar terlihat rapi di whatsapp

**Bot Discord**:

- sama aja kyk bot wa, tapi paling pake embed biar lebih rapi

### Penjelasan teknis mengenai jadwal pelajaran

- File excel jadwal pelajaran bisa diupload ke aplikasi (baik via web, atau bot diupload sebagai attachment bersamaan dengan command)
- Jadwal akan otomatis di parse lalu akan di simpan

### Penjelasan teknis mengenai jadwal piket

- Jadwal piket bisa dikonfigurasi secara manual, kemungkinan via dashboard web

### Penjelasan teknis mengenai catatan tambahan

- Catatan tambahan bisa ditambahkan lewat command di bot, atau bisa juga di tambahakan lewat dashboard

## Cara Menjalankan Proyek

### 1. Menjalankan di Komputer Lokal (Development)

1. **Install dependensi dengan pnpm**:
    ```bash
    pnpm install
    ```
2. **Siapkan database SQLite**:
    ```bash
    pnpm prisma db push
    ```
3. **Build Web Dashboard & jalankan server**:
    ```bash
    pnpm run build:web
    pnpm run dev
    ```
4. Buka browser di `http://localhost:3000` untuk mengakses Web Dashboard.
5. Scan QR code yang muncul di terminal atau langsung di Web Dashboard menggunakan WhatsApp di HP Anda.

---

### 2. Testing Standalone Excel Parser (Tanpa Menjalankan Server)

Anda dapat menguji dan mengkalibrasi pembacaan jadwal Excel secara mandiri:

```bash
pnpm run test:excel
```

---

### 3. Deployment ke Server Proxmox (VM 100 `docker-vm`) via Docker Compose

1. Clone atau salin folder proyek ke `docker-vm` (misal di `/home/docker/class-utilities`).
2. Jalankan container:
    ```bash
    docker compose up -d --build
    ```
3. Untuk scan QR WhatsApp pertama kali di server headless:
    ```bash
    docker compose logs -f class-utilities
    ```
4. Sambungkan port `3000` ke Cloudflare Tunnel (`cloudflared`) yang sudah berjalan di `docker-vm` agar dashboard bisa diakses dengan aman melalui internet via HTTPS (misal: `https://kelas.domain-anda.com`).
