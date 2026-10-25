# Patch 3C-5 — Koreksi Klasemen Periode Historis (25 Oktober 2026)

Status: **BELUM DITERAPKAN KE PRODUKSI**. Cabang isolasi; tidak ada perubahan database.

## Sasaran
- September 2026 tetap ditutup secara resmi pada **25 September 2026 16:00 WIB**.
- Oktober 2026 ditutup sesuai ketetapan pejabat berwenang pada **26 Oktober 2026 23:00 WIB**. **Dokumen ini tidak mengubah Script Properties atau trigger.**
- Arsip laporan September tidak bermigrasi ke Q4 hanya karena timestamp melampaui cut-off administratif atau konfigurasi tutup periode dimodifikasi kemudian.
- Klasemen dan Dashboard Admin untuk Achmad Novrizal Hidayat pada Q4: **21 laporan disetujui; 125 poin**.
- Riwayat September tetap ada: 65 laporan, 55 disetujui, 272 poin historis; data pembayaran September **Rp348.000 / Sudah Dicairkan** tidak disentuh.

## Ruang lingkup patch di Kode.gs
1. Membaca `Index_Laporan.PERIODE_RESMI` dan mengirimkannya sebagai metadata proyeksi ke agregator klasemen cepat.
2. Menolak format periode indeks yang tidak sah; perilaku fallback ke `Rekap_Kinerja` tidak diubah. Fallback memerlukan pemantauan khusus.
3. Namespace cache baru `KLASEMEN_FAST_3C5_` agar cache lama tidak dipakai.
4. `refreshKlasemenKinerjaCache()` kini menyegarkan jalur klasemen aktif.

## Data real: pemeriksaan baca-saja
- 173 entri indeks milik pegawai terkait.
- Sebelum patch, resolver tanggal menempatkan 29 laporan September yang disetujui (145 poin) dalam Q4: 50/270.
- Sesudah memakai kolom periode resmi indeks: 21/125.
- Seluruh September dari indeks: 55 laporan disetujui / 272 poin; 65 total laporan.
- Dari 4.413 baris indeks pada saat pemeriksaan, **248** memiliki perbedaan terhadap hasil klasifikasi ulang berdasarkan daftar batas penutupan yang direkonstruksi. Dari jumlah itu: 212 entri April dan 36 entri September. Perubahan April perlu audit sendiri; jangan otomatis migrasi.

## Gerbang penerapan wajib
- Pastikan SHA sumber GitHub cocok dengan kode di deployment Apps Script aktif; jika berbeda, lakukan rebase manual.
- Pastikan jalur `Index_Laporan` AKTIF dan sehat pada runtime; jika terpaksa fallback, verifikasi akumulasi dan log `fallbackReason`.
- Snapshot + backup `Rekap_Kinerja`, `Index_Laporan`, Script Properties, dan deployment revision terlebih dahulu. Jangan membangun ulang index sebelum preservasi waktu pengiriman asli.
- Uji staging: Achmad Oktober 21/125; September 65 total & 272 poin historis; tunjangan September Rp348.000 status tetap; semua pegawai lain disandingkan sebelum/sesudah; peringkat, pagination, predikat, cache miss, dan kegagalan indeks.
- Perlu rancangan lanjutan untuk membuat periode historis tetap tahan `rebuild`: fungsi `buatBarisIndexLaporan2B0_` masih menghitung ulang `PERIODE_RESMI` dari waktu.
- Jangan mengubah jam cutoff, pembayaran yang telah dicairkan, timestamp historis, atau kebijakan submit otomatis lewat patch ini.

## Rollback
- Belum ada perubahan `main` atau deploy. Tidak perlu rollback produksi.
- Bila kelak deploy dan terjadi regresi, kembalikan revisi deployment Apps Script sebelumnya; verifikasi Klasemen, Dashboard, dan status pembayaran.
