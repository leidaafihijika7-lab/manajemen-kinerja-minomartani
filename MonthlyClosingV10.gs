// ============================================================
// MONTHLY CLOSING v1.0 — READINESS-FIRST ORCHESTRATOR
// Kandidat APP_VERSION 2026.10.02.02
//
// Prinsip:
// - tidak membuat mesin review/tunjangan baru;
// - membaca status dari sumber kebenaran yang sudah ada;
// - penutupan resmi tetap dilakukan melalui simpanTutupPeriodeLaporan();
// - halaman dibuka dalam mode baca-saja; write hanya saat tombol Tutup Periode dikonfirmasi;
// - tidak membuat/mengubah schema Spreadsheet.
// ============================================================

var MONTHLY_CLOSING_V10_VERSION_ = 'MC-v1.0-RC1-2026.10.02.02';

function mcV10Check_(id, status, title, headline, metrics, recommendation) {
  return {
    id: String(id || ''),
    status: String(status || 'PASS').toUpperCase(),
    title: String(title || ''),
    headline: String(headline || ''),
    metrics: metrics && typeof metrics === 'object' ? metrics : {},
    recommendation: String(recommendation || '')
  };
}

function mcV10Group_(jabatan) {
  var j = String(jabatan || '').toLowerCase();
  if (j.indexOf('phl') !== -1 || j.indexOf('harian lepas') !== -1) return 'PHL';
  if (j.indexOf('dukuh') !== -1) return 'DUKUH';
  if (j.indexOf('staf') !== -1) return 'STAF';
  return 'PAMONG';
}

function mcV10StatusRank_(status) {
  var s = String(status || '');
  if (s === TUNJANGAN_STATUS.SUDAH_DICAIRKAN) return 6;
  if (s === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA) return 5;
  if (s === TUNJANGAN_STATUS.DISETUJUI_LURAH) return 4;
  if (s === TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH) return 3;
  if (s === TUNJANGAN_STATUS.DIKUNCI_CARIK) return 2;
  if (s === TUNJANGAN_STATUS.DRAFT || s === TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH) return 1;
  return 0;
}

function mcV10DefaultPeriode_() {
  var now = new Date();
  var aktif = periodeKinerjaAktifUntukLaporanWajibV34_(now);
  var locks = daftarTutupPeriodeLaporanResmiV36_() || [];
  var latestClosed = '';
  for (var i = 0; i < locks.length; i++) {
    if (!locks[i] || !locks[i].periode || !(locks[i].cutoffDate instanceof Date)) continue;
    if (locks[i].cutoffDate.getTime() > now.getTime()) continue;
    if (!latestClosed || String(locks[i].periode) > latestClosed) latestClosed = String(locks[i].periode);
  }
  return latestClosed || periodeKeyOffset_(aktif, -1) || aktif;
}

function mcV10ReportPeriod_(periode) {
  var p = normalizePeriode_(periode || '');
  var data = getRekapKinerjaValuesReadOnly_();
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var resolver = typeof buatResolverPeriodeResmiAdminV2A2_ === 'function'
    ? buatResolverPeriodeResmiAdminV2A2_()
    : function (d) { return periodePelaporanResmiDariTanggalV36_(d); };
  var out = {
    total: 0, approved: 0, rejected: 0, pending: 0, other: 0,
    pendingByGroup: { PAMONG:0, DUKUH:0, STAF:0, PHL:0 },
    latestReportAt: '', latestReportMs: 0, earliestReportAt: '', earliestReportMs: 0,
    pendingSamples: []
  };

  for (var i = 1; i < data.length; i++) {
    var r = data[i] || [];
    var d = parseTanggal(r[C.TANGGAL_LAPORAN]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) continue;
    if (resolver(d) !== p) continue;
    out.total++;
    if (!out.earliestReportMs || d.getTime() < out.earliestReportMs) out.earliestReportMs = d.getTime();
    if (d.getTime() > out.latestReportMs) out.latestReportMs = d.getTime();
    var status = String(r[C.STATUS_REVIEW] || '').trim();
    if (isStatusApproved_(status)) out.approved++;
    else if (status === 'Ditolak') out.rejected++;
    else if (isPendingReviewStatus_(status)) {
      out.pending++;
      var g = mcV10Group_(r[C.JABATAN]);
      out.pendingByGroup[g] = (out.pendingByGroup[g] || 0) + 1;
      if (out.pendingSamples.length < 5) {
        out.pendingSamples.push({
          idLaporan: String(r[C.ID_LAPORAN] || ''),
          nama: String(r[C.NAMA] || ''),
          jabatan: String(r[C.JABATAN] || ''),
          status: status,
          tanggal: formatTanggalJamClient_(d)
        });
      }
    } else out.other++;
  }

  if (out.latestReportMs) out.latestReportAt = formatTanggalJamClient_(new Date(out.latestReportMs));
  if (out.earliestReportMs) out.earliestReportAt = formatTanggalJamClient_(new Date(out.earliestReportMs));
  return out;
}

function mcV10PeriodState_(periode) {
  var p = normalizePeriode_(periode || '');
  var now = new Date();
  var lock = bacaTutupPeriodeLaporan_(p);
  var closed = !!(lock && lock.cutoffDate instanceof Date && !isNaN(lock.cutoffDate.getTime()) && lock.cutoffDate.getTime() <= now.getTime());
  var scheduled = !!(lock && lock.cutoffDate instanceof Date && !isNaN(lock.cutoffDate.getTime()) && lock.cutoffDate.getTime() > now.getTime());
  return {
    periode: p,
    closed: closed,
    scheduled: scheduled,
    status: closed ? 'DITUTUP' : (scheduled ? 'TERJADWAL' : 'TERBUKA'),
    cutoffAt: lock && lock.cutoffDate ? formatTanggalJamISO_(lock.cutoffDate) : '',
    cutoffLabel: lock && lock.cutoffDate ? formatTutupPeriodeClient_(lock.cutoffDate) : '',
    alasan: lock ? String(lock.alasan || '') : '',
    updatedAt: lock ? String(lock.updatedAt || '') : '',
    updatedBy: lock ? String(lock.updatedBy || '') : ''
  };
}

function mcV10Allowance_(periode) {
  var p = normalizePeriode_(periode || '');
  var batch = getBatchAktifTunjangan_(p);
  if (!batch || !batch.rows || !batch.rows.length) {
    return {
      exists:false, valid:true, periode:p, status:'BELUM ADA BATCH', rank:0, batchId:'', employees:0,
      totalNominal:0, arithmeticIssues:0, duplicateEmployees:0, activeBatchIds:0, activeStatuses:0,
      snapshotDelta:null, changedEmployees:null, pendingRelevant:null, pendingPHL:null,
      frozenSnapshot:false, blockers:[], warnings:[]
    };
  }

  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  var ids = {}, batchIds = {}, statuses = {}, duplicate = [], arithmetic = [], total = 0;
  for (var i = 0; i < batch.rows.length; i++) {
    var r = batch.rows[i].values || [];
    var id = normalizeId_(r[C.ID_USER]);
    var bid = String(r[C.BATCH_ID] || '').trim();
    var st = String(r[C.STATUS_REKAP] || '').trim();
    if (id) { if (ids[id]) duplicate.push(String(r[C.NAMA] || id)); ids[id] = true; }
    if (bid) batchIds[bid] = true;
    if (st) statuses[st] = true;
    var maxProd=Number(r[C.MAX_PROD]), maxTU=Number(r[C.MAX_TU]), pp=Number(r[C.PERSEN_PROD]), pt=Number(r[C.PERSEN_TU]);
    var rpProd=Number(r[C.RP_PROD]), rpTU=Number(r[C.RP_TU]), rpTotal=Number(r[C.RP_TOTAL]);
    total += isFinite(rpTotal) ? rpTotal : 0;
    if (![maxProd,maxTU,pp,pt,rpProd,rpTU,rpTotal].every(isFinite) || pp < 0 || pp > 100 || pt < 0 || pt > 100 ||
        Math.abs(rpTotal - (rpProd + rpTU)) > 0.01 ||
        Math.abs(rpProd - ((pp/100)*maxProd)) > 0.01 || Math.abs(rpTU - ((pt/100)*maxTU)) > 0.01) {
      arithmetic.push(String(r[C.NAMA] || id || ('baris ' + batch.rows[i].rowIndex)));
    }
  }

  var first = batch.rows[0].values || [];
  var status = String(first[C.STATUS_REKAP] || '').trim();
  var frozen = status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN;
  var blockers = [], warnings = [];
  if (Object.keys(batchIds).length !== 1) blockers.push('BATCH_ID_TIDAK_KONSISTEN');
  if (Object.keys(statuses).length !== 1) blockers.push('STATUS_BATCH_TIDAK_KONSISTEN');
  if (duplicate.length) blockers.push('PEGAWAI_DUPLIKAT');
  if (arithmetic.length) blockers.push('ARITMETIKA_TIDAK_KONSISTEN');

  var delta = null, changed = null, pendingRelevant = null, pendingPHL = null;
  if (!blockers.length && !frozen) {
    try {
      var meta = metadataBatchTunjanganDariRow_(first);
      var fresh = hitungRekapTunjanganPeriode_(p, meta.tanggalMulaiPeriode, meta.tanggalAkhirPeriode, meta.jamCutoff);
      var diff = bandingkanSnapshotDenganHitungUlangTunjangan_(batch, fresh);
      delta = Number(diff.delta || 0);
      changed = Number(diff.changedCount || 0);
      if (Math.abs(delta) > 0.001 || changed > 0) blockers.push('SNAPSHOT_BERBEDA_DENGAN_HITUNG_ULANG');
      var pending = cekLaporanMenungguReviewPeriodeTunjangan_(p, meta);
      pendingRelevant = Number(pending.count || 0);
      pendingPHL = Number(pending.ignoredPhlCount || 0);
      if (pendingRelevant > 0) blockers.push('PENDING_REVIEW_PENGHAMBAT_TUNJANGAN');
      if (pendingPHL > 0) warnings.push('PENDING_PHL_ADMINISTRATIF');
    } catch (e) {
      blockers.push('VALIDASI_BATCH_GAGAL:' + String(e && e.message ? e.message : e));
    }
  }

  return {
    exists:true, valid:blockers.length === 0, periode:p, status:status, rank:mcV10StatusRank_(status),
    batchId:String(first[C.BATCH_ID] || ''), employees:batch.rows.length, totalNominal:Math.round(total),
    arithmeticIssues:arithmetic.length, duplicateEmployees:duplicate.length, activeBatchIds:Object.keys(batchIds).length,
    activeStatuses:Object.keys(statuses).length, snapshotDelta:delta, changedEmployees:changed,
    pendingRelevant:pendingRelevant, pendingPHL:pendingPHL, frozenSnapshot:frozen,
    blockers:blockers, warnings:warnings
  };
}

function bangunMonthlyClosingV10_(periode) {
  var started = Date.now();
  var p = normalizePeriode_(periode || mcV10DefaultPeriode_());
  if (!p) throw new Error('Periode Monthly Closing tidak valid.');
  var ss = getSS_();
  var activePeriod = periodeKinerjaAktifUntukLaporanWajibV34_(new Date());
  var report = mcV10ReportPeriod_(p);
  var periodState = mcV10PeriodState_(p);

  var reportDiag = ohicReportDiagnosticsV10_(ss);
  var indexCheck = ohicIndexCheckV10_(ss, reportDiag);
  var tariffCheck = ohicTariffCheckV10_(ss);
  var allowance = mcV10Allowance_(p);

  var reportIntegrityOk = reportDiag && reportDiag.check && String(reportDiag.check.status) !== 'CRITICAL';
  var indexStatus = String(indexCheck && indexCheck.status || 'CRITICAL');
  var indexOk = indexStatus === 'PASS' || indexStatus === 'INFO';
  var reviewOk = report.pending === 0;
  var tariffOk = tariffCheck && String(tariffCheck.status) === 'PASS';
  var isActiveTarget = p === activePeriod;
  var canClose = !periodState.closed && !periodState.scheduled && isActiveTarget && reportIntegrityOk && indexOk && reviewOk;

  var checks = [];
  checks.push(mcV10Check_(
    'review', reviewOk ? 'PASS' : 'BLOCKED', 'Review laporan periode',
    reviewOk ? 'Tidak ada laporan periode ini yang masih menunggu keputusan.' : 'Masih ada ' + report.pending + ' laporan yang harus diselesaikan sebelum periode ditutup.',
    { total:report.total, approved:report.approved, rejected:report.rejected, pending:report.pending,
      pamong:report.pendingByGroup.PAMONG, dukuh:report.pendingByGroup.DUKUH, staf:report.pendingByGroup.STAF, phl:report.pendingByGroup.PHL },
    reviewOk ? '' : 'Selesaikan antrean melalui Pusat Review. PHL tetap harus direview secara administratif.'
  ));
  checks.push(mcV10Check_(
    'integrity', (reportIntegrityOk && indexOk) ? 'PASS' : 'BLOCKED', 'Integritas laporan & index',
    (reportIntegrityOk && indexOk) ? 'Rekap_Kinerja dan Index_Laporan memenuhi syarat penutupan periode.' : 'Integritas laporan/index belum memenuhi syarat penutupan.',
    { reportIntegrity:String(reportDiag.check.status || ''), indexStatus:indexStatus,
      missingInIndex:Number(indexCheck.metrics && indexCheck.metrics.missingInIndex || 0), orphanIndex:Number(indexCheck.metrics && indexCheck.metrics.orphanIndex || 0),
      queueNeedsSync:Number(indexCheck.metrics && indexCheck.metrics.queueNeedsSync || 0), queueStale:Number(indexCheck.metrics && indexCheck.metrics.queueStale || 0) },
    (reportIntegrityOk && indexOk) ? '' : 'Periksa Kesehatan Sistem dan selesaikan masalah index sebelum menutup periode.'
  ));
  checks.push(mcV10Check_(
    'period', periodState.closed ? 'PASS' : (canClose ? 'READY' : (periodState.scheduled ? 'WARN' : 'INFO')), 'Penutupan periode resmi',
    periodState.closed ? 'Periode sudah ditutup resmi.' : (periodState.scheduled ? 'Penutupan periode sudah dijadwalkan.' : (canClose ? 'Seluruh syarat inti terpenuhi; periode siap ditutup.' : 'Periode belum dapat ditutup dari Monthly Closing.')),
    { status:periodState.status, activePeriod:activePeriod, targetIsActive:isActiveTarget, cutoff:periodState.cutoffLabel || '-' },
    periodState.closed ? '' : (!isActiveTarget ? 'Hanya periode aktif resmi yang dapat ditutup. Periode lama tetap ditampilkan untuk monitoring workflow.' : '')
  ));
  checks.push(mcV10Check_(
    'tariff', tariffOk ? 'PASS' : (String(tariffCheck.status) === 'CRITICAL' ? 'BLOCKED' : 'WARN'), 'Master tarif tunjangan',
    tariffOk ? 'Master tarif siap dipakai untuk finalisasi tunjangan.' : String(tariffCheck.headline || 'Master tarif perlu diperiksa.'),
    tariffCheck.metrics || {},
    tariffOk ? '' : String(tariffCheck.recommendation || 'Periksa Master_Tunjangan sebelum finalisasi tunjangan.')
  ));

  var allowanceStatus = allowance.exists ? (allowance.valid ? 'PASS' : 'BLOCKED') : 'INFO';
  checks.push(mcV10Check_(
    'allowance', allowanceStatus, 'Batch tunjangan',
    !allowance.exists ? 'Belum ada batch tunjangan aktif untuk periode ini.' : (allowance.valid ? 'Batch aktif konsisten. Status: ' + allowance.status + '.' : 'Batch tunjangan memiliki blocker dan tidak boleh dilanjutkan.'),
    { status:allowance.status, batchId:allowance.batchId || '-', employees:allowance.employees, totalNominal:allowance.totalNominal,
      snapshotDelta:allowance.snapshotDelta, changedEmployees:allowance.changedEmployees, pendingRelevant:allowance.pendingRelevant,
      pendingPHL:allowance.pendingPHL, frozenSnapshot:allowance.frozenSnapshot },
    allowance.valid ? '' : allowance.blockers.join(', ')
  ));

  var lurahApproved = allowance.exists && allowance.rank >= 4;
  var forwarded = allowance.exists && allowance.rank >= 5;
  var paid = allowance.exists && allowance.rank >= 6;
  checks.push(mcV10Check_(
    'payment', paid ? 'PASS' : 'INFO', 'Persetujuan & pencairan',
    paid ? 'Batch sudah dicairkan dan snapshot final terkunci.' : (!allowance.exists ? 'Workflow tunjangan belum dimulai.' : 'Workflow tunjangan masih berjalan pada tahap ' + allowance.status + '.'),
    { approvedByLurah:lurahApproved, forwardedToTreasurer:forwarded, paid:paid, status:allowance.status },
    paid ? '' : 'Lanjutkan workflow melalui menu Tunjangan sesuai kewenangan Carik, Lurah, dan Bendahara.'
  ));

  var archiveReady = periodState.closed && reviewOk && reportIntegrityOk && indexOk && tariffOk && allowance.valid && paid;
  checks.push(mcV10Check_(
    'archive', archiveReady ? 'READY' : 'INFO', 'Arsip periode',
    archiveReady ? 'Periode sudah memenuhi prasyarat untuk paket Arsip Bulanan.' : 'Arsip final belum siap karena masih ada tahap Monthly Closing yang belum selesai.',
    { ready:archiveReady, autoArchiveAvailable:false },
    archiveReady ? 'Monthly Closing v1.0 menandai kesiapan arsip. Pembuatan paket arsip otomatis disiapkan sebagai fase berikutnya.' : ''
  ));

  // Pisahkan blocker penutupan periode resmi dari blocker workflow bulanan.
  // Master tarif / batch tunjangan tidak boleh mengubah aturan kapan periode laporan boleh ditutup,
  // tetapi tetap harus terlihat sebagai penghambat penyelesaian Monthly Closing secara keseluruhan.
  var officialCloseBlockers = [];
  if (!reviewOk) officialCloseBlockers.push('REVIEW_PENDING');
  if (!reportIntegrityOk) officialCloseBlockers.push('REPORT_INTEGRITY');
  if (!indexOk) officialCloseBlockers.push('INDEX_SYNC');
  if (!isActiveTarget && !periodState.closed) officialCloseBlockers.push('TARGET_BUKAN_PERIODE_AKTIF');

  var monthlyBlockers = officialCloseBlockers.slice();
  if (!tariffOk) monthlyBlockers.push('MASTER_TARIF');
  if (allowance.exists && !allowance.valid) monthlyBlockers.push('BATCH_TUNJANGAN');
  var blockers = monthlyBlockers.filter(function (v, i, a) { return a.indexOf(v) === i; });
  var overall = archiveReady ? 'SELESAI' : (blockers.length ? 'TERHAMBAT' : 'BERJALAN');

  return {
    sukses:true,
    versi:MONTHLY_CLOSING_V10_VERSION_,
    appVersion:String(APP_VERSION || ''),
    mode:'READINESS_FIRST',
    periode:p,
    labelPeriode:labelPembayaranPeriode_(p),
    activePeriod:activePeriod,
    defaultPeriod:mcV10DefaultPeriode_(),
    statusKeseluruhan:overall,
    canCloseOfficial:canClose,
    monthlyComplete:archiveReady,
    blockers:blockers,
    officialCloseBlockers:officialCloseBlockers,
    monthlyBlockers:blockers.slice(),
    report:report,
    period:periodState,
    allowance:allowance,
    workflow:{ lurahApproved:lurahApproved, forwardedToTreasurer:forwarded, paid:paid, archiveReady:archiveReady },
    checks:checks,
    checkedAt:formatTanggalJamClient_(new Date()),
    serverMs:Date.now()-started,
    policy:{ readOnlyOnLoad:true, schemaChanged:false, reviewEngineChanged:false, allowanceEngineChanged:false, autoArchiveAvailable:false }
  };
}

function ambilMonthlyClosingV10(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Monthly Closing hanya untuk Lurah/Carik.' };
    return bangunMonthlyClosingV10_(periode);
  } catch (e) {
    return handleError('ambilMonthlyClosingV10', e, { sukses:false, pesan:'Monthly Closing gagal dimuat.' });
  }
}

function tutupPeriodeMonthlyClosingV10(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Hanya Lurah/Carik yang dapat menutup periode.' };
    payload = payload || {};
    var p = normalizePeriode_(payload.periode || '');
    if (!p) return { sukses:false, kode:'PERIODE_INVALID', pesan:'Periode tidak valid.' };

    var before = bangunMonthlyClosingV10_(p);
    if (before.period && before.period.closed) {
      return { sukses:true, alreadyClosed:true, pesan:'Periode sudah ditutup resmi.', snapshot:before };
    }
    if (!before.canCloseOfficial) {
      return { sukses:false, kode:'READINESS_BLOCK', pesan:'Periode belum memenuhi syarat penutupan resmi.', blockers:before.officialCloseBlockers || before.blockers || [], snapshot:before };
    }

    var tanggal = String(payload.tanggalTutup || '').trim();
    var jam = String(payload.jamTutup || '').trim();
    var alasan = String(payload.alasan || '').trim();
    if (!tanggal || !jam) return { sukses:false, kode:'CUTOFF_WAJIB', pesan:'Tanggal dan jam penutupan wajib diisi.' };
    if (alasan.length < 5) return { sukses:false, kode:'ALASAN_WAJIB', pesan:'Alasan penutupan minimal 5 karakter.' };
    if (alasan.length > 500) return { sukses:false, kode:'ALASAN_TERLALU_PANJANG', pesan:'Alasan penutupan maksimal 500 karakter.' };

    var cutoff = parseTanggalJamTutupPeriode_(tanggal, jam);
    if (!(cutoff instanceof Date) || isNaN(cutoff.getTime())) return { sukses:false, kode:'CUTOFF_INVALID', pesan:'Tanggal/jam penutupan tidak valid.' };
    if (cutoff.getTime() > new Date().getTime() + 60000) return { sukses:false, kode:'CUTOFF_MASA_DEPAN', pesan:'Monthly Closing hanya dapat menutup periode pada waktu sekarang atau waktu yang sudah lewat.' };
    if (before.report && before.report.latestReportMs && cutoff.getTime() < Number(before.report.latestReportMs)) {
      return { sukses:false, kode:'CUTOFF_SEBELUM_LAPORAN_TERAKHIR', pesan:'Waktu penutupan tidak boleh lebih awal dari laporan terakhir periode (' + before.report.latestReportAt + ').' };
    }

    var result = simpanTutupPeriodeLaporan({
      periode:p,
      tanggalTutup:tanggal,
      jamTutup:jam,
      alasan:sanitizeForSheet_(alasan)
    }, token);
    if (!result || result.sukses !== true) return result || { sukses:false, pesan:'Penutupan periode gagal.' };

    return {
      sukses:true,
      pesan:result.pesan || 'Periode berhasil ditutup.',
      periode:p,
      closingResult:result,
      snapshot:bangunMonthlyClosingV10_(p),
      reviewEngineChanged:false,
      allowanceEngineChanged:false,
      schemaChanged:false
    };
  } catch (e) {
    return handleError('tutupPeriodeMonthlyClosingV10', e, { sukses:false, pesan:'Gagal menutup periode dari Monthly Closing.' });
  }
}

function validasiMonthlyClosingV10() {
  var checks = [];
  function add_(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail || '') }); }
  add_('APP_VERSION', String(APP_VERSION || '') === '2026.10.02.02', String(APP_VERSION || ''));
  add_('READ_ENDPOINT', typeof ambilMonthlyClosingV10 === 'function', typeof ambilMonthlyClosingV10);
  add_('WRITE_WRAPPER', typeof tutupPeriodeMonthlyClosingV10 === 'function', typeof tutupPeriodeMonthlyClosingV10);
  add_('OFFICIAL_CLOSE_ENGINE', typeof simpanTutupPeriodeLaporan === 'function', typeof simpanTutupPeriodeLaporan);
  add_('PERIOD_RESOLVER', typeof periodeKinerjaAktifUntukLaporanWajibV34_ === 'function', typeof periodeKinerjaAktifUntukLaporanWajibV34_);
  add_('REPORT_DIAGNOSTICS', typeof ohicReportDiagnosticsV10_ === 'function', typeof ohicReportDiagnosticsV10_);
  add_('INDEX_DIAGNOSTICS', typeof ohicIndexCheckV10_ === 'function', typeof ohicIndexCheckV10_);
  add_('TARIFF_DIAGNOSTICS', typeof ohicTariffCheckV10_ === 'function', typeof ohicTariffCheckV10_);
  add_('ALLOWANCE_BATCH_READER', typeof getBatchAktifTunjangan_ === 'function', typeof getBatchAktifTunjangan_);
  add_('NO_AUTO_ARCHIVE_V10', true, 'Paket arsip otomatis tidak ditulis oleh v1.0.');
  add_('NO_SCHEMA_MUTATION', true, 'Monthly Closing tidak membuat sheet/kolom baru.');
  add_('READINESS_FIRST', true, 'Load halaman tidak menjalankan write endpoint.');
  var failed = checks.filter(function (c) { return !c.lulus; });
  var out = {
    sukses:failed.length === 0, valid:failed.length === 0, versi:MONTHLY_CLOSING_V10_VERSION_, appVersion:String(APP_VERSION || ''),
    lulus:checks.length - failed.length, gagal:failed.length, total:checks.length, checks:checks,
    targetDipanggil:false, dataDiubah:false, poinDiubah:false, statusReviewDiubah:false, schemaDiubah:false
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

// ===== END MONTHLY CLOSING v1.0 =====
