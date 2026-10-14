# RC8.1 — Evidence & Acceptance Ledger

Status evaluasi: **PERSIAPAN STAGING + LOCAL QA PASS; APPS SCRIPT RUNTIME PENDING; PRODUCTION NO-GO**.

## Riwayat masalah yang diperbaiki

RC8 V1: tiga proxy penyimpanan dilaporkan selesai tetapi `RC8_ROLLBACK_READBACK_MISMATCH` karena `Range.setValues()` mengubah tanggal/periode teks menjadi nilai tanggal/serial dan meninggalkan format pada sel kosong. Database staging RC8 asli dipulihkan dan menerima audit pemulihan; V1 tetap `NOT_ACCEPTED`.

## Lingkungan terpisah

| Jenis | Google ID / ref |
|---|---|
| RC8.1 disposable (target tunggal) | `1Ub4d0brD-JcAokxysGFQM1rBc0cbewvGgGWPwagQqOM` |
| Snapshot eksternal baru | `15DnT0mqmx2IoTLYMHsoj34nXySR8zIo4lqrzk9gPpqk` |
| Branch kandidat | `feat/pha07b2-rc81-typesafe-staging` |
| Dasar branch | `feat/pha07b2-rc8-business-staging` |

Workbook RC8.1 adalah salinan snapshot RC8 yang sudah pulih. Penanda `STAGE_RC81_TYPESAFE_DISPOSABLE`, `RC81_DISPOSABLE_WRITES_REQUIRE_EXPLICIT_OPT_IN`, `RC81_SPREADSHEET_ID` dan larangan trigger/deploy sudah dicatat di tab `MULAI_DI_SINI`.

## Hasil yang benar-benar sudah dieksekusi

1. **27/27 pengujian mock Node.js PASS**: kontrol lingkungan, penolakan target produksi/salah ID, dua flag produksi nonaktif, preflight tipe tanggal, kewajiban opt-in, keempat skenario proxy+fault, idempotensi, pengembalian properties, deteksi recovery tertinggal, pemulihan manual, penolakan backup hilang, kontensi ScriptLock, penolakan trigger dan konsumsi flag.
2. **Uji metode Google Sheets native CopyPaste PASS**: pada **workbook RC8.1 saja**, data indeks `D2/E2/K2` diubah menjadi angka serial dan `A4` diberi angka. Sebelumnya `Index_Laporan!A2:L4` disalin ke sheet bantu internal via `PASTE_NORMAL`; kemudian rentang dipulihkan dengan operasi `PASTE_NORMAL` ke asal. Readback `userEnteredValue`, `effectiveValue`, `formattedValue`, `userEnteredFormat.numberFormat`, dan `dataValidation` dibandingkan dengan snapshot independen: **0 perbedaan pada 36 sel**. Sheet bantu probe telah dihapus.
3. Spreadsheet baru beserta snapshot eksternal dibuat dan ID-nya diverifikasi. Dua baris indeks tetap menyimpan `TERAKHIR_DIUBAH` dan `INDEX_VERSION` yang sesuai. Antrian baseline tetap kosong.

**Belum dieksekusi:** `rc81ReadOnlyPreflightV1()` dan `rc81RunTypeSafeMatrixV1()` pada runtime Google Apps Script yang baru. Jangan mengklaim penerimaan RC8.1 sebelum ada log runtime dan perbandingan external snapshot setelahnya.

## Mekanisme pengamanan V2

- Satu `ScriptLock` membungkus seluruh matriks dan callback inti RC7 tanpa lock bertingkat.
- Empat snapshot native untuk setiap skenario dengan backup sheet tersembunyi berawalan `__RC81_BK_`; marker persistent di `RC81_RECOVERY_PENDING` ditulis **sebelum** perubahan data.
- Simulasi storage: submit row-4 → revisi row-2 → review admin row-2; tiga fault injection menginterupsi pada batas yang berbeda; semua bagian harus rollback.
- Pemulihan memakai `Range.copyTo(...PASTE_NORMAL)` untuk data, format, formula, dan validation. Mengembalikan dua metadata script properties dan memverifikasi readback typed/date/number/format, source/index/queue/audit baseline.
- Snapshot internal hanya dihapus setelah rollback terverifikasi; jika tidak, ditahan untuk recovery manual dan pelaksanaan ulang diblokir.
- Opt-in one-shot `RC81_WRITE_DRILL_ENABLED` dimatikan setelah menjalankan matriks dan juga saat lock gagal atau adanya recovery pending.
- `ScriptApp.getProjectTriggers()` diperiksa; tidak ada trigger atau deployment yang dibuat.

## Caveat audit

`getValues()/getNumberFormats()/getFormulas()/getDisplayValues()/getNotes()/getDataValidations()` membuktikan banyak atribut, tetapi belum seluruh metadata Google Sheets (misalnya seluruh representasi rich-text/chip, formatting kompleks). Oleh karena itu setelah matrix runtime wajib readback eksternal menggunakan Google Sheets `get_spreadsheet_cells` serta pembandingan dengan snapshot independen sebelum acceptance. Matrix bukan endpoint bisnis yang menguji autentikasi, audit/otorisasi produksi, unggah berkas atau external service.

## Keputusan

- **Staging packaging:** GO untuk pembuatan proyek Apps Script RC8.1 yang terisolasi.
- **Write drill:** hanya setelah `rc81ReadOnlyPreflightV1` PASS dan opt-in eksplisit.
- **Production merge / trigger / deployment:** **NO-GO**.