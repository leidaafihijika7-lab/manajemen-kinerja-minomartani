KOREKSI BATCH TUNJANGAN v0.1
Portal Kinerja APP_VERSION 2026.08.27.03

Tujuan:
- Menyelaraskan batch tunjangan yang sudah Disetujui Lurah tetapi belum diteruskan/dicairkan dengan hasil hitung ulang terbaru.
- Menjaga batch lama sebagai arsip (is_active=FALSE), bukan mengubah nominal persetujuan lama.
- Membuat batch pengganti berstatus Draft dan mencatat KOREKSI_BATCH_TUNJANGAN pada Audit_Tunjangan.

Proteksi:
- Hanya Carik dapat membuat koreksi.
- Hanya status Disetujui Lurah yang dapat dikoreksi.
- Koreksi ditolak bila batch sudah diteruskan ke Bendahara atau sudah dicairkan.
- Backend memblokir Teruskan ke Bendahara bila preview hitung ulang masih berbeda.
- Batch lama dipulihkan menjadi aktif bila aktivasi batch pengganti gagal.

Koreksi dokumen ekspor (berdasarkan audit PDF Agustus 2026):
- Redaksi Keterangan #1 disesuaikan: dasar cut-off adalah waktu kirim/revisi pegawai, dengan syarat telah disetujui Admin saat rekap dibuat.
- Kolom Jabatan diberi wrap/auto-height agar jabatan panjang tidak terpotong saat dicetak/diubah menjadi PDF.
- Nilai dan total dokumen mengikuti batch aktif hasil koreksi.

Kasus Agustus 2026 yang diharapkan:
- Artono: Rp376.200 -> Rp423.000
- Heri Suranto: Rp487.080 -> Rp495.000
- Dhani Astrida: Rp388.800 -> Rp450.000
- Total: Rp5.354.292 -> Rp5.470.212
- Selisih: Rp115.920

Alur operasi:
1. Buka Rekap Tunjangan Agustus.
2. Jika preview mendeteksi perbedaan, tombol Koreksi Batch tampil dan Teruskan disembunyikan.
3. Klik Koreksi Batch, periksa preview, isi alasan, dan konfirmasi.
4. Sistem membuat batch pengganti sebagai Draft.
5. Ulangi workflow: Kunci Carik -> Ajukan ke Lurah -> Disetujui Lurah.
6. Baru Teruskan ke Bendahara.
