# PHA-07B B2 — RPC Surface Remediation & Universal Write Guard v1.0

Date: 2026-10-16 Asia/Jakarta. **IMPLEMENTED AS SOURCE CANDIDATE; NOT DEPLOYED; NO-GO**.

## Base and isolation
- Branch: `security/pha07b2-rpc-universal-guard-v1-20261016`, fork of draft PR #2 head `faf872792d4030e60ef92a8a2497f7800d13d23e`.
- Original RC8.2, S0/S1, canonical source commit `51fb7a0cd68927eb1a263f1edb8c421d40defd83` and 15 Oct independent E0 are NOT modified.
- New source is an **unattested revision**; old 7/7 reference is NOT valid for the changed 9-file runtime.

## v1.1 supersession notice (2026-10-16)
The v1.0 statement about retaining `Index.html` in this candidate is superseded: **the unused historical Index.html was removed from PR #3's focused package** (still preserved in PR #2). Five private helper name collisions from the original indiscriminate rename were identified and corrected by regenerating `Kode.gs` lexically from the PR #2 source; original strings/maintenance registry keys were preserved. Current package count is **eight**, pinned in `SAV11_SOURCE_REFERENCE_V1.json` at source commit `b865d6c830e215cc062e553b33db5bb866db95dc`. See `e2e-review/STATIC_QA_CONTRACT_INTEGRITY_V11_2026-10-16.md` and the SAV11 runbook for current acceptance status. **Independent installed source attestation is NOT RUN.**

## Remediation implementation
1. `e2e-runtime/Kode.gs`: rename 117 distinct legacy top-level public names with terminal underscores and rename corresponding references; keep `doGet`, pointing only to `IndexE2E11`. Explicitly includes `buatToken_`, `cekHakAksesAdmin_`, `generateDraftTunjanganBulanan_`, `adminGantiPinPegawai_`, and index-maintenance functions.
2. `e2e-runtime/E2E10_IsolatedReadOnlyPreflight.gs`: convert both editor diagnostic functions to private names.
3. `e2e-runtime/E2E11_RestrictedRpcFacade.gs`: define a closed browser-facing facade. All except status require `e2e11RequireRpcWrite_` or `e2e11RequireRpcUpload_`; these check `e2e10RequireWebGate_`, approved RPC-audit property and existing `e2e10RequireWrites_`, which checks source environment binding, tester, write sentinel, E0 identity, no triggers, and run ID. Upload requires additional upload gate.
4. `e2e-runtime/IndexE2E11.html`: dedicated focused E2E shell, only four RPC call sites: status/login/history/logout, all defined by facade. The original unused `Index.html` was **removed from the new candidate branch only**; historical reference remains frozen in PR #2. Production UI features are **explicitly out of this staging test package**, not claimed as tested.
5. Flags are NOT modified; no triggers, Google Apps Script deployment, Drive upload, test login, write, or production operations executed.

## Source-level inventory
- 13 public top-level functions including `doGet` and 12 `e2e11Rpc*` facade methods.
- 0 public top-level assignment overrides detected by line-based scan.
- New focused HTML: 4 distinct RPC targets, 0 unresolved targets.
- No legacy token-minting or legacy mutator declarations remain public.
- The source scan is structural only, **NOT** syntax verification, byte attestation, runtime access proof or proof of absence of dynamic aliases.
- The original broad rename (including strings) was **replaced in v1.1** with lexical renaming that preserves string literals and registry keys, and collision-safe renaming of five legacy stubs. Dynamic calls and cross-module behavior still require runtime validation. The old `Index.html` is absent from the eight-file installed candidate.

## Security concerns still unresolved
- **BLOCKED** new independent source attestation, installed-project file count, actual source binding and Google Apps Script compile check.
- **BLOCKED** execute-as decision, effective principal attribution, synthetic tester ACL permissions, restricted deployment metadata, live negative RPC cases.
- **BLOCKED** 26-case negative tests, source/E0->E1 integrity, retained-file handling, direct property/cache side effects.
- **BLOCKED** any stage writes, synthetic fixture creation, Web App URL, and production approval.
- Current manifest includes broad Drive OAuth scope; review and narrow if possible before deployment.
- New `E2E_RPC_SECURITY_AUDIT_APPROVED` property deliberately has no approved value. Must remain absent/false until independent P0 sign-off; setting it alone cannot override existing gates.

## Next checkpoints (strict order)
A. Review exact source diff and inspect all global declarations/assignment patterns, dynamic calls and JS syntax; fix any mismatch on this branch.
B. Run isolated source compile/static QA; generate a NEW expected file manifest covering all nine files (or exact final package count), save hashes and independent source attestation.
C. Approve one real tester identity + executeAs + access policy and least-privilege synthetic Drive ACL, independently.
D. Run 26 negative scenarios on a separate, attested synthetic target with all write flags OFF, verify no Sheets/Drive/ScriptProperties/cache changes.
E. Only after P0 PASS, authorize tightly restricted Web App staging execution; production remains NO-GO.

**Verdict:** code candidate created and structural RPC audit PASS within narrow inspected scope. Staging **NO-GO**; production **NO-GO**.
