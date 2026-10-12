/** PHA-07B B2 E2E ISOLATED PRE-FLIGHT v1.0
 * READ-ONLY configuration & sandbox verification; NOT a production patch.
 * IMPORTANT: This file MUST NOT be added to a live project. No deployment or uploads yet.
 * Preflight intentionally remains BLOCKED until a new E2E-only Kode.gs is patched,
 * with the old RC8.2 runtime references fully removed and a new isolated script.
 */
var E2E10_CONFIG_ = Object.freeze({
  VERSION:'PHA07B2-B2-E2E-ISOLATED-PREFLIGHT-2026.10.12.1',
  DB:'1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  FOLDER:'1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE:'1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  OLD_RC82_DB:'1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  OLD_RC82_BASELINE:'1p9O9MHQ7gaZI9EbdMB4-Dj9N3LxS9tCfQ8mb0gg1Pzg',
  MARKER:'STAGE_PHA07B2_B2_E2E_ISOLATED_V1',
  AUTH:'E2E_PRIVATE_WEBAPP_WRITES_OPTIN_ONLY'
});
function e2e10ReadOnlyPreflightV1() {
  var c=E2E10_CONFIG_, issues=[],props=PropertiesService.getScriptProperties();
  function eq(key,expected){if(String(props.getProperty(key)||'')!==expected)issues.push('PROPERTY_MISMATCH:'+key);}
  function b(key){if(props.getProperty(key)==='true')issues.push('UNEXPECTED_ENABLED_FLAG:'+key);}
  var sheetCount=null,triggers=null,access={};
  try {
    eq('E2E_STAGING_MODE','true');
    eq('SPREADSHEET_ID',c.DB);
    eq('E2E_UPLOAD_FOLDER_ID',c.FOLDER);
    b('E2E_WRITE_ENABLED');
    b('INDEX_LAPORAN_2B1_WRITE_ENABLED');
    b('INDEX_LAPORAN_RC7_REPLAY_ENABLED');
    b('RC82_STAGING_MODE');b('RC81_STAGING_MODE');b('RC8_STAGING_MODE');
    ['PIN_PEPPER','FOLDER_ID_BUKTI_KINERJA','FOLDER_ID_BUKTI','API_KEY_GEMINI','RC82_RECOVERY_PENDING'].forEach(function(k){
      if(props.getProperty(k))issues.push('UNSAFE_PRECONFIG:'+k);
    });
    var t=ScriptApp.getProjectTriggers(); triggers=t.length;
    if(triggers!==0)issues.push('UNEXPECTED_INSTALLED_TRIGGERS');
  } catch(e){issues.push('PROPERTY_OR_TRIGGER_CHECK_FAILED');}
  try {
    var db=SpreadsheetApp.openById(c.DB);
    if(db.getId()!==c.DB)issues.push('DATABASE_ID_MISMATCH');
    var sheet=db.getSheetByName('MULAI_DI_SINI');
    if(!sheet)issues.push('SENTINEL_SHEET_MISSING');
    else {
      var r=sheet.getRange('A5:B20').getDisplayValues();
      if(r[0][0]!==c.MARKER)issues.push('WORKBOOK_MARKER_MISMATCH');
      if(r[3][0]!==c.AUTH)issues.push('WORKBOOK_AUTH_MISMATCH');
      if(r[11][1]!==c.DB)issues.push('WORKBOOK_PIN_MISMATCH');
      if(r[12][1]!==c.FOLDER)issues.push('WORKBOOK_UPLOAD_FOLDER_MISMATCH');
      if(r[13][1]!==c.EVIDENCE)issues.push('WORKBOOK_EVIDENCE_FOLDER_MISMATCH');
      if(r[14][1]!=='NOT_DEPLOYED')issues.push('UNEXPECTED_DEPLOYMENT_STATUS');
      if(r[15][1]!=='false')issues.push('WORKBOOK_WRITE_ENABLED');
    }
    sheetCount=db.getSheets().length;
    if(sheetCount!==12)issues.push('SHEET_COUNT_NOT_12');
    if(db.getId()===c.OLD_RC82_DB||db.getId()===c.OLD_RC82_BASELINE)issues.push('FROZEN_RESOURCE_REUSED');
    ['Rekap_Kinerja','Index_Laporan','Audit_Log','Data_Pegawai','Index_Laporan_Sync_Queue'].forEach(function(n){
      if(!db.getSheetByName(n))issues.push('REQUIRED_SHEET_MISSING:'+n);
    });
    if(db.getSheetByName('Data_Pegawai').getLastRow()!==1)issues.push('DATA_PEGAWAI_NOT_EMPTY');
  } catch(e){issues.push('SPREADSHEET_READ_FAILED:'+String(e&&e.message||e).slice(0,100));}
  try {
    var uploads=DriveApp.getFolderById(c.FOLDER);
    var evidence=DriveApp.getFolderById(c.EVIDENCE);
    if(uploads.getId()===evidence.getId())issues.push('EVIDENCE_UPLOAD_ROOT_SAME');
    access.uploadFolderAccessible=true;access.evidenceFolderAccessible=true;
    var files=uploads.getFiles();if(files.hasNext())issues.push('UPLOAD_ROOT_NOT_EMPTY');
    // ACL must be checked independently with Drive files.permissions.list.
    issues.push('ACL_CONNECTOR_ATTESTATION_REQUIRED');
  } catch(e){issues.push('DRIVE_READ_FAILED:'+String(e&&e.message||e).slice(0,100));}
  // Candidate Kode.gs still contains an RC8.2 hard-pin and doGet is blocked.
  // No positive readiness verdict is allowed until a reviewed candidate patch
  // removes old runtime references and E2E source SHA is attested.
  issues.push('E2E_APPLICATION_PATCH_NOT_YET_INSTALLED');
  issues.push('STAGING_SCRIPT_ID_AND_DEPLOYMENT_NOT_ATTESTED');
  var out={version:c.VERSION,status:'E2E10_PREFLIGHT_BLOCKED',targetSpreadsheetId:c.DB,
    sheetCount:sheetCount,triggers:triggers,access:access,
    issues:issues,spreadsheetWrites:0,productionReady:false};
  console.log('PHA07B2_B2_E2E10_PREFLIGHT:\n'+JSON.stringify(out,null,2));
  return out;
}
