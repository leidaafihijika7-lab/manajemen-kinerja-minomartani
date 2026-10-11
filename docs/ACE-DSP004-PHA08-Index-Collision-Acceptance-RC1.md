# ACE-DSP-004 — PHA-08 Index Integrity Collision Acceptance RC1

Date: 11 October 2026 (Asia/Jakarta)
Version: PHA08-INDEX-COLLISION-RC1-2026.10.11.02 (sandbox-only hotfix)
Status: LIVE READ-ONLY PASS; FIRST WRITE ATTEMPT FAILED; SANDBOX TEXT-TYPE REPAIR REQUIRED. Production NO-GO.

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

The updated RC1.02 function refuses foreign-ID overwrite of Index row2 before a writer callback; then tests a same-ID update of ONLY Index_Laporan!J3 using setValue, restores the original J3 text, and verifies that all other A2:L3 cells remain unchanged. It deliberately NEVER rewrites the entire mixed-type index row. Expected result: PASS_COLLISION_BLOCK_AND_RESTORE; foreignIdWrites=0; sameIdWriteObserved=true; restoreVerified=true; manualRestoreRequired=false.

If restoreVerified=false or manualRestoreRequired=true, STOP and check Index_Laporan!A3:L3 in the SANDBOX only; do not automatically retry. No AppScript code or production code is authorized to update the historical ACE-DSP-004 case.

## Offline QA evidence, not yet real Apps Script result

- Exact guard source helper bodies: equality verified against RC1 reference.
- Pure decision tests: 12/12 PASS.
- Mocked sandbox read-only preflight: PASS.
- Mocked colliding source row3 versus Index row2: rejected before writer callback; index untouched.
- Updated RC1.02 mocked matching report row3: accepted, ONLY J3 temporarily updated and restored (two bounded J3 writes); full A2:L3 baseline after equals before.
- Fail-closed mocks: editor cannot edit protected Rekap, unexpected current-caller trigger, and modified source/index fixture each stop before writes.
- Independent connector read-only baseline check: Rekap R2 blank; source and index IDs align; Index row3 J3 nonce is PHA-TEST-NONCE-0002.

Limits: This acceptance harness is sandbox-only. It does not test the production Web App submit/review/disposition transaction, background trigger, or Index_Laporan_Sync_Queue exception-handling path.

## Decision

Phase A previously PASSED on RC1.01. Phase B first write FAILED and remains STOPPED until sandbox text-cell repair and the RC1.02 read-only preflight pass. Production protection rollout, deployment, main merge, data changes, or canonical control override: NO-GO. ACE-DSP-004 remains FAIL.

## Actual live results — 11 October 2026, 11:24–11:30 WIB

1. RC1.01 live `PHA08_PURE_VALIDATION`: 12/12 PASS.
2. RC1.01 live `PHA08_PREFLIGHT`: `sukses=true`, `foreignIdBlocked=true`, `sameIdAllowed=true`, `writeEnabled=false`; read-only.
3. RC1.01 live `PHA08_WRITE_TEST` (11:30): `sukses=false`, `status=SANDBOX_INDEX_RESTORE_NEEDS_ATTENTION`, `foreignIdBlocked=true`, `foreignIdWrites=0`, `sameIdWriteObserved=false`, `restoreVerified=false`, `manualRestoreRequired=true`, `stopCode=PHA08_STOP_SAME_ID_WRITE_NOT_OBSERVED`, `productionDataWritten=false`.

### Independent post-test sandbox read-only evidence

- Index_Laporan row2 remains synthetic report A, ROW_REKAP=2 and original nonce.
- Index_Laporan row3 retains synthetic report B, ROW_REKAP=3 and original nonce J3=`PHA-TEST-NONCE-0002`.
- D3, E3 and K3 are now stored as **numeric date serials**, although before the attempt their original synthetic baseline was text. Current unformatted values correspond to serials 46305.385416666664, 46296, and 46305.38543981482. Formatted display still resembles the original contents but no longer has exact original text values.
- This is consistent with the original RC1.01 test rewriting the entire A3:L3 mixed-type row through `setValues`, which can convert date-like text into date values. This plausibly explains strict comparison failure both after the write and after attempted restoration. No evidence of report-ID replacement or production writes.
- **The original baseline is not fully restored:** do not label the write test as PASS merely because ID and nonce values are correct.

### Required isolated manual repair BEFORE any retest

1. In the SANDBOX_PHA_RC1_SYNTHETIC_ONLY workbook, tab `Index_Laporan`, restore ONLY three synthetic cells as **Plain text** (Format → Number → Plain text); then enter these literal values:

| Cell | Original text literal |
|---|---|
| D3 | `2026-10-10 09:15:00` |
| E3 | `2026-10` |
| K3 | `2026-10-10 09:15:02` |

2. Forcing literal text with an initial apostrophe in the Sheets editor is acceptable; the apostrophe is not part of the stored content. Keep report IDs, ROW_REKAP and J3 unchanged.
3. Preserve `PHA07_ALLOW_WRITE_RC1=false` and `PHA08_ALLOW_WRITE_RC1=false` in the separate script. Do not replay RC1.01.
4. Update **ONLY** the sandbox script file `PHASandboxIndexCollisionRC1.gs` from this branch (hotfix RC1.02). The production `Kode.gs` and production `ACEDsp004IndexIntegrityRC1.gs` must NOT be replaced.
5. Run `praUjiKolisiIndexPHA08RC1()` read-only. RC1.02 stops with `PHA08_STOP_INDEX_DATE_TEXT_BASELINE_CHANGED` if the text baseline is still altered. Confirm PASS before any new write consideration.

### Hotfix RC1.02 QA, offline only

- Actual three production-candidate guard helper bodies remain byte-for-byte equal to reference; none were changed.
- 12/12 synthetic pure checks PASS; mocked read-only fixture checks PASS.
- Mocked foreign-ID collision blocked with zero writes.
- Mocked same-ID writer updated J3 only and restored J3 only; exactly two single-cell writes, A2:L3 baseline unchanged, test lock released.
- Mocked D3/E3/K3 converted into Date objects are now rejected by read-only preflight with `PHA08_STOP_INDEX_DATE_TEXT_BASELINE_CHANGED`.
- `PHA08_ALLOW_WRITE_RC1=false` is still the default. No actual sheet edits or script deployment were performed by the assistant for this hotfix.

**Do not proceed to another writer test before explicitly reviewing restored fixture values and successful RC1.02 preflight. Production remains NO-GO, and ACE-DSP-004 remains FAIL.**

## Follow-up preflight: 11 October 2026, 11:38 WIB

The maintainer ran the hotfix RC1.02 preflight read-only in the separate sandbox project. Output: `PHA08_PREFLIGHT` with `sukses=false`, `mode=READ_ONLY`, `stopCode=PHA08_STOP_INDEX_DATE_TEXT_BASELINE_CHANGED`, `writeEnabled=false`, `productionDataWritten=false`.

Read-only connector inspection then confirmed exact UNFORMATTED_VALUE strings on sandbox `Index_Laporan` row 3:

| Cell | Actual stored string | Required original string |
|---|---|---|
| D3 | `2026-10-10 9:15:00` | `2026-10-10 09:15:00` |
| E3 | `2026-10` | `2026-10` (already matches) |
| K3 | `2026-10-10 9:15:02` | `2026-10-10 09:15:02` |

The three values are now **stored as strings**, not numeric date serials; only the leading zero before the hour is missing in D3 and K3. Index report IDs, `ROW_REKAP` pointers and nonce `J3=PHA-TEST-NONCE-0002` remain unchanged.

**Minimal manual fixture repair**: in the isolated sandbox `Index_Laporan`, set D3 and K3 to Plain text and enter literal strings prefixed with the Google Sheets text-entry apostrophe: `'2026-10-10 09:15:00` and `'2026-10-10 09:15:02`. Leave E3 and all other cells unchanged. No code changes are warranted; both PHA-07 and PHA-08 writer flags remain `false`.

After that, run **only** `praUjiKolisiIndexPHA08RC1()` (read-only) and provide `PHA08_PREFLIGHT` output. Do not rerun the write test until separately reviewed. PHA-08 write acceptance remains HOLD and production remains NO-GO.

## PHA-08 RC1.02 live read-only PASS and restored source baseline — 11 October 2026, 11:41 WIB

Maintainer reran `praUjiKolisiIndexPHA08RC1()` on the isolated Apps Script project. Log reports `sukses=true`, `versi=PHA08-INDEX-COLLISION-RC1-2026.10.11.02`, `mode=READ_ONLY`, `fixtureVerified=true`, `foreignIdBlocked=true`, `sameIdAllowed=true`, `noWriteObserved=true`, `writeEnabled=false`, `productionDataWritten=false`.

Independent read-only connector verification of the *known synthetic sandbox* `Index_Laporan!A2:L3` and `Rekap_Kinerja!R2:S3` established:

- Source and index report IDs match for `PHA-TEST-RPT-0001` and `PHA-TEST-RPT-0002`; index pointers are 2 and 3.
- `Index_Laporan!J3` equals `PHA-TEST-NONCE-0002`.
- `Index_Laporan!D3` equals exact plain text `2026-10-10 09:15:00`, `E3` equals exact plain text `2026-10`, and `K3` equals exact plain text `2026-10-10 09:15:02`. All three reported **string**, not numeric/date.
- The source report IDs remain unchanged. The altered fixture from the RC1.01 mixed-type row-writing test is restored.

Review of GitHub code blob `f9a929d8bdd3e79ad81096f201fba3db53c70675` confirms RC1.02 accepts writes only when explicitly enabled; only `Index_Laporan!J3` may be changed and restored; no whole-row `setValues()` remains in this harness. This is **not** evidence that the next live write test has already passed.

**Decision**: RC1.02 READ-ONLY PREFLIGHT PASS. A **single sandbox-only test/restore attempt** with `ujiKolisiDanPemulihanIndexPHA08RC1()` may proceed after verifying `PHA07_ALLOW_WRITE_RC1=false`. Change only `PHA08_ALLOW_WRITE_RC1=true` on the isolated sandbox Apps Script project; run ONCE; immediately reset to `false` and save. Expected status `PASS_COLLISION_BLOCK_AND_RESTORE`, `foreignIdWrites=0`, `sameIdWriteObserved=true`, `restoreVerified=true`, `manualRestoreRequired=false`. If any assertion or restore fails, STOP and do not automatically retry; review `Index_Laporan!J3` and full index baseline.

No production modification authorized. PHA-08 WRITE acceptance is still **PENDING**; canonical ACE-DSP-004 remains **FAIL** and production rollout **NO-GO**.

## PHA-08 RC1.02 sandbox WRITE acceptance: PASS — 11 October 2026, 11:44 WIB

### Executed acceptance evidence

The maintainer ran `ujiKolisiDanPemulihanIndexPHA08RC1()` in the **separate** sandbox Apps Script project. The Apps Script log at 11:44:37 WIB reported:

```json
{"sukses":true,"versi":"PHA08-INDEX-COLLISION-RC1-2026.10.11.02","status":"PASS_COLLISION_BLOCK_AND_RESTORE","target":"SANDBOX_ONLY_INDEX_J3","foreignIdBlocked":true,"foreignIdWrites":0,"sameIdWriteObserved":true,"restoreVerified":true,"manualRestoreRequired":false,"productionDataWritten":false}
```

The screenshot still displayed `PHA08_ALLOW_WRITE_RC1 = true` immediately after the run. The operator must reset this flag to **false** and save in the isolated project. **A returned PASS does not verify that the flag was reset.**

### Independent post-run spreadsheet check (read-only)

Connected Google Sheets metadata confirmed the exact original native synthetic workbook `SANDBOX_PHA_RC1_SYNTHETIC_ONLY` and the expected `Index_Laporan` and `Rekap_Kinerja` tabs. Read-only values of `Index_Laporan!A2:L3` and `Rekap_Kinerja!R2:S3` demonstrated:

| Reference | Verified observed state |
|---|---|
| Source and index report A | `PHA-TEST-RPT-0001`, row pointer 2, nonce `PHA-TEST-NONCE-0001` |
| Source and index report B | `PHA-TEST-RPT-0002`, row pointer 3, nonce `PHA-TEST-NONCE-0002` |
| `Index_Laporan!D3` | Exact text `2026-10-10 09:15:00` |
| `Index_Laporan!E3` | Exact text `2026-10` |
| `Index_Laporan!K3` | Exact text `2026-10-10 09:15:02` |
| `Rekap_Kinerja!R2` | Blank, as in PHA-07 baseline |

All above match the known pre-run fixture. The earlier RC1.01 row-wide `setValues` date-type drift is not present after the RC1.02 isolated J3-only run.

### Decision and boundaries

- **PASS:** guard-level PHA-08 real sandbox collision rejection, matching-ID single-cell update, and restored synthetic baseline, supported by both Apps Script logs and independent connector verification.
- **NOT ACCEPTED:** full live Portal submission/review/disposition transaction, queue insertion/error-handler/replay (`Index_Laporan_Sync_Queue`) and integrated triggers. No user report data or production sheets were modified by the assistant.
- **REQUIRED IMMEDIATE OPERATOR ACTION:** set `PHA08_ALLOW_WRITE_RC1=false` in the isolated sandbox Apps Script. Keep `PHA07_ALLOW_WRITE_RC1=false`. No further writer test is needed.
- **PRODUCTION DECISION:** NO-GO for deployment/protection changes or direct remediation. Canonical `ACE-DSP-004` remains FAIL pending approved administrative reconciliation of `ACTIVE_622`.
