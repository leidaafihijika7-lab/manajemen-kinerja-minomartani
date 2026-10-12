# PHA-07B B2 — Staging Web App / RPC / Upload End-to-End
**Technical Design & Test Matrix v1.0 | 12 October 2026 | DESIGN ONLY | Production NO-GO**

## 1. Decision and lineage
- RC8.2 scope is FROZEN / ACCEPTED: 23/23 real authenticated server handler checks on 2026-10-12, rollback restored, independent EXSV10 S0/S1 identical (12-sheet HMAC-fingerprint state, 0 row/cell differences).
- Canonical freeze manifest: `rc82-review/FREEZE_MANIFEST_RC82_2026-10-12.json`. It pins source commit `a81ecc00512f025967ceb5febadc6ddb395c8505`, sandbox `1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU`, session `aaabd0be-637a-43c4-88c3-72aec6d44481`, Drive S0/S1 IDs and SHA-256.
- Explicitly *not* accepted: deployed browser UI, `google.script.run` bridge, Drive uploads, browser session lifecycle, true offline/installable PWA, independent production-write/trigger inventory. No assumption that the EXSV10 fingerprints are raw-data backups.
- Create a new E2E candidate branch from the pinned source. Do not edit or deploy the frozen RC8.2 branch, frozen RC8.2 workbook, original S0/S1 Drive files, default `main`, or production Apps Script.

## 2. Source-grounded implementation constraints
| Finding (source) | Design consequence |
| --- | --- |
| Pinned staging `Kode.gs:doGet()` throws `RC8_STAGING_WEB_DISABLED_NO_DEPLOYMENT` | New E2E candidate alone may restore guarded `HtmlService.createTemplateFromFile('Index').evaluate()`; frozen source remains unchanged. |
| `getSS_()` hard-pins RC8.2 spreadsheet and checks exact `MULAI_DI_SINI!A5,A8,B16` markers | New E2E candidate must pin a newly created, separately marked E2E workbook. Never change RC8.2 workbook sentinel to trick it. |
| `Index.html` calls `google.script.run`, including `cekLogin`, `simpanDataKinerja`, `simpanRevisiLaporanDitolakPegawai`, `prosesReviewAdmin`, `uploadBuktiKinerjaBlob` | Browser interaction must be exercised through actual /exec or test /dev HTML Service URL, with RPC round trips and independent backend readback. No invented REST endpoint. |
| No `navigator.serviceWorker`, manifest link or service worker found in inspected `Index.html` | Browser-responsive Web App is in scope. PWA-installability/offline behavior is UNKNOWN and must be a capability discovery gate, not assumed PASS. |
| `uploadBuktiKinerjaBlob` uses signed session and Drive folder property; actual UI sends HTML form with file blobs; config max 12 files, 10 MiB each, 25 MiB total | Allow authentic synthetic uploads only on a disposable Drive folder, with scoped Drive access and positive/negative size and ownership tests. |
| Previous RC8 storage drill lost typed date/string formatting during rollback | Fresh disposable workbook per suite or proven type-safe restore plus external before/after comparison; never clean by raw `setValues` to force matches. |
| Current staging `appsscript.json` scopes only spreadsheets and script.scriptapp | Drive upload requires a reviewed, least-privilege scope change in the *new E2E candidate only*. Drive operations and sharing rules need separate security review. |

## 3. Isolation / topology
```text
Browser - desktop/mobile, synthetic test users
   | Google Apps Script Web App /dev or isolated /exec
   v
NEW standalone GAS project: PHA07B2-B2 E2E (no production triggers)
   | Index.html -> google.script.run -> candidate Kode.gs
   | stage-only E2E preflight/guard; signed sessions
   +--> NEW disposable Google Sheets workbook (never frozen RC8.2)
   +--> NEW disposable Google Drive evidence root folder (synthetic only)
   +--> read-only independent E2E evidence verifier (external project/account)
   +--> restricted evidence export (test IDs, hashes and redacted logs only)
```
No external production API keys, production PIN pepper, identities, reports, attachments, Google Drive folder IDs, deployment IDs, or production spreadsheet IDs. No trigger creation, queued replay or scheduler. AI/external integrations disabled or carefully stubbed with explicit `NOT_TESTED` for true live-service behavior; do not silently replace a business path with a mock and report E2E PASS.

## 4. Environment provisioning design (NOT EXECUTED)
1. Derive source from pinned RC8.2 SHA to a new `feat/pha07b2-b2-e2e-staging` branch. Keep RC7 nonce-revision and RC8.2 Identity Guard source intact.
2. Create a **new standalone Apps Script project** and a **new disposable workbook** populated only with synthetic fixture tabs and correct E2E-specific sentinels. New exact workbook ID must be hard-pinned in candidate source; resolve all stale RC8.2 literals and allowlist checks. No copied production values, records or credentials.
3. Create a **new private Drive root folder** for synthetic upload test data; ensure explicit ownership, allowed ACL, no broad public sharing, test-only retention and cleanup manifest. Fail closed if folder missing or not under allowlist.
4. New candidate only: restore `doGet` behind `E2E_STAGING_MODE=true`, pinned workbook/folder IDs, server-side sentinel checks, disable production endpoints/cron/triggers, and optionally a visible `STAGING — SYNTHETIC ONLY` banner in `Index.html`. Reject any client-supplied target IDs. Verify before deploy that no other code path opens a non-allowlisted workbook or folder.
5. Manifest scopes reviewed for Google Sheets, Drive upload and necessary Apps Script services. Do not request external scopes for unused AI providers. Review code's Drive sharing mode: a test upload must not create publicly available attachment links inadvertently.
6. Deploy a **new restricted test Web App** (access to explicitly permitted tester accounts, `execute as` evaluated and documented). Verify actual identity principal, authorization grants and Google consent. `/dev` restricted developer access is acceptable for initial UI smoke; a separate isolated `/exec` is needed for deployed artifact acceptance. Do not reuse existing production deployment.
7. Run read-only preflight and independently inventory project ID, deployment ID/URL, workbook ID, Drive folder ID, OAuth scopes, source SHA, sentinel fields, trigger count, replay flag, fixture IDs and access ACL. Require preflight PASS before any mutation.
8. Capture new E2E baseline `E0` (Sheet *and Drive folder listing/ACL*), execute scenarios in controlled suites, capture `E1` and assert expected authorized deltas. E2E differs from RC8.2: successful writes are expected *during the suite*; do not require E0 = E1 until explicit cleanup and rollback after evidence collection.
9. Cleanup test sessions and synthetic files/rows by recorded test IDs only, or discard the entire disposable workbook/folder. Compare restored state to E0 using independent cell-type + format snapshots, folder inventory and ACL. A failed cleanup is a STOP, not a reason for broad deletion.
10. Disable/remove restricted test deployment and test credentials after acceptance. Retain redacted evidence manifest outside test storage.

## 5. Gate 0 / preflight contract
Every predicate is required. A missing item returns `E2E_PREFLIGHT_BLOCKED`, not WARN:
- Source commit corresponds to pinned RC8.2 baseline plus audited candidate-only changes, and freeze artifacts remain unmodified.
- Separate GAS script ID, new test deployment, new spreadsheet ID and new Drive folder ID; IDs in allowlist and sentinel cross-check pass. None equals frozen RC8.2 or known production resources.
- Only synthetic users exist (at least owner, other employee, admin, disabled), salted PIN hashes stored only in E2E fixture; no live user data.
- `E2E_STAGING_MODE=true`, `INDEX_LAPORAN_RC7_REPLAY_ENABLED=false`, dual-write initial state false; trigger inventory zero; no stale recovery manifests.
- Test folder permissions verified, no public links without approval, upload root restricted to disposable root, files enumerated before run.
- Access principals and scopes correspond to intended tester/deployer. No secrets in console logs/screenshots.
- Independent evidence snapshot `E0` is captured before any write.
- Restricted Web App responds as expected and no project points at production.
- The original S0/S1 files remain unchanged, verified by SHA-256.

## 6. Scenario matrix (human browser interactions + independent evidence)
Priority P0 = release blocker; P1 = required, noncritical; P2 = capability discovery. For each case record anonymized browser recording/screenshot, server action/log outcome, independent Sheets or Drive readback, timestamp + fixture ID, actual/expected and verdict. No PIN, session token or personal details in evidence.

| ID | P | Scenario and actor | Expected system result and durable evidence |
| --- | --- | --- | --- |
| E2E-001 | P0 | Unauthorized visitor opens restricted /exec | Access policy enforced; no authenticated state or data leakage. |
| E2E-002 | P0 | Browser loads app and staging banner | HTML renders; frontend integrity guard does not break the page; correct candidate version and test deployment. |
| E2E-003 | P0 | Owner logs in from visible login form | Authentic `cekLogin` RPC succeeds with signed session; account identity derived server-side. |
| E2E-004 | P0 | Wrong PIN from UI | Generic denial, no session; no unauthorized record creation. |
| E2E-005 | P0 | Disabled user login | Denied; no usable session. |
| E2E-006 | P0 | Tampered/expired signed session on protected RPC | Rejected, no business/Drive side effects. |
| E2E-007 | P0 | Owner submits valid synthetic form without attachment | Exactly one source row, canonical index row, correct ID_USER/status and audit; nonce preserved. |
| E2E-008 | P0 | Browser double-click/replay same nonce | Idempotent, exactly one report; no redundant index/queue entries. |
| E2E-009 | P0 | Owner submits name/role spoof through altered client payload | Explicit identity-mismatch rejection *before* scoring/upload/storage; source/index/queue/Drive deltas zero. |
| E2E-010 | P0 | Non-admin tries review RPC (and UI direct invocation) | Both UI restriction and backend authorization fail; unchanged report. |
| E2E-011 | P0 | Admin rejects owner report from UI | `Ditolak` in source+index, actor audit entry; visible status updated. |
| E2E-012 | P0 | Other employee attempts to revise owner report | Rejected; source/index unchanged. |
| E2E-013 | P0 | Owner opens rejected report and revises in UI | Revisions update correct owner record, `Menunggu Review`, nonce rotated, index matches, audit recorded. |
| E2E-014 | P0 | Repeat same revision nonce | Rejected as already processed; no duplicate. |
| E2E-015 | P0 | Admin finally approves via UI | Source/index status and final point consistent; audit actor and timestamp present. |
| E2E-016 | P0 | Valid JPG / PNG / PDF upload through real browser form | Bytes and MIME verified; file stored only under disposable Drive root; file reference linked correctly to report; ACL conforms to test policy. |
| E2E-017 | P0 | Upload malformed/disguised file, unsupported format or oversize | Fail closed; no residual Drive object or source/index row. Include file/total-byte boundary cases within approved fixture quota. |
| E2E-018 | P0 | Unauthorized/expired session attempts blob upload | Backend rejects; no file created. |
| E2E-019 | P0 | Cross-user reuse of uploaded temporary file ID | Backend ownership/temporary upload registry denies adoption; no foreign evidence linked. |
| E2E-020 | P0 | Upload RPC succeeds then submit fails (controlled error) | Deterministic recovery: synthetic orphan handling, no unauthorized persistent report, recoverable file manifest and cleanup. |
| E2E-021 | P0 | Disconnected browser or network interruption after submit | Safe retry shows at most one canonical record; no stuck in-flight nonce outside defined timeout. |
| E2E-022 | P0 | Logout, reload and attempt protected UI/RPC | Server session ended; no privileged read/write. |
| E2E-023 | P0 | Two concurrent synthetic employees submit / admin reviews | Correct ownership, no row or index collision, no duplicate nonce; audit consistent. |
| E2E-024 | P0 | Independent readback of source/index/audit/queue after completed suite | Canonical IDs and statuses reconcile; queue zero or documented managed failure only; no outside sandbox writes. |
| E2E-025 | P0 | Cleanup, Drive inventory/ACL and full typed-format comparison to E0 | Zero test artifacts left; all required values/types/formats restored or disposable resources retired, with independent evidence. |
| E2E-026 | P1 | Admin review rejected for invalid score/status and stale report | Invalid transitions blocked, no audit false positives. |
| E2E-027 | P1 | Browser refresh / mobile viewport / navigation between pages | Session continuity and route state behave as specified; no client privilege escalation. |
| E2E-028 | P1 | Disposition attachment upload using eligible vs ineligible role | Only Lurah/active operator accepted; synthetic Drive file and registry audited. |
| E2E-029 | P1 | Attempt submit when required file evidence missing | Required evidence blocks before persistence; no fake placeholder URL accepted. |
| E2E-030 | P1 | Drive permission failure / temporary quota error | Fail-closed result and cleanup, no silent success; no broad sharing. |
| E2E-031 | P1 | Cutoff/period edge case using documented fixture | Evaluate official period independently; correct date semantics and no typed-string coercion. |
| E2E-032 | P2 | Check installability, offline and service-worker behavior | Classify SUPPORTED / NOT_SUPPORTED / NOT_IN_SCOPE based on actual implementation, never infer from mobile meta tags. |
| E2E-033 | P1 | Browser console and RPC error handling | No PIN, signed token, raw sensitive fixture or unredacted secrets in persistent logs. |
| E2E-034 | P0 | Final isolation: script, deployment, Drive, Sheets, production read-only audit | Independent evidence that E2E project did not access/write production; deploy not exposed beyond testers. |

**Exit targets:** P0 100% PASS; P1 100% PASS or specifically approved, nonsecurity out-of-scope deferment with rationale; P2 explicitly classified, never implied PASS. Any identity spoof acceptance, production access uncertainty, unauthorized Drive sharing, missing S0/S1 freeze provenance or rollback mismatch => immediate NO-GO.

## 7. Instrumentation / evidence requirements
- Test run ID generated before test. Each action logs time in Asia/Jakarta, case ID, fixture user ID (synthetic), report ID, masked file ID reference, action class and *sanitized* outcome; no PIN, complete session token, pepper, API key, base64, or real data.
- Independent readback must confirm `Rekap_Kinerja`, `Index_Laporan`, `Audit_Log`, `Index_Laporan_Sync_Queue` and optionally `Data_Pegawai` and `Disposisi_*`. Audit must prove provenance of submit, reject, revise, approve.
- Upload evidence: before/after test folder inventory, restricted ACL, MIME, bytes, checksum, ownership linkage, allowlist root path, and cleanup marker. Do not print full download links if publicly accessible.
- Store evidence in private evidence area distinct from test folder. Generate manifest + SHA-256; sign or independently hash at freeze and retain originals read-only via governance policy (Drive storage alone is not immutable).
- There is **no reliable native REST API** for `google.script.run` business functions from plain HTTP. Use real browser and HTML Service; HTTP smoke only checks Web App shell/authorization.
- For PWA: existing inspected source has responsive/mobile meta but no evidenced service worker; separate discovery from installability criterion.

## 8. Failure / stop / cleanup runbook
- STOP on wrong target ID, missing marker, outside-folder Drive write, public ACL, missing read-only evidence, unauthorized admin action, nonce duplication, orphan file without cleanup manifest, rollback mismatch, missing source SHA or a stalled upload with unknown completion.
- Disable E2E write-authorization and revoke/restrict deployed URL; do not immediately rerun an uncertain failed case.
- Capture forensic inventory before recovery (test-only IDs and ACL), compute changed object set and review; targeted restore *only* disposable E2E data, ideally dispose workbook/folder.
- If run terminates after upload but before submit, treat manifest as pending and reconcile each file ID with owner session and report linkage; do not delete unrelated objects.
- Never run a broad delete against source production or frozen RC8.2 workbook. Report failure accurately; successful subsequent cleanup does not retroactively turn a failed test into PASS.

## 9. Milestone gates
| Gate | Required deliverable | Current status |
| --- | --- | --- |
| F0 RC8.2 freeze | GitHub manifest, S0/S1 IDs + SHA-256, source pinned | Recorded (not a GitHub tag or immutable Drive retention guarantee) |
| D0 Technical Design | This reviewed design and case matrix | Prepared |
| I0 Isolated environment | New GAS + new workbook + new Drive root + ACL proof | NOT STARTED |
| P0 Preflight | Hardened environment gate + E0 evidence | NOT STARTED |
| X0 Browser/RPC tests | Test logs and independent state evidence | NOT STARTED |
| U0 Upload E2E | Synthetic attachment source/Drive ownership and ACL proof | NOT STARTED |
| C0 Cleanup evidence | Final independent restoration/destroy certification | NOT STARTED |
| A0 Acceptance | Signed GO/NO-GO for **staging only** | NOT STARTED |
| PROD | Production change review, restore plan, deployment approval | NO-GO |

## 10. Immediate engineering backlog
1. Inspect all `Kode.gs` ways to access Drive/Sheets and authorize role checks, then design E2E-specific read/write allowlist guards. Do not assume hard-pinned `getSS_` catches `SpreadsheetApp.openById` elsewhere.
2. Create new disposable fixture + private upload root and restricted tester roles; validate source from pinned commit.
3. Implement minimal candidate-only Web App enablement, staging banner and explicit E2E preflight; keep existing protected business handlers unchanged except documented security fixes.
4. Review manifest OAuth scopes and file-sharing behavior; stage-only deployment with clear execute-as/access model.
5. Generate E0, execute E2E-001..034 in suites with evidence before any cleanup, and use a separate independent readback project.
6. Record results as PASS/FAIL/BLOCKED/NOT_TESTED, triage P0 first, retain redacted evidence and return to staging acceptance gate.

**No code/deployment or production data modifications are authorized by this document.**