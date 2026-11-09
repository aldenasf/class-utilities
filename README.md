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

### Contoh preview pesan mingguan:

> Contoh pesan diambil dari group RPL A

```
Assalamualaikum wr wb.
✨ Jadwal untuk besok ✨ <-- diambil secara otomatis dari file excel
1. BAHASA INDONESIA
2. MATEMATIKA
3. SENI BUDAYA
4. IPAS
5. IPAS

🧹 Jadwal piket 17-11-2025🧹 <-- diambil dari jadwal yang telah dikonfigurasi
1. Adam D
2. Adam M
3. Fadil
4. Aidil
5. Akhtar
6. Alden
7. Alfian
8. Alvin

📚 PR = <-- diambil secara otomatis dari list tugas

NB :  <-- di add secara manual
1. Hari senin membawa topi abu putih
2. Hari rabu membawa baju olahraga
3. Hari kamis kas kelas Rp. 1.000

Sekian terimakasih 🤩🙏🏻🙏🏻

Wassalamu'alaikum wr wb
```
