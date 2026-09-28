// Tarif v0.3 / CGT v0.2-RC3. Master_Tunjangan tetap sumber tarif.
// Tidak menulis ke sheet, keputusan review, Draft, atau data pembayaran.
// Pencocokan tepat + daftar alias eksplisit; TANPA pencarian sebagian nama.
var TARIF_TUNJANGAN_V03_VERSION_ = 'TARIF-v0.3-2026.09.28.02';
var TARIF_TUNJANGAN_V03_GENERATION_PROPERTY_ = 'MASTER_TUNJANGAN_GENERATION_V03';
var TARIF_TUNJANGAN_V03_LEGACY_KEY_ = 'MasterTunjanganMap';

function kunciJabatanTarifV03_(value) {
  return canonicalizeJabatan_(String(value == null ? '' : value).replace(/\u00a0/g, ' '));
}

function aliasJabatanTarifV03_(value) {
  var key = kunciJabatanTarifV03_(value);
  if (!key) throw new Error('TARIF_JABATAN_KOSONG');
  var found = [key];
  Object.keys(JABATAN_ALIAS_MAPPING).forEach(function (name) {
    var aliases = [name].concat(JABATAN_ALIAS_MAPPING[name]).map(kunciJabatanTarifV03_);
    // Exact membership: alias staf tidak pernah didaftarkan sebagai alias Kaur.
    if (aliases.indexOf(key) >= 0) found = found.concat(aliases);
  });
  return found.filter(function (item, index, all) { return item && all.indexOf(item) === index; }).sort();
}

function jabatanPhlTarifV03_(value) {
  return ['phl', 'staf phl', 'pegawai harian lepas', 'pekerja harian lepas',
    'tenaga harian lepas', 'staf harian lepas'].indexOf(kunciJabatanTarifV03_(value)) >= 0;
}

function nilaiRupiahTarifV03_(value, row, column) {
  if (value == null || String(value).trim() === '') return 0;
  // getValues() mengembalikan sel numerik/formula angka sebagai Number.
  // String berformat mata uang/ribuan ditolak, bukan ditebak atau dipotong.
  var text = String(value).trim();
  var n = typeof value === 'number' ? value : (/^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : NaN);
  if (!isFinite(n) || n < 0 || n > 9007199254740991 || typeof value === 'boolean') {
    throw new Error('TARIF_ANGKA_TIDAK_VALID: Master_Tunjangan baris ' + row + ', kolom ' + column + '. Gunakan sel angka nonnegatif.');
  }
  return n;
}

function registerAliasTepatTarifV03_(map, key, obj) {
  key = kunciJabatanTarifV03_(key);
  if (!key) throw new Error('TARIF_ALIAS_KOSONG');
  if (['__proto__', 'constructor', 'prototype'].indexOf(key) >= 0) throw new Error('TARIF_ALIAS_TIDAK_VALID');
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    var old = map[key];
    if (old.siltap !== obj.siltap || old.maxProd !== obj.maxProd || old.maxTU !== obj.maxTU) {
      throw new Error('TARIF_ALIAS_KONFLIK: "' + key + '" pada baris ' + old.sourceRow + ' dan ' + obj.sourceRow + '. Periksa master; tarif tidak ditimpa.');
    }
    // Duplikat tarif identik diperbolehkan. Pilih sumber deterministik.
    if (String(old.jabatan) < String(obj.jabatan) ||
        (String(old.jabatan) === String(obj.jabatan) && old.sourceRow <= obj.sourceRow)) return;
  }
  map[key] = obj;
}

function bangunMasterTarifV03_(rawData, sourceId) {
  if (!Array.isArray(rawData) || rawData.length < 2) throw new Error('TARIF_MASTER_KOSONG');
  var headerRowIdx = -1;
  for (var r = 0; r < rawData.length; r++) {
    if (Array.isArray(rawData[r]) && findHeaderIndex_(rawData[r], ['Jabatan']) >= 0) { headerRowIdx = r; break; }
  }
  if (headerRowIdx < 0) throw new Error('TARIF_HEADER_JABATAN_TIDAK_DITEMUKAN');
  var headers = rawData[headerRowIdx];
  var ji = findHeaderIndex_(headers, ['Jabatan']);
  var ti = findHeaderIndex_(headers, ['Jumlah Total Tunjangan Kinerja', 'Total Tunjangan Kinerja', 'Total Tunjangan', 'Siltap', 'Besaran Siltap']);
  var pi = findHeaderIndex_(headers, ['Plafon Tunjangan Produktifitas', 'Plafon Tunjangan Produktivitas', 'Plafon Produktifitas', 'Maks Produktifitas', 'Maks Produktivitas', 'Maks Prod']);
  var ui = findHeaderIndex_(headers, ['Plafon Tunjangan Tugas Umum', 'Plafon Tugas Umum', 'Maks Tugas Umum', 'Maks TU']);
  if (ti < 0 && (pi < 0 || ui < 0)) throw new Error('TARIF_HEADER_NOMINAL_TIDAK_LENGKAP');
  var byJabatan = Object.create(null), sourceRows = [], warnings = [];
  for (var i = headerRowIdx + 1; i < rawData.length; i++) {
    var row = rawData[i] || [], job = String(row[ji] == null ? '' : row[ji]).trim();
    if (!job || job === '-') {
      if ([ti, pi, ui].some(function (idx) { return idx >= 0 && row[idx] != null && String(row[idx]).trim() !== ''; })) {
        throw new Error('TARIF_JABATAN_BARIS_KOSONG: baris ' + (i + 1));
      }
      continue;
    }
    var total = ti >= 0 ? nilaiRupiahTarifV03_(row[ti], i + 1, ti + 1) : 0;
    var prod = pi >= 0 ? nilaiRupiahTarifV03_(row[pi], i + 1, pi + 1) : 0;
    var umum = ui >= 0 ? nilaiRupiahTarifV03_(row[ui], i + 1, ui + 1) : 0;
    // Mempertahankan kebijakan fallback lama secara eksplisit. Bukan perubahan hak.
    if ((!prod || !umum) && total > 0) {
      prod = Math.round(total * 0.40); umum = Math.round(total * 0.20);
      warnings.push({ code: 'FALLBACK_40_20_LAMA', row: i + 1, jabatan: job });
    }
    var obj = { jabatan: job, siltap: total, maxProd: prod, maxTU: umum, sourceRow: i + 1 };
    registerJabatanAliases_(byJabatan, kunciJabatanTarifV03_(job), obj);
    sourceRows.push(obj);
  }
  if (!sourceRows.length) throw new Error('TARIF_MASTER_TANPA_BARIS');
  return { byId: {}, byJabatan: byJabatan, sourceRows: sourceRows, warnings: warnings,
    sourceId: String(sourceId || ''), version: TARIF_TUNJANGAN_V03_VERSION_,
    sourceHash: sha256Hex(JSON.stringify(sourceRows)), headerRow: headerRowIdx + 1 };
}

function resolveTarifDariMasterV03_(master, jabatan) {
  var key = kunciJabatanTarifV03_(jabatan);
  if (!key) throw new Error('TARIF_JABATAN_KOSONG');
  if (jabatanPhlTarifV03_(key)) return { jabatan: String(jabatan), siltap: 0, maxProd: 0, maxTU: 0, sourceRow: null, excludedPHL: true };
  if (!master || master.version !== TARIF_TUNJANGAN_V03_VERSION_ || !master.byJabatan) throw new Error('TARIF_MASTER_TIDAK_VALID');
  if (!Object.prototype.hasOwnProperty.call(master.byJabatan, key)) {
    throw new Error('TARIF_JABATAN_TIDAK_DITEMUKAN: "' + String(jabatan) + '". Tambahkan/periksa baris master yang sah; tidak memakai tarif jabatan lain.');
  }
  // Salinan hasil: caller tidak dapat merusak objek cache bersama.
  var o = master.byJabatan[key];
  return { jabatan: o.jabatan, siltap: o.siltap, maxProd: o.maxProd, maxTU: o.maxTU, sourceRow: o.sourceRow };
}

function bacaKonteksCacheTarifV03_() {
  var props = PropertiesService.getScriptProperties();
  var sourceId = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  if (!sourceId) throw new Error('TARIF_SPREADSHEET_ID_KOSONG');
  var generation = String(props.getProperty(TARIF_TUNJANGAN_V03_GENERATION_PROPERTY_) || '0');
  var ttl = Math.min(3600, Math.max(1, Math.floor(Number(MASTER_TUNJANGAN_CACHE_TTL) || 3600)));
  var tag = sha256Hex(sourceId + '|' + generation + '|' + TARIF_TUNJANGAN_V03_VERSION_).slice(0, 32);
  return { sourceId: sourceId, generation: generation, ttl: ttl, tag: tag,
    key: MASTER_TUNJANGAN_CACHE_KEY + '_' + tag };
}

function validasiEnvelopeCacheTarifV03_(e, ctx, now) {
  try {
  if (!e || e.version !== TARIF_TUNJANGAN_V03_VERSION_ || e.sourceId !== ctx.sourceId ||
      e.generation !== ctx.generation || typeof e.createdAt !== 'number' || typeof e.expiresAt !== 'number' ||
      !isFinite(e.createdAt) || !isFinite(e.expiresAt) || e.createdAt > now || e.expiresAt <= now ||
      e.expiresAt <= e.createdAt || e.expiresAt - e.createdAt > ctx.ttl * 1000) return false;
  var map = e.map;
  if (!map || map.version !== e.version || map.sourceId !== e.sourceId ||
      !Array.isArray(map.sourceRows) || !map.sourceRows.length || !map.byJabatan) return false;
  if (map.sourceHash !== sha256Hex(JSON.stringify(map.sourceRows))) return false;
  var keys = Object.keys(map.byJabatan);
  if (!keys.length) return false;
  for (var i = 0; i < keys.length; i++) {
    var obj = map.byJabatan[keys[i]];
    if (!obj || aliasJabatanTarifV03_(obj.jabatan).indexOf(keys[i]) < 0) return false;
    if (![obj.siltap, obj.maxProd, obj.maxTU].every(function (n) { return typeof n === 'number' && isFinite(n) && n >= 0; })) return false;
    if (!map.sourceRows.some(function (row) { return row.jabatan === obj.jabatan && row.sourceRow === obj.sourceRow && row.siltap === obj.siltap && row.maxProd === obj.maxProd && row.maxTU === obj.maxTU; })) return false;
  }
  for (var j = 0; j < map.sourceRows.length; j++) {
    var aliases = aliasJabatanTarifV03_(map.sourceRows[j].jabatan);
    for (var k = 0; k < aliases.length; k++) if (!Object.prototype.hasOwnProperty.call(map.byJabatan, aliases[k])) return false;
  }
  return true;
  } catch (cacheShapeError) { return false; }
}

function simpanEnvelopeCacheTarifV03_(map, ctx) {
  if (map.sourceId !== ctx.sourceId) throw new Error('TARIF_DATABASE_BERUBAH_MUAT_ULANG');
  var now = Date.now();
  var e = { version: TARIF_TUNJANGAN_V03_VERSION_, sourceId: ctx.sourceId,
    generation: ctx.generation, createdAt: now, expiresAt: now + ctx.ttl * 1000, map: map };
  PORTAL_RUNTIME_CACHE_.masterTarifV03 = e;
  try { CacheService.getScriptCache().put(ctx.key, JSON.stringify(e), ctx.ttl); }
  catch (err) { Logger.log('Cache tarif tidak tersimpan; data master segar tetap digunakan.'); }
  // Tidak pernah menyimpan/membaca map tarif permanen dalam Script Properties.
  return map;
}

function ambilMasterCacheTarifV03_() {
  var ctx = bacaKonteksCacheTarifV03_(), e = PORTAL_RUNTIME_CACHE_.masterTarifV03, now = Date.now();
  if (validasiEnvelopeCacheTarifV03_(e, ctx, now)) return e.map;
  try {
    var raw = CacheService.getScriptCache().get(ctx.key);
    if (raw) {
      e = JSON.parse(raw);
      if (validasiEnvelopeCacheTarifV03_(e, ctx, now)) { PORTAL_RUNTIME_CACHE_.masterTarifV03 = e; return e.map; }
    }
  } catch (err) { Logger.log('Cache tarif tidak dapat digunakan; baca Master_Tunjangan.'); }
  PORTAL_RUNTIME_CACHE_.masterTarifV03 = null;
  return simpanEnvelopeCacheTarifV03_(getMasterTunjanganMap_(), ctx);
}

function tandaCacheTurunanTarifV03_() {
  return '_TARIFV03_' + bacaKonteksCacheTarifV03_().tag;
}

function refreshCacheTarifInternalV03_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('TARIF_REFRESH_SIBUK');
  try {
    var props = PropertiesService.getScriptProperties(), old = bacaKonteksCacheTarifV03_();
    var next = String(Date.now()) + '_' + Utilities.getUuid();
    props.setProperty(TARIF_TUNJANGAN_V03_GENERATION_PROPERTY_, next);
    if (props.getProperty(TARIF_TUNJANGAN_V03_GENERATION_PROPERTY_) !== next) throw new Error('TARIF_GENERATION_TIDAK_TERSIMPAN');
    PORTAL_RUNTIME_CACHE_.masterTarifV03 = null;
    PORTAL_RUNTIME_CACHE_.scriptPropertiesSnapshot = null;
    PORTAL_RUNTIME_CACHE_.adminDashboardBaseByPeriodV2A2 = {};
    PORTAL_RUNTIME_CACHE_.adminDashboardDetailByKeyV2A2 = {};
    // Penghapusan tertarget, tidak menyentuh PIN_PEPPER, sesi, atau properti periode.
    props.deleteProperty(TARIF_TUNJANGAN_V03_LEGACY_KEY_);
    try { CacheService.getScriptCache().removeAll([TARIF_TUNJANGAN_V03_LEGACY_KEY_, old.key]); }
    catch (cacheErr) { Logger.log('Cache lama tidak terhapus; generation baru tetap mengisolasinya.'); }
    invalidasiCacheAdminDashboardV2A2_();
    var context = bacaKonteksCacheTarifV03_();
    var map = getMasterTunjanganMap_(); // Gagal => hentikan; tidak kembali ke cache lama.
    simpanEnvelopeCacheTarifV03_(map, context);
    return { sukses: true, versi: TARIF_TUNJANGAN_V03_VERSION_, jumlahBarisMaster: map.sourceRows.length,
      sumberHash: map.sourceHash, warnings: map.warnings, dataSpreadsheetDiubah: false,
      cacheDiubah: true, pesan: 'Cache tarif dibangun ulang dari Master_Tunjangan. Draft tersimpan tidak diubah.' };
  } finally { lock.releaseLock(); }
}

function maintenanceRefreshMasterTunjanganV03() {
  pastikanMaintainerPortal3B0_('REFRESH_MASTER_TUNJANGAN_V03');
  var result = refreshMasterTunjanganCache_();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function auditTarifTunjanganV03() {
  pastikanMaintainerPortal3B0_('AUDIT_TARIF_TUNJANGAN_V03');
  var master = getMasterTunjanganMap_();
  var rows = getSS_().getSheetByName('Data_Pegawai').getDataRange().getValues();
  var P = SHEET_COLUMNS.DATA_PEGAWAI, hasil = [], masalah = [], dilewati = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i], id = normalizeId_(row[P.ID]), nama = String(row[P.NAMA] || '').trim(), jabatan = String(row[P.JABATAN] || '').trim();
    if (!id && !nama) continue; // Tidak ada identitas orang pada baris ini.
    if (!nama && String(row[P.STATUS] || '').trim().toLowerCase() === 'nonaktif') {
      dilewati.push({baris: i + 1, jabatan: jabatan, kode: 'NONAKTIF_TANPA_NAMA'});
      continue; // Sama dengan kalkulator: tanpa nama tidak dimasukkan; data tetap utuh.
    }
    if (!id || !nama || !jabatan) { masalah.push({baris: i + 1, kode: 'IDENTITAS_TIDAK_LENGKAP'}); continue; }
    try {
      var rate = resolveTarifDariMasterV03_(master, jabatan);
      hasil.push({ barisPegawai: i + 1, nama: nama, jabatan: jabatan,
        jabatanMaster: rate.jabatan, barisMaster: rate.sourceRow,
        maxProd: rate.maxProd, maxTU: rate.maxTU, diLuarTunjanganPHL: rate.excludedPHL === true });
    } catch (err) { masalah.push({ baris: i + 1, jabatan: jabatan, kode: String(err.message || err) }); }
  }
  var result = { sukses: masalah.length === 0, versi: TARIF_TUNJANGAN_V03_VERSION_,
    jumlahMaster: master.sourceRows.length, jumlahPegawaiDiperiksa: hasil.length,
    sumberHash: master.sourceHash, hasil: hasil, masalah: masalah, dilewati: dilewati, warnings: master.warnings,
    dataSpreadsheetDiubah: false, cacheDiubah: false,
    pesan: 'Audit kecocokan tarif terhadap master saat ini, bukan persetujuan nominal/hak pembayaran.' };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function konteksCutoffDraftTarifV03_(periode, meta) {
  // Setara dengan konteks sesudah simpanCutoffTunjanganPeriode_, tetapi di memori.
  // Memungkinkan validasi/perhitungan selesai sebelum mengubah properti atau Draft.
  var old = buatKonteksCutoff3B04C1c_();
  var p = normalizePeriode_(periode);
  var range = buatRangeCutoff3B04C1c_(p, meta, 'CUTOFF_TUNJANGAN_ADMIN');
  if (!range) throw new Error('TARIF_KONTEKS_DRAFT_TIDAK_VALID');
  var byPeriod = {};
  Object.keys(old.byPeriod || {}).forEach(function (key) { byPeriod[key] = old.byPeriod[key]; });
  byPeriod[p] = range;
  var ranges = (old.ranges || []).filter(function (item) { return item.periode !== p; }).concat([range]);
  ranges.sort(function (a, b) { return a.start.getTime() - b.start.getTime() || String(a.periode).localeCompare(String(b.periode)); });
  return { byPeriod: byPeriod, ranges: ranges, totalRanges: ranges.length, sumberDefaultDigunakan: false };
}
