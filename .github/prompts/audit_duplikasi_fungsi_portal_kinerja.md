# Audit Duplikasi Fungsi — Portal Kinerja Minomartani

Tanggal audit: 2026-06-03
File dianalisis: `Kode.gs`, `Index.html`, `SheetSchema.gs`

## Ringkasan

- Total fungsi terdeteksi: ±1.030 deklarasi fungsi.
- Duplikasi nama fungsi terdeteksi: 29 nama fungsi.
- Duplikasi yang berisiko tinggi terutama berada di `Kode.gs` karena berada pada konteks backend/global Apps Script.
- Duplikasi di `Index.html` yang perlu dibersihkan: `muatTindakLanjutKoreksiCutoffUI`.
- Beberapa duplikasi tampak aman karena fungsi berada di konteks berbeda: frontend vs backend, atau helper lokal di dalam fungsi.

## Prioritas A — Wajib distabilkan lebih dulu

| Fungsi | Lokasi | Rekomendasi | Alasan |
|---|---|---|---|
| `evaluasiCutoffLaporan_` | `Kode.gs` baris 2121, 9927, 10197, 10569, 11461, 13815 | Pertahankan versi final baris 13815–13834. Hapus/arsipkan versi lama setelah tes submit, review, riwayat, dan tunjangan. | Versi final menyatakan cut-off waktu lapor tidak lagi menjadi dasar hukuman status/poin dan hanya memakai meta admin tersimpan untuk informasi tampilan. |
| `statusReviewLewatCutoff_` | `Kode.gs` baris 2067, 11453, 13867 | Pertahankan versi final baris 13867–13869, tetapi beri komentar `DEPRECATED_COMPAT_WRAPPER`. | Nama fungsi masih “LewatCutoff” tetapi hasilnya `REVIEW_STATUS.DISETUJUI`; ini berisiko membingungkan developer berikutnya. |
| `isStatusLewatCutoff_` | `Kode.gs` baris 2071, 11457, 13873 | Pertahankan final baris 13873–13875. Untuk audit historis gunakan fungsi khusus seperti `isStatusDisetujuiLewatCutoffLama_`. | Versi final sengaja tidak memakai status lewat cut-off untuk logika hukuman. |
| `catatanLewatCutoff_` | `Kode.gs` baris 2140, 11479, 13877 | Pertahankan final baris 13877–13879 atau hapus jika tidak ada caller aktif. | Final mengosongkan catatan cut-off. |
| `gabungCatatanCutoff_` | `Kode.gs` baris 2146, 11483, 13881 | Pertahankan final baris 13881–13883 atau hapus jika caller aktif sudah diganti. | Final tidak menambah catatan “Lewat cut-off”. |
| `koreksiLaporanLewatCutoffApril2026` | `Kode.gs` baris 2175, 9975, 13895 | Pertahankan final baris 13895–13901 yang menonaktifkan koreksi lama. | Versi lama bisa mengubah status/poin massal. |
| `koreksiLaporanLewatCutoffPeriode_` | `Kode.gs` baris 2179, 13886 | Pertahankan final baris 13886–13893 yang menolak koreksi massal lama. | Menghindari perubahan otomatis status menjadi “Lewat Cut-off” dan poin 0. |
| `koreksiLaporanBlackoutCutoffApril2026_` | `Kode.gs` baris 9979, 13903 | Pertahankan final baris 13903–13909 yang menonaktifkan koreksi blackout lama. | Audit historis sebaiknya terpisah dan tidak mengubah pencairan lama. |
| `statusInputLaporanCutoffSaatIni_` | `Kode.gs` baris 10133, 10807, 13917 | Pertahankan final baris 13917–13950, tetapi audit ulang relasinya dengan `simpanLockInputLaporanPeriode_`. | Final memakai meta admin tersimpan dan menghindari default/hard-code lama. |
| `metaCutoffTunjanganTersimpan_` | `Kode.gs` baris 10099, 13756 | Pertahankan final baris 13756–13776. | Final tidak lagi menyisipkan hard-code April 2026 atau default tanggal 25/26. |
| `kandidatMetaCutoffUntukTanggalReview_` | `Kode.gs` baris 10529, 13780 | Pertahankan final baris 13780–13811. | Final hanya membaca meta admin tersimpan dan tidak memicu hukuman nilai/poin. |
| `evaluasiPeriodePelaksanaanReviewAdmin_` | `Kode.gs` baris 10634, 13838 | Pertahankan final baris 13838–13856. | Final tidak otomatis membuat poin 0 saat periode pelaksanaan tertutup. |
| `catatanPeriodePelaksanaanDitutup_` | `Kode.gs` baris 10674, 13858 | Pertahankan final baris 13858–13860. | Final menghilangkan catatan penalti otomatis. |
| `gabungCatatanPeriodePelaksanaanDitutup_` | `Kode.gs` baris 10679, 13862 | Pertahankan final baris 13862–13864. | Final menjaga catatan lama tanpa menambah penalti periode tertutup. |

## Prioritas B — Perlu dirapikan, tetapi risiko lebih terkendali

| Fungsi | Lokasi | Rekomendasi | Alasan |
|---|---|---|---|
| `simpanCutoffInputLaporanPeriode` | `Kode.gs` baris 10170, 10841 | Pertahankan versi baris 10841–10867. | Versi baru mencatat `lockInput` lewat `simpanLockInputLaporanPeriode_`; versi lama belum. |
| `rentangPeriodeTunjanganUntukDashboard_` | `Kode.gs` baris 10405, 11777 | Pertahankan versi baris 11777–11827. | Komentar menyebut sengaja ditempatkan setelah definisi lama untuk menimpa dan memperbaiki info cut-off periode sebelumnya. |
| `parsePeriodeBulan_` | `Kode.gs` baris 7758, 10478 | Pertahankan versi baris 10478–10500. | Versi baru mengikuti rentang periode tunjangan/cut-off, bukan kalender murni. |
| `periodeDariTanggalLaporan_` | `Kode.gs` baris 2115, 10457 | Pertahankan versi baris 10457–10476. | Versi baru menentukan periode efektif berdasarkan rentang cut-off tunjangan. |
| `parseJamCutoffTunjangan_` | `Kode.gs` baris 1940, 9892 | Pertahankan salah satu saja. Secara logika hampir sama; pilih versi baris 9892–9909 karena lebih ringkas dan dekat dengan patch April 2026. | Duplikasi tidak perlu karena isi fungsi hampir identik. |
| `aturCutoffTunjanganApril2026` | `Kode.gs` baris 2154, 9952 | Pertahankan versi baris 9952–9973 jika kebijakan April 2026 masih perlu histori. Jika tidak, pindahkan ke `LegacyMaintenance.gs`. | Fungsi ini spesifik sekali untuk April 2026, bukan fungsi operasional harian. |
| `metaCutoffTunjanganApril2026_` | `Kode.gs` baris 2079, 9911 | Hapus salah satu karena identik. | Tidak perlu dua definisi sama. |
| `buildAdminCoreDetailFromRow_` | `Kode.gs` baris 6723, 10220 | Pertahankan versi baris 10220–10241. | Versi v26 hotfix memastikan kolom K-Q dikirim ke frontend. |
| `buildAdminSpreadsheetDetailFromRow_` | `Kode.gs` baris 6606, 10243 | Pertahankan versi baris 10243–10333, tetapi cek apakah field dari versi 6606–6720 ada yang hilang. | Versi v26 memprioritaskan detail K-Q dan menambah detail AD-BQ yang tidak duplikat. |
| `cekBolehRevisiLaporanPegawai_` | `Kode.gs` baris 5479, 12259 | Pertahankan versi baris 12259–12290. | Versi baru memberi kode error (`NOT_OWNER`, `NOT_REJECTED`, `PERIODE_LEWAT_CUTOFF`, `BOLEH`) yang lebih baik untuk frontend. |

## Prioritas C — Duplikasi rendah risiko / perlu dokumentasi saja

| Fungsi | Lokasi | Rekomendasi | Alasan |
|---|---|---|---|
| `muatTindakLanjutKoreksiCutoffUI` | `Index.html` baris 12475, 12608 | Pertahankan versi baris 12608–12627. Hapus versi lama baris 12475–12521. | Versi baru mendukung `appendMode`, `offset`, dan `limit` agar tidak melewati batas eksekusi Apps Script. |
| `ajukanTunjanganKeLurah` | `Kode.gs` baris 2697 dan `Index.html` baris 7927 | Tidak perlu dianggap konflik teknis karena satu fungsi backend dan satu fungsi frontend. Opsional rename frontend menjadi `ajukanTunjanganKeLurahUI`. | Nama sama lintas konteks bisa membingungkan saat pencarian kode, tetapi tidak saling menimpa. |
| `normalisasiJenisTugasPimpinan_` | `Kode.gs` baris 1044 dan `Index.html` baris 6067 | Aman secara runtime karena backend/frontend terpisah. Opsional rename frontend menjadi `normalisasiJenisTugasPimpinanClient_`. | Menghindari kebingungan saat refactor. |
| `add_` | `Kode.gs` baris 10609 dan 11738 | Biarkan atau rename helper lokal menjadi lebih spesifik. | Keduanya helper lokal di dalam fungsi berbeda, bukan global. |
| `normMonth_` | `Kode.gs` baris 11080 dan 14096 | Biarkan atau pindahkan menjadi util tunggal `normalizeMonthValue_`. | Keduanya helper lokal dengan isi hampir sama. |

## Urutan eksekusi pembersihan yang disarankan

1. Buat salinan/tag baseline: `v2026.06.03-before-dedup`.
2. Jangan hapus langsung. Tambahkan komentar `DEPRECATED - replaced by line ...` pada versi lama.
3. Tes lima alur utama: login, submit laporan, review admin, riwayat/revisi, tunjangan, disposisi.
4. Setelah tes lulus, hapus fungsi lama dan pindahkan fungsi historis April/Mei 2026 ke `LegacyMaintenance.gs`.
5. Setelah backend stabil, baru pecah file menjadi modul `Cutoff.gs`, `ReviewAdmin.gs`, `Tunjangan.gs`, `Disposisi.gs`, dan `Utils.gs`.

## Catatan arsitektur penting

Duplikasi terbesar bukan sekadar masalah estetika kode. Pada Apps Script/JavaScript, fungsi global dengan nama sama akan membuat definisi yang lebih akhir menimpa definisi sebelumnya. Karena itu, project ini saat ini bergantung pada urutan patch. Ini masih bisa berjalan, tetapi rawan saat file dipindah ke GitHub/clasp atau dipecah menjadi beberapa file.
