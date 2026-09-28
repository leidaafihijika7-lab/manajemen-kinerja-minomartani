// CGT & Dashboard v0.2-RC2. Semua fungsi di file ini bersifat baca-saja.
// Tidak mengubah keputusan review, tarif, poin, cut-off, atau status batch.
var CAKUPAN_TUNJANGAN_CGT_V02_VERSION_ = 'CGT-v0.2-RC2-2026.09.28.01';

function kelasPegawaiTunjanganCgtV02_(id, nama, jabatan) {
  if (!normalizeId_(id) || !String(nama || '').trim() || !String(jabatan || '').trim()) {
    return 'IDENTITAS_TIDAK_LENGKAP';
  }
  // Sengaja sama dengan kalkulator lama. Tidak menetapkan kebijakan nonaktif/mutasi baru.
  var j = normalizeJabatan_(jabatan);
  return j.indexOf('phl') !== -1 || j.indexOf('lepas') !== -1 ? 'PHL' : 'TUNJANGAN';
}

function mapPegawaiTunjanganCgtV02_(data) {
  if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
    throw new Error('CGT_DATA_PEGAWAI_TIDAK_TERBACA');
  }
  var P = SHEET_COLUMNS.DATA_PEGAWAI;
  var out = { byId: Object.create(null), included: Object.create(null) };
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    var id = normalizeId_(row[P.ID]);
    if (!id) continue;
    if (Object.prototype.hasOwnProperty.call(out.byId, id)) {
      throw new Error('CGT_ID_PEGAWAI_DUPLIKAT: baris ' + (i + 1));
    }
    var item = { idUser: id, nama: String(row[P.NAMA] || ''), jabatan: String(row[P.JABATAN] || '') };
    item.kelas = kelasPegawaiTunjanganCgtV02_(id, item.nama, item.jabatan);
    out.byId[id] = item;
    if (item.kelas === 'TUNJANGAN') out.included[id] = item;
  }
  return out;
}

function cakupanRowTunjanganCgtV02_(row, ctx) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var id = normalizeId_(row[C.ID_USER]);
  var kelasRow = kelasPegawaiTunjanganCgtV02_(id, row[C.NAMA], row[C.JABATAN]);
  var master = id && ctx.byId[id];
  var konflik = !!(master && master.kelas !== 'IDENTITAS_TIDAK_LENGKAP' &&
    kelasRow !== 'IDENTITAS_TIDAK_LENGKAP' && master.kelas !== kelasRow);
  // Kalkulator lama mendahulukan master non-PHL lengkap, lalu identitas historis.
  var chosen = master && master.kelas === 'TUNJANGAN' ? master : {
    idUser: id, nama: String(row[C.NAMA] || ''), jabatan: String(row[C.JABATAN] || ''), kelas: kelasRow
  };
  return { idUser: id, nama: chosen.nama, jabatan: chosen.jabatan,
    kelas: chosen.kelas, konflik: konflik,
    sumber: chosen === master ? 'DATA_PEGAWAI' : 'IDENTITAS_LAPORAN' };
}

function tanggalValidCgtV02_(value) {
  if (value === '' || value == null) return null;
  var d = parseTanggal(value);
  if (!(d instanceof Date) || !isFinite(d.getTime()) || d.getTime() === 0) return null;
  if (!(value instanceof Date)) {
    var text = String(value).trim();
    var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    var local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    var m = iso || local;
    if (m) {
      var year = Number(iso ? m[1] : m[3]), month = Number(m[2]), day = Number(iso ? m[3] : m[1]);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day ||
          d.getHours() !== Number(m[4] || 0) || d.getMinutes() !== Number(m[5] || 0) || d.getSeconds() !== Number(m[6] || 0)) return null;
    }
  }
  return d;
}

function ringkasRowCgtV02_(row, scope, date, disposition, nomorBaris) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  return {
    idLaporan: String(row[C.ID_LAPORAN] || ''), idUser: scope.idUser,
    nama: scope.nama, jabatan: scope.jabatan,
    kategori: String(row[C.KATEGORI] || ''),
    waktuLapor: formatTanggalJamClient_(date),
    status: String(row[C.STATUS_REVIEW] || '').trim(),
    kelompokPemeriksaan: disposition, nomorBaris: nomorBaris,
    sumberIdentitas: scope.sumber
  };
}

function filterPendingTunjanganCgtV02_(data, ctx, window, evaluatePolicy) {
  if (!Array.isArray(data) || !data.length || !Array.isArray(data[0])) {
    throw new Error('CGT_REKAP_KINERJA_TIDAK_TERBACA');
  }
  if (!ctx || !ctx.byId || !ctx.included) throw new Error('CGT_CAKUPAN_PEGAWAI_TIDAK_TERBACA');
  if (!window || !(window.start instanceof Date) || !(window.end instanceof Date) ||
      !isFinite(window.start.getTime()) || !isFinite(window.end.getTime()) || window.start >= window.end) {
    throw new Error('CGT_RENTANG_PERIODE_TIDAK_VALID');
  }
  if (typeof evaluatePolicy !== 'function') throw new Error('CGT_RESOLVER_CUTOFF_TIDAK_TERSEDIA');
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var out = { checked: true, count: 0, contoh: [], rawPendingCount: 0,
    ignoredPhlCount: 0, ignoredLateCount: 0, items: [] };
  var historicalClass = Object.create(null), reportIds = Object.create(null);
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    var status = String(row[C.STATUS_REVIEW] || '').trim();
    var pending = isPendingReviewStatus_(status);
    var rawDate = row[C.TANGGAL_LAPORAN];
    var date = tanggalValidCgtV02_(rawDate);
    if (!(date instanceof Date) || !isFinite(date.getTime()) || date.getTime() === 0) {
      // Periode laporan pending bertanggal rusak tidak dapat dipastikan; jangan nyatakan aman.
      if (pending) throw new Error('CGT_TANGGAL_PENDING_TIDAK_VALID: baris ' + (i + 1));
      continue;
    }
    if (date < window.start || date >= window.end) continue;
    var scope = cakupanRowTunjanganCgtV02_(row, ctx);
    var rowClass = kelasPegawaiTunjanganCgtV02_(scope.idUser, row[C.NAMA], row[C.JABATAN]);
    if (scope.konflik || (scope.idUser && rowClass !== 'IDENTITAS_TIDAK_LENGKAP' &&
        historicalClass[scope.idUser] && historicalClass[scope.idUser] !== rowClass)) {
      throw new Error('CGT_KLASIFIKASI_PHL_BERUBAH: baris ' + (i + 1) + '. Verifikasi riwayat jabatan terlebih dahulu.');
    }
    if (scope.idUser && rowClass !== 'IDENTITAS_TIDAK_LENGKAP') historicalClass[scope.idUser] = rowClass;
    if (!pending) continue;
    out.rawPendingCount++;
    if (scope.kelas === 'IDENTITAS_TIDAK_LENGKAP') {
      throw new Error('CGT_IDENTITAS_PENDING_TIDAK_LENGKAP: baris ' + (i + 1));
    }
    var idLaporan = normalizeId_(row[C.ID_LAPORAN]);
    if (!idLaporan) throw new Error('CGT_ID_LAPORAN_PENDING_KOSONG: baris ' + (i + 1));
    if (reportIds[idLaporan]) throw new Error('CGT_ID_LAPORAN_PENDING_DUPLIKAT: baris ' + (i + 1));
    reportIds[idLaporan] = true;
    if (scope.kelas === 'PHL') {
      out.ignoredPhlCount++;
      out.items.push(ringkasRowCgtV02_(row, scope, date, 'PHL', i + 1));
      continue;
    }
    var policy = evaluatePolicy(row);
    if (!policy || typeof policy.tanpaImbalan !== 'boolean' ||
        /^(EVALUASI_GAGAL|RESOLVER_PERIODE_TIDAK_TERSEDIA)/.test(String(policy.alasan || ''))) {
      throw new Error('CGT_EVALUASI_CUTOFF_GAGAL: baris ' + (i + 1));
    }
    if (policy.tanpaImbalan === true) {
      out.ignoredLateCount++;
      out.items.push(ringkasRowCgtV02_(row, scope, date, 'LEWAT_CUTOFF', i + 1));
      continue;
    }
    out.count++;
    var detail = ringkasRowCgtV02_(row, scope, date, 'PENGHAMBAT', i + 1);
    out.items.push(detail);
    if (out.contoh.length < 5) out.contoh.push({ idLaporan: detail.idLaporan, nama: detail.nama, status: detail.status });
  }
  return out;
}

function evaluasiPendingLiveCgtV02_(periode, meta) {
  if (!meta || !meta.tanggalMulaiPeriode || !meta.tanggalAkhirPeriode || !meta.jamCutoff) {
    throw new Error('CGT_METADATA_PERIODE_KOSONG');
  }
  if (!tanggalValidCgtV02_(meta.tanggalMulaiPeriode) || !tanggalValidCgtV02_(meta.tanggalAkhirPeriode) ||
      !/^(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/.test(String(meta.jamCutoff))) {
    throw new Error('CGT_METADATA_PERIODE_TIDAK_VALID');
  }
  var p = normalizePeriode_(periode);
  var window = buildDateRangeMeta_(p, meta.tanggalMulaiPeriode, meta.tanggalAkhirPeriode, meta.jamCutoff);
  var data = getSheet_('Rekap_Kinerja').getDataRange().getValues();
  var ctx = mapPegawaiTunjanganCgtV02_(getPegawaiDataCached_());
  if (typeof buatKonteksCutoff3B04C1c_ !== 'function') throw new Error('CGT_RESOLVER_PERIODE_TIDAK_TERSEDIA');
  var cutoffContext = buatKonteksCutoff3B04C1c_();
  return filterPendingTunjanganCgtV02_(data, ctx, window, function (row) {
    return evaluasiKebijakanCutoffImbalan3C4_(row, cutoffContext);
  });
}

// dataRows adalah proyeksi A:T TANPA header, persis proyeksi Dashboard yang sudah ada.
function ringkasanPhlDashboardCgtV02_(dataRows, dataPegawai, resolver, periode) {
  if (!Array.isArray(dataRows) || typeof resolver !== 'function') throw new Error('CGT_DATA_DASHBOARD_TIDAK_TERBACA');
  var ctx = mapPegawaiTunjanganCgtV02_(dataPegawai), C = SHEET_COLUMNS.REKAP_KINERJA;
  var out = { checked: true, periode: periode, totalLaporan: 0, menungguReview: 0, items: [],
    cakupan: 'PHL_PERIODE_PELAPORAN_RESMI', mengikutiFilterPegawai: false };
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i] || [], scope = cakupanRowTunjanganCgtV02_(row, ctx);
    if (scope.kelas !== 'PHL' && !scope.konflik) continue;
    var date = tanggalValidCgtV02_(row[C.TANGGAL_LAPORAN]);
    if (!(date instanceof Date) || !isFinite(date.getTime()) || date.getTime() === 0) {
      if (isPendingReviewStatus_(row[C.STATUS_REVIEW])) throw new Error('CGT_TANGGAL_PHL_TIDAK_VALID: baris ' + (i + 2));
      continue;
    }
    if (resolver(date) !== periode) continue;
    if (scope.konflik) throw new Error('CGT_KLASIFIKASI_PHL_BERUBAH: baris ' + (i + 2));
    out.totalLaporan++;
    if (isPendingReviewStatus_(row[C.STATUS_REVIEW])) {
      out.menungguReview++;
      out.items.push(ringkasRowCgtV02_(row, scope, date, 'PHL', i + 2));
    }
  }
  return out;
}

function bacaBatchCgtV02ReadOnly_(periode) {
  // Jangan panggil ensureSheet... dari endpoint diagnostik: pemeriksaan tidak membuat/menulis sheet.
  var sh = getSS_().getSheetByName('Rekap_Tunjangan_Bulanan');
  if (!sh || sh.getLastRow() < 2) return null;
  var data = sh.getRange(1, 1, sh.getLastRow(), 34).getValues();
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN, rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Sisa metadata tanpa periode tidak ditebak dan tidak dibersihkan oleh patch ini.
    if (row[C.PERIODE] === '' || row[C.PERIODE] == null) continue;
    if (periodeKeyTunjangan_(row[C.PERIODE], false) !== periode) continue;
    var active = row[C.IS_ACTIVE];
    if (!(nilaiAktifEksplisitTunjangan_(active) || active === '')) continue;
    if (!nilaiAktifEksplisitTunjangan_(active)) throw new Error('CGT_BATCH_STATUS_AKTIF_TIDAK_EKSPLISIT');
    rows.push({ rowIndex: i + 1, values: row });
  }
  if (!rows.length) return null;
  var first = rows[0].values, batchId = String(first[C.BATCH_ID] || '');
  if (!batchId) throw new Error('CGT_BATCH_ID_KOSONG');
  var meta = metadataRawConsistencyTunjangan_(first), seen = Object.create(null), total = 0;
  rows.forEach(function (item) {
    var r = item.values, id = normalizeId_(r[C.ID_USER]);
    if (!id || seen[id]) throw new Error('CGT_IDENTITAS_BATCH_KOSONG_ATAU_DUPLIKAT');
    seen[id] = true;
    if (String(r[C.BATCH_ID] || '') !== batchId || String(r[C.STATUS_REKAP] || '') !== String(first[C.STATUS_REKAP] || '')) {
      throw new Error('CGT_BATCH_AKTIF_TIDAK_KONSISTEN');
    }
    var m = metadataRawConsistencyTunjangan_(r);
    if (m.tanggalMulaiPeriode !== meta.tanggalMulaiPeriode || m.tanggalAkhirPeriode !== meta.tanggalAkhirPeriode || m.tanggalCutoff !== meta.tanggalCutoff) {
      throw new Error('CGT_METADATA_BATCH_TIDAK_KONSISTEN');
    }
    if (r[C.RP_TOTAL] === '' || r[C.RP_TOTAL] == null || !isFinite(Number(r[C.RP_TOTAL]))) throw new Error('CGT_NOMINAL_BATCH_TIDAK_VALID');
    total += Number(r[C.RP_TOTAL]);
  });
  if (!meta.tanggalMulaiPeriode || !meta.tanggalAkhirPeriode || !meta.tanggalCutoff) throw new Error('CGT_METADATA_BATCH_TIDAK_LENGKAP');
  return { batchId: batchId, status: String(first[C.STATUS_REKAP] || ''), jumlahPegawai: rows.length,
    totalSnapshot: total, meta: metadataBatchTunjanganDariRow_(first) };
}

function halamanDiagnostikCgtV02_(items, params) {
  params = params || {};
  var offset = Number(params.offset || 0), limit = Number(params.limit == null ? 20 : params.limit);
  if (!isFinite(offset) || offset < 0 || Math.floor(offset) !== offset ||
      !isFinite(limit) || limit < 1 || Math.floor(limit) !== limit || limit > 50) throw new Error('CGT_PAGINASI_TIDAK_VALID');
  var group = String(params.kelompok || 'SEMUA');
  if (['SEMUA', 'PENGHAMBAT', 'PHL', 'LEWAT_CUTOFF'].indexOf(group) < 0) throw new Error('CGT_FILTER_TIDAK_VALID');
  var sorted = items.filter(function (item) { return group === 'SEMUA' || item.kelompokPemeriksaan === group; });
  sorted.sort(function (a, b) { return a.waktuLapor.localeCompare(b.waktuLapor) || a.idLaporan.localeCompare(b.idLaporan) || a.nomorBaris - b.nomorBaris; });
  // Fingerprint mendeteksi perubahan hasil antarhalaman; mencegah duplikasi/terlewat diam-diam.
  var fingerprint = sha256Hex(JSON.stringify(sorted));
  if (params.expectedFingerprint && String(params.expectedFingerprint) !== fingerprint) throw new Error('CGT_DAFTAR_BERUBAH: muat ulang dari halaman pertama.');
  return { total: sorted.length, offset: offset, limit: limit, kelompok: group,
    hasMore: offset + limit < sorted.length, fingerprint: fingerprint, items: sorted.slice(offset, offset + limit) };
}

// Endpoint tunggal; otorisasi dilakukan sebelum membaca database. Tidak menerima ID spreadsheet dari client.
function ambilDiagnostikCakupanV02(periode, params, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, checked: false, kode: 'SESSION_EXPIRED', pesan: 'Sesi habis. Silakan login ulang.' };
    params = params || {};
    var mode = String(params.mode || 'TUNJANGAN').toUpperCase();
    var admin = cekHakAksesLurahCarikAdmin_(idUser);
    if (!admin && !(mode === 'TUNJANGAN' && cekHakAksesBendaharaTunjangan(idUser))) {
      return { sukses: false, checked: false, kode: 'ACCESS_DENIED', pesan: 'Akses pemeriksaan ditolak.' };
    }
    if (mode !== 'PHL' && mode !== 'TUNJANGAN') throw new Error('CGT_MODE_TIDAK_VALID');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(periode || ''))) throw new Error('CGT_PERIODE_TIDAK_VALID');
    var p = normalizePeriode_(periode), result;
    // Validasi params sebelum pembacaan yang mahal.
    halamanDiagnostikCgtV02_([], { offset: params.offset, limit: params.limit, kelompok: params.kelompok });
    if (mode === 'PHL') {
      var valid = validasiPeriodeResmiDashboardAdminV37_(p, new Date());
      if (!valid.sukses) return { sukses: false, checked: false, kode: valid.kode, pesan: valid.pesan };
      var data = getSheet_('Rekap_Kinerja').getDataRange().getValues();
      result = ringkasanPhlDashboardCgtV02_(data.slice(1), getPegawaiDataCached_(), buatResolverPeriodeResmiAdminV2A2_(), p);
      return { sukses: true, checked: true, mode: mode, periode: p, versi: CAKUPAN_TUNJANGAN_CGT_V02_VERSION_,
        diperiksaPada: formatTanggalJamClient_(new Date()), readOnly: true,
        ringkasan: { menungguReviewPHL: result.menungguReview, totalLaporanPHL: result.totalLaporan },
        periodeMeta: valid.meta, halaman: halamanDiagnostikCgtV02_(result.items, params),
        pesan: 'Antrean PHL untuk periode pelaporan resmi, terpisah dari filter pegawai dashboard. Tidak mengubah review.' };
    }
    var batch = bacaBatchCgtV02ReadOnly_(p);
    if (!batch) return { sukses: false, checked: false, kode: 'BATCH_NOT_FOUND', pesan: 'Belum ada batch aktif. Pemeriksaan tunjangan belum dapat dijalankan.' };
    if (params.expectedBatchId && String(params.expectedBatchId) !== batch.batchId) throw new Error('CGT_BATCH_BERUBAH: muat ulang pemeriksaan.');
    result = evaluasiPendingLiveCgtV02_(p, batch.meta);
    return { sukses: true, checked: true, mode: mode, periode: p, versi: CAKUPAN_TUNJANGAN_CGT_V02_VERSION_,
      diperiksaPada: formatTanggalJamClient_(new Date()), readOnly: true, batch: batch,
      ringkasan: { penghambatTunjangan: result.count, menungguReviewPHL: result.ignoredPhlCount,
        tanpaImbalanCutoff: result.ignoredLateCount, seluruhPendingDalamRentang: result.rawPendingCount },
      halaman: halamanDiagnostikCgtV02_(result.items, params),
      pesan: 'Pemeriksaan laporan saja. Integritas nominal, perubahan snapshot, dan persetujuan tetap diperiksa saat transisi tunjangan.' };
  } catch (e) {
    return { sukses: false, checked: false, kode: 'CGT_PEMERIKSAAN_GAGAL',
      pesan: 'Pemeriksaan belum berhasil. ' + String(e && e.message || 'Kesalahan pembacaan data.').substring(0, 240) };
  }
}
