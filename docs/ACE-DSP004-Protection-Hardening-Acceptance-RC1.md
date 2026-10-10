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
