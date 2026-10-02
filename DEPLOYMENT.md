# Deployment — Monthly Archive v1.0 RC1 — `2026.10.02.04`

Stable Baseline / rollback: `2026.10.02.03`.

## File Apps Script

Tambahkan:
- `MonthlyArchiveV10.gs`

Ganti dari paket:
- `Kode.gs`
- `Index.html`
- `MonthlyClosingV10.gs`
- `FrontendIntegrityGuardV10.gs`
- `FunctionRegistry.gs`
- `BindingAktif3B1B2.gs`
- `GuardKontrakPraDeploy3B1B3.gs`

## Validasi pra-deploy

1. `validasiMonthlyArchiveV10()` → `14/14`.
2. `validasiMonthlyClosingV10()` → `12/12` (frozen RC2).
3. `validasiProductionSmokeFrontendV10()` → `7/7`, `ALLOW`.
4. `validasiBindingAktif3B1B2()` → `183/183`, checksum cocok.
5. `validasiGuardKontrakPraDeploy3B1B3()` → `ALLOW`, blocker `0`.

Deploy sebagai **New version** pada deployment yang sama, lalu hard refresh.

## Acceptance awal

Gunakan mode read-only. Buka Arsip Bulanan September 2026. Jika batch masih `Dikunci Carik`, halaman harus menunjukkan `BELUM SIAP` dengan blocker pencairan dan tombol Buat Arsip Final disabled. Jangan mengubah workflow tunjangan hanya untuk testing.

Saat batch secara sah sudah `Sudah Dicairkan`, status akan menjadi `SIAP DIARSIPKAN` dan aksi pembuatan arsip final dapat dilakukan oleh Lurah/Carik.
