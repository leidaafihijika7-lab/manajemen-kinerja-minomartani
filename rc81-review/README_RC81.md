# PHA-07B B2 RC8.1 — Type-Safe Storage Integration & Rollback Validation

**Status:** kandidat siap untuk pemeriksaan runtime Apps Script terisolasi. **BUKAN** perubahan produksi dan belum `ACCEPTED` sebelum log runtime + perbandingan snapshot eksternal lulus.

## Tujuan

Memperbaiki kegagalan rollback RC8 V1 yang mengubah teks tanggal/periode menjadi angka serial dan meninggalkan format sel di baris pengujian. RC8.1 menggunakan snapshot **native CellData** yang disimpan sebagai lembar bantu tersembunyi di workbook disposable, kemudian memulihkan memakai `Range.copyTo(..., SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false)`, **bukan** `setValues()`.

Satu langkah setelah rollback membandingkan `getValues` beserta tipe `Date/string/number`, `getDisplayValues`, `getNumberFormats`, `getFormulas`, `getNotes`, dan keberadaan/jenis validasi sel. Seusai runtime, perbandingan snapshot **Google Sheets API** tetap wajib sebagai bukti independen `userEnteredValue`, `effectiveValue`, `formattedValue`, `userEnteredFormat`, dan `dataValidation`.

## Target yang telah dibuat dan diverifikasi

- Workbook **khusus RC8.1**: [SANDBOX_PHA07B_B2_RC8_1_TYPESAFE_DISPOSABLE_20261011](https://docs.google.com/spreadsheets/d/1Ub4d0brD-JcAokxysGFQM1rBc0cbewvGgGWPwagQqOM/edit)
- Snapshot eksternal sebelum pengujian: [SNAPSHOT_PHA07B2_RC8_1_BASELINE_BEFORE_TYPE_SAFE_DRILL_20261011](https://docs.google.com/spreadsheets/d/15DnT0mqmx2IoTLYMHsoj34nXySR8zIo4lqrzk9gPpqk/edit)
- Branch GitHub: [feat/pha07b2-rc81-typesafe-staging](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/tree/feat/pha07b2-rc81-typesafe-staging)

**Jangan gunakan** spreadsheet B2 read-only, RC5/RC6, RC8 asli, atau database Portal Kinerja produksi sebagai target pengujian ini.

## Buat proyek Apps Script baru

Nama yang disarankan: `Portal Kinerja - PHA07B2 RC8.1 Staging`.

Salin dari branch RC8.1 **hanya** file Apps Script berikut:

1. `Kode.gs` (harus dari branch RC8.1, bukan `main`; `getSS_()` dipatok ke ID workbook RC8.1, `doGet()` tetap dinonaktifkan)
2. `SheetSchema.gs`
3. `IndexQueueGuardRC7.gs`
4. `RC81_TypeSafeStorageValidation.gs`
5. Manifest `appsscript.json` dari branch RC8.1 (lihat opsi **Show "appsscript.json" manifest file** pada Project Settings).

File RC8 V1 (`RC8_StagingAcceptance.gs`) **tidak** diinstal pada proyek RC8.1.

Jangan menyalin Script Properties, credentials, user data, API key, trigger, deployment, maupun konfigurasi Drive dari produksi atau RC8.

### Script Properties RC8.1

| Property | Nilai |
|---|---|
| `RC81_STAGING_MODE` | `true` |
| `SPREADSHEET_ID` | `1Ub4d0brD-JcAokxysGFQM1rBc0cbewvGgGWPwagQqOM` |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |
| `RC81_WRITE_DRILL_ENABLED` | `false` |

`RC8_STAGING_MODE` harus **tidak ada atau `false`**. Jangan mengisi property `RC81_RECOVERY_PENDING` secara manual.

## Eksekusi berurutan

**1. Read-only preflight**

Simpan, pilih `rc81ReadOnlyPreflightV1`, dan jalankan. Target: `PHA07B2_RC81_PREFLIGHT` dengan `status=RC81_PREFLIGHT_PASS`, source=2, index=2, queue=0, audit=2, triggers=0, `issues=[]`, dan `writesPerformed=0`. Jika belum PASS, **berhenti**.

**2. Matrix tipe-aman, hanya setelah preflight PASS**

Ubah **hanya** `RC81_WRITE_DRILL_ENABLED` menjadi `true`, simpan, lalu jalankan **sekali** `rc81RunTypeSafeMatrixV1`. Fungsi akan otomatis mengembalikan opt-in ke `false` setelah eksekusi normal maupun kegagalan dalam matriks.

Diharapkan `PHA07B2_RC81_MATRIX`:

- `status=RC81_TYPE_SAFE_STORAGE_PASS`
- `casesExpected=4`, `casesExecuted=4`, `passed=4`, `failed=0`
- `rollbackRestored=true`, `postPreflight=RC81_PREFLIGHT_PASS`
- Tiga kegagalan `RC81_INJECTED_AFTER_SUBMIT/REVISION/REVIEW` terjadi **sesuai rencana**, kemudian rollback lulus.
- Skenario normal mencatat `IDEMPOTENCE_VERIFIED`.

Simulasi menulis ke workbook disposable, bukan ke produksi. Pengujian memakai inti RC7 (`rc7WriteIndexLocked_`) dan `ScriptLock` nyata; **bukan** eksekusi penuh API submit, revisi atau review pengguna.

**3. Pemeriksaan sesudah matrix**

Jalankan lagi `rc81ReadOnlyPreflightV1`. Setelah log diterima, bandingkan workbook RC8.1 terhadap snapshot eksternal pada seluruh area terpengaruh secara native (nilai bertipe, format, validasi); perbedaan harus **0**. Jangan menilai lulus hanya dari preflight.

## Ketika ada kegagalan atau interupsi

- Segera pastikan `RC81_WRITE_DRILL_ENABLED=false`.
- **Jangan ulangi** `rc81RunTypeSafeMatrixV1` pada workbook yang sama.
- Jika `RC81_RECOVERY_PENDING` dan lembar bantu tersembunyi `__RC81_BK_...` masih ada, gunakan `rc81RecoverPendingV1` pada proyek RC8.1 **setelah meninjau log**. Fungsi ini menyalin data dari backup native di workbook yang sama dengan `ScriptLock` dan memverifikasi hasil sebelum menghapus backup.
- Jika manifest rusak, backup hilang, atau pemulihan gagal, **jangan** menghapus cadangan atau mencoba sinkronisasi. Gunakan snapshot eksternal dan audit manual.
- Jika rollback lulus, fungsi seharusnya menghapus snapshot internal dan marker pemulihan. Snapshot eksternal tetap dipertahankan.
- Pemulihan `finally` tidak menjamin transaksi atomik bila Apps Script dihentikan secara paksa.

## Batas kinerja & keputusan

Uji memakai dua laporan B0 sintetis, bukan seluruh tabel atau endpoint otorisasi/unggah produksi. RC8.1 **belum** membuktikan performa beban besar, idempotensi antrean nyata pada semua jalur, kegagalan infrastruktur di luar kontrol, atau recovery bersamaan. Tidak ada pemindahan patch ke `main`, tidak ada deployment dan trigger. Keputusan deployment produksi: **NO-GO** sampai audit integrasi bisnis dan penerimaan tahapan berikutnya selesai.