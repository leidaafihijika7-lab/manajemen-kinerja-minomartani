# PHA-07B B1 — Synthetic Transaction & Queue Failure Injection RC1

**Version**: `PHA07B-B1-FAULT-RC1-2026.10.11.02`  
**Date**: 11 October 2026 (Asia/Jakarta)  
**Branch**: `feature/ace-dsp004-protection-acceptance-rc1`  
**Current gate**: **B1 IMPLEMENTED / OFFLINE TESTS PASS / LIVE READ-ONLY PREFLIGHT PENDING / WRITES DISABLED**.  
**Production**: **NO-GO**, `ACE-DSP-004` remains **FAIL**.

## 1. Dedicated, disposable test data

Original accepted B0 workbook (must remain untouched):
`SANDBOX_PHA07B_B0_SYNTHETIC_ONLY` — https://docs.google.com/spreadsheets/d/1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8/edit

New native B1 disposable *copy* (the only permissible write target for later B1 experiments):
`SANDBOX_PHA07B_B1_DISPOSABLE_SYNTHETIC_ONLY` — https://docs.google.com/spreadsheets/d/1hldhvaMRo5etOCQlqCYISgvbpAdOIfAJN5IfGa3kD3Q/edit

Google Drive copy succeeded; distinct spreadsheet IDs, Google-native MIME, same ten tab names and matching bounded baseline values on eight core tabs. In the **B1 copy only**, `MULAI_DI_SINI!A5` was changed to `STAGE_B1_DISPOSABLE_TEST_COPY`, and `A8` to `B1_WRITES_REQUIRE_OPERATOR_OPT_IN`. No report, index, audit, disposition or queue records were changed. The B0 workbook remains the independently accepted pristine baseline.

Expected initially: two synthetic B0 source reports, two matching Index rows, one linked disposition, two submit audits, no queue jobs, no event journal entries, and 15 scenarios with `PENDING` statuses. Never copy real employee records or secrets into this environment.

## 2. New isolated Apps Script harness

**Source**: `PHASandboxB1TransactionQueueRC1.gs` (the feature branch).

Create **a new standalone Apps Script project** named `SANDBOX_PHA07B_B1_SCRIPT_TEST`. Do not use the live `Manajemen Kinerja` Apps Script project or the earlier B0/RC1 sandbox script projects.

Four public entrypoints:

| Function | Intended first use | Behavior |
|---|---|---|
| `validasiModelB1PHA07BRC1()` | Run now | Pure in-memory model, **41/41 test cases**; no Drive/Sheets access |
| `praUjiTransaksiB1PHA07BRC1()` | Run now | **Read-only** check of B1 exact spreadsheet ID/title, ten tabs, markers, original synthetic anchors, empty queue/journal, unchanged 15 scenario statuses, and empty scratch ranges |
| `ujiGagalIndexAntreanB1PHA07BRC1()` | **DO NOT RUN YET** | Optional explicitly enabled sandbox write: source report 0003 persists, index write deliberately skipped, unbound `ROW` queue entry observed, replay policy stops it, scratch rows restored |
| `ujiPemulihanReviewDisposisiB1PHA07BRC1()` | **DO NOT RUN YET** | Optional separately approved sandbox write: exact-ID queue retry, source/index agreement, detectable missing audit, partial review and disposition log gaps, explicit synthetic repair and bounded rollback |

**Default operator gate**: `var PHA07B_B1_ALLOW_WRITE_RC1=false;`. Both write entrypoints immediately return `WRITE_DISABLED` with no sheet interaction unless the operator separately changes the flag. No `Script Properties`, DriveApp, production spreadsheet IDs, triggers, app deployment, or full Portal business handlers are referenced.

## 3. Source-code grounded failure semantics

Production candidate `Kode.gs` shows the report is appended to `Rekap_Kinerja` before the 2B1 index dual-write wrapper. A failed index sync is swallowed by the wrapper after attempting queue insertion; source may remain persisted. Queue `ROW` jobs encode a mutable row pointer but not the original report ID; `FAILED` items below five attempts are processed again; `FULL_REBUILD` is marked for manual rebuild. Audit and disposition writes happen after source persistence and can fail separately.

The B1 test implements these consequences **as a synthetic approximation**, not by calling the production functions. Its proposed fail-closed retry decision explicitly **HOLDs every `ROW` job lacking an independently bound original report ID** even if the current occupant happens to match. BY_ID requires the exact current source ID and rejects a foreign existing index ID. BY_NONCE checks owner, nonce, uniqueness, nonempty source report ID and foreign-index conflicts. Unknown, exhausted or rebuild jobs do not proceed automatically.

This policy is **not deployed** to the production queue processor. All scenario results are evidence for future guarded production changes, not evidence that historical `ACTIVE_622` was reconciled.

## 4. Exact safety boundaries for future write tests

Every write is limited to the **B1 disposable copy**, to preverified blank scratch cells:

| Tab | Writable scratch region |
|---|---|
| `Rekap_Kinerja` | `A4:BS4` (71 columns) |
| `Index_Laporan` | `A4:L4` |
| `Index_Laporan_Sync_Queue` | `A2:L2` |
| `Audit_Log` | `A4:D5` |
| `Disposisi_Surat` | `A3:Y3` |
| `Disposisi_Penerima` | `A3:L3` |
| `Disposisi_Log` | `A3:N3` |
| `EVENT_JOURNAL_B0` | `A2:K2` (reserved; not used in current writer code) |

Preflight rejects nonempty/hidden-formula scratch cells, extra/missing tabs, changed row counts, status changes in `SKENARIO_B0`, missing original B0 IDs/index pointers/audit IDs, modified queue headers, wrong B1 title/ID/markers, and current-operator-visible triggers. The test writer uses a script lock, takes a typed snapshot of all preexisting synthetic records and headers, marks every scratch region before writing, and clears **only touched scratch regions** in `finally`. Successful restoration requires both a blank scratch region and exact typed baseline equivalence; no date-like existing rows are rewritten.

Protection caveat: Apps Script trigger visibility is **only the current user's** trigger inventory; never claim global absence of triggers solely from `getProjectTriggers()`. Keep the new B1 script project private and do not install triggers.

## 5. Offline quality assurance already completed

- `validasiModelB1PHA07BRC1`: **41/41 PASS** in V8 in-memory test.
- Mock Apps Script integration using real, connector-read synthetic B1 baseline rows: read-only preflight PASS; write gate OFF produced zero writes.
- Mock `B1-INDEX-FAILURE`: report source persisted; index deliberately skipped; unbound queue PENDING observed; `ROW` replay held; two scoped writes and restoration PASS; next preflight also PASS.
- Mock `B1-RETRY-REVIEW_DISPOSITION`: BY_ID match allowed; review divergence, missing audit and disposition event gap detected before synthetic repair; matching links checked; queue transitions DONE; scoped scratch cleanup PASS; next preflight PASS.
- Injection of a partial write exception triggered cleanup without false success. Simulated cleanup failure produced `SANDBOX_B1_RESTORE_NEEDS_ATTENTION` and `manualRestoreRequired=true`.
- A visible unexpected trigger and a prepopulated scratch row stopped read-only preflight.

**IMPORTANT: these are offline mock/simulation results. Neither B1 write entrypoint has been run against the actual B1 Google Sheet. The live B1 copy still has only its original synthetic baseline (aside from the explicit two stage-marker cells).**

## 6. Phase A: operator read-only acceptance (AUTHORIZED NOW)

1. Open https://script.google.com/home and create new standalone project **`SANDBOX_PHA07B_B1_SCRIPT_TEST`**.
2. In its only default `.gs` script, replace `myFunction()` with `PHASandboxB1TransactionQueueRC1.gs` content from the feature branch. Do **not** paste into production, B0, or earlier PHA-05–08 script project.
3. Keep `PHA07B_B1_ALLOW_WRITE_RC1=false`. Do not deploy, copy secrets or install triggers.
4. Run `validasiModelB1PHA07BRC1()`; expected `PHA07B_B1_PURE_VALIDATION` **41 lulus / 0 gagal**, `readOnly=true`.
5. Run `praUjiTransaksiB1PHA07BRC1()`; expected `PHA07B_B1_PREFLIGHT` with `sukses=true`, `mode=READ_ONLY`, `exactB1SandboxVerified=true`, `baselineUntouched=true`, `queueEmpty=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `actualTransactionApproved=false`.
6. Share the two compact logs for review. **Do not run either B1 writer entrypoint yet.**

## 7. Phase B: separately gated live B1-only fault tests (NOT YET AUTHORIZED)

Only after the operator and reviewer verify Phase A logs and test scope, temporarily opt in with `PHA07B_B1_ALLOW_WRITE_RC1=true` in the isolated B1 project. Run only `ujiGagalIndexAntreanB1PHA07BRC1()` once, reset to `false`, and independently verify that B1 scratch/queue are clear and B0 is unaffected.

If the first controlled writer passes and typed baseline is independently verified, separately authorize `ujiPemulihanReviewDisposisiB1PHA07BRC1()` once under the same temporary gate. Do not immediately run both writers.

Expected `PHA07B_B1_WRITE_TEST`: `sukses=true`, `status=PASS_SYNTHETIC_WRITE_AND_RESTORE`, `restored=true`, `manualRestoreRequired=false`, `productionDataWritten=false`, `actualProductionHandlersUsed=false`. The fault test additionally requires `indexFaultInjected=true`, `queuePersistedObserved=true`, `rowReplayHeld=true`. The retry test requires `byIdRetrySafe=true`, `reviewDivergenceDetected=true`, `auditGapDetected=true`, `dispositionGapDetected=true`, and `recoveryLinksVerified=true`.

On any `manualRestoreRequired=true`, `STOPPED`, or `SANDBOX_B1_RESTORE_NEEDS_ATTENTION`: **STOP, reset the writer flag false, do not rerun or launch another test.** Inspect the B1-only scratch ranges above. Because B1 is disposable and B0 is preserved, recreating a fresh B1 copy from the verified B0 baseline is preferable to guessing how to repair mixed-type partial writes. Never alter the original B0 or production database.

## 8. Acceptance boundaries

B1 stage currently **READY FOR PHASE A READ-ONLY**, not a production PASS. The proposed queue risk policy is advisory, and the two writer tests use synthetic harness functions rather than the Portal production submit/review/queue implementations. Demonstrating **actual live Portal code** under forced index failures would require further isolated integration with copies of safe code and explicit deployment/session controls; do not assume this stage covers that.

Remediation of `ACE-DSP-004 ACTIVE_622` needs documented administrative reconciliation and human authorization independently of B1, and `ACE-REV-003` must not be changed by these tests. **Production NO-GO**; no `main` merge or Web App deployment.

## 9. Phase A operator execution — PASS (11 October 2026)

**Source of proof**: Maintainer-provided Apps Script execution screenshots from the isolated `SANDBOX_PHA07B_B1_SCRIPT_TEST`, approximately 13:02–13:03 WIB. They report:

- `PHA07B_B1_PURE_VALIDATION`: `sukses=true`, `lulus=41`, `gagal=0`, `readOnly=true`, `productionDataWritten=false`, `liveHandlersExercised=false`.
- `PHA07B_B1_PREFLIGHT`: `sukses=true`, `versi=PHA07B-B1-FAULT-RC1-2026.10.11.02`, `mode=READ_ONLY`, `exactB1SandboxVerified=true`, `baselineUntouched=true`, `queueEmpty=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `actualTransactionApproved=false`.

**Independent connected Google Sheets read-back after execution**: 9/9 bounded checks PASS: B1 stage/write-opt-in markers, two exact report↔index source identities/owners/nonces/row pointers, queue empty, two submit audits, recipient and disposition event link, 15/15 scenario statuses still `PENDING`, empty event journal, empty targeted scratch rows, and preserved original B0 stage marker and empty queue. These observations are read-only and do not imply global trigger verification.

### Decision

**B1 Phase A (pure validation and read-only preflight): CLOSED / PASS.** This does **not** mean B1 writer acceptance, full system acceptance, or authorization to change production controls.

**Next controlled test approved within the established synthetic-only B1 scope**: `ujiGagalIndexAntreanB1PHA07BRC1()` **exactly once**, and only in the isolated standalone B1 script project after deliberate temporary change of `PHA07B_B1_ALLOW_WRITE_RC1` from `false` to `true`. This tests synthetic report append → injected index skip → unbound `ROW` queue PENDING → fail-closed replay policy → bounded restoration. Immediately reset and save the flag `false` regardless of the test result. Do not run the other write test yet.

On `manualRestoreRequired=true`, `restored=false`, an unexpected stopCode, or `sukses=false`, stop: do not retry, independently check B1 scratch rows and do not proceed to review/disposition writer test. Success criteria: `status=PASS_SYNTHETIC_WRITE_AND_RESTORE`, `indexFaultInjected=true`, `queuePersistedObserved=true`, `rowReplayHeld=true`, `restored=true`, `manualRestoreRequired=false`, `productionDataWritten=false`.

Canonical ACE-DSP-004 still FAIL, and PHA-07B B1 write acceptance remains PENDING until actual operator execution plus independent baseline verification. Production and GitHub main remain NO-GO.

## 10. B1-01 live synthetic index-failure acceptance — CLOSED / PASS (11 October 2026, 13:11 WIB)

Operator executed `ujiGagalIndexAntreanB1PHA07BRC1()` **once** in standalone `SANDBOX_PHA07B_B1_SCRIPT_TEST` and supplied an Apps Script execution screenshot. `PHA07B_B1_WRITE_TEST` reported:

```json
{"sukses":true,"versi":"PHA07B-B1-FAULT-RC1-2026.10.11.02","caseId":"B1-INDEX-FAILURE","status":"PASS_SYNTHETIC_WRITE_AND_RESTORE","target":"B1_DISPOSABLE_SANDBOX_ONLY","sourceCommittedObserved":true,"indexFaultInjected":true,"queuePersistedObserved":true,"rowReplayHeld":true,"byIdRetrySafe":false,"reviewDivergenceDetected":false,"auditGapDetected":false,"dispositionGapDetected":false,"recoveryLinksVerified":false,"restored":true,"manualRestoreRequired":false,"productionDataWritten":false,"actualProductionHandlersUsed":false,"originalFixtureUntouched":true,"scratchCleared":true}
```

`byIdRetrySafe=false` and the review/audit/disposition flags `false` are **expected** in this first index-failure case; those are tested separately by the second writer.

### Independent post-run verification (connected Google Sheets, read-only)

- Exact native Google Sheets files reidentified: B1 `SANDBOX_PHA07B_B1_DISPOSABLE_SYNTHETIC_ONLY` and untouched B0 `SANDBOX_PHA07B_B0_SYNTHETIC_ONLY` (different IDs; both ten tabs).
- Bounded value-by-value comparison of **9 tab regions** against B0: `Rekap_Kinerja!A1:BS4`, `Index_Laporan!A1:L4`, `Index_Laporan_Sync_Queue!A1:L2`, `Disposisi_Surat!A1:Y3`, `Disposisi_Penerima!A1:L3`, `Audit_Log!A1:D5`, `Disposisi_Log!A1:N3`, `EVENT_JOURNAL_B0!A1:K2`, and `SKENARIO_B0!A1:F16`.
- **All 9/9 comparison regions matched exactly, with zero observed differences** in unformatted cell values. B1 queue contains header only (0 work items); only the two original reports/index rows and their audit/disposition evidence remain; 15 scenarios are unchanged and no event journal entries remain.
- B1 stage labels `MULAI_DI_SINI!A5=STAGE_B1_DISPOSABLE_TEST_COPY` and `A8=B1_WRITES_REQUIRE_OPERATOR_OPT_IN` remain intact; B0 original stage label remains intact.

### Acceptance and outstanding gate

**B1-01 synthetic index-failure + unbound-row queue hold + scratch restore = CLOSED / PASS**, substantiated by the real Apps Script operator log and independent bounded live-sheet baseline comparison. The first case used **the isolated synthetic harness, not the production Portal handlers or production queue processor**. No historical reports were corrected; production and GitHub main remain untouched by this acceptance.

**Critical pending action:** The submitted screenshot shows `PHA07B_B1_ALLOW_WRITE_RC1=true` in the B1 Apps Script editor during the test. The operator was instructed to restore it to `false` immediately, but as of this note there is **no independent evidence or user confirmation** that the flag has been saved as `false`. This must be completed and (preferably) confirmed by a subsequent read-only preflight before enabling any second test.

**B1-02 (`ujiPemulihanReviewDisposisiB1PHA07BRC1`) remains PENDING / NOT EXECUTED.** It tests different conditions and must not be silently marked PASS. Once write-off and new preflight are confirmed, reviewers may separately authorize exactly one isolated second run. On `manualRestoreRequired=true`, `restored=false`, `sukses=false`, any unexpected stopCode, or observed baseline drift, halt all writes and investigate—do not retry automatically.

Production release still **NO-GO**, canonical `ACE-DSP-004` still **FAIL**; do not auto-correct `ACTIVE_622` or reprocess historical `ROW` queue items.
