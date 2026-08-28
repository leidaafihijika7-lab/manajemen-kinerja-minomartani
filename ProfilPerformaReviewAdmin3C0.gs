/**
 * ===== TAHAP OPTIMASI 3C-0 =====
 * Profiling Performa Review Admin (READ ONLY)
 *
 * Tujuan:
 * - Mengukur bottleneck aktual jalur Review Bukti Admin sebelum mengubah jalur produksi.
 * - Tidak mengubah Spreadsheet, poin, status review, schema, feature flag, atau deployment.
 * - Tidak memanggil fungsi review/mutasi.
 *
 * Baseline aplikasi: 2026.08.07.03
 */

var PROFIL_PERFORMA_REVIEW_ADMIN_3C0 = {
  VERSION: '3C0a-2026.08.08.02',
  APP_VERSION_EXPECTED: '2026.08.28.07',
  INDEX_SHEET: 'Index_Laporan',
  REKAP_SHEET: 'Rekap_Kinerja',
  REKAP_PROJECTION_WIDTH: 26,
  PAGE_SIZE: 10
};

function profilPerformaReviewAdmin3C0(targetId, periodeReview) {
  var startedAt = Date.now();
  var result = {
    sukses: false,
    valid: false,
    versi: PROFIL_PERFORMA_REVIEW_ADMIN_3C0.VERSION,
    appVersion: (typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : ''),
    targetId: '',
    periodeReview: '',
    metrics: {},
    rekomendasi: [],
    issues: [],
    readOnly: true,
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };

  try {
    if (result.appVersion && result.appVersion !== PROFIL_PERFORMA_REVIEW_ADMIN_3C0.APP_VERSION_EXPECTED) {
      result.issues.push('APP_VERSION berbeda dari baseline profiler: ' + result.appVersion);
    }

    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(PROFIL_PERFORMA_REVIEW_ADMIN_3C0.REKAP_SHEET);
    if (!sheet) throw new Error('Sheet Rekap_Kinerja tidak ditemukan.');

    var tIndex = Date.now();
    var pilihan = pilihTargetProfilReviewAdmin3C0_(ss, targetId);
    result.metrics.indexCandidateMs = Date.now() - tIndex;
    result.metrics.indexRowsRead = Number(pilihan.indexRowsRead || 0);
    result.metrics.indexCellsRead = Number(pilihan.indexCellsRead || 0);
    result.metrics.targetSource = String(pilihan.source || '');
    result.targetId = String(pilihan.targetId || '').trim();
    if (!result.targetId) throw new Error('Target pegawai untuk profiling tidak dapat ditentukan.');

    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var width = Math.min(lastColumn, PROFIL_PERFORMA_REVIEW_ADMIN_3C0.REKAP_PROJECTION_WIDTH);
    result.metrics.rekapLastRow = lastRow;
    result.metrics.rekapLastColumn = lastColumn;
    result.metrics.rekapProjectionWidth = width;

    var tProjection = Date.now();
    var rows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
    result.metrics.rekapProjectionReadMs = Date.now() - tProjection;
    result.metrics.rekapProjectionRows = rows.length;
    result.metrics.rekapProjectionCells = rows.length * width;

    validasiDependensiProfilReviewAdmin3C0a_();

    var tContext = Date.now();
    var context = buatKonteksCutoff3B04C1c_();
    result.metrics.cutoffContextMs = Date.now() - tContext;
    if (!context || context.valid === false) {
      result.issues.push('Context resolver periode tidak valid.');
    }

    var tEmployee = Date.now();
    var employee = getPegawaiById_(result.targetId);
    result.metrics.employeeLookupMs = Date.now() - tEmployee;
    if (!employee || !employee.id) throw new Error('Pegawai target tidak ditemukan: ' + result.targetId);

    var tMetadata = Date.now();
    var records = [];
    var periodeCount = {};
    for (var i = 0; i < rows.length; i++) {
      if (!idsEqual_(rows[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER], result.targetId)) continue;
      var metadata = buatMetadataRow3B04C1c_(rows[i], SHEET_COLUMNS.REKAP_KINERJA, context);
      var p = String((metadata && metadata.periodeReview) || '').trim();
      if (p) periodeCount[p] = Number(periodeCount[p] || 0) + 1;
      records.push({
        sheetRow: i + 2,
        status: String(rows[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || ''),
        metadata: metadata
      });
    }
    result.metrics.metadataTargetMs = Date.now() - tMetadata;
    result.metrics.targetRows = records.length;
    result.metrics.periodeCount = periodeCount;

    var requestedPeriod = String(periodeReview || '').trim();
    if (requestedPeriod && !/^\d{4}-\d{2}$/.test(requestedPeriod)) {
      result.issues.push('periodeReview diabaikan karena format bukan YYYY-MM: ' + requestedPeriod);
      requestedPeriod = '';
    }
    var resolvedPeriod = requestedPeriod || pilihPeriodeProfilReviewAdmin3C0_(periodeCount);
    result.periodeReview = resolvedPeriod;

    var scoped = records.filter(function (rec) {
      if (!resolvedPeriod) return true;
      return String((rec.metadata && rec.metadata.periodeReview) || '') === resolvedPeriod;
    });
    result.metrics.scopedRows = scoped.length;

    var pageRecords = scoped.slice(0, PROFIL_PERFORMA_REVIEW_ADMIN_3C0.PAGE_SIZE);
    var rowNumbers = pageRecords.map(function (x) { return x.sheetRow; });
    result.metrics.pageRowsRequested = rowNumbers.length;

    var tFullRows = Date.now();
    var fullRowsMap = rowNumbers.length ? bacaBarisLengkapAdminReviewV2A1C_(sheet, rowNumbers, lastColumn) : {};
    result.metrics.fullRowsPageReadMs = Date.now() - tFullRows;
    result.metrics.fullRowsPageCells = rowNumbers.length * lastColumn;

    var tBuild = Date.now();
    var builtItems = 0;
    var lampiranCache = {};
    for (var j = 0; j < pageRecords.length; j++) {
      var rec = pageRecords[j];
      var fullRow = fullRowsMap[rec.sheetRow];
      if (!fullRow) continue;
      var item = buildAdminReviewItemFromRow_(fullRow, lampiranCache);
      if (!item) continue;
      if (typeof injectKolomKQKeItemReview_ === 'function') {
        item = injectKolomKQKeItemReview_(item, fullRow);
      }
      item = gabungkanMetadata3B04C1c_(item, rec.metadata);
      if (item) builtItems++;
    }
    result.metrics.buildPageItemsMs = Date.now() - tBuild;
    result.metrics.pageItemsBuilt = builtItems;

    result.metrics.totalMeasuredMs = Date.now() - startedAt;
    result.metrics.projectionSharePct = result.metrics.totalMeasuredMs > 0
      ? Math.round((result.metrics.rekapProjectionReadMs / result.metrics.totalMeasuredMs) * 1000) / 10
      : 0;
    result.metrics.metadataSharePct = result.metrics.totalMeasuredMs > 0
      ? Math.round((result.metrics.metadataTargetMs / result.metrics.totalMeasuredMs) * 1000) / 10
      : 0;
    result.metrics.pageReadSharePct = result.metrics.totalMeasuredMs > 0
      ? Math.round((result.metrics.fullRowsPageReadMs / result.metrics.totalMeasuredMs) * 1000) / 10
      : 0;

    if (result.metrics.rekapProjectionReadMs >= result.metrics.totalMeasuredMs * 0.35) {
      result.rekomendasi.push('PRIORITAS: kurangi scan Rekap_Kinerja 26 kolom pada setiap request Review Admin.');
    }
    if (result.metrics.metadataTargetMs >= result.metrics.totalMeasuredMs * 0.25) {
      result.rekomendasi.push('PRIORITAS: cache hasil resolver metadata per pegawai/periode atau pindahkan kandidat ke indeks yang lebih sempit.');
    }
    if (result.metrics.fullRowsPageReadMs >= result.metrics.totalMeasuredMs * 0.25) {
      result.rekomendasi.push('PRIORITAS: optimalkan pembacaan baris lengkap batch halaman tanpa memperlebar scan awal.');
    }
    if (!result.rekomendasi.length) {
      result.rekomendasi.push('Tidak ada satu tahap yang dominan; gunakan hasil profil beberapa kali sebelum memilih strategi optimasi.');
    }

    result.valid = result.issues.length === 0;
    result.sukses = true;
  } catch (err) {
    result.issues.push(String((err && err.message) || err || 'Unknown error'));
    result.metrics.totalMeasuredMs = Date.now() - startedAt;
  }

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function statusProfilPerformaReviewAdmin3C0() {
  var deps = cekDependensiProfilReviewAdmin3C0a_();
  var result = {
    sukses: deps.missing.length === 0,
    valid: deps.missing.length === 0,
    versi: PROFIL_PERFORMA_REVIEW_ADMIN_3C0.VERSION,
    appVersion: (typeof APP_VERSION !== 'undefined' ? String(APP_VERSION || '') : ''),
    readOnly: true,
    fungsiUtama: 'profilPerformaReviewAdmin3C0',
    parameterOpsional: ['targetId', 'periodeReview'],
    dependencies: deps,
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function cekDependensiProfilReviewAdmin3C0a_() {
  var required = [
    ['buatKonteksCutoff3B04C1c_', typeof buatKonteksCutoff3B04C1c_ === 'function'],
    ['buatMetadataRow3B04C1c_', typeof buatMetadataRow3B04C1c_ === 'function'],
    ['gabungkanMetadata3B04C1c_', typeof gabungkanMetadata3B04C1c_ === 'function'],
    ['getPegawaiById_', typeof getPegawaiById_ === 'function'],
    ['idsEqual_', typeof idsEqual_ === 'function'],
    ['bacaBarisLengkapAdminReviewV2A1C_', typeof bacaBarisLengkapAdminReviewV2A1C_ === 'function'],
    ['buildAdminReviewItemFromRow_', typeof buildAdminReviewItemFromRow_ === 'function']
  ];
  var missing = required.filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
  return { valid: missing.length === 0, requiredCount: required.length, missing: missing };
}

function validasiDependensiProfilReviewAdmin3C0a_() {
  var deps = cekDependensiProfilReviewAdmin3C0a_();
  if (deps.missing.length) throw new Error('Dependensi profiler tidak tersedia: ' + deps.missing.join(', '));
  return deps;
}

function pilihTargetProfilReviewAdmin3C0_(ss, preferredTargetId) {
  var preferred = String(preferredTargetId || '').trim();
  if (preferred) return { targetId: preferred, indexRowsRead: 0, indexCellsRead: 0, source: 'PARAMETER' };

  var indexSheet = ss.getSheetByName(PROFIL_PERFORMA_REVIEW_ADMIN_3C0.INDEX_SHEET);
  if (!indexSheet || indexSheet.getLastRow() < 2) {
    throw new Error('Index_Laporan tidak tersedia untuk memilih target profiling otomatis. Berikan targetId secara manual.');
  }

  var n = indexSheet.getLastRow() - 1;
  var values = indexSheet.getRange(2, 1, n, 3).getValues();
  var counts = {};
  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][2] || '').trim();
    if (!id) continue;
    counts[id] = Number(counts[id] || 0) + 1;
  }

  var ranked = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  for (var j = 0; j < ranked.length; j++) {
    var pegawai = getPegawaiById_(ranked[j]);
    if (!pegawai || !pegawai.id) continue;
    if (typeof isLurah_ === 'function' && isLurah_(pegawai.jabatan || '')) continue;
    return {
      targetId: ranked[j],
      indexRowsRead: values.length,
      indexCellsRead: values.length * 3,
      source: 'INDEX_MAX_REPORTS'
    };
  }

  return {
    targetId: ranked.length ? ranked[0] : '',
    indexRowsRead: values.length,
    indexCellsRead: values.length * 3,
    source: 'INDEX_FALLBACK'
  };
}

function pilihPeriodeProfilReviewAdmin3C0_(periodeCount) {
  var keys = Object.keys(periodeCount || {}).filter(function (x) { return /^\d{4}-\d{2}$/.test(x); });
  keys.sort();
  return keys.length ? keys[keys.length - 1] : '';
}

// ===== END TAHAP OPTIMASI 3C-0 =====
