// ============================================================================
// TUNJANGAN WORKFLOW DATE & HISTORICAL BACKFILL GUARD v1.0
// Integrated APP_VERSION 2026.10.04.02
//
// Prinsip:
// - Kolom tanggal workflow menyimpan TANGGAL KEJADIAN AKTUAL.
// - Timestamp pencatatan portal tetap immutable di Audit_Tunjangan.
// - Urutan tanggal normal harus kronologis dan tidak boleh masa depan.
// - Pencairan historis yang mendahului penerusan digital hanya diizinkan dengan
//   konfirmasi backfill + alasan wajib; timestamp workflow lama tidak dimundurkan.
// - Tidak menambah/mengubah schema spreadsheet.
// ============================================================================

var TUNJANGAN_WORKFLOW_DATE_BACKFILL_V10_VERSION_ = 'TWDB-v1.0-RC1-2026.10.02.05';

function twdbV10DateOnly_(value) {
  var d = parseDateOnly_(value) || parseTanggal(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function twdbV10Iso_(value) {
  var d = twdbV10DateOnly_(value);
  return d ? Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd') : '';
}

function twdbV10TodayIso_() {
  return Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
}

function twdbV10BatchId_(batch) {
  var ids = {};
  (batch && batch.rows || []).forEach(function (item) {
    var row = item.values || [];
    var id = String(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.BATCH_ID] || '').trim();
    if (id) ids[id] = true;
  });
  var keys = Object.keys(ids);
  return keys.length === 1 ? keys[0] : '';
}

function twdbV10NormalizeTransitionInput_(input) {
  var legacy = !input || typeof input !== 'object' || input instanceof Date;
  var payload = legacy ? { catatan: String(input || ''), tanggalAktual: twdbV10TodayIso_() } : input;
  var tanggal = String(payload.tanggalAktual || payload.tanggal || '').trim();
  var catatan = String(payload.catatan || '').trim();
  var expectedBatchId = String(payload.expectedBatchId || '').trim();

  if (!tanggal) return { valid:false, code:'TANGGAL_AKTUAL_WAJIB', pesan:'Tanggal kejadian aktual wajib diisi.' };
  if (catatan.length > 500) return { valid:false, code:'CATATAN_TERLALU_PANJANG', pesan:'Catatan maksimal 500 karakter.' };
  var dateObj = twdbV10DateOnly_(tanggal);
  if (!dateObj) return { valid:false, code:'TANGGAL_AKTUAL_TIDAK_VALID', pesan:'Format tanggal kejadian aktual tidak valid.' };
  var todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  if (dateObj.getTime() > todayEnd.getTime()) return { valid:false, code:'TANGGAL_AKTUAL_MASA_DEPAN', pesan:'Tanggal kejadian aktual tidak boleh berada di masa depan.' };

  return {
    valid:true,
    tanggalAktual:dateObj,
    tanggalAktualIso:Utilities.formatDate(dateObj, 'GMT+7', 'yyyy-MM-dd'),
    catatan:catatan,
    expectedBatchId:expectedBatchId,
    legacyInput:legacy
  };
}

function twdbV10LatestDateFromColumn_(batch, columnIndex) {
  var latest = null;
  (batch && batch.rows || []).forEach(function (item) {
    var row = item.values || [];
    var d = twdbV10DateOnly_(row[columnIndex]);
    if (d && (!latest || d.getTime() > latest.getTime())) latest = d;
  });
  return latest;
}

function twdbV10ValidateTransitionDate_(batch, input, previousColumnIndex, previousLabel) {
  var out = { valid:false, code:'', pesan:'', tanggalAktual:input && input.tanggalAktual || null, previousDate:null, batchId:'' };
  if (!batch || !batch.rows || !batch.rows.length) {
    out.code = 'BATCH_NOT_FOUND'; out.pesan = 'Batch aktif tidak ditemukan.'; return out;
  }
  var batchId = twdbV10BatchId_(batch);
  if (!batchId) {
    out.code = 'BATCH_ID_TIDAK_KONSISTEN'; out.pesan = 'Batch aktif memiliki ID batch yang tidak konsisten.'; return out;
  }
  if (input.expectedBatchId && input.expectedBatchId !== batchId) {
    out.code = 'BATCH_BERUBAH'; out.pesan = 'Batch aktif telah berubah. Muat ulang halaman sebelum melanjutkan workflow.'; return out;
  }
  var prev = previousColumnIndex == null ? null : twdbV10LatestDateFromColumn_(batch, previousColumnIndex);
  if (previousColumnIndex != null && !prev) {
    out.code = 'TANGGAL_TAHAP_SEBELUMNYA_TIDAK_LENGKAP';
    out.pesan = 'Tanggal ' + String(previousLabel || 'tahap sebelumnya') + ' belum tersedia. Muat ulang dan periksa kronologi workflow.';
    return out;
  }
  if (prev && input.tanggalAktual.getTime() < prev.getTime()) {
    out.code = 'URUTAN_TANGGAL_TIDAK_VALID';
    out.pesan = 'Tanggal kejadian aktual tidak boleh lebih awal dari tanggal ' + String(previousLabel || 'tahap sebelumnya') + ' (' + Utilities.formatDate(prev, 'GMT+7', 'dd/MM/yyyy') + ').';
    out.previousDate = prev;
    return out;
  }
  out.valid = true;
  out.code = 'OK';
  out.pesan = 'Tanggal workflow valid.';
  out.previousDate = prev;
  out.batchId = batchId;
  return out;
}

function twdbV10RunTransition_(periode, inputArg, token, config) {
  var input = twdbV10NormalizeTransitionInput_(inputArg);
  if (!input.valid) return { sukses:false, code:input.code, pesan:input.pesan };
  var p = normalizePeriode_(periode);
  var batch = getBatchAktifTunjangan_(p);
  if (!batch || !batch.rows || !batch.rows.length) return { sukses:false, code:'BATCH_NOT_FOUND', pesan:'Batch aktif untuk periode ini tidak ditemukan.' };

  var previousColumnIndex = config.previousColumnIndex;
  var previousLabel = config.previousLabel;
  if (typeof config.previousResolver === 'function') {
    var resolved = config.previousResolver(batch) || {};
    previousColumnIndex = resolved.columnIndex;
    previousLabel = resolved.label || previousLabel;
  }
  var dateGuard = twdbV10ValidateTransitionDate_(batch, input, previousColumnIndex, previousLabel);
  if (!dateGuard.valid) return { sukses:false, code:dateGuard.code, pesan:dateGuard.pesan };

  var auditDetail = JSON.stringify({
    versi:TUNJANGAN_WORKFLOW_DATE_BACKFILL_V10_VERSION_,
    mode:'NORMAL',
    stage:String(config.stage || ''),
    tanggalKejadianAktual:input.tanggalAktualIso,
    dicatatPortalPada:Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
    previousStageDate:dateGuard.previousDate ? Utilities.formatDate(dateGuard.previousDate, 'GMT+7', 'yyyy-MM-dd') : '',
    batchId:dateGuard.batchId,
    legacyInput:!!input.legacyInput,
    catatan:input.catatan
  });

  var cfg = {};
  Object.keys(config.updateConfig || {}).forEach(function (k) { cfg[k] = config.updateConfig[k]; });
  cfg.catatan = input.catatan;
  cfg.dateValue = input.tanggalAktual;
  cfg.auditDetail = auditDetail;
  var result = updateBatchTunjanganStatus_(p, token, cfg);
  if (result && result.sukses) {
    result.tanggalAktual = input.tanggalAktualIso;
    result.dicatatPortalPada = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    result.modeTanggal = 'AKTUAL';
    result.batchId = dateGuard.batchId;
  }
  return result;
}

function twdbV10IsHistoricalPayment_(tanggalPencairan, tanggalDiteruskan) {
  var p = twdbV10DateOnly_(tanggalPencairan);
  var f = twdbV10DateOnly_(tanggalDiteruskan);
  return !!(p && f && p.getTime() < f.getTime());
}

function validasiTunjanganWorkflowDateBackfillV10() {
  var checks = [];
  function add_(id, ok, detail) { checks.push({ id:id, lulus:!!ok, detail:String(detail == null ? '' : detail) }); }
  add_('MODULE_VERSION', TUNJANGAN_WORKFLOW_DATE_BACKFILL_V10_VERSION_ === 'TWDB-v1.0-RC1-2026.10.02.05', TUNJANGAN_WORKFLOW_DATE_BACKFILL_V10_VERSION_);
  add_('APP_VERSION', String(APP_VERSION || '') === '2026.10.04.02', String(APP_VERSION || ''));
  var n = twdbV10NormalizeTransitionInput_({ tanggalAktual:'2026-09-29', catatan:'Sesuai', expectedBatchId:'B' });
  add_('NORMALIZE_DATE', n.valid && n.tanggalAktualIso === '2026-09-29', n.tanggalAktualIso || n.pesan);
  var future = new Date(); future.setDate(future.getDate()+2);
  var futureIso = Utilities.formatDate(future, 'GMT+7', 'yyyy-MM-dd');
  add_('FUTURE_BLOCK', twdbV10NormalizeTransitionInput_({tanggalAktual:futureIso}).code === 'TANGGAL_AKTUAL_MASA_DEPAN', futureIso);
  add_('HISTORICAL_TRUE', twdbV10IsHistoricalPayment_('2026-09-29','2026-10-02') === true, '29/09 < 02/10');
  add_('HISTORICAL_FALSE', twdbV10IsHistoricalPayment_('2026-10-02','2026-10-02') === false, 'same day');
  add_('NO_SCHEMA_CHANGE', SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA === 26 && SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.BATCH_ID === 28, 'existing columns');
  add_('ACTION_ARITY_AJUKAN', typeof ajukanTunjanganKeLurah === 'function' && ajukanTunjanganKeLurah.length === 3, ajukanTunjanganKeLurah.length);
  add_('ACTION_ARITY_SETUJUI', typeof setujuiRekapTunjangan === 'function' && setujuiRekapTunjangan.length === 3, setujuiRekapTunjangan.length);
  add_('ACTION_ARITY_TERUSKAN', typeof teruskanKeBendahara === 'function' && teruskanKeBendahara.length === 3, teruskanKeBendahara.length);
  add_('ACTION_ARITY_CAIR', typeof tandaiSudahDicairkan === 'function' && tandaiSudahDicairkan.length === 4, tandaiSudahDicairkan.length);
  add_('AUDIT_AVAILABLE', typeof logAuditTunjangan_ === 'function', typeof logAuditTunjangan_);
  var failed = checks.filter(function (x) { return !x.lulus; });
  var out = { sukses:failed.length===0, valid:failed.length===0, versi:TUNJANGAN_WORKFLOW_DATE_BACKFILL_V10_VERSION_, appVersion:String(APP_VERSION || ''), lulus:checks.length-failed.length, gagal:failed.length, total:checks.length, checks:checks, targetDipanggil:false, dataDiubah:false, schemaDiubah:false };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
