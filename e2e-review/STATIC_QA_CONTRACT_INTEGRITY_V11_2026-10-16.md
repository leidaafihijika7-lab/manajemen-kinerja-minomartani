# PHA-07B B2 — RPC Remediation Static QA & Contract Integrity v1.1

**16 October 2026 (WIB)**. Reviewed PR #3 against PR #2 stage-only base. **Source QA reviewed, independent installed attestation NOT EXECUTED. Web App/production NO-GO.**

## Source chain and immutability

- Pre-remediation runtime reference: `51fb7a0cd68927eb1a263f1edb8c421d40defd83` (seven-file SAV10 reference, frozen).
- PR #2 candidate base for work: `faf872792d4030e60ef92a8a2497f7800d13d23e`.
- **Eight-file SAV11 content reference commit:** `b865d6c830e215cc062e553b33db5bb866db95dc`.
- PR #3 remains draft and targets PR #2's **feature branch**, not `main`.
- Canonical pinned hashes and Git blob IDs are in `e2e-attestation/SAV11_SOURCE_REFERENCE_V1.json`.
- Existing independent E0 session `cde9abf4-5257-4b82-b850-0d7b323c867b`, E0 evidence file `1taX1OXKmLBYOwa_kH3DAcjPzD08rbYY9`, original seven-file SAV10, RC8.2 23/23 and S0/S1 are **not changed**.

## P0-Name-collision found and fixed

Blindly adding `_` to every public name in v1.0 introduced five symbol conflicts with existing private helpers:

1. `logAudit_`;
2. `logAI_`;
3. `dapatkanAtauBuatFolder_`;
4. `siapkanKolomDetailFormRekapKinerja_`;
5. `koreksiLaporanBlackoutCutoffApril2026_`.

v1.1 regenerated `Kode.gs` from the *original* PR #2 candidate, with a lexical-only rename preserving string literals, maintenance-registry keys, comments and regular expressions. Collision-prone public legacy entrypoints now use separate `e2e11Legacy_*_` private names; the **original private helpers remain intact**. The three duplicate declarations inherited from the previous public version are renamed together without introducing a new collision; these preexisting override chains still require runtime validation.

## Verified static observations (source inspection)

| Control | Observation | Qualification |
|---|---|---|
| Six runtime `.gs` files | **6/6 V8 parses succeeded** via `new Function(source)` | JS syntax, not Apps Script compile/runtime |
| Runtime `appsscript.json` | **Valid JSON** | Deployment settings not verified |
| Public function set | **13 exactly**: `doGet` plus twelve explicit `e2e11Rpc*` | AST/dynamic alias proof still pending |
| Other public assignment overrides | **0 detected** by line-level scan | Additional dynamic forms not exhaustively ruled out |
| Legacy token mint, maintainer, PIN writers | No public top-level declarations | Internal logic remains private |
| Targeted private helper collisions | **5/5 corrected** | Internal behavior requires runtime tests |
| E2E UI RPC references | **4/4 resolved**; zero dangling calls | Focused shell only, not full Portal production UI |
| Old `Index.html` | Removed from *candidate branch only* | Remains in frozen historical PR #2 |
| SHA-256 source reference | **8/8 canonical digests calculated and pinned** | GitHub source reference, NOT installed source match |
| SHA-256 algorithm check | `abc` standard vector matched; old canonical `Kode.gs` matched SAV10 reference `c5293e8d...` | Neither proves deployed source |

## Guard mock negative tests run against v1.1 facade

Tested the actual checked-out GitHub facade text with deterministic stubs; no Apps Script, Drive, Sheet, credential or production invocation. Eleven mutation-capable facade calls attempted in each scenario:

- Web gate disabled: **11/11 rejected; zero backend stub invocations**.
- RPC security approval property false: **11/11 rejected; zero backend stub invocations**.
- E2E write gate disabled: **11/11 rejected; zero backend stub invocations**.
- Upload flag disabled with other stub gates true: **1/1 upload rejected**.
- All stub gates true: **11/11 dispatch to correct legacy private stub** (dispatch check only).
- Status read with Web Gate true and writes/approval disabled returns status, and makes no backend mutation stub call.

**These are mock tests, not the 26 independent live negative security tests.**

## Source-only reproducible QA

`node e2e-review/qa/run_rpc_static_qa_v11.cjs` is saved on the branch. It checks:

- exact eight-file allowlist and absence of historical Index.html;
- SHA-256 canonical content and raw Git blob hash from cloned repo (use `core.autocrlf=false`);
- JS V8 parse of source and focused inline script;
- public function exact allowlist, private helper noncollision, doGet guard, status/Write/Upload guards;
- selected fail-closed mock call matrix.

The Node script **has not been run against a local authenticated checkout in this session**. Its JS source was parsed separately; independent reviewer must execute it and preserve its JSON output before declaring reproducible Node Static QA PASS.

## Open / BLOCKED gates

1. No Apps Script API `projects.getContent` read for a newly installed SAV11 target; independent `SAV11_SOURCE_MATCH_PASS` **not obtained**.
2. New auditor not installed/executed; no SAV11 private evidence file, no auditor source and target Script IDs or target title independently verified.
3. No independent installed-project file count/types confirmation, Apps Script runtime compile, tester identities, Web App access/executeAs/ACL validation.
4. No new E0/E1 session lineage for changed source and no 26 live negative RPC tests; previous E0 cannot silently attest new source.
5. All E2E Web/Write/Upload and RPC security approval flags remain unapproved; no deployment or trigger authorization. Production remains NO-GO.
6. Existing broad Drive OAuth scope requires least-privilege review and dedicated isolated account.

**Verdict:** `SAV11_SOURCE_REFERENCE_PREPARED_AND_STATIC_REVIEW_PASS` for narrowly scoped source checks only. **Independent installed source attestation: BLOCKED/NOT RUN. Web App staging: NO-GO. Production: NO-GO.**
