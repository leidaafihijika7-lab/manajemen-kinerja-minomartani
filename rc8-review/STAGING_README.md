# PHA-07B B2 RC8 - Staging Bridge Integration

Status: STAGING SOURCE PREPARED; RUNTIME NOT YET EXECUTED; PRODUCTION NO-GO.
Date: 2026-10-11. All data is synthetic.

## Verified resources

- GitHub repository: leidaafihijika7-lab/manajemen-kinerja-minomartani
- Staging branch: feat/pha07b2-rc8-business-staging
- Based on RC7 review branch with the RC7 candidate module.
- Staging workbook: https://docs.google.com/spreadsheets/d/1EdmIg1te51db4_hQO6f9-VEt8EuLiB-ZmRAhxuvDg68/edit
- Baseline RC6 is a different workbook; B2 remains read-only.

## Isolation design

Staging `Kode.gs` changes exactly six functions relative to the RC7 review branch:
1. `doGet()` -> blocked; no web endpoint exposure.
2. `getSS_()` -> requires `RC8_STAGING_MODE=true`, literal staging spreadsheet ID, and matching sentinels in MULAI_DI_SINI. Never follows another `SPREADSHEET_ID` or cached spreadsheet.
3. `antrekanPerbaikanIndexLaporan2B1_()` -> RC7 candidate delegate.
4. `sinkronkanSatuRowIndexLaporan2B1_()` -> RC7 candidate delegate.
5. `prosesAntreanPerbaikanIndexLaporan2B1()` -> RC7 candidate delegate.
6. `hitungStatusQueueIndexLaporan2B1_()` -> RC7 candidate delegate.

`SheetSchema.gs` and `IndexQueueGuardRC7.gs` are inherited unchanged.
No production Apps Script project, `main` branch, triggers, or deployment was changed.

The staging `appsscript.json` intentionally grants only Spreadsheet access and trigger inventory access. Existing production code contains Drive and external-service functionality: DO NOT grant additional scopes or call any other production endpoints in this staging stage.

## Create a separate Apps Script project (manual step)

A new Apps Script project cannot be provisioned by the currently connected automation. It must be created separately at https://script.google.com. Name: `Portal Kinerja - PHA07B2 RC8 Staging`.

Only use source files from the RC8 staging branch, NEVER the production app's live editor. The minimum files to install are:

- `Kode.gs` (large, stage-gated version from the RC8 branch)
- `SheetSchema.gs` (from the same RC8 branch)
- `IndexQueueGuardRC7.gs`
- `RC8_StagingAcceptance.gs`
- `appsscript.json` (copy from RC8 branch after enabling "Show appsscript.json" in Project Settings)

Do not copy Script Properties or triggers from the production project. Do not create a deployment. The existing RC1-RC6 isolated-test script is separate; do not paste RC8 into it.

Configure ONLY these Script Properties in the new RC8 project:

| Name | Value |
| --- | --- |
| `RC8_STAGING_MODE` | `true` |
| `SPREADSHEET_ID` | `1EdmIg1te51db4_hQO6f9-VEt8EuLiB-ZmRAhxuvDg68` |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |
| `RC8_WRITE_DRILL_ENABLED` | `false` |

NEVER enter production database IDs, API keys, production identities, secrets, or Drive folder IDs.

## Run order

1. From the new staging project, run `rc8ReadOnlyPreflightV1()`.
   - Expected: `RC8_STAGING_PREFLIGHT_PASS`, two report rows, two index rows, zero queue rows, zero installed triggers, zero writes.
   - STOP if any issue is returned; do not activate flags.
2. Run `rc8ReadOnlyBusinessPlanV1()`.
   - This produces a read-only projection plan and identity checks.
   - It does not call the actual business submit/admin login endpoints. A difference between historical synthetic index version and current projection may be reported as `indexIdentical:false`.
3. Only after preflight output is reviewed: operator may set `RC8_WRITE_DRILL_ENABLED=true` on this new project and run `rc8StagingWriteDrillV1()` ONCE.
   - This runs three storage-level SYNTHETIC proxies: append a report, revise a report, review a report, with candidate RC7 index sync under one ScriptLock. It records synthetic audit rows and restores sheet values, index number formats, and staging metadata properties in `finally`.
   - This is NOT a complete exercise of `prosesReviewAdmin`, login, file upload, cut-off, accounting, or disposition business logic.
   - It is not guaranteed to rollback after a forced termination or timeout. If interrupted, stop and inspect workbook; do not immediately rerun.
4. Set `RC8_WRITE_DRILL_ENABLED=false` again; do not activate RC7 replay or dual-write flags.

## Acceptance criteria

RC8 isolated setup can be marked `STAGING_PREFLIGHT_ACCEPTED` only after receiving the actual Apps Script runtime log. Storage-proxy drill can be marked accepted only after separate log and independent database readback. Full business-path acceptance remains NO-GO without real stage-only dependencies for sessions, review, audit, disposition, cut-off, and external service stubs.

## Rollback and restoration

If the write drill fails, inspect `Rekap_Kinerja` rows 2 and 4, `Index_Laporan` rows 2 and 4, `Audit_Log` rows 4 onward, and `Index_Laporan_Sync_Queue`. It may be safer to discard the disposable RC8 workbook and copy a fresh RC6 snapshot rather than manually repair a partially interrupted test.

Never perform rollback on the production database. Never enable or deploy production code based only on the mock tests.

## Evidence

- RC7 candidate mock tests: 38/38 PASS.
- RC8 staging preflight/guard Node.js mock tests: 15/15 PASS.
- GitHub branch readback verifies stage-specific `Kode.gs` and added files.
- Google Sheets readback verifies stage-only control markers and synthetic rows.
- Real Apps Script RC8 runtime and full business flows: NOT EXECUTED in this preparation turn.

Result: STAGING PREPARED / PRODUCTION NO-GO.