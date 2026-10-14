# Portal Kinerja Minomartani — RC8.2 Submit Identity Hardening

**Status:** staging security patch candidate; Apps Script runtime NOT TESTED. **Production: NO-GO**.

## Why this branch exists

The previous RC8.2 authenticated-server matrix finished **20/21** checks. The revision-index/NONCE fix succeeded; however a regular employee session created a synthetic report with client-claimed `Lurah` identity and automatic `Disetujui` status. That is a confirmed **staging security finding**.

This branch binds submit identity and approval role to the authenticated employee record, rejects name/role payload forgery before side effects, preserves the RC7 revision-index fix, and extends the original matrix with name-only and role-only forgery checks.

[Finding and patch report](./RC82_IDENTITY_SPOOF_FINDING_AND_PATCH_20261012.md).

## Stage resources — DO NOT USE prior RC8.2 workbooks

- Fresh **disposable staging workbook**:
  https://docs.google.com/spreadsheets/d/1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU/edit
- Independent **baseline snapshot, no testing**:
  https://docs.google.com/spreadsheets/d/1p9O9MHQ7gaZI9EbdMB4-Dj9N3LxS9tCfQ8mb0gg1Pzg/edit
- Branch:
  https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/tree/feat/pha07b2-rc82-submit-identity-hardening
- Version: `PHA07B2-RC82-IDENTITY-GUARD-2026.10.12.1`.
- Workbook markers:
  `MULAI_DI_SINI!A5=STAGE_RC82_SUBMIT_IDENTITY_HARDENING`,
  `A8=RC82_IDENTITY_HARDENING_WRITES_OPTIN_ONLY`,
  `B16` = exact new staging ID.
- Before runtime: 12 selected tab ranges, 425 populated/metadata cell positions matched snapshot; **0 differences**.
- No production data, accounts, PINs, triggers, or web app deployment in these workbooks.

## Create a brand-new standalone Google Apps Script project

Name: **Portal Kinerja - PHA07B2 RC8.2 Identity Guard**.

Copy **only from this exact branch**:
1. Full `Kode.gs` — includes signed-session identity binding and hard-pinned `getSS_()`.
2. `SheetSchema.gs`.
3. `IndexQueueGuardRC7.gs` — includes `rc7AllowOwnerRevisionNonceChange_`.
4. `RC82_AuthenticatedBusinessIntegration.gs` — version `PHA07B2-RC82-IDENTITY-GUARD-2026.10.12.1`.
5. `appsscript.json` from this branch.

**Script Properties — freshly entered, never copied from production:**

| Property | Value |
|---|---|
| `RC82_STAGING_MODE` | `true` |
| `SPREADSHEET_ID` | `1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU` |
| `RC82_WRITE_DRILL_ENABLED` | `false` |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |

`RC8_STAGING_MODE` and `RC81_STAGING_MODE` must be absent/false. Do not set `PIN_PEPPER`, `FOLDER_ID_BUKTI_KINERJA`, `FOLDER_ID_BUKTI`, `API_KEY_GEMINI`, or `RC82_RECOVERY_PENDING`. Do not create triggers; **DO NOT CLICK DEPLOY/TERAPKAN**.

## First authorized action — READ ONLY

Select `rc82ReadOnlyPreflightV1`; run **only this**.

Expected `PHA07B2_RC82_PREFLIGHT`: `RC82_PREFLIGHT_PASS`, source 2, index 2, audit 2, queue 0, employees 0, triggers 0, no issues, `writesPerformed=0`, `productionReady=false`.

The preflight fails closed if:
- new identity guard is missing / rejects test account incorrectly (`RC82_SUBMIT_IDENTITY_GUARD_MISSING_OR_UNSAFE`);
- RC7 revision-nonce guard is missing/unsafe;
- workbook ID or sentinel is wrong;
- any trigger, credentials, pre-existing employees, pending backup/recovery, or write/replay flags is present.

**Send the entire preflight log.** Do not enable any write flag until preflight has been reviewed and accepted.

## Later — one-shot authenticated business matrix (NOT YET AUTHORIZED HERE)

Only after successful preflight and explicit go-ahead:
- Set `RC82_WRITE_DRILL_ENABLED=true` for the one isolated run.
- Keep dual-write and queue replay false in Script Properties; the harness changes dual-write temporarily during the test and restores it.
- Run `rc82RunAuthenticatedMatrixV1` **once**.
- The 21 existing business checks plus 2 new negative cases require genuine employee/admin sessions, submit, rejection, revision and index sync, final review, audit, nonce idempotence, and **all three client name/role spoof probes rejected with zero source/index/queue writes**.
- Expected only after fully passing: `RC82_AUTH_BUSINESS_PASS_PENDING_EXTERNAL_SNAPSHOT`. Confirm `rollbackRestored=true`, post-preflight PASS, no issues, disabled flags, and independently compare all relevant target ranges to the untouched snapshot. Runtime PASS alone is insufficient for final acceptance.

On **any** non-PASS, timeout, failed rollback, orphan backup or pending recovery indicator: stop; do not repeat the matrix or invoke `rc82RecoverPendingV1` automatically. Inspect logs, backup and snapshot with a targeted recovery plan.

## Scope and authority

These tests invoke real **server-side Apps Script functions**, NOT a deployed HTTP/PWA flow or real file uploads. No merge into `main`, no triggers, no replay, no production deployment, no changes to production databases. A later production security review is mandatory even after synthetic acceptance.
