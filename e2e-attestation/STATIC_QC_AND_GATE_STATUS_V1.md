# PHA-07B B2 — SAV10 / E0V10 Independent Auditor Static QA
**Date: 2026-10-14 | 20 / 20 STATIC assertions PASS | Installed GAS API execution: NOT RUN**

## Source pin / verification
- Expected source reference: `e2e-attestation/SAV10_SOURCE_REFERENCE_V1.json` from source commit `51fb7a0cd68927eb1a263f1edb8c421d40defd83`.
- Exactly seven packaged blobs have been reread from GitHub and all **7/7 Git blob IDs match** the reference allowlist in the audit manifest.
- All seven candidate source entries have *canonical SHA-256* digests. The >1MB `Index.html` was read via the GitHub content-fetch path and hashed in full; no empty HTML digest was accepted.
- Hashing procedure was checked independently against standard SHA-256 `abc` test vector before pinning the seven digests.

## 20 / 20 code static QA assertions
1. Reference has exactly seven source files.
2. Reference HTML digest is non-empty.
3. All seven expected hashes are compiled into the independent source attestor.
4. Auditor Script ID and target Script ID required to differ.
5. Auditor OAuth uses `script.projects.readonly`, not writable `script.projects`.
6. Reads target HEAD source via `projects.getContent`.
7. Does not log raw source.
8. Source attestor writes only to independent evidence folder.
9. E0 requires independently stored prior successful SAV10 evidence ID.
10. E0 independently re-attests source before and after snapshot.
11. E0 reads all expected sheets.
12. E0 validates synthetic baseline fixture counts.
13. E0 re-reads workbook metadata after capture.
14. E0 requires owner-only Drive ACL.
15. E0 refuses frozen RC8.2 workbook ID collision.
16. E0 contains no `SpreadsheetApp` writes, `setValues`, `appendRow`, or `clearContents`.
17. Auditor's Sheets scope is read-only.
18. Auditor has no `doGet`, `doPost`, or trigger installer.
19. Auditor includes no literal client secret, private key or production Gemini API key.
20. Full-grid reads include row/column dimension metadata and record their per-sheet integrity fingerprints.

## Live metadata pre-scan (not an E0 snapshot)
- Rechecked via connected Drive metadata and folder listing: isolated spreadsheet has 12 exact expected tabs; owner-only permission metadata for workbook, upload folder, evidence folder; upload root was empty. See `e2e-attestation/PRE_E0_METADATA_OBSERVATION_2026-10-14.json`.
- Drive and Apps Script API will repeat checks inside independent verifier once installed; the connector observation alone does not prove deployed source, stage project Script ID or complete typed-grid state.

## Open gates
- No access to source of installed target Apps Script project from the available connector; user must run a **separate standalone auditor** with official Apps Script API access and report `SAV10_SOURCE_MATCH_PASS`.
- Full E0 capture and private readback `E0V10_BASELINE_CAPTURED_READ_ONLY` not executed; no E0 file ID exists yet.
- Runtime Apps Script syntax, API field masks and OAuth permissions have not been exercised. If Apps Script API/Sheets API/Drive API returns 403, stop and repair authorization without enabling Web App or production access.
- This stage does not prove zero production writes across unrelated Apps Script projects. Web App/browser/HTTP/Upload tests remain NOT_TESTED.
- **GO for MANUAL INSTALL OF SECOND AUDITOR AND READ-ONLY TESTS ONLY. Web App/production: NO-GO.**
