# PHA-07B B2 — SAV11 Independent Re-Attestation Runbook v1.2

**Updated 16 October 2026 — LIVE TARGET ATTESTATION NOT EXECUTED.** This is a controlled *independent installed source HEAD* check for the **new** eight-file focused E2E candidate only. It does not approve any deployment, E2E mutation, staff account, payroll, archive or production data.

## 0. Safety boundaries

- Keep prior RC8.2, PR #2's pinned 7-file snapshot, SAV10 attestation, and independent E0 session `cde9abf4-5257-4b82-b850-0d7b323c867b` unchanged. Do **not** replace the old E0 file.
- Do not overwrite the original target's installed seven-file project merely to make the new attestation pass. Create a new isolated **synthetic** Apps Script target project for SAV11 or document an authorized distinct project-version migration and E0 lineage first.
- The candidate source reference is Git commit `b865d6c830e215cc062e553b33db5bb866db95dc`; manifest `e2e-attestation/SAV11_SOURCE_REFERENCE_V1.json`. Additional report/auditor-only commits do not alter this reference.
- Do not install `SAV11_IndependentSourceAttestor.gs` in the target. Do not run SAV11 against RC8.2/production.
- All target flags `E2E_WEB_ENABLED`, `E2E_WRITE_ENABLED`, `E2E_UPLOAD_ENABLED`, `E2E_DEPLOYMENT_REVIEWED`, `E2E_RPC_SECURITY_AUDIT_APPROVED` must remain **absent or false**. No Web App deployment or trigger.
- Use synthetic test accounts, not real employee identities/PINs. The independent auditor needs no production OAuth token, GitHub PAT, or PIN.

## 1. Local source QA — no Google API

From a verified Git checkout of PR #3 with `core.autocrlf=false`, run:

```bash
node e2e-review/qa/run_rpc_static_qa_v11.cjs
```

Expected only after a true successful run: `STATIC_QA_PASS_NO_RUNTIME_ATTESTATION`, all checks PASS, zero failures and eight hash matches. Preserve the JSON output. Hash differences must fail closed, not be "fixed" by replacing expected hashes without a reviewed new source commit.

If using Windows, ensure Git checkout preserves exact repository bytes (e.g. set `git config core.autocrlf false` before checkout). The Node verifier intentionally validates both raw Git blob and canonical source SHA-256.

## 2. Install a separate new synthetic target

Install exactly the **eight** files below in the new isolated Apps Script target project. File types and names must match the SAV11 manifest, with **no** historical `Index.html`, root production modules, auditor code or extra file:

```text
Kode.gs
IndexE2E11.html
E2E11_RestrictedRpcFacade.gs
SheetSchema.gs
IndexQueueGuardRC7.gs
E2E10_RuntimeGuard.gs
E2E10_IsolatedReadOnlyPreflight.gs
appsscript.json
```

Record exact target Script ID and exact title. Suggested title: `PKM PHA07B2 B2 E2E11 SYNTHETIC TARGET`. Keep credentials, external fetch, Web/Write/Upload flags, scheduled triggers and production file IDs disabled/absent. **Installation changes source; the original 2026-10-15 E0 is not a baseline for this new project.**

## 3. Install a DIFFERENT standalone SAV11 auditor

Create a second Apps Script project, e.g. `PKM PHA07B2 B2 SAV11 INDEPENDENT AUDITOR`, with exactly:

- `e2e-attestation/independent-auditor-sav11/SAV11_IndependentSourceAttestor.gs`
- `e2e-attestation/independent-auditor-sav11/appsscript.json`

Do **not** deploy auditor as Web App. Its manifest uses `script.projects.readonly` (read installed target source), `script.external_request` (Google Apps Script API) and `drive` (save evidence). The Drive scope is broad: restrict the auditor account and use only the dedicated private evidence folder. Never give auditor code or broad permissions to the target runtime.

Set these **only in the auditor's** Script Properties:

| Key | Required value |
| --- | --- |
| `SAV11_AUDITOR_SCRIPT_ID` | Exact new auditor project's own Script ID |
| `SAV11_TARGET_SCRIPT_ID` | Exact new synthetic target Script ID; must differ from auditor and all frozen projects |
| `SAV11_TARGET_PROJECT_TITLE` | Exact title of new target, matching `PHA07B2.*B2.*E2E` |
| `SAV11_ALLOW_TARGET_WRITES` | `false` or leave absent |

Read the auditor source first and ensure target is an explicit synthetic Apps Script project. The source has a fixed stage workbook and evidence folder ID but never receives production data. Google Apps Script API authorization and script.projects.readonly are needed; an API 403 should **block**, not trigger expanded sharing.

## 4. Independent HEAD inspection (read-only target)

In the separate auditor editor, run:

```javascript
sav11IndependentSourceAttestationV12()
```

The function checks the pinned target Script ID/title using the Google Apps Script API, exact file count=8, exact name/type allowlist, normalized source SHA-256 for all eight files, and absence of any extra source. v1.2 re-reads HEAD before saving the evidence to reject concurrent source changes; the file name contains a UUID suffix. Failed save/readback attempts trigger targeted cleanup of **only the just-created SAV11 evidence file**, never the frozen E0. A matching result has `SAV11_SOURCE_MATCH_PASS`; a mismatch or unavailable API returns `SAV11_SOURCE_ATTESTATION_BLOCKED`. A pass saves an evidence JSON **only in the private evidence Drive folder**, then computes its SHA-256 readback. It does **not** read or write staging workbook rows.

Do not accept a printed PASS without privately saved evidence and independent Drive file/ACL readback; retain source commit, project Script IDs/title, file digest table, evidence file ID/hash and exact timestamp (without secrets). Never paste PIN, session token, OAuth token, raw source or keyed HMAC material into an audit log or chat.

## 5. Current verified admission observations (16 October 2026)

- GitHub source reference matches **8/8 canonical SHA-256 and 8/8 pinned Git blob IDs** at \`b865d6c830e215cc062e553b33db5bb866db95dc\`. This is GitHub-side validation only, NOT an installed Apps Script result.
- Mock regression tests for V12: **15/15 as expected** (positive, tampering, ACL rejection, second HEAD read, evidence rollback).
- Independent Drive folder currently contains **only two old E0V10 files**, both owner-only per returned permissions and their byte SHA-256 digests match the frozen acceptance record. No SAV11 evidence exists there as of this check.
- Matching SAV11 target and auditor Apps Script projects **were not identified** in the connected Drive results; the Drive connector does not expose Apps Script \`projects.getContent\` execution. Therefore this step cannot claim \`SAV11_SOURCE_MATCH_PASS\` yet.
- The exact machine-readable BLOCKED verdict is recorded in \`e2e-attestation/SAV11_V12_EXECUTION_GATE_AND_EVIDENCE_READBACK_2026-10-16.json\`. No stage Drive file, Sheet row or Web App was modified.

## 6. Acceptance and next phase

Only after (a) local Node QA PASS, (b) separate auditor `SAV11_SOURCE_MATCH_PASS`, (c) saved private evidence and external readback, and (d) identity/deployment configuration review, can we request authorization for **new synthetic baseline E0 v1.1 and 26 negative tests**. New E0 requires new session ID and E0/E1 lineage, not a rewrite of the prior E0. No live writes until independent pre-write admission; no production approval is implied.

**As of the v1.2 update:** local Node execution NOT DONE; auditor installation NOT DONE; installed-source re-attestation NOT DONE; previous E0 preserved; Web App staging NO-GO; production NO-GO.
