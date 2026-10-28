# Patch 3C-6 — Guard periode resmi, pemeriksaan baca indeks, dan fail-closed

Tanggal: 28 Oktober 2026. Status: **DRAFT — JANGAN DEPLOY KE PRODUKSI**.

## Tujuan

1. `Index_Laporan.PERIODE_RESMI` dan `TANGGAL_LAPORAN` indeks lama tetap *immutable* ketika baris sumber diperbarui atau indeks dibangun ulang.
2. Indeks yang sehat dapat dibaca ketika `INDEX_LAPORAN_2B1_WRITE_ENABLED=false`, tanpa membuat fungsi penghitungan beralih diam-diam ke tanggal pada `Rekap_Kinerja`.
3. Indeks yang hilang, salah identitas, status/poin tidak sinkron, periode tidak valid, header korup, ID ganda, antrean tidak bersih atau circuit terbuka menghasilkan kesalahan eksplisit, termasuk saat cache Klasemen masih berisi hasil lama.

## Implementasi

- `ambilAnchorPeriodeIndex3C6_` mengunci catatan periode dan waktu asli berdasarkan ID laporan, ID pengguna, dan baris Rekap.
- `bacaAnchorIndexUntukRebuild3C6_` memvalidasi seluruh arsip sebelum pembuatan sheet sementara. **Rebuild pertama tanpa indeks lama sekarang sengaja ditolak**. Bootstrap baru memerlukan prosedur migrasi terpisah.
- `buatBarisIndexLaporan2B0_` mempertahankan anchor historis pada perubahan status/poin dan menolak laporan baru ketika tidak ada konfigurasi cut-off.
- `auditRekapKinerjaUntukIndex_` menggunakan anchor lama pada expectedRows; `sinkronkanSatuRowIndexLaporan2B1Internal_` menjaga anchor sebelum setValues.
- `cekKesehatanRinganReadRiwayatIndex2B2A_` tidak lagi menjadikan status dual-write syarat kelulusan. Ia membaca seluruh identitas/status/poin dan memeriksa anchor, header, duplikasi, jumlah baris serta queue. Perbedaan timestamp sumber-indeks **tidak otomatis dianggap rusak**, karena jejak indeks adalah historis.
- `ambilDataRekapKlasemenFastCached_` menguji flag baca/circuit/kesehatan **sebelum** memakai cache.

## Pengujian terisolasi (belum staging 3C-6)

```bash
node tests/patch_3c6_guard.test.js
```

Skenario (termasuk jalur sinkronisasi baris dan audit sumber rebuild dengan mock): periode September tetap September setelah sunting sumber; waktu asli tetap; perubahan status dipertahankan; ID laporan/pegawai salah ditolak; periode salah ditolak; append dengan/tanpa cutoff; read sehat dengan write=false; poin/status stale; header corrupt; ID duplikat; queue pending; baris indeks hilang; rebuild tanpa indeks historis; snapshot historis valid; cache sehat; cache lama yang indeksnya rusak; circuit terbuka; read flag nonaktif.

Pengujian terisolasi pada kode cabang: 26/26 PASS (28 Oktober 2026). Ini **bukan** uji Apps Script staging end-to-end.

## Gerbang uji integrasi STAGING (wajib)

1. Cadangkan proyek STAGING dan spreadsheet STAGING (beserta ID spreadsheet), serta bandingkan perubahan manual staging dengan cabang ini. **Jangan langsung mengganti seluruh `Kode.gs` jika ada perubahan staging yang belum di-commit.**
2. Terapkan patch **hanya di proyek staging**, konfirmasi properti `SPREADSHEET_ID` tetap mengarah ke `STAGING - Database Kinerja Minomartani 2026`. Pastikan waktu script Asia/Jakarta.
3. Konfirmasi cut-off staging: September 25-09-2026 16:00 WIB dan Oktober 26-10-2026 23:00 WIB; catatan Achmad tetap `2026-09` di indeks.
4. Pasang `INDEX_LAPORAN_2B1_WRITE_ENABLED=false` di staging setelah backup. Jalankan `cekKesehatanRinganReadRiwayatIndex2B2A_`: harus `valid:true`, `dualWriteAktif:false`, queue bersih, 4.498 baris per sumber pada snapshot lama.
5. Jalankan ulang `auditKomparasi15Staging3C5` (15/15 poin dan tunjangan sesuai), fungsi uji Achmad (21 laporan, 125 poin) dan Cache; amati waktu permintaan setelah pemeriksaan penuh (risiko perlambatan).
6. Cek jalur fail-closed dengan **mock/test terisolasi**, jangan menyunting/merusak sheet staging aktif untuk simulasi. Jika hendak uji gangguan fisik, buat *salinan staging kedua* yang berdiri sendiri dan pastikan tidak memiliki trigger otomatis.
7. Uji rebuild hanya di salinan staging kedua setelah cadangan lengkap, verifikasi 55 perbedaan tanggal historis tidak tertimpa, khususnya catatan September.
8. Verifikasi fitur login, Klasemen, Dashboard Admin, Riwayat, dan bahwa tidak ada penulisan/antrian tidak diinginkan.
9. Jangan jalankan deployment produksi sampai seluruh bukti log, jumlah baris, kecepatan dan rencana rollback disetujui.

## Rollback

- Selama branch/PR belum di-merge, produksi tidak berubah.
- Bila staging bermasalah, kembalikan kode Apps Script dari snapshot sebelum 3C-6 dan property snapshot sebelumnya; jangan menghapus/mengatur ulang histori `PERIODE_RESMI`.
- Jika ada perubahan sheet saat pengujian salinan kedua, pulihkan hanya salinan tersebut dari backup.
- Setelah patch disetujui, deployment produksi harus menggunakan versi bernomor baru, dan siapkan pemulihan deployment ke versi sebelumnya tanpa menulis ulang data indeks.

## Risiko sisa

- Pemeriksaan kesehatan penuh membaca 20 kolom sumber serta 12 kolom indeks untuk seluruh laporan; perlu *benchmark* pada staging sebelum produksi.
- 55 perbedaan tanggal historis sudah terdokumentasi (53 Achmad, 2 Robert) dan tetap perlu jejak audit serta prosedur koreksi administratif resmi.
- Perubahan manual atas nilai `PERIODE_RESMI` yang masih tampak valid tidak dapat dipastikan hanya dengan pemeriksaan indeks itu sendiri. Untuk perlindungan lebih tinggi diperlukan ledger immutable terpisah atau checksum yang dikelola independen.
- Jalur `bangunUlangIndexLaporan_` yang sebelumnya bisa membuat indeks pertama kini **tidak** mendukung bootstrap tanpa arsip; harus ada migrasi eksplisit.
