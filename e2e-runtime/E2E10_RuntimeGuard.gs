/**
 * PHA-07B B2 — E2E Candidate Runtime Guard v1.0
 * Strictly for a NEW standalone staging Apps Script project.
 * Never install in the frozen RC8.2 project or production.
 * This module intentionally cannot make a non-reviewed staging deployment usable.
 */
var E2E10_STAGE_ = Object.freeze({
  VERSION: 'PHA07B2-B2-E2E-SOURCE-HARDENING-2026.10.12.1',
  DB: '1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  UPLOAD_ROOT: '1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE_ROOT: '1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  FROZEN_DB: '1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  EXPECTED_MARKER: 'STAGE_PHA07B2_B2_E2E_ISOLATED_V1',
  EXPECTED_AUTH: 'E2E_PRIVATE_WEBAPP_WRITES_OPTIN_ONLY'
});

function e2e10AssertStage_() {
  var c = E2E10_STAGE_, p = PropertiesService.getScriptProperties();
  function exact(k, expected) {
    if (String(p.getProperty(k) || '').trim() !== expected) throw new Error('E2E_CONFIG_MISMATCH:' + k);
  }
  exact('E2E_STAGING_MODE', 'true');
  exact('E2E_SYNTHETIC_ONLY', 'true');
  exact('SPREADSHEET_ID', c.DB);
  exact('E2E_UPLOAD_FOLDER_ID', c.UPLOAD_ROOT);
  if (c.DB === c.FROZEN_DB || c.DB === c.EVIDENCE_ROOT || c.UPLOAD_ROOT === c.EVIDENCE_ROOT) {
    throw new Error('E2E_RESOURCE_COLLISION');
  }
  ['RC82_STAGING_MODE', 'RC81_STAGING_MODE', 'RC8_STAGING_MODE',
    'INDEX_LAPORAN_RC7_REPLAY_ENABLED', 'E2E_EXTERNAL_FETCH_ENABLED'].forEach(function(k) {
      if (p.getProperty(k) === 'true') throw new Error('E2E_FORBIDDEN_FLAG:' + k);
    });
  ['FOLDER_ID_BUKTI_KINERJA', 'FOLDER_ID_BUKTI', 'FOLDER_ID_DISPOSISI', 'API_KEY_GEMINI',
    'RC82_RECOVERY_PENDING'].forEach(function(k) {
      if (p.getProperty(k)) throw new Error('E2E_FORBIDDEN_PROPERTY:' + k);
    });
  var sharing = String(p.getProperty('PORTAL_FILE_SHARING_MODE') || 'PRIVATE').trim().toUpperCase();
  if (sharing !== 'PRIVATE') throw new Error('E2E_SHARING_MODE_NOT_PRIVATE');
  if (p.getProperty('PIN_PEPPER') && p.getProperty('E2E_SYNTHETIC_PEPPER_APPROVED') !== 'true') {
    throw new Error('E2E_UNAPPROVED_PIN_PEPPER');
  }
  return p;
}

function e2e10VerifyWorkbookSentinels_(ss) {
  var c = E2E10_STAGE_;
  if (!ss || ss.getId() !== c.DB) throw new Error('E2E_WRONG_SPREADSHEET');
  var sh = ss.getSheetByName('MULAI_DI_SINI');
  if (!sh) throw new Error('E2E_SENTINEL_SHEET_MISSING');
  var rows = sh.getRange('A5:B20').getDisplayValues();
  if (rows[0][0] !== c.EXPECTED_MARKER || rows[3][0] !== c.EXPECTED_AUTH ||
      rows[11][1] !== c.DB || rows[12][1] !== c.UPLOAD_ROOT ||
      rows[13][1] !== c.EVIDENCE_ROOT) throw new Error('E2E_SENTINEL_MISMATCH');
  return { deployment: rows[14][1], writes: rows[15][1] };
}

function e2e10AssertProjectBinding_() {
  var p = e2e10AssertStage_();
  var expected = String(p.getProperty('E2E_EXPECTED_SCRIPT_ID') || '').trim();
  if (!expected || expected.length < 20) throw new Error('E2E_PROJECT_BINDING_MISSING');
  var current = String(ScriptApp.getScriptId() || '').trim();
  if (current !== expected) throw new Error('E2E_PROJECT_BINDING_MISMATCH');
  return true;
}

function e2e10RequireTesterPrincipal_() {
  var p = e2e10AssertStage_();
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  var raw = String(p.getProperty('E2E_ALLOWED_TESTER_EMAILS') || '').trim().toLowerCase();
  var allowed = raw.split(/[;,\s]+/).filter(function(x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); });
  if (!email || !allowed.length || allowed.indexOf(email) < 0) throw new Error('E2E_TESTER_PRINCIPAL_DENIED');
  return email;
}

function e2e10RequireWebGate_() {
  var p = e2e10AssertStage_();
  e2e10AssertProjectBinding_();
  e2e10RequireTesterPrincipal_();
  if (p.getProperty('E2E_WEB_ENABLED') !== 'true' ||
      p.getProperty('E2E_DEPLOYMENT_REVIEWED') !== 'true') throw new Error('E2E_WEB_DISABLED');
  var ss = SpreadsheetApp.openById(E2E10_STAGE_.DB);
  var x = e2e10VerifyWorkbookSentinels_(ss);
  if (x.deployment !== 'DEPLOYMENT_REVIEWED') throw new Error('E2E_DEPLOYMENT_SENTINEL_NOT_APPROVED');
  return true;
}

function e2e10RequireWrites_() {
  var p = e2e10AssertStage_();
  e2e10AssertProjectBinding_();
  e2e10RequireTesterPrincipal_();
  if (p.getProperty('E2E_WRITE_ENABLED') !== 'true') throw new Error('E2E_WRITES_DISABLED');
  var ss = SpreadsheetApp.openById(E2E10_STAGE_.DB);
  if (e2e10VerifyWorkbookSentinels_(ss).writes !== 'true') throw new Error('E2E_WRITE_SENTINEL_DISABLED');
  var runId = String(p.getProperty('E2E_RUN_ID') || '').trim();
  if (!/^E2E-[A-Za-z0-9_-]{10,70}$/.test(runId)) throw new Error('E2E_RUN_ID_MISSING');
  return true;
}

function e2e10RequireUploadWrite_() {
  e2e10RequireWrites_();
  if (e2e10AssertStage_().getProperty('E2E_UPLOAD_ENABLED') !== 'true') {
    throw new Error('E2E_UPLOAD_DISABLED');
  }
  return true;
}

function e2e10RequireUploadRootId_() {
  var p = e2e10AssertStage_();
  var id = String(p.getProperty('E2E_UPLOAD_FOLDER_ID') || '').trim();
  if (id !== E2E10_STAGE_.UPLOAD_ROOT) throw new Error('E2E_WRONG_DRIVE_ROOT');
  return id;
}

function e2e10AllowedFolderAncestor_(folder, rootId) {
  if (!folder) return false;
  var queue = [{folder: folder, depth: 0}], visited = {}, count = 0;
  while (queue.length && count < 60) {
    var item = queue.shift(), f = item.folder, id = String(f.getId() || '');
    count++;
    if (id === rootId) return true;
    if (visited[id] || item.depth >= 8) continue;
    visited[id] = true;
    var parents = f.getParents();
    while (parents.hasNext()) queue.push({folder: parents.next(), depth: item.depth + 1});
  }
  return false;
}

function e2e10AssertFolderAllowed_(folder) {
  e2e10AssertStage_();
  if (!e2e10AllowedFolderAncestor_(folder, E2E10_STAGE_.UPLOAD_ROOT)) {
    throw new Error('E2E_FOLDER_OUTSIDE_UPLOAD_ROOT');
  }
  return folder;
}

function e2e10GetAllowedFolderById_(id) {
  e2e10AssertStage_();
  id = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error('E2E_INVALID_FOLDER_ID');
  return e2e10AssertFolderAllowed_(DriveApp.getFolderById(id));
}

function e2e10AssertFileAllowed_(file) {
  e2e10AssertStage_();
  if (!file || !fileBeradaDiBawahFolder_(file, E2E10_STAGE_.UPLOAD_ROOT)) {
    throw new Error('E2E_FILE_OUTSIDE_UPLOAD_ROOT');
  }
  return file;
}

function e2e10GetAllowedFileById_(id) {
  e2e10AssertStage_();
  id = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error('E2E_INVALID_FILE_ID');
  if (id === E2E10_STAGE_.DB) return DriveApp.getFileById(id); // owner metadata read, never write
  return e2e10AssertFileAllowed_(DriveApp.getFileById(id));
}

function e2e10AssertFileCreateTarget_(folder) {
  e2e10RequireUploadWrite_();
  return e2e10AssertFolderAllowed_(folder);
}

function e2e10ForcePrivateSharing_(file) {
  e2e10RequireUploadWrite_();
  e2e10AssertFileAllowed_(file);
  try {
    if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    }
    if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
      throw new Error('E2E_PRIVATE_ACL_VERIFICATION_FAILED');
    }
  } catch (e) {
    throw new Error('E2E_PRIVATE_FILE_REQUIRED');
  }
  return 'PRIVATE';
}

function e2e10BlockExternalFetch_() {
  throw new Error('E2E_EXTERNAL_NETWORK_DISABLED');
}

function e2e10ExtractDriveId_(v) {
  var s = String(v || '').trim(), m;
  m = s.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})(?:\/view)?(?:\?.*)?$/i);
  if (m) return m[1];
  m = s.match(/^https:\/\/drive\.google\.com\/open\?id=([A-Za-z0-9_-]{10,})(?:&.*)?$/i);
  if (m) return m[1];
  return '';
}

function e2e10AssertUploadedReference_(reference, token, idUser, purpose) {
  var value = String(reference || '').trim();
  if (!value) return '';
  var id = /^[A-Za-z0-9_-]{10,}$/.test(value) ? value : e2e10ExtractDriveId_(value);
  if (!id) throw new Error('E2E_EVIDENCE_REFERENCE_NOT_CANONICAL_DRIVE_URL');
  var registered = bacaUploadSementaraTerdaftar_(purpose || 'BUKTI_KINERJA', token, idUser);
  if (registered.indexOf(id) < 0) throw new Error('E2E_EVIDENCE_NOT_OWNED_BY_SESSION');
  e2e10GetAllowedFileById_(id);
  return id;
}

function e2e10CheckPayloadEvidence_(payload, token, idUser, purpose) {
  if (payload == null) return true;
  var checked = 0;
  function check(node, depth, key) {
    if (depth > 14 || ++checked > 500) throw new Error('E2E_EVIDENCE_PAYLOAD_TOO_DEEP');
    if (node === null || node === undefined) return;
    if (typeof node === 'string' && /(?:^|_)(?:fileid|fileurl|buktiurl|lampiranurl|url|urlbukti|filedasarurl)$/i.test(key || '')) {
      if (node.trim()) e2e10AssertUploadedReference_(node, token, idUser, purpose);
      return;
    }
    if (typeof node !== 'object') return;
    if (Object.prototype.toString.call(node) === '[object Date]') return;
    if (Array.isArray(node)) { node.forEach(function(item){check(item, depth+1, key);}); return; }
    Object.keys(node).forEach(function(k) {
      if (/^(fileData|imageData|blobData|base64)$/i.test(k)) return;
      if (/(?:fileid|fileurl|buktiurl|lampiranurl|url|urlbukti|filedasarurl)$/i.test(k)) {
        if (typeof node[k] === 'string' && node[k].trim()) {
          e2e10AssertUploadedReference_(node[k], token, idUser, purpose);
        }
      } else check(node[k], depth+1, k);
    });
  }
  check(payload, 0, '');
  return true;
}
