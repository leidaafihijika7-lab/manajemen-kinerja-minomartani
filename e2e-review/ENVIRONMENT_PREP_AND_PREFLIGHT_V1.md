# PHA-07B B2 — E2E isolated environment & read-only preflight v1.0
Date: 2026-10-12. State: PARTIALLY PROVISIONED; SOURCE NOT DEPLOYABLE; PRODUCTION NO-GO.

## Provisioned and verified via Google Drive
- New 12-tab disposable workbook: https://docs.google.com/spreadsheets/d/1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic/edit
- New sandbox parent: https://drive.google.com/drive/folders/1VWyLFAAC-E3C_XVc95UJnxDoPU2aCrpt
- New synthetic upload folder, currently empty: https://drive.google.com/drive/folders/1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0
- New independent evidence folder: https://drive.google.com/drive/folders/1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG
- Separate from frozen RC8.2 workbook, RC8.2 untouched baseline, and S0/S1 Drive evidence. Owner-only permission metadata was reported for each of the four newly created resources at creation time.
- Workbook copy initially came from untouched RC8.2 baseline fixture. New sentinel values were written only in the new copy:
  - `MULAI_DI_SINI!A5=STAGE_PHA07B2_B2_E2E_ISOLATED_V1`
  - `MULAI_DI_SINI!A8=E2E_PRIVATE_WEBAPP_WRITES_OPTIN_ONLY`
  - `MULAI_DI_SINI!B16=<new E2E workbook ID>`
  - `MULAI_DI_SINI!B17=<new upload folder ID>`
  - `MULAI_DI_SINI!B18=<new evidence folder ID>`
  - `MULAI_DI_SINI!B19=NOT_DEPLOYED`
  - `MULAI_DI_SINI!B20=false`

## New source
`E2E10_IsolatedReadOnlyPreflight.gs` checks stage properties, sheet and folder IDs, exact workbook sentinels, fixture header presence, employee absence, trigger inventory and upload-folder emptiness. It deliberately reports BLOCKED, because stage candidate Kode.gs still contains the old RC8.2 hard-pin and a disabled doGet, the new Apps Script project/deployment IDs do not yet exist, and no live runtime preflight was executed.

### Properties in NEW standalone Apps Script project only
```
E2E_STAGING_MODE=true
SPREADSHEET_ID=1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic
E2E_UPLOAD_FOLDER_ID=1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0
E2E_WRITE_ENABLED=false
INDEX_LAPORAN_2B1_WRITE_ENABLED=false
INDEX_LAPORAN_RC7_REPLAY_ENABLED=false
```
Never copy properties or triggers from production or the previous RC8.2 script. Do not populate PIN_PEPPER/API_KEY_GEMINI/FOLDER_ID_BUKTI_KINERJA. DO NOT deploy as a Web App yet.

## Source audit
Pinned frozen source SHA: `a81ecc00512f025967ceb5febadc6ddb395c8505`. Its `Kode.gs` contains:
- One `SpreadsheetApp.openById` call in `getSS_`, currently pinned to the frozen RC8.2 workbook.
- Six `DriveApp.getFolderById` call sites; nine `DriveApp.getFileById` call sites, including rollback cleanup paths.
- Three `file.setSharing` paths: `ANYONE_WITH_LINK`, `DOMAIN_WITH_LINK`, `PRIVATE`. Each must be reviewed and, for E2E, constrained to private resources before a real upload is ever authorized.
- Three `createFile` call sites and one `createFolder` helper.
- Two `UrlFetchApp.fetch` call sites. True external service usage must be excluded from the stage without false E2E PASS.
- `doGet` throws `RC8_STAGING_WEB_DISABLED_NO_DEPLOYMENT`; must not be replaced in-place on the frozen RC8.2 script.

## Hard stop / next engineering phase
1. NEW standalone Apps Script project must be created. This connector does not provision Apps Script projects or deployments.
2. Create a new candidate-only `Kode.gs` from frozen SHA; replace the old RC8.2 hard-pin with the new E2E ID and sentinels, review every Drive operation and file-sharing policy; keep doGet disabled until attested.
3. Separate E2E runtime from `RC82_AuthenticatedBusinessIntegration.gs` old fixture. Do not execute `rc82RunAuthenticatedMatrixV1` in the new environment.
4. Remove the deliberate preflight blockers **only after** the candidate patch, script/deployment binding, and independent permission attestations exist; review source and run live read-only preflight. A successful local calculation does not equal Apps Script execution.
5. E0 baseline and synthetic user provisioning are not done, and no upload/HTTP E2E test has begun.

**No production project, spreadsheet, original evidence or deployment modified.**
