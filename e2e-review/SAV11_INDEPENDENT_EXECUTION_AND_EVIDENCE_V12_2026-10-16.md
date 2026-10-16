# PHA-07B B2 — SAV11 Independent Source Attestation Execution & Evidence Verification v1.2

**Audit date:** 16 October 2026, Asia/Jakarta.  
**Verdict:** `SAV11_V12_LIVE_ATTESTATION_BLOCKED` — **no installed-target `SAV11_SOURCE_MATCH_PASS` exists**. Web App staging and production remain NO-GO.

## 1. What was actually executed

- Read current Draft PR #3 on branch `security/pha07b2-rpc-universal-guard-v1-20261016`, targeting isolated PR #2 feature branch rather than `main`.
- Read SAV11 eight-file manifest and all eight source files from the exact pinned source commit `b865d6c830e215cc062e553b33db5bb866db95dc`. Computed SHA-256 on canonical content and checked Git blob identifiers. Result: **8/8 canonical SHA-256 PASS; 8/8 Git blobs PASS**. Independent SHA-256 implementation verified with published `abc` and empty-string test vectors before running source checks.
- Queried independent evidence folder `1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG`; **only two historical E0V10 JSON files** were listed. There is no SAV11 result/evidence file in this observed folder inventory.
- Retrieved the two historical JSON files as bytes from Google Drive and computed their SHA-256 with `sha256sum`, matching the frozen acceptance digests exactly. Independent Drive metadata readback shows `shared=false` and owner-only returned permissions for both files and their folder.
- Read and amended the **separate auditor** code, not the eight-file target or original frozen projects. SAV11 auditor v1.2 now double-reads target HEAD before evidence save, requires same eight canonical source digests on both reads, uses a unique output filename, and removes **only a just-created SAV11 evidence file** upon readback or sharing verification failure.
- Executed 15 deterministic in-memory mock scenarios using actual V12 auditor source with simulated Apps Script services and eight GitHub candidate sources; **15/15 expected outcomes**. No real Apps Script target or Drive evidence file was used by those mocks.

## 2. Independently verified historical evidence (NOT new SAV11)

| Kind | Drive ID | Size | SHA-256 | Permission metadata | Result |
| --- | --- | ---: | --- | --- | --- |
| E0V10 E0 baseline | `1taX1OXKmLBYOwa_kH3DAcjPzD08rbYY9` | 580493 bytes | `28312275c074a44359cfa9c8304f1719f2b37039c4768710e25c012800bdff25` | `shared=false`; owner-only returned permission | **READBACK_MATCH** |
| E0V10 SAV10 source | `1ZZiFR4H6OVNmy8p-DS3fT8tl_ZoTCkFS` | 3026 bytes | `ba0f89fd0eddedee9494e231c34962ac8b80e115185615b2a7505935eace979a` | `shared=false`; owner-only returned permission | **READBACK_MATCH** |

This evidence verifies continued integrity of the **previous** acceptance artifacts; it is NOT a substitute for the new installed-head SAV11 attestation. No new E0 session was created and old E0 was not modified.

## 3. Scope of 15 auditor mock tests

Expected PASS scenarios: exact eight-file package, canonical EOL-only difference, JSON key reordering.  
Expected BLOCKED scenarios: Kode tamper, source changing between first and second HEAD reads, extra file, missing file, changed file type, wrong project title, API HTTP 403, auditor/target Script ID collision, non-private evidence folder, newly created evidence file with public access, evidence readback corruption, and rollback failure.

The mocks tested decision logic, not Google OAuth, installed Apps Script compilation or runtime permissions. No mocked `SAV11_SOURCE_MATCH_PASS` is accepted as live evidence.

## 4. Critical live-execution blockers

1. **No independently identified installed SAV11 target project Script ID/title.** The connected Drive search found no matching SAV11/E2E11 Apps Script file entries. This does not prove a project does not exist; the present connector does not expose the Apps Script API `projects.getContent` action.
2. **No verified separate auditor project Script ID.** The current tool connections cannot run an Apps Script editor function against a standalone auditor project.
3. **No new SAV11 evidence JSON or ACL/hash readback.** The historical evidence folder contains only the two older files above.
4. **No independent installed eight-file source inventory, Google identity/deployment approval, new E0/E1 lineage or 26-case live negative RPC tests.**

Do not add `E2E_RPC_SECURITY_AUDIT_APPROVED=true`, enable Web/Write/Upload, create a Web App deployment or install triggers to work around any of these blockers. Do not install new source in a frozen RC8.2 or original seven-file E2E project.

## 5. Exact continuation after manual Apps Script installation

1. Create or identify a **new separately isolated synthetic target** with exactly eight manifest-matching runtime files, using source pinned to commit `b865d6c830e215cc062e553b33db5bb866db95dc`. Record the exact target Script ID and project title.
2. Create a **different standalone auditor** with exactly `SAV11_IndependentSourceAttestor.gs` (auditor version `PHA07B2-B2-SAV11-2026.10.16.2`) and its own `appsscript.json` from `e2e-attestation/independent-auditor-sav11/`.
3. In the auditor project only, set `SAV11_AUDITOR_SCRIPT_ID`, `SAV11_TARGET_SCRIPT_ID`, `SAV11_TARGET_PROJECT_TITLE` and `SAV11_ALLOW_TARGET_WRITES=false` per the exact v1.2 runbook. Keep all target Web/Write/Upload and security approval flags OFF.
4. Authorize only the auditor's reviewed Google scopes; run `sav11IndependentSourceAttestationV12()` from the auditor's editor. A real PASS requires `SAV11_SOURCE_MATCH_PASS`, `expectedFiles=8`, eight `same=true` results, two stable reads, `evidenceWrites=1`, `targetWrites=0` and `issues=[]`.
5. Independently re-fetch the **new** evidence file from Google Drive, verify its exact byte SHA-256 and owner-only ACL, ensure it is inside the pinned private evidence root, record the verifier Script IDs/source SHA provenance, and preserve old E0 unchanged.
6. Only once that complete gate passes may a new, distinctly named synthetic E0/E1 session and 26 negative security scenarios be considered. Production remains a separate NO-GO gate.

**Artifacts:** `e2e-attestation/SAV11_SOURCE_REFERENCE_V1.json`, `e2e-attestation/SAV11_V12_EXECUTION_GATE_AND_EVIDENCE_READBACK_2026-10-16.json`, `e2e-review/SAV11_V12_MOCK_REGRESSION_2026-10-16.json`, `e2e-attestation/README_SAV11_INDEPENDENT_REATTESTATION_V12.md`.

**No real Apps Script execution claimed. No target-side write, Drive evidence write, deployment, or trigger was performed in v1.2.**
