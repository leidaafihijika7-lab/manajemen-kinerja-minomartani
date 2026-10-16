# PHA-07B B2 — SAV11 Read-Only Drive Export Probe (Cloud Quota Contingency)

**2026-10-16 WIB | NOT EXECUTED | NOT A SOURCE ATTESTATION.** Cloud Console reported maximum new-project quota and declined creating a new Standard Google Cloud project. User's SAV11 v1.2 real attestation remains `SAV11_API_HTTP_403:PROJECT_META` due to `script.googleapis.com` disabled in **auditor Default Cloud Project**. Do not remove existing Cloud projects or change production.

Google officially supports standalone Apps Script project source export as `application/vnd.google-apps.script+json` from Drive API `files.export`. Source documentation: https://developers.google.com/apps-script/guides/import-export ; https://developers.google.com/workspace/drive/api/guides/ref-export-formats ; https://developers.google.com/apps-script/guides/services/advanced

The following is a **read-only test** to append temporarily to the existing **Project B auditor's existing one .gs file** (do not add extra files; Project A 8 files remain untouched). The probe does not save or log raw source. It validates auditor Script Properties with existing `sav11CheckConfig_()`; Drive `GET` fetches the target's source in-memory; only file names and types and HTTP errors are logged:

```javascript
function sav11DriveExportProbeV12() {
  var c = sav11CheckConfig_();
  var url = 'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(c.targetId) + '/export?mimeType=' +
    encodeURIComponent('application/vnd.google-apps.script+json');
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    followRedirects: false,
    muteHttpExceptions: true
  });
  var result = {
    method: 'DRIVE_V3_FILES_EXPORT_READONLY',
    httpStatus: response.getResponseCode(),
    fileCount: 0,
    fileNamesAndTypes: [],
    errorStatus: '',
    errorMessage: '',
    targetWrites: 0,
    evidenceWrites: 0
  };
  if (result.httpStatus === 200) {
    var data = JSON.parse(response.getContentText('UTF-8'));
    if (!data || !Array.isArray(data.files)) {
      result.errorMessage = 'EXPORT_PAYLOAD_NOT_FILES_JSON';
    } else {
      result.fileCount = data.files.length;
      result.fileNamesAndTypes = data.files.map(function (f) {
        return { name: String(f.name || ''), type: String(f.type || '') };
      });
    }
  } else {
    var error = {};
    try { error = JSON.parse(response.getContentText('UTF-8')).error || {}; }
    catch (ignored) {}
    result.errorStatus = String(error.status || 'UNKNOWN');
    result.errorMessage = String(error.message || 'DRIVE_API_FAILED').slice(0, 350);
  }
  console.log('SAV11_DRIVE_EXPORT_PROBE:\n' + JSON.stringify(result, null, 2));
  return result;
}
```

If the method returns HTTP 200 with eight expected file names/types **including appsscript manifest**, the alternate read-only transport may be developed as a separately versioned SAV11 Drive-export auditor; it MUST still check pinned hashes for all eight files, exact name/type/target ID/title, two stable HEAD reads, and independent ACL/hash evidence readback. Do not treat the probe as attestation. Existing verified GitHub source commit remains `b865d6c830e215cc062e553b33db5bb866db95dc`.

If the probe reports 403 `insufficientPermissions`, Google Apps Script's import/export guide specifically calls for `https://www.googleapis.com/auth/drive.scripts` in addition to existing Drive scope. Review authorization risk before adding it **only to auditor** (never production or target). If the **Drive API** itself is disabled on the auditor default Cloud Project, enable advanced Drive API v3 via the auditor's **Services +** and save; Google states that adding an advanced service automatically enables its backing API on a new Default Cloud Project. If still blocked, stop and inspect logs. Do not create a deployment or permit target writes.

Other options: request increased Cloud project quota, or reuse an existing safe Standard Cloud project only after strict review of IAM/OAuth/other app dependencies. Never repurpose production Cloud project without authorization.

**Hard status:** all live SAV11 source attestation and private evidence verification still NOT PASSED; RC8.2/S0/S1/SAV10/E0 frozen, staging Web App NO-GO and production NO-GO.


## Observed live probe (2026-10-16 19:43 WIB)

The separate SAV11 auditor's function `sav11DriveExportProbeV12()` **actually executed** and returned:

- `method=DRIVE_V3_FILES_EXPORT_READONLY`, `httpStatus=403`, `errorStatus=PERMISSION_DENIED`.
- Exact error category: `Google Drive API has not been used in project 921073186167 before or it is disabled`.
- `fileCount=0`, `targetWrites=0`, `evidenceWrites=0`; no source hash comparison or private attestation file was produced.
- This is a **Drive API activation block on the auditor's Default Cloud Project**, *not* a source/hash mismatch, and unrelated to Cloud Standard Project creation quota.

**Verified vendor procedure:** in the auditor Apps Script editor only (Project B), click **Services (+) → Drive API → v3 → Add** and save. Google's Advanced Services documentation states adding an advanced service in a *Default* Cloud Project automatically enables the backing API; no Standard project creation needed. Also, Google's Apps Script source import/export guide requires OAuth scope `https://www.googleapis.com/auth/drive.scripts` alongside Drive access for import/export. After reviewing the increased permission surface, add that scope to **Project B's** explicit `appsscript.json` `oauthScopes` and re-authorize the auditor, then rerun `sav11DriveExportProbeV12()`. The selected advanced service will add `dependencies.enabledAdvancedServices` to **Project B's manifest only**. This locally installed auditor manifest now differs from the GitHub auditor baseline and must be recorded/reviewed before accepting any new formal SAV11 evidence; the eight-file target stays unchanged.

Official references: https://developers.google.com/apps-script/guides/services/advanced ; https://developers.google.com/apps-script/guides/import-export ; https://developers.google.com/workspace/drive/api/guides/ref-export-formats .

**Do not activate Drive on target A**, run `Drive.Files.update`, enable Web/Write/Upload flags, create triggers or publish a Web App. A later HTTP 200 with eight expected names is *probe-only*; full independent attestation will require source/type normalization, pinned 8/8 SHA-256, repeat stable reads, private evidence SHA/ACL readback and new evidence lineage. If 403 persists after service enablement, inspect the new error instead of changing production security settings.
