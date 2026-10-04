// ============================================================================
// KOREKSI ADMINISTRATIF TANGGAL PEMBAYARAN v1.0
// Integrated APP_VERSION 2026.10.03.03
//
// Tujuan:
// - Memperbaiki kesalahan input tanggal pembayaran pada batch yang SUDAH FINAL.
// - Tidak membuka kembali workflow dan tidak mengubah nominal/status/penerima.
// - Hanya Carik/Lurah yang dapat melakukan koreksi administratif.
// - Setiap koreksi wajib memiliki expected batch/date + alasan + konfirmasi.
// - Jejak oldDate -> newDate disimpan di Audit_Tunjangan.
// ============================================================================

var KOREKSI_ADMIN_TANGGAL_PEMBAYARAN_V10_VERSION_ = 'KATP-v1.0-RC1-2026.10.02.07';

function katpV10DateOnly_(value) {
  var d = parseDateOnly_(value) || parseTanggal(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function katpV10Iso_(value) {
  var d = katpV10DateOnly_(value);
  return d ? Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd') : '';
}

function katpV10NormalizeInput_(request) {
  var r = request && typeof request === 'object' ? request : {};
  var expectedBatchId = String(r.expectedBatchId || '').trim();
  var expectedOldDate = String(r.expectedOldDate || '').trim();
  var newDate = String(r.newDate || r.tanggalBaru || '').trim();
  var reason = String(r.reason || r.alasan || '').trim();
  var confirmation = r.confirmation === true || r.konfirmasi === true;

  if (!expectedBatchId) return { valid:false, code:'EXPECTED_BATCH_REQUIRED', pesan:'ID batch acuan wajib tersedia. Muat ulang halaman.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedOldDate)) return { valid:false, code:'EXPECTED_OLD_DATE_REQUIRED', pesan:'Tanggal pembayaran lama tidak valid. Muat ulang halaman.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { valid:false, code:'NEW_DATE_REQUIRED', pesan:'Tanggal pembayaran yang benar wajib dipilih.' };
  if (!confirmation) return { valid:false, code:'CONFIRMATION_REQUIRED', pesan:'Konfirmasi koreksi administratif wajib dicentang.' };
  if (reason.length < 15) return { valid:false, code:'REASON_TOO_SHORT', pesan:'Alasan koreksi wajib diisi minimal 15 karakter.' };
  if (reason.length > 500) return { valid:false, code:'REASON_TOO_LONG', pesan:'Alasan koreksi maksimal 500 karakter.' };

  var oldObj = katpV10DateOnly_(expectedOldDate);
  var newObj = katpV10DateOnly_(newDate);
  if (!oldObj || !newObj) return { valid:false, code:'DATE_INVALID', pesan:'Tanggal koreksi tidak valid.' };
  if (expectedOldDate === newDate) return { valid:false, code:'DATE_UNCHANGED', pesan:'Tanggal baru harus berbeda dari tanggal yang tersimpan.' };

  var todayEnd = new Date();
  todayEnd.setHours(23,59,59,999);
  if (newObj.getTime() > todayEnd.getTime()) return { valid:false, code:'FUTURE_DATE', pesan:'Tanggal pembayaran yang dikoreksi tidak boleh berada di masa depan.' };

  return {
    valid:true,
    expectedBatchId:expectedBatchId,
    expectedOldDate:expectedOldDate,
    oldDateObj:oldObj,
    newDate:newDate,
    newDateObj:newObj,
    reason:reason,
    confirmation:true
  };
}

function katpV10AccessAllowed_(idUser) {
  return !!(cekHakAksesCarikTunjangan(idUser) || cekHakAksesLurahTunjangan(idUser));
}

function katpV10AppendAuditStrict_(idUser, periode, targetIdUser, targetNama, detail) {
  var sh = ensureSheetAuditTunjangan_();
  var pegawai = getPegawaiById_(idUser) || {};
  sh.appendRow([
    new Date(),
    idUser || '',
    pegawai.nama || '',
    'KOREKSI_ADMINISTRATIF_TANGGAL_PEMBAYARAN',
    periode || '',
    targetIdUser || '',
    targetNama || '',
    TUNJANGAN_STATUS.SUDAH_DICAIRKAN,
    TUNJANGAN_STATUS.SUDAH_DICAIRKAN,
    detail || ''
  ]);
}

function katpV10RollbackPaymentDate_(sh, rows, oldDateObj) {
  var failures = [];
  (rows || []).forEach(function (item) {
    try {
      sh.getRange(item.rowIndex, SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA + 1).setValue(oldDateObj);
    } catch (e) {
      failures.push(String(item.rowIndex) + ':' + (e && e.message ? e.message : e));
    }
  });
  return failures;
}

function katpV10CurrentBatchState_(batch) {
  var ids = {};
  var statuses = {};
  var paymentDates = {};
  var total = 0;
  (batch && batch.rows || []).forEach(function (item) {
    var row = item.values || [];
    var id = String(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.BATCH_ID] || '').trim();
    var status = String(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.STATUS_REKAP] || '').trim();
    var paymentIso = katpV10Iso_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA]);
    if (id) ids[id] = true;
    if (status) statuses[status] = true;
    if (paymentIso) paymentDates[paymentIso] = true;
    total += Number(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.RP_TOTAL]) || 0;
  });
  return {
    batchIds:Object.keys(ids),
    statuses:Object.keys(statuses),
    paymentDates:Object.keys(paymentDates),
    totalNominal:Math.round(total),
    rows:(batch && batch.rows || []).length
  };
}

function koreksiAdministratifTanggalPembayaranV10(periode, request, token) {
  var lock = null;
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, code:'SESSION_EXPIRED', pesan:'Sesi habis, silakan login ulang.' };
    if (!katpV10AccessAllowed_(idUser)) {
      return { sukses:false, code:'ACCESS_DENIED', pesan:'Akses ditolak. Koreksi administratif tanggal pembayaran hanya dapat dilakukan oleh Carik atau Lurah.' };
    }

    var input = katpV10NormalizeInput_(request);
    if (!input.valid) return { sukses:false, code:input.code, pesan:input.pesan };
    var p = normalizePeriode_(periode);

    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { sukses:false, code:'LOCK_BUSY', pesan:'Data tunjangan sedang diproses. Coba lagi beberapa saat.' };

    // Seluruh pemeriksaan dilakukan ulang di dalam lock agar anti-stale.
    var batch = getBatchAktifTunjangan_(p);
    if (!batch || !batch.rows || !batch.rows.length) return { sukses:false, code:'BATCH_NOT_FOUND', pesan:'Batch aktif untuk periode ini tidak ditemukan.' };
    var state = katpV10CurrentBatchState_(batch);
    if (state.batchIds.length !== 1) return { sukses:false, code:'BATCH_ID_INCONSISTENT', pesan:'ID batch aktif tidak konsisten.' };
    if (state.batchIds[0] !== input.expectedBatchId) return { sukses:false, code:'BATCH_CHANGED', pesan:'Batch aktif telah berubah. Muat ulang halaman sebelum melakukan koreksi.' };
    if (state.statuses.length !== 1 || state.statuses[0] !== TUNJANGAN_STATUS.SUDAH_DICAIRKAN) {
      return { sukses:false, code:'STATUS_NOT_FINAL', pesan:'Koreksi tanggal pembayaran hanya tersedia untuk batch berstatus Sudah Dicairkan.' };
    }
    if (state.paymentDates.length !== 1) return { sukses:false, code:'PAYMENT_DATE_INCONSISTENT', pesan:'Tanggal pembayaran pada batch tidak konsisten. Koreksi administratif diblokir.' };
    if (state.paymentDates[0] !== input.expectedOldDate) {
      return { sukses:false, code:'OLD_DATE_CHANGED', pesan:'Tanggal pembayaran yang tersimpan sudah berubah menjadi ' + (state.paymentDates[0] || '-') + '. Muat ulang halaman.' };
    }

    var sh = ensureSheetRekapTunjanganBulanan_();
    var writtenRows = [];
    try {
      batch.rows.forEach(function (item) {
        // DICAIRKAN_PADA adalah index 0-based; getRange memakai 1-based.
        sh.getRange(item.rowIndex, SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA + 1).setValue(input.newDateObj);
        writtenRows.push(item);
      });
    } catch (writeErr) {
      katpV10RollbackPaymentDate_(sh, writtenRows, input.oldDateObj);
      return { sukses:false, code:'DATE_WRITE_FAILED', pesan:'Koreksi tanggal gagal disimpan. Perubahan yang sempat ditulis telah dikembalikan.' };
    }

    var first = batch.rows[0] && batch.rows[0].values ? batch.rows[0].values : [];
    var detail = JSON.stringify({
      versi:KOREKSI_ADMIN_TANGGAL_PEMBAYARAN_V10_VERSION_,
      appVersion:typeof APP_VERSION !== 'undefined' ? String(APP_VERSION) : '',
      batchId:input.expectedBatchId,
      periode:p,
      oldDate:input.expectedOldDate,
      newDate:input.newDate,
      reason:input.reason,
      changedRows:state.rows,
      totalNominal:state.totalNominal,
      statusTetap:TUNJANGAN_STATUS.SUDAH_DICAIRKAN,
      workflowDibukaKembali:false,
      dicatatPortalPada:Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
    });
    try {
      katpV10AppendAuditStrict_(
        idUser,
        p,
        first[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.ID_USER] || '',
        first[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.NAMA] || '',
        detail
      );
    } catch (auditErr) {
      var rollbackFailures = katpV10RollbackPaymentDate_(sh, batch.rows, input.oldDateObj);
      return {
        sukses:false,
        code:'AUDIT_WRITE_FAILED',
        pesan:rollbackFailures.length ? 'Audit gagal disimpan dan rollback tanggal tidak lengkap. Hentikan penggunaan workflow dan periksa data.' : 'Audit gagal disimpan sehingga koreksi tanggal dibatalkan dan dikembalikan ke nilai semula.',
        rollbackFailures:rollbackFailures
      };
    }

    return {
      sukses:true,
      code:'CORRECTED',
      pesan:'Tanggal pembayaran berhasil dikoreksi secara administratif. Status batch tetap Sudah Dicairkan.',
      periode:p,
      batchId:input.expectedBatchId,
      oldDate:input.expectedOldDate,
      newDate:input.newDate,
      changedRows:state.rows,
      totalNominal:state.totalNominal,
      status:TUNJANGAN_STATUS.SUDAH_DICAIRKAN,
      statusDiubah:false,
      workflowDibukaKembali:false,
      auditAction:'KOREKSI_ADMINISTRATIF_TANGGAL_PEMBAYARAN'
    };
  } catch (e) {
    return handleError('koreksiAdministratifTanggalPembayaranV10', e, { sukses:false, pesan:'' });
  } finally {
    try { if (lock) lock.releaseLock(); } catch (e2) {}
  }
}

function validasiKoreksiAdministratifTanggalPembayaranV10() {
  var checks = [];
  function add_(id, ok, detail) { checks.push({ id:id, lulus:!!ok, detail:String(detail == null ? '' : detail) }); }
  add_('MODULE_VERSION', KOREKSI_ADMIN_TANGGAL_PEMBAYARAN_V10_VERSION_ === 'KATP-v1.0-RC1-2026.10.02.07', KOREKSI_ADMIN_TANGGAL_PEMBAYARAN_V10_VERSION_);
  add_('APP_VERSION', String(APP_VERSION || '') === '2026.10.03.03', String(APP_VERSION || ''));
  var ok = katpV10NormalizeInput_({ expectedBatchId:'BATCH', expectedOldDate:'2026-09-28', newDate:'2026-09-29', reason:'Kesalahan pemilihan tanggal pembayaran.', confirmation:true });
  add_('NORMALIZE_VALID', ok.valid && ok.expectedOldDate === '2026-09-28' && ok.newDate === '2026-09-29', ok.code || ok.newDate);
  add_('SAME_DATE_BLOCK', katpV10NormalizeInput_({ expectedBatchId:'BATCH', expectedOldDate:'2026-09-29', newDate:'2026-09-29', reason:'Kesalahan input tanggal pembayaran.', confirmation:true }).code === 'DATE_UNCHANGED', 'same date');
  add_('REASON_REQUIRED', katpV10NormalizeInput_({ expectedBatchId:'BATCH', expectedOldDate:'2026-09-28', newDate:'2026-09-29', reason:'pendek', confirmation:true }).code === 'REASON_TOO_SHORT', 'reason guard');
  add_('CONFIRM_REQUIRED', katpV10NormalizeInput_({ expectedBatchId:'BATCH', expectedOldDate:'2026-09-28', newDate:'2026-09-29', reason:'Kesalahan pemilihan tanggal pembayaran.', confirmation:false }).code === 'CONFIRMATION_REQUIRED', 'confirmation guard');
  add_('ACCESS_HELPER', typeof katpV10AccessAllowed_ === 'function', typeof katpV10AccessAllowed_);
  add_('ACTION_EXISTS', typeof koreksiAdministratifTanggalPembayaranV10 === 'function', typeof koreksiAdministratifTanggalPembayaranV10);
  add_('ACTION_ARITY', typeof koreksiAdministratifTanggalPembayaranV10 === 'function' && koreksiAdministratifTanggalPembayaranV10.length === 3, koreksiAdministratifTanggalPembayaranV10.length);
  add_('AUDIT_AVAILABLE', typeof katpV10AppendAuditStrict_ === 'function' && typeof ensureSheetAuditTunjangan_ === 'function', typeof katpV10AppendAuditStrict_);
  add_('NO_SCHEMA_CHANGE', SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA === 26 && SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.STATUS_REKAP === 15, 'existing columns');
  add_('STATUS_FINAL_CONSTANT', TUNJANGAN_STATUS.SUDAH_DICAIRKAN === 'Sudah Dicairkan', TUNJANGAN_STATUS.SUDAH_DICAIRKAN);
  var failed = checks.filter(function (x) { return !x.lulus; });
  var out = {
    sukses:failed.length === 0,
    valid:failed.length === 0,
    versi:KOREKSI_ADMIN_TANGGAL_PEMBAYARAN_V10_VERSION_,
    appVersion:String(APP_VERSION || ''),
    lulus:checks.length - failed.length,
    gagal:failed.length,
    total:checks.length,
    checks:checks,
    targetDipanggil:false,
    dataDiubah:false,
    statusDiubah:false,
    schemaDiubah:false
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
