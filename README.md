# Latihan & Tryout Sertifikasi MTCNA (Next.js 16 + Supabase)

Platform latihan dan simulasi tryout sertifikasi **MikroTik Certified Network Associate (MTCNA)** dwibahasa (**Bahasa Indonesia** dan **English**) dengan 50 soal kurasi, 9 topik kurikulum MTCNA, penilaian sisi server, dan panel manajemen administrator.

## Fitur Utama

- **Dwibahasa (ID & EN):** Seluruh pertanyaan, opsi jawaban, dan pembahasan tersedia dalam Bahasa Indonesia dan English (antarmuka tetap berbahasa Indonesia).
- **Mode Belajar per Topik:** Pilih 1 dari 9 topik MTCNA, simpan jawaban, dan pelajari kunci beserta pembahasan konsep dan referensi resmi secara langsung.
- **Mode Tryout 50 Soal (60 Menit):** Urutan soal selang-seling `A`/`B`, timer hitung mundur dengan auto-submit sisi server, penanda soal ragu (*Tandai*), grid navigasi nomor soal, batas lulus 60%, analisis 3 topik terlemah, dan pembahasan berhalaman (5 soal per halaman).
- **Mode Remedial (Latihan Ulang Kesalahan):** Ulangi hanya soal yang salah atau belum dijawab tanpa mengubah nilai tryout awal.
- **Keamanan Kunci Jawaban & Otorisasi Berlapis:**
  - Kunci jawaban disimpan terpisah di tabel `question_keys` dengan Row Level Security (RLS) tertutup bagi peserta.
  - Penilaian dan validasi batas waktu (*deadline*) dijalankan sepenuhnya di server.
  - Proteksi rute dan aksi melalui `proxy.ts`, Data Access Layer (`requireRole`), dan kebijakan RLS Postgres.
- **Manajemen Akun & Role (`user` / `admin`):**
  - Pendaftaran terbuka untuk peserta umum (tanpa konfirmasi email).
  - Peserta dan admin dapat mengganti password akun miliknya sendiri melalui `/akun`.
  - Admin dapat membuat, mengedit password, dan menghapus akun **peserta** (beserta riwayat tryout secara *cascade*), serta dapat menambahkan akun **admin** baru.
  - **Perlindungan Akun Admin:** Admin tidak dapat menghapus atau mengubah password akun admin lain (diverifikasi di tingkat server dengan penolakan `403` dan dicatat pada `admin_audit_log`).

## Prasyarat & Persiapan Lokal

1. **Salin konfigurasi environment:**
   ```bash
   cp .env.example .env.local
   ```
   Isi variabel berikut di `.env.local` dari dashboard proyek Supabase Anda:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(Hanya digunakan di server & skrip CLI, jangan pernah dibagikan)*

2. **Konfigurasi Supabase Auth:**
   - Pada dashboard Supabase → **Authentication → Providers → Email**, matikan opsi **Confirm email** agar akun langsung aktif setelah registrasi.

3. **Jalankan Migrasi Database:**
   - Buka **SQL Editor** di dashboard Supabase, lalu jalankan seluruh isi berkas:
     `supabase/migrations/0001_initial_schema.sql`

4. **Seed Bank Soal (50 Soal ID & EN + 29 Referensi):**
   ```bash
   npm run seed
   ```

5. **Buat Akun Admin Pertama (Kredensial Acak):**
   ```bash
   npm run create-admin
   ```
   Email dan password acak akan ditampilkan **satu kali** di terminal Anda. Segera masuk dan ubah password melalui menu `/akun`.

## Perintah Pengembangan & Kualitas Kode

```bash
npm run dev          # Menjalankan server development Next.js 16 (Turbopack)
npm test             # Menjalankan unit test (scoring, validasi, aturan keamanan)
npm run lint         # Memeriksa kualitas kode dengan ESLint
npm run build        # Membuat production build Next.js 16
npm run extract      # Mengekstrak ulang data/questions.json dari HTML referensi
```

## Deploy ke Vercel

1. Hubungkan repositori ini ke proyek baru di **Vercel**.
2. Tambahkan variabel environment di pengaturan proyek Vercel (**Production** dan **Preview**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Pada dashboard Supabase → **Authentication → URL Configuration**, atur **Site URL** ke domain Vercel Anda.
