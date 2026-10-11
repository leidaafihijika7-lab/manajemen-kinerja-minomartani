# PHA-07B B2 RC8.2 — Owner Revision Diagnostic (isolated second run)

**Status: DIAGNOSTIC CANDIDATE / PENDING NEW APPS SCRIPT RUNTIME. Production: NO-GO.**
**ORIGINAL RC8.2 MATRIX FAILED 15/16. THIS DIAGNOSTIC IS A NEW DISPOSABLE WORKBOOK, NOT A RE-RUN OF THE ORIGINAL.** Original rollback was verified (425 checked cell positions, zero differences). The next matrix has an added `ownerRevisionEvidence` field to identify which of the owner revision predicates failed. The spoof security probe is still not accepted until separately observed. Runtime diagnostic has not yet run.


This stage calls **actual server-side application functions**: `cekLogin`, `validasiSession`, `cekHakAksesAdmin`, `simpanDataKinerja`, `simpanRevisiLaporanDitolakPegawai`, and `prosesReviewAdmin` from `Kode.gs`. It is not an HTTP/PWA or file-upload end-to-end test; do not deploy the web app.

## Isolated assets

- **Disposable**: https://docs.google.com/spreadsheets/d/1nIH0dCUs5SduXGNsEI-flKX1nGcfAA3Gufr2Q7OpTTM/edit
- **Independent pre-test snapshot**: https://docs.google.com/spreadsheets/d/1UAVSb7ViT6IjkJb5KxcWekdqgQGD0EKmeh5X25ZihAw/edit
- **GitHub branch**: https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/tree/feat/pha07b2-rc82-revision-diagnostics

12 tabs are present: 10 existing synthetic B0 tabs plus **Data_Pegawai** (headers only, no accounts) and **Disposisi_Petugas** (headers only). There is no real citizen, staff, production, or account data. At the time this report was prepared, all 12 tabs matched the independent snapshot in bounded CellData comparisons: 425 nonempty/metadata positions and zero differences.

## New Apps Script project (required)

Create **`Portal Kinerja - PHA07B2 RC8.2 Revision Diagnostic`**, separate from RC8/RC8.1 and production. Copy **from the RC8.2 branch only**:

1. `Kode.gs` (full file with `getSS_()` hard-pinned to the RC8.2 disposable ID and `doGet` disabled)
2. `SheetSchema.gs`
3. `IndexQueueGuardRC7.gs`
4. `RC82_AuthenticatedBusinessIntegration.gs`
5. `appsscript.json` (V8, timezone `Asia/Jakarta`, spreadsheets/script.scriptapp permissions).

The `RC82_AuthenticatedBusinessIntegration.gs` in this diagnostic branch must contain version `PHA07B2-RC82-REVISION-DIAG-2026.10.11.2` and the new workbook hard-pin. Do not copy the similarly named file from the original RC8.2 branch.

**DO NOT COPY** `RC81_TypeSafeStorageValidation.gs`, `RC8_StagingAcceptance.gs`, `rc7-review/Kode_RC7_Bridge_Patch.js`, scripts from production, secrets, credentials, deployments, triggers, or any Script Properties from existing projects.

### New project Script Properties

| Property | Value |
|---|---|
| `RC82_STAGING_MODE` | `true` |
| `SPREADSHEET_ID` | `1nIH0dCUs5SduXGNsEI-flKX1nGcfAA3Gufr2Q7OpTTM` |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |
| `RC82_WRITE_DRILL_ENABLED` | `false` |

Leave `RC8_STAGING_MODE` / `RC81_STAGING_MODE` absent or `false`. **Do not set `PIN_PEPPER`, `FOLDER_ID_BUKTI_KINERJA`, `FOLDER_ID_BUKTI`, `API_KEY_GEMINI`, or `RC82_RECOVERY_PENDING`.** The isolated harness generates a strong random test pepper and temporary synthetic PINs internally during an explicitly authorized matrix run, then clears the test data and properties. No PIN or session token is logged or returned.

### Step 1 — read-only gate

Run **`rc82ReadOnlyPreflightV1`**, **not** the matrix. Expected `PHA07B2_RC82_PREFLIGHT` status `RC82_PREFLIGHT_PASS`, 2 source rows, 2 index rows, 2 audit rows, 0 queue rows, 0 employee data rows, 0 triggers, no issues, zero writes. If it fails, do not enable writes; send the execution log.

### Step 2 — separate explicit write authorization, only after PASS

Set **only `RC82_WRITE_DRILL_ENABLED=true`**, then run `rc82RunAuthenticatedMatrixV1` **once**. It temporarily enables dual-write inside the isolated Apps Script project and automatically restores it to `false` in cleanup; **queue replay always stays off**. It creates actual salted synthetic accounts and genuine sessions with `cekLogin`, performs a submit/rejection/owner-revision/admin-approval flow, checks provenance, checks nonce idempotence, probes unauthorized actions, and then tests a client-payload role/name spoof attack. If owner revision fails, `ownerRevisionEvidence` shows the sanitized handler response, status and nonce checks, and index differences before the test aborts.

**Crucial security gate:** source inspection found that `simpanDataKinerja` currently consumes `paket.nama` and `paket.jabatan` supplied by the client, and that initial admin-like approval logic reads `paket.jabatan`. The matrix requires an **explicit identity-mismatch rejection**. If spoofing is accepted, the matrix MUST report `RC82_SECURITY_NOT_ACCEPTED`; do not treat other passed tests as overall acceptance or deploy to production.

Potential outputs:
- `RC82_AUTH_BUSINESS_PASS_PENDING_EXTERNAL_SNAPSHOT`: all runtime checks passed; still requires independent snapshot comparison.
- `RC82_SECURITY_NOT_ACCEPTED`: client role/name spoofing was accepted. Treat as a security defect, investigate and patch in a separate reviewed branch.
- `RC82_AUTH_BUSINESS_NOT_ACCEPTED`: an authentication, validation, transaction, index, audit, setup, or rollback check failed.

After the run, verify `RC82_WRITE_DRILL_ENABLED=false` and `INDEX_LAPORAN_2B1_WRITE_ENABLED=false`, then send the complete `PHA07B2_RC82_AUTH_MATRIX` log. **Do not repeat the matrix in the same workbook.**

### Step 3 — independently verify rollback

Compare the target against the immutable snapshot using the Google Sheets CellData API in all 12 named tabs. Required parity: `userEnteredValue`, `effectiveValue`, `formattedValue`, `userEnteredFormat`, `dataValidation`, `note`, `hyperlink`. Require zero changes in relevant bounded regions, no residual `__RC82_BK_` tabs, no pending recovery manifest, source/index/audit row counts back to baseline.

### If an execution fails or is interrupted

Do **not** retry the matrix. Ensure write and dual-write flags are false. If a pending manifest plus native backup tab exists, inspect logs and use **`rc82RecoverPendingV1`** only in the isolated project; verify against the independent snapshot afterward. If the manifest or backup is damaged, stop and use the independent snapshot for guided manual recovery. Backup restoration is not a Google Sheets transaction; forced termination may occur at any point.

## Scope limitations

The harness calls genuine server-side functions but does not deploy them through a browser, provide real Drive attachments, test AI APIs, or validate all authorization and tax/benefit scenarios. Fake evidence URLs use the reserved `.invalid` domain. Role/identity security must be explicitly accepted; do not infer PASS from successful form submissions. No merge to `main` or production deploy is authorized.