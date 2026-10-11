# ACE-DSP-004 — PHA-07B Transaction & Queue Integrity Acceptance RC1

**Version**: `PHA07B-TXN-QUEUE-RC1-2026.10.11.01`  
**Date**: 11 October 2026 (Asia/Jakarta)  
**Status**: STAGED / PURE-LOGIC TEST PASS / ACTUAL SANDBOX FIXTURE READ PASS / OPERATOR APP SCRIPT EXECUTION PENDING.  
**Production decision**: NO-GO. Canonical `ACE-DSP-004` remains FAIL.

## 1. Objective, strict safety boundary

Examine report source append, index dual-write, review, disposition linkage, audit event recording and the queue's replay semantics **without** deploying or mutating real records. This phase builds a **read-only + in-memory** test harness for the already isolated six-tab native synthetic sandbox. Actual transaction / queue end-to-end acceptance requires a **separate** disposable full-flow sandbox later; it is not claimed by the results below.

**Never run any production `Kode.gs` handler** such as `simpanDataKinerja`, `prosesReviewAdmin`, `prosesAntreanPerbaikanIndexLaporan2B1`, a backup routine, or index rebuild to test this module. No live triggers, Script Properties, OAuth credentials, employee records, real recipients, or production spreadsheet IDs may be inserted in the sandbox project.

## 2. Grounded source-code workflow review

Source is branch `feature/ace-dsp004-protection-acceptance-rc1`, with `Kode.gs`, `SheetSchema.gs`, `ACEDsp004IndexIntegrityRC1.gs` and PHA-07/PHA-08 sandbox helpers. These are **source-design observations**, not proof that a different active Web App deployment has the exact same behavior.

| Component | Source function | Observed design and implication |
|---|---|---|
| Submit core | `simpanBarisRekapKinerjaSubmit_` | Adds the record to `Rekap_Kinerja` first; checks user + nonce against prior submitted reports. Index dual-write is wrapped around source write. |
| Dual-write | `simpanBarisRekapKinerjaSubmit_` wrapper → `sinkronkanSatuRowIndexLaporan2B1_` | On index failure, source submit may remain committed while index sync fails and queue handling is attempted. Submit success must not be equated with full index integrity. |
| Collision guard | `aceDsp004AssertIndexCollisionSafeRC1_` in `sinkronkanSatuRowIndexLaporan2B1Internal_` | Guard runs under the sync lock before format/setValues. It checks existing index ID, source ID and pointer. PHA-08 validated guard-level behavior only. |
| Audit | `jalankanEfekSampingSubmitKinerja_` → `logAudit_` | Audit append is after source/dual-write; `logAudit_` catches and logs its own errors. Missing event cannot be treated as source rollback. |
| Disposition | `tandaiDisposisiSudahDilaporkanInternal_` plus `logDisposisi_` | Updates status, reverse link, date and note through multiple cell writes; logger also catches its own errors. Partial updates are possible; linked report and event evidence require separate checks. |
| Review | `prosesReviewAdmin` plus dual-write wrapper | Admin review writes source status and points, then syncs index by report ID. Failure can leave source/index disagreement for queue reconciliation. |
| Queue entry | `antrekanPerbaikanIndexLaporan2B1_` | `ROW` entries store row pointer and context, **not the original report ID**. Cache dedup key is set before queue append; when append fails, an attempted enqueue may be suppressed for 600s. |
| Queue process | `prosesAntreanPerbaikanIndexLaporan2B1` | Processes PENDING, RETRY and FAILED with attempts below 5; `FULL_REBUILD` transitions to NEED_REBUILD rather than automatic rebuild. |

### Material queue integrity risk — row pointer reuse

Production 2B1's `ROW` queue item is unbound to the original report ID (has rowRekap/context only). After deletion or row reuse, a replay by row pointer can target a **different** report currently occupying that row. The RC1 collision guard checks present source/index identities and may reject a cross-ID overwrite; however, if source and index have **both already moved** to the new ID, a replay could be marked successful even though the old report's queued reconciliation was never addressed. This is a **plausible code-level risk**, not an observed queue replay incident. Do not auto-replay historical `ROW` entries or mark `ACE-DSP-004` PASS based on queue status alone.

Other risks worth testing on an isolated full-flow sandbox: missing audit/disposition event after source persistence; sequential disposition updates that stop partway; non-atomic index failure/queue insertion; duplicate queue workers; `FAILED` status still eligible below max attempts; cache dedup occurring before durable enqueue.

## 3. Deliverable: PHASandboxTransactionQueueRC1.gs

**GitHub**: `PHASandboxTransactionQueueRC1.gs` on the feature branch. Contains *no* write APIs, no `DriveApp`, no `PropertiesService`, no calls that create triggers or deployments. It uses existing sandbox-only helper functions `pha08RequireFixtureRC1_` and `pha07PreflightCoreRC1_`, so install it in **the current separate sandbox Apps Script**, not in production.

Public entrypoints:

1. `validasiLogikaPHA07BRC1()` — **30/30 pure in-memory test cases**; no spreadsheet/network interaction.
2. `diagnostikTransaksiAntreanPHA07BRC1()` — **read-only** five-sheet evidence check and queue model summary. It verifies exact synthetic sandbox identity, six fixture tabs, locked-out writer flags, absence of visible sandbox triggers, strict source protection, date-text/index nonce baseline, and cross-sheet relationships. Does **not** create or read a real queue tab.

Evidence it cross-validates:

| Fixture | Validation |
|---|---|
| `Rekap_Kinerja` rows 2–3 | Report ID, owner, nonce, status/points and optional disposition |
| `Index_Laporan` rows 2–3 | Exact same report ID, ROW_REKAP pointer, owner, nonce, review status/points, disposition link |
| `Audit_Log` rows 2–3 | Two exact `SUBMIT_LAPORAN` IDs and actor matches |
| `Disposisi_Penerima` row 2 | Correct recipient owner, disposition, report reverse-link and status |
| `Disposisi_Log` row 2 | Exact disposition-create action, actor, report ID in recognized detail and structured target |

The queue check is **in-memory** and makes an explicit distinction between `productionEligible` under the present queue code and a **proposed** fail-closed `proposed` risk classification. Advisory classes such as `HUMAN_REVIEW_ROW_UNBOUND` are **not** currently enforced by the Portal. Logs do not print names or personal data.

## 4. Work completed now — authoring and independent QA

- GitHub module created and source updated only on the feature branch.
- Pure test suite: **30/30 PASS** in isolated JS evaluation.
- Real native sandbox read-only source ranges examined via connected Google Sheets (not by running the user's Apps Script yet): **2 source reports, 2 index entries, 2 submit audit events, 1 linked recipient, 1 matching disposition event — all relationships PASS**.
- Full sandbox-like mocked execution of the read-only entrypoint: PASS. Divergent review status, unexpected queue tab, unauthorized actor, and unexpected visible trigger each FAIL CLOSED.
- **ZERO** business-data writes in QA; the current six-tab sandbox is unchanged.

## 5. Operator steps — PHASE A, READ-ONLY ONLY

1. Open the **separate** `SANDBOX_PHA_RC1_SCRIPT_TEST` project. Do **not** open the production `Manajemen Kinerja` Apps Script editor for this step.
2. Confirm `PHA07_ALLOW_WRITE_RC1 = false` in `Kode.gs` and `PHA08_ALLOW_WRITE_RC1 = false` in `PHASandboxIndexCollisionRC1.gs`.
3. Click `+` → `Script`, create `PHASandboxTransactionQueueRC1.gs`. Paste the **entire exact content** from the feature branch and save. Do **not** replace existing `Kode.gs` or PHA-08 file.
4. Run `validasiLogikaPHA07BRC1()`; target `PHA07B_PURE_VALIDATION`: **30 lulus, 0 gagal**, `readOnly=true`.
5. Run `diagnostikTransaksiAntreanPHA07BRC1()`; target `PHA07B_PREFLIGHT`:
   - `sukses=true`, `mode=READ_ONLY`
   - `sandboxFixtureVerified=true`, `sourceIndexAuditDispositionConsistent=true`
   - `queueSheetTouched=false`, `queueSimulatedOnly=true`
   - `writeGatesDisabled=true`, `productionDataWritten=false`
   - `fullTransactionAcceptanceApproved=false`, `productionRolloutAuthorized=false`
6. Share these **two** compact logs for acceptance review. Do not execute any write or queue-processing function.

## 6. Acceptance matrix and Phase B hold

| Control | Current status | Required further evidence |
|---|---|---|
| PHA-07B-A01 — pure transaction/queue model | PASS 30/30 offline | Confirm live sandbox Apps Script execution |
| PHA-07B-A02 — existing source/index/audit/disposition links | PASS read-only connector | Confirm live sandbox read-only preflight |
| PHA-07B-B01 — real sandbox submit append/idempotency | PENDING | Separate full-flow test project and disposable fixture; exact source ID, duplicate nonce rejection |
| PHA-07B-B02 — real review update and index sync | PENDING | Same-ID source/index status and points, protected-write behavior |
| PHA-07B-B03 — real disposition update and log | PENDING | Recipient ownership, exact backlink and log, interrupted update test |
| PHA-07B-B04 — real queue failure and retry | PENDING | Durable queue entry, ID-bound retry, no cross-ID overwrite, no replay based on row pointer alone |
| PHA-07B-B05 — queue duplicate, FAILED, FULL_REBUILD, unknown op | PENDING | Simulated failure/resume and human stop gates on separate disposable sandbox |
| PHA-07B-B06 — rollback / recovery | PENDING | Snapshot and verified rollback, no production-effects |

**Do not add the queue tab to the current six-tab PHA-07/PHA-08 fixture**: doing so would invalidate its exact-six-tab safety preflight. Phase B requires another isolated synthetic workbook and isolated dedicated script configuration, with explicit human approval before any write tests. Never clone production triggers or real employee records.

## 7. GO / NO-GO

**GO** to execute only the two read-only PHA-07B sandbox functions above. **NO-GO** for actual queue repair/replay, production Web App changes, production protection, full-system acceptance, main-branch merge or administrative data correction. `ACE-DSP-004` stays **FAIL** until the `ACTIVE_622` case is resolved through documented, approved evidence-based reconciliation.
