// ============================================================
// BACKUP & DISASTER RECOVERY v1.0 — RC1 BATCH B
// APP_VERSION 2026.10.05.01
//
// Batch A foundation:
// - backup engine (native Google Sheets copy)
// - logical fingerprint + verification
// - config snapshot + secret presence policy
// - trigger snapshot + daily trigger maintenance
// - retention GFS
//
// Batch B scope:
// - evidence reference inventory + budgeted Drive metadata (maks. 200/run)
// - recovery candidate as native copy (backup original tetap immutable)
// - deep candidate validation (fingerprint, ID, employee, tunjangan, index, config)
//
// Belum termasuk:
// - activation/cutover SPREADSHEET_ID + rollback
// - OHIC/EAC/frontend/registry integration
// ============================================================

var BACKUP_DISASTER_RECOVERY_V10_VERSION_ = 'BDR-v1.0-RC1-BATCH-B-2026.10.05.01';
var BDR_V10_ROOT_PROP_ = 'FOLDER_ID_BDR';
var BDR_V10_STABLE_GIT_SHA_PROP_ = 'BDR_STABLE_GIT_SHA';
var BDR_V10_LAST_RUN_PROP_ = 'BDR_V10_LAST_RUN';
var BDR_V10_ACTIVE_RUN_PROP_ = 'BDR_V10_ACTIVE_RUN';
var BDR_V10_LAST_VERIFIED_PROP_ = 'BDR_V10_LAST_VERIFIED_ID';
var BDR_V10_TRIGGER_FUNCTION_ = 'prosesBackupOtomatisBDRV10';
var BDR_V10_WRE_TRIGGER_FUNCTION_ = 'prosesWorkflowReminderTerjadwalV10';
var BDR_V10_LEASE_MS_ = 20 * 60 * 1000;
var BDR_V10_CHUNK_ROWS_ = 250;
var BDR_V10_FOLDER_RECOVERY_POINTS_ = 'RECOVERY_POINTS';
var BDR_V10_FOLDER_RECOVERY_CANDIDATES_ = 'RECOVERY_CANDIDATES';
var BDR_V10_FOLDER_DR_DRILLS_ = 'DR_DRILLS';
var BDR_V10_MANIFEST_NAME_ = '00_BDR_MANIFEST.json';
var BDR_V10_FINGERPRINTS_NAME_ = '01_SHEET_FINGERPRINTS.json';
var BDR_V10_CONFIG_NAME_ = '02_CONFIG_SNAPSHOT.json';
var BDR_V10_TRIGGERS_NAME_ = '03_TRIGGER_SNAPSHOT.json';
var BDR_V10_EVIDENCE_NAME_ = '04_EVIDENCE_INVENTORY.json';
var BDR_V10_CHECKSUM_NAME_ = '99_SHA256SUMS.txt';
var BDR_V10_DESIGN_BASELINE_GIT_SHA_ = 'b435923d3e922aa2d2331cf7cfa7ccd9d54091d1';
var BDR_V10_EVIDENCE_METADATA_BUDGET_ = 200;
var BDR_V10_CANDIDATE_MANIFEST_NAME_ = '00_BDR_CANDIDATE.json';
var BDR_V10_CANDIDATE_VALIDATION_NAME_ = '01_DEEP_VALIDATION.json';
var BDR_V10_REQUIRED_CORE_SHEETS_ = ['Rekap_Kinerja','Data_Pegawai','Master_Tunjangan','Rekap_Tunjangan_Bulanan','Audit_Log','Audit_Tunjangan'];

var BDR_V10_CRITICAL_SHEETS_ = [
  'Rekap_Kinerja',
  'Data_Pegawai',
  'Master_Tunjangan',
  'Rekap_Tunjangan_Bulanan',
  'Audit_Log',
  'Audit_Tunjangan',
  'Index_Laporan',
  'Index_Laporan_Sync_Queue',
  'Disposisi_Surat',
  'Disposisi_Penerima',
  'Disposisi_Log',
  'Disposisi_Petugas'
];

var BDR_V10_CONFIG_EXACT_ = [
  'SPREADSHEET_ID',
  'FOLDER_ID_BUKTI_KINERJA',
  'FOLDER_ID_BUKTI',
  'FOLDER_ID_ARSIP_BULANAN',
  'FOLDER_ID_DISPOSISI',
  'APP_CONSTANTS',
  'PORTAL_MAINTENANCE_EMAILS',
  'INDEX_LAPORAN_MAINTAINER_EMAIL',
  'PORTAL_FILE_SHARING_MODE',
  'PENANDA_LEWAT_PERIODE_ADMIN_3B04B1_ENABLED',
  'PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C_ENABLED',
  'SINKRONISASI_CUTOFF_PERIODE_3B04C1_ENABLED',
  'PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B_ENABLED',
  'HOTFIX_PERIODE_REVIEW_3B04C1C_ENABLED',
  'OPTIMASI_REVIEW_ADMIN_3C1_ENABLED',
  'OPTIMASI_REVIEW_ADMIN_3C1_ENABLED_AT',
  'OPTIMASI_REVIEW_ADMIN_3C1_SHADOW_PERCENT',
  'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_ENABLED',
  'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_ENABLED_AT',
  'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_SHADOW_PERCENT',
  'INDEX_LAPORAN_2B0_METADATA',
  'INDEX_LAPORAN_2B1_WRITE_ENABLED',
  'INDEX_LAPORAN_2B1_WRITE_ENABLED_AT',
  'INDEX_LAPORAN_2B2A_READ_RIWAYAT_ENABLED',
  'INDEX_LAPORAN_2B2A_READ_RIWAYAT_ENABLED_AT',
  'INDEX_LAPORAN_2B2A_SHADOW_PERCENT'
];
var BDR_V10_CONFIG_PREFIXES_ = [
  'TUNJANGAN_CUTOFF_META_',
  'INPUT_LAPORAN_CUTOFF_LOCK_',
  'TUTUP_PERIODE_LAPORAN_',
  'MONTHLY_ARCHIVE_V10_'
];
var BDR_V10_SECRET_KEYS_ = ['API_KEY_GEMINI', 'PIN_PEPPER'];
var BDR_V10_EXCLUDE_PREFIXES_ = ['PORTAL_SESSION_V2_', 'WRE_V10_EVENT_'];
var BDR_V10_EXCLUDE_EXACT_ = ['WRE_V10_ACTIVE_KEYS', 'WRE_V10_LAST_RUN', 'BDR_V10_ACTIVE_RUN'];

var BDR_V10_RETENTION_ = {
  daily: 14,
  weekly: 8,
  monthly: 12,
  manualDays: 14,
  manualMax: 10,
  preMaintenanceMinDays: 30,
  preMaintenanceMax: 20,
  failedDays: 7
};

function bdrV10Now_() { return new Date(); }

function bdrV10Hex_(bytes) {
  return (bytes || []).map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function bdrV10Sha256_(text) {
  return bdrV10Hex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text === null || typeof text === 'undefined' ? '' : text),
    Utilities.Charset.UTF_8
  ));
}

function bdrV10Iso_(date) {
  var d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime()) ? d.toISOString() : '';
}

function bdrV10FormatIdTime_(date) {
  return Utilities.formatDate(date instanceof Date ? date : new Date(date), 'GMT+7', 'yyyyMMdd-HHmmss');
}

function bdrV10SafeJson_(value) {
  return JSON.stringify(value, function (key, v) {
    return v instanceof Date ? v.toISOString() : v;
  }, 2);
}

function bdrV10NormalizeCell_(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 'E:';
  if (value instanceof Date && !isNaN(value.getTime())) return 'D:' + value.getTime();
  if (typeof value === 'string') {
    var s = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return 'S:' + s.length + ':' + s;
  }
  if (typeof value === 'number') {
    if (isNaN(value)) return 'N:NaN';
    if (!isFinite(value)) return value > 0 ? 'N:+INF' : 'N:-INF';
    if (value === 0 && 1 / value === -Infinity) return 'N:-0';
    return 'N:' + String(value);
  }
  if (typeof value === 'boolean') return value ? 'B:1' : 'B:0';
  var text;
  try { text = JSON.stringify(value); } catch (e) { text = String(value); }
  return 'J:' + String(text).length + ':' + String(text);
}

function bdrV10NormalizeFormula_(formula) {
  var s = String(formula || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return 'F:' + s.length + ':' + s;
}

function bdrV10CanonicalRange_(values, formulas) {
  var out = [];
  var rows = values || [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var frow = (formulas && formulas[i]) || [];
    out.push('R:' + row.length + ':');
    for (var j = 0; j < row.length; j++) {
      out.push(bdrV10NormalizeCell_(row[j]));
      out.push(bdrV10NormalizeFormula_(frow[j] || ''));
    }
  }
  return out.join('|');
}

function bdrV10FingerprintSheet_(sheet) {
  if (!sheet) throw new Error('BDR_SHEET_REQUIRED');
  var name = String(sheet.getName ? sheet.getName() : '');
  var lastRow = Math.max(0, Number(sheet.getLastRow ? sheet.getLastRow() : 0) || 0);
  var lastColumn = Math.max(0, Number(sheet.getLastColumn ? sheet.getLastColumn() : 0) || 0);
  var hidden = false;
  try { hidden = !!(sheet.isSheetHidden && sheet.isSheetHidden()); } catch (eHidden) { hidden = false; }

  var headerHash = bdrV10Sha256_('EMPTY_HEADER');
  if (lastRow > 0 && lastColumn > 0) {
    var hr = sheet.getRange(1, 1, 1, lastColumn);
    var hValues = hr.getValues();
    var hFormulas = typeof hr.getFormulas === 'function' ? hr.getFormulas() : [Array(lastColumn).fill('')];
    headerHash = bdrV10Sha256_(bdrV10CanonicalRange_(hValues, hFormulas));
  }

  var chunkHashes = [];
  if (lastRow > 0 && lastColumn > 0) {
    for (var start = 1; start <= lastRow; start += BDR_V10_CHUNK_ROWS_) {
      var count = Math.min(BDR_V10_CHUNK_ROWS_, lastRow - start + 1);
      var range = sheet.getRange(start, 1, count, lastColumn);
      var values = range.getValues();
      var formulas = typeof range.getFormulas === 'function'
        ? range.getFormulas()
        : values.map(function (row) { return row.map(function () { return ''; }); });
      var canonical = bdrV10CanonicalRange_(values, formulas);
      chunkHashes.push({
        startRow: start,
        rowCount: count,
        sha256: bdrV10Sha256_(canonical)
      });
    }
  }

  var sheetHashSeed = [name, lastRow, lastColumn].join('|') + '|' + chunkHashes.map(function (x) { return x.sha256; }).join('|');
  return {
    name: name,
    lastRow: lastRow,
    lastColumn: lastColumn,
    headerHash: headerHash,
    hidden: hidden,
    chunkRows: BDR_V10_CHUNK_ROWS_,
    chunkCount: chunkHashes.length,
    chunks: chunkHashes,
    sheetHash: bdrV10Sha256_(sheetHashSeed)
  };
}

function bdrV10FingerprintSpreadsheet_(spreadsheet) {
  if (!spreadsheet) throw new Error('BDR_SPREADSHEET_REQUIRED');
  var sheets = spreadsheet.getSheets ? spreadsheet.getSheets() : [];
  var structure = [];
  var semantic = {};
  var byName = {};
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var name = String(sh.getName());
    var lastRow = Math.max(0, Number(sh.getLastRow ? sh.getLastRow() : 0) || 0);
    var lastColumn = Math.max(0, Number(sh.getLastColumn ? sh.getLastColumn() : 0) || 0);
    var hidden = false;
    try { hidden = !!(sh.isSheetHidden && sh.isSheetHidden()); } catch (eHidden) { hidden = false; }
    var headerHash = bdrV10Sha256_('EMPTY_HEADER');
    if (lastRow > 0 && lastColumn > 0) {
      var hr = sh.getRange(1, 1, 1, lastColumn);
      var hv = hr.getValues();
      var hf = typeof hr.getFormulas === 'function' ? hr.getFormulas() : [Array(lastColumn).fill('')];
      headerHash = bdrV10Sha256_(bdrV10CanonicalRange_(hv, hf));
    }
    var item = { name:name, lastRow:lastRow, lastColumn:lastColumn, headerHash:headerHash, hidden:hidden };
    structure.push(item);
    byName[name] = sh;
  }
  structure.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

  BDR_V10_CRITICAL_SHEETS_.forEach(function (name) {
    if (!byName[name]) {
      semantic[name] = { status:'SOURCE_ABSENT' };
      return;
    }
    semantic[name] = { status:'PRESENT', fingerprint:bdrV10FingerprintSheet_(byName[name]) };
  });

  var structureSeed = structure.map(function (x) {
    return [x.name, x.lastRow, x.lastColumn, x.headerHash].join('|');
  }).join('\n');
  var semanticSeed = Object.keys(semantic).sort().map(function (name) {
    var x = semantic[name];
    return name + '|' + x.status + '|' + (x.fingerprint ? x.fingerprint.sheetHash : '');
  }).join('\n');
  var hiddenSeed = structure.map(function (x) { return x.name + '|' + (x.hidden ? '1' : '0'); }).join('\n');

  return {
    spreadsheetId: String(spreadsheet.getId ? spreadsheet.getId() : ''),
    capturedAt: bdrV10Iso_(bdrV10Now_()),
    sheetCount: structure.length,
    structure: structure,
    semantic: semantic,
    structureHash: bdrV10Sha256_(structureSeed),
    semanticHash: bdrV10Sha256_(semanticSeed),
    hiddenStateHash: bdrV10Sha256_(hiddenSeed),
    overallHash: bdrV10Sha256_(bdrV10Sha256_(structureSeed) + '|' + bdrV10Sha256_(semanticSeed))
  };
}

function bdrV10CompareFingerprints_(expected, actual) {
  var issues = [], warnings = [];
  if (!expected || !actual) return { ok:false, issues:['FINGERPRINT_MISSING'], warnings:warnings };
  if (String(expected.structureHash || '') !== String(actual.structureHash || '')) issues.push('STRUCTURE_MISMATCH');
  if (String(expected.semanticHash || '') !== String(actual.semanticHash || '')) issues.push('SEMANTIC_MISMATCH');
  if (String(expected.hiddenStateHash || '') !== String(actual.hiddenStateHash || '')) warnings.push('HIDDEN_STATE_MISMATCH');
  if (Number(expected.sheetCount || 0) !== Number(actual.sheetCount || 0)) issues.push('SHEET_COUNT_MISMATCH');
  return { ok:issues.length === 0, issues:issues, warnings:warnings };
}

function bdrV10IsExcludedProperty_(key) {
  key = String(key || '');
  if (BDR_V10_EXCLUDE_EXACT_.indexOf(key) !== -1) return true;
  for (var i = 0; i < BDR_V10_EXCLUDE_PREFIXES_.length; i++) if (key.indexOf(BDR_V10_EXCLUDE_PREFIXES_[i]) === 0) return true;
  return false;
}

function bdrV10IsRestorableProperty_(key) {
  key = String(key || '');
  if (bdrV10IsExcludedProperty_(key)) return false;
  if (BDR_V10_SECRET_KEYS_.indexOf(key) !== -1) return false;
  if (BDR_V10_CONFIG_EXACT_.indexOf(key) !== -1) return true;
  for (var i = 0; i < BDR_V10_CONFIG_PREFIXES_.length; i++) if (key.indexOf(BDR_V10_CONFIG_PREFIXES_[i]) === 0) return true;
  return false;
}

function bdrV10SnapshotConfig_() {
  var props = portalScriptProperties_().getProperties();
  var values = {};
  Object.keys(props || {}).sort().forEach(function (key) {
    if (bdrV10IsRestorableProperty_(key)) values[key] = String(props[key]);
  });
  var secrets = BDR_V10_SECRET_KEYS_.map(function (key) {
    return { key:key, required:true, present:String((props || {})[key] || '') !== '', valueStored:false };
  });
  return {
    version: 'BDR-CONFIG-SNAPSHOT-1.0',
    capturedAt: bdrV10Iso_(bdrV10Now_()),
    values: values,
    secretPresence: secrets,
    excludedPolicy: {
      exact: BDR_V10_EXCLUDE_EXACT_.slice(),
      prefixes: BDR_V10_EXCLUDE_PREFIXES_.slice()
    },
    spreadsheetPointerStoredButNotRestoredByDefault: Object.prototype.hasOwnProperty.call(values, 'SPREADSHEET_ID')
  };
}

function bdrV10TriggerDescriptor_(trigger) {
  var out = { functionName:'', eventType:'', triggerSource:'', uniqueId:'' };
  try { out.functionName = String(trigger.getHandlerFunction ? trigger.getHandlerFunction() : ''); } catch (e1) { }
  try { out.eventType = String(trigger.getEventType ? trigger.getEventType() : ''); } catch (e2) { }
  try { out.triggerSource = String(trigger.getTriggerSource ? trigger.getTriggerSource() : ''); } catch (e3) { }
  try { out.uniqueId = String(trigger.getUniqueId ? trigger.getUniqueId() : ''); } catch (e4) { }
  return out;
}

function bdrV10SnapshotTriggers_() {
  var triggers = [];
  try { triggers = ScriptApp.getProjectTriggers() || []; } catch (e) { triggers = []; }
  var descriptors = triggers.map(bdrV10TriggerDescriptor_);
  function count(name) {
    return descriptors.filter(function (x) { return x.functionName === name; }).length;
  }
  var known = [
    { functionName:BDR_V10_WRE_TRIGGER_FUNCTION_, expectedCount:1, actualCount:count(BDR_V10_WRE_TRIGGER_FUNCTION_), cadence:'EVERY_4_HOURS' },
    { functionName:BDR_V10_TRIGGER_FUNCTION_, expectedCount:1, actualCount:count(BDR_V10_TRIGGER_FUNCTION_), cadence:'DAILY_AROUND_02_WIB' }
  ];
  known.forEach(function (x) { x.healthy = x.actualCount === x.expectedCount; });
  return {
    version:'BDR-TRIGGER-SNAPSHOT-1.0',
    capturedAt:bdrV10Iso_(bdrV10Now_()),
    known:known,
    projectTriggers:descriptors
  };
}

function bdrV10Audit_(action, detail) {
  try {
    if (typeof logAudit_ === 'function') logAudit_('SYSTEM_BDR', String(action || 'BDR_EVENT'), typeof detail === 'string' ? detail : JSON.stringify(detail || {}));
  } catch (e) {
    try { Logger.log('BDR audit best-effort gagal: ' + String(e && e.message || e)); } catch (e2) { }
  }
}

function bdrV10ClaimRun_(runId, type) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { claimed:false, code:'LOCK_BUSY', staleRecovered:false };
  try {
    var props = portalScriptProperties_();
    var now = bdrV10Now_();
    var nowMs = now.getTime();
    var current = null;
    try {
      var raw = props.getProperty(BDR_V10_ACTIVE_RUN_PROP_);
      if (raw) current = JSON.parse(raw);
    } catch (eParse) { current = null; }
    if (current && Number(current.expiresAtMs || 0) > nowMs && String(current.runId || '') !== String(runId || '')) {
      return { claimed:false, code:'LOCK_BUSY', staleRecovered:false, activeRun:current };
    }
    var staleRecovered = !!(current && String(current.runId || '') !== String(runId || ''));
    var lease = {
      runId:String(runId || ''),
      type:String(type || ''),
      startedAt:bdrV10Iso_(now),
      startedAtMs:nowMs,
      expiresAt:bdrV10Iso_(new Date(nowMs + BDR_V10_LEASE_MS_)),
      expiresAtMs:nowMs + BDR_V10_LEASE_MS_
    };
    props.setProperty(BDR_V10_ACTIVE_RUN_PROP_, JSON.stringify(lease));
    if (staleRecovered) bdrV10Audit_('STALE_LEASE_RECOVERED', { old:current, replacement:lease });
    return { claimed:true, code:'CLAIMED', staleRecovered:staleRecovered, lease:lease };
  } finally {
    try { lock.releaseLock(); } catch (eRelease) { }
  }
}

function bdrV10ReleaseRun_(runId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { released:false, code:'LOCK_BUSY' };
  try {
    var props = portalScriptProperties_();
    var current = null;
    try {
      var raw = props.getProperty(BDR_V10_ACTIVE_RUN_PROP_);
      if (raw) current = JSON.parse(raw);
    } catch (eParse) { current = null; }
    if (!current) return { released:true, code:'NO_LEASE' };
    if (String(current.runId || '') !== String(runId || '')) return { released:false, code:'LEASE_OWNER_MISMATCH' };
    props.deleteProperty(BDR_V10_ACTIVE_RUN_PROP_);
    return { released:true, code:'RELEASED' };
  } finally {
    try { lock.releaseLock(); } catch (eRelease) { }
  }
}

function bdrV10BuildBackupId_(type, date, runId) {
  var dt = date instanceof Date ? date : new Date(date || bdrV10Now_());
  var t = String(type || 'MANUAL').toUpperCase().replace(/[^A-Z0-9_]/g, '').substring(0, 24) || 'MANUAL';
  var v = String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'UNKNOWN').replace(/[^0-9A-Za-z._-]/g, '');
  var entropy = String(runId || Utilities.getUuid() || '') + '|' + dt.getTime() + '|' + t + '|' + v;
  return 'BDR-' + bdrV10FormatIdTime_(dt) + '-' + v + '-' + t + '-' + bdrV10Sha256_(entropy).substring(0, 8).toUpperCase();
}

function bdrV10ResolveRoot_() {
  var props = portalScriptProperties_();
  var id = String(props.getProperty(BDR_V10_ROOT_PROP_) || '').trim();
  if (!id) return { valid:false, code:'BDR_ROOT_NOT_CONFIGURED', message:'FOLDER_ID_BDR belum dikonfigurasi.' };
  try {
    var folder = DriveApp.getFolderById(id);
    return { valid:true, code:'OK', folderId:id, folder:folder, name:String(folder.getName ? folder.getName() : '') };
  } catch (e) {
    return { valid:false, code:'BDR_ROOT_UNAVAILABLE', message:'Folder BDR tidak dapat diakses.' };
  }
}

function bdrV10GetSingleChildFolder_(parent, name, createIfMissing) {
  var it = parent.getFoldersByName(name);
  var first = it.hasNext() ? it.next() : null;
  if (first && it.hasNext()) throw new Error('BDR_DUPLICATE_FOLDER:' + name);
  if (!first && createIfMissing) first = parent.createFolder(name);
  return first;
}

function bdrV10RecoveryPointFolder_(rootFolder, backupId, date, createIfMissing) {
  var dt = date instanceof Date ? date : new Date(date || bdrV10Now_());
  var year = Utilities.formatDate(dt, 'GMT+7', 'yyyy');
  var month = Utilities.formatDate(dt, 'GMT+7', 'MM');
  var rp = bdrV10GetSingleChildFolder_(rootFolder, BDR_V10_FOLDER_RECOVERY_POINTS_, createIfMissing);
  if (!rp) return null;
  var yf = bdrV10GetSingleChildFolder_(rp, year, createIfMissing);
  if (!yf) return null;
  var mf = bdrV10GetSingleChildFolder_(yf, month, createIfMissing);
  if (!mf) return null;
  var existing = bdrV10GetSingleChildFolder_(mf, backupId, false);
  if (existing) {
    if (createIfMissing) throw new Error('BDR_RECOVERY_POINT_ALREADY_EXISTS:' + backupId);
    return existing;
  }
  return createIfMissing ? mf.createFolder(backupId) : null;
}

function bdrV10WriteTextFile_(folder, name, content) {
  var it = folder.getFilesByName(name);
  var file = it.hasNext() ? it.next() : null;
  if (file && it.hasNext()) throw new Error('BDR_DUPLICATE_FILE:' + name);
  if (file && typeof file.setContent === 'function') {
    file.setContent(String(content || ''));
    return file;
  }
  return folder.createFile(name, String(content || ''), MimeType.PLAIN_TEXT);
}

function bdrV10ReadTextFile_(folder, name) {
  var it = folder.getFilesByName(name);
  if (!it.hasNext()) return null;
  var file = it.next();
  if (it.hasNext()) throw new Error('BDR_DUPLICATE_FILE:' + name);
  return { file:file, text:String(file.getBlob().getDataAsString('UTF-8') || '') };
}

function bdrV10WriteJsonFile_(folder, name, value) {
  return bdrV10WriteTextFile_(folder, name, bdrV10SafeJson_(value));
}

function bdrV10ReadJsonFile_(folder, name) {
  var x = bdrV10ReadTextFile_(folder, name);
  if (!x) return null;
  return { file:x.file, value:JSON.parse(x.text), text:x.text };
}

function bdrV10BuildChecksumText_(entries, manifestText, backupLogicalHash, backupFileName) {
  var lines = [];
  (entries || []).forEach(function (x) { lines.push(bdrV10Sha256_(x.text) + '  ' + x.name); });
  lines.push(bdrV10Sha256_(manifestText) + '  ' + BDR_V10_MANIFEST_NAME_);
  lines.push(String(backupLogicalHash || '') + '  ' + String(backupFileName || 'Database_Kinerja_Backup') + ' [LOGICAL_FINGERPRINT]');
  return lines.join('\n') + '\n';
}

function bdrV10EvidencePlaceholder_() {
  return {
    version:'BDR-EVIDENCE-INVENTORY-1.0',
    status:'UNAVAILABLE',
    implemented:true,
    batch:'B',
    note:'Evidence inventory tidak dapat dibangun pada recovery point ini.',
    referencesTotal:0,
    uniqueFiles:0,
    metadataBudget:BDR_V10_EVIDENCE_METADATA_BUDGET_,
    checked:0,
    available:0,
    missing:0,
    notChecked:0,
    invalidReferenceCount:0,
    files:[],
    invalidReferences:[]
  };
}

function bdrV10ExtractDriveFileId_(value) {
  var s = String(value === null || typeof value === 'undefined' ? '' : value).trim();
  if (!s) return '';
  var patterns = [
    /\/d\/([A-Za-z0-9_-]{10,})/,
    /[?&]id=([A-Za-z0-9_-]{10,})/,
    /[?&]fileId=([A-Za-z0-9_-]{10,})/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = s.match(patterns[i]);
    if (m && m[1]) return String(m[1]);
  }
  return '';
}

function bdrV10ColumnIndex_(schemaGroup, key, fallback) {
  try {
    if (typeof SHEET_COLUMNS !== 'undefined' && SHEET_COLUMNS[schemaGroup] &&
        typeof SHEET_COLUMNS[schemaGroup][key] === 'number') return SHEET_COLUMNS[schemaGroup][key];
  } catch (e) { }
  return Number(fallback);
}

function bdrV10ReadSheetRows_(spreadsheet, sheetName) {
  var sh = spreadsheet && spreadsheet.getSheetByName ? spreadsheet.getSheetByName(sheetName) : null;
  if (!sh) return null;
  var lastRow = Math.max(0, Number(sh.getLastRow ? sh.getLastRow() : 0) || 0);
  var lastColumn = Math.max(0, Number(sh.getLastColumn ? sh.getLastColumn() : 0) || 0);
  if (!lastRow || !lastColumn) return { sheet:sh, rows:[], lastRow:lastRow, lastColumn:lastColumn };
  return { sheet:sh, rows:sh.getRange(1, 1, lastRow, lastColumn).getValues(), lastRow:lastRow, lastColumn:lastColumn };
}

function bdrV10FileParentIds_(file) {
  var out = [];
  try {
    var it = file.getParents ? file.getParents() : null;
    while (it && it.hasNext()) {
      var p = it.next();
      out.push(String(p && p.getId ? p.getId() : ''));
      if (out.length >= 20) break;
    }
  } catch (e) { }
  return out.filter(function (x) { return !!x; });
}

function bdrV10BuildEvidenceInventory_(spreadsheet, options) {
  options = options || {};
  var budget = Math.max(0, Number(options.metadataBudget === 0 ? 0 : (options.metadataBudget || BDR_V10_EVIDENCE_METADATA_BUDGET_)) || 0);
  var capturedAt = bdrV10Iso_(bdrV10Now_());
  var sources = [
    { sheet:'Rekap_Kinerja', schema:'REKAP_KINERJA', key:'VISUAL_URL', fallback:5, type:'VISUAL_URL' },
    { sheet:'Rekap_Kinerja', schema:'REKAP_KINERJA', key:'DASAR_URL', fallback:11, type:'DASAR_URL' },
    { sheet:'Disposisi_Surat', schema:'DISPOSISI_SURAT', key:'LAMPIRAN_URL', fallback:9, type:'LAMPIRAN_URL' }
  ];
  var byId = {}, ordered = [], invalid = [], referencesTotal = 0;

  try {
    for (var s = 0; s < sources.length; s++) {
      var src = sources[s];
      var pack = bdrV10ReadSheetRows_(spreadsheet, src.sheet);
      if (!pack || !pack.rows || pack.rows.length <= 1) continue;
      var col = bdrV10ColumnIndex_(src.schema, src.key, src.fallback);
      for (var r = 1; r < pack.rows.length; r++) {
        var raw = pack.rows[r][col];
        var text = String(raw === null || typeof raw === 'undefined' ? '' : raw).trim();
        if (!text) continue;
        referencesTotal++;
        var fileId = bdrV10ExtractDriveFileId_(text);
        if (!fileId) {
          invalid.push({ sheet:src.sheet, row:r + 1, field:src.type, value:text.slice(0, 300) });
          continue;
        }
        if (!byId[fileId]) {
          byId[fileId] = {
            fileId:fileId,
            referenceCount:0,
            sourceTypes:[],
            firstReference:{ sheet:src.sheet, row:r + 1, field:src.type },
            availability:'NOT_CHECKED',
            name:'',
            size:null,
            modifiedTime:'',
            parentIds:[]
          };
          ordered.push(byId[fileId]);
        }
        byId[fileId].referenceCount++;
        if (byId[fileId].sourceTypes.indexOf(src.type) === -1) byId[fileId].sourceTypes.push(src.type);
      }
    }

    var checked = 0, available = 0, missing = 0;
    for (var i = 0; i < ordered.length; i++) {
      var entry = ordered[i];
      if (checked >= budget) break;
      checked++;
      try {
        var file = DriveApp.getFileById(entry.fileId);
        entry.availability = 'AVAILABLE';
        try { entry.name = String(file.getName ? file.getName() : ''); } catch (eName) { }
        try { entry.size = Number(file.getSize ? file.getSize() : 0); if (!isFinite(entry.size)) entry.size = null; } catch (eSize) { entry.size = null; }
        try { entry.modifiedTime = bdrV10Iso_(file.getLastUpdated ? file.getLastUpdated() : ''); } catch (eMod) { entry.modifiedTime = ''; }
        entry.parentIds = bdrV10FileParentIds_(file);
        available++;
      } catch (eFile) {
        entry.availability = 'MISSING';
        entry.errorCode = 'FILE_UNAVAILABLE';
        missing++;
      }
    }
    var notChecked = Math.max(0, ordered.length - checked);
    var status = missing > 0 ? 'MISSING_FOUND' : (notChecked > 0 ? 'PARTIAL' : 'COMPLETE');
    return {
      version:'BDR-EVIDENCE-INVENTORY-1.0',
      status:status,
      implemented:true,
      batch:'B',
      capturedAt:capturedAt,
      referencesTotal:referencesTotal,
      uniqueFiles:ordered.length,
      metadataBudget:budget,
      checked:checked,
      available:available,
      missing:missing,
      notChecked:notChecked,
      invalidReferenceCount:invalid.length,
      sourceColumns:sources.map(function (x) { return x.sheet + '.' + x.type; }),
      files:ordered,
      invalidReferences:invalid
    };
  } catch (e) {
    var fallback = bdrV10EvidencePlaceholder_();
    fallback.capturedAt = capturedAt;
    fallback.errorCode = 'EVIDENCE_INVENTORY_BUILD_FAILED';
    fallback.error = String(e && e.message ? e.message : e);
    return fallback;
  }
}

function bdrV10EvidenceSummary_(inventory) {
  inventory = inventory || {};
  return {
    status:String(inventory.status || 'UNAVAILABLE'),
    implemented:inventory.implemented === true,
    referencesTotal:Number(inventory.referencesTotal || 0),
    uniqueFiles:Number(inventory.uniqueFiles || 0),
    checked:Number(inventory.checked || 0),
    available:Number(inventory.available || 0),
    missing:Number(inventory.missing || 0),
    notChecked:Number(inventory.notChecked || 0),
    invalidReferenceCount:Number(inventory.invalidReferenceCount || 0)
  };
}

function bdrV10Truthy_(value) {
  if (value === true || value === 1) return true;
  var s = String(value === null || typeof value === 'undefined' ? '' : value).trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YA' || s === 'YES' || s === 'AKTIF';
}

function bdrV10CandidateRoot_(rootFolder, createIfMissing) {
  return bdrV10GetSingleChildFolder_(rootFolder, BDR_V10_FOLDER_RECOVERY_CANDIDATES_, createIfMissing);
}

function bdrV10BuildCandidateId_(backupId, date, uuid) {
  var suffix = String(uuid || Utilities.getUuid()).replace(/[^A-Za-z0-9]/g, '').slice(-8) || '00000000';
  return 'RC-' + String(backupId || '').replace(/[^A-Za-z0-9._-]/g, '_') + '-' + bdrV10FormatIdTime_(date || bdrV10Now_()) + '-' + suffix;
}

function bdrV10FindCandidateFolder_(rootFolder, candidateId) {
  var candidates = bdrV10CandidateRoot_(rootFolder, false);
  if (!candidates) return null;
  var it = candidates.getFoldersByName(String(candidateId || ''));
  if (!it.hasNext()) return null;
  var folder = it.next();
  if (it.hasNext()) throw new Error('BDR_DUPLICATE_CANDIDATE_FOLDER:' + candidateId);
  return folder;
}

function bdrV10CandidateManifest_(folder) {
  var pack = bdrV10ReadJsonFile_(folder, BDR_V10_CANDIDATE_MANIFEST_NAME_);
  return pack ? pack.value : null;
}

function bdrV10ValidationCheck_(checks, code, status, detail) {
  checks.push({ code:String(code || ''), status:String(status || 'PASS'), detail:detail || {} });
}

function bdrV10ValidateUniqueReportIds_(spreadsheet) {
  var pack = bdrV10ReadSheetRows_(spreadsheet, 'Rekap_Kinerja');
  if (!pack) return { ok:false, code:'REKAP_KINERJA_MISSING', duplicates:[], blank:0 };
  var idx = bdrV10ColumnIndex_('REKAP_KINERJA', 'ID_LAPORAN', 18);
  var seen = {}, duplicates = [], blank = 0;
  for (var i = 1; i < pack.rows.length; i++) {
    var id = String(pack.rows[i][idx] || '').trim();
    if (!id) { blank++; continue; }
    if (seen[id]) duplicates.push({ id:id, firstRow:seen[id], row:i + 1 });
    else seen[id] = i + 1;
  }
  return { ok:duplicates.length === 0, code:duplicates.length ? 'REPORT_ID_DUPLICATE' : 'PASS', duplicates:duplicates, blank:blank, checkedRows:Math.max(0, pack.rows.length - 1) };
}

function bdrV10ValidateEmployeeIdentity_(spreadsheet) {
  var pack = bdrV10ReadSheetRows_(spreadsheet, 'Data_Pegawai');
  if (!pack) return { ok:false, code:'DATA_PEGAWAI_MISSING', duplicateIds:[], duplicateUsernames:[], missingActiveId:[], missingActiveUsername:[] };
  var idIdx=bdrV10ColumnIndex_('DATA_PEGAWAI','ID',0), userIdx=bdrV10ColumnIndex_('DATA_PEGAWAI','USERNAME',1), nameIdx=bdrV10ColumnIndex_('DATA_PEGAWAI','NAMA',2), statusIdx=bdrV10ColumnIndex_('DATA_PEGAWAI','STATUS',7);
  var ids={}, users={}, dupIds=[], dupUsers=[], missId=[], missUser=[], activeCount=0;
  for (var i=1;i<pack.rows.length;i++) {
    var row=pack.rows[i] || [];
    if (String(row[statusIdx] || '').trim().toLowerCase() !== 'aktif') continue;
    activeCount++;
    var id=String(row[idIdx] || '').trim(), user=String(row[userIdx] || '').trim().toLowerCase(), name=String(row[nameIdx] || '').trim();
    if (!id) missId.push({row:i+1,name:name});
    else if (ids[id]) dupIds.push({id:id,firstRow:ids[id],row:i+1,name:name}); else ids[id]=i+1;
    if (!user) missUser.push({row:i+1,name:name});
    else if (users[user]) dupUsers.push({username:user,firstRow:users[user],row:i+1,name:name}); else users[user]=i+1;
  }
  return { ok:dupIds.length===0 && dupUsers.length===0 && missId.length===0 && missUser.length===0, code:'EMPLOYEE_IDENTITY', activeCount:activeCount, duplicateIds:dupIds, duplicateUsernames:dupUsers, missingActiveId:missId, missingActiveUsername:missUser };
}

function bdrV10ValidateAllowanceStructure_(spreadsheet) {
  var pack = bdrV10ReadSheetRows_(spreadsheet, 'Rekap_Tunjangan_Bulanan');
  if (!pack) return { ok:false, code:'REKAP_TUNJANGAN_MISSING', periods:[], issues:['REKAP_TUNJANGAN_MISSING'] };
  var C = {
    PERIODE:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','PERIODE',0),
    ID_USER:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','ID_USER',1),
    NAMA:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','NAMA',2),
    PERSEN_PROD:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','PERSEN_PROD',8),
    PERSEN_TU:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','PERSEN_TU',9),
    MAX_PROD:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','MAX_PROD',10),
    MAX_TU:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','MAX_TU',11),
    RP_PROD:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','RP_PROD',12),
    RP_TU:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','RP_TU',13),
    RP_TOTAL:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','RP_TOTAL',14),
    STATUS_REKAP:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','STATUS_REKAP',15),
    BATCH_ID:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','BATCH_ID',28),
    IS_ACTIVE:bdrV10ColumnIndex_('REKAP_TUNJANGAN_BULANAN','IS_ACTIVE',29)
  };
  var groups={};
  for (var i=1;i<pack.rows.length;i++) {
    var row=pack.rows[i] || [];
    if (!bdrV10Truthy_(row[C.IS_ACTIVE])) continue;
    var period=String(row[C.PERIODE] || '').trim() || '(KOSONG)';
    if (!groups[period]) groups[period]=[];
    groups[period].push({row:i+1,values:row});
  }
  var issues=[], periods=[];
  Object.keys(groups).sort().forEach(function (period) {
    var rows=groups[period], ids={}, bids={}, statuses={}, duplicate=[], arithmetic=[];
    rows.forEach(function (item) {
      var r=item.values;
      var id=String(r[C.ID_USER] || '').trim(), bid=String(r[C.BATCH_ID] || '').trim(), st=String(r[C.STATUS_REKAP] || '').trim();
      if (id) { if (ids[id]) duplicate.push({id:id,row:item.row,firstRow:ids[id]}); else ids[id]=item.row; }
      if (bid) bids[bid]=true;
      if (st) statuses[st]=true;
      var maxProd=Number(r[C.MAX_PROD]), maxTU=Number(r[C.MAX_TU]), pp=Number(r[C.PERSEN_PROD]), pt=Number(r[C.PERSEN_TU]);
      var rpProd=Number(r[C.RP_PROD]), rpTU=Number(r[C.RP_TU]), rpTotal=Number(r[C.RP_TOTAL]);
      var valid=[maxProd,maxTU,pp,pt,rpProd,rpTU,rpTotal].every(isFinite) && pp>=0 && pp<=100 && pt>=0 && pt<=100 &&
        Math.abs(rpTotal-(rpProd+rpTU))<=0.01 && Math.abs(rpProd-((pp/100)*maxProd))<=0.01 && Math.abs(rpTU-((pt/100)*maxTU))<=0.01;
      if (!valid) arithmetic.push({row:item.row,id:id,nama:String(r[C.NAMA] || '')});
    });
    var pIssues=[];
    if (Object.keys(bids).length!==1) pIssues.push('BATCH_ID_TIDAK_KONSISTEN');
    if (Object.keys(statuses).length!==1) pIssues.push('STATUS_BATCH_TIDAK_KONSISTEN');
    if (duplicate.length) pIssues.push('PEGAWAI_DUPLIKAT');
    if (arithmetic.length) pIssues.push('ARITMETIKA_TIDAK_KONSISTEN');
    pIssues.forEach(function (x) { issues.push(period + ':' + x); });
    periods.push({periode:period,activeRows:rows.length,batchIds:Object.keys(bids),statuses:Object.keys(statuses),duplicateEmployees:duplicate.length,arithmeticIssues:arithmetic.length,issues:pIssues});
  });
  return { ok:issues.length===0, code:issues.length?'ALLOWANCE_STRUCTURE_INVALID':'PASS', periods:periods, issues:issues };
}

function bdrV10ValidateIndexUnique_(spreadsheet) {
  var pack = bdrV10ReadSheetRows_(spreadsheet, 'Index_Laporan');
  if (!pack) return { ok:true, code:'SOURCE_ABSENT', duplicates:[], blank:0, present:false };
  var idx=bdrV10ColumnIndex_('INDEX_LAPORAN','ID_LAPORAN',0), seen={}, duplicates=[], blank=0;
  for (var i=1;i<pack.rows.length;i++) {
    var id=String(pack.rows[i][idx] || '').trim();
    if (!id) { blank++; continue; }
    if (seen[id]) duplicates.push({id:id,firstRow:seen[id],row:i+1}); else seen[id]=i+1;
  }
  return { ok:duplicates.length===0, code:duplicates.length?'INDEX_ID_DUPLICATE':'PASS', duplicates:duplicates, blank:blank, present:true };
}

function bdrV10DeepValidateCandidate_(candidateSpreadsheetId, recoveryPointId) {
  var root=bdrV10ResolveRoot_();
  var blockers=[], warnings=[], checks=[];
  if (!root.valid) return {status:'INVALID',valid:false,blockers:[root.code || 'BDR_ROOT_UNAVAILABLE'],warnings:[],checks:[],validatedAt:bdrV10Iso_(bdrV10Now_())};
  var pointFolder=bdrV10FindRecoveryPointFolder_(root.folder,recoveryPointId);
  if (!pointFolder) return {status:'INVALID',valid:false,blockers:['RECOVERY_POINT_NOT_FOUND'],warnings:[],checks:[],validatedAt:bdrV10Iso_(bdrV10Now_())};
  var manifestPack=bdrV10ReadJsonFile_(pointFolder,BDR_V10_MANIFEST_NAME_);
  var fpPack=bdrV10ReadJsonFile_(pointFolder,BDR_V10_FINGERPRINTS_NAME_);
  var cfgPack=bdrV10ReadJsonFile_(pointFolder,BDR_V10_CONFIG_NAME_);
  if (!manifestPack || !fpPack || !cfgPack) return {status:'INVALID',valid:false,blockers:['RECOVERY_POINT_METADATA_MISSING'],warnings:[],checks:[],validatedAt:bdrV10Iso_(bdrV10Now_())};
  var point=manifestPack.value || {}, expected=(fpPack.value || {}).backup || null, config=cfgPack.value || {};
  if (String(point.status || '')!=='VERIFIED') blockers.push('RECOVERY_POINT_NOT_VERIFIED');
  var backupId=String(point.backup && point.backup.spreadsheetId || '');
  if (!candidateSpreadsheetId) blockers.push('CANDIDATE_SPREADSHEET_ID_MISSING');
  if (candidateSpreadsheetId && candidateSpreadsheetId===backupId) blockers.push('CANDIDATE_IS_BACKUP_ORIGINAL');
  var currentPointer='';
  try { currentPointer=String(portalScriptProperties_().getProperty('SPREADSHEET_ID') || ''); } catch (ePtr) { }
  if (candidateSpreadsheetId && currentPointer===candidateSpreadsheetId) blockers.push('CANDIDATE_ALREADY_ACTIVE');

  var ss=null, actual=null;
  try { ss=SpreadsheetApp.openById(candidateSpreadsheetId); actual=bdrV10FingerprintSpreadsheet_(ss); }
  catch (eOpen) { blockers.push('CANDIDATE_SPREADSHEET_UNAVAILABLE'); }
  if (expected && actual) {
    var cmp=bdrV10CompareFingerprints_(expected,actual);
    bdrV10ValidationCheck_(checks,'FINGERPRINT',cmp.ok?'PASS':'BLOCKED',{issues:cmp.issues,warnings:cmp.warnings});
    cmp.issues.forEach(function (x) { blockers.push('CANDIDATE_' + x); });
    cmp.warnings.forEach(function (x) { warnings.push('CANDIDATE_' + x); });
  } else if (!expected) blockers.push('EXPECTED_FINGERPRINT_MISSING');

  if (actual) {
    var names={}; (actual.structure || []).forEach(function (x) { names[String(x.name || '')]=true; });
    var missingCore=BDR_V10_REQUIRED_CORE_SHEETS_.filter(function (name) { return !names[name]; });
    bdrV10ValidationCheck_(checks,'REQUIRED_CORE_SHEETS',missingCore.length?'BLOCKED':'PASS',{missing:missingCore});
    if (missingCore.length) blockers.push('REQUIRED_CORE_SHEET_MISSING:' + missingCore.join(','));
  }

  if (ss) {
    var reportCheck=bdrV10ValidateUniqueReportIds_(ss);
    bdrV10ValidationCheck_(checks,'REPORT_ID_UNIQUE',reportCheck.ok?'PASS':'BLOCKED',reportCheck);
    if (!reportCheck.ok) blockers.push(reportCheck.code || 'REPORT_ID_DUPLICATE');
    if (reportCheck.blank) warnings.push('REPORT_ID_BLANK:' + reportCheck.blank);

    var employeeCheck=bdrV10ValidateEmployeeIdentity_(ss);
    bdrV10ValidationCheck_(checks,'EMPLOYEE_IDENTITY',employeeCheck.ok?'PASS':'BLOCKED',employeeCheck);
    if (!employeeCheck.ok) blockers.push('EMPLOYEE_IDENTITY_CONFLICT');

    var allowanceCheck=bdrV10ValidateAllowanceStructure_(ss);
    bdrV10ValidationCheck_(checks,'ALLOWANCE_STRUCTURE',allowanceCheck.ok?'PASS':'BLOCKED',allowanceCheck);
    allowanceCheck.issues.forEach(function (x) { blockers.push('ALLOWANCE_' + x); });

    var indexCheck=bdrV10ValidateIndexUnique_(ss);
    bdrV10ValidationCheck_(checks,'INDEX_ID_UNIQUE',indexCheck.ok?'PASS':'BLOCKED',indexCheck);
    if (!indexCheck.ok) blockers.push(indexCheck.code || 'INDEX_ID_DUPLICATE');
  }

  var cfgValues=config.values || {};
  var pointSource=String(point.source && point.source.spreadsheetId || '');
  if (String(cfgValues.SPREADSHEET_ID || '') !== pointSource) blockers.push('CONFIG_SOURCE_POINTER_MISMATCH');
  if (String(point.appVersion || '') && String(typeof APP_VERSION!=='undefined'?APP_VERSION:'') !== String(point.appVersion || '')) warnings.push('APP_VERSION_DIFFERS_FROM_RECOVERY_POINT');
  var configuredSha='';
  try { configuredSha=String(portalScriptProperties_().getProperty(BDR_V10_STABLE_GIT_SHA_PROP_) || ''); } catch (eSha) { }
  if (configuredSha && point.stableGitSha && configuredSha!==String(point.stableGitSha)) warnings.push('STABLE_GIT_SHA_DIFFERS_FROM_RECOVERY_POINT');
  (config.secretPresence || []).forEach(function (x) { if (x && x.required && x.present!==true) warnings.push('SECRET_NOT_PRESENT_AT_BACKUP:' + String(x.key || '')); });
  bdrV10ValidationCheck_(checks,'CONFIG_COMPATIBILITY',blockers.indexOf('CONFIG_SOURCE_POINTER_MISMATCH')===-1?'PASS':'BLOCKED',{sourcePointer:String(cfgValues.SPREADSHEET_ID || ''),expectedSource:pointSource});

  var dedupe=function (arr) { var seen={}; return arr.filter(function (x) { x=String(x); if (seen[x]) return false; seen[x]=true; return true; }); };
  blockers=dedupe(blockers); warnings=dedupe(warnings);
  return {
    version:'BDR-CANDIDATE-VALIDATION-1.0',
    recoveryPointId:String(recoveryPointId || ''),
    candidateSpreadsheetId:String(candidateSpreadsheetId || ''),
    status:blockers.length?'INVALID':'VALID',
    valid:blockers.length===0,
    validatedAt:bdrV10Iso_(bdrV10Now_()),
    blockers:blockers,
    warnings:warnings,
    checks:checks,
    productionPointerAtValidation:currentPointer,
    dataBisnisDiubah:false,
    spreadsheetPointerDiubah:false
  };
}

function bdrV10CreateCandidate_(recoveryPointId) {
  var startedAt=bdrV10Now_();
  var root=bdrV10ResolveRoot_();
  if (!root.valid) return {sukses:false,code:root.code || 'BDR_ROOT_UNAVAILABLE',dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var verify=bdrV10VerifyRecoveryPoint_(recoveryPointId);
  if (!verify.sukses) return {sukses:false,code:'RECOVERY_POINT_NOT_VERIFIED',verify:verify,dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var pointFolder=bdrV10FindRecoveryPointFolder_(root.folder,recoveryPointId);
  var point=bdrV10ReadJsonFile_(pointFolder,BDR_V10_MANIFEST_NAME_).value;
  var backupSpreadsheetId=String(point.backup && point.backup.spreadsheetId || '');
  if (!backupSpreadsheetId) return {sukses:false,code:'BACKUP_SPREADSHEET_ID_MISSING',dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var beforePointer=String(portalScriptProperties_().getProperty('SPREADSHEET_ID') || '');
  var candidateId=bdrV10BuildCandidateId_(recoveryPointId,startedAt,Utilities.getUuid());
  var candidatesRoot=bdrV10CandidateRoot_(root.folder,true);
  var folder=candidatesRoot.createFolder(candidateId);
  var candidateManifest={
    schemaVersion:'BDR-RECOVERY-CANDIDATE-1.0',
    bdrVersion:BACKUP_DISASTER_RECOVERY_V10_VERSION_,
    candidateId:candidateId,
    recoveryPointId:String(recoveryPointId || ''),
    status:'CREATED',
    createdAt:bdrV10Iso_(startedAt),
    validatedAt:'',
    sourceBackupSpreadsheetId:backupSpreadsheetId,
    candidateSpreadsheetId:'',
    candidateFileName:'',
    appVersion:String(typeof APP_VERSION!=='undefined'?APP_VERSION:''),
    validation:{status:'PENDING',blockers:[],warnings:[]}
  };
  bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_MANIFEST_NAME_,candidateManifest);
  try {
    var backupFile=DriveApp.getFileById(backupSpreadsheetId);
    var fileName='Database_Kinerja_Recovery_Candidate_' + candidateId;
    var candidateFile=backupFile.makeCopy(fileName,folder);
    candidateManifest.candidateSpreadsheetId=String(candidateFile.getId());
    candidateManifest.candidateFileName=fileName;
    candidateManifest.status='VALIDATING';
    bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_MANIFEST_NAME_,candidateManifest);
    var validation=bdrV10DeepValidateCandidate_(candidateManifest.candidateSpreadsheetId,recoveryPointId);
    candidateManifest.status=validation.valid?'VALID':'INVALID';
    candidateManifest.validatedAt=validation.validatedAt;
    candidateManifest.validation={status:validation.status,blockers:validation.blockers.slice(),warnings:validation.warnings.slice()};
    var afterPointer=String(portalScriptProperties_().getProperty('SPREADSHEET_ID') || '');
    if (afterPointer!==beforePointer) {
      validation.valid=false; validation.status='INVALID';
      validation.blockers.push('PRODUCTION_POINTER_CHANGED_DURING_CANDIDATE');
      candidateManifest.status='INVALID';
      candidateManifest.validation.status='INVALID';
      candidateManifest.validation.blockers=validation.blockers.slice();
    }
    bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_VALIDATION_NAME_,validation);
    bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_MANIFEST_NAME_,candidateManifest);
    return {
      sukses:validation.valid===true,
      code:validation.valid?'CANDIDATE_VALID':'CANDIDATE_INVALID',
      candidateId:candidateId,
      recoveryPointId:String(recoveryPointId || ''),
      candidateSpreadsheetId:candidateManifest.candidateSpreadsheetId,
      status:candidateManifest.status,
      validation:validation,
      productionSpreadsheetIdBefore:beforePointer,
      productionSpreadsheetIdAfter:afterPointer,
      dataBisnisDiubah:false,
      spreadsheetPointerDiubah:false
    };
  } catch (e) {
    candidateManifest.status='INVALID';
    candidateManifest.validation={status:'INVALID',blockers:['CANDIDATE_CREATE_FAILED'],warnings:[]};
    candidateManifest.error=String(e && e.message ? e.message : e);
    try { bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_MANIFEST_NAME_,candidateManifest); } catch (eWrite) { }
    return {sukses:false,code:'CANDIDATE_CREATE_FAILED',candidateId:candidateId,error:candidateManifest.error,dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  }
}

function bdrV10ValidateCandidateById_(candidateId) {
  var root=bdrV10ResolveRoot_();
  if (!root.valid) return {sukses:false,code:root.code || 'BDR_ROOT_UNAVAILABLE',dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var folder=bdrV10FindCandidateFolder_(root.folder,candidateId);
  if (!folder) return {sukses:false,code:'CANDIDATE_NOT_FOUND',candidateId:String(candidateId || ''),dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var manifest=bdrV10CandidateManifest_(folder);
  if (!manifest) return {sukses:false,code:'CANDIDATE_MANIFEST_MISSING',candidateId:String(candidateId || ''),dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var parentVerify=bdrV10VerifyRecoveryPoint_(String(manifest.recoveryPointId || ''));
  if (!parentVerify.sukses) return {sukses:false,code:'RECOVERY_POINT_NOT_VERIFIED',candidateId:String(candidateId || ''),recoveryPointId:String(manifest.recoveryPointId || ''),verify:parentVerify,dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
  var validation=bdrV10DeepValidateCandidate_(String(manifest.candidateSpreadsheetId || ''),String(manifest.recoveryPointId || ''));
  manifest.status=validation.valid?'VALID':'INVALID';
  manifest.validatedAt=validation.validatedAt;
  manifest.validation={status:validation.status,blockers:validation.blockers.slice(),warnings:validation.warnings.slice()};
  bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_VALIDATION_NAME_,validation);
  bdrV10WriteJsonFile_(folder,BDR_V10_CANDIDATE_MANIFEST_NAME_,manifest);
  return {sukses:validation.valid===true,code:validation.valid?'CANDIDATE_VALID':'CANDIDATE_INVALID',candidateId:String(candidateId || ''),recoveryPointId:String(manifest.recoveryPointId || ''),candidateSpreadsheetId:String(manifest.candidateSpreadsheetId || ''),status:manifest.status,validation:validation,dataBisnisDiubah:false,spreadsheetPointerDiubah:false};
}
function bdrV10SetLastRun_(payload) {
  try { portalScriptProperties_().setProperty(BDR_V10_LAST_RUN_PROP_, JSON.stringify(payload || {})); } catch (e) { }
}

function bdrV10BuildLastRun_(status, code, startedAt, completedAt, extra) {
  var out = {
    status:String(status || ''),
    code:String(code || ''),
    startedAt:bdrV10Iso_(startedAt),
    completedAt:bdrV10Iso_(completedAt),
    appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
    version:BACKUP_DISASTER_RECOVERY_V10_VERSION_
  };
  Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

function bdrV10CreateRecoveryPoint_(options) {
  options = options || {};
  var startedAt = bdrV10Now_();
  var type = String(options.type || 'MANUAL').toUpperCase();
  if (['AUTO_DAILY','MANUAL','PRE_MAINTENANCE','DR_DRILL'].indexOf(type) === -1) type = 'MANUAL';
  var runId = String(options.runId || Utilities.getUuid());
  var claim = bdrV10ClaimRun_(runId, type);
  if (!claim.claimed) {
    var busy = bdrV10BuildLastRun_('SKIPPED', claim.code || 'LOCK_BUSY', startedAt, bdrV10Now_(), { type:type, runId:runId });
    bdrV10SetLastRun_(busy);
    return { sukses:false, code:claim.code || 'LOCK_BUSY', lastRun:busy, dataBisnisDiubah:false };
  }

  var pointFolder = null;
  var manifest = null;
  var backupId = '';
  var sourceId = '';
  var rootInfo = null;
  try {
    var props = portalScriptProperties_();
    sourceId = String(props.getProperty('SPREADSHEET_ID') || '').trim();
    if (!sourceId) throw new Error('BDR_SOURCE_NOT_CONFIGURED');
    rootInfo = bdrV10ResolveRoot_();
    if (!rootInfo.valid) throw new Error(rootInfo.code || 'BDR_ROOT_UNAVAILABLE');

    backupId = bdrV10BuildBackupId_(type, startedAt, runId);
    pointFolder = bdrV10RecoveryPointFolder_(rootInfo.folder, backupId, startedAt, true);
    var stableGitSha = String(props.getProperty(BDR_V10_STABLE_GIT_SHA_PROP_) || '').trim();
    var warnings = [];
    if (!stableGitSha) warnings.push('STABLE_GIT_SHA_NOT_CONFIGURED');
    else if (!/^[0-9a-f]{40}$/i.test(stableGitSha)) warnings.push('STABLE_GIT_SHA_INVALID_FORMAT');

    manifest = {
      schemaVersion:'BDR-RECOVERY-POINT-1.0',
      bdrVersion:BACKUP_DISASTER_RECOVERY_V10_VERSION_,
      backupId:backupId,
      type:type,
      status:'CREATING',
      createdAt:bdrV10Iso_(startedAt),
      completedAt:'',
      appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
      stableGitSha:stableGitSha,
      designBaselineGitSha:BDR_V10_DESIGN_BASELINE_GIT_SHA_,
      rootFolderId:rootInfo.folderId,
      source:{ spreadsheetId:sourceId },
      backup:{ spreadsheetId:'', fileName:'' },
      verification:{ status:'PENDING', issues:[], warnings:warnings.slice(), verifiedAt:'' },
      evidence:{ status:'NOT_CHECKED', implemented:false },
      retention:{ pinned:!!options.pinned, incidentRef:String(options.incidentRef || ''), classes:[] }
    };
    bdrV10WriteJsonFile_(pointFolder, BDR_V10_MANIFEST_NAME_, manifest);

    var configSnapshot = bdrV10SnapshotConfig_();
    var triggerSnapshot = bdrV10SnapshotTriggers_();
    var evidenceSnapshot = bdrV10EvidencePlaceholder_();

    var sourceSs = SpreadsheetApp.openById(sourceId);
    var sourceBefore = bdrV10FingerprintSpreadsheet_(sourceSs);

    var sourceFile = DriveApp.getFileById(sourceId);
    var backupFileName = 'Database_Kinerja_Backup_' + backupId;
    var backupFile = sourceFile.makeCopy(backupFileName, pointFolder);
    var backupSpreadsheetId = String(backupFile.getId());
    manifest.backup.spreadsheetId = backupSpreadsheetId;
    manifest.backup.fileName = backupFileName;
    manifest.status = 'VERIFYING';

    var sourceAfter = bdrV10FingerprintSpreadsheet_(SpreadsheetApp.openById(sourceId));
    var backupSs = SpreadsheetApp.openById(backupSpreadsheetId);
    var backupFp = bdrV10FingerprintSpreadsheet_(backupSs);
    evidenceSnapshot = bdrV10BuildEvidenceInventory_(backupSs, { metadataBudget:BDR_V10_EVIDENCE_METADATA_BUDGET_ });
    var stableCmp = bdrV10CompareFingerprints_(sourceBefore, sourceAfter);
    var backupCmp = bdrV10CompareFingerprints_(sourceAfter, backupFp);
    var issues = [];
    var verifyWarnings = warnings.slice();
    stableCmp.warnings.concat(backupCmp.warnings).forEach(function (x) { if (verifyWarnings.indexOf(x) === -1) verifyWarnings.push(x); });
    if (evidenceSnapshot.status === 'UNAVAILABLE') verifyWarnings.push('EVIDENCE_INVENTORY_UNAVAILABLE');
    if (evidenceSnapshot.status === 'MISSING_FOUND') verifyWarnings.push('EVIDENCE_MISSING_FOUND');
    if (!stableCmp.ok) issues.push('SOURCE_CHANGED_DURING_BACKUP');
    backupCmp.issues.forEach(function (x) { issues.push('BACKUP_' + x); });

    var fpPayload = {
      version:'BDR-FINGERPRINT-PACK-1.0',
      capturedAt:bdrV10Iso_(bdrV10Now_()),
      sourceBefore:sourceBefore,
      sourceAfter:sourceAfter,
      backup:backupFp,
      sourceStable:stableCmp.ok,
      backupMatches:backupCmp.ok,
      issues:issues.slice(),
      warnings:verifyWarnings.slice()
    };

    var fpFile = bdrV10WriteJsonFile_(pointFolder, BDR_V10_FINGERPRINTS_NAME_, fpPayload);
    var cfgFile = bdrV10WriteJsonFile_(pointFolder, BDR_V10_CONFIG_NAME_, configSnapshot);
    var trgFile = bdrV10WriteJsonFile_(pointFolder, BDR_V10_TRIGGERS_NAME_, triggerSnapshot);
    var evFile = bdrV10WriteJsonFile_(pointFolder, BDR_V10_EVIDENCE_NAME_, evidenceSnapshot);

    var verified = issues.length === 0;
    var completedAt = bdrV10Now_();
    manifest.status = verified ? 'VERIFIED' : 'FAILED';
    manifest.completedAt = bdrV10Iso_(completedAt);
    manifest.verification = {
      status: verified ? 'VERIFIED' : 'FAILED',
      sourceStable: stableCmp.ok,
      backupMatches: backupCmp.ok,
      issues: issues.slice(),
      warnings: verifyWarnings.slice(),
      verifiedAt: verified ? bdrV10Iso_(completedAt) : ''
    };
    manifest.evidence = bdrV10EvidenceSummary_(evidenceSnapshot);
    manifest.files = {
      fingerprints:{ name:BDR_V10_FINGERPRINTS_NAME_, fileId:String(fpFile.getId ? fpFile.getId() : '') },
      config:{ name:BDR_V10_CONFIG_NAME_, fileId:String(cfgFile.getId ? cfgFile.getId() : '') },
      triggers:{ name:BDR_V10_TRIGGERS_NAME_, fileId:String(trgFile.getId ? trgFile.getId() : '') },
      evidence:{ name:BDR_V10_EVIDENCE_NAME_, fileId:String(evFile.getId ? evFile.getId() : '') },
      checksums:{ name:BDR_V10_CHECKSUM_NAME_ }
    };

    var manifestText = bdrV10SafeJson_(manifest);
    bdrV10WriteTextFile_(pointFolder, BDR_V10_MANIFEST_NAME_, manifestText);
    var checksumEntries = [
      { name:BDR_V10_FINGERPRINTS_NAME_, text:bdrV10SafeJson_(fpPayload) },
      { name:BDR_V10_CONFIG_NAME_, text:bdrV10SafeJson_(configSnapshot) },
      { name:BDR_V10_TRIGGERS_NAME_, text:bdrV10SafeJson_(triggerSnapshot) },
      { name:BDR_V10_EVIDENCE_NAME_, text:bdrV10SafeJson_(evidenceSnapshot) }
    ];
    bdrV10WriteTextFile_(pointFolder, BDR_V10_CHECKSUM_NAME_, bdrV10BuildChecksumText_(checksumEntries, manifestText, backupFp.overallHash, backupFileName));

    if (!verified) {
      var failCode = issues.indexOf('SOURCE_CHANGED_DURING_BACKUP') !== -1 ? 'SOURCE_CHANGED_DURING_BACKUP' : 'BACKUP_VERIFY_FAILED';
      var failedRun = bdrV10BuildLastRun_('FAILED', failCode, startedAt, completedAt, { type:type, runId:runId, backupId:backupId, recoveryPointFolderId:String(pointFolder.getId ? pointFolder.getId() : ''), issues:issues });
      bdrV10SetLastRun_(failedRun);
      bdrV10Audit_('BACKUP_FAILED', failedRun);
      return { sukses:false, code:failCode, backupId:backupId, manifest:manifest, lastRun:failedRun, dataBisnisDiubah:false };
    }

    props.setProperty(BDR_V10_LAST_VERIFIED_PROP_, backupId);
    var retentionResult = null;
    if (options.applyRetention !== false) {
      try {
        retentionResult = bdrV10ApplyRetention_(rootInfo.folder, completedAt, false);
        var selfRetention = retentionResult && retentionResult.plan && (retentionResult.plan.keep || []).filter(function (x) { return String(x.backupId || '') === backupId; })[0];
        if (selfRetention) manifest.retention.classes = (selfRetention.classes || []).slice();
      } catch (eRetention) { verifyWarnings.push('RETENTION_FAILED:' + String(eRetention && eRetention.message || eRetention)); }
    }
    manifest.verification.warnings = verifyWarnings.slice();
    var finalManifestText = bdrV10SafeJson_(manifest);
    bdrV10WriteTextFile_(pointFolder, BDR_V10_MANIFEST_NAME_, finalManifestText);
    bdrV10WriteTextFile_(pointFolder, BDR_V10_CHECKSUM_NAME_, bdrV10BuildChecksumText_(checksumEntries, finalManifestText, backupFp.overallHash, backupFileName));
    var okRun = bdrV10BuildLastRun_('SUCCESS', 'VERIFIED', startedAt, completedAt, {
      type:type,
      runId:runId,
      backupId:backupId,
      recoveryPointFolderId:String(pointFolder.getId ? pointFolder.getId() : ''),
      backupSpreadsheetId:backupSpreadsheetId,
      warnings:verifyWarnings,
      retention:retentionResult ? { deleteCount:retentionResult.deleteCount, keptCount:retentionResult.keptCount } : null
    });
    bdrV10SetLastRun_(okRun);
    bdrV10Audit_('BACKUP_VERIFIED', okRun);
    return { sukses:true, code:'VERIFIED', backupId:backupId, manifest:manifest, lastRun:okRun, retention:retentionResult, dataBisnisDiubah:false };
  } catch (e) {
    var code = String(e && e.message || e || 'BDR_BACKUP_FAILED');
    if (code.indexOf(':') !== -1) code = code.split(':')[0];
    var completed = bdrV10Now_();
    if (manifest && pointFolder) {
      try {
        manifest.status = 'FAILED';
        manifest.completedAt = bdrV10Iso_(completed);
        manifest.verification = manifest.verification || {};
        manifest.verification.status = 'FAILED';
        manifest.verification.issues = [code];
        bdrV10WriteJsonFile_(pointFolder, BDR_V10_MANIFEST_NAME_, manifest);
      } catch (eManifest) { }
    }
    var failed = bdrV10BuildLastRun_('FAILED', code, startedAt, completed, { type:type, runId:runId, backupId:backupId || '', message:String(e && e.message || e) });
    bdrV10SetLastRun_(failed);
    bdrV10Audit_('BACKUP_FAILED', failed);
    return { sukses:false, code:code, backupId:backupId || '', lastRun:failed, dataBisnisDiubah:false };
  } finally {
    bdrV10ReleaseRun_(runId);
  }
}

function bdrV10ParseDateMs_(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  var d = new Date(String(value || ''));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function bdrV10IsoWeekKey_(date) {
  var d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (isNaN(d.getTime())) return '';
  var u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  var day = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - day);
  var yearStart = new Date(Date.UTC(u.getUTCFullYear(), 0, 1));
  var week = Math.ceil((((u - yearStart) / 86400000) + 1) / 7);
  return u.getUTCFullYear() + '-W' + ('0' + week).slice(-2);
}

function bdrV10MonthKey_(date) {
  var d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2);
}

function bdrV10RetentionAgeDays_(nowMs, createdMs) {
  return Math.max(0, (nowMs - createdMs) / 86400000);
}

function bdrV10BuildRetentionPlan_(points, now) {
  var nowDate = now instanceof Date ? now : new Date(now || bdrV10Now_());
  var nowMs = nowDate.getTime();
  var items = (points || []).map(function (p) {
    var x = {};
    Object.keys(p || {}).forEach(function (k) { if (k !== '_folder') x[k] = p[k]; });
    x.createdMs = bdrV10ParseDateMs_(p.createdAt || p.completedAt || 0);
    x.ageDays = x.createdMs ? bdrV10RetentionAgeDays_(nowMs, x.createdMs) : Number.POSITIVE_INFINITY;
    x.keep = false;
    x.delete = false;
    x.classes = [];
    x.reasons = [];
    return x;
  });
  var byId = {};
  items.forEach(function (x) { byId[x.backupId] = x; });
  function keep(id, cls, reason) {
    var x = byId[id]; if (!x) return;
    x.keep = true; x.delete = false;
    if (x.classes.indexOf(cls) === -1) x.classes.push(cls);
    if (reason && x.reasons.indexOf(reason) === -1) x.reasons.push(reason);
  }
  function del(id, reason) {
    var x = byId[id]; if (!x || x.keep) return;
    x.delete = true;
    if (reason && x.reasons.indexOf(reason) === -1) x.reasons.push(reason);
  }

  items.forEach(function (x) {
    if (x.pinned === true) keep(x.backupId, 'PINNED', 'PINNED_NEVER_DELETE');
    if (String(x.incidentRef || '').trim()) keep(x.backupId, 'INCIDENT', 'INCIDENT_NEVER_DELETE');
    if (x.manifestValid === false) keep(x.backupId, 'INVALID_MANIFEST', 'DELETE_GUARD_INVALID_MANIFEST');
  });

  var auto = items.filter(function (x) { return x.type === 'AUTO_DAILY' && x.status === 'VERIFIED' && !x.keep; })
    .sort(function (a, b) { return b.createdMs - a.createdMs; });
  auto.slice(0, BDR_V10_RETENTION_.daily).forEach(function (x) { keep(x.backupId, 'DAILY', 'DAILY_LATEST'); });

  var weeklyRep = {}, monthlyRep = {};
  auto.forEach(function (x) {
    var d = new Date(x.createdMs);
    var wk = bdrV10IsoWeekKey_(d), mk = bdrV10MonthKey_(d);
    if (wk && !weeklyRep[wk]) weeklyRep[wk] = x;
    if (mk && !monthlyRep[mk]) monthlyRep[mk] = x;
  });
  Object.keys(weeklyRep).sort(function (a, b) { return weeklyRep[b].createdMs - weeklyRep[a].createdMs; })
    .slice(0, BDR_V10_RETENTION_.weekly).forEach(function (k) { keep(weeklyRep[k].backupId, 'WEEKLY', 'WEEKLY_REPRESENTATIVE'); });
  Object.keys(monthlyRep).sort(function (a, b) { return monthlyRep[b].createdMs - monthlyRep[a].createdMs; })
    .slice(0, BDR_V10_RETENTION_.monthly).forEach(function (k) { keep(monthlyRep[k].backupId, 'MONTHLY', 'MONTHLY_REPRESENTATIVE'); });
  auto.forEach(function (x) { if (!byId[x.backupId].keep) del(x.backupId, 'AUTO_GFS_EXPIRED'); });

  var manuals = items.filter(function (x) { return x.type === 'MANUAL' && !x.keep; }).sort(function (a, b) { return b.createdMs - a.createdMs; });
  manuals.forEach(function (x, idx) {
    if (x.ageDays <= BDR_V10_RETENTION_.manualDays && idx < BDR_V10_RETENTION_.manualMax) keep(x.backupId, 'MANUAL', 'MANUAL_WINDOW');
    else del(x.backupId, 'MANUAL_EXPIRED_OR_OVER_LIMIT');
  });

  var pre = items.filter(function (x) { return x.type === 'PRE_MAINTENANCE' && !x.keep; }).sort(function (a, b) { return b.createdMs - a.createdMs; });
  pre.forEach(function (x, idx) {
    if (x.ageDays <= BDR_V10_RETENTION_.preMaintenanceMinDays) keep(x.backupId, 'PRE_MAINTENANCE', 'PRE_MAINTENANCE_MIN_DAYS');
    else if (idx < BDR_V10_RETENTION_.preMaintenanceMax) keep(x.backupId, 'PRE_MAINTENANCE', 'PRE_MAINTENANCE_RECENT');
    else del(x.backupId, 'PRE_MAINTENANCE_EXPIRED_OR_OVER_LIMIT');
  });

  items.filter(function (x) { return x.status === 'FAILED' && !x.keep; }).forEach(function (x) {
    if (x.ageDays <= BDR_V10_RETENTION_.failedDays) keep(x.backupId, 'FAILED_DIAGNOSTIC', 'FAILED_DIAGNOSTIC_WINDOW');
    else del(x.backupId, 'FAILED_EXPIRED');
  });

  items.filter(function (x) { return !x.keep && !x.delete; }).forEach(function (x) {
    keep(x.backupId, 'PROTECTED_UNKNOWN', 'UNRECOGNIZED_OR_IN_PROGRESS');
  });

  return {
    version:'BDR-RETENTION-1.0',
    generatedAt:bdrV10Iso_(nowDate),
    keep:items.filter(function (x) { return x.keep; }),
    delete:items.filter(function (x) { return x.delete && !x.keep; }),
    total:items.length,
    keptCount:items.filter(function (x) { return x.keep; }).length,
    deleteCount:items.filter(function (x) { return x.delete && !x.keep; }).length
  };
}

function bdrV10ManifestFromFolder_(folder) {
  try {
    var m = bdrV10ReadJsonFile_(folder, BDR_V10_MANIFEST_NAME_);
    if (!m || !m.value || String(m.value.backupId || '') !== String(folder.getName ? folder.getName() : '')) {
      return { valid:false, manifest:null, code:'INVALID_MANIFEST' };
    }
    return { valid:true, manifest:m.value, code:'OK' };
  } catch (e) {
    return { valid:false, manifest:null, code:'INVALID_MANIFEST' };
  }
}

function bdrV10ListRecoveryPoints_(rootFolder) {
  var out = [];
  var rp = bdrV10GetSingleChildFolder_(rootFolder, BDR_V10_FOLDER_RECOVERY_POINTS_, false);
  if (!rp) return out;
  var years = rp.getFolders();
  while (years.hasNext()) {
    var yf = years.next();
    var months = yf.getFolders();
    while (months.hasNext()) {
      var mf = months.next();
      var points = mf.getFolders();
      while (points.hasNext()) {
        var pf = points.next();
        var parsed = bdrV10ManifestFromFolder_(pf);
        if (!parsed.valid) {
          out.push({ backupId:String(pf.getName ? pf.getName() : ''), manifestValid:false, type:'', status:'', createdAt:'', pinned:false, incidentRef:'', _folder:pf });
          continue;
        }
        var m = parsed.manifest;
        out.push({
          backupId:String(m.backupId || ''),
          manifestValid:true,
          type:String(m.type || ''),
          status:String(m.status || ''),
          createdAt:String(m.createdAt || ''),
          completedAt:String(m.completedAt || ''),
          pinned:!!(m.retention && m.retention.pinned),
          incidentRef:String(m.retention && m.retention.incidentRef || ''),
          _folder:pf
        });
      }
    }
  }
  return out;
}

function bdrV10ApplyRetention_(rootFolder, now, dryRun) {
  var points = bdrV10ListRecoveryPoints_(rootFolder);
  var plan = bdrV10BuildRetentionPlan_(points, now || bdrV10Now_());
  var byId = {};
  points.forEach(function (x) { byId[x.backupId] = x; });
  var trashed = [], blocked = [];
  if (dryRun !== true) {
    plan.delete.forEach(function (x) {
      var p = byId[x.backupId];
      if (!p || !p._folder || p.manifestValid !== true) {
        blocked.push({ backupId:x.backupId, code:'DELETE_GUARD_INVALID_MANIFEST' });
        return;
      }
      var parsed = bdrV10ManifestFromFolder_(p._folder);
      if (!parsed.valid || String(parsed.manifest.backupId || '') !== String(p._folder.getName ? p._folder.getName() : '')) {
        blocked.push({ backupId:x.backupId, code:'DELETE_GUARD_MANIFEST_NAME_MISMATCH' });
        return;
      }
      p._folder.setTrashed(true);
      trashed.push(x.backupId);
    });
  }
  return {
    sukses:true,
    version:plan.version,
    dryRun:dryRun === true,
    total:plan.total,
    keptCount:plan.keptCount,
    deleteCount:plan.deleteCount,
    trashed:trashed,
    blocked:blocked,
    plan:plan
  };
}

function bdrV10FindRecoveryPointFolder_(rootFolder, backupId) {
  var points = bdrV10ListRecoveryPoints_(rootFolder);
  for (var i = 0; i < points.length; i++) if (String(points[i].backupId) === String(backupId)) return points[i]._folder;
  return null;
}

function bdrV10ParseChecksum_(text) {
  var out = {};
  String(text || '').split(/\r?\n/).forEach(function (line) {
    if (!line.trim()) return;
    var m = line.match(/^([0-9a-f]{64})\s{2}(.+?)(?: \[LOGICAL_FINGERPRINT\])?$/i);
    if (m) out[m[2]] = m[1].toLowerCase();
  });
  return out;
}

function bdrV10VerifyRecoveryPoint_(backupId) {
  var root = bdrV10ResolveRoot_();
  if (!root.valid) return { sukses:false, code:root.code || 'BDR_ROOT_UNAVAILABLE', backupId:String(backupId || '') };
  var folder = bdrV10FindRecoveryPointFolder_(root.folder, backupId);
  if (!folder) return { sukses:false, code:'RECOVERY_POINT_NOT_FOUND', backupId:String(backupId || '') };
  var manifestPack = bdrV10ReadJsonFile_(folder, BDR_V10_MANIFEST_NAME_);
  var fpPack = bdrV10ReadJsonFile_(folder, BDR_V10_FINGERPRINTS_NAME_);
  var cfgPack = bdrV10ReadTextFile_(folder, BDR_V10_CONFIG_NAME_);
  var trgPack = bdrV10ReadTextFile_(folder, BDR_V10_TRIGGERS_NAME_);
  var evPack = bdrV10ReadTextFile_(folder, BDR_V10_EVIDENCE_NAME_);
  var sumPack = bdrV10ReadTextFile_(folder, BDR_V10_CHECKSUM_NAME_);
  if (!manifestPack || !fpPack || !cfgPack || !trgPack || !evPack || !sumPack) return { sukses:false, code:'RECOVERY_POINT_FILE_MISSING', backupId:String(backupId || '') };
  var manifest = manifestPack.value;
  if (String(manifest.backupId || '') !== String(backupId || '')) return { sukses:false, code:'MANIFEST_BACKUP_ID_MISMATCH', backupId:String(backupId || '') };
  var storedPack = fpPack.value || {};
  if (String(manifest.status || '') !== 'VERIFIED' || storedPack.sourceStable !== true || storedPack.backupMatches !== true || (storedPack.issues || []).length) {
    return { sukses:false, code:'RECOVERY_POINT_NOT_VERIFIED', backupId:String(backupId || ''), issues:(storedPack.issues || []).slice(), manifestStatus:String(manifest.status || ''), dataBisnisDiubah:false };
  }
  var checksum = bdrV10ParseChecksum_(sumPack.text);
  var metadataChecks = [
    [BDR_V10_FINGERPRINTS_NAME_, fpPack.text],
    [BDR_V10_CONFIG_NAME_, cfgPack.text],
    [BDR_V10_TRIGGERS_NAME_, trgPack.text],
    [BDR_V10_EVIDENCE_NAME_, evPack.text],
    [BDR_V10_MANIFEST_NAME_, manifestPack.text]
  ];
  var issues = [];
  metadataChecks.forEach(function (x) {
    if (!checksum[x[0]]) issues.push('CHECKSUM_ENTRY_MISSING:' + x[0]);
    else if (checksum[x[0]] !== bdrV10Sha256_(x[1])) issues.push('CHECKSUM_MISMATCH:' + x[0]);
  });
  var backupSpreadsheetId = String(manifest.backup && manifest.backup.spreadsheetId || '');
  if (!backupSpreadsheetId) issues.push('BACKUP_SPREADSHEET_ID_MISSING');
  var currentFp = null;
  if (backupSpreadsheetId) {
    try { currentFp = bdrV10FingerprintSpreadsheet_(SpreadsheetApp.openById(backupSpreadsheetId)); }
    catch (eOpen) { issues.push('BACKUP_SPREADSHEET_UNAVAILABLE'); }
  }
  if (currentFp) {
    var expectedFp = fpPack.value && fpPack.value.backup;
    var cmp = bdrV10CompareFingerprints_(expectedFp, currentFp);
    cmp.issues.forEach(function (x) { issues.push('BACKUP_' + x); });
    var expectedLogical = checksum[String(manifest.backup.fileName || '')];
    if (expectedLogical && expectedLogical !== String(currentFp.overallHash || '').toLowerCase()) issues.push('LOGICAL_FINGERPRINT_MISMATCH');
  }
  return {
    sukses:issues.length === 0,
    code:issues.length ? 'VERIFY_FAILED' : 'VERIFIED',
    backupId:String(backupId || ''),
    issues:issues,
    manifestStatus:String(manifest.status || ''),
    dataBisnisDiubah:false
  };
}

function maintenanceBuatRecoveryCandidateBDRV10(recoveryPointId) {
  var ctx = pastikanMaintainerPortal3B0_('BUAT_RECOVERY_CANDIDATE_BDR_V10');
  var result = bdrV10CreateCandidate_(recoveryPointId);
  try { catatMaintenancePortal3B0_(ctx, result.sukses ? 'SUCCESS' : 'FAILED', result); } catch (e) { }
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function maintenanceDryRunRecoveryBDRV10(candidateId) {
  var ctx = pastikanMaintainerPortal3B0_('DRY_RUN_RECOVERY_BDR_V10');
  var result = bdrV10ValidateCandidateById_(candidateId);
  try { catatMaintenancePortal3B0_(ctx, result.sukses ? 'SUCCESS' : 'FAILED', result); } catch (e) { }
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function bdrV10SchedulerStatus_() {
  var snapshot = bdrV10SnapshotTriggers_();
  var known = snapshot.known.filter(function (x) { return x.functionName === BDR_V10_TRIGGER_FUNCTION_; })[0] || { actualCount:0 };
  var last = null;
  try {
    var raw = portalScriptProperties_().getProperty(BDR_V10_LAST_RUN_PROP_);
    if (raw) last = JSON.parse(raw);
  } catch (e) { }
  return { installed:Number(known.actualCount || 0) > 0, triggerCount:Number(known.actualCount || 0), cadence:'DAILY_AROUND_02_WIB', lastRun:last };
}

function prosesBackupOtomatisBDRV10() {
  var first = bdrV10CreateRecoveryPoint_({ type:'AUTO_DAILY', applyRetention:true });
  if (!first.sukses && first.code === 'SOURCE_CHANGED_DURING_BACKUP') {
    var second = bdrV10CreateRecoveryPoint_({ type:'AUTO_DAILY', applyRetention:true });
    second.retryOf = first.backupId || '';
    second.retryCount = 1;
    return second;
  }
  first.retryCount = 0;
  return first;
}

function maintenanceBuatBackupBDRV10(options) {
  var ctx = pastikanMaintainerPortal3B0_('BUAT_BACKUP_BDR_V10');
  var result = bdrV10CreateRecoveryPoint_({
    type:'MANUAL',
    pinned:!!(options && options.pinned),
    incidentRef:String(options && options.incidentRef || ''),
    applyRetention:!(options && options.applyRetention === false)
  });
  try { catatMaintenancePortal3B0_(ctx, result.sukses ? 'SUCCESS' : 'FAILED', result); } catch (e) { }
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function maintenanceBuatPreMaintenanceBackupBDRV10(options) {
  var ctx = pastikanMaintainerPortal3B0_('BUAT_PRE_MAINTENANCE_BACKUP_BDR_V10');
  var result = bdrV10CreateRecoveryPoint_({
    type:'PRE_MAINTENANCE',
    pinned:!!(options && options.pinned),
    incidentRef:String(options && options.incidentRef || ''),
    applyRetention:!(options && options.applyRetention === false)
  });
  try { catatMaintenancePortal3B0_(ctx, result.sukses ? 'SUCCESS' : 'FAILED', result); } catch (e) { }
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function maintenanceVerifikasiBackupBDRV10(recoveryPointId) {
  var ctx = pastikanMaintainerPortal3B0_('VERIFIKASI_BACKUP_BDR_V10');
  var result = bdrV10VerifyRecoveryPoint_(recoveryPointId);
  try { catatMaintenancePortal3B0_(ctx, result.sukses ? 'SUCCESS' : 'FAILED', result); } catch (e) { }
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function statusTriggerBackupBDRV10() {
  var maintainer = pastikanMaintainerPortal3B0_('STATUS_TRIGGER_BDR_V10');
  var st = bdrV10SchedulerStatus_();
  st.sukses = true;
  st.versi = BACKUP_DISASTER_RECOVERY_V10_VERSION_;
  st.appVersion = String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');
  st.maintainerVerified = !!maintainer;
  Logger.log(JSON.stringify(st, null, 2));
  return st;
}

function pasangTriggerBackupBDRV10() {
  var maintainer = pastikanMaintainerPortal3B0_('PASANG_TRIGGER_BDR_V10');
  var triggers = ScriptApp.getProjectTriggers() || [];
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    var handler = String(triggers[i].getHandlerFunction ? triggers[i].getHandlerFunction() : '');
    if (handler === BDR_V10_TRIGGER_FUNCTION_) {
      if (count === 0) count++;
      else ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  if (count === 0) ScriptApp.newTrigger(BDR_V10_TRIGGER_FUNCTION_).timeBased().atHour(2).everyDays(1).create();
  var st = bdrV10SchedulerStatus_();
  bdrV10Audit_('BACKUP_TRIGGER_ENABLED', { cadence:'DAILY_AROUND_02_WIB', appVersion:String(APP_VERSION || '') });
  return { sukses:st.installed === true && st.triggerCount === 1, versi:BACKUP_DISASTER_RECOVERY_V10_VERSION_, installed:st.installed, triggerCount:st.triggerCount, cadence:st.cadence, maintainerVerified:!!maintainer };
}

function hapusTriggerBackupBDRV10() {
  var maintainer = pastikanMaintainerPortal3B0_('HAPUS_TRIGGER_BDR_V10');
  var triggers = ScriptApp.getProjectTriggers() || [];
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    var handler = String(triggers[i].getHandlerFunction ? triggers[i].getHandlerFunction() : '');
    if (handler === BDR_V10_TRIGGER_FUNCTION_) { ScriptApp.deleteTrigger(triggers[i]); removed++; }
  }
  bdrV10Audit_('BACKUP_TRIGGER_DISABLED', { removed:removed, appVersion:String(APP_VERSION || '') });
  return { sukses:true, versi:BACKUP_DISASTER_RECOVERY_V10_VERSION_, removed:removed, maintainerVerified:!!maintainer };
}

// Validator sintetis: tidak membuat backup, tidak menulis database/Drive, tidak memasang trigger.
function validasiBackupDisasterRecoveryV10() {
  var checks = [];
  function add(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail === null || typeof detail === 'undefined' ? '' : detail) }); }
  add('VERSION', BACKUP_DISASTER_RECOVERY_V10_VERSION_ === 'BDR-v1.0-RC1-BATCH-B-2026.10.05.01', BACKUP_DISASTER_RECOVERY_V10_VERSION_);
  add('APP_VERSION', String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') === '2026.10.05.01', String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''));
  add('CHUNK_250', BDR_V10_CHUNK_ROWS_ === 250, BDR_V10_CHUNK_ROWS_);
  add('LEASE_20_MIN', BDR_V10_LEASE_MS_ === 1200000, BDR_V10_LEASE_MS_);
  add('EVIDENCE_BUDGET_200', BDR_V10_EVIDENCE_METADATA_BUDGET_ === 200, BDR_V10_EVIDENCE_METADATA_BUDGET_);
  add('SECRET_GEMINI', BDR_V10_SECRET_KEYS_.indexOf('API_KEY_GEMINI') !== -1, BDR_V10_SECRET_KEYS_);
  add('SECRET_PIN_PEPPER', BDR_V10_SECRET_KEYS_.indexOf('PIN_PEPPER') !== -1, BDR_V10_SECRET_KEYS_);
  add('SESSION_EXCLUDED', BDR_V10_EXCLUDE_PREFIXES_.indexOf('PORTAL_SESSION_V2_') !== -1, BDR_V10_EXCLUDE_PREFIXES_);
  add('WRE_STATE_EXCLUDED', BDR_V10_EXCLUDE_PREFIXES_.indexOf('WRE_V10_EVENT_') !== -1 && BDR_V10_EXCLUDE_EXACT_.indexOf('WRE_V10_LAST_RUN') !== -1, BDR_V10_EXCLUDE_EXACT_);
  add('SPREADSHEET_POINTER_SNAPSHOTTED', BDR_V10_CONFIG_EXACT_.indexOf('SPREADSHEET_ID') !== -1, BDR_V10_CONFIG_EXACT_);
  add('RETENTION_DAILY_14', BDR_V10_RETENTION_.daily === 14, BDR_V10_RETENTION_.daily);
  add('RETENTION_WEEKLY_8', BDR_V10_RETENTION_.weekly === 8, BDR_V10_RETENTION_.weekly);
  add('RETENTION_MONTHLY_12', BDR_V10_RETENTION_.monthly === 12, BDR_V10_RETENTION_.monthly);
  add('FAILED_7_DAYS', BDR_V10_RETENTION_.failedDays === 7, BDR_V10_RETENTION_.failedDays);
  add('BACKUP_TRIGGER', typeof prosesBackupOtomatisBDRV10 === 'function', typeof prosesBackupOtomatisBDRV10);
  add('MAINTENANCE_MANUAL', typeof maintenanceBuatBackupBDRV10 === 'function', typeof maintenanceBuatBackupBDRV10);
  add('MAINTENANCE_PRE', typeof maintenanceBuatPreMaintenanceBackupBDRV10 === 'function', typeof maintenanceBuatPreMaintenanceBackupBDRV10);
  add('MAINTENANCE_VERIFY', typeof maintenanceVerifikasiBackupBDRV10 === 'function', typeof maintenanceVerifikasiBackupBDRV10);
  add('EVIDENCE_INVENTORY', typeof bdrV10BuildEvidenceInventory_ === 'function', typeof bdrV10BuildEvidenceInventory_);
  add('EVIDENCE_ID_EXTRACTOR', typeof bdrV10ExtractDriveFileId_ === 'function', typeof bdrV10ExtractDriveFileId_);
  add('CANDIDATE_CREATE_PRIVATE', typeof bdrV10CreateCandidate_ === 'function', typeof bdrV10CreateCandidate_);
  add('CANDIDATE_VALIDATE_PRIVATE', typeof bdrV10DeepValidateCandidate_ === 'function', typeof bdrV10DeepValidateCandidate_);
  add('MAINTENANCE_CANDIDATE', typeof maintenanceBuatRecoveryCandidateBDRV10 === 'function', typeof maintenanceBuatRecoveryCandidateBDRV10);
  add('MAINTENANCE_DRY_RUN', typeof maintenanceDryRunRecoveryBDRV10 === 'function', typeof maintenanceDryRunRecoveryBDRV10);
  add('REQUIRED_CORE_SHEETS', BDR_V10_REQUIRED_CORE_SHEETS_.indexOf('Rekap_Kinerja') !== -1 && BDR_V10_REQUIRED_CORE_SHEETS_.indexOf('Data_Pegawai') !== -1, BDR_V10_REQUIRED_CORE_SHEETS_);
  add('NO_ACTIVATION_BATCH_B', typeof maintenanceAktifkanRecoveryCandidateBDRV10 === 'undefined', typeof maintenanceAktifkanRecoveryCandidateBDRV10);
  add('NO_ROLLBACK_BATCH_B', typeof maintenanceRollbackRecoveryBDRV10 === 'undefined', typeof maintenanceRollbackRecoveryBDRV10);
  add('TRIGGER_INSTALLER', typeof pasangTriggerBackupBDRV10 === 'function', typeof pasangTriggerBackupBDRV10);
  var passed = checks.filter(function (x) { return x.lulus; }).length;
  var result = { sukses:passed === checks.length, valid:passed === checks.length, versi:BACKUP_DISASTER_RECOVERY_V10_VERSION_, appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), jumlah:checks.length, lulus:passed, gagal:checks.length-passed, checks:checks, batch:'B', dataBisnisDiubah:false };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
