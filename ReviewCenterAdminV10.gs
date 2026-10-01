// ============================================================
// REVIEW CENTER ADMIN v1.2-RC1 — LEGACY RETIREMENT
// APP_VERSION 2026.10.01.01
// Antrean review lintas pegawai berbasis Index_Laporan.
// Detail/aksi dipersatukan di Pusat Review; keputusan tetap memakai prosesReviewAdmin yang stabil.
// ============================================================

var REVIEW_CENTER_ADMIN_V10_VERSION_ = 'REVIEW-CENTER-v1.2-RC1-2026.10.01.01';
var REVIEW_CENTER_ADMIN_V10_DEFAULT_LIMIT_ = 20;
var REVIEW_CENTER_ADMIN_V10_MAX_LIMIT_ = 30;

function reviewCenterTextV10_(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function reviewCenterGroupV10_(jabatan) {
  if (typeof kelompokTimelineV02_ === 'function') return kelompokTimelineV02_(jabatan);
  var j = reviewCenterTextV10_(jabatan);
  if (j.indexOf('phl') !== -1 || j.indexOf('lepas') !== -1) return 'PHL';
  if (j.indexOf('dukuh') !== -1) return 'DUKUH';
  if (j.indexOf('staf') !== -1) return 'STAF';
  return 'PAMONG';
}

function reviewCenterGroupLabelV10_(group) {
  var g = String(group || '').toUpperCase();
  if (g === 'PHL') return 'PHL';
  if (g === 'DUKUH') return 'Dukuh';
  if (g === 'STAF') return 'Staf';
  return 'Pamong';
}

function reviewCenterStatusFilterMatchV10_(status, filter) {
  var pending = typeof isPendingReviewStatus_ === 'function'
    ? isPendingReviewStatus_(status)
    : /^(Menunggu Review|Banding|Menunggu Persetujuan Lurah)$/i.test(String(status || '').trim());
  var f = String(filter || 'MENUNGGU').toUpperCase();
  if (f === 'MENUNGGU') return pending;
  if (f === 'SELESAI') return !pending;
  return true;
}

function reviewCenterShaV10_(text) {
  if (typeof sha256Teks3B1B2_ === 'function') return sha256Teks3B1B2_(String(text || ''));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
}

function reviewCenterNormalizeRequestV10_(request) {
  var raw = request && typeof request === 'object' && !Array.isArray(request) ? request : {};
  var active = periodeKinerjaAktifUntukLaporanWajibV34_(new Date());
  var period = String(raw.periode || active || '').trim();
  try { period = normalizePeriode_(period); } catch (e) { throw new Error('REVIEW_CENTER_PERIODE_TIDAK_VALID'); }

  var periodValidation = typeof validasiPeriodeResmiDashboardAdminV37_ === 'function'
    ? validasiPeriodeResmiDashboardAdminV37_(period, new Date())
    : { sukses: true, meta: { periode: period, labelPeriode: labelPembayaranPeriode_(period), periodeAktifResmi: active } };
  if (!periodValidation || periodValidation.sukses === false) {
    var pe = new Error((periodValidation && periodValidation.pesan) || 'Periode belum tersedia.');
    pe.code = (periodValidation && periodValidation.kode) || 'PERIODE_TIDAK_TERSEDIA';
    throw pe;
  }

  var status = String(raw.status || 'MENUNGGU').toUpperCase().trim();
  if (['MENUNGGU','SELESAI','SEMUA'].indexOf(status) === -1) throw new Error('REVIEW_CENTER_STATUS_TIDAK_VALID');
  var kelompok = String(raw.kelompok || 'SEMUA').toUpperCase().trim();
  if (['SEMUA','PAMONG','DUKUH','STAF','PHL'].indexOf(kelompok) === -1) throw new Error('REVIEW_CENTER_KELOMPOK_TIDAK_VALID');
  var urutan = String(raw.urutan || 'TERLAMA').toUpperCase().trim();
  if (['TERLAMA','TERBARU'].indexOf(urutan) === -1) throw new Error('REVIEW_CENTER_URUTAN_TIDAK_VALID');

  var offset = parseInt(raw.offset, 10);
  if (isNaN(offset) || offset < 0) offset = 0;
  if (offset > 100000) throw new Error('REVIEW_CENTER_OFFSET_TIDAK_VALID');
  var limit = parseInt(raw.limit, 10);
  if (isNaN(limit) || limit < 1) limit = REVIEW_CENTER_ADMIN_V10_DEFAULT_LIMIT_;
  if (limit > REVIEW_CENTER_ADMIN_V10_MAX_LIMIT_) limit = REVIEW_CENTER_ADMIN_V10_MAX_LIMIT_;

  var q = String(raw.q || '').trim();
  var pegawai = normalizeId_(raw.pegawai || '');
  var kategori = String(raw.kategori || '').trim();
  var expectedFingerprint = String(raw.expectedFingerprint || '').trim();
  if (q.length > 120 || kategori.length > 250 || expectedFingerprint.length > 100) throw new Error('REVIEW_CENTER_FILTER_TERLALU_PANJANG');

  return {
    periode: period,
    periodeMeta: periodValidation.meta || {},
    status: status,
    kelompok: kelompok,
    urutan: urutan,
    offset: offset,
    limit: limit,
    qRaw: q,
    q: reviewCenterTextV10_(q),
    pegawai: pegawai,
    kategori: kategori,
    expectedFingerprint: expectedFingerprint
  };
}

function reviewCenterEmployeeMapV10_() {
  var data = getPegawaiDataCached_();
  var map = Object.create(null);
  if (!Array.isArray(data)) return map;
  for (var i = 1; i < data.length; i++) {
    var r = data[i] || [];
    var id = normalizeId_(r[SHEET_COLUMNS.DATA_PEGAWAI.ID]);
    if (!id) continue;
    var nama = String(r[SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || '').trim();
    var jabatan = String(r[SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || '').trim();
    map[id] = {
      id: id,
      nama: nama,
      jabatan: jabatan,
      kelompok: reviewCenterGroupV10_(jabatan),
      kelompokLabel: reviewCenterGroupLabelV10_(reviewCenterGroupV10_(jabatan)),
      statusPegawai: String(r[SHEET_COLUMNS.DATA_PEGAWAI.STATUS] || '').trim()
    };
  }
  return map;
}

function reviewCenterOfficialPeriodFromIndexV10_(rawPeriod, submitDate, resolver) {
  var p = String(rawPeriod || '').trim();
  if (p) {
    try { return normalizePeriode_(p); } catch (e) { }
  }
  if (submitDate instanceof Date && !isNaN(submitDate.getTime()) && typeof resolver === 'function') {
    try { return String(resolver(submitDate) || ''); } catch (e2) { }
  }
  return '';
}

function reviewCenterReadIndexV10_(req, employeeMap) {
  var health = typeof cekKesehatanIndexReviewAdmin3C1_ === 'function'
    ? cekKesehatanIndexReviewAdmin3C1_()
    : { valid: false, alasan: 'INDEX_HEALTH_HELPER_TIDAK_TERSEDIA' };
  if (!health || health.valid !== true) {
    var err = new Error('Index laporan belum sehat untuk Review Center. ' + String((health && health.alasan) || ''));
    err.code = 'INDEX_TIDAK_SEHAT';
    throw err;
  }

  var sh = getSS_().getSheetByName('Index_Laporan');
  if (!sh) { var em = new Error('Index_Laporan tidak ditemukan.'); em.code = 'INDEX_TIDAK_DITEMUKAN'; throw em; }
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { allPeriod: [], filtered: [], categories: [], employees: [], summary: { totalPeriode:0,totalPending:0,totalSelesai:0,PAMONG:0,DUKUH:0,STAF:0,PHL:0 } };
  var width = SHEET_COLUMNS.INDEX_LAPORAN.INDEX_VERSION + 1;
  var data = sh.getRange(2, 1, lastRow - 1, width).getValues();
  var I = SHEET_COLUMNS.INDEX_LAPORAN;
  var resolver = typeof buatResolverPeriodeResmiAdminV2A2_ === 'function' ? buatResolverPeriodeResmiAdminV2A2_() : null;
  var allPeriod = [], filtered = [], categorySet = Object.create(null), employeeSet = Object.create(null);
  var summary = { totalPeriode:0,totalPending:0,totalSelesai:0,PAMONG:0,DUKUH:0,STAF:0,PHL:0,oldestPendingMs:0,newestPendingMs:0 };

  for (var i = 0; i < data.length; i++) {
    var r = data[i] || [];
    var idLap = normalizeId_(r[I.ID_LAPORAN]);
    var rowRekap = Number(r[I.ROW_REKAP] || 0);
    var idUser = normalizeId_(r[I.ID_USER]);
    if (!idLap || rowRekap < 2 || !idUser) continue;
    var submit = parseTanggal(r[I.TANGGAL_LAPORAN]);
    if (!(submit instanceof Date) || isNaN(submit.getTime())) continue;
    var period = reviewCenterOfficialPeriodFromIndexV10_(r[I.PERIODE_RESMI], submit, resolver);
    if (period !== req.periode) continue;

    var emp = employeeMap[idUser] || { id:idUser, nama:'', jabatan:'', kelompok:'PAMONG', kelompokLabel:'Pamong', statusPegawai:'' };
    if (typeof isLurah_ === 'function' && isLurah_(emp.jabatan)) continue;
    var status = String(r[I.STATUS_REVIEW] || '').trim();
    var pending = typeof isPendingReviewStatus_ === 'function' ? isPendingReviewStatus_(status) : reviewCenterStatusFilterMatchV10_(status,'MENUNGGU');
    var kategori = String(r[I.KATEGORI] || '').trim();
    var changed = parseTanggal(r[I.TERAKHIR_DIUBAH]);
    var rec = {
      rowRekap: rowRekap,
      idLaporan: idLap,
      idUser: idUser,
      submitMs: submit.getTime(),
      changedMs: changed instanceof Date && !isNaN(changed.getTime()) ? changed.getTime() : 0,
      status: status,
      pending: pending,
      kategori: kategori,
      kelompok: emp.kelompok || 'PAMONG',
      kelompokLabel: emp.kelompokLabel || reviewCenterGroupLabelV10_(emp.kelompok),
      nama: emp.nama || '',
      jabatan: emp.jabatan || ''
    };
    allPeriod.push(rec);
    summary.totalPeriode++;
    if (pending) {
      summary.totalPending++;
      summary[rec.kelompok] = Number(summary[rec.kelompok] || 0) + 1;
      if (!summary.oldestPendingMs || rec.submitMs < summary.oldestPendingMs) summary.oldestPendingMs = rec.submitMs;
      if (!summary.newestPendingMs || rec.submitMs > summary.newestPendingMs) summary.newestPendingMs = rec.submitMs;
    } else summary.totalSelesai++;

    if (kategori) categorySet[kategori] = true;
    if (emp.nama) employeeSet[idUser] = { value:idUser, label:emp.nama + (emp.jabatan ? ' — ' + emp.jabatan : ''), nama:emp.nama, jabatan:emp.jabatan, kelompok:rec.kelompok };

    if (!reviewCenterStatusFilterMatchV10_(status, req.status)) continue;
    if (req.kelompok !== 'SEMUA' && rec.kelompok !== req.kelompok) continue;
    if (req.pegawai && !idsEqual_(idUser, req.pegawai)) continue;
    if (req.kategori && kategori !== req.kategori) continue;
    if (req.q) {
      var hay = reviewCenterTextV10_([emp.nama, emp.jabatan, kategori, status, idLap].join(' '));
      if (hay.indexOf(req.q) === -1) continue;
    }
    filtered.push(rec);
  }

  filtered.sort(function (a, b) {
    var diff = a.submitMs - b.submitMs;
    if (req.urutan === 'TERBARU') diff = -diff;
    if (diff) return diff;
    return req.urutan === 'TERBARU' ? b.rowRekap - a.rowRekap : a.rowRekap - b.rowRekap;
  });

  var categories = Object.keys(categorySet).sort(function (a,b) { return a.localeCompare(b,'id',{sensitivity:'base'}); });
  var employees = Object.keys(employeeSet).map(function (id) { return employeeSet[id]; });
  employees.sort(function (a,b) { return String(a.nama||'').localeCompare(String(b.nama||''),'id',{sensitivity:'base'}); });
  return { allPeriod: allPeriod, filtered: filtered, categories: categories, employees: employees, summary: summary, health: health };
}

function reviewCenterFingerprintV10_(req, filtered) {
  var payload = [REVIEW_CENTER_ADMIN_V10_VERSION_, req.periode, req.status, req.kelompok, req.pegawai, req.kategori, req.q, req.urutan]
    .concat((filtered || []).map(function (r) { return [r.idLaporan,r.rowRekap,r.status,r.changedMs].join('|'); }))
    .join('||');
  return reviewCenterShaV10_(payload);
}

function reviewCenterAgeV10_(ms, nowMs) {
  var hours = Math.max(0, (Number(nowMs || Date.now()) - Number(ms || 0)) / 3600000);
  return { hours: Math.round(hours * 10) / 10, days: Math.floor(hours / 24) };
}

function reviewCenterBuildItemsV10_(selected, nowMs) {
  if (!selected.length) return [];
  var sheet = getSheet_('Rekap_Kinerja');
  var rows = selected.map(function (r) { return r.rowRekap; });
  var fullRows = bacaBarisLengkapAdminReviewV2A1C_(sheet, rows, sheet.getLastColumn());
  var context = typeof buatKonteksCutoff3B04C1c_ === 'function' ? buatKonteksCutoff3B04C1c_() : null;
  var lampiranCache = {}, items = [];

  for (var i = 0; i < selected.length; i++) {
    var rec = selected[i];
    var full = fullRows[rec.rowRekap] || [];
    if (!full.length) throw new Error('REVIEW_CENTER_BARIS_TIDAK_DITEMUKAN_' + rec.rowRekap);
    var actualId = normalizeId_(full[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    var actualUser = normalizeId_(full[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idsEqual_(actualId, rec.idLaporan) || !idsEqual_(actualUser, rec.idUser)) throw new Error('REVIEW_CENTER_INDEX_STALE_' + rec.rowRekap);

    var item = buildAdminReviewItemFromRow_(full, lampiranCache);
    if (typeof injectKolomKQKeItemReview_ === 'function') item = injectKolomKQKeItemReview_(item, full);
    if (context && typeof buatMetadataRow3B04C1c_ === 'function' && typeof gabungkanMetadata3B04C1c_ === 'function') {
      item = gabungkanMetadata3B04C1c_(item, buatMetadataRow3B04C1c_(full, SHEET_COLUMNS.REKAP_KINERJA, context));
    }
    var age = reviewCenterAgeV10_(rec.submitMs, nowMs);
    item.kelompokReviewCenter = rec.kelompok;
    item.kelompokReviewCenterLabel = rec.kelompokLabel;
    item.umurMenungguJam = age.hours;
    item.umurMenungguHari = age.days;
    item.bolehAksiReview = !!rec.pending;
    item.rowRekap = rec.rowRekap;
    items.push(item);
  }
  return items;
}

function ambilReviewCenterAdminV10(request, token) {
  var started = Date.now();
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.', items:[] };
    if (!cekHakAksesAdmin(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Review Center hanya untuk Admin.', items:[] };

    var req = reviewCenterNormalizeRequestV10_(request);
    var employeeMap = reviewCenterEmployeeMapV10_();
    var read = reviewCenterReadIndexV10_(req, employeeMap);
    var fingerprint = reviewCenterFingerprintV10_(req, read.filtered);
    if (req.offset > 0 && req.expectedFingerprint && req.expectedFingerprint !== fingerprint) {
      return { sukses:false, kode:'DAFTAR_BERUBAH', pesan:'Antrean review berubah. Muat ulang dari halaman pertama.', items:[], fingerprint:fingerprint };
    }

    var selected = read.filtered.slice(req.offset, req.offset + req.limit);
    var nowMs = Date.now();
    var items = reviewCenterBuildItemsV10_(selected, nowMs);
    var summary = read.summary || {};
    var oldestAge = summary.oldestPendingMs ? reviewCenterAgeV10_(summary.oldestPendingMs, nowMs) : {hours:0,days:0};
    var nextOffset = req.offset + items.length;
    var periodMeta = req.periodeMeta || {};

    return {
      sukses:true,
      versi:REVIEW_CENTER_ADMIN_V10_VERSION_,
      appVersion:String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
      mode:'ANTREAN_REVIEW_ADMIN',
      periode:req.periode,
      periodeLabel:periodMeta.labelPeriode || periodMeta.labelPembayaran || labelPembayaranPeriode_(req.periode),
      periodeAktifResmi:periodMeta.periodeAktifResmi || periodeKinerjaAktifUntukLaporanWajibV34_(new Date()),
      statusPeriode:periodMeta.statusPeriode || '',
      summary:{
        totalPeriode:Number(summary.totalPeriode||0),
        totalPending:Number(summary.totalPending||0),
        totalSelesai:Number(summary.totalSelesai||0),
        pamong:Number(summary.PAMONG||0),
        dukuh:Number(summary.DUKUH||0),
        staf:Number(summary.STAF||0),
        phl:Number(summary.PHL||0),
        oldestPendingAt:summary.oldestPendingMs ? formatWaktuAdmin_(new Date(summary.oldestPendingMs)) : '',
        oldestPendingHours:oldestAge.hours,
        oldestPendingDays:oldestAge.days,
        totalFiltered:read.filtered.length
      },
      filters:{ pegawai:read.employees, kategori:read.categories },
      request:{ status:req.status,kelompok:req.kelompok,pegawai:req.pegawai,kategori:req.kategori,q:req.qRaw,urutan:req.urutan,offset:req.offset,limit:req.limit },
      items:items,
      fingerprint:fingerprint,
      nextOffset:nextOffset,
      hasMore:nextOffset < read.filtered.length,
      durasiMs:Date.now()-started,
      readOnly:true,
      dataDiubah:false,
      statusReviewDiubah:false,
      poinDiubah:false
    };
  } catch (e) {
    var code = e && e.code ? String(e.code) : 'REVIEW_CENTER_ERROR';
    return handleError('ambilReviewCenterAdminV10', e, { sukses:false, kode:code, pesan:'Review Center belum dapat dimuat.', items:[] });
  }
}

// Validasi sintetis; tidak membaca/menulis spreadsheet produksi.
function validasiReviewCenterAdminV10() {
  var maintainer = typeof pastikanMaintainerPortal3B0_ === 'function'
    ? pastikanMaintainerPortal3B0_('VALIDASI_REVIEW_CENTER_ADMIN_V10') : '';
  var scenarios = [];
  function add(name, ok) { scenarios.push({ nama:name, lulus:!!ok }); }
  add('Kelompok PHL terpisah', reviewCenterGroupV10_('Staf PHL') === 'PHL');
  add('Kelompok Dukuh terpisah', reviewCenterGroupV10_('Dukuh Plosokuning II') === 'DUKUH');
  add('Kelompok Staf terpisah', reviewCenterGroupV10_('Staf Jagabaya') === 'STAF');
  add('Kelompok Pamong fallback', reviewCenterGroupV10_('Kepala Urusan Pangripta') === 'PAMONG');
  add('Pending Menunggu Review', reviewCenterStatusFilterMatchV10_('Menunggu Review','MENUNGGU') === true);
  add('Pending Banding', reviewCenterStatusFilterMatchV10_('Banding','MENUNGGU') === true);
  add('Disetujui bukan pending', reviewCenterStatusFilterMatchV10_('Disetujui','MENUNGGU') === false);
  add('Filter selesai menerima Disetujui', reviewCenterStatusFilterMatchV10_('Disetujui','SELESAI') === true);
  var a = reviewCenterAgeV10_(Date.now()-49*3600000, Date.now());
  add('Umur antrean dihitung dalam hari', a.days >= 2);
  var statusAllowed = ['MENUNGGU','SELESAI','SEMUA'];
  var groupAllowed = ['SEMUA','PAMONG','DUKUH','STAF','PHL'];
  add('Status filter invalid ditolak', statusAllowed.indexOf('WRITE') === -1);
  add('Kelompok invalid ditolak', groupAllowed.indexOf('LAIN') === -1);
  add('Versi Legacy Retirement v1.2 tersedia', REVIEW_CENTER_ADMIN_V10_VERSION_.indexOf('v1.2') !== -1);
  var passed = scenarios.filter(function(s){return s.lulus;}).length;
  var result = { sukses:passed===scenarios.length, valid:passed===scenarios.length, versi:REVIEW_CENTER_ADMIN_V10_VERSION_, appVersion:String(APP_VERSION||''), jumlah:scenarios.length, lulus:passed, gagal:scenarios.length-passed, skenario:scenarios, maintainerVerified:!!maintainer, dataDiubah:false };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}
