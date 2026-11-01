/**
 * STAGING ONLY — akun sintetis untuk diagnostik Samsung Galaxy A07.
 *
 * Persiapan, bukan eksekusi otomatis. TIDAK dijalankan via doGet / Web App.
 * Satu-satunya penulisan pembuatan: append satu baris pada Data_Pegawai
 * di database STAGING terpin. Tidak mengubah spreadsheet produksi.
 *
 * Perhatikan: fungsi publik dapat dipanggil melalui Apps Script.
 * Gunakan URL staging /dev hanya oleh editor berizin selama provision.
 * Arming bersifat sekali pakai melalui Script Properties pada STAGING saja.
 *
 * PIN tidak dicetak, tidak dikembalikan, tidak di-hardcode, tidak dikirim
 * via chat; operator menyimpannya sendiri. PIN transient dihapus sebelum
 * penulisan akun agar tidak tertinggal di Script Properties.
 */
var STAGING_A07_ACCOUNT_DB_ID_V1_ = '1lyQuCfr5kOzDnzKthYhMbjum95d8yDxKz7LLdwM6NzY';
var STAGING_A07_ACCOUNT_DB_NAME_V1_ = 'STAGING - Database Kinerja Minomartani 2026';
var STAGING_A07_ACCOUNT_USERNAME_V1_ = 'staging_a07_test';
var STAGING_A07_ACCOUNT_NAME_V1_ = 'PENGUJI STAGING A07';
var STAGING_A07_ACCOUNT_ROLE_V1_ = 'Dukuh Gantalan';
var STAGING_A07_ACCOUNT_ACCESS_V1_ = 'User';
var STAGING_A07_ACCOUNT_HEADERS_V1_ = [
  'id_user','username','nama','jabatan','pin_hash','akses',
  'wa','status','pin_salt','pin_hash_version','pin_updated_at'
];

function periksaTargetAkunUjiStagingA07V1_() {
  var props = PropertiesService.getScriptProperties();
  if (String(props.getProperty('SPREADSHEET_ID') || '').trim() !== STAGING_A07_ACCOUNT_DB_ID_V1_) {
    throw new Error('STAGING_A07_TARGET_ID_MISMATCH');
  }
  // Pilihan sumber kebenaran aplikasi, plus validasi identitas database.
  var ss = getSS_();
  if (!ss || ss.getId() !== STAGING_A07_ACCOUNT_DB_ID_V1_ ||
      ss.getName() !== STAGING_A07_ACCOUNT_DB_NAME_V1_) {
    throw new Error('STAGING_A07_DATABASE_NOT_APPROVED');
  }
  var sh = ss.getSheetByName('Data_Pegawai');
  if (!sh) throw new Error('STAGING_A07_DATA_PEGAWAI_MISSING');
  var headers = sh.getRange(1,1,1,11).getDisplayValues()[0];
  for (var i=0; i<STAGING_A07_ACCOUNT_HEADERS_V1_.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() !== STAGING_A07_ACCOUNT_HEADERS_V1_[i]) {
      throw new Error('STAGING_A07_SCHEMA_MISMATCH');
    }
  }
  return sh;
}

function cariBarisAkunUjiStagingA07V1_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2,1,last-1,4).getDisplayValues();
  var out = [];
  for (var i=0; i<rows.length; i++) {
    var u = String(rows[i][1]||'').trim().toLowerCase();
    var nama = String(rows[i][2]||'').trim().toUpperCase();
    if (u===STAGING_A07_ACCOUNT_USERNAME_V1_ || nama===STAGING_A07_ACCOUNT_NAME_V1_) {
      out.push({row:i+2,id:String(rows[i][0]||''),
        username:u,nama:nama,jabatan:String(rows[i][3]||'')});
    }
  }
  return out;
}

function validasiPinA07V1_(value) {
  var pin = String(value || '').trim();
  if (!/^\d{6}$/.test(pin)) return false;
  // Hindari pilihan demo yang mudah ditebak. Sistem tetap membatasi percobaan login.
  if (['000000','111111','123456','654321','123123','999999','121212'].indexOf(pin)>=0) return false;
  return true;
}

/**
 * Baca-saja: tidak membuka PIN/pepper/hash dan tidak menulis spreadsheet.
 * Jalankan sebelum memasang izin CREATE_ONCE.
 */
function periksaKesiapanAkunUjiStagingA07() {
  var sh = periksaTargetAkunUjiStagingA07V1_();
  var matches = cariBarisAkunUjiStagingA07V1_(sh);
  var props = PropertiesService.getScriptProperties();
  var pin = props.getProperty('STAGING_A07_TEST_PIN');
  var armed = props.getProperty('STAGING_A07_ACCOUNT_ACTION') === 'CREATE_ONCE';
  return {
    target:'STAGING_ONLY',username:STAGING_A07_ACCOUNT_USERNAME_V1_,
    nama:STAGING_A07_ACCOUNT_NAME_V1_,jabatan:STAGING_A07_ACCOUNT_ROLE_V1_,
    akses:STAGING_A07_ACCOUNT_ACCESS_V1_,duplicates:matches.length,
    pinSiap:validasiPinA07V1_(pin),izinSekaliPakai:armed,
    siap:matches.length===0 && validasiPinA07V1_(pin) && armed
  };
}

/**
 * TULIS TERKENDALI — dipanggil sekali dari editor STAGING oleh operator.
 * Properti staging sementara sebelum run:
 *   STAGING_A07_ACCOUNT_ACTION = CREATE_ONCE
 *   STAGING_A07_TEST_PIN = (6 digit acak milik operator, bukan PIN pegawai)
 */
function buatAkunUjiStagingA07() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('STAGING_A07_LOCK_BUSY');
  try {
    var sh = periksaTargetAkunUjiStagingA07V1_();
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('STAGING_A07_ACCOUNT_ACTION') !== 'CREATE_ONCE') {
      throw new Error('STAGING_A07_NOT_ARMED');
    }
    var pin = String(props.getProperty('STAGING_A07_TEST_PIN') || '').trim();
    if (!validasiPinA07V1_(pin)) throw new Error('STAGING_A07_PIN_NOT_READY');

    var matches = cariBarisAkunUjiStagingA07V1_(sh);
    if (matches.length) throw new Error('STAGING_A07_ACCOUNT_ALREADY_EXISTS');

    // Hash v2 kompatibel dengan cekLogin(): salt | PIN | PIN_PEPPER staging.
    var salt = buatPinSalt_();
    var hash = hashPinV2_(pin,salt);
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('STAGING_A07_HASH_INVALID');
    var id = Utilities.getUuid();

    // Setiap izin/pin ini sekali pakai; jika append gagal, operator mengisi ulang.
    // PIN tidak pernah ditulis dalam bentuk mentah ke spreadsheet atau log.
    props.deleteProperty('STAGING_A07_TEST_PIN');
    props.deleteProperty('STAGING_A07_ACCOUNT_ACTION');
    pin = '';

    var row = [id,STAGING_A07_ACCOUNT_USERNAME_V1_,STAGING_A07_ACCOUNT_NAME_V1_,
      STAGING_A07_ACCOUNT_ROLE_V1_,hash,STAGING_A07_ACCOUNT_ACCESS_V1_,'',
      'Aktif',salt,'v2',new Date()];
    sh.appendRow(row);
    SpreadsheetApp.flush();
    // Cache akun bisa mengandung daftar lama; ini hanya membersihkan cache staging.
    try { bersihkanCacheDataPegawai_(); } catch (eCache) { }

    return {sukses:true,database:'STAGING_ONLY',
      username:STAGING_A07_ACCOUNT_USERNAME_V1_,
      nama:STAGING_A07_ACCOUNT_NAME_V1_,jabatan:STAGING_A07_ACCOUNT_ROLE_V1_,
      akses:STAGING_A07_ACCOUNT_ACCESS_V1_,
      pesan:'Akun uji staging dibuat. PIN tidak pernah ditampilkan oleh fungsi.'};
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menonaktifkan akun uji, tidak menghapus baris atau laporan.
 * Set STAGING_A07_ACCOUNT_ACTION = DISABLE_ONCE di staging, jalankan sekali.
 * Sesi lama dapat bertahan singkat hingga validasi status berikutnya.
 */
function nonaktifkanAkunUjiStagingA07() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('STAGING_A07_LOCK_BUSY');
  try {
    var sh = periksaTargetAkunUjiStagingA07V1_();
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('STAGING_A07_ACCOUNT_ACTION') !== 'DISABLE_ONCE') {
      throw new Error('STAGING_A07_DISABLE_NOT_ARMED');
    }
    var matches = cariBarisAkunUjiStagingA07V1_(sh);
    if (matches.length !== 1 ||
        matches[0].username !== STAGING_A07_ACCOUNT_USERNAME_V1_ ||
        matches[0].nama !== STAGING_A07_ACCOUNT_NAME_V1_ ||
        matches[0].jabatan !== STAGING_A07_ACCOUNT_ROLE_V1_) {
      throw new Error('STAGING_A07_ACCOUNT_IDENTITY_MISMATCH');
    }
    props.deleteProperty('STAGING_A07_ACCOUNT_ACTION');
    props.deleteProperty('STAGING_A07_TEST_PIN');
    sh.getRange(matches[0].row,8).setValue('Nonaktif');
    SpreadsheetApp.flush();
    try { simpanStatusSessionPegawaiCache_(matches[0].id,false); } catch(eCache) {}
    try { bersihkanCacheDataPegawai_(); } catch(eCache2) {}
    return {sukses:true,username:STAGING_A07_ACCOUNT_USERNAME_V1_,status:'Nonaktif'};
  } finally {
    lock.releaseLock();
  }
}
