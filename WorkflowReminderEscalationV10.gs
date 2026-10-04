// ============================================================
// WORKFLOW REMINDER & ESCALATION ENGINE v1.0 — RC3 UI HISTORY CLARITY
// Integrated APP_VERSION 2026.10.04.01
// Rule, threshold, scheduler, and anti-spam policy remain unchanged from RC2.
//
// Tujuan:
// - mendeteksi pekerjaan workflow yang tertunda;
// - menentukan penerima berdasarkan peran dan tingkat eskalasi;
// - menyediakan read model kondisi aktif untuk EAC dan riwayat pengingat di portal;
// - mencatat reminder secara anti-spam ke Audit_Log melalui trigger berkala;
// - tidak mengubah status bisnis, poin, tunjangan, closing, atau arsip.
//
// Storage:
// - PropertiesService hanya untuk state anti-spam/trigger snapshot;
// - Audit_Log untuk jejak reminder yang benar-benar dinaikkan;
// - tidak menambah sheet atau kolom baru.
// ============================================================

var WORKFLOW_REMINDER_ESCALATION_V10_VERSION_ = 'WRE-v1.0-RC3-2026.10.04.01';
var WRE_V10_EVENT_PREFIX_ = 'WRE_V10_EVENT_';
var WRE_V10_ACTIVE_KEYS_PROP_ = 'WRE_V10_ACTIVE_KEYS';
var WRE_V10_LAST_RUN_PROP_ = 'WRE_V10_LAST_RUN';
var WRE_V10_TRIGGER_FUNCTION_ = 'prosesWorkflowReminderTerjadwalV10';
var WRE_V10_AUDIT_COOLDOWN_HOURS_ = 24;

var WRE_V10_RULES_ = {
  REVIEW_PENDING: { due:24, escalated:48, critical:72 },
  PERIOD_READY_TO_CLOSE: { due:6, escalated:24, critical:48 },
  BATCH_MISSING_AFTER_CLOSE: { due:6, escalated:24, critical:48 },
  DRAFT_NOT_LOCKED: { due:12, escalated:24, critical:48 },
  LOCKED_NOT_SUBMITTED: { due:12, escalated:24, critical:48 },
  SUBMITTED_WAITING_LURAH: { due:12, escalated:24, critical:48 },
  APPROVED_NOT_FORWARDED: { due:12, escalated:24, critical:48 },
  FORWARDED_NOT_PAID: { due:24, escalated:48, critical:72 },
  PAID_NOT_ARCHIVED: { due:12, escalated:24, critical:48 },
  ARCHIVE_NOT_VERIFIED: { due:6, escalated:24, critical:48 }
};

function wreV10Now_() { return new Date(); }

function wreV10Sha_(text) {
  if (typeof sha256Hex === 'function') return sha256Hex(String(text || ''));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
}

function wreV10Role_(idUser) {
  var p = getPegawaiById_(idUser);
  var jabatan = String(p && p.jabatan || '');
  if (isCarik_(jabatan)) return 'CARIK';
  if (isLurah_(jabatan)) return 'LURAH';
  if (isBendaharaDanarta_(jabatan)) return 'BENDAHARA';
  return '';
}

function wreV10CanAccess_(idUser) {
  return !!wreV10Role_(idUser);
}

function wreV10Severity_(ruleId, ageHours) {
  var cfg = WRE_V10_RULES_[ruleId];
  if (!cfg) return '';
  var age = Math.max(0, Number(ageHours || 0));
  if (age >= cfg.critical) return 'CRITICAL';
  if (age >= cfg.escalated) return 'ESCALATED';
  if (age >= cfg.due) return 'DUE';
  return '';
}

function wreV10SeverityRank_(severity) {
  var s = String(severity || '').toUpperCase();
  if (s === 'CRITICAL') return 3;
  if (s === 'ESCALATED') return 2;
  if (s === 'DUE') return 1;
  return 0;
}

function wreV10AgeHours_(sinceMs, nowMs) {
  var start = Number(sinceMs || 0);
  var now = Number(nowMs || Date.now());
  if (!start || start > now) return 0;
  return Math.round(((now - start) / 3600000) * 10) / 10;
}

function wreV10AgeLabel_(hours) {
  var h = Math.max(0, Number(hours || 0));
  if (h >= 48) return Math.floor(h / 24) + ' hari';
  if (h >= 24) return '1 hari ' + Math.floor(h - 24) + ' jam';
  return Math.floor(h) + ' jam';
}

function wreV10Recipients_(ruleId, severity) {
  var s = String(severity || '').toUpperCase();
  var esc = s === 'ESCALATED' || s === 'CRITICAL';
  var crit = s === 'CRITICAL';
  var roles = [];
  function add_(r) { if (roles.indexOf(r) === -1) roles.push(r); }
  switch (ruleId) {
    case 'REVIEW_PENDING':
      add_('CARIK'); if (esc) add_('LURAH'); break;
    case 'PERIOD_READY_TO_CLOSE':
      add_('CARIK'); add_('LURAH'); break;
    case 'BATCH_MISSING_AFTER_CLOSE':
    case 'DRAFT_NOT_LOCKED':
    case 'LOCKED_NOT_SUBMITTED':
      add_('CARIK'); if (esc) add_('LURAH'); break;
    case 'SUBMITTED_WAITING_LURAH':
      add_('LURAH'); if (esc) add_('CARIK'); break;
    case 'APPROVED_NOT_FORWARDED':
      add_('CARIK'); if (esc) add_('LURAH'); break;
    case 'FORWARDED_NOT_PAID':
      add_('BENDAHARA'); if (esc) add_('CARIK'); if (crit) add_('LURAH'); break;
    case 'PAID_NOT_ARCHIVED':
      add_('CARIK'); if (esc) add_('LURAH'); break;
    case 'ARCHIVE_NOT_VERIFIED':
      add_('CARIK'); add_('LURAH'); break;
  }
  return roles;
}

function wreV10MakeReminder_(cfg) {
  cfg = cfg || {};
  var age = Math.max(0, Number(cfg.ageHours || 0));
  var severity = String(cfg.severity || wreV10Severity_(cfg.ruleId, age) || '');
  if (!severity) return null;
  var recipients = cfg.recipients || wreV10Recipients_(cfg.ruleId, severity);
  var entityKey = String(cfg.entityKey || cfg.periode || 'GLOBAL');
  var keyRaw = [cfg.ruleId, entityKey].join('|');
  return {
    key: 'WRE-' + wreV10Sha_(keyRaw).substring(0, 18).toUpperCase(),
    ruleId: String(cfg.ruleId || ''),
    severity: severity,
    severityRank: wreV10SeverityRank_(severity),
    title: String(cfg.title || ''),
    message: String(cfg.message || ''),
    recommendation: String(cfg.recommendation || ''),
    periode: String(cfg.periode || ''),
    entityKey: entityKey,
    ageHours: age,
    ageLabel: wreV10AgeLabel_(age),
    sinceAt: String(cfg.sinceAt || ''),
    recipients: recipients.slice(),
    route: cfg.route || { menuId:'menuDash', pageId:'halDash', title:'Beranda' },
    metrics: cfg.metrics && typeof cfg.metrics === 'object' ? cfg.metrics : {}
  };
}

function wreV10LatestAuditTunjangan_(periode, batchId) {
  var p = normalizePeriode_(periode || '');
  var sh = getSheet_('Audit_Tunjangan');
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var data = sh.getDataRange().getValues();
  var C = SHEET_COLUMNS.AUDIT_TUNJANGAN;
  for (var i = 1; i < data.length; i++) {
    var r = data[i] || [];
    if (periodeKeyTunjangan_(r[C.PERIODE], false) !== p) continue;
    var aksi = String(r[C.AKSI] || '').trim();
    if (!aksi) continue;
    var detail = String(r[C.DETAIL] || '');
    if (batchId && detail && detail.indexOf(batchId) === -1) {
      // Audit historis lama sering tidak menyertakan batchId. Status transition
      // tetap boleh dipakai jika periode cocok; batch-specific hanya diprioritaskan.
    }
    var dt = parseTanggal(r[C.WAKTU]);
    if (!(dt instanceof Date) || isNaN(dt.getTime())) continue;
    if (!out[aksi] || dt.getTime() > out[aksi].ms) {
      out[aksi] = { ms:dt.getTime(), at:formatTanggalJamClient_(dt), detail:detail };
    }
  }
  return out;
}

function wreV10BatchFieldMs_(batch, columnIndex) {
  if (!batch || !batch.rows || !batch.rows.length) return 0;
  var v = batch.rows[0].values[columnIndex];
  var d = parseTanggal(v);
  return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
}

function wreV10TransitionMs_(status, batch, audit) {
  audit = audit || {};
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  function a_(name) { return audit[name] && Number(audit[name].ms || 0); }
  if (status === TUNJANGAN_STATUS.DRAFT) return wreV10BatchFieldMs_(batch, C.DIBUAT_PADA);
  if (status === TUNJANGAN_STATUS.DIKUNCI_CARIK) return a_('KUNCI_DRAFT_TUNJANGAN') || wreV10BatchFieldMs_(batch, C.DIKUNCI_PADA);
  if (status === TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH) return a_('AJUKAN_TUNJANGAN_KE_LURAH') || wreV10BatchFieldMs_(batch, C.DIAJUKAN_PADA);
  if (status === TUNJANGAN_STATUS.DISETUJUI_LURAH) return a_('SETUJUI_REKAP_TUNJANGAN') || wreV10BatchFieldMs_(batch, C.DISETUJUI_PADA);
  if (status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA) return a_('TERUSKAN_KE_BENDAHARA') || wreV10BatchFieldMs_(batch, C.DITERUSKAN_BENDAHARA_PADA);
  if (status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN) {
    return a_('TANDAI_SUDAH_DICAIRKAN_BACKFILL') || a_('TANDAI_SUDAH_DICAIRKAN') || wreV10BatchFieldMs_(batch, C.DICAIRKAN_PADA);
  }
  return 0;
}

function wreV10ReviewReminder_(nowMs) {
  var p = periodeKinerjaAktifUntukLaporanWajibV34_(new Date(nowMs));
  var req = reviewCenterNormalizeRequestV10_({ periode:p, status:'MENUNGGU', kelompok:'SEMUA', urutan:'TERLAMA', offset:0, limit:1 });
  var read = reviewCenterReadIndexV10_(req, reviewCenterEmployeeMapV10_());
  var s = read.summary || {};
  var total = Number(s.totalPending || 0);
  if (!total || !s.oldestPendingMs) return null;
  var age = wreV10AgeHours_(s.oldestPendingMs, nowMs);
  var sev = wreV10Severity_('REVIEW_PENDING', age);
  if (!sev) return null;
  return wreV10MakeReminder_({
    ruleId:'REVIEW_PENDING', severity:sev, periode:p, entityKey:p,
    ageHours:age, sinceAt:formatTanggalJamClient_(new Date(s.oldestPendingMs)),
    title:'Antrean review menunggu terlalu lama',
    message:total + ' laporan masih menunggu review. Laporan tertua sudah menunggu ' + wreV10AgeLabel_(age) + '.',
    recommendation:'Buka Pusat Review dan selesaikan laporan paling lama terlebih dahulu.',
    route:{ menuId:'menuReviewCenter', pageId:'halReviewCenter', title:'Pusat Review' },
    metrics:{ totalPending:total, pamong:Number(s.PAMONG||0), dukuh:Number(s.DUKUH||0), staf:Number(s.STAF||0), phl:Number(s.PHL||0) }
  });
}

function wreV10MonthlyReminders_(nowMs) {
  var out = [];
  var p = mcV10DefaultPeriode_();
  if (!p) return out;
  var closing = bangunMonthlyClosingV10_(p);
  var batch = getBatchAktifTunjangan_(p);
  var archive = null;
  try { archive = bangunMonthlyArchiveV10_(p); } catch (eArchive) { archive = null; }

  if (closing && closing.period && !closing.period.closed && closing.canCloseOfficial === true) {
    var closeSince = Number(closing.report && closing.report.latestReportMs || 0);
    if (!closeSince) closeSince = nowMs - 6 * 3600000;
    var closeAge = wreV10AgeHours_(closeSince, nowMs);
    var closeSev = wreV10Severity_('PERIOD_READY_TO_CLOSE', closeAge);
    if (closeSev) out.push(wreV10MakeReminder_({
      ruleId:'PERIOD_READY_TO_CLOSE', severity:closeSev, periode:p, entityKey:p,
      ageHours:closeAge, sinceAt:closing.report && closing.report.latestReportAt || '',
      title:'Periode siap ditutup resmi',
      message:'Seluruh prasyarat penutupan periode ' + labelPembayaranPeriode_(p) + ' sudah terpenuhi, tetapi periode belum ditutup.',
      recommendation:'Buka Penutupan Bulan dan lakukan penutupan resmi setelah verifikasi akhir.',
      route:{ menuId:'menuMonthlyClosing', pageId:'halMonthlyClosing', title:'Penutupan Bulanan' },
      metrics:{ pending:Number(closing.report && closing.report.pending || 0) }
    }));
  }

  if (closing && closing.period && closing.period.closed && !batch) {
    var cutoff = parseTanggal(closing.period.cutoffAt || '');
    var missAge = wreV10AgeHours_(cutoff instanceof Date ? cutoff.getTime() : 0, nowMs);
    var missSev = wreV10Severity_('BATCH_MISSING_AFTER_CLOSE', missAge);
    if (missSev) out.push(wreV10MakeReminder_({
      ruleId:'BATCH_MISSING_AFTER_CLOSE', severity:missSev, periode:p, entityKey:p,
      ageHours:missAge, sinceAt:String(closing.period.cutoffLabel || ''),
      title:'Batch tunjangan belum dibuat',
      message:'Periode ' + labelPembayaranPeriode_(p) + ' sudah ditutup, tetapi belum ada batch tunjangan aktif.',
      recommendation:'Buka menu Tunjangan dan buat Draft rekap untuk periode tersebut.',
      route:{ menuId:'menuTunjangan', pageId:'halTunjangan', title:'Tunjangan' }
    }));
    return out;
  }

  if (!batch) return out;
  var status = String(batch.status || '').trim();
  var audit = wreV10LatestAuditTunjangan_(p, batch.batchId);
  var sinceMs = wreV10TransitionMs_(status, batch, audit);
  var age = wreV10AgeHours_(sinceMs, nowMs);
  var rule = '', title = '', message = '', recommendation = '', route = { menuId:'menuTunjangan', pageId:'halTunjangan', title:'Tunjangan' };

  if (status === TUNJANGAN_STATUS.DRAFT || status === TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH) {
    rule = 'DRAFT_NOT_LOCKED'; title = 'Draft tunjangan belum dikunci';
    message = 'Batch ' + labelPembayaranPeriode_(p) + ' masih berstatus ' + status + '.';
    recommendation = 'Periksa rekap dan kunci Draft jika sudah benar.';
  } else if (status === TUNJANGAN_STATUS.DIKUNCI_CARIK) {
    rule = 'LOCKED_NOT_SUBMITTED'; title = 'Batch belum diajukan ke Lurah';
    message = 'Batch ' + labelPembayaranPeriode_(p) + ' sudah Dikunci Carik tetapi belum diajukan ke Lurah.';
    recommendation = 'Ajukan batch kepada Lurah setelah pemeriksaan final.';
  } else if (status === TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH) {
    rule = 'SUBMITTED_WAITING_LURAH'; title = 'Persetujuan Lurah belum diproses';
    message = 'Batch ' + labelPembayaranPeriode_(p) + ' sudah diajukan dan masih menunggu keputusan Lurah.';
    recommendation = 'Lurah perlu memeriksa dan menyetujui atau mengembalikan batch.';
  } else if (status === TUNJANGAN_STATUS.DISETUJUI_LURAH) {
    rule = 'APPROVED_NOT_FORWARDED'; title = 'Batch belum diteruskan ke Bendahara';
    message = 'Batch ' + labelPembayaranPeriode_(p) + ' sudah Disetujui Lurah tetapi belum diteruskan ke Bendahara.';
    recommendation = 'Carik perlu menjalankan pemeriksaan akhir lalu meneruskan batch ke Bendahara.';
  } else if (status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA) {
    rule = 'FORWARDED_NOT_PAID'; title = 'Pencairan belum dikonfirmasi';
    message = 'Batch ' + labelPembayaranPeriode_(p) + ' sudah diteruskan ke Bendahara tetapi belum berstatus Sudah Dicairkan.';
    recommendation = 'Bendahara perlu mengonfirmasi pembayaran setelah pencairan benar-benar terjadi.';
  }

  if (rule) {
    var sev = wreV10Severity_(rule, age);
    if (sev) out.push(wreV10MakeReminder_({
      ruleId:rule, severity:sev, periode:p, entityKey:String(batch.batchId || p), ageHours:age,
      sinceAt:sinceMs ? formatTanggalJamClient_(new Date(sinceMs)) : '', title:title, message:message,
      recommendation:recommendation, route:route, metrics:{ status:status, batchId:String(batch.batchId || '') }
    }));
  }

  if (status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN && archive) {
    if (archive.status === 'SIAP_DIARSIPKAN') {
      var paidAge = wreV10AgeHours_(sinceMs, nowMs);
      var paidSev = wreV10Severity_('PAID_NOT_ARCHIVED', paidAge);
      if (paidSev) out.push(wreV10MakeReminder_({
        ruleId:'PAID_NOT_ARCHIVED', severity:paidSev, periode:p, entityKey:String(batch.batchId || p), ageHours:paidAge,
        sinceAt:sinceMs ? formatTanggalJamClient_(new Date(sinceMs)) : '', title:'Periode siap diarsipkan',
        message:'Tunjangan ' + labelPembayaranPeriode_(p) + ' sudah dicairkan dan seluruh prasyarat Arsip Bulanan sudah terpenuhi.',
        recommendation:'Buka Arsip Bulanan dan buat Arsip Final.',
        route:{ menuId:'menuMonthlyArchive', pageId:'halMonthlyArchive', title:'Arsip Bulanan' },
        metrics:{ batchId:String(batch.batchId || ''), archiveStatus:archive.status }
      }));
    } else if (archive.status === 'SUDAH_DIARSIPKAN' && archive.archive && String(archive.archive.integrityStatus || '') !== 'TERVERIFIKASI') {
      var created = parseTanggal(archive.archive.createdAt || '');
      var verifyAge = wreV10AgeHours_(created instanceof Date ? created.getTime() : sinceMs, nowMs);
      var verifySev = wreV10Severity_('ARCHIVE_NOT_VERIFIED', verifyAge);
      if (verifySev) out.push(wreV10MakeReminder_({
        ruleId:'ARCHIVE_NOT_VERIFIED', severity:verifySev, periode:p, entityKey:String(archive.archive.archiveId || p), ageHours:verifyAge,
        sinceAt:String(archive.archive.createdAt || ''), title:'Arsip Final belum diverifikasi',
        message:'Arsip Final ' + labelPembayaranPeriode_(p) + ' sudah dibuat tetapi integritas paket belum berstatus TERVERIFIKASI.',
        recommendation:'Buka Arsip Bulanan dan jalankan Verifikasi checksum.',
        route:{ menuId:'menuMonthlyArchive', pageId:'halMonthlyArchive', title:'Arsip Bulanan' },
        metrics:{ archiveId:String(archive.archive.archiveId || ''), integrityStatus:String(archive.archive.integrityStatus || '') }
      }));
    }
  }
  return out;
}

function bangunWorkflowReminderEscalationV10_(now) {
  var started = Date.now();
  var nowDate = now instanceof Date && !isNaN(now.getTime()) ? now : wreV10Now_();
  var nowMs = nowDate.getTime();
  var items = [];
  try {
    var r = wreV10ReviewReminder_(nowMs);
    if (r) items.push(r);
  } catch (eReview) {
    items.push(wreV10MakeReminder_({
      ruleId:'REVIEW_PENDING', severity:'ESCALATED', periode:'', entityKey:'ENGINE_REVIEW_READ_ERROR', ageHours:48,
      title:'Pemeriksaan antrean review gagal', message:'Engine reminder belum dapat membaca antrean review.',
      recommendation:'Periksa Kesehatan Sistem dan Index_Laporan.', recipients:['CARIK','LURAH'],
      route:{ menuId:'menuOperationalHealth', pageId:'halOperationalHealth', title:'Kesehatan Sistem' }, metrics:{ code:'REVIEW_READ_ERROR' }
    }));
  }
  try {
    items = items.concat(wreV10MonthlyReminders_(nowMs));
  } catch (eMonthly) {
    items.push(wreV10MakeReminder_({
      ruleId:'PERIOD_READY_TO_CLOSE', severity:'ESCALATED', periode:'', entityKey:'ENGINE_MONTHLY_READ_ERROR', ageHours:24,
      title:'Pemeriksaan workflow bulanan gagal', message:'Engine reminder belum dapat membaca status closing/tunjangan/arsip.',
      recommendation:'Periksa Kesehatan Sistem.', recipients:['CARIK','LURAH'],
      route:{ menuId:'menuOperationalHealth', pageId:'halOperationalHealth', title:'Kesehatan Sistem' }, metrics:{ code:'MONTHLY_READ_ERROR' }
    }));
  }
  items = items.filter(function (x) { return !!x; });
  items.sort(function (a,b) {
    var rank = Number(b.severityRank || 0) - Number(a.severityRank || 0);
    if (rank) return rank;
    return Number(b.ageHours || 0) - Number(a.ageHours || 0);
  });
  var summary = { total:items.length, critical:0, escalated:0, due:0 };
  items.forEach(function (x) {
    if (x.severity === 'CRITICAL') summary.critical++;
    else if (x.severity === 'ESCALATED') summary.escalated++;
    else if (x.severity === 'DUE') summary.due++;
  });
  return {
    sukses:true,
    versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_,
    appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
    generatedAt:formatTanggalJamClient_(nowDate),
    generatedAtMs:nowMs,
    summary:summary,
    items:items,
    serverMs:Date.now()-started,
    policy:{ readOnlyEvaluation:true, noBusinessMutation:true, noNewSheet:true, auditCooldownHours:WRE_V10_AUDIT_COOLDOWN_HOURS_ }
  };
}

function wreV10SchedulerStatus_() {
  var list = [];
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (String(triggers[i].getHandlerFunction ? triggers[i].getHandlerFunction() : '') === WRE_V10_TRIGGER_FUNCTION_) list.push(triggers[i]);
    }
  } catch (e) { }
  var last = null;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(WRE_V10_LAST_RUN_PROP_);
    if (raw) last = JSON.parse(raw);
  } catch (e2) { }
  return { installed:list.length > 0, triggerCount:list.length, cadenceHours:4, lastRun:last };
}

function wreV10History_(role, limit) {
  var out = [];
  var maxItems = Math.max(1, Math.min(100, Number(limit || 50)));
  var sh = null;
  try { sh = getSheet_('Audit_Log'); } catch (eSheet) { return out; }
  if (!sh || sh.getLastRow() < 2) return out;
  var data = sh.getDataRange().getValues();
  var C = SHEET_COLUMNS.AUDIT_LOG;
  var roleUpper = String(role || '').toUpperCase();
  for (var i = data.length - 1; i >= 1 && out.length < maxItems; i--) {
    var row = data[i] || [];
    if (String(row[C.AKSI] || '') !== 'WORKFLOW_REMINDER_RAISED') continue;
    var detail = null;
    try { detail = JSON.parse(String(row[C.DETAIL] || '')); } catch (eParse) { detail = null; }
    if (!detail || typeof detail !== 'object') continue;
    var recipients = Array.isArray(detail.recipients) ? detail.recipients.map(function (x) { return String(x || '').toUpperCase(); }) : [];
    if (roleUpper && recipients.indexOf(roleUpper) === -1) continue;
    var dt = parseTanggal(row[C.WAKTU]);
    var atMs = dt instanceof Date && !isNaN(dt.getTime()) ? dt.getTime() : 0;
    out.push({
      at: atMs ? formatTanggalJamClient_(dt) : String(row[C.WAKTU] || ''),
      atMs: atMs,
      key: String(detail.key || ''),
      ruleId: String(detail.ruleId || ''),
      severity: String(detail.severity || ''),
      severityRank: wreV10SeverityRank_(detail.severity),
      periode: String(detail.periode || ''),
      ageHours: Math.max(0, Number(detail.ageHours || 0)),
      ageLabel: wreV10AgeLabel_(detail.ageHours || 0),
      recipients: recipients,
      title: String(detail.title || detail.ruleId || 'Pengingat workflow'),
      route: detail.route && typeof detail.route === 'object' ? detail.route : {},
      engineVersion: String(detail.versi || '')
    });
  }
  return out;
}

function wreV10HistorySummary_(items) {
  var s = { total:0, critical:0, escalated:0, due:0 };
  (items || []).forEach(function (x) {
    s.total++;
    if (x.severity === 'CRITICAL') s.critical++;
    else if (x.severity === 'ESCALATED') s.escalated++;
    else if (x.severity === 'DUE') s.due++;
  });
  return s;
}

function ambilWorkflowReminderV10(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.', items:[] };
    var role = wreV10Role_(idUser);
    if (!role) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Pengingat Workflow hanya tersedia untuk Carik, Lurah, dan Bendahara.', items:[] };
    var all = bangunWorkflowReminderEscalationV10_(new Date());
    var items = all.items.filter(function (x) { return (x.recipients || []).indexOf(role) !== -1; });
    var summary = { total:items.length, critical:0, escalated:0, due:0 };
    items.forEach(function (x) {
      if (x.severity === 'CRITICAL') summary.critical++;
      else if (x.severity === 'ESCALATED') summary.escalated++;
      else if (x.severity === 'DUE') summary.due++;
    });
    var history = wreV10History_(role, 50);
    return {
      sukses:true, versi:all.versi, appVersion:all.appVersion, generatedAt:all.generatedAt,
      role:role,
      summary:summary, items:items, globalSummary:all.summary,
      activeSummary:summary, activeItems:items,
      history:history, historySummary:wreV10HistorySummary_(history),
      scheduler:wreV10SchedulerStatus_(), readOnly:true, dataDiubah:false, statusBisnisDiubah:false
    };
  } catch (e) {
    return handleError('ambilWorkflowReminderV10', e, { sukses:false, pesan:'Pengingat Workflow belum dapat dimuat.', items:[] });
  }
}

function wreV10EventPropertyKey_(reminderKey) {
  return WRE_V10_EVENT_PREFIX_ + wreV10Sha_(String(reminderKey || '')).substring(0, 32);
}

function wreV10ShouldAudit_(state, reminder, nowMs) {
  if (!state) return true;
  var oldRank = wreV10SeverityRank_(state.severity);
  var newRank = wreV10SeverityRank_(reminder.severity);
  if (newRank > oldRank) return true;
  var last = Number(state.lastLoggedAtMs || 0);
  return !last || (nowMs - last) >= WRE_V10_AUDIT_COOLDOWN_HOURS_ * 3600000;
}

function prosesWorkflowReminderTerjadwalV10() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return {
      sukses:false,
      code:'LOCK_BUSY',
      versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_,
      pesan:'Proses pengingat lain masih berjalan. Eksekusi ini dilewati untuk mencegah duplikasi audit.',
      dataBisnisDiubah:false
    };
  }
  try {
    var now = new Date();
    var nowMs = now.getTime();
    var props = PropertiesService.getScriptProperties();
    var snapshot = bangunWorkflowReminderEscalationV10_(now);
    var activeKeys = [];
    var logged = 0;
    snapshot.items.forEach(function (item) {
    activeKeys.push(item.key);
    var pkey = wreV10EventPropertyKey_(item.key);
    var state = null;
    try { var raw = props.getProperty(pkey); if (raw) state = JSON.parse(raw); } catch (e) { state = null; }
    if (wreV10ShouldAudit_(state, item, nowMs)) {
      logAudit_('SYSTEM_WRE', 'WORKFLOW_REMINDER_RAISED', JSON.stringify({
        versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_, key:item.key, ruleId:item.ruleId, severity:item.severity,
        periode:item.periode, ageHours:item.ageHours, recipients:item.recipients, title:item.title, route:item.route
      }));
      logged++;
      state = state || {};
      state.lastLoggedAtMs = nowMs;
      state.lastLoggedAt = formatTanggalJamClient_(now);
      state.severity = item.severity;
      state.ruleId = item.ruleId;
      props.setProperty(pkey, JSON.stringify(state));
    }
  });

  var previous = [];
  try { previous = JSON.parse(props.getProperty(WRE_V10_ACTIVE_KEYS_PROP_) || '[]'); } catch (ePrev) { previous = []; }
  if (Array.isArray(previous)) {
    previous.forEach(function (key) {
      if (activeKeys.indexOf(key) === -1) props.deleteProperty(wreV10EventPropertyKey_(key));
    });
  }
  props.setProperty(WRE_V10_ACTIVE_KEYS_PROP_, JSON.stringify(activeKeys));
  var run = {
    at:formatTanggalJamClient_(now), atMs:nowMs, total:snapshot.summary.total,
    critical:snapshot.summary.critical, escalated:snapshot.summary.escalated, due:snapshot.summary.due,
    auditLogged:logged, appVersion:String(APP_VERSION || '')
  };
    props.setProperty(WRE_V10_LAST_RUN_PROP_, JSON.stringify(run));
    return { sukses:true, versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_, reminderAktif:activeKeys.length, auditDicatat:logged, summary:snapshot.summary, run:run, dataBisnisDiubah:false };
  } finally {
    try { lock.releaseLock(); } catch (eLockRelease) {}
  }
}

function statusTriggerWorkflowReminderV10() {
  var maintainer = typeof pastikanMaintainerPortal3B0_ === 'function' ? pastikanMaintainerPortal3B0_('STATUS_TRIGGER_WRE_V10') : '';
  var st = wreV10SchedulerStatus_();
  st.sukses = true; st.versi = WORKFLOW_REMINDER_ESCALATION_V10_VERSION_; st.appVersion = String(APP_VERSION || ''); st.maintainerVerified = !!maintainer;
  Logger.log(JSON.stringify(st, null, 2));
  return st;
}

function pasangTriggerWorkflowReminderV10() {
  var maintainer = typeof pastikanMaintainerPortal3B0_ === 'function' ? pastikanMaintainerPortal3B0_('PASANG_TRIGGER_WRE_V10') : '';
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (String(triggers[i].getHandlerFunction ? triggers[i].getHandlerFunction() : '') === WRE_V10_TRIGGER_FUNCTION_) {
      if (count === 0) count++;
      else ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  if (count === 0) ScriptApp.newTrigger(WRE_V10_TRIGGER_FUNCTION_).timeBased().everyHours(4).create();
  var st = wreV10SchedulerStatus_();
  logAudit_('SYSTEM_WRE', 'WORKFLOW_REMINDER_TRIGGER_ENABLED', JSON.stringify({ cadenceHours:4, appVersion:String(APP_VERSION || '') }));
  return { sukses:st.installed === true, versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_, installed:st.installed, triggerCount:st.triggerCount, cadenceHours:4, maintainerVerified:!!maintainer };
}

function hapusTriggerWorkflowReminderV10() {
  var maintainer = typeof pastikanMaintainerPortal3B0_ === 'function' ? pastikanMaintainerPortal3B0_('HAPUS_TRIGGER_WRE_V10') : '';
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (String(triggers[i].getHandlerFunction ? triggers[i].getHandlerFunction() : '') === WRE_V10_TRIGGER_FUNCTION_) {
      ScriptApp.deleteTrigger(triggers[i]); removed++;
    }
  }
  logAudit_('SYSTEM_WRE', 'WORKFLOW_REMINDER_TRIGGER_DISABLED', JSON.stringify({ removed:removed, appVersion:String(APP_VERSION || '') }));
  return { sukses:true, versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_, removed:removed, maintainerVerified:!!maintainer };
}

// Validasi sintetis; tidak membaca/menulis spreadsheet produksi.
function validasiWorkflowReminderEscalationV10() {
  var maintainer = typeof pastikanMaintainerPortal3B0_ === 'function' ? pastikanMaintainerPortal3B0_('VALIDASI_WRE_V10') : '';
  var checks = [];
  function add_(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail || '') }); }
  add_('VERSION', WORKFLOW_REMINDER_ESCALATION_V10_VERSION_ === 'WRE-v1.0-RC3-2026.10.04.01', WORKFLOW_REMINDER_ESCALATION_V10_VERSION_);
  add_('DUE_24H', wreV10Severity_('REVIEW_PENDING',24) === 'DUE', wreV10Severity_('REVIEW_PENDING',24));
  add_('ESCALATED_48H', wreV10Severity_('REVIEW_PENDING',48) === 'ESCALATED', wreV10Severity_('REVIEW_PENDING',48));
  add_('CRITICAL_72H', wreV10Severity_('REVIEW_PENDING',72) === 'CRITICAL', wreV10Severity_('REVIEW_PENDING',72));
  add_('CARIK_FIRST_LOCKED', wreV10Recipients_('LOCKED_NOT_SUBMITTED','DUE').join(',') === 'CARIK', wreV10Recipients_('LOCKED_NOT_SUBMITTED','DUE'));
  add_('LURAH_ESCALATION_LOCKED', wreV10Recipients_('LOCKED_NOT_SUBMITTED','ESCALATED').indexOf('LURAH') !== -1, wreV10Recipients_('LOCKED_NOT_SUBMITTED','ESCALATED'));
  add_('BENDAHARA_FIRST_PAYMENT', wreV10Recipients_('FORWARDED_NOT_PAID','DUE')[0] === 'BENDAHARA', wreV10Recipients_('FORWARDED_NOT_PAID','DUE'));
  add_('CRITICAL_PAYMENT_ESCALATES_LURAH', wreV10Recipients_('FORWARDED_NOT_PAID','CRITICAL').indexOf('LURAH') !== -1, wreV10Recipients_('FORWARDED_NOT_PAID','CRITICAL'));
  add_('AUDIT_COOLDOWN_24H', WRE_V10_AUDIT_COOLDOWN_HOURS_ === 24, WRE_V10_AUDIT_COOLDOWN_HOURS_);
  add_('READ_ENDPOINT', typeof ambilWorkflowReminderV10 === 'function', typeof ambilWorkflowReminderV10);
  add_('TRIGGER_RUNNER', typeof prosesWorkflowReminderTerjadwalV10 === 'function', typeof prosesWorkflowReminderTerjadwalV10);
  add_('HISTORY_READ_MODEL', typeof wreV10History_ === 'function' && typeof wreV10HistorySummary_ === 'function', 'Audit_Log read-only history + PropertiesService scheduler state');
  add_('NO_BUSINESS_WRITE', true, 'Engine hanya evaluasi reminder; trigger hanya state property + audit reminder.');
  add_('ROADMAP_COMPATIBLE', true, 'Output engine dirancang untuk dikonsumsi Exception & Action Center v1.0.');
  var passed = checks.filter(function (x) { return x.lulus; }).length;
  var result = { sukses:passed===checks.length, valid:passed===checks.length, versi:WORKFLOW_REMINDER_ESCALATION_V10_VERSION_, appVersion:String(APP_VERSION||''), jumlah:checks.length, lulus:passed, gagal:checks.length-passed, checks:checks, maintainerVerified:!!maintainer, dataBisnisDiubah:false, schemaDiubah:false };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
