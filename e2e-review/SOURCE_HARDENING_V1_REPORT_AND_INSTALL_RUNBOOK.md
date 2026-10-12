# PHA-07B B2 — E2E Candidate Source Hardening v1.0
Date: 2026-10-12 (Asia/Jakarta). Candidate: `PHA07B2-B2-E2E-SOURCE-HARDENING-2026.10.12.1`.
**State: SOURCE PREPARED / STATIC REVIEW ONLY / SCRIPT NOT INSTALLED / DEPLOYMENT NO-GO.**

## 1. Source lineage and hard limits
- Pinned frozen RC8.2 source commit: `a81ecc00512f025967ceb5febadc6ddb395c8505`.
- This branch: `feat/pha07b2-b2-e2e-isolated-preflight-v1`.
- Original authenticated RC8.2 matrix 23/23 PASS and EXSV10 S0/S1 matching fingerprint roots remain frozen; nothing in this candidate modifies their original spreadsheet, GitHub branch or Drive evidence.
- The original `RC82_AuthenticatedBusinessIntegration.gs` was **removed only from this E2E branch**, to prevent users from running the frozen one-shot drill inside the E2E candidate. It remains available in the frozen RC8.2 branch.

## 2. Install exclusively from the seven-file package
**DO NOT import/push the repository root to Apps Script.** Several other root modules contain direct Drive, Spreadsheet or ScriptApp trigger access and are out of scope for E2E. In particular `BackupDisasterRecoveryV10.gs` and `MonthlyArchiveV10.gs` have unreviewed E2E privileges.

Install only files from `e2e-runtime/` into a **brand-new, standalone Apps Script project**:
1. `Kode.gs`
2. `Index.html` (HTML)
3. `SheetSchema.gs`
4. `IndexQueueGuardRC7.gs`
5. `E2E10_RuntimeGuard.gs`
6. `E2E10_IsolatedReadOnlyPreflight.gs`
7. `appsscript.json` (manifest)

The runtime package is self-contained for the focused, source-hardening entry gate; other portal UI modules might be absent and the true Web App still requires runtime testing. **Do not deploy this package yet.** Read source-review limitations before any merge or exposure.

## 3. Hardened endpoints and resources
| Surface | Candidate-only control | Limitation |
| --- | --- | --- |
| `doGet` | Requires E2E stage, pinned GAS script identity, known active tester, explicit Web/deployment approval and workbook sentinel; default flags block | Never a substitute for Web App deploy access policy; active tester email can be blank in some execute-as modes, and MUST fail closed |
| `getSS_` | One `SpreadsheetApp.openById`, pointed only to E2E workbook `1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic`; live sentinel checks, cache-ID validation | The project still needs a separate new GAS script ID |
| Drive folder/file lookups | All 5 remaining Kode folder IDs and 9 file IDs replaced by allowlisted helpers; parent ancestry check, with one fixed exception for read-only metadata of the E2E workbook | Other non-packaged modules are explicitly forbidden; Drive OAuth remains broad |
| File/folder creation | All three `createFile` and one `createFolder` call guarded by upload-write opt-in and ancestor check | No upload performed yet |
| File sharing | Only PRIVATE in stage, mandatory membership validation and readback | Google account-level/inherited sharing and cross-tester access still need independent verification |
| External network | Both `UrlFetchApp.fetch` sites in packaged `Kode.gs` replaced with hard failures | AI/other external integrations are `NOT_TESTED` rather than simulated PASS |
| Authenticated submit | Identity Guard kept; additional stage write and session-file reference gates before nonce; no production identities | Some existing-attachment revisions may be rejected until owner-linked evidence flow is adapted |
| Review / revision | Explicit stage write opt-in, non-admin guard from frozen RC8.2 kept, revision payload evidence ownership check | UI/RPC and full status transitions not yet tested |
| Blob upload / disposition | Independent upload-enable opt-in, folder pinning, canonical session evidence registry check, private Drive root | Cross-session/orphan cleanup and file sharing require runtime E2E |
| Legacy maintenance | Old bulk Drive ACL repair entrypoint disabled in E2E candidate | Other root modules must not be installed |
| UI | Fixed prominent `STAGING E2E - DATA SINTETIS - BUKAN PORTAL PRODUKSI` marker | No Web App URL exists yet |

## 4. E2E resource IDs (PRIVATE synthetic staging only)
- Workbook: `1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic`.
- Upload folder: `1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0`.
- Independent evidence folder: `1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG`.
- The control sheet has E2E-specific `A5, A8, B16:B20` sentinels. At preparation: `B19=NOT_DEPLOYED`, `B20=false`.
- No real employees, real PINs, production database IDs or Drive roots are installed in this environment.

## 5. Candidate OAuth manifest
Requested only on the **new standalone E2E project**:
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/script.scriptapp`
- `https://www.googleapis.com/auth/userinfo.email`

The Drive scope is broad because `DriveApp` upload/permission APIs require it; therefore **restricted project access and runtime allowlists are essential**, not optional. External UrlFetch scope is omitted; all eligible calls are blocked in packaged `Kode.gs`.

## 6. Before any write: creation of NEW standalone Apps Script project
Name suggestion: `Portal Kinerja - PHA07B2 B2 E2E Source Hardening`.

Open Apps Script Project Settings and expose `appsscript.json`, then install exactly seven `e2e-runtime` files. Never import the root source tree. No production properties or triggers. In the new script ONLY, manually set:

| Script property | Preparation value |
| --- | --- |
| `E2E_STAGING_MODE` | `true` |
| `E2E_SYNTHETIC_ONLY` | `true` |
| `SPREADSHEET_ID` | `1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic` |
| `E2E_UPLOAD_FOLDER_ID` | `1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0` |
| `E2E_WRITE_ENABLED` | `false` |
| `E2E_UPLOAD_ENABLED` | `false` |
| `E2E_WEB_ENABLED` | `false` |
| `E2E_DEPLOYMENT_REVIEWED` | `false` |
| `E2E_EXTERNAL_FETCH_ENABLED` | `false` |
| `E2E_E0_ATTESTED` | `false` |
| `E2E_E0_EVIDENCE_FILE_ID` | **unset/absent** |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |
| `PORTAL_FILE_SHARING_MODE` | `PRIVATE` |

Do **not** set `PIN_PEPPER`, `API_KEY_GEMINI`, `FOLDER_ID_BUKTI_KINERJA`, `FOLDER_ID_BUKTI`, `FOLDER_ID_DISPOSISI`, `RC82_STAGING_MODE`, `RC8_STAGING_MODE`, `RC81_STAGING_MODE`, or any production secret.

Run `e2e10GetScriptIdReadOnlyV1()` once to obtain the new script ID, then add `E2E_EXPECTED_SCRIPT_ID=<that same new script ID>`. Do not put this ID in the GitHub repo.

Only then run `e2e10ReadOnlyPreflightV1()` and collect sanitized execution log. Expected condition for **source-only** preflight: `E2E10_SOURCE_PREFLIGHT_PASS_DEPLOYMENT_DISABLED` and `issues=[]`. If it is blocked, **STOP** and inspect its issues. A successful source preflight does not permit deployment or writes.

## 7. Static QC (run against candidate GitHub source; NOT Apps Script runtime)
- Seven packaged file Git blob SHAs match their source counterparts; package has exactly seven files.
- `Kode.gs`: one direct Spreadsheet open call, zero direct Drive ID getters, zero UrlFetch calls, guarded three file creations and one folder creation, original RC8.2 identity and nonce guards retained.
- All direct sharing mutations are located in `E2E10_RuntimeGuard.gs` and only set `PRIVATE`; legacy textual mode labels still exist in a disabled historical maintenance-report function and do not cause a sharing write.
- Verified "doGet guarded", preflight remains read-only and report distinguishes source acceptance from deployment E2E.
- **NOT executed yet:** GAS parse/compile, actual preflight in new project, browser/RPC, real Drive uploads, cross-owner revision with existing attachments, private ACL on newly created file, isolated /exec, PWA, trigger and production-write independent audit.

## 8. Required before browser staging deployment (NO-GO now)
1. New GAS project ID and full seven-file install with independent code SHA readback and source preflight PASS.
2. Independent verifier E0 baseline of disposable Sheets and Drive root before writing.
3. A **complete RPC surface review** for the packaged `Kode.gs`, because non-core legacy handlers could still write inside the sandbox without the new feature-specific write gate.
4. Synthetic tester users/PIN pepper created only after E0, signed session and identity/ownership flow reviewed; never use real names or work records.
5. Validate active tester email in chosen `execute as` mode, deploy access restrictions and Google scopes. Do not simply set `E2E_WEB_ENABLED=true` to bypass blockers.
6. Address retained attachment references on rejected report revisions with explicit owner-record verification before full E2E; fail closed until fixed.
7. Independent ACL and Drive sharing readback by authorized tester; orphan-file recovery and no external request proven.
8. Only after all above, a separately reviewed staging Web App deployment may be requested. Production remains NO-GO.

**Hard stop:** No GitHub merge to `main`, no deployment, no Apps Script file installation in existing RC8.2/production, no toggling write/web flags at this stage.

## 9. Source-hardening final addendum
- The write guard requires `E2E_E0_ATTESTED=true`, a non-empty, syntactically valid `E2E_E0_EVIDENCE_FILE_ID`, an `E2E_RUN_ID` beginning with `E2E-`, **and zero installed triggers** before permitting stage writes. These controls are deliberately not satisfied during source preparation.
- Blob validation was moved ahead of year/FOTO/PDF folder creation, so rejected MIME/oversized batches do not create empty subfolders. If a failure happens *after* valid file creation, record the created file IDs and perform targeted forensic cleanup; do not infer rollback from a caught error.
- The source-only preflight now blocks premature E0 flags/evidence bindings; this is distinct from a later write-enabled test-preflight. 
- Static QA must examine actual sharing mutations, not historic string labels `ANYONE_WITH_LINK` in disabled maintenance status reporting. In the installed candidate all file-sharing mutation paths are in the PRIVATE-only guard.
