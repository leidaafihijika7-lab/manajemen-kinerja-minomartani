# PHA-07B B2 — RPC Surface & Deployment Security Audit v1.0
**Audit date:** 15 October 2026 (Asia/Jakarta) | **Status:** STATIC SECURITY AUDIT COMPLETE; P0 ISSUES OPEN; WEB APP NO-GO; PRODUCTION NO-GO.

## 1. Scope and pinned evidence
- Frozen candidate source: Git SHA `51fb7a0cd68927eb1a263f1edb8c421d40defd83`; **exact seven-file `e2e-runtime/` package**, not the repository root or production.
- Independent Source Attestation: `E0V10_SOURCE_ATTESTATION_PASS_CANONICAL_EOL`, policy `EXACT_OR_EOL_CANONICAL_V1`, 7/7 canonical file matches, raw byte-exact 0/7.
- Independent E0 (pre-write) baseline: session `cde9abf4-5257-4b82-b850-0d7b323c867b`, Drive file `1taX1OXKmLBYOwa_kH3DAcjPzD08rbYY9`, E0 root `0qv4hByUeZTPxX0_b6-tFQnqZ6xi0_gj8eEIAZaMopk=`. Stage workbook `1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic`; 12 sheets, zero upload-folder entries, zero reported writes at capture.
- Sources directly inspected in GitHub: [Kode.gs](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs), [Index.html](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Index.html), [E2E10_RuntimeGuard.gs](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/E2E10_RuntimeGuard.gs), [appsscript.json](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/appsscript.json), `IndexQueueGuardRC7.gs`, `SheetSchema.gs` and preflight.
- Read-only review; **no Apps Script project modification, no changes to E0, no synthetic user writes, no URL deployment, no trigger installation.**
- Authoritative platform references:
  - [Apps Script HTML Service: public vs underscore-private RPC](https://developers.google.com/apps-script/guides/html/communication).
  - [Web App execute-as and deploy settings](https://developers.google.com/apps-script/guides/web).
  - [Session.getActiveUser() email limitations](https://developers.google.com/apps-script/reference/base/session).
  - [Web App manifest access / executeAs](https://developers.google.com/apps-script/manifest/web-app-api-executable).

## 2. Inventory summary — NOT an authorization pass
| Item | Static result |
| --- | ---: |
| Top-level `function` declarations without `_` suffix in `Kode.gs` | 122 |
| Unique public names among those declarations | 118 |
| Additional public verifier functions | 2 |
| Duplicate names (declarations) | 3 (`aturCutoffTunjanganApril2026`, `koreksiLaporanLewatCutoffApril2026`, `simpanCutoffInputLaporanPeriode`) |
| Recognized distinct literal client-side `google.script.run` methods | 63 |
| Client RPC names missing from seven-file package | 18 |
| Additional known client calls via wrappers | `simpanDataKinerja`, `simpanRevisiLaporanDitolakPegawai` |
| Source tests previously reported | 16/16 static hardening checks (different coverage, **not** RPC acceptance) |

**RPC exposure:** Google Apps Script permits HTML Service to call top-level server functions not ending in `_`, even if their names are not wired to a UI button. Therefore `doGet`-only checks do not establish authorization for later RPC calls. `doGet` is an HTTP entrypoint, not counted as a proven client RPC. `Kode.gs` also overrides public functions by assignment near lines 15196, 20541 and 20551; source audits must evaluate final wrapper chains, not only initial declarations.

See the complete line-indexed [public function inventory](RPC_SURFACE_INVENTORY_V1_2026-10-15.md).

## 3. Findings, evidence, severity and remediation

### P0-01 — Stage write gate is NOT universal (BLOCKING)
- **Evidence:** [e2e10RequireWrites_](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/E2E10_RuntimeGuard.gs#L88-L105) validates E0 attestation, script ID, tester, write property, run ID and zero triggers. It is directly called by core `cekLogin`, `simpanDataKinerja`, `simpanRevisiLaporanDitolakPegawai`, `prosesReviewAdmin`; `e2e10RequireUploadWrite_` controls both blob uploads.
- However **other publicly callable mutators lack this E2E write gate** despite session/role validation, including:
  - [generateDraftTunjanganBulanan](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L3763) — creates/updates tunjangan draft;
  - [adminGantiPinPegawai](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L4753) — modifies credentials;
  - [simpanPetugasDisposisi](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L11376), [simpanDisposisiSurat](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L11547), [tandaiDisposisiSudahDibuka](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L12718) — mutate disposition state;
  - [simpanTutupPeriodeLaporan](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L14580), [bukaPeriodeLaporan](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L14642), [normalisasiStatusLewatCutoffLama](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L15235) — period metadata and/or report records;
  - [aktifkanDualWriteIndexLaporan2B1](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L20463-L20482) — script property mutation through maintainer check with no E0 flag check.
- **Impact:** Once restricted Web App access is enabled and legitimate roles exist, a user with the relevant application/maintainer role could invoke sensitive RPCs even while `E2E_WRITE_ENABLED=false`. This is **stage integrity bypass**, not proof of unauthenticated access or a tested exploit.
- **Remediation:** Build a testable stage RPC facade/allowlist; remove admin/legacy mutators from browser-exposed build or rename private helpers with correct internal call updates; require a universal `e2e10RequireWrites_` at the first statement of every remaining write entrypoint, including script-properties/cache/state changes. Verify via allowlist compile + direct handler probes with stage flags off.

### P0-02 — UI / RPC runtime package mismatch (BLOCKING)
- **Evidence:** [Index.html](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Index.html) makes calls to at least 63 distinct literal RPC names. **18 of these have no matching top-level function in the seven-file runtime.** Examples include `ambilFrontendIntegrityManifestV10`, `ambilRiwayatKuPaged3B04C1c`, `ambilDetailRiwayatLaporan3B04C1c`, `ambilReviewCenterAdminV10`, `ambilBackupRecoveryCenterV10`, `ambilMonthlyClosingV10` and `ambilExecutiveDashboardV10`.
- **Impact:** Missing feature calls can fail at runtime; notably the frontend integrity handshake may fail and disable or misrepresent UI acceptance. A non-crashing HTML shell is not enough to pass E2E.
- **Remediation:** Choose **focused E2E UI** with explicitly reduced functionality and no dangling calls, *or* include only audited dependencies using a new candidate build; never import all repository root modules wholesale. Re-attest the resulting seven-or-more-file build as a new version.

### P0-03 — Execute-as / tester identity model not attested (BLOCKING)
- **Evidence:** [e2e10RequireTesterPrincipal_](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/E2E10_RuntimeGuard.gs#L66-L74) depends on `Session.getActiveUser().getEmail()` and an explicit tester allowlist. Current `appsscript.json` has no reviewed `webapp.access` or `webapp.executeAs` choice. E0 Drive metadata initially showed owner-only workbook/upload-folder access.
- Official behavior: in `USER_DEPLOYING`/execute-as-me contexts, the active user's email can be blank for external testers; `USER_ACCESSING` uses the tester's own OAuth permissions and therefore needs controlled access to the synthetic Sheets/Drive resources.
- **Impact:** `execute as me` can cause fail-closed login for some testers or confuse principals; `execute as user` without purpose-built resource ACLs will fail, while broad sharing could expose sandbox contents.
- **Remediation:** Approve ONE model, record evidence for two distinct synthetic Google principals where intended, explicitly verify effective/active identities and Drive permission. For initial single-owner shell smoke test, `MYSELF` plus `USER_ACCESSING` may be considered but **does not validate separate-Google-account tenant isolation**. NEVER use `ANYONE_ANONYMOUS`; do not enable `ANYONE` while security gates are open.

### P1-04 — Public token-signing oracle and role query
- **Evidence:** [buatToken(idUser)](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L901-L918) is a top-level public function returning a signed token for the supplied ID, without authenticating that ID. [cekHakAksesAdmin(idUser)](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L1237-L1247) queries a role by arbitrary user ID without a caller token.
- **Qualification:** `validasiSession` also requires cache/registry proof ([lines 1091–1125](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L1091-L1125)); a forged login **has not been demonstrated**. The exposed token-signing capability is still unnecessary and unsafe on a browser RPC surface.
- **Remediation:** Make token minting private and reachable only after successful server-side login; separate administrator role checks into internal underscore-private functions or an authenticated "my permissions" view. Negative-test against unauthorized ID enumeration.

### P1-05 — Maintainer / index operations remain publicly callable
- **Evidence:** `pastikanMaintainerPortal3B0_` uses `Session.getActiveUser().getEmail()` (line 360) and an allowlist (including spreadsheet owner fallback). Browser-exposed [maintenanceInitializeAppConstants3B0](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L421) and [bangunUlangIndexLaporan2B0](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/Kode.gs#L20091) and index feature toggles use this instead of E2E write opt-in.
- **Qualification:** The maintainer check is an authorization boundary and should not be described as unauthenticated. However, owner/maintainer browser access is **not equivalent to an editor-only maintenance channel**; E0 and write flags are not enforced by these functions.
- **Remediation:** Separate privileged maintenance from browser-deployed build; run via dedicated editor/admin project with explicit environment and E0 gate. Deny all index rebuilds/toggles and schema setup from client RPC.

### P1-06 — Existing evidence references not accepted by strict temporary registry
- **Evidence:** Candidate revision `simpanRevisiLaporanDitolakPegawai` invokes `e2e10CheckPayloadEvidence_`; reference validation calls `bacaUploadSementaraTerdaftar_` and rejects references not in the *current* temporary-upload registry ([guard](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/E2E10_RuntimeGuard.gs#L200-L237)).
- **Impact:** A rejected report containing a legitimately stored older attachment may fail revision when the client resubmits its prior file URL. This is a **potential functional regression**, not proof of unauthorized access.
- **Remediation:** For retained attachments, permit only file references already associated with the same saved report and authenticated owner; distinguish them from fresh temporary uploads. Never accept an arbitrary Drive URL. Add cross-owner and stale-upload tests.

### P1-07 — Broad Drive OAuth privileges and metadata risk
- Candidate [manifest](https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/blob/51fb7a0cd68927eb1a263f1edb8c421d40defd83/e2e-runtime/appsscript.json) includes `https://www.googleapis.com/auth/drive`, necessary for current DriveApp APIs but broad. Runtime folder ancestor checks and private-only file-sharing guard are positive controls; nevertheless a compromised script authorized as an account with wider Drive access could in principle act beyond the sandbox if a direct path is introduced.
- Use a dedicated synthetic-only Google account/project; strict folder allowlist, clear owner/ACL proof, no public links, no external fetch, and new-file ACL readback. `e2e10GetAllowedFileById_` allows a special workbook-file handle for metadata; audit every caller of that exception to ensure no unguarded write use.

### P2-08 — Duplicate definitions / wrapper chains obscure effective RPC implementation
- The packaged `Kode.gs` has at least three duplicate public declaration names and several subsequent override assignments. For example, `prosesReviewAdmin` is wrapped at lines 15196 and 20551, `simpanRevisiLaporanDitolakPegawai` at 20541.
- Those wrappers call the earlier implementation in the inspected source, so this is **not independently evidence of a bypass**. The same methodology must be reapplied when refactoring the build; ensure all wrappers execute the centralized guard first.

## 4. Gate state and explicit GO/NO-GO
| Gate | Status |
| --- | --- |
| RC8.2 server authenticated matrix | FROZEN PASS (23/23) |
| Source attestation under Canonical EOL policy | PASS (7/7 canonical; 0/7 byte exact) |
| Independent E0 capture | PASS (12 tabs, 0 upload entries) |
| Static RPC surface enumeration | COMPLETED; failures identified |
| Universal E2E mutation gate | **FAIL — P0-01** |
| UI/RPC coverage | **FAIL — P0-02** |
| Deployment identity and ACL execution model | **BLOCKED — P0-03** |
| Actual browser/RPC security E2E | NOT EXECUTED |
| Restricted /exec deployment | NOT CREATED / NOT VERIFIED |
| Production readiness | **NO-GO** |

Static audit completion **does not imply** security remediation or runtime acceptance.

## 5. Controlled remediation workflow (future branch only)
1. Freeze this audit against commit `51fb7a0cd68927eb1a263f1edb8c421d40defd83` and E0 session above. Do not modify attested source or the original E0 evidence.
2. On **new remediation branch/project version**, choose small audited RPC allowlist; gate all mutators first, hide maintenance and signing primitives, preserve canonical identity/nonce behavior.
3. Choose minimum-necessary server modules and a matched client UI. Resolve all 18 missing RPC calls or explicitly remove/disable their UI affordances with no false claims of working functionality.
4. Decide `USER_ACCESSING` vs `USER_DEPLOYING`, tester principal allowlist, `MYSELF`/domain access, and separate test-owned Sheets/Drive permissions; verify script manifest and actual deployment settings independently.
5. Unit-test every disallowed callable function when stage write flags are OFF; verify no Sheets/Drive/ScriptProperties mutation and no new folders/files; include token issuance and ownership-negative cases.
6. After source modifications, **independently re-attest the new code**. Preserve original E0; any new baseline must be explicitly versioned as a new session with lineage and pre-write integrity verification, never silently replace E0.
7. Only after P0 resolution and a new read-only gate PASS, consider a tightly restricted **staging-only** Web App; obtain separate browser /exec test acceptance. Production remains separate NO-GO.

## 6. Review limitations
- No execution of server code, adversarial RPC calls, uploaded files, Google account delegation or real deployed URL was performed in this audit.
- Static scanning checks named top-level function declarations and known override statements; other dynamic RPC aliases might exist.
- Application roles from 23/23 frozen RC8.2 server test do **not** prove deployment access policy, browser identity boundary, or full RPC coverage.
- E0 is fingerprint evidence, not raw backup, and can detect post-write changes only if verified independently.
- A direct client RPC exploit has **not** been demonstrated. Risk is based on reachable surface and absence of universal stage-write gate at source level.
