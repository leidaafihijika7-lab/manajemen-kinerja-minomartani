# Prosedur akun sintetis Galaxy A07 — STAGING

**Status: kode disiapkan pada branch diagnostik GitHub. Belum dipasang di Apps Script staging, dan belum membuat akun.**

## Tujuan
Satu akun `staging_a07_test` dengan nama `PENGUJI STAGING A07`,
jabatan `Dukuh Gantalan` (agar menyerupai peran Suratmi), akses `User`,
status `Aktif`. Semua data merupakan identitas sintetis; tidak memakai
akun, PIN, nomor WA, atau foto pegawai sebenarnya.

## Pengaman
- Memvalidasi **dua penanda sekaligus**: Script Property `SPREADSHEET_ID`
  serta ID dan judul database hasil `getSS_()` harus sama persis dengan
  database `STAGING - Database Kinerja Minomartani 2026`.
- Memastikan pelaksana teridentifikasi dan identitas aktif/effective sama;
  bila email tidak tersedia, **menolak** tanpa memodifikasi database.
- Validasi skema `Data_Pegawai` A:K, username dan nama sintetis unik,
  dan hanya akses `User`.
- Pembuatan membutuhkan dua properti sekali pakai:
  `STAGING_A07_ACCOUNT_ACTION=CREATE_ONCE`, `STAGING_A07_TEST_PIN`
  yang berisi **6 angka acak** yang hanya diketahui operator.
- Hash PIN v2 dibuat dalam memori menggunakan `buatPinSalt_()`,
  `hashPinV2_()`, dan pepper script staging, lalu satu baris disisipkan
  pada `Data_Pegawai`. Tidak menyimpan PIN mentah ke sheet atau log.
- Kedua properti sekali pakai dihapus sebelum append. Jika terjadi
  kegagalan sebelum tahap ini, operator perlu menghapus nilai PIN
  sementara secara manual dari Script Properties.
- Lock skrip, pemeriksaan duplikasi, dan pengaman izin untuk mencegah
  pembuatan berulang.
- **Tidak otomatis** dijalankan dari `doGet`, login, unggah, atau `Index.html`.

## Pemasangan (operator)
1. Gunakan hanya project **STAGING - Portal Kinerja Minomartani**.
   Cadangan staging harus sudah tersedia. Jangan mengubah produksi.
2. Tambah berkas skrip `StagingA07TestAccountV1.gs` dan salin kode
   dari branch `diagnostic/staging-galaxy-a07-upload-session-20261028`.
   Simpan. **Tidak perlu mengganti `Kode.gs` atau `Index.html`.**
3. Untuk pemeriksaan awal tanpa menyiapkan PIN, jalankan
   `periksaKesiapanAkunUjiStagingA07`. Target:
   `target=STAGING_ONLY`, `duplicates=0`,
   `pinSiap=false`, `izinSekaliPakai=false`, `siap=false`.
   Fungsi ini baca-saja.
4. Di **Script Properties staging saja**, buat PIN acak enam digit
   yang tidak dipakai pegawai produksi. Tambahkan:
   - `STAGING_A07_TEST_PIN` = nilai privat enam digit tersebut.
   - `STAGING_A07_ACCOUNT_ACTION` = `CREATE_ONCE`.
   **Jangan kirim nilai PIN via chat, screenshot, GitHub, atau log.**
5. Jalankan lagi `periksaKesiapanAkunUjiStagingA07`. Target
   `siap=true`, `duplicates=0`.
6. Baru pilih `buatAkunUjiStagingA07` pada toolbar dan klik Jalankan
   **satu kali**. Periksa log tanpa PIN:
   `sukses:true`, `database:STAGING_ONLY`, nama dan username.
   Jika gagal, jangan ulang otomatis: lihat error dan periksa apakah
   username sudah ada (mungkin append berhasil sebelum respons terputus).
7. Di sheet `Data_Pegawai` staging, verifikasi satu baris akun uji:
   username, nama, jabatan `Dukuh Gantalan`, akses `User`,
   status `Aktif`, versi hash `v2`. **Jangan tampilkan kolom hash,
   salt, atau PIN.** PIN sementara harus sudah hilang dari properties.
8. Login melalui staging `/dev` (akun editor); cek log
   `LOGIN_OK`. Setelah itu baru rencanakan uji unggah dengan foto
   sintetis dan folder staging terverifikasi.

## Pasca pengujian
Untuk menonaktifkan akun, set di Script Properties staging:
`STAGING_A07_ACCOUNT_ACTION=DISABLE_ONCE` lalu jalankan
`nonaktifkanAkunUjiStagingA07` **sekali**. Fungsi hanya mengubah
status akun uji menjadi `Nonaktif`; tidak menghapus laporan sintetik
atau baris akun, agar bukti audit tetap jelas. Sesi pengguna mungkin
perlu menunggu pemeriksaan status berikutnya; logout secara manual.

Matikan pula properti diagnostik `STAGING_UPLOAD_DIAG_V1=OFF` setelah
seluruh uji selesai. Jangan memakai fungsi ini untuk membersihkan data
produksi atau melakukan rebuild indeks.

## Hasil pengujian yang telah dilakukan
- **8/8 simulasi JavaScript murni lulus**: preflight, append sekali,
  tanpa PIN di log/sheet, tolak pembuatan ulang, nonaktif tanpa delete,
  blokir ID produksi, tolak duplikat, tolak identitas pelaksana kosong.
- **Belum diuji dalam Apps Script staging**; user harus memasang,
  menjalankan preflight, lalu membuat akun sesuai langkah eksplisit.
- **Belum ada akun yang dibuat atau spreadsheet yang dimodifikasi.**
