# PHA-07B B2 RC8.2 — Revision Index Fix Candidate

**Staging only — runtime preflight and matrix NOT YET RUN. Production: NO-GO.**

## Evidence and correction

The second Apps Script diagnostic run at 19:15:50 WIB, 11 October 2026, completed 15 of 16 business checks and failed the 16th: `AUTHENTICATED_OWNER_REVISION`. The **actual authenticated revision succeeded**: success response, `Menunggu Review` source status and revised NONCE all matched. However the canonical index still had `Ditolak`, zero points, and the previous NONCE; one repair queue row was created.

Code review isolated this to `rc7WriteIndexLocked_` in `IndexQueueGuardRC7.gs`: strict global source/index (reportId, ownerId, nonce) provenance rejects every changed NONCE before permitting an index refresh. The real employee revision endpoint legitimately rotates the report NONCE.

The patch adds `rc7AllowOwnerRevisionNonceChange_` and calls it **only** when the mismatch belongs to the exact report row currently being synchronized under context `REVISI_PEGAWAI`. It checks: fixed report ID/owner ID/row, nonempty changed NONCE, prior index status `Ditolak`, current source status `Menunggu Review`, revision counter >=1, valid revision timestamp, and revision actor matching the owner ID. All unrelated index rows still require strict (report ID, owner ID, nonce) equality. The source and other business functions are not weakened or bypassed.

Local code-path source-copy mock tests: **19/19 PASS**, including negative cases for owner/ID/row/context mutation, stale nonce in unrelated index rows, invalid revision metadata, and successful idempotent index refresh. This is **not** Apps Script runtime acceptance.

The diagnostic workbook (ID `1nIH0dCUs5SduXGNsEI-flKX1nGcfAA3Gufr2Q7OpTTM`) was externally verified after its failed run: **0 differences from its snapshot in 425 inspected cell positions / 12 tabs**. It is retained intact and MUST NOT be reused for a matrix.

## New isolated fix-candidate environment

- Workbook: https://docs.google.com/spreadsheets/d/1_2GImSC30vke1KYyJ8Azqzc0GjL0sMP67-BeNwW7wzQ/edit
- Fresh independent snapshot: https://docs.google.com/spreadsheets/d/1AyynKuayzzWcm4g5C17zEQB6s_XIjMvgh-TNHdCor2s/edit
- Source branch: https://github.com/leidaafihijika7-lab/manajemen-kinerja-minomartani/tree/feat/pha07b2-rc82-revision-index-fix
- Runtime harness version: `PHA07B2-RC82-REVISION-INDEX-FIX-2026.10.11.3`
- 12 tabs verified and target/snapshot are identical on **425 inspected positions** (values, display, formatting, validation, hyperlink/note).
- Source code `getSS_()` is hard-pinned to this new ID. The workbook marker at `MULAI_DI_SINI!A5` is `STAGE_RC82_REVISION_INDEX_FIX` and the write-opt-in marker at `A8` is `RC82_REVISION_INDEX_FIX_WRITES_OPTIN_ONLY`.
- The old original RC8.2 and RC8.2 diagnostic workbooks, and all production resources, are not touched.

## Installation in a fresh standalone Apps Script project

Create `Portal Kinerja - PHA07B2 RC8.2 Revision Index Fix`. Copy **from the fix branch only**:

1. `Kode.gs` — full source, nondeployable in staging.
2. `SheetSchema.gs`.
3. **`IndexQueueGuardRC7.gs` — MUST use the patched version containing `rc7AllowOwnerRevisionNonceChange_`.**
4. `RC82_AuthenticatedBusinessIntegration.gs` — version `PHA07B2-RC82-REVISION-INDEX-FIX-2026.10.11.3`.
5. `appsscript.json` from the same branch.

No production credentials, properties, triggers, deployments, sheets or real users. In Project Settings / Script Properties:

| Key | Value |
|---|---|
| `RC82_STAGING_MODE` | `true` |
| `SPREADSHEET_ID` | `1_2GImSC30vke1KYyJ8Azqzc0GjL0sMP67-BeNwW7wzQ` |
| `RC82_WRITE_DRILL_ENABLED` | `false` |
| `INDEX_LAPORAN_2B1_WRITE_ENABLED` | `false` |
| `INDEX_LAPORAN_RC7_REPLAY_ENABLED` | `false` |

`RC8_STAGING_MODE` and `RC81_STAGING_MODE` absent/false. Do not set `PIN_PEPPER`, `FOLDER_ID_BUKTI_KINERJA`, `FOLDER_ID_BUKTI`, `API_KEY_GEMINI`, or `RC82_RECOVERY_PENDING`. Do not copy existing Script Properties.

**First run only** `rc82ReadOnlyPreflightV1`. Require `RC82_PREFLIGHT_PASS` with source 2, index 2, audit 2, queue 0, employee 0, triggers 0, no issues, zero writes. Send the log.

**Only after verified preflight and explicit approval of the next runtime step**, opt in once by setting `RC82_WRITE_DRILL_ENABLED=true` and execute `rc82RunAuthenticatedMatrixV1` a single time. The harness turns off the opt-in and dual write afterward. If it fails or emits a pending recovery signal, do NOT repeat or call `rc82RecoverPendingV1` blindly; inspect the evidence and backup first. Afterward compare against the fresh independent snapshot.

## Mandatory remaining security gate

The real code still requires empirical `CLIENT_ROLE_AND_NAME_SPOOF_REJECTED`: a signed regular employee token must not be able to submit a forged `nama`/`jabatan=Lurah` client payload. The prior failed matrix never reached this gate (`spoofEvidence:null`). **Do not claim the full matrix accepted, even if the revision-index fix works, unless this security check also passes.** A security finding remains staging-only and means NO-GO.

No deployment, merge to main, production patch, trigger creation, or queue replay is authorized.
