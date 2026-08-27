PORTAL KINERJA MINOMARTANI
HOTFIX SINKRONISASI PENGATURAN PERIODE v0.1
APP_VERSION: 2026.08.27.04
Tanggal: 27 Agustus 2026

TUJUAN
Memperbaiki panel "Pengaturan Periode" pada Rekap Tunjangan agar Tanggal Mulai,
Tanggal Akhir, dan Jam Cut-off menampilkan metadata batch aktif/historis yang
sebenarnya, bukan nilai kosong/default browser.

PERUBAHAN UTAMA
1. Jika periode memiliki batch aktif, form diisi dari metadata batch:
   - tanggalMulaiPeriode
   - tanggalAkhirPeriode
   - jamCutoff / tanggalCutoff
2. Nilai default hanya dipakai jika periode belum memiliki batch.
3. Tanggal/jam tidak lagi memanggil reload saat diedit, sehingga nilai operator
   tidak langsung tertimpa sebelum disimpan/digenerate ulang.
4. Pengaturan periode dikunci pada status:
   - Dikunci Carik
   - Diajukan ke Lurah
   - Disetujui Lurah
   - Diteruskan ke Bendahara
   - Sudah Dicairkan
5. Tombol "Simpan Cut-off" disembunyikan pada status terkunci.
6. Backend menolak perubahan langsung pada batch terkunci dengan kode:
   PENGATURAN_PERIODE_TERKUNCI
7. Batch Draft dan Dikembalikan Lurah tetap dapat diedit lalu digenerate ulang.

CONTOH HASIL YANG DIHARAPKAN
Agustus 2026 (batch koreksi, Draft):
- Tanggal Mulai: 30/07/2026
- Tanggal Akhir: 27/08/2026
- Jam Cut-off: 17:30:00
- Form masih dapat diedit karena status Draft.

Juli 2026 (Disetujui Lurah):
- Tanggal Mulai: 30/06/2026
- Tanggal Akhir: 29/07/2026
- Jam Cut-off: 16:00:00
- Form terkunci dan tombol Simpan Cut-off tidak tersedia.

FILE APPS SCRIPT YANG DIGANTI DARI v2026.08.27.03
1. Kode.gs
2. Index.html
3. FunctionRegistry.gs
4. BindingAktif3B1B2.gs
5. GuardKontrakPraDeploy3B1B3.gs
6. ProfilPerformaReviewAdmin3C0.gs
7. OptimasiReviewAdmin3C1.gs
8. OptimasiBuildReviewAdmin3C2.gs

VALIDASI SETELAH COPY FILE DAN SAVE
1. Jalankan validasiGuardKontrakPraDeploy3B1B3
   Harapan: valid=true, keputusan=ALLOW, bolehDeploy=true, jumlahBlocker=0.
2. Deploy sebagai New version pada deployment Web App yang sama.
3. Ctrl+F5 Portal Kinerja.
4. Cek Agustus 2026: 30/07/2026 - 27/08/2026 - 17:30:00.
5. Cek Juli 2026: 30/06/2026 - 29/07/2026 - 16:00:00, form terkunci.

CATATAN
Hotfix ini tidak mengubah poin, nominal tunjangan, status review laporan, ataupun
batch tunjangan saat source dipasang/deploy. Perubahan data hanya terjadi bila
operator menjalankan aksi yang memang menulis data dan lolos proteksi status.
