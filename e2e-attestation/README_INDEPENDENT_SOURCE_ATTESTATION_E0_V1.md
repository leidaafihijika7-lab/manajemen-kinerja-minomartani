# PHA-07B B2 — Independent Source Attestation & E0 Baseline v1.0
**Date authored: 2026-10-14 | Status: AUDITOR PACKAGE PREPARED, RUNTIME ATTESTATION/E0 PENDING | PROD NO-GO**

## Purpose and hard isolation
We must independently check the **source actually installed** in the already-created E2E standalone Apps Script project, using `Google Apps Script API projects.getContent` from a **second, distinct Apps Script project**, then capture an auditable E0 typed-grid + Drive baseline before enabling any Web App or write/Upload paths. Code in this directory is AUDITOR CODE; it is **not a component of the seven-file target E2E runtime**, and must never be installed into target or RC8.2/production.

- Target E2E Sheet: `1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic`
- Synthetic upload root: `1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0`
- Independent evidence root: `1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG`
- Frozen RC8.2 Sheet: `1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU` — strictly excluded
- Expected seven-file source from GitHub reference commit `51fb7a0cd68927eb1a263f1edb8c421d40defd83`, path `e2e-runtime/`. SHA-256 reference: `e2e-attestation/SAV10_SOURCE_REFERENCE_V1.json`.

### Deliverable files (install **exactly these three** in a NEW auditor project)
1. `independent-auditor/SAV10_IndependentSourceAttestor.gs`
2. `independent-auditor/E0V10_IndependentBaseline.gs`
3. `independent-auditor/appsscript.json` (manifest; enable display in Project Settings)

In the *target stage* project retain its own **seven** source files, unchanged. Do not install auditor scripts there.

## 1. Create the SECOND standalone Apps Script project
Suggested project title: `PKM PHA07B2 B2 — Independent Auditor`. Create via `https://script.google.com/` with the same authorized Google account used for the isolated staging workbook (or a verified delegated auditor account). Turn on the manifest display in Project Settings. Install precisely the three files above, without copying any production Script Properties or secrets. Do not deploy the auditor or the target as a Web App or API executable.

The auditor's manifest declares:
- `script.projects.readonly` — read the **target project HEAD** via Apps Script API; cannot edit its source.
- `spreadsheets.readonly` — independent Sheets API grid and metadata reads only.
- `drive` — **broad Drive scope required by the current evidence-save implementation** for writing JSON to the separate evidence folder. This is a security trade-off: review the auditor source, use restricted accounts and keep the folder private; the code must never call any Drive mutation on target or frozen storage.
- `script.external_request` — use `UrlFetchApp` to call official Google REST APIs with `ScriptApp.getOAuthToken`; never paste an access token anywhere.

For API 403, enable **Apps Script API in the Google Cloud project linked to the auditor** and ensure Apps Script API project access is authorized in your Apps Script user settings as applicable. The Sheets API and Drive API must also be available to that Cloud project. Do not enable access indiscriminately for third-party apps. No external credentials, service-account key or GitHub personal access token are needed.

## 2. Source attestation (SAV10) — first
Read the TARGET project's exact Apps Script **Script ID** and project title from its Project Settings/Overview; not the Spreadsheet ID, not deployment ID, not the auditor's Script ID. The earlier target E2E Project has a value in `E2E_EXPECTED_SCRIPT_ID` for reference.

In the NEW **auditor** project's Script Properties, set:

| Name | Value |
| --- | --- |
| `SAV10_AUDITOR_SCRIPT_ID` | Auditor project's own Script ID |
| `SAV10_TARGET_SCRIPT_ID` | Target E2E Apps Script project's Script ID |
| `SAV10_TARGET_PROJECT_TITLE` | Exact stage project name, e.g. `Portal Kinerja - PHA07B2 B2 E2E` |

To obtain the auditor ID, run `sav10GetAuditorScriptIdV1()` once, or read **Project Settings → Script ID** of the auditor itself. The two IDs must differ. Leave `SAV10_PASSED_EVIDENCE_FILE_ID` unset for now.

Run `sav10IndependentSourceAttestationV1()`.
Expected: `SAV10_SOURCE_MATCH_PASS`, exactly **7 observed files**, `observed[].same=true` for all, `issues=[]`, `targetWrites=0`, `evidenceWrites=1`. This verifies live *HEAD* source bytes via official `projects.getContent`, not a self-reported digest from the target project; includes HTML and `appsscript.json` (JSON-semantic canonicalization). Only a SHA report is saved, not the source text.

The source reference uses CRLF→LF + strip terminal LF for .gs/.html, and recursively sorted object keys for manifest JSON (array order retained). The pinned SHA-256 are **expected hashes**, not proof of source already installed. Any missing/extra file, type mismatch, source hash mismatch, wrong title/project ID or API denial **BLOCKS**.

Record the SAV10 result and `evidence.fileId` reported in the console. This file lives **only** in `PKM_PHA07B2_B2_E2E_INDEPENDENT_EVIDENCE_20261012`.

## 3. Independent E0 baseline — only AFTER SAV10 PASS
Still in the auditor's Script Properties, set:
`SAV10_PASSED_EVIDENCE_FILE_ID=<the verified successful SAV10 evidence.fileId>`.

Before E0, re-run the TARGET stage's `e2e10ReadOnlyPreflightV1()` on the same day. Require `E2E10_SOURCE_PREFLIGHT_PASS_DEPLOYMENT_DISABLED`, `issues=[]` and `spreadsheetWrites=0`. The source-preflight log from **12 October 2026** is valuable prior evidence, not a fresh E0 assertion for **14 October 2026**.

Keep TARGET flags `E2E_WEB_ENABLED=false`, `E2E_WRITE_ENABLED=false`, `E2E_UPLOAD_ENABLED=false`, `E2E_DEPLOYMENT_REVIEWED=false`, `E2E_E0_ATTESTED=false`, `MULAI_DI_SINI!B19=NOT_DEPLOYED` and `B20=false`.

Run `e0v10CaptureBaselineV1()` in the **auditor** only, once. The verifier:
1. Validates the prior saved SAV10 PASS evidence (private, correct target and pinned source commit).
2. Re-attests live target source before capture and after capture; refuses mismatch.
3. Validates all 12 exact tab names and E2E sentinels.
4. Reads every allocated cell position (all rows/columns, in 500-row chunks) through **Sheets API read-only**, recording user-entered values/formulas, effective/ formatted values, entered formats, notes, validations, chips and links, plus whole-workbook metadata and per-sheet SHA-256.
5. Verifies baseline fixtures: `Rekap_Kinerja=2`, `Index_Laporan=2`, `Index_Laporan_Sync_Queue=0`, `Data_Pegawai=0` (data rows).
6. Independently reads Drive permissions/parents and verifies workbook, upload folder and evidence folder each report owner-only; upload folder has no files/subfolders.
7. Re-reads sentinel, metadata, Drive modification timestamps, upload inventory and source after capture; refuses evidence publication if changed.
8. Saves ONE JSON file with full typed-grid/Drive snapshot in the private independent evidence folder, then readback-verifies its SHA-256.

Expected `status=E0V10_BASELINE_CAPTURED_READ_ONLY`, `sheetCount=12`, `sourceAttestation=SAV10_SOURCE_MATCH_PASS_RECHECKED_TWICE`, `uploadInventoryCount=0`, `targetWrites=0`, `evidenceWrites=1` and nonblank `evidenceFileId`, `e0EvidenceSha256`.

The auditor must not print individual employee data, PINs, session secrets or raw source. Snapshot JSON contains synthetic workbook cells and must remain private.

**If the API times out, returns a 403, hits snapshot size limits, finds a stale source, changes in the middle of capture, nonprivate ACL or mismatched rows: the result must be `*_BLOCKED`. Do not report a successful baseline or flip any write flag.**

## 4. Gate decisions and limitations
- Source attestation PASS only after independent official source API says all 7 files match. It does **not** prove the content of a future deployed Web App version, nor audit all application RPC endpoints.
- E0 baseline PASS only after actual independent capture and private Drive file readback. The pre-scan in GitHub is NOT an E0 baseline.
- E0 is an integrity fingerprint plus saved typed-grid evidence, not a guaranteed WORM backup; retention/immutability must be handled separately.
- Broad Drive OAuth on the separate auditor is restricted by reviewed code, but not cryptographically least-privileged for only one Drive folder.
- Target preflight still cannot independently attest runtime deployments, production writes, or unrelated Apps Script project triggers.
- Full HTTP/PWA/Upload E2E tests remain `NOT_TESTED` until separate RPC audit, deployment access-model review and user approval.
- **No scripts shall change production, RC8.2 frozen sandbox, or original S0/S1 evidence.**
- **Do not merge PR #2 or deploy the target.** Upload, Web and Write flags remain false.

## 5. Evidence handoff
Provide the **sanitized** `SAV10_RESULT` execution log first (including `status`, `issues`, `observed[].same`, `evidence.fileId`); after we confirm it, capture E0 and provide `E0V10_RESULT` (including evidence ID, SHA-256, roots, and counts). **Never paste OAuth token or raw source.**

### Official API references
- Apps Script API `projects.getContent`: https://developers.google.com/apps-script/api/reference/rest/v1/projects/getContent
- Apps Script API enablement/access: https://developers.google.com/apps-script/api/how-tos/enable
- Google Sheets API `spreadsheets.get`: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
