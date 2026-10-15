# PHA-07B B2 — RPC & Deployment Security Negative Test Matrix v1.0
**Created:** 2026-10-15 | **Status:** DESIGNED, NOT EXECUTED | **Testing only against a newly attested synthetic E2E candidate, never RC8.2/production.**

## 1. Pre-test admission rules
- Independent source attestation of the **next candidate** PASS; E0 previous evidence preserved read-only, with any new baseline recorded under a distinct session if source changes.
- Independent inventory: script ID, source commit, Web App access and execute-as, tester ACL, workbook and Drive folder IDs, OAuth scopes, 0 installed triggers, 0 queue, all stage flags OFF before fixture prep.
- All fixtures synthetic. Enable no external integrations; never copy production credentials, identities or documents.
- Maintain sanitized audit action IDs; capture before/after fingerprints, typed cell values/formats and Drive ACL inventory. No confidential PIN, HMAC secret, OAuth token, signed session or raw base64 in logs.
- `BLOCKED` if account principal, synthetic fixture, test folder ACL or source fingerprint cannot be verified.

## 2. Test cases
| ID | Priority | Actor / call | When | Expected pass condition | Evidence |
| --- | --- | --- | --- | --- | --- |
| RPC-SEC-001 | P0 | Anonymous / unauthorized Google account opens protected stage URL | Web false | Denial before HTML/RPC or data; no stage writes | Access denial + E0 delta 0 |
| RPC-SEC-002 | P0 | Approved tester on stage `/dev` before approval | Web false | `e2e10RequireWebGate_` blocks; `/dev` never used for final acceptance | Authenticated error log (redacted) |
| RPC-SEC-003 | P0 | All publicly exposed mutators (enumerated allowlist, not merely UI-visible ones) | `E2E_WRITE_ENABLED=false` | Every mutation attempt fails before first Sheet/Drive/ScriptProperties write | Per-method verdict + before/after typed snapshot |
| RPC-SEC-004 | P0 | Carik synthetic calls `generateDraftTunjanganBulanan` directly | Write false | Denial before tunjangan sheet or metadata write | Sheet/props delta 0 |
| RPC-SEC-005 | P0 | Admin synthetic calls `adminGantiPinPegawai` directly | Write false | Denial before PIN hash/columns change | Synthetic identity hash unchanged |
| RPC-SEC-006 | P0 | Lurah/operator calls `simpanDisposisiSurat`, `simpanPetugasDisposisi`, `tandaiDisposisiSudahDibuka` | Write false | All denied before any row, log or cache/properties mutation | Disposition row+log+props diff 0 |
| RPC-SEC-007 | P0 | Maintainer calls `maintenanceInitializeAppConstants3B0`, `bangunUlangIndexLaporan2B0`, `aktifkanDualWriteIndexLaporan2B1` | Write false | No mutation or feature flag override; editor-only channel separated | Sentinel, schema and properties diff 0 |
| RPC-SEC-008 | P0 | Arbitrary ID passed to public `buatToken` | Any stage session | Signing endpoint unavailable to browser; only login may issue registered signed session | Direct RPC rejected; no signed token disclosed |
| RPC-SEC-009 | P0 | Arbitrary ID passed to `cekHakAksesAdmin` | Non-admin synthetic | Endpoint is private or authenticates current principal; no role enumeration | Direct RPC rejected or principal-scoped response |
| RPC-SEC-010 | P0 | All `Index.html` `google.script.run` method names | Browser /exec (later) | Every intentional RPC exists and has documented auth; excluded feature has no live/dangling UI call | Build-time compatibility matrix + browser RPC traces |
| RPC-SEC-011 | P0 | `ambilFrontendIntegrityManifestV10` handshake | Browser /exec (later) | Valid, independently checked implementation or feature explicitly scoped out; no false green state | Console, server manifest and UI state |
| RPC-SEC-012 | P0 | Tester Google account outside allowlist | Restricted /exec (later) | Cannot access protected Web App or authenticated data, regardless of app account credentials | Access test with blocked principal |
| RPC-SEC-013 | P0 | Approved tester 1 vs tester 2, `USER_ACCESSING` model | Restricted /exec (later) | `Session.getActiveUser` nonempty correct, effective identity/Sheets/Drive ACL appropriate, role isolation verified | Masked principal IDs, consent and ACL readback |
| RPC-SEC-014 | P0 | `USER_DEPLOYING` identity simulation | Design-only unless approved | If active email blank or attribution unreliable, fail closed; do not substitute deployer for tester | Execution-context diagnostic, sanitized |
| RPC-SEC-015 | P0 | Cross-user temporary upload ID / fake Drive URL | Upload enabled later, after E0 | Upload adoption denied, no unauthorized report linkage | Temporary registry + Drive inventory diff |
| RPC-SEC-016 | P0 | Authenticated owner revises report with **previously retained** attachment | Write enabled later | Existing report-owned attachment accepted without allowing foreign file URL; no duplicate files | Source report, ownership mapping and Drive ACL |
| RPC-SEC-017 | P0 | Submit nonce replay and duplicate concurrent calls | Write enabled later | At most one source+index row, consistent audit; stage scope proven | Source/index/audit compare |
| RPC-SEC-018 | P0 | Read-only role uses admin review/period closing/index toggle direct RPC | Write enabled later | Server role validation denies; no state change | Negative role matrix |
| RPC-SEC-019 | P0 | Denied / failing RPC changes Drive sharing or creates empty folders | Upload phase later | No public/domain links, no unauthorized Drive object or orphan folder after rollback | Drive ACL/hash/inventory before+after |
| RPC-SEC-020 | P0 | Stage URL deployment metadata after reviewed promotion | Restricted /exec later | `access` and `executeAs` match signed decision; no `ANYONE_ANONYMOUS`; no reuse of prod /exec URL | Independent deployment metadata |
| RPC-SEC-021 | P0 | Re-attestation after source edit | Before test admission | New pinned commit and seven-or-more source-file canonical hashes match; original E0 immutable & provenance recorded | Signed source evidence + old E0 SHA |
| RPC-SEC-022 | P0 | Final post-test data & Drive cleanup | After authorized synthetic writes | Data/types/formats and test folder ACL/inventory reconcile with explicit pre-test baseline; no production write uncertainty | Independent E1 and cleanup proof |
| RPC-SEC-023 | P1 | Missing OAuth scope under `USER_ACCESSING` | Restricted test | Safe user-visible denial; no partial write; consent properly restricted | OAuth consent / failure logs |
| RPC-SEC-024 | P1 | Logged out, expired token, tampered token | RPC browser | Backend revokes/rejects privileged calls; no row/file changes | Token challenge status, sanitized |
| RPC-SEC-025 | P1 | Test-only error logging for Drive and auth | All phases | No secrets, full token strings or signed source internals in logs | Sanitized log scan |
| RPC-SEC-026 | P2 | PWA/offline/installability detection | Browser phase | Explicit SUPPORTED/NOT_SUPPORTED classification, not inferred | Browser capability report |

## 3. Final gate
- Every **P0** must pass in actual restricted staging runtime before `E2E_BROWSER_SECURITY_PASS`; P1 security failures cannot be waived to promote production.
- `NOT_TESTED` and `BLOCKED` are not PASS, even if 23/23 RC8.2 old backend tests and Source/E0 passed.
- An authorized test that fails can be cleaned up, but cleanup does not retrospectively change the failed test result.
- Do not stage security checks against the real employee Google accounts, real payroll/tunjangan records, archived RC8.2 sandbox or production files.
- **Current decision as of authoring: NO-GO; none of 26 scenarios executed.**
