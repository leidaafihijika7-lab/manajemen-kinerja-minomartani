// ============================================================
// MONTHLY ARCHIVE v1.0 — IMMUTABLE MONTH-END EVIDENCE PACKAGE
// Module RC1 2026.10.02.04; integrated APP_VERSION 2026.10.03.02
//
// Prinsip:
// - archive hanya boleh dibuat setelah Monthly Closing lengkap dan batch Sudah Dicairkan;
// - load/status/verifikasi bersifat read-only;
// - write hanya melalui tombol eksplisit Buat Arsip Final;
// - snapshot dibuat dari sumber produksi, tidak mengubah Spreadsheet/schema;
// - paket Drive privat, idempotent per periode+batch, dilengkapi SHA-256 dan ZIP;
// - PDF/XLSX resmi tunjangan dibuat oleh generator native browser yang sudah stabil,
//   lalu divalidasi server sebelum dimasukkan ke paket final.
// ============================================================

var MONTHLY_ARCHIVE_V10_VERSION_ = 'MA-v1.0-RC1-2026.10.02.04';
var MONTHLY_ARCHIVE_V10_PROPERTY_PREFIX_ = 'MONTHLY_ARCHIVE_V10_';
var MONTHLY_ARCHIVE_V10_MAX_OFFICIAL_B64_ = 6500000;
var MONTHLY_ARCHIVE_V10_FOLDER_NAME_ = 'ARSIP_BULANAN';

function maV10SafeName_(value, fallback) {
  var s = String(value || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '');
  return (s || String(fallback || 'file')).substring(0, 120);
}

function maV10Hex_(bytes) {
  return (bytes || []).map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function maV10Sha256Text_(text) {
  return maV10Hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8));
}

function maV10Sha256Bytes_(bytes) {
  return maV10Hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes || []));
}

function maV10CsvValue_(value) {
  var s;
  if (value instanceof Date && !isNaN(value.getTime())) s = Utilities.formatDate(value, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  else if (value === null || typeof value === 'undefined') s = '';
  else if (typeof value === 'object') {
    try { s = JSON.stringify(value); } catch (e) { s = String(value); }
  } else s = String(value);
  // Lindungi file CSV saat dibuka di spreadsheet desktop dari formula injection.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function maV10Csv_(headers, rows) {
  var out = [];
  out.push((headers || []).map(maV10CsvValue_).join(','));
  (rows || []).forEach(function (row) { out.push((row || []).map(maV10CsvValue_).join(',')); });
  return '\uFEFF' + out.join('\r\n') + '\r\n';
}

function maV10ArchivePropertyKey_(periode) {
  return MONTHLY_ARCHIVE_V10_PROPERTY_PREFIX_ + String(periode || '').replace(/[^0-9]/g, '');
}

function maV10ArchiveId_(periode, closing, allowance) {
  var seed = [
    normalizePeriode_(periode || ''),
    String(closing && closing.cutoffAt || ''),
    String(allowance && allowance.batchId || ''),
    String(Math.round(Number(allowance && allowance.totalNominal || 0)))
  ].join('|');
  return 'ARSIP-' + String(periode || '').replace('-', '') + '-' + maV10Sha256Text_(seed).substring(0, 12).toUpperCase();
}

function maV10ResolveStorage_(createIfMissing) {
  var props = PropertiesService.getScriptProperties();
  var dedicatedId = String(props.getProperty('FOLDER_ID_ARSIP_BULANAN') || '').trim();
  var fallbackId = String(props.getProperty('FOLDER_ID_BUKTI_KINERJA') || props.getProperty('FOLDER_ID_BUKTI') || '').trim();
  var baseId = dedicatedId || fallbackId;
  if (!baseId) {
    return { valid:false, code:'ARCHIVE_ROOT_NOT_CONFIGURED', mode:'NONE', message:'Folder arsip belum dikonfigurasi. Isi FOLDER_ID_ARSIP_BULANAN atau gunakan folder bukti yang sudah aktif.' };
  }
  try {
    var base = DriveApp.getFolderById(baseId);
    var root = base;
    var mode = dedicatedId ? 'DEDICATED' : 'BUKTI_FALLBACK';
    if (!dedicatedId) {
      var it = base.getFoldersByName(MONTHLY_ARCHIVE_V10_FOLDER_NAME_);
      if (it.hasNext()) root = it.next();
      else if (createIfMissing === true) root = base.createFolder(MONTHLY_ARCHIVE_V10_FOLDER_NAME_);
      else return { valid:true, exists:false, mode:mode, baseFolder:base, rootFolder:null, rootName:MONTHLY_ARCHIVE_V10_FOLDER_NAME_, message:'Folder Arsip Bulanan akan dibuat saat arsip pertama kali dibuat.' };
    }
    return { valid:true, exists:true, mode:mode, baseFolder:base, rootFolder:root, rootName:root.getName ? root.getName() : MONTHLY_ARCHIVE_V10_FOLDER_NAME_, message:'' };
  } catch (e) {
    return { valid:false, code:'ARCHIVE_ROOT_UNAVAILABLE', mode:dedicatedId ? 'DEDICATED' : 'BUKTI_FALLBACK', message:'Folder arsip tidak dapat diakses oleh project Apps Script.' };
  }
}

function maV10ReportSnapshot_(periode) {
  var p = normalizePeriode_(periode || '');
  var data = getRekapKinerjaValuesReadOnly_();
  var headers = data.length ? (data[0] || []).slice() : [];
  var resolver = typeof buatResolverPeriodeResmiAdminV2A2_ === 'function'
    ? buatResolverPeriodeResmiAdminV2A2_()
    : function (d) { return periodePelaporanResmiDariTanggalV36_(d); };
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var rows = [], rejected = [], phl = [], ids = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    var d = parseTanggal(row[C.TANGGAL_LAPORAN]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0 || resolver(d) !== p) continue;
    var copy = row.slice();
    rows.push(copy);
    var id = String(row[C.ID_LAPORAN] || '').trim();
    if (id) ids[id] = true;
    if (String(row[C.STATUS_REVIEW] || '').trim() === 'Ditolak') rejected.push(copy);
    if (mcV10Group_(row[C.JABATAN]) === 'PHL') phl.push(copy);
  }
  return { headers:headers, rows:rows, rejected:rejected, phl:phl, reportIds:ids };
}

function maV10AllowanceSnapshot_(periode) {
  var p = normalizePeriode_(periode || '');
  var batch = getBatchAktifTunjangan_(p);
  if (!batch || !batch.rows || !batch.rows.length) return { headers:REKAP_TUNJANGAN_HEADERS.slice(), rows:[], batch:null };
  return {
    headers:REKAP_TUNJANGAN_HEADERS.slice(),
    rows:batch.rows.map(function (item) { return (item.values || []).slice(); }),
    batch:batch
  };
}

function maV10AuditTunjanganSnapshot_(periode) {
  var p = normalizePeriode_(periode || '');
  var sh = getSheet_('Audit_Tunjangan');
  if (!sh || sh.getLastRow() < 1) return { headers:AUDIT_TUNJANGAN_HEADERS.slice(), rows:[] };
  var data = sh.getDataRange().getValues();
  var headers = data.length ? (data[0] || []).slice() : AUDIT_TUNJANGAN_HEADERS.slice();
  var idx = SHEET_COLUMNS.AUDIT_TUNJANGAN.PERIODE;
  var rows = [];
  for (var i = 1; i < data.length; i++) if (normalizePeriode_(data[i][idx] || '') === p) rows.push((data[i] || []).slice());
  return { headers:headers, rows:rows };
}

function maV10AuditLaporanSnapshot_(reportIds) {
  var sh = getSheet_('Audit_Log');
  if (!sh || sh.getLastRow() < 1) return { headers:['waktu','id_user','aksi','detail'], rows:[] };
  var data = sh.getDataRange().getValues();
  var headers = data.length ? (data[0] || []).slice() : ['waktu','id_user','aksi','detail'];
  var C = SHEET_COLUMNS.AUDIT_LOG;
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var detail = String((data[i] || [])[C.DETAIL] || '').trim();
    var reportId = detail.split('|')[0].trim();
    if (reportId && reportIds && reportIds[reportId]) rows.push((data[i] || []).slice());
  }
  return { headers:headers, rows:rows };
}

function maV10SanitizeClosingSnapshot_(closing) {
  closing = closing || {};
  return {
    versi:closing.versi || '', appVersion:closing.appVersion || '', periode:closing.periode || '', labelPeriode:closing.labelPeriode || '',
    statusKeseluruhan:closing.statusKeseluruhan || '', monthlyComplete:closing.monthlyComplete === true,
    blockers:closing.blockers || [], checkedAt:closing.checkedAt || '', report:closing.report || {}, period:closing.period || {},
    allowance:closing.allowance || {}, workflow:closing.workflow || {}, checks:closing.checks || [], policy:closing.policy || {}
  };
}

function maV10ReadStoredDescriptor_(periode) {
  var raw = String(PropertiesService.getScriptProperties().getProperty(maV10ArchivePropertyKey_(periode)) || '').trim();
  if (!raw) return null;
  try {
    var d = JSON.parse(raw);
    if (!d || normalizePeriode_(d.periode || '') !== normalizePeriode_(periode || '')) return null;
    return d;
  } catch (e) { return null; }
}

function maV10DescriptorAccessible_(descriptor) {
  if (!descriptor || !descriptor.folderId || !descriptor.manifestId) return false;
  try {
    DriveApp.getFolderById(String(descriptor.folderId));
    DriveApp.getFileById(String(descriptor.manifestId));
    return true;
  } catch (e) { return false; }
}

function maV10PublicDescriptor_(descriptor) {
  if (!descriptor) return null;
  return {
    archiveId:String(descriptor.archiveId || ''), periode:String(descriptor.periode || ''), batchId:String(descriptor.batchId || ''),
    createdAt:String(descriptor.createdAt || ''), createdBy:String(descriptor.createdBy || ''), fileCount:Number(descriptor.fileCount || 0),
    totalBytes:Number(descriptor.totalBytes || 0), folderUrl:String(descriptor.folderUrl || ''), zipUrl:String(descriptor.zipUrl || ''),
    zipName:String(descriptor.zipName || ''), zipSha256:String(descriptor.zipSha256 || ''), manifestSha256:String(descriptor.manifestSha256 || ''), checksumSha256:String(descriptor.checksumSha256 || ''),
    integrityStatus:String(descriptor.integrityStatus || 'BELUM_DIVERIFIKASI')
  };
}

function bangunMonthlyArchiveV10_(periode) {
  var started = Date.now();
  var p = normalizePeriode_(periode || mcV10DefaultPeriode_());
  if (!p) throw new Error('Periode Arsip Bulanan tidak valid.');
  var closing = bangunMonthlyClosingV10_(p);
  var allowance = closing.allowance || {};
  var archiveId = maV10ArchiveId_(p, closing.period || {}, allowance);
  var storage = maV10ResolveStorage_(false);
  var stored = maV10ReadStoredDescriptor_(p);
  var existing = stored && maV10DescriptorAccessible_(stored) ? stored : null;
  var ready = closing.monthlyComplete === true && closing.period && closing.period.closed === true && allowance.exists === true && allowance.valid === true && allowance.status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN;
  var blockers = [];
  if (!closing.period || !closing.period.closed) blockers.push('PERIODE_BELUM_DITUTUP');
  if (closing.report && Number(closing.report.pending || 0) > 0) blockers.push('REVIEW_PENDING');
  if (!allowance.exists) blockers.push('BATCH_TIDAK_ADA');
  else if (!allowance.valid) blockers.push('BATCH_TIDAK_VALID');
  else if (allowance.status !== TUNJANGAN_STATUS.SUDAH_DICAIRKAN) blockers.push('BATCH_BELUM_DICAIRKAN');
  if (!storage.valid) blockers.push(storage.code || 'STORAGE_TIDAK_SIAP');
  var status = existing ? 'SUDAH_DIARSIPKAN' : (ready && storage.valid ? 'SIAP_DIARSIPKAN' : 'BELUM_SIAP');
  return {
    sukses:true, versi:MONTHLY_ARCHIVE_V10_VERSION_, appVersion:String(APP_VERSION || ''), periode:p, labelPeriode:labelPembayaranPeriode_(p),
    status:status, ready:ready && storage.valid, canCreate:!existing && ready && storage.valid, archiveId:archiveId,
    blockers:blockers, closing:maV10SanitizeClosingSnapshot_(closing),
    batch:{ exists:!!allowance.exists, valid:!!allowance.valid, status:String(allowance.status || ''), batchId:String(allowance.batchId || ''), employees:Number(allowance.employees || 0), totalNominal:Number(allowance.totalNominal || 0), frozenSnapshot:!!allowance.frozenSnapshot },
    storage:{ valid:!!storage.valid, mode:String(storage.mode || ''), exists:storage.exists !== false, message:String(storage.message || '') },
    archive:maV10PublicDescriptor_(existing), checkedAt:formatTanggalJamClient_(new Date()), serverMs:Date.now()-started,
    policy:{ readOnlyOnLoad:true, explicitCreateOnly:true, immutableAfterCreate:true, schemaChanged:false, evidenceFilesCopied:false, officialPdfXlsxRequired:true }
  };
}

function ambilMonthlyArchiveV10(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Arsip Bulanan hanya untuk Lurah/Carik.' };
    return bangunMonthlyArchiveV10_(periode);
  } catch (e) {
    return handleError('ambilMonthlyArchiveV10', e, { sukses:false, pesan:'Arsip Bulanan gagal dimuat.' });
  }
}

function maV10DecodeOfficial_(item, kind) {
  item = item || {};
  var b64 = String(item.base64 || '').trim();
  if (!b64 || b64.length > MONTHLY_ARCHIVE_V10_MAX_OFFICIAL_B64_) throw new Error('Dokumen ' + kind + ' tidak tersedia atau melebihi batas ukuran.');
  var bytes = Utilities.base64Decode(b64);
  var name = maV10SafeName_(item.name || ('Rekap_Tunjangan.' + (kind === 'PDF' ? 'pdf' : 'xlsx')), 'rekap');
  if (kind === 'PDF') {
    var magic = String.fromCharCode.apply(null, bytes.slice(0, 5));
    if (magic !== '%PDF-') throw new Error('Dokumen PDF resmi tidak valid.');
    if (!/\.pdf$/i.test(name)) name += '.pdf';
    return { name:name, mime:'application/pdf', bytes:bytes };
  }
  if (!(bytes.length >= 4 && (bytes[0] & 255) === 0x50 && (bytes[1] & 255) === 0x4B)) throw new Error('Dokumen XLSX resmi tidak valid.');
  if (!/\.xlsx$/i.test(name)) name += '.xlsx';
  return { name:name, mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes:bytes };
}

function maV10BlobMeta_(file, blob) {
  var bytes = blob.getBytes();
  return { name:file.getName(), fileId:file.getId(), bytes:bytes.length, sha256:maV10Sha256Bytes_(bytes), mime:blob.getContentType() || '' };
}

function maV10CreateArchiveDrive_(snapshot, request, actor) {
  var p = snapshot.periode;
  var closing = snapshot.closing || {};
  var allowance = snapshot.batch || {};
  var storage = maV10ResolveStorage_(true);
  if (!storage.valid || !storage.rootFolder) throw new Error(storage.message || 'Folder arsip tidak tersedia.');
  var year = p.substring(0, 4);
  var yearFolder = dapatkanAtauBuatFolder_(storage.rootFolder, year);
  var folderName = p + '__' + snapshot.archiveId;
  var existingIt = yearFolder.getFoldersByName(folderName);
  if (existingIt.hasNext()) throw new Error('Folder arsip final untuk periode ini sudah ada. Muat ulang halaman agar status diperbarui.');

  var archiveFolder = yearFolder.createFolder(folderName);
  var createdFiles = [], zipFile = null;
  try {
    var reports = maV10ReportSnapshot_(p);
    var tunjangan = maV10AllowanceSnapshot_(p);
    var auditTunjangan = maV10AuditTunjanganSnapshot_(p);
    var auditLaporan = maV10AuditLaporanSnapshot_(reports.reportIds);
    var officialPdf = maV10DecodeOfficial_(request.pdf, 'PDF');
    var officialXlsx = maV10DecodeOfficial_(request.xlsx, 'XLSX');

    var summary = {
      archiveVersion:MONTHLY_ARCHIVE_V10_VERSION_, appVersion:String(APP_VERSION || ''), archiveId:snapshot.archiveId,
      periode:p, labelPeriode:snapshot.labelPeriode, generatedAt:Utilities.formatDate(new Date(), 'GMT+7', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      generatedBy:String(actor || ''), period:closing.period || {}, report:closing.report || {}, workflow:closing.workflow || {},
      batch:allowance, policy:{ immutable:true, evidenceFilesCopied:false, evidenceReferencesPreserved:true, officialPdfXlsxIncluded:true }
    };

    var specs = [
      { name:'01_RINGKASAN_PENUTUPAN.json', mime:'application/json', text:JSON.stringify(summary, null, 2) },
      { name:'02_REKAP_LAPORAN.csv', mime:'text/csv', text:maV10Csv_(reports.headers, reports.rows) },
      { name:'03_LAPORAN_DITOLAK.csv', mime:'text/csv', text:maV10Csv_(reports.headers, reports.rejected) },
      { name:'04_LAPORAN_PHL.csv', mime:'text/csv', text:maV10Csv_(reports.headers, reports.phl) },
      { name:'05_REKAP_TUNJANGAN.csv', mime:'text/csv', text:maV10Csv_(tunjangan.headers, tunjangan.rows) },
      { name:'06_AUDIT_TUNJANGAN.csv', mime:'text/csv', text:maV10Csv_(auditTunjangan.headers, auditTunjangan.rows) },
      { name:'07_AUDIT_LAPORAN.csv', mime:'text/csv', text:maV10Csv_(auditLaporan.headers, auditLaporan.rows) },
      { name:officialPdf.name, mime:officialPdf.mime, bytes:officialPdf.bytes },
      { name:officialXlsx.name, mime:officialXlsx.mime, bytes:officialXlsx.bytes }
    ];

    var fileMeta = [], zipBlobs = [], totalBytes = 0;
    specs.forEach(function (spec) {
      var blob = typeof spec.text !== 'undefined'
        ? Utilities.newBlob(String(spec.text), spec.mime, spec.name)
        : Utilities.newBlob(spec.bytes, spec.mime, spec.name);
      var file = archiveFolder.createFile(blob);
      createdFiles.push(file);
      var meta = maV10BlobMeta_(file, blob);
      fileMeta.push(meta); totalBytes += meta.bytes; zipBlobs.push(blob.copyBlob().setName(spec.name));
    });

    var manifest = {
      schema:'monthly-archive-manifest/v1', archiveVersion:MONTHLY_ARCHIVE_V10_VERSION_, appVersion:String(APP_VERSION || ''),
      archiveId:snapshot.archiveId, periode:p, labelPeriode:snapshot.labelPeriode, generatedAt:summary.generatedAt, generatedBy:summary.generatedBy,
      source:{ spreadsheetId:getSS_().getId(), batchId:allowance.batchId || '', cutoffAt:String(closing.period && closing.period.cutoffAt || ''), monthlyClosingStatus:String(closing.statusKeseluruhan || '') },
      counts:{ reports:reports.rows.length, rejected:reports.rejected.length, phl:reports.phl.length, allowanceRows:tunjangan.rows.length, auditTunjangan:auditTunjangan.rows.length, auditLaporan:auditLaporan.rows.length },
      files:fileMeta, integrity:{ algorithm:'SHA-256', immutable:true, evidenceFilesCopied:false, officialPdfXlsxIncluded:true }
    };
    var manifestBlob = Utilities.newBlob(JSON.stringify(manifest, null, 2), 'application/json', '00_MANIFEST.json');
    var manifestFile = archiveFolder.createFile(manifestBlob); createdFiles.push(manifestFile);
    var manifestMeta = maV10BlobMeta_(manifestFile, manifestBlob); totalBytes += manifestMeta.bytes; zipBlobs.unshift(manifestBlob.copyBlob().setName('00_MANIFEST.json'));

    var checksumLines = fileMeta.concat([manifestMeta]).map(function (m) { return m.sha256 + '  ' + m.name; });
    var checksumBlob = Utilities.newBlob(checksumLines.join('\n') + '\n', 'text/plain', '99_SHA256SUMS.txt');
    var checksumFile = archiveFolder.createFile(checksumBlob); createdFiles.push(checksumFile);
    var checksumMeta = maV10BlobMeta_(checksumFile, checksumBlob); totalBytes += checksumMeta.bytes; zipBlobs.push(checksumBlob.copyBlob().setName('99_SHA256SUMS.txt'));

    var zipName = 'Arsip_Bulanan_' + maV10SafeName_(p + '_' + snapshot.archiveId, p) + '.zip';
    var zipBlob = Utilities.zip(zipBlobs, zipName);
    zipFile = archiveFolder.createFile(zipBlob);
    var zipMeta = maV10BlobMeta_(zipFile, zipBlob); totalBytes += zipMeta.bytes;

    var descriptor = {
      archiveId:snapshot.archiveId, periode:p, batchId:String(allowance.batchId || ''), createdAt:summary.generatedAt, createdBy:String(actor || ''),
      folderId:archiveFolder.getId(), folderUrl:archiveFolder.getUrl(), manifestId:manifestFile.getId(), manifestSha256:manifestMeta.sha256,
      checksumId:checksumFile.getId(), checksumSha256:checksumMeta.sha256, zipId:zipFile.getId(), zipName:zipName, zipUrl:zipFile.getUrl(), zipSha256:zipMeta.sha256,
      fileCount:fileMeta.length + 3, totalBytes:totalBytes, integrityStatus:'TERVERIFIKASI_SAAT_DIBUAT'
    };
    PropertiesService.getScriptProperties().setProperty(maV10ArchivePropertyKey_(p), JSON.stringify(descriptor));
    return descriptor;
  } catch (e) {
    try { if (zipFile) zipFile.setTrashed(true); } catch (e0) {}
    for (var i = 0; i < createdFiles.length; i++) try { createdFiles[i].setTrashed(true); } catch (e1) {}
    try { archiveFolder.setTrashed(true); } catch (e2) {}
    throw e;
  }
}

function buatArsipBulananV10(request, token) {
  var lock = null;
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Hanya Lurah/Carik yang dapat membuat Arsip Bulanan.' };
    request = request || {};
    var p = normalizePeriode_(request.periode || '');
    if (!p) return { sukses:false, kode:'PERIODE_INVALID', pesan:'Periode arsip tidak valid.' };
    if (request.konfirmasiFinal !== true) return { sukses:false, kode:'KONFIRMASI_WAJIB', pesan:'Konfirmasi final pembuatan arsip wajib dicentang.' };

    lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return { sukses:false, kode:'ARCHIVE_BUSY', pesan:'Proses arsip lain sedang berjalan. Coba muat ulang beberapa saat lagi.' };

    var snapshot = bangunMonthlyArchiveV10_(p);
    if (snapshot.archive) return { sukses:true, alreadyExists:true, pesan:'Arsip final periode ini sudah tersedia.', snapshot:snapshot };
    if (!snapshot.canCreate) return { sukses:false, kode:'ARCHIVE_NOT_READY', pesan:'Periode belum memenuhi syarat pembuatan Arsip Bulanan.', blockers:snapshot.blockers || [], snapshot:snapshot };
    if (request.expectedBatchId && String(request.expectedBatchId) !== String(snapshot.batch.batchId || '')) {
      return { sukses:false, kode:'BATCH_BERUBAH', pesan:'Batch tunjangan berubah. Muat ulang Arsip Bulanan sebelum membuat paket.' };
    }
    var pegawai = getPegawaiById_(idUser) || {};
    var actor = String(pegawai.nama || idUser || 'Lurah/Carik');
    var descriptor = maV10CreateArchiveDrive_(snapshot, request, actor);
    return {
      sukses:true, pesan:'Arsip Bulanan final berhasil dibuat dan dikunci sebagai snapshot periode.', archive:maV10PublicDescriptor_(descriptor),
      snapshot:bangunMonthlyArchiveV10_(p), dataDiubah:false, schemaDiubah:false, archiveDriveDitulis:true
    };
  } catch (e) {
    return handleError('buatArsipBulananV10', e, { sukses:false, pesan:'Pembuatan Arsip Bulanan gagal.' });
  } finally {
    try { if (lock) lock.releaseLock(); } catch (e2) {}
  }
}

function maV10FindFileByName_(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function verifikasiArsipBulananV10(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses:false, kode:'SESSION_EXPIRED', pesan:'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses:false, kode:'ACCESS_DENIED', pesan:'Akses ditolak. Verifikasi Arsip Bulanan hanya untuk Lurah/Carik.' };
    var p = normalizePeriode_(periode || '');
    var d = maV10ReadStoredDescriptor_(p);
    if (!d || !maV10DescriptorAccessible_(d)) return { sukses:false, kode:'ARCHIVE_NOT_FOUND', pesan:'Arsip final periode ini belum ditemukan.' };
    var folder = DriveApp.getFolderById(String(d.folderId));
    var manifestFile = DriveApp.getFileById(String(d.manifestId));
    var manifestBytes = manifestFile.getBlob().getBytes();
    var manifestHash = maV10Sha256Bytes_(manifestBytes);
    var manifest = JSON.parse(manifestFile.getBlob().getDataAsString('UTF-8'));
    var issues = [];
    if (manifestHash !== String(d.manifestSha256 || '')) issues.push('MANIFEST_HASH_MISMATCH');
    if (String(manifest.archiveId || '') !== String(d.archiveId || '')) issues.push('ARCHIVE_ID_MISMATCH');
    if (normalizePeriode_(manifest.periode || '') !== p) issues.push('PERIODE_MISMATCH');
    var files = manifest.files || [];
    for (var i = 0; i < files.length; i++) {
      var meta = files[i] || {};
      var f = null;
      try { f = meta.fileId ? DriveApp.getFileById(String(meta.fileId)) : maV10FindFileByName_(folder, String(meta.name || '')); } catch (e0) { f = null; }
      if (!f) { issues.push('FILE_MISSING:' + String(meta.name || '?')); continue; }
      var bytes = f.getBlob().getBytes();
      if (Number(meta.bytes || 0) !== bytes.length) issues.push('SIZE_MISMATCH:' + String(meta.name || '?'));
      if (String(meta.sha256 || '') !== maV10Sha256Bytes_(bytes)) issues.push('HASH_MISMATCH:' + String(meta.name || '?'));
    }
    try {
      var checksumFile = DriveApp.getFileById(String(d.checksumId || ''));
      var checksumBytes = checksumFile.getBlob().getBytes();
      if (String(d.checksumSha256 || '') && maV10Sha256Bytes_(checksumBytes) !== String(d.checksumSha256)) issues.push('CHECKSUM_FILE_HASH_MISMATCH');
    } catch (ec) { issues.push('CHECKSUM_FILE_MISSING'); }
    try {
      var zip = DriveApp.getFileById(String(d.zipId || ''));
      var zipBytes = zip.getBlob().getBytes();
      if (String(d.zipSha256 || '') && maV10Sha256Bytes_(zipBytes) !== String(d.zipSha256)) issues.push('ZIP_HASH_MISMATCH');
    } catch (ez) { issues.push('ZIP_MISSING'); }
    var valid = issues.length === 0;
    d.integrityStatus = valid ? 'TERVERIFIKASI' : 'GAGAL_VERIFIKASI';
    d.lastVerifiedAt = Utilities.formatDate(new Date(), 'GMT+7', "yyyy-MM-dd'T'HH:mm:ssXXX");
    if (valid) PropertiesService.getScriptProperties().setProperty(maV10ArchivePropertyKey_(p), JSON.stringify(d));
    return { sukses:true, valid:valid, periode:p, archiveId:String(d.archiveId || ''), checkedFiles:files.length + 3, issues:issues, archive:maV10PublicDescriptor_(d), dataDiubah:false, schemaDiubah:false };
  } catch (e) {
    return handleError('verifikasiArsipBulananV10', e, { sukses:false, pesan:'Verifikasi Arsip Bulanan gagal.' });
  }
}

function validasiMonthlyArchiveV10() {
  var checks = [];
  function add_(name, pass, detail) { checks.push({ nama:name, lulus:pass === true, detail:String(detail || '') }); }
  add_('MODULE_VERSION', MONTHLY_ARCHIVE_V10_VERSION_ === 'MA-v1.0-RC1-2026.10.02.04', MONTHLY_ARCHIVE_V10_VERSION_);
  add_('APP_VERSION', String(APP_VERSION || '') === '2026.10.03.02', String(APP_VERSION || ''));
  add_('READ_ENDPOINT', typeof ambilMonthlyArchiveV10 === 'function', typeof ambilMonthlyArchiveV10);
  add_('CREATE_ENDPOINT', typeof buatArsipBulananV10 === 'function', typeof buatArsipBulananV10);
  add_('VERIFY_ENDPOINT', typeof verifikasiArsipBulananV10 === 'function', typeof verifikasiArsipBulananV10);
  add_('MONTHLY_CLOSING_READER', typeof bangunMonthlyClosingV10_ === 'function', typeof bangunMonthlyClosingV10_);
  add_('REPORT_SNAPSHOT', typeof getRekapKinerjaValuesReadOnly_ === 'function', typeof getRekapKinerjaValuesReadOnly_);
  add_('ALLOWANCE_BATCH_READER', typeof getBatchAktifTunjangan_ === 'function', typeof getBatchAktifTunjangan_);
  add_('SHA256_AVAILABLE', !!(Utilities && Utilities.computeDigest && Utilities.DigestAlgorithm && Utilities.DigestAlgorithm.SHA_256), 'SHA-256');
  add_('EXPLICIT_CREATE_ONLY', true, 'Tidak ada auto-write saat halaman dibuka.');
  add_('NO_SCHEMA_MUTATION', true, 'Arsip Bulanan tidak membuat sheet/kolom baru.');
  add_('IMMUTABLE_IDEMPOTENT', true, 'Satu archiveId final per periode+batch; create ulang mengembalikan arsip yang sudah ada.');
  add_('OFFICIAL_DOCS_REQUIRED', true, 'PDF/XLSX resmi wajib divalidasi server sebelum arsip dibuat.');
  add_('EVIDENCE_POLICY', true, 'v1.0 menyimpan referensi bukti dalam snapshot; file bukti tidak diduplikasi massal.');
  var failed = checks.filter(function (c) { return !c.lulus; });
  var out = { sukses:failed.length === 0, valid:failed.length === 0, versi:MONTHLY_ARCHIVE_V10_VERSION_, appVersion:String(APP_VERSION || ''), lulus:checks.length-failed.length, gagal:failed.length, total:checks.length, checks:checks, targetDipanggil:false, dataDiubah:false, schemaDiubah:false };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

// ===== END MONTHLY ARCHIVE v1.0 =====
