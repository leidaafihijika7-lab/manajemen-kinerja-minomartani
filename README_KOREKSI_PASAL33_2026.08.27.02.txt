PORTAL KINERJA - KOREKSI LOGIKA LAPORAN WAJIB PASAL 33
APP_VERSION: 2026.08.27.02
Tanggal koreksi: 27 Agustus 2026

MASALAH
1. Laporan wajib bulanan memang melaporkan kegiatan BULAN SEBELUMNYA.
   Contoh: laporan bulan Juli dikirim pada Agustus untuk hak/review Agustus.
2. Resolver periode sebelumnya membaca bulan isi (Juli) sebagai periode asal (Juli),
   sehingga laporan 6 Agustus dianggap melewati cut-off Juli.
3. Agregasi tunjangan juga secara eksplisit mengecualikan poin laporan wajib dari
   poin produktivitas. Akibatnya POIN_FINAL Pasal 33 tidak masuk tunjangan.

KEBIJAKAN YANG DITERAPKAN
- bulanIsiLaporanWajib = M
- periodeHakPasal33 / periodeAsal / periodeReview normal = M+1
- POIN_FINAL laporan wajib yang sudah Disetujui Admin masuk poin produktivitas
- tidak ada poin Pasal 33 sintetis; yang dihitung tetap POIN_FINAL laporan yang sah

CONTOH KASUS DHANI ASTRIDA
- Bulan isi laporan: 2026-07
- Dikirim: 06/08/2026 15:56 WIB
- Periode asal yang benar: 2026-08
- Periode review yang benar: 2026-08
- Lewat periode: FALSE
- POIN_FINAL: 20 poin, masuk produktivitas Agustus

FILE YANG DIUBAH
- Kode.gs
  * APP_VERSION 2026.08.27.02
  * memasukkan POIN_FINAL laporan wajib ke poin produktivitas pada rekap tunjangan
    dan seluruh jalur estimasi dashboard terkait
- AuditPeriode.gs
  * resolver laporan wajib: bulan isi M -> periode hak M+1
- SinkronisasiCutoffPeriode.gs
  * resolver kompatibilitas menerapkan aturan yang sama
- HotfixPeriodeReviewC1c.gs
  * resolver aktif menerapkan aturan bulan isi M -> hak M+1
  * menambahkan metadata bulanIsiLaporanWajib / periodeHakPasal33
  * menambahkan uji regresi kasus Juli dilaporkan 6 Agustus
- ReviewLewatPeriode.gs
  * marker versi diperbarui; menggunakan resolver Audit yang sudah dikoreksi
- ProfilPerformaReviewAdmin3C0.gs
- OptimasiReviewAdmin3C1.gs
- OptimasiBuildReviewAdmin3C2.gs
  * APP_VERSION_EXPECTED diselaraskan ke 2026.08.27.02

FILE YANG TIDAK DIUBAH
- Index.html tidak perlu diubah. Tampilan peringatan mengikuti metadata backend.
- BindingAktif3B1B2.gs, FunctionRegistry.gs, GuardKontrakPraDeploy3B1B3.gs tidak
  diubah karena kontrak/public endpoint tidak berubah; koreksi berada pada helper
  privat dan konstanta runtime.

HASIL UJI STATIS / REGRESI
- Seluruh 17 file .gs lolos pemeriksaan sintaks JavaScript statis.
- Uji resolver C1c: VALID = TRUE.
- Kasus regresi wajib Juli dilaporkan 6 Agustus:
  periodeAsal=2026-08, periodeReview=2026-08, lewatPeriode=false,
  batas akhir periode=27/08/2026 17:30 WIB.
- Resolver Audit dan Sinkronisasi juga mengembalikan periode 2026-08 untuk kasus yang sama.

CATATAN DATA PRODUKSI PENTING
Koreksi kode TIDAK secara otomatis mengubah batch tunjangan Agustus yang sudah tersimpan/
disetujui. Pada snapshot database yang diperiksa, Dhani Astrida saat ini tercatat:
- poin_prod 83, poin_tu 50, total Rp388.800
Setelah 20 poin laporan wajib dimasukkan:
- poin_prod menjadi 103 (persentase produktivitas tetap dicap 100%)
- Rp produktivitas Rp360.000
- Rp tugas umum Rp90.000
- total yang semestinya Rp450.000
- selisih Rp61.200

Karena status batch sudah "Disetujui Lurah", koreksi data historis sebaiknya dilakukan
melalui prosedur koreksi terkontrol dan diaudit, bukan dengan edit diam-diam.
