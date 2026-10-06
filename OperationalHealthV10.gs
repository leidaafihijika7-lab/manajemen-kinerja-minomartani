// Operational Health & Integrity Center v1.0-RC1
// Read-only diagnostics for Lurah/Carik. This module never writes spreadsheet data,
// review decisions, points, allowance workflow, or schema.
var OPERATIONAL_HEALTH_V10_VERSION_ = 'OHIC-v1.0.1-RC1-2026.09.30.01';

function ohicStatusRankV10_(status) {
  var s = String(status || '').toUpperCase();
  return s === 'CRITICAL' ? 3 : (s === 'WARN' ? 2 : (s === 'INFO' ? 1 : 0));
}

function ohicCheckV10_(id, group, status, title, headline, metrics, samples, recommendation) {
  return {
    id: String(id || ''), group: String(group || ''), status: String(status || 'PASS').toUpperCase(),
    title: String(title || ''), headline: String(headline || ''),
    metrics: metrics && typeof metrics === 'object' ? metrics : {},
    samples: Array.isArray(samples) ? samples.slice(0, 8) : [],
    recommendation: String(recommendation || '')
  };
}

function ohicMeaningfulRowV10_(row, maxCols) {
  var limit = Math.min(Number(maxCols || row.length), row.length);
  for (var i = 0; i < limit; i++) if (row[i] !== '' && row[i] !== null && row[i] !== undefined) return true;
  return false;
}

function ohicFormatNowV10_(d) {
  try { return Utilities.formatDate(d || new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss') + ' WIB'; }
  catch (e) { return String(d || ''); }
}

function ohicCanonicalUserV10_(value) {
  return String(value == null ? '' : value).replace(/\u00a0/g, ' ').trim().toLowerCase();
}

function ohicGroupReportV10_(jabatan) {
  var j = canonicalizeJabatan_(String(jabatan || ''));
  if (j.indexOf('phl') !== -1 || j.indexOf('harian lepas') !== -1) return 'PHL';
  if (j.indexOf('dukuh') !== -1) return 'DUKUH';
  if (j.indexOf('staf') !== -1) return 'STAF';
  return 'PAMONG';
}

function ohicGovernanceCheckV10_() {
  try {
    var app = typeof APP_VERSION !== 'undefined' ? String(APP_VERSION) : '';
    var registryBaseline = (typeof PORTAL_FUNCTION_REGISTRY_3B1B1_ !== 'undefined' && PORTAL_FUNCTION_REGISTRY_3B1B1_)
      ? String(PORTAL_FUNCTION_REGISTRY_3B1B1_.baselineAppVersion || '') : '';
    var bindingBaseline = typeof PORTAL_BINDING_BASELINE_APP_VERSION_3B1B2 !== 'undefined'
      ? String(PORTAL_BINDING_BASELINE_APP_VERSION_3B1B2) : '';
    var guardBaseline = typeof PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3 !== 'undefined'
      ? String(PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3) : '';
    var contractTotal = typeof PORTAL_FUNCTION_CONTRACT_3B1B2_ !== 'undefined' && Array.isArray(PORTAL_FUNCTION_CONTRACT_3B1B2_)
      ? PORTAL_FUNCTION_CONTRACT_3B1B2_.length : 0;
    var registry = typeof validasiStrukturRegistryFungsi3B1B1_ === 'function'
      ? validasiStrukturRegistryFungsi3B1B1_() : { valid: false };
    var snap = typeof bangunSnapshotKontrakAktif3B1B2_ === 'function'
      ? bangunSnapshotKontrakAktif3B1B2_() : { rows: [], checksumAktif: '' };
    var missing = 0, mismatch = 0;
    (snap.rows || []).forEach(function (r) {
      if (!r.tersedia) missing++;
      else if (!r.match) mismatch++;
    });
    var baselineCocok = !!app && app === registryBaseline && app === bindingBaseline && app === guardBaseline;
    var checksumCocok = typeof PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_ !== 'undefined' &&
      String(PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_) === String(snap.checksumAktif || '');
    var ok = baselineCocok && registry.valid === true && contractTotal > 0 && missing === 0 && mismatch === 0 && checksumCocok;
    return ohicCheckV10_('governance_contract', 'GOVERNANCE', ok ? 'PASS' : 'CRITICAL',
      'Versi & kontrak aplikasi',
      ok ? 'Versi runtime, registry, binding, dan guard berada pada baseline yang sama.' : 'Ditemukan ketidaksesuaian versi atau kontrak fungsi aktif.',
      { appVersion: app, contractTotal: contractTotal, activeBindings: (snap.rows || []).filter(function (r) { return r.tersedia; }).length,
        registryValid: registry.valid === true, checksumMatch: checksumCocok, missing: missing, mismatch: mismatch },
      [], ok ? '' : 'Jangan melanjutkan deployment baru atau perubahan workflow sampai validasi binding/guard diperiksa dari Apps Script Editor.');
  } catch (e) {
    return ohicCheckV10_('governance_contract', 'GOVERNANCE', 'CRITICAL', 'Versi & kontrak aplikasi',
      'Pemeriksaan kontrak tidak dapat diselesaikan.', {}, [String(e && e.message ? e.message : e)],
      'Jalankan validasiBindingAktif3B1B2 dan validasiGuardKontrakPraDeploy3B1B3 dari editor.');
  }
}

function ohicRequiredSheetsCheckV10_(ss) {
  var required = ['Rekap_Kinerja','Data_Pegawai','Master_Tunjangan','Rekap_Tunjangan_Bulanan','Index_Laporan'];
  var optional = ['Index_Laporan_Sync_Queue','Audit_Log','Audit_Tunjangan'];
  var missingRequired = required.filter(function (n) { return !ss.getSheetByName(n); });
  var missingOptional = optional.filter(function (n) { return !ss.getSheetByName(n); });
  var status = missingRequired.length ? 'CRITICAL' : (missingOptional.length ? 'WARN' : 'PASS');
  return ohicCheckV10_('required_sheets', 'GOVERNANCE', status, 'Struktur sheet inti',
    missingRequired.length ? 'Ada sheet wajib yang tidak tersedia.' : (missingOptional.length ? 'Sheet inti lengkap; beberapa sheet pendukung belum tersedia.' : 'Seluruh sheet inti dan pendukung yang diperiksa tersedia.'),
    { required: required.length, missingRequired: missingRequired.length, optional: optional.length, missingOptional: missingOptional.length },
    missingRequired.concat(missingOptional),
    missingRequired.length ? 'Pulihkan sheet wajib dari cadangan sebelum menjalankan proses yang bergantung pada sheet tersebut.' : '');
}

function ohicEmployeeCheckV10_(ss) {
  var sh = ss.getSheetByName('Data_Pegawai');
  if (!sh) return ohicCheckV10_('employee_identity','MASTER_DATA','CRITICAL','Identitas pegawai','Data_Pegawai tidak ditemukan.',{},[], 'Pulihkan Data_Pegawai.');
  var data = sh.getDataRange().getValues();
  var P = SHEET_COLUMNS.DATA_PEGAWAI;
  var ids = Object.create(null), users = Object.create(null), active = 0, inactive = 0, phl = 0;
  var duplicateIds = [], duplicateUsers = [], incompleteActive = [], inactiveIncomplete = [], unknownStatus = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i] || [];
    if (!ohicMeaningfulRowV10_(r, 8)) continue;
    var id = normalizeId_(r[P.ID]), user = ohicCanonicalUserV10_(r[P.USERNAME]), nama = String(r[P.NAMA] || '').trim();
    var jabatan = String(r[P.JABATAN] || '').trim(), statusRaw = String(r[P.STATUS] || '').trim();
    var isActive = statusPegawaiAktif_(statusRaw), isPhl = jabatanPhlTarifV03_(jabatan);
    if (id) { if (ids[id]) duplicateIds.push('Baris ' + (i + 1) + ': ' + (nama || id)); ids[id] = true; }
    if (user) { if (users[user]) duplicateUsers.push('Baris ' + (i + 1) + ': ' + (nama || user)); users[user] = true; }
    if (isActive) {
      active++; if (isPhl) phl++;
      if (!id || !user || !nama || !jabatan) incompleteActive.push('Baris ' + (i + 1) + ': ' + (nama || jabatan || id || 'tanpa identitas'));
    } else {
      inactive++;
      if (!nama || !id || !jabatan) inactiveIncomplete.push('Baris ' + (i + 1) + ': ' + (jabatan || id || 'nonaktif'));
    }
    var st = statusRaw.toLowerCase();
    if (st && st !== 'aktif' && st !== 'nonaktif') unknownStatus.push('Baris ' + (i + 1) + ': ' + statusRaw);
  }
  var vacantPositions = [], inactiveProblems = [];
  inactiveIncomplete.forEach(function (sample) {
    var m = String(sample || '').match(/^Baris\s+(\d+):\s*(.*)$/i);
    var rowNo = m ? Number(m[1]) : 0;
    var row = rowNo > 1 ? (data[rowNo - 1] || []) : [];
    var nama = String(row[P.NAMA] || '').trim(), user = ohicCanonicalUserV10_(row[P.USERNAME]), jabatan = String(row[P.JABATAN] || '').trim();
    var st = String(row[P.STATUS] || '').trim().toLowerCase();
    if (st === 'nonaktif' && jabatan && !nama && !user) vacantPositions.push('Baris ' + rowNo + ': ' + jabatan);
    else inactiveProblems.push(sample);
  });
  var critical = duplicateIds.length + duplicateUsers.length + incompleteActive.length;
  var warnings = inactiveProblems.length + unknownStatus.length;
  var info = vacantPositions.length;
  return ohicCheckV10_('employee_identity','MASTER_DATA', critical ? 'CRITICAL' : (warnings ? 'WARN' : (info ? 'INFO' : 'PASS')),
    'Identitas & akun pegawai',
    critical ? 'Ada konflik identitas/akun aktif yang harus diperiksa.' : (warnings ? 'Pegawai aktif konsisten; ada catatan data nonaktif/status yang perlu ditinjau.' : (info ? 'Pegawai aktif konsisten; terdapat posisi/jabatan nonaktif yang belum memiliki pejabat definitif.' : 'ID, username, dan identitas pegawai aktif konsisten.')),
    { active: active, inactive: inactive, activePHL: phl, duplicateIds: duplicateIds.length, duplicateUsernames: duplicateUsers.length,
      incompleteActive: incompleteActive.length, inactiveIncomplete: inactiveProblems.length, vacantPositions: vacantPositions.length, unknownStatus: unknownStatus.length },
    duplicateIds.concat(duplicateUsers, incompleteActive, inactiveProblems, unknownStatus, vacantPositions),
    critical ? 'Perbaiki konflik identitas pada Data_Pegawai sebelum menerima login/laporan baru.' : (warnings ? 'Tinjau data nonaktif/status yang tidak mengikuti pola posisi kosong.' : (info ? 'Tidak diperlukan tindakan sampai jabatan tersebut diisi pejabat definitif.' : '')));
}

function ohicTariffCheckV10_(ss) {
  try {
    var master = getMasterTunjanganMap_();
    var sh = ss.getSheetByName('Data_Pegawai');
    var data = sh ? sh.getDataRange().getValues() : [];
    var P = SHEET_COLUMNS.DATA_PEGAWAI, unresolved = [], checked = 0, excludedPhl = 0;
    for (var i = 1; i < data.length; i++) {
      var r = data[i] || [];
      if (!statusPegawaiAktif_(r[P.STATUS])) continue;
      var id = normalizeId_(r[P.ID]), nama = String(r[P.NAMA] || '').trim(), jabatan = String(r[P.JABATAN] || '').trim();
      if (!id || !nama || !jabatan) continue;
      try {
        var rate = resolveTarifDariMasterV03_(master, jabatan);
        if (rate.excludedPHL) excludedPhl++; else checked++;
      } catch (e) { unresolved.push((nama || id) + ' — ' + jabatan + ': ' + String(e.message || e)); }
    }
    var warnings = Array.isArray(master.warnings) ? master.warnings : [];
    return ohicCheckV10_('tariff_master','MASTER_DATA', unresolved.length ? 'CRITICAL' : (warnings.length ? 'WARN' : 'PASS'),
      'Master tarif tunjangan',
      unresolved.length ? 'Ada jabatan aktif non-PHL yang tidak dapat dipetakan ke Master_Tunjangan.' : (warnings.length ? 'Master dapat dibaca, tetapi ada fallback tarif yang perlu ditinjau.' : 'Semua jabatan aktif non-PHL dapat dipetakan secara tegas ke master tarif.'),
      { masterRows: (master.sourceRows || []).length, activeNonPHLChecked: checked, excludedPHL: excludedPhl,
        unresolved: unresolved.length, warnings: warnings.length, tariffVersion: TARIF_TUNJANGAN_V03_VERSION_ },
      unresolved.concat(warnings.map(function (w) { return (w.code || 'WARNING') + ': ' + (w.jabatan || '') + (w.row ? ' (baris ' + w.row + ')' : ''); })),
      unresolved.length ? 'Lengkapi atau koreksi Master_Tunjangan; jangan gunakan fuzzy matching atau mengubah tarif pegawai lain sebagai jalan pintas.' : '');
  } catch (e) {
    return ohicCheckV10_('tariff_master','MASTER_DATA','CRITICAL','Master tarif tunjangan','Master tarif tidak dapat dibaca/validasi.',{},[String(e && e.message ? e.message : e)],'Periksa Master_Tunjangan sebelum memproses tunjangan.');
  }
}

function ohicReportDiagnosticsV10_(ss) {
  var sh = ss.getSheetByName('Rekap_Kinerja');
  if (!sh) return { check: ohicCheckV10_('report_integrity','REPORTS_INDEX','CRITICAL','Integritas laporan','Rekap_Kinerja tidak ditemukan.',{},[],'Pulihkan Rekap_Kinerja.'), ids: Object.create(null), rows: [] };
  var last = sh.getLastRow();
  var data = last < 2 ? [] : sh.getRange(2, 1, last - 1, SHEET_COLUMNS.REKAP_KINERJA.ID_USER + 1).getValues();
  var C = SHEET_COLUMNS.REKAP_KINERJA, ids = Object.create(null), duplicate = [], missingId = [], missingUser = [], invalidDate = [], unknownStatus = [];
  var statusCounts = { approved:0, rejected:0, pending:0, legacyLate:0, other:0 }, meaningful = 0, latestMs = 0;
  var resolver = buatResolverPeriodeResmiAdminV2A2_();
  var currentPeriod = periodeKinerjaAktifUntukLaporanWajibV34_(new Date());
  var currentPending = { total:0, PHL:0, PAMONG:0, DUKUH:0, STAF:0 };
  for (var i = 0; i < data.length; i++) {
    var r = data[i] || [];
    if (!ohicMeaningfulRowV10_(r, C.ID_USER + 1)) continue;
    meaningful++;
    var rowNo = i + 2, idLap = String(r[C.ID_LAPORAN] || '').trim(), idUser = normalizeId_(r[C.ID_USER]);
    var nama = String(r[C.NAMA] || '').trim(), jabatan = String(r[C.JABATAN] || '').trim(), status = String(r[C.STATUS_REVIEW] || '').trim();
    if (!idLap) missingId.push('Baris ' + rowNo + ': ' + (nama || 'tanpa nama'));
    else { if (ids[idLap]) duplicate.push(idLap + ' (baris ' + ids[idLap] + ' & ' + rowNo + ')'); else ids[idLap] = rowNo; }
    if (!idUser) missingUser.push('Baris ' + rowNo + ': ' + (nama || idLap || 'tanpa identitas'));
    var d = parseTanggal(r[C.TANGGAL_LAPORAN]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) invalidDate.push('Baris ' + rowNo + ': ' + (idLap || nama || 'tanggal tidak valid'));
    else {
      if (d.getTime() > latestMs) latestMs = d.getTime();
      var p = resolver(d);
      if (p === currentPeriod && isPendingReviewStatus_(status)) {
        var group = ohicGroupReportV10_(jabatan); currentPending.total++; currentPending[group] = (currentPending[group] || 0) + 1;
      }
    }
    if (isStatusApproved_(status)) statusCounts.approved++;
    else if (status === 'Ditolak') statusCounts.rejected++;
    else if (isPendingReviewStatus_(status)) statusCounts.pending++;
    else if (status === 'Disetujui - Lewat Cut-off') statusCounts.legacyLate++;
    else { statusCounts.other++; unknownStatus.push('Baris ' + rowNo + ': ' + (status || '(kosong)')); }
  }
  var critical = duplicate.length + missingId.length + missingUser.length + invalidDate.length;
  var warnings = unknownStatus.length;
  var check = ohicCheckV10_('report_integrity','REPORTS_INDEX', critical ? 'CRITICAL' : (warnings ? 'WARN' : 'PASS'),
    'Integritas Rekap_Kinerja',
    critical ? 'Ada laporan dengan ID/identitas/tanggal yang tidak konsisten.' : (warnings ? 'ID dan tanggal laporan konsisten; ada status yang tidak dikenal.' : 'ID laporan unik dan identitas/tanggal inti terbaca.'),
    { totalReports: meaningful, duplicateReportIds: duplicate.length, missingReportId: missingId.length, missingUserId: missingUser.length,
      invalidDates: invalidDate.length, unknownStatus: unknownStatus.length, approved: statusCounts.approved, rejected: statusCounts.rejected,
      pendingAllPeriods: statusCounts.pending, legacyLateApproved: statusCounts.legacyLate,
      latestReport: latestMs ? ohicFormatNowV10_(new Date(latestMs)) : '' },
    duplicate.concat(missingId, missingUser, invalidDate, unknownStatus),
    critical ? 'Hentikan perbaikan massal. Audit baris bermasalah secara tertarget menggunakan ID laporan dan riwayat audit.' : '');
  return { check: check, ids: ids, rows: data, currentPeriod: currentPeriod, currentPending: currentPending };
}

function ohicReviewQueueCheckV10_(diag) {
  var p = diag.currentPeriod || '';
  var q = diag.currentPending || {total:0,PHL:0,PAMONG:0,DUKUH:0,STAF:0};
  var status = q.total > 0 ? 'WARN' : 'PASS';
  return ohicCheckV10_('review_queue','REPORTS_INDEX',status,'Antrean review periode aktif',
    q.total ? 'Masih ada laporan periode aktif yang menunggu review.' : 'Tidak ada laporan periode aktif yang menunggu review.',
    { period: p, totalPending: q.total || 0, PHL: q.PHL || 0, pamong: q.PAMONG || 0, dukuh: q.DUKUH || 0, staf: q.STAF || 0 },
    [], q.total ? 'Selesaikan antrean melalui Review Admin; laporan PHL tetap direview administrasi walaupun tidak masuk tunjangan.' : '');
}

function ohicIndexCheckV10_(ss, reportDiag) {
  var sh = ss.getSheetByName('Index_Laporan');
  if (!sh) return ohicCheckV10_('index_sync','REPORTS_INDEX','CRITICAL','Sinkronisasi Index_Laporan','Index_Laporan tidak ditemukan.',{},[],'Pulihkan/bangun ulang index melalui prosedur maintenance yang tervalidasi.');
  var last = sh.getLastRow();
  var data = last < 2 ? [] : sh.getRange(2, 1, last - 1, SHEET_COLUMNS.INDEX_LAPORAN.INDEX_VERSION + 1).getValues();
  var I = SHEET_COLUMNS.INDEX_LAPORAN, indexIds = Object.create(null), duplicate = [], orphan = [];
  for (var i = 0; i < data.length; i++) {
    var id = String((data[i] || [])[I.ID_LAPORAN] || '').trim(); if (!id) continue;
    if (indexIds[id]) duplicate.push(id); else indexIds[id] = true;
  }
  Object.keys(indexIds).forEach(function (id) { if (!reportDiag.ids[id]) orphan.push(id); });
  var missing = [];
  Object.keys(reportDiag.ids).forEach(function (id) { if (!indexIds[id]) missing.push(id); });
  var queuePending = 0, queueFailed = 0, queueTotal = 0, queueStale = 0, queueNeedsSync = 0;
  var staleSamples = [], actionableSamples = [];
  var qsh = ss.getSheetByName('Index_Laporan_Sync_Queue');
  if (qsh) {
    var qlast = qsh.getLastRow();
    var qdata = qlast < 2 ? [] : qsh.getRange(2, 1, qlast - 1, SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE.DIPROSES_PADA + 1).getValues();
    var Q = SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE;
    qdata.forEach(function (r, qi) {
      if (!ohicMeaningfulRowV10_(r, Q.DIPROSES_PADA + 1)) return;
      queueTotal++;
      var st = String(r[Q.STATUS] || '').trim().toUpperCase();
      if (st === 'PENDING' || st === 'RETRY') {
        queuePending++;
        var cls = ohicKlasifikasiQueueIndexV101_(ss, r, qi + 2);
        if (cls.classification === 'STALE_ALREADY_SYNCED') { queueStale++; if (staleSamples.length < 4) staleSamples.push(cls.sample); }
        else { queueNeedsSync++; if (actionableSamples.length < 4) actionableSamples.push(cls.sample); }
      } else if (st === 'FAILED' || st === 'ERROR' || st === 'NEED_REBUILD') queueFailed++;
    });
  }
  var critical = duplicate.length + orphan.length + missing.length + queueFailed;
  var warn = queueNeedsSync;
  var info = queueStale;
  return ohicCheckV10_('index_sync','REPORTS_INDEX', critical ? 'CRITICAL' : (warn ? 'WARN' : (info ? 'INFO' : 'PASS')),
    'Sinkronisasi index laporan',
    critical ? 'Index laporan tidak sepenuhnya konsisten dengan Rekap_Kinerja.' : (warn ? 'Index utama konsisten, tetapi ada antrean sinkronisasi yang masih benar-benar memerlukan tindakan.' : (info ? 'Index konsisten; terdapat antrean lama yang sudah tersinkron dan dapat ditutup secara idempotent.' : 'Index_Laporan mencakup seluruh ID laporan tanpa orphan/duplikat.')),
    { sourceIds: Object.keys(reportDiag.ids).length, indexedIds: Object.keys(indexIds).length, missingInIndex: missing.length,
      orphanIndex: orphan.length, duplicateIndex: duplicate.length, queueTotal: queueTotal, queuePending: queuePending, queueFailed: queueFailed,
      queueStale: queueStale, queueNeedsSync: queueNeedsSync },
    missing.slice(0,4).concat(orphan.slice(0,4), duplicate.slice(0,4), actionableSamples, staleSamples),
    critical ? 'Gunakan audit Index_Laporan yang sudah tersedia; jangan menghapus baris index secara manual.' : (warn ? 'Audit antrean sebelum menjalankan sinkronisasi; jangan menimpa index yang sudah benar.' : (info ? 'Jalankan maintenanceRekonsiliasiQueueIndexV101 dari Apps Script Editor dengan akun maintainer untuk menutup antrean stale tanpa rewrite index.' : '')));
}
function ohicPeriodCheckV10_() {
  try {
    var p = periodeKinerjaAktifUntukLaporanWajibV34_(new Date());
    var meta = metaPeriodeResmiDashboardAdminV37_(p, new Date());
    var locks = daftarTutupPeriodeLaporanResmiV36_() || [];
    var latestClosed = '';
    locks.forEach(function (x) { if (x && x.periode && (!latestClosed || x.periode > latestClosed)) latestClosed = x.periode; });
    return ohicCheckV10_('period_status','PERIOD_ALLOWANCE','PASS','Periode pelaporan resmi',
      'Periode aktif resmi dapat ditentukan dari konfigurasi penutupan Admin.',
      { activePeriod: p, activeLabel: meta.labelPeriodeAktifResmi || meta.labelPeriode || '', status: meta.statusPeriode || '',
        latestConfiguredClosedPeriod: latestClosed, configuredClosures: locks.length }, [], '');
  } catch (e) {
    return ohicCheckV10_('period_status','PERIOD_ALLOWANCE','CRITICAL','Periode pelaporan resmi','Periode aktif resmi tidak dapat ditentukan.',{},[String(e && e.message ? e.message : e)],'Periksa konfigurasi tutup periode sebelum menerima laporan baru.');
  }
}

function ohicAllowanceCheckV10_(ss) {
  var sh = ss.getSheetByName('Rekap_Tunjangan_Bulanan');
  if (!sh) return ohicCheckV10_('allowance_batch','PERIOD_ALLOWANCE','CRITICAL','Batch tunjangan aktif','Rekap_Tunjangan_Bulanan tidak ditemukan.',{},[],'Pulihkan sheet tunjangan.');
  var data = sh.getDataRange().getValues();
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN, residual = [], byPeriod = Object.create(null);
  for (var i = 1; i < data.length; i++) {
    var r = data[i] || [];
    if (!ohicMeaningfulRowV10_(r, data[i].length)) continue;
    var firstBusiness = false, laterMeta = false;
    for (var a = 0; a <= C.CATATAN_BENDAHARA; a++) if (r[a] !== '' && r[a] !== null && r[a] !== undefined) { firstBusiness = true; break; }
    for (var b = C.DIBUAT_OLEH; b <= C.TANGGAL_CUTOFF; b++) if (r[b] !== '' && r[b] !== null && r[b] !== undefined) { laterMeta = true; break; }
    if (!firstBusiness && laterMeta) residual.push('Baris ' + (i + 1));
    var p = '';
    try { p = periodeKeyTunjangan_(r[C.PERIODE], false); } catch (e) { p = ''; }
    if (!p || !nilaiAktifEksplisitTunjangan_(r[C.IS_ACTIVE])) continue;
    if (!byPeriod[p]) byPeriod[p] = [];
    byPeriod[p].push({ rowIndex:i + 1, values:r });
  }
  var periods = Object.keys(byPeriod).sort();
  if (!periods.length) {
    return ohicCheckV10_('allowance_batch','PERIOD_ALLOWANCE', residual.length ? 'WARN' : 'INFO','Batch tunjangan aktif',
      'Belum ada batch tunjangan aktif.', { activePeriods:0, residualMetadataRows: residual.length }, residual,
      residual.length ? 'Metadata batch lama sebaiknya dibersihkan melalui pekerjaan terpisah dengan cadangan dan audit.' : '');
  }
  var latest = periods[periods.length - 1], rows = byPeriod[latest], batch = { periode:latest, rows:rows }, first = rows[0].values;
  var batchIds = Object.create(null), statuses = Object.create(null), ids = Object.create(null), duplicateIds = [], invalidArithmetic = [], total = 0;
  rows.forEach(function (item) {
    var r = item.values || [], bid = String(r[C.BATCH_ID] || '').trim(), st = String(r[C.STATUS_REKAP] || '').trim(), id = normalizeId_(r[C.ID_USER]);
    if (bid) batchIds[bid] = true; if (st) statuses[st] = true;
    if (id) { if (ids[id]) duplicateIds.push(String(r[C.NAMA] || id)); ids[id] = true; }
    var rpProd=Number(r[C.RP_PROD]), rpTU=Number(r[C.RP_TU]), rpTotal=Number(r[C.RP_TOTAL]), maxProd=Number(r[C.MAX_PROD]), maxTU=Number(r[C.MAX_TU]),
        pp=Number(r[C.PERSEN_PROD]), pt=Number(r[C.PERSEN_TU]);
    total += isFinite(rpTotal) ? rpTotal : 0;
    if (![rpProd,rpTU,rpTotal,maxProd,maxTU,pp,pt].every(isFinite) || pp < 0 || pp > 100 || pt < 0 || pt > 100 ||
        Math.abs(rpTotal - (rpProd + rpTU)) > 0.01 || Math.abs(rpProd - ((pp/100)*maxProd)) > 0.01 || Math.abs(rpTU - ((pt/100)*maxTU)) > 0.01) {
      invalidArithmetic.push(String(r[C.NAMA] || id || ('baris ' + item.rowIndex)));
    }
  });
  var status = String(first[C.STATUS_REKAP] || '').trim(), structuralCritical = Object.keys(batchIds).length !== 1 || Object.keys(statuses).length !== 1 || duplicateIds.length || invalidArithmetic.length;
  var delta = null, changedCount = null, pendingRelevant = null, pendingPhl = null, deepError = '';
  var meta = metadataBatchTunjanganDariRow_(first);
  var frozenFinal = status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN;
  if (!structuralCritical && !frozenFinal) {
    try {
      var fresh = hitungRekapTunjanganPeriode_(latest, meta.tanggalMulaiPeriode, meta.tanggalAkhirPeriode, meta.jamCutoff);
      var diff = bandingkanSnapshotDenganHitungUlangTunjangan_(batch, fresh);
      delta = Number(diff.delta || 0); changedCount = Number(diff.changedCount || 0);
      var pending = cekLaporanMenungguReviewPeriodeTunjangan_(latest, meta);
      pendingRelevant = Number(pending.count || 0); pendingPhl = Number(pending.ignoredPhlCount || 0);
    } catch (e) { deepError = String(e && e.message ? e.message : e); }
  }
  var critical = structuralCritical || (!!deepError) || (!frozenFinal && ((delta || 0) !== 0 || (changedCount || 0) > 0));
  var warn = residual.length > 0 || (!frozenFinal && (pendingRelevant || 0) > 0) || (!frozenFinal && (pendingPhl || 0) > 0);
  var samples = duplicateIds.concat(invalidArithmetic, residual.slice(0,4)); if (deepError) samples.push(deepError);
  return ohicCheckV10_('allowance_batch','PERIOD_ALLOWANCE', critical ? 'CRITICAL' : (warn ? 'WARN' : 'PASS'),
    'Batch tunjangan aktif terbaru',
    critical ? 'Batch aktif terbaru memiliki ketidaksesuaian yang perlu diperiksa sebelum transisi workflow berikutnya.' : (warn ? 'Batch konsisten; ada catatan administratif yang perlu ditindaklanjuti.' : (frozenFinal ? 'Batch aktif terbaru sudah berada pada tahap snapshot beku dan struktur dasarnya konsisten.' : 'Batch aktif terbaru konsisten dengan kalkulasi segar.')),
    { period: latest, status: status, batchId: String(first[C.BATCH_ID] || ''), employees: rows.length, totalNominal: Math.round(total),
      activeBatchIds: Object.keys(batchIds).length, duplicateEmployees: duplicateIds.length, arithmeticIssues: invalidArithmetic.length,
      snapshotDelta: delta, changedEmployees: changedCount, pendingRelevant: pendingRelevant, pendingPHL: pendingPhl,
      residualMetadataRows: residual.length, frozenSnapshot: frozenFinal },
    samples,
    critical ? 'Jangan lanjutkan workflow tunjangan sebelum perbedaan batch/snapshot diperiksa.' : (residual.length ? 'Pisahkan pembersihan metadata batch lama sebagai pekerjaan audit tersendiri; jangan menghapusnya dari halaman ini.' : ''));
}


function ohicBackupRecoveryCheckV10_() {
  if (typeof bdrV10BuildHealthCheck_ !== 'function') {
    return ohicCheckV10_('backup_recovery','BACKUP_RECOVERY','CRITICAL',
      'Cadangan & pemulihan',
      'Modul Backup & Disaster Recovery tidak tersedia pada deployment aktif.',
      { dependencyAvailable:false, backupStale:true, triggerInvalid:true },
      ['BackupDisasterRecoveryV10.gs / helper bdrV10BuildHealthCheck_ tidak tersedia.'],
      'Gunakan deployment rollback atau pasang modul BDR lengkap sebelum mengandalkan pemulihan.');
  }
  try { return bdrV10BuildHealthCheck_(); }
  catch (e) {
    return ohicCheckV10_('backup_recovery','BACKUP_RECOVERY','CRITICAL',
      'Cadangan & pemulihan',
      'Status Backup & Disaster Recovery gagal diperiksa secara aman.',
      { dependencyAvailable:true, healthReadFailed:true, backupStale:true },
      [String(e && e.message ? e.message : e)],
      'Buka Cadangan & Pemulihan dan periksa konfigurasi folder, trigger, serta recovery point.');
  }
}

function ambilOperationalHealthCenterV10(token) {
  var started = Date.now();
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Hanya Lurah/Carik.' };
    var ss = getSS_();
    var checks = [];
    checks.push(ohicGovernanceCheckV10_());
    checks.push(ohicRequiredSheetsCheckV10_(ss));
    checks.push(ohicEmployeeCheckV10_(ss));
    checks.push(ohicTariffCheckV10_(ss));
    var reportDiag = ohicReportDiagnosticsV10_(ss);
    checks.push(reportDiag.check);
    checks.push(ohicReviewQueueCheckV10_(reportDiag));
    checks.push(ohicIndexCheckV10_(ss, reportDiag));
    checks.push(ohicPeriodCheckV10_());
    checks.push(ohicAllowanceCheckV10_(ss));
    checks.push(ohicBackupRecoveryCheckV10_());

    var counts = { PASS:0, WARN:0, CRITICAL:0, INFO:0 }, maxRank = 0;
    checks.forEach(function (c) { var s=String(c.status || 'PASS').toUpperCase(); counts[s]=(counts[s]||0)+1; maxRank=Math.max(maxRank,ohicStatusRankV10_(s)); });
    var overall = maxRank >= 3 ? 'KRITIS' : (maxRank >= 2 ? 'PERLU_PERHATIAN' : 'SEHAT');
    return {
      sukses:true, versi:OPERATIONAL_HEALTH_V10_VERSION_, appVersion:String(APP_VERSION || ''), mode:'BACA_SAJA',
      diperiksaPada:ohicFormatNowV10_(new Date()), statusKeseluruhan:overall,
      ringkasan:{ pass:counts.PASS||0, warning:counts.WARN||0, critical:counts.CRITICAL||0, info:counts.INFO||0,
        totalChecks:checks.length, durasiServerMs:Date.now()-started },
      checks:checks,
      kebijakan:{ spreadsheetDiubah:false, statusReviewDiubah:false, poinDiubah:false, workflowTunjanganDiubah:false,
        cacheDapatDibaca:true, dataSensitifDitampilkan:false },
      pesan:'Operational Health & Integrity Center melakukan pemeriksaan baca-saja; hasil bukan tindakan koreksi otomatis.'
    };
  } catch (e) {
    return handleError('ambilOperationalHealthCenterV10', e, { sukses:false, pesan:'Pemeriksaan kesehatan sistem gagal diselesaikan.' });
  }
}
