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
