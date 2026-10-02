# Deployment — Monthly Closing v1.0 — `2026.10.02.02`

Baseline: `2026.10.02.01`.

1. Tambahkan `MonthlyClosingV10.gs`.
2. Ganti `Kode.gs`, `Index.html`, `FrontendIntegrityGuardV10.gs`, `FunctionRegistry.gs`, `BindingAktif3B1B2.gs`, `GuardKontrakPraDeploy3B1B3.gs`.
3. `validasiMonthlyClosingV10()` → `12/12`.
4. `validasiProductionSmokeFrontendV10()` → `7/7`, `ALLOW`.
5. `validasiBindingAktif3B1B2()` → `180/180`.
6. `validasiGuardKontrakPraDeploy3B1B3()` → `ALLOW`, blocker `0`.
7. Deploy New version pada deployment yang sama.
8. Hard refresh.
9. Acceptance read-only: login → Penutupan Bulan → muat periode yang sudah ditutup → shortcut → logout/login.

**Jangan menutup periode aktif hanya untuk acceptance test.** Tombol Tutup Periode adalah write produksi nyata.

Rollback: `2026.10.02.01`.
