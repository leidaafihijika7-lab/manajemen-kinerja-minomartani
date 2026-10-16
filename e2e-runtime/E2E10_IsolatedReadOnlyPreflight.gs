/**
 * PHA-07B B2 — Candidate Source Preflight v1.1 (READ ONLY).
 * Run only in a newly created standalone E2E script. This is NOT a Web App
 * acceptance and does NOT authorize write flags, public links or deployment.
 */
var E2E10_CONFIG_ = Object.freeze({
  VERSION: 'PHA07B2-B2-SOURCE-HARDENING-PREFLIGHT-2026.10.12.2',
  DB: '1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  FOLDER: '1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE: '1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  FROZEN_DB: '1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  MARKER: 'STAGE_PHA07B2_B2_E2E_ISOLATED_V1',
  AUTH: 'E2E_PRIVATE_WEBAPP_WRITES_OPTIN_ONLY'
});

function e2e10GetScriptIdReadOnlyV1_() {
  var id = ScriptApp.getScriptId();
  console.log('PHA07B2_E2E_SCRIPT_ID: ' + id);
  return {scriptId: id, writes: 0, productionReady: false};
}

function e2e10ReadOnlyPreflightV1_() {
  var c = E2E10_CONFIG_, issues = [], p = PropertiesService.getScriptProperties();
  var inventory = {sheetCount: null, sourceRows: null, indexRows: null,
    employeeRows: null, queueRows: null, triggerCount: null,
    uploadFolderEmpty: null, privateFolderAccess: null, sourceGuardsPresent: false};
  function eq(key, expected) {
    if (String(p.getProperty(key) || '') !== expected) issues.push('PROPERTY_MISMATCH:' + key);
  }
  function off(key) {
    if (p.getProperty(key) === 'true') issues.push('FORBIDDEN_ACTIVE_FLAG:' + key);
  }

  try {
    eq('E2E_STAGING_MODE', 'true');
    eq('E2E_SYNTHETIC_ONLY', 'true');
    eq('SPREADSHEET_ID', c.DB);
    eq('E2E_UPLOAD_FOLDER_ID', c.FOLDER);
    ['E2E_WRITE_ENABLED','E2E_UPLOAD_ENABLED','E2E_WEB_ENABLED','E2E_DEPLOYMENT_REVIEWED',
      'E2E_EXTERNAL_FETCH_ENABLED','E2E_E0_ATTESTED','INDEX_LAPORAN_2B1_WRITE_ENABLED',
      'INDEX_LAPORAN_RC7_REPLAY_ENABLED','RC82_STAGING_MODE','RC81_STAGING_MODE',
      'RC8_STAGING_MODE'].forEach(off);
    if (p.getProperty('E2E_E0_EVIDENCE_FILE_ID')) issues.push('PREMATURE_E0_EVIDENCE_BINDING');
    ['FOLDER_ID_BUKTI_KINERJA','FOLDER_ID_BUKTI','FOLDER_ID_DISPOSISI','API_KEY_GEMINI',
      'RC82_RECOVERY_PENDING'].forEach(function(k) { if (p.getProperty(k)) issues.push('FORBIDDEN_PROPERTY:' + k); });
    if (p.getProperty('PIN_PEPPER') && p.getProperty('E2E_SYNTHETIC_PEPPER_APPROVED') !== 'true') {
      issues.push('UNAPPROVED_PIN_PEPPER');
    }
    if (String(p.getProperty('PORTAL_FILE_SHARING_MODE') || 'PRIVATE').toUpperCase() !== 'PRIVATE') {
      issues.push('NONPRIVATE_SHARING_MODE');
    }
    var currentId = String(ScriptApp.getScriptId() || '').trim();
    var pinnedId = String(p.getProperty('E2E_EXPECTED_SCRIPT_ID') || '').trim();
    if (!pinnedId || pinnedId !== currentId) issues.push('E2E_SCRIPT_ID_BINDING_NOT_ATTESTED');
    inventory.triggerCount = ScriptApp.getProjectTriggers().length;
    if (inventory.triggerCount !== 0) issues.push('TRIGGERS_PRESENT');
  } catch (eProps) { issues.push('PROPERTIES_OR_TRIGGER_READ_FAILED'); }

  try {
    inventory.sourceGuardsPresent =
      typeof E2E10_STAGE_ === 'object' &&
      E2E10_STAGE_.DB === c.DB &&
      typeof e2e10AssertStage_ === 'function' &&
      typeof e2e10RequireWrites_ === 'function' &&
      typeof e2e10ForcePrivateSharing_ === 'function' &&
      typeof e2e10AssertUploadedReference_ === 'function' &&
      typeof e2e10BlockExternalFetch_ === 'function' &&
      typeof doGet === 'function' &&
      typeof getSS_ === 'function';
    if (!inventory.sourceGuardsPresent) issues.push('E2E_SOURCE_GUARDS_NOT_INSTALLED');
    else {
      try { e2e10AssertStage_(); } catch (eRuntime) { issues.push('STAGE_GUARD_REJECTED:' + String(eRuntime.message || eRuntime)); }
      if (String(getSS_).indexOf('e2e10VerifyWorkbookSentinels_') < 0) issues.push('GETSS_NOT_GUARDED');
      if (String(doGet).indexOf('e2e10RequireWebGate_') < 0) issues.push('DOGET_NOT_GUARDED');
    }
  } catch (eSource) { issues.push('SOURCE_GUARD_CHECK_FAILED'); }

  try {
    var ss = SpreadsheetApp.openById(c.DB);
    if (ss.getId() === c.FROZEN_DB) issues.push('FROZEN_WORKBOOK_REUSED');
    var control = ss.getSheetByName('MULAI_DI_SINI');
    if (!control) issues.push('CONTROL_SHEET_MISSING');
    else {
      var rows = control.getRange('A5:B20').getDisplayValues();
      if (rows[0][0] !== c.MARKER || rows[3][0] !== c.AUTH ||
          rows[11][1] !== c.DB || rows[12][1] !== c.FOLDER ||
          rows[13][1] !== c.EVIDENCE) issues.push('SENTINEL_MISMATCH');
      if (rows[14][1] !== 'NOT_DEPLOYED') issues.push('DEPLOYMENT_SENTINEL_NOT_CLOSED');
      if (rows[15][1] !== 'false') issues.push('WRITE_SENTINEL_NOT_CLOSED');
    }
    inventory.sheetCount = ss.getSheets().length;
    if (inventory.sheetCount !== 12) issues.push('SHEET_COUNT_NOT_12');
    var required = ['Rekap_Kinerja','Index_Laporan','Audit_Log','Data_Pegawai',
      'Index_Laporan_Sync_Queue'];
    required.forEach(function(k) { if (!ss.getSheetByName(k)) issues.push('REQUIRED_SHEET_MISSING:' + k); });
    if (ss.getSheetByName('Data_Pegawai')) {
      inventory.employeeRows = Math.max(0, ss.getSheetByName('Data_Pegawai').getLastRow() - 1);
      if (inventory.employeeRows !== 0) issues.push('EMPLOYEE_FIXTURE_NOT_EMPTY_BEFORE_E0');
    }
    ['Rekap_Kinerja','Index_Laporan','Index_Laporan_Sync_Queue'].forEach(function(k,i){
      if (!ss.getSheetByName(k)) return;
      var n = Math.max(0, ss.getSheetByName(k).getLastRow()-1);
      if (i === 0) inventory.sourceRows = n;
      if (i === 1) inventory.indexRows = n;
      if (i === 2) inventory.queueRows = n;
    });
    if (inventory.queueRows !== 0) issues.push('QUEUE_NOT_EMPTY');
  } catch (eSheet) { issues.push('SPREADSHEET_READ_FAILED'); }

  try {
    var root = DriveApp.getFolderById(c.FOLDER);
    var evidence = DriveApp.getFolderById(c.EVIDENCE);
    if (root.getId() === evidence.getId()) issues.push('UPLOAD_EVIDENCE_RESOURCE_COLLISION');
    inventory.uploadFolderEmpty = !root.getFiles().hasNext() && !root.getFolders().hasNext();
    if (!inventory.uploadFolderEmpty) issues.push('UPLOAD_ROOT_NOT_EMPTY');
    inventory.privateFolderAccess = root.getSharingAccess() === DriveApp.Access.PRIVATE &&
      evidence.getSharingAccess() === DriveApp.Access.PRIVATE;
    if (!inventory.privateFolderAccess) issues.push('FOLDER_PUBLIC_SHARING_DETECTED');
  } catch (eDrive) { issues.push('DRIVE_READ_FAILED'); }

  var out = {
    version: c.VERSION,
    status: issues.length ? 'E2E10_SOURCE_PREFLIGHT_BLOCKED' : 'E2E10_SOURCE_PREFLIGHT_PASS_DEPLOYMENT_DISABLED',
    targetSpreadsheetId: c.DB,
    inventory: inventory,
    issues: issues,
    independentAclReadback: 'REQUIRED_BEFORE_WEBAPP_DEPLOYMENT',
    independentSourceShaAttestation: 'REQUIRED_BEFORE_WEBAPP_DEPLOYMENT',
    externalEvidenceE0: 'NOT_CAPTURED',
    httpPwaUploadE2E: 'NOT_TESTED',
    spreadsheetWrites: 0,
    productionReady: false
  };
  console.log('PHA07B2_B2_E2E10_SOURCE_PREFLIGHT:\n' + JSON.stringify(out, null, 2));
  return out;
}
