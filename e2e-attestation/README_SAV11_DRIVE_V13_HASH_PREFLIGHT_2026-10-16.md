# PHA-07B B2 — SAV11 Drive Export Full Hash Preflight & Conditional Independent Attestation v1.3

**2026-10-16 (WIB)**. No production, staging Web App or trigger changes are authorized. RC8.2, SAV10, S0/S1 and frozen independent E0 remain unchanged.

## A. Observed real probe from Project B (user execution 20:02:27 WIB)

The Project B standalone auditor executed `sav11DriveExportProbeV12()` with:
- `httpStatus=200`, `method=DRIVE_V3_FILES_EXPORT_READONLY`
- `fileCount=8`, all eight expected names, actual lower-case types `server_js`, `html`, `json`
- `targetWrites=0`, `evidenceWrites=0`
- No `drive.scripts` scope in the *working* three-scope authorization.

This establishes a working read-only source-inventory route through Drive v3 export on the existing Default Cloud Project, WITHOUT requesting a new Standard Cloud Project. It is **not** SHA256 attestation. Documentation states `drive.scripts` generally applies to import/export; do not add the restricted scope again where user test already succeeds without it.

## B. Reviewed V13 code and tests

Separate, appended extension code:
`e2e-attestation/drive-export-v13/SAV11_DriveExport_AttestorExtensionV13.gs`.

Version: `PHA07B2-B2-SAV11-DRIVE-2026.10.16.1`.

The extension reuses the original `SAV11_POLICY_` eight-file SHA-256 pins and the existing v1.2 helpers:
- `sav11CheckConfig_`: auditor Script ID, target Script ID, title declaration, no target write authorization.
- `sav11CanonicalSource_` and `sav11HexDigest_`: EOL normalization for JS/HTML; sorted-key normalized JSON manifest; SHA-256.
- `sav11SameObserved_`: compare both independent source reads.
- `sav11SavePrivateJson_`: private evidence folder, unique JSON file, readback SHA-256, targeted cleanup of just-created bad evidence.

The Drive export returns lower-case `server_js/html/json`; V13 maps these explicitly to expected uppercase `SERVER_JS/HTML/JSON` before digest checks. It rejects extra, missing, duplicate, wrong type or changed source, without printing or saving source bytes.

**Two separate entry points:**
1. `sav11DriveHashPreflightV13()`: **read-only**, one Drive export. Checks exact 8 source SHA256s and file names/types; `evidenceWrites=0`. Success status `SAV11_DRIVE_HASH_PREFLIGHT_PASS`. Does NOT claim target project title independently.
2. `sav11IndependentDriveAttestationV13()`: stronger route, reads Google Drive file metadata `files.get` to verify exact target ID/title/MIME; reads 8 file source and all SHA-256 hashes twice, checks metadata-modified-time stable, then saves versioned private JSON evidence only if all gates PASS. Success status `SAV11_DRIVE_SOURCE_MATCH_PASS` (NOT the previous Apps Script API V12 status). If `files.get` metadata is unavailable despite export 200, it **fails closed and writes no evidence**; this is an explicit unresolved integration risk.

Review: 18 deterministic in-memory mock regression scenarios **18/18 expected outcomes** against actual current GitHub extension + v1.2 helper, with pinned GitHub source used as expected payload. Evidence record: `e2e-review/SAV11_DRIVE_V13_MOCK_REGRESSION_2026-10-16.json`. **No installed source hash attestation has been run yet.**

## C. Safe installation (Project B ONLY)

1. Keep E2E11 Project A exactly eight files, its Script ID, staging synthetic workbook and ALL write/deploy flags untouched. Never run `doGet` or deploy target.
2. In the existing Project B editor, open **SAV11_IndependentSourceAttestor.gs**. Confirm original `SAV11_POLICY_` references source commit `b865d6c830e215cc062e553b33db5bb866db95dc` and version `PHA07B2-B2-SAV11-2026.10.16.2`; preserve the original helper code and the already-added diagnostics.
3. Open GitHub V13 extension file, select Raw, copy **entire** contents and append to the **END** of the existing auditor `.gs` source, separated by a newline. **Do not add a new Apps Script file**: Project B must still have 1 `.gs` and 1 `appsscript.json`.
4. Leave Project B manifest OAuth scopes at the proven-working three entries (`script.projects.readonly`, `drive`, `script.external_request`). Do not re-add `drive.scripts`; the existing enabled Advanced Drive API v3 dependency may remain. Do not change the Default Cloud Project, create a new GCP project or increase Cloud quota.
5. Save and select **`sav11DriveHashPreflightV13`**. Run ONCE. Review `SAV11_V13_HASH_PREFLIGHT`:
   - success `status=SAV11_DRIVE_HASH_PREFLIGHT_PASS`
   - `expectedFiles=8`, 8 observations, each `same=true`
   - `issues=[]`, `targetWrites=0`, `evidenceWrites=0`
   - confirm `referenceCommit` pinned and target/auditor Script IDs distinct.
6. If hashes fail, capture the `issues` and per-file SHA values without raw source, credentials or OAuth tokens. **Do not modify target files to force a pass** until root cause is understood.
7. **Do not run full attestation** until the preflight result has been reviewed and exact metadata lookup acceptance has been addressed. The full function will only create a new SAV11 evidence file after two matching source reads and metadata/ACL checks; it does not touch target workbook.

## D. Acceptance boundary

Full independent source acceptance requires:
- read-only V13 preflight PASS **8/8 actual hashes**;
- independent target identity/title/MIME verification (Drive `files.get`, otherwise explicit BLOCKED);
- final 2x source reads stable and exact 8/8 matching hash values;
- new private evidence file SHA-256 and owner-only ACL readback independently verified; no old E0/SAV10 file changed;
- staging Web App, triggers, write/upload and payroll operations still forbidden pending later security E0/E1 / 26 negative cases.

Until then: **SAV11 source attestation PENDING, Web App staging NO-GO, production NO-GO.**

Official docs: https://developers.google.com/apps-script/guides/import-export and https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export .
