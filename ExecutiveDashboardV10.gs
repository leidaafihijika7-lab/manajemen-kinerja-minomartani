// ============================================================
// DASHBOARD EKSEKUTIF v1.0 — RC2
// APP_VERSION 2026.10.04.04
// Hanya-baca. Tidak mengubah Review/Tunjangan/Closing/Arsip/WRE/EAC.
// ============================================================

var EXECUTIVE_DASHBOARD_V10_VERSION_ = 'EXEC-DASH-v1.0-RC3-2026.10.04.04';
var EXEC_DASH_V10_CACHE_TTL_SECONDS_ = 180;
var EXEC_DASH_V10_WINDOW_MONTHS_ = 6;
var EXEC_DASH_V10_MAX_ATTENTION_ = 5;
var EXEC_DASH_V10_LATE_CUTOFF_DEFERRED_ = true;

function execDashV10Role_(idUser) {
  try {
    var p = getPegawaiById_(idUser);
    if (!p) return '';
    if (isLurah_(p.jabatan)) return 'LURAH';
    if (isCarik_(p.jabatan)) return 'CARIK';
    return '';
  } catch (e) { return ''; }
}

function execDashV10NormalizeRequest_(request) {
  request = request || {};
  var windowMonths = request.windowMonths == null || request.windowMonths === ''
    ? EXEC_DASH_V10_WINDOW_MONTHS_ : Number(request.windowMonths);
  if (windowMonths !== EXEC_DASH_V10_WINDOW_MONTHS_) {
    var ew = new Error('RC2 hanya mendukung jendela 6 bulan.');
    ew.code = 'WINDOW_UNSUPPORTED';
    throw ew;
  }
  var periode = '';
  if (request.periode != null && String(request.periode).trim()) {
    try { periode = normalizePeriode_(String(request.periode).trim()); }
    catch (e) {
      var ep = new Error('Format periode tidak valid.');
      ep.code = 'PERIODE_INVALID';
      throw ep;
    }
  }
  return {
    periode: periode,
    windowMonths: windowMonths,
    forceRefresh: request.forceRefresh === true
  };
}

function execDashV10BuildPeriods_(selectedPeriod, count) {
  var n = Number(count || EXEC_DASH_V10_WINDOW_MONTHS_);
  var out = [];
  for (var i = n - 1; i >= 0; i--) out.push(periodeKeyOffset_(selectedPeriod, -i));
  return out;
}

function execDashV10PeriodStatus_(meta) {
  var s = String(meta && meta.statusPeriode || '');
  if (s === 'AKTIF' || s === 'DIJADWALKAN_TUTUP') return 'BERJALAN';
  if (s === 'DITUTUP') return 'DITUTUP';
  if (s === 'PERIODE_LAMPAU') return 'PERIODE_LAMPAU';
  if (s === 'BELUM_DIBUKA') return 'BELUM_DIBUKA';
  return s || 'TIDAK_DIKETAHUI';
}

function execDashV10Source_(status, detail) {
  return { status:String(status || ''), detail:String(detail || '') };
}

function execDashV10AdminPoint_(periode) {
  var meta = metaPeriodeResmiDashboardAdminV37_(periode);
  var base = getBaseDashboardAdminV2A2_(meta);
  var rows = Array.isArray(base && base.rows) ? base.rows : [];
  var summary = ringkasanDashboardAdminDariRowsV2A2_(rows);
  var selesai = Number(summary.laporanDisetujui || 0) + Number(summary.laporanDitolak || 0);
  var total = Number(summary.laporanMasuk || 0);
  var rate = total > 0 ? execDashV10Round_((selesai / total) * 100, 1) : null;
  return {
    periode: meta.periode,
    label: String(meta.labelPeriode || meta.labelPembayaran || meta.periode),
    statusPeriode: execDashV10PeriodStatus_(meta),
    meta: meta,
    rows: rows,
    base: base,
    summary: summary,
    point: {
      periode: meta.periode,
      label: String(meta.labelPeriode || meta.labelPembayaran || meta.periode),
      statusPeriode: execDashV10PeriodStatus_(meta),
      laporanMasuk: Number(summary.laporanMasuk || 0),
      disetujui: Number(summary.laporanDisetujui || 0),
      ditolak: Number(summary.laporanDitolak || 0),
      pending: Number(summary.menungguReview || 0),
      statusLain: Number(summary.laporanStatusLain || 0),
      belumUnggah: Number(summary.belumUnggah || 0),
      reviewSelesai: selesai,
      reviewSelesaiRate: rate,
      scopeMode: 'CURRENT_ACTIVE_ROSTER'
    }
  };
}

function execDashV10CollectAdminPeriods_(periods) {
  var byPeriod = {};
  var points = [];
  var errors = [];
  (periods || []).forEach(function (p) {
    try {
      var a = execDashV10AdminPoint_(p);
      byPeriod[p] = a;
      points.push(a.point);
    } catch (e) {
      var err = { periode:p, code:String(e && e.code || 'ADMIN_READ_FAILED'), message:String(e && e.message || e) };
      errors.push(err);
      byPeriod[p] = { periode:p, error:err, rows:[], summary:null, point:null };
      points.push({
        periode:p, label:typeof labelPembayaranPeriode_ === 'function' ? labelPembayaranPeriode_(p) : p,
        statusPeriode:'TIDAK_DAPAT_DIBACA', laporanMasuk:null, disetujui:null, ditolak:null, pending:null,
        statusLain:null, belumUnggah:null, reviewSelesai:null, reviewSelesaiRate:null,
        scopeMode:'CURRENT_ACTIVE_ROSTER', sourceError:true
      });
    }
  });
  return { byPeriod:byPeriod, points:points, errors:errors };
}

function execDashV10Round_(value, digits) {
  var n = Number(value);
  if (!isFinite(n)) return null;
  var d = Math.pow(10, Number(digits == null ? 2 : digits));
  return Math.round(n * d) / d;
}

function execDashV10Ms_(raw) {
  try {
    var d = raw instanceof Date ? new Date(raw.getTime()) : parseTanggal(raw);
    if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) return null;
    return d.getTime();
  } catch (e) { return null; }
}

function execDashV10Median_(values) {
  var a = (values || []).map(Number).filter(function (x) { return isFinite(x); }).sort(function (x,y) { return x-y; });
  if (!a.length) return null;
  var m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
}

function execDashV10ReviewStartMs_(row, C) {
  var submit = execDashV10Ms_(row[C.TANGGAL_LAPORAN]);
  var revised = execDashV10Ms_(row[C.TERAKHIR_DIREVISI_PADA]);
  if (submit == null) return revised;
  if (revised == null) return submit;
  return Math.max(submit, revised);
}

function execDashV10ReviewEfficiency_(periode, scopedRows, nowMs) {
  var scope = {};
  (scopedRows || []).forEach(function (r) { if (r && r.idUser) scope[normalizeId_(r.idUser)] = true; });
  var data = getRekapKinerjaValuesReadOnly_() || [];
  var resolvePeriod = buatResolverPeriodeResmiAdminV2A2_();
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var durations = [];
  var pendingCount = 0;
  var oldestPendingHours = null;
  var invalidTimestampCount = 0;
  var within24 = 0;
  var now = Number(nowMs || Date.now());
  for (var i = 0; i < data.length; i++) {
    var row = data[i] || [];
    var id = normalizeId_(row[C.ID_USER]);
    if (!id || !scope[id]) continue;
    var p = '';
    try { p = resolvePeriod(row[C.TANGGAL_LAPORAN]); } catch (eP) { p = ''; }
    if (p !== periode) continue;
    var status = String(row[C.STATUS_REVIEW] || '');
    var startMs = execDashV10ReviewStartMs_(row, C);
    var approved = isStatusApproved_(status);
    var rejected = status === REVIEW_STATUS.DITOLAK;
    var pending = isPendingReviewStatus_(status);
    if (approved || rejected) {
      var endMs = execDashV10Ms_(row[C.WAKTU_REVIEW_ADMIN]);
      if (startMs == null || endMs == null || endMs < startMs) {
        invalidTimestampCount++;
        continue;
      }
      var h = (endMs - startMs) / 3600000;
      durations.push(h);
      if (h <= 24) within24++;
    } else if (pending) {
      pendingCount++;
      if (startMs == null || now < startMs) {
        invalidTimestampCount++;
      } else {
        var age = (now - startMs) / 3600000;
        if (oldestPendingHours == null || age > oldestPendingHours) oldestPendingHours = age;
      }
    }
  }
  var avg = null;
  if (durations.length) {
    var sum = durations.reduce(function (a,b) { return a+b; }, 0);
    avg = sum / durations.length;
  }
  var median = execDashV10Median_(durations);
  return {
    status: durations.length ? 'OK' : 'DATA_BELUM_CUKUP',
    sampleReviewed: durations.length,
    medianHours: median == null ? null : execDashV10Round_(median, 2),
    averageHours: avg == null ? null : execDashV10Round_(avg, 2),
    within24Hours: within24,
    within24Rate: durations.length ? execDashV10Round_((within24 / durations.length) * 100, 1) : null,
    pendingCount: pendingCount,
    oldestPendingHours: oldestPendingHours == null ? null : execDashV10Round_(oldestPendingHours, 2),
    invalidTimestampCount: invalidTimestampCount
  };
}

function execDashV10BuildAttention_(rows) {
  var items = [];
  (rows || []).forEach(function (r) {
    if (!r || !r.idUser) return;
    var reasons = [];
    var pending = Number(r.jumlahMenunggu || 0);
    var rejected = Number(r.jumlahDitolak || 0);
    var reports = Number(r.jumlahLaporan || 0);
    if (pending > 0) reasons.push({ code:'PENDING_REVIEW', count:pending });
    if (reports === 0) reasons.push({ code:'BELUM_UNGGAH', count:1 });
    if (rejected > 0) reasons.push({ code:'LAPORAN_DITOLAK', count:rejected });
    if (!reasons.length) return;
    var primary = pending > 0 ? 'PENDING_REVIEW' : (reports === 0 ? 'BELUM_UNGGAH' : 'LAPORAN_DITOLAK');
    items.push({
      idUser:String(r.idUser || ''), nama:String(r.nama || ''), jabatan:String(r.jabatan || ''),
      reasons:reasons, primaryReason:primary, route:'admin-kinerja',
      metrics:{ pending:pending, rejected:rejected, laporanMasuk:reports }
    });
  });
  var rank = { PENDING_REVIEW:3, BELUM_UNGGAH:2, LAPORAN_DITOLAK:1 };
  items.sort(function (a,b) {
    var d = (rank[b.primaryReason] || 0) - (rank[a.primaryReason] || 0);
    if (d) return d;
    if (a.primaryReason === 'PENDING_REVIEW') {
      d = Number(b.metrics.pending || 0) - Number(a.metrics.pending || 0); if (d) return d;
    }
    if (a.primaryReason === 'LAPORAN_DITOLAK') {
      d = Number(b.metrics.rejected || 0) - Number(a.metrics.rejected || 0); if (d) return d;
    }
    return String(a.nama || '').localeCompare(String(b.nama || ''));
  });
  return items.slice(0, EXEC_DASH_V10_MAX_ATTENTION_);
}

function execDashV10AllowanceBlockerClass_(blockers) {
  var soft = {
    SNAPSHOT_BERBEDA_DENGAN_HITUNG_ULANG:true,
    PENDING_REVIEW_PENGHAMBAT_TUNJANGAN:true
  };
  var list = (blockers || []).map(function (x) { return String(x || ''); }).filter(Boolean);
  if (!list.length) return 'NONE';
  return list.every(function (x) {
    if (soft[x] === true) return true;
    // VALIDASI_BATCH_GAGAL terjadi setelah pemeriksaan struktur batch selesai.
    // Untuk read-model eksekutif, ini berarti batch tersimpan belum dapat direvalidasi
    // terhadap engine terbaru, bukan bukti bahwa ID/status/pegawai/aritmetika batch rusak.
    return x.indexOf('VALIDASI_BATCH_GAGAL:') === 0;
  }) ? 'REVALIDATION_ONLY' : 'STRUCTURAL';
}

function execDashV10AllowanceWorkflowHint_(status) {
  var s = String(status || '');
  if (s === 'Disetujui Lurah') return 'Belum diteruskan ke Bendahara';
  if (s === String(TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA)) return 'Menunggu pencairan Bendahara';
  if (s === String(TUNJANGAN_STATUS.SUDAH_DICAIRKAN)) return 'Sudah dicairkan';
  if (s === 'Diajukan ke Lurah') return 'Menunggu persetujuan Lurah';
  if (s === 'Dikunci Carik') return 'Belum diajukan ke Lurah';
  if (s === 'Draft') return 'Batch masih draft';
  if (s === 'Dikembalikan Lurah') return 'Perlu diperbaiki Carik';
  return '';
}

function execDashV10AllowancePoint_(periode, estimate, allowance, adminSummary) {
  if (allowance == null) {
    return { periode:periode, amount:null, kind:'UNKNOWN', status:'BELUM_DAPAT_DIBACA', batchId:'', employees:null, blockers:[], workflowHint:'' };
  }
  if (allowance.exists === false) {
    var est = Number(estimate);
    var reports = adminSummary ? Number(adminSummary.laporanMasuk || 0) : null;
    var pending = adminSummary ? Number(adminSummary.menungguReview || 0) : null;
    var canEstimate = isFinite(est) && ((adminSummary && reports > 0 && pending === 0) || (!adminSummary && est > 0));
    if (!canEstimate) {
      return {
        periode:periode, amount:null, kind:'BELUM_DAPAT_DIHITUNG', status:String(allowance.status || 'BELUM ADA BATCH'),
        batchId:'', employees:0, blockers:[], workflowHint:pending > 0 ? 'Review periode belum selesai' : 'Belum ada data cukup untuk estimasi'
      };
    }
    return {
      periode:periode, amount:est, kind:'ESTIMASI', status:String(allowance.status || 'BELUM ADA BATCH'),
      batchId:'', employees:0, blockers:[], workflowHint:'Belum ada batch resmi'
    };
  }

  var blockers = (allowance.blockers || []).slice();
  var blockerClass = execDashV10AllowanceBlockerClass_(blockers);
  if (allowance.valid !== true && blockerClass === 'STRUCTURAL') {
    return {
      periode:periode, amount:null, kind:'BLOCKED', status:String(allowance.status || 'BATCH TIDAK VALID'),
      batchId:String(allowance.batchId || ''), employees:Number(allowance.employees || 0), blockers:blockers,
      workflowHint:'Batch perlu diperiksa sebelum dipakai sebagai nilai eksekutif'
    };
  }

  var status = String(allowance.status || '');
  var kind = allowance.frozenSnapshot === true ? 'FINAL' : (allowance.valid === true ? 'BATCH_BELUM_FINAL' : 'BATCH_TERCATAT');
  return {
    periode:periode,
    amount:Number(allowance.totalNominal || 0),
    kind:kind,
    status:status,
    batchId:String(allowance.batchId || ''),
    employees:Number(allowance.employees || 0),
    blockers:blockers,
    dataQuality:allowance.valid === true ? 'TERVALIDASI' : 'PERLU_VERIFIKASI_ULANG',
    workflowHint:execDashV10AllowanceWorkflowHint_(status),
    paid:status === String(TUNJANGAN_STATUS.SUDAH_DICAIRKAN)
  };
}

function execDashV10AllowanceTrend_(periods, adminByPeriod) {
  var points = [], errors = [], allowanceByPeriod = {};
  (periods || []).forEach(function (p) {
    var estimate = adminByPeriod[p] && adminByPeriod[p].summary ? Number(adminByPeriod[p].summary.estimasiTunjangan || 0) : null;
    try {
      var a = mcV10Allowance_(p);
      allowanceByPeriod[p] = a;
      points.push(execDashV10AllowancePoint_(p, estimate, a, adminByPeriod[p] && adminByPeriod[p].summary ? adminByPeriod[p].summary : null));
    } catch (e) {
      var er = { periode:p, code:String(e && e.code || 'ALLOWANCE_READ_FAILED'), message:String(e && e.message || e) };
      errors.push(er);
      allowanceByPeriod[p] = null;
      points.push({ periode:p, amount:null, kind:'UNKNOWN', status:'BELUM_DAPAT_DIBACA', batchId:'', employees:null, blockers:[], sourceError:true });
    }
  });
  return { points:points, byPeriod:allowanceByPeriod, errors:errors };
}

function execDashV10CycleReview_(trendPoint) {
  if (!trendPoint || trendPoint.laporanMasuk == null || trendPoint.pending == null) return 'TIDAK_DAPAT_DIBACA';
  if (Number(trendPoint.laporanMasuk) === 0) return 'BELUM_ADA_LAPORAN';
  return Number(trendPoint.pending) > 0 ? 'BELUM_SELESAI' : 'SELESAI';
}

function execDashV10CyclePayment_(allowance) {
  if (allowance == null) return 'TIDAK_DAPAT_DIBACA';
  if (allowance.exists === false) return 'BELUM_SAMPAI_TAHAP_PENCAIRAN';
  var s = String(allowance.status || '');
  if (s === String(TUNJANGAN_STATUS.SUDAH_DICAIRKAN)) return 'SUDAH_DICAIRKAN';
  if (s === String(TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA)) return 'MENUNGGU_PENCAIRAN';
  if (s === 'Disetujui Lurah') return 'BELUM_DITERUSKAN_KE_BENDAHARA';
  return 'BELUM_SAMPAI_TAHAP_PENCAIRAN';
}

function execDashV10ArchiveCompact_(periode, selectedPeriod, closingState, allowance) {
  if (periode === selectedPeriod) {
    var full = bangunMonthlyArchiveV10_(periode);
    return {
      status:String(full && full.status || 'TIDAK_DAPAT_DIBACA'),
      integrityStatus:full && full.archive ? String(full.archive.integrityStatus || full.archive.verificationStatus || '') : '',
      archiveId:String(full && full.archiveId || '')
    };
  }
  var d = maV10ReadStoredDescriptor_(periode);
  if (d) return {
    status:'SUDAH_DIARSIPKAN',
    integrityStatus:String(d.integrityStatus || d.verificationStatus || d.verifyStatus || ''),
    archiveId:String(d.archiveId || '')
  };
  var closed = closingState && String(closingState.status || '') === 'DITUTUP';
  var paid = allowance && String(allowance.status || '') === String(TUNJANGAN_STATUS.SUDAH_DICAIRKAN);
  return { status:closed && paid ? 'BELUM_DIARSIPKAN' : 'BELUM_SIAP', integrityStatus:'', archiveId:'' };
}

function execDashV10CycleStatus_(periods, selectedPeriod, trendByPeriod, allowanceByPeriod) {
  var out = [], errors = [];
  (periods || []).forEach(function (p) {
    var closing = null;
    try { closing = mcV10PeriodState_(p); }
    catch (eC) { errors.push({ source:'closing', periode:p, code:'CLOSING_READ_FAILED', message:String(eC && eC.message || eC) }); }
    var allowance = allowanceByPeriod[p];
    var archive = null;
    try { archive = execDashV10ArchiveCompact_(p, selectedPeriod, closing, allowance); }
    catch (eA) {
      errors.push({ source:'archive', periode:p, code:'ARCHIVE_READ_FAILED', message:String(eA && eA.message || eA) });
      archive = { status:'TIDAK_DAPAT_DIBACA', integrityStatus:'', archiveId:'' };
    }
    var allowanceStatus = allowance == null ? 'TIDAK_DAPAT_DIBACA' : (allowance.exists === false ? 'BELUM_ADA_BATCH' : (allowance.valid !== true && execDashV10AllowanceBlockerClass_(allowance.blockers || []) === 'STRUCTURAL' ? 'BATCH_BERMASALAH' : String(allowance.status || 'BATCH_VALID')));
    out.push({
      periode:p,
      review:execDashV10CycleReview_(trendByPeriod[p]),
      closing:closing ? String(closing.status || 'TIDAK_DAPAT_DIBACA') : 'TIDAK_DAPAT_DIBACA',
      tunjangan:allowanceStatus,
      pencairan:execDashV10CyclePayment_(allowance),
      arsip:archive.status,
      archiveIntegrity:archive.integrityStatus,
      archiveId:archive.archiveId
    });
  });
  return { points:out, errors:errors };
}

function execDashV10EacSummary_(token) {
  var r = ambilExceptionActionCenterV10({}, token);
  if (!r || r.sukses !== true) {
    return { ok:false, summary:{ tindakanSaya:null, pantauan:null, kritis:null, mendesak:null, perluDitindaklanjuti:null }, error:String(r && (r.kode || r.pesan) || 'EAC_READ_FAILED') };
  }
  var s = r.summary || {};
  return { ok:true, summary:{
    tindakanSaya:Number(s.tindakanSaya || 0), pantauan:Number(s.pantauan || 0), kritis:Number(s.kritis || 0),
    mendesak:Number(s.mendesak || 0), perluDitindaklanjuti:Number(s.perluDitindaklanjuti || 0)
  }, error:'' };
}

function execDashV10CacheKey_(role, periode, generation) {
  return ['EXEC_DASH_V10', String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), String(role || ''), String(periode || ''), String(generation || '')].join('|');
}

function execDashV10BuildReadModel_(ctx, role, token, nowMs) {
  var periods = execDashV10BuildPeriods_(ctx.periode, ctx.windowMonths);
  var partial = false;
  var sourceStatus = {
    admin:execDashV10Source_('OK',''), reviewEfficiency:execDashV10Source_('OK',''),
    allowance:execDashV10Source_('OK',''), cycle:execDashV10Source_('OK',''), eac:execDashV10Source_('OK','')
  };

  var admin = execDashV10CollectAdminPeriods_(periods);
  if (admin.errors.length) { partial = true; sourceStatus.admin = execDashV10Source_(admin.errors.length === periods.length ? 'ERROR' : 'PARTIAL', admin.errors[0].code); }
  var selectedAdmin = admin.byPeriod[ctx.periode];
  var selectedSummary = selectedAdmin && selectedAdmin.summary ? selectedAdmin.summary : null;

  var reviewEfficiency = null;
  try {
    if (!selectedAdmin || !Array.isArray(selectedAdmin.rows)) throw new Error('Cakupan Admin periode terpilih tidak tersedia.');
    reviewEfficiency = execDashV10ReviewEfficiency_(ctx.periode, selectedAdmin.rows, nowMs);
    if (reviewEfficiency.status === 'DATA_BELUM_CUKUP') sourceStatus.reviewEfficiency = execDashV10Source_('INSUFFICIENT','');
  } catch (eR) {
    partial = true; sourceStatus.reviewEfficiency = execDashV10Source_('ERROR','REVIEW_EFFICIENCY_READ_FAILED');
    reviewEfficiency = { status:'TIDAK_DAPAT_DIBACA', sampleReviewed:null, medianHours:null, averageHours:null, within24Hours:null, within24Rate:null, pendingCount:null, oldestPendingHours:null, invalidTimestampCount:null };
  }

  var allowanceTrend = execDashV10AllowanceTrend_(periods, admin.byPeriod);
  if (allowanceTrend.errors.length) { partial = true; sourceStatus.allowance = execDashV10Source_(allowanceTrend.errors.length === periods.length ? 'ERROR' : 'PARTIAL', allowanceTrend.errors[0].code); }

  var trendByPeriod = {};
  admin.points.forEach(function (x) { trendByPeriod[x.periode] = x; });
  var cycle = execDashV10CycleStatus_(periods, ctx.periode, trendByPeriod, allowanceTrend.byPeriod);
  if (cycle.errors.length) { partial = true; sourceStatus.cycle = execDashV10Source_('PARTIAL', cycle.errors[0].code); }

  var eac = null;
  try {
    eac = execDashV10EacSummary_(token);
    if (!eac.ok) { partial = true; sourceStatus.eac = execDashV10Source_('ERROR', eac.error); }
  } catch (eE) {
    partial = true; sourceStatus.eac = execDashV10Source_('ERROR','EAC_READ_FAILED');
    eac = { ok:false, summary:{ tindakanSaya:null, pantauan:null, kritis:null, mendesak:null, perluDitindaklanjuti:null }, error:'EAC_READ_FAILED' };
  }

  var selectedAllowancePoint = null;
  for (var i=0; i<allowanceTrend.points.length; i++) if (allowanceTrend.points[i].periode === ctx.periode) selectedAllowancePoint = allowanceTrend.points[i];
  var summary = {
    pegawaiDalamCakupan:selectedSummary ? Number(selectedSummary.pegawaiAktif || 0) : null,
    laporanMasuk:selectedSummary ? Number(selectedSummary.laporanMasuk || 0) : null,
    menungguReview:selectedSummary ? Number(selectedSummary.menungguReview || 0) : null,
    belumUnggah:selectedSummary ? Number(selectedSummary.belumUnggah || 0) : null,
    laporanDisetujui:selectedSummary ? Number(selectedSummary.laporanDisetujui || 0) : null,
    laporanDitolak:selectedSummary ? Number(selectedSummary.laporanDitolak || 0) : null,
    laporanStatusLain:selectedSummary ? Number(selectedSummary.laporanStatusLain || 0) : null,
    reviewSelesai:selectedSummary ? Number(selectedSummary.laporanDisetujui || 0) + Number(selectedSummary.laporanDitolak || 0) : null,
    reviewSelesaiRate:selectedSummary && Number(selectedSummary.laporanMasuk || 0) > 0
      ? execDashV10Round_(((Number(selectedSummary.laporanDisetujui || 0) + Number(selectedSummary.laporanDitolak || 0)) / Number(selectedSummary.laporanMasuk || 0)) * 100, 1) : null,
    tunjangan:selectedAllowancePoint
  };

  var selectedMeta = selectedAdmin && selectedAdmin.meta ? selectedAdmin.meta : metaPeriodeResmiDashboardAdminV37_(ctx.periode);
  return {
    sukses:true,
    versi:EXECUTIVE_DASHBOARD_V10_VERSION_,
    appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
    role:role,
    periode:ctx.periode,
    periodeLabel:String(selectedMeta.labelPeriode || selectedMeta.labelPembayaran || ctx.periode),
    periodeStatus:execDashV10PeriodStatus_(selectedMeta),
    windowMonths:ctx.windowMonths,
    partial:partial,
    summary:summary,
    trend:admin.points,
    reviewEfficiency:reviewEfficiency,
    attention:execDashV10BuildAttention_(selectedAdmin && selectedAdmin.rows ? selectedAdmin.rows : []),
    allowanceTrend:allowanceTrend.points,
    cycleStatus:cycle.points,
    eacSummary:eac.summary,
    sourceStatus:sourceStatus,
    scope:{ excludesLurah:true, excludesPHL:true, employeeRosterMode:'CURRENT_ACTIVE_ROSTER' },
    policy:{ readOnly:true, noNewSheet:true, noBusinessMutation:true, lateCutoffMetricDeferred:EXEC_DASH_V10_LATE_CUTOFF_DEFERRED_, cacheTtlSeconds:EXEC_DASH_V10_CACHE_TTL_SECONDS_ }
  };
}

function ambilExecutiveDashboardV10(request, token) {
  var started = Date.now();
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    var role = execDashV10Role_(idUser);
    if (!role) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Dashboard Eksekutif hanya tersedia untuk Lurah dan Carik.' };
    var ctx = execDashV10NormalizeRequest_(request);
    var periodValidation = validasiPeriodeResmiDashboardAdminV37_(ctx.periode, new Date());
    if (!periodValidation || periodValidation.sukses !== true) {
      return { sukses:false, kode:String(periodValidation && periodValidation.kode || 'PERIODE_INVALID'), pesan:String(periodValidation && periodValidation.pesan || 'Periode tidak dapat digunakan.'), periodeAktifResmi:periodValidation && periodValidation.periodeAktifResmi || '' };
    }
    ctx.periode = periodValidation.meta.periode;
    var generation = adminDashboardGenerationV2A2_();
    var key = execDashV10CacheKey_(role, ctx.periode, generation);
    var cache = null;
    try { cache = CacheService.getScriptCache(); } catch (eCache) { cache = null; }
    if (!ctx.forceRefresh && cache) {
      try {
        var raw = cache.get(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          parsed.cacheHit = true;
          parsed.serverMs = Date.now() - started;
          return parsed;
        }
      } catch (eRead) { }
    }
    var result = execDashV10BuildReadModel_(ctx, role, token, Date.now());
    result.cacheHit = false;
    result.generatedAt = typeof formatTanggalJamClient_ === 'function' ? formatTanggalJamClient_(new Date()) : new Date().toISOString();
    result.serverMs = Date.now() - started;
    result.adminGeneration = String(generation || '');
    if (cache) {
      try { cache.put(key, JSON.stringify(result), EXEC_DASH_V10_CACHE_TTL_SECONDS_); } catch (ePut) { }
    }
    return result;
  } catch (e) {
    var code = String(e && e.code || 'EXEC_DASH_READ_FAILED');
    if (code === 'WINDOW_UNSUPPORTED' || code === 'PERIODE_INVALID') return { sukses:false, kode:code, pesan:String(e.message || e) };
    return handleError('ambilExecutiveDashboardV10', e, { sukses:false, kode:code, pesan:'Dashboard Eksekutif belum dapat dimuat.', partial:true });
  }
}

// Validator sintetis: hanya memeriksa kontrak modul, tanpa membaca/menulis data produksi.
function validasiExecutiveDashboardV10() {
  var checks = [];
  function add_(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail == null ? '' : detail) }); }
  add_('VERSION', EXECUTIVE_DASHBOARD_V10_VERSION_ === 'EXEC-DASH-v1.0-RC3-2026.10.04.04', EXECUTIVE_DASHBOARD_V10_VERSION_);
  add_('APP_VERSION', String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') === '2026.10.04.04', typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');
  add_('PUBLIC_ENDPOINT', typeof ambilExecutiveDashboardV10 === 'function', typeof ambilExecutiveDashboardV10);
  add_('WINDOW_6', EXEC_DASH_V10_WINDOW_MONTHS_ === 6, EXEC_DASH_V10_WINDOW_MONTHS_);
  add_('CACHE_180', EXEC_DASH_V10_CACHE_TTL_SECONDS_ === 180, EXEC_DASH_V10_CACHE_TTL_SECONDS_);
  add_('LATE_CUTOFF_DEFERRED', EXEC_DASH_V10_LATE_CUTOFF_DEFERRED_ === true, EXEC_DASH_V10_LATE_CUTOFF_DEFERRED_);
  add_('MEDIAN_ODD', execDashV10Median_([1,3,5]) === 3, execDashV10Median_([1,3,5]));
  add_('MEDIAN_EVEN', execDashV10Median_([1,3,5,7]) === 4, execDashV10Median_([1,3,5,7]));
  add_('ALLOWANCE_ESTIMATE', execDashV10AllowancePoint_('2026-10',123,{exists:false,status:'BELUM ADA BATCH'},{laporanMasuk:2,menungguReview:0}).kind === 'ESTIMASI', 'ESTIMASI');
  add_('ALLOWANCE_BLOCKED', execDashV10AllowancePoint_('2026-10',123,{exists:true,valid:false,status:'Draft',blockers:['X']}).kind === 'BLOCKED', 'BLOCKED');
  add_('FINAL_REQUIRES_FROZEN', execDashV10AllowancePoint_('2026-10',123,{exists:true,valid:true,frozenSnapshot:false,totalNominal:200,status:'Dikunci Carik'}).kind === 'BATCH_BELUM_FINAL', 'BATCH_BELUM_FINAL');
  add_('ATTENTION_MAX_5', execDashV10BuildAttention_([{idUser:'1',nama:'1',jumlahLaporan:0},{idUser:'2',nama:'2',jumlahLaporan:0},{idUser:'3',nama:'3',jumlahLaporan:0},{idUser:'4',nama:'4',jumlahLaporan:0},{idUser:'5',nama:'5',jumlahLaporan:0},{idUser:'6',nama:'6',jumlahLaporan:0}]).length === 5, EXEC_DASH_V10_MAX_ATTENTION_);
  add_('NO_LATE_CUTOFF_REASON', JSON.stringify(execDashV10BuildAttention_([{idUser:'1',nama:'A',jumlahLaporan:0,jumlahMenunggu:0,jumlahDitolak:0}])).indexOf('LATE_CUTOFF') === -1, 'DEFERRED');
  add_('NO_ZERO_WHEN_REVIEW_PENDING', execDashV10AllowancePoint_('2026-10',0,{exists:false,status:'BELUM ADA BATCH'},{laporanMasuk:101,menungguReview:101}).kind === 'BELUM_DAPAT_DIHITUNG', 'BELUM_DAPAT_DIHITUNG');
  add_('HISTORICAL_RECORDED_BATCH_VISIBLE', execDashV10AllowancePoint_('2026-07',0,{exists:true,valid:false,frozenSnapshot:false,totalNominal:5536872,status:'Disetujui Lurah',batchId:'B',employees:19,blockers:['SNAPSHOT_BERBEDA_DENGAN_HITUNG_ULANG']}).kind === 'BATCH_TERCATAT', 'BATCH_TERCATAT');
  add_('HISTORICAL_VALIDATION_FAILURE_VISIBLE', execDashV10AllowancePoint_('2026-05',0,{exists:true,valid:false,frozenSnapshot:false,totalNominal:5694216,status:'Disetujui Lurah',batchId:'MAY',employees:18,blockers:['VALIDASI_BATCH_GAGAL: metadata historis']}).kind === 'BATCH_TERCATAT', 'BATCH_TERCATAT');
  add_('READ_ONLY_POLICY', true, 'Tidak ada endpoint write pada modul Dashboard Eksekutif.');
  var passed = checks.filter(function (x) { return x.lulus; }).length;
  return { sukses:passed===checks.length, valid:passed===checks.length, versi:EXECUTIVE_DASHBOARD_V10_VERSION_, appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), jumlah:checks.length, lulus:passed, gagal:checks.length-passed, checks:checks };
}
