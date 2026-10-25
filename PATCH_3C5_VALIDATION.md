# Laporan Validasi Staging Patch 3C-5 — 25 Oktober 2026

**Status:** LULUS uji terisolasi; **BELUM LULUS gerbang runtime Apps Script**; BELUM deploy ke produksi.

## Tujuan dan kebijakan
- Penetapan periode laporan harus konsisten pada Klasemen dan Dashboard Admin Kinerja.
- Laporan yang telah diarsipkan pada September 2026 tetap tercatat dalam periode administrasi September, tidak masuk klasemen triwulan IV.
- Cut-off September sah 25 September 2026 16.00 WIB; kebijakan keterlambatan tidak berubah.
- Cut-off Oktober berdasarkan ketetapan atasan: **26 Oktober 2026 23.00 WIB**. Patch ini **tidak membuat/mengubah** lock Oktober dalam Script Properties.
- Pembayaran historis tidak dihitung ulang atau ditulis ulang oleh patch.
- Data pribadi, identitas, dan dokumen bukti pegawai tidak dicantumkan dalam laporan uji publik ini.

## Perubahan pada Kode.gs
1. Klasemen cepat menggunakan `PERIODE_RESMI` yang tervalidasi dari indeks; tidak menafsir ulang tanggal penyerahan.
2. Cache klasemen menggunakan namespace versi 3C-5; fungsi refresh menghapus cache aktif.
3. **Fail-closed:** indeks tidak sehat/fitur nonaktif/periode invalid menyebabkan `KLASEMEN_INDEX_UNAVAILABLE`, **tanpa fallback** ke perhitungan yang mungkin salah.
4. **Tidak** mengubah `bangunBaseDashboardAdminV2A2_`, submit, penilaian/review, tunjangan, lock cut-off, atau proses indeks. Hindari rebuild indeks sampai prosedur preservasi timestamp asli tersedia.

## Pengujian dijalankan
- Pemeriksaan sintaks JavaScript: **PASS**, seluruh sumber `Kode.gs` cabang staging.
- Eksekusi langsung fungsi klasemen yang diekstrak dari `Kode.gs` cabang staging dengan mock servis Apps Script + 4.413 baris `Index_Laporan` aktual dan 23 data master pegawai: **PASS**, target triwulan IV 21 laporan dan 125 poin bagi kasus yang diuji.
- Rekonsiliasi seluruh 4.413 baris indeks: **PASS**, tidak ditemukan ID laporan/row indeks duplikat, format periode invalid, atau tanggal tidak dikenali pada pembacaan. **Hanya satu pegawai berubah** di agregasi triwulan IV; 36 baris arsip September (29 disetujui, 145 poin) tidak lagi masuk Q4.
- Uji fungsi sintetis langsung dari kode cabang staging: **9/9 PASS**, mencakup ketepatan periode, pemisahan poin bulan, status ditolak, cache hit, refresh cache, namespace versi baru, indeks unhealthy, tidak menjalankan fallback, format periode invalid.
- Review diff terhadap `main`: file produksi yang berubah hanya `Kode.gs`; satu dokumen validasi ditambahkan. **Tidak ada commit pada `main`.**

## Catatan penting / gerbang sebelum deployment
1. **Runtime belum teruji**: hasil ini bukan hasil deployment aplikasi Google Apps Script staging; diperlukan akun/koneksi Apps Script yang dapat mengeksekusi salinan terisolasi tanpa akses tulis ke spreadsheet produksi.
2. Pastikan kode pada deployment aktif identik dengan commit acuan `main`, atau integrasikan perubahan secara manual pada versi yang benar. `APP_VERSION` tidak membuktikan kesamaan seluruh kode.
3. Baca status flag `readRiwayatIndexAktif2B2A_`, flag dual-write, kesehatan indeks, dan status antrean pada runtime sebenarnya. Karena patch fail-closed, indeks bermasalah membuat klasemen sementara tidak tersedia; itu lebih aman daripada angka keliru.
4. Uji staging Apps Script dengan salinan database: hasil semua pegawai, ranking/paginasi, cold/warm cache, fallback error, dashboard, laporan/review, dan tanpa mutasi batch tunjangan.
5. `buatBarisIndexLaporan2B0_` masih menghitung ulang periode dan timestamp dari sumber. Sebelum rebuild/sinkronisasi 53 baris historis yang waktu sumbernya pernah diubah, **amankan waktu asli dan audit perubahan**. Patch ini tidak mengatasi masalah durability tersebut.
6. Sebanyak 248 baris menunjukkan perbedaan bulan historis versus resolver berbasis cut-off terkini (212 April, 36 September). Perbedaan April berada dalam triwulan II; jangan ubah arsip tersebut tanpa audit terpisah.
7. **Cut-off Oktober belum dapat diverifikasi dari Script Properties** dengan koneksi yang tersedia; penelusuran Audit_Log tidak menemukan catatan penetapan baru untuk 26 Oktober 2026 pukul 23.00 WIB. Tidak adanya log belum membuktikan konfigurasinya belum disimpan. Pastikan admin menyimpan dan memverifikasi kedua kontrol cut-off/penutupan pada UI sesuai prosedur dan kewenangan.
8. Lakukan backup pra-deploy termasuk Script Properties, bukti histori waktu, dan snapshot Sheet; tetapkan revisi deployment awal sebagai titik rollback.
9. Setelah deployment sah: uji lagi klasemen, dashboard, status cut-off yang berlaku, dan batch pembayaran historis; lakukan rollback versi deployment jika regresi.

## Batas tindakan yang dilakukan
Pengujian hanya melakukan pembacaan data produksi; tidak mengubah Sheet, Script Properties, deployment Apps Script, trigger, aturan cut-off, atau status pembayaran. Perubahan kode hanya berada pada cabang `fix/klasemen-periode-historis-20261025`.
