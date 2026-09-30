# Deployment kandidat 2026.09.30.01 — OHIC v1.0.1 Maintenance Hardening

Baseline langsung: 2026.09.28.04. Baseline stabil rollback: 2026.09.28.03.

Tambahkan `MaintenanceOHICV101.gs`, ganti Kode/Index/OperationalHealth/Registry/Binding/Guard dari paket. Validasi 177/177 dan guard ALLOW sebelum deployment. Cleanup metadata batch residu harus tetap diblokir selama batch September belum snapshot final.

# Deployment kandidat 2026.09.28.04 — Operational Health & Integrity Center v1.0-RC1

Baseline produksi stabil sebelum perubahan ini adalah **2026.09.28.03**.
Kandidat ini menambahkan pusat kesehatan sistem baca-saja dan tidak mengubah schema
spreadsheet, aturan tunjangan, Timeline v0.2, status review, poin, atau workflow
pembayaran.

Baca `../PANDUAN_PEMASANGAN.txt` pada paket OHIC untuk urutan lengkap.

## Berkas yang berubah dari baseline 2026.09.28.03

Ganti seluruh isi:
- `Kode.gs`
- `Index.html`
- `FunctionRegistry.gs`
- `BindingAktif3B1B2.gs`
- `GuardKontrakPraDeploy3B1B3.gs`

Tambahkan:
- `OperationalHealthV10.gs`

Berkas aplikasi lain dari baseline stabil tetap dipertahankan, termasuk
`TimelineV02.gs`, `TarifTunjanganV03.gs`, `CakupanTunjanganV02.gs`, dan seluruh
validator yang sudah lulus pada 2026.09.28.03.

## Validasi sebelum deployment

1. `getAppVersion()` -> `2026.09.28.04`.
2. `validasiBindingAktif3B1B2()` -> 177 kontrak cocok.
3. `validasiGuardKontrakPraDeploy3B1B3()` -> keputusan `ALLOW`, blocker 0.
4. Buka halaman **Kesehatan Sistem** dengan akun Lurah/Carik dan klik
   **Periksa Sekarang**. Halaman bersifat baca-saja; warning adalah temuan
   operasional, bukan alasan untuk mengedit data secara manual.
5. Lakukan smoke test Timeline, Dashboard Admin Kinerja, dan Rekap Tunjangan tanpa
   menjalankan ulang Draft/pembayaran hanya demi menguji OHIC.

## Deployment

Gunakan deployment Web App yang sudah ada agar URL tetap sama:
`Deploy > Manage deployments > deployment aktif > Edit > New version > Deploy`.
Catat nomor versi Apps Script sebelum dan sesudah deployment.

## Pemulihan

Jika terjadi regresi UI/runtime, arahkan deployment kembali ke versi Apps Script
yang memuat baseline `2026.09.28.03`. OHIC v1.0 tidak memiliki migrasi data, jadi
rollback kode tidak membutuhkan rollback spreadsheet.

## Catatan keamanan

Endpoint OHIC memeriksa sesi dan kewenangan Lurah/Carik. Respons UI tidak memuat
PIN, salt PIN, token sesi, checksum/hash sumber, atau fingerprint guard. Jangan
menambahkan fungsi koreksi otomatis ke OHIC v1.0; koreksi tetap melalui modul
resmi dan prosedur audit yang sesuai.
