# ACE-DSP-004 — Protection Hardening Acceptance RC1

Version: ACE-DSP004-PROTECTION-ACCEPTANCE-RC1-2026.10.10.01  
Date: 2026-10-10 (Asia/Jakarta)  
Status: **READ-ONLY DIAGNOSTIC CANDIDATE — NOT PRODUCTION APPROVED**  
Branch: feature/ace-dsp004-protection-acceptance-rc1

## A. Problem statement and safety boundary

On 1 October 2026 a legitimate report-revision request was handled by deleting the prior report directly from production Google Sheets, then asking an employee to file a new report. Audit_Log and Disposisi_Log still prove original submission; Disposisi_Penerima row 622 still references the former report ID; index row was reused by a later report. Administrative replacement has not been verified.

This RC1 phase establishes how to inspect **sheet-wide and range protections**, identify relevant script execution principals, and design isolated tests without blocking valid Portal writes.

No permission is granted to modify production sheet protections, business records, Script Properties, triggers, Web App deployment, or GitHub main.

## B. Confirmed baseline

| Control | Observed | Limitation |
|---|---|---|
| Previous RC1 sheet-wide protection audit | Zero sheet protections across five critical sheets | Range protections were not examined |
| Administrative reconciliation | 193 rows, 18 later same-owner submissions, zero proven replacements | No automatic matching |
| Previous RC1 synthetic code tests | 23 of 23 PASS in Apps Script | Does not test actual protections or app submit flow |
| Drive permission metadata, 10 October | One user owner and one anyone/reader grant with allowFileDiscovery=false | Possible anyone-with-link view access; confirm Share dialog and privacy effects, do not change sharing silently |
| Current production Web App execution identity | UNKNOWN | Editor runtime identity cannot prove deployed Web App executeAs |
| Triggers created by other accounts | UNKNOWN | ScriptApp.getProjectTriggers lists only current user's project triggers |

## C. New source module

**File**: ACEDsp004ProtectionAcceptanceRC1.gs, added in GitHub feature branch.

**Functions**:

1. **validasiProtectionAcceptanceACEDsp004RC1()**: 20 synthetic tests. No Sheets access.
2. **diagnostikProtectionAcceptanceACEDsp004RC1()**: Maintainer-gated and read-only. Logs:
   - ACE_DSP004_PHA_SUMMARY (one line);
   - ACE_DSP004_PHA_SHEET (five lines).
   
For each sheet, reports protection count by **SHEET** and **RANGE**, warning-only/restrictive mode, count of sheet exceptions, limited protected-range A1 metadata, current caller editable flag and domain-wide editable flag (no identities). It does NOT retrieve editor emails, target-audience IDs, report values or any personal information.

It also reports whether the currently active and effective account identities match, **without displaying email addresses**, and summarizes installable triggers accessible to the current caller by event and source type, never by trigger UID or source ID.

Read-only metadata success is not production acceptance. The module intentionally returns acceptanceApproved=false and productionChangeAuthorized=false.

## D. Proposed protection policy (NOT APPLIED)

| Sheet | Principal legitimate writes | Risk and expectation |
|---|---|---|
| Rekap_Kinerja | Append report, admin review, revision, update points | Test owner warning and restricting ordinary collaborators; submit/review/revise must succeed under real executor |
| Index_Laporan | Dual-write setValues, index sync, format row | Guard checks exact ID before replacement; collision blocked; normal sync still works |
| Disposisi_Penerima | Progress status, ID_LAPORAN_TERKAIT, timestamp | Test all sequential updates; no partial linkage |
| Audit_Log | Append system audit records | App logging must continue, human tampering must be constrained |
| Disposisi_Log | Append disposition events | Original evidence remains intact; app event writes must continue |

**Important**: warning-only protection is not enforced blocking. Owners can still edit even restricted protections. Protections are not a substitute for a cancellation workflow, least-privilege sharing, append-only audit and integrity checks.

## E. Required read-only identity checks

1. **Inspect actual active Web App deployment**: Deploy → Manage deployments → select active deployment → record current version and Execute-as mode. Do not press Edit or Deploy. An editor-side Session identity is not sufficient.
2. **Triggers**: inspect the Apps Script Triggers UI to identify active installable trigger owners and functions. ScriptApp.getProjectTriggers is explicitly partial (current-user scope).
3. **Spreadsheet permissions**: inspect Share dialog and verify the anyone-reader link exposure; do not publish employee data or private addresses.
4. **Server writer identity**: if Web App runs as deployer, compare deployer account to protection writers; if it runs as accessing user, test each needed editor permission. Installable triggers run as their creator.
5. **Historical backups**: retain ACE-DSP-004 evidence and verify PRE_MAINTENANCE readiness before any eventual rollout.

Do not paste user email addresses, user IDs, script IDs, backup Spreadsheet IDs, OAuth tokens or URLs with credentials into audit logs.

## F. Controlled sandbox acceptance test procedure

**Precondition**: A separate disposable test spreadsheet and **separate test Apps Script project**; no live triggers. Use only synthetic records and never either historical evidence workbook or the production database as a write-test target.

1. Verify the test database file ID differs from production and its Script Property SPREADSHEET_ID points **only** to the test file. Do not change production Script Properties.
2. Keep test code/project separate from production. Disable/remove cloned triggers in the test project after confirming none are active; do not alter production triggers.
3. Baseline test sheet data, trigger inventory, and count of protections; record synthetic row IDs and logs.
4. Apply warning-only sheet protection **only in the test database**. Confirm UI warning when account owner attempts edit, and separately confirm Apps Script appends/updates still work. Do not claim warnings block edits.
5. Apply restricted-editor sheet protections **only in the test database**. Confirm an unauthorised collaborator editor is blocked. A spreadsheet owner is not a valid negative-access test; document OWNER_BYPASS_EXPECTED.
6. Verify genuine report flow on the isolated project: report append, disposition reverse link, index dual-write, revision, admin review, Audit_Log and Disposisi_Log appends, background jobs as relevant. Record actual write success/failure and check no partial updates.
7. Simulate a foreign-report-ID index collision **only on synthetic data** and verify existing guard blocks a cross-ID overwrite before setValues; monitor queued repair records without blind replay.
8. Verify test trigger configuration does not send messages, emails or updates to production.
9. Verify rollback of **test-only** protection rules and integrity of unrelated test records.
10. Human reviewer signs acceptance matrix and confirms PRE_MAINTENANCE BDR prior to separately approved production change.

## G. Acceptance matrix

| ID | Acceptance test | Expected |
|---|---|---|
| PHA-01 | Synthetic module validation | 20/20 PASS |
| PHA-02 | Production metadata diagnostic | Five sheets, SHEET and RANGE scanned; errors zero |
| PHA-03 | Deployed Web App executeAs | Manually verified |
| PHA-04 | Trigger owners/execution | Manually verified including other accounts |
| PHA-05 | Warning-only behavior | Confirmation appears to affected human, not mistaken for blocking |
| PHA-06 | Restrictive behavior | Unauthorized non-owner editor blocked; legitimate execution principal allowed |
| PHA-07 | Normal transaction flows | Report, review, revision, disposition, audit append all work in sandbox |
| PHA-08 | Foreign index collision | No ID overwrite; queue and recovery reviewed |
| PHA-09 | Backup and rollback | Valid PRE_MAINTENANCE backup and verified rollback plan |
| PHA-10 | Historical link resolution | ACTIVE_622 administrative resolution backed by evidence; ACE-DSP-004 remains FAIL until fixed and re-evaluated |

## H. Current production decision

**NO-GO** for production protection changes and deployment. Passing diagnostics proves only the read-only metadata observation and synthetic tests. It does NOT verify protections on different accounts or the deployed Web App.

Current ACE-DSP-004 canonical status remains FAIL, and LEGACY_14 is a separate evidence-compensated historical case.

Only a future, explicit human approval after isolated acceptance, source-integrity checks and reversible rollout can permit production change. No evaluator may be edited to manufacture PASS.

## I. Official references

- Google Apps Script Protection API: https://developers.google.com/apps-script/reference/spreadsheet/protection
- Google Apps Script ProtectionType: https://developers.google.com/apps-script/reference/spreadsheet/protection-type
- Google Apps Script ScriptApp: https://developers.google.com/apps-script/reference/script/script-app
- Apps Script Web apps: https://developers.google.com/apps-script/guides/web
- Installable triggers: https://developers.google.com/apps-script/guides/triggers/installable
- Google Sheets protected sheets and ranges: https://support.google.com/docs/answer/1218656

## J. Execution evidence: 10 October 2026, 17:15 WIB

This section records the actual Apps Script logs supplied by the maintainer. It does **not** represent a deployment, data edit, permission change, or sandbox write acceptance.

| Source log | Observed outcome |
|---|---|
| `ACE_DSP004_PHA_VALIDATION` (17:15:16 WIB) | `sukses=true`, `lulus=20`, `gagal=0`; 20 synthetic checks passed, no business data changed |
| `ACE_DSP004_PHA_SUMMARY` (17:15:59 WIB) | `sukses=true`, `protectedSheetsInspected=5`; `diagnosticComplete=true` |
| `ACE_DSP004_PHA_SHEET` for five named tabs | All five available; each `sheetInspected=true`, `rangeInspected=true`; `sheetProtectionCount=0`, `rangeProtectionCount=0`, `inspectionErrorCount=0`; `state=NO_PROTECTION_OBSERVED` |
| Editor execution identity | Active user and effective user both available, `currentExecutionIdentityRelation=MATCH` |
| Installable triggers for current examiner | Exactly **two** triggers visible, both event type `CLOCK` and source type `CLOCK`. Other accounts' triggers unknown |
| Explicit decision flags | `noProtectionsOnAllFive=true`, `triggerInventoryComplete=false`, `webAppExecuteAsVerified=false`, `protectedWriteFlowSandboxTested=false`, `ownerEditBlockVerified=false`, `productionChangeAuthorized=false`, `acceptanceApproved=false` |
| Read-only assertion | `readOnly=true`, `dataBisnisDiubah=false` |

### Acceptance progress

- **PHA-01**: PASS (20/20 synthetic tests).
- **PHA-02**: PASS (both SHEET and RANGE metadata inspected across five tabs with no errors).
- **PHA-03 through PHA-09**: NOT YET ACCEPTED, pending active Web App deployer/executeAs confirmation, full trigger-owner inspection, isolated copy's protected write-flow tests, rollback readiness and authorized BDR.
- **PHA-10**: NOT ACCEPTED; `ACTIVE_622` remains an unresolved historical backlink, with no verified replacement; canonical `ACE-DSP-004` remains **FAIL**.

### Immediate next check (non-mutating)

1. Use the **actual** active deployment details to record its `executeAs` behavior and deployed version; do not deploy or edit the deployment.
2. Use Apps Script's Triggers page to view two `CLOCK` triggers and determine their handler functions/creator scope. Do not disable/change triggers.
3. Collect *only* sanitized function names, versions, executor/trigger types, and counts. Do not publish account emails, deployment URLs, script IDs, or credentials.
4. After identifying effective writers, prepare a **separate** sandbox spreadsheet and **separate** sandbox script project with synthetic records before any protective write test.

The current runtime diagnostic stage is complete. **Production protection rollout remains NO-GO**.

## K. Trigger UI evidence: 10 October 2026, 17:18 WIB

Observed in the production Apps Script editor's **Pemicu / Triggers** panel, as supplied by the maintainer:

| Handler | Owner shown | Deployment | Event | Last run (Asia/Jakarta) | UI failure rate |
|---|---|---|---|---|---|
| `prosesBackupOtomatisBDRV10` | `Saya` (current account) | `Head` | Time-based | 2026-10-10 02:43:26 | **25%** |
| `prosesWorkflowReminderTerjadwalV10` | `Saya` (current account) | `Head` | Time-based | 2026-10-10 16:30:46 | **0%** |

### Interpretation and limitations

1. These two handlers match the 2 `CLOCK` triggers seen by the read-only RC1 runtime diagnostic. They are operated by the current editor account and execute HEAD code, not the pinned versioned Web App deployment.
2. The UI's 25% backup failure rate is a **historical aggregate warning**, not proof that the last run failed. Prior BDR evidence records an `AUTO_DAILY` recovery point at approximately 02:43 WIB on 2026-10-10 with **VERIFIED manifest**. This is consistent with last-run success but does not establish the cause or precise timing of other failures. The `Kode.gs` RC1 editor update must not be assumed to have caused earlier BDR failures.
3. Code inspection: the backup handler calls `bdrV10CreateRecoveryPoint_` with `AUTO_DAILY` and may retry once if the source changed during backup; the workflow reminder handler can append to `Audit_Log` and update Script Properties. Protection tests must cover both workflows in **isolated test resources**, and normal triggers must remain enabled until an evidence-backed action is approved.
4. This panel only establishes two trigger entries **visible to this account**. It does not certify whether other accounts own additional installable triggers; `getProjectTriggers()` is scoped to the current user.
5. **PHA-04 status: PARTIAL / OWNER-VISIBLE INVENTORY CONFIRMED**. It is not FULL PASS until any other trigger-owning accounts and operational execution principals are accounted for. **PHA-03: NOT VERIFIED** because the active Web App execute-as setting was not shown.

### Next read-only investigation

Open Apps Script → **Executions / Eksekusi** (not Triggers). Filter for the backup handler and unsuccessful runs; record the error timestamp, concise error code/message, and any failing function/line. Avoid publishing account emails, file IDs, credentials, Drive share links, or unrelated log payloads. Do **not** manually run `prosesBackupOtomatisBDRV10`, replay a failed job, edit either trigger, modify database or deploy.

**Production protection acceptance remains NO-GO; canonical ACE-DSP-004 remains FAIL.**

## L. Execution UI cross-check: 10 October 2026, approximately 17:23 WIB

The maintainer supplied an Apps Script Executions screenshot.

| Field | Observed |
|---|---|
| Handler | `prosesBackupOtomatisBDRV10` |
| Deployment | `Head` |
| Invocation | Time-based trigger |
| Started | 10 October 2026, 02:43:26 WIB |
| Duration | **313.889 seconds (approximately 5m14s)** |
| UI status | **Selesai / Completed** |
| Corresponding BDR evidence | Prior manifest scan found 10 October `AUTO_DAILY` recovery point starting about 02:43:31 WIB with status `VERIFIED` |

### Interpretation and remaining uncertainty

1. This invocation completed without an unhandled error according to the Executions UI. `Selesai` by itself is not a business-level success assertion, since scripts may return `{sukses:false}` without throwing; the VERIFIED backup manifest is independent supporting evidence.
2. Official Google Apps Script quotas currently list a **360-second per-execution limit**. At 313.889 seconds, this completed run had approximately **46.111 seconds of headroom**: https://developers.google.com/apps-script/guides/services/quotas. This is a timeout **risk warning**, not proof that any specific earlier failure timed out.
3. The 25% error indication in the Triggers UI remains unexplained. No BDR failed execution is shown in this screenshot.
4. Version-681 Web App calls are also visible. This supports that some UI calls use pinned code, whereas the BDR time trigger runs HEAD. It does not establish deployed Web App execute-as identity.
5. UI only shows 200 of many executions in a seven-day window. Visible completed entries cannot exclude unseen failed executions.

### Next safe read-only step

In Apps Script Executions choose Tambahkan filter / Add filter, filter function `prosesBackupOtomatisBDRV10`, and then choose failed status (`Gagal`). Inspect one failed invocation and record concise timestamp, error message and failing function/line, without email addresses, private Drive IDs, script IDs or unrelated log payloads.

Do **not** manually run backups, edit triggers, modify Script Properties or deploy. PHA production protection remains **NO-GO**.

## M. Failed executions screen: 10 October 2026, 17:27 WIB

Maintainer supplied the Apps Script **Executions** UI filtered to `Status: Gagal (Failed)`, which displayed **one failed execution in the previous seven days**. It was **not** a BDR trigger execution:

| Attribute | Observed value |
|---|---|
| Handler | `simpanDataKinerja` |
| Deployment | Version 681 (pinned Web App), not HEAD time trigger |
| Event/start | Web App, 2026-10-08 15:02:43 WIB |
| Duration/status | 5.313 seconds; Failed |
| Error ID | `0174E4292B` |
| Source stack | `pasangSubmitNonceInFlight_` (`Kode.gs:6311:18`) → `simpanDataKinerja` (`Kode.gs:6185:22`) |
| Visible message | Generic server error: retry later |

### Source-code correlation and constraints

GitHub `main` contains `pasangSubmitNonceInFlight_` at line 6304. Line **6311** calls `nonceLock.tryLock(5000)` after obtaining a script lock; `simpanDataKinerja` invokes this helper at line **6185**, before payload normalization and before appending any record to `Rekap_Kinerja`. Those line numbers match the screenshot. An ordinary lock contention timeout would normally return `false` from `tryLock` and use the helper's human-friendly queue message, whereas the screenshot contains an `Exception` with a generic server error. This points to an error during/at the lock-service call or its backing runtime, but **does not prove the exact underlying service condition**. Official API documentation: https://developers.google.com/apps-script/reference/lock/lock

The failed call happened on **2026-10-08**, two days **before** the RC1 index guard was introduced on **2026-10-10**, and ran deployed Web App version 681. Do **not** attribute the failure to RC1, nor conflate it with the **2026-10-01 ACTIVE_622** manual-deletion incident.

Because the stack terminates at the pre-save nonce-guard call, the shown invocation did **not reach the normal report append stage** as structured in GitHub main. The evidence does not establish whether the employee retried successfully in a separate invocation. **Do not recreate reports automatically or modify production records on this basis.**

### BDR error percentage interpretation

The screenshot's *Failed* filter shows **no failed `prosesBackupOtomatisBDRV10` execution during the displayed seven-day window**, but the earlier Triggers panel showed a **25%** BDR error rate. That percentage remains unexplained: it could use a different historical window/denominator, and the UI does not expose that breakdown here. Do not reset/disable the BDR trigger or assume its historical rate has been remediated.

### Recommended disposition

- Mark this as **a separate Web App submission/nonce lock incident** pending evidence; avoid a speculative production patch for a single generic exception.
- If the employee reports missing work, inspect the employee's report history and corresponding successful submit audit entries **read-only** before advising a resubmission.
- The current PHA guard and production protection rollout remain **NO-GO**; continue with confirming active Web App `executeAs` and isolated sandbox acceptance.

All source and evidence review above was read-only; no live report, deployment, trigger, script properties or protections were modified.

## N. Web App execute-as screenshot — 10 October 2026, approx. 17:32 WIB

Maintainer screenshot of the deployment configuration dialog showed:

| Field | UI observation |
|---|---|
| `Jalankan sebagai` | `Saya` (account identity withheld from this repository) |
| `Yang memiliki akses` | `Siapa saja` |
| Dialog | An enabled `Terapkan` button and a `Batal` button were visible |

**Interpretation and evidence limit**

- The **editor-visible** Web App configuration uses the deploying account authority (`USER_DEPLOYING`-style execution). Google Apps Script documentation confirms that `Execute as me` means browser visitors do not need their own spreadsheet/Drive permissions for server calls to execute as the deploying principal.
- `Siapa saja` indicates broad Web App URL reachability. The screenshot alone does not establish the exact manifest `access` enum (`ANYONE` versus `ANYONE_ANONYMOUS`) or the efficacy of the Portal's server-side login and permission gates. Do not conclude employee data is publicly disclosed just from this selection.
- Because an enabled `Terapkan` button was visible, this might show **editable/staged deployment configuration** rather than an independently confirmed already-saved active version. Do not click `Terapkan`; leave using `Batal` unless an explicitly approved deployment change exists. Confirm the version and selected active deployment by read-only view if necessary.
- Protections cannot remove spreadsheet owners' right to edit protected areas. If the Web App deployer is the spreadsheet owner, restricted-editor protections should normally preserve server-side app writes but cannot prevent manual deletion by that owner. Test this in an isolated sandbox; avoid extrapolating to all ownership scenarios.
- App hardening should combine least-privilege file sharing, warning-only confirmation where useful, intentional cancellation/replacement workflow, source integrity checks, and server-side authentication/authorization checks for all privileged endpoints. The GitHub `simpanDataKinerja` entrypoint calls `validasiSession(token)` early, but this observation is **not** a comprehensive endpoint security review.

**PHA-03 status**: Execution mode and broad access setting **OBSERVED**. Effective writer identity is provisionally the deploying account; independently verifying the **active saved deployment** and authorization boundaries is still required for full acceptance. **NO PRODUCTION MUTATIONS APPROVED.**

Official source references:
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/manifest/web-app-api-executable
- https://developers.google.com/apps-script/reference/spreadsheet/protection


## O. Isolated native Google Sheets sandbox verified

Maintainer provided native Google Sheet **SANDBOX_PHA_RC1_SYNTHETIC_ONLY**. The connected Drive metadata resolves the supplied exact file ID as MIME `application/vnd.google-apps.spreadsheet`, not an XLSX preview. Sandbox spreadsheet ID is distinct from the canonical production spreadsheet ID (not reproduced here).

| Item | Read-only evidence |
|---|---|
| Sheets | `MULAI_DI_SINI`, `Rekap_Kinerja`, `Index_Laporan`, `Disposisi_Penerima`, `Audit_Log`, `Disposisi_Log` (6 sheets) |
| Source structure | Core sheet headers match the required basic production column shape: Rekap 71 columns, Index 12 populated headers, recipient 12, Audit 4, Disposition log 14 |
| Synthetic reports | `PHA-TEST-RPT-0001` and `PHA-TEST-RPT-0002` in Rekap; both have matching ID/row pointers in Index |
| Synthetic disposition | `PHA-TEST-DSP-0001` and associated recipient/report/event ID matches the first test report |
| Audit evidence | Two synthetic `SUBMIT_LAPORAN` log entries; one synthetic disposition-create event |
| Sharing metadata | One owner/user permission returned, no broad reader/editor grant in the returned permissions (verify with UI when testing roles) |
| Live production data copied | None observed in sampled six-tab records; the test workbook is explicitly synthetic |
| Production writes or deployment | NONE |

### Safe first test (PHA-05 only)

Use the sandbox Google Sheets UI, select `Rekap_Kinerja` sheet → Data → Protect sheets and ranges → Add sheet/range → Sheet → `Rekap_Kinerja` → Set permissions → **Show a warning when editing this range** → Done. This affects only the verified sandbox sheet. Attempt to edit a synthetic description cell, verify that a warning appears, then **Cancel** to leave the test value unchanged. Do not edit or delete real production rows.

PHA-05 should be marked PASS only after screenshot evidence confirms the warning and preserved synthetic values; the warning alone never proves that editing is blocked. PHA-06 requires an isolated **non-owner test editor** and further scripted-write acceptance checks. Do not attach the production Apps Script, copy Script Properties, or install triggers.

**Sandbox provisioning verified; protection behavior itself NOT YET TESTED. Production remains NO-GO.**

## P. PHA-05 warning-only test evidence — 10 October 2026, 17:46 WIB

The maintainer supplied a screenshot of the **native, isolated** `SANDBOX_PHA_RC1_SYNTHETIC_ONLY` Google Sheet, `Rekap_Kinerja` selected. The sheet displays a lock symbol and a modal titled `Perhatian!` stating that the user is attempting to edit a portion of the sheet that should not be modified accidentally. `Batal` and `Oke` buttons are visible. The `Do not show this again for 5 minutes` checkbox appears **unchecked**.

Screenshot selection is **E3**, not E2. This is acceptable, because the test is intentionally scoped to the **whole `Rekap_Kinerja` sheet**, not one specific synthetic row.

A separate **read-only Google Sheets API check** found:

- `Rekap_Kinerja!E2` = `Laporan untuk pengujian proteksi. Tidak terkait kegiatan nyata.`
- `Rekap_Kinerja!E3` = `Laporan kedua untuk memvalidasi index satu-ke-satu.`
- Both values match the pre-test synthetic baseline.

### Decision

**PHA-05 WARNING-DISPLAY PASS**. Warning-only sheet protection on the sandbox is shown working; the two checked synthetic source cells remained unchanged at the read-only verification time. **User confirmation of clicking `Batal` was not yet supplied** (the screenshot shows the dialog still open). The modal is not proof that edits are prevented: clicking `Oke` can proceed.

### Next PHA-06 prerequisites

Testing **restricted editors** requires a **non-owner** sandbox test collaborator (not a real staff member and not a production editor), an explicit test-only sharing approval, and an isolated test Apps Script for authorized server write-flow checks. Owner permissions cannot be made immutable using Sheets protection.

Do not enable restricted protection on production, change production sharing, run production triggers or apply production deployment. Keep the sandbox synthetic records and warning-protection baseline until PHA-06 test actors are ready.

## Q. PHA-06 non-owner editor block — verified 10 October 2026

The maintainer used a **second Google account** as a collaborator of the isolated `SANDBOX_PHA_RC1_SYNTHETIC_ONLY` file. They reported that this account saw no warning dialog when trying to edit or delete data in `Rekap_Kinerja`, but that the edit/delete action was **not allowed**. This is expected for a **restricting-editor** protection, unlike PHA-05 warning-only protection.

Independent read-only connector verification on the exact sandbox ID (not on production):

| Check | Actual value |
|---|---|
| Drive permission roles | One `owner` user and one `writer` user; addresses intentionally excluded |
| `MULAI_DI_SINI!D16` | `PHA06-EDITOR-ACCESS-OK`, confirming an unprotected control sheet was editable |
| `Rekap_Kinerja!E3` | `Laporan kedua untuk memvalidasi index satu-ke-satu.`, unchanged from test baseline |
| Spreadsheet file type | Native Google Sheets, not production spreadsheet |

**Decision: PHA-06 RESTRICTED-EDITOR USER-UI BLOCK = PASS.** A non-owner with file-level writer access can edit the unprotected control sheet but reports being unable to edit or delete cells from the restricted sheet. The lack of a warning dialog is **not** a failure; Google Sheets protection can deny edits instead of merely prompting.

**Important limit:** This is not end-to-end protected Apps Script-write acceptance. The production Web App runs as its deploying account, but the protected sandbox has not yet been exercised through a separate Apps Script test project. Do not infer that production submit/review/disposition/audit writes will continue under proposed protections.

**Next PHA-07:** create a **separate standalone Apps Script test project** (not a clone of the live project), point it **only** at the verified synthetic sandbox spreadsheet ID, and use harmless test IDs to exercise authorized append/update and cross-ID index guard behavior. Project must have no deployments, time triggers, production Script Properties or production file references. Require explicit sandbox target check, dry-run and rollback test.

**Production decision: NO-GO. Canonical ACE-DSP-004: FAIL.**

## R. Isolated PHA-07 Apps Script project provisioned

On 10 October 2026 the maintainer supplied a screenshot of a freshly created standalone Apps Script project named `SANDBOX_PHA_RC1_SCRIPT_TEST`, initially containing only `myFunction()`. No deployment or triggers were visible in the screenshot; absence of triggers must still be checked at runtime.

A separate `PHASandboxWriteAcceptanceRC1.gs` and the operating guide at `docs/ACE-DSP004-PHA07-Sandbox-Writer-RC1.md` have now been authored on this feature branch.

- Guard uses **only the existing synthetic sandbox ID**, explicit synthetic fixture validation, strict-sheet protection inspection, and current-caller trigger count.
- Functions `validasiLogikaPHA07RC1()` and `praUjiSandboxPHA07RC1()` are read-only. Both require operator execution; no production invocation has taken place.
- Opt-in write probe remains **disabled by default** (`PHA07_ALLOW_WRITE_RC1=false`). No write-test execution authorized until successful live sandbox preflight.
- Offline mocks: 7/7 pure tests pass; fixture accepted, lack of authorization and nonzero trigger counts fail closed; opt-in reversible `Rekap_Kinerja!R2` probe restores original synthetic value in simulated environment.

**PHA-07 status: SANDBOX PROJECT CREATED; PRE-FLIGHT PENDING. Production protection changes remain NO-GO; ACE-DSP-004 remains FAIL.**

## S. PHA-07 protected synthetic write smoke — 10 October 2026, 18:09 WIB

Maintainer Apps Script output: `PHA07_WRITE_TEST` returned `sukses=true`, `status=PASS_WRITE_AND_RESTORE`, `target=SANDBOX_ONLY_REKAP_R2`, `writeObserved=true`, `restoreVerified=true`, `manualRestoreRequired=false`, `productionDataWritten=false`.

Independent read-only check confirmed sandbox `Rekap_Kinerja!R2` blank (restored), `S2=PHA-TEST-RPT-0001`, and `S3=PHA-TEST-RPT-0002`.

**Acceptance scope:** PHA-07 **protected-write smoke subtest PASS** for isolated test principal and one known synthetic cell, but PHA-07 **full Portal business-flow compatibility NOT YET ACCEPTED**. PHA-08 foreign-ID collision acceptance remains pending. Neither result justifies modifying production protections or deploying the branch.

**Operator safety:** Set `PHA07_ALLOW_WRITE_RC1=false` again in the separate sandbox project; a successful test log does not independently prove the flag was switched off after the run.

Production protection rollout **NO-GO**. Canonical `ACE-DSP-004` **FAIL**.

## T. PHA-08 Index Collision Acceptance staging

11 October 2026: created PHASandboxIndexCollisionRC1.gs and the procedure docs/ACE-DSP004-PHA08-Index-Collision-Acceptance-RC1.md in the existing isolated protection acceptance feature branch. Added NO production files, deployments, triggers, protections, Script Properties, data modifications or main merge.

Guard provenance: isolated closure contains the exact source helper bodies from ACEDsp004IndexIntegrityRC1.gs; exact text equality verified. Production SHEET_COLUMNS remains untouched. Read-only fixtures consist only of synthetic report IDs in Rekap_Kinerja source rows 2–3 and Index_Laporan rows 2–3. B into A must be rejected before a writer callback; B into B must be accepted.

Offline QA: 12/12 pure PASS, mocked read-only preflight PASS; in mocked opt-in write test, foreign ID collision blocked (0 writes), matching index row3 written and restored (2 synthetic calls), before/after fixture matched, lock released. Unexpected trigger, unauthorized executor and modified fixture failed closed. Independent native Google Sheets read-only check confirms current synthetic baseline unchanged.

**PHA-08 status: STAGED / LIVE READ-ONLY PREFLIGHT PENDING.** Phase A should run validasiLogikaPHA08RC1 and praUjiKolisiIndexPHA08RC1 with PHA08_ALLOW_WRITE_RC1=false in the dedicated SANDBOX_PHA_RC1_SCRIPT_TEST project; PHA07_ALLOW_WRITE_RC1 must also remain false. The opt-in write function remains disabled until separate review.

Full production 2B1 dual-write plus queue flow is not exercised by this isolated test, so even a successful PHA-08 sandbox guard test does NOT certify PHA-07 entire workflow, administrative reconciliation or readiness to deploy. Production remains NO-GO and ACE-DSP-004 remains FAIL.

## U. PHA-08 first sandbox write failed; repaired harness staged (11 October 2026)

Maintainer submitted an Apps Script screenshot from the separate SANDBOX_PHA_RC1_SCRIPT_TEST project at 11:30 WIB. `PHA08_WRITE_TEST` reported `sukses=false`, `status=SANDBOX_INDEX_RESTORE_NEEDS_ATTENTION`, `foreignIdBlocked=true`, `foreignIdWrites=0`, `sameIdWriteObserved=false`, `restoreVerified=false`, `manualRestoreRequired=true`, `stopCode=PHA08_STOP_SAME_ID_WRITE_NOT_OBSERVED`, `productionDataWritten=false`.

Read-only connected Google Sheets inspection confirmed both synthetic report IDs, index pointers and J3 nonce remain correct. However, three synthetic date/periode fields `Index_Laporan!D3`, `E3` and `K3` have shifted into numeric date-serial types; initial synthetic baseline displayed these as plain-text strings. The original test rewrote all of `A3:L3` with `setValues`, a plausible cause of coercion. **Do not treat the restoration as complete**, and do not rerun original writer.

Hotfix `PHASandboxIndexCollisionRC1.gs` version `PHA08-INDEX-COLLISION-RC1-2026.10.11.02` now performs test/restore on **J3 alone**; before any write it enforces exact text baselines for D3, E3 and K3. Production-candidate guard functions are unchanged; updated hotfix passed 12/12 pure and sandbox mocks including type-change rejection.

Operator must first set PHA07_ALLOW_WRITE_RC1=false and PHA08_ALLOW_WRITE_RC1=false, manually restore text literals in D3=`2026-10-10 09:15:00`, E3=`2026-10`, K3=`2026-10-10 09:15:02` in the synthetic sandbox, then replace only the isolated sandbox module with updated RC1.02 and rerun the **read-only** preflight. Do not enable another write test pending acceptance.

**PHA-08 guard-level status:** collision blocking observed, but live protected write-and-restore acceptance **FAIL / HOLD**. Production rollout remains NO-GO. `ACE-DSP-004` remains FAIL.

Full incident details and repair gate: docs/ACE-DSP004-PHA08-Index-Collision-Acceptance-RC1.md.

## V. PHA-08 RC1.02 sandbox collision and restore PASS — 11 October 2026

Actual screenshot `PHA08_WRITE_TEST` from `SANDBOX_PHA_RC1_SCRIPT_TEST`: `sukses=true`, `status=PASS_COLLISION_BLOCK_AND_RESTORE`, `target=SANDBOX_ONLY_INDEX_J3`, `foreignIdBlocked=true`, `foreignIdWrites=0`, `sameIdWriteObserved=true`, `restoreVerified=true`, `manualRestoreRequired=false`, `productionDataWritten=false`.

Independent **read-only** native sandbox Google Sheets verification confirmed both synthetic report IDs and index row pointers unchanged, `J3` restored to its original nonce, and original D3/E3/K3 string values preserved exactly. The PHA-08 **guard-level** sandbox acceptance is **PASS**; the former RC1.01 restore incident is resolved for the specified inspected baseline.

The Apps Script screenshot still showed `PHA08_ALLOW_WRITE_RC1=true`; operator must reset it to false and save. Reset is **not yet independently verified**.

**Scope boundary:** this only verifies the extracted RC1 guard and J3-only write/restore under the isolated sandbox executor. Full production Web App submit/review/disposition, index sync-queue, triggers, and BDR acceptance remain outstanding. Do not merge to main, activate protection or deploy. Canonical `ACE-DSP-004` remains FAIL.

Full evidence record: `docs/ACE-DSP004-PHA08-Index-Collision-Acceptance-RC1.md`.

## W. PHA-08 write gates reset — operator attestation

The maintainer confirmed the standalone Apps Script project `SANDBOX_PHA_RC1_SCRIPT_TEST` was saved with `PHA07_ALLOW_WRITE_RC1=false` and `PHA08_ALLOW_WRITE_RC1=false`. This is a **user/maintainer attestation**, not a connector-verified read of Apps Script editor source.

**Close PHA-08 guard-level sandbox acceptance as PASS.** PHA-07 full business-transaction/queue acceptance and PHA-09 disaster recovery/rollback acceptance are still open. Do not label the whole Protection Hardening Acceptance RC1 production-ready. All production protections, deployment, trigger state, data and GitHub main remain unchanged by this note. Canonical ACE-DSP-004 remains FAIL.

## X. PHA-07B transaction and queue read-only acceptance staged

11 October 2026: Source-reviewed the submit→dual-write→audit/disposition, review→resync and `Index_Laporan_Sync_Queue` paths in branch Kode.gs and SheetSchema.gs. Added `PHASandboxTransactionQueueRC1.gs` and guide `docs/ACE-DSP004-PHA07B-Transaction-Queue-Integrity-RC1.md` on the existing feature branch, **read-only plus pure in-memory modeling only**. No `Kode.gs` modifications, sheet writes, triggers or deployment.

Notable code-level risk: a queued `ROW` sync record is bound to a mutable source row pointer but contains no original report ID; after an administrative row deletion/reuse, replay cannot by itself prove repair for the old report. Queue statuses `FAILED` below max attempts can still be replayed, and `FULL_REBUILD` is marked for manual rebuild. The collision guard mitigates foreign-ID index overwrites but is not proof of historical queue-item identity.

Additional non-atomic edges: the source report append can succeed before index dual-write; subsequent audit/disposition writes catch exceptions or run as separate cell updates. This warrants test-only injected failures and post-state evidence before production acceptance.

Offline QA: **30/30 pure in-memory PASS**. Independent connected Google Sheets read-only review of the six-tab synthetic sandbox found **2/2 report↔index links, 2/2 submit audits, 1/1 recipient reverse link, 1/1 disposition-create audit** consistent. Mock sandbox preflight passes and fails closed for review mismatch, unanticipated queue sheet, unauthorized editor and unexpected test trigger. Zero business-data writes.

Next operator step: install new standalone `PHASandboxTransactionQueueRC1.gs` as an **additional script file** in `SANDBOX_PHA_RC1_SCRIPT_TEST`; leave both existing PHA-07 and PHA-08 write flags false. Run only `validasiLogikaPHA07BRC1()` (30/30 target) and `diagnostikTransaksiAntreanPHA07BRC1()` (read-only source relationships). Share `PHA07B_PURE_VALIDATION` and `PHA07B_PREFLIGHT`. Real queue/write Phase B requires a **second isolated, disposable** test workbook because the current fixture is exactly six tabs.

**PHA-07B status: STAGED / OPERATOR READ-ONLY TEST PENDING.** Complete submit/review/disposition/queue acceptance remains OPEN, production NO-GO and canonical ACE-DSP-004 FAIL.

## Y. PHA-07B B0 isolated environment created

11 October 2026: a new native Google Sheet named `SANDBOX_PHA07B_B0_SYNTHETIC_ONLY` was created and connector-read-verified at https://docs.google.com/spreadsheets/d/1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8/edit. This is separate from the earlier PHA-05–08 six-tab sandbox and the production database.

Exact B0 fixture: 10 tabs including 71-column Rekap, 12-column Index, **empty Index_Laporan_Sync_Queue**, Disposisi_Surat, recipient/log/audit tabs, 15 unexecuted scenarios and empty event journal. Two purely synthetic report/index pairs, two submit audit entries and one disposition link were read back and checked.

Created `PHASandboxB0EnvironmentRC1.gs`: read-only, exact B0 ID/title and tab guards, no write APIs, no production IDs, current-caller trigger check. 8/8 pure logic checks passed offline. Operator Apps Script environment preflight is **PENDING** and should run in a **new** standalone `SANDBOX_PHA07B_B0_SCRIPT_TEST` project, not in the previous six-tab test script. No actual transaction/queue replay may occur during B0.

Guide: `docs/ACE-DSP004-PHA07B-B0-Isolated-Environment-RC1.md`. **B0 state: ENVIRONMENT PROVISIONED, OPERATOR ACCEPTANCE PENDING. Production remains NO-GO. ACE-DSP-004 remains FAIL.**

## Z. PHA-07B B0 environment read-only acceptance PASS — 11 October 2026

Operator evidence from standalone `SANDBOX_PHA07B_B0_SCRIPT_TEST`: `PHA07B_B0_PURE_VALIDATION` **8/8 PASS**; `PHA07B_B0_PREFLIGHT` successful, `mode=READ_ONLY`, sandbox identity and cross-references verified, empty queue verified, no triggers visible to current user, `writesEnabled=false`, `productionDataWritten=false`, `acceptanceApproved=false`.

Independent connected Google Sheets verification also confirms the exact isolated B0 native workbook still has 10 tabs, 2 synthetic sources and matching index rows, 2 submit audits, 1 recipient/disposition link, 0 queue entries, 0 event-journal entries, and all 15 B1-related scenarios remain PENDING.

**Decision**: B0 environment/read-only acceptance CLOSED / PASS. This does **not** grant write-test permission. B1 transaction/queue fault-injection testing remains NOT STARTED; no production code, data, queue, triggers, main branch or deployed Web App changes are authorized. `ACE-DSP-004` remains FAIL and production remains NO-GO.

Record of evidence and next-phase gate: `docs/ACE-DSP004-PHA07B-B0-Isolated-Environment-RC1.md`.

## AA. PHA-07B B1 disposable transaction fault harness staged — 11 October 2026

B0 operator read-only acceptance CLOSED/PASS. A **new isolated native B1 disposable copy** `SANDBOX_PHA07B_B1_DISPOSABLE_SYNTHETIC_ONLY` was created from B0 at `https://docs.google.com/spreadsheets/d/1hldhvaMRo5etOCQlqCYISgvbpAdOIfAJN5IfGa3kD3Q/edit`. Both file IDs are distinct. Eight bounded baseline ranges matched B0; only B1's local synthetic stage markers `MULAI_DI_SINI!A5` and `A8` were updated, not business records. B0 remains preserved.

New `PHASandboxB1TransactionQueueRC1.gs` implements isolated read-only preflight and two **default-disabled**, bounded, reversible sandbox fault tests: source-committed/index-failure `ROW` queue hold, and exact-ID retry with detectable audit, review and disposition gaps. This is **synthetic test code**, not a production `Kode.gs` clone, and it contains no production ID, Script Properties or trigger/deployment function.

Offline QA: **41/41 model tests PASS**. Full mocked Apps Script preflight using actual connector-read B1 baseline PASS; gate OFF triggers zero writes; mocked fault and retry scenarios PASS with scoped restoration and next preflight PASS. Fault injection on partial setValues is restored, and simulated restore failure fails closed with `manualRestoreRequired=true`. No live writer execution on Google Sheets B1 is claimed.

Operational guide: `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md`. Next operator action: create **new** standalone Apps Script project `SANDBOX_PHA07B_B1_SCRIPT_TEST`, paste only new B1 harness, leave `PHA07B_B1_ALLOW_WRITE_RC1=false`, run `validasiModelB1PHA07BRC1` (41/41) and `praUjiTransaksiB1PHA07BRC1` (read-only), share logs. Both write functions remain NOT AUTHORIZED until a separate decision.

**B1 status STAGED / LIVE READ-ONLY PENDING; PHA-07B integrated production-handler acceptance OPEN; production rollout NO-GO; canonical ACE-DSP-004 FAIL.**

## AB. PHA-07B B1 Phase A live read-only PASS — 11 October 2026

Maintainer executed `validasiModelB1PHA07BRC1()` in standalone `SANDBOX_PHA07B_B1_SCRIPT_TEST`: **41/41 PASS**; `praUjiTransaksiB1PHA07BRC1()` returned `sukses=true`, `mode=READ_ONLY`, `exactB1SandboxVerified=true`, `baselineUntouched=true`, `queueEmpty=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `actualTransactionApproved=false`.

Independent connected native Sheets bounded reread: **9/9 checks PASS**, including unchanged B0 stage marker/empty queue, B1 2 report–index records, exact disposition/audit links, 0 queue jobs, 0 event journal entries, and 15 pending scenarios.

**B1 Phase A CLOSED/PASS**. First live isolated synthetic writer `ujiGagalIndexAntreanB1PHA07BRC1` is the only next scoped acceptance step. Operator temporarily enables B1 write gate, performs **one** run, immediately disables the gate; no retry on stop/restore failure. Other writer, all production mutation/replay, Web App deployment and main merge remain NO-GO. `ACE-DSP-004` remains FAIL.

See `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md` for exact criteria.

## AC. PHA-07B B1-01 isolated synthetic failure test PASS — 11 October 2026

Operator screenshot records real isolated sandbox `PHA07B_B1_WRITE_TEST` result for `B1-INDEX-FAILURE`: `sukses=true`, `status=PASS_SYNTHETIC_WRITE_AND_RESTORE`, `sourceCommittedObserved=true`, `indexFaultInjected=true`, `queuePersistedObserved=true`, `rowReplayHeld=true`, `restored=true`, `manualRestoreRequired=false`, `productionDataWritten=false`, `actualProductionHandlersUsed=false`.

Connected native Google Sheets **read-only** comparison of the B1 disposable copy to pristine B0 found **zero value differences across 9 bounded tab regions**. The synthetic queue and scratch areas are empty; two original report/index pairs and audit/disposition links remain; 15 scenario statuses unchanged.

**B1-01 CLOSED/PASS** under synthetic harness scope. **B1-02 and full production handler/queue acceptance OPEN**. The screenshot still showed `PHA07B_B1_ALLOW_WRITE_RC1=true`; user must reset the flag to `false` and save, then demonstrate read-only preflight before further write tests. No automatic replay, production changes, protections, deployments or main merge permitted. Canonical `ACE-DSP-004` remains FAIL.

Full evidence: `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md`.

## AD. B1-01 writer disabled again, post-test preflight PASS — 11 October 2026

Maintainer showed saved B1 script state `PHA07B_B1_ALLOW_WRITE_RC1=false` and `PHA07B_B1_PREFLIGHT`: `sukses=true`, `exactB1SandboxVerified=true`, `baselineUntouched=true`, `queueEmpty=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `actualTransactionApproved=false`.

Independent connected Sheets read-only comparison repeated after the preflight: nine bounded native B1 source/index/queue/disposition/audit/journal/scenario regions exactly matched pristine B0. B1 queue and scratch still empty.

Decision: B1-01 CLOSED/PASS with operator write-off confirmed; B1-02 isolated test `ujiPemulihanReviewDisposisiB1PHA07BRC1()` is eligible for **one operator-controlled synthetic-only run** after temporary opt-in and immediate reset. No real Portal handlers are invoked; B1-02 acceptance remains PENDING until its own execution and restore verification.

Production and GitHub main NO-GO; `ACE-DSP-004` remains FAIL. See `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md`.

## AE. PHA-07B B1-02 synthetic review/disposition recovery PASS — 11 October 2026

Operator screenshot: standalone isolated `SANDBOX_PHA07B_B1_SCRIPT_TEST` successfully executed `ujiPemulihanReviewDisposisiB1PHA07BRC1()` with `caseId=B1-RETRY-REVIEW_DISPOSITION`, `sukses=true`, `status=PASS_SYNTHETIC_WRITE_AND_RESTORE`, `byIdRetrySafe=true`, `reviewDivergenceDetected=true`, `auditGapDetected=true`, `dispositionGapDetected=true`, `recoveryLinksVerified=true`, `queuePersistedObserved=true`, `restored=true`, `scratchCleared=true`, `manualRestoreRequired=false`, `productionDataWritten=false`, `actualProductionHandlersUsed=false`.

After the run, independent native Google Sheets read-only comparison of **nine bounded B1 test regions** to the pristine B0 baseline confirmed **zero value/type differences**. Queue is empty; two original synthetic reports/indexes and audit/disposition links remain; 15 scenarios remain untouched and journal is empty.

**B1-02 acceptance CLOSED/PASS for the synthetic harness.** Both B1-01 and B1-02 scoped synthetic writer tests have passed. **B1 post-test safety closeout is still PENDING**: screenshot shows `PHA07B_B1_ALLOW_WRITE_RC1=true`; operator must reset it to `false`, save and return a successful read-only `praUjiTransaksiB1PHA07BRC1` preflight (`writeEnabled=false`). Do not rerun either writer.

Phase-wide real Portal transaction and queue-worker integration remains untested; no production business record changes, deployment, trigger modification, merge into `main`, or administrative reconciliation are authorized. `ACE-DSP-004` remains FAIL and production remains NO-GO. Full record: `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md`.

## AF. PHA-07B B1 final read-only preflight PASS — synthetic acceptance CLOSED (11 October 2026, 13:32 WIB)

After the B1-02 live sandbox writer PASS and independently verified restoration, maintainer executed `praUjiTransaksiB1PHA07BRC1()` from standalone `SANDBOX_PHA07B_B1_SCRIPT_TEST`: `PHA07B_B1_PREFLIGHT` reported `sukses=true`, `mode=READ_ONLY`, `exactB1SandboxVerified=true`, `baselineUntouched=true`, `queueEmpty=true`, `scratchEmpty=true`, `noVisibleTriggers=true`, `writeEnabled=false`, `productionDataWritten=false`, `actualTransactionApproved=false`.

An additional independent **read-only** connected Google Sheets comparison reconfirmed **9/9** bounded native B1-vs-B0 tab regions identical in observed unformatted values and types. B1 has 2 original source/index reports, zero queue items, zero event-journal entries, 15 unchanged scenario entries and correct B1-only markers; B0 stage marker remains correct.

**Decision: PHA-07B B1 synthetic harness acceptance CLOSED / PASS** for the specific first two sandbox write scenarios B1-01 and B1-02 plus pure-model/preflight/restore checks. The 15 planned scenario worksheet entries are not marked executed; no production business handlers or native production queue processor were used. The B1 writer flag is confirmed OFF at read-only execution; no further B1 writer runs are needed.

Next stage is isolated production-path integration design and read-only preflight (PHA-07B B2), **not** immediate production deployment. No mutation of the live database, GitHub `main`, deployed Web App, triggers, protection ACLs or historical records. Canonical `ACE-DSP-004` remains FAIL and production remains NO-GO.

Detailed evidence: `docs/ACE-DSP004-PHA07B-B1-Synthetic-Failure-Injection-RC1.md`.

## AG. PHA-07B B2 isolated production-path source trace staged

11 October 2026: user authorized B2 development. A **new** native B2 synthetic workbook `SANDBOX_PHA07B_B2_ISOLATED_PRODUCTION_PATH` at `https://docs.google.com/spreadsheets/d/1xW2kMz1lFv6wtaWNNgNoyVCuLZnsqsGpAQ886blVtcU/edit` was copied from pristine B0. Only `MULAI_DI_SINI!A5` and `A8` were changed to explicit B2 stage/write-NO-GO markers. B2/B0 nine bounded tab-region value comparisons: **9/9 identical** with 0 queue entries. Original B0 and B1 workbooks preserved.

Committed feature-branch-only `PHAB2IsolatedProductionPathRC1.gs`, version `PHA07B-B2-SOURCE-TRACE-RC1-2026.10.11.01`. Unlike B1's rewritten synthetic transaction simulator, this code embeds **11 verbatim functions** from pinned candidate `Kode.gs` SHA `387c179c684c3a1820da662f961133b4e7a67ccb` and `ACEDsp004IndexIntegrityRC1.gs` SHA `22991bb74fe812b6df1e7e8fe44d989f71b62684`, each behind local **in-memory** dependency adapters. 11/11 verbatim parity PASS, 29/29 pure source-path behavioral checks PASS, read-only B2 preflight mock PASS, 5 fail-closed negative preflight scenarios PASS. No real Apps Script/Google Sheets write path executed.

**Critical differential:** `Kode.gs` on GitHub `main` SHA `f0222ef85774aabf7d107547e0fe2fdbc52434d5` differs from candidate by exactly a 280-character inserted ACE index-guard call at approximately line 20300; separate guard `.gs` file is not on `main`. This candidate source trace does not verify what is installed in the bound production Apps Script or selected Web App deployment. Do not conflate version 681/deployed script with `main` or feature branch.

Code-level findings from real copied queue worker under adapters: `ROW` replay transports no original report ID, so with a successful current-row sync the original worker can mark DONE without historical ID proof; queue enqueue puts dedup cache entry before durable append, creating possible temporarily suppressed retries on append failure; `FAILED` attempts < 5 can retry and FULL_REBUILD stays manual. These are reproduced with **synthetic memory traces**, not a proven production incident. Effects orchestrator can leave audit without disposition log if recipient update fails.

**B2 Phase A is STAGED / OPERATOR READ-ONLY PENDING:** New standalone Apps Script project `SANDBOX_PHA07B_B2_SCRIPT_TEST`, paste only `PHAB2IsolatedProductionPathRC1.gs`, keep `PHA07B_B2_WRITE_ENABLED=false`, run `validasiJalurProduksiB2RC1()` targeting 29/29, then `diagnostikLingkunganB2PHA07BRC1()` targeting successful read-only B2 preflight. No triggers, deployment, properties or real data.

Detailed acceptance plan: `docs/ACE-DSP004-PHA07B-B2-Isolated-Production-Path-RC1.md`. Full real production-handler integration, session/cutoff validation, persistent queue failure injection, Web App version concordance and all production protections still PENDING. **NO-GO production; canonical ACE-DSP-004 FAIL; ACE-REV-003 remains separate.**
