# PHA-07B B2 RC8.2 — Integration Engineering Report

**Date:** 2026-10-11, Asia/Jakarta. **Status:** prepared / runtime pending. **Production:** NO-GO.

## Created

- Branch `feat/pha07b2-rc82-authenticated-business-staging` derived from RC8.1 (not merged to `main`). `Kode.gs` is hard-pinned to a **new** workbook ID, and the prior RC8.1 executable module is excluded from the RC8.2 project.
- Disposable workbook: `1JcX6PLGcjf6YraMl9VO0RfjGNpwwIxSaidOvdjaZiJA` (12 tabs, synthetic-only).
- Independent original snapshot: `1FOOwBGiEl127prr8gUcbYO1qPW0vfhzwlCMqkkJlvZk`.
- New `RC82_AuthenticatedBusinessIntegration.gs` module and scenario matrix.

## Source inspection

Actual functions were located in `Kode.gs`: `cekLogin` (signed v2 sessions + PIN-v2 hash), `validasiSession`, `simpanDataKinerja`, `simpanRevisiLaporanDitolakPegawai`, and `prosesReviewAdmin`. The source also installs optional dual-write wrappers that call the RC7 canonical index guard following actual submit, revision, and review. RC8.2 tests these real function bindings **without mocking them in Apps Script**.

**Security concern (pending empirical confirmation):** Submit source reads client-supplied `paket.nama` and `paket.jabatan` to build persisted row; `hitungEvaluasiAwalSubmitKinerja_` uses `paket.jabatan` to allow automatic `Lurah` approval. The existing authentication binds `ID_USER` to the session but static inspection did not find a corresponding server-side assertion that name and role in `paket` match the session user. The RC8.2 matrix includes an attack-probe that fails closed if spoofing is accepted. This is a **potential high-severity identity/authorization gap**, not a proven runtime exploit until tested. Do **not** turn off this assertion simply to obtain PASS.

## Quality evidence

- **29/29 local VM/mock harness tests PASS** for staging checks, security gates, typed backup/restore, failure handling, and simulated positive/negative matrix paths. Mocked application handlers in these local tests do **not** count as actual Apps Script runtime evidence.
- **12/12 native Google Sheets tabs**, **425 populated/metadata positions**, **0 pre-runtime differences** against the independent clean baseline; bounded comparison covered values, effective values, display, full entered formatting, validation, notes and hyperlinks.
- No actual Apps Script RC8.2 runtime matrix or post-runtime snapshot comparison has been performed. **No acceptance claim** for actual submit/revision/review, identity defenses, or production readiness.

## Runtime protocol

1. Create **new isolated Apps Script project** using the four code files + manifest from RC8.2 branch.
2. With all write/dual-write/replay flags `false`, run `rc82ReadOnlyPreflightV1`. Stop if NOT PASS.
3. Opt in to `RC82_WRITE_DRILL_ENABLED=true` only after independent acceptance of preflight; run `rc82RunAuthenticatedMatrixV1` **once**, never deploy.
4. Inspect every gate, especially `CLIENT_ROLE_AND_NAME_SPOOF_REJECTED` and `spoofEvidence`.
5. Verify type-safe rollback against pre-drill snapshot in Google Sheets API; zero differences required.

## Risks and limitations

- Test credentials are generated internally from synthetic PINs, hashed with a stage-specific pepper, and not exposed in output; only Data_Pegawai within the disposable workbook is modified transiently.
- No externally accessible endpoint, real upload/Drive evidence, AI, third-party system, or live personal/financial data is used.
- Google Apps Script execution is not transaction-atomic; if halted before finally, an internal backup/manifest should be retained for manual recovery.
- Successful storage-level integration does not imply full PWA/HTTP or production security readiness.

**Production remains NO-GO.**