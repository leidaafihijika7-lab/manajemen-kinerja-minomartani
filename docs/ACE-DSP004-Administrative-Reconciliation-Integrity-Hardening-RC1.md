# ACE-DSP-004 — Administrative Reconciliation & Integrity Hardening RC1
Versi: ACE-DSP004-ADMIN-HARDENING-RC1-2026.10.10.01  
Status: **CANDIDATE / TIDAK DI-DEPLOY / TIDAK MENGUBAH DATA BISNIS**

## Latar belakang dan bukti

- Disposisi penerima baris **622** masih menunjuk laporan lama `4810bf4f-6cac-4a05-b75e-fdd5acb81df5`.
- Log `SUBMIT_LAPORAN` dan `BUAT_LAPORAN_DARI_DISPOSISI` sama-sama membuktikan pengiriman pada 1 Oktober 2026, 13.26 WIB.
- Versi spreadsheet pukul 13.34 WIB memiliki ID ini pada `Index_Laporan` baris 3958, tetapi `Rekap_Kinerja` baris 3958 kosong.
- Pada versi pukul 15.36 WIB, baris 3958 telah dipakai laporan lain. Sinkronisasi 2B1 berdasarkan `ROW_REKAP` mempunyai mekanisme yang **sesuai** dengan pergantian entri index. Tidak membuktikan motif/aksi spesifik pada kode.
- Maintainer telah mengonfirmasi penghapusan laporan lama secara manual melalui Google Sheets untuk meminta pegawai membuat laporan baru.
- Riwayat `LEGACY_14` punya rekaman laporan/index dan jejak pengiriman E1; jangan mengubahnya dalam patch ini.
- Pemeriksaan read-only 10 Oktober menemukan beberapa laporan berikutnya oleh pegawai pemilik `ACTIVE_622`, tetapi tidak menemukan tautan `ID_DISPOSISI` yang membuktikan mana laporan pengganti. **Tidak ada pemilihan otomatis.**

## Berkas yang diubah / ditambahkan

1. `ACEDsp004AdministrativeReconciliationRC1.gs` — diagnostik read-only, milik maintainer; memeriksa laporan lanjutan dari pegawai yang sama dalam rentang waktu tertentu, keunikan ID index, audit `SUBMIT_LAPORAN`, dan event disposisi. Tidak menampilkan nama pegawai atau isi laporan.
2. `ACEDsp004IndexIntegrityRC1.gs` — guard **fail closed** yang memeriksa sumber `Rekap_Kinerja`, ID dan pointer di baris `Index_Laporan` sebelum sebuah sinkronisasi per baris menulis. Juga fungsi pembacaan proteksi sheet inti.
3. `Kode.gs` — hanya satu panggilan `aceDsp004AssertIndexCollisionSafeRC1_(...)` sebelum `formatSatuBarisIndexLaporan2B1_` dan `setValues`, di dalam lock sinkronisasi yang sudah ada. **Jangan memindahkan guard ke setelah penulisan.**

## Pengujian sudah dilakukan (di luar Apps Script produksi)

- `validasiPengamanIndexACEDsp004RC1()`: **12/12 PASS** dalam data sintetis.
- `validasiRekonsiliasiAdministratifACEDsp004RC1()`: **11/11 PASS** dalam data sintetis.
- Unit/integrasi fungsi sinkronisasi `Kode.gs` dengan mock spreadsheet:
  - ID berbeda: ERROR `ACE_DSP004_INDEX_WRITE_BLOCKED_FOREIGN_REPORT_ID_COLLISION`, **0 operasi format, 0 tulis**, lock dilepas.
  - ID sama: sinkronisasi **1 tulis dan sukses**, lock dilepas.
- Diagnostik rekonsiliasi dengan mock: dua kandidat (owner cocok / disposisi cocok) terdeteksi; **keduanya tidak dianggap pengganti terverifikasi** dan tidak ada data ditulis.
- Pengujian di Apps Script terhadap salinan sistem **belum dilakukan**. Jangan menganggap RC1 sudah teruji di produksi.

## Jalur acceptance dan rollout

**A. Pengujian aman di salinan Apps Script (tanpa Web App deploy)**
1. Salin proyek Apps Script dan hubungkan ke **database salinan yang terisolasi**, bukan spreadsheet utama. Jangan mengaktifkan trigger di salinan.
2. Pastikan tersedia `SHEET_COLUMNS`, `pastikanMaintainerPortal3B0_`, `getSS_`, modul 2B1 dan kedua modul baru.
3. Jalankan `validasiPengamanIndexACEDsp004RC1()` (target 12/12).
4. Jalankan `validasiRekonsiliasiAdministratifACEDsp004RC1()` (target 11/11).
5. Jalankan `diagnostikRekonsiliasiAdministratifACEDsp004RC1()` (**read-only**); hasil kandidat perlu verifikasi manusia.
6. Jalankan `diagnostikProteksiSheetACEDsp004RC1()` (**read-only**) untuk melihat apakah tab utama dilindungi dari penghapusan manual.
7. Uji tabrakan dua ID berbeda pada **fixture/mock**, bukan dengan menyunting rekap/index produksi. Verifikasi terhenti sebelum penulisan dan queue ditangani sebagaimana mekanisme lama.

**B. Prasyarat mengaktifkan hardening di lingkungan produksi**
1. Code review terhadap diff `Kode.gs`, guard, dan perubahan antar-branch; tidak boleh ada kode diagnostik yang menimpa identifier produksi.
2. Verifikasi baseline BDR stabil; buat `PRE_MAINTENANCE` hanya setelah persetujuan dan rencana rollback tersedia.
3. Pastikan app version dan deployment pin sesuai roadmap. Audit smoke 68 kontrol sebagai baseline sebelum dan sesudah aktivasi.
4. Ada operator yang siap menangani antrean `Index_Laporan_Sync_Queue`: collision yang diblokir dapat masuk queue melalui *existing catch path*; jangan replay tanpa memperbaiki akar masalah.
5. Uji submit normal, review, revisi, dan proses sinkronisasi index pada salinan sebelum go-live. WRE/trigger scheduler tidak boleh digandakan.

## Dilarang pada RC1

- **Jangan** mengubah `Disposisi_Penerima!H622`, `Rekap_Kinerja`, `Index_Laporan`, `Audit_Log`, `Disposisi_Log`, review, poin final atau pembayaran secara otomatis.
- **Jangan** menganggap kecocokan pegawai/tanggal sebagai bukti bahwa sebuah laporan baru menggantikan laporan yang dihapus.
- **Jangan** menghapus event lama atau membuat log bertanggal mundur.
- **Jangan** menjadikan `ACE-DSP-004` PASS melalui pengecualian evaluator sebelum rekonsiliasi yang dapat diverifikasi.

## Pekerjaan selanjutnya

1. Dapatkan konfirmasi ID laporan pengganti yang tepat dari bukti kegiatan/pegawai dan catatan admin, jika ada.
2. Siapkan **decision record** administratif: laporan lama, referensi surat, laporan pengganti (jika terverifikasi), alasan perubahan, penanggung jawab, tanggal keputusan aktual, dampak review/tunjangan, dan rollback.
3. Setelah persetujuan dan backup terverifikasi, rancangkan koreksi referensi spesifik dengan audit append-only; RC1 ini **tidak memiliki fungsi APPLY**.
4. Lanjutkan investigasi `ACE-REV-003` setelah bukti tunjangan dan persetujuan administratif lengkap. Batch B RC2 tetap **NON_COMPLIANT** sampai acceptance test.
