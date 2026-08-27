/**
 * ============================================================================
 * OPTIMASI 3C-2 — FAST BUILD PAGE ITEMS REVIEW ADMIN
 * APP_VERSION: 2026.08.08.02
 *
 * Fokus:
 * - mengurangi biaya build 10 kartu Review Admin setelah 3C-1 cache HIT;
 * - menghindari PropertiesService.getProperty() berulang saat builder mengevaluasi
 *   metadata cut-off informasional per item;
 * - memakai snapshot context cut-off yang SUDAH dibangun satu kali oleh 3C-1;
 * - melewati injectKolomKQKeItemReview_ pada fast builder karena builder aktif
 *   sudah mengirim K-Q/top-level/spreadsheetDetail; equivalence diverifikasi shadow;
 * - fallback otomatis ke builder 3C-1 lama pada mismatch/error/circuit.
 *
 * Tidak mengubah data, poin, status review, schema, resolver periode C1c, atau
 * kontrak endpoint frontend. Endpoint tetap ambilLaporanAdminPerPegawai3C1.
 * ============================================================================
 */

var OPTIMASI_BUILD_REVIEW_ADMIN_3C2 = {
  VERSION: '3C2-2026.08.08.02',
  APP_VERSION_EXPECTED: '2026.08.27.03',
  ENABLED_PROPERTY: 'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_ENABLED',
  ENABLED_AT_PROPERTY: 'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_ENABLED_AT',
  SHADOW_PERCENT_PROPERTY: 'OPTIMASI_BUILD_REVIEW_ADMIN_3C2_SHADOW_PERCENT',
  DEFAULT_SHADOW_PERCENT: 100,
  CIRCUIT_CACHE_KEY: 'OR3C2_BUILD_CIRCUIT',
  CIRCUIT_TTL_SECONDS: 300,
  METRICS_CACHE_KEY: 'OR3C2_BUILD_METRICS',
  METRICS_TTL_SECONDS: 21600
};

function optimasiBuildReviewAdminAktif3C2_() {
  try {
    return String(portalScriptProperties_().getProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.ENABLED_PROPERTY) || '').toLowerCase() === 'true';
  } catch (e) {
    return false;
  }
}

function persentaseShadowOptimasiBuildReviewAdmin3C2_() {
  var raw = '';
  try { raw = portalScriptProperties_().getProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.SHADOW_PERCENT_PROPERTY) || ''; } catch (e) { raw = ''; }
  var n = raw === '' ? OPTIMASI_BUILD_REVIEW_ADMIN_3C2.DEFAULT_SHADOW_PERCENT : Number(raw);
  if (!isFinite(n)) n = OPTIMASI_BUILD_REVIEW_ADMIN_3C2.DEFAULT_SHADOW_PERCENT;
  return Math.max(0, Math.min(100, n));
}

function bacaCircuitOptimasiBuildReviewAdmin3C2_() {
  try {
    var raw = CacheService.getScriptCache().get(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.CIRCUIT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function bukaCircuitOptimasiBuildReviewAdmin3C2_(reason, detail) {
  var payload = {
    aktif: true,
    reason: String(reason || 'UNKNOWN'),
    detail: String(detail || '').substring(0, 900),
    waktu: new Date().toISOString(),
    ttlDetik: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.CIRCUIT_TTL_SECONDS
  };
  try {
    CacheService.getScriptCache().put(
      OPTIMASI_BUILD_REVIEW_ADMIN_3C2.CIRCUIT_CACHE_KEY,
      JSON.stringify(payload),
      OPTIMASI_BUILD_REVIEW_ADMIN_3C2.CIRCUIT_TTL_SECONDS
    );
  } catch (e) {}
  return payload;
}

function resetCircuitOptimasiBuildReviewAdmin3C2_() {
  try { CacheService.getScriptCache().remove(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.CIRCUIT_CACHE_KEY); } catch (e) {}
}

function metrikKosongOptimasiBuildReviewAdmin3C2_() {
  return {
    calls: 0,
    fastBuildSuccess: 0,
    legacyBuildDisabled: 0,
    fallbackCircuit: 0,
    fallbackError: 0,
    shadowChecks: 0,
    shadowMatch: 0,
    shadowMismatch: 0,
    totalFastBuildMs: 0,
    totalLegacyShadowMs: 0,
    lastRoute: '',
    lastDurationMs: 0,
    lastAt: '',
    lastError: '',
    lastBuildMetrics: null
  };
}

function bacaMetrikOptimasiBuildReviewAdmin3C2_() {
  var empty = metrikKosongOptimasiBuildReviewAdmin3C2_();
  try {
    var raw = CacheService.getScriptCache().get(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.METRICS_CACHE_KEY);
    if (!raw) return empty;
    var parsed = JSON.parse(raw) || {};
    Object.keys(empty).forEach(function (key) {
      if (parsed[key] === undefined) parsed[key] = empty[key];
    });
    return parsed;
  } catch (e) { return empty; }
}

function simpanMetrikOptimasiBuildReviewAdmin3C2_(m) {
  try {
    CacheService.getScriptCache().put(
      OPTIMASI_BUILD_REVIEW_ADMIN_3C2.METRICS_CACHE_KEY,
      JSON.stringify(m || metrikKosongOptimasiBuildReviewAdmin3C2_()),
      OPTIMASI_BUILD_REVIEW_ADMIN_3C2.METRICS_TTL_SECONDS
    );
  } catch (e) {}
}

function catatMetrikOptimasiBuildReviewAdmin3C2_(route, durationMs, detail) {
  try {
    var m = bacaMetrikOptimasiBuildReviewAdmin3C2_();
    m.calls = Number(m.calls || 0) + 1;
    route = String(route || '');
    if (route === 'FAST_BUILD_3C2') {
      m.fastBuildSuccess = Number(m.fastBuildSuccess || 0) + 1;
      m.totalFastBuildMs = Number(m.totalFastBuildMs || 0) + Number(durationMs || 0);
    } else if (route === 'LEGACY_BUILD_DISABLED') {
      m.legacyBuildDisabled = Number(m.legacyBuildDisabled || 0) + 1;
    } else if (route === 'FALLBACK_BUILD_CIRCUIT') {
      m.fallbackCircuit = Number(m.fallbackCircuit || 0) + 1;
    } else if (route === 'FALLBACK_BUILD_ERROR') {
      m.fallbackError = Number(m.fallbackError || 0) + 1;
    }
    m.lastRoute = route;
    m.lastDurationMs = Number(durationMs || 0);
    m.lastAt = new Date().toISOString();
    if (detail && typeof detail === 'object') m.lastBuildMetrics = detail;
    if (detail && typeof detail !== 'object') m.lastError = String(detail).substring(0, 900);
    simpanMetrikOptimasiBuildReviewAdmin3C2_(m);
  } catch (e) {}
}

function catatShadowOptimasiBuildReviewAdmin3C2_(match, legacyMs, detail) {
  try {
    var m = bacaMetrikOptimasiBuildReviewAdmin3C2_();
    m.shadowChecks = Number(m.shadowChecks || 0) + 1;
    m.totalLegacyShadowMs = Number(m.totalLegacyShadowMs || 0) + Number(legacyMs || 0);
    if (match) m.shadowMatch = Number(m.shadowMatch || 0) + 1;
    else m.shadowMismatch = Number(m.shadowMismatch || 0) + 1;
    m.lastAt = new Date().toISOString();
    if (!match && detail) m.lastError = String(detail).substring(0, 900);
    simpanMetrikOptimasiBuildReviewAdmin3C2_(m);
  } catch (e) {}
}

function sha256BuildReviewAdmin3C2_(text) {
  if (typeof sha256ReviewAdmin3C1_ === 'function') return sha256ReviewAdmin3C1_(String(text || ''));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

/**
 * Mengubah range C1c yang berasal dari Tunjangan menjadi bentuk object yang
 * sama dengan buildDateRangeMeta_(). Fallback lock periode sengaja TIDAK
 * dipakai di sini karena evaluator final lama juga membaca Tunjangan tersimpan saja.
 */
function metaCutoffTersimpanDariContext3C2_(periode, context) {
  var p = normalizePeriode_(periode);
  var range = context && context.byPeriod ? context.byPeriod[p] : null;
  if (!range || String(range.sumber || '') !== 'CUTOFF_TUNJANGAN_ADMIN') return null;
  if (!(range.start instanceof Date) || !(range.endInclusive instanceof Date)) return null;
  return {
    start: new Date(range.start.getTime()),
    end: new Date(range.end.getTime()),
    endInclusive: new Date(range.endInclusive.getTime()),
    labelPembayaran: labelPembayaranPeriode_(p),
    tanggalMulaiPeriode: range.tanggalMulaiPeriode || formatTanggalISO_(range.start),
    tanggalAkhirPeriode: range.tanggalAkhirPeriode || formatTanggalISO_(range.endInclusive),
    tanggalCutoff: range.tanggalCutoff || formatTanggalJamISO_(range.endInclusive),
    jamCutoff: range.jamCutoff || Utilities.formatDate(range.endInclusive, 'GMT+7', 'HH:mm:ss')
  };
}

function evaluasiCutoffLaporanCepat3C2_(tanggalLaporan, context) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: '', periodeEfektif: '', meta: null, tanggalLaporan: null, bukaKembali: null };
  }
  var p = periodeDariTanggalLaporan_(d) || Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  var meta = metaCutoffTersimpanDariContext3C2_(p, context);
  return {
    valid: true,
    lewatCutoff: false,
    periode: p,
    periodeEfektif: p,
    meta: meta,
    tanggalLaporan: d,
    bukaKembali: meta ? tanggalBukaKembaliCutoff_(meta) : null,
    sumber: meta ? 'admin_tersimpan_non_punitif' : 'tanpa_cutoff_admin'
  };
}

function evaluasiPeriodePelaksanaanReviewAdminCepat3C2_(tanggalPelaksanaan, tanggalLaporan, context) {
  var tPelaksanaan = parseTanggal(tanggalPelaksanaan);
  var tLapor = parseTanggal(tanggalLaporan);
  var periode = '';
  if (tPelaksanaan instanceof Date && !isNaN(tPelaksanaan.getTime()) && tPelaksanaan.getTime() !== 0) {
    periode = periodeDariTanggalLaporan_(tPelaksanaan) || Utilities.formatDate(tPelaksanaan, 'GMT+7', 'yyyy-MM');
  }
  var meta = periode ? metaCutoffTersimpanDariContext3C2_(periode, context) : null;
  return {
    valid: !!periode,
    periodeDitutup: false,
    periode: periode,
    labelPeriode: periode ? labelPembayaranPeriode_(periode) : '',
    tanggalPelaksanaan: (tPelaksanaan instanceof Date && !isNaN(tPelaksanaan.getTime())) ? tPelaksanaan : null,
    tanggalLaporan: (tLapor instanceof Date && !isNaN(tLapor.getTime())) ? tLapor : null,
    meta: meta,
    cutoffLabel: '',
    pesan: ''
  };
}

/** Bangun item dengan evaluator global yang sedang aktif. */
function bangunItemsDenganEvaluatorAktif3C2_(selected, fullRows, targetId, pegawaiInfo, context, skipKQInjection) {
  var lampiranCache = {};
  var items = [];
  var pegawaiOut = {
    id: pegawaiInfo && pegawaiInfo.id || targetId,
    username: pegawaiInfo && pegawaiInfo.username || '',
    nama: pegawaiInfo && pegawaiInfo.nama || '',
    jabatan: pegawaiInfo && pegawaiInfo.jabatan || ''
  };

  for (var s = 0; s < selected.length; s++) {
    var record = selected[s] || {};
    var fullRow = fullRows[record.r] || [];
    if (!fullRow.length) throw new Error('BARIS_LENGKAP_TIDAK_DITEMUKAN_' + record.r);
    var actualId = normalizeId_(fullRow[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    var actualUser = normalizeId_(fullRow[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idsEqual_(actualId, record.i) || !idsEqual_(actualUser, targetId)) throw new Error('INDEX_ROW_STALE_PAGE_' + record.r);

    if (!pegawaiOut.nama) pegawaiOut.nama = String(fullRow[SHEET_COLUMNS.REKAP_KINERJA.NAMA] || '');
    if (!pegawaiOut.jabatan) pegawaiOut.jabatan = String(fullRow[SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || '');

    var metadata = buatMetadataRow3B04C1c_(fullRow, SHEET_COLUMNS.REKAP_KINERJA, context);
    var item = buildAdminReviewItemFromRow_(fullRow, lampiranCache);
    if (!skipKQInjection && typeof injectKolomKQKeItemReview_ === 'function') {
      item = injectKolomKQKeItemReview_(item, fullRow);
    }
    items.push(gabungkanMetadata3B04C1c_(item, metadata));
  }

  return { items: items, pegawaiInfo: pegawaiOut };
}

function bandingkanPayloadBuildReviewAdmin3C2_(legacyItems, fastItems) {
  var a = JSON.stringify(legacyItems || []);
  var b = JSON.stringify(fastItems || []);
  return {
    sama: a === b,
    legacyHash: sha256BuildReviewAdmin3C2_(a),
    fastHash: sha256BuildReviewAdmin3C2_(b),
    legacyBytes: a.length,
    fastBytes: b.length
  };
}

/**
 * Dipanggil oleh fastPathReviewAdmin3C1_. Tidak public/frontend.
 * Saat 3C-2 OFF mengembalikan digunakan=false sehingga blok builder 3C-1 lama
 * dijalankan persis seperti baseline.
 */
function bangunPageItemsReviewAdmin3C2_(selected, fullRows, targetId, pegawaiInfo, context) {
  if (!optimasiBuildReviewAdminAktif3C2_()) {
    return { digunakan: false, route: 'LEGACY_BUILD_DISABLED' };
  }

  var circuit = bacaCircuitOptimasiBuildReviewAdmin3C2_();
  if (circuit && circuit.aktif) {
    catatMetrikOptimasiBuildReviewAdmin3C2_('FALLBACK_BUILD_CIRCUIT', 0, circuit.reason || 'CIRCUIT');
    return { digunakan: false, route: 'FALLBACK_BUILD_CIRCUIT', circuit: circuit };
  }

  var originalCutoff = evaluasiCutoffLaporan_;
  var originalPeriode = evaluasiPeriodePelaksanaanReviewAdmin_;
  var started = Date.now();
  var fastBuilt = null;
  var fastMs = 0;
  var evaluatorMetrics = { cutoffEval: 0, periodePelaksanaanEval: 0, kqInjectionSkipped: true };

  try {
    evaluasiCutoffLaporan_ = function (value) {
      evaluatorMetrics.cutoffEval++;
      return evaluasiCutoffLaporanCepat3C2_(value, context);
    };
    evaluasiPeriodePelaksanaanReviewAdmin_ = function (tanggalPelaksanaan, tanggalLaporan) {
      evaluatorMetrics.periodePelaksanaanEval++;
      return evaluasiPeriodePelaksanaanReviewAdminCepat3C2_(tanggalPelaksanaan, tanggalLaporan, context);
    };

    fastBuilt = bangunItemsDenganEvaluatorAktif3C2_(selected, fullRows, targetId, pegawaiInfo, context, true);
    fastMs = Date.now() - started;
  } catch (eFast) {
    evaluasiCutoffLaporan_ = originalCutoff;
    evaluasiPeriodePelaksanaanReviewAdmin_ = originalPeriode;
    var detailErr = eFast && eFast.message ? eFast.message : String(eFast);
    bukaCircuitOptimasiBuildReviewAdmin3C2_('FAST_BUILD_ERROR', detailErr);
    catatMetrikOptimasiBuildReviewAdmin3C2_('FALLBACK_BUILD_ERROR', Date.now() - started, detailErr);
    // Fallback aman dibangun dengan evaluator asli.
    var legacyErr = bangunItemsDenganEvaluatorAktif3C2_(selected, fullRows, targetId, pegawaiInfo, context, false);
    return {
      digunakan: true,
      fallback: true,
      route: 'LEGACY_BUILD_ERROR',
      items: legacyErr.items,
      pegawaiInfo: legacyErr.pegawaiInfo,
      metrics: { fastBuildMs: fastMs, error: detailErr }
    };
  } finally {
    evaluasiCutoffLaporan_ = originalCutoff;
    evaluasiPeriodePelaksanaanReviewAdmin_ = originalPeriode;
  }

  var shadowPercent = persentaseShadowOptimasiBuildReviewAdmin3C2_();
  var doShadow = shadowPercent >= 100 || (shadowPercent > 0 && (Math.random() * 100) < shadowPercent);
  var comparison = null;
  var legacyShadowMs = 0;

  if (doShadow) {
    var tLegacy = Date.now();
    var legacyBuilt = bangunItemsDenganEvaluatorAktif3C2_(selected, fullRows, targetId, pegawaiInfo, context, false);
    legacyShadowMs = Date.now() - tLegacy;
    comparison = bandingkanPayloadBuildReviewAdmin3C2_(legacyBuilt.items, fastBuilt.items);
    catatShadowOptimasiBuildReviewAdmin3C2_(comparison.sama, legacyShadowMs, comparison.sama ? '' : JSON.stringify(comparison));

    if (!comparison.sama) {
      bukaCircuitOptimasiBuildReviewAdmin3C2_('SHADOW_BUILD_MISMATCH', JSON.stringify(comparison));
      catatMetrikOptimasiBuildReviewAdmin3C2_('FALLBACK_BUILD_ERROR', fastMs, 'SHADOW_BUILD_MISMATCH');
      return {
        digunakan: true,
        fallback: true,
        route: 'LEGACY_BUILD_SHADOW_MISMATCH',
        items: legacyBuilt.items,
        pegawaiInfo: legacyBuilt.pegawaiInfo,
        metrics: {
          fastBuildMs: fastMs,
          legacyShadowMs: legacyShadowMs,
          shadowChecked: true,
          shadowMatch: false,
          comparison: comparison,
          evaluatorMetrics: evaluatorMetrics
        }
      };
    }
  }

  var metrics = {
    fastBuildMs: fastMs,
    legacyShadowMs: legacyShadowMs,
    shadowChecked: doShadow,
    shadowMatch: comparison ? comparison.sama : null,
    shadowPercent: shadowPercent,
    pageRows: fastBuilt.items.length,
    evaluatorMetrics: evaluatorMetrics
  };
  catatMetrikOptimasiBuildReviewAdmin3C2_('FAST_BUILD_3C2', fastMs, metrics);

  return {
    digunakan: true,
    fallback: false,
    route: 'FAST_BUILD_3C2',
    items: fastBuilt.items,
    pegawaiInfo: fastBuilt.pegawaiInfo,
    metrics: metrics
  };
}

function dependensiOptimasiBuildReviewAdmin3C2_() {
  var names = [
    'buildAdminReviewItemFromRow_',
    'injectKolomKQKeItemReview_',
    'buatMetadataRow3B04C1c_',
    'gabungkanMetadata3B04C1c_',
    'periodeDariTanggalLaporan_',
    'labelPembayaranPeriode_',
    'tanggalBukaKembaliCutoff_',
    'fastPathReviewAdmin3C1_',
    'optimasiReviewAdminAktif3C1_'
  ];
  var missing = [];
  for (var i = 0; i < names.length; i++) {
    try {
      if (eval('typeof ' + names[i]) !== 'function') missing.push(names[i]);
    } catch (e) { missing.push(names[i]); }
  }
  return { valid: missing.length === 0, requiredCount: names.length, missing: missing };
}

function validasiOptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('VALIDASI_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  var dependencies = dependensiOptimasiBuildReviewAdmin3C2_();
  var appVersion = typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : '';
  var c1Aktif = typeof optimasiReviewAdminAktif3C1_ === 'function' ? optimasiReviewAdminAktif3C1_() : false;
  var health = typeof cekKesehatanIndexReviewAdmin3C1_ === 'function' ? cekKesehatanIndexReviewAdmin3C1_() : { valid: false };
  var issues = [];
  if (!dependencies.valid) issues.push('DEPENDENSI_TIDAK_LENGKAP');
  if (appVersion !== OPTIMASI_BUILD_REVIEW_ADMIN_3C2.APP_VERSION_EXPECTED) issues.push('APP_VERSION_TIDAK_COCOK');
  if (!c1Aktif) issues.push('OPTIMASI_3C1_BELUM_AKTIF');
  if (!health.valid) issues.push('INDEX_3C1_TIDAK_SEHAT');

  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.VERSION,
    appVersion: appVersion,
    expectedAppVersion: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.APP_VERSION_EXPECTED,
    aktif: optimasiBuildReviewAdminAktif3C2_(),
    shadowPercent: persentaseShadowOptimasiBuildReviewAdmin3C2_(),
    c1Aktif: c1Aktif,
    dependencies: dependencies,
    health: health,
    issues: issues,
    readOnly: true,
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    maintainerAktif: String(maintainer || '')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function statusOptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('STATUS_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  var result = {
    sukses: true,
    versi: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.VERSION,
    appVersion: typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : '',
    aktif: optimasiBuildReviewAdminAktif3C2_(),
    shadowPercent: persentaseShadowOptimasiBuildReviewAdmin3C2_(),
    c1Aktif: typeof optimasiReviewAdminAktif3C1_ === 'function' ? optimasiReviewAdminAktif3C1_() : false,
    circuit: bacaCircuitOptimasiBuildReviewAdmin3C2_(),
    metrics: bacaMetrikOptimasiBuildReviewAdmin3C2_(),
    maintainerAktif: String(maintainer || ''),
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function aktifkanOptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('AKTIFKAN_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  var validation = validasiOptimasiBuildReviewAdmin3C2();
  if (!validation.valid) {
    return { sukses: false, aktif: false, pesan: '3C-2 tidak diaktifkan karena validasi belum lulus.', validasi: validation };
  }
  var props = portalScriptProperties_();
  props.setProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.ENABLED_PROPERTY, 'true');
  props.setProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.ENABLED_AT_PROPERTY, new Date().toISOString());
  props.setProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.SHADOW_PERCENT_PROPERTY, String(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.DEFAULT_SHADOW_PERCENT));
  resetCircuitOptimasiBuildReviewAdmin3C2_();
  try { CacheService.getScriptCache().remove(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.METRICS_CACHE_KEY); } catch (e) {}
  var result = {
    sukses: true,
    aktif: true,
    versi: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.VERSION,
    shadowPercent: OPTIMASI_BUILD_REVIEW_ADMIN_3C2.DEFAULT_SHADOW_PERCENT,
    pesan: 'Fast Build Page Items 3C-2 aktif dengan shadow payload penuh 100% untuk observasi awal.',
    maintainerAktif: String(maintainer || '')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function nonaktifkanOptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('NONAKTIFKAN_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  portalScriptProperties_().setProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.ENABLED_PROPERTY, 'false');
  resetCircuitOptimasiBuildReviewAdmin3C2_();
  var result = {
    sukses: true,
    aktif: false,
    pesan: 'Fast Build 3C-2 dinonaktifkan. 3C-1 tetap aktif dan otomatis memakai builder lama.',
    maintainerAktif: String(maintainer || '')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/** Helper tanpa parameter karena UI Apps Script tidak menyediakan input parameter. */
function aturShadow20OptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('ATUR_SHADOW_20_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  portalScriptProperties_().setProperty(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.SHADOW_PERCENT_PROPERTY, '20');
  var result = { sukses: true, aktif: optimasiBuildReviewAdminAktif3C2_(), shadowPercent: 20, maintainerAktif: String(maintainer || '') };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function resetMetrikOptimasiBuildReviewAdmin3C2() {
  var maintainer = pastikanMaintainerPortal3B0_('RESET_METRIK_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  try { CacheService.getScriptCache().remove(OPTIMASI_BUILD_REVIEW_ADMIN_3C2.METRICS_CACHE_KEY); } catch (e) {}
  resetCircuitOptimasiBuildReviewAdmin3C2_();
  var result = { sukses: true, metrics: bacaMetrikOptimasiBuildReviewAdmin3C2_(), circuit: null, maintainerAktif: String(maintainer || '') };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function guardTerencanaOptimasiBuildReviewAdmin3C2() {
  pastikanMaintainerPortal3B0_('GUARD_TERENCANA_OPTIMASI_BUILD_REVIEW_ADMIN_3C2');
  if (typeof evaluasiPerubahanTerencanaPraDeploy3B1B3 !== 'function') throw new Error('Guard Batch 3 tidak tersedia.');
  return evaluasiPerubahanTerencanaPraDeploy3B1B3([
    // Ekspansi 3C-1 sudah direview pada Versi 629, tetapi baseline Guard tetap 155.
    // Karena itu nama 3C-1 harus ikut dinyatakan eksplisit agar tidak dianggap blocker.
    { name: 'ambilLaporanAdminPerPegawai3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'statusOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'validasiOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'aktifkanOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'nonaktifkanOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'aturPersentaseShadowOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'resetMetrikOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },
    { name: 'guardTerencanaOptimasiReviewAdmin3C1', allowNew: true, reason: 'Carry-forward ekspansi 3C-1 yang sudah direview' },

    { name: 'statusOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Tool status 3C-2' },
    { name: 'validasiOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Tool validasi 3C-2' },
    { name: 'aktifkanOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Feature flag 3C-2' },
    { name: 'nonaktifkanOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Rollback feature flag 3C-2' },
    { name: 'aturShadow20OptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Kontrol shadow 20% tanpa parameter' },
    { name: 'resetMetrikOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Tool metrik/circuit 3C-2' },
    { name: 'guardTerencanaOptimasiBuildReviewAdmin3C2', allowNew: true, reason: 'Wrapper Guard Batch 3 untuk 3C-2' }
  ]);
}

// ===== END OPTIMASI 3C-2 =====
