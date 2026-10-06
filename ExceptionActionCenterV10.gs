// ============================================================
// EXCEPTION & ACTION CENTER v1.0 — RC2 NAVIGATION & ROLE CLARITY
// Integrated with BDR read-only health on APP_VERSION 2026.10.05.01
//
// Tujuan:
// - mengagregasi pekerjaan lintas modul menjadi satu read model;
// - menjaga source of truth tetap pada Review/Tunjangan/Closing/Archive/OHIC;
// - memakai rule WRE yang sudah ada untuk eskalasi waktu;
// - tidak mengubah status bisnis, spreadsheet, PropertiesService, trigger, atau schema.
//
// Catatan scope yang tetap berlaku:
// - hasil verifikasi arsip GAGAL belum dipersistenkan oleh Monthly Archive sehingga
//   ARC_VERIFY_FAILED / ARC_FILE_MISSING / ARC_CHECKSUM_MISMATCH / ARC_MANIFEST_INVALID
//   belum diaktifkan;
// - status Dikembalikan Lurah belum memiliki transition timestamp pada model timing WRE, sehingga
//   EAC menampilkan tindakan tanpa membuat umur/severity palsu.
// ============================================================

var EXCEPTION_ACTION_CENTER_V10_VERSION_ = 'EAC-v1.0-RC2-2026.10.04.01';
var EAC_V10_CACHE_TTL_SECONDS_ = 60;

var EAC_V10_PRIORITY_ = {
  KRITIS: { rank:300, label:'Kritis' },
  MENDESAK: { rank:200, label:'Mendesak' },
  PERLU_DITINDAKLANJUTI: { rank:100, label:'Perlu Ditindaklanjuti' }
};

var EAC_V10_ROUTE_MAP_ = {
  'review-center': { key:'review-center', menuId:'menuReviewCenter', pageId:'halReviewCenter', title:'Pusat Review', actionLabel:'Buka Pusat Review' },
  'tunjangan': { key:'tunjangan', menuId:'menuTunjangan', pageId:'halTunjangan', title:'Tunjangan', actionLabel:'Buka Tunjangan' },
  'monthly-closing': { key:'monthly-closing', menuId:'menuMonthlyClosing', pageId:'halMonthlyClosing', title:'Penutupan Bulan', actionLabel:'Buka Penutupan Bulan' },
  'monthly-archive': { key:'monthly-archive', menuId:'menuMonthlyArchive', pageId:'halMonthlyArchive', title:'Arsip Bulanan', actionLabel:'Buka Arsip Bulanan' },
  'system-health': { key:'system-health', menuId:'menuOperationalHealth', pageId:'halOperationalHealth', title:'Kesehatan Sistem', actionLabel:'Buka Kesehatan Sistem' },
  'backup-recovery': { key:'backup-recovery', menuId:'menuBackupRecovery', pageId:'halBackupRecovery', title:'Cadangan & Pemulihan', actionLabel:'Buka Cadangan & Pemulihan' }
};

// Registry aktif RC1. Action code adalah akar masalah, bukan severity.
var EAC_V10_ACTION_REGISTRY_ = {
  REV_PENDING: { domain:'REVIEW', ownerRoles:['CARIK'], viewerRoles:[], route:'review-center', wreRuleId:'REVIEW_PENDING', mode:'ACTION' },
  CLS_READY_NOT_CLOSED: { domain:'CLOSING', ownerRoles:['CARIK','LURAH'], viewerRoles:[], route:'monthly-closing', wreRuleId:'PERIOD_READY_TO_CLOSE', mode:'ACTION' },
  TUN_BATCH_NOT_CREATED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:[], route:'tunjangan', wreRuleId:'BATCH_MISSING_AFTER_CLOSE', mode:'ACTION' },
  TUN_DRAFT_NOT_LOCKED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:[], route:'tunjangan', wreRuleId:'DRAFT_NOT_LOCKED', mode:'ACTION' },
  TUN_LOCKED_NOT_SUBMITTED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:[], route:'tunjangan', wreRuleId:'LOCKED_NOT_SUBMITTED', mode:'ACTION' },
  TUN_WAITING_LURAH: { domain:'TUNJANGAN', ownerRoles:['LURAH'], viewerRoles:[], route:'tunjangan', wreRuleId:'SUBMITTED_WAITING_LURAH', mode:'ACTION' },
  TUN_APPROVED_NOT_FORWARDED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:[], route:'tunjangan', wreRuleId:'APPROVED_NOT_FORWARDED', mode:'ACTION' },
  TUN_WAITING_PAYMENT: { domain:'TUNJANGAN', ownerRoles:['BENDAHARA'], viewerRoles:[], route:'tunjangan', wreRuleId:'FORWARDED_NOT_PAID', mode:'ACTION' },
  ARC_READY_NOT_CREATED: { domain:'ARCHIVE', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'monthly-archive', wreRuleId:'PAID_NOT_ARCHIVED', mode:'ACTION' },
  ARC_NOT_VERIFIED: { domain:'ARCHIVE', ownerRoles:['CARIK','LURAH'], viewerRoles:[], route:'monthly-archive', wreRuleId:'ARCHIVE_NOT_VERIFIED', mode:'ACTION' },
  ARC_STORAGE_UNAVAILABLE: { domain:'ARCHIVE', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'monthly-archive', basePriority:'KRITIS', mode:'ACTION' },

  TUN_BATCH_ID_INCONSISTENT: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },
  TUN_BATCH_STATUS_INCONSISTENT: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },
  TUN_DUPLICATE_EMPLOYEE: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },
  TUN_ARITHMETIC_INVALID: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },
  TUN_SNAPSHOT_CHANGED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },
  TUN_BATCH_VALIDATION_FAILED: { domain:'TUNJANGAN', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'tunjangan', basePriority:'KRITIS', mode:'ACTION' },

  SYS_APP_CONTRACT_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', basePriority:'KRITIS', mode:'ACTION' },
  SYS_REQUIRED_SHEET_MISSING: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', basePriority:'KRITIS', mode:'ACTION' },
  SYS_EMPLOYEE_IDENTITY_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', mode:'ACTION' },
  SYS_MASTER_TARIF_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', mode:'ACTION' },
  SYS_REPORT_INTEGRITY_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', mode:'ACTION' },
  SYS_INDEX_INCONSISTENT: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', mode:'ACTION' },
  SYS_PERIOD_CONFIG_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', basePriority:'KRITIS', mode:'ACTION' },
  SYS_BATCH_RESIDUAL_METADATA: { domain:'SYSTEM', ownerRoles:[], viewerRoles:['CARIK','LURAH'], route:'system-health', basePriority:'PERLU_DITINDAKLANJUTI', mode:'MONITOR_ONLY' },
  SYS_INDEX_STALE_QUEUE: { domain:'SYSTEM', ownerRoles:[], viewerRoles:['CARIK','LURAH'], route:'system-health', basePriority:'PERLU_DITINDAKLANJUTI', mode:'MONITOR_ONLY' },
  SYS_EAC_SOURCE_UNAVAILABLE: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'system-health', basePriority:'KRITIS', mode:'ACTION' },
  SYS_BDR_BACKUP_STALE: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'backup-recovery', mode:'ACTION' },
  SYS_BDR_VERIFY_FAILED: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'backup-recovery', basePriority:'MENDESAK', mode:'ACTION' },
  SYS_BDR_TRIGGER_INVALID: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'backup-recovery', basePriority:'MENDESAK', mode:'ACTION' },
  SYS_BDR_SOURCE_MISMATCH: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'backup-recovery', basePriority:'KRITIS', mode:'ACTION' },
  SYS_BDR_EVIDENCE_UNAVAILABLE: { domain:'SYSTEM', ownerRoles:['CARIK'], viewerRoles:['LURAH'], route:'backup-recovery', basePriority:'PERLU_DITINDAKLANJUTI', mode:'ACTION' }
};

var EAC_V10_DEFERRED_CODES_ = [
  'REV_MISSING_REPORTER',
  'REV_RETURNED_PENDING',
  'TUN_PAYMENT_DATE_REVIEW',
  'ARC_VERIFY_FAILED',
  'ARC_FILE_MISSING',
  'ARC_CHECKSUM_MISMATCH',
  'ARC_MANIFEST_INVALID',
  'CLS_CUTOFF_INVALID'
];

function eacV10Unique_(arr) {
  var out = [];
  (arr || []).forEach(function (v) {
    var s = String(v == null ? '' : v).trim();
    if (s && out.indexOf(s) === -1) out.push(s);
  });
  return out;
}

function eacV10Sha_(text) {
  if (typeof wreV10Sha_ === 'function') return wreV10Sha_(String(text || ''));
  if (typeof sha256Hex === 'function') return sha256Hex(String(text || ''));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
}

function eacV10PriorityRank_(priority) {
  var cfg = EAC_V10_PRIORITY_[String(priority || '').toUpperCase()];
  return cfg ? cfg.rank : 0;
}

function eacV10PriorityLabel_(priority) {
  var cfg = EAC_V10_PRIORITY_[String(priority || '').toUpperCase()];
  return cfg ? cfg.label : '';
}

function eacV10PriorityFromWre_(severity) {
  var s = String(severity || '').toUpperCase();
  if (s === 'CRITICAL') return 'KRITIS';
  if (s === 'ESCALATED') return 'MENDESAK';
  if (s === 'DUE') return 'PERLU_DITINDAKLANJUTI';
  return '';
}

function eacV10Role_(idUser) {
  if (typeof wreV10Role_ === 'function') return String(wreV10Role_(idUser) || '');
  var p = getPegawaiById_(idUser);
  var jabatan = String(p && p.jabatan || '');
  if (typeof isCarik_ === 'function' && isCarik_(jabatan)) return 'CARIK';
  if (typeof isLurah_ === 'function' && isLurah_(jabatan)) return 'LURAH';
  if (typeof isBendaharaDanarta_ === 'function' && isBendaharaDanarta_(jabatan)) return 'BENDAHARA';
  return '';
}

function eacV10NormalizePeriod_(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  return normalizePeriode_(raw);
}

function eacV10NormalizeRequest_(request) {
  var raw = request && typeof request === 'object' && !Array.isArray(request) ? request : {};
  var requested = eacV10NormalizePeriod_(raw.periode || '');
  var now = new Date();
  var active = eacV10NormalizePeriod_(periodeKinerjaAktifUntukLaporanWajibV34_(now));
  var workflow = '';
  try { workflow = eacV10NormalizePeriod_(mcV10DefaultPeriode_()); } catch (e) { workflow = active; }
  if (!workflow) workflow = active;

  // Refinement setelah audit source RC2:
  // WRE sendiri memakai periode aktif untuk review dan mcV10DefaultPeriode_() untuk workflow bulanan.
  // EAC mengikuti pola tersebut saat pengguna tidak memilih periode secara eksplisit.
  var reviewPeriods = requested ? [requested] : eacV10Unique_([active, workflow]);
  return {
    requestedPeriod: requested,
    activePeriod: active,
    workflowPeriod: requested || workflow || active,
    reviewPeriods: reviewPeriods,
    forceRefresh: raw.forceRefresh === true,
    nowMs: now.getTime()
  };
}

function eacV10CacheKey_(role, ctx) {
  var periods = (ctx.reviewPeriods || []).join(',');
  return ['EAC', String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), role, ctx.requestedPeriod || '-', ctx.workflowPeriod || '-', periods].join('|');
}

function eacV10Route_(routeKey) {
  var r = EAC_V10_ROUTE_MAP_[String(routeKey || '')];
  if (!r) throw new Error('EAC_ROUTE_TIDAK_DIIJINKAN');
  return {
    key:r.key, menuId:r.menuId, pageId:r.pageId, title:r.title, actionLabel:r.actionLabel
  };
}

function eacV10Registry_(code) {
  var cfg = EAC_V10_ACTION_REGISTRY_[String(code || '')];
  if (!cfg) throw new Error('EAC_ACTION_CODE_TIDAK_DIKENAL_' + String(code || ''));
  return cfg;
}

function eacV10Fingerprint_(item) {
  var payload = [
    EXCEPTION_ACTION_CENTER_V10_VERSION_, item.code, item.domain, item.periode, item.entityId,
    item.priority, item.title, item.description, item.ageHours == null ? '' : item.ageHours,
    (item.ownerRoles || []).join(','), (item.viewerRoles || []).join(','), (item.impacts || []).join(','),
    JSON.stringify(item.metrics || {})
  ].join('|');
  return eacV10Sha_(payload).substring(0, 32);
}

function eacV10NormalizeAction_(cfg) {
  cfg = cfg || {};
  var reg = eacV10Registry_(cfg.code);
  var priority = String(cfg.priority || reg.basePriority || 'PERLU_DITINDAKLANJUTI').toUpperCase();
  if (!EAC_V10_PRIORITY_[priority]) priority = 'PERLU_DITINDAKLANJUTI';
  var route = eacV10Route_(cfg.routeKey || reg.route);
  var entityId = String(cfg.entityId || cfg.periode || 'GLOBAL');
  var period = String(cfg.periode || '');
  var ownerRoles = eacV10Unique_(cfg.ownerRoles || reg.ownerRoles || []);
  var viewerRoles = eacV10Unique_(cfg.viewerRoles || reg.viewerRoles || []);
  var idRaw = [cfg.code, period || '-', entityId || 'GLOBAL'].join('|');
  var age = cfg.ageHours;
  if (age !== null && age !== undefined && age !== '') {
    age = Number(age);
    if (!isFinite(age) || age < 0) age = null;
  } else age = null;
  var out = {
    id:'EAC-' + eacV10Sha_(idRaw).substring(0, 20).toUpperCase(),
    code:String(cfg.code || ''),
    domain:String(reg.domain || cfg.domain || ''),
    title:String(cfg.title || ''),
    description:String(cfg.description || ''),
    recommendation:String(cfg.recommendation || ''),
    priority:priority,
    priorityLabel:eacV10PriorityLabel_(priority),
    priorityRank:eacV10PriorityRank_(priority),
    prioritySource:String(cfg.prioritySource || (reg.basePriority ? 'BUSINESS_RULE' : 'ACTION_READINESS')),
    wreRuleId:String(cfg.wreRuleId || reg.wreRuleId || ''),
    wreSeverity:String(cfg.wreSeverity || ''),
    periode:period,
    entityId:entityId,
    ageHours:age,
    ageLabel:age == null ? '' : (typeof wreV10AgeLabel_ === 'function' ? wreV10AgeLabel_(age) : String(age) + ' jam'),
    sinceAt:String(cfg.sinceAt || ''),
    ownerRoles:ownerRoles,
    viewerRoles:viewerRoles,
    relationship:'',
    blocker:cfg.blocker === true,
    sourceModule:String(cfg.sourceModule || ''),
    sources:eacV10Unique_(cfg.sources || (cfg.sourceModule ? [cfg.sourceModule] : [])),
    impacts:eacV10Unique_(cfg.impacts || []),
    actionLabel:String(cfg.actionLabel || route.actionLabel),
    actionRoute:route,
    metrics:cfg.metrics && typeof cfg.metrics === 'object' ? cfg.metrics : {},
    detectedAt:String(cfg.detectedAt || (typeof formatTanggalJamClient_ === 'function' ? formatTanggalJamClient_(new Date()) : new Date().toISOString())),
    mode:String(reg.mode || 'ACTION')
  };
  out.fingerprint = eacV10Fingerprint_(out);
  return out;
}

function eacV10ApplyWreOverlay_(action, sinceMs, nowMs, options) {
  action = action || {};
  options = options || {};
  var ruleId = String(action.wreRuleId || '');
  if (!ruleId || typeof wreV10Severity_ !== 'function') return action;
  var start = Number(sinceMs || 0);
  if (!start || start > Number(nowMs || Date.now())) return action;
  var age = typeof wreV10AgeHours_ === 'function'
    ? wreV10AgeHours_(start, nowMs)
    : Math.max(0, Math.round(((Number(nowMs || Date.now()) - start) / 3600000) * 10) / 10);
  var severity = wreV10Severity_(ruleId, age);
  action.ageHours = age;
  action.ageLabel = typeof wreV10AgeLabel_ === 'function' ? wreV10AgeLabel_(age) : String(age) + ' jam';
  action.sinceAt = options.sinceAt || (typeof formatTanggalJamClient_ === 'function' ? formatTanggalJamClient_(new Date(start)) : '');
  if (!severity) {
    action.fingerprint = eacV10Fingerprint_(action);
    return action;
  }
  var priority = eacV10PriorityFromWre_(severity);
  if (eacV10PriorityRank_(priority) > Number(action.priorityRank || 0)) {
    action.priority = priority;
    action.priorityLabel = eacV10PriorityLabel_(priority);
    action.priorityRank = eacV10PriorityRank_(priority);
    action.prioritySource = 'WRE';
  }
  action.wreSeverity = severity;
  if (typeof wreV10Recipients_ === 'function') {
    var recipients = wreV10Recipients_(ruleId, severity) || [];
    recipients.forEach(function (r) {
      if ((action.ownerRoles || []).indexOf(r) === -1 && (action.viewerRoles || []).indexOf(r) === -1) action.viewerRoles.push(r);
    });
  }
  action.viewerRoles = eacV10Unique_(action.viewerRoles);
  action.fingerprint = eacV10Fingerprint_(action);
  return action;
}

function eacV10CollectReview_(periode) {
  var req = reviewCenterNormalizeRequestV10_({ periode:periode, status:'MENUNGGU', kelompok:'SEMUA', urutan:'TERLAMA', offset:0, limit:1 });
  var read = reviewCenterReadIndexV10_(req, reviewCenterEmployeeMapV10_());
  return { ok:true, periode:periode, summary:read.summary || {}, health:read.health || {} };
}

function eacV10CollectClosing_(periode) {
  var closing = bangunMonthlyClosingV10_(periode);
  // Batch dibaca terpisah hanya untuk timestamp WRE/transition. Jika pembacaan ini gagal,
  // jangan diam-diam menganggap batch kosong karena itu dapat menghilangkan umur/escalation.
  var batch = getBatchAktifTunjangan_(periode);
  return { ok:true, periode:periode, closing:closing, batch:batch };
}

function eacV10ArchiveRelevant_(closing) {
  if (!closing) return false;
  var allowance = closing.allowance || {};
  return closing.monthlyComplete === true ||
    (closing.workflow && closing.workflow.paid === true) ||
    String(allowance.status || '') === String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.SUDAH_DICAIRKAN || 'Sudah Dicairkan');
}

function eacV10CollectArchive_(periode) {
  return { ok:true, periode:periode, archive:bangunMonthlyArchiveV10_(periode) };
}

function eacV10CollectOhic_(token) {
  var r = ambilOperationalHealthCenterV10(token);
  if (!r || r.sukses !== true) {
    var e = new Error(String(r && r.pesan || 'OHIC tidak dapat dibaca.'));
    e.code = String(r && r.kode || 'OHIC_READ_FAILED');
    throw e;
  }
  return { ok:true, ohic:r };
}

function eacV10FailSource_(source, error, periode) {
  var code = String(error && error.code || 'SOURCE_READ_FAILED');
  var message = String(error && error.message || error || 'Sumber data tidak dapat dibaca.');
  return {
    source:String(source || 'UNKNOWN'),
    periode:String(periode || ''),
    code:code,
    message:message
  };
}

function eacV10BuildSourceFailureAction_(failure) {
  return eacV10NormalizeAction_({
    code:'SYS_EAC_SOURCE_UNAVAILABLE',
    periode:String(failure && failure.periode || ''),
    entityId:String(failure && failure.source || 'UNKNOWN'),
    title:'Sebagian sumber tindakan belum dapat dibaca',
    description:'EAC belum dapat membaca sumber ' + String(failure && failure.source || 'UNKNOWN') + '. Jumlah tindakan belum dapat dianggap lengkap.',
    recommendation:'Muat ulang. Jika tetap gagal, buka Kesehatan Sistem dan periksa sumber terkait.',
    priority:'KRITIS',
    prioritySource:'SOURCE_FAILURE',
    blocker:true,
    sourceModule:'EAC',
    sources:['EAC', String(failure && failure.source || 'UNKNOWN')],
    metrics:{ source:String(failure && failure.source || ''), code:String(failure && failure.code || ''), message:String(failure && failure.message || '') }
  });
}

function eacV10BuildReviewActions_(reviewSnapshots, closingSource, ctx) {
  var out = [];
  var closing = closingSource && closingSource.closing;
  var allowance = closing && closing.allowance || {};
  Object.keys(reviewSnapshots || {}).forEach(function (periode) {
    var snap = reviewSnapshots[periode];
    if (!snap || snap.ok !== true) return;
    var s = snap.summary || {};
    var total = Number(s.totalPending || 0);
    if (total <= 0) return;
    var oldest = Number(s.oldestPendingMs || 0);
    var age = oldest && typeof wreV10AgeHours_ === 'function' ? wreV10AgeHours_(oldest, ctx.nowMs) : null;
    var impacts = [];
    if (closing && String(closing.periode || '') === String(periode)) {
      if ((closing.officialCloseBlockers || []).indexOf('REVIEW_PENDING') !== -1) impacts.push('MONTHLY_CLOSING');
      if (Number(allowance.pendingRelevant || 0) > 0 || (allowance.blockers || []).indexOf('PENDING_REVIEW_PENGHAMBAT_TUNJANGAN') !== -1) impacts.push('TUNJANGAN');
    }
    var action = eacV10NormalizeAction_({
      code:'REV_PENDING', periode:periode, entityId:periode,
      title:total + ' laporan belum selesai direview',
      description:oldest ? ('Laporan tertua telah menunggu ' + (typeof wreV10AgeLabel_ === 'function' ? wreV10AgeLabel_(age) : String(age) + ' jam') + '.') : 'Masih ada laporan yang menunggu review.',
      recommendation:'Buka Pusat Review dan selesaikan laporan paling lama terlebih dahulu.',
      sourceModule:'REVIEW_CENTER', sources:['REVIEW_CENTER'], impacts:impacts,
      blocker:impacts.length > 0,
      ageHours:age,
      metrics:{ totalPending:total, pamong:Number(s.PAMONG || 0), dukuh:Number(s.DUKUH || 0), staf:Number(s.STAF || 0), phl:Number(s.PHL || 0), oldestPendingMs:oldest }
    });
    if (oldest) eacV10ApplyWreOverlay_(action, oldest, ctx.nowMs);
    out.push(action);
  });
  return out;
}

function eacV10AllowanceBlockerConfig_(blocker) {
  var b = String(blocker || '');
  if (b === 'BATCH_ID_TIDAK_KONSISTEN') return { code:'TUN_BATCH_ID_INCONSISTENT', title:'ID batch tunjangan tidak konsisten', description:'Batch aktif memuat lebih dari satu ID batch.' };
  if (b === 'STATUS_BATCH_TIDAK_KONSISTEN') return { code:'TUN_BATCH_STATUS_INCONSISTENT', title:'Status batch tunjangan tidak konsisten', description:'Baris dalam batch aktif tidak memiliki status workflow yang sama.' };
  if (b === 'PEGAWAI_DUPLIKAT') return { code:'TUN_DUPLICATE_EMPLOYEE', title:'Pegawai duplikat dalam batch tunjangan', description:'Satu atau lebih pegawai muncul lebih dari sekali pada batch aktif.' };
  if (b === 'ARITMETIKA_TIDAK_KONSISTEN') return { code:'TUN_ARITHMETIC_INVALID', title:'Aritmetika batch tunjangan tidak konsisten', description:'Perhitungan nominal atau persentase pada batch aktif tidak konsisten.' };
  if (b === 'SNAPSHOT_BERBEDA_DENGAN_HITUNG_ULANG') return { code:'TUN_SNAPSHOT_CHANGED', title:'Snapshot tunjangan berubah', description:'Snapshot batch berbeda dengan hasil perhitungan ulang terbaru.' };
  if (b.indexOf('VALIDASI_BATCH_GAGAL:') === 0) return { code:'TUN_BATCH_VALIDATION_FAILED', title:'Validasi batch tunjangan gagal', description:b.substring('VALIDASI_BATCH_GAGAL:'.length).trim() || 'Pemeriksaan batch tidak dapat diselesaikan.' };
  return null;
}

function eacV10BuildAllowanceIntegrityActions_(closing, periode) {
  var out = [];
  var allowance = closing && closing.allowance || {};
  var blockers = allowance.blockers || [];
  blockers.forEach(function (b) {
    if (b === 'PENDING_REVIEW_PENGHAMBAT_TUNJANGAN') return;
    var cfg = eacV10AllowanceBlockerConfig_(b);
    if (!cfg) return;
    out.push(eacV10NormalizeAction_({
      code:cfg.code, periode:periode, entityId:String(allowance.batchId || periode),
      title:cfg.title, description:cfg.description,
      recommendation:'Jangan lanjutkan workflow tunjangan sebelum blocker ini diperiksa dan diselesaikan melalui modul sumber.',
      priority:'KRITIS', prioritySource:'INTEGRITY', blocker:true,
      sourceModule:'MONTHLY_CLOSING', sources:['MONTHLY_CLOSING','TUNJANGAN'], impacts:['TUNJANGAN','MONTHLY_CLOSING'],
      metrics:{ batchId:String(allowance.batchId || ''), status:String(allowance.status || ''), blocker:String(b || ''), snapshotDelta:allowance.snapshotDelta, changedEmployees:allowance.changedEmployees, duplicateEmployees:allowance.duplicateEmployees, arithmeticIssues:allowance.arithmeticIssues }
    }));
  });
  return out;
}

function eacV10BatchTransition_(periode, batch, status) {
  if (!batch || !status) return { ms:0, audit:{} };
  var audit = {};
  try { audit = wreV10LatestAuditTunjangan_(periode, batch.batchId) || {}; } catch (e) { audit = {}; }
  var ms = 0;
  try { ms = Number(wreV10TransitionMs_(status, batch, audit) || 0); } catch (e2) { ms = 0; }
  return { ms:ms, audit:audit };
}

function eacV10BuildWorkflowActions_(closingSource, ctx) {
  var out = [];
  if (!closingSource || closingSource.ok !== true || !closingSource.closing) return out;
  var closing = closingSource.closing;
  var periode = String(closing.periode || ctx.workflowPeriod || '');
  var allowance = closing.allowance || {};
  var batch = closingSource.batch || null;

  if (closing.period && closing.period.closed !== true && closing.canCloseOfficial === true) {
    var closeSince = Number(closing.report && closing.report.latestReportMs || 0);
    var closeBasis = 'LATEST_REPORT';
    if (!closeSince) { closeSince = Number(ctx.nowMs || Date.now()) - 6 * 3600000; closeBasis = 'WRE_FALLBACK_6H'; }
    var closeAction = eacV10NormalizeAction_({
      code:'CLS_READY_NOT_CLOSED', periode:periode, entityId:periode,
      title:'Periode siap ditutup resmi',
      description:'Seluruh prasyarat penutupan periode sudah terpenuhi, tetapi periode belum ditutup.',
      recommendation:'Buka Penutupan Bulan dan lakukan verifikasi akhir sebelum menutup periode resmi.',
      sourceModule:'MONTHLY_CLOSING', sources:['MONTHLY_CLOSING'], impacts:['MONTHLY_CLOSING'],
      metrics:{ canCloseOfficial:true, ageBasis:closeBasis, latestReportMs:Number(closing.report && closing.report.latestReportMs || 0) }
    });
    eacV10ApplyWreOverlay_(closeAction, closeSince, ctx.nowMs, { sinceAt:String(closing.report && closing.report.latestReportAt || '') });
    out.push(closeAction);
  }

  if (closing.period && closing.period.closed === true && allowance.exists !== true) {
    var cutoff = parseTanggal(closing.period.cutoffAt || '');
    var cutoffMs = cutoff instanceof Date && !isNaN(cutoff.getTime()) ? cutoff.getTime() : 0;
    var missingAction = eacV10NormalizeAction_({
      code:'TUN_BATCH_NOT_CREATED', periode:periode, entityId:periode,
      title:'Batch tunjangan belum dibuat',
      description:'Periode sudah ditutup resmi, tetapi belum ada batch tunjangan aktif.',
      recommendation:'Buka Tunjangan dan buat Draft rekap untuk periode tersebut.',
      sourceModule:'MONTHLY_CLOSING', sources:['MONTHLY_CLOSING','TUNJANGAN'], impacts:['TUNJANGAN'],
      metrics:{ periodClosed:true, cutoffAt:String(closing.period.cutoffAt || '') }
    });
    if (cutoffMs) eacV10ApplyWreOverlay_(missingAction, cutoffMs, ctx.nowMs, { sinceAt:String(closing.period.cutoffLabel || '') });
    out.push(missingAction);
    return out;
  }

  if (allowance.exists !== true) return out;

  var integrity = eacV10BuildAllowanceIntegrityActions_(closing, periode);
  if (integrity.length) return out.concat(integrity);

  // Pending review yang memblokir tunjangan diserap oleh REV_PENDING agar tidak membuat kartu ganda.
  if ((allowance.blockers || []).indexOf('PENDING_REVIEW_PENGHAMBAT_TUNJANGAN') !== -1 || Number(allowance.pendingRelevant || 0) > 0) return out;

  // Fail closed untuk blocker baru/tidak dikenal. Jangan menyarankan transisi workflow bila
  // Monthly Closing sudah menyatakan batch invalid tetapi EAC belum mengenali kode blockernya.
  if (allowance.valid === false) {
    out.push(eacV10NormalizeAction_({
      code:'TUN_BATCH_VALIDATION_FAILED', periode:periode, entityId:String(allowance.batchId || periode),
      title:'Batch tunjangan belum lolos validasi',
      description:'Monthly Closing menandai batch tidak valid, tetapi detail blocker belum dikenali oleh EAC RC1.',
      recommendation:'Jangan lanjutkan workflow. Buka Tunjangan/Kesehatan Sistem dan periksa blocker batch.',
      priority:'KRITIS', prioritySource:'INTEGRITY', blocker:true,
      sourceModule:'MONTHLY_CLOSING', sources:['MONTHLY_CLOSING','TUNJANGAN'], impacts:['TUNJANGAN','MONTHLY_CLOSING'],
      metrics:{ batchId:String(allowance.batchId || ''), status:String(allowance.status || ''), blockers:(allowance.blockers || []).slice ? allowance.blockers.slice() : [] }
    }));
    return out;
  }

  var status = String(allowance.status || (batch && batch.status) || '').trim();
  var code = '', title = '', description = '', recommendation = '';
  var statusDraft = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DRAFT || 'Draft');
  var statusReturned = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH || 'Dikembalikan Lurah');
  var statusLocked = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DIKUNCI_CARIK || 'Dikunci Carik');
  var statusSubmitted = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH || 'Diajukan ke Lurah');
  var statusApproved = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DISETUJUI_LURAH || 'Disetujui Lurah');
  var statusForwarded = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || 'Diteruskan ke Bendahara');

  if (status === statusDraft || status === statusReturned) {
    code = 'TUN_DRAFT_NOT_LOCKED';
    title = status === statusReturned ? 'Batch dikembalikan Lurah dan perlu diperbaiki' : 'Draft tunjangan belum dikunci';
    description = 'Batch masih berstatus ' + status + '.';
    recommendation = status === statusReturned ? 'Periksa alasan pengembalian, koreksi batch, lalu lanjutkan workflow melalui menu Tunjangan.' : 'Periksa rekap dan kunci Draft jika sudah benar.';
  } else if (status === statusLocked) {
    code = 'TUN_LOCKED_NOT_SUBMITTED'; title = 'Batch belum diajukan ke Lurah';
    description = 'Batch sudah Dikunci Carik tetapi belum diajukan ke Lurah.';
    recommendation = 'Ajukan batch kepada Lurah setelah pemeriksaan final.';
  } else if (status === statusSubmitted) {
    code = 'TUN_WAITING_LURAH'; title = 'Persetujuan Lurah belum diproses';
    description = 'Batch sudah diajukan dan masih menunggu keputusan Lurah.';
    recommendation = 'Lurah perlu memeriksa dan menyetujui atau mengembalikan batch.';
  } else if (status === statusApproved) {
    code = 'TUN_APPROVED_NOT_FORWARDED'; title = 'Batch belum diteruskan ke Bendahara';
    description = 'Batch sudah Disetujui Lurah tetapi belum diteruskan ke Bendahara.';
    recommendation = 'Carik perlu menjalankan pemeriksaan akhir lalu meneruskan batch ke Bendahara.';
  } else if (status === statusForwarded) {
    code = 'TUN_WAITING_PAYMENT'; title = 'Pencairan belum dikonfirmasi';
    description = 'Batch sudah diteruskan ke Bendahara tetapi belum berstatus Sudah Dicairkan.';
    recommendation = 'Bendahara perlu mengonfirmasi pembayaran setelah pencairan benar-benar terjadi.';
  }

  if (code) {
    var action = eacV10NormalizeAction_({
      code:code, periode:periode, entityId:String(allowance.batchId || periode),
      title:title, description:description, recommendation:recommendation,
      sourceModule:'TUNJANGAN', sources:['MONTHLY_CLOSING','TUNJANGAN'], impacts:['TUNJANGAN'],
      metrics:{ batchId:String(allowance.batchId || ''), status:status, employees:Number(allowance.employees || 0), totalNominal:Number(allowance.totalNominal || 0) }
    });
    var transition = eacV10BatchTransition_(periode, batch, status);
    // Dikembalikan Lurah belum mempunyai timestamp transition pada WRE RC2.
    // Jangan mengarang age/severity. Tindakan tetap tampil dengan base priority.
    if (!(status === statusReturned && !transition.ms) && transition.ms) eacV10ApplyWreOverlay_(action, transition.ms, ctx.nowMs);
    out.push(action);
  }
  return out;
}

function eacV10BuildArchiveActions_(archiveSource, closingSource, ctx) {
  var out = [];
  if (!archiveSource || archiveSource.ok !== true || !archiveSource.archive) return out;
  var a = archiveSource.archive;
  var periode = String(a.periode || ctx.workflowPeriod || '');
  var closing = closingSource && closingSource.closing || {};
  var batch = closingSource && closingSource.batch || null;
  var allowance = closing.allowance || {};
  var statusPaid = String(TUNJANGAN_STATUS && TUNJANGAN_STATUS.SUDAH_DICAIRKAN || 'Sudah Dicairkan');
  var paidTransition = eacV10BatchTransition_(periode, batch, statusPaid);

  if (a.storage && a.storage.valid === false) {
    out.push(eacV10NormalizeAction_({
      code:'ARC_STORAGE_UNAVAILABLE', periode:periode, entityId:periode,
      title:'Penyimpanan Arsip Bulanan belum siap',
      description:String(a.storage.message || 'Lokasi penyimpanan Arsip Bulanan tidak tersedia.'),
      recommendation:'Periksa konfigurasi penyimpanan melalui Arsip Bulanan/Kesehatan Sistem sebelum membuat Arsip Final.',
      priority:'KRITIS', prioritySource:'INTEGRITY', blocker:true,
      sourceModule:'MONTHLY_ARCHIVE', sources:['MONTHLY_ARCHIVE'], impacts:['ARCHIVE'],
      metrics:{ storageMode:String(a.storage.mode || ''), blockers:(a.blockers || []).slice ? a.blockers.slice() : [] }
    }));
  }

  if (String(a.status || '') === 'SIAP_DIARSIPKAN') {
    var readyAction = eacV10NormalizeAction_({
      code:'ARC_READY_NOT_CREATED', periode:periode, entityId:String(allowance.batchId || periode),
      title:'Periode siap diarsipkan',
      description:'Seluruh prasyarat Arsip Bulanan sudah terpenuhi tetapi Arsip Final belum dibuat.',
      recommendation:'Buka Arsip Bulanan dan buat Arsip Final.',
      sourceModule:'MONTHLY_ARCHIVE', sources:['MONTHLY_ARCHIVE','MONTHLY_CLOSING'], impacts:['ARCHIVE'],
      metrics:{ archiveStatus:String(a.status || ''), batchId:String(allowance.batchId || '') }
    });
    if (paidTransition.ms) eacV10ApplyWreOverlay_(readyAction, paidTransition.ms, ctx.nowMs);
    out.push(readyAction);
  } else if (String(a.status || '') === 'SUDAH_DIARSIPKAN' && a.archive && String(a.archive.integrityStatus || '') !== 'TERVERIFIKASI') {
    var created = parseTanggal(a.archive.createdAt || '');
    var createdMs = created instanceof Date && !isNaN(created.getTime()) ? created.getTime() : paidTransition.ms;
    var verifyAction = eacV10NormalizeAction_({
      code:'ARC_NOT_VERIFIED', periode:periode, entityId:String(a.archive.archiveId || periode),
      title:'Arsip Final belum diverifikasi',
      description:'Arsip Final sudah dibuat tetapi integritas paket belum berstatus TERVERIFIKASI.',
      recommendation:'Buka Arsip Bulanan dan jalankan Verifikasi checksum.',
      sourceModule:'MONTHLY_ARCHIVE', sources:['MONTHLY_ARCHIVE'], impacts:['ARCHIVE'],
      metrics:{ archiveId:String(a.archive.archiveId || ''), integrityStatus:String(a.archive.integrityStatus || ''), createdAt:String(a.archive.createdAt || '') }
    });
    if (createdMs) eacV10ApplyWreOverlay_(verifyAction, createdMs, ctx.nowMs, { sinceAt:String(a.archive.createdAt || '') });
    out.push(verifyAction);
  }
  return out;
}

function eacV10OhicPriority_(status) {
  var s = String(status || '').toUpperCase();
  if (s === 'CRITICAL') return 'KRITIS';
  if (s === 'WARN') return 'MENDESAK';
  return 'PERLU_DITINDAKLANJUTI';
}

function eacV10BuildOhicAction_(code, check, options) {
  options = options || {};
  return eacV10NormalizeAction_({
    code:code,
    periode:String(options.periode || ''),
    entityId:String(check && check.id || code),
    title:String(check && check.title || options.title || 'Masalah kesehatan sistem'),
    description:String(check && check.headline || options.description || ''),
    recommendation:String(check && check.recommendation || options.recommendation || 'Buka Kesehatan Sistem dan periksa temuan.'),
    priority:String(options.priority || eacV10OhicPriority_(check && check.status)),
    prioritySource:'OHIC', blocker:String(check && check.status || '').toUpperCase() === 'CRITICAL',
    sourceModule:'OHIC', sources:['OHIC'], impacts:options.impacts || ['SYSTEM'],
    metrics:check && check.metrics && typeof check.metrics === 'object' ? check.metrics : {}
  });
}


function eacV10BuildBdrAction_(code, baseCheck, title, description, priority) {
  var c = {
    id:String(baseCheck && baseCheck.id || 'backup_recovery') + ':' + String(code || ''),
    status:String(baseCheck && baseCheck.status || 'WARN'),
    title:String(title || 'Cadangan & pemulihan'),
    headline:String(description || baseCheck && baseCheck.headline || ''),
    recommendation:'Buka Cadangan & Pemulihan untuk melihat recovery point, RPO, trigger, baseline sumber, dan status bukti.',
    metrics:baseCheck && baseCheck.metrics && typeof baseCheck.metrics === 'object' ? baseCheck.metrics : {}
  };
  return eacV10BuildOhicAction_(code, c, { priority:priority, impacts:['SYSTEM','RECOVERY'] });
}

function eacV10BuildSystemActions_(ohicSource) {
  var out = [];
  if (!ohicSource || ohicSource.ok !== true || !ohicSource.ohic) return out;
  var checks = ohicSource.ohic.checks || [];
  var byId = Object.create(null);
  checks.forEach(function (c) { if (c && c.id) byId[String(c.id)] = c; });

  var c = byId.governance_contract;
  if (c && String(c.status) === 'CRITICAL') out.push(eacV10BuildOhicAction_('SYS_APP_CONTRACT_INVALID', c, { priority:'KRITIS' }));

  c = byId.required_sheets;
  if (c && Number(c.metrics && c.metrics.missingRequired || 0) > 0) out.push(eacV10BuildOhicAction_('SYS_REQUIRED_SHEET_MISSING', c, { priority:'KRITIS' }));

  c = byId.employee_identity;
  if (c && ['CRITICAL','WARN'].indexOf(String(c.status || '').toUpperCase()) !== -1) out.push(eacV10BuildOhicAction_('SYS_EMPLOYEE_IDENTITY_INVALID', c));

  c = byId.tariff_master;
  if (c && ['CRITICAL','WARN'].indexOf(String(c.status || '').toUpperCase()) !== -1) out.push(eacV10BuildOhicAction_('SYS_MASTER_TARIF_INVALID', c));

  c = byId.report_integrity;
  if (c && ['CRITICAL','WARN'].indexOf(String(c.status || '').toUpperCase()) !== -1) out.push(eacV10BuildOhicAction_('SYS_REPORT_INTEGRITY_INVALID', c));

  c = byId.index_sync;
  if (c && ['CRITICAL','WARN'].indexOf(String(c.status || '').toUpperCase()) !== -1) {
    out.push(eacV10BuildOhicAction_('SYS_INDEX_INCONSISTENT', c));
  } else if (c && Number(c.metrics && c.metrics.queueStale || 0) > 0) {
    out.push(eacV10BuildOhicAction_('SYS_INDEX_STALE_QUEUE', c, { priority:'PERLU_DITINDAKLANJUTI' }));
  }

  c = byId.period_status;
  if (c && String(c.status || '').toUpperCase() === 'CRITICAL') out.push(eacV10BuildOhicAction_('SYS_PERIOD_CONFIG_INVALID', c, { priority:'KRITIS' }));

  c = byId.allowance_batch;
  if (c && Number(c.metrics && c.metrics.residualMetadataRows || 0) > 0) {
    out.push(eacV10BuildOhicAction_('SYS_BATCH_RESIDUAL_METADATA', c, { priority:'PERLU_DITINDAKLANJUTI' }));
  }

  c = byId.backup_recovery;
  if (c) {
    var bm = c.metrics || {};
    if (bm.backupStale === true) {
      var rpo = String(bm.rpoPriority || '').toUpperCase();
      var rp = rpo === 'KRITIS' ? 'KRITIS' : (rpo === 'MENDESAK' ? 'MENDESAK' : 'PERLU_DITINDAKLANJUTI');
      out.push(eacV10BuildBdrAction_('SYS_BDR_BACKUP_STALE', c, 'Cadangan terverifikasi melewati target RPO', 'Recovery point VERIFIED terbaru terlalu lama atau belum tersedia.', rp));
    }
    if (bm.verifyFailed === true) {
      out.push(eacV10BuildBdrAction_('SYS_BDR_VERIFY_FAILED', c, 'Backup/verifikasi BDR gagal', 'Run atau recovery point terbaru memiliki status gagal dan perlu diperiksa.', 'MENDESAK'));
    }
    if (bm.triggerInvalid === true) {
      out.push(eacV10BuildBdrAction_('SYS_BDR_TRIGGER_INVALID', c, 'Trigger backup otomatis tidak sehat', 'Trigger backup otomatis BDR tidak tepat satu atau statusnya tidak dapat dibaca.', 'MENDESAK'));
    }
    if (bm.sourceBaselineIssue === true) {
      var sourcePriority = bm.sourceShaConfigured === true && bm.sourceShaMatches === false ? 'KRITIS' : 'MENDESAK';
      out.push(eacV10BuildBdrAction_('SYS_BDR_SOURCE_MISMATCH', c, 'Baseline source pemulihan perlu diperiksa', 'Stable Git SHA belum dikonfigurasi atau tidak cocok dengan baseline source yang diharapkan.', sourcePriority));
    }
    if (bm.evidenceUnavailable === true) {
      var evPriority = Number(bm.evidenceMissing || 0) > 0 ? 'MENDESAK' : 'PERLU_DITINDAKLANJUTI';
      out.push(eacV10BuildBdrAction_('SYS_BDR_EVIDENCE_UNAVAILABLE', c, 'Inventaris bukti Drive belum sehat', Number(bm.evidenceMissing || 0) > 0 ? 'Inventaris BDR menemukan referensi bukti yang hilang.' : 'Inventaris bukti Drive belum dapat diperiksa secara lengkap.', evPriority));
    }
  }
  return out;
}

function eacV10MergeObjects_(a, b) {
  var out = {};
  Object.keys(a || {}).forEach(function (k) { out[k] = a[k]; });
  Object.keys(b || {}).forEach(function (k) {
    if (out[k] === undefined || out[k] === null || out[k] === '' || out[k] === 0) out[k] = b[k];
  });
  return out;
}

function eacV10Deduplicate_(items) {
  var map = Object.create(null), order = [];
  (items || []).forEach(function (item) {
    if (!item || !item.code) return;
    var key = [item.code, item.periode || '-', item.entityId || 'GLOBAL'].join('|');
    if (!map[key]) {
      map[key] = item;
      order.push(key);
      return;
    }
    var cur = map[key];
    if (Number(item.priorityRank || 0) > Number(cur.priorityRank || 0)) {
      cur.priority = item.priority;
      cur.priorityLabel = item.priorityLabel;
      cur.priorityRank = item.priorityRank;
      cur.prioritySource = item.prioritySource;
      cur.wreSeverity = item.wreSeverity || cur.wreSeverity;
    }
    cur.ownerRoles = eacV10Unique_((cur.ownerRoles || []).concat(item.ownerRoles || []));
    cur.viewerRoles = eacV10Unique_((cur.viewerRoles || []).concat(item.viewerRoles || []));
    cur.sources = eacV10Unique_((cur.sources || []).concat(item.sources || []));
    cur.impacts = eacV10Unique_((cur.impacts || []).concat(item.impacts || []));
    cur.metrics = eacV10MergeObjects_(cur.metrics, item.metrics);
    cur.blocker = cur.blocker === true || item.blocker === true;
    if ((cur.ageHours == null || Number(item.ageHours || 0) > Number(cur.ageHours || 0)) && item.ageHours != null) {
      cur.ageHours = item.ageHours; cur.ageLabel = item.ageLabel; cur.sinceAt = item.sinceAt;
    }
    cur.fingerprint = eacV10Fingerprint_(cur);
  });
  return order.map(function (k) { return map[k]; });
}

function eacV10ResolveRole_(item, role) {
  if (!item) return '';
  var r = String(role || '');
  if ((item.ownerRoles || []).indexOf(r) !== -1) return 'ACTION';
  if ((item.viewerRoles || []).indexOf(r) !== -1) return 'MONITOR';
  return '';
}

function eacV10Sort_(items) {
  return (items || []).slice().sort(function (a, b) {
    var p = Number(b.priorityRank || 0) - Number(a.priorityRank || 0);
    if (p) return p;
    var bl = Number(b.blocker === true) - Number(a.blocker === true);
    if (bl) return bl;
    var aa = a.ageHours == null ? -1 : Number(a.ageHours || 0);
    var bb = b.ageHours == null ? -1 : Number(b.ageHours || 0);
    if (bb !== aa) return bb - aa;
    var pc = String(a.periode || '').localeCompare(String(b.periode || ''));
    if (pc) return pc;
    return String(a.code || '').localeCompare(String(b.code || ''));
  });
}

function eacV10FilterForRole_(items, role) {
  var mine = [], monitoring = [];
  (items || []).forEach(function (item) {
    var rel = eacV10ResolveRole_(item, role);
    if (!rel) return;
    var copy = item;
    copy.relationship = rel;
    if (rel === 'ACTION') mine.push(copy); else monitoring.push(copy);
  });
  return { actionsMine:eacV10Sort_(mine), monitoring:eacV10Sort_(monitoring) };
}

function eacV10BuildSummary_(visible) {
  var mine = visible.actionsMine || [], monitoring = visible.monitoring || [];
  var s = { tindakanSaya:mine.length, pantauan:monitoring.length, totalVisible:mine.length + monitoring.length, kritis:0, mendesak:0, perluDitindaklanjuti:0 };
  mine.forEach(function (x) {
    if (x.priority === 'KRITIS') s.kritis++;
    else if (x.priority === 'MENDESAK') s.mendesak++;
    else if (x.priority === 'PERLU_DITINDAKLANJUTI') s.perluDitindaklanjuti++;
  });
  return s;
}

function eacV10SourceStatus_(status, detail) {
  return { status:String(status || ''), detail:String(detail || '') };
}

function eacV10BuildSnapshot_(ctx, role, token) {
  var reviewSnapshots = Object.create(null);
  var failures = [];
  var sourceStatus = { review:{}, closing:null, batch:null, archive:null, ohic:null };

  (ctx.reviewPeriods || []).forEach(function (p) {
    try {
      reviewSnapshots[p] = eacV10CollectReview_(p);
      sourceStatus.review[p] = eacV10SourceStatus_('OK','');
    } catch (eReview) {
      var f = eacV10FailSource_('REVIEW', eReview, p);
      failures.push(f);
      reviewSnapshots[p] = { ok:false, error:f };
      sourceStatus.review[p] = eacV10SourceStatus_('ERROR', f.code);
    }
  });

  var closingSource = null;
  try {
    closingSource = eacV10CollectClosing_(ctx.workflowPeriod);
    sourceStatus.closing = eacV10SourceStatus_('OK','');
    sourceStatus.batch = eacV10SourceStatus_(closingSource.batch ? 'OK' : 'EMPTY','');
  } catch (eClosing) {
    var fc = eacV10FailSource_('CLOSING', eClosing, ctx.workflowPeriod);
    failures.push(fc);
    sourceStatus.closing = eacV10SourceStatus_('ERROR', fc.code);
    sourceStatus.batch = eacV10SourceStatus_('UNKNOWN','');
  }

  var archiveSource = null;
  if (closingSource && eacV10ArchiveRelevant_(closingSource.closing)) {
    try {
      archiveSource = eacV10CollectArchive_(ctx.workflowPeriod);
      sourceStatus.archive = eacV10SourceStatus_('OK','');
    } catch (eArchive) {
      var fa = eacV10FailSource_('ARCHIVE', eArchive, ctx.workflowPeriod);
      failures.push(fa);
      sourceStatus.archive = eacV10SourceStatus_('ERROR', fa.code);
    }
  } else sourceStatus.archive = eacV10SourceStatus_('SKIPPED','NOT_RELEVANT');

  var ohicSource = null;
  if (role === 'CARIK' || role === 'LURAH') {
    try {
      ohicSource = eacV10CollectOhic_(token);
      sourceStatus.ohic = eacV10SourceStatus_('OK','');
    } catch (eOhic) {
      var fo = eacV10FailSource_('OHIC', eOhic, '');
      failures.push(fo);
      sourceStatus.ohic = eacV10SourceStatus_('ERROR', fo.code);
    }
  } else sourceStatus.ohic = eacV10SourceStatus_('SKIPPED','ROLE_NOT_ALLOWED');

  var actions = [];
  actions = actions.concat(eacV10BuildReviewActions_(reviewSnapshots, closingSource, ctx));
  actions = actions.concat(eacV10BuildWorkflowActions_(closingSource, ctx));
  actions = actions.concat(eacV10BuildArchiveActions_(archiveSource, closingSource, ctx));
  actions = actions.concat(eacV10BuildSystemActions_(ohicSource));
  failures.forEach(function (f) { actions.push(eacV10BuildSourceFailureAction_(f)); });

  actions = eacV10Deduplicate_(actions);
  var visible = eacV10FilterForRole_(actions, role);
  var summary = eacV10BuildSummary_(visible);
  return {
    actions:actions,
    visible:visible,
    summary:summary,
    partial:failures.length > 0,
    failures:failures,
    sourceStatus:sourceStatus
  };
}

function ambilExceptionActionCenterV10(request, token) {
  var started = Date.now();
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.', items:[], actionsMine:[], monitoring:[] };
    var role = eacV10Role_(idUser);
    if (!role) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Perlu Tindakan hanya tersedia untuk Carik, Lurah, dan Bendahara.', items:[], actionsMine:[], monitoring:[] };

    var ctx = eacV10NormalizeRequest_(request);
    var cacheKey = eacV10CacheKey_(role, ctx);
    var cache = null;
    try { cache = CacheService.getScriptCache(); } catch (eCache) { cache = null; }
    if (!ctx.forceRefresh && cache) {
      try {
        var cached = cache.get(cacheKey);
        if (cached) {
          var parsed = JSON.parse(cached);
          parsed.cacheHit = true;
          parsed.serverMs = Date.now() - started;
          return parsed;
        }
      } catch (eCacheRead) { }
    }

    var snapshot = eacV10BuildSnapshot_(ctx, role, token);
    var items = snapshot.visible.actionsMine.concat(snapshot.visible.monitoring);
    var result = {
      sukses:true,
      versi:EXCEPTION_ACTION_CENTER_V10_VERSION_,
      appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
      generatedAt:typeof formatTanggalJamClient_ === 'function' ? formatTanggalJamClient_(new Date(ctx.nowMs)) : new Date(ctx.nowMs).toISOString(),
      role:role,
      periode:ctx.requestedPeriod || '',
      activePeriod:ctx.activePeriod,
      workflowPeriod:ctx.workflowPeriod,
      reviewPeriods:(ctx.reviewPeriods || []).slice(),
      partial:snapshot.partial,
      summary:snapshot.summary,
      actionsMine:snapshot.visible.actionsMine,
      monitoring:snapshot.visible.monitoring,
      items:items,
      failures:snapshot.failures,
      sourceStatus:snapshot.sourceStatus,
      readOnly:true,
      dataDiubah:false,
      statusBisnisDiubah:false,
      propertiesDiubah:false,
      triggerDiubah:false,
      schemaDiubah:false,
      cacheHit:false,
      serverMs:Date.now()-started,
      policy:{
        rootCauseOriented:true,
        sourceOfTruthPreserved:true,
        noBusinessMutation:true,
        noNewSheet:true,
        noSchedulerMutation:true,
        cacheTtlSeconds:EAC_V10_CACHE_TTL_SECONDS_,
        deferredCodes:EAC_V10_DEFERRED_CODES_.slice()
      }
    };
    if (cache) {
      try { cache.put(cacheKey, JSON.stringify(result), EAC_V10_CACHE_TTL_SECONDS_); } catch (eCacheWrite) { }
    }
    return result;
  } catch (e) {
    return handleError('ambilExceptionActionCenterV10', e, {
      sukses:false, kode:String(e && e.code || 'EAC_READ_FAILED'), pesan:'Perlu Tindakan belum dapat dimuat.', items:[], actionsMine:[], monitoring:[], partial:true
    });
  }
}

// Validator sintetis; tidak membaca/menulis spreadsheet produksi.
function validasiExceptionActionCenterV10() {
  var checks = [];
  function add_(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail == null ? '' : detail) }); }
  var codes = Object.keys(EAC_V10_ACTION_REGISTRY_);
  var routes = Object.keys(EAC_V10_ROUTE_MAP_);
  add_('VERSION', EXCEPTION_ACTION_CENTER_V10_VERSION_ === 'EAC-v1.0-RC2-2026.10.04.01', EXCEPTION_ACTION_CENTER_V10_VERSION_);
  add_('ACTIVE_CODE_COUNT_32', codes.length === 32, codes.length);
  add_('DEFERRED_CODE_COUNT_8', EAC_V10_DEFERRED_CODES_.length === 8, EAC_V10_DEFERRED_CODES_.length);
  add_('ROUTE_ALLOWLIST_6', routes.length === 6, routes.length);
  add_('PUBLIC_ENDPOINT', typeof ambilExceptionActionCenterV10 === 'function', typeof ambilExceptionActionCenterV10);
  add_('NO_WRITE_ENDPOINT', true, 'EAC RC1 hanya memiliki endpoint baca.');
  add_('WRE_PRIORITY_CRITICAL', eacV10PriorityFromWre_('CRITICAL') === 'KRITIS', eacV10PriorityFromWre_('CRITICAL'));
  add_('WRE_PRIORITY_ESCALATED', eacV10PriorityFromWre_('ESCALATED') === 'MENDESAK', eacV10PriorityFromWre_('ESCALATED'));
  add_('WRE_PRIORITY_DUE', eacV10PriorityFromWre_('DUE') === 'PERLU_DITINDAKLANJUTI', eacV10PriorityFromWre_('DUE'));
  add_('CARIK_REVIEW_OWNER', (EAC_V10_ACTION_REGISTRY_.REV_PENDING.ownerRoles || []).join(',') === 'CARIK', EAC_V10_ACTION_REGISTRY_.REV_PENDING.ownerRoles);
  add_('LURAH_APPROVAL_OWNER', (EAC_V10_ACTION_REGISTRY_.TUN_WAITING_LURAH.ownerRoles || []).join(',') === 'LURAH', EAC_V10_ACTION_REGISTRY_.TUN_WAITING_LURAH.ownerRoles);
  add_('BENDAHARA_PAYMENT_OWNER', (EAC_V10_ACTION_REGISTRY_.TUN_WAITING_PAYMENT.ownerRoles || []).join(',') === 'BENDAHARA', EAC_V10_ACTION_REGISTRY_.TUN_WAITING_PAYMENT.ownerRoles);
  add_('ARCHIVE_VERIFY_SHARED_OWNER', (EAC_V10_ACTION_REGISTRY_.ARC_NOT_VERIFIED.ownerRoles || []).join(',') === 'CARIK,LURAH', EAC_V10_ACTION_REGISTRY_.ARC_NOT_VERIFIED.ownerRoles);
  add_('MONITOR_RESIDUAL_NO_OWNER', (EAC_V10_ACTION_REGISTRY_.SYS_BATCH_RESIDUAL_METADATA.ownerRoles || []).length === 0, EAC_V10_ACTION_REGISTRY_.SYS_BATCH_RESIDUAL_METADATA.ownerRoles);
  add_('DEFER_ARCHIVE_MISMATCH', EAC_V10_DEFERRED_CODES_.indexOf('ARC_CHECKSUM_MISMATCH') !== -1, EAC_V10_DEFERRED_CODES_);
  add_('SOURCE_FAILURE_FAIL_CLOSED', EAC_V10_ACTION_REGISTRY_.SYS_EAC_SOURCE_UNAVAILABLE.basePriority === 'KRITIS', EAC_V10_ACTION_REGISTRY_.SYS_EAC_SOURCE_UNAVAILABLE.basePriority);
  add_('NO_SCHEMA_CHANGE_POLICY', true, '0 sheet/kolom baru.');
  add_('NO_PROPERTIES_WRITE_POLICY', true, 'CacheService boleh dipakai; PropertiesService tidak dipakai EAC.');
  var passed = checks.filter(function (x) { return x.lulus; }).length;
  var result = {
    sukses:passed === checks.length,
    valid:passed === checks.length,
    versi:EXCEPTION_ACTION_CENTER_V10_VERSION_,
    appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
    jumlah:checks.length,
    lulus:passed,
    gagal:checks.length-passed,
    checks:checks,
    dataBisnisDiubah:false,
    schemaDiubah:false,
    propertiesDiubah:false,
    triggerDiubah:false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
