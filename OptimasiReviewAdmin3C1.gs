/**
 * ============================================================================
 * OPTIMASI 3C-1 — FAST PATH REVIEW ADMIN BERBASIS INDEX + CACHE METADATA SCOPE
 * APP_VERSION: 2026.08.08.02
 *
 * Tujuan:
 * - mempertahankan kontrak respons Review Bukti Admin C1c;
 * - memakai Index_Laporan untuk memilih ROW_REKAP milik pegawai;
 * - menyimpan metadata klasifikasi periode dalam cache pendek berbasis fingerprint;
 * - pada cache hit, menghindari scan projection Rekap_Kinerja dan resolver metadata
 *   untuk seluruh laporan pegawai;
 * - tetap membaca baris lengkap hanya untuk halaman yang dikirim (maks. 10/30);
 * - fallback otomatis ke endpoint C1c pada error/health/circuit;
 * - shadow comparison opsional, default 100% saat pertama diaktifkan.
 *
 * Tidak mengubah:
 * - data Spreadsheet;
 * - poin/status review;
 * - schema;
 * - aturan cut-off/periode;
 * - dual-write Index_Laporan.
 * ============================================================================
 */

var OPTIMASI_REVIEW_ADMIN_3C1 = {
  VERSION: '3C1-2026.08.08.01',
  APP_VERSION_EXPECTED: '2026.08.28.01',
  ENABLED_PROPERTY: 'OPTIMASI_REVIEW_ADMIN_3C1_ENABLED',
  ENABLED_AT_PROPERTY: 'OPTIMASI_REVIEW_ADMIN_3C1_ENABLED_AT',
  SHADOW_PERCENT_PROPERTY: 'OPTIMASI_REVIEW_ADMIN_3C1_SHADOW_PERCENT',
  DEFAULT_SHADOW_PERCENT: 100,
  METADATA_CACHE_PREFIX: 'OR3C1_META_',
  METADATA_CACHE_TTL_SECONDS: 900,
  METADATA_CACHE_MAX_BYTES: 90000,
  CIRCUIT_CACHE_KEY: 'OR3C1_CIRCUIT',
  CIRCUIT_TTL_SECONDS: 300,
  METRICS_CACHE_KEY: 'OR3C1_METRICS',
  METRICS_TTL_SECONDS: 21600,
  INDEX_WIDTH: 12,
  PROJECTION_WIDTH: 24,
  MAX_PAGE: 30
};

function optimasiReviewAdminAktif3C1_() {
  try {
    return String(portalScriptProperties_().getProperty(OPTIMASI_REVIEW_ADMIN_3C1.ENABLED_PROPERTY) || '').toLowerCase() === 'true';
  } catch (e) {
    return false;
  }
}

function persentaseShadowOptimasiReviewAdmin3C1_() {
  var raw = '';
  try {
    raw = portalScriptProperties_().getProperty(OPTIMASI_REVIEW_ADMIN_3C1.SHADOW_PERCENT_PROPERTY) || '';
  } catch (e) {
    raw = '';
  }
  var n = raw === '' ? OPTIMASI_REVIEW_ADMIN_3C1.DEFAULT_SHADOW_PERCENT : Number(raw);
  if (!isFinite(n)) n = OPTIMASI_REVIEW_ADMIN_3C1.DEFAULT_SHADOW_PERCENT;
  return Math.max(0, Math.min(100, n));
}

function sha256ReviewAdmin3C1_(text) {
  if (typeof sha256Teks3B1B2_ === 'function') return sha256Teks3B1B2_(String(text || ''));
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function bacaCircuitOptimasiReviewAdmin3C1_() {
  try {
    var raw = CacheService.getScriptCache().get(OPTIMASI_REVIEW_ADMIN_3C1.CIRCUIT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function bukaCircuitOptimasiReviewAdmin3C1_(reason, detail) {
  var payload = {
    aktif: true,
    reason: String(reason || 'UNKNOWN'),
    detail: String(detail || '').substring(0, 900),
    waktu: new Date().toISOString(),
    ttlDetik: OPTIMASI_REVIEW_ADMIN_3C1.CIRCUIT_TTL_SECONDS
  };
  try {
    CacheService.getScriptCache().put(
      OPTIMASI_REVIEW_ADMIN_3C1.CIRCUIT_CACHE_KEY,
      JSON.stringify(payload),
      OPTIMASI_REVIEW_ADMIN_3C1.CIRCUIT_TTL_SECONDS
    );
  } catch (e) {}
  return payload;
}

function resetCircuitOptimasiReviewAdmin3C1_() {
  try { CacheService.getScriptCache().remove(OPTIMASI_REVIEW_ADMIN_3C1.CIRCUIT_CACHE_KEY); } catch (e) {}
}

function metrikKosongOptimasiReviewAdmin3C1_() {
  return {
    calls: 0,
    fastSuccess: 0,
    cacheHit: 0,
    cacheMiss: 0,
    legacyDisabled: 0,
    fallbackHealth: 0,
    fallbackCircuit: 0,
    fallbackError: 0,
    shadowChecks: 0,
    shadowMatch: 0,
    shadowMismatch: 0,
    totalFastMs: 0,
    totalLegacyMs: 0,
    lastRoute: '',
    lastDurationMs: 0,
    lastAt: '',
    lastError: '',
    lastFastMetrics: null
  };
}

function bacaMetrikOptimasiReviewAdmin3C1_() {
  var empty = metrikKosongOptimasiReviewAdmin3C1_();
  try {
    var raw = CacheService.getScriptCache().get(OPTIMASI_REVIEW_ADMIN_3C1.METRICS_CACHE_KEY);
    if (!raw) return empty;
    var parsed = JSON.parse(raw) || {};
    Object.keys(empty).forEach(function (key) {
      if (parsed[key] === undefined) parsed[key] = empty[key];
    });
    return parsed;
  } catch (e) {
    return empty;
  }
}

function catatMetrikOptimasiReviewAdmin3C1_(route, durationMs, detail) {
  try {
    var m = bacaMetrikOptimasiReviewAdmin3C1_();
    m.calls = Number(m.calls || 0) + 1;
    route = String(route || '');
    if (route === 'FAST_CACHE_HIT' || route === 'FAST_CACHE_MISS') {
      m.fastSuccess = Number(m.fastSuccess || 0) + 1;
      m.totalFastMs = Number(m.totalFastMs || 0) + Number(durationMs || 0);
      if (route === 'FAST_CACHE_HIT') m.cacheHit = Number(m.cacheHit || 0) + 1;
      else m.cacheMiss = Number(m.cacheMiss || 0) + 1;
    } else if (route === 'LEGACY_DISABLED') {
      m.legacyDisabled = Number(m.legacyDisabled || 0) + 1;
      m.totalLegacyMs = Number(m.totalLegacyMs || 0) + Number(durationMs || 0);
    } else if (route === 'FALLBACK_HEALTH') {
      m.fallbackHealth = Number(m.fallbackHealth || 0) + 1;
      m.totalLegacyMs = Number(m.totalLegacyMs || 0) + Number(durationMs || 0);
    } else if (route === 'FALLBACK_CIRCUIT') {
      m.fallbackCircuit = Number(m.fallbackCircuit || 0) + 1;
      m.totalLegacyMs = Number(m.totalLegacyMs || 0) + Number(durationMs || 0);
    } else if (route === 'FALLBACK_ERROR') {
      m.fallbackError = Number(m.fallbackError || 0) + 1;
      m.totalLegacyMs = Number(m.totalLegacyMs || 0) + Number(durationMs || 0);
    }
    m.lastRoute = route;
    m.lastDurationMs = Number(durationMs || 0);
    m.lastAt = new Date().toISOString();
    if (detail && typeof detail === 'object') m.lastFastMetrics = detail;
    if (detail && typeof detail !== 'object') m.lastError = String(detail).substring(0, 900);
    CacheService.getScriptCache().put(
      OPTIMASI_REVIEW_ADMIN_3C1.METRICS_CACHE_KEY,
      JSON.stringify(m),
      OPTIMASI_REVIEW_ADMIN_3C1.METRICS_TTL_SECONDS
    );
  } catch (e) {}
}

function catatShadowOptimasiReviewAdmin3C1_(match, detail) {
  try {
    var m = bacaMetrikOptimasiReviewAdmin3C1_();
    m.shadowChecks = Number(m.shadowChecks || 0) + 1;
    if (match) m.shadowMatch = Number(m.shadowMatch || 0) + 1;
    else m.shadowMismatch = Number(m.shadowMismatch || 0) + 1;
    m.lastAt = new Date().toISOString();
    m.lastRoute = match ? 'SHADOW_MATCH' : 'SHADOW_MISMATCH';
    if (!match && detail) m.lastError = String(detail).substring(0, 900);
    CacheService.getScriptCache().put(
      OPTIMASI_REVIEW_ADMIN_3C1.METRICS_CACHE_KEY,
      JSON.stringify(m),
      OPTIMASI_REVIEW_ADMIN_3C1.METRICS_TTL_SECONDS
    );
  } catch (e) {}
}

function cekKesehatanIndexReviewAdmin3C1_() {
  if (typeof cekKesehatanRinganReadRiwayatIndex2B2A_ === 'function') {
    var health = cekKesehatanRinganReadRiwayatIndex2B2A_();
    return {
      valid: health.valid === true,
      dualWriteAktif: health.dualWriteAktif === true,
      sourceRows: Number(health.sourceRows || 0),
      indexRows: Number(health.indexRows || 0),
      headerValid: health.headerValid === true,
      queue: health.queue || {},
      alasan: String(health.alasan || '')
    };
  }
  return { valid: false, alasan: 'HEALTH_HELPER_2B2A_TIDAK_TERSEDIA' };
}

function bacaKandidatIndexReviewAdmin3C1_(targetId) {
  var started = Date.now();
  var sh = getSS_().getSheetByName(INDEX_LAPORAN_2B0_CONFIG.SHEET_NAME);
  if (!sh) throw new Error('INDEX_SHEET_TIDAK_TERSEDIA');
  if (typeof pastikanHeaderIndexReadRiwayat2B2A_ === 'function') pastikanHeaderIndexReadRiwayat2B2A_(sh);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { entries: [], fingerprint: sha256ReviewAdmin3C1_('EMPTY:' + targetId), readMs: Date.now() - started, rowsRead: 0, cellsRead: 0 };

  var width = Math.min(OPTIMASI_REVIEW_ADMIN_3C1.INDEX_WIDTH, sh.getLastColumn());
  var rows = sh.getRange(2, 1, lastRow - 1, width).getValues();
  var M = getIndexLaporanColumnMap2B0_();
  var entries = [];
  var seenRows = {};
  var fingerprintParts = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!idsEqual_(r[M.ID_USER], targetId)) continue;
    var rowRekap = Number(r[M.ROW_REKAP] || 0);
    var idLaporan = normalizeId_(r[M.ID_LAPORAN]);
    if (rowRekap < 2 || !idLaporan) throw new Error('INDEX_ROW_TIDAK_VALID');
    if (seenRows['r' + rowRekap]) throw new Error('INDEX_ROW_REKAP_DUPLIKAT_' + rowRekap);
    seenRows['r' + rowRekap] = true;

    var submitDate = tanggalValidIndexLaporan2B0_(r[M.TANGGAL_LAPORAN]);
    var changedDate = tanggalValidIndexLaporan2B0_(r[M.TERAKHIR_DIUBAH]);
    var status = String(r[M.STATUS_REVIEW] || '');
    entries.push({
      rowRekap: rowRekap,
      idLaporan: idLaporan,
      idUser: normalizeId_(r[M.ID_USER]),
      submitMs: submitDate ? submitDate.getTime() : 0,
      status: status,
      changedMs: changedDate ? changedDate.getTime() : 0
    });
    fingerprintParts.push([rowRekap, idLaporan, status, changedDate ? changedDate.getTime() : 0].join('|'));
  }

  entries.sort(function (a, b) { return a.rowRekap - b.rowRekap; });
  fingerprintParts.sort();
  return {
    entries: entries,
    fingerprint: sha256ReviewAdmin3C1_(targetId + '::' + fingerprintParts.join('||')),
    readMs: Date.now() - started,
    rowsRead: rows.length,
    cellsRead: rows.length * width
  };
}

function fingerprintCutoffReviewAdmin3C1_(context) {
  var parts = (context && context.ranges ? context.ranges : []).map(function (range) {
    return [
      String(range.periode || ''),
      range.start instanceof Date ? range.start.getTime() : 0,
      range.endInclusive instanceof Date ? range.endInclusive.getTime() : 0,
      String(range.sumber || '')
    ].join('|');
  });
  return sha256ReviewAdmin3C1_(parts.join('||'));
}

function cacheKeyMetadataReviewAdmin3C1_(targetId, indexFingerprint, cutoffFingerprint) {
  var raw = [
    OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    String(targetId || ''),
    String(indexFingerprint || ''),
    String(cutoffFingerprint || '')
  ].join('::');
  return OPTIMASI_REVIEW_ADMIN_3C1.METADATA_CACHE_PREFIX + sha256ReviewAdmin3C1_(raw).substring(0, 48);
}

function bacaMetadataCacheReviewAdmin3C1_(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.records)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function simpanMetadataCacheReviewAdmin3C1_(key, payload) {
  try {
    var raw = JSON.stringify(payload || {});
    if (raw.length > OPTIMASI_REVIEW_ADMIN_3C1.METADATA_CACHE_MAX_BYTES) {
      return { tersimpan: false, alasan: 'CACHE_PAYLOAD_TOO_LARGE', bytes: raw.length };
    }
    CacheService.getScriptCache().put(key, raw, OPTIMASI_REVIEW_ADMIN_3C1.METADATA_CACHE_TTL_SECONDS);
    return { tersimpan: true, bytes: raw.length };
  } catch (e) {
    return { tersimpan: false, alasan: String(e && e.message ? e.message : e), bytes: 0 };
  }
}

function bangunMetadataCompactReviewAdmin3C1_(sheet, entries, context) {
  var started = Date.now();
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var width = Math.min(lastColumn, OPTIMASI_REVIEW_ADMIN_3C1.PROJECTION_WIDTH);
  var projectionStarted = Date.now();
  var rows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
  var projectionMs = Date.now() - projectionStarted;
  var records = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var idx = entry.rowRekap - 2;
    if (idx < 0 || idx >= rows.length) throw new Error('ROW_REKAP_DI_LUAR_SUMBER_' + entry.rowRekap);
    var row = rows[idx] || [];
    var actualUser = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    var actualId = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    if (!idsEqual_(actualUser, entry.idUser) || !idsEqual_(actualId, entry.idLaporan)) {
      throw new Error('INDEX_ROW_STALE_' + entry.rowRekap);
    }
    var metadata = buatMetadataRow3B04C1c_(row, SHEET_COLUMNS.REKAP_KINERJA, context);
    records.push({
      r: entry.rowRekap,
      i: entry.idLaporan,
      s: String(row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || entry.status || ''),
      t: entry.submitMs || 0,
      p: String((metadata && metadata.periodeReview) || ''),
      l: !!(metadata && metadata.lewatPeriode),
      d: !!(metadata && metadata.dialihkan)
    });
  }

  return {
    records: records,
    projectionMs: projectionMs,
    metadataBuildMs: Date.now() - started - projectionMs,
    projectionRows: rows.length,
    projectionCells: rows.length * width,
    projectionWidth: width
  };
}

function ambilMetadataScopeReviewAdmin3C1_(sheet, entriesInfo, context) {
  var cutoffFingerprint = fingerprintCutoffReviewAdmin3C1_(context);
  var key = cacheKeyMetadataReviewAdmin3C1_(entriesInfo.targetId, entriesInfo.fingerprint, cutoffFingerprint);
  var cached = bacaMetadataCacheReviewAdmin3C1_(key);
  if (cached) {
    return {
      cacheHit: true,
      cacheKey: key,
      records: cached.records,
      projectionMs: 0,
      metadataBuildMs: 0,
      projectionRows: 0,
      projectionCells: 0,
      cacheBytes: Number(cached.cacheBytes || 0)
    };
  }

  var built = bangunMetadataCompactReviewAdmin3C1_(sheet, entriesInfo.entries, context);
  var payload = {
    version: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    targetId: entriesInfo.targetId,
    indexFingerprint: entriesInfo.fingerprint,
    cutoffFingerprint: cutoffFingerprint,
    dibuatPada: new Date().toISOString(),
    records: built.records
  };
  var save = simpanMetadataCacheReviewAdmin3C1_(key, payload);
  return {
    cacheHit: false,
    cacheKey: key,
    records: built.records,
    projectionMs: built.projectionMs,
    metadataBuildMs: built.metadataBuildMs,
    projectionRows: built.projectionRows,
    projectionCells: built.projectionCells,
    cacheBytes: Number(save.bytes || 0),
    cacheTersimpan: save.tersimpan === true,
    cacheAlasan: String(save.alasan || '')
  };
}

function ringkasResponsReviewAdmin3C1_(res) {
  res = res || {};
  var summary = res.summary || {};
  return {
    sukses: !!res.sukses,
    pegawaiId: normalizeId_((res.pegawai && res.pegawai.id) || ''),
    totalLaporan: Number(summary.totalLaporan || 0),
    totalMenunggu: Number(summary.totalMenunggu || 0),
    totalSelesai: Number(summary.totalSelesai || 0),
    totalLewatPeriode: Number(summary.totalLewatPeriode || 0),
    totalDialihkan: Number(summary.totalDialihkan || 0),
    totalFiltered: Number(res.totalFiltered || 0),
    offset: Number(res.offset || 0),
    limit: Number(res.limit || 0),
    nextOffset: Number(res.nextOffset || 0),
    hasMore: !!res.hasMore,
    dasarPeriodeEfektif: String(res.dasarPeriodeEfektif || ''),
    periodeReview: String(res.periodeReview || ''),
    items: (Array.isArray(res.items) ? res.items : []).map(function (item) {
      return {
        idLaporan: normalizeId_(item && item.idLaporan),
        status: String((item && item.status) || ''),
        poinFinal: Number((item && item.poinFinal) || 0),
        lewatPeriode: !!(item && item.lewatPeriode),
        dialihkan: !!(item && item.dialihkan),
        periodeAsal: String((item && item.periodeAsal) || ''),
        periodeReview: String((item && item.periodeReview) || ''),
        jenisKetepatan: String((item && item.jenisKetepatan) || ''),
        waktuEfektifReview: String((item && item.waktuEfektifReview) || '')
      };
    })
  };
}

function bandingkanResponsReviewAdmin3C1_(legacy, fast) {
  var a = ringkasResponsReviewAdmin3C1_(legacy);
  var b = ringkasResponsReviewAdmin3C1_(fast);
  var ja = JSON.stringify(a);
  var jb = JSON.stringify(b);
  return {
    sama: ja === jb,
    legacy: a,
    fast: b,
    legacyHash: sha256ReviewAdmin3C1_(ja),
    fastHash: sha256ReviewAdmin3C1_(jb)
  };
}

function fastPathReviewAdmin3C1_(args, idUser) {
  var started = Date.now();
  var targetId = normalizeId_(args.selectedId);
  if (!targetId) return { sukses: false, pesan: 'Pegawai belum dipilih.', pegawai: null, summary: {}, items: [] };

  var mode = typeof normalisasiDasarPeriode3B04C1b_ === 'function'
    ? normalisasiDasarPeriode3B04C1b_(args.dasarPeriode)
    : (String(args.dasarPeriode || '') === 'periode_review' ? 'periode_review' : 'pengiriman');
  var targetPeriod = normalisasiPeriode3B04C1c_(args.periodeReview);
  if (mode === 'periode_review' && !targetPeriod) {
    return { sukses: false, pesan: 'Periode review belum dipilih atau tidak valid.', pegawai: null, summary: {}, items: [] };
  }

  var startDate = typeof parseDateOnly_ === 'function' ? parseDateOnly_(args.tanggalMulai) : parseTanggal3B04C1c_(args.tanggalMulai);
  var endDate = typeof parseDateOnly_ === 'function' ? parseDateOnly_(args.tanggalAkhir) : parseTanggal3B04C1c_(args.tanggalAkhir);
  if (mode === 'pengiriman') {
    if (!startDate || !endDate) throw new Error('Rentang pengiriman tidak valid.');
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  var startOffset = Math.max(0, Number(args.offset) || 0);
  var pageSize = Math.max(1, Math.min(OPTIMASI_REVIEW_ADMIN_3C1.MAX_PAGE, Number(args.limit) || 10));
  var sheet = getSheet_('Rekap_Kinerja');
  var lastColumn = sheet.getLastColumn();

  var tIndex = Date.now();
  var entriesInfo = bacaKandidatIndexReviewAdmin3C1_(targetId);
  entriesInfo.targetId = targetId;
  var indexMs = Date.now() - tIndex;

  var tContext = Date.now();
  var context = buatKonteksCutoff3B04C1c_();
  var contextMs = Date.now() - tContext;

  var tCache = Date.now();
  var scope = ambilMetadataScopeReviewAdmin3C1_(sheet, entriesInfo, context);
  var scopeMs = Date.now() - tCache;

  var pegawai = typeof getPegawaiById_ === 'function' ? getPegawaiById_(targetId) : null;
  var pegawaiInfo = pegawai ? {
    id: normalizeId_(pegawai.id || targetId),
    username: pegawai.username || '',
    nama: pegawai.nama || '',
    jabatan: pegawai.jabatan || ''
  } : { id: targetId, username: '', nama: '', jabatan: '' };

  var summary = {
    totalLaporan: 0,
    totalMenunggu: 0,
    totalSelesai: 0,
    totalLewatPeriode: 0,
    totalDialihkan: 0
  };
  var filteredCount = 0;
  var selected = [];
  var startMs = startDate ? startDate.getTime() : 0;
  var endMs = endDate ? endDate.getTime() : 0;

  for (var i = 0; i < scope.records.length; i++) {
    var rec = scope.records[i] || {};
    var inScope = mode === 'periode_review'
      ? String(rec.p || '') === targetPeriod
      : Number(rec.t || 0) >= startMs && Number(rec.t || 0) <= endMs;
    if (!inScope) continue;

    var summaryItem = { status: String(rec.s || ''), lewatPeriode: rec.l === true, dialihkan: rec.d === true };
    summary.totalLaporan++;
    if (typeof isPendingReviewStatus_ === 'function' && isPendingReviewStatus_(summaryItem.status)) summary.totalMenunggu++;
    else summary.totalSelesai++;
    if (summaryItem.lewatPeriode) summary.totalLewatPeriode++;
    if (summaryItem.dialihkan) summary.totalDialihkan++;

    if (!filterStatusItem3B04C1c_(summaryItem, args.filterStatus)) continue;
    if (filteredCount >= startOffset && selected.length < pageSize) selected.push(rec);
    filteredCount++;
  }

  var rowNumbers = selected.map(function (rec) { return Number(rec.r || 0); }).filter(function (x) { return x >= 2; });
  var tFull = Date.now();
  var fullRows = rowNumbers.length ? bacaBarisLengkapAdminReviewV2A1C_(sheet, rowNumbers, lastColumn) : {};
  var fullRowsMs = Date.now() - tFull;

  var tBuild = Date.now();
  var items = [];
  var build3C2 = null;

  // OPTIMASI 3C-2: builder halaman baru bersifat optional/feature-flagged.
  // Bila 3C-2 OFF, circuit terbuka, atau helper tidak tersedia, jalur persis 3C-1 dipakai.
  if (typeof bangunPageItemsReviewAdmin3C2_ === 'function') {
    build3C2 = bangunPageItemsReviewAdmin3C2_(selected, fullRows, targetId, pegawaiInfo, context);
  }

  if (build3C2 && build3C2.digunakan === true) {
    items = build3C2.items || [];
    pegawaiInfo = build3C2.pegawaiInfo || pegawaiInfo;
  } else {
    var lampiranCache = {};
    for (var s = 0; s < selected.length; s++) {
      var record = selected[s];
      var fullRow = fullRows[record.r] || [];
      if (!fullRow.length) throw new Error('BARIS_LENGKAP_TIDAK_DITEMUKAN_' + record.r);
      var actualId = normalizeId_(fullRow[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
      var actualUser = normalizeId_(fullRow[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
      if (!idsEqual_(actualId, record.i) || !idsEqual_(actualUser, targetId)) throw new Error('INDEX_ROW_STALE_PAGE_' + record.r);

      if (!pegawaiInfo.nama) pegawaiInfo.nama = String(fullRow[SHEET_COLUMNS.REKAP_KINERJA.NAMA] || '');
      if (!pegawaiInfo.jabatan) pegawaiInfo.jabatan = String(fullRow[SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || '');

      var metadata = buatMetadataRow3B04C1c_(fullRow, SHEET_COLUMNS.REKAP_KINERJA, context);
      var item = buildAdminReviewItemFromRow_(fullRow, lampiranCache);
      if (typeof injectKolomKQKeItemReview_ === 'function') item = injectKolomKQKeItemReview_(item, fullRow);
      items.push(gabungkanMetadata3B04C1c_(item, metadata));
    }
  }
  var buildMs = Date.now() - tBuild;

  var totalMs = Date.now() - started;
  var fastMetrics = {
    route: scope.cacheHit ? 'FAST_CACHE_HIT' : 'FAST_CACHE_MISS',
    cacheHit: scope.cacheHit === true,
    indexMs: indexMs,
    indexRowsRead: Number(entriesInfo.rowsRead || 0),
    indexCellsRead: Number(entriesInfo.cellsRead || 0),
    targetRows: entriesInfo.entries.length,
    contextMs: contextMs,
    cacheScopeMs: scopeMs,
    projectionMs: Number(scope.projectionMs || 0),
    metadataBuildMs: Number(scope.metadataBuildMs || 0),
    projectionRows: Number(scope.projectionRows || 0),
    projectionCells: Number(scope.projectionCells || 0),
    cacheBytes: Number(scope.cacheBytes || 0),
    fullRowsMs: fullRowsMs,
    buildPageItemsMs: buildMs,
    build3C2: build3C2 && build3C2.digunakan === true ? (build3C2.metrics || null) : null,
    pageRows: rowNumbers.length,
    totalMs: totalMs
  };

  var result = {
    sukses: true,
    pegawai: pegawaiInfo,
    summary: summary,
    items: items,
    totalFiltered: filteredCount,
    offset: startOffset,
    limit: pageSize,
    nextOffset: startOffset + items.length,
    hasMore: (startOffset + items.length) < filteredCount,
    tanggalMulai: mode === 'pengiriman' ? String(args.tanggalMulai || '') : '',
    tanggalAkhir: mode === 'pengiriman' ? String(args.tanggalAkhir || '') : '',
    periodeReview: mode === 'periode_review' ? targetPeriod : '',
    periodeReviewLabel: mode === 'periode_review' ? labelPeriode3B04C1c_(targetPeriod) : '',
    dasarPeriodeDiminta: mode,
    dasarPeriodeEfektif: mode,
    patch3B04C1c: {
      versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
      aktif: true,
      fallback: false,
      mode: mode,
      resolverRentangCutoff: true,
      optimasiSatuScan: true,
      totalBarisDipindai: scope.cacheHit ? 0 : Number(scope.projectionRows || 0),
      totalBarisLengkapDibaca: rowNumbers.length,
      totalRentangCutoff: context.totalRanges,
      sumberDefaultDigunakan: false,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false
    },
    patch3C1: {
      versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
      aktif: true,
      fallback: false,
      route: fastMetrics.route,
      cacheHit: fastMetrics.cacheHit,
      fastMetrics: fastMetrics,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    },
    patch3C2: build3C2 && build3C2.digunakan === true ? {
      versi: typeof OPTIMASI_BUILD_REVIEW_ADMIN_3C2 !== 'undefined' ? OPTIMASI_BUILD_REVIEW_ADMIN_3C2.VERSION : '3C2',
      aktif: true,
      fallback: !!build3C2.fallback,
      route: String(build3C2.route || ''),
      metrics: build3C2.metrics || null,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    } : {
      versi: typeof OPTIMASI_BUILD_REVIEW_ADMIN_3C2 !== 'undefined' ? OPTIMASI_BUILD_REVIEW_ADMIN_3C2.VERSION : '3C2',
      aktif: false,
      fallback: true,
      route: build3C2 && build3C2.route ? String(build3C2.route) : 'LEGACY_BUILD_3C1',
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    }
  };

  return typeof siapkanResponsClient3B04C1b_ === 'function'
    ? siapkanResponsClient3B04C1b_(result)
    : result;
}

function fallbackReviewAdmin3C1_(args, reason, route, started) {
  var legacy = ambilLaporanAdminPerPegawai3B04C1c(
    args.selectedId,
    args.filterStatus,
    args.dasarPeriode,
    args.periodeReview,
    args.tanggalMulai,
    args.tanggalAkhir,
    args.offset,
    args.limit,
    args.token
  );
  legacy = legacy || { sukses: false, items: [], summary: {} };
  legacy.patch3C1 = {
    versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    aktif: false,
    configuredAktif: optimasiReviewAdminAktif3C1_(),
    fallback: true,
    fallbackReason: reason && reason.message ? String(reason.message) : String(reason || ''),
    route: String(route || 'FALLBACK'),
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  catatMetrikOptimasiReviewAdmin3C1_(String(route || 'FALLBACK_ERROR'), Date.now() - Number(started || Date.now()), legacy.patch3C1.fallbackReason);
  return legacy;
}

/**
 * Endpoint frontend 3C-1.
 * Signature sengaja sama dengan C1c agar frontend hanya mengganti nama endpoint.
 */
function ambilLaporanAdminPerPegawai3C1(
  selectedId,
  filterStatus,
  dasarPeriode,
  periodeReview,
  tanggalMulai,
  tanggalAkhir,
  offset,
  limit,
  token
) {
  var started = Date.now();
  var args = {
    selectedId: selectedId,
    filterStatus: filterStatus,
    dasarPeriode: dasarPeriode,
    periodeReview: periodeReview,
    tanggalMulai: tanggalMulai,
    tanggalAkhir: tanggalAkhir,
    offset: offset,
    limit: limit,
    token: token
  };

  if (!optimasiReviewAdminAktif3C1_()) {
    return fallbackReviewAdmin3C1_(args, 'FEATURE_NONAKTIF', 'LEGACY_DISABLED', started);
  }

  var circuit = bacaCircuitOptimasiReviewAdmin3C1_();
  if (circuit && circuit.aktif) {
    return fallbackReviewAdmin3C1_(args, circuit.reason || 'CIRCUIT', 'FALLBACK_CIRCUIT', started);
  }

  var health = cekKesehatanIndexReviewAdmin3C1_();
  if (!health.valid) {
    return fallbackReviewAdmin3C1_(args, health.alasan || 'INDEX_UNHEALTHY', 'FALLBACK_HEALTH', started);
  }

  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', pegawai: null, summary: {}, items: [] };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: 'Akses ditolak.', pegawai: null, summary: {}, items: [] };
    if (typeof hotfixPeriodeReviewAktif3B04C1c_ === 'function' && !hotfixPeriodeReviewAktif3B04C1c_()) {
      return fallbackReviewAdmin3C1_(args, 'C1C_NONAKTIF', 'FALLBACK_HEALTH', started);
    }

    var fast = fastPathReviewAdmin3C1_(args, idUser);
    var fastRoute = fast && fast.patch3C1 ? String(fast.patch3C1.route || 'FAST_CACHE_MISS') : 'FAST_CACHE_MISS';
    var fastMetrics = fast && fast.patch3C1 ? fast.patch3C1.fastMetrics : null;

    var shadowPercent = persentaseShadowOptimasiReviewAdmin3C1_();
    var shouldShadow = Number(offset || 0) === 0 && shadowPercent > 0 && (Math.random() * 100) < shadowPercent;
    if (shouldShadow) {
      var legacy = ambilLaporanAdminPerPegawai3B04C1c(
        selectedId,
        filterStatus,
        dasarPeriode,
        periodeReview,
        tanggalMulai,
        tanggalAkhir,
        offset,
        limit,
        token
      );
      var cmp = bandingkanResponsReviewAdmin3C1_(legacy, fast);
      catatShadowOptimasiReviewAdmin3C1_(cmp.sama, cmp.sama ? '' : JSON.stringify({ legacyHash: cmp.legacyHash, fastHash: cmp.fastHash }));
      if (!cmp.sama) {
        bukaCircuitOptimasiReviewAdmin3C1_('SHADOW_MISMATCH', JSON.stringify({ legacyHash: cmp.legacyHash, fastHash: cmp.fastHash }));
        if (legacy && typeof legacy === 'object') {
          legacy.patch3C1 = {
            versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
            aktif: false,
            configuredAktif: true,
            fallback: true,
            fallbackReason: 'SHADOW_MISMATCH',
            route: 'FALLBACK_SHADOW_MISMATCH',
            dataDiubah: false,
            poinDiubah: false,
            statusReviewDiubah: false,
            schemaDiubah: false
          };
        }
        return legacy;
      }
    }

    catatMetrikOptimasiReviewAdmin3C1_(fastRoute, Date.now() - started, fastMetrics || {});
    return fast;
  } catch (e) {
    var msg = String(e && e.message ? e.message : e);
    bukaCircuitOptimasiReviewAdmin3C1_('FAST_PATH_ERROR', msg);
    return fallbackReviewAdmin3C1_(args, msg, 'FALLBACK_ERROR', started);
  }
}

function cekDependensiOptimasiReviewAdmin3C1_() {
  var required = [
    ['ambilLaporanAdminPerPegawai3B04C1c', typeof ambilLaporanAdminPerPegawai3B04C1c === 'function'],
    ['buatKonteksCutoff3B04C1c_', typeof buatKonteksCutoff3B04C1c_ === 'function'],
    ['buatMetadataRow3B04C1c_', typeof buatMetadataRow3B04C1c_ === 'function'],
    ['gabungkanMetadata3B04C1c_', typeof gabungkanMetadata3B04C1c_ === 'function'],
    ['filterStatusItem3B04C1c_', typeof filterStatusItem3B04C1c_ === 'function'],
    ['bacaBarisLengkapAdminReviewV2A1C_', typeof bacaBarisLengkapAdminReviewV2A1C_ === 'function'],
    ['buildAdminReviewItemFromRow_', typeof buildAdminReviewItemFromRow_ === 'function'],
    ['cekKesehatanRinganReadRiwayatIndex2B2A_', typeof cekKesehatanRinganReadRiwayatIndex2B2A_ === 'function'],
    ['getIndexLaporanColumnMap2B0_', typeof getIndexLaporanColumnMap2B0_ === 'function']
  ];
  var missing = required.filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
  return { valid: missing.length === 0, requiredCount: required.length, missing: missing };
}

function ujiSintetisOptimasiReviewAdmin3C1_() {
  var records = [
    { r: 2, i: 'A', s: 'Disetujui', t: new Date('2026-07-28T10:00:00+07:00').getTime(), p: '2026-07', l: false, d: false },
    { r: 3, i: 'B', s: 'Menunggu Review', t: new Date('2026-07-31T10:00:00+07:00').getTime(), p: '2026-08', l: true, d: true },
    { r: 4, i: 'C', s: 'Ditolak', t: new Date('2026-08-02T10:00:00+07:00').getTime(), p: '2026-08', l: false, d: false }
  ];
  var aug = records.filter(function (r) { return r.p === '2026-08'; });
  var late = aug.filter(function (r) { return filterStatusItem3B04C1c_({ status: r.s, lewatPeriode: r.l, dialihkan: r.d }, 'lewat_periode'); });
  var pending = aug.filter(function (r) { return filterStatusItem3B04C1c_({ status: r.s, lewatPeriode: r.l, dialihkan: r.d }, 'menunggu'); });
  return {
    valid: aug.length === 2 && late.length === 1 && late[0].i === 'B' && pending.length === 1 && pending[0].i === 'B',
    augustCount: aug.length,
    lateCount: late.length,
    pendingCount: pending.length
  };
}

function validasiOptimasiReviewAdmin3C1() {
  var maintainer = pastikanMaintainerPortal3B0_('VALIDASI_OPTIMASI_REVIEW_ADMIN_3C1');
  var deps = cekDependensiOptimasiReviewAdmin3C1_();
  var health = deps.valid ? cekKesehatanIndexReviewAdmin3C1_() : { valid: false, alasan: 'DEPENDENCY_MISSING' };
  var synthetic = deps.valid ? ujiSintetisOptimasiReviewAdmin3C1_() : { valid: false };
  var c1cAktif = typeof hotfixPeriodeReviewAktif3B04C1c_ === 'function' ? hotfixPeriodeReviewAktif3B04C1c_() : false;
  var appVersion = typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : '';
  var issues = [];
  if (!deps.valid) issues.push('DEPENDENCY_MISSING: ' + deps.missing.join(', '));
  if (!health.valid) issues.push('INDEX_UNHEALTHY: ' + String(health.alasan || ''));
  if (!synthetic.valid) issues.push('SYNTHETIC_FILTER_FAILED');
  if (!c1cAktif) issues.push('HOTFIX_C1C_NONAKTIF');
  if (appVersion !== OPTIMASI_REVIEW_ADMIN_3C1.APP_VERSION_EXPECTED) issues.push('APP_VERSION_MISMATCH');

  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    appVersion: appVersion,
    expectedAppVersion: OPTIMASI_REVIEW_ADMIN_3C1.APP_VERSION_EXPECTED,
    aktif: optimasiReviewAdminAktif3C1_(),
    shadowPercent: persentaseShadowOptimasiReviewAdmin3C1_(),
    c1cAktif: c1cAktif,
    dependencies: deps,
    health: health,
    synthetic: synthetic,
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

function statusOptimasiReviewAdmin3C1() {
  var maintainer = pastikanMaintainerPortal3B0_('STATUS_OPTIMASI_REVIEW_ADMIN_3C1');
  var result = {
    sukses: true,
    versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    appVersion: typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : '',
    aktif: optimasiReviewAdminAktif3C1_(),
    shadowPercent: persentaseShadowOptimasiReviewAdmin3C1_(),
    health: cekKesehatanIndexReviewAdmin3C1_(),
    circuit: bacaCircuitOptimasiReviewAdmin3C1_(),
    metrics: bacaMetrikOptimasiReviewAdmin3C1_(),
    cacheTtlSeconds: OPTIMASI_REVIEW_ADMIN_3C1.METADATA_CACHE_TTL_SECONDS,
    maintainerAktif: String(maintainer || ''),
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function aktifkanOptimasiReviewAdmin3C1() {
  var maintainer = pastikanMaintainerPortal3B0_('AKTIFKAN_OPTIMASI_REVIEW_ADMIN_3C1');
  var validation = validasiOptimasiReviewAdmin3C1();
  if (!validation.valid) {
    return { sukses: false, aktif: false, pesan: '3C-1 tidak diaktifkan karena validasi belum lulus.', validasi: validation };
  }
  var props = portalScriptProperties_();
  props.setProperty(OPTIMASI_REVIEW_ADMIN_3C1.ENABLED_PROPERTY, 'true');
  props.setProperty(OPTIMASI_REVIEW_ADMIN_3C1.ENABLED_AT_PROPERTY, new Date().toISOString());
  props.setProperty(OPTIMASI_REVIEW_ADMIN_3C1.SHADOW_PERCENT_PROPERTY, String(OPTIMASI_REVIEW_ADMIN_3C1.DEFAULT_SHADOW_PERCENT));
  resetCircuitOptimasiReviewAdmin3C1_();
  try { CacheService.getScriptCache().remove(OPTIMASI_REVIEW_ADMIN_3C1.METRICS_CACHE_KEY); } catch (e) {}
  var result = {
    sukses: true,
    aktif: true,
    versi: OPTIMASI_REVIEW_ADMIN_3C1.VERSION,
    shadowPercent: OPTIMASI_REVIEW_ADMIN_3C1.DEFAULT_SHADOW_PERCENT,
    pesan: 'Fast Path Review Admin 3C-1 aktif dengan shadow comparison 100% untuk observasi awal.',
    maintainerAktif: String(maintainer || '')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function nonaktifkanOptimasiReviewAdmin3C1() {
  var maintainer = pastikanMaintainerPortal3B0_('NONAKTIFKAN_OPTIMASI_REVIEW_ADMIN_3C1');
  portalScriptProperties_().setProperty(OPTIMASI_REVIEW_ADMIN_3C1.ENABLED_PROPERTY, 'false');
  resetCircuitOptimasiReviewAdmin3C1_();
  var result = {
    sukses: true,
    aktif: false,
    pesan: 'Fast Path Review Admin 3C-1 dinonaktifkan. Frontend otomatis kembali ke endpoint C1c.',
    maintainerAktif: String(maintainer || '')
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function aturPersentaseShadowOptimasiReviewAdmin3C1(percent) {
  var maintainer = pastikanMaintainerPortal3B0_('ATUR_SHADOW_OPTIMASI_REVIEW_ADMIN_3C1');
  var n = Number(percent);
  if (!isFinite(n) || n < 0 || n > 100) throw new Error('Persentase shadow harus angka 0 sampai 100.');
  portalScriptProperties_().setProperty(OPTIMASI_REVIEW_ADMIN_3C1.SHADOW_PERCENT_PROPERTY, String(n));
  var result = { sukses: true, shadowPercent: n, maintainerAktif: String(maintainer || '') };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function resetMetrikOptimasiReviewAdmin3C1() {
  var maintainer = pastikanMaintainerPortal3B0_('RESET_METRIK_OPTIMASI_REVIEW_ADMIN_3C1');
  try { CacheService.getScriptCache().remove(OPTIMASI_REVIEW_ADMIN_3C1.METRICS_CACHE_KEY); } catch (e) {}
  resetCircuitOptimasiReviewAdmin3C1_();
  var result = { sukses: true, metrics: bacaMetrikOptimasiReviewAdmin3C1_(), circuit: null, maintainerAktif: String(maintainer || '') };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END OPTIMASI 3C-1 =====

/**
 * Wrapper tanpa parameter untuk menjalankan Guard Batch 3 terhadap ekspansi
 * kontrak public 3C-1. Hasil yang benar sebelum deployment adalah
 * REVIEW_REQUIRED tanpa blocker; setelah diff diperiksa manual, deployment
 * dapat dilanjutkan sesuai prosedur governance.
 */
function guardTerencanaOptimasiReviewAdmin3C1() {
  pastikanMaintainerPortal3B0_('GUARD_TERENCANA_OPTIMASI_REVIEW_ADMIN_3C1');
  if (typeof evaluasiPerubahanTerencanaPraDeploy3B1B3 !== 'function') {
    throw new Error('Guard Batch 3 tidak tersedia.');
  }
  return evaluasiPerubahanTerencanaPraDeploy3B1B3([
    { name: 'ambilLaporanAdminPerPegawai3C1', allowNew: true, reason: 'Optimasi 3C-1 fast path Review Admin' },
    { name: 'statusOptimasiReviewAdmin3C1', allowNew: true, reason: 'Tool status 3C-1' },
    { name: 'validasiOptimasiReviewAdmin3C1', allowNew: true, reason: 'Tool validasi 3C-1' },
    { name: 'aktifkanOptimasiReviewAdmin3C1', allowNew: true, reason: 'Feature flag 3C-1' },
    { name: 'nonaktifkanOptimasiReviewAdmin3C1', allowNew: true, reason: 'Rollback feature flag 3C-1' },
    { name: 'aturPersentaseShadowOptimasiReviewAdmin3C1', allowNew: true, reason: 'Kontrol shadow 3C-1' },
    { name: 'resetMetrikOptimasiReviewAdmin3C1', allowNew: true, reason: 'Tool metrik 3C-1' },
    { name: 'guardTerencanaOptimasiReviewAdmin3C1', allowNew: true, reason: 'Wrapper Guard Batch 3 untuk 3C-1' }
  ]);
}
