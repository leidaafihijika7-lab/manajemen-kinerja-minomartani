# ACE-DSP-004 RC1 — Diagnostic Closeout & Protection Decision Record
**Tanggal**: 2026-10-10 (Asia/Jakarta)  
**GitHub branch**: `feature/ace-dsp004-reconciliation-hardening-rc1`  
**Keputusan**: DIAGNOSTICS COMPLETE; RC1 IMPLEMENTATION NOT ACCEPTED FOR PRODUCTION; ACE-DSP-004 remains FAIL.  
**Otorisasi perubahan data**: TIDAK ADA. Dokumen ini tidak mengotorisasi edit database, deployment, atau perubahan proteksi.

## 1. Evidence — Apps Script production, read-only

| Pemeriksaan | Output aktual | Interpretasi |
|---|---|---|
| `validasiPengamanIndexACEDsp004RC1()` | 12 PASS, 0 FAIL | Synthetic decision tests pass on installed Apps Script. Not a live index-write acceptance test. |
| `validasiRekonsiliasiAdministratifACEDsp004RC1()` | 11 PASS, 0 FAIL | Synthetic reconciliation cases pass. |
| `diagnostikRekonsiliasiAdministratifACEDsp004RC1()` | success=true, 193 rows scanned, 18 candidates, truncated=false | All candidates are from same employee *after* original submit; all 18 have matching submit audit and single index row; **none** has direct disposition ID or matching disposition-create log to establish a replacement. Verdict `NO_AUTOMATIC_REPLACEMENT_IDENTIFIED`. |
| `diagnostikProteksiSheetACEDsp004RC1()` | success=true, 5 sheets available, protectionCount=0 for all | No `SpreadsheetApp.ProtectionType.SHEET` entries for `Rekap_Kinerja`, `Index_Laporan`, `Disposisi_Penerima`, `Audit_Log`, `Disposisi_Log`. **Does not assess range-level protections**, Apps Script execution permissions, sharing, or effective editor identities. |
| All above | readOnly=true, dataBisnisDiubah=false | Tools did not change business data. |

## 2. Administrative source and root cause

- Maintainer confirmed that the original report was deleted directly in the production Google Sheets, after an employee requested a revision and was advised to submit a replacement.
- Original report `4810bf4f-6cac-4a05-b75e-fdd5acb81df5` retains submit and disposition-create audit evidence; `Disposisi_Penerima` row 622 still points to the old ID, and current `Rekap_Kinerja` and `Index_Laporan` lack that report.
- 2026-10-01 13:34 WIB version: old ID present in index row 3958 but absent from source rekap row 3958.
- 2026-10-01 15:36 WIB version: subsequent report occupied rekap and index row 3958. The existing 2B1 index sync is compatible with this replacement pattern, but the exact causative execution was not conclusively identified.
- There are 18 later reports from the same employee; no replacement ID validated. **No automatic administrative reconciliation or AI inference may be used to choose one.**
- `LEGACY_14` is a distinct historical backlink/E1-compensation case; do not conflate.

## 3. Risks and defense-in-depth

### A — human edits
- A Google Sheets `SHEET` protection with approved editors can restrict ordinary collaborator edits. **Spreadsheet owners can still edit protected sheets/ranges**; protection is not an immutable lock for the owner.
- `warningOnly=true` raises a confirmation warning but still permits edits. Use it as an accidental-change friction layer, not as a compliance-enforcement substitute.
- Restricting sheet editors without verifying the **effective Apps Script identity** may break existing submit, review, disposisi, or audit-log writes. Installable triggers run as the trigger creator; Web Apps depend on their execution configuration.
- Protection check RC1 scans sheet-wide protections only; audit possible **RANGE-level protections** separately before concluding a sheet is wholly unprotected.

### B — indexes
- RC1 `aceDsp004AssertIndexCollisionSafeRC1_` blocks overwrite when target index contains a different report ID. A blocked synchronization can still enqueue a repair request via the existing 2B1 error handler; therefore it is not zero-write end-to-end and is not a substitute for input validation.
- Before production deployment, test cross-ID collision on a **separate spreadsheet copy** and confirm queue and rollback behavior.
- Do not auto-replay collision records: investigation and source-ID validation must precede maintenance.

### C — administrative cancellation
- Future cancellation/replacement should record an explicit state, original report ID, actual cancellation time, requester, reviewer, reason, optional verified replacement ID, and point/review/tunjangan effects. Preserve evidence append-only; avoid direct row deletions.
- `ACTIVE_622` requires documented resolution: either evidence-backed replacement identified or explicitly recorded cancellation without replacement. Neither has been approved or executed in RC1.
- `ACE-DSP-004` must remain **FAIL** until canonical source relationships have been reconciled through approved/verified actions, not by adjusting evaluator findings or silently waiving the case.

## 4. Safe implementation and acceptance gates

1. **No immediate production sheet protection.** First identify spreadsheet owner, current editor roles, Web App `execute as` mode, installable triggers and their creator accounts, and current RANGE protections. Never print personal emails or private data in shared logs.
2. Create **isolated test spreadsheet and test Apps Script** with no live triggers and no production deployment.
3. Test two policy variants per critical sheet: (a) warning-only for owner accidental edits; (b) restricted editors with verified Apps Script executor access. Prefer least privilege compatible with real operating model, not blanket lockout.
4. Test representative normal flows: submit report, administrative review, employee revision, index dual-write and queue handling, disposition linkage, audit-log append, triggers/automation. Verify every expected write and exact-ID relationship.
5. Exercise protected sheet editing as non-authorized collaborator (block) and owner/operator (warning/approval as policy), plus simulated accidental row delete. Do not touch real staff records.
6. Review BDR `PRE_MAINTENANCE` readiness and rollback. Obtain explicit human approval for any production protection or data corrections; implement in limited batches, monitor failed executions, and rerun canonical controls.
7. Archive acceptance evidence and mark `ACE-DSP-004` status from actual canonical evaluator only.

## 5. Current go/no-go

| Area | State |
|---|---|
| Read-only diagnostic RC1 | **COMPLETE** |
| Synthetic tests in Apps Script | **23/23 PASS** |
| Historical evidence | **PRESERVED** |
| Same-owner candidate search | **18 found; 0 verified replacements** |
| Sheet-wide protections | **0 on all 5 core sheets** |
| RANGE-level protections | **UNKNOWN / NOT TESTED** |
| Installed Apps Script deployment behavior | **NOT VERIFIED** |
| Index guard end-to-end on isolated copy | **NOT TESTED** |
| Controlled protection rollout | **NOT APPROVED / NOT APPLIED** |
| Administrative correction ACTIVE_622 | **NOT APPROVED / NOT APPLIED** |
| Canonical ACE-DSP-004 | **FAIL** |

## 6. Technical references

- Google Apps Script `Protection` documentation: https://developers.google.com/apps-script/reference/spreadsheet/protection
- Google Apps Script installable triggers: https://developers.google.com/apps-script/guides/triggers/installable
- Google Sheets sheet and range protection: https://support.google.com/docs/answer/1218656

**Do not merge this branch into `main` or activate a production deployment until the acceptance conditions above are met.**
