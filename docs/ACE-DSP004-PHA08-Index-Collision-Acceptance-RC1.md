# ACE-DSP-004 — PHA-08 Index Integrity Collision Acceptance RC1

Date: 11 October 2026 (Asia/Jakarta)
Version: PHA08-INDEX-COLLISION-RC1-2026.10.11.01
Status: STAGED. Live Apps Script acceptance not yet run. Production NO-GO.

## Goal and provenance

Validate that a foreign report ID is rejected BEFORE an index writer is reached, whereas an index row whose ID matches the source report is accepted. Retain a strict distinction between guard-level acceptance and full production workflow/queue acceptance.

The module PHASandboxIndexCollisionRC1.gs includes the three unchanged helper function bodies taken from ACEDsp004IndexIntegrityRC1.gs (GitHub blob SHA 22991bb74fe812b6df1e7e8fe44d989f71b62684) inside an isolated IIFE containing its own minimal column map. The source function bodies were compared for exact equality. It must be installed only in the separate SANDBOX_PHA_RC1_SCRIPT_TEST Apps Script project, alongside the existing PHA-07 helper module.

Do not copy production Kode.gs or SheetSchema.gs, do not add triggers, do not deploy, do not change production permissions, Script Properties, records, or compliance evaluator.

## Synthetic fixture and expected results

| Source | Target | Expected |
|---|---|---|
| Rekap row3, ID PHA-TEST-RPT-0002 | Index row2, ID PHA-TEST-RPT-0001 | REJECT, FOREIGN_REPORT_ID_COLLISION, zero writer callback |
| Rekap row3, ID PHA-TEST-RPT-0002 | Index row3, ID PHA-TEST-RPT-0002 | ALLOW, no write during preflight |
| Any modified ID/pointer/nonce | Synthetic fixture | STOP; no write |

Guards require exact native Google Sheet ID and title for the isolated synthetic-only file; six expected tabs, matching two synthetic report/index pairs, baseline nonce at Index_Laporan!J3, strict protection on Rekap_Kinerja, current caller edit permission, zero triggers visible to current caller, and PHA07_ALLOW_WRITE_RC1=false.

## Phase A: READ ONLY. Authorized now.

1. In SANDBOX_PHA_RC1_SCRIPT_TEST, verify the existing Kode.gs has PHA07_ALLOW_WRITE_RC1=false.
2. Click + to add a NEW Apps Script file PHASandboxIndexCollisionRC1, paste the source from the feature branch, and save. Do NOT replace the existing Kode.gs.
3. Ensure new PHA08_ALLOW_WRITE_RC1=false.
4. Execute validasiLogikaPHA08RC1(). Target PHA08_PURE_VALIDATION with 12/12 PASS.
5. Execute praUjiKolisiIndexPHA08RC1(). Target PHA08_PREFLIGHT with sukses=true, mode=READ_ONLY, fixtureVerified=true, foreignIdBlocked=true, sameIdAllowed=true, noWriteObserved=true, writeEnabled=false, productionDataWritten=false.
6. Share sanitized logs. DO NOT execute ujiKolisiDanPemulihanIndexPHA08RC1() yet.

## Phase B: OPTIONAL GATED WRITE (not yet authorized).

Only after successful live Phase A and explicit operator approval, set PHA08_ALLOW_WRITE_RC1=true solely in the separate sandbox Apps Script project, run ujiKolisiDanPemulihanIndexPHA08RC1() ONCE, and immediately reset the flag to false.

The function refuses foreign-ID overwrite of Index row2 before a writer callback; then tests same-ID update of Index_Laporan!A3:L3, changing only the synthetic nonce in J3, and restores the original full 12-cell row. Expected result: PASS_COLLISION_BLOCK_AND_RESTORE; foreignIdWrites=0; sameIdWriteObserved=true; restoreVerified=true; manualRestoreRequired=false.

If restoreVerified=false or manualRestoreRequired=true, STOP and check Index_Laporan!A3:L3 in the SANDBOX only; do not automatically retry. No AppScript code or production code is authorized to update the historical ACE-DSP-004 case.

## Offline QA evidence, not yet real Apps Script result

- Exact guard source helper bodies: equality verified against RC1 reference.
- Pure decision tests: 12/12 PASS.
- Mocked sandbox read-only preflight: PASS.
- Mocked colliding source row3 versus Index row2: rejected before writer callback; index untouched.
- Mocked matching report row3: accepted, temporary synthetic Index row3 update then restored, two bounded test writes; baseline after equals baseline before.
- Fail-closed mocks: editor cannot edit protected Rekap, unexpected current-caller trigger, and modified source/index fixture each stop before writes.
- Independent connector read-only baseline check: Rekap R2 blank; source and index IDs align; Index row3 J3 nonce is PHA-TEST-NONCE-0002.

Limits: This acceptance harness is sandbox-only. It does not test the production Web App submit/review/disposition transaction, background trigger, or Index_Laporan_Sync_Queue exception-handling path.

## Decision

Phase A read-only sandbox test: GO. Phase B write test: PENDING explicit post-preflight approval. Production protection rollout, deployment, main merge, data changes, or canonical control override: NO-GO. ACE-DSP-004 remains FAIL.
