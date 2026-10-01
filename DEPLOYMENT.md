# Deployment — 2026.10.01.02

1. Ganti 6 source file yang tercantum pada `PANDUAN_PEMASANGAN.txt`.
2. Jalankan `getAppVersion()` → `2026.10.01.02`.
3. Jalankan `validasiReviewCenterAdminV10()` → 12/12.
4. Jalankan `validasiBindingAktif3B1B2()` → 178/178 + checksum cocok.
5. Jalankan `validasiGuardKontrakPraDeploy3B1B3()` → ALLOW, blocker 0.
6. Update deployment Web App yang sama ke New version.
7. Hard refresh dan acceptance test Pusat Review.

Rollback pra-retirement: `2026.09.30.03`. Stable baseline: `2026.09.30.01`.
