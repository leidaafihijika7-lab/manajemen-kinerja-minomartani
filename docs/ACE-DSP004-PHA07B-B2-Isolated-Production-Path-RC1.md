# PHA-07B B2 — Isolated Production-Path Integration RC1

**Date:** 11 October 2026 (Asia/Jakarta)  
**Version:** `PHA07B-B2-SOURCE-TRACE-RC1-2026.10.11.01`  
**Status:** B2 ISOLATED SOURCE-TRACE HARNESS BUILT; 29/29 OFFLINE PASS; OPERATOR APPS SCRIPT READ-ONLY ACCEPTANCE PENDING.  
**Branch:** `feature/ace-dsp004-protection-acceptance-rc1`  
**Production:** **NO-GO**; canonical `ACE-DSP-004` remains **FAIL**.

## 1. Scope and truthful acceptance boundary

B2 advances beyond B1's independently designed fault simulator by executing **verbatim function bodies from the candidate GitHub Portal source**, but runs them under **local, in-memory adapters** for spreadsheet rows, cache, lock, auth, period/cutoff, queue and disposition logging. This preserves the actual control flow of the copied source functions while preventing access to any live production service.

**This is not an entire real Portal integration test** and does not establish equivalence to whichever Apps Script `Web App` version is currently deployed. Real production Sheet/Script Properties, admin session, APBKal validations, cutoff policies, AI, upload flows, queue worker privileges and triggers are not wired into the harness. No Apps Script production deployment is invoked or changed.

## 2. Source parity: pinned branch code, NOT necessarily deployed production

| File | GitHub ref / blob SHA |
|---|---|
| `Kode.gs` | `feature/ace-dsp004-protection-acceptance-rc1` / `387c179c684c3a1820da662f961133b4e7a67ccb` |
| `ACEDsp004IndexIntegrityRC1.gs` | Same feature branch / `22991bb74fe812b6df1e7e8fe44d989f71b62684` |
| `SheetSchema.gs` | Same feature branch / `93ce60fd9fe7869b7d5fdfc7adb8a3f45fc5a690` |
| `Kode.gs` on `main` | `f0222ef85774aabf7d107547e0fe2fdbc52434d5` |

An exact connected-GitHub source comparison found **one 280-character addition** to `Kode.gs` on the feature branch beginning at approximately line 20300: the comment and call `aceDsp004AssertIndexCollisionSafeRC1_(shRekap, shIndex, rowRekap, targetRow, idLaporan, expected);` before the index formatting and `setValues` operations. `main` has **no corresponding guard call** and the standalone guard file is **not present** on `main`. This is a candidate change, not a deployed protection claim. Separately verify the actual bound Apps Script live source and Web App deployment version before any production go-live decision. Do not merge or deploy automatically.

**The 11 following function bodies were extracted verbatim**, not reimplemented, and compared programmatically with the pinned GitHub source during offline QA:

| Function | Original file | Line approx. |
|---|---|---:|
| `simpanBarisRekapKinerjaSubmit_` | Kode.gs | 6895 |
| `jalankanEfekSampingSubmitKinerja_` | Kode.gs | 7020 |
| `normalizeId_` | Kode.gs | 1263 |
| `sinkronkanSatuRowIndexLaporan2B1_` | Kode.gs | 20381 |
| `sinkronkanIndexLaporanById2B1_` | Kode.gs | 20396 |
| `sinkronkanIndexLaporanByNonce2B1_` | Kode.gs | 20412 |
| `antrekanPerbaikanIndexLaporan2B1_` | Kode.gs | 20360 |
| `hitungStatusQueueIndexLaporan2B1_` | Kode.gs | 20445 |
| `prosesAntreanPerbaikanIndexLaporan2B1` | Kode.gs | 20462 |
| `aceDsp004NormalizeIdRC1_` | ACEDsp004IndexIntegrityRC1.gs | 10 |
| `aceDsp004IndexDecisionRC1_` | ACEDsp004IndexIntegrityRC1.gs | 13 |

Other helpers such as `getSS_`, lock/cache services, index builder and full APBKal/cutoff policy remain **mock adapters**. The complete `prosesReviewAdmin` function was source-reviewed but was **not** extracted/executed in this RC1 harness because its role/session, business-date and policy dependencies need a separate test fixture. Likewise, `tandaiDisposisiSudahDilaporkanInternal_` was inspected, but B2 currently executes the parent effects orchestrator with an adapter for that child operation; it does not execute real recipient writes.

## 3. Isolated native Google Sheets test environment

- **B0 original (unchanged):** https://docs.google.com/spreadsheets/d/1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8/edit
- **B1 original (unchanged by B2):** https://docs.google.com/spreadsheets/d/1hldhvaMRo5etOCQlqCYISgvbpAdOIfAJN5IfGa3kD3Q/edit
- **New disposable B2 copy:** https://docs.google.com/spreadsheets/d/1xW2kMz1lFv6wtaWNNgNoyVCuLZnsqsGpAQ886blVtcU/edit

B2 is a separate native Google Sheets copy of pristine B0, retaining ten tabs, two synthetic reports and index rows, two submit audit rows, one linked disposition and an **empty** queue and event journal. 15 planning scenarios remain PENDING. The only two B2 edits are the new stage and lockout sentinels:

- `MULAI_DI_SINI!A5 = STAGE_B2_PRODUCTION_PATH_ISOLATED`
- `MULAI_DI_SINI!A8 = B2_ALL_WRITES_NOT_AUTHORIZED`

A connected Google Sheets value/type comparison of **nine bounded data regions** between B2 and original B0 returned **9/9 identical**: `Rekap_Kinerja!A1:BS4`, `Index_Laporan!A1:L4`, `Index_Laporan_Sync_Queue!A1:L2`, `Disposisi_Surat!A1:Y3`, `Disposisi_Penerima!A1:L3`, `Audit_Log!A1:D5`, `Disposisi_Log!A1:N3`, `EVENT_JOURNAL_B0!A1:K2`, `SKENARIO_B0!A1:F16`. B0 stage markers are preserved.

## 4. Tested production-source behavioral findings (IN-MEMORY EVIDENCE)

These scenarios executed the **verbatim code paths** against synthetic memory adapters, not real Google Sheets/production:

| ID | Observation | Risk / implication |
|---|---|---|
| SRC-01 | Original submit core appends once, and repeated owner+nonce is rejected under the simulated script lock | Nonce idempotency present in the copied core; complete form/policy validators are not tested |
| SRC-02 | Original queue processor calls `sinkronkanSatuRowIndexLaporan2B1_` for `ROW` using only `ROW_REKAP`, context and `force/noQueue` | **Missing original queued report ID**; stale-row identity cannot be established from the queued item |
| SRC-03 | If the local sync adapter reports success on the current occupant, original queue worker sets `ROW` item to DONE—even if the synthetic historic report is different | **Conditional wrong-record-acknowledgment risk**, not proof of a real incident |
| SRC-04 | Original enqueue calls cache `.put()` before durable queue `.appendRow()` | If queue append fails after cache put, the same event can be suppressed by cache during the dedup TTL (600s in source) |
| SRC-05 | Original `FAILED` items with 4 attempts can be retried; 5 attempts are skipped; `FULL_REBUILD` transitions to `NEED_REBUILD` | No automatic historical queue replay or rebuild is justified |
| SRC-06 | Original effects orchestrator emits `SUBMIT_LAPORAN` audit before recipient update and disposition log | If the synthetic recipient dependency fails, audit remains while the disposition log is skipped |
| SRC-07 | Branch RC1 guard's real `aceDsp004IndexDecisionRC1_` rejects foreign index IDs and pointer collisions | Prevents a class of index overwrites **if actually installed**, but doesn't bind old `ROW` queue items |

**Additional source-only review (not executed):** real `prosesReviewAdmin` writes status/points, note and timestamp in separate calls; `tandaiDisposisiSudahDilaporkanInternal_` performs multiple sequential per-cell writes. These deserve further fully isolated failure injection before any production acceptance.

## 5. Offline QA already completed

- `PHAB2IsolatedProductionPathRC1.gs` committed only on feature branch; 11/11 actual function definitions confirmed byte-identical to pinned files.
- **29/29 pure source-path behavioral checks PASS** under the JavaScript V8 execution environment.
- Read-only B2 preflight simulated using bounded real connected B2 spreadsheet values and fake Apps Script services: PASS.
- The preflight failed closed for an unexpected visible trigger, wrong B2 marker, unexpected scratch row, hidden formula in a scratch cell, and wrong workbook title.
- Zero Google Sheets business-data writes by the testing helpers, and no production ID is embedded in the B2 module.

**Caution:** The offline QA mocks Apps Script services and does **not** prove that these test functions already executed in the user's Google Apps Script V8 account. Operator acceptance remains pending.

## 6. User operator steps — B2 Phase A (READ-ONLY only)

1. In Google Apps Script, create a **new standalone project** named `SANDBOX_PHA07B_B2_SCRIPT_TEST`. Never replace the existing production `Manajemen Kinerja` `Kode.gs` or re-use the B0/B1 test scripts.
2. From the feature branch copy **the complete** `PHAB2IsolatedProductionPathRC1.gs` into the new project's `Kode.gs` and save. Its original-production function copies are all **nested inside test runners**, not exposed as individually runnable production functions.
3. Leave `PHA07B_B2_WRITE_ENABLED=false`. Do not add triggers, Script Properties, external libraries, Web App deployment, real employee records or any spreadsheet ID other than the fixed B2 synthetic copy.
4. Execute only `validasiJalurProduksiB2RC1()`; expected log `PHA07B_B2_SOURCE_PATH_VALIDATION`: **29 lulus / 0 gagal**, `sukses=true`, `inMemoryOnly=true`, `spreadsheetAccessed=false`, `productionHandlersFullyIntegrated=false`, `productionDataWritten=false`.
5. Execute only `diagnostikLingkunganB2PHA07BRC1()`; expected log `PHA07B_B2_PREFLIGHT`: `sukses=true`, `mode=READ_ONLY`, `copyIdentityVerified=true`, `baselineConsistent=true`, `queueEmpty=true`, `scenarioBaseline=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `productionPathLiveSheetsTested=false`, `productionRolloutAuthorized=false`.
6. Share the two log lines and do not run any other functions or grant write permission.

## 7. B2 subsequent gates (NOT AUTHORIZED by the current deliverables)

| Acceptance control | State | Condition for advancement |
|---|---|---|
| B2-A01 — source SHA and 11-function verbatim parity | PASS offline | Track drift between candidate, main, installed source and deployed Web App |
| B2-A02 — in-memory production-code execution | PASS 29/29 offline | Operator must reproduce in standalone Apps Script |
| B2-A03 — native B2 sandbox isolated/identical to B0 | PASS connector | Operator read-only preflight required |
| B2-B01 — actual Apps Script pure and read-only preflight | PENDING | No code changes, correct fixed ID and write flag OFF |
| B2-B02 — real submit/index/queue replay against disposable B2 spreadsheet | PENDING | Separate sandbox-only scope, write approval, exact ID-bound queue safety, rollback verified |
| B2-B03 — real review/disposition and admin/session dependencies | PENDING | Complete isolated policy dependencies, negative fault cases |
| B2-B04 — comparison with bound live Apps Script and deployed Web App | PENDING | Source/version concordance evidence; never claim `main` equals deployment without evidence |
| B2-B05 — security/rollback/BDR/protection and ACE admin reconciliation | PENDING | Separate written approvals, production NO-GO until complete |

## 8. Release decision

**GO** only to B2 Phase A pure and read-only operator checks. **NO-GO** for B2 live write tests, production queue replay, changing `Kode.gs` production, installing sheet protections, touching Script Properties/triggers, modifying any Web App deployment or merging into `main`. `ACE-DSP-004` stays **FAIL**; `ACTIVE_622` is not automatically reconciled by these synthetic experiments. `ACE-REV-003` remains a separate outstanding FAIL.
