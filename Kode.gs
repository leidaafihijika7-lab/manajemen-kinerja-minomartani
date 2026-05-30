function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index.html')
    .setTitle('Portal Kinerja Minomartani')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no') // KUNCI PWA DI GOOGLE APPS SCRIPT
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}


// ===== SHEET SCHEMA =====
// Sumber kebenaran SHEET_COLUMNS sekarang berada di file SheetSchema.gs.
// Pastikan SheetSchema.gs ikut ada di project Apps Script bersama Kode.js.
// ===== END SHEET SCHEMA =====

var APP_VERSION = "2026.05.30.10";
// WAJIB diganti setiap kali Anda deploy versi baru

var CONFIG = {
  CACHE: {
    SESSION_TIMEOUT_SECONDS: 21600,
    SCRIPT_CACHE_TTL: 1800,
    LOGIN_FAILURE_TTL: 600,
    MASTER_TUNJANGAN_TTL: 3600,
    // Anti double-submit: durasi IN_FLIGHT dibuat cukup panjang untuk proses normal,
    // tetapi tidak lagi 10 menit penuh jika terjadi hard crash/timeout.
    SUBMIT_IN_FLIGHT_TTL: 420,
    SUBMIT_IN_FLIGHT_STALE_SECONDS: 420
  },
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,              // batas gagal per username
    MAX_LOGIN_ATTEMPTS_CLIENT: 15,       // batas gagal per browser/perangkat
    MAX_LOGIN_ATTEMPTS_GLOBAL: 80,       // batas gagal seluruh aplikasi dalam TTL
    LOGIN_FAILURE_GENERIC_MESSAGE: 'Username atau PIN tidak sesuai.',
    LOGIN_THROTTLE_MESSAGE: 'Terlalu banyak percobaan login gagal. Coba lagi beberapa menit lagi.',
    PASSWORD_HASH_ALGO: 'SHA_256',
    PIN_HASH_VERSION_LEGACY: 'v1',
    PIN_HASH_VERSION_SALTED: 'v2',
    PIN_PEPPER_PROPERTY: 'PIN_PEPPER'
  },
  TUNJANGAN: {
    DEFAULT_CUTOFF_DAY: 25,
    DEFAULT_CUTOFF_TIME: "18:00",
    MIN_CUTOFF_DAY: 1,
    MAX_CUTOFF_DAY: 30
  },
  FILE_LIMITS: {
    MAX_FILE_B64: 4500000,
    MAX_PDF_B64: Math.ceil((3 * 1024 * 1024) * 4 / 3) + 2048,
    MAX_TOTAL_B64: 12000000
  }
};


// ===== KEBIJAKAN TRANSISI PRODUKTIFITAS =====
// Aplikasi mulai diterapkan 1 April 2026.
// - Pasal 33: pengurangan mingguan untuk Kegiatan Wajib Sekretariat & Teknis
//   tetap aktif selama masih dalam bulan hak/aktif. Jika tidak ada laporan sampai
//   bulan hak terlewati, sistem tidak membuat poin negatif; pegawai cukup tidak
//   memperoleh poin/tunjangan kegiatan wajib tersebut.
// - Pasal 60: batas laporan 2 hari kerja untuk tugas pimpinan belum menghukum
//   otomatis selama masa transisi. Nilai tetap mengikuti review Admin. Nanti cukup
//   ubah PASAL60_BATAS_DUA_HARI_KERJA_AKTIF menjadi true jika kebijakan mulai
//   diberlakukan secara ketat.
var KEBIJAKAN_TRANSISI_PRODUKTIFITAS = {
  MULAI_APLIKASI: "2026-04-01",
  PASAL33_PENGURANGAN_MINGGUAN_AKTIF: true,
  PASAL60_BATAS_DUA_HARI_KERJA_AKTIF: false
};

function isPasal33PenguranganMingguanAktif_() {
  return KEBIJAKAN_TRANSISI_PRODUKTIFITAS.PASAL33_PENGURANGAN_MINGGUAN_AKTIF === true;
}

function isPasal60BatasDuaHariKerjaAktif_() {
  return KEBIJAKAN_TRANSISI_PRODUKTIFITAS.PASAL60_BATAS_DUA_HARI_KERJA_AKTIF === true;
}
// ===== END KEBIJAKAN TRANSISI PRODUKTIFITAS =====


var APP_SHARED_DEFAULTS = {
  KATEGORI_LAP: {
    PROD: "Laporan Produktifitas",
    TU: "Laporan Tugas Umum",
    PHL: "Laporan Harian PHL"
  },
  APB_TAHAP: {
    P47: "APB_47",
    P51: "APB_51",
    P54: "APB_54"
  },
  REVIEW_STATUS: {
    MENUNGGU: "Menunggu Review",
    BANDING: "Banding",
    MENUNGGU_LURAH: "Menunggu Persetujuan Lurah",
    DISETUJUI: "Disetujui",
    DISETUJUI_LURAH: "Disetujui Lurah",
    DISETUJUI_LEWAT_CUTOFF: "Disetujui - Lewat Cut-off",
    DITOLAK: "Ditolak"
  },
  TUNJANGAN_STATUS: {
    DRAFT: "Draft",
    DIKUNCI_CARIK: "Dikunci Carik",
    DIAJUKAN_KE_LURAH: "Diajukan ke Lurah",
    DISETUJUI_LURAH: "Disetujui Lurah",
    DIKEMBALIKAN_LURAH: "Dikembalikan Lurah",
    DITERUSKAN_KE_BENDAHARA: "Diteruskan ke Bendahara",
    SUDAH_DICAIRKAN: "Sudah Dicairkan"
  },
  DISPOSISI_STATUS: {
    DRAFT: "DRAFT",
    TERBIT: "TERBIT",
    DITUTUP: "DITUTUP",
    DIBATALKAN: "DIBATALKAN"
  },
  DISPOSISI_BACA: {
    BARU: "BARU",
    DIBUKA: "DIBUKA"
  },
  DISPOSISI_TINDAK: {
    BELUM: "BELUM_DILAPORKAN",
    SUDAH: "SUDAH_DILAPORKAN"
  }
};


// ===== JABATAN ROLES — Sumber Kebenaran Tunggal Pengelompokan Jabatan =====
// Ubah di sini jika ada penambahan/perubahan jabatan.
// 'kelompok' adalah string yang disimpan di Spreadsheet & dipakai di dropdown frontend.
// 'pasal33' menandai jabatan yang berhak atas perhitungan Pasal 33 Tunjangan.
// CATATAN BISNIS: Pasal 33 hanya berlaku untuk 7 jabatan berikut:
// Carik, Jagabaya, Kamituwa, Ulu-ulu, Kepala Urusan Tata Laksana,
// Kepala Urusan Danarta, dan Kepala Urusan Pangripta.
var PASAL_33_ROLE_RULES = [
  { kunci: "CARIK", nama: "Carik" },
  { kunci: "JAGABAYA", nama: "Jagabaya" },
  { kunci: "KAMITUWA", nama: "Kamituwa" },
  { kunci: "ULU_ULU", nama: "Ulu-ulu" },
  { kunci: "KAUR_TATA_LAKSANA", nama: "Kepala Urusan Tata Laksana" },
  { kunci: "KAUR_DANARTA", nama: "Kepala Urusan Danarta" },
  { kunci: "KAUR_PANGRIPTA", nama: "Kepala Urusan Pangripta" }
];

var PASAL_33_ROLE_KEY_MAP = PASAL_33_ROLE_RULES.reduce(function (acc, item) {
  acc[item.kunci] = true;
  return acc;
}, {});

var JABATAN_ROLES = [
  // --- Pamong Inti (Pasal 33) ---
  { kunci: "LURAH", keywords: ["lurah"], kelompok: "Lurah", pasal33: false, isStaf: false },
  { kunci: "CARIK", keywords: ["carik", "sekretaris"], kelompok: "Carik & Kasi", pasal33: true, isStaf: false },
  { kunci: "JAGABAYA", keywords: ["jagabaya"], kelompok: "Carik & Kasi", pasal33: true, isStaf: false },
  { kunci: "KAMITUWA", keywords: ["kamituwa"], kelompok: "Carik & Kasi", pasal33: true, isStaf: false },
  { kunci: "ULU_ULU", keywords: ["ulu-ulu", "ulu ulu"], kelompok: "Carik & Kasi", pasal33: true, isStaf: false },
  { kunci: "KAUR_DANARTA", keywords: ["kaur danarta", "kepala urusan danarta", "ka ur danarta", "danarta"], kelompok: "Kaur", pasal33: true, isStaf: false },
  { kunci: "KAUR_PANGRIPTA", keywords: ["kaur pangripta", "kepala urusan pangripta", "ka ur pangripta", "pangripta"], kelompok: "Kaur", pasal33: true, isStaf: false },
  { kunci: "KAUR_TATA_LAKSANA", keywords: ["kaur tata laksana", "kepala urusan tata laksana", "ka ur tata laksana", "tata laksana"], kelompok: "Kaur", pasal33: true, isStaf: false },
  // --- Dukuh ---
  { kunci: "DUKUH", keywords: ["dukuh"], kelompok: "Dukuh", pasal33: false, isStaf: false },
  // --- Staf Pamong (bukan pamong inti, tidak hak Pasal 33) ---
  { kunci: "STAF_JAGABAYA", keywords: ["staf jagabaya"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  { kunci: "STAF_KAMITUWA", keywords: ["staf kamituwa"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  { kunci: "STAF_ULU_ULU", keywords: ["staf ulu-ulu", "staf ulu ulu"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  { kunci: "STAF_KAUR_DANARTA", keywords: ["staf kepala urusan danarta", "staf kaur danarta", "staf ka ur danarta"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  { kunci: "STAF_KAUR_PANGRIPTA", keywords: ["staf kepala urusan pangripta", "staf kaur pangripta", "staf ka ur pangripta"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  { kunci: "STAF_KAUR_TATA_LAKSANA", keywords: ["staf kepala urusan tata laksana", "staf kaur tata laksana", "staf ka ur tata laksana"], kelompok: "Staf Pamong Kalurahan", pasal33: false, isStaf: true },
  // --- Staf PHL ---
  { kunci: "STAF_PHL", keywords: ["phl", "lepas", "staf phl"], kelompok: "Staf PHL", pasal33: false, isStaf: true }
];

// Engine pencari — kembalikan objek role pertama yang cocok, atau null.
function cariJabatanRole_(jabatan) {
  var j = canonicalizeJabatan_(jabatan || "");
  // Cek Staf-prefixed entries LEBIH DULU agar tidak salah masuk kelompok induknya.
  var saja = JABATAN_ROLES.filter(function (r) { return r.isStaf; });
  var bukan = JABATAN_ROLES.filter(function (r) { return !r.isStaf; });
  var urutan = saja.concat(bukan);
  for (var i = 0; i < urutan.length; i++) {
    var role = urutan[i];
    for (var k = 0; k < role.keywords.length; k++) {
      if (j.indexOf(role.keywords[k]) !== -1) return role;
    }
  }
  return null;
}

// ===== DEPLOYMENT CHECKLIST (v2026.04.20.9) =====
// 🚀 Follow these steps after deploying new version:
//
// 1. Update APP_VERSION above if you made changes to constants
// 2. Deploy as new version in Google Apps Script
// 3. Run initialization functions from Script Editor:
//    → Run: initializeAppConstants()
//    → This saves all constants to PropertiesService
//    → Run: refreshMasterTunjanganCache()  [NEW v2026.04.20.9]
//    → This pre-caches Master Tunjangan data for performance
// 4. Hard refresh web app in browser:
//    → Windows: Ctrl+F5 or Ctrl+Shift+Delete
//    → Mac: Cmd+Shift+R
// 5. Login and test form submission
//
// Performance Improvements in v2026.04.20.9:
// - Master Tunjangan data now cached (CacheService + PropertiesService)
// - Processing 100+ employees: ~100x faster (O(n) instead of O(n²))
// - Reduced server-side freezing when loading large datasets
// - Consolidated alias registration: fewer function calls
//
// If issues occur:
// 1. Check browser console (F12) for errors
// 2. Run: refreshMasterTunjanganCache() to rebuild cache
// 3. Check Script Editor logs for detailed error messages

// ===== SHARED APP CONSTANTS (v2026.04.20.9) =====
// These constants are shared between backend (Kode.js) and frontend (Index.html)
// to ensure single source of truth and prevent sync issues

function initializeAppConstants() {
  try {
    var constants = JSON.parse(JSON.stringify(APP_SHARED_DEFAULTS));
    constants.APP_VERSION = APP_VERSION;

    var props = PropertiesService.getScriptProperties();
    props.setProperty("APP_CONSTANTS", JSON.stringify(constants));

    Logger.log("✅ App constants initialized successfully at: " + new Date().toString());
    return { sukses: true, pesan: "Constants initialized", timestamp: new Date().toString() };
  } catch (e) {
    return handleError("initializeAppConstants", e, { sukses: false, pesan: "" });
  }
}

function ambilConstantsAplikasi() {
  try {
    var props = PropertiesService.getScriptProperties();
    var constantsJson = props.getProperty("APP_CONSTANTS");

    if (!constantsJson) {
      // Fallback if constants not initialized yet
      Logger.log("⚠️ Constants not found in PropertiesService, initializing now...");
      initializeAppConstants();
      constantsJson = props.getProperty("APP_CONSTANTS");
    }

    var constants = JSON.parse(constantsJson || "{}");
    return {
      sukses: true,
      data: constants,
      timestamp: new Date().toString()
    };
  } catch (e) {
    return handleError("ambilConstantsAplikasi", e, {
      sukses: false,
      pesan: "",
      data: {}
    });
  }
}

// ===== DEBUG HELPERS =====

// DEBUG REMOVED FROM PRODUCTION: debugCheckDataPegawai

// DEBUG REMOVED FROM PRODUCTION: debugLoadAdminList

// DEBUG REMOVED FROM PRODUCTION: debugRunAll
function getAppVersion() {
  return APP_VERSION;
}

function getSS_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = (props.getProperty("SPREADSHEET_ID") || "").trim();
  if (!sheetId) {
    throw new Error("Konfigurasi SPREADSHEET_ID belum diatur di Script Properties. Aplikasi diblokir untuk mencegah salah target database.");
  }
  return SpreadsheetApp.openById(sheetId);
}

function getSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error("Sheet '" + name + "' tidak ditemukan.");
  return sh;
}


// ===== CACHE READ-ONLY REKAP_KINERJA (v2026.05.09.03) =====
// Tujuan: mengurangi pembacaan penuh sheet Rekap_Kinerja dari endpoint tampilan
// seperti Dashboard, Riwayat, Timeline, Admin list, dan Rekap ringkas.
// Jangan gunakan helper ini untuk jalur tulis/validasi kritis seperti submit,
// review, koreksi, atau proses yang wajib membaca data paling mutakhir.
var REKAP_KINERJA_READ_CACHE_META_KEY = "REKAP_KINERJA_READONLY_META_V1";
var REKAP_KINERJA_READ_CACHE_CHUNK_PREFIX = "REKAP_KINERJA_READONLY_CHUNK_V1_";
var REKAP_KINERJA_READ_CACHE_TTL_SECONDS = 45;
var REKAP_KINERJA_READ_CACHE_CHUNK_SIZE = 85000;
var REKAP_KINERJA_READ_CACHE_MAX_CHUNKS = 45;

function getRekapKinerjaValuesReadOnly_() {
  var cache = CacheService.getScriptCache();
  var metaRaw = "";
  try {
    metaRaw = cache.get(REKAP_KINERJA_READ_CACHE_META_KEY);
  } catch (eMeta) {
    metaRaw = "";
  }

  if (metaRaw) {
    try {
      var meta = JSON.parse(metaRaw);
      var chunks = Number(meta.chunks || 0);
      if (chunks > 0 && chunks <= REKAP_KINERJA_READ_CACHE_MAX_CHUNKS) {
        var joined = "";
        var lengkap = true;
        for (var i = 0; i < chunks; i++) {
          var part = cache.get(REKAP_KINERJA_READ_CACHE_CHUNK_PREFIX + i);
          if (part === null || part === undefined) {
            lengkap = false;
            break;
          }
          joined += part;
        }
        if (lengkap && joined) {
          return JSON.parse(joined);
        }
      }
    } catch (eReadCache) {
      // Cache rusak/terpotong/evicted sebagian: fallback baca sheet langsung.
    }
  }

  var data = getSheet_("Rekap_Kinerja").getDataRange().getValues();
  simpanCacheRekapKinerjaReadOnly_(data);
  return data;
}

function simpanCacheRekapKinerjaReadOnly_(data) {
  try {
    var json = JSON.stringify(data || []);
    if (!json) return;

    var chunks = [];
    for (var i = 0; i < json.length; i += REKAP_KINERJA_READ_CACHE_CHUNK_SIZE) {
      chunks.push(json.substring(i, i + REKAP_KINERJA_READ_CACHE_CHUNK_SIZE));
      if (chunks.length > REKAP_KINERJA_READ_CACHE_MAX_CHUNKS) {
        // Jangan paksa cache jika sheet sudah melampaui kapasitas cache pendek.
        return;
      }
    }

    var cache = CacheService.getScriptCache();
    for (var c = 0; c < chunks.length; c++) {
      cache.put(REKAP_KINERJA_READ_CACHE_CHUNK_PREFIX + c, chunks[c], REKAP_KINERJA_READ_CACHE_TTL_SECONDS);
    }
    cache.put(REKAP_KINERJA_READ_CACHE_META_KEY, JSON.stringify({
      chunks: chunks.length,
      createdAt: new Date().getTime(),
      rows: data && data.length ? data.length : 0
    }), REKAP_KINERJA_READ_CACHE_TTL_SECONDS);
  } catch (eCache) {
    // Cache hanyalah optimasi. Jika gagal, fungsi pemanggil tetap memakai hasil baca sheet.
    try { Logger.log("Peringatan cache Rekap_Kinerja read-only gagal: " + (eCache && eCache.message ? eCache.message : eCache)); } catch (eLog) { }
  }
}

function invalidasiCacheRekapKinerjaReadOnly_() {
  try {
    CacheService.getScriptCache().remove(REKAP_KINERJA_READ_CACHE_META_KEY);
  } catch (e) { }
}

function refreshCacheRekapKinerjaReadOnly(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: "Akses ditolak." };

    invalidasiCacheRekapKinerjaReadOnly_();
    var data = getRekapKinerjaValuesReadOnly_();
    return { sukses: true, pesan: "Cache read-only Rekap_Kinerja berhasil diperbarui.", jumlahBaris: data ? data.length : 0 };
  } catch (e) {
    return handleError("refreshCacheRekapKinerjaReadOnly", e, { sukses: false, pesan: "" });
  }
}
// ===== END CACHE READ-ONLY REKAP_KINERJA =====

var APB_TAHAP = APP_SHARED_DEFAULTS.APB_TAHAP;

var REVIEW_STATUS = APP_SHARED_DEFAULTS.REVIEW_STATUS;

var KATEGORI_LAP = APP_SHARED_DEFAULTS.KATEGORI_LAP;

var TUNJANGAN_STATUS = APP_SHARED_DEFAULTS.TUNJANGAN_STATUS;

var DEFAULT_TUNJANGAN_CUTOFF_DAY = CONFIG.TUNJANGAN.DEFAULT_CUTOFF_DAY;
var DEFAULT_TUNJANGAN_CUTOFF_TIME = CONFIG.TUNJANGAN.DEFAULT_CUTOFF_TIME || "18:00";
var MIN_TUNJANGAN_CUTOFF_DAY = CONFIG.TUNJANGAN.MIN_CUTOFF_DAY;
var MAX_TUNJANGAN_CUTOFF_DAY = CONFIG.TUNJANGAN.MAX_CUTOFF_DAY;
// DEFAULT_TUNJANGAN_CUTOFF_DAY kini dipakai untuk autofill rentang tanggal awal/akhir.

function isStatusApproved_(status) {
  var s = (status || "").toString();
  return s === REVIEW_STATUS.DISETUJUI || s === REVIEW_STATUS.DISETUJUI_LURAH;
}

function isPendingReviewStatus_(status) {
  var s = (status || "").toString();
  return s === REVIEW_STATUS.MENUNGGU ||
    s === REVIEW_STATUS.BANDING ||
    s === REVIEW_STATUS.MENUNGGU_LURAH;
}

function tahapApbLabel_(code) {
  switch ((code || "").toString()) {
    case APB_TAHAP.P47: return "Tahap Persiapan (Pasal 47)";
    case APB_TAHAP.P51: return "Tahap Pelaksanaan (Pasal 51)";
    case APB_TAHAP.P54: return "Tahap Pelaporan & Pertanggungjawaban (Pasal 54)";
    default: return (code || "").toString();
  }
}

function getPegawaiDataCached_() {
  // FIX #2: Scalability Cache — gunakan versi key + chunk kecil
  // Cache GAS max 100KB per key. Jika data pegawai bertambah besar,
  // simpan hanya kolom esensial (sudah dilakukan) dan tambah fallback
  // ke PropertiesService sebagai lapis kedua jika cache miss.
  var CACHE_KEY = "DATA_PEGAWAI_V3_SECURE_PIN";
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) { }
  }

  // Fallback ke PropertiesService (lebih persisten, max 500KB)
  // FIX BUG: Sebelumnya 'PropertiesService.getScriptCache' (referensi fungsi,
  // selalu truthy) digunakan sebagai kondisi, membuat blok ini tidak pernah
  // mengambil data dari PropertiesService sama sekali.
  try {
    var propsCached = PropertiesService.getScriptProperties().getProperty(CACHE_KEY);
    if (propsCached) {
      return JSON.parse(propsCached);
    }
  } catch (e) { }

  var sheet = getSS_().getSheetByName("Data_Pegawai");
  if (!sheet) return null;

  var rawData = sheet.getDataRange().getValues();
  // Simpan kolom esensial dalam urutan indeks yang sama dengan SHEET_COLUMNS.DATA_PEGAWAI.
  // Ini penting agar akses ke WA, STATUS, pin_salt, dan pin_hash_version tetap konsisten.
  var optimizedData = rawData.map(function (row) {
    return [
      row[SHEET_COLUMNS.DATA_PEGAWAI.ID],
      row[SHEET_COLUMNS.DATA_PEGAWAI.USERNAME],
      row[SHEET_COLUMNS.DATA_PEGAWAI.NAMA],
      row[SHEET_COLUMNS.DATA_PEGAWAI.JABATAN],
      row[SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH],
      row[SHEET_COLUMNS.DATA_PEGAWAI.AKSES],
      row[SHEET_COLUMNS.DATA_PEGAWAI.WA],
      row[SHEET_COLUMNS.DATA_PEGAWAI.STATUS],
      row[SHEET_COLUMNS.DATA_PEGAWAI.PIN_SALT],
      row[SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH_VERSION],
      row[SHEET_COLUMNS.DATA_PEGAWAI.PIN_UPDATED_AT]
    ];
  });
  var json = JSON.stringify(optimizedData);
  try {
    cache.put(CACHE_KEY, json, CONFIG.CACHE.SCRIPT_CACHE_TTL);
  } catch (e) {
    // Cache penuh — simpan ke PropertiesService sebagai fallback
    try {
      PropertiesService.getScriptProperties().setProperty(CACHE_KEY, json);
    } catch (e2) {
      Logger.log("Peringatan Cache+Props: " + e2.message);
    }
  }
  return optimizedData;
}

function bersihkanCacheDataPegawai_() {
  var keys = ["DATA_PEGAWAI_V2", "DATA_PEGAWAI_V3_SECURE_PIN"];
  for (var i = 0; i < keys.length; i++) {
    try { CacheService.getScriptCache().remove(keys[i]); } catch (e) { }
    try { PropertiesService.getScriptProperties().deleteProperty(keys[i]); } catch (e) { }
  }
}

function refreshDataPegawaiCache(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: "Akses ditolak." };

    bersihkanCacheDataPegawai_();
    var data = getPegawaiDataCached_();

    if (!data || data.length === 0) {
      return { sukses: false, pesan: "Sheet 'Data_Pegawai' kosong atau tidak ditemukan." };
    }

    return { sukses: true, pesan: "Cache berhasil diperbarui. Jumlah pegawai: " + (data.length - 1) };
  } catch (e) {
    return handleError("refreshDataPegawaiCache", e, { sukses: false, pesan: "" });
  }
}

function getPegawaiByUsername_(username) {
  var user = (username || "").toString().trim().toLowerCase();
  if (!user) return null;
  var data = getPegawaiDataCached_();
  if (!data) return null;
  for (var i = 1; i < data.length; i++) {
    var dbUser = data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] ? data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME].toString().trim().toLowerCase() : "";
    if (dbUser === user) {
      return {
        id: data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID],
        username: data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME],
        nama: data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA],
        jabatan: data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN],
        akses: data[i][SHEET_COLUMNS.DATA_PEGAWAI.AKSES],
        wa: data[i][SHEET_COLUMNS.DATA_PEGAWAI.WA]
      };
    }
  }
  return null;
}

function buatToken() { return Utilities.getUuid(); }

function validasiSession(token) {
  var cache = CacheService.getScriptCache();
  var idUser = cache.get(token);
  if (idUser) cache.put(token, idUser, CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
  return idUser;
}

function akhiriSession(token) {
  try {
    token = String(token || '').trim();
    if (!token) return { sukses: true };
    CacheService.getScriptCache().remove(token);
    return { sukses: true };
  } catch (e) {
    return { sukses: false };
  }
}

function cekHakAksesAdmin(idUser) {
  try {
    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return false;
    // Izinkan jika jabatan Carik/Lurah ATAU kolom akses = "Admin" di database
    if (isAdminUtamaPegawai_(pegawai)) return true;
    var akses = (pegawai.akses || "").toString().trim();
    return akses === "Admin";
  } catch (e) {
    return false;
  }
}

function getPegawaiById_(idUser) {
  var data = getPegawaiDataCached_();
  if (!data) return null;
  for (var i = 1; i < data.length; i++) {
    if (idsEqual_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID], idUser)) {
      return {
        id: data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID],
        username: data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME],
        nama: data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA],
        jabatan: data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN],
        akses: data[i][SHEET_COLUMNS.DATA_PEGAWAI.AKSES],
        wa: data[i][SHEET_COLUMNS.DATA_PEGAWAI.WA]
      };
    }
  }
  return null;
}

function normalizeId_(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/ /g, " ").trim();
}

function idsEqual_(a, b) {
  return normalizeId_(a) === normalizeId_(b);
}

function normalizeJabatan_(jabatan) {
  return (jabatan || "")
    .toString()
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeJabatan_(jabatan) {
  var j = normalizeJabatan_(jabatan);
  j = j.replace(/\bka\s*ur\b/g, "kepala urusan");
  j = j.replace(/\bkaur\b/g, "kepala urusan");
  j = j.replace(/\bstaf ka\s*ur\b/g, "staf kepala urusan");
  j = j.replace(/\bstaf kaur\b/g, "staf kepala urusan");
  j = j.replace(/\s+/g, " ").trim();
  return j;
}

function isKategoriProduktivitas_(kategori) {
  var k = (kategori || "").toString();
  return k.indexOf("Laporan Produktifitas") !== -1 || k.indexOf("Laporan Produktivitas") !== -1;
}

function isKategoriWajibBulanan_(kategori) {
  var k = (kategori || "").toString();
  return k.indexOf("Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Bulanan") !== -1 ||
         k.indexOf("Laporan Produktivitas - Pelaksanaan Kegiatan Wajib Bulanan") !== -1;
}

function getDaftarJabatanPasal33_() {
  return PASAL_33_ROLE_RULES.map(function (item) {
    return item.nama;
  });
}

function validatePasal33RoleConfig_() {
  var issues = [];
  var foundKeys = {};

  for (var i = 0; i < JABATAN_ROLES.length; i++) {
    var role = JABATAN_ROLES[i];
    var shouldApplyPasal33 = PASAL_33_ROLE_KEY_MAP[role.kunci] === true;

    if (shouldApplyPasal33) foundKeys[role.kunci] = true;

    if ((role.pasal33 === true) !== shouldApplyPasal33) {
      issues.push(
        "Konfigurasi Pasal 33 tidak sinkron untuk role '" + role.kunci + "' (pasal33=" + role.pasal33 + ")"
      );
    }
  }

  for (var j = 0; j < PASAL_33_ROLE_RULES.length; j++) {
    var rule = PASAL_33_ROLE_RULES[j];
    if (!foundKeys[rule.kunci]) {
      issues.push("Role Pasal 33 wajib tidak ditemukan di JABATAN_ROLES: " + rule.kunci);
    }
  }

  return {
    sukses: issues.length === 0,
    daftarJabatan: getDaftarJabatanPasal33_(),
    issues: issues
  };
}


// DEBUG REMOVED FROM PRODUCTION: debugAuditPasal33RoleConfig_

// DEBUG REMOVED FROM PRODUCTION: cekHakAksesDebugPasal33_

// DEBUG REMOVED FROM PRODUCTION: toDateOrNullPasal33Debug_

// DEBUG REMOVED FROM PRODUCTION: buildPasal33DebugScenarios_

// DEBUG REMOVED FROM PRODUCTION: runSinglePasal33DebugScenario_

// DEBUG REMOVED FROM PRODUCTION: jalankanDebugPasal33Tests

// DEBUG REMOVED FROM PRODUCTION: evaluasiDebugPasal33Kustom
function isTargetPasal33_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  if (role === null) return false;
  return PASAL_33_ROLE_KEY_MAP[role.kunci] === true && role.pasal33 === true;
}

function periodePrevMonthDariBulanHak_(tahunHak, bulanHakIdx) {
  var d = new Date(tahunHak, bulanHakIdx - 1, 1);
  return Utilities.formatDate(d, "GMT+7", "yyyy-MM");
}

function lastDateOfMonth_(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
}

function tanggalAcuanBulanHak_(tahunHak, bulanHakIdx) {
  var now = new Date();
  if (now.getFullYear() === tahunHak && now.getMonth() === bulanHakIdx) return now;
  if ((now.getFullYear() - tahunHak) * 12 + (now.getMonth() - bulanHakIdx) > 0) {
    return lastDateOfMonth_(tahunHak, bulanHakIdx);
  }
  return new Date(tahunHak, bulanHakIdx, 1, 0, 0, 0, 0);
}

var PASAL_33_MINGGU = [
  {
    days: [1, 7],
    poin: 20,
    labelDiajukan: "Tepat waktu (minggu pertama)",
    labelBelum: "Belum dilaporkan, masih minggu pertama"
  },
  {
    days: [8, 14],
    poin: 15,
    labelDiajukan: "Terlambat 1 minggu",
    labelBelum: "Belum dilaporkan, potong 1 minggu"
  },
  {
    days: [15, 21],
    poin: 10,
    labelDiajukan: "Terlambat 2 minggu",
    labelBelum: "Belum dilaporkan, potong 2 minggu"
  },
  {
    days: [22, 28],
    poin: 5,
    labelDiajukan: "Terlambat 3 minggu",
    labelBelum: "Belum dilaporkan, potong 3 minggu"
  },
  {
    days: [29, 31],
    poin: 0,
    labelDiajukan: "Terlambat 4 minggu / akhir bulan",
    labelBelum: "Belum dilaporkan, potong 4 minggu / akhir bulan"
  }
];

function buatOutputEvaluasiPasal33_(periodeLaporan) {
  return {
    valid: false,
    periodeLaporan: (periodeLaporan || "").toString(),
    tahunHak: 0,
    bulanHakIdx: 0,
    poinHak: 0,
    persenProdHak: 0,
    statusLabel: "Tidak valid"
  };
}

function parsePeriodePasal33_(periodeLaporan) {
  var s = (periodeLaporan || "").toString().trim();
  var m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;

  var tahunLap = parseInt(m[1], 10);
  var bulanLapIdx = parseInt(m[2], 10) - 1;
  if (isNaN(tahunLap) || isNaN(bulanLapIdx) || bulanLapIdx < 0 || bulanLapIdx > 11) return null;

  var bulanHakIdx = bulanLapIdx + 1;
  var tahunHak = tahunLap;
  if (bulanHakIdx > 11) {
    bulanHakIdx = 0;
    tahunHak++;
  }

  return {
    periodeLaporan: s,
    tahunHak: tahunHak,
    bulanHakIdx: bulanHakIdx
  };
}

function isValidDateObject_(value) {
  return value instanceof Date && !isNaN(value.getTime());
}

function getTanggalBasisPasal33_(tanggalAcuan, tanggalSubmit) {
  if (isValidDateObject_(tanggalSubmit)) return new Date(tanggalSubmit);
  if (isValidDateObject_(tanggalAcuan)) return new Date(tanggalAcuan);
  return new Date();
}

function hitungSelisihBulanPasal33_(basisDate, tahunHak, bulanHakIdx) {
  return (basisDate.getFullYear() - tahunHak) * 12 + (basisDate.getMonth() - bulanHakIdx);
}

function getMingguPasal33ByTanggal_(dayOfMonth) {
  for (var i = 0; i < PASAL_33_MINGGU.length; i++) {
    var week = PASAL_33_MINGGU[i];
    if (dayOfMonth >= week.days[0] && dayOfMonth <= week.days[1]) {
      return week;
    }
  }
  return PASAL_33_MINGGU[PASAL_33_MINGGU.length - 1];
}

function hitungPoinBerdasarTanggal_(dayOfMonth) {
  var week = getMingguPasal33ByTanggal_(dayOfMonth);
  return week ? week.poin : 0;
}

function getLabelStatusMingguPasal33_(dayOfMonth, statusLaporanDiajukan) {
  var week = getMingguPasal33ByTanggal_(dayOfMonth);
  if (!week) return statusLaporanDiajukan ? "Terlambat 4 minggu / akhir bulan" : "Belum dilaporkan, potong 4 minggu / akhir bulan";
  return statusLaporanDiajukan ? week.labelDiajukan : week.labelBelum;
}

function terapkanHasilMingguPasal33_(out, dayOfMonth, statusLaporanDiajukan) {
  // Kebijakan terkini: pengurangan mingguan Pasal 33 tetap aktif selama bulan
  // hak/aktif. Flag ini disediakan agar perubahan kebijakan nanti tidak perlu
  // membongkar ulang evaluasi Pasal 33.
  if (!isPasal33PenguranganMingguanAktif_()) {
    out.poinHak = 20;
    out.persenProdHak = 20;
    out.statusLabel = statusLaporanDiajukan
      ? "Masa transisi: laporan wajib diterima tanpa pengurangan mingguan"
      : "Masa transisi: belum dilaporkan pada bulan aktif";
    return out;
  }

  var poin = hitungPoinBerdasarTanggal_(dayOfMonth);
  out.poinHak = poin;
  out.persenProdHak = poin;
  out.statusLabel = getLabelStatusMingguPasal33_(dayOfMonth, statusLaporanDiajukan);
  return out;
}

function evaluasiPasal33Hak_(periodeLaporan, tanggalAcuan, tanggalSubmit) {
  var out = buatOutputEvaluasiPasal33_(periodeLaporan);
  var parsedPeriode = parsePeriodePasal33_(periodeLaporan);
  if (!parsedPeriode) return out;

  out.valid = true;
  out.periodeLaporan = parsedPeriode.periodeLaporan;
  out.tahunHak = parsedPeriode.tahunHak;
  out.bulanHakIdx = parsedPeriode.bulanHakIdx;

  var basisDate = getTanggalBasisPasal33_(tanggalAcuan, tanggalSubmit);
  var selisihBulan = hitungSelisihBulanPasal33_(basisDate, parsedPeriode.tahunHak, parsedPeriode.bulanHakIdx);
  var sudahDiajukan = isValidDateObject_(tanggalSubmit);

  if (!sudahDiajukan) {
    if (selisihBulan < 0) {
      out.poinHak = 20;
      out.persenProdHak = 20;
      out.statusLabel = "Belum masuk bulan hak";
      return out;
    }
    if (selisihBulan > 0) {
      out.poinHak = 0;
      out.persenProdHak = 0;
      out.statusLabel = "Belum dilaporkan sampai bulan hak terlewati";
      return out;
    }
    return terapkanHasilMingguPasal33_(out, basisDate.getDate(), false);
  }

  if (selisihBulan < 0) {
    out.poinHak = 20;
    out.persenProdHak = 20;
    out.statusLabel = "Dilaporkan lebih awal";
    return out;
  }
  if (selisihBulan > 0) {
    out.poinHak = 0;
    out.persenProdHak = 0;
    out.statusLabel = "Dilaporkan setelah bulan hak terlewati";
    return out;
  }
  return terapkanHasilMingguPasal33_(out, basisDate.getDate(), true);
}

function cariSubmitPasal33Pegawai_(idUser, periodeLaporan) {
  var result = { ada: false, tgl: null, status: "" };
  if (!idUser || !periodeLaporan) return result;

  var data = getRekapKinerjaValuesReadOnly_();
  var markerNama = "Paket Kegiatan Wajib Bulan: " + periodeLaporan;
  var markerDesk = "BULAN LAPORAN: " + periodeLaporan;

  for (var i = 1; i < data.length; i++) {
    var rowId = data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER] != null ? data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER].toString().trim() : "";
    if (!idsEqual_(rowId, idUser)) continue;

    var kategori = (data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "").toString();
    if (!isKategoriWajibBulanan_(kategori)) continue;

    var namaKegiatan = (data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN] || "").toString();
    var deskripsi = (data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || "").toString();
    if (namaKegiatan.indexOf(markerNama) === -1 && deskripsi.indexOf(markerDesk) === -1) continue;

    var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
    if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

    if (!result.ada || tglLap.getTime() < result.tgl.getTime()) {
      result = {
        ada: true,
        tgl: tglLap,
        status: (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString()
      };
    }
  }
  return result;
}

function hitungHakPasal33UntukBulanHak_(idUser, jabatan, tahunHak, bulanHakIdx, tanggalAcuan) {
  var hasil = {
    aktif: false,
    periodeLaporan: "",
    poinHak: 0,
    persenProdHak: 0,
    statusLabel: "Bukan target Pasal 33",
    adaLaporan: false,
    statusLaporan: ""
  };

  if (!idUser || !isTargetPasal33_(jabatan)) return hasil;

  hasil.aktif = true;
  hasil.periodeLaporan = periodePrevMonthDariBulanHak_(tahunHak, bulanHakIdx);

  var submitInfo = cariSubmitPasal33Pegawai_(idUser, hasil.periodeLaporan);
  var evalHak = evaluasiPasal33Hak_(hasil.periodeLaporan, tanggalAcuan, submitInfo.ada ? submitInfo.tgl : null);

  hasil.poinHak = Number(evalHak.poinHak || 0);
  hasil.persenProdHak = Number(evalHak.persenProdHak || 0);
  hasil.statusLabel = evalHak.statusLabel || "-";
  hasil.adaLaporan = submitInfo.ada;
  hasil.statusLaporan = submitInfo.status || "";
  return hasil;
}

function formatPeriodeLabelWajib_(periode) {
  var s = (periode || "").toString().trim();
  var m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return s || "-";

  var namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  var tahun = parseInt(m[1], 10);
  var bulan = parseInt(m[2], 10);
  if (isNaN(tahun) || isNaN(bulan) || bulan < 1 || bulan > 12) return s;

  return namaBulan[bulan - 1] + " " + tahun;
}

function cekNotifikasiLaporanWajib(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return {
        sukses: false,
        aktif: false,
        pesan: "Sesi habis. Silakan login ulang."
      };
    }

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) {
      return {
        sukses: false,
        aktif: false,
        pesan: "Data pegawai tidak ditemukan."
      };
    }

    var jabatan = (pegawai.jabatan || "").toString();
    if (!isTargetPasal33_(jabatan)) {
      return {
        sukses: true,
        aktif: false,
        roleLabel: jabatan
      };
    }

    var sekarang = new Date();
    var tahunHak = sekarang.getFullYear();
    var bulanHakIdx = sekarang.getMonth();

    var hak = hitungHakPasal33UntukBulanHak_(idUser, jabatan, tahunHak, bulanHakIdx, sekarang);
    var periodeTarget = hak.periodeLaporan || "";
    var labelPeriodeTarget = formatPeriodeLabelWajib_(periodeTarget);

    if (hak.adaLaporan) {
      return {
        sukses: true,
        aktif: false,
        roleLabel: jabatan,
        periodeTarget: periodeTarget,
        labelPeriodeTarget: labelPeriodeTarget,
        statusLabel: hak.statusLabel || "",
        statusLaporan: hak.statusLaporan || ""
      };
    }

    var statusLabel = (hak.statusLabel || "").toString();
    var terlambat = /terlambat|potong/i.test(statusLabel);

    var judul = terlambat
      ? "Laporan wajib bulanan belum diunggah"
      : "Pengingat laporan wajib bulanan";

    var tunjangan = { maxProd: 0 };
    try { tunjangan = getTunjanganPegawai_(idUser, jabatan) || tunjangan; } catch (e) { }
    var maxProd = Number(tunjangan.maxProd) || 0;
    var poinHak = Number(hak.poinHak) || 0;
    var rpPotensi = (poinHak / 100) * maxProd;
    var formatRp = "Rp " + Math.round(rpPotensi).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    var pesan =
      "Anda belum mengunggah paket laporan wajib untuk periode " + labelPeriodeTarget + ".\n" +
      "Status saat ini: " + (statusLabel || "-") + ".\n" +
      "(Potensi Sisa Hak Produktivitas Anda saat ini tinggal " + poinHak + "% / " + formatRp + " bila menyerahkan hari ini)\n\n" +
      "Silakan unggah melalui menu Input → Laporan Produktifitas → Pelaksanaan kegiatan wajib.";

    return {
      sukses: true,
      aktif: true,
      terlambat: terlambat,
      judul: judul,
      pesan: pesan,
      roleLabel: jabatan,
      periodeTarget: periodeTarget,
      labelPeriodeTarget: labelPeriodeTarget,
      statusLabel: statusLabel,
      poinHak: Number(hak.poinHak || 0),
      persenProdHak: Number(hak.persenProdHak || 0)
    };
  } catch (e) {
    return handleError("cekNotifikasiLaporanWajib", e, {
      sukses: false,
      aktif: false,
      pesan: ""
    });
  }
}

function isCarik_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  return role !== null && role.kunci === "CARIK";
}

function isLurah_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  return role !== null && role.kunci === "LURAH";
}

function isDukuhJabatanAktif_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  return role !== null && role.kunci === "DUKUH";
}

function normalisasiJenisTugasPimpinan_(jenis) {
  var s = String(jenis || '').trim();
  if (s === 'Mewakili Lurah - Supra Kalurahan') return 'Mengikuti rapat/bimtek/sosialisasi supra kalurahan';
  if (s === 'Mewakili Lurah - Masyarakat/LKK') return 'Mengikuti kegiatan masyarakat/kelompok masyarakat/lembaga kemasyarakatan';
  if (s === 'Tugas Piket Pelayanan Kantor' || s === 'Jadwal Piket' || s === 'Jadwal Piket Dukuh') return 'Pelayanan masyarakat di Kantor Lurah dalam rangka tugas piket';
  return s;
}

function validasiJadwalPiketKhususDukuh_(paket, pegawaiUser) {
  if (!paket || !paket.detailPimpinan) return { sukses: true };
  var detail = paket.detailPimpinan || {};
  var jenis = normalisasiJenisTugasPimpinan_(detail.jenis);
  var dasar = String(detail.dasar || '').trim();
  var memakaiJadwalPiket = jenis === 'Pelayanan masyarakat di Kantor Lurah dalam rangka tugas piket' || dasar === 'Jadwal Piket';
  if (memakaiJadwalPiket && !isDukuhJabatanAktif_(pegawaiUser && pegawaiUser.jabatan)) {
    return { sukses: false, pesan: 'Jadwal piket hanya berlaku untuk kelompok jabatan Dukuh.' };
  }
  if (detail.jenis !== jenis) detail.jenis = jenis;
  // Jangan ubah dasar 'Jadwal Piket' menjadi 'Surat Tugas/Disposisi'.
  // Untuk Dukuh, dokumen yang diunggah memang jadwal piket sebagai dokumen dasar.
  if (dasar === 'Jadwal Piket') detail.dasar = 'Jadwal Piket';
  return { sukses: true };
}

function isPiketDukuhPasal60_(detail) {
  if (!detail) return false;
  var jenis = normalisasiJenisTugasPimpinan_(detail.jenis);
  var dasar = String(detail.dasar || '').trim();
  return jenis === 'Pelayanan masyarakat di Kantor Lurah dalam rangka tugas piket' || dasar === 'Jadwal Piket';
}

function hitungHariKerjaSetelahTanggal_(tanggalMulai, tanggalAkhir) {
  var mulai = parseTanggal(tanggalMulai);
  var akhir = parseTanggal(tanggalAkhir || new Date());
  if (!(mulai instanceof Date) || isNaN(mulai.getTime()) || mulai.getTime() === 0) return 0;
  if (!(akhir instanceof Date) || isNaN(akhir.getTime())) akhir = new Date();

  var d = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate());
  var end = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate());
  var hariKerja = 0;
  d.setDate(d.getDate() + 1);

  while (d.getTime() <= end.getTime()) {
    var day = d.getDay();
    if (day !== 0 && day !== 6) hariKerja++;
    d.setDate(d.getDate() + 1);
  }
  return hariKerja;
}

function evaluasiPasal60TugasPimpinan_(detail, tanggalSubmit) {
  var out = { aktif: isPasal60BatasDuaHariKerjaAktif_(), tepatWaktu: true, hariKerjaLewat: 0, catatan: '' };
  if (!detail || isPiketDukuhPasal60_(detail)) {
    out.catatan = 'Piket Dukuh dikecualikan dari laporan hasil kegiatan 2 hari kerja karena pelaksanaan dilaporkan melalui presensi.';
    return out;
  }

  out.hariKerjaLewat = hitungHariKerjaSetelahTanggal_(detail.tanggal, tanggalSubmit || new Date());
  out.tepatWaktu = out.hariKerjaLewat <= 2;

  if (!out.aktif) {
    out.catatan = 'Masa transisi: batas laporan 2 hari kerja Pasal 60 belum diberlakukan otomatis.';
    return out;
  }

  out.catatan = out.tepatWaktu
    ? 'Laporan tugas pimpinan masih dalam batas 2 hari kerja Pasal 60.'
    : 'Laporan tugas pimpinan melewati batas 2 hari kerja Pasal 60.';
  return out;
}

function isAdminUtamaPegawai_(pegawai) {
  if (!pegawai) return false;
  var role = cariJabatanRole_(pegawai.jabatan);
  return role !== null && (role.kunci === "CARIK" || role.kunci === "LURAH");
}

function isBendaharaDanarta_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  return role !== null && role.kunci === "KAUR_DANARTA";
}

function cekHakAksesCarikTunjangan(idUser) {
  var pegawai = getPegawaiById_(idUser);
  if (!pegawai) return false;
  return isCarik_(pegawai.jabatan);
}

function cekHakAksesLurahTunjangan(idUser) {
  var pegawai = getPegawaiById_(idUser);
  if (!pegawai) return false;
  return isLurah_(pegawai.jabatan);
}

function cekHakAksesBendaharaTunjangan(idUser) {
  var pegawai = getPegawaiById_(idUser);
  if (!pegawai) return false;
  return isBendaharaDanarta_(pegawai.jabatan);
}

function cekHakAksesTunjangan(idUser) {
  return cekHakAksesAdmin(idUser) || cekHakAksesBendaharaTunjangan(idUser);
}

function cekHakAksesPredikatPimpinan(idUser) {
  return cekHakAksesAdmin(idUser);
}

function logAudit(idUser, aksi, detail) {
  try {
    getSheet_("Audit_Log").appendRow([new Date(), idUser, aksi, detail]);
  } catch (e) {
    Logger.log("Peringatan: Gagal mencatat logAudit. Detail: " + e.message);
  }
}


function getInternalErrorMessage_(error) {
  try {
    if (error && error.message) return String(error.message);
    return String(error);
  } catch (e) {
    return "Unknown error";
  }
}

function buatErrorIdAman_() {
  try {
    return Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase();
  } catch (e) {
    return "ERR" + new Date().getTime();
  }
}

function pesanGangguanSistemAman_(errorId) {
  return "Terjadi gangguan sistem. Silakan coba lagi atau hubungi Admin. Kode error: " + errorId;
}

function isPesanErrorTeknis_(message) {
  var s = (message || "").toString().trim();
  if (!s) return true;
  if (s.length > 220) return true;

  // Pesan yang diawali label error teknis jangan dikirim apa adanya ke user.
  if (/^(ERROR|Error|Error Sistem|Exception|TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError)\s*:/i.test(s)) return true;

  // Indikator kuat kebocoran struktur internal Apps Script / spreadsheet / Drive.
  if (/(SPREADSHEET_ID|SCRIPT_PROP|Script Properties|PropertiesService|CacheService|LockService|SpreadsheetApp|DriveApp|HtmlService|UrlFetchApp|Utilities\.|openById|getSheetByName|getRange|setValue|appendRow|insertRows|rowIndex|lineNumber|stack|undefined|null|Cannot read|Cannot call|is not defined|not a function|Unexpected token|Invalid or unexpected token|Sheet\s+'|Folder|Drive|database|query|SQL|range|service invoked too many times)/i.test(s)) return true;

  // Jangan tampilkan potongan JSON/HTML/stack/path.
  if (/[{}<>]/.test(s)) return true;
  if (/(\/|\\)[A-Za-z0-9_\-. ]+(\/|\\)/.test(s)) return true;

  return false;
}

function sanitasiPesanErrorUntukUser_(message, errorId) {
  var s = (message || "").toString().replace(/\u00a0/g, " ").trim();
  if (isPesanErrorTeknis_(s)) {
    return pesanGangguanSistemAman_(errorId);
  }
  return s;
}

function catatErrorInternal_(functionName, error, errorId) {
  var msg = getInternalErrorMessage_(error);
  var stack = "";
  try {
    stack = error && error.stack ? " | stack: " + String(error.stack) : "";
  } catch (e) { }

  Logger.log("ERROR_ID " + errorId + " in " + functionName + ": " + msg + stack);

  try {
    logAudit("SYSTEM", "ERROR_" + functionName, "Error ID: " + errorId + " | " + msg);
  } catch (auditErr) {
    Logger.log("Peringatan: Gagal mencatat audit error untuk " + functionName + ". Error ID: " + errorId + ". Detail audit: " + getInternalErrorMessage_(auditErr));
  }
}

function pesanErrorStringAman_(functionName, error, prefix) {
  var errorId = buatErrorIdAman_();
  catatErrorInternal_(functionName, error, errorId);
  return (prefix || "") + sanitasiPesanErrorUntukUser_(getInternalErrorMessage_(error), errorId);
}

function handleError(functionName, error, defaultReturn) {
  var errorId = buatErrorIdAman_();
  catatErrorInternal_(functionName, error, errorId);

  if (typeof defaultReturn === "undefined" || defaultReturn === null) {
    defaultReturn = { sukses: false, pesan: pesanGangguanSistemAman_(errorId) };
  }

  if (typeof defaultReturn === "object") {
    if (typeof defaultReturn.pesan === "undefined" || defaultReturn.pesan === null || defaultReturn.pesan === "") {
      defaultReturn.pesan = pesanGangguanSistemAman_(errorId);
    } else {
      defaultReturn.pesan = sanitasiPesanErrorUntukUser_(defaultReturn.pesan, errorId);
    }

    // Jangan bocorkan detail exception lewat field debug. Cukup beri ID untuk pelacakan log.
    if (typeof defaultReturn.debug !== "undefined") {
      defaultReturn.debug = "ERROR_ID_" + errorId;
    }

    defaultReturn.errorId = errorId;
  }

  return defaultReturn;
}

// FIX BUG: Tambah parameter namaModel — sebelumnya 'modelAI' direferensikan
// sebagai variabel bebas yang tidak pernah terdefinisi (selalu undefined).
function logAI(idLaporan, prompt, respons, poin, statusObj, indexRekap, namaModel) {
  try {
    // Status bisa = "PENDING", "SELESAI", "ERROR"
    var C = SHEET_COLUMNS.AI_LOGS;
    var status = statusObj || "SELESAI";
    var idx = indexRekap || "";
    var modelLabel = namaModel || "gemini-2.5-flash";
    var row = [];
    row[C.WAKTU] = new Date();
    row[C.ID_LAPORAN] = idLaporan;
    row[C.PROMPT] = prompt;
    row[C.RESPONS] = respons;
    row[C.POIN] = poin;
    row[C.STATUS] = status;
    row[C.INDEX_REKAP] = idx;
    row[C.MODEL] = modelLabel;
    ensureSheetAILogs_().appendRow(row);
  } catch (e) {
    Logger.log("Peringatan: Gagal mencatat logAI. Detail: " + e.message);
  }
}

function folderCacheKey_(parentFolder, namaFolder) {
  var parentId = '';
  try { parentId = parentFolder && parentFolder.getId ? parentFolder.getId() : ''; } catch (e) { parentId = ''; }
  var safeName = String(namaFolder || 'folder')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .substring(0, 80);
  return 'FOLDER_ID_CHILD_' + parentId + '_' + safeName;
}

function dapatkanAtauBuatFolder(parentFolder, namaFolder) {
  if (!parentFolder) throw new Error('Folder induk tidak valid.');
  namaFolder = String(namaFolder || '').trim();
  if (!namaFolder) throw new Error('Nama folder tidak boleh kosong.');

  var props = PropertiesService.getScriptProperties();
  var cacheKey = folderCacheKey_(parentFolder, namaFolder);
  var cachedId = (props.getProperty(cacheKey) || '').trim();

  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId);
    } catch (e) {
      // ID cache mungkin sudah dihapus/dipindahkan. Hapus cache lalu fallback cari sekali.
      props.deleteProperty(cacheKey);
    }
  }

  // Fallback hanya saat cache belum ada. Setelah ditemukan/dibuat, akses berikutnya memakai ID folder.
  var folders = parentFolder.getFoldersByName(namaFolder);
  var folder = folders.hasNext() ? folders.next() : parentFolder.createFolder(namaFolder);
  try { props.setProperty(cacheKey, folder.getId()); } catch (e2) { }
  return folder;
}

function parseTanggal(val) {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date(0) : val;
  }
  if (val === null || val === undefined || val === "") {
    return new Date(0);
  }

  var str = val.toString().trim();
  if (!str) return new Date(0);

  var m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m1) {
    return new Date(
      parseInt(m1[3], 10),
      parseInt(m1[2], 10) - 1,
      parseInt(m1[1], 10),
      parseInt(m1[4] || "0", 10),
      parseInt(m1[5] || "0", 10),
      parseInt(m1[6] || "0", 10)
    );
  }

  var m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m2) {
    return new Date(
      parseInt(m2[1], 10),
      parseInt(m2[2], 10) - 1,
      parseInt(m2[3], 10),
      parseInt(m2[4] || "0", 10),
      parseInt(m2[5] || "0", 10),
      parseInt(m2[6] || "0", 10)
    );
  }

  if (/^\d+$/.test(str)) {
    var num = Number(str);
    if (num > 100000000000) {
      var dTs = new Date(num);
      return isNaN(dTs.getTime()) ? new Date(0) : dTs;
    }
  }

  var d = new Date(str);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// ─── Master_Tunjangan helpers ─────────────────────────────────────────────────
// Struktur sheet aktual (Tunjangan Kinerja Tahun 2026):
//   Baris 1 : Judul sheet (mis. "Tunjangan Kinerja Tahun 2026") — dilewati otomatis
//   Baris 2 : Header kolom
//     A = Jabatan
//     B = Jumlah Total Tunjangan Kinerja  (30% dari penghasilan tetap)
//     C = Plafon Tunjangan Produktifitas  (40% dari Tunjangan Kinerja)
//     D = Plafon Tunjangan Tugas Umum     (20% dari Tunjangan Kinerja)
//   Baris 3+ : Data per jabatan
// Lookup: nama Jabatan (exact, lalu fuzzy) → fallback {0,0,0}

function normalizeHeader_(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeaderIndex_(headers, kandidat) {
  for (var i = 0; i < headers.length; i++) {
    var h = normalizeHeader_(headers[i]);
    for (var j = 0; j < kandidat.length; j++) {
      if (h === normalizeHeader_(kandidat[j])) return i;
    }
  }
  return -1;
}

function toNumber_(v) {
  if (v === null || v === undefined || v === "") return 0;
  var n = Number(v.toString().replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function registerJabatanAlias_(mapObj, key, valueObj) {
  if (!key) return;
  mapObj[key] = valueObj;
}

// ===== MASTER TUNJANGAN CACHING (Performance Optimization v2026.04.20.9) =====
// Problem: getMasterTunjanganMap_() was called 100+ times when processing 100+ employees
// Solution: Cache the result using CacheService (fast) + PropertiesService (persistent)
// Impact: 100x processing speed improvement from O(n²) to O(n)

var MASTER_TUNJANGAN_CACHE_KEY = "MasterTunjanganMap";
var MASTER_TUNJANGAN_CACHE_TTL = CONFIG.CACHE.MASTER_TUNJANGAN_TTL;

function getMasterTunjanganMapCached_() {
  // Try CacheService first (fastest, expires after 1 hour)
  var scriptCache = CacheService.getScriptCache();
  var cached = scriptCache.get(MASTER_TUNJANGAN_CACHE_KEY);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log("⚠️ Cache parse error, rebuilding: " + e.message);
    }
  }

  // Try PropertiesService as fallback
  var props = PropertiesService.getScriptProperties();
  var propsCached = props.getProperty(MASTER_TUNJANGAN_CACHE_KEY);

  if (propsCached) {
    try {
      var result = JSON.parse(propsCached);
      // Re-cache in CacheService for faster access next time
      scriptCache.put(MASTER_TUNJANGAN_CACHE_KEY, propsCached, MASTER_TUNJANGAN_CACHE_TTL);
      return result;
    } catch (e) {
      Logger.log("⚠️ Properties cache parse error: " + e.message);
    }
  }

  // Build from scratch if not cached
  Logger.log("🔨 Building Master Tunjangan map (not in cache)");
  var map = getMasterTunjanganMap_();

  // Store in both caches
  try {
    var mapJson = JSON.stringify(map);
    scriptCache.put(MASTER_TUNJANGAN_CACHE_KEY, mapJson, MASTER_TUNJANGAN_CACHE_TTL);
    props.setProperty(MASTER_TUNJANGAN_CACHE_KEY, mapJson);
    Logger.log("✅ Master Tunjangan map cached");
  } catch (e) {
    Logger.log("⚠️ Cache storage error: " + e.message);
  }

  return map;
}

function refreshMasterTunjanganCache_() {
  // Clear both caches and rebuild
  try {
    CacheService.getScriptCache().remove(MASTER_TUNJANGAN_CACHE_KEY);
    PropertiesService.getScriptProperties().deleteProperty(MASTER_TUNJANGAN_CACHE_KEY);
    getMasterTunjanganMapCached_(); // Rebuild immediately
    return { sukses: true, pesan: "Master Tunjangan cache refreshed" };
  } catch (e) {
    return handleError("refreshMasterTunjanganCache_", e, { sukses: false, pesan: "" });
  }
}

// Consolidate alias registration mapping
var JABATAN_ALIAS_MAPPING = {
  "kepala urusan danarta": ["kepala urusan danarta", "kaur danarta", "ka ur danarta", "danarta"],
  "kepala urusan pangripta": ["kepala urusan pangripta", "kaur pangripta", "ka ur pangripta", "pangripta"],
  "kepala urusan tata laksana": ["kepala urusan tata laksana", "kaur tata laksana", "ka ur tata laksana", "tata laksana"],
  "staf kepala urusan danarta": ["staf kepala urusan danarta", "staf kaur danarta", "staf ka ur danarta"],
  "staf kepala urusan pangripta": ["staf kepala urusan pangripta", "staf kaur pangripta", "staf ka ur pangripta"],
  "staf kepala urusan tata laksana": ["staf kepala urusan tata laksana", "staf kaur tata laksana", "staf ka ur tata laksana"]
};

function registerJabatanAliases_(byJabatan, canon, obj) {
  // Register main canonicalized form
  registerJabatanAlias_(byJabatan, canon, obj);

  // Register additional aliases based on keyword matching
  for (var keyword in JABATAN_ALIAS_MAPPING) {
    if (canon.indexOf(keyword) !== -1) {
      var aliases = JABATAN_ALIAS_MAPPING[keyword];
      for (var i = 0; i < aliases.length; i++) {
        registerJabatanAlias_(byJabatan, aliases[i], obj);
      }
    }
  }
}

function getMasterTunjanganMap_() {
  try {
    var sheet = getSS_().getSheetByName("Master_Tunjangan");
    if (!sheet) return { byId: {}, byJabatan: {} };
    var rawData = sheet.getDataRange().getValues();
    if (!rawData || rawData.length < 2) return { byId: {}, byJabatan: {} };

    var headerRowIdx = -1;
    for (var r = 0; r < rawData.length; r++) {
      for (var c = 0; c < rawData[r].length; c++) {
        if (normalizeHeader_(rawData[r][c]) === "jabatan") { headerRowIdx = r; break; }
      }
      if (headerRowIdx >= 0) break;
    }
    if (headerRowIdx < 0) {
      Logger.log("getMasterTunjanganMap_: baris header tidak ditemukan di sheet Master_Tunjangan");
      return { byId: {}, byJabatan: {} };
    }

    var headers = rawData[headerRowIdx];
    var idxJabatan = findHeaderIndex_(headers, ["Jabatan", "jabatan"]);
    var idxTotal = findHeaderIndex_(headers, [
      "Jumlah Total Tunjangan Kinerja", "jumlah total tunjangan kinerja",
      "Total Tunjangan Kinerja", "total tunjangan kinerja",
      "Total Tunjangan", "total tunjangan",
      "Siltap", "Besaran Siltap", "besaran siltap"
    ]);
    var idxMaxProd = findHeaderIndex_(headers, [
      "Plafon Tunjangan Produktifitas", "plafon tunjangan produktifitas",
      "Plafon Tunjangan Produktivitas", "plafon tunjangan produktivitas",
      "Plafon Produktifitas", "plafon produktifitas",
      "Maks Produktifitas", "Maks Produktivitas",
      "maks produktifitas", "maks produktivitas", "Maks Prod"
    ]);
    var idxMaxTU = findHeaderIndex_(headers, [
      "Plafon Tunjangan Tugas Umum", "plafon tunjangan tugas umum",
      "Plafon Tugas Umum", "plafon tugas umum",
      "Maks Tugas Umum", "maks tugas umum", "Maks TU", "maks tu"
    ]);

    var byId = {}, byJabatan = {};
    for (var i = headerRowIdx + 1; i < rawData.length; i++) {
      var row = rawData[i];
      var jabatanRaw = idxJabatan >= 0 ? (row[idxJabatan] || "").toString().trim() : "";
      var total = idxTotal >= 0 ? toNumber_(row[idxTotal]) : 0;
      var maxProd = idxMaxProd >= 0 ? toNumber_(row[idxMaxProd]) : 0;
      var maxTU = idxMaxTU >= 0 ? toNumber_(row[idxMaxTU]) : 0;
      if (!jabatanRaw || jabatanRaw === "-") continue;
      if ((!maxProd || !maxTU) && total > 0) {
        maxProd = Math.round(total * 0.40);
        maxTU = Math.round(total * 0.20);
      }

      var obj = { jabatan: jabatanRaw, siltap: total, maxProd: maxProd, maxTU: maxTU };
      var canon = canonicalizeJabatan_(jabatanRaw);

      // Register main + aliases using consolidated function (Performance: less code, faster)
      registerJabatanAliases_(byJabatan, canon, obj);
    }
    return { byId: byId, byJabatan: byJabatan };
  } catch (e) {
    Logger.log("getMasterTunjanganMap_ error: " + e.message);
    return { byId: {}, byJabatan: {} };
  }
}

function getTunjanganPegawai_(idUser, jabatan) {
  // Use cached version instead of building from scratch each time
  var master = getMasterTunjanganMapCached_();  // ← PERFORMANCE FIX: Use cached version
  var jabKey = canonicalizeJabatan_(jabatan);

  if (jabKey && master.byJabatan[jabKey]) return master.byJabatan[jabKey];
  for (var key in master.byJabatan) {
    if (jabKey.indexOf(key) !== -1 || key.indexOf(jabKey) !== -1) {
      return master.byJabatan[key];
    }
  }

  if (jabKey.indexOf("danarta") !== -1) {
    if (master.byJabatan["kepala urusan danarta"]) return master.byJabatan["kepala urusan danarta"];
    if (master.byJabatan["kaur danarta"]) return master.byJabatan["kaur danarta"];
    if (master.byJabatan["danarta"]) return master.byJabatan["danarta"];
  }
  if (jabKey.indexOf("pangripta") !== -1) {
    if (master.byJabatan["kepala urusan pangripta"]) return master.byJabatan["kepala urusan pangripta"];
    if (master.byJabatan["kaur pangripta"]) return master.byJabatan["kaur pangripta"];
    if (master.byJabatan["pangripta"]) return master.byJabatan["pangripta"];
  }
  if (jabKey.indexOf("tata laksana") !== -1) {
    if (master.byJabatan["kepala urusan tata laksana"]) return master.byJabatan["kepala urusan tata laksana"];
    if (master.byJabatan["kaur tata laksana"]) return master.byJabatan["kaur tata laksana"];
    if (master.byJabatan["tata laksana"]) return master.byJabatan["tata laksana"];
  }
  return { maxProd: 0, maxTU: 0, siltap: 0 };
}
// ─── END Master_Tunjangan helpers ─────────────────────────────────────────────


var REKAP_TUNJANGAN_HEADERS = [
  "periode", "id_user", "nama", "jabatan", "kelompok", "jumlah_laporan_disetujui",
  "poin_prod", "poin_tu", "persen_prod", "persen_tu", "max_prod", "max_tu",
  "rp_prod", "rp_tu", "rp_total", "status_rekap", "catatan_carik", "catatan_lurah",
  "catatan_bendahara", "dibuat_oleh", "dibuat_pada", "dikunci_pada", "diajukan_pada",
  "disetujui_pada", "dikembalikan_pada", "diteruskan_bendahara_pada", "dicairkan_pada",
  "nomor_bukti_cair", "batch_id", "is_active", "label_pembayaran", "tanggal_mulai_periode",
  "tanggal_akhir_periode", "tanggal_cutoff"
];

var AUDIT_TUNJANGAN_HEADERS = [
  "waktu", "id_user", "nama_user", "aksi", "periode", "target_id_user", "target_nama",
  "status_lama", "status_baru", "detail"
];

var AI_LOG_HEADERS = [
  "waktu", "id_laporan", "prompt", "respons", "poin", "status", "index_rekap", "model_ai"
];

var DISPOSISI_SURAT_HEADERS = [
  "id_disposisi",
  "nomor_disposisi",
  "tanggal_disposisi",
  "jenis_disposisi",
  "perihal",
  "isi_ringkas_instruksi",
  "pemberi_id",
  "pemberi_nama",
  "pemberi_jabatan",
  "lampiran_url",
  "lampiran_nama",
  "tanggal_mulai",
  "tanggal_selesai",
  "status_disposisi",
  "dibuat_pada",
  "diubah_pada",
  "sumber_disposisi",
  "nomor_lembar_manual",
  "tanggal_lembar_manual",
  "diinput_oleh_id",
  "diinput_oleh_nama",
  "diinput_oleh_jabatan",
  "diinput_pada",
  "mode_input",
  "catatan_operator"
];

var DISPOSISI_PENERIMA_HEADERS = [
  "id_disposisi",
  "id_penerima",
  "nama_penerima",
  "jabatan_penerima",
  "mode_penerima",
  "status_baca",
  "status_tindak_lanjut",
  "id_laporan_terkait",
  "waktu_lapor",
  "catatan_tindak_lanjut",
  "dibuat_pada",
  "diubah_pada"
];

var DISPOSISI_LOG_HEADERS = [
  "waktu",
  "id_disposisi",
  "aksi",
  "oleh_id",
  "oleh_nama",
  "oleh_jabatan",
  "detail",
  "id_log",
  "aktor_peran",
  "target_tipe",
  "target_id",
  "target_nama",
  "alasan",
  "detail_json"
];

var DISPOSISI_PETUGAS_HEADERS = [
  "id_penugasan",
  "pegawai_id",
  "pegawai_nama",
  "pegawai_jabatan",
  "status_petugas",
  "ditetapkan_oleh_id",
  "ditetapkan_oleh_nama",
  "ditetapkan_pada",
  "dinonaktifkan_oleh_id",
  "dinonaktifkan_oleh_nama",
  "dinonaktifkan_pada",
  "catatan"
];


function ensureHeaderSheet_(sheet, headers) {
  var maxCols = Math.max(sheet.getMaxColumns(), headers.length);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var same = true;
  for (var i = 0; i < headers.length; i++) {
    if ((existing[i] || "").toString() !== headers[i]) {
      same = false;
      break;
    }
  }
  if (!same) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function ensureSheetAILogs_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("AI_Logs");
  if (!sh) {
    sh = ss.insertSheet("AI_Logs");
    ensureHeaderSheet_(sh, AI_LOG_HEADERS);
    return sh;
  }

  // Jangan menimpa sheet lama yang mungkin belum memiliki header dan baris pertamanya sudah data log.
  // Header hanya dipastikan jika sheet kosong atau baris pertamanya terlihat seperti header.
  try {
    var lastRow = sh.getLastRow();
    if (lastRow === 0) {
      ensureHeaderSheet_(sh, AI_LOG_HEADERS);
    } else {
      var firstCell = normalizeHeader_(sh.getRange(1, 1).getValue());
      if (!firstCell || firstCell === "waktu" || firstCell === "timestamp") {
        ensureHeaderSheet_(sh, AI_LOG_HEADERS);
      }
    }
  } catch (e) {
    Logger.log("Peringatan: Gagal memastikan header AI_Logs. Detail: " + (e && e.message ? e.message : e));
  }

  return sh;
}



function ensureSheetDisposisiSurat_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Disposisi_Surat");
  if (!sh) sh = ss.insertSheet("Disposisi_Surat");
  ensureHeaderSheet_(sh, DISPOSISI_SURAT_HEADERS);
  return sh;
}

function ensureSheetDisposisiPenerima_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Disposisi_Penerima");
  if (!sh) sh = ss.insertSheet("Disposisi_Penerima");
  ensureHeaderSheet_(sh, DISPOSISI_PENERIMA_HEADERS);
  return sh;
}

function ensureSheetDisposisiLog_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Disposisi_Log");
  if (!sh) sh = ss.insertSheet("Disposisi_Log");
  ensureHeaderSheet_(sh, DISPOSISI_LOG_HEADERS);
  return sh;
}

function ensureSheetDisposisiPetugas_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Disposisi_Petugas");
  if (!sh) sh = ss.insertSheet("Disposisi_Petugas");
  ensureHeaderSheet_(sh, DISPOSISI_PETUGAS_HEADERS);
  return sh;
}

function cekHakAksesLurahDisposisi_(idUser) {
  var pegawai = getPegawaiById_(idUser);
  if (!pegawai) return false;
  return isLurah_(pegawai.jabatan);
}

function getDaftarPegawaiAktifUntukDisposisiInternal_() {
  var data = getPegawaiDataCached_() || [];
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]) continue;
    var statusPegawai = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.STATUS] || "").toString().trim().toLowerCase();
    if (statusPegawai && statusPegawai !== "aktif") continue;
    var jabatan = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || "").toString();
    if (isLurah_(jabatan)) continue;
    list.push({
      id: data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID].toString(),
      username: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] || "").toString(),
      nama: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || "").toString(),
      jabatan: jabatan,
      wa: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.WA] || "").toString(),
      waNormalized: normalisasiNomorWhatsAppIndonesia_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.WA] || "")
    });
  }
  list.sort(function (a, b) {
    return (a.nama || '').localeCompare((b.nama || ''), 'id', { sensitivity: 'base' });
  });
  return list;
}

function ambilDaftarPegawaiAktifUntukDisposisi(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", data: [] };
    return { sukses: true, data: getDaftarPegawaiAktifUntukDisposisiInternal_() };
  } catch (e) {
    return handleError("ambilDaftarPegawaiAktifUntukDisposisi", e, { sukses: false, pesan: "", data: [] });
  }
}


function ensureSheetRekapTunjanganBulanan_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Rekap_Tunjangan_Bulanan");
  if (!sh) sh = ss.insertSheet("Rekap_Tunjangan_Bulanan");
  ensureHeaderSheet_(sh, REKAP_TUNJANGAN_HEADERS);

  // Penting: kolom A (periode) harus teks agar nilai seperti "2026-04"
  // tidak diubah Google Sheets menjadi Date. Ini yang membuat akun Lurah
  // sebelumnya tidak menemukan batch aktif meskipun baris draft sudah ada.
  try {
    sh.getRange("A:A").setNumberFormat("@");
  } catch (e) {
    Logger.log("Peringatan set format kolom periode tunjangan: " + (e && e.message ? e.message : e));
  }

  return sh;
}

function ensureSheetAuditTunjangan_() {
  var ss = getSS_();
  var sh = ss.getSheetByName("Audit_Tunjangan");
  if (!sh) sh = ss.insertSheet("Audit_Tunjangan");
  ensureHeaderSheet_(sh, AUDIT_TUNJANGAN_HEADERS);
  return sh;
}

function logAuditTunjangan_(idUser, aksi, periode, targetIdUser, targetNama, statusLama, statusBaru, detail) {
  try {
    var sh = ensureSheetAuditTunjangan_();
    var pegawai = getPegawaiById_(idUser) || {};
    sh.appendRow([
      new Date(),
      idUser || "",
      pegawai.nama || "",
      aksi || "",
      periode || "",
      targetIdUser || "",
      targetNama || "",
      statusLama || "",
      statusBaru || "",
      detail || ""
    ]);
  } catch (e) {
    Logger.log("Gagal logAuditTunjangan_: " + e.message);
  }
}

function periodeKeyTunjangan_(value, strict) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, "GMT+7", "yyyy-MM");
  }

  if (value === null || value === undefined) {
    if (strict) throw new Error("Format periode harus yyyy-MM.");
    return "";
  }

  var s = String(value).replace(/\u00a0/g, " ").trim();
  if (!s) {
    if (strict) throw new Error("Format periode harus yyyy-MM.");
    return "";
  }

  // Hilangkan apostrof teks jika ada: '2026-04
  s = s.replace(/^'/, "");

  // Terima 2026-04, 2026-4, 2026-04-01, atau 2026/04/01.
  var m = s.match(/^(\d{4})[-\/](\d{1,2})(?:[-\/]\d{1,2})?/);
  if (m) {
    var y = m[1];
    var mo = parseInt(m[2], 10);
    if (mo >= 1 && mo <= 12) {
      return y + "-" + String(mo).padStart(2, "0");
    }
  }

  // Fallback untuk string Date seperti "Wed Apr 01 2026 ...".
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, "GMT+7", "yyyy-MM");
  }

  if (strict) throw new Error("Format periode harus yyyy-MM.");
  return s;
}

function normalizePeriode_(periode) {
  return periodeKeyTunjangan_(periode, true);
}

function normalizeCutoffDay_(cutoffDay) {
  var n = parseInt(cutoffDay, 10);
  if (isNaN(n)) n = DEFAULT_TUNJANGAN_CUTOFF_DAY;
  if (n < MIN_TUNJANGAN_CUTOFF_DAY) n = MIN_TUNJANGAN_CUTOFF_DAY;
  if (n > MAX_TUNJANGAN_CUTOFF_DAY) n = MAX_TUNJANGAN_CUTOFF_DAY;
  return n;
}

function getDaysInMonth_(year, monthZeroBased) {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

function parseDateOnly_(val) {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }

  var s = val.toString().trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10) - 1;
  var d = parseInt(m[3], 10);
  var dt = new Date(y, mo, d, 0, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function labelPembayaranPeriode_(periode) {
  var p = normalizePeriode_(periode);
  var m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return p;
  var namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  var tahun = parseInt(m[1], 10);
  var bulan = parseInt(m[2], 10);
  if (isNaN(tahun) || isNaN(bulan) || bulan < 1 || bulan > 12) return p;
  return namaBulan[bulan - 1] + " " + tahun;
}

function parseJamCutoffTunjangan_(jamCutoff) {
  var fallback = (DEFAULT_TUNJANGAN_CUTOFF_TIME || "18:00").toString().trim();
  var raw = (jamCutoff === null || jamCutoff === undefined || jamCutoff === "") ? fallback : jamCutoff.toString().trim();
  var m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error("Jam cut-off harus valid (format HH:mm atau HH:mm:ss, contoh 18:13:40).");

  var h = parseInt(m[1], 10);
  var min = parseInt(m[2], 10);
  var sec = m[3] === undefined ? 59 : parseInt(m[3], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw new Error("Jam cut-off harus valid (format HH:mm atau HH:mm:ss, contoh 18:13:40).");
  }

  var label = String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
  if (m[3] !== undefined) {
    label += ":" + String(sec).padStart(2, "0");
  }

  return {
    jam: h,
    menit: min,
    detik: sec,
    label: label
  };
}

function formatTanggalJamISO_(val) {
  var d = parseTanggal(val);
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd HH:mm:ss");
}

function buildDefaultDateRangeFromPeriode_(periode) {
  var p = normalizePeriode_(periode).split("-");
  var year = parseInt(p[0], 10);
  var month = parseInt(p[1], 10) - 1;
  var cutoffRaw = normalizeCutoffDay_(DEFAULT_TUNJANGAN_CUTOFF_DAY);

  var cutoffTime = parseJamCutoffTunjangan_(DEFAULT_TUNJANGAN_CUTOFF_TIME);
  var daysCurrentMonth = getDaysInMonth_(year, month);
  var cutoffCurrentMonth = Math.min(cutoffRaw, daysCurrentMonth);
  var endInclusive = new Date(year, month, cutoffCurrentMonth, cutoffTime.jam, cutoffTime.menit, cutoffTime.detik, 999);
  var endExclusive = new Date(endInclusive.getTime() + 1);

  var prevMonthDate = new Date(year, month - 1, 1);
  var prevYear = prevMonthDate.getFullYear();
  var prevMonth = prevMonthDate.getMonth();
  var daysPrevMonth = getDaysInMonth_(prevYear, prevMonth);
  var cutoffPrevMonth = Math.min(cutoffRaw, daysPrevMonth);
  var start = new Date(prevYear, prevMonth, cutoffPrevMonth + 1, 0, 0, 0, 0);

  return {
    start: start,
    end: endExclusive,
    endInclusive: endInclusive,
    labelPembayaran: labelPembayaranPeriode_(periode),
    tanggalMulaiPeriode: formatTanggalISO_(start),
    tanggalAkhirPeriode: formatTanggalISO_(endInclusive),
    tanggalCutoff: formatTanggalJamISO_(endInclusive),
    jamCutoff: cutoffTime.label
  };
}

function formatTanggalISO_(val) {
  var d = parseDateOnly_(val) || parseTanggal(val);
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
}

function formatTanggalJamClient_(val) {
  if (val === null || val === undefined || val === "") return "";

  var d = null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    d = val;
  } else {
    d = parseTanggal(val);
  }

  if (d instanceof Date && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd HH:mm:ss");
  }

  return val.toString();
}

function jamDariTanggalCutoff_(tanggalCutoff, fallbackJam) {
  var d = parseTanggal(tanggalCutoff);
  if (d instanceof Date && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, "GMT+7", "HH:mm:ss");
  }
  return parseJamCutoffTunjangan_(fallbackJam).label;
}

function buildDateRangeMeta_(periode, tanggalMulai, tanggalAkhir, jamCutoff) {
  var p = normalizePeriode_(periode);
  var defaultMeta = buildDefaultDateRangeFromPeriode_(p);
  var startDate = parseDateOnly_(tanggalMulai) || parseDateOnly_(defaultMeta.tanggalMulaiPeriode);
  var endDate = parseDateOnly_(tanggalAkhir) || parseDateOnly_(defaultMeta.tanggalAkhirPeriode);
  var cutoffTime = parseJamCutoffTunjangan_(jamCutoff || defaultMeta.jamCutoff || DEFAULT_TUNJANGAN_CUTOFF_TIME);

  if (!startDate || !endDate) {
    throw new Error("Tanggal mulai dan tanggal akhir harus valid (format yyyy-MM-dd).");
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(cutoffTime.jam, cutoffTime.menit, cutoffTime.detik, 999);
  if (startDate.getTime() > endDate.getTime()) {
    throw new Error("Tanggal mulai tidak boleh lebih besar dari tanggal akhir/cut-off.");
  }

  return {
    start: startDate,
    end: new Date(endDate.getTime() + 1),
    endInclusive: endDate,
    labelPembayaran: labelPembayaranPeriode_(p),
    tanggalMulaiPeriode: formatTanggalISO_(startDate),
    tanggalAkhirPeriode: formatTanggalISO_(endDate),
    tanggalCutoff: formatTanggalJamISO_(endDate),
    jamCutoff: cutoffTime.label
  };
}


// ===== CUT-OFF POIN & TUNJANGAN =====
// Laporan yang diajukan setelah cut-off periode tetap disimpan sebagai laporan,
// tetapi tidak memperoleh poin dan tidak masuk rekap tunjangan periode berjalan.
function statusReviewLewatCutoff_() {
  return (REVIEW_STATUS && REVIEW_STATUS.DISETUJUI_LEWAT_CUTOFF) ? REVIEW_STATUS.DISETUJUI_LEWAT_CUTOFF : "Disetujui - Lewat Cut-off";
}

function isStatusLewatCutoff_(status) {
  return (status || "").toString().indexOf("Disetujui - Lewat Cut-off") === 0;
}

function cutoffPropertyKeyTunjangan_(periode) {
  return "TUNJANGAN_CUTOFF_META_" + normalizePeriode_(periode);
}

function metaCutoffTunjanganApril2026_() {
  return buildDateRangeMeta_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
}

function simpanCutoffTunjanganPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff) {
  var meta = buildDateRangeMeta_(periode, tanggalMulai, tanggalAkhir, jamCutoff);
  var props = PropertiesService.getScriptProperties();
  props.setProperty(cutoffPropertyKeyTunjangan_(periode), JSON.stringify({
    periode: normalizePeriode_(periode),
    tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
    tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
    tanggalCutoff: meta.tanggalCutoff,
    jamCutoff: meta.jamCutoff,
    labelPembayaran: meta.labelPembayaran
  }));
  return meta;
}

function ambilCutoffTunjanganPeriode_(periode) {
  var p = normalizePeriode_(periode);
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(cutoffPropertyKeyTunjangan_(p));
    if (raw) {
      var obj = JSON.parse(raw);
      return buildDateRangeMeta_(p, obj.tanggalMulaiPeriode, obj.tanggalAkhirPeriode, obj.jamCutoff);
    }
  } catch (e) {
    Logger.log("Gagal membaca meta cut-off periode " + p + ": " + (e && e.message ? e.message : e));
  }

  // Kebijakan koreksi khusus April 2026 yang sudah disepakati.
  if (p === "2026-04") return metaCutoffTunjanganApril2026_();

  return buildDefaultDateRangeFromPeriode_(p);
}

function periodeDariTanggalLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) return "";
  return Utilities.formatDate(d, "GMT+7", "yyyy-MM");
}

function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: "", meta: null };
  }

  var p = periodeDariTanggalLaporan_(d);
  if (!p) return { valid: false, lewatCutoff: false, periode: "", meta: null };

  var meta = ambilCutoffTunjanganPeriode_(p);
  return {
    valid: true,
    lewatCutoff: d.getTime() > meta.endInclusive.getTime(),
    periode: p,
    meta: meta,
    tanggalLaporan: d
  };
}

function catatanLewatCutoff_(meta) {
  return "Lewat cut-off " + (meta && meta.labelPembayaran ? meta.labelPembayaran : "periode berjalan") +
    " (" + (meta && meta.tanggalCutoff ? meta.tanggalCutoff : "-") +
    "); tidak dihitung sebagai poin dan tidak masuk rekap tunjangan periode berjalan.";
}

function gabungCatatanCutoff_(catatanLama, meta) {
  var tambahan = catatanLewatCutoff_(meta);
  var lama = (catatanLama || "").toString().trim();
  if (!lama) return tambahan;
  if (lama.indexOf("Lewat cut-off") !== -1) return lama;
  return lama + "\n" + tambahan;
}

function aturCutoffTunjanganApril2026() {
  var meta = simpanCutoffTunjanganPeriode_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
  Logger.log("Cut-off April 2026 disimpan: " + JSON.stringify({
    tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
    tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
    tanggalCutoff: meta.tanggalCutoff,
    jamCutoff: meta.jamCutoff
  }));
  return {
    sukses: true,
    pesan: "Cut-off April 2026 disimpan: " + meta.tanggalCutoff,
    meta: {
      periode: "2026-04",
      tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
      tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
      tanggalCutoff: meta.tanggalCutoff,
      jamCutoff: meta.jamCutoff
    }
  };
}

function koreksiLaporanLewatCutoffApril2026() {
  return koreksiLaporanLewatCutoffPeriode_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
}

function koreksiLaporanLewatCutoffPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff) {
  try {
    var meta = simpanCutoffTunjanganPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff);
    var p = normalizePeriode_(periode);
    var sh = getSheet_("Rekap_Kinerja");
    var data = sh.getDataRange().getValues();
    var statusLewat = statusReviewLewatCutoff_();
    var totalLewat = 0;
    var dikoreksi = 0;
    var sudahLewatCutoff = 0;
    var pendingAtauDitolak = 0;
    var sample = [];

    for (var i = 1; i < data.length; i++) {
      var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime()) || tglLap.getTime() === 0) continue;
      if (Utilities.formatDate(tglLap, "GMT+7", "yyyy-MM") !== p) continue;
      if (!isTanggalDalamJedaCutoff_(tglLap, meta)) continue;

      totalLewat++;
      var statusLama = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString();
      var poinLama = Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
      var catatanLama = data[i][SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || "";

      if (isStatusApproved_(statusLama) || isStatusLewatCutoff_(statusLama)) {
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW + 1).setValue(statusLewat);
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL + 1).setValue(0);
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN + 1).setValue(gabungCatatanCutoff_(catatanLama, meta));
        if (!data[i][SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN]) {
          sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN + 1).setValue(new Date());
        }
        if (isStatusLewatCutoff_(statusLama)) sudahLewatCutoff++;
        else dikoreksi++;

        if (sample.length < 10) {
          sample.push({
            row: i + 1,
            idLaporan: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
            nama: (data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "").toString(),
            tanggalLaporan: formatTanggalJamClient_(tglLap),
            statusLama: statusLama,
            statusBaru: statusLewat,
            poinLama: poinLama,
            poinBaru: 0
          });
        }
      } else {
        pendingAtauDitolak++;
      }
    }

    if (dikoreksi || sudahLewatCutoff) invalidasiCacheRekapKinerjaReadOnly_();

    logAudit("SYSTEM", "KOREKSI_LEWAT_CUTOFF", p + " | Cut-off: " + meta.tanggalCutoff + " | Dikoreksi: " + dikoreksi + " | Sudah Lewat Cut-off: " + sudahLewatCutoff + " | Total Lewat: " + totalLewat);

    var hasil = {
      sukses: true,
      pesan: "Koreksi cut-off selesai. Laporan disetujui yang dikoreksi: " + dikoreksi + ". Total laporan lewat cut-off ditemukan: " + totalLewat + ".",
      periode: p,
      tanggalCutoff: meta.tanggalCutoff,
      totalLewatCutoff: totalLewat,
      dikoreksi: dikoreksi,
      sudahLewatCutoff: sudahLewatCutoff,
      pendingAtauDitolak: pendingAtauDitolak,
      sample: sample
    };
    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;
  } catch (e) {
    return handleError("koreksiLaporanLewatCutoffPeriode", e, { sukses: false, pesan: "" });
  }
}

function metadataBatchTunjanganDariRow_(row) {
  var periode = periodeKeyTunjangan_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.PERIODE], false);
  var labelPembayaran = (row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.LABEL_PEMBAYARAN] || "").toString();
  var tanggalMulaiPeriode = formatTanggalISO_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.TANGGAL_MULAI_PERIODE]);
  var tanggalAkhirPeriode = formatTanggalISO_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.TANGGAL_AKHIR_PERIODE]);
  var tanggalCutoff = formatTanggalJamClient_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.TANGGAL_CUTOFF]);

  if (!labelPembayaran || !tanggalMulaiPeriode || !tanggalAkhirPeriode || !tanggalCutoff) {
    var fallback = buildDefaultDateRangeFromPeriode_(periode);
    labelPembayaran = labelPembayaran || fallback.labelPembayaran;
    tanggalMulaiPeriode = tanggalMulaiPeriode || fallback.tanggalMulaiPeriode;
    tanggalAkhirPeriode = tanggalAkhirPeriode || fallback.tanggalAkhirPeriode;
    tanggalCutoff = tanggalCutoff || fallback.tanggalCutoff;
  }

  return {
    labelPembayaran: labelPembayaran,
    tanggalMulaiPeriode: tanggalMulaiPeriode,
    tanggalAkhirPeriode: tanggalAkhirPeriode,
    tanggalCutoff: tanggalCutoff,
    jamCutoff: jamDariTanggalCutoff_(tanggalCutoff, DEFAULT_TUNJANGAN_CUTOFF_TIME)
  };
}

function identifikasiKelompok_(jabatan) {
  var role = cariJabatanRole_(jabatan);
  if (role) return role.kelompok;
  // Fallback untuk jabatan tidak dikenal — masukkan ke Carik & Kasi
  return "Carik & Kasi";
}

function getRowsBatchAktifTunjangan_(periode) {
  var sh = ensureSheetRekapTunjanganBulanan_();
  var values = sh.getDataRange().getValues();
  var p = normalizePeriode_(periode);
  var hasil = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var periodeRow = periodeKeyTunjangan_(row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.PERIODE], false);
    var isActive = row[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.IS_ACTIVE];
    var aktif = (
      isActive === true ||
      isActive === "TRUE" ||
      isActive === "true" ||
      isActive === 1 ||
      isActive === "1" ||
      isActive === ""
    );

    if (periodeRow === p && aktif) {
      hasil.push({ rowIndex: i + 1, values: row });
    }
  }

  return hasil;
}

function getBatchAktifTunjangan_(periode) {
  var rows = getRowsBatchAktifTunjangan_(periode);
  if (!rows.length) return null;
  return {
    periode: periodeKeyTunjangan_(rows[0].values[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.PERIODE], false),
    status: rows[0].values[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.STATUS_REKAP],
    batchId: rows[0].values[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.BATCH_ID],
    rows: rows
  };
}

function nonaktifkanBatchAktifTunjangan_(periode) {
  var rows = getRowsBatchAktifTunjangan_(periode);
  if (!rows.length) return;
  var sh = ensureSheetRekapTunjanganBulanan_();
  rows.forEach(function (item) {
    sh.getRange(item.rowIndex, SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.IS_ACTIVE + 1).setValue(false);
  });
}


function buatBatchIdTunjangan_(periode) {
  // Helper pembuat ID batch untuk Rekap_Tunjangan_Bulanan.
  // Dibutuhkan oleh generateDraftTunjanganBulanan().
  var p = normalizePeriode_(periode);
  var timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
  var randomPart = Utilities.getUuid().split("-")[0].toUpperCase();
  return "TJG-" + p.replace("-", "") + "-" + timestamp + "-" + randomPart;
}

function hitungRekapTunjanganPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff) {
  var p = normalizePeriode_(periode);
  var window = buildDateRangeMeta_(p, tanggalMulai, tanggalAkhir, jamCutoff);
  var pegawaiData = getPegawaiDataCached_() || [];
  var map = {};

  for (var i = 1; i < pegawaiData.length; i++) {
    var idUser = normalizeId_(pegawaiData[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]);
    var nama = (pegawaiData[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || "").toString();
    var jabatan = (pegawaiData[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || "").toString();
    var akses = (pegawaiData[i][SHEET_COLUMNS.DATA_PEGAWAI.AKSES] || "").toString();
    var jLow = normalizeJabatan_(jabatan);
    if (!idUser || !nama || !jabatan) continue;
    if (jLow.indexOf("phl") !== -1 || jLow.indexOf("lepas") !== -1) continue;

    map[idUser] = {
      periode: p,
      labelPembayaran: window.labelPembayaran,
      tanggalMulaiPeriode: window.tanggalMulaiPeriode,
      tanggalAkhirPeriode: window.tanggalAkhirPeriode,
      tanggalCutoff: window.tanggalCutoff,
      jamCutoff: window.jamCutoff,
      idUser: idUser,
      nama: nama,
      jabatan: jabatan,
      akses: akses,
      kelompok: identifikasiKelompok_(jabatan),
      jumlahLaporanDisetujui: 0,
      poinProd: 0,
      poinTU: 0,
      jmlLapProdLurah: 0,
      jmlLapTULurah: 0,
      persenProd: 0,
      persenTU: 0,
      maxProd: 0,
      maxTU: 0,
      rpProd: 0,
      rpTU: 0,
      rpTotal: 0
    };
  }

  var data = getSheet_("Rekap_Kinerja").getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    var tglLap = parseTanggal(data[r][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
    if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;
    if (tglLap < window.start || tglLap >= window.end) continue;
    if (!isStatusApproved_(data[r][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW])) continue;

    var idUserRow = normalizeId_(data[r][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idUserRow) continue;

    if (!map[idUserRow]) {
      var namaRow = (data[r][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "").toString();
      var jabatanRow = (data[r][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || "").toString();
      var jLowRow = normalizeJabatan_(jabatanRow);
      if (!namaRow || !jabatanRow) continue;
      if (jLowRow.indexOf("phl") !== -1 || jLowRow.indexOf("lepas") !== -1) continue;
      map[idUserRow] = {
        periode: p,
        labelPembayaran: window.labelPembayaran,
        tanggalMulaiPeriode: window.tanggalMulaiPeriode,
        tanggalAkhirPeriode: window.tanggalAkhirPeriode,
        tanggalCutoff: window.tanggalCutoff,
        jamCutoff: window.jamCutoff,
        idUser: idUserRow,
        nama: namaRow,
        jabatan: jabatanRow,
        akses: "",
        kelompok: identifikasiKelompok_(jabatanRow),
        jumlahLaporanDisetujui: 0,
        poinProd: 0,
        poinTU: 0,
        jmlLapProdLurah: 0,
        jmlLapTULurah: 0,
        persenProd: 0,
        persenTU: 0,
        maxProd: 0,
        maxTU: 0,
        rpProd: 0,
        rpTU: 0,
        rpTotal: 0
      };
    }

    var item = map[idUserRow];
    item.jumlahLaporanDisetujui++;
    var kategori = (data[r][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "").toString();
    var poin = Number(data[r][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
    if (isLurah_(item.jabatan)) {
      if (isKategoriProduktivitas_(kategori)) item.jmlLapProdLurah++;
      else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) item.jmlLapTULurah++;
    } else {
      if (isKategoriProduktivitas_(kategori)) {
        if (!isKategoriWajibBulanan_(kategori)) item.poinProd += poin;
      } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) {
        item.poinTU += poin;
      }
    }
  }

  var hasil = Object.keys(map).map(function (key) {
    var item = map[key];

    // PENTING: poin tunjangan periode hanya berasal dari laporan yang sudah disetujui Admin.
    // Jangan menambahkan hak/potensi Pasal 33 secara sintetis di sini, karena nilai
    // Pasal 33 yang sah sudah masuk lewat POIN_FINAL laporan wajib jika laporannya dibuat
    // dan disetujui.
    var tunjangan = getTunjanganPegawai_(item.idUser, item.jabatan);
    item.maxProd = Number(tunjangan.maxProd) || 0;
    item.maxTU = Number(tunjangan.maxTU) || 0;
    if (isLurah_(item.jabatan)) {
      item.persenProd = Math.min(100, item.jmlLapProdLurah * 10);
      item.persenTU = Math.min(100, item.jmlLapTULurah * 25);
    } else {
      item.persenProd = Math.min(100, item.poinProd);
      item.persenTU = Math.min(100, item.poinTU);
    }
    item.rpProd = (item.persenProd / 100) * item.maxProd;
    item.rpTU = (item.persenTU / 100) * item.maxTU;
    item.rpTotal = item.rpProd + item.rpTU;
    return item;
  });

  hasil.sort(function (a, b) {
    if (a.kelompok !== b.kelompok) return a.kelompok.localeCompare(b.kelompok);
    return a.nama.localeCompare(b.nama);
  });

  return hasil;
}

function generateDraftTunjanganBulanan(periode, tanggalMulai, tanggalAkhir, jamCutoff, token) {
  try {
    // Kompatibilitas versi lama: generateDraftTunjanganBulanan(periode, mulai, akhir, token)
    if (typeof token === "undefined") {
      token = jamCutoff;
      jamCutoff = "";
    }
    // Kompatibilitas versi sangat lama: generateDraftTunjanganBulanan(periode, akhir, token)
    if (typeof token === "undefined") {
      token = tanggalAkhir;
      tanggalAkhir = tanggalMulai;
      tanggalMulai = "";
      jamCutoff = "";
    }
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
    if (!cekHakAksesCarikTunjangan(idUser)) return { sukses: false, pesan: "Akses ditolak. Hanya Carik yang dapat membuat draft." };

    var p = normalizePeriode_(periode);
    var metaPeriode = buildDateRangeMeta_(p, tanggalMulai, tanggalAkhir, jamCutoff);
    simpanCutoffTunjanganPeriode_(p, metaPeriode.tanggalMulaiPeriode, metaPeriode.tanggalAkhirPeriode, metaPeriode.jamCutoff);
    var batchAktif = getBatchAktifTunjangan_(p);
    if (batchAktif) {
      var statusAktif = (batchAktif.status || "").toString();
      if (statusAktif !== TUNJANGAN_STATUS.DRAFT && statusAktif !== TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH) {
        return { sukses: false, pesan: "Periode " + p + " sudah memiliki batch aktif dengan status: " + statusAktif + "." };
      }
      nonaktifkanBatchAktifTunjangan_(p);
    }

    var hasil = hitungRekapTunjanganPeriode_(p, metaPeriode.tanggalMulaiPeriode, metaPeriode.tanggalAkhirPeriode, metaPeriode.jamCutoff);
    if (!hasil.length) return { sukses: false, pesan: "Tidak ada data pegawai untuk dibuatkan draft." };

    var sh = ensureSheetRekapTunjanganBulanan_();
    var pembuat = getPegawaiById_(idUser) || {};
    var batchId = buatBatchIdTunjangan_(p);
    var now = new Date();
    var rows = hasil.map(function (item) {
      return [
        p,
        item.idUser,
        item.nama,
        item.jabatan,
        item.kelompok,
        item.jumlahLaporanDisetujui,
        item.poinProd,
        item.poinTU,
        item.persenProd,
        item.persenTU,
        item.maxProd,
        item.maxTU,
        item.rpProd,
        item.rpTU,
        item.rpTotal,
        TUNJANGAN_STATUS.DRAFT,
        "",
        "",
        "",
        pembuat.nama || "",
        now,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        batchId,
        true,
        item.labelPembayaran,
        item.tanggalMulaiPeriode,
        item.tanggalAkhirPeriode,
        item.tanggalCutoff
      ];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, REKAP_TUNJANGAN_HEADERS.length).setValues(rows);
    logAuditTunjangan_(idUser, "GENERATE_DRAFT_TUNJANGAN", p, "", "", batchAktif ? batchAktif.status : "", TUNJANGAN_STATUS.DRAFT, "Batch: " + batchId + " | Pegawai: " + rows.length + " | Rentang: " + metaPeriode.tanggalMulaiPeriode + " s.d. " + metaPeriode.tanggalCutoff);
    return { sukses: true, pesan: "Draft tunjangan berhasil dibuat untuk periode pembayaran " + metaPeriode.labelPembayaran + " (" + metaPeriode.tanggalMulaiPeriode + " s.d. " + metaPeriode.tanggalCutoff + ").", jumlahPegawai: rows.length, batchId: batchId };
  } catch (e) {
    return handleError("generateDraftTunjangan", e, { sukses: false, pesan: "" });
  }
}

function ambilRekapTunjanganBulanan(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang.", rows: [] };
    if (!cekHakAksesTunjangan(idUser)) return { sukses: false, pesan: "Akses ditolak.", rows: [] };

    var p = normalizePeriode_(periode);
    var rows = getRowsBatchAktifTunjangan_(p);
    if (!rows.length) {
      return {
        sukses: true,
        rows: [],
        summary: null,
        role: {
          carik: cekHakAksesCarikTunjangan(idUser),
          lurah: cekHakAksesLurahTunjangan(idUser),
          bendahara: cekHakAksesBendaharaTunjangan(idUser),
          admin: cekHakAksesAdmin(idUser)
        }
      };
    }

    var data = rows.map(function (item) {
      var r = item.values;
      var meta = metadataBatchTunjanganDariRow_(r);
      return {
        periode: p,
        idUser: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.ID_USER] || "").toString(),
        nama: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.NAMA] || "").toString(),
        jabatan: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.JABATAN] || "").toString(),
        kelompok: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.KELOMPOK] || "").toString(),
        jumlahLaporanDisetujui: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.JUMLAH_LAPORAN_DISETUJUI]) || 0,
        poinProd: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.POIN_PROD]) || 0,
        poinTU: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.POIN_TU]) || 0,
        persenProd: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.PERSEN_PROD]) || 0,
        persenTU: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.PERSEN_TU]) || 0,
        maxProd: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.MAX_PROD]) || 0,
        maxTU: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.MAX_TU]) || 0,
        rpProd: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.RP_PROD]) || 0,
        rpTU: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.RP_TU]) || 0,
        rpTotal: Number(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.RP_TOTAL]) || 0,
        status: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.STATUS_REKAP] || "").toString(),
        catatanCarik: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.CATATAN_CARIK] || "").toString(),
        catatanLurah: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.CATATAN_LURAH] || "").toString(),
        catatanBendahara: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.CATATAN_BENDAHARA] || "").toString(),
        dibuatOleh: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DIBUAT_OLEH] || "").toString(),
        dibuatPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DIBUAT_PADA]),
        dikunciPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DIKUNCI_PADA]),
        diajukanPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DIAJUKAN_PADA]),
        disetujuiPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DISETUJUI_PADA]),
        dikembalikanPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DIKEMBALIKAN_PADA]),
        diteruskanPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DITERUSKAN_BENDAHARA_PADA]),
        dicairkanPada: formatTanggalJamClient_(r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.DICAIRKAN_PADA]),
        nomorBuktiCair: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.NOMOR_BUKTI_CAIR] || "").toString(),
        batchId: (r[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.BATCH_ID] || "").toString(),
        labelPembayaran: meta.labelPembayaran,
        tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
        tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
        tanggalCutoff: meta.tanggalCutoff,
        jamCutoff: meta.jamCutoff
      };
    });

    var total = 0;
    data.forEach(function (r) { total += Number(r.rpTotal) || 0; });
    var summary = {
      periode: p,
      labelPembayaran: data[0].labelPembayaran || labelPembayaranPeriode_(p),
      tanggalMulaiPeriode: data[0].tanggalMulaiPeriode || "",
      tanggalAkhirPeriode: data[0].tanggalAkhirPeriode || "",
      tanggalCutoff: data[0].tanggalCutoff || "",
      jamCutoff: data[0].jamCutoff || "",
      status: data[0].status,
      jumlahPegawai: data.length,
      totalNominal: total,
      batchId: data[0].batchId,
      catatanCarik: data[0].catatanCarik,
      catatanLurah: data[0].catatanLurah,
      catatanBendahara: data[0].catatanBendahara,
      nomorBuktiCair: data[0].nomorBuktiCair
    };

    return {
      sukses: true,
      rows: data,
      summary: summary,
      role: {
        carik: cekHakAksesCarikTunjangan(idUser),
        lurah: cekHakAksesLurahTunjangan(idUser),
        bendahara: cekHakAksesBendaharaTunjangan(idUser),
        admin: cekHakAksesAdmin(idUser)
      }
    };
  } catch (e) {
    return handleError("ambilRekapTunjanganBulanan", e, { sukses: false, pesan: "", rows: [] });
  }
}

function updateBatchTunjanganStatus_(periode, token, config) {
  var idUser = validasiSession(token);
  if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
  var p = normalizePeriode_(periode);
  var batch = getBatchAktifTunjangan_(p);
  if (!batch || !batch.rows.length) return { sukses: false, pesan: "Batch aktif untuk periode ini tidak ditemukan." };

  if (typeof config.validator === "function" && !config.validator(idUser)) {
    return { sukses: false, pesan: config.accessDenied || "Akses ditolak." };
  }

  var statusLama = (batch.status || "").toString();
  if (config.allowedFrom && config.allowedFrom.indexOf(statusLama) === -1) {
    return { sukses: false, pesan: "Status saat ini tidak sesuai. Status aktif: " + statusLama };
  }

  var sh = ensureSheetRekapTunjanganBulanan_();
  var now = new Date();
  batch.rows.forEach(function (item) {
    sh.getRange(item.rowIndex, 16).setValue(config.toStatus);
    if (config.catatanCol) sh.getRange(item.rowIndex, config.catatanCol).setValue(config.catatan || "");
    if (config.dateCol) sh.getRange(item.rowIndex, config.dateCol).setValue(now);
    if (config.extra && config.extra.nomorBuktiCair != null) sh.getRange(item.rowIndex, 28).setValue(config.extra.nomorBuktiCair);
  });

  var first = batch.rows[0] && batch.rows[0].values ? batch.rows[0].values : [];
  logAuditTunjangan_(idUser, config.auditAction || "UPDATE_STATUS_TUNJANGAN", p, first[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.ID_USER] || "", first[SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN.NAMA] || "", statusLama, config.toStatus, config.catatan || "");
  return { sukses: true, pesan: config.successMessage || "Perubahan status berhasil disimpan." };
}

function kunciDraftTunjanganBulanan(periode, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesCarikTunjangan,
    accessDenied: "Akses ditolak. Hanya Carik yang dapat mengunci draft.",
    allowedFrom: [TUNJANGAN_STATUS.DRAFT, TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH],
    toStatus: TUNJANGAN_STATUS.DIKUNCI_CARIK,
    catatanCol: 17,
    dateCol: 22,
    catatan: catatan,
    auditAction: "KUNCI_DRAFT_TUNJANGAN",
    successMessage: "Draft tunjangan berhasil dikunci."
  });
}

function ajukanTunjanganKeLurah(periode, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesCarikTunjangan,
    accessDenied: "Akses ditolak. Hanya Carik yang dapat mengajukan ke Lurah.",
    allowedFrom: [TUNJANGAN_STATUS.DIKUNCI_CARIK],
    toStatus: TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH,
    catatanCol: 17,
    dateCol: 23,
    catatan: catatan,
    auditAction: "AJUKAN_TUNJANGAN_KE_LURAH",
    successMessage: "Rekap tunjangan berhasil diajukan ke Lurah."
  });
}

function setujuiRekapTunjangan(periode, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesLurahTunjangan,
    accessDenied: "Akses ditolak. Hanya Lurah yang dapat menyetujui rekap.",
    allowedFrom: [TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH],
    toStatus: TUNJANGAN_STATUS.DISETUJUI_LURAH,
    catatanCol: 18,
    dateCol: 24,
    catatan: catatan,
    auditAction: "SETUJUI_REKAP_TUNJANGAN",
    successMessage: "Rekap tunjangan berhasil disetujui Lurah."
  });
}

function kembalikanRekapTunjangan(periode, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesLurahTunjangan,
    accessDenied: "Akses ditolak. Hanya Lurah yang dapat mengembalikan rekap.",
    allowedFrom: [TUNJANGAN_STATUS.DIAJUKAN_KE_LURAH],
    toStatus: TUNJANGAN_STATUS.DIKEMBALIKAN_LURAH,
    catatanCol: 18,
    dateCol: 25,
    catatan: catatan,
    auditAction: "KEMBALIKAN_REKAP_TUNJANGAN",
    successMessage: "Rekap tunjangan berhasil dikembalikan ke Carik."
  });
}

function teruskanKeBendahara(periode, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesCarikTunjangan,
    accessDenied: "Akses ditolak. Hanya Carik yang dapat meneruskan ke Bendahara.",
    allowedFrom: [TUNJANGAN_STATUS.DISETUJUI_LURAH],
    toStatus: TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA,
    catatanCol: 19,
    dateCol: 26,
    catatan: catatan,
    auditAction: "TERUSKAN_KE_BENDAHARA",
    successMessage: "Rekap tunjangan berhasil diteruskan ke Bendahara."
  });
}

function tandaiSudahDicairkan(periode, nomorBukti, catatan, token) {
  return updateBatchTunjanganStatus_(periode, token, {
    validator: cekHakAksesBendaharaTunjangan,
    accessDenied: "Akses ditolak. Hanya Bendahara Danarta yang dapat menandai pencairan.",
    allowedFrom: [TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA],
    toStatus: TUNJANGAN_STATUS.SUDAH_DICAIRKAN,
    catatanCol: 19,
    dateCol: 27,
    catatan: catatan,
    extra: { nomorBuktiCair: nomorBukti || "" },
    auditAction: "TANDAI_SUDAH_DICAIRKAN",
    successMessage: "Status pencairan berhasil diperbarui."
  });
}
// ─── END MODUL REKAP TUNJANGAN ───────────────────────────────────────────────

function adaAPBKalTahapDisetujui_(sheetRekap, kodeRekTarget, terminTarget, tahapKeyword) {
  var dataRekap = sheetRekap.getDataRange().getValues();
  for (var r = 1; r < dataRekap.length; r++) {
    var rStatus = dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] ? dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW].toString() : "";
    var rNamaKeg = dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN] ? dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN].toString() : "";
    var rPeran = dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.PERAN] ? dataRekap[r][SHEET_COLUMNS.REKAP_KINERJA.PERAN].toString() : "";
    var matchKode = (rNamaKeg.indexOf("[" + kodeRekTarget + "]") !== -1 || rNamaKeg.indexOf(kodeRekTarget) !== -1);
    var matchTermin = !terminTarget || rPeran.indexOf(terminTarget) !== -1;
    var matchTahap = rPeran.indexOf(tahapKeyword) !== -1;

    var matchStatus = isStatusApproved_(rStatus);
    if (matchKode && matchTermin && matchTahap && matchStatus) {
      return true;
    }
  }
  return false;
}

function sha256Hex(str) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm[CONFIG.SECURITY.PASSWORD_HASH_ALGO],
    str,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var v = (b < 0) ? 256 + b : b;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}



// ===== PIN SECURITY HELPERS (v37) =====
// Tujuan: pegawai tetap boleh memakai PIN lama, tetapi penyimpanan hash dimigrasikan
// dari sha256(pin) menjadi sha256(salt + pin + pepper) secara bertahap.
function ensureDataPegawaiSecurityColumns_() {
  var sh = getSS_().getSheetByName("Data_Pegawai");
  if (!sh) throw new Error("Sheet Data_Pegawai tidak ditemukan.");

  var requiredLastCol = SHEET_COLUMNS.DATA_PEGAWAI.PIN_UPDATED_AT + 1; // 1-based count
  if (sh.getMaxColumns() < requiredLastCol) {
    sh.insertColumnsAfter(sh.getMaxColumns(), requiredLastCol - sh.getMaxColumns());
  }

  var headers = ["pin_salt", "pin_hash_version", "pin_updated_at"];
  sh.getRange(1, SHEET_COLUMNS.DATA_PEGAWAI.PIN_SALT + 1, 1, headers.length).setValues([headers]);
  return sh;
}

function siapkanKolomKeamananPinPegawai() {
  try {
    ensureDataPegawaiSecurityColumns_();
    getPinPepper_();
    return {
      sukses: true,
      pesan: "Kolom keamanan PIN siap: I pin_salt, J pin_hash_version, K pin_updated_at. PIN_PEPPER sudah tersedia di Script Properties."
    };
  } catch (e) {
    return handleError("siapkanKolomKeamananPinPegawai", e, { sukses: false, pesan: "" });
  }
}

function getPinPepper_() {
  var props = PropertiesService.getScriptProperties();
  var key = CONFIG.SECURITY.PIN_PEPPER_PROPERTY || "PIN_PEPPER";
  var pepper = props.getProperty(key);
  if (!pepper) {
    pepper = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    props.setProperty(key, pepper);
    Logger.log("PIN pepper dibuat otomatis. Jangan hapus Script Property: " + key);
  }
  return pepper;
}

function buatPinSalt_() {
  return Utilities.getUuid().replace(/-/g, "") + sha256Hex(String(new Date().getTime()) + String(Math.random())).substring(0, 16);
}

function hashPinLegacy_(pin) {
  return sha256Hex(String(pin || "")).toLowerCase();
}

function hashPinV2_(pin, salt) {
  return sha256Hex(String(salt || "") + "|" + String(pin || "") + "|" + getPinPepper_()).toLowerCase();
}

function constantTimeEquals_(a, b) {
  a = String(a || "");
  b = String(b || "");
  var diff = a.length ^ b.length;
  var maxLen = Math.max(a.length, b.length);
  for (var i = 0; i < maxLen; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= (ca ^ cb);
  }
  return diff === 0;
}

function verifikasiPinPegawai_(pinInput, hashTersimpan, salt, hashVersion) {
  var dbHash = String(hashTersimpan || "").trim().toLowerCase();
  var version = String(hashVersion || "").trim().toLowerCase();
  var pin = String(pinInput || "").trim();
  var hasSalt = !!String(salt || "").trim();

  if (!dbHash) return { valid: false, legacy: false };

  if (version === "v2" && hasSalt) {
    return {
      valid: constantTimeEquals_(dbHash, hashPinV2_(pin, salt)),
      legacy: false
    };
  }

  // Toleransi data campuran: jika salt ada tetapi version kosong, coba v2 dulu.
  if (hasSalt && constantTimeEquals_(dbHash, hashPinV2_(pin, salt))) {
    return { valid: true, legacy: false };
  }

  return {
    valid: constantTimeEquals_(dbHash, hashPinLegacy_(pin)),
    legacy: true
  };
}

function simpanPinPegawaiV2ByRow_(sheet, rowIndex, pin) {
  ensureDataPegawaiSecurityColumns_();
  var salt = buatPinSalt_();
  var hash = hashPinV2_(pin, salt);
  sheet.getRange(rowIndex, SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH + 1).setValue(hash);
  sheet.getRange(rowIndex, SHEET_COLUMNS.DATA_PEGAWAI.PIN_SALT + 1).setValue(salt);
  sheet.getRange(rowIndex, SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH_VERSION + 1).setValue("v2");
  sheet.getRange(rowIndex, SHEET_COLUMNS.DATA_PEGAWAI.PIN_UPDATED_AT + 1).setValue(new Date());
  return { hash: hash, salt: salt, version: "v2" };
}

function migrasiPinPegawaiKeV2_(idUser, pin, username) {
  try {
    var sheet = ensureDataPegawaiSecurityColumns_();
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (idsEqual_(values[i][SHEET_COLUMNS.DATA_PEGAWAI.ID], idUser)) {
        simpanPinPegawaiV2ByRow_(sheet, i + 1, pin);
        bersihkanCacheDataPegawai_();
        logAudit(idUser, "MIGRASI_PIN_HASH_V2", "Username: " + (username || ""));
        return true;
      }
    }
  } catch (e) {
    Logger.log("Gagal migrasi PIN hash v2 untuk user " + (username || idUser || "-") + ": " + (e && e.message ? e.message : e));
  }
  return false;
}
// ===== END PIN SECURITY HELPERS =====

function sanitizeForSheet_(val) {
  if (val == null) return "";
  var str = val.toString().trim();
  // Cegah Spreadsheet Injection (=, +, -, @)
  if (str.match(/^[=\+\-@]/)) {
    return "'" + str;
  }
  return str;
}

function ambilDaftarPegawaiUntukAdmin(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang.", data: [] };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: "Akses ditolak.", data: [] };

    var data = getPegawaiDataCached_() || [];
    var list = [];
    for (var i = 1; i < data.length; i++) {
      if (!data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]) continue;
      list.push({
        id: data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID].toString(),
        username: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] || '').toString(),
        nama: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || '').toString(),
        jabatan: (data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || '').toString()
      });
    }
    list.sort(function (a, b) {
      return (a.nama || '').localeCompare((b.nama || ''), 'id', { sensitivity: 'base' });
    });
    return { sukses: true, data: list };
  } catch (e) {
    return handleError("ambilDaftarPegawaiPin", e, { sukses: false, pesan: "", data: [] });
  }
}


// ===== LOGIN RATE LIMIT HELPERS (v40.1) =====
// Proteksi berlapis: per username, per browser/perangkat, dan global.
// Catatan: clientId dari browser bukan identitas kuat seperti IP, tetapi tetap
// membantu mengurangi password spraying di aplikasi internal Google Apps Script.
function getSecurityNumber_(key, fallbackValue) {
  var n = CONFIG && CONFIG.SECURITY && CONFIG.SECURITY[key] != null
    ? Number(CONFIG.SECURITY[key])
    : Number(fallbackValue);
  return isNaN(n) || n <= 0 ? Number(fallbackValue) : n;
}

function loginGenericMessage_() {
  return (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.LOGIN_FAILURE_GENERIC_MESSAGE)
    ? CONFIG.SECURITY.LOGIN_FAILURE_GENERIC_MESSAGE
    : 'Username atau PIN tidak sesuai.';
}

function loginThrottleMessage_() {
  return (CONFIG && CONFIG.SECURITY && CONFIG.SECURITY.LOGIN_THROTTLE_MESSAGE)
    ? CONFIG.SECURITY.LOGIN_THROTTLE_MESSAGE
    : 'Terlalu banyak percobaan login gagal. Coba lagi beberapa menit lagi.';
}

function loginFailureMessageDenganSisa_(userAfter, clientAfter, globalAfter, maxUser, maxClient, maxGlobal) {
  var sisaUser = Math.max(0, Number(maxUser || 0) - Number(userAfter || 0));
  var sisaClient = Math.max(0, Number(maxClient || 0) - Number(clientAfter || 0));
  var sisaGlobal = Math.max(0, Number(maxGlobal || 0) - Number(globalAfter || 0));
  var sisaTerkecil = Math.min(sisaUser, sisaClient, sisaGlobal);
  var pesan = loginGenericMessage_();

  // Tetap pakai pesan generik agar tidak membocorkan apakah username terdaftar.
  // Info sisa hanya muncul saat sudah mendekati pembatasan sementara.
  if (sisaTerkecil > 0 && sisaTerkecil <= 2) {
    pesan += "\nSisa percobaan sebelum login dibatasi sementara: " + sisaTerkecil + ".";
  }

  return pesan;
}

function loginFailureTtl_() {
  var ttl = CONFIG && CONFIG.CACHE && CONFIG.CACHE.LOGIN_FAILURE_TTL
    ? Number(CONFIG.CACHE.LOGIN_FAILURE_TTL)
    : 600;
  return isNaN(ttl) || ttl <= 0 ? 600 : ttl;
}

function hashKeyPendek_(value) {
  return sha256Hex(String(value || 'unknown')).substring(0, 24);
}

function loginFailKeyUser_(username) {
  return 'LOGIN_FAIL_USER_' + hashKeyPendek_(String(username || '').trim().toLowerCase());
}

function loginFailKeyClient_(clientId) {
  var raw = String(clientId || 'missing-client').trim();
  if (!raw) raw = 'missing-client';
  return 'LOGIN_FAIL_CLIENT_' + hashKeyPendek_(raw);
}

function loginFailKeyGlobal_() {
  return 'LOGIN_FAIL_GLOBAL';
}

function ambilCounterLogin_(cache, key) {
  return parseInt(cache.get(key) || '0', 10) || 0;
}

function tambahCounterLoginGagal_(cache, key, ttl) {
  var n = ambilCounterLogin_(cache, key) + 1;
  cache.put(key, String(n), ttl);
  return n;
}

function clearLoginUserFailures_(username) {
  try {
    var user = String(username || '').trim().toLowerCase();
    if (!user) return;
    var cache = CacheService.getScriptCache();
    cache.remove(loginFailKeyUser_(user));
    // Bersihkan key versi lama juga agar transisi aman.
    cache.remove('LOGIN_FAIL_' + user);
  } catch (e) { }
}

function adminGantiPinPegawai(username, pinBaru6Digit, token) {
  try {
    var idUserAdmin = validasiSession(token);
    if (!idUserAdmin) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
    if (!cekHakAksesAdmin(idUserAdmin)) return { sukses: false, pesan: "Akses ditolak. Hanya admin yang dapat mengganti PIN." };

    var user = (username || '').toString().trim().toLowerCase();
    var pin = (pinBaru6Digit || '').toString().trim();
    if (!user) return { sukses: false, pesan: "Username wajib dipilih." };
    if (!/^\d{6}$/.test(pin)) return { sukses: false, pesan: "PIN baru harus tepat 6 digit angka." };

    var sheet = ensureDataPegawaiSecurityColumns_();
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var namaPegawai = '';
    for (var i = 1; i < values.length; i++) {
      var dbUser = values[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] ? values[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME].toString().trim().toLowerCase() : '';
      if (dbUser === user) {
        rowIndex = i + 1;
        namaPegawai = (values[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || '').toString();
        break;
      }
    }
    if (rowIndex < 0) return { sukses: false, pesan: "Username tidak ditemukan: " + username };

    simpanPinPegawaiV2ByRow_(sheet, rowIndex, pin);

    bersihkanCacheDataPegawai_();
    clearLoginUserFailures_(user);

    var admin = getPegawaiById_(idUserAdmin) || {};
    logAudit(idUserAdmin, "GANTI_PIN_ADMIN", "Admin: " + (admin.nama || '') + " | Username: " + user + " | Nama: " + namaPegawai + " | Hash: v2");

    return { sukses: true, pesan: "PIN berhasil diganti untuk " + (namaPegawai || user) + "." };
  } catch (e) {
    return handleError("adminGantiPinPegawai", e, { sukses: false, pesan: "" });
  }
}

function cekLogin(username, pin, clientId) {
  try {
    var data = getPegawaiDataCached_();
    if (!data) return { sukses: false, pesan: "Database Pegawai tidak dapat diakses!" };

    var inputUserBersih = String(username || '').trim().toLowerCase();
    var inputPinMentah = String(pin || '').trim();
    if (!inputUserBersih || !inputPinMentah) {
      return { sukses: false, pesan: "Username dan PIN wajib diisi." };
    }

    var cache = CacheService.getScriptCache();
    var ttl = loginFailureTtl_();
    var keyUser = loginFailKeyUser_(inputUserBersih);
    var keyClient = loginFailKeyClient_(clientId);
    var keyGlobal = loginFailKeyGlobal_();

    var maxUser = getSecurityNumber_('MAX_LOGIN_ATTEMPTS', 5);
    var maxClient = getSecurityNumber_('MAX_LOGIN_ATTEMPTS_CLIENT', 15);
    var maxGlobal = getSecurityNumber_('MAX_LOGIN_ATTEMPTS_GLOBAL', 80);

    var jumlahGagalUser = ambilCounterLogin_(cache, keyUser);
    var jumlahGagalClient = ambilCounterLogin_(cache, keyClient);
    var jumlahGagalGlobal = ambilCounterLogin_(cache, keyGlobal);

    if (jumlahGagalUser >= maxUser) {
      logAudit('SYSTEM', 'LOGIN_BLOCKED_USER', 'Username dibatasi sementara: ' + inputUserBersih + ' | failUser=' + jumlahGagalUser);
      return { sukses: false, pesan: loginThrottleMessage_() };
    }
    if (jumlahGagalClient >= maxClient) {
      logAudit('SYSTEM', 'LOGIN_BLOCKED_CLIENT', 'Client dibatasi sementara: ' + hashKeyPendek_(clientId || 'missing-client') + ' | failClient=' + jumlahGagalClient);
      return { sukses: false, pesan: loginThrottleMessage_() };
    }
    if (jumlahGagalGlobal >= maxGlobal) {
      logAudit('SYSTEM', 'LOGIN_BLOCKED_GLOBAL', 'Login global dibatasi sementara | failGlobal=' + jumlahGagalGlobal);
      return { sukses: false, pesan: loginThrottleMessage_() };
    }

    var usernameDitemukan = false;
    var statusPinSalah = false;

    for (var i = 1; i < data.length; i++) {
      var dbUser = data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] ? data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME].toString().trim().toLowerCase() : "";
      var dbPin = data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH] ? data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH].toString().trim().toLowerCase() : "";
      var dbSalt = data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_SALT] ? data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_SALT].toString().trim() : "";
      var dbHashVersion = data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH_VERSION] ? data[i][SHEET_COLUMNS.DATA_PEGAWAI.PIN_HASH_VERSION].toString().trim().toLowerCase() : "";

      if (dbUser === inputUserBersih) {
        usernameDitemukan = true;
        var verifikasi = verifikasiPinPegawai_(inputPinMentah, dbPin, dbSalt, dbHashVersion);
        if (verifikasi.valid) {
          clearLoginUserFailures_(inputUserBersih);
          // Counter client dan global sengaja tidak dihapus saat sukses agar pola
          // spraying lintas username tetap terlihat selama TTL berjalan.

          var idUserLogin = data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID].toString();
          if (verifikasi.legacy) {
            // Pegawai tetap memakai PIN lama yang sama; hanya penyimpanan hash yang dimigrasikan ke v2.
            migrasiPinPegawaiKeV2_(idUserLogin, inputPinMentah, inputUserBersih);
          }

          var token = buatToken();
          CacheService.getScriptCache().put(token, idUserLogin, CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
          logAudit(idUserLogin, "LOGIN", "Sukses login" + (verifikasi.legacy ? " | PIN hash dimigrasikan ke v2" : ""));
          return {
            sukses: true,
            token: token,
            nama: data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA],
            jabatan: data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN],
            akses: data[i][SHEET_COLUMNS.DATA_PEGAWAI.AKSES],
            isAdminUtama: isCarik_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]) || isLurah_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]),
            isCarikTunjangan: isCarik_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]),
            isLurahTunjangan: isLurah_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]),
            isBendaharaDanarta: isBendaharaDanarta_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]),
            canAccessTunjangan: isCarik_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]) || isLurah_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN]) || isBendaharaDanarta_(data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN])
          };
        } else {
          statusPinSalah = true;
        }
      }
    }

    var userAfter = tambahCounterLoginGagal_(cache, keyUser, ttl);
    var clientAfter = tambahCounterLoginGagal_(cache, keyClient, ttl);
    var globalAfter = tambahCounterLoginGagal_(cache, keyGlobal, ttl);

    var alasan = usernameDitemukan
      ? (statusPinSalah ? 'PIN salah' : 'Verifikasi PIN gagal')
      : 'Username tidak ditemukan';
    logAudit(
      'SYSTEM',
      'LOGIN_FAIL',
      alasan + ' | user=' + inputUserBersih +
      ' | failUser=' + userAfter +
      ' | failClient=' + clientAfter +
      ' | failGlobal=' + globalAfter
    );

    if (userAfter >= maxUser || clientAfter >= maxClient || globalAfter >= maxGlobal) {
      return { sukses: false, pesan: loginThrottleMessage_() };
    }

    return {
      sukses: false,
      pesan: loginFailureMessageDenganSisa_(userAfter, clientAfter, globalAfter, maxUser, maxClient, maxGlobal),
      sisaPercobaan: Math.max(0, Math.min(maxUser - userAfter, maxClient - clientAfter, maxGlobal - globalAfter))
    };
  } catch (e) {
    return handleError("cekLogin", e, { sukses: false, pesan: "" });
  }
}



// ===== DETAIL FORM SCHEMA v30 (Kolom AD-BS) =====
var REKAP_KINERJA_DETAIL_SCHEMA_VERSION = "v30";

var REKAP_KINERJA_DETAIL_HEADERS = [
  "jenis_form_detail", "payload_detail_json", "output_ringkas", "tindak_lanjut_rekomendasi",
  "apbkal_bidang", "apbkal_kode_rekening", "apbkal_nama_kegiatan", "apbkal_termin_pencairan",
  "apbkal_tahapan_kegiatan", "apbkal_status_pelaksanaan", "apbkal_batas_waktu_pelaporan",
  "apbkal_tanggal_pelaksanaan_riil", "apbkal_lokasi", "apbkal_metode",
  "apbkal_carik_jenis_tugas", "apbkal_carik_nama_kegiatan", "apbkal_carik_tanggal_pelaksanaan",
  "pimpinan_jenis_tugas", "pimpinan_dasar", "pimpinan_pemberi", "pimpinan_nama_agenda",
  "pimpinan_tanggal_pelaksanaan", "pimpinan_lokasi", "pimpinan_penyelenggara",
  "staf_instruksi_pemberi", "staf_instruksi_bentuk", "staf_instruksi_nama_tugas", "staf_instruksi_tanggal_pelaksanaan",
  "staf_reguler_nama_tugas", "staf_reguler_tanggal_pelaksanaan", "staf_reguler_lokasi", "staf_reguler_sasaran", "staf_reguler_peran",
  "dukuh_kategori_fungsi", "dukuh_detail_fungsi", "dukuh_pihak_terlibat",
  "wajib_pamong_bulan", "wajib_pamong_detail_json", "sumber_detail_form", "versi_schema_detail",
  "apbkal_carik_lokasi", "staf_instruksi_lokasi"
];

function siapkanKolomDetailFormRekapKinerja() {
  var sh = getSheet_("Rekap_Kinerja");
  var startCol = 30; // AD dalam indeks 1-based
  var totalNeeded = startCol + REKAP_KINERJA_DETAIL_HEADERS.length - 1; // sampai BS
  var markerKey = "REKAP_KINERJA_DETAIL_SCHEMA_READY_" + REKAP_KINERJA_DETAIL_SCHEMA_VERSION;
  var props = PropertiesService.getScriptProperties();

  // Guard cepat: jika schema sudah pernah diverifikasi, hindari penulisan header
  // berulang pada setiap submit. Ini menjaga fase lock final tetap ringan.
  if (props.getProperty(markerKey) === "1" && sh.getMaxColumns() >= totalNeeded) {
    return { sukses: true, pesan: "Kolom detail formulir Rekap_Kinerja sudah siap.", start: "AD", end: "BS", totalKolom: REKAP_KINERJA_DETAIL_HEADERS.length, cached: true };
  }

  var schemaLock = LockService.getScriptLock();
  if (!schemaLock.tryLock(10000)) {
    throw new Error("Schema Rekap_Kinerja sedang disiapkan oleh proses lain. Silakan coba lagi beberapa detik.");
  }

  try {
    if (sh.getMaxColumns() < totalNeeded) {
      sh.insertColumnsAfter(sh.getMaxColumns(), totalNeeded - sh.getMaxColumns());
    }

    var range = sh.getRange(1, startCol, 1, REKAP_KINERJA_DETAIL_HEADERS.length);
    var existing = range.getValues()[0];
    var perluTulisHeader = false;
    for (var i = 0; i < REKAP_KINERJA_DETAIL_HEADERS.length; i++) {
      if ((existing[i] || "").toString() !== REKAP_KINERJA_DETAIL_HEADERS[i]) {
        perluTulisHeader = true;
        break;
      }
    }

    if (perluTulisHeader) {
      range.setValues([REKAP_KINERJA_DETAIL_HEADERS]);
    }

    props.setProperty(markerKey, "1");
    return { sukses: true, pesan: "Kolom detail formulir Rekap_Kinerja siap dari AD sampai BS.", start: "AD", end: "BS", totalKolom: REKAP_KINERJA_DETAIL_HEADERS.length, updated: perluTulisHeader };
  } finally {
    schemaLock.releaseLock();
  }
}

function valueDetailForm_(obj, key) {
  if (!obj || obj[key] === null || obj[key] === undefined) return "";
  return sanitizeForSheet_(obj[key]);
}

function stringifyDetailJson_(obj) {
  try { return sanitizeForSheet_(JSON.stringify(obj || {})); } catch (e) { return "{}"; }
}


function apbPasal52DokumenWajib_(apb) {
  apb = apb || {};
  var p52 = apb.pasal52 || {};
  var doks = [];
  if (String(apb.tahap || '') !== APB_TAHAP.P54) return doks;

  doks.push({ key: 'fotoPelaksanaan', label: 'Foto/Video Pelaksanaan Kegiatan' });
  doks.push({ key: 'laporanKeluaran', label: 'Laporan Keterangan dan Keluaran' });

  if (String(p52.adaDokumentasiBarang || '').toUpperCase() === 'YA') {
    doks.push({ key: 'dokumentasiBarang', label: 'Dokumentasi Visual Pengadaan Barang' });
  }

  if (String(p52.adaTransaksiPembayaran || '').toUpperCase() === 'YA') {
    doks.push({ key: 'buktiTransaksi', label: 'Bukti Transaksi/Nota/Serah Terima Pembayaran' });
  }

  if (String(p52.menghadirkanOrang || '').toUpperCase() === 'YA') {
    doks.push({ key: 'undangan', label: 'Undangan Kegiatan' });
    doks.push({ key: 'daftarHadir', label: 'Daftar Hadir' });
  }

  return doks;
}

function apbPasal52CariDokumen_(apb, key) {
  apb = apb || {};
  var p52 = apb.pasal52 || {};
  var doks = Array.isArray(p52.dokumen) ? p52.dokumen : [];
  for (var i = 0; i < doks.length; i++) {
    if (String((doks[i] || {}).key || '') === String(key || '')) return doks[i] || null;
  }
  return null;
}

function apbPasal52Ringkasan_(apb) {
  apb = apb || {};
  var p52 = apb.pasal52 || {};
  if (String(apb.tahap || '') !== APB_TAHAP.P54) return '';
  var wajib = apbPasal52DokumenWajib_(apb);
  var lengkap = 0;
  for (var i = 0; i < wajib.length; i++) {
    var dok = apbPasal52CariDokumen_(apb, wajib[i].key);
    if (dok && (dok.fileUrl || dok.url)) lengkap++;
  }
  return 'Kelengkapan Pasal 52: ' + lengkap + '/' + wajib.length + ' dokumen wajib tersedia';
}

function buildPayloadDetailAman_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg) {
  var p = paket || {};
  var detailAPBKalAman = null;
  if (p.detailAPBKal) {
    detailAPBKalAman = Object.assign({}, p.detailAPBKal);
    detailAPBKalAman.apbChainKey = buatApbChainKey_(p.detailAPBKal);
  }
  return {
    schema: REKAP_KINERJA_DETAIL_SCHEMA_VERSION,
    kategoriSheet: kategoriSheet || p.kategori || "",
    detailTU: p.detailTU || null,
    detailPHL: p.detailPHL || null,
    detailDukuh: p.detailDukuh || null,
    detailWajibDukuh: p.detailWajibDukuh || null,
    detailWajibPamong: p.detailWajibPamong ? { bulan: p.detailWajibPamong.bulan || "", tugasData: (p.detailWajibPamong.tugasData || []).map(function (t, idx) { return { nomor: idx + 1, namaTugas: (t && t.namaTugas) || "", deskripsi: (t && t.deskripsi) || "", fileName: (t && t.fileName) || "", mime: (t && t.mime) || "", fileUrl: (t && t.fileUrl) || "", buktiUrl: (t && (t.buktiUrl || t.fileUrl)) || "", buktiLabel: (t && t.buktiLabel) || ((idx + 1) + ". " + ((t && t.namaTugas) || ("Tugas " + (idx + 1)))) }; }) } : null,
    detailPimpinan: p.detailPimpinan || null,
    detailAPBKal: detailAPBKalAman,
    detailAPBKalCarik: p.detailAPBKalCarik || null,
    detailReguler: p.detailReguler || null,
    detailStafInstruksi: p.detailStafInstruksi || null,
    detailStafReguler: p.detailStafReguler || null,
    ringkasanUmum: { namaKegiatan: namaKegiatan || "", tanggalKegiatan: tanggalKegiatan || "", lokasiKegiatan: lokasiKegiatan || "", dasarKegiatan: dasarKegiatan || "", penyelenggara: penyelenggaraKeg || "", peran: peranKeg || "" }
  };
}

function tentukanJenisFormDetail_(paket, kategoriSheet) {
  paket = paket || {};
  if (paket.detailWajibDukuh) return "wajib_dukuh_pasal41";
  if (paket.detailWajibPamong) return "wajib_pamong_bulanan";
  if (paket.detailAPBKal) return "apbkal";
  if (paket.detailAPBKalCarik) return "apbkal_carik";
  if (paket.detailPimpinan) return "tugas_instruksi_pimpinan";
  if (paket.detailStafInstruksi) return "staf_instruksi";
  if (paket.detailStafReguler) return "staf_reguler_unit_kerja";
  if (paket.detailReguler) return "kegiatan_reguler_tupoksi";
  if (paket.detailDukuh) return "dukuh_tupoksi_wajib";
  if (paket.detailTU) return "tugas_umum";
  if (paket.detailPHL) return "harian_phl";
  return (kategoriSheet || paket.kategori || "umum").toString().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "umum";
}

function outputRingkasDariPaket_(paket, jenisForm) {
  paket = paket || {};
  if (paket.detailReguler && paket.detailReguler.outputRingkas) return sanitizeForSheet_(paket.detailReguler.outputRingkas);
  if ((jenisForm === "wajib_dukuh_pasal41" || jenisForm === "wajib_dukuh_bulanan") && paket.detailWajibDukuh) return sanitizeForSheet_(paket.detailWajibDukuh.outputRingkas || paket.deskripsi || "");
  if (jenisForm === "wajib_pamong_bulanan" && paket.detailWajibPamong && paket.detailWajibPamong.tugasData) {
    return sanitizeForSheet_((paket.detailWajibPamong.tugasData || []).map(function (t, idx) { return (idx + 1) + ". " + (t.namaTugas || "Tugas") + ": " + (t.deskripsi || ""); }).join("\n"));
  }
  return sanitizeForSheet_(paket.deskripsi || "");
}

function tindakLanjutDariPaket_(paket) {
  paket = paket || {};
  if (paket.detailReguler && paket.detailReguler.tindakLanjut) return sanitizeForSheet_(paket.detailReguler.tindakLanjut);
  if (paket.deskripsi) {
    var s = String(paket.deskripsi || "");
    var m = s.match(/Tindak\s*Lanjut\s*:\s*([\s\S]*)/i);
    if (m && m[1]) return sanitizeForSheet_(m[1].trim());
  }
  return "";
}

function buildKolomDetailForm_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg) {
  paket = paket || {};
  var jenis = tentukanJenisFormDetail_(paket, kategoriSheet);
  var payloadAman = buildPayloadDetailAman_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg);
  var apb = paket.detailAPBKal || {};
  var apbCarik = paket.detailAPBKalCarik || {};
  var pimpinan = paket.detailPimpinan || {};
  var stafInst = paket.detailStafInstruksi || {};
  var stafReg = paket.detailStafReguler || {};
  var reguler = paket.detailReguler || {};
  var dukuh = paket.detailDukuh || {};
  var wajibDukuh = paket.detailWajibDukuh || {};
  var wajibDukuhJson = paket.detailWajibDukuh ? stringifyDetailJson_({ jenis: wajibDukuh.jenis || wajibDukuh.namaKeg || "", tanggal: wajibDukuh.tanggal || "", lokasi: wajibDukuh.lokasi || "", penyelenggara: wajibDukuh.penyelenggara || "", outputRingkas: wajibDukuh.outputRingkas || "" }) : "";
  var wajib = paket.detailWajibPamong || {};
  var wajibJson = wajib && wajib.tugasData ? stringifyDetailJson_({ bulan: wajib.bulan || "", tugasData: (wajib.tugasData || []).map(function (t) { return { namaTugas: t.namaTugas || "", deskripsi: t.deskripsi || "", fileName: t.fileName || "" }; }) }) : "";
  return [
    sanitizeForSheet_(jenis), stringifyDetailJson_(payloadAman), outputRingkasDariPaket_(paket, jenis), tindakLanjutDariPaket_(paket),
    valueDetailForm_(apb, "bidang"), valueDetailForm_(apb, "kodeRek"), valueDetailForm_(apb, "namaKeg"), valueDetailForm_(apb, "termin"),
    apb.tahap ? sanitizeForSheet_(tahapApbLabel_(apb.tahap)) : "", valueDetailForm_(apb, "isTPK"), valueDetailForm_(apb, "batasWaktu"), valueDetailForm_(apb, "tanggal"), valueDetailForm_(apb, "lokasi"), valueDetailForm_(apb, "metode"),
    valueDetailForm_(apbCarik, "jenis"), valueDetailForm_(apbCarik, "namaKeg"), valueDetailForm_(apbCarik, "tanggal"),
    valueDetailForm_(pimpinan, "jenis"), valueDetailForm_(pimpinan, "dasar"), valueDetailForm_(pimpinan, "pemberi"), valueDetailForm_(pimpinan, "namaKeg"), valueDetailForm_(pimpinan, "tanggal"), valueDetailForm_(pimpinan, "lokasi"), valueDetailForm_(pimpinan, "penyelenggara"),
    valueDetailForm_(stafInst, "pemberi"), valueDetailForm_(stafInst, "bentuk"), valueDetailForm_(stafInst, "namaKeg"), valueDetailForm_(stafInst, "tanggal"),
    valueDetailForm_(stafReg, "namaKeg"), valueDetailForm_(stafReg, "tanggal"), valueDetailForm_(stafReg, "lokasi"), valueDetailForm_(stafReg, "sasaran"), valueDetailForm_(stafReg, "peran"),
    valueDetailForm_(reguler, "namaKeg") || valueDetailForm_(dukuh, "namaKeg") || valueDetailForm_(wajibDukuh, "jenis") || valueDetailForm_(wajibDukuh, "namaKeg"), valueDetailForm_(reguler, "outputRingkas") || valueDetailForm_(dukuh, "penyelenggara") || valueDetailForm_(wajibDukuh, "outputRingkas"), valueDetailForm_(reguler, "pihakTerlibat") || valueDetailForm_(wajibDukuh, "penyelenggara"),
    valueDetailForm_(wajib, "bulan"), wajibJson || wajibDukuhJson, payloadAman.__legacyBackfill ? "legacy" : "form_payload", REKAP_KINERJA_DETAIL_SCHEMA_VERSION,
    valueDetailForm_(apbCarik, "lokasi"), valueDetailForm_(stafInst, "lokasi")
  ];
}

function padRowToIndex_(row, lastIndex) { while (row.length <= lastIndex) row.push(""); return row; }


// ===== v29: VALIDASI BERBASIS JENIS FORMULIR + NORMALISASI K-Q =====
// Prinsip:
// 1) Setiap field yang ADA pada formulir masing-masing wajib diisi.
// 2) Kolom K-Q adalah hasil normalisasi lintas formulir, bukan berarti semua form harus punya pertanyaan K-Q secara literal.
// 3) Jika sebuah form tidak memiliki field tertentu (misalnya Dasar Kehadiran atau Peran), server mengisi nilai baku yang masuk akal.
// 4) Laporan ditolak hanya jika field asli yang wajib pada jenis formulir tersebut kosong, atau server gagal membentuk K-Q.
function detailIntiIsBlank_(value) {
  if (value === null || value === undefined) return true;
  var s = String(value).replace(/\u00a0/g, ' ').trim();
  return s === '' || s === '-' || s === '--' || s === '-- Pilih --';
}

function detailIntiText_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u00a0/g, ' ').trim();
}

function detailIntiDefault_(value, fallback) {
  var s = detailIntiText_(value);
  return detailIntiIsBlank_(s) ? detailIntiText_(fallback) : s;
}

function detailIntiRequire_(missing, label, value) {
  if (detailIntiIsBlank_(value)) missing.push(label);
}

function detailIntiJoin_(arr, sep) {
  return (arr || []).map(detailIntiText_).filter(function (x) { return !detailIntiIsBlank_(x); }).join(sep || ' - ');
}

function validasiDanNormalisasiDetailIntiLaporan_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg) {
  paket = paket || {};
  var missing = [];
  var jLow = String(paket.jabatan || '').toLowerCase();

  var core = {
    dasarKegiatan: detailIntiText_(dasarKegiatan),
    namaKegiatan: detailIntiText_(namaKegiatan),
    tanggalKegiatan: detailIntiText_(tanggalKegiatan),
    lokasiKegiatan: detailIntiText_(lokasiKegiatan),
    penyelenggaraKeg: detailIntiText_(penyelenggaraKeg),
    peranKeg: detailIntiText_(peranKeg)
  };

  if (paket.detailTU) {
    var tu = paket.detailTU || {};
    var dasarTU = detailIntiText_(tu.dasar);
    var dasarOpsiTU = detailIntiText_(tu.dasarOpsi || tu.dasarPilihan || tu.dasar);
    var dasarLainnyaTU = detailIntiText_(tu.dasarLainnya || tu.dasarManual || tu.dasarKehadiranLainnya);

    // Jika frontend lama mengirim dasar = "Lainnya", backend wajib meminta isi manual.
    if (dasarOpsiTU === 'Lainnya' || dasarTU === 'Lainnya') {
      dasarTU = dasarLainnyaTU;
    }

    // Semua field pada form Tugas Umum wajib. Untuk opsi "Lainnya", yang wajib adalah isi manualnya.
    detailIntiRequire_(missing, 'Jenis Tugas Umum', tu.jenis);
    detailIntiRequire_(missing, 'Dasar Kehadiran', dasarTU);
    detailIntiRequire_(missing, 'Pemberi Perintah / Sumber Undangan', tu.pemberi);
    detailIntiRequire_(missing, 'Nama Kegiatan', tu.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', tu.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', tu.lokasi);
    detailIntiRequire_(missing, 'Penyelenggara', tu.penyelenggara);
    detailIntiRequire_(missing, 'Peran/Partisipasi', tu.peran);

    core.dasarKegiatan = dasarTU;
    core.namaKegiatan = tu.namaKeg;
    core.tanggalKegiatan = tu.tanggal;
    core.lokasiKegiatan = tu.lokasi;
    core.penyelenggaraKeg = tu.penyelenggara;
    core.peranKeg = tu.peran;

  } else if (paket.detailPHL) {
    var phl = paket.detailPHL || {};
    // Form PHL memang tidak menanyakan dasar/peran; server normalisasi otomatis.
    detailIntiRequire_(missing, 'Nama Pekerjaan', phl.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', phl.tanggal);
    detailIntiRequire_(missing, 'Lokasi Tugas', phl.lokasi);

    core.dasarKegiatan = 'Penugasan harian PHL';
    core.namaKegiatan = phl.namaKeg;
    core.tanggalKegiatan = phl.tanggal;
    core.lokasiKegiatan = phl.lokasi;
    core.penyelenggaraKeg = 'Pemerintah Kalurahan Minomartani';
    core.peranKeg = 'Pelaksana pekerjaan harian';

  } else if (paket.detailReguler) {
    var reg = paket.detailReguler || {};
    // Kegiatan Reguler/Tupoksi: semua field form wajib.
    detailIntiRequire_(missing, 'Nama Kegiatan', reg.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', reg.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', reg.lokasi);
    detailIntiRequire_(missing, 'Sasaran/Pihak Terlibat', reg.pihakTerlibat);
    detailIntiRequire_(missing, 'Peran/Partisipasi', reg.peranAnda);
    detailIntiRequire_(missing, 'Ringkasan Output/Hasil', reg.outputRingkas);
    detailIntiRequire_(missing, 'Tindak Lanjut/Rekomendasi', reg.tindakLanjut);

    core.dasarKegiatan = jLow.includes('lurah') ? 'Kewenangan dan kebijakan Lurah' : 'Pelaksanaan tugas pokok dan fungsi';
    core.namaKegiatan = reg.namaKeg;
    core.tanggalKegiatan = reg.tanggal;
    core.lokasiKegiatan = reg.lokasi;
    core.penyelenggaraKeg = reg.pihakTerlibat;
    core.peranKeg = reg.peranAnda;

  } else if (paket.detailWajibDukuh) {
    var wd = paket.detailWajibDukuh || {};
    detailIntiRequire_(missing, 'Jenis Pertemuan Wajib Dukuh', wd.jenis || wd.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', wd.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', wd.lokasi);
    detailIntiRequire_(missing, 'Penyelenggara', wd.penyelenggara);
    detailIntiRequire_(missing, 'Output / Hasil Kegiatan', wd.outputRingkas || paket.deskripsi);

    core.dasarKegiatan = 'Kegiatan wajib Dukuh Pasal 41';
    core.namaKegiatan = wd.jenis || wd.namaKeg;
    core.tanggalKegiatan = wd.tanggal;
    core.lokasiKegiatan = wd.lokasi;
    core.penyelenggaraKeg = wd.penyelenggara;
    core.peranKeg = 'Dukuh / Pelaksana kegiatan wajib';

  } else if (paket.detailDukuh) {
    var duk = paket.detailDukuh || {};
    var namaDukuh = duk.namaKeg || detailIntiJoin_([duk.kategoriFungsi, duk.detailFungsi], ' - ');
    var pihakDukuh = duk.penyelenggara || duk.pihakTerlibat;

    // Field yang ada pada formulir Dukuh wajib.
    if (duk.kategoriFungsi !== undefined) detailIntiRequire_(missing, 'Kategori Utama Tupoksi Dukuh', duk.kategoriFungsi);
    if (duk.detailFungsi !== undefined) detailIntiRequire_(missing, 'Detail Fungsi Tupoksi Dukuh', duk.detailFungsi);
    detailIntiRequire_(missing, 'Nama Kegiatan / Detail Fungsi Dukuh', namaDukuh);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', duk.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', duk.lokasi);
    detailIntiRequire_(missing, 'Penyelenggara / Pihak Terlibat', pihakDukuh);
    if (duk.outputRingkas !== undefined) detailIntiRequire_(missing, 'Output / Hasil Kegiatan', duk.outputRingkas);

    core.dasarKegiatan = duk.kategoriFungsi ? ('Tupoksi Dukuh: ' + detailIntiText_(duk.kategoriFungsi)) : 'Tugas pokok dan fungsi Dukuh';
    core.namaKegiatan = namaDukuh;
    core.tanggalKegiatan = duk.tanggal;
    core.lokasiKegiatan = duk.lokasi;
    core.penyelenggaraKeg = pihakDukuh;
    core.peranKeg = duk.peran || 'Dukuh / Pelaksana kewilayahan';

  } else if (paket.detailPimpinan) {
    var pim = paket.detailPimpinan || {};
    // Semua field form Tugas/Instruksi Pimpinan wajib.
    detailIntiRequire_(missing, 'Jenis Tugas Pimpinan', pim.jenis);
    detailIntiRequire_(missing, 'Dasar Tugas / Instruksi', pim.dasar);
    detailIntiRequire_(missing, 'Pemberi Tugas / Instruksi', pim.pemberi);
    detailIntiRequire_(missing, 'Nama Agenda/Kegiatan', pim.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', pim.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', pim.lokasi);
    detailIntiRequire_(missing, 'Penyelenggara', pim.penyelenggara);

    core.dasarKegiatan = pim.dasar;
    core.namaKegiatan = pim.namaKeg;
    core.tanggalKegiatan = pim.tanggal;
    core.lokasiKegiatan = pim.lokasi;
    core.penyelenggaraKeg = pim.penyelenggara;
    core.peranKeg = pim.jenis;

  } else if (paket.detailAPBKal) {
    var apb = paket.detailAPBKal || {};
    // Semua field form APBKal wajib. Metode adalah turunan otomatis dari termin, bukan input manual.
    detailIntiRequire_(missing, 'Bidang APBKal', apb.bidang);
    detailIntiRequire_(missing, 'Kode Rekening', apb.kodeRek);
    detailIntiRequire_(missing, 'Nama Kegiatan APBKal', apb.namaKeg);
    detailIntiRequire_(missing, 'Termin Pencairan', apb.termin);
    detailIntiRequire_(missing, 'Tahapan Kegiatan', apb.tahap);
    detailIntiRequire_(missing, 'Status Pelaksanaan TPK', apb.isTPK);
    detailIntiRequire_(missing, 'Batas Waktu Pelaporan', apb.batasWaktu);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan Riil', apb.tanggal);
    detailIntiRequire_(missing, 'Lokasi/Tempat', apb.lokasi);

    if (String(apb.tahap || '') === APB_TAHAP.P54) {
      var p52 = apb.pasal52 || {};
      detailIntiRequire_(missing, 'Pasal 52: Apakah ada dokumentasi pengadaan barang?', p52.adaDokumentasiBarang);
      detailIntiRequire_(missing, 'Pasal 52: Apakah ada transaksi/pembayaran?', p52.adaTransaksiPembayaran);
      detailIntiRequire_(missing, 'Pasal 52: Apakah kegiatan menghadirkan orang?', p52.menghadirkanOrang);

      var dokWajib52 = apbPasal52DokumenWajib_(apb);
      for (var p52i = 0; p52i < dokWajib52.length; p52i++) {
        var dok52 = apbPasal52CariDokumen_(apb, dokWajib52[p52i].key);
        detailIntiRequire_(missing, 'Pasal 52: ' + dokWajib52[p52i].label, dok52 && (dok52.fileUrl || dok52.url || dok52.fileName));
      }
    }

    core.dasarKegiatan = 'Pelaksanaan kegiatan APBKal';
    core.namaKegiatan = '[' + detailIntiText_(apb.kodeRek) + '] ' + detailIntiText_(apb.namaKeg);
    core.tanggalKegiatan = apb.tanggal;
    core.lokasiKegiatan = apb.lokasi;
    core.penyelenggaraKeg = apb.bidang;
    core.peranKeg = detailIntiJoin_([apb.termin, apb.tahap ? tahapApbLabel_(apb.tahap) : ''], ' | ');

  } else if (paket.detailAPBKalCarik) {
    var apbc = paket.detailAPBKalCarik || {};
    // Form APBKal Carik kini memiliki lokasi eksplisit dan wajib diisi.
    detailIntiRequire_(missing, 'Jenis Pelaksanaan APBKal Tahun Berjalan', apbc.jenis);
    detailIntiRequire_(missing, 'Nama Dokumen/Kegiatan', apbc.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', apbc.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi Pelaksanaan', apbc.lokasi);

    core.dasarKegiatan = 'Pelaksanaan APBKal Tahun Berjalan (Pasal 44)';
    core.namaKegiatan = apbc.namaKeg;
    core.tanggalKegiatan = apbc.tanggal;
    core.lokasiKegiatan = apbc.lokasi;
    core.penyelenggaraKeg = detailIntiDefault_(core.penyelenggaraKeg, 'Pemerintah Kalurahan Minomartani');
    core.peranKeg = apbc.jenis;

  } else if (paket.detailStafInstruksi) {
    var inst = paket.detailStafInstruksi || {};
    // Form instruksi staf kini memiliki lokasi eksplisit dan wajib diisi.
    detailIntiRequire_(missing, 'Pemberi Instruksi', inst.pemberi);
    detailIntiRequire_(missing, 'Bentuk Instruksi', inst.bentuk);
    detailIntiRequire_(missing, 'Nama Tugas/Instruksi', inst.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', inst.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi Pelaksanaan Instruksi', inst.lokasi);

    core.dasarKegiatan = detailIntiJoin_(['Instruksi', inst.bentuk, 'dari ' + detailIntiText_(inst.pemberi)], ' ');
    core.namaKegiatan = inst.namaKeg;
    core.tanggalKegiatan = inst.tanggal;
    core.lokasiKegiatan = inst.lokasi;
    core.penyelenggaraKeg = detailIntiDefault_(core.penyelenggaraKeg, 'Pemerintah Kalurahan Minomartani');
    core.peranKeg = 'Pelaksana instruksi';

  } else if (paket.detailStafReguler) {
    var sr = paket.detailStafReguler || {};
    // Semua field form staf reguler/unit kerja wajib.
    detailIntiRequire_(missing, 'Nama Tugas/Pekerjaan', sr.namaKeg);
    detailIntiRequire_(missing, 'Tanggal Pelaksanaan', sr.tanggal);
    detailIntiRequire_(missing, 'Tempat/Lokasi', sr.lokasi);
    detailIntiRequire_(missing, 'Sasaran/Pihak Terlibat', sr.sasaran);
    detailIntiRequire_(missing, 'Peran Anda', sr.peran);

    core.dasarKegiatan = 'Tugas reguler unit kerja';
    core.namaKegiatan = sr.namaKeg;
    core.tanggalKegiatan = sr.tanggal;
    core.lokasiKegiatan = sr.lokasi;
    core.penyelenggaraKeg = sr.sasaran;
    core.peranKeg = sr.peran;

  } else if (paket.detailWajibPamong) {
    var wajib = paket.detailWajibPamong || {};
    detailIntiRequire_(missing, 'Bulan Laporan Wajib', wajib.bulan);
    if (!wajib.tugasData || !wajib.tugasData.length) {
      missing.push('Rincian tugas wajib bulanan');
    } else {
      for (var wt = 0; wt < wajib.tugasData.length; wt++) {
        var tugas = wajib.tugasData[wt] || {};
        detailIntiRequire_(missing, 'Deskripsi tugas wajib #' + (wt + 1), tugas.deskripsi);
        detailIntiRequire_(missing, 'Bukti tugas wajib #' + (wt + 1), tugas.fileName || tugas.fileData || tugas.fileUrl);
      }
    }

    core.dasarKegiatan = 'Laporan wajib pamong bulanan';
    core.namaKegiatan = 'Paket kegiatan wajib bulan: ' + detailIntiText_(wajib.bulan);
    core.tanggalKegiatan = detailIntiText_(wajib.bulan);
    core.lokasiKegiatan = 'Wilayah Kerja / Kalurahan Minomartani';
    core.penyelenggaraKeg = 'Pemerintah Kalurahan Minomartani';
    core.peranKeg = 'Pelaksana kewajiban bulanan';

  } else {
    missing.push('Jenis formulir/detail laporan tidak dikenali oleh server');
  }

  // Pemeriksaan akhir hanya setelah normalisasi. Jika form tidak memiliki field tertentu,
  // nilai baku di atas seharusnya sudah membentuk K-Q secara lengkap.
  detailIntiRequire_(missing, 'K: Dasar Kehadiran / Normalisasi', core.dasarKegiatan);
  detailIntiRequire_(missing, 'M: Nama Kegiatan / Normalisasi', core.namaKegiatan);
  detailIntiRequire_(missing, 'N: Tanggal Pelaksanaan / Normalisasi', core.tanggalKegiatan);
  detailIntiRequire_(missing, 'O: Tempat / Lokasi / Normalisasi', core.lokasiKegiatan);
  detailIntiRequire_(missing, 'P: Penyelenggara / Pihak Terkait / Normalisasi', core.penyelenggaraKeg);
  detailIntiRequire_(missing, 'Q: Peran / Partisipasi / Normalisasi', core.peranKeg);

  if (missing.length) {
    var unique = [];
    for (var i = 0; i < missing.length; i++) if (unique.indexOf(missing[i]) === -1) unique.push(missing[i]);
    return {
      sukses: false,
      pesan: 'Detail formulir belum lengkap. Mohon lengkapi isian wajib berikut:\n- ' + unique.join('\n- ')
    };
  }

  return { sukses: true, data: core };
}
// ===== END v29 =====


function safeUploadFileName_(name) {
  var s = sanitizeForSheet_((name || 'file').toString())
    .replace(/[\\/:*?"<>|#%{}~&]+/g, '_')
    .replace(/[\u0000-\u001F\u007F]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.substring(0, 180) || 'file';
}

function uploadByte_(b) {
  return b < 0 ? b + 256 : b;
}

function deteksiTipeFileDariBytes_(bytes) {
  bytes = bytes || [];
  if (bytes.length >= 4 && uploadByte_(bytes[0]) === 0x25 && uploadByte_(bytes[1]) === 0x50 && uploadByte_(bytes[2]) === 0x44 && uploadByte_(bytes[3]) === 0x46) {
    return { mime: 'application/pdf', ext: 'pdf', label: 'PDF' };
  }
  if (bytes.length >= 3 && uploadByte_(bytes[0]) === 0xFF && uploadByte_(bytes[1]) === 0xD8 && uploadByte_(bytes[2]) === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG' };
  }
  if (bytes.length >= 8 && uploadByte_(bytes[0]) === 0x89 && uploadByte_(bytes[1]) === 0x50 && uploadByte_(bytes[2]) === 0x4E && uploadByte_(bytes[3]) === 0x47 && uploadByte_(bytes[4]) === 0x0D && uploadByte_(bytes[5]) === 0x0A && uploadByte_(bytes[6]) === 0x1A && uploadByte_(bytes[7]) === 0x0A) {
    return { mime: 'image/png', ext: 'png', label: 'PNG' };
  }
  if (bytes.length >= 12 && uploadByte_(bytes[0]) === 0x52 && uploadByte_(bytes[1]) === 0x49 && uploadByte_(bytes[2]) === 0x46 && uploadByte_(bytes[3]) === 0x46 && uploadByte_(bytes[8]) === 0x57 && uploadByte_(bytes[9]) === 0x45 && uploadByte_(bytes[10]) === 0x42 && uploadByte_(bytes[11]) === 0x50) {
    return { mime: 'image/webp', ext: 'webp', label: 'WEBP' };
  }
  return null;
}

function normalisasiMimeUpload_(mimeType) {
  var m = String(mimeType || '').toLowerCase().split(';')[0].trim();
  if (m === 'image/jpg' || m === 'image/pjpeg') return 'image/jpeg';
  return m;
}

function validasiBuktiUploadBytes_(bytes, mimeType, originalName) {
  var declared = normalisasiMimeUpload_(mimeType);
  var detected = deteksiTipeFileDariBytes_(bytes);
  var allowed = {
    'application/pdf': true,
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true
  };

  if (!detected || !allowed[detected.mime]) {
    return { sukses: false, pesan: 'Tipe file tidak dikenali/diizinkan. Gunakan PDF, JPG, PNG, atau WEBP.' };
  }

  // Backend tidak hanya percaya atribut accept HTML atau ekstensi file.
  // Jika browser mengirim content type yang jelas tetapi berbeda dari signature file, tolak.
  if (declared && declared !== 'application/octet-stream' && declared !== detected.mime) {
    return {
      sukses: false,
      pesan: 'Tipe file tidak sesuai. Terdeteksi ' + detected.label + ', tetapi browser mengirim ' + declared + '.'
    };
  }

  return {
    sukses: true,
    mime: detected.mime,
    ext: detected.ext,
    label: detected.label
  };
}

function uploadSanitizeTanggal_(value) {
  var s = String(value || '').trim();
  if (!s) return Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
  var d = parseTanggalKosongAman_(s);
  if (d) return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
  return safeUploadFileName_(s).replace(/\s+/g, '-').substring(0, 30) || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
}

function ambilExtUploadDariNama_(originalName, mimeType) {
  var cleanOriginal = (originalName || '').toString();
  var ext = cleanOriginal.indexOf('.') !== -1 ? cleanOriginal.split('.').pop().toLowerCase() : 'bin';
  var safeMime = normalisasiMimeUpload_(mimeType);
  if (safeMime === 'application/pdf') ext = 'pdf';
  else if (safeMime === 'image/jpeg') ext = 'jpg';
  else if (safeMime === 'image/png') ext = 'png';
  else if (safeMime === 'image/webp') ext = 'webp';
  return ext;
}

function buatFinalNameBuktiKinerja_(pegawai, meta, timestamp, originalName, mimeType, validasiFile) {
  meta = meta || {};
  var ext = (validasiFile && validasiFile.ext) || ambilExtUploadDariNama_(originalName, mimeType);
  var nama = (pegawai && pegawai.nama) ? pegawai.nama : 'Pegawai';
  var label = meta.label || meta.role || 'Bukti';
  var tanggal = uploadSanitizeTanggal_(meta.tanggalKegiatan || meta.tanggal || meta.periode || '');
  var namaKegiatan = meta.namaKegiatan || meta.namaKeg || meta.kegiatan || meta.kategori || 'Laporan Kinerja';

  var parts = ['Laporan', tanggal, nama, namaKegiatan, label, timestamp];
  var base = parts.map(function (p) { return safeUploadFileName_(p); }).filter(Boolean).join('_');
  return safeUploadFileName_(base + '.' + ext);
}

function uploadBuktiKinerjaBlob(formObj) {
  try {
    var token = formObj && formObj.uploadToken ? String(formObj.uploadToken) : '';
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, pesan: 'Sesi habis. Silakan login ulang.' };

    var pegawai = getPegawaiById_(idUser) || {};
    var metaRaw = formObj && formObj.uploadMetaJson ? String(formObj.uploadMetaJson) : '[]';
    var metaList = [];
    try { metaList = JSON.parse(metaRaw); } catch (jsonErr) { metaList = []; }
    if (!Array.isArray(metaList) || !metaList.length) {
      return { sukses: false, pesan: 'Tidak ada file yang dikirim untuk diunggah.' };
    }

    var props = PropertiesService.getScriptProperties();
    var folderRootId = (props.getProperty('FOLDER_ID_BUKTI_KINERJA') || props.getProperty('FOLDER_ID_BUKTI') || '').trim();
    if (!folderRootId) throw new Error('Konfigurasi Folder Bukti belum diatur. Isi Script Property FOLDER_ID_BUKTI_KINERJA atau FOLDER_ID_BUKTI.');

    var now = new Date();
    var timestamp = Utilities.formatDate(now, 'GMT+7', 'yyyyMMdd_HHmmss');
    var tahunStr = Utilities.formatDate(now, 'GMT+7', 'yyyy');
    var rootFolder = DriveApp.getFolderById(folderRootId);
    var folderTahun = dapatkanAtauBuatFolder(rootFolder, tahunStr);
    var folderFotoUtama = dapatkanAtauBuatFolder(folderTahun, 'FOTO');
    var folderPDFUtama = dapatkanAtauBuatFolder(folderTahun, 'PDF');

    var results = [];
    var MAX_FILE_BYTES = 10 * 1024 * 1024;

    for (var i = 0; i < metaList.length; i++) {
      var meta = metaList[i] || {};
      var fieldName = meta.fieldName || ('file' + i);
      var blob = formObj[fieldName];
      if (Array.isArray(blob)) blob = blob[0];
      if (!blob || typeof blob.getBytes !== 'function') {
        return { sukses: false, pesan: 'File upload tidak terbaca pada field ' + fieldName + '.' };
      }

      var originalName = blob.getName ? (blob.getName() || meta.originalName || ('file' + (i + 1))) : (meta.originalName || ('file' + (i + 1)));
      var mimeType = blob.getContentType ? (blob.getContentType() || meta.mime || '') : (meta.mime || '');
      var bytes = blob.getBytes();
      if (bytes.length > MAX_FILE_BYTES) {
        return { sukses: false, pesan: 'File "' + originalName + '" melebihi batas 10 MB.' };
      }

      var validasiFile = validasiBuktiUploadBytes_(bytes, mimeType, originalName);
      if (!validasiFile.sukses) {
        return { sukses: false, pesan: 'File "' + originalName + '" ditolak. ' + validasiFile.pesan };
      }

      var isPdf = validasiFile.mime === 'application/pdf';
      var targetFolder = isPdf ? folderPDFUtama : folderFotoUtama;
      var finalName = buatFinalNameBuktiKinerja_(pegawai, meta, timestamp, originalName, validasiFile.mime, validasiFile);
      var uploadBlob = Utilities.newBlob(bytes, validasiFile.mime, finalName);
      var createdFile = targetFolder.createFile(uploadBlob);
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      results.push({
        role: meta.role || '',
        index: typeof meta.index === 'number' ? meta.index : i,
        label: meta.label || '',
        url: createdFile.getUrl(),
        fileId: createdFile.getId(),
        mime: validasiFile.mime,
        detectedMime: validasiFile.mime,
        name: finalName,
        originalName: originalName,
        sizeBytes: bytes.length,
        isPdf: isPdf
      });
    }

    return { sukses: true, files: results, uploadSelesaiPada: Utilities.formatDate(now, 'GMT+7', 'dd/MM/yyyy HH:mm:ss') };
  } catch (e) {
    return handleError('uploadBuktiKinerjaBlob', e, { sukses: false, pesan: 'Gagal mengunggah bukti. ' + (e && e.message ? e.message : e) });
  }
}


function hapusUploadBuktiKinerjaSementara(fileIds, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, pesan: 'Sesi habis. Silakan login ulang.' };
    fileIds = Array.isArray(fileIds) ? fileIds : [];
    var ok = 0;
    var gagal = 0;
    for (var i = 0; i < fileIds.length; i++) {
      var fid = String(fileIds[i] || '').trim();
      if (!fid || !/^[A-Za-z0-9_-]{10,}$/.test(fid)) continue;
      try {
        DriveApp.getFileById(fid).setTrashed(true);
        ok++;
      } catch (e) {
        gagal++;
      }
    }
    return { sukses: true, dihapus: ok, gagal: gagal };
  } catch (e) {
    return handleError('hapusUploadBuktiKinerjaSementara', e, { sukses: false, pesan: 'Gagal membersihkan upload sementara.' });
  }
}


function submitInFlightTtl_() {
  var ttl = CONFIG && CONFIG.CACHE && CONFIG.CACHE.SUBMIT_IN_FLIGHT_TTL
    ? Number(CONFIG.CACHE.SUBMIT_IN_FLIGHT_TTL)
    : 420;
  return isNaN(ttl) || ttl < 120 ? 420 : ttl;
}

function submitInFlightStaleSeconds_() {
  var stale = CONFIG && CONFIG.CACHE && CONFIG.CACHE.SUBMIT_IN_FLIGHT_STALE_SECONDS
    ? Number(CONFIG.CACHE.SUBMIT_IN_FLIGHT_STALE_SECONDS)
    : submitInFlightTtl_();
  return isNaN(stale) || stale < 120 ? submitInFlightTtl_() : stale;
}

function buatSubmitInFlightState_() {
  return 'IN_FLIGHT|' + new Date().getTime() + '|' + Utilities.getUuid().split('-')[0];
}

function bacaSubmitNonceState_(rawValue) {
  var s = String(rawValue || '').trim();
  var info = {
    raw: s,
    kosong: !s,
    done: s === 'DONE',
    inFlight: false,
    legacy: false,
    stale: false,
    ageSeconds: 0
  };

  if (!s || info.done) return info;

  if (s === 'IN_FLIGHT') {
    info.inFlight = true;
    info.legacy = true;
    return info;
  }

  var parts = s.split('|');
  if (parts[0] === 'IN_FLIGHT') {
    info.inFlight = true;
    var ts = parseInt(parts[1], 10);
    if (isNaN(ts) || ts <= 0) {
      info.legacy = true;
      return info;
    }

    var umurMs = new Date().getTime() - ts;
    info.ageSeconds = Math.max(0, Math.floor(umurMs / 1000));
    info.stale = info.ageSeconds >= submitInFlightStaleSeconds_();
  }

  return info;
}

function simpanDataKinerja(paket, token) {
  var ctx = buatKonteksSubmitKinerja_();

  try {
    var errorAwal = validasiRequestAwalSubmitKinerja_(ctx, paket, token);
    if (errorAwal) return errorAwal;

    var errorNonce = pasangSubmitNonceInFlight_(ctx);
    if (errorNonce) return errorNonce;

    muatKonfigurasiSubmitKinerja_(ctx);

    var errorPayload = validasiPayloadSubmitKinerja_(paket, ctx.pegawaiUser);
    if (errorPayload) return errorPayload;

    var uploader = buatUploaderBuktiSubmitKinerja_(ctx);
    var draft = buildDraftLaporanKinerjaSubmit_(paket, ctx, uploader);

    var detailInti = normalisasiDetailIntiSubmitKinerja_(paket, draft);
    if (!detailInti.sukses) return "❌ GAGAL: " + detailInti.pesan;
    draft = detailInti.draft;

    var validasiDisposisi = validasiDisposisiSubmitKinerja_(paket, ctx.pegawaiUser, draft.kategoriSheet);
    if (!validasiDisposisi.sukses) return "❌ GAGAL: " + validasiDisposisi.pesan;
    draft.disposisiRef = validasiDisposisi.disposisiRef;
    draft.disposisiSuratRef = validasiDisposisi.disposisiSuratRef;

    draft.urlDasar = uploadDokumenDasarSubmitKinerja_(paket, ctx, draft, uploader);
    draft.narasiUntukAI = batasiNarasiAISubmitKinerja_(draft.narasiUntukAI);

    var evaluasi = hitungEvaluasiAwalSubmitKinerja_(paket, draft.kategoriSheet);
    var baris = buildBarisRekapKinerjaSubmit_(paket, ctx, draft, evaluasi);

    var hasilSimpan = simpanBarisRekapKinerjaSubmit_(paket, ctx, draft, evaluasi, baris);
    if (!hasilSimpan.sukses) return hasilSimpan.pesan;

    jalankanEfekSampingSubmitKinerja_(ctx, draft, evaluasi, hasilSimpan.lastRowIdx);

    return "✅ Laporan terkirim! Data tersimpan dan menunggu review admin.";

  } catch (e) {
    return pesanErrorStringAman_("simpanDataKinerja", e, "❌ ");
  } finally {
    bersihkanUploadSubmitKinerja_(ctx);
    bersihkanNonceSubmitKinerja_(ctx);
  }
}

function buatKonteksSubmitKinerja_() {
  return {
    submitCache: CacheService.getScriptCache(),
    nonceKey: "",
    pertahankanNonce: false,
    nonceInFlightDitetapkan: false,
    nonceInFlightStateValue: "",
    submitNonce: "",
    uploadedFileIdsSubmit: [],
    laporanBerhasilDisimpan: false,
    idUser: "",
    pegawaiUser: null,
    props: null,
    apiKey: "",
    folderRootId: "",
    aiAktif: false,
    idLaporan: "",
    timestamp: "",
    tahunStr: "",
    tahunBulanStr: "",
    rootFolder: null,
    folderTahun: null,
    folderFotoUtama: null,
    folderPDFUtama: null
  };
}

function validasiRequestAwalSubmitKinerja_(ctx, paket, token) {
  ctx.idUser = validasiSession(token);
  if (!ctx.idUser) return "ERROR_SESSION_EXPIRED";
  ctx.pegawaiUser = getPegawaiById_(ctx.idUser);

  if (!paket || typeof paket !== "object") {
    return "❌ GAGAL: Paket data tidak valid.";
  }

  // BLOKIR INPUT SAAT JEDA CUT-OFF
  // Jika Admin/Carik sudah menetapkan cut-off periode, pegawai tidak dapat
  // mengirim laporan mulai setelah jam cut-off sampai input dibuka kembali.
  var statusInputCutoff = statusInputLaporanCutoffSaatIni_();
  if (statusInputCutoff && statusInputCutoff.ditutup) {
    return "❌ INPUT LAPORAN DITUTUP SEMENTARA\n\n" + statusInputCutoff.pesan;
  }

  ctx.submitNonce = (paket.submitNonce || "").toString().trim();
  if (!ctx.submitNonce) {
    return "❌ GAGAL: Token submit tidak valid. Silakan muat ulang halaman lalu coba lagi.";
  }

  ctx.nonceKey = "SUBMIT_NONCE_" + ctx.idUser.toString() + "_" + ctx.submitNonce;
  return "";
}

function pasangSubmitNonceInFlight_(ctx) {
  // FIX RACE CONDITION NONCE:
  // get -> cek -> put IN_FLIGHT harus atomik. Tanpa lock pendek ini,
  // dua request dengan nonce yang sama bisa sama-sama melihat cache kosong
  // sebelum salah satunya menulis IN_FLIGHT. Lock hanya dipakai untuk
  // bagian nonce agar proses berat tetap bisa berjalan paralel.
  var nonceLock = LockService.getScriptLock();
  if (!nonceLock.tryLock(5000)) {
    return "❌ GAGAL: Antrean server sedang penuh. Silakan klik 'Kirim' lagi dalam beberapa detik.";
  }

  try {
    var nonceState = ctx.submitCache.get(ctx.nonceKey);
    var nonceInfo = bacaSubmitNonceState_(nonceState);

    if (nonceInfo.done) {
      ctx.pertahankanNonce = true;
      return "⚠️ Permintaan yang sama sudah pernah diproses. Laporan tidak dikirim ulang.";
    }

    if (nonceInfo.inFlight && !nonceInfo.stale) {
      ctx.pertahankanNonce = true;
      return "⏳ Permintaan yang sama sedang diproses. Mohon tunggu beberapa detik.";
    }

    if (nonceInfo.inFlight && nonceInfo.stale) {
      Logger.log("Nonce IN_FLIGHT stale ditimpa: " + ctx.nonceKey + " | umur detik: " + nonceInfo.ageSeconds);
    }

    ctx.nonceInFlightStateValue = buatSubmitInFlightState_();
    ctx.submitCache.put(ctx.nonceKey, ctx.nonceInFlightStateValue, submitInFlightTtl_());
    ctx.nonceInFlightDitetapkan = true;
    return "";
  } finally {
    nonceLock.releaseLock();
  }
}

function muatKonfigurasiSubmitKinerja_(ctx) {
  ctx.props = PropertiesService.getScriptProperties();
  ctx.apiKey = (ctx.props.getProperty("API_KEY_GEMINI") || "").trim();
  ctx.folderRootId = (ctx.props.getProperty("FOLDER_ID_BUKTI_KINERJA") || ctx.props.getProperty("FOLDER_ID_BUKTI") || "").trim();

  if (!ctx.folderRootId) throw new Error("Konfigurasi Folder Bukti belum diatur. Isi Script Property FOLDER_ID_BUKTI_KINERJA atau FOLDER_ID_BUKTI.");

  // AI deskripsi tidak lagi berjalan otomatis saat submit. Gunakan tombol Rapikan Bahasa dengan AI secara opsional.
  ctx.aiAktif = false;

  ctx.idLaporan = Utilities.getUuid();
  var d = new Date();
  ctx.timestamp = Utilities.formatDate(d, "GMT+7", "yyyyMMdd_HHmmss");
  ctx.tahunStr = Utilities.formatDate(d, "GMT+7", "yyyy");
  ctx.tahunBulanStr = Utilities.formatDate(d, "GMT+7", "yyyy-MM");

  ctx.rootFolder = DriveApp.getFolderById(ctx.folderRootId);
  ctx.folderTahun = dapatkanAtauBuatFolder(ctx.rootFolder, ctx.tahunStr);
  ctx.folderFotoUtama = dapatkanAtauBuatFolder(ctx.folderTahun, "FOTO");
  ctx.folderPDFUtama = dapatkanAtauBuatFolder(ctx.folderTahun, "PDF");
  dapatkanAtauBuatFolder(ctx.folderTahun, "BACKUP");
}

function validasiPayloadSubmitKinerja_(paket, pegawaiUser) {
  if (!paket.nama || !paket.jabatan || !paket.kategori || (!paket.deskripsi && !paket.detailWajibPamong && !paket.detailWajibDukuh)) {
    return "❌ GAGAL: Data tidak lengkap. Peringatan: Manipulasi form terdeteksi.";
  }

  var validasiPiketDukuh = validasiJadwalPiketKhususDukuh_(paket, pegawaiUser);
  if (!validasiPiketDukuh.sukses) {
    return "❌ GAGAL: " + validasiPiketDukuh.pesan;
  }

  var BATAS_FILE_B64 = CONFIG.FILE_LIMITS.MAX_FILE_B64;
  var BATAS_TOTAL_B64 = CONFIG.FILE_LIMITS.MAX_TOTAL_B64;
  var totalPayload = 0;

  if (paket.fileData) {
    totalPayload += paket.fileData.length;
    if (paket.fileData.length > BATAS_FILE_B64) {
      return "❌ GAGAL: Dokumentasi visual terlalu besar. Ambil foto lebih dekat lalu coba lagi.";
    }
  }

  if (paket.fileDasarData) {
    totalPayload += paket.fileDasarData.length;
    if (paket.fileDasarData.length > BATAS_FILE_B64) {
      return "❌ GAGAL: Dokumen dasar terlalu besar. Gunakan file yang lebih ringan.";
    }
  }

  if (paket.detailWajibPamong && paket.detailWajibPamong.tugasData) {
    for (var tw = 0; tw < paket.detailWajibPamong.tugasData.length; tw++) {
      var itemTugas = paket.detailWajibPamong.tugasData[tw];
      if (itemTugas && itemTugas.fileData) {
        totalPayload += itemTugas.fileData.length;
        if (itemTugas.fileData.length > BATAS_FILE_B64) {
          return "❌ GAGAL: Salah satu file tugas wajib terlalu besar. Kurangi ukuran file lalu coba lagi.";
        }
      }
    }
  }

  // Semua field input laporan wajib diisi mulai APP_VERSION 2026.05.05.18.
  // Guard backend ini mencegah submit manipulatif yang melewati validasi UI.
  if (!paket.detailWajibPamong) {
    if (!paket.fileData && !paket.fileUrl) {
      return "❌ GAGAL: Dokumentasi visual/bukti wajib diunggah. Semua field laporan wajib dilengkapi.";
    }
    if (detailIntiIsBlank_(paket.deskripsi)) {
      return "❌ GAGAL: Deskripsi/Output/Hasil Kegiatan wajib diisi. Semua field laporan wajib dilengkapi.";
    }
  } else {
    var wajibEarly = paket.detailWajibPamong || {};
    if (!wajibEarly.tugasData || !wajibEarly.tugasData.length) {
      return "❌ GAGAL: Rincian laporan wajib bulanan belum tersedia.";
    }
    for (var wf = 0; wf < wajibEarly.tugasData.length; wf++) {
      var wtItem = wajibEarly.tugasData[wf] || {};
      if (detailIntiIsBlank_(wtItem.deskripsi) || (!wtItem.fileData && !wtItem.fileUrl)) {
        return "❌ GAGAL: Setiap item laporan wajib bulanan harus berisi deskripsi dan bukti. Lengkapi item ke-" + (wf + 1) + ".";
      }
    }
  }

  if (totalPayload > BATAS_TOTAL_B64) {
    return "❌ GAGAL: Total file terlalu besar untuk diproses. Kurangi jumlah file atau gunakan file yang lebih ringan.";
  }

  return "";
}

function buatUploaderBuktiSubmitKinerja_(ctx) {
  return function (fileData, mimeType, oriName, finalName) {
    var safeOriName = (oriName || "file").toString();
    var bytesUpload = Utilities.base64Decode(fileData);
    var validasiFile = validasiBuktiUploadBytes_(bytesUpload, mimeType, safeOriName);
    if (!validasiFile.sukses) {
      throw new Error('File "' + safeOriName + '" ditolak. ' + validasiFile.pesan);
    }

    var isPdf = validasiFile.mime === "application/pdf";
    var targetFolder = isPdf ? ctx.folderPDFUtama : ctx.folderFotoUtama;
    var finalSafeName = safeUploadFileName_(finalName || (safeOriName + '.' + validasiFile.ext));
    var fileBlob = Utilities.newBlob(bytesUpload, validasiFile.mime, finalSafeName);
    var createdFile = targetFolder.createFile(fileBlob);
    ctx.uploadedFileIdsSubmit.push(createdFile.getId());
    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return createdFile.getUrl();
  };
}

function buildDraftLaporanKinerjaSubmit_(paket, ctx, simpanKeDriveTerstruktur) {
  var draft = {
    kategoriSheet: paket.kategori,
    narasiUntukAI: paket.deskripsi,
    namaKegiatan: "",
    tanggalKegiatan: "",
    lokasiKegiatan: "",
    dasarKegiatan: "",
    penyelenggaraKeg: "",
    peranKeg: "",
    urlVisualArray: [],
    urlDasar: "",
    disposisiRef: null,
    disposisiSuratRef: null
  };

  if (paket.detailWajibPamong) {
    draft.kategoriSheet = "Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Bulanan";
    draft.namaKegiatan = "Paket Kegiatan Wajib Bulan: " + paket.detailWajibPamong.bulan;
    var narasiGabungan = "BULAN LAPORAN: " + paket.detailWajibPamong.bulan + "\n\n";
    var arrTugas = paket.detailWajibPamong.tugasData;
    for (var k = 0; k < arrTugas.length; k++) {
      var t = arrTugas[k];
      narasiGabungan += (k + 1) + ". TUGAS: " + t.namaTugas + "\nDESKRIPSI: " + t.deskripsi + "\n\n";
      if (t.fileUrl) {
        t.buktiUrl = t.fileUrl;
        t.buktiLabel = "Tugas " + (k + 1) + " - " + (t.namaTugas || ("Tugas " + (k + 1)));
        draft.urlVisualArray.push(t.fileUrl);
      } else if (t.fileData) {
        var ext = String(t.fileName || "bukti").split(".").pop();
        var fName = paket.nama + " - Wajib " + (k + 1) + " - " + ctx.timestamp + "." + ext;
        var uploadedUrlWajib = simpanKeDriveTerstruktur(t.fileData, t.mime, t.fileName, fName);
        t.fileUrl = uploadedUrlWajib;
        t.buktiUrl = uploadedUrlWajib;
        t.buktiLabel = "Tugas " + (k + 1) + " - " + (t.namaTugas || ("Tugas " + (k + 1)));
        draft.urlVisualArray.push(uploadedUrlWajib);
      }
    }
    draft.narasiUntukAI = narasiGabungan;
    paket.deskripsi = narasiGabungan;
  } else {
    if (paket.detailWajibDukuh) {
      draft.kategoriSheet = "Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Dukuh";
      draft.dasarKegiatan = "Kegiatan wajib Dukuh Pasal 41";
      draft.namaKegiatan = paket.detailWajibDukuh.jenis || paket.detailWajibDukuh.namaKeg;
      draft.tanggalKegiatan = paket.detailWajibDukuh.tanggal;
      draft.lokasiKegiatan = paket.detailWajibDukuh.lokasi;
      draft.penyelenggaraKeg = paket.detailWajibDukuh.penyelenggara;
      draft.peranKeg = "Dukuh / Pelaksana kegiatan wajib";
      draft.narasiUntukAI = "JENIS PERTEMUAN WAJIB: " + (paket.detailWajibDukuh.jenis || paket.detailWajibDukuh.namaKeg || "") + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\nPENYELENGGARA: " + draft.penyelenggaraKeg + "\n\n[OUTPUT]\n" + (paket.detailWajibDukuh.outputRingkas || paket.deskripsi || "");
      paket.deskripsi = draft.narasiUntukAI;
    } else if (paket.detailTU) {
      draft.kategoriSheet = "Laporan Tugas Umum - " + paket.detailTU.jenis;
      var dasarTUSimpan = String(paket.detailTU.dasar || '').trim();
      var dasarTUOpsiSimpan = String(paket.detailTU.dasarOpsi || paket.detailTU.dasarPilihan || paket.detailTU.dasar || '').trim();
      var dasarTULainnyaSimpan = String(paket.detailTU.dasarLainnya || paket.detailTU.dasarManual || paket.detailTU.dasarKehadiranLainnya || '').trim();
      if (dasarTUOpsiSimpan === 'Lainnya' || dasarTUSimpan === 'Lainnya') dasarTUSimpan = dasarTULainnyaSimpan;
      draft.dasarKegiatan = dasarTUSimpan;
      draft.namaKegiatan = paket.detailTU.namaKeg;
      draft.tanggalKegiatan = paket.detailTU.tanggal;
      draft.lokasiKegiatan = paket.detailTU.lokasi;
      draft.penyelenggaraKeg = paket.detailTU.penyelenggara;
      draft.peranKeg = paket.detailTU.peran;
      draft.narasiUntukAI = "NAMA KEGIATAN: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\nPENYELENGGARA: " + draft.penyelenggaraKeg + "\nPERAN: " + draft.peranKeg + "\nDASAR: " + draft.dasarKegiatan + "\n\n[OUTPUT]\n" + paket.deskripsi;
    } else if (paket.detailPimpinan) {
      draft.kategoriSheet = "Laporan Produktifitas - Pelaksanaan Kegiatan Tugas Pimpinan";
      draft.dasarKegiatan = paket.detailPimpinan.dasar;
      draft.namaKegiatan = paket.detailPimpinan.namaKeg;
      draft.tanggalKegiatan = paket.detailPimpinan.tanggal;
      draft.lokasiKegiatan = paket.detailPimpinan.lokasi;
      draft.penyelenggaraKeg = paket.detailPimpinan.penyelenggara;
      draft.peranKeg = paket.detailPimpinan.jenis;
      draft.narasiUntukAI = "JENIS TUGAS PIMPINAN: " + paket.detailPimpinan.jenis + "\nNAMA KEGIATAN/AGENDA: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\nPENYELENGGARA: " + draft.penyelenggaraKeg + "\n\n[OUTPUT PELAKSANAAN]\n" + paket.deskripsi;
    } else if (paket.detailPHL) {
      draft.namaKegiatan = paket.detailPHL.namaKeg;
      draft.tanggalKegiatan = paket.detailPHL.tanggal;
      draft.lokasiKegiatan = paket.detailPHL.lokasi;
      draft.narasiUntukAI = "NAMA KEGIATAN: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\n\n[OUTPUT]\n" + paket.deskripsi;
    } else if (paket.detailDukuh) {
      draft.namaKegiatan = paket.detailDukuh.namaKeg;
      draft.tanggalKegiatan = paket.detailDukuh.tanggal;
      draft.lokasiKegiatan = paket.detailDukuh.lokasi;
      draft.penyelenggaraKeg = paket.detailDukuh.penyelenggara;
      draft.narasiUntukAI = "NAMA KEGIATAN: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\nPENYELENGGARA: " + draft.penyelenggaraKeg + "\n\n[OUTPUT]\n" + paket.deskripsi;
    } else if (paket.detailAPBKal) {
      draft.kategoriSheet = "Laporan Produktifitas - Pelaksanaan APBKal Tahun Berjalan";
      draft.dasarKegiatan = "Peraturan Lurah No 4 Tahun 2025";
      draft.namaKegiatan = "[" + paket.detailAPBKal.kodeRek + "] " + paket.detailAPBKal.namaKeg;
      draft.tanggalKegiatan = paket.detailAPBKal.tanggal;
      draft.lokasiKegiatan = paket.detailAPBKal.lokasi;
      draft.penyelenggaraKeg = paket.detailAPBKal.bidang;
      draft.peranKeg = paket.detailAPBKal.termin + " | " + tahapApbLabel_(paket.detailAPBKal.tahap);

      var ringkasanPasal52 = apbPasal52Ringkasan_(paket.detailAPBKal);
      if (paket.detailAPBKal.pasal52 && Array.isArray(paket.detailAPBKal.pasal52.dokumen)) {
        for (var p52d = 0; p52d < paket.detailAPBKal.pasal52.dokumen.length; p52d++) {
          var dokP52 = paket.detailAPBKal.pasal52.dokumen[p52d] || {};
          if (dokP52.fileUrl || dokP52.url) draft.urlVisualArray.push(dokP52.fileUrl || dokP52.url);
        }
      }

      draft.narasiUntukAI = "BIDANG: " + paket.detailAPBKal.bidang + "\nKODE REK: " + paket.detailAPBKal.kodeRek + "\nTERMIN: " + paket.detailAPBKal.termin + "\nTAHAP: " + tahapApbLabel_(paket.detailAPBKal.tahap) + "\nTPK: " + paket.detailAPBKal.isTPK + "\nBATAS WAKTU: " + paket.detailAPBKal.batasWaktu + (ringkasanPasal52 ? ("\n" + ringkasanPasal52) : "") + "\n\n[OUTPUT PELAKSANAAN]\n" + paket.deskripsi;
    } else if (paket.detailAPBKalCarik) {
      draft.kategoriSheet = "Laporan Produktivitas - Pelaksanaan Kegiatan tugas pokok dan fungsi - Pelaksanaan APBKal Tahun Berjalan (Pasal 44)";
      draft.dasarKegiatan = "Peraturan Lurah No 4 Tahun 2025 (Pasal 44)";
      draft.namaKegiatan = paket.detailAPBKalCarik.namaKeg;
      draft.tanggalKegiatan = paket.detailAPBKalCarik.tanggal;
      draft.lokasiKegiatan = paket.detailAPBKalCarik.lokasi;
      draft.penyelenggaraKeg = "Pemerintah Kalurahan";
      draft.peranKeg = paket.detailAPBKalCarik.jenis;
      draft.narasiUntukAI = "PELAKSANAAN APBKAL TAHUN BERJALAN (Pasal 44): " + paket.detailAPBKalCarik.jenis + "\nNAMA DOKUMEN: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\n\n[OUTPUT PELAKSANAAN]\n" + paket.deskripsi;
    } else if (paket.detailStafInstruksi) {
      draft.kategoriSheet = "Laporan Produktifitas - Melaksanakan Instruksi Pimpinan";
      draft.dasarKegiatan = "Instruksi " + paket.detailStafInstruksi.bentuk + " dari " + paket.detailStafInstruksi.pemberi;
      draft.namaKegiatan = paket.detailStafInstruksi.namaKeg;
      draft.tanggalKegiatan = paket.detailStafInstruksi.tanggal;
      draft.lokasiKegiatan = paket.detailStafInstruksi.lokasi;
      draft.penyelenggaraKeg = "Pemerintah Kalurahan";
      draft.peranKeg = "Staf Pelaksana";
      draft.narasiUntukAI = "PEMBERI INSTRUKSI: " + paket.detailStafInstruksi.pemberi + "\nBENTUK INSTRUKSI: " + paket.detailStafInstruksi.bentuk + "\nNAMA TUGAS: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\n\n[OUTPUT PELAKSANAAN]\n" + paket.deskripsi;
    } else if (paket.detailStafReguler) {
      draft.kategoriSheet = "Laporan Produktifitas - Melaksanakan Tugas Unit Kerja";
      draft.dasarKegiatan = "Tugas Rutin Unit Kerja";
      draft.namaKegiatan = paket.detailStafReguler.namaKeg;
      draft.tanggalKegiatan = paket.detailStafReguler.tanggal;
      draft.lokasiKegiatan = "Kantor Kalurahan";
      draft.penyelenggaraKeg = "Pemerintah Kalurahan";
      draft.peranKeg = "Staf Pelaksana";
      draft.narasiUntukAI = "NAMA PEKERJAAN: " + draft.namaKegiatan + "\nTANGGAL: " + draft.tanggalKegiatan + "\nLOKASI: " + draft.lokasiKegiatan + "\n\n[OUTPUT PELAKSANAAN]\n" + paket.deskripsi;
    }

    if (paket.fileUrl) {
      draft.urlVisualArray.push(paket.fileUrl);
    } else if (paket.fileData) {
      var extUtama = (paket.fileName && paket.fileName.indexOf(".") !== -1) ? paket.fileName.split(".").pop() : "bin";
      var namaFileUtama = paket.nama + " - " + draft.kategoriSheet + " - " + ctx.timestamp + "_Visual." + extUtama;
      draft.urlVisualArray.push(simpanKeDriveTerstruktur(paket.fileData, paket.mimeType, paket.fileName || ("visual." + extUtama), namaFileUtama));
    }
  }

  return draft;
}

function normalisasiDetailIntiSubmitKinerja_(paket, draft) {
  var validasiDetailInti = validasiDanNormalisasiDetailIntiLaporan_(
    paket,
    draft.kategoriSheet,
    draft.namaKegiatan,
    draft.tanggalKegiatan,
    draft.lokasiKegiatan,
    draft.dasarKegiatan,
    draft.penyelenggaraKeg,
    draft.peranKeg
  );

  if (!validasiDetailInti.sukses) {
    return { sukses: false, pesan: validasiDetailInti.pesan, draft: draft };
  }

  draft.namaKegiatan = validasiDetailInti.data.namaKegiatan;
  draft.tanggalKegiatan = validasiDetailInti.data.tanggalKegiatan;
  draft.lokasiKegiatan = validasiDetailInti.data.lokasiKegiatan;
  draft.dasarKegiatan = validasiDetailInti.data.dasarKegiatan;
  draft.penyelenggaraKeg = validasiDetailInti.data.penyelenggaraKeg;
  draft.peranKeg = validasiDetailInti.data.peranKeg;

  return { sukses: true, draft: draft };
}

function validasiDisposisiSubmitKinerja_(paket, pegawaiUser, kategoriSheet) {
  var disposisiRef = (paket && paket.disposisiRef && paket.disposisiRef.idDisposisi) ? paket.disposisiRef : null;
  var disposisiSuratRef = disposisiRef ? getDisposisiSuratByIdInternal_(disposisiRef.idDisposisi) : null;

  if (disposisiRef && disposisiRef.idDisposisi) {
    if (!disposisiSuratRef) {
      return { sukses: false, pesan: "Disposisi tidak ditemukan atau sudah tidak tersedia." };
    }

    var cutoffDisposisiSubmit = cutoffPelaporanDisposisi_(disposisiSuratRef);
    if (cutoffDisposisiSubmit.periodeDitutup) {
      return { sukses: false, pesan: cutoffDisposisiSubmit.pesan };
    }

    var validRouteDisposisi = validasiRouteFormLaporanDisposisi_(pegawaiUser, disposisiSuratRef, paket, kategoriSheet);
    if (!validRouteDisposisi.sukses) {
      return { sukses: false, pesan: validRouteDisposisi.pesan };
    }
  }

  return {
    sukses: true,
    disposisiRef: disposisiRef,
    disposisiSuratRef: disposisiSuratRef
  };
}

function uploadDokumenDasarSubmitKinerja_(paket, ctx, draft, simpanKeDriveTerstruktur) {
  if (paket.fileDasarUrl) {
    return paket.fileDasarUrl;
  }

  if (paket.fileDasarData) {
    var extDasar = (paket.fileDasarName && paket.fileDasarName.indexOf(".") !== -1) ? paket.fileDasarName.split(".").pop() : "bin";
    var namaFileDasar = paket.nama + " - " + draft.kategoriSheet + " - " + ctx.timestamp + "_Dokumen." + extDasar;
    return simpanKeDriveTerstruktur(paket.fileDasarData, paket.fileDasarMime, paket.fileDasarName || ("dokumen." + extDasar), namaFileDasar);
  }

  if (draft.disposisiSuratRef && draft.disposisiSuratRef.lampiran_url) {
    return draft.disposisiSuratRef.lampiran_url;
  }

  return "";
}

function batasiNarasiAISubmitKinerja_(narasiUntukAI) {
  // AI pola lama untuk otomatis merapikan/mengubah deskripsi saat submit sudah dinonaktifkan total.
  // Deskripsi yang tersimpan adalah teks final yang dipilih pegawai di form.
  // Gunakan rapikanBahasaLaporanAI() secara eksplisit dari tombol preview bila diperlukan.

  // TRUNCATE: Batasi narasiUntukAI agar tidak membuang token AI secara berlebihan.
  // Batas 6000 karakter sudah cukup untuk konteks penuh laporan harian.
  var MAX_NARASI_AI_CHARS = 6000;
  if (narasiUntukAI && narasiUntukAI.length > MAX_NARASI_AI_CHARS) {
    narasiUntukAI = narasiUntukAI.substring(0, MAX_NARASI_AI_CHARS) + "\n...[teks dipotong]";
    Logger.log("narasiUntukAI dipotong ke " + MAX_NARASI_AI_CHARS + " karakter untuk efisiensi token AI.");
  }
  return narasiUntukAI;
}

function hitungEvaluasiAwalSubmitKinerja_(paket, kategoriSheet) {
  var parsed = { poin: 0, alasan: "Evaluasi Manual", deskripsi_baku: paket.deskripsi || "" };
  var jLow = paket.jabatan.toLowerCase();
  var hasilKalkulasi = kalkulasiPoinKinerja_(paket, kategoriSheet, jLow);
  parsed.poin = hasilKalkulasi.poin;
  parsed.alasan = hasilKalkulasi.alasan;

  var statusAwal = REVIEW_STATUS.MENUNGGU;
  var catatanAdmin = "-";
  var waktuReviewAdmin = "";
  if (jLow.includes("lurah")) {
    statusAwal = REVIEW_STATUS.DISETUJUI;
    catatanAdmin = "Otomatis Disetujui (Pimpinan)";
    waktuReviewAdmin = new Date();
  }

  if (jLow.includes("phl") || jLow.includes("lepas") || kategoriSheet.includes(KATEGORI_LAP.PHL)) {
    parsed.poin = 0;
    parsed.alasan = "Laporan PHL (Honorarium Tetap)";
  }

  if (paket.detailWajibDukuh) {
    parsed.poin = 20;
    parsed.alasan = "Kegiatan Wajib Dukuh (Pasal 41): 20 poin / 20% produktifitas.";
  }

  if (paket.detailWajibPamong) {
    var evalPasal33 = evaluasiPasal33Hak_(paket.detailWajibPamong.bulan, new Date(), new Date());
    parsed.poin = evalPasal33.poinHak;
    parsed.alasan = "Paket Wajib Pasal 33: " + evalPasal33.statusLabel + " (" + evalPasal33.poinHak + " poin / " + evalPasal33.persenProdHak + "% produktifitas bulan hak)";
  }

  return {
    parsed: parsed,
    jLow: jLow,
    statusAwal: statusAwal,
    catatanAdmin: catatanAdmin,
    waktuReviewAdmin: waktuReviewAdmin,
    promptAI: ""
  };
}

function buildBarisRekapKinerjaSubmit_(paket, ctx, draft, evaluasi) {
  var urlVisualFinal = draft.urlVisualArray.join(",");
  var waktuSekarang = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  var kolomDetailForm = buildKolomDetailForm_(
    paket,
    draft.kategoriSheet,
    draft.namaKegiatan,
    draft.tanggalKegiatan,
    draft.lokasiKegiatan,
    draft.dasarKegiatan,
    draft.penyelenggaraKeg,
    draft.peranKeg
  );
  var payloadDetailJson = kolomDetailForm[1] || "{}";
  var parsed = evaluasi.parsed;
  var disposisiRef = draft.disposisiRef;

  var barisBaru = [
    waktuSekarang, sanitizeForSheet_(paket.nama), sanitizeForSheet_(paket.jabatan), sanitizeForSheet_(draft.kategoriSheet),
    sanitizeForSheet_(parsed.deskripsi_baku), urlVisualFinal, parsed.poin, sanitizeForSheet_(parsed.alasan),
    evaluasi.statusAwal, parsed.poin, sanitizeForSheet_(draft.dasarKegiatan), draft.urlDasar, sanitizeForSheet_(draft.namaKegiatan),
    sanitizeForSheet_(draft.tanggalKegiatan), sanitizeForSheet_(draft.lokasiKegiatan), sanitizeForSheet_(draft.penyelenggaraKeg),
    sanitizeForSheet_(draft.peranKeg), sanitizeForSheet_(evaluasi.catatanAdmin), ctx.idLaporan, ctx.idUser, evaluasi.waktuReviewAdmin, ctx.submitNonce,
    "", "", "", payloadDetailJson,
    disposisiRef ? sanitizeForSheet_(disposisiRef.idDisposisi || "") : "",
    disposisiRef ? sanitizeForSheet_(disposisiRef.nomorDisposisi || "") : "",
    disposisiRef ? sanitizeForSheet_(disposisiRef.jenisDisposisi || "") : ""
  ].concat(kolomDetailForm);

  padRowToIndex_(barisBaru, SHEET_COLUMNS.REKAP_KINERJA.STAF_INSTRUKSI_LOKASI);
  return barisBaru;
}

function simpanBarisRekapKinerjaSubmit_(paket, ctx, draft, evaluasi, barisBaru) {
  // Siapkan schema sebelum lock simpan final. Fungsi ini sudah memakai guard
  // sehingga pada kondisi normal tidak menulis header berulang kali.
  siapkanKolomDetailFormRekapKinerja();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      sukses: false,
      pesan: "❌ GAGAL: Antrean server sedang penuh. Data Anda aman, silakan klik 'Kirim' lagi dalam beberapa detik."
    };
  }

  var lastRowIdx = 0;
  try {
    var sheetRekap = getSheet_("Rekap_Kinerja");
    var dataRekap = sheetRekap.getDataRange().getValues();
    var IDX_IDUSER = SHEET_COLUMNS.REKAP_KINERJA.ID_USER;
    var IDX_NONCE = SHEET_COLUMNS.REKAP_KINERJA.NONCE;

    for (var rr = dataRekap.length - 1; rr >= 1; rr--) {
      var existingUserId = dataRekap[rr][IDX_IDUSER] != null ? dataRekap[rr][IDX_IDUSER].toString().trim() : "";
      var existingNonce = dataRekap[rr][IDX_NONCE] != null ? dataRekap[rr][IDX_NONCE].toString().trim() : "";
      if (idsEqual_(existingUserId, ctx.idUser) && existingNonce === ctx.submitNonce) {
        ctx.submitCache.put(ctx.nonceKey, "DONE", CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
        ctx.pertahankanNonce = true;
        return {
          sukses: false,
          pesan: "⚠️ Permintaan yang sama sudah pernah diproses. Laporan tidak dikirim ulang."
        };
      }
    }

    if (paket.detailAPBKal) {
      var hasilApb = terapkanValidasiAPBKalSubmit_(paket, ctx, draft, evaluasi, barisBaru, dataRekap);
      if (!hasilApb.sukses) return hasilApb;
    }

    sheetRekap.appendRow(barisBaru);
    invalidasiCacheRekapKinerjaReadOnly_();
    lastRowIdx = sheetRekap.getLastRow();
    ctx.laporanBerhasilDisimpan = true;
    ctx.submitCache.put(ctx.nonceKey, "DONE", CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
    ctx.pertahankanNonce = true;
  } finally {
    lock.releaseLock();
  }

  return {
    sukses: true,
    lastRowIdx: lastRowIdx
  };
}

function terapkanValidasiAPBKalSubmit_(paket, ctx, draft, evaluasi, barisBaru, dataRekap) {
  var currTermin = (paket.detailAPBKal.termin || "").toString();
  var currTahap = (paket.detailAPBKal.tahap || "").toString();
  var kodeRekTarget = (paket.detailAPBKal.kodeRek || "").toString();
  var metodeInput = (paket.detailAPBKal.metode || "").toString();
  var errMsgTahap = cekValiditasTahapAPBKal_(currTahap, currTermin, kodeRekTarget, dataRekap, paket.detailAPBKal.tanggal, paket.detailAPBKal.namaKeg, { excludeIdLaporan: ctx.idLaporan });

  if (errMsgTahap) {
    if (isApbTahapPeringatan_(errMsgTahap)) {
      var warningTahap = ambilIsiApbTahapPeringatan_(errMsgTahap);
      tandaiPeringatanTahapAPBKal_(paket, warningTahap);
      evaluasi.parsed.poin = 0;
      evaluasi.parsed.alasan = alasanPeringatanTahapAPBKal_(warningTahap) + " Saran Sistem: 0 poin dan ditolak/diperbaiki.";
      barisBaru[SHEET_COLUMNS.REKAP_KINERJA.POIN_SISTEM] = 0;
      barisBaru[SHEET_COLUMNS.REKAP_KINERJA.ALASAN_SISTEM] = sanitizeForSheet_(evaluasi.parsed.alasan);
      barisBaru[SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL] = 0;
      var kolomDetailFormWarning = buildKolomDetailForm_(
        paket,
        draft.kategoriSheet,
        draft.namaKegiatan,
        draft.tanggalKegiatan,
        draft.lokasiKegiatan,
        draft.dasarKegiatan,
        draft.penyelenggaraKeg,
        draft.peranKeg
      );
      barisBaru[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON] = kolomDetailFormWarning[1] || "{}";
      barisBaru[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON] = kolomDetailFormWarning[1] || "{}";
      var startDetailWarning = SHEET_COLUMNS.REKAP_KINERJA.JENIS_FORM_DETAIL;
      for (var kw = 0; kw < kolomDetailFormWarning.length; kw++) {
        barisBaru[startDetailWarning + kw] = kolomDetailFormWarning[kw];
      }
    } else {
      return { sukses: false, pesan: errMsgTahap };
    }
  }

  var errMsgTermin = cekValiditasTerminAPBKal_(currTahap, currTermin, kodeRekTarget, metodeInput, dataRekap);
  if (errMsgTermin) return { sukses: false, pesan: errMsgTermin };

  return { sukses: true };
}

function jalankanEfekSampingSubmitKinerja_(ctx, draft, evaluasi, lastRowIdx) {
  // Pekerjaan non-kritis dilakukan setelah lock final dilepas agar antrean submit
  // dan review admin tidak tertahan oleh audit/disposisi/log AI.
  if (ctx.aiAktif) {
    logAI(ctx.idLaporan, evaluasi.promptAI, "", evaluasi.parsed.poin, "PENDING", lastRowIdx, "gemini-2.5-flash");
  }

  logAudit(ctx.idUser, "SUBMIT_LAPORAN", ctx.idLaporan);

  if (draft.disposisiRef && draft.disposisiRef.idDisposisi) {
    try {
      tandaiDisposisiSudahDilaporkanInternal_(draft.disposisiRef.idDisposisi, ctx.idUser, ctx.idLaporan);
      logDisposisi_(draft.disposisiRef.idDisposisi, "BUAT_LAPORAN_DARI_DISPOSISI", ctx.idUser, "Laporan terkait: " + ctx.idLaporan);
    } catch (disErr) {
      Logger.log("Peringatan disposisi tidak ikut terbarui: " + disErr.message);
    }
  }
}

function bersihkanUploadSubmitKinerja_(ctx) {
  // Jika file sudah terunggah tetapi laporan gagal tersimpan ke Rekap_Kinerja,
  // pindahkan file hasil upload submit ini ke Trash agar tidak menjadi orphan file.
  if (!ctx.laporanBerhasilDisimpan && ctx.uploadedFileIdsSubmit && ctx.uploadedFileIdsSubmit.length) {
    for (var uf = 0; uf < ctx.uploadedFileIdsSubmit.length; uf++) {
      try {
        DriveApp.getFileById(ctx.uploadedFileIdsSubmit[uf]).setTrashed(true);
      } catch (fileCleanupErr) {
        Logger.log("Peringatan: gagal membersihkan file upload submit " + ctx.uploadedFileIdsSubmit[uf] + ": " + (fileCleanupErr && fileCleanupErr.message ? fileCleanupErr.message : fileCleanupErr));
      }
    }
  }
}

function bersihkanNonceSubmitKinerja_(ctx) {
  // Hapus state IN_FLIGHT hanya jika eksekusi ini yang menetapkannya
  // dan nilai cache saat ini masih sama. Ini mencegah request lama yang
  // akhirnya gagal menghapus state request baru yang menimpa nonce stale.
  if (ctx.nonceInFlightDitetapkan && ctx.nonceKey && !ctx.pertahankanNonce) {
    try {
      var currentNonceState = ctx.submitCache.get(ctx.nonceKey);
      if (!ctx.nonceInFlightStateValue || currentNonceState === ctx.nonceInFlightStateValue) {
        ctx.submitCache.remove(ctx.nonceKey);
      }
    } catch (cleanupErr) { }
  }
}

function apbTextKey_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9./\- ]+/g, '')
    .trim();
}

function apbTanggalKey_(value) {
  if (!value) return '';
  try {
    var d = parseTanggal(value);
    if (d && !isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
    }
  } catch (e) { }
  return apbTextKey_(value);
}

function buatApbChainKey_(apb) {
  apb = apb || {};
  return [apbTextKey_(apb.kodeRek), apbTextKey_(apb.termin), apbTextKey_(apb.namaKeg)].join('|');
}

function apbStatusBlokirDuplikat_(status) {
  return isStatusApproved_(status) || isPendingReviewStatus_(status);
}

function apbTahapPeringatanPayload_(msg) {
  return "PERINGATAN_TAHAP|" + String(msg || "");
}

function isApbTahapPeringatan_(msg) {
  return String(msg || "").indexOf("PERINGATAN_TAHAP|") === 0;
}

function ambilIsiApbTahapPeringatan_(msg) {
  return String(msg || "").replace(/^PERINGATAN_TAHAP\|/, "");
}

function tandaiPeringatanTahapAPBKal_(paket, warningText) {
  if (!paket || !paket.detailAPBKal || !warningText) return;
  paket.detailAPBKal.apbMissingTahapPelaksanaan = true;
  paket.detailAPBKal.apbWarning = warningText;
  paket.detailAPBKal.apbWarningCode = "MISSING_PASAL_51";
}

function alasanPeringatanTahapAPBKal_(warningText) {
  return "Peringatan APBKal: " + String(warningText || "").replace(/\s+/g, " " ).trim();
}

function apbRowHasPeringatanPasal51_(row) {
  try {
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var alasan = String(row[C.ALASAN_SISTEM] || "");
    if (/melewati\s+tahap\s+pelaksanaan|belum\s+ditemukan\s+laporan\s+tahap\s+pelaksanaan/i.test(alasan)) return true;
    var raw = row[C.PAYLOAD_DETAIL_JSON];
    if (raw) {
      var parsed = (typeof raw === "string") ? JSON.parse(raw) : raw;
      if (parsed && parsed.detailAPBKal && parsed.detailAPBKal.apbMissingTahapPelaksanaan) return true;
    }
  } catch (e) { }
  return false;
}

function apbRowMatchKegiatan_(row, kodeRekTarget, terminTarget, namaKegTarget, opts) {
  opts = opts || {};
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var rNamaKeg = row[C.NAMA_KEGIATAN] ? String(row[C.NAMA_KEGIATAN]) : '';
  var rPeran = row[C.PERAN] ? String(row[C.PERAN]) : '';

  var kodeKey = apbTextKey_(kodeRekTarget);
  var terminKey = apbTextKey_(terminTarget);
  var namaKey = apbTextKey_(namaKegTarget);
  var rowNamaKey = apbTextKey_(rNamaKeg);
  var rowPeranKey = apbTextKey_(rPeran);

  var matchKode = !kodeKey || rowNamaKey.indexOf(kodeKey) !== -1;
  var matchTermin = !terminKey || rowPeranKey.indexOf(terminKey) !== -1;
  var matchNama = !opts.requireNama || !namaKey || rowNamaKey.indexOf(namaKey) !== -1;

  return matchKode && matchTermin && matchNama;
}

function cariAPBKalTahapDisetujui_(dataRekap, kodeRekTarget, terminTarget, tahapTarget, namaKegTarget, opts) {
  opts = opts || {};
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var tahapLabelKey = apbTextKey_(tahapApbLabel_(tahapTarget));
  var tahapCodeKey = apbTextKey_(tahapTarget);
  var excludeId = opts.excludeIdLaporan ? String(opts.excludeIdLaporan) : '';

  for (var r = 1; r < dataRekap.length; r++) {
    var row = dataRekap[r];
    if (excludeId && String(row[C.ID_LAPORAN] || '') === excludeId) continue;

    var rStatus = row[C.STATUS_REVIEW] ? String(row[C.STATUS_REVIEW]) : '';
    if (!isStatusApproved_(rStatus)) continue;

    var rPeranKey = apbTextKey_(row[C.PERAN] || '');
    var tahapMatch = rPeranKey.indexOf(tahapLabelKey) !== -1 || rPeranKey.indexOf(tahapCodeKey) !== -1;
    if (!tahapMatch) continue;

    if (!apbRowMatchKegiatan_(row, kodeRekTarget, terminTarget, namaKegTarget, opts)) continue;
    return { rowNumber: r + 1, row: row };
  }
  return null;
}

function adaAPBKalTahapDuplikatAktif_(dataRekap, kodeRekTarget, terminTarget, tahapTarget, namaKegTarget, tanggalTarget, opts) {
  opts = opts || {};
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var tahapLabelKey = apbTextKey_(tahapApbLabel_(tahapTarget));
  var tahapCodeKey = apbTextKey_(tahapTarget);
  var excludeId = opts.excludeIdLaporan ? String(opts.excludeIdLaporan) : '';
  var tanggalKey = apbTanggalKey_(tanggalTarget);

  for (var r = 1; r < dataRekap.length; r++) {
    var row = dataRekap[r];
    if (excludeId && String(row[C.ID_LAPORAN] || '') === excludeId) continue;

    var rStatus = row[C.STATUS_REVIEW] ? String(row[C.STATUS_REVIEW]) : '';
    if (!apbStatusBlokirDuplikat_(rStatus)) continue;

    var rPeranKey = apbTextKey_(row[C.PERAN] || '');
    var tahapMatch = rPeranKey.indexOf(tahapLabelKey) !== -1 || rPeranKey.indexOf(tahapCodeKey) !== -1;
    if (!tahapMatch) continue;

    if (!apbRowMatchKegiatan_(row, kodeRekTarget, terminTarget, namaKegTarget, { requireNama: true })) continue;

    // Duplikasi keras hanya untuk tanggal yang sama. Ini mencegah double-submit
    // tanpa memblokir Pasal 51 yang memang dapat memiliki beberapa tindakan/rangkaian.
    var rowTanggalKey = apbTanggalKey_(row[C.TANGGAL_KEGIATAN] || '');
    if (!tanggalKey || !rowTanggalKey || tanggalKey === rowTanggalKey) {
      return true;
    }
  }
  return false;
}

function cekValiditasTahapAPBKal_(currTahap, currTermin, kodeRekTarget, dataRekap, tanggalPaket, namaKegTarget, opts) {
  opts = opts || {};
  var tahapLabel = tahapApbLabel_(currTahap);

  if (adaAPBKalTahapDuplikatAktif_(dataRekap, kodeRekTarget, currTermin, currTahap, namaKegTarget, tanggalPaket, opts)) {
    return "BLOKIR_TAHAP|❌ GAGAL MENGIRIM:\n\nSistem mendeteksi sudah ada laporan aktif untuk " + tahapLabel + " pada Kode Rekening (" + kodeRekTarget + ")" + (currTermin ? (" " + currTermin) : "") + ".\n\nAgar tidak terjadi duplikasi tahap, gunakan menu revisi jika laporan sebelumnya ditolak, atau hubungi Admin bila data sebelumnya perlu dikoreksi.";
  }

  if (currTahap === APB_TAHAP.P51) {
    var pasal47 = cariAPBKalTahapDisetujui_(dataRekap, kodeRekTarget, currTermin, APB_TAHAP.P47, namaKegTarget, opts);
    if (!pasal47) {
      return "BLOKIR_TAHAP|❌ GAGAL MENGIRIM:\n\nSistem mendeteksi Anda mencoba input 'Tahap Pelaksanaan (Pasal 51)' untuk Kode Rekening (" + kodeRekTarget + ")" + (currTermin ? (" " + currTermin) : "") + ".\n\nSesuai alur APBKal, WAJIB ada dokumen 'Tahap Persiapan (Pasal 47)' yang telah 'Disetujui' untuk kegiatan/termin ini.";
    }

    var tanggalPersetujuan = null;
    var tglSetujuSistem = pasal47.row[20];
    try {
      tanggalPersetujuan = tglSetujuSistem ? parseTanggal(tglSetujuSistem) : parseTanggal(pasal47.row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
    } catch (e) { }

    if (tanggalPersetujuan && tanggalPaket) {
      var tglPelaksanaanInput = parseTanggal(tanggalPaket);
      tglPelaksanaanInput.setHours(0, 0, 0, 0);
      tanggalPersetujuan.setHours(0, 0, 0, 0);
      var selisihHari = Math.floor((tglPelaksanaanInput.getTime() - tanggalPersetujuan.getTime()) / (1000 * 60 * 60 * 24));
      if (selisihHari > 7) {
        return "BLOKIR_TAHAP|❌ GAGAL MENGIRIM:\n\nPelaksanaan gagal diinput karena jadwal Pelaksanaan Anda melebihi 7 hari (" + selisihHari + " hari) setelah dokumen Perencanaan disetujui Lurah.";
      }
    }
  }

  if (currTahap === APB_TAHAP.P54) {
    var pasal51 = cariAPBKalTahapDisetujui_(dataRekap, kodeRekTarget, currTermin, APB_TAHAP.P51, namaKegTarget, opts);
    if (!pasal51) {
      return apbTahapPeringatanPayload_(
        "Laporan ini melewati Tahap Pelaksanaan (Pasal 51). Belum ditemukan laporan Tahap Pelaksanaan yang sudah Disetujui untuk Kode Rekening (" +
        kodeRekTarget + ")" + (currTermin ? (" " + currTermin) : "") +
        ". Admin disarankan menolak laporan ini agar pegawai menyampaikan Tahap Pelaksanaan terlebih dahulu, lalu mengirim ulang Tahap Pelaporan & Pertanggungjawaban."
      );
    }
  }

  return null;
}

function cekValiditasTerminAPBKal_(currTahap, currTermin, kodeRekTarget, metodeInput, dataRekap) {
  var isTerminNeedCheck = (currTermin.indexOf("Termin 2") !== -1 || currTermin.indexOf("Termin 3") !== -1 || currTermin.indexOf("Termin 4") !== -1) && metodeInput === "PIHAK_KETIGA";
  if (!isTerminNeedCheck) return null;

  var angkaTermin = parseInt(currTermin.match(/\d+/)[0], 10);
  var prevTerminStr = "Termin " + (angkaTermin - 1);
  var isPrevDone = false;

  for (var r2 = 1; r2 < dataRekap.length; r2++) {
    var rrNamaKeg = dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN] ? dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN].toString() : "";
    var rrPeran = dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.PERAN] ? dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.PERAN].toString() : "";
    var rrStatus = dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] ? dataRekap[r2][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW].toString() : "";
    var matchKode2 = (rrNamaKeg.indexOf("[" + kodeRekTarget + "]") !== -1 || rrNamaKeg.indexOf(kodeRekTarget) !== -1);
    var matchTermin2 = rrPeran.indexOf(prevTerminStr) !== -1;
    var matchTahap2 = rrPeran.indexOf(tahapApbLabel_(APB_TAHAP.P54)) !== -1;

    if (matchKode2 && matchTermin2 && matchTahap2 && isStatusApproved_(rrStatus) && !apbRowHasPeringatanPasal51_(dataRekap[r2])) {
      isPrevDone = true;
      break;
    }
  }

  if (!isPrevDone) {
    return "BLOKIR_TERMIN|❌ GAGAL MENGIRIM:\n\nSistem mendeteksi Anda mencoba input " + currTermin + " untuk Kode Rekening (" + kodeRekTarget + ").\n\nSesuai Peraturan Lurah No 4 Tahun 2025, Anda WAJIB menyelesaikan Laporan 'Tahap Pelaporan & Pertanggungjawaban (Pasal 54)' untuk " + prevTerminStr + " terlebih dahulu!";
  }
  return null;
}

function kalkulasiPoinKinerja_(paket, kategoriSheet, jLow) {
  var hasil = { poin: 0, alasan: "" };
  if (kategoriSheet.includes(KATEGORI_LAP.TU)) {
    hasil.poin = 25;
    hasil.alasan = "Sesuai Perkal No 4/2025 (Pasal 66)";
  } else if (isKategoriProduktivitas_(kategoriSheet)) {
    if (paket.detailAPBKalCarik) {
      hasil.poin = 5;
      hasil.alasan = "Sesuai Perkal No 4/2025 (Pasal 44)";
    } else if (paket.detailAPBKal) {
      var tahapStr = paket.detailAPBKal.tahap;
      var isTPK = (paket.detailAPBKal.isTPK === "Dengan TPK");
      var basePoin = 0;

      if (tahapStr === APB_TAHAP.P47) { basePoin = isTPK ? 2 : 10; }
      else if (tahapStr === APB_TAHAP.P51) { basePoin = isTPK ? 2 : 4; }
      else if (tahapStr === APB_TAHAP.P54) { basePoin = isTPK ? 5 : 10; }

      var alasanTambahan = " (Tepat Waktu)";
      if (tahapStr === APB_TAHAP.P54 && paket.detailAPBKal.batasWaktu) {
        var batasWaktu = parseTanggal(paket.detailAPBKal.batasWaktu);
        batasWaktu = new Date(batasWaktu.getFullYear(), batasWaktu.getMonth(), batasWaktu.getDate());
        var tglSekarang = new Date();
        var tglBanding = new Date(tglSekarang.getFullYear(), tglSekarang.getMonth(), tglSekarang.getDate());
        var diffTime = tglBanding.getTime() - batasWaktu.getTime();

        if (diffTime > 0) {
          var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          var weeksLate = Math.ceil(diffDays / 7);
          var penaltyPoin = weeksLate * 2;
          basePoin = basePoin - penaltyPoin;
          if (basePoin < 0) basePoin = 0;
          alasanTambahan = " (Telat " + weeksLate + " Mg: -" + penaltyPoin + " Poin)";
        }
      }
      hasil.poin = basePoin;
      hasil.alasan = "Perkal 4/2025 Ps.47/51/54 & Ps.55" + alasanTambahan;

    } else if (paket.detailWajibDukuh) {
      hasil.poin = 20;
      hasil.alasan = "Kegiatan Wajib Dukuh (Pasal 41) - 20 poin / 20% produktifitas. Tidak ada pengurangan otomatis bila tidak melaporkan.";
    } else if (paket.detailWajibPamong) {
      var evalWajib = evaluasiPasal33Hak_(paket.detailWajibPamong.bulan, new Date(), new Date());
      hasil.poin = evalWajib.poinHak;
      hasil.alasan = "Pasal 33 - " + evalWajib.statusLabel + " (" + evalWajib.poinHak + " poin / " + evalWajib.persenProdHak + "% produktifitas bulan hak)";
    } else if (paket.detailDukuh) {
      hasil.poin = 5;
      hasil.alasan = "Sesuai Perkal No 4/2025 (Pasal 57)";
    } else if (paket.detailPimpinan) {
      var evalPasal60 = evaluasiPasal60TugasPimpinan_(paket.detailPimpinan, new Date());
      if (evalPasal60.aktif && !evalPasal60.tepatWaktu) {
        hasil.poin = 0;
        hasil.alasan = "Pasal 60: " + evalPasal60.catatan + " Poin otomatis 0.";
      } else {
        hasil.poin = 10;
        hasil.alasan = "Sesuai Perkal No 4/2025 (Pasal 60)" + (evalPasal60.catatan ? " - " + evalPasal60.catatan : "");
      }
    } else {
      if (jLow.includes("lurah")) {
        hasil.poin = 0;
        hasil.alasan = "Laporan Produktifitas Lurah (Tunjangan per Jumlah Kegiatan, Pasal 31)";
      }
      else if (jLow.includes("staf")) {
        hasil.poin = 2;
        hasil.alasan = "Tugas/Instruksi Staf (Pasal 64)";
      }
      else {
        hasil.poin = 2;
        hasil.alasan = "Pelaksanaan Kegiatan Reguler (Pasal 56)";
      }
    }
  }
  return hasil;
}

function jalankanAIGemini_(promptAI, apiKey) {
  try {
    var baseUrlStr = "https://" + "generativelanguage.googleapis.com";
    var apiEndPointStr = baseUrlStr + "/v1beta/models/gemini-2.5-flash:generateContent?key=";

    var response = UrlFetchApp.fetch(
      apiEndPointStr + apiKey,
      {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ parts: [{ text: promptAI }] }]
        })
      }
    );
    var raw = response.getContentText();
    var obj = JSON.parse(raw);
    var textAI =
      obj && obj.candidates && obj.candidates[0] &&
        obj.candidates[0].content && obj.candidates[0].content.parts &&
        obj.candidates[0].content.parts[0] && obj.candidates[0].content.parts[0].text
        ? obj.candidates[0].content.parts[0].text : "";

    if (textAI) {
      var jsonRaw = textAI.replace(/```json/g, "").replace(/```/g, "").trim();
      var jsonObj = JSON.parse(jsonRaw);
      return { "raw": raw, "jsonObj": jsonObj };
    }
  } catch (e) {
    Logger.log("AI dilewati/gagal: " + e.message);
  }
  return null;
}


function rapikanBahasaLaporanAI(teks, konteks, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, pesan: "Sesi habis, silakan login ulang." };

    var props = PropertiesService.getScriptProperties();
    var apiKey = (props.getProperty("API_KEY_GEMINI") || "").trim();
    if (!apiKey) return { sukses: false, pesan: "Fitur Rapikan Bahasa dengan AI belum aktif karena API Key belum diatur." };

    var teksAsli = sanitizeForSheet_(String(teks || "").trim());
    var konteksForm = sanitizeForSheet_(String(konteks || "").trim()).substring(0, 1200);
    if (teksAsli.length < 10) {
      return { sukses: false, pesan: "Tuliskan deskripsi minimal 10 karakter terlebih dahulu sebelum dirapikan." };
    }
    if (teksAsli.length > 5000) {
      teksAsli = teksAsli.substring(0, 5000);
    }

    var pegawai = getPegawaiById_(idUser) || {};
    var promptAI =
      "Anda adalah asisten koreksi bahasa untuk laporan kinerja Kalurahan.\n" +
      "TUGAS: Rapikan bahasa dari teks laporan pegawai tanpa menambah fakta baru.\n\n" +
      "IDENTITAS PELAPOR:\n" +
      "Nama: " + (pegawai.nama || "-") + "\n" +
      "Jabatan: " + (pegawai.jabatan || "-") + "\n\n" +
      "KONTEKS FORM:\n" + konteksForm + "\n\n" +
      "TEKS ASLI PEGAWAI:\n" + teksAsli + "\n\n" +
      "ATURAN WAJIB:\n" +
      "1. Hanya rapikan ejaan, susunan kalimat, pilihan kata, dan kejelasan.\n" +
      "2. Jangan menambah kegiatan, hasil, lokasi, pihak, angka, keputusan, atau tindak lanjut baru.\n" +
      "3. Jangan mengubah makna substansi.\n" +
      "4. Pertahankan sudut pandang pelapor sebagai pelaku kegiatan.\n" +
      "5. Jika teks asli singkat, buat kalimat formal yang tetap hanya berdasarkan teks asli.\n" +
      "6. Jika ada informasi yang tidak jelas, jangan menebak.\n\n" +
      "Balas HANYA JSON valid dengan key deskripsi_baku.\n" +
      "Format: {\"deskripsi_baku\":\"teks hasil rapikan\"}";

    var hasilAI = jalankanAIGemini_(promptAI, apiKey);
    var hasil = hasilAI && hasilAI.jsonObj && hasilAI.jsonObj.deskripsi_baku ? String(hasilAI.jsonObj.deskripsi_baku).trim() : "";
    if (!hasil) return { sukses: false, pesan: "AI belum berhasil memberi hasil. Silakan coba lagi atau gunakan teks asli." };

    hasil = sanitizeForSheet_(hasil).substring(0, 5000);
    try {
      logAI("PREVIEW_RAPIKAN_BAHASA", promptAI, hasilAI ? (hasilAI.raw || "") : "", 0, "PREVIEW", 0, "gemini-2.5-flash");
    } catch (logErr) { }

    return {
      sukses: true,
      teks: hasil,
      teksAsli: teksAsli,
      pesan: "Hasil rapikan bahasa siap ditinjau. Gunakan hanya jika sudah sesuai fakta."
    };
  } catch (e) {
    return handleError("rapikanBahasaLaporanAI", e, { sukses: false, pesan: "Gagal merapikan bahasa dengan AI." });
  }
}

function prosesAntreanAI() {
  // Dinonaktifkan sejak APP_VERSION 2026.05.05.18.
  // Alasan: AI tidak boleh lagi berjalan sebagai antrean otomatis yang memproses atau mengubah deskripsi laporan.
  // Fitur AI yang tetap didukung hanya rapikanBahasaLaporanAI(), bersifat opsional, memakai preview, dan dipilih manual oleh pegawai.
  Logger.log("prosesAntreanAI dinonaktifkan. Gunakan tombol Rapikan Bahasa dengan AI bila diperlukan.");
  return;
}

function cariRowRekapKinerjaById_(sheet, idLaporan) {
  var target = normalizeId_(idLaporan);
  if (!sheet || !target) return 0;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var colId = SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN + 1;
  var ids = sheet.getRange(2, colId, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (idsEqual_(normalizeId_(ids[i][0]), target)) {
      return i + 2;
    }
  }
  return 0;
}

function getDashboardStats(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return {
        poinDisetujui: 0,
        menungguReview: 0,
        totalLaporan: 0,
        rpTotal: 0,
        rpProd: 0,
        rpTU: 0,
        poinProd: 0,
        poinTU: 0,
        isPHL: false,
        _error: "SESSION_EXPIRED"
      };
    }

    var data = getRekapKinerjaValuesReadOnly_();

    var tglSekarang = new Date();
    // Estimasi tunjangan Dashboard harus mengikuti periode efektif/cut-off,
    // bukan bulan kalender tanggal laporan. Contoh: laporan 28 April setelah
    // cut-off April masuk periode pembayaran Mei.
    var periodeAktifDashboard = periodeDariTanggalLaporan_(tglSekarang) || Utilities.formatDate(tglSekarang, "GMT+7", "yyyy-MM");
    var metaPeriodeAktifDashboard = parsePeriodeBulan_(periodeAktifDashboard);

    var poinTriwulanIni = 0;
    var menungguReview = 0;
    var totalLaporan = 0;
    var persenProdBulanIni = 0;
    var persenTUBulanIni = 0;
    var jmlLapProdLurahBulanIni = 0;
    var jmlLapTULurahBulanIni = 0;

    var pegawai = null;
    try { pegawai = getPegawaiById_(idUser); } catch (e) { }
    var jabatanPegawai = pegawai && pegawai.jabatan ? pegawai.jabatan.toString() : "Staf";

    for (var i = 1; i < data.length; i++) {
      if (!idsEqual_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER], idUser)) continue;

      totalLaporan++;

      var status = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString();
      var kategori = (data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "").toString();
      var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

      var periodeEfektifLap = periodeDariTanggalLaporan_(tglLap);

      if (status === "Menunggu Review" || status === "Banding" || status === "Menunggu Persetujuan Lurah") {
        menungguReview++;
      }

      if (tglLap >= metaPeriodeAktifDashboard.triStart && tglLap < metaPeriodeAktifDashboard.triEnd && isStatusApproved_(status)) {
        poinTriwulanIni += Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
      }

      if (periodeEfektifLap === periodeAktifDashboard && isStatusApproved_(status)) {
        if ((jabatanPegawai || "").toString().toLowerCase().indexOf("lurah") !== -1) {
          if (isKategoriProduktivitas_(kategori)) jmlLapProdLurahBulanIni++;
          else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) jmlLapTULurahBulanIni++;
        } else {
          if (isKategoriProduktivitas_(kategori)) persenProdBulanIni += Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
          else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) persenTUBulanIni += Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
        }
      }
    }

    var jLow = (jabatanPegawai || "").toString().toLowerCase();
    if (jLow.indexOf("phl") !== -1 || jLow.indexOf("lepas") !== -1) {
      return {
        poinDisetujui: poinTriwulanIni,
        menungguReview: menungguReview,
        totalLaporan: totalLaporan,
        rpTotal: 0,
        rpProd: 0,
        rpTU: 0,
        poinProd: 0,
        poinTU: 0,
        isPHL: true
      };
    }

    // Poin/capaian bulan ini hanya berasal dari laporan yang sudah disetujui Admin.
    // Hak/potensi Pasal 33 tidak ditambahkan secara terpisah agar angka poin tetap
    // selaras dengan daftar laporan yang benar-benar disetujui.
    var tunjangan = { maxProd: 0, maxTU: 0 };
    try { tunjangan = getTunjanganPegawai_(idUser, jabatanPegawai) || tunjangan; } catch (eTj) { }

    var maxProd = Number(tunjangan.maxProd) || 0;
    var maxTU = Number(tunjangan.maxTU) || 0;

    var persenProdFinal = 0;
    var persenTUFinal = 0;

    if (jLow.indexOf("lurah") !== -1) {
      persenProdFinal = jmlLapProdLurahBulanIni * 10;
      persenTUFinal = jmlLapTULurahBulanIni * 25;
    } else {
      persenProdFinal = persenProdBulanIni;
      persenTUFinal = persenTUBulanIni;
    }

    if (persenProdFinal > 100) persenProdFinal = 100;
    if (persenTUFinal > 100) persenTUFinal = 100;

    var rpProd = (persenProdFinal / 100) * maxProd;
    var rpTU = (persenTUFinal / 100) * maxTU;
    var rpTotal = rpProd + rpTU;

    return {
      poinDisetujui: poinTriwulanIni,
      menungguReview: menungguReview,
      totalLaporan: totalLaporan,
      rpTotal: rpTotal,
      rpProd: rpProd,
      rpTU: rpTU,
      poinProd: persenProdFinal,
      poinTU: persenTUFinal,
      isPHL: false
    };
  } catch (e) {
    var errorId = buatErrorIdAman_();
    catatErrorInternal_("getDashboardStats", e, errorId);
    return {
      poinDisetujui: 0,
      menungguReview: 0,
      totalLaporan: 0,
      rpTotal: 0,
      rpProd: 0,
      rpTU: 0,
      poinProd: 0,
      poinTU: 0,
      isPHL: false,
      _error: "ERROR_ID_" + errorId
    };
  }
}


function parseBulanRiwayat_(bulan) {
  var s = String(bulan || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  var y = Number(m[1]);
  var mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return null;
  return {
    label: s,
    start: new Date(y, mo - 1, 1, 0, 0, 0, 0),
    end: new Date(y, mo, 1, 0, 0, 0, 0)
  };
}

function ambilRiwayatKuPaged(params, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi tidak valid.', items: [], total: 0, hasMore: false };

    params = params || {};
    var bulanMeta = parseBulanRiwayat_(params.bulan || '');
    var keyword = String(params.keyword || '').toLowerCase().trim();
    var limit = Math.max(1, Math.min(50, Number(params.limit) || 20));
    var offset = Math.max(0, Number(params.offset) || 0);
    var targetId = normalizeId_(params.fokusIdLaporan || params.fokusId || '');

    var data = getRekapKinerjaValuesReadOnly_();
    var hasil = [];
    var total = 0;
    var targetItem = null;

    for (var i = data.length - 1; i >= 1; i--) {
      if (!idsEqual_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER], idUser)) continue;

      var rowIdLaporan = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
      var w = data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
      var waktuDate = parseTanggal(w);
      var waktuTeks = (waktuDate instanceof Date && !isNaN(waktuDate.getTime()))
        ? Utilities.formatDate(waktuDate, 'GMT+7', 'dd/MM/yyyy HH:mm')
        : (w ? w.toString() : '');

      var isTarget = !!(targetId && idsEqual_(rowIdLaporan, targetId));

      if (bulanMeta && !isTarget) {
        if (!(waktuDate instanceof Date) || isNaN(waktuDate.getTime())) continue;
        if (waktuDate < bulanMeta.start || waktuDate >= bulanMeta.end) continue;
      }

      var kategori = data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '-';
      var deskripsi = data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-';
      var status = data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '-';
      var catatan = data[i][SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || '-';
      var searchText = [waktuTeks, kategori, deskripsi, status, catatan, rowIdLaporan].join(' ').toLowerCase();

      if (keyword && searchText.indexOf(keyword) === -1 && !isTarget) continue;

      var urlVisualRaw = data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL]
        ? data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL].toString()
        : '';
      var urlVisualList = urlVisualRaw
        ? urlVisualRaw.split(',').map(function (u) { return (u || '').toString().trim(); }).filter(Boolean)
        : [];

      var cekRevisiItem = cekBolehRevisiLaporanPegawai_(data[i], idUser);
      var item = {
        idLaporan: rowIdLaporan,
        waktu: waktuTeks,
        kategori: kategori,
        deskripsi: deskripsi,
        deskripsiRingkas: String(deskripsi || '-').length > 240 ? String(deskripsi || '-').substring(0, 240) + '...' : String(deskripsi || '-'),
        status: status,
        poinFinal: Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
        catatan: catatan,
        jumlahBukti: urlVisualList.length,
        urlVisualPreview: urlVisualList.slice(0, 3),
        bisaRevisi: !!cekRevisiItem.boleh,
        alasanTidakBisaRevisi: cekRevisiItem.boleh ? '' : (cekRevisiItem.pesan || ''),
        periodeRevisi: cekRevisiItem.periode || ''
      };

      if (isTarget) {
        targetItem = item;
      }

      if (total >= offset && hasil.length < limit) {
        hasil.push(item);
      }
      total++;
    }

    if (targetItem) {
      var sudahAdaTarget = hasil.some(function (it) { return idsEqual_(it.idLaporan, targetItem.idLaporan); });
      if (!sudahAdaTarget) hasil.unshift(targetItem);
    }

    return {
      sukses: true,
      items: hasil,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: total > (offset + limit),
      bulan: bulanMeta ? bulanMeta.label : ''
    };
  } catch (e) {
    Logger.log('ambilRiwayatKuPaged ERROR: ' + (e && e.message ? e.message : e));
    return { sukses: false, pesan: 'Gagal memuat riwayat laporan.', items: [], total: 0, hasMore: false };
  }
}

function ambilDetailRiwayatLaporan(idLaporan, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi tidak valid.' };

    var targetId = normalizeId_(idLaporan);
    if (!targetId) return { sukses: false, pesan: 'ID laporan tidak valid.' };

    var data = getRekapKinerjaValuesReadOnly_();
    var lampiranCache = {};

    for (var i = data.length - 1; i >= 1; i--) {
      if (!idsEqual_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER], idUser)) continue;
      var rowIdLaporan = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
      if (!idsEqual_(rowIdLaporan, targetId)) continue;

      var w = data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
      var waktuDate = parseTanggal(w);
      var waktuTeks = (waktuDate instanceof Date && !isNaN(waktuDate.getTime()))
        ? Utilities.formatDate(waktuDate, 'GMT+7', 'dd/MM/yyyy HH:mm')
        : (w ? w.toString() : '');

      var urlVisualRaw = data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL]
        ? data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL].toString()
        : '';
      var urlVisualList = urlVisualRaw
        ? urlVisualRaw.split(',').map(function (u) { return (u || '').toString().trim(); }).filter(Boolean)
        : [];
      var buktiVisualMeta = [];
      for (var b = 0; b < urlVisualList.length; b++) {
        var labelBukti = urlVisualList.length > 1 ? 'Bukti Visual ' + (b + 1) : 'Bukti Visual';
        var metaBukti = buildDriveLampiranMeta_(urlVisualList[b], labelBukti, lampiranCache);
        if (metaBukti && metaBukti.safeUrl) buktiVisualMeta.push(metaBukti);
      }

      var cekRevisiDetail = cekBolehRevisiLaporanPegawai_(data[i], idUser);
      return {
        sukses: true,
        data: {
          idLaporan: rowIdLaporan,
          waktu: waktuTeks,
          kategori: data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '-',
          deskripsi: data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-',
          status: data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '-',
          poinFinal: Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
          catatan: data[i][SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || '-',
          urlVisualRaw: urlVisualList,
          buktiVisualMeta: buktiVisualMeta,
          payloadDetail: payloadDetailDariRowRekap_(data[i]) || null,
          bisaRevisi: !!cekRevisiDetail.boleh,
          alasanTidakBisaRevisi: cekRevisiDetail.boleh ? '' : (cekRevisiDetail.pesan || ''),
          periodeRevisi: cekRevisiDetail.periode || ''
        }
      };
    }

    return { sukses: false, pesan: 'Laporan tidak ditemukan.' };
  } catch (e) {
    Logger.log('ambilDetailRiwayatLaporan ERROR: ' + (e && e.message ? e.message : e));
    return { sukses: false, pesan: 'Gagal memuat detail laporan.' };
  }
}

// ===== PATCH v2026.05.09.13: REVISI LAPORAN DITOLAK OLEH PEGAWAI =====
// Prinsip bisnis:
// 1) Hanya laporan milik pegawai sendiri dan berstatus Ditolak yang dapat direvisi.
// 2) Revisi hanya berlaku selama periode laporan masih aktif; jika sudah melewati cut-off, pegawai tidak bisa merevisi.
// 3) Revisi meng-update baris laporan yang sama, bukan membuat laporan baru.
// 4) Staf PHL tidak boleh mengubah kategori; hanya memperbaiki formulir PHL dan bukti.
// 5) Status setelah revisi kembali ke Menunggu Review.
function payloadDetailDariRowRekap_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var raw = '';
  try {
    if (C.PAYLOAD_DETAIL_JSON !== undefined && row[C.PAYLOAD_DETAIL_JSON]) raw = row[C.PAYLOAD_DETAIL_JSON];
    if (!raw && row[C.PAYLOAD_JSON]) raw = row[C.PAYLOAD_JSON];
    if (!raw) return null;
    return JSON.parse(String(raw || '{}'));
  } catch (e) {
    return null;
  }
}

// PATCH v2026.05.10.16:
// Revisi laporan harus bisa membuka ulang isian utama meskipun laporan lama belum
// memiliki PAYLOAD_DETAIL_JSON lengkap atau memakai struktur detail sebelum refactor.
function payloadDetailTidakKosong_(payload) {
  if (!payload || typeof payload !== 'object') return false;
  var keys = [
    'detailTU', 'detailPHL', 'detailDukuh', 'detailWajibDukuh', 'detailWajibPamong',
    'detailPimpinan', 'detailAPBKal', 'detailAPBKalCarik', 'detailReguler',
    'detailStafInstruksi', 'detailStafReguler'
  ];
  for (var i = 0; i < keys.length; i++) {
    if (payload[keys[i]]) return true;
  }
  return !!(payload.ringkasanUmum && (payload.ringkasanUmum.namaKegiatan || payload.ringkasanUmum.tanggalKegiatan || payload.ringkasanUmum.lokasiKegiatan));
}

function payloadRevisiDariRowRekap_(row) {
  var payload = payloadDetailDariRowRekap_(row);
  if (payloadDetailTidakKosong_(payload)) return payload;
  var legacy = createLegacyPayloadForAdminReviewFromRow_(row);
  return payloadDetailTidakKosong_(legacy) ? legacy : (payload || legacy || {});
}

function bulanHakPasal33DariPeriodeLaporan_(periodeLaporan) {
  var parsed = parsePeriodePasal33_(periodeLaporan);
  if (!parsed || !parsed.tahunHak && parsed.tahunHak !== 0) return '';
  return String(parsed.tahunHak) + '-' + String(parsed.bulanHakIdx + 1).padStart(2, '0');
}

function periodeRevisiLaporanDariRow_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var kategori = String(row[C.KATEGORI] || '');
  var payload = payloadDetailDariRowRekap_(row) || {};

  if (isKategoriWajibBulanan_(kategori)) {
    var bulanWajib = payload.detailWajibPamong && payload.detailWajibPamong.bulan ? String(payload.detailWajibPamong.bulan || '').trim() : '';
    if (!bulanWajib && payload.detailWajibDukuh && payload.detailWajibDukuh.bulan) bulanWajib = String(payload.detailWajibDukuh.bulan || '').trim();
    if (!bulanWajib) {
      var desk = String(row[C.DESKRIPSI] || '');
      var m = desk.match(/BULAN\s+LAPORAN\s*:\s*(\d{4}-\d{2})/i);
      if (m && m[1]) bulanWajib = m[1];
    }
    var bulanHak = bulanWajib ? bulanHakPasal33DariPeriodeLaporan_(bulanWajib) : '';
    if (bulanHak) return bulanHak;
  }

  var p = periodeDariTanggalLaporan_(row[C.TANGGAL_LAPORAN]);
  if (p) return p;

  var tglKeg = row[C.TANGGAL_KEGIATAN];
  var dKeg = parseTanggal(tglKeg);
  if (dKeg instanceof Date && !isNaN(dKeg.getTime()) && dKeg.getTime() !== 0) {
    return Utilities.formatDate(dKeg, 'GMT+7', 'yyyy-MM');
  }
  return '';
}

function cekPeriodeRevisiLaporanAktif_(row) {
  var periode = periodeRevisiLaporanDariRow_(row);
  if (!periode) return { boleh: false, periode: '', pesan: 'Periode laporan tidak dapat ditentukan.' };

  var meta = null;
  try { meta = ambilCutoffTunjanganPeriode_(periode); } catch (e) { meta = null; }
  if (!meta || !(meta.endInclusive instanceof Date) || isNaN(meta.endInclusive.getTime())) {
    return { boleh: true, periode: periode, pesan: 'Periode aktif.' };
  }

  var now = new Date();
  if (now.getTime() > meta.endInclusive.getTime()) {
    return {
      boleh: false,
      periode: periode,
      tanggalCutoff: meta.tanggalCutoff || formatTanggalJamClient_(meta.endInclusive),
      pesan: 'Periode ' + labelPembayaranPeriode_(periode) + ' sudah melewati cut-off (' + (meta.tanggalCutoff || formatTanggalJamClient_(meta.endInclusive)) + '). Laporan yang ditolak pada periode ini tidak dapat direvisi oleh pegawai.'
    };
  }

  return {
    boleh: true,
    periode: periode,
    tanggalCutoff: meta.tanggalCutoff || formatTanggalJamClient_(meta.endInclusive),
    pesan: 'Periode revisi masih aktif sampai ' + (meta.tanggalCutoff || formatTanggalJamClient_(meta.endInclusive)) + '.'
  };
}

function cekBolehRevisiLaporanPegawai_(row, idUser) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  if (!row) return { boleh: false, pesan: 'Laporan tidak ditemukan.' };
  if (!idsEqual_(row[C.ID_USER], idUser)) return { boleh: false, pesan: 'Laporan ini bukan milik akun Anda.' };

  var status = String(row[C.STATUS_REVIEW] || '').trim();
  if (status !== REVIEW_STATUS.DITOLAK) {
    return { boleh: false, pesan: 'Hanya laporan berstatus Ditolak yang dapat direvisi oleh pegawai.' };
  }

  var cekPeriode = cekPeriodeRevisiLaporanAktif_(row);
  if (!cekPeriode.boleh) return cekPeriode;

  return {
    boleh: true,
    periode: cekPeriode.periode,
    tanggalCutoff: cekPeriode.tanggalCutoff || '',
    pesan: cekPeriode.pesan || 'Laporan dapat direvisi.'
  };
}

function isPegawaiPHL_(pegawai) {
  var jabatan = (pegawai && pegawai.jabatan ? pegawai.jabatan : '').toString().toLowerCase();
  return jabatan.indexOf('phl') !== -1 || jabatan.indexOf('lepas') !== -1;
}

function ambilLaporanDitolakUntukRevisi(idLaporan, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, pesan: 'Sesi habis, silakan login ulang.' };

    var targetId = normalizeId_(idLaporan);
    if (!targetId) return { sukses: false, pesan: 'ID laporan tidak valid.' };

    var sh = getSheet_('Rekap_Kinerja');
    var rowIndex = cariRowRekapKinerjaById_(sh, targetId);
    if (!rowIndex) return { sukses: false, pesan: 'Laporan tidak ditemukan.' };

    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var row = sh.getRange(rowIndex, 1, 1, Math.max(sh.getLastColumn(), C.STAF_INSTRUKSI_LOKASI + 1)).getValues()[0];
    var cek = cekBolehRevisiLaporanPegawai_(row, idUser);
    if (!cek.boleh) return { sukses: false, pesan: cek.pesan, periode: cek.periode || '' };

    var pegawai = getPegawaiById_(idUser) || {};
    var payload = payloadRevisiDariRowRekap_(row) || {};
    var urlVisualRaw = row[C.VISUAL_URL] ? String(row[C.VISUAL_URL]).split(',').map(function (u) { return String(u || '').trim(); }).filter(Boolean) : [];
    var urlDasarRaw = String(row[C.DASAR_URL] || '').trim();

    // PATCH v2026.05.10.07:
    // Untuk laporan lama/legacy yang berasal dari disposisi, DASAR_URL bisa kosong
    // meskipun Disposisi_Surat masih memiliki lampiran_url. Saat membuka form revisi,
    // tampilkan kembali dokumen dasar dari lampiran disposisi agar pegawai/admin tidak
    // kehilangan konteks dokumen dasar.
    if (!urlDasarRaw && row[C.ID_DISPOSISI]) {
      try {
        var disposisiSuratLegacy = getDisposisiSuratByIdInternal_(String(row[C.ID_DISPOSISI] || '').trim());
        if (disposisiSuratLegacy && disposisiSuratLegacy.lampiran_url) {
          urlDasarRaw = String(disposisiSuratLegacy.lampiran_url || '').trim();
        }
      } catch (eLegacyDasar) { }
    }


    var routeFormDisposisi = "";
    var jenisDisposisiAktual = "";
    var kategoriSaranDisposisi = "";

    if (row[C.ID_DISPOSISI]) {
      try {
        var suratAktual = getDisposisiSuratByIdInternal_(String(row[C.ID_DISPOSISI] || "").trim());
        if (suratAktual) {
          routeFormDisposisi = routeFormDisposisiUntukPegawai_(pegawai, suratAktual);
          jenisDisposisiAktual = String(suratAktual.jenis_disposisi || "");

          if (routeFormDisposisi === "TU") {
            kategoriSaranDisposisi = KATEGORI_LAP.TU;
          } else if (routeFormDisposisi === "PHL") {
            kategoriSaranDisposisi = KATEGORI_LAP.PHL;
          } else {
            kategoriSaranDisposisi = KATEGORI_LAP.PROD;
          }
        }
      } catch (eRouteRevisi) { }
    }

    return {
      sukses: true,
      data: {
        idLaporan: normalizeId_(row[C.ID_LAPORAN]),
        idDisposisi: normalizeId_(row[C.ID_DISPOSISI]),
        nomorDisposisi: String(row[C.NOMOR_DISPOSISI] || ''),
        jenisDisposisiLaporan: String(row[C.JENIS_DISPOSISI] || ''),
        kategori: String(row[C.KATEGORI] || ''),
        deskripsi: String(row[C.DESKRIPSI] || ''),
        status: String(row[C.STATUS_REVIEW] || ''),
        catatan: String(row[C.CATATAN_ADMIN] || ''),
        urlVisualRaw: urlVisualRaw,
        urlDasarRaw: urlDasarRaw,
        payloadDetail: payload,
        isPHL: isPegawaiPHL_(pegawai),
        periodeRevisi: cek.periode || '',
        tanggalCutoff: cek.tanggalCutoff || '',
        pesan: cek.pesan || '',
        routeFormDisposisi: routeFormDisposisi,
        jenisDisposisiAktual: jenisDisposisiAktual,
        kategoriSaranDisposisi: kategoriSaranDisposisi
      }
    };
  } catch (e) {
    return handleError('ambilLaporanDitolakUntukRevisi', e, { sukses: false, pesan: '' });
  }
}

function bangunDataRevisiKinerjaDariPaket_(paket, pegawaiUser, oldRow) {
  paket = paket || {};
  pegawaiUser = pegawaiUser || {};
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var jLow = String(pegawaiUser.jabatan || '').toLowerCase();
  var isPHL = isPegawaiPHL_(pegawaiUser);

  paket.nama = pegawaiUser.nama || paket.nama || '';
  paket.jabatan = pegawaiUser.jabatan || paket.jabatan || '';

  if (isPHL) {
    paket.kategori = KATEGORI_LAP.PHL;
    if (!paket.detailPHL) throw new Error('Staf PHL hanya dapat merevisi formulir Laporan Harian PHL.');
  } else if (String(paket.kategori || '') === KATEGORI_LAP.PHL || paket.detailPHL) {
    throw new Error('Kategori Laporan Harian PHL hanya untuk Staf PHL.');
  }

  var validasiPiketDukuh = validasiJadwalPiketKhususDukuh_(paket, pegawaiUser);
  if (!validasiPiketDukuh.sukses) throw new Error(validasiPiketDukuh.pesan);

  if (!paket.nama || !paket.jabatan || !paket.kategori || (!paket.deskripsi && !paket.detailWajibPamong && !paket.detailWajibDukuh)) {
    throw new Error('Data revisi tidak lengkap.');
  }

  var kategoriSheet = paket.kategori;
  var namaKegiatan = '';
  var tanggalKegiatan = '';
  var lokasiKegiatan = '';
  var dasarKegiatan = '';
  var penyelenggaraKeg = '';
  var peranKeg = '';
  var urlVisualArray = [];

  if (paket.detailWajibPamong) {
    kategoriSheet = 'Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Bulanan';
    namaKegiatan = 'Paket Kegiatan Wajib Bulan: ' + paket.detailWajibPamong.bulan;
    var narasiGabungan = 'BULAN LAPORAN: ' + paket.detailWajibPamong.bulan + '\n\n';
    var arrTugas = paket.detailWajibPamong.tugasData || [];
    if (!arrTugas.length) throw new Error('Rincian laporan wajib bulanan belum tersedia.');
    for (var k = 0; k < arrTugas.length; k++) {
      var t = arrTugas[k] || {};
      if (detailIntiIsBlank_(t.deskripsi) || !t.fileUrl) {
        throw new Error('Setiap item laporan wajib bulanan harus berisi deskripsi dan bukti. Lengkapi item ke-' + (k + 1) + '.');
      }
      narasiGabungan += (k + 1) + '. TUGAS: ' + (t.namaTugas || '') + '\nDESKRIPSI: ' + (t.deskripsi || '') + '\n\n';
      urlVisualArray.push(t.fileUrl);
    }
    paket.deskripsi = narasiGabungan;
  } else {
    if (!paket.fileUrl) throw new Error('Dokumentasi visual/bukti wajib tersedia. Unggah bukti baru atau gunakan bukti lama.');
    urlVisualArray.push(paket.fileUrl);

    if (paket.detailWajibDukuh) {
      kategoriSheet = 'Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Dukuh';
      dasarKegiatan = 'Kegiatan wajib Dukuh Pasal 41';
      namaKegiatan = paket.detailWajibDukuh.jenis || paket.detailWajibDukuh.namaKeg;
      tanggalKegiatan = paket.detailWajibDukuh.tanggal;
      lokasiKegiatan = paket.detailWajibDukuh.lokasi;
      penyelenggaraKeg = paket.detailWajibDukuh.penyelenggara;
      peranKeg = 'Dukuh / Pelaksana kegiatan wajib';
      paket.deskripsi = 'JENIS PERTEMUAN WAJIB: ' + (paket.detailWajibDukuh.jenis || paket.detailWajibDukuh.namaKeg || '') + '\nTANGGAL: ' + tanggalKegiatan + '\nLOKASI: ' + lokasiKegiatan + '\nPENYELENGGARA: ' + penyelenggaraKeg + '\n\n[OUTPUT]\n' + (paket.detailWajibDukuh.outputRingkas || paket.deskripsi || '');
    } else if (paket.detailTU) {
      kategoriSheet = 'Laporan Tugas Umum - ' + paket.detailTU.jenis;
      var dasarTUSimpan = String(paket.detailTU.dasar || '').trim();
      var dasarTUOpsiSimpan = String(paket.detailTU.dasarOpsi || paket.detailTU.dasarPilihan || paket.detailTU.dasar || '').trim();
      var dasarTULainnyaSimpan = String(paket.detailTU.dasarLainnya || paket.detailTU.dasarManual || paket.detailTU.dasarKehadiranLainnya || '').trim();
      if (dasarTUOpsiSimpan === 'Lainnya' || dasarTUSimpan === 'Lainnya') dasarTUSimpan = dasarTULainnyaSimpan;
      dasarKegiatan = dasarTUSimpan;
      namaKegiatan = paket.detailTU.namaKeg;
      tanggalKegiatan = paket.detailTU.tanggal;
      lokasiKegiatan = paket.detailTU.lokasi;
      penyelenggaraKeg = paket.detailTU.penyelenggara;
      peranKeg = paket.detailTU.peran;
    } else if (paket.detailPHL) {
      kategoriSheet = KATEGORI_LAP.PHL;
      namaKegiatan = paket.detailPHL.namaKeg;
      tanggalKegiatan = paket.detailPHL.tanggal;
      lokasiKegiatan = paket.detailPHL.lokasi;
    } else if (paket.detailDukuh) {
      namaKegiatan = paket.detailDukuh.namaKeg;
      tanggalKegiatan = paket.detailDukuh.tanggal;
      lokasiKegiatan = paket.detailDukuh.lokasi;
      penyelenggaraKeg = paket.detailDukuh.penyelenggara;
    } else if (paket.detailAPBKal) {
      kategoriSheet = 'Laporan Produktifitas - Pelaksanaan APBKal Tahun Berjalan';
      dasarKegiatan = 'Peraturan Lurah No 4 Tahun 2025';
      namaKegiatan = '[' + paket.detailAPBKal.kodeRek + '] ' + paket.detailAPBKal.namaKeg;
      tanggalKegiatan = paket.detailAPBKal.tanggal;
      lokasiKegiatan = paket.detailAPBKal.lokasi;
      penyelenggaraKeg = paket.detailAPBKal.bidang;
      peranKeg = paket.detailAPBKal.termin + ' | ' + tahapApbLabel_(paket.detailAPBKal.tahap);
    } else if (paket.detailAPBKalCarik) {
      kategoriSheet = 'Laporan Produktivitas - Pelaksanaan Kegiatan tugas pokok dan fungsi - Pelaksanaan APBKal Tahun Berjalan (Pasal 44)';
      dasarKegiatan = 'Peraturan Lurah No 4 Tahun 2025 (Pasal 44)';
      namaKegiatan = paket.detailAPBKalCarik.namaKeg;
      tanggalKegiatan = paket.detailAPBKalCarik.tanggal;
      lokasiKegiatan = paket.detailAPBKalCarik.lokasi;
      penyelenggaraKeg = 'Pemerintah Kalurahan';
      peranKeg = paket.detailAPBKalCarik.jenis;
    } else if (paket.detailPimpinan) {
      kategoriSheet = 'Laporan Produktifitas - Pelaksanaan kegiatan tugas dan/atau instruksi Pimpinan';
      dasarKegiatan = paket.detailPimpinan.dasar;
      namaKegiatan = paket.detailPimpinan.namaKeg;
      tanggalKegiatan = paket.detailPimpinan.tanggal;
      lokasiKegiatan = paket.detailPimpinan.lokasi;
      penyelenggaraKeg = paket.detailPimpinan.penyelenggara;
      peranKeg = paket.detailPimpinan.jenis;
    } else if (paket.detailReguler) {
      kategoriSheet = 'Laporan Produktifitas - Pelaksanaan Kegiatan tugas pokok dan fungsi - Kegiatan Reguler Tupoksi';
      dasarKegiatan = 'Tugas pokok dan fungsi';
      namaKegiatan = paket.detailReguler.namaKeg;
      tanggalKegiatan = paket.detailReguler.tanggal;
      lokasiKegiatan = paket.detailReguler.lokasi;
      penyelenggaraKeg = 'Pemerintah Kalurahan';
      peranKeg = paket.detailReguler.peranAnda;
    } else if (paket.detailStafInstruksi) {
      kategoriSheet = 'Laporan Produktifitas - Melaksanakan Instruksi Pimpinan';
      dasarKegiatan = 'Instruksi ' + paket.detailStafInstruksi.bentuk + ' dari ' + paket.detailStafInstruksi.pemberi;
      namaKegiatan = paket.detailStafInstruksi.namaKeg;
      tanggalKegiatan = paket.detailStafInstruksi.tanggal;
      lokasiKegiatan = paket.detailStafInstruksi.lokasi;
      penyelenggaraKeg = 'Pemerintah Kalurahan';
      peranKeg = 'Staf Pelaksana';
    } else if (paket.detailStafReguler) {
      kategoriSheet = 'Laporan Produktifitas - Melaksanakan Tugas Unit Kerja';
      dasarKegiatan = 'Tugas Rutin Unit Kerja';
      namaKegiatan = paket.detailStafReguler.namaKeg;
      tanggalKegiatan = paket.detailStafReguler.tanggal;
      lokasiKegiatan = paket.detailStafReguler.lokasi || 'Kantor Kalurahan';
      penyelenggaraKeg = 'Pemerintah Kalurahan';
      peranKeg = paket.detailStafReguler.peran || 'Staf Pelaksana';
    }
  }

  var validasiDetailInti = validasiDanNormalisasiDetailIntiLaporan_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg);
  if (!validasiDetailInti.sukses) throw new Error(validasiDetailInti.pesan);
  namaKegiatan = validasiDetailInti.data.namaKegiatan;
  tanggalKegiatan = validasiDetailInti.data.tanggalKegiatan;
  lokasiKegiatan = validasiDetailInti.data.lokasiKegiatan;
  dasarKegiatan = validasiDetailInti.data.dasarKegiatan;
  penyelenggaraKeg = validasiDetailInti.data.penyelenggaraKeg;
  peranKeg = validasiDetailInti.data.peranKeg;

  var disposisiRef = null;
  if (oldRow && oldRow[C.ID_DISPOSISI]) {
    disposisiRef = {
      idDisposisi: String(oldRow[C.ID_DISPOSISI] || ''),
      nomorDisposisi: String(oldRow[C.NOMOR_DISPOSISI] || ''),
      jenisDisposisi: String(oldRow[C.JENIS_DISPOSISI] || '')
    };
    var disposisiSuratRef = getDisposisiSuratByIdInternal_(disposisiRef.idDisposisi);
    if (!disposisiSuratRef) throw new Error('Disposisi terkait tidak ditemukan atau sudah tidak tersedia.');
    var cutoffDisposisiSubmit = cutoffPelaporanDisposisi_(disposisiSuratRef);
    if (cutoffDisposisiSubmit.periodeDitutup) throw new Error(cutoffDisposisiSubmit.pesan);
    var routeRevisiDisposisi = routeFormDisposisiUntukPegawai_(pegawaiUser, disposisiSuratRef);
    var validRouteDisposisi = validasiRouteFormLaporanDisposisi_(pegawaiUser, disposisiSuratRef, paket, kategoriSheet);

    if (!validRouteDisposisi.sukses) {
      if (routeRevisiDisposisi === "TU" && !paket.detailTU) {
        throw new Error(
          "Jenis disposisi terkait sudah dikoreksi menjadi Tugas Umum. " +
          "Silakan buka ulang halaman revisi agar form berubah ke Laporan Tugas Umum, lalu simpan ulang."
        );
      }

      throw new Error(validRouteDisposisi.pesan);
    }
  }

  var urlDasar = paket.fileDasarUrl || (oldRow ? String(oldRow[C.DASAR_URL] || '').trim() : '');

  // PATCH v2026.05.10.07:
  // Fallback khusus revisi laporan lama/legacy dari disposisi. Jika laporan terkait
  // disposisi tetapi DASAR_URL lama kosong, gunakan lampiran disposisi sebagai dokumen dasar.
  // Tidak mengubah laporan non-disposisi dan tidak menimpa DASAR_URL yang sudah ada.
  if (!urlDasar && typeof disposisiSuratRef !== 'undefined' && disposisiSuratRef && disposisiSuratRef.lampiran_url) {
    urlDasar = String(disposisiSuratRef.lampiran_url || '').trim();
  }

  var parsed = { poin: 0, alasan: 'Evaluasi Manual', deskripsi_baku: paket.deskripsi || '' };
  var hasilKalkulasi = kalkulasiPoinKinerja_(paket, kategoriSheet, jLow);
  parsed.poin = hasilKalkulasi.poin;
  parsed.alasan = hasilKalkulasi.alasan;

  if (isPHL || kategoriSheet.indexOf(KATEGORI_LAP.PHL) !== -1) {
    parsed.poin = 0;
    parsed.alasan = 'Laporan PHL (Honorarium Tetap)';
  }
  if (paket.detailWajibPamong) {
    var evalPasal33 = evaluasiPasal33Hak_(paket.detailWajibPamong.bulan, new Date(), new Date());
    parsed.poin = evalPasal33.poinHak;
    parsed.alasan = 'Paket Wajib Pasal 33: ' + evalPasal33.statusLabel + ' (' + evalPasal33.poinHak + ' poin / ' + evalPasal33.persenProdHak + '% produktifitas bulan hak)';
  }

  var kolomDetailForm = buildKolomDetailForm_(paket, kategoriSheet, namaKegiatan, tanggalKegiatan, lokasiKegiatan, dasarKegiatan, penyelenggaraKeg, peranKeg);
  var payloadDetailJson = kolomDetailForm[1] || '{}';

  return {
    kategoriSheet: kategoriSheet,
    deskripsi: parsed.deskripsi_baku,
    urlVisualFinal: urlVisualArray.join(','),
    poin: parsed.poin,
    alasan: parsed.alasan,
    dasarKegiatan: dasarKegiatan,
    urlDasar: urlDasar,
    namaKegiatan: namaKegiatan,
    tanggalKegiatan: tanggalKegiatan,
    lokasiKegiatan: lokasiKegiatan,
    penyelenggaraKeg: penyelenggaraKeg,
    peranKeg: peranKeg,
    payloadDetailJson: payloadDetailJson,
    kolomDetailForm: kolomDetailForm
  };
}

function simpanRevisiLaporanDitolakPegawai(paket, token) {
  var submitCache = CacheService.getScriptCache();
  var nonceKey = '';
  var pertahankanNonce = false;
  var nonceInFlightDitetapkan = false;
  var nonceInFlightStateValue = '';
  try {
    var idUser = validasiSession(token);
    if (!idUser) return 'ERROR_SESSION_EXPIRED';
    var pegawaiUser = getPegawaiById_(idUser);
    if (!pegawaiUser) return '❌ GAGAL: Data pegawai tidak ditemukan.';
    if (!paket || typeof paket !== 'object') return '❌ GAGAL: Paket data revisi tidak valid.';

    var idLaporan = normalizeId_(paket.idLaporanRevisi || paket.idLaporan || '');
    if (!idLaporan) return '❌ GAGAL: ID laporan revisi tidak valid.';

    var submitNonce = String(paket.submitNonce || '').trim();
    if (!submitNonce) return '❌ GAGAL: Token revisi tidak valid. Silakan muat ulang halaman lalu coba lagi.';
    nonceKey = 'REVISI_NONCE_' + idUser.toString() + '_' + idLaporan + '_' + submitNonce;

    var nonceLock = LockService.getScriptLock();
    if (!nonceLock.tryLock(5000)) return '❌ GAGAL: Antrean server sedang penuh. Silakan klik Simpan Revisi lagi dalam beberapa detik.';
    try {
      var nonceState = submitCache.get(nonceKey);
      var nonceInfo = bacaSubmitNonceState_(nonceState);
      if (nonceInfo.done) { pertahankanNonce = true; return '⚠️ Revisi yang sama sudah pernah diproses.'; }
      if (nonceInfo.inFlight && !nonceInfo.stale) { pertahankanNonce = true; return '⏳ Revisi yang sama sedang diproses. Mohon tunggu beberapa detik.'; }
      nonceInFlightStateValue = buatSubmitInFlightState_();
      submitCache.put(nonceKey, nonceInFlightStateValue, submitInFlightTtl_());
      nonceInFlightDitetapkan = true;
    } finally {
      nonceLock.releaseLock();
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return '❌ GAGAL: Antrean server sedang penuh. Revisi belum tersimpan. Silakan coba lagi.';

    var rowIndex = 0;
    var row = null;
    var dataBaru = null;
    var revisiKe = 1;
    try {
      var sh = getSheet_('Rekap_Kinerja');
      var lastCol = Math.max(sh.getLastColumn(), SHEET_COLUMNS.REKAP_KINERJA.STAF_INSTRUKSI_LOKASI + 1);
      rowIndex = cariRowRekapKinerjaById_(sh, idLaporan);
      if (!rowIndex) return '❌ GAGAL: Laporan yang akan direvisi tidak ditemukan.';
      row = sh.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

      var cek = cekBolehRevisiLaporanPegawai_(row, idUser);
      if (!cek.boleh) return '❌ GAGAL: ' + cek.pesan;

      dataBaru = bangunDataRevisiKinerjaDariPaket_(paket, pegawaiUser, row);

      var allRows = sh.getDataRange().getValues();
      if (paket.detailAPBKal) {
        var currTermin = String(paket.detailAPBKal.termin || '');
        var currTahap = String(paket.detailAPBKal.tahap || '');
        var kodeRekTarget = String(paket.detailAPBKal.kodeRek || '');
        var metodeInput = String(paket.detailAPBKal.metode || '');
        var errMsgTahap = cekValiditasTahapAPBKal_(currTahap, currTermin, kodeRekTarget, allRows, paket.detailAPBKal.tanggal, paket.detailAPBKal.namaKeg, { excludeIdLaporan: idLaporan });
        if (errMsgTahap) {
          if (isApbTahapPeringatan_(errMsgTahap)) {
            var warningTahap = ambilIsiApbTahapPeringatan_(errMsgTahap);
            tandaiPeringatanTahapAPBKal_(paket, warningTahap);
            dataBaru.poin = 0;
            dataBaru.alasan = alasanPeringatanTahapAPBKal_(warningTahap) + " Saran Sistem: 0 poin dan ditolak/diperbaiki.";
            dataBaru.kolomDetailForm = buildKolomDetailForm_(paket, dataBaru.kategoriSheet, dataBaru.namaKegiatan, dataBaru.tanggalKegiatan, dataBaru.lokasiKegiatan, dataBaru.dasarKegiatan, dataBaru.penyelenggaraKeg, dataBaru.peranKeg);
            dataBaru.payloadDetailJson = dataBaru.kolomDetailForm[1] || "{}";
          } else {
            return errMsgTahap;
          }
        }
        var errMsgTermin = cekValiditasTerminAPBKal_(currTahap, currTermin, kodeRekTarget, metodeInput, allRows);
        if (errMsgTermin) return errMsgTermin;
      }

      var C = SHEET_COLUMNS.REKAP_KINERJA;
      var rowUpdate = row.slice();
      padRowToIndex_(rowUpdate, C.STAF_INSTRUKSI_LOKASI);
      revisiKe = (Number(rowUpdate[C.REVISI_KE]) || 0) + 1;
      var catatanLama = String(rowUpdate[C.CATATAN_ADMIN] || '').trim();
      var now = new Date();

      rowUpdate[C.NAMA] = sanitizeForSheet_(pegawaiUser.nama || rowUpdate[C.NAMA] || '');
      rowUpdate[C.JABATAN] = sanitizeForSheet_(pegawaiUser.jabatan || rowUpdate[C.JABATAN] || '');
      rowUpdate[C.KATEGORI] = sanitizeForSheet_(dataBaru.kategoriSheet);
      rowUpdate[C.DESKRIPSI] = sanitizeForSheet_(dataBaru.deskripsi);
      rowUpdate[C.VISUAL_URL] = dataBaru.urlVisualFinal;
      rowUpdate[C.POIN_SISTEM] = dataBaru.poin;
      rowUpdate[C.ALASAN_SISTEM] = sanitizeForSheet_(dataBaru.alasan);
      rowUpdate[C.STATUS_REVIEW] = REVIEW_STATUS.MENUNGGU;
      rowUpdate[C.POIN_FINAL] = dataBaru.poin;
      rowUpdate[C.DASAR_KEGIATAN] = sanitizeForSheet_(dataBaru.dasarKegiatan);
      rowUpdate[C.DASAR_URL] = dataBaru.urlDasar;
      rowUpdate[C.NAMA_KEGIATAN] = sanitizeForSheet_(dataBaru.namaKegiatan);
      rowUpdate[C.TANGGAL_KEGIATAN] = sanitizeForSheet_(dataBaru.tanggalKegiatan);
      rowUpdate[C.LOKASI_KEGIATAN] = sanitizeForSheet_(dataBaru.lokasiKegiatan);
      rowUpdate[C.PENYELENGGARA] = sanitizeForSheet_(dataBaru.penyelenggaraKeg);
      rowUpdate[C.PERAN] = sanitizeForSheet_(dataBaru.peranKeg);
      rowUpdate[C.CATATAN_ADMIN] = sanitizeForSheet_('Revisi pegawai ke-' + revisiKe + '. Catatan penolakan sebelumnya: ' + (catatanLama || '-'));
      rowUpdate[C.WAKTU_REVIEW_ADMIN] = '';
      rowUpdate[C.NONCE] = submitNonce;
      rowUpdate[C.REVISI_KE] = revisiKe;
      rowUpdate[C.TERAKHIR_DIREVISI_PADA] = now;
      rowUpdate[C.TERAKHIR_DIREVISI_OLEH] = sanitizeForSheet_(idUser + ' - ' + (pegawaiUser.nama || ''));
      rowUpdate[C.PAYLOAD_JSON] = dataBaru.payloadDetailJson;

      var startDetail = C.JENIS_FORM_DETAIL;
      for (var kd = 0; kd < dataBaru.kolomDetailForm.length; kd++) {
        rowUpdate[startDetail + kd] = dataBaru.kolomDetailForm[kd];
      }

      sh.getRange(rowIndex, 1, 1, rowUpdate.length).setValues([rowUpdate]);
      invalidasiCacheRekapKinerjaReadOnly_();
      submitCache.put(nonceKey, 'DONE', CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
      pertahankanNonce = true;
    } finally {
      lock.releaseLock();
    }

    logAudit(idUser, 'REVISI_LAPORAN_PEGAWAI', idLaporan + ' | Revisi ke-' + revisiKe);
    return '✅ Revisi laporan tersimpan. Status kembali menjadi Menunggu Review untuk diperiksa Admin.';
  } catch (e) {
    return pesanErrorStringAman_('simpanRevisiLaporanDitolakPegawai', e, '❌ ');
  } finally {
    if (nonceInFlightDitetapkan && nonceKey && !pertahankanNonce) {
      try {
        var currentNonceState = submitCache.get(nonceKey);
        if (!nonceInFlightStateValue || currentNonceState === nonceInFlightStateValue) submitCache.remove(nonceKey);
      } catch (cleanupErr) { }
    }
  }
}
// ===== END PATCH v2026.05.09.13 =====

function ambilRiwayatKu(token, fokusIdLaporan) {
  var res = ambilRiwayatKuPaged({ limit: 50, offset: 0, fokusIdLaporan: fokusIdLaporan || '' }, token);
  return (res && res.sukses && Array.isArray(res.items)) ? res.items : [];
}
function ambilDataRekap() {
  try {
    var data = getRekapKinerjaValuesReadOnly_();
    var mapRekap = {};

    var pegawaiData = [];
    try { pegawaiData = getPegawaiDataCached_() || []; } catch (e) { }

    var pegawaiById = {};
    for (var p = 1; p < pegawaiData.length; p++) {
      var idPeg = normalizeId_(pegawaiData[p][SHEET_COLUMNS.DATA_PEGAWAI.ID]);
      if (!idPeg) continue;
      pegawaiById[idPeg] = {
        idUser: idPeg,
        nama: (pegawaiData[p][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || "").toString().trim(),
        jabatan: (pegawaiData[p][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || "").toString().trim()
      };
    }

    var tglSekarang = new Date();
    // Klasemen/estimasi periode memakai periode efektif/cut-off tunjangan,
    // bukan bulan kalender. Ini mencegah laporan setelah cut-off bulan lalu
    // hilang dari estimasi periode berjalan.
    var periodeAktifRekap = periodeDariTanggalLaporan_(tglSekarang) || Utilities.formatDate(tglSekarang, "GMT+7", "yyyy-MM");
    var metaPeriodeAktifRekap = parsePeriodeBulan_(periodeAktifRekap);

    for (var i = 1; i < data.length; i++) {
      var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

      var periodeEfektifLap = periodeDariTanggalLaporan_(tglLap);

      if (!(tglLap >= metaPeriodeAktifRekap.triStart && tglLap < metaPeriodeAktifRekap.triEnd)) continue;
      if (!isStatusApproved_(data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW])) continue;

      var idUser = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
      var kategori = (data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "").toString();
      var poin = Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;

      var master = idUser && pegawaiById[idUser] ? pegawaiById[idUser] : null;
      var nama = master && master.nama ? master.nama : (data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "").toString().trim();
      var jabatan = master && master.jabatan ? master.jabatan : (data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || "").toString().trim();

      if (!nama || !jabatan) continue;

      var jLow = (jabatan || "").toString().toLowerCase();
      if (jLow.indexOf("lurah") !== -1 || jLow.indexOf("phl") !== -1 || jLow.indexOf("lepas") !== -1) continue;

      var kelompok = identifikasiKelompok_(jabatan);
      var key = idUser || (nama + "__" + jabatan);

      if (!mapRekap[key]) {
        mapRekap[key] = {
          idUser: idUser,
          nama: nama,
          jabatan: jabatan,
          kelompok: kelompok,
          jumlahLaporan: 0,
          totalPoin: 0,
          poinProd: 0,
          poinTU: 0,
          estimasiTunjangan: 0
        };
      }

      mapRekap[key].jumlahLaporan++;
      mapRekap[key].totalPoin += poin;

      if (periodeEfektifLap === periodeAktifRekap) {
        if (isKategoriProduktivitas_(kategori)) mapRekap[key].poinProd += poin;
        else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) mapRekap[key].poinTU += poin;
      }
    }

    var hasil = Object.values(mapRekap);

    hasil.forEach(function (r) {
      var tunjangan = { maxProd: 0, maxTU: 0 };
      try { tunjangan = getTunjanganPegawai_(r.idUser, r.jabatan) || tunjangan; } catch (e) { }

      var maxProd = Number(tunjangan.maxProd) || 0;
      var maxTU = Number(tunjangan.maxTU) || 0;
      var prProd = r.poinProd > 100 ? 100 : r.poinProd;
      var prTU = r.poinTU > 100 ? 100 : r.poinTU;

      r.estimasiTunjangan = ((prProd / 100) * maxProd) + ((prTU / 100) * maxTU);
    });

    hasil.sort(function (a, b) {
      return Number(b.totalPoin || 0) - Number(a.totalPoin || 0);
    });

    return hasil;
  } catch (e) {
    Logger.log("ambilDataRekap ERROR: " + e.message);
    return [];
  }
}


function simpanRekapBulanan_(periode, idUser, nama, jabatan, jumlahLaporan, narasi, modelAI) {
  var sheet = getSheet_("Rekap_Bulanan");
  var row = [
    periode,
    idUser,
    nama,
    jabatan,
    jumlahLaporan,
    narasi,
    new Date(),
    modelAI ||
    "gemini-2.5-flash"
  ];
  sheet.appendRow(row);
}

// SECURITY: Validasi URL lampiran bukti/disposisi.
// Prinsip: jangan percaya raw URL dari input. Untuk bukti aplikasi ini,
// hanya URL Google Drive/Docs via HTTPS yang boleh diterima, lalu URL
// publik yang dipakai UI dibangun ulang dari fileId Drive.
function isAllowedDriveHost_(host) {
  host = String(host || "").toLowerCase().trim();
  return host === "drive.google.com" || host === "docs.google.com";
}

function getHttpsUrlHost_(url) {
  if (!url || typeof url !== "string") return "";

  var s = url.trim();
  if (!s || s.length > 2048) return "";

  // Tolak control character dan backslash agar tidak ada ambiguitas parsing.
  if (/[\u0000-\u001F\u007F\\]/.test(s)) return "";

  // Wajib HTTPS. Jangan izinkan HTTP untuk lampiran bukti.
  var m = s.match(/^https:\/\/([^\/?#]+)([\/?#]|$)/i);
  if (!m || !m[1]) return "";

  var hostPort = String(m[1] || "").toLowerCase();

  // Tolak userinfo: https://drive.google.com@evil.example/...
  if (hostPort.indexOf("@") !== -1) return "";

  // Hilangkan port bila ada.
  return hostPort.replace(/:\d+$/, "");
}

function isSafeUrl_(url) {
  var host = getHttpsUrlHost_(url);
  return !!host && isAllowedDriveHost_(host);
}

function isSafeDriveUrl_(url) {
  return isSafeUrl_(url) && !!extractDriveFileId_(url);
}

function extractDriveFileId_(url) {
  var s = (url || "").toString().trim();
  if (!s) return "";

  var patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/i,
    /[?&]id=([a-zA-Z0-9_-]{10,})/i,
    /\/d\/([a-zA-Z0-9_-]{10,})/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    var m = s.match(patterns[i]);
    if (m && m[1]) return m[1];
  }
  return "";
}

function cloneSimpleObject_(obj) {
  var out = {};
  obj = obj || {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

function buildDriveLampiranMeta_(url, label, cache) {
  var rawUrl = (url || "").toString().trim();

  // Lampiran valid hanya boleh berupa URL Google Drive/Docs yang memiliki fileId.
  if (!rawUrl || !isSafeDriveUrl_(rawUrl)) return null;

  var fileId = extractDriveFileId_(rawUrl);
  if (!fileId) return null;

  // Cache berdasarkan fileId, bukan rawUrl, supaya variasi URL untuk file yang sama
  // tidak memaksa lookup Drive berulang.
  var cacheKey = "DRIVE_FILE_" + fileId;
  var base = null;

  if (cache && cache[cacheKey]) {
    base = cloneSimpleObject_(cache[cacheKey]);
  } else {
    var openUrl = "https://drive.google.com/file/d/" + encodeURIComponent(fileId) + "/view";
    var previewUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w800";
    var fullUrl = "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(fileId);

    base = {
      label: (label || "Lampiran").toString(),
      rawUrl: openUrl,
      safeUrl: openUrl,
      openUrl: openUrl,
      fileId: fileId,
      fileName: "",
      mimeType: "",
      kind: "drive",
      isImage: false,
      isPdf: false,
      canPreviewInline: false,
      previewUrl: previewUrl,
      fullUrl: fullUrl
    };

    try {
      var file = DriveApp.getFileById(fileId);
      base.fileName = file.getName() || "";
      base.mimeType = file.getMimeType() || "";
    } catch (e) {
      // Jika fileId tidak bisa diakses oleh script, jangan tampilkan link mentah.
      return null;
    }

    var nameLower = (base.fileName || "").toLowerCase();
    base.isImage = base.mimeType.indexOf("image/") === 0 || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(nameLower);
    base.isPdf = base.mimeType === MimeType.PDF || base.mimeType.indexOf("pdf") !== -1 || /\.pdf$/i.test(nameLower);

    if (base.isImage) {
      base.kind = "image";
      base.canPreviewInline = true;
      base.stageUrl = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fileId) + "&sz=w2000";
    } else if (base.isPdf) {
      base.kind = "pdf";
      base.canPreviewInline = false;
    }

    if (cache) cache[cacheKey] = cloneSimpleObject_(base);
  }

  base = cloneSimpleObject_(base);
  if (label) base.label = label;
  return base;
}

function adminDetailText_(value) {
  if (value == null) return "";

  // Jika value adalah Date object, format dengan formatWaktuAdmin_
  if (value instanceof Date) {
    return formatWaktuAdmin_(value);
  }

  // Cek apakah string yang terlihat seperti format default Date.toString()
  // Contoh: "Wed Apr 01 2026 00:00:00 GMT+0700"
  var str = value.toString().trim();
  if (/^[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/.test(str)) {
    // Parse dan format ulang
    try {
      var d = new Date(str);
      if (d instanceof Date && !isNaN(d.getTime())) {
        return formatWaktuAdmin_(d);
      }
    } catch (e) { }
  }

  return str;
}

function pushAdminDetailField_(list, label, value) {
  var v = adminDetailText_(value);
  if (!v) return;
  list.push({ label: label, value: v });
}

function buildAdminDetailFormFromPayload_(payload, source) {
  payload = payload || {};
  var fields = [];
  var type = "generic";

  if (payload.detailTU) {
    type = "tu";
    pushAdminDetailField_(fields, "Jenis Tugas Umum", payload.detailTU.jenis);
    pushAdminDetailField_(fields, "Dasar Kehadiran", payload.detailTU.dasar);
    pushAdminDetailField_(fields, "Pemberi Perintah", payload.detailTU.pemberi);
    pushAdminDetailField_(fields, "Nama Kegiatan", payload.detailTU.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailTU.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailTU.lokasi);
    pushAdminDetailField_(fields, "Penyelenggara", payload.detailTU.penyelenggara);
    pushAdminDetailField_(fields, "Peran / Partisipasi", payload.detailTU.peran);
    pushAdminDetailField_(fields, "Tujuan / Sasaran", payload.detailTU.sasaran || payload.detailTU.tujuan);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailTU.outputRingkas || payload.detailTU.hasil);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailTU.tindakLanjut || payload.detailTU.rekomendasi);
  } else if (payload.detailPimpinan) {
    type = "pimpinan";
    pushAdminDetailField_(fields, "Jenis Tugas Pimpinan", payload.detailPimpinan.jenis);
    pushAdminDetailField_(fields, "Dasar Kehadiran / Tugas", payload.detailPimpinan.dasar);
    pushAdminDetailField_(fields, "Pemberi Perintah", payload.detailPimpinan.pemberi);
    pushAdminDetailField_(fields, "Nama Agenda / Kegiatan", payload.detailPimpinan.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailPimpinan.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailPimpinan.lokasi);
    pushAdminDetailField_(fields, "Penyelenggara", payload.detailPimpinan.penyelenggara);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailPimpinan.outputRingkas || payload.detailPimpinan.hasil);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailPimpinan.tindakLanjut || payload.detailPimpinan.rekomendasi);
  } else if (payload.detailPHL) {
    type = "phl";
    pushAdminDetailField_(fields, "Nama Pekerjaan", payload.detailPHL.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailPHL.tanggal);
    pushAdminDetailField_(fields, "Lokasi", payload.detailPHL.lokasi);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailPHL.outputRingkas || payload.detailPHL.hasil);
  } else if (payload.detailAPBKal) {
    type = "apbkal";
    pushAdminDetailField_(fields, "Bidang APBKal", payload.detailAPBKal.bidang);
    pushAdminDetailField_(fields, "Kode Rekening", payload.detailAPBKal.kodeRek);
    pushAdminDetailField_(fields, "Nama Kegiatan APBKal", payload.detailAPBKal.namaKeg);
    pushAdminDetailField_(fields, "Termin Pencairan", payload.detailAPBKal.termin);
    pushAdminDetailField_(fields, "Tahapan Kegiatan", tahapApbLabel_(payload.detailAPBKal.tahap));
    pushAdminDetailField_(fields, "Status Pelaksanaan", payload.detailAPBKal.isTPK);
    pushAdminDetailField_(fields, "Batas Waktu", payload.detailAPBKal.batasWaktu);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan Riil", payload.detailAPBKal.tanggal);
    pushAdminDetailField_(fields, "Lokasi", payload.detailAPBKal.lokasi);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailAPBKal.outputRingkas || payload.detailAPBKal.hasil);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailAPBKal.tindakLanjut || payload.detailAPBKal.rekomendasi);
  } else if (payload.detailAPBKalCarik) {
    type = "apbkal_carik";
    pushAdminDetailField_(fields, "Jenis Pelaksanaan APBKal Tahun Berjalan", payload.detailAPBKalCarik.jenis);
    pushAdminDetailField_(fields, "Nama Kegiatan / Dokumen", payload.detailAPBKalCarik.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailAPBKalCarik.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailAPBKalCarik.lokasi);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailAPBKalCarik.outputRingkas || payload.detailAPBKalCarik.hasil);
  } else if (payload.detailStafInstruksi) {
    type = "staf_instruksi";
    pushAdminDetailField_(fields, "Pemberi Instruksi", payload.detailStafInstruksi.pemberi);
    pushAdminDetailField_(fields, "Bentuk Instruksi", payload.detailStafInstruksi.bentuk);
    pushAdminDetailField_(fields, "Nama Tugas / Instruksi", payload.detailStafInstruksi.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailStafInstruksi.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailStafInstruksi.lokasi);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailStafInstruksi.outputRingkas || payload.detailStafInstruksi.hasil);
  } else if (payload.detailStafReguler) {
    type = "staf_reguler";
    pushAdminDetailField_(fields, "Nama Tugas / Pekerjaan", payload.detailStafReguler.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailStafReguler.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailStafReguler.lokasi);
    pushAdminDetailField_(fields, "Sasaran / Pihak Terlibat", payload.detailStafReguler.sasaran);
    pushAdminDetailField_(fields, "Peran Anda", payload.detailStafReguler.peran);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailStafReguler.outputRingkas || payload.detailStafReguler.hasil);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailStafReguler.tindakLanjut || payload.detailStafReguler.rekomendasi);
  } else if (payload.detailReguler) {
    type = "reguler";
    pushAdminDetailField_(fields, "Nama Kegiatan", payload.detailReguler.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailReguler.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailReguler.lokasi);
    pushAdminDetailField_(fields, "Sasaran / Pihak Terlibat", payload.detailReguler.pihakTerlibat);
    pushAdminDetailField_(fields, "Peran / Partisipasi", payload.detailReguler.peranAnda);
    pushAdminDetailField_(fields, "Ringkasan Output / Hasil", payload.detailReguler.outputRingkas);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailReguler.tindakLanjut);
  } else if (payload.detailWajibDukuh) {
    type = "wajib_dukuh";
    pushAdminDetailField_(fields, "Jenis Pertemuan Wajib Dukuh", payload.detailWajibDukuh.jenis || payload.detailWajibDukuh.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailWajibDukuh.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailWajibDukuh.lokasi);
    pushAdminDetailField_(fields, "Penyelenggara", payload.detailWajibDukuh.penyelenggara);
    pushAdminDetailField_(fields, "Output / Hasil", payload.detailWajibDukuh.outputRingkas || payload.detailWajibDukuh.hasil);
  } else if (payload.detailDukuh) {
    type = "dukuh";
    pushAdminDetailField_(fields, "Nama Kegiatan", payload.detailDukuh.namaKeg);
    pushAdminDetailField_(fields, "Tanggal Pelaksanaan", payload.detailDukuh.tanggal);
    pushAdminDetailField_(fields, "Tempat / Lokasi", payload.detailDukuh.lokasi);
    pushAdminDetailField_(fields, "Penyelenggara", payload.detailDukuh.penyelenggara);
    pushAdminDetailField_(fields, "Pihak Terlibat", payload.detailDukuh.pihakTerlibat);
    pushAdminDetailField_(fields, "Output / Hasil", payload.detailDukuh.outputRingkas || payload.detailDukuh.hasil);
    pushAdminDetailField_(fields, "Tindak Lanjut / Rekomendasi", payload.detailDukuh.tindakLanjut || payload.detailDukuh.rekomendasi);
  } else if (payload.detailWajibPamong) {
    type = "wajib_pamong";
    pushAdminDetailField_(fields, "Bulan Laporan", payload.detailWajibPamong.bulan);
    if (payload.detailWajibPamong.tugasData && payload.detailWajibPamong.tugasData.length) {
      pushAdminDetailField_(fields, "Jumlah Tugas Wajib", payload.detailWajibPamong.tugasData.length + " item");
      var daftar = [];
      for (var i = 0; i < payload.detailWajibPamong.tugasData.length; i++) {
        var it = payload.detailWajibPamong.tugasData[i] || {};
        if (it.nama) daftar.push(it.nama);
      }
      pushAdminDetailField_(fields, "Daftar Tugas", daftar.join("\n"));
    }
  }

  if (!fields.length) return null;
  return {
    type: type,
    source: source || "json",
    title: "Ringkasan Form Input",
    fields: fields,
    note: source === "legacy"
      ? "Sebagian field detail pada laporan lama belum tersimpan penuh; ringkasan ini direkonstruksi dari data rekap yang tersedia."
      : ""
  };
}

function normalizeAdminDetailKey_(label) {
  return adminDetailText_(label).toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractLegacyStructuredNotes_(deskripsi) {
  var text = adminDetailText_(deskripsi);
  if (!text) return {};

  var labelMap = {
    'tujuan': 'sasaran',
    'tujuan/sasaran': 'sasaran',
    'sasaran': 'sasaran',
    'tempat': 'lokasi',
    'lokasi': 'lokasi',
    'tanggal': 'tanggal',
    'penyelenggara': 'penyelenggara',
    'pihak terlibat': 'pihakTerlibat',
    'pihak / penyelenggara': 'pihakTerlibat',
    'pihak': 'pihakTerlibat',
    'peran': 'peran',
    'peran / partisipasi': 'peran',
    'peran anda': 'peran',
    'hasil': 'outputRingkas',
    'output': 'outputRingkas',
    'output/hasil': 'outputRingkas',
    'ringkasan output / hasil': 'outputRingkas',
    'tindak lanjut': 'tindakLanjut',
    'rekomendasi': 'tindakLanjut',
    'rekomendasi/lanjut': 'tindakLanjut',
    'pemberi perintah': 'pemberi',
    'pemberi instruksi': 'pemberi',
    'bentuk instruksi': 'bentuk',
    'jenis tugas pimpinan': 'jenis',
    'jenis tugas umum': 'jenis',
    'nama agenda/kegiatan': 'namaKeg',
    'nama kegiatan': 'namaKeg',
    'nama pekerjaan': 'namaKeg'
  };

  var result = {};
  var lines = text.split(/\n+/);
  for (var i = 0; i < lines.length; i++) {
    var line = adminDetailText_(lines[i]);
    if (!line) continue;
    var m = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (!m) continue;
    var key = normalizeAdminDetailKey_(m[1]);
    var mapped = labelMap[key];
    if (!mapped) continue;
    if (!result[mapped]) result[mapped] = m[2].trim();
  }
  return result;
}

function pickAdminDetailValue_() {
  for (var i = 0; i < arguments.length; i++) {
    var v = adminDetailText_(arguments[i]);
    if (v) return v;
  }
  return '';
}

function createLegacyPayloadForAdminReviewFromRow_(row) {
  row = row || [];

  var kategori = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI]);
  var deskripsi = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI]);
  var dasar = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_KEGIATAN]);
  var namaKegiatan = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN]);
  var tanggalKegiatan = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_KEGIATAN]);
  var lokasiKegiatan = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.LOKASI_KEGIATAN]);
  var penyelenggaraKeg = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PENYELENGGARA]);
  var peranKeg = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PERAN]);
  var jabatan = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.JABATAN]).toLowerCase();
  var hints = extractLegacyStructuredNotes_(deskripsi);

  var payload = {
    __legacyBackfill: true,
    __legacyBackfillVersion: 1,
    __legacyBackfillAt: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')
  };

  if (kategori.indexOf('Laporan Tugas Umum - ') === 0) {
    payload.detailTU = {
      jenis: pickAdminDetailValue_(hints.jenis, kategori.replace('Laporan Tugas Umum - ', '')),
      dasar: dasar,
      pemberi: hints.pemberi,
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      penyelenggara: pickAdminDetailValue_(hints.penyelenggara, penyelenggaraKeg),
      peran: pickAdminDetailValue_(hints.peran, peranKeg),
      sasaran: hints.sasaran,
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi),
      tindakLanjut: hints.tindakLanjut
    };
  } else if (kategori.indexOf(KATEGORI_LAP.PHL) === 0) {
    payload.detailPHL = {
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi)
    };
  } else if (peranKeg.indexOf('Mewakili Lurah') === 0 || peranKeg.indexOf('Tugas Piket') === 0 || peranKeg.indexOf('Mengikuti rapat/bimtek/sosialisasi supra kalurahan') === 0 || peranKeg.indexOf('Mengikuti kegiatan masyarakat/kelompok masyarakat/lembaga kemasyarakatan') === 0 || peranKeg.indexOf('Pelayanan masyarakat di Kantor Lurah dalam rangka tugas piket') === 0 || peranKeg.indexOf('Jadwal Piket Dukuh') === 0 || peranKeg.indexOf('Instruksi Khusus Lurah lainnya') === 0) {
    payload.detailPimpinan = {
      jenis: pickAdminDetailValue_(hints.jenis, peranKeg),
      dasar: dasar,
      pemberi: hints.pemberi,
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      penyelenggara: pickAdminDetailValue_(hints.penyelenggara, penyelenggaraKeg),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi),
      tindakLanjut: hints.tindakLanjut
    };
  } else if (dasar.indexOf('Instruksi ') === 0) {
    var matchInstruksi = dasar.match(/^Instruksi\s+(.+?)\s+dari\s+(.+)$/i);
    payload.detailStafInstruksi = {
      pemberi: pickAdminDetailValue_(hints.pemberi, matchInstruksi && matchInstruksi[2]),
      bentuk: pickAdminDetailValue_(hints.bentuk, matchInstruksi && matchInstruksi[1], dasar.replace(/^Instruksi\s+/i, '')),
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi)
    };
  } else if (peranKeg.indexOf('Termin') !== -1 || /^\[[^\]]+\]/.test(namaKegiatan) || penyelenggaraKeg.indexOf('Bidang ') === 0) {
    var kodeMatch = namaKegiatan.match(/^\[([^\]]+)\]\s*(.*)$/);
    payload.detailAPBKal = {
      bidang: pickAdminDetailValue_(hints.penyelenggara, penyelenggaraKeg),
      kodeRek: kodeMatch && kodeMatch[1] ? kodeMatch[1] : '',
      namaKeg: pickAdminDetailValue_(hints.namaKeg, kodeMatch && kodeMatch[2], namaKegiatan),
      termin: peranKeg,
      tahap: '',
      isTPK: '',
      batasWaktu: '',
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi),
      tindakLanjut: hints.tindakLanjut
    };
  } else if (peranKeg.indexOf('Verifikasi ') === 0 || peranKeg.indexOf('Mengoordinasikan ') === 0) {
    payload.detailAPBKalCarik = {
      jenis: pickAdminDetailValue_(hints.jenis, peranKeg),
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi)
    };
  } else if (jabatan.indexOf('dukuh') !== -1 && kategori.indexOf('Pelaksanaan kegiatan wajib') !== -1) {
    payload.detailWajibDukuh = {
      jenis: pickAdminDetailValue_(hints.jenis, hints.namaKeg, namaKegiatan),
      namaKeg: pickAdminDetailValue_(hints.jenis, hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      penyelenggara: pickAdminDetailValue_(hints.penyelenggara, penyelenggaraKeg),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi)
    };
  } else if (namaKegiatan || tanggalKegiatan || lokasiKegiatan || penyelenggaraKeg || peranKeg || deskripsi) {
    payload.detailReguler = {
      namaKeg: pickAdminDetailValue_(hints.namaKeg, namaKegiatan),
      tanggal: pickAdminDetailValue_(hints.tanggal, tanggalKegiatan),
      lokasi: pickAdminDetailValue_(hints.lokasi, lokasiKegiatan),
      pihakTerlibat: pickAdminDetailValue_(hints.pihakTerlibat, hints.sasaran, penyelenggaraKeg),
      peranAnda: pickAdminDetailValue_(hints.peran, peranKeg),
      outputRingkas: pickAdminDetailValue_(hints.outputRingkas, deskripsi),
      tindakLanjut: hints.tindakLanjut
    };
  } else {
    return null;
  }

  payload.ringkasanUmum = {
    namaKegiatan: namaKegiatan,
    tanggalKegiatan: tanggalKegiatan,
    lokasiKegiatan: lokasiKegiatan,
    dasarKegiatan: dasar,
    penyelenggara: penyelenggaraKeg,
    peran: peranKeg
  };

  return payload;
}

function reconstructAdminDetailFormFromLegacyRow_(row) {
  row = row || [];
  var payload = createLegacyPayloadForAdminReviewFromRow_(row);
  if (!payload) return null;
  return buildAdminDetailFormFromPayload_(payload, 'legacy');
}


function formatSpreadsheetReviewDateTime_(value) {
  if (value === null || value === undefined || value === '') return '';
  var d = value instanceof Date && !isNaN(value.getTime()) ? value : parseTanggal(value);
  if (d instanceof Date && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
  }
  return adminDetailText_(value);
}

function formatSpreadsheetReviewDateOnly_(value) {
  if (value === null || value === undefined || value === '') return '';
  var d = value instanceof Date && !isNaN(value.getTime()) ? value : parseTanggal(value);
  if (d instanceof Date && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'GMT+7', 'dd/MM/yyyy');
  }
  return adminDetailText_(value);
}

function pushSpreadsheetReviewField_(fields, kolom, label, value, options) {
  options = options || {};
  var v = options.dateTime ? formatSpreadsheetReviewDateTime_(value)
    : options.dateOnly ? formatSpreadsheetReviewDateOnly_(value)
    : adminDetailText_(value);

  fields.push({
    kolom: kolom,
    label: label,
    value: v || '-',
    longText: !!options.longText
  });
}

function pushSpreadsheetReviewFieldIfValue_(fields, kolom, label, value, options) {
  var v = adminDetailText_(value);
  if (!v) return;
  pushSpreadsheetReviewField_(fields, kolom, label, value, options || {});
}

function normalizeReviewDetailType_(value) {
  return adminDetailText_(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function compareSpreadsheetDetailValue_(value, options) {
  options = options || {};
  var text = options.dateTime ? formatSpreadsheetReviewDateTime_(value)
    : options.dateOnly ? formatSpreadsheetReviewDateOnly_(value)
    : adminDetailText_(value);
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function spreadsheetDetailIsSameAs_(value, options, compareList) {
  var current = compareSpreadsheetDetailValue_(value, options || {});
  if (!current || current === '-' || current === 'null' || current === 'undefined') return false;
  compareList = Array.isArray(compareList) ? compareList : [];
  for (var i = 0; i < compareList.length; i++) {
    var item = compareList[i] || {};
    var other = compareSpreadsheetDetailValue_(item.value, item.options || {});
    if (other && current === other) return true;
  }
  return false;
}

function pushSpreadsheetReviewFieldUnique_(fields, kolom, label, value, options, compareList) {
  options = options || {};
  if (!adminDetailText_(value)) return;
  if (spreadsheetDetailIsSameAs_(value, options, compareList || [])) return;
  pushSpreadsheetReviewField_(fields, kolom, label, value, options);
}

function buildAdminSpreadsheetDetailFromRow_(row) {
  row = row || [];
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var fields = [];

  var jenisForm = normalizeReviewDetailType_(row[C.JENIS_FORM_DETAIL]);
  var jabatanNorm = normalizeReviewDetailType_(row[C.JABATAN]);
  var isStaf = jabatanNorm.indexOf('staf') !== -1;
  var isReguler = jenisForm === 'reguler_tupoksi' || jenisForm === 'kegiatan_reguler_tupoksi' || jenisForm === 'regular_tupoksi';
  var isStafReguler = jenisForm.indexOf('staf_reguler') !== -1;
  var isPimpinan = jenisForm.indexOf('pimpinan') !== -1 || jenisForm === 'tugas_instruksi_pimpinan';
  var isDukuh = jenisForm.indexOf('dukuh') !== -1;

  // Field utama tetap dibaca agar frontend dapat menyaring data yang sudah tampil di kartu ringkasan.
  pushSpreadsheetReviewField_(fields, 'A', 'Waktu Lapor', row[C.TANGGAL_LAPORAN], { dateTime: true });
  pushSpreadsheetReviewField_(fields, 'B', 'Nama Pegawai', row[C.NAMA]);
  pushSpreadsheetReviewField_(fields, 'C', 'Jabatan', row[C.JABATAN]);
  pushSpreadsheetReviewField_(fields, 'D', 'Kategori Kegiatan', row[C.KATEGORI]);
  pushSpreadsheetReviewField_(fields, 'E', 'Deskripsi dan Hasil Kegiatan', row[C.DESKRIPSI], { longText: true });
  pushSpreadsheetReviewField_(fields, 'H', 'Catatan Evaluasi Sistem', row[C.ALASAN_SISTEM], { longText: true });

  var umum = [
    { kolom: 'K', label: 'Dasar Kehadiran', value: row[C.DASAR_KEGIATAN] },
    { kolom: 'M', label: 'Nama Kegiatan', value: row[C.NAMA_KEGIATAN] },
    { kolom: 'N', label: 'Tanggal Pelaksanaan', value: row[C.TANGGAL_KEGIATAN], options: { dateOnly: true } },
    { kolom: 'O', label: 'Tempat / Lokasi', value: row[C.LOKASI_KEGIATAN] },
    { kolom: 'P', label: 'Penyelenggara / Pihak Terkait', value: row[C.PENYELENGGARA] },
    { kolom: 'Q', label: 'Peran / Partisipasi', value: row[C.PERAN] }
  ];

  umum.forEach(function (f) {
    pushSpreadsheetReviewField_(fields, f.kolom, f.label, f.value, f.options || {});
  });

  var compareUmum = umum.map(function (f) { return { value: f.value, options: f.options || {} }; });

  pushSpreadsheetReviewFieldIfValue_(fields, 'AD', 'Jenis Form Detail', row[C.JENIS_FORM_DETAIL]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AF', 'Output / Hasil Kegiatan', row[C.OUTPUT_RINGKAS], { longText: true }, compareUmum.concat([{ value: row[C.DESKRIPSI] }]));
  pushSpreadsheetReviewFieldUnique_(fields, 'AG', 'Tindak Lanjut / Rekomendasi', row[C.TINDAK_LANJUT_REKOMENDASI], { longText: true }, compareUmum.concat([{ value: row[C.DESKRIPSI] }]));

  pushSpreadsheetReviewFieldIfValue_(fields, 'AH', 'Bidang APBKal', row[C.APBKAL_BIDANG]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AI', 'Kode Rekening APBKal', row[C.APBKAL_KODE_REKENING]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AJ', 'Nama Kegiatan APBKal', row[C.APBKAL_NAMA_KEGIATAN], {}, compareUmum);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AK', 'Termin Pencairan', row[C.APBKAL_TERMIN_PENCAIRAN]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AL', 'Tahapan Kegiatan APBKal', tahapApbLabel_(row[C.APBKAL_TAHAPAN_KEGIATAN]));
  pushSpreadsheetReviewFieldIfValue_(fields, 'AM', 'Status Pelaksanaan APBKal', row[C.APBKAL_STATUS_PELAKSANAAN]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AN', 'Batas Waktu Pelaporan APBKal', row[C.APBKAL_BATAS_WAKTU_PELAPORAN], { dateOnly: true });
  pushSpreadsheetReviewFieldUnique_(fields, 'AO', 'Tanggal Pelaksanaan Riil APBKal', row[C.APBKAL_TANGGAL_PELAKSANAAN_RIIL], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AP', 'Lokasi APBKal', row[C.APBKAL_LOKASI], {}, compareUmum);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AQ', 'Metode Pelaksanaan APBKal', row[C.APBKAL_METODE]);

  pushSpreadsheetReviewFieldIfValue_(fields, 'AR', 'Jenis Pelaksanaan APBKal Tahun Berjalan', row[C.APBKAL_CARIK_JENIS_TUGAS]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AS', 'Nama Kegiatan APBKal Carik', row[C.APBKAL_CARIK_NAMA_KEGIATAN], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AT', 'Tanggal Pelaksanaan APBKal Carik', row[C.APBKAL_CARIK_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BR', 'Tempat / Lokasi APBKal Carik', row[C.APBKAL_CARIK_LOKASI], {}, compareUmum);

  if (isPimpinan) {
    pushSpreadsheetReviewFieldIfValue_(fields, 'AU', 'Jenis Tugas / Instruksi Pimpinan', row[C.PIMPINAN_JENIS_TUGAS]);
    pushSpreadsheetReviewFieldUnique_(fields, 'AV', 'Dasar Tugas / Instruksi', row[C.PIMPINAN_DASAR], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AW', 'Pemberi Tugas / Instruksi', row[C.PIMPINAN_PEMBERI], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AX', 'Nama Agenda / Kegiatan', row[C.PIMPINAN_NAMA_AGENDA], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AY', 'Tanggal Pelaksanaan', row[C.PIMPINAN_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AZ', 'Tempat / Lokasi', row[C.PIMPINAN_LOKASI], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'BA', 'Penyelenggara', row[C.PIMPINAN_PENYELENGGARA], {}, compareUmum);
  } else {
    pushSpreadsheetReviewFieldIfValue_(fields, 'AU', 'Jenis Tugas / Instruksi Pimpinan', row[C.PIMPINAN_JENIS_TUGAS]);
    pushSpreadsheetReviewFieldUnique_(fields, 'AV', 'Dasar Tugas / Instruksi', row[C.PIMPINAN_DASAR], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AW', 'Pemberi Tugas / Instruksi', row[C.PIMPINAN_PEMBERI], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AX', 'Nama Agenda / Kegiatan', row[C.PIMPINAN_NAMA_AGENDA], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AY', 'Tanggal Pelaksanaan', row[C.PIMPINAN_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'AZ', 'Tempat / Lokasi', row[C.PIMPINAN_LOKASI], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'BA', 'Penyelenggara', row[C.PIMPINAN_PENYELENGGARA], {}, compareUmum);
  }

  pushSpreadsheetReviewFieldUnique_(fields, 'BB', 'Pemberi Instruksi Staf', row[C.STAF_INSTRUKSI_PEMBERI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BC', 'Bentuk Instruksi Staf', row[C.STAF_INSTRUKSI_BENTUK], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BD', 'Nama Tugas / Instruksi Staf', row[C.STAF_INSTRUKSI_NAMA_TUGAS], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BE', 'Tanggal Pelaksanaan Instruksi Staf', row[C.STAF_INSTRUKSI_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BS', 'Tempat / Lokasi Instruksi Staf', row[C.STAF_INSTRUKSI_LOKASI], {}, compareUmum);

  var bfLabels;
  if (isStafReguler || (isStaf && !isReguler)) {
    bfLabels = ['Nama Tugas / Pekerjaan', 'Tanggal Pelaksanaan', 'Tempat / Lokasi', 'Sasaran / Pihak Terlibat', 'Peran / Partisipasi'];
  } else if (isReguler) {
    bfLabels = ['Nama Kegiatan', 'Tanggal Pelaksanaan', 'Tempat / Lokasi', 'Sasaran / Pihak Terlibat', 'Peran / Partisipasi'];
  } else {
    bfLabels = ['Nama Kegiatan', 'Tanggal Pelaksanaan', 'Tempat / Lokasi', 'Sasaran / Pihak Terlibat', 'Peran / Partisipasi'];
  }
  pushSpreadsheetReviewFieldUnique_(fields, 'BF', bfLabels[0], row[C.STAF_REGULER_NAMA_TUGAS], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BG', bfLabels[1], row[C.STAF_REGULER_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BH', bfLabels[2], row[C.STAF_REGULER_LOKASI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BI', bfLabels[3], row[C.STAF_REGULER_SASARAN], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BJ', bfLabels[4], row[C.STAF_REGULER_PERAN], {}, compareUmum);

  if (isReguler && !isDukuh) {
    pushSpreadsheetReviewFieldUnique_(fields, 'BK', 'Nama Kegiatan', row[C.DUKUH_KATEGORI_FUNGSI], {}, compareUmum);
    pushSpreadsheetReviewFieldUnique_(fields, 'BL', 'Output / Hasil Kegiatan', row[C.DUKUH_DETAIL_FUNGSI], { longText: true }, compareUmum.concat([{ value: row[C.DESKRIPSI] }]));
    pushSpreadsheetReviewFieldUnique_(fields, 'BM', 'Sasaran / Pihak Terlibat', row[C.DUKUH_PIHAK_TERLIBAT], {}, compareUmum);
  } else {
    pushSpreadsheetReviewFieldIfValue_(fields, 'BK', 'Kategori / Fungsi Dukuh', row[C.DUKUH_KATEGORI_FUNGSI]);
    pushSpreadsheetReviewFieldIfValue_(fields, 'BL', 'Detail Fungsi / Kegiatan Dukuh', row[C.DUKUH_DETAIL_FUNGSI], { longText: true });
    pushSpreadsheetReviewFieldIfValue_(fields, 'BM', 'Pihak Terlibat Dukuh', row[C.DUKUH_PIHAK_TERLIBAT]);
  }

  pushSpreadsheetReviewFieldIfValue_(fields, 'BN', 'Bulan Laporan Wajib Pamong', row[C.WAJIB_PAMONG_BULAN]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'BP', 'Sumber Detail Form', row[C.SUMBER_DETAIL_FORM]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'BQ', 'Versi Schema Detail', row[C.VERSI_SCHEMA_DETAIL]);

  return {
    title: 'Detail Laporan dari Spreadsheet',
    source: 'Rekap_Kinerja',
    note: 'Data berikut dibaca langsung dari kolom utama dan kolom detail AD-BQ pada sheet Rekap_Kinerja agar Admin dapat memverifikasi laporan secara lengkap.',
    fields: fields
  };
}

// ===== REVIEW ADMIN v24: sumber kebenaran detail dasar dari kolom K-Q =====
function buildAdminCoreDetailFromRow_(row) {
  row = row || [];
  var C = SHEET_COLUMNS.REKAP_KINERJA;

  function safeText_(value, options) {
    options = options || {};
    if (options.dateOnly) {
      var formatted = formatSpreadsheetReviewDateOnly_(value);
      if (formatted) return formatted;
    }
    return adminDetailText_(value);
  }

  return {
    dasarKehadiran: safeText_(row[C.DASAR_KEGIATAN]),
    namaKegiatan: safeText_(row[C.NAMA_KEGIATAN]),
    tanggalPelaksanaan: safeText_(row[C.TANGGAL_KEGIATAN], { dateOnly: true }),
    tempatLokasi: safeText_(row[C.LOKASI_KEGIATAN]),
    penyelenggara: safeText_(row[C.PENYELENGGARA]),
    peranPartisipasi: safeText_(row[C.PERAN])
  };
}
// ===== END REVIEW ADMIN v24 =====


function labelBuktiWajibPamongDariPayload_(payload, index) {
  try {
    var tasks = payload && payload.detailWajibPamong && Array.isArray(payload.detailWajibPamong.tugasData)
      ? payload.detailWajibPamong.tugasData
      : [];
    var t = tasks[index] || {};
    var nomor = index + 1;
    var nama = (t.namaTugas || t.nama || ("Tugas " + nomor)).toString().trim();
    return "Bukti Tugas " + nomor + " - " + nama;
  } catch (e) {
    return "Bukti Tugas " + (index + 1);
  }
}

function lengkapiMetaBuktiWajibPamong_(buktiVisualMeta, payload) {
  try {
    if (!Array.isArray(buktiVisualMeta) || !buktiVisualMeta.length) return buktiVisualMeta;
    var tasks = payload && payload.detailWajibPamong && Array.isArray(payload.detailWajibPamong.tugasData)
      ? payload.detailWajibPamong.tugasData
      : [];
    if (!tasks.length) return buktiVisualMeta;

    for (var i = 0; i < buktiVisualMeta.length; i++) {
      var t = tasks[i] || {};
      var label = labelBuktiWajibPamongDariPayload_(payload, i);
      if (buktiVisualMeta[i]) {
        buktiVisualMeta[i].label = label;
        buktiVisualMeta[i].taskIndex = i + 1;
        buktiVisualMeta[i].taskName = t.namaTugas || t.nama || "";
        buktiVisualMeta[i].taskDescription = t.deskripsi || "";
        buktiVisualMeta[i].fileUrl = t.fileUrl || t.buktiUrl || buktiVisualMeta[i].safeUrl || buktiVisualMeta[i].urlRaw || "";
      }
    }
  } catch (e) { }
  return buktiVisualMeta;
}

function buildAdminReviewItemFromRow_(row, lampiranCache) {
  row = row || [];
  lampiranCache = lampiranCache || {};

  var w = row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
  var waktuObj = parseTanggal(w);
  var waktuTeks = formatWaktuAdmin_(w);

  var urlDasar = row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL] ? row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL].toString() : "";
  var dokumenDasarMeta = buildDriveLampiranMeta_(urlDasar, "Dokumen Dasar", lampiranCache);
  var susunanLink = "";

  if (dokumenDasarMeta && dokumenDasarMeta.safeUrl) {
    susunanLink += '<a href="' + dokumenDasarMeta.openUrl + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:bold;">📄 Dokumen Dasar</a><br>';
  }

  var urlVisuals = row[SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL] ? row[SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL].toString().split(",") : [];
  var buktiVisualMeta = [];
  for (var u = 0; u < urlVisuals.length; u++) {
    var link = (urlVisuals[u] || "").toString().trim();
    if (!link) continue;

    var label = urlVisuals.length > 1 ? "Bukti Visual " + (u + 1) : "Bukti Visual";
    var meta = buildDriveLampiranMeta_(link, label, lampiranCache);
    if (!meta || !meta.safeUrl) continue;

    buktiVisualMeta.push(meta);
    var safeUrl = String(meta.safeUrl || '').replace(/'/g, "\\'");
    var openUrl = String(meta.openUrl || '').replace(/'/g, "\\'");
    var safeLabel = String(label || '').replace(/'/g, "\\'");
    susunanLink += '<a href="#" onclick="event.preventDefault(); window.bukaFotoAdmin(\'' + safeUrl + '\', \'' + openUrl + '\', \'' + safeLabel + '\'); return false;" style="cursor:pointer; color:#2563eb; font-weight:bold;">' + (meta.isPdf ? "📄 " : "📸 ") + label + '</a><br>';
  }

  var detailForm = null;
  var payloadRaw = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON];
  if ((payloadRaw === null || payloadRaw === undefined || payloadRaw === '') &&
      SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON !== undefined) {
    payloadRaw = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON];
  }
  var payload = null;
  if (payloadRaw !== null && payloadRaw !== undefined && payloadRaw !== '') {
    try {
      payload = JSON.parse(payloadRaw);
    } catch (e) {
      payload = null;
    }
  }
  if (payload) {
    buktiVisualMeta = lengkapiMetaBuktiWajibPamong_(buktiVisualMeta, payload);

    if (payload.detailWajibPamong && payload.detailWajibPamong.tugasData && buktiVisualMeta.length) {
      susunanLink = "";
      if (dokumenDasarMeta && dokumenDasarMeta.safeUrl) {
        susunanLink += '<a href="' + dokumenDasarMeta.openUrl + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:bold;">📄 Dokumen Dasar</a><br>';
      }
      for (var wl = 0; wl < buktiVisualMeta.length; wl++) {
        var metaWajib = buktiVisualMeta[wl] || {};
        var labelWajib = metaWajib.label || labelBuktiWajibPamongDariPayload_(payload, wl);
        var safeUrlWajib = String(metaWajib.safeUrl || '').replace(/'/g, "\\'");
        var openUrlWajib = String(metaWajib.openUrl || '').replace(/'/g, "\\'");
        var safeLabelWajib = String(labelWajib || '').replace(/'/g, "\\'");
        susunanLink += '<a href="#" onclick="event.preventDefault(); window.bukaFotoAdmin(\'' + safeUrlWajib + '\', \'' + openUrlWajib + '\', \'' + safeLabelWajib + '\'); return false;" style="cursor:pointer; color:#2563eb; font-weight:bold;">' + (metaWajib.isPdf ? "📄 " : "📸 ") + labelWajib + '</a><br>';
      }
    }

    detailForm = buildAdminDetailFormFromPayload_(payload, payload.__legacyBackfill ? 'legacy' : 'json');
  }
  if (!detailForm) {
    detailForm = reconstructAdminDetailFormFromLegacyRow_(row);
  }

  var tanggalPelaksanaanReviewRaw = row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_KEGIATAN] || adminTanggalPelaksanaanDariPayload_(payload);
  var tanggalPelaksanaanReviewTeks = formatSpreadsheetReviewDateOnly_(tanggalPelaksanaanReviewRaw) || adminDetailText_(tanggalPelaksanaanReviewRaw) || adminTanggalPelaksanaanDariPayload_(payload);
  var kategoriReview = (row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '').toString();
  var isLaporanWajibBulananReview = isKategoriWajibBulanan_(kategoriReview);
  // Laporan wajib bulanan memakai BULAN LAPORAN + evaluasi Pasal 33,
  // sehingga tidak ikut validasi cut-off umum berdasarkan tanggal lapor/tanggal kegiatan.
  var evalCutoffReview = isLaporanWajibBulananReview ? null : evaluasiCutoffLaporan_(w);
  // Laporan wajib bulanan memakai BULAN LAPORAN + evaluasi Pasal 33.
  // Jangan pakai validasi periode berdasarkan TANGGAL_KEGIATAN, karena
  // tanggal kegiatan pada paket wajib sering berupa tanggal awal bulan laporan
  // (mis. 01/04/2026) dan bukan dasar cut-off kegiatan biasa.
  var evalPeriodePelaksanaanReview = isLaporanWajibBulananReview
    ? null
    : evaluasiPeriodePelaksanaanReviewAdmin_(tanggalPelaksanaanReviewRaw, w);
  var lewatCutoffWaktuReview = !!(evalCutoffReview && evalCutoffReview.valid && evalCutoffReview.lewatCutoff);
  var periodePelaksanaanDitutupReview = !!(evalPeriodePelaksanaanReview && evalPeriodePelaksanaanReview.valid && evalPeriodePelaksanaanReview.periodeDitutup);
  var lewatCutoffReview = lewatCutoffWaktuReview || periodePelaksanaanDitutupReview;
  var labelCutoffReview = '';
  var cutoffPesanReview = '';
  if (lewatCutoffWaktuReview && evalCutoffReview.meta) {
    labelCutoffReview = evalCutoffReview.meta.tanggalCutoff || "27/04/2026 18:13:40";
    cutoffPesanReview = "Lewat cut-off " + (evalCutoffReview.meta.labelPembayaran || "periode berjalan") + ". Batas terakhir: " + labelCutoffReview + ". Poin otomatis 0 dan tidak masuk rekap tunjangan periode berjalan.";
  } else if (periodePelaksanaanDitutupReview) {
    labelCutoffReview = evalPeriodePelaksanaanReview.cutoffLabel || (evalPeriodePelaksanaanReview.meta && evalPeriodePelaksanaanReview.meta.tanggalCutoff) || "";
    cutoffPesanReview = evalPeriodePelaksanaanReview.pesan || catatanPeriodePelaksanaanDitutup_(evalPeriodePelaksanaanReview);
  }
  var poinFinalReview = row[SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL] || 0;
  if (lewatCutoffReview) poinFinalReview = 0;

  return {
    idLaporan: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
    idUser: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]),
    waktu: waktuTeks,
    waktuSort: (waktuObj instanceof Date && !isNaN(waktuObj.getTime())) ? waktuObj.getTime() : 0,
    nama: row[SHEET_COLUMNS.REKAP_KINERJA.NAMA],
    jabatan: row[SHEET_COLUMNS.REKAP_KINERJA.JABATAN],
    kategori: row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI],
    deskripsi: row[SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI],
    linkHtml: susunanLink,
    urlDasarRaw: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta.safeUrl : "",
    dokumenDasar: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta : null,
    urlVisualRaw: buktiVisualMeta.map(function (item) { return item.safeUrl; }),
    buktiVisualMeta: buktiVisualMeta,
    buktiVisual: buktiVisualMeta,
    poinAI: row[SHEET_COLUMNS.REKAP_KINERJA.POIN_SISTEM] || 0,
    evaluasi: row[SHEET_COLUMNS.REKAP_KINERJA.ALASAN_SISTEM] || "-",
    status: row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW],
    poinFinal: poinFinalReview,
    catatan: row[SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || "-",
    lewatCutoff: lewatCutoffReview,
    cutoffLabel: labelCutoffReview,
    cutoffPesan: lewatCutoffReview ? cutoffPesanReview : "",
    periodePelaksanaan: evalPeriodePelaksanaanReview && evalPeriodePelaksanaanReview.valid ? (evalPeriodePelaksanaanReview.labelPeriode || evalPeriodePelaksanaanReview.periode || '') : '',
    periodePelaksanaanDitutup: periodePelaksanaanDitutupReview,
    validasiPeriodePelaksanaan: evalPeriodePelaksanaanReview && evalPeriodePelaksanaanReview.valid ? {
      periode: evalPeriodePelaksanaanReview.periode || '',
      labelPeriode: evalPeriodePelaksanaanReview.labelPeriode || '',
      periodeDitutup: !!evalPeriodePelaksanaanReview.periodeDitutup,
      cutoffLabel: evalPeriodePelaksanaanReview.cutoffLabel || '',
      pesan: evalPeriodePelaksanaanReview.pesan || ''
    } : null,
    // v26: kirim kolom K-Q juga sebagai field top-level agar frontend tidak bergantung pada struktur nested lama/cache.
    dasarKehadiran: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_KEGIATAN]),
    namaKegiatan: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN]),
    tanggalPelaksanaan: tanggalPelaksanaanReviewTeks,
    tempatLokasi: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.LOKASI_KEGIATAN]),
    penyelenggara: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PENYELENGGARA]),
    peranPartisipasi: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PERAN]),
    payloadDetail: payload || null,
    detailForm: detailForm,
    detailKolomUtama: buildAdminCoreDetailFromRow_(row),
    spreadsheetDetail: buildAdminSpreadsheetDetailFromRow_(row)
  };
}

function previewBackfillLegacyPayloadAdminReview_(limitRows) {
  try {
    var sh = getSheet_('Rekap_Kinerja');
    var data = sh.getDataRange().getValues();
    var maxRows = parseInt(limitRows, 10);
    if (isNaN(maxRows) || maxRows <= 0) maxRows = Math.max(data.length - 1, 0);

    var summary = {
      totalRows: Math.max(data.length - 1, 0),
      checkedRows: 0,
      hasPayload: 0,
      eligibleLegacy: 0,
      skippedEmpty: 0,
      sample: []
    };

    for (var i = 1; i < data.length && summary.checkedRows < maxRows; i++) {
      summary.checkedRows++;
      var row = data[i];
      var existingPayload = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON]);
      if (existingPayload) {
        summary.hasPayload++;
        continue;
      }
      var payload = createLegacyPayloadForAdminReviewFromRow_(row);
      if (!payload) {
        summary.skippedEmpty++;
        continue;
      }
      summary.eligibleLegacy++;
      if (summary.sample.length < 10) {
        summary.sample.push({
          rowIndex: i + 1,
          idLaporan: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
          kategori: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI]),
          nama: adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA]),
          payloadKeys: Object.keys(payload).filter(function (k) { return k.indexOf('__') !== 0; })
        });
      }
    }

    return { sukses: true, summary: summary };
  } catch (e) {
    return handleError('previewBackfillLegacyPayloadAdminReview_', e, { sukses: false, pesan: "" });
  }
}

function runBackfillLegacyPayloadAdminReview_(limitRows) {
  try {
    var sh = getSheet_('Rekap_Kinerja');
    var data = sh.getDataRange().getValues();
    var maxRows = parseInt(limitRows, 10);
    if (isNaN(maxRows) || maxRows <= 0) maxRows = Math.max(data.length - 1, 0);

    var payloadCol = SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON + 1;
    var checkedRows = 0;
    var updated = 0;
    var skippedHasPayload = 0;
    var skippedEmpty = 0;
    var errors = [];

    for (var i = 1; i < data.length && checkedRows < maxRows; i++) {
      checkedRows++;
      var row = data[i];
      var existingPayload = adminDetailText_(row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON]);
      if (existingPayload) {
        skippedHasPayload++;
        continue;
      }

      var payload = createLegacyPayloadForAdminReviewFromRow_(row);
      if (!payload) {
        skippedEmpty++;
        continue;
      }

      try {
        sh.getRange(i + 1, payloadCol).setValue(JSON.stringify(payload));
        updated++;
      } catch (rowErr) {
        if (errors.length < 20) {
          errors.push({
            rowIndex: i + 1,
            idLaporan: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
            pesan: rowErr && rowErr.message ? rowErr.message : String(rowErr)
          });
        }
      }
    }

    if (updated) invalidasiCacheRekapKinerjaReadOnly_();

    return {
      sukses: true,
      pesan: 'Backfill payload legacy selesai.',
      summary: {
        totalRows: Math.max(data.length - 1, 0),
        checkedRows: checkedRows,
        updated: updated,
        skippedHasPayload: skippedHasPayload,
        skippedEmpty: skippedEmpty,
        errors: errors
      }
    };
  } catch (e) {
    return handleError('runBackfillLegacyPayloadAdminReview_', e, { sukses: false, pesan: "" });
  }
}



// ===== REVIEW ADMIN v27 - K-Q DIRECT INJECTION, NO ASSUMPTION =====
function injectKolomKQKeItemReview_(item, row) {
  item = item || {};
  row = row || [];
  var C = SHEET_COLUMNS.REKAP_KINERJA;

  function textValue_(value, options) {
    options = options || {};
    if (options.dateOnly) {
      var formatted = formatSpreadsheetReviewDateOnly_(value);
      if (formatted) return formatted;
    }
    return adminDetailText_(value);
  }

  var kq = {
    dasarKehadiran: textValue_(row[C.DASAR_KEGIATAN]),
    namaKegiatan: textValue_(row[C.NAMA_KEGIATAN]),
    tanggalPelaksanaan: textValue_(row[C.TANGGAL_KEGIATAN], { dateOnly: true }),
    tempatLokasi: textValue_(row[C.LOKASI_KEGIATAN]),
    penyelenggara: textValue_(row[C.PENYELENGGARA]),
    peranPartisipasi: textValue_(row[C.PERAN])
  };

  // Kirim tiga jalur sekaligus agar renderer lama maupun baru tetap mendapat data.
  item.detailKolomUtama = kq;
  item.dasarKehadiran = kq.dasarKehadiran;
  item.namaKegiatan = kq.namaKegiatan;
  item.tanggalPelaksanaan = kq.tanggalPelaksanaan;
  item.tempatLokasi = kq.tempatLokasi;
  item.penyelenggara = kq.penyelenggara;
  item.peranPartisipasi = kq.peranPartisipasi;

  if (!item.spreadsheetDetail) {
    item.spreadsheetDetail = {
      title: 'Detail Laporan dari Spreadsheet',
      source: 'Rekap_Kinerja',
      note: 'Data detail dibaca langsung dari kolom K-Q dan kolom detail AD-BQ.',
      fields: []
    };
  }
  if (!Array.isArray(item.spreadsheetDetail.fields)) item.spreadsheetDetail.fields = [];

  function upsertField_(kolom, label, value) {
    kolom = String(kolom || '').toUpperCase();
    var fields = item.spreadsheetDetail.fields;
    var found = null;
    for (var i = 0; i < fields.length; i++) {
      if (String((fields[i] && fields[i].kolom) || '').toUpperCase() === kolom) {
        found = fields[i];
        break;
      }
    }
    var normalizedValue = value || '-';
    if (found) {
      found.label = found.label || label;
      found.value = normalizedValue;
      found.longText = !!found.longText;
    } else {
      fields.push({ kolom: kolom, label: label, value: normalizedValue, longText: false });
    }
  }

  upsertField_('K', 'Dasar Kehadiran', kq.dasarKehadiran);
  upsertField_('M', 'Nama Kegiatan', kq.namaKegiatan);
  upsertField_('N', 'Tanggal Pelaksanaan', kq.tanggalPelaksanaan);
  upsertField_('O', 'Tempat / Lokasi', kq.tempatLokasi);
  upsertField_('P', 'Penyelenggara / Pihak Terkait', kq.penyelenggara);
  upsertField_('Q', 'Peran / Partisipasi', kq.peranPartisipasi);

  return item;
}
// ===== END REVIEW ADMIN v27 =====

function ambilDaftarPegawaiReviewAdmin(token) {
  try {
    // Step 1: Validasi session
    var idUser = validasiSession(token);
    if (!idUser) {
      Logger.log("DEBUG: Session invalid or expired");
      return { sukses: false, pesan: "Sesi habis, silakan login ulang.", data: [], debug: "SESSION_INVALID" };
    }

    // Step 2: Cek akses admin
    if (!cekHakAksesAdmin(idUser)) {
      Logger.log("DEBUG: User " + idUser + " bukan admin");
      return { sukses: false, pesan: "Akses ditolak. Hanya admin yang dapat mengakses menu ini.", data: [], debug: "NOT_ADMIN" };
    }

    // Step 3: Load data pegawai
    var data = getPegawaiDataCached_();
    if (!data) {
      Logger.log("DEBUG: getPegawaiDataCached_ returned null");
      return { sukses: false, pesan: "Data pegawai tidak dapat dimuat. Pastikan sheet 'Data_Pegawai' sudah diisi.", data: [], debug: "DATA_NULL" };
    }

    if (data.length === 0) {
      Logger.log("DEBUG: Data pegawai kosong");
      return { sukses: false, pesan: "Tidak ada data pegawai di sheet.", data: [], debug: "DATA_EMPTY" };
    }

    // Step 4: Filter & build list
    var list = [];
    Logger.log("DEBUG: Processing " + (data.length - 1) + " rows (excluding header)");

    for (var i = 1; i < data.length; i++) {
      if (!data[i] || !data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]) {
        Logger.log("DEBUG: Skipping row " + i + " - empty ID");
        continue;
      }

      var idPegawai = data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID].toString();
      var username = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] || '').toString();
      var nama = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || '').toString();
      var jabatan = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || '').toString();

      // Skip Lurah (karena Lurah adalah role penyetuju, bukan pegawai yang di-review)
      if (isLurah_(jabatan)) {
        Logger.log("DEBUG: Skipping row " + i + " - Lurah (" + nama + ")");
        continue;
      }

      // Skip jika nama kosong
      if (!nama) {
        Logger.log("DEBUG: Skipping row " + i + " - empty nama");
        continue;
      }

      list.push({
        id: idPegawai,
        username: username,
        nama: nama,
        jabatan: jabatan
      });

      Logger.log("DEBUG: Added pegawai: " + nama + " (" + username + ") - " + jabatan);
    }

    // Sort by nama
    list.sort(function (a, b) {
      return (a.nama || '').localeCompare((b.nama || ''), 'id', { sensitivity: 'base' });
    });

    Logger.log("DEBUG: Final list count: " + list.length);

    if (list.length === 0) {
      return { sukses: false, pesan: "Tidak ada pegawai yang tersedia untuk direview (mungkin hanya ada Lurah).", data: [], debug: "NO_PEGAWAI_AFTER_FILTER" };
    }

    return { sukses: true, data: list, debug: "OK" };
  } catch (e) {
    return handleError("ambilDaftarPegawaiReviewAdmin", e, { sukses: false, pesan: "", data: [], debug: "" });
  }
}

function ambilLaporanAdminPerPegawai(idPegawai, filterStatus, tanggalMulai, tanggalAkhir, offset, limit, token) {
  // Kompatibilitas versi lama:
  // ambilLaporanAdminPerPegawai(idPegawai, filterStatus, tanggalMulai, tanggalAkhir, token)
  // ambilLaporanAdminPerPegawai(idPegawai, filterStatus, token)
  if (typeof token === 'undefined') {
    if (typeof limit === 'undefined' && typeof offset !== 'undefined') {
      token = offset;
      offset = 0;
      limit = 10;
    } else if (typeof offset === 'undefined' && typeof tanggalMulai !== 'undefined' && typeof tanggalAkhir === 'undefined') {
      token = tanggalMulai;
      tanggalMulai = '';
      tanggalAkhir = '';
      offset = 0;
      limit = 10;
    }
  }

  var startOffset = parseInt(offset, 10);
  if (isNaN(startOffset) || startOffset < 0) startOffset = 0;

  var pageSize = parseInt(limit, 10);
  if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
  if (pageSize > 30) pageSize = 30;
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", pegawai: null, summary: {}, items: [] };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: "Akses ditolak.", pegawai: null, summary: {}, items: [] };

    var targetId = normalizeId_(idPegawai);
    if (!targetId) return { sukses: false, pesan: "Pegawai belum dipilih.", pegawai: null, summary: {}, items: [] };

    var pegawai = getPegawaiById_(targetId);
    var pegawaiInfo = pegawai ? {
      id: normalizeId_(pegawai.id || targetId),
      username: pegawai.username || '',
      nama: pegawai.nama || '',
      jabatan: pegawai.jabatan || ''
    } : { id: targetId, username: '', nama: '', jabatan: '' };

    var normalizedFilter = (filterStatus || 'semua').toString().toLowerCase();

    var startDate = parseDateOnly_(tanggalMulai);
    var endDate = parseDateOnly_(tanggalAkhir);
    if (!startDate || !endDate) {
      var now = new Date();
      var cutoffDay = 25;
      var endYear = now.getFullYear();
      var endMonth = now.getMonth();
      if (now.getDate() > cutoffDay) {
        var nextMonth = new Date(endYear, endMonth + 1, 1);
        endYear = nextMonth.getFullYear();
        endMonth = nextMonth.getMonth();
      }
      endDate = new Date(endYear, endMonth, cutoffDay);
      startDate = new Date(endYear, endMonth - 1, cutoffDay + 1);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    }

    var data = getRekapKinerjaValuesReadOnly_();
    var hasil = [];
    var lampiranCache = {};
    var summary = {
      totalLaporan: 0,
      totalMenunggu: 0,
      totalSelesai: 0
    };

    var totalFiltered = 0;

    // Urutkan lama ke baru sejak backend agar pagination tidak terus mengambil laporan terbaru.
    for (var i = 1; i < data.length; i++) {
      var rowId = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
      if (!idsEqual_(rowId, targetId)) continue;

      var jabatanRow = (data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || '').toString();
      if (isLurah_(jabatanRow)) continue;

      if (!pegawaiInfo.nama) pegawaiInfo.nama = data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA].toString() : '';
      if (!pegawaiInfo.jabatan) pegawaiInfo.jabatan = jabatanRow;

      var tglRow = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglRow instanceof Date) || isNaN(tglRow.getTime())) continue;
      if (tglRow < startDate || tglRow > endDate) continue;

      var status = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '').toString();
      summary.totalLaporan++;
      if (isPendingReviewStatus_(status)) summary.totalMenunggu++;
      else summary.totalSelesai++;

      if (normalizedFilter === 'menunggu' && !isPendingReviewStatus_(status)) continue;

      totalFiltered++;
      if (totalFiltered <= startOffset) continue;
      if (hasil.length >= pageSize) continue;

      var reviewItem = buildAdminReviewItemFromRow_(data[i], lampiranCache);
      hasil.push(injectKolomKQKeItemReview_(reviewItem, data[i]));
    }

    var nextOffset = startOffset + hasil.length;

    return {
      sukses: true,
      pegawai: pegawaiInfo,
      summary: summary,
      items: hasil,
      offset: startOffset,
      limit: pageSize,
      nextOffset: nextOffset,
      hasMore: nextOffset < totalFiltered,
      totalFiltered: totalFiltered,
      tanggalMulai: Utilities.formatDate(startDate, 'GMT+7', 'yyyy-MM-dd'),
      tanggalAkhir: Utilities.formatDate(endDate, 'GMT+7', 'yyyy-MM-dd')
    };
  } catch (e) {
    return handleError("ambilLaporanAdminPerPegawai", e, { sukses: false, pesan: "", pegawai: null, summary: {}, items: [] });
  }
}

function ambilSemuaLaporanAdmin(token) {
  var idUser = validasiSession(token);
  if (!idUser) return [];
  if (!cekHakAksesAdmin(idUser)) return [];

  var sheet = getSheet_("Rekap_Kinerja");
  var data = sheet.getDataRange().getValues();
  var hasil = [];
  var lampiranCache = {};

  for (var i = data.length - 1; i >= 1; i--) {
    var jabatanPegawai = data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN].toString().toLowerCase() : "";
    if (jabatanPegawai.indexOf("lurah") !== -1) continue;
    var reviewItem = buildAdminReviewItemFromRow_(data[i], lampiranCache);
      hasil.push(injectKolomKQKeItemReview_(reviewItem, data[i]));
  }

  return hasil;
}


function ambilTimelinePublik(token, offset, limit) {
  var idUser = validasiSession(token);
  if (!idUser) {
    return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", items: [], nextOffset: 0, hasMore: false, totalApproved: 0 };
  }

  var start = parseInt(offset, 10);
  if (isNaN(start) || start < 0) start = 0;

  var pageSize = parseInt(limit, 10);
  if (isNaN(pageSize) || pageSize < 1) pageSize = 12;
  if (pageSize > 30) pageSize = 30;

  var sheet = getSheet_("Rekap_Kinerja");
  var data = sheet.getDataRange().getValues();
  var hasil = [];
  var totalApproved = 0;
  var lampiranCache = {};

  for (var i = data.length - 1; i >= 1; i--) {
    var status = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString();
    if (!isStatusApproved_(status)) continue;

    totalApproved++;
    if (totalApproved <= start) continue;
    if (hasil.length >= pageSize) continue;

    var w = data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
    var waktuObj = parseTanggal(w);
    var waktuTeks = (waktuObj instanceof Date && !isNaN(waktuObj.getTime()))
      ? Utilities.formatDate(waktuObj, "GMT+7", "dd/MM/yyyy HH:mm")
      : (w ? w.toString() : "");

    var urlDasar = data[i][SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL].toString() : "";
    var dokumenDasarMeta = buildDriveLampiranMeta_(urlDasar, "Dokumen Dasar", lampiranCache);

    var urlVisuals = data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL].toString().split(",") : [];
    var buktiVisualMeta = [];
    for (var u = 0; u < urlVisuals.length; u++) {
      var link = (urlVisuals[u] || "").toString().trim();
      if (!link) continue;
      var label = urlVisuals.length > 1 ? "Bukti Visual " + (u + 1) : "Bukti Visual";
      var meta = buildDriveLampiranMeta_(link, label, lampiranCache);
      if (!meta || !meta.safeUrl) continue;
      buktiVisualMeta.push(meta);
    }

    hasil.push({
      idLaporan: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
      idUser: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]),
      waktu: waktuTeks,
      waktuSort: (waktuObj instanceof Date && !isNaN(waktuObj.getTime())) ? waktuObj.getTime() : 0,
      nama: data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || '-',
      jabatan: data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || '-',
      kategori: data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '-',
      deskripsi: data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-',
      status: status || '-',
      poinFinal: Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
      dokumenDasar: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta : null,
      urlDasarRaw: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta.safeUrl : '',
      buktiVisualMeta: buktiVisualMeta,
      buktiVisual: buktiVisualMeta,
      urlVisualRaw: buktiVisualMeta.map(function (item) { return item.safeUrl; })
    });
  }

  return {
    sukses: true,
    items: hasil,
    nextOffset: start + hasil.length,
    hasMore: totalApproved > (start + hasil.length),
    totalApproved: totalApproved
  };
}

function prosesReviewAdmin(idLaporan, status, poinFinal, catatan, token) {
  var idAdmin = validasiSession(token);
  if (!idAdmin) return { pesan: "Sesi habis." };
  if (!cekHakAksesAdmin(idAdmin)) return { pesan: "Akses Ditolak! Anda bukan Admin." };

  var targetIdLaporan = normalizeId_(idLaporan);
  if (!targetIdLaporan) return { pesan: "ID laporan tidak valid." };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { pesan: "Server sedang memproses data lain. Coba lagi beberapa saat." };
  }

  var auditReviewDetail = "";
  var hasilReview = null;
  try {
    var sheet = getSheet_("Rekap_Kinerja");
    var targetRow = cariRowRekapKinerjaById_(sheet, targetIdLaporan);
    if (!targetRow) {
      hasilReview = { pesan: "Laporan tidak ditemukan." };
      return hasilReview;
    }

    // Baca ulang baris setelah lock didapat. Jangan memakai nomor baris dari frontend.
    var lastColumn = sheet.getLastColumn();
    var rowRange = sheet.getRange(targetRow, 1, 1, lastColumn);
    var row = rowRange.getValues()[0];
    var rowIdLaporan = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    if (!idsEqual_(rowIdLaporan, targetIdLaporan)) {
      hasilReview = { pesan: "Laporan berubah saat diproses. Muat ulang daftar lalu coba lagi." };
      return hasilReview;
    }

    var statusSimpan = (status || "").toString();
    var poinSimpan = Number(poinFinal) || 0;
    var catatanSimpan = (catatan || "").toString();
    var evalCutoff = evaluasiCutoffLaporan_(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);

    var payloadReviewAdmin = null;
    try {
      var rawPayloadReviewAdmin = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON];
      if ((rawPayloadReviewAdmin === null || rawPayloadReviewAdmin === undefined || rawPayloadReviewAdmin === '') &&
          SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON !== undefined) {
        rawPayloadReviewAdmin = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON];
      }
      if (rawPayloadReviewAdmin !== null && rawPayloadReviewAdmin !== undefined && rawPayloadReviewAdmin !== '') {
        payloadReviewAdmin = JSON.parse(rawPayloadReviewAdmin);
      }
    } catch (ePayloadReviewAdmin) {
      payloadReviewAdmin = null;
    }
    var tanggalPelaksanaanReviewAdmin = row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_KEGIATAN] || adminTanggalPelaksanaanDariPayload_(payloadReviewAdmin);
    var kategoriReviewAdmin = (row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '').toString();
    var isLaporanWajibBulananAdmin = isKategoriWajibBulanan_(kategoriReviewAdmin);
    if (isLaporanWajibBulananAdmin) evalCutoff = null;
    // Laporan wajib bulanan dinilai dengan periode BULAN LAPORAN/Pasal 33,
    // bukan dengan tanggal pelaksanaan kegiatan biasa.
    var evalPeriodePelaksanaanAdmin = isLaporanWajibBulananAdmin
      ? null
      : evaluasiPeriodePelaksanaanReviewAdmin_(tanggalPelaksanaanReviewAdmin, row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
    var harusLewatCutoffAdmin = !!(evalCutoff && evalCutoff.valid && evalCutoff.lewatCutoff) ||
      !!(evalPeriodePelaksanaanAdmin && evalPeriodePelaksanaanAdmin.valid && evalPeriodePelaksanaanAdmin.periodeDitutup);

    if (isStatusApproved_(statusSimpan) && harusLewatCutoffAdmin) {
      statusSimpan = statusReviewLewatCutoff_();
      poinSimpan = 0;
      if (evalCutoff && evalCutoff.valid && evalCutoff.lewatCutoff) {
        catatanSimpan = gabungCatatanCutoff_(catatanSimpan, evalCutoff.meta);
      } else {
        catatanSimpan = gabungCatatanPeriodePelaksanaanDitutup_(catatanSimpan, evalPeriodePelaksanaanAdmin);
      }
    }

    var waktuReview = (isStatusApproved_(statusSimpan) || isStatusLewatCutoff_(statusSimpan)) ? new Date() : "";

    // Status review dan poin final berdampingan, sehingga bisa ditulis dalam satu call.
    // Catatan dan waktu review ditulis terpisah agar tidak menimpa kolom ID/formula lain.
    sheet.getRange(targetRow, SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW + 1, 1, 2).setValues([[statusSimpan, poinSimpan]]);
    sheet.getRange(targetRow, SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN + 1).setValue(catatanSimpan);
    sheet.getRange(targetRow, SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN + 1).setValue(waktuReview);
    invalidasiCacheRekapKinerjaReadOnly_();

    auditReviewDetail = targetIdLaporan + " | row " + targetRow + " | " + statusSimpan + " | " + poinSimpan;
    if (isStatusLewatCutoff_(statusSimpan)) {
      hasilReview = { pesan: "Review disimpan sebagai 'Disetujui - Lewat Cut-off'. Poin dibuat 0 dan tidak masuk tunjangan periode berjalan." };
    } else {
      hasilReview = { pesan: "Review berhasil disimpan!" };
    }
    return hasilReview;
  } finally {
    lock.releaseLock();
    if (auditReviewDetail) {
      logAudit(idAdmin, "REVIEW_LAPORAN", auditReviewDetail);
    }
  }
}

function ambilNarasiBulananTersimpan_(periode, idUser) {
  try {
    var sheet = getSheet_("Rekap_Bulanan");
    if (!sheet || sheet.getLastRow() < 2) return null;

    var data = sheet.getDataRange().getValues();
    var best = null;
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i] || [];
      var rowPeriode = String(row[0] || '').trim();
      var rowUser = normalizeId_(row[1]);
      var narasi = String(row[5] || '').trim();
      if (rowPeriode === String(periode || '').trim() && idsEqual_(rowUser, idUser) && narasi) {
        best = {
          periode: rowPeriode,
          idUser: rowUser,
          nama: row[2] || '',
          jabatan: row[3] || '',
          jumlahLaporan: Number(row[4]) || 0,
          narasi: narasi,
          dibuatPada: formatTanggalJamIndonesia_(row[6]),
          modelAI: row[7] || ''
        };
        break;
      }
    }
    return best;
  } catch (e) {
    Logger.log('ambilNarasiBulananTersimpan_ warning: ' + (e && e.message ? e.message : e));
    return null;
  }
}

function potongTeksUntukPrompt_(text, maxLen) {
  var s = String(text || '').replace(/\s+/g, ' ').trim();
  maxLen = Number(maxLen) || 700;
  if (s.length <= maxLen) return s;
  return s.substring(0, maxLen - 20) + ' ...[dipersingkat]';
}

function ekstrakTeksGemini_(raw) {
  try {
    var obj = JSON.parse(raw || '{}');
    return obj && obj.candidates && obj.candidates[0] && obj.candidates[0].content &&
      obj.candidates[0].content.parts && obj.candidates[0].content.parts[0] &&
      obj.candidates[0].content.parts[0].text ? String(obj.candidates[0].content.parts[0].text).trim() : '';
  } catch (e) {
    return '';
  }
}

function pesanErrorGemini_(raw) {
  try {
    var obj = JSON.parse(raw || '{}');
    if (obj && obj.error && obj.error.message) return String(obj.error.message || '');
  } catch (e) { }
  return '';
}

function panggilGeminiDenganRetry_(apiKey, promptAI) {
  var baseUrlStr = 'https://' + 'generativelanguage.googleapis.com';
  var apiEndPointStr = baseUrlStr + '/v1beta/models/gemini-2.5-flash:generateContent?key=';
  var maxPercobaan = 3;
  var lastStatus = 0;
  var lastError = '';

  for (var coba = 1; coba <= maxPercobaan; coba++) {
    try {
      var response = UrlFetchApp.fetch(apiEndPointStr + apiKey, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ parts: [{ text: promptAI }] }],
          generationConfig: {
            temperature: 0.35,
            topP: 0.9
          }
        })
      });

      lastStatus = response.getResponseCode ? response.getResponseCode() : 0;
      var raw = response.getContentText();
      var textAI = ekstrakTeksGemini_(raw);
      if (lastStatus >= 200 && lastStatus < 300 && textAI) {
        return { sukses: true, text: textAI, percobaan: coba, statusCode: lastStatus };
      }

      lastError = pesanErrorGemini_(raw) || ('HTTP ' + lastStatus);
      var bolehRetry = lastStatus === 0 || lastStatus === 408 || lastStatus === 409 || lastStatus === 429 || lastStatus === 500 || lastStatus === 502 || lastStatus === 503 || lastStatus === 504 || !textAI;
      if (!bolehRetry || coba === maxPercobaan) break;

      Utilities.sleep(coba * 1500);
    } catch (e) {
      lastError = (e && e.message) ? e.message : String(e);
      if (coba === maxPercobaan) break;
      Utilities.sleep(coba * 1500);
    }
  }

  return {
    sukses: false,
    statusCode: lastStatus,
    pesan: lastError || 'Layanan AI tidak merespons.'
  };
}

function generateNarasiBulananAI(bulanTahun, token, forceRegenerate) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis, silakan login ulang.' };

    if (!bulanTahun) return { sukses: false, pesan: 'Pilih bulan dan tahun terlebih dahulu.' };

    var periode = String(bulanTahun || '').trim();
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      return { sukses: false, pesan: 'Format bulan tidak valid.' };
    }

    // Cache sederhana: kalau narasi periode ini sudah pernah dibuat, tampilkan ulang.
    // Ini mengurangi klik ulang ke Gemini saat layanan Google sedang sibuk.
    if (!forceRegenerate) {
      var cached = ambilNarasiBulananTersimpan_(periode, idUser);
      if (cached && cached.narasi) {
        return {
          sukses: true,
          narasi: cached.narasi,
          dariCache: true,
          pesan: 'Narasi bulan ini sudah pernah dibuat. Ditampilkan dari arsip sehingga tidak perlu memanggil AI lagi.',
          dibuatPada: cached.dibuatPada,
          jumlahLaporan: cached.jumlahLaporan
        };
      }
    }

    var props = PropertiesService.getScriptProperties();
    var apiKey = (props.getProperty('API_KEY_GEMINI') || '').trim();
    if (!apiKey) {
      return { sukses: false, pesan: 'API Key Gemini belum diatur oleh Admin.' };
    }

    var parts = periode.split('-');
    var targetTahun = parseInt(parts[0], 10);
    var targetBulan = parseInt(parts[1], 10) - 1;
    if (isNaN(targetTahun) || isNaN(targetBulan) || targetBulan < 0 || targetBulan > 11) {
      return { sukses: false, pesan: 'Bulan/tahun tidak valid.' };
    }

    var dataPegawai = getPegawaiDataCached_();
    var nama = ''; var jabatan = '';
    if (dataPegawai) {
      for (var p = 1; p < dataPegawai.length; p++) {
        if (idsEqual_(dataPegawai[p][SHEET_COLUMNS.DATA_PEGAWAI.ID], idUser)) {
          nama = dataPegawai[p][SHEET_COLUMNS.DATA_PEGAWAI.NAMA];
          jabatan = dataPegawai[p][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN];
          break;
        }
      }
    }

    var data = getRekapKinerjaValuesReadOnly_();
    var listKegiatan = [];

    for (var i = 1; i < data.length; i++) {
      if (idsEqual_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER], idUser)) {
        var status = data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW];
        if (isStatusApproved_(status)) {
          var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
          if (tglLap instanceof Date && !isNaN(tglLap.getTime()) && tglLap.getFullYear() === targetTahun && tglLap.getMonth() === targetBulan) {
            var namaKeg = data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA_KEGIATAN] || data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '-';
            var deskripsi = potongTeksUntukPrompt_(data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-', 700);
            listKegiatan.push('- Tanggal: ' + Utilities.formatDate(tglLap, 'GMT+7', 'dd/MM/yyyy') + ' | Kegiatan: ' + namaKeg + ' | Hasil/Deskripsi: ' + deskripsi);
          }
        }
      }
    }

    if (listKegiatan.length === 0) {
      return { sukses: false, pesan: 'Anda belum memiliki Laporan Kinerja yang DISETUJUI pada bulan tersebut.' };
    }

    var namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][targetBulan];
    var promptAI = 'Anda adalah Asisten Tata Usaha Pemerintahan Kalurahan Minomartani. Berikut adalah rekapitulasi data mentah daftar laporan kinerja harian yang telah diselesaikan oleh ' + nama + ' dengan jabatan selaku ' + jabatan + ' selama satu bulan penuh pada bulan ' + namaBulan + ' tahun ' + targetTahun + ':\n\n' +
      listKegiatan.join('\n') + '\n\n' +
      'Tugas Anda: Susun data tersebut menjadi Laporan Narasi Kinerja Bulanan yang komprehensif, terstruktur, dan formal. Gunakan hanya fakta yang tersedia pada data di atas. Jangan menambah kegiatan, hasil, lokasi, pihak, angka, atau keputusan baru yang tidak ada dalam data. Kelompokkan kegiatan yang sejenis bila relevan, tetapi jangan mengubah substansi. Gunakan bahasa Indonesia baku standar tata naskah Pemerintahan Desa/Kalurahan. Jangan gunakan format blok kode Markdown/JSON; balas langsung dengan teks narasi yang siap disalin ke Microsoft Word.';

    var hasilAI = panggilGeminiDenganRetry_(apiKey, promptAI);
    if (!hasilAI.sukses || !hasilAI.text) {
      return {
        sukses: false,
        pesan: 'Layanan AI Google sedang sibuk atau lambat merespons. Sistem sudah mencoba ulang otomatis, tetapi belum berhasil. Silakan coba lagi beberapa menit lagi.',
        detail: hasilAI.pesan || '',
        statusCode: hasilAI.statusCode || ''
      };
    }

    simpanRekapBulanan_(periode, idUser, nama, jabatan, listKegiatan.length, hasilAI.text, 'gemini-2.5-flash');
    return {
      sukses: true,
      narasi: hasilAI.text,
      dariCache: false,
      percobaan: hasilAI.percobaan || 1,
      pesan: hasilAI.percobaan > 1 ? 'Narasi berhasil dibuat setelah percobaan ulang otomatis.' : 'Narasi berhasil dibuat.',
      jumlahLaporan: listKegiatan.length
    };

  } catch (e) {
    Logger.log('generateNarasiBulananAI ERROR: ' + ((e && e.stack) ? e.stack : e));
    // FIX: detail teknis tidak dikembalikan ke client untuk menghindari
    // ekspos struktur internal sistem via network inspector.
    return {
      sukses: false,
      pesan: 'Layanan narasi sedang tidak siap. Silakan coba beberapa menit lagi atau hubungi admin bila berulang.'
    };
  }
}

// ===== DASHBOARD ADMIN KINERJA (STABLE FIX) =====
function formatWaktuAdmin_(w) {
  try {
    var d;
    if (w instanceof Date) {
      d = w;
    } else {
      d = parseTanggal(w);
    }

    if (d instanceof Date && !isNaN(d.getTime())) {
      // Format untuk kartu Review Admin: "01 April 2026 14:37"
      // Jam disertakan agar label "Waktu Lapor" benar-benar menunjukkan waktu pengajuan laporan.
      var bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      var tgl = String(d.getDate()).padStart(2, '0');
      var bln = bulan[d.getMonth()];
      var thn = d.getFullYear();
      var jam = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return tgl + ' ' + bln + ' ' + thn + ' ' + jam;
    }
    return (w || "").toString();
  } catch (e) {
    return (w || "").toString();
  }
}

function parsePeriodeBulan_(periode) {
  var p = (periode || "").toString().trim();
  var m = p.match(/^(\d{4})-(\d{2})$/);
  var now = new Date();
  var year = m ? parseInt(m[1], 10) : now.getFullYear();
  var month = m ? (parseInt(m[2], 10) - 1) : now.getMonth();
  if (month < 0 || month > 11) month = now.getMonth();

  var start = new Date(year, month, 1, 0, 0, 0, 0);
  var end = new Date(year, month + 1, 1, 0, 0, 0, 0);
  var triMonth = Math.floor(month / 3) * 3;
  var triStart = new Date(year, triMonth, 1, 0, 0, 0, 0);
  var triEnd = new Date(year, triMonth + 3, 1, 0, 0, 0, 0);
  return {
    periode: Utilities.formatDate(start, 'GMT+7', 'yyyy-MM'),
    year: year,
    month: month,
    start: start,
    end: end,
    triStart: triStart,
    triEnd: triEnd
  };
}

function hitungPredikatAdminKinerja_(totalPoin, kelompok) {
  var poin = Number(totalPoin) || 0;
  var out = { label: 'Perlu Pembinaan', warna: 'bg-red' };
  if (poin >= 900) out = { label: 'Sangat Baik', warna: 'bg-green' };
  else if (poin >= 800) out = { label: 'Baik', warna: 'bg-green' };
  else if (poin >= 650) out = { label: 'Cukup', warna: 'bg-yellow' };
  return out;
}

function pilihTopBottomPerformer_(rows) {
  var kandidat = (rows || []).filter(function (r) {
    return Number(r.jumlahLaporan || 0) > 0;
  });
  if (!kandidat.length) return { top: null, bottom: null };

  var top = kandidat.slice().sort(function (a, b) {
    var diff = (Number(b.totalPoin || 0) - Number(a.totalPoin || 0));
    if (diff !== 0) return diff;
    diff = (Number(b.jumlahDisetujui || 0) - Number(a.jumlahDisetujui || 0));
    if (diff !== 0) return diff;
    diff = (Number(b.estimasiTunjangan || 0) - Number(a.estimasiTunjangan || 0));
    if (diff !== 0) return diff;
    return (a.nama || '').localeCompare(b.nama || '');
  })[0] || null;

  var bottom = kandidat.slice().sort(function (a, b) {
    var diff = (Number(a.totalPoin || 0) - Number(b.totalPoin || 0));
    if (diff !== 0) return diff;
    diff = (Number(a.jumlahDisetujui || 0) - Number(b.jumlahDisetujui || 0));
    if (diff !== 0) return diff;
    diff = (Number(b.jumlahMenunggu || 0) - Number(a.jumlahMenunggu || 0));
    if (diff !== 0) return diff;
    return (a.nama || '').localeCompare(b.nama || '');
  })[0] || null;

  return { top: top, bottom: bottom };
}

function formatDistribusiPredikatAdmin_(d) {
  d = d || {};
  return {
    sangatBaik: Number(d.sangatBaik || 0),
    baik: Number(d.baik || 0),
    cukup: Number(d.cukup || 0),
    perluPembinaan: Number(d.perluPembinaan || 0)
  };
}

function ambilDashboardAdminKinerja(periode, kelompok, keyword, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', summary: {}, rows: [] };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: 'Akses ditolak.', summary: {}, rows: [] };

    var meta = parsePeriodeBulan_(periode);
    var keyKelompok = (kelompok || 'Semua').toString();
    var q = (keyword || '').toString().trim().toLowerCase();

    var pegSheet = getSheet_('Data_Pegawai');
    var pegData = pegSheet.getDataRange().getValues();
    var rowsById = {};

    for (var i = 1; i < pegData.length; i++) {
      var idPeg = normalizeId_(pegData[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]);
      var username = (pegData[i][SHEET_COLUMNS.DATA_PEGAWAI.USERNAME] || '').toString();
      var nama = (pegData[i][SHEET_COLUMNS.DATA_PEGAWAI.NAMA] || '').toString();
      var jabatan = (pegData[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || '').toString();
      var statusAktif = (pegData[i][SHEET_COLUMNS.DATA_PEGAWAI.STATUS] || '').toString().toLowerCase();
      var jLow = normalizeJabatan_(jabatan);
      if (!idPeg || !nama || !jabatan) continue;
      if (statusAktif && statusAktif.indexOf('nonaktif') !== -1) continue;
      if (jLow.indexOf('phl') !== -1 || jLow.indexOf('lepas') !== -1) continue;
      if (jLow.indexOf('lurah') !== -1) continue;
      rowsById[idPeg] = {
        idUser: idPeg,
        username: username,
        nama: nama,
        jabatan: jabatan,
        kelompok: identifikasiKelompok_(jabatan),
        jumlahLaporan: 0,
        jumlahDisetujui: 0,
        jumlahMenunggu: 0,
        totalPoin: 0,
        poinProd: 0,
        poinTU: 0,
        estimasiTunjangan: 0,
        predikat: '-',
        warnaPredikat: 'bg-gray'
      };
    }

    var data = getRekapKinerjaValuesReadOnly_();
    for (var r = 1; r < data.length; r++) {
      var rowId = data[r][SHEET_COLUMNS.REKAP_KINERJA.ID_USER] != null ? data[r][SHEET_COLUMNS.REKAP_KINERJA.ID_USER].toString() : '';
      if (!rowId || !rowsById[rowId]) continue;
      var tglLap = parseTanggal(data[r][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;
      var status = (data[r][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '').toString();
      var kategori = (data[r][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '').toString();
      var poin = Number(data[r][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
      var row = rowsById[rowId];

      if (tglLap >= meta.start && tglLap < meta.end) {
        row.jumlahLaporan++;
        if (isStatusApproved_(status)) {
          row.jumlahDisetujui++;
          if (isKategoriProduktivitas_(kategori)) {
            if (!isKategoriWajibBulanan_(kategori)) row.poinProd += poin;
          } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) row.poinTU += poin;
        } else if (isPendingReviewStatus_(status)) {
          row.jumlahMenunggu++;
        }
      }

      if (tglLap >= meta.triStart && tglLap < meta.triEnd && isStatusApproved_(status)) {
        row.totalPoin += poin;
      }
    }

    var rows = Object.keys(rowsById).map(function (idPeg) {
      var row = rowsById[idPeg];
      // Poin produktivitas periode berasal dari POIN_FINAL laporan yang sudah disetujui Admin saja.
      var tunjangan = getTunjanganPegawai_(row.idUser, row.jabatan);
      var maxProd = Number(tunjangan.maxProd) || 0;
      var maxTU = Number(tunjangan.maxTU) || 0;
      var prProd = row.poinProd > 100 ? 100 : row.poinProd;
      var prTU = row.poinTU > 100 ? 100 : row.poinTU;
      row.estimasiTunjangan = ((prProd / 100) * maxProd) + ((prTU / 100) * maxTU);
      var pred = hitungPredikatAdminKinerja_(row.totalPoin, row.kelompok);
      row.predikat = pred.label;
      row.warnaPredikat = pred.warna;
      return row;
    });

    if (keyKelompok && keyKelompok !== 'Semua') {
      rows = rows.filter(function (r) { return (r.kelompok || '') === keyKelompok; });
    }
    if (q) {
      rows = rows.filter(function (r) {
        return (r.nama || '').toLowerCase().indexOf(q) !== -1 ||
          (r.jabatan || '').toLowerCase().indexOf(q) !== -1 ||
          (r.kelompok || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    rows.sort(function (a, b) {
      var diff = Number(b.totalPoin || 0) - Number(a.totalPoin || 0);
      if (diff !== 0) return diff;
      diff = Number(b.jumlahDisetujui || 0) - Number(a.jumlahDisetujui || 0);
      if (diff !== 0) return diff;
      return (a.nama || '').localeCompare(b.nama || '');
    });

    var summary = {
      pegawaiAktif: rows.length,
      laporanMasuk: 0,
      menungguReview: 0,
      estimasiTunjangan: 0,
      belumUnggah: 0,
      topPerformer: '-',
      bottomPerformer: '-',
      distribusiPredikat: { sangatBaik: 0, baik: 0, cukup: 0, perluPembinaan: 0 }
    };

    rows.forEach(function (r) {
      summary.laporanMasuk += Number(r.jumlahLaporan || 0);
      summary.menungguReview += Number(r.jumlahMenunggu || 0);
      summary.estimasiTunjangan += Number(r.estimasiTunjangan || 0);
      if (Number(r.jumlahLaporan || 0) === 0) summary.belumUnggah++;

      if (r.predikat === 'Sangat Baik') summary.distribusiPredikat.sangatBaik++;
      else if (r.predikat === 'Baik') summary.distribusiPredikat.baik++;
      else if (r.predikat === 'Cukup') summary.distribusiPredikat.cukup++;
      else summary.distribusiPredikat.perluPembinaan++;
    });

    var performer = pilihTopBottomPerformer_(rows);
    summary.topPerformer = performer.top ? (performer.top.nama + ' (' + Number(performer.top.totalPoin || 0) + ' poin)') : 'Belum ada kandidat';
    summary.bottomPerformer = performer.bottom ? (performer.bottom.nama + ' (' + Number(performer.bottom.totalPoin || 0) + ' poin)') : 'Belum ada kandidat';
    summary.distribusiPredikat = formatDistribusiPredikatAdmin_(summary.distribusiPredikat);

    return { sukses: true, summary: summary, rows: rows, periode: meta.periode, periodeMeta: dashboardAdminKinerjaPeriodeMeta_(meta) };
  } catch (e) {
    return handleError("muatDashboardAdminKinerja", e, { sukses: false, pesan: "", summary: {}, rows: [] });
  }
}

function ambilDetailPegawaiAdminKinerja(idPegawai, periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: 'Akses ditolak.' };

    var targetId = normalizeId_(idPegawai);
    if (!targetId) return { sukses: false, pesan: 'ID pegawai tidak valid.' };

    var meta = parsePeriodeBulan_(periode);
    var pegawai = getPegawaiById_(targetId);
    var namaPegawai = pegawai && pegawai.nama ? pegawai.nama : '';
    var jabatanPegawai = pegawai && pegawai.jabatan ? pegawai.jabatan : '';
    var kelompokPegawai = jabatanPegawai ? identifikasiKelompok_(jabatanPegawai) : '';

    var data = getRekapKinerjaValuesReadOnly_();
    var detail = {
      jumlahLaporan: 0,
      jumlahDisetujui: 0,
      jumlahMenunggu: 0,
      poinProd: 0,
      poinTU: 0,
      totalPoin: 0,
      estimasiTunjangan: 0,
      predikat: '-'
    };
    var laporan = [];

    for (var i = 1; i < data.length; i++) {
      var rowId = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
      if (!idsEqual_(rowId, targetId)) continue;

      if (!namaPegawai) namaPegawai = data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA].toString() : '';
      if (!jabatanPegawai) jabatanPegawai = data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] ? data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN].toString() : '';
      if (!kelompokPegawai && jabatanPegawai) kelompokPegawai = identifikasiKelompok_(jabatanPegawai);

      var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

      var status = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '').toString();
      var kategori = (data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '').toString();
      var poin = Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;

      if (tglLap >= meta.start && tglLap < meta.end) {
        detail.jumlahLaporan++;
        if (isStatusApproved_(status)) {
          detail.jumlahDisetujui++;
          if (isKategoriProduktivitas_(kategori)) {
            if (!isKategoriWajibBulanan_(kategori)) detail.poinProd += poin;
          } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) detail.poinTU += poin;
        } else if (isPendingReviewStatus_(status)) {
          detail.jumlahMenunggu++;
        }

        laporan.push({
          _ts: tglLap.getTime(),
          waktu: formatWaktuAdmin_(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]),
          kategori: kategori,
          deskripsi: data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-',
          status: status || '-',
          poinFinal: poin,
          catatan: data[i][SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || '-'
        });
      }

      if (tglLap >= meta.triStart && tglLap < meta.triEnd && isStatusApproved_(status)) {
        detail.totalPoin += poin;
      }
    }

    // Detail capaian pegawai juga mengikuti prinsip yang sama: poin hanya dari
    // laporan yang sudah disetujui Admin.
    var tunjangan = getTunjanganPegawai_(targetId, jabatanPegawai);
    var maxProd = Number(tunjangan.maxProd) || 0;
    var maxTU = Number(tunjangan.maxTU) || 0;
    var prProd = detail.poinProd > 100 ? 100 : detail.poinProd;
    var prTU = detail.poinTU > 100 ? 100 : detail.poinTU;
    detail.estimasiTunjangan = ((prProd / 100) * maxProd) + ((prTU / 100) * maxTU);

    var pred = hitungPredikatAdminKinerja_(detail.totalPoin, kelompokPegawai);
    detail.predikat = pred.label;

    laporan.sort(function (a, b) { return (b._ts || 0) - (a._ts || 0); });
    laporan = laporan.slice(0, 10);

    return {
      sukses: true,
      pegawai: {
        idUser: targetId,
        nama: namaPegawai,
        jabatan: jabatanPegawai,
        kelompok: kelompokPegawai
      },
      capaian: detail,
      laporanTerakhir: laporan,
      periodeMeta: dashboardAdminKinerjaPeriodeMeta_(meta)
    };
  } catch (e) {
    return handleError("ambilDetailPegawaiAdminKinerja", e, { sukses: false, pesan: "" });
  }
}
// ===== END DASHBOARD ADMIN KINERJA =====


// ===== DISPOSISI SURAT TAHAP 1C =====
var DISPOSISI_STATUS = APP_SHARED_DEFAULTS.DISPOSISI_STATUS;

var DISPOSISI_BACA = APP_SHARED_DEFAULTS.DISPOSISI_BACA;

var DISPOSISI_TINDAK = APP_SHARED_DEFAULTS.DISPOSISI_TINDAK;

function buatIdDisposisi_() {
  // ID internal harus kuat terhadap collision lintas user/eksekusi.
  // Nomor referensi yang tampil ke user diatur terpisah oleh buatNomorReferensiDisposisi_().
  return "DSP-" + Utilities.getUuid();
}

function nomorReferensiDisposisiSequenceKey_(ymd) {
  return "DISPOSISI_NOMOR_SEQ_" + String(ymd || "");
}

function bacaUrutNomorReferensiDisposisi_(nomor, ymd) {
  var s = String(nomor || "").trim();
  var prefix = "DSP-" + String(ymd || "") + "-";
  if (s.indexOf(prefix) !== 0) return 0;
  var tail = s.substring(prefix.length);
  if (!/^\d+$/.test(tail)) return 0;
  var n = parseInt(tail, 10);
  return isNaN(n) ? 0 : n;
}

function scanNomorReferensiDisposisi_(sh, ymd) {
  var hasil = { max: 0, existing: {} };
  if (!sh) return hasil;
  var data = sh.getDataRange().getValues();
  var C = SHEET_COLUMNS.DISPOSISI_SURAT;
  for (var i = 1; i < data.length; i++) {
    var nomor = String(data[i][C.NOMOR_DISPOSISI] || "").trim();
    if (!nomor) continue;
    hasil.existing[nomor] = true;
    var urut = bacaUrutNomorReferensiDisposisi_(nomor, ymd);
    if (urut > hasil.max) hasil.max = urut;
  }
  return hasil;
}

function buatNomorReferensiDisposisi_(tanggalDisposisi) {
  var d = parseTanggalKosongAman_(tanggalDisposisi) || new Date();
  var ymd = Utilities.formatDate(d, "GMT+7", "yyyyMMdd");

  // Nomor referensi harus unik walaupun dua disposisi dibuat bersamaan.
  // Sequence disimpan di PropertiesService dan dilindungi ScriptLock.
  // Jika request gagal setelah nomor dibuat, nomor bisa terlewati; itu lebih aman
  // daripada menghasilkan nomor disposisi ganda.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("Antrean pembuatan nomor disposisi sedang penuh. Silakan coba lagi beberapa detik lagi.");
  }

  try {
    var sh = ensureSheetDisposisiSurat_();
    var props = PropertiesService.getScriptProperties();
    var key = nomorReferensiDisposisiSequenceKey_(ymd);
    var stored = parseInt(props.getProperty(key) || "0", 10);
    if (isNaN(stored) || stored < 0) stored = 0;

    var scan = scanNomorReferensiDisposisi_(sh, ymd);
    var next = Math.max(stored, scan.max) + 1;
    var nomor = "";

    for (var attempt = 0; attempt < 1000; attempt++) {
      nomor = "DSP-" + ymd + "-" + String(next).padStart(3, '0');
      if (!scan.existing[nomor]) break;
      next++;
    }

    if (scan.existing[nomor]) {
      throw new Error("Gagal membuat nomor disposisi unik. Silakan coba lagi.");
    }

    props.setProperty(key, String(next));
    return nomor;
  } finally {
    try { lock.releaseLock(); } catch (e) { }
  }
}

function parseTanggalKosongAman_(val) {
  if (val === null || val === undefined || val === "") return null;
  var d = parseTanggal(val);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() <= 0) return null;
  return d;
}

function formatTanggalIndonesiaDisposisi_(val, pakaiJam) {
  var d = parseTanggalKosongAman_(val);
  if (!d) return "-";
  return Utilities.formatDate(d, "GMT+7", pakaiJam ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy");
}

function formatTanggalISODisposisi_(val) {
  var d = parseTanggalKosongAman_(val);
  if (!d) return "";
  return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
}

function getFolderRootDisposisi_() {
  var props = PropertiesService.getScriptProperties();
  var folderIdDisposisi = (props.getProperty("FOLDER_ID_DISPOSISI") || "").trim();
  var folderIdBukti = (props.getProperty("FOLDER_ID_BUKTI") || "").trim();
  if (!folderIdDisposisi && !folderIdBukti) {
    throw new Error("Konfigurasi folder disposisi belum diatur. Isi Script Property FOLDER_ID_DISPOSISI atau FOLDER_ID_BUKTI.");
  }
  var root = DriveApp.getFolderById(folderIdDisposisi || folderIdBukti);
  if (!folderIdDisposisi && folderIdBukti) {
    root = dapatkanAtauBuatFolder(root, "DISPOSISI_SURAT");
  }
  return root;
}

function buildNamaFinalLampiranDisposisi_(tanggalDisposisi, nomorDisposisi, perihal, ext) {
  var tanggalLabel = formatTanggalISODisposisi_(tanggalDisposisi) || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  var nomorLabel = nomorDisposisi || "DISPOSISI";
  var perihalLabel = perihal ? sanitizeForSheet_(perihal).substring(0, 80) : "Dokumen_Surat";
  var stamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss");
  return safeUploadFileName_(["Disposisi", tanggalLabel, nomorLabel, perihalLabel, stamp].join("_") + "." + ext);
}

function getTargetFolderLampiranDisposisi_(tanggalDisposisi, isPdf) {
  var root = getFolderRootDisposisi_();
  var d = parseTanggalKosongAman_(tanggalDisposisi) || new Date();
  var tahun = Utilities.formatDate(d, "GMT+7", "yyyy");
  var folderTahun = dapatkanAtauBuatFolder(root, tahun);
  return dapatkanAtauBuatFolder(folderTahun, isPdf ? "PDF" : "FOTO");
}

function simpanLampiranDisposisiBytes_(bytesUpload, mimeType, fileName, nomorDisposisi, tanggalDisposisi, perihal) {
  var oriName = (fileName || "lampiran").toString();
  var validasiFile = validasiBuktiUploadBytes_(bytesUpload, mimeType, oriName);
  if (!validasiFile.sukses) throw new Error('Lampiran disposisi ditolak. ' + validasiFile.pesan);
  var isPdf = validasiFile.mime === "application/pdf";
  var targetFolder = getTargetFolderLampiranDisposisi_(tanggalDisposisi, isPdf);
  var namaFinal = buildNamaFinalLampiranDisposisi_(tanggalDisposisi, nomorDisposisi, perihal, validasiFile.ext);
  var blob = Utilities.newBlob(bytesUpload, validasiFile.mime, namaFinal);
  var f = targetFolder.createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: f.getUrl(), nama: f.getName() || namaFinal, fileId: f.getId(), mime: validasiFile.mime, sizeBytes: bytesUpload.length, isPdf: isPdf };
}

function simpanLampiranDisposisi_(fileData, mimeType, fileName, nomorDisposisi, tanggalDisposisi, perihal) {
  if (!fileData) return { url: "", nama: "" };
  var bytesUpload = Utilities.base64Decode(fileData);
  return simpanLampiranDisposisiBytes_(bytesUpload, mimeType, fileName, nomorDisposisi, tanggalDisposisi, perihal);
}

function uploadLampiranDisposisiBlob(formObj) {
  try {
    var token = formObj && formObj.uploadToken ? String(formObj.uploadToken) : '';
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, pesan: 'Sesi habis. Silakan login ulang.' };

    var canManage = cekHakAksesLurahDisposisi_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();
    var canOperate = !canManage && !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser));
    if (!canManage && !canOperate) {
      return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah atau petugas operator disposisi aktif yang dapat mengunggah lampiran disposisi.' };
    }

    var blob = formObj && formObj.lampiranFile;
    if (Array.isArray(blob)) blob = blob[0];
    if (!blob || typeof blob.getBytes !== 'function') {
      return { sukses: false, pesan: 'Dokumen surat yang didisposisikan tidak terbaca.' };
    }

    var originalName = blob.getName ? (blob.getName() || 'lampiran') : 'lampiran';
    var mimeType = blob.getContentType ? (blob.getContentType() || '') : '';
    var bytes = blob.getBytes();
    var tanggalDisposisi = formObj && formObj.tanggalDisposisi ? String(formObj.tanggalDisposisi) : '';
    var perihal = formObj && formObj.perihal ? String(formObj.perihal) : '';

    var lampiran = simpanLampiranDisposisiBytes_(bytes, mimeType, originalName, 'UPLOAD', tanggalDisposisi, perihal);
    return {
      sukses: true,
      pesan: 'Dokumen surat berhasil diunggah.',
      url: lampiran.url,
      fileId: lampiran.fileId,
      name: lampiran.nama,
      mime: lampiran.mime,
      sizeBytes: lampiran.sizeBytes,
      isPdf: lampiran.isPdf
    };
  } catch (e) {
    return handleError('uploadLampiranDisposisiBlob', e, { sukses: false, pesan: 'Gagal mengunggah dokumen surat disposisi. ' + (e && e.message ? e.message : e) });
  }
}

function normalisasiLampiranDisposisiDariPayload_(payload, nomorDisposisi, tanggalDisposisi, perihal) {
  payload = payload || {};
  if (payload.fileData) {
    return simpanLampiranDisposisi_(payload.fileData, payload.mimeType, payload.fileName, nomorDisposisi, tanggalDisposisi, perihal);
  }

  var fileId = (payload.lampiranFileId || payload.fileId || '').toString().trim();
  if (fileId) {
    var file = DriveApp.getFileById(fileId);
    var bytes = file.getBlob().getBytes();
    var mime = file.getMimeType ? file.getMimeType() : '';
    var validasiFile = validasiBuktiUploadBytes_(bytes, mime, file.getName());
    if (!validasiFile.sukses) throw new Error('Lampiran disposisi ditolak. ' + validasiFile.pesan);
    var namaFinal = buildNamaFinalLampiranDisposisi_(tanggalDisposisi, nomorDisposisi, perihal, validasiFile.ext);
    try { file.setName(namaFinal); } catch (renameErr) {}
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { url: file.getUrl(), nama: file.getName() || namaFinal, fileId: file.getId(), mime: validasiFile.mime, sizeBytes: bytes.length, isPdf: validasiFile.mime === 'application/pdf' };
  }

  var url = safeHttpUrlServer_(payload.lampiranUrl || payload.fileUrl || '');
  if (url) {
    return { url: url, nama: sanitizeForSheet_(payload.lampiranNama || payload.fileName || 'Dokumen Surat') };
  }

  return { url: '', nama: '' };
}

function buatIdLogDisposisi_() {
  return "LOGDSP-" + Utilities.getUuid();
}

function aktorPeranDisposisi_(olehId) {
  try {
    var p = getPegawaiById_(olehId) || {};
    if (p && isLurah_(p.jabatan)) return "LURAH";
    if (isOperatorDisposisiAktif_(olehId)) return "OPERATOR_DISPOSISI";
    return "PEGAWAI";
  } catch (e) {
    return "PEGAWAI";
  }
}

function logDisposisi_(idDisposisi, aksi, olehId, detail, meta) {
  try {
    var sh = ensureSheetDisposisiLog_();
    var pegawai = getPegawaiById_(olehId) || {};
    meta = meta || {};
    var detailJson = meta.detailJson || meta.detail_json || {};
    sh.appendRow([
      new Date(),
      idDisposisi || "",
      aksi || "",
      olehId || "",
      pegawai.nama || "",
      pegawai.jabatan || "",
      detail || "",
      meta.idLog || buatIdLogDisposisi_(),
      meta.aktorPeran || aktorPeranDisposisi_(olehId),
      meta.targetTipe || "",
      meta.targetId || "",
      meta.targetNama || "",
      sanitizeForSheet_(meta.alasan || ""),
      stringifyDetailJson_(detailJson)
    ]);
  } catch (e) {
    Logger.log("Gagal logDisposisi_: " + e.message);
  }
}

function getPegawaiByIdDisposisi_(idUser) {
  var p = getPegawaiById_(idUser);
  if (!p) return null;
  return {
    id: normalizeId_(p.id),
    username: p.username || "",
    nama: p.nama || "",
    jabatan: p.jabatan || "",
    akses: p.akses || ""
  };
}

function uniqueStringArray_(arr) {
  var map = {};
  var out = [];
  (arr || []).forEach(function (v) {
    var s = (v == null ? "" : v.toString().trim());
    if (!s || map[s]) return;
    map[s] = true;
    out.push(s);
  });
  return out;
}


function buatIdPenugasanDisposisi_() {
  return "PTG-" + Utilities.getUuid();
}

function statusPetugasDisposisiAktif_(status) {
  return String(status || "").toUpperCase().trim() === "AKTIF";
}

function rowPetugasDisposisiToObject_(row, rowIndex) {
  row = row || [];
  var C = SHEET_COLUMNS.DISPOSISI_PETUGAS;
  return {
    rowIndex: rowIndex || 0,
    idPenugasan: (row[C.ID_PENUGASAN] || "").toString(),
    pegawaiId: normalizeId_(row[C.PEGAWAI_ID]),
    pegawaiNama: (row[C.PEGAWAI_NAMA] || "").toString(),
    pegawaiJabatan: (row[C.PEGAWAI_JABATAN] || "").toString(),
    statusPetugas: (row[C.STATUS_PETUGAS] || "").toString(),
    ditetapkanOlehId: normalizeId_(row[C.DITETAPKAN_OLEH_ID]),
    ditetapkanOlehNama: (row[C.DITETAPKAN_OLEH_NAMA] || "").toString(),
    ditetapkanPada: row[C.DITETAPKAN_PADA] || "",
    dinonaktifkanOlehId: normalizeId_(row[C.DINONAKTIFKAN_OLEH_ID]),
    dinonaktifkanOlehNama: (row[C.DINONAKTIFKAN_OLEH_NAMA] || "").toString(),
    dinonaktifkanPada: row[C.DINONAKTIFKAN_PADA] || "",
    catatan: (row[C.CATATAN] || "").toString()
  };
}

function petugasDisposisiToClient_(item) {
  if (!item) return null;
  return {
    rowIndex: item.rowIndex || 0,
    idPenugasan: (item.idPenugasan || "").toString(),
    pegawaiId: normalizeId_(item.pegawaiId),
    pegawaiNama: (item.pegawaiNama || "").toString(),
    pegawaiJabatan: (item.pegawaiJabatan || "").toString(),
    statusPetugas: (item.statusPetugas || "").toString(),
    ditetapkanOlehId: normalizeId_(item.ditetapkanOlehId),
    ditetapkanOlehNama: (item.ditetapkanOlehNama || "").toString(),
    ditetapkanPada: formatTanggalIndonesiaDisposisi_(item.ditetapkanPada, true),
    ditetapkanPadaIso: formatTanggalISODisposisi_(item.ditetapkanPada),
    dinonaktifkanOlehId: normalizeId_(item.dinonaktifkanOlehId),
    dinonaktifkanOlehNama: (item.dinonaktifkanOlehNama || "").toString(),
    dinonaktifkanPada: formatTanggalIndonesiaDisposisi_(item.dinonaktifkanPada, true),
    dinonaktifkanPadaIso: formatTanggalISODisposisi_(item.dinonaktifkanPada),
    catatan: (item.catatan || "").toString()
  };
}

function getPetugasDisposisiAktif_() {
  var sh = ensureSheetDisposisiPetugas_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;

  var data = sh.getRange(2, 1, lastRow - 1, DISPOSISI_PETUGAS_HEADERS.length).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    var item = rowPetugasDisposisiToObject_(data[i], i + 2);
    if (statusPetugasDisposisiAktif_(item.statusPetugas) && item.pegawaiId) return item;
  }
  return null;
}

function isOperatorDisposisiAktif_(idUser) {
  var aktif = getPetugasDisposisiAktif_();
  return !!(aktif && idsEqual_(aktif.pegawaiId, idUser));
}

function getPemberiDisposisiUntukOperator_(petugasAktif) {
  petugasAktif = petugasAktif || getPetugasDisposisiAktif_();
  if (!petugasAktif) return null;

  var p = getPegawaiByIdDisposisi_(petugasAktif.ditetapkanOlehId);
  if (p) return p;

  if (petugasAktif.ditetapkanOlehId || petugasAktif.ditetapkanOlehNama) {
    return {
      id: petugasAktif.ditetapkanOlehId || "",
      nama: petugasAktif.ditetapkanOlehNama || "Lurah",
      jabatan: "Lurah",
      username: "",
      akses: ""
    };
  }
  return null;
}

function simpanPetugasDisposisi(payload, token) {
  var lock = LockService.getScriptLock();
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };
    if (!cekHakAksesLurahDisposisi_(idUser)) return { sukses: false, pesan: "Akses ditolak. Hanya Lurah yang dapat menetapkan petugas disposisi." };

    payload = payload || {};
    var pegawaiId = normalizeId_(payload.pegawaiId || payload.petugasId || "");
    if (!pegawaiId) return { sukses: false, pesan: "Pilih petugas operator disposisi terlebih dahulu." };

    var semuaPegawai = getDaftarPegawaiAktifUntukDisposisiInternal_();
    var petugas = null;
    for (var i = 0; i < semuaPegawai.length; i++) {
      if (idsEqual_(semuaPegawai[i].id, pegawaiId)) {
        petugas = semuaPegawai[i];
        break;
      }
    }
    if (!petugas) return { sukses: false, pesan: "Petugas tidak ditemukan atau bukan pegawai aktif yang dapat ditunjuk." };

    var lurah = getPegawaiByIdDisposisi_(idUser);
    if (!lurah) return { sukses: false, pesan: "Data Lurah tidak ditemukan." };

    lock.waitLock(8000);
    var sh = ensureSheetDisposisiPetugas_();
    var now = new Date();
    var lastRow = sh.getLastRow();

    var petugasAktifSebelum = getPetugasDisposisiAktif_();
    if (petugasAktifSebelum && idsEqual_(petugasAktifSebelum.pegawaiId, pegawaiId)) {
      return {
        sukses: true,
        pesan: "Petugas operator sudah aktif: " + petugasAktifSebelum.pegawaiNama,
        petugasAktif: petugasDisposisiToClient_(petugasAktifSebelum)
      };
    }

    if (lastRow >= 2) {
      var data = sh.getRange(2, 1, lastRow - 1, DISPOSISI_PETUGAS_HEADERS.length).getValues();
      for (var r = 0; r < data.length; r++) {
        var item = rowPetugasDisposisiToObject_(data[r], r + 2);
        if (statusPetugasDisposisiAktif_(item.statusPetugas)) {
          var CP = SHEET_COLUMNS.DISPOSISI_PETUGAS;
          sh.getRange(item.rowIndex, CP.STATUS_PETUGAS + 1).setValue("NONAKTIF");
          sh.getRange(item.rowIndex, CP.DINONAKTIFKAN_OLEH_ID + 1).setValue(lurah.id);
          sh.getRange(item.rowIndex, CP.DINONAKTIFKAN_OLEH_NAMA + 1).setValue(lurah.nama);
          sh.getRange(item.rowIndex, CP.DINONAKTIFKAN_PADA + 1).setValue(now);
        }
      }
    }

    var catatan = sanitizeForSheet_(payload.catatan || "Petugas operator disposisi ditetapkan oleh Lurah.");
    var row = [
      buatIdPenugasanDisposisi_(),
      petugas.id,
      petugas.nama,
      petugas.jabatan,
      "AKTIF",
      lurah.id,
      lurah.nama,
      now,
      "",
      "",
      "",
      catatan
    ];
    sh.appendRow(row);

    logDisposisi_("", "TETAPKAN_PETUGAS_DISPOSISI", idUser, "Petugas aktif: " + petugas.nama + " (" + petugas.jabatan + ")", {
      targetTipe: "PETUGAS",
      targetId: petugas.id,
      targetNama: petugas.nama,
      alasan: catatan,
      detailJson: { petugas_id: petugas.id, petugas_nama: petugas.nama, petugas_jabatan: petugas.jabatan, status_petugas: "AKTIF" }
    });

    return {
      sukses: true,
      pesan: "Petugas operator disposisi berhasil ditetapkan: " + petugas.nama,
      petugasAktif: petugasDisposisiToClient_(rowPetugasDisposisiToObject_(row, sh.getLastRow()))
    };
  } catch (e) {
    return handleError("simpanPetugasDisposisi", e, { sukses: false, pesan: "Gagal menyimpan petugas operator: " + (e && e.message ? e.message : e) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


function normalisasiNomorWhatsAppIndonesia_(value) {
  var raw = (value === null || value === undefined) ? "" : String(value).trim();
  if (!raw) return "";
  var digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";

  // Format umum Indonesia: 08xx -> 628xx, +628xx -> 628xx, 8xx -> 628xx.
  if (digits.indexOf("00") === 0) digits = digits.substring(2);
  if (digits.indexOf("0") === 0) digits = "62" + digits.substring(1);
  else if (digits.indexOf("62") === 0) digits = digits;
  else if (digits.indexOf("8") === 0) digits = "62" + digits;
  else return "";

  // Panjang nomor Indonesia umumnya 10-15 digit dalam format internasional.
  if (!/^62\d{8,13}$/.test(digits)) return "";
  return digits;
}

function buildWhatsAppWebUrl_(nomor, pesan) {
  var phone = normalisasiNomorWhatsAppIndonesia_(nomor || "");
  if (!phone) return "";
  return "https://web.whatsapp.com/send?phone=" + encodeURIComponent(phone) + "&text=" + encodeURIComponent(String(pesan || ""));
}

function buildWhatsAppHpUrl_(nomor, pesan) {
  var phone = normalisasiNomorWhatsAppIndonesia_(nomor || "");
  if (!phone) return "";
  return "https://wa.me/" + encodeURIComponent(phone) + "?text=" + encodeURIComponent(String(pesan || ""));
}

function buatPesanWhatsAppDisposisiPersonal_(info, penerima) {
  info = info || {};
  penerima = penerima || {};
  var jenisLabel = (info.jenis || '').toString() === 'TUGAS_PIMPINAN' ? 'Tugas Pimpinan' : 'Tugas Umum';
  var pemberi = (info.pemberiNama || 'Lurah').toString();
  var perihal = (info.perihal || '-').toString();
  var tanggalMulai = info.tanggalMulai ? formatTanggalIndonesiaDisposisi_(info.tanggalMulai, false) : '-';
  var tanggalSelesai = info.tanggalSelesai ? formatTanggalIndonesiaDisposisi_(info.tanggalSelesai, false) : '-';
  var batasLapor = info.batasLapor ? formatTanggalIndonesiaDisposisi_(info.batasLapor, true) : (info.tanggalSelesai ? formatBatasLaporDisposisi_(info.tanggalSelesai) : '-');
  var nama = (penerima.nama || '').toString().trim();

  return [
    nama ? ('Yth. Bapak/Ibu ' + nama + ',') : 'Yth. Bapak/Ibu penerima disposisi,',
    '',
    'Anda menerima disposisi dari ' + pemberi + '.',
    '',
    'Perihal: ' + perihal,
    'Jenis: ' + jenisLabel,
    'Pelaksanaan: ' + tanggalMulai + ' s.d. ' + tanggalSelesai,
    'Batas laporan: ' + batasLapor,
    '',
    'Mohon membuka Portal Kinerja untuk membaca detail disposisi, melihat dokumen surat, klik Tandai Dibuka, dan membuat laporan tindak lanjut melalui tombol Buat Laporan dari Disposisi.',
    '',
    'Terima kasih.'
  ].join('\n');
}

function buatTargetWhatsAppDisposisi_(penerima, info) {
  penerima = Array.isArray(penerima) ? penerima : [];
  var hasil = [];
  var tanpaNomor = [];
  penerima.forEach(function (p) {
    p = p || {};
    var nomor = normalisasiNomorWhatsAppIndonesia_(p.wa || p.waRaw || "");
    var pesan = buatPesanWhatsAppDisposisiPersonal_(info, p);
    var item = {
      id: p.id || "",
      nama: p.nama || "",
      jabatan: p.jabatan || "",
      nomorWa: nomor,
      pesanWhatsApp: pesan,
      whatsappWebUrl: nomor ? buildWhatsAppWebUrl_(nomor, pesan) : "",
      whatsappHpUrl: nomor ? buildWhatsAppHpUrl_(nomor, pesan) : ""
    };
    if (nomor) hasil.push(item);
    else tanpaNomor.push({ id: item.id, nama: item.nama, jabatan: item.jabatan });
  });
  return { targets: hasil, tanpaNomor: tanpaNomor };
}

function simpanDisposisiSurat(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };

    payload = payload || {};
    var pembuat = getPegawaiByIdDisposisi_(idUser);
    if (!pembuat) return { sukses: false, pesan: "Data penginput disposisi tidak ditemukan." };

    ensureSheetDisposisiSurat_();
    ensureSheetDisposisiPenerima_();
    ensureSheetDisposisiLog_();
    ensureSheetDisposisiPetugas_();

    var canManage = cekHakAksesLurahDisposisi_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();
    var canOperate = !canManage && !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser));
    if (!canManage && !canOperate) {
      return { sukses: false, pesan: "Akses ditolak. Hanya Lurah atau petugas operator disposisi aktif yang dapat menerbitkan disposisi." };
    }

    var pemberi = canManage ? pembuat : getPemberiDisposisiUntukOperator_(petugasAktif);
    if (!pemberi || !pemberi.id) {
      return { sukses: false, pesan: "Data pemberi disposisi Lurah tidak ditemukan. Tetapkan ulang petugas operator melalui akun Lurah." };
    }

    var jenis = (payload.jenisDisposisi || "TUGAS_UMUM").toString().trim();
    if (jenis !== "TUGAS_UMUM" && jenis !== "TUGAS_PIMPINAN") jenis = "TUGAS_UMUM";

    var perihal = sanitizeForSheet_(payload.perihal || "");
    var isi = sanitizeForSheet_(payload.isiInstruksi || "");
    var tglDisposisi = parseTanggalKosongAman_(payload.tanggalDisposisi);
    var tglMulai = parseTanggalKosongAman_(payload.tanggalMulai);
    var tglSelesai = parseTanggalKosongAman_(payload.tanggalSelesai);

    var nomorLembarManual = sanitizeForSheet_(payload.nomorLembarManual || "");
    var tglLembarManual = parseTanggalKosongAman_(payload.tanggalLembarManual);
    var catatanOperator = sanitizeForSheet_(payload.catatanOperator || "");

    if (!tglDisposisi) return { sukses: false, pesan: "Tanggal disposisi wajib diisi." };
    if (!perihal) return { sukses: false, pesan: "Perihal disposisi wajib diisi." };
    if (!isi) return { sukses: false, pesan: "Isi ringkas instruksi wajib diisi." };
    if (!tglMulai || !tglSelesai) return { sukses: false, pesan: "Tanggal mulai dan tanggal selesai wajib diisi." };
    if (tglMulai.getTime() > tglSelesai.getTime()) return { sukses: false, pesan: "Tanggal mulai tidak boleh melebihi tanggal selesai." };

    // Dokumen surat wajib untuk semua mode input.
    // Lembar disposisi tidak diunggah terpisah karena sudah direkam melalui formulir aplikasi.
    // Sejak v2026.05.10.15, lampiran disposisi dapat dikirim sebagai upload Blob
    // yang menghasilkan lampiranUrl/lampiranFileId. Base64 fileData tetap didukung
    // hanya untuk kompatibilitas data/kode lama.
    if (!payload.fileData && !payload.lampiranUrl && !payload.lampiranFileId && !payload.fileId) {
      return { sukses: false, pesan: "Dokumen surat yang didisposisikan wajib diunggah." };
    }

    var semuaPegawai = getDaftarPegawaiAktifUntukDisposisiInternal_();
    var pegawaiMap = {};
    semuaPegawai.forEach(function (p) { pegawaiMap[p.id] = p; });

    var ids = uniqueStringArray_(payload.penerimaIds || []);
    var pilihSemuaPegawai = !!payload.pilihSemuaPegawai;
    var penerima = [];
    if (jenis === "TUGAS_UMUM") {
      if (pilihSemuaPegawai || !ids.length) {
        penerima = semuaPegawai.slice();
      } else {
        ids.forEach(function (pid) {
          if (pegawaiMap[pid]) penerima.push(pegawaiMap[pid]);
        });
      }
      if (!penerima.length) return { sukses: false, pesan: "Pilih minimal satu pegawai penerima untuk disposisi tugas umum." };
    } else {
      ids.forEach(function (pid) {
        if (pegawaiMap[pid]) penerima.push(pegawaiMap[pid]);
      });
      if (!penerima.length) return { sukses: false, pesan: "Pilih minimal satu pegawai penerima untuk disposisi tugas pimpinan." };
    }

    var nomor = buatNomorReferensiDisposisi_(tglDisposisi);
    var lampiran = normalisasiLampiranDisposisiDariPayload_(payload, nomor, tglDisposisi, perihal);
    if (!lampiran || !lampiran.url) {
      return { sukses: false, pesan: "Dokumen surat yang didisposisikan wajib diunggah." };
    }

    var idDisposisi = buatIdDisposisi_();
    var shSurat = ensureSheetDisposisiSurat_();
    var shPenerima = ensureSheetDisposisiPenerima_();
    var now = new Date();
    var sumberDisposisi = canOperate ? "FORM_APLIKASI_ATAS_NAMA_LURAH" : "INPUT_LANGSUNG_LURAH";
    var modeInput = canOperate ? "OPERATOR_ATAS_NAMA_LURAH" : "LURAH_LANGSUNG";

    shSurat.appendRow([
      idDisposisi,
      nomor,
      tglDisposisi,
      jenis,
      perihal,
      isi,
      pemberi.id,
      pemberi.nama,
      pemberi.jabatan,
      lampiran.url || "",
      lampiran.nama || "",
      tglMulai,
      tglSelesai,
      DISPOSISI_STATUS.TERBIT,
      now,
      now,
      sumberDisposisi,
      nomorLembarManual,
      tglLembarManual || "",
      pembuat.id,
      pembuat.nama,
      pembuat.jabatan,
      now,
      modeInput,
      catatanOperator
    ]);

    var mode = (jenis === "TUGAS_UMUM" && penerima.length === semuaPegawai.length) ? "MASSAL" : "TERARAH";
    var rows = penerima.map(function (p) {
      return [
        idDisposisi,
        p.id,
        p.nama,
        p.jabatan,
        mode,
        DISPOSISI_BACA.BARU,
        DISPOSISI_TINDAK.BELUM,
        "",
        "",
        "",
        now,
        now
      ];
    });
    if (rows.length) {
      shPenerima.getRange(shPenerima.getLastRow() + 1, 1, rows.length, DISPOSISI_PENERIMA_HEADERS.length).setValues(rows);
    }

    logDisposisi_(idDisposisi, canOperate ? "OPERATOR_TERBITKAN_DISPOSISI" : "BUAT_DISPOSISI", idUser, "Jenis: " + jenis + " | Ref: " + nomor + " | Perihal: " + perihal + " | Pemberi: " + pemberi.nama + " | Penerima: " + rows.length + " | Mode: " + modeInput, {
      targetTipe: "SURAT",
      targetId: idDisposisi,
      targetNama: perihal,
      detailJson: { nomor: nomor, jenis: jenis, perihal: perihal, pemberi_nama: pemberi.nama, jumlah_penerima: rows.length, mode_input: modeInput }
    });
    var infoWhatsApp = {
      pemberiNama: pemberi.nama,
      jenis: jenis,
      perihal: perihal,
      tanggalMulai: tglMulai,
      tanggalSelesai: tglSelesai,
      batasLapor: batasLaporDisposisi_(tglSelesai),
      jumlahPenerima: rows.length
    };
    var pesanWhatsApp = buatPesanWhatsAppDisposisi_(infoWhatsApp);
    var targetWhatsApp = buatTargetWhatsAppDisposisi_(penerima, infoWhatsApp);
    return {
      sukses: true,
      pesan: "Disposisi berhasil diterbitkan kepada " + rows.length + " penerima.",
      idDisposisi: idDisposisi,
      nomorDisposisi: nomor,
      jumlahPenerima: rows.length,
      pesanWhatsApp: pesanWhatsApp,
      penerimaWhatsApp: targetWhatsApp.targets,
      penerimaTanpaWa: targetWhatsApp.tanpaNomor
    };
  } catch (e) {
    return handleError("terbitkanDisposisiSurat", e, { sukses: false, pesan: "" });
  }
}


function getSuratDisposisiByIdInternal_(idDisposisi) {
  var key = normalizeId_(idDisposisi);
  if (!key) return null;
  var rows = ambilSemuaSuratDisposisiInternal_();
  for (var i = 0; i < rows.length; i++) {
    if (idsEqual_(rows[i].id_disposisi, key)) return rows[i];
  }
  return null;
}

// ===== PATCH v2026.05.12.03: Koreksi jenis disposisi untuk revisi laporan =====
// Fitur ini memungkinkan Lurah pemberi disposisi atau operator disposisi aktif
// mengoreksi jenis disposisi yang salah label, lalu memperbarui laporan terkait.
function cekHakKoreksiDisposisi_(idUser, surat) {
  surat = surat || {};

  var canManage = cekHakAksesLurahDisposisi_(idUser) && idsEqual_(surat.pemberi_id, idUser);

  var petugasAktif = getPetugasDisposisiAktif_();
  var canOperate = !!(
    petugasAktif &&
    idsEqual_(petugasAktif.pegawaiId, idUser) &&
    idsEqual_(surat.pemberi_id, petugasAktif.ditetapkanOlehId)
  );

  return canManage || canOperate;
}

function cariRowDisposisiSuratById_(sh, idDisposisi) {
  var key = normalizeId_(idDisposisi);
  if (!key) return 0;

  var C = SHEET_COLUMNS.DISPOSISI_SURAT;
  var values = sh.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (idsEqual_(values[i][C.ID_DISPOSISI], key)) {
      return i + 1;
    }
  }

  return 0;
}

function updateJenisDisposisiPadaRekapTerkait_(idDisposisi, jenisBaru) {
  var key = normalizeId_(idDisposisi);
  if (!key) return 0;

  var sh = getSheet_("Rekap_Kinerja");
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var lastRow = sh.getLastRow();

  if (lastRow < 2) return 0;

  var lastCol = Math.max(sh.getLastColumn(), C.JENIS_DISPOSISI + 1);
  var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var updated = 0;

  for (var i = 0; i < values.length; i++) {
    if (!idsEqual_(values[i][C.ID_DISPOSISI], key)) continue;

    sh.getRange(i + 2, C.JENIS_DISPOSISI + 1).setValue(jenisBaru);
    updated++;
  }

  if (updated) invalidasiCacheRekapKinerjaReadOnly_();
  return updated;
}

function koreksiJenisDisposisi(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };
    }

    payload = payload || {};

    var idDisposisi = normalizeId_(payload.idDisposisi || payload.id_disposisi || "");
    var jenisBaru = String(payload.jenisDisposisi || payload.jenis_disposisi || "").trim().toUpperCase();
    var alasan = sanitizeForSheet_(payload.alasan || payload.catatan || "Koreksi jenis disposisi oleh operator.");

    if (!idDisposisi) {
      return { sukses: false, pesan: "ID disposisi tidak valid." };
    }

    if (jenisBaru !== "TUGAS_UMUM" && jenisBaru !== "TUGAS_PIMPINAN") {
      return { sukses: false, pesan: "Jenis disposisi harus TUGAS_UMUM atau TUGAS_PIMPINAN." };
    }

    if (!alasan) {
      return { sukses: false, pesan: "Alasan koreksi wajib diisi." };
    }

    var surat = getSuratDisposisiByIdInternal_(idDisposisi);
    if (!surat) {
      return { sukses: false, pesan: "Disposisi tidak ditemukan." };
    }

    if (!cekHakKoreksiDisposisi_(idUser, surat)) {
      return {
        sukses: false,
        pesan: "Akses ditolak. Hanya Lurah pemberi disposisi atau operator aktif yang dapat mengoreksi jenis disposisi."
      };
    }

    var jenisLama = String(surat.jenis_disposisi || "").trim().toUpperCase();

    if (jenisLama === jenisBaru) {
      return {
        sukses: true,
        pesan: "Jenis disposisi sudah sesuai. Tidak ada perubahan.",
        jenisLama: jenisLama,
        jenisBaru: jenisBaru
      };
    }

    var sh = ensureSheetDisposisiSurat_();
    var C = SHEET_COLUMNS.DISPOSISI_SURAT;
    var rowIndex = cariRowDisposisiSuratById_(sh, idDisposisi);

    if (!rowIndex) {
      return { sukses: false, pesan: "Baris disposisi tidak ditemukan." };
    }

    var now = new Date();

    sh.getRange(rowIndex, C.JENIS_DISPOSISI + 1).setValue(jenisBaru);
    sh.getRange(rowIndex, C.DIUBAH_PADA + 1).setValue(now);

    var catatanLama = String(surat.catatan_operator || "").trim();
    var tambahanCatatan = "[" + Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm") + "] Koreksi jenis disposisi: " +
      jenisLama + " -> " + jenisBaru + ". Alasan: " + alasan;

    sh.getRange(rowIndex, C.CATATAN_OPERATOR + 1).setValue(
      catatanLama ? (catatanLama + "\n" + tambahanCatatan) : tambahanCatatan
    );

    var jumlahRekap = updateJenisDisposisiPadaRekapTerkait_(idDisposisi, jenisBaru);

    logDisposisi_(
      idDisposisi,
      "KOREKSI_JENIS_DISPOSISI",
      idUser,
      "Jenis: " + jenisLama + " -> " + jenisBaru + " | Alasan: " + alasan,
      {
        targetTipe: "SURAT",
        targetId: idDisposisi,
        targetNama: surat.perihal || "",
        alasan: alasan,
        detailJson: {
          jenis_lama: jenisLama,
          jenis_baru: jenisBaru,
          rekap_terkait_diperbarui: jumlahRekap
        }
      }
    );

    return {
      sukses: true,
      pesan: "Jenis disposisi berhasil dikoreksi dari " + jenisLama + " menjadi " + jenisBaru + ". Laporan terkait diperbarui: " + jumlahRekap + ".",
      jenisLama: jenisLama,
      jenisBaru: jenisBaru,
      rekapTerkaitDiperbarui: jumlahRekap
    };

  } catch (e) {
    return handleError("koreksiJenisDisposisi", e, {
      sukses: false,
      pesan: "Gagal mengoreksi jenis disposisi."
    });
  }
}
// ===== END PATCH v2026.05.12.03 =====


function tambahPenerimaDisposisi(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };

    payload = payload || {};
    var idDisposisi = normalizeId_(payload.idDisposisi || payload.id_disposisi || "");
    var ids = uniqueStringArray_(payload.penerimaIds || []);
    var alasan = sanitizeForSheet_(payload.alasan || "Tambahan penerima disposisi.");
    if (!idDisposisi) return { sukses: false, pesan: "ID disposisi tidak valid." };
    if (!ids.length) return { sukses: false, pesan: "Pilih minimal satu penerima tambahan." };

    var pembuat = getPegawaiByIdDisposisi_(idUser);
    if (!pembuat) return { sukses: false, pesan: "Data pengguna tidak ditemukan." };

    var surat = getSuratDisposisiByIdInternal_(idDisposisi);
    if (!surat) return { sukses: false, pesan: "Disposisi tidak ditemukan." };
    if (String(surat.status_disposisi || '').toUpperCase() !== DISPOSISI_STATUS.TERBIT) {
      return { sukses: false, pesan: "Penerima hanya dapat ditambahkan pada disposisi berstatus Terbit." };
    }

    var canManage = cekHakAksesLurahDisposisi_(idUser) && idsEqual_(surat.pemberi_id, idUser);
    var petugasAktif = getPetugasDisposisiAktif_();
    var canOperate = !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser) && idsEqual_(surat.pemberi_id, petugasAktif.ditetapkanOlehId));
    if (!canManage && !canOperate) {
      return { sukses: false, pesan: "Akses ditolak. Hanya Lurah pemberi disposisi atau operator aktif yang dapat menambah penerima." };
    }

    var semuaPegawai = getDaftarPegawaiAktifUntukDisposisiInternal_();
    var pegawaiMap = {};
    semuaPegawai.forEach(function (p) { pegawaiMap[normalizeId_(p.id)] = p; });

    var penerimaRows = ambilSemuaPenerimaDisposisiInternal_();
    var existing = {};
    penerimaRows.forEach(function (p) {
      if (idsEqual_(p.id_disposisi, idDisposisi)) existing[normalizeId_(p.id_penerima)] = true;
    });

    var tambahan = [];
    ids.forEach(function (pid) {
      var key = normalizeId_(pid);
      if (!key || existing[key] || !pegawaiMap[key]) return;
      tambahan.push(pegawaiMap[key]);
      existing[key] = true;
    });
    if (!tambahan.length) {
      return { sukses: false, pesan: "Tidak ada penerima baru yang dapat ditambahkan. Mungkin semua pilihan sudah menjadi penerima." };
    }

    var sh = ensureSheetDisposisiPenerima_();
    var now = new Date();
    var rows = tambahan.map(function (p) {
      return [
        idDisposisi,
        p.id,
        p.nama,
        p.jabatan,
        "TAMBAHAN",
        DISPOSISI_BACA.BARU,
        DISPOSISI_TINDAK.BELUM,
        "",
        "",
        alasan,
        now,
        now
      ];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, DISPOSISI_PENERIMA_HEADERS.length).setValues(rows);

    var detailJson = {
      alasan: alasan,
      penerima_ditambahkan: tambahan.map(function (p) {
        return {
          pegawai_id: p.id,
          nama: p.nama,
          jabatan: p.jabatan,
          status_baca: DISPOSISI_BACA.BARU,
          status_tindak_lanjut: DISPOSISI_TINDAK.BELUM
        };
      })
    };
    logDisposisi_(
      idDisposisi,
      "TAMBAH_PENERIMA",
      idUser,
      "Menambahkan " + tambahan.length + " penerima disposisi: " + tambahan.map(function (p) { return p.nama; }).join(", "),
      {
        targetTipe: "PENERIMA",
        targetId: tambahan.map(function (p) { return p.id; }).join(","),
        targetNama: tambahan.map(function (p) { return p.nama; }).join(", "),
        alasan: alasan,
        detailJson: detailJson
      }
    );

    var infoWhatsApp = {
      pemberiNama: surat.pemberi_nama || 'Lurah',
      jenis: surat.jenis_disposisi || 'TUGAS_UMUM',
      perihal: surat.perihal || '-',
      tanggalMulai: surat.tanggal_mulai,
      tanggalSelesai: surat.tanggal_selesai,
      batasLapor: batasLaporDisposisi_(surat.tanggal_selesai),
      jumlahPenerima: tambahan.length
    };
    var pesanWhatsApp = buatPesanWhatsAppDisposisi_(infoWhatsApp);
    var targetWhatsApp = buatTargetWhatsAppDisposisi_(tambahan, infoWhatsApp);

    return {
      sukses: true,
      pesan: tambahan.length + " penerima berhasil ditambahkan.",
      idDisposisi: idDisposisi,
      nomorDisposisi: surat.nomor_disposisi || '',
      jumlahPenerima: tambahan.length,
      pesanWhatsApp: pesanWhatsApp,
      penerimaWhatsApp: targetWhatsApp.targets,
      penerimaTanpaWa: targetWhatsApp.tanpaNomor
    };
  } catch (e) {
    return handleError("tambahPenerimaDisposisi", e, { sukses: false, pesan: "Gagal menambah penerima disposisi: " + (e && e.message ? e.message : e) });
  }
}


function buatPesanWhatsAppDisposisi_(info) {
  info = info || {};
  var jenisLabel = (info.jenis || '').toString() === 'TUGAS_PIMPINAN' ? 'Tugas Pimpinan' : 'Tugas Umum';
  var pemberi = (info.pemberiNama || 'Lurah').toString();
  var perihal = (info.perihal || '-').toString();
  var tanggalMulai = info.tanggalMulai ? formatTanggalIndonesiaDisposisi_(info.tanggalMulai, false) : '-';
  var tanggalSelesai = info.tanggalSelesai ? formatTanggalIndonesiaDisposisi_(info.tanggalSelesai, false) : '-';
  var batasLapor = info.batasLapor ? formatTanggalIndonesiaDisposisi_(info.batasLapor, true) : (info.tanggalSelesai ? formatBatasLaporDisposisi_(info.tanggalSelesai) : '-');
  var jumlah = Number(info.jumlahPenerima || 0);

  return [
    'Yth. Bapak/Ibu penerima disposisi,',
    '',
    'Anda menerima disposisi dari ' + pemberi + '.',
    '',
    'Perihal: ' + perihal,
    'Jenis: ' + jenisLabel,
    'Pelaksanaan: ' + tanggalMulai + ' s.d. ' + tanggalSelesai,
    'Batas laporan: ' + batasLapor,
    jumlah ? ('Penerima: ' + jumlah + ' pegawai') : '',
    '',
    'Mohon membuka Portal Kinerja untuk membaca detail disposisi, melihat dokumen surat, klik Tandai Dibuka, dan membuat laporan tindak lanjut melalui tombol Buat Laporan dari Disposisi.',
    '',
    'Terima kasih.'
  ].filter(function (line) { return line !== null && line !== undefined; }).join('\n');
}


var DISPOSISI_BATAS_LAPOR_HARI = 2;

function batasLaporDisposisi_(tanggalSelesai) {
  var d = parseTanggalKosongAman_(tanggalSelesai);
  if (!d) return null;
  // Batas laporan: H+2 dari tanggal selesai pelaksanaan, sampai 23:59:59.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + DISPOSISI_BATAS_LAPOR_HARI, 23, 59, 59, 999);
}

function formatBatasLaporDisposisi_(tanggalSelesai) {
  var batas = batasLaporDisposisi_(tanggalSelesai);
  return batas ? formatTanggalIndonesiaDisposisi_(batas, true) : '-';
}

function isoBatasLaporDisposisi_(tanggalSelesai) {
  var batas = batasLaporDisposisi_(tanggalSelesai);
  if (!batas) return '';
  return Utilities.formatDate(batas, 'GMT+7', "yyyy-MM-dd'T'HH:mm:ss");
}



// DEBUG REMOVED FROM PRODUCTION: debugBatasLaporDisposisi
function hitungStatusLaporDisposisi_(surat, penerima) {
  surat = surat || {};
  penerima = penerima || {};

  var batas = batasLaporDisposisi_(surat.tanggal_selesai);
  var statusTindak = (penerima.status_tindak_lanjut || '').toString().toUpperCase();
  var sudahLapor = statusTindak === DISPOSISI_TINDAK.SUDAH || !!normalizeId_(penerima.id_laporan_terkait);
  var waktuLapor = parseTanggalKosongAman_(penerima.waktu_lapor);
  var now = new Date();

  var terlambatBelumLapor = !!(batas && !sudahLapor && now.getTime() > batas.getTime());
  var sudahTerlambat = !!(batas && sudahLapor && waktuLapor && waktuLapor.getTime() > batas.getTime());

  var code = 'BELUM_LAPOR';
  var label = 'Belum Lapor';

  if (sudahLapor) {
    if (sudahTerlambat) {
      code = 'SUDAH_TERLAMBAT';
      label = 'Sudah Lapor - Terlambat';
    } else {
      code = 'SUDAH_TEPAT_WAKTU';
      label = 'Sudah Lapor - Tepat Waktu';
    }
  } else if (terlambatBelumLapor) {
    code = 'TERLAMBAT_LAPOR';
    label = 'Terlambat Lapor';
  }

  return {
    code: code,
    label: label,
    batas: batas,
    batasLabel: batas ? formatTanggalIndonesiaDisposisi_(batas, true) : '-',
    batasIso: batas ? Utilities.formatDate(batas, 'GMT+7', "yyyy-MM-dd'T'HH:mm:ss") : '',
    terlambatBelumLapor: terlambatBelumLapor,
    sudahTerlambat: sudahTerlambat,
    sudahLapor: sudahLapor,
    waktuLaporLabel: waktuLapor ? formatTanggalIndonesiaDisposisi_(waktuLapor, true) : ''
  };
}

// ===== PATCH v23: kunci pembuatan laporan disposisi setelah periode pelaporan cut-off =====
function cutoffPelaporanDisposisi_(surat) {
  surat = surat || {};
  var tanggalRef = surat.tanggal_selesai || surat.tanggal_mulai || surat.tanggal_disposisi;
  var d = parseTanggalKosongAman_(tanggalRef);

  if (!d) {
    return {
      periode: '',
      periodeLabel: '',
      periodeDitutup: false,
      cutoffLabel: '',
      pesan: ''
    };
  }

  // Form disposisi hanya menyimpan tanggal, bukan jam pelaksanaan.
  // Untuk menentukan periode pelaporan, tanggal selesai dihitung pada awal hari
  // agar kegiatan pada tanggal cut-off tetap masuk periode bulan berjalan.
  var tanggalPelaksanaan = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  var periode = periodeDariTanggalLaporan_(tanggalPelaksanaan);
  var meta = periode ? parsePeriodeBulan_(periode) : null;
  var cutoff = meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime()) ? meta.endInclusive : null;
  var now = new Date();
  var ditutup = !!(cutoff && now.getTime() > cutoff.getTime());
  var periodeLabel = periode ? labelPembayaranPeriode_(periode) : '';
  var cutoffLabel = cutoff ? formatTanggalIndonesiaDisposisi_(cutoff, true) : '';
  var pesan = ditutup
    ? 'Periode pelaporan ' + periodeLabel + ' sudah ditutup pada ' + cutoffLabel + '. Laporan baru/perbaikan dari disposisi ini tidak dapat dibuat melalui tombol pegawai.'
    : '';

  return {
    periode: periode,
    periodeLabel: periodeLabel,
    periodeDitutup: ditutup,
    cutoffLabel: cutoffLabel,
    pesan: pesan
  };
}

function pesanCutoffPelaporanDisposisi_(surat) {
  var info = cutoffPelaporanDisposisi_(surat);
  return info && info.pesan ? info.pesan : 'Periode pelaporan disposisi sudah ditutup. Laporan baru tidak dapat dibuat.';
}


// DEBUG REMOVED FROM PRODUCTION: debugCutoffPelaporanDisposisi
function ambilRingkasanDisposisiBaru(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', totalBaru: 0, totalMasuk: 0, totalBelumLapor: 0, totalTerlambatBelumLapor: 0, totalTerkunciCutoff: 0, daftarBaru: [], daftarTerlambat: [], daftarTerkunciCutoff: [] };

    var list = ambilDisposisiSayaInternal_(idUser) || [];

    // Banner dashboard hanya untuk disposisi yang masih actionable:
    // belum ada laporan, status TERBIT, dan periode pelaporannya masih terbuka.
    // Disposisi yang sudah cut-off tetap tampil di Disposisi Saya sebagai riwayat/status,
    // tetapi tidak lagi mengganggu dashboard karena pegawai sudah tidak bisa membuat laporan baru.
    function masihBisaDilaporkan(item) {
      item = item || {};
      var aksi = String(item.aksiLaporan || '').toUpperCase();
      var statusTindak = String(item.statusTindakLanjut || '').toUpperCase();
      var statusLapor = String(item.statusLaporCode || '').toUpperCase();
      var sudah = statusTindak === DISPOSISI_TINDAK.SUDAH ||
        !!normalizeId_(item.idLaporanTerkait) ||
        aksi === 'LIHAT' ||
        aksi === 'PERBAIKI' ||
        statusLapor === 'SUDAH_TEPAT_WAKTU' ||
        statusLapor === 'SUDAH_TERLAMBAT';

      return String(item.statusDisposisi || '').toUpperCase() === DISPOSISI_STATUS.TERBIT &&
        !sudah &&
        aksi === 'BUAT' &&
        item.periodePelaporanDitutup !== true;
    }

    var actionable = list.filter(masihBisaDilaporkan);
    var actionableMap = {};
    actionable.forEach(function (item) { actionableMap[normalizeId_(item.idDisposisi)] = true; });
    var baru = list.filter(function (item) {
      return (item.statusBaca || '').toString().toUpperCase() === DISPOSISI_BACA.BARU &&
        !!actionableMap[normalizeId_(item.idDisposisi)];
    });
    var terlambat = actionable.filter(function (item) {
      return String(item.statusLaporCode || '').toUpperCase() === 'TERLAMBAT_LAPOR';
    });

    function ringkasItem(item) {
      return {
        idDisposisi: item.idDisposisi || '',
        nomor: item.nomor || '',
        perihal: item.perihal || '',
        pemberiNama: item.pemberiNama || '',
        tanggalMulai: item.tanggalMulai || '',
        tanggalSelesai: item.tanggalSelesai || '',
        batasLapor: item.batasLapor || '',
        statusLaporLabel: item.statusLaporLabel || '',
        periodePelaporanLabel: item.periodePelaporanLabel || '',
        periodePelaporanDitutup: !!item.periodePelaporanDitutup,
        cutoffPelaporanLabel: item.cutoffPelaporanLabel || '',
        pesanPeriodeDitutup: item.pesanPeriodeDitutup || ''
      };
    }

    return {
      sukses: true,
      totalBaru: baru.length,
      totalMasuk: list.length,
      totalBelumLapor: actionable.length,
      totalTerlambatBelumLapor: terlambat.length,
      // Dipertahankan untuk kompatibilitas payload lama, tetapi tidak dipakai untuk banner dashboard.
      totalTerkunciCutoff: 0,
      daftarBaru: baru.slice(0, 3).map(ringkasItem),
      daftarTerlambat: terlambat.slice(0, 3).map(ringkasItem),
      daftarTerkunciCutoff: []
    };
  } catch (e) {
    return handleError('ambilRingkasanDisposisiBaru', e, { sukses: false, pesan: 'Gagal memuat ringkasan disposisi baru.', totalBaru: 0, totalMasuk: 0, totalBelumLapor: 0, totalTerlambatBelumLapor: 0, totalTerkunciCutoff: 0, daftarBaru: [], daftarTerlambat: [], daftarTerkunciCutoff: [] });
  }
}

function safeHttpUrlServer_(url) {
  if (url === null || url === undefined) return "";
  var s = String(url).trim();

  // Sama seperti bukti kinerja: lampiran disposisi hanya boleh berasal dari
  // Google Drive/Docs, wajib HTTPS, dan harus memiliki fileId.
  if (!isSafeDriveUrl_(s)) return "";

  var fileId = extractDriveFileId_(s);
  if (!fileId) return "";

  // Jangan teruskan raw URL dari sheet; bangun ulang URL kanonik dari fileId.
  return "https://drive.google.com/file/d/" + encodeURIComponent(fileId) + "/view";
}

function ambilSemuaSuratDisposisiInternal_() {
  var sh = ensureSheetDisposisiSurat_();
  var data = sh.getDataRange().getValues();
  var rows = [];
  var C = SHEET_COLUMNS.DISPOSISI_SURAT;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[C.ID_DISPOSISI]) continue;
    rows.push({
      id_disposisi: normalizeId_(row[C.ID_DISPOSISI]),
      nomor_disposisi: (row[C.NOMOR_DISPOSISI] || "").toString(),
      tanggal_disposisi: row[C.TANGGAL_DISPOSISI] || "",
      jenis_disposisi: (row[C.JENIS_DISPOSISI] || "").toString(),
      perihal: (row[C.PERIHAL] || "").toString(),
      isi_ringkas_instruksi: (row[C.ISI_RINGKAS_INSTRUKSI] || "").toString(),
      pemberi_id: normalizeId_(row[C.PEMBERI_ID]),
      pemberi_nama: (row[C.PEMBERI_NAMA] || "").toString(),
      pemberi_jabatan: (row[C.PEMBERI_JABATAN] || "").toString(),
      lampiran_url: safeHttpUrlServer_(row[C.LAMPIRAN_URL]),
      lampiran_nama: (row[C.LAMPIRAN_NAMA] || "").toString(),
      tanggal_mulai: row[C.TANGGAL_MULAI] || "",
      tanggal_selesai: row[C.TANGGAL_SELESAI] || "",
      status_disposisi: (row[C.STATUS_DISPOSISI] || "").toString(),
      dibuat_pada: row[C.DIBUAT_PADA] || "",
      diubah_pada: row[C.DIUBAH_PADA] || "",
      sumber_disposisi: (row[C.SUMBER_DISPOSISI] || "").toString(),
      nomor_lembar_manual: (row[C.NOMOR_LEMBAR_MANUAL] || "").toString(),
      tanggal_lembar_manual: row[C.TANGGAL_LEMBAR_MANUAL] || "",
      diinput_oleh_id: normalizeId_(row[C.DIINPUT_OLEH_ID]),
      diinput_oleh_nama: (row[C.DIINPUT_OLEH_NAMA] || "").toString(),
      diinput_oleh_jabatan: (row[C.DIINPUT_OLEH_JABATAN] || "").toString(),
      diinput_pada: row[C.DIINPUT_PADA] || "",
      mode_input: (row[C.MODE_INPUT] || "").toString(),
      catatan_operator: (row[C.CATATAN_OPERATOR] || "").toString()
    });
  }
  return rows;
}

function ambilSemuaPenerimaDisposisiInternal_() {
  var sh = ensureSheetDisposisiPenerima_();
  var data = sh.getDataRange().getValues();
  var rows = [];
  var C = SHEET_COLUMNS.DISPOSISI_PENERIMA;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[C.ID_DISPOSISI] || !row[C.ID_PENERIMA]) continue;
    rows.push({
      rowIndex: i + 1,
      id_disposisi: normalizeId_(row[C.ID_DISPOSISI]),
      id_penerima: normalizeId_(row[C.ID_PENERIMA]),
      nama_penerima: (row[C.NAMA_PENERIMA] || "").toString(),
      jabatan_penerima: (row[C.JABATAN_PENERIMA] || "").toString(),
      mode_penerima: (row[C.MODE_PENERIMA] || "").toString(),
      status_baca: (row[C.STATUS_BACA] || "").toString(),
      status_tindak_lanjut: (row[C.STATUS_TINDAK_LANJUT] || "").toString(),
      id_laporan_terkait: normalizeId_(row[C.ID_LAPORAN_TERKAIT]),
      waktu_lapor: row[C.WAKTU_LAPOR] || "",
      catatan_tindak_lanjut: (row[C.CATATAN_TINDAK_LANJUT] || "").toString(),
      dibuat_pada: row[C.DIBUAT_PADA] || "",
      diubah_pada: row[C.DIUBAH_PADA] || ""
    });
  }
  return rows;
}

function ambilDaftarDisposisiLurahInternal_(idUser) {
  var suratRows = ambilSemuaSuratDisposisiInternal_().filter(function (r) {
    return idsEqual_(r.pemberi_id, idUser);
  });
  var penerimaRows = ambilSemuaPenerimaDisposisiInternal_();
  var grouped = {};
  penerimaRows.forEach(function (p) {
    var key = normalizeId_(p.id_disposisi);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return suratRows.map(function (s) {
    var arr = grouped[normalizeId_(s.id_disposisi)] || [];
    var total = arr.length;
    var dibuka = arr.filter(function (p) { return (p.status_baca || "") === DISPOSISI_BACA.DIBUKA; }).length;
    var sudah = arr.filter(function (p) { return (p.status_tindak_lanjut || "") === DISPOSISI_TINDAK.SUDAH; }).length;
    var belum = arr.filter(function (p) { return (p.status_tindak_lanjut || "") !== DISPOSISI_TINDAK.SUDAH; }).length;
    var batasLapor = batasLaporDisposisi_(s.tanggal_selesai);
    var cutoffPelaporan = cutoffPelaporanDisposisi_(s);
    var tepatWaktu = 0;
    var laporTerlambat = 0;
    var terlambatBelum = 0;
    var terkunciCutoffBelum = 0;
    arr.forEach(function (p) {
      var st = hitungStatusLaporDisposisi_(s, p);
      if (st.code === 'SUDAH_TEPAT_WAKTU') tepatWaktu++;
      else if (st.code === 'SUDAH_TERLAMBAT') laporTerlambat++;
      else if (st.code === 'TERLAMBAT_LAPOR') terlambatBelum++;
      if (cutoffPelaporan.periodeDitutup && st.code !== 'SUDAH_TEPAT_WAKTU' && st.code !== 'SUDAH_TERLAMBAT') terkunciCutoffBelum++;
    });
    return {
      idDisposisi: normalizeId_(s.id_disposisi),
      nomor: s.nomor_disposisi,
      tanggal: formatTanggalIndonesiaDisposisi_(s.tanggal_disposisi, false),
      jenis: s.jenis_disposisi,
      perihal: s.perihal,
      isiInstruksi: s.isi_ringkas_instruksi,
      status: s.status_disposisi || DISPOSISI_STATUS.TERBIT,
      lampiranUrl: safeHttpUrlServer_(s.lampiran_url),
      lampiranNama: s.lampiran_nama,
      tanggalMulai: formatTanggalIndonesiaDisposisi_(s.tanggal_mulai, false),
      tanggalSelesai: formatTanggalIndonesiaDisposisi_(s.tanggal_selesai, false),
      batasLapor: batasLapor ? formatTanggalIndonesiaDisposisi_(batasLapor, true) : '-',
      batasLaporIso: batasLapor ? Utilities.formatDate(batasLapor, 'GMT+7', "yyyy-MM-dd'T'HH:mm:ss") : '',
      periodePelaporan: cutoffPelaporan.periode || '',
      periodePelaporanLabel: cutoffPelaporan.periodeLabel || '',
      periodePelaporanDitutup: !!cutoffPelaporan.periodeDitutup,
      cutoffPelaporanLabel: cutoffPelaporan.cutoffLabel || '',
      pesanPeriodeDitutup: cutoffPelaporan.pesan || '',
      sumberDisposisi: s.sumber_disposisi || '',
      nomorLembarManual: s.nomor_lembar_manual || '',
      tanggalLembarManual: formatTanggalIndonesiaDisposisi_(s.tanggal_lembar_manual, false),
      diinputOlehNama: s.diinput_oleh_nama || '',
      diinputOlehJabatan: s.diinput_oleh_jabatan || '',
      diinputPada: formatTanggalIndonesiaDisposisi_(s.diinput_pada, true),
      modeInput: s.mode_input || '',
      catatanOperator: s.catatan_operator || '',
      totalPenerima: total,
      totalDibuka: dibuka,
      totalBelum: belum,
      totalSudah: sudah,
      totalTepatWaktu: tepatWaktu,
      totalLaporTerlambat: laporTerlambat,
      totalTerlambatBelumLapor: terlambatBelum,
      totalTerkunciCutoffBelumLapor: terkunciCutoffBelum,
      penerimaIds: arr.map(function (p) { return normalizeId_(p.id_penerima); }),
      penerimaList: arr.map(function (p) {
        return {
          id: normalizeId_(p.id_penerima),
          nama: p.nama_penerima || '',
          jabatan: p.jabatan_penerima || '',
          statusBaca: p.status_baca || '',
          statusTindakLanjut: p.status_tindak_lanjut || ''
        };
      }),
      dibuatPadaTs: parseTanggalKosongAman_(s.dibuat_pada) ? parseTanggalKosongAman_(s.dibuat_pada).getTime() : 0
    };
  }).sort(function (a, b) {
    return (b.dibuatPadaTs || 0) - (a.dibuatPadaTs || 0);
  });
}

function buildLaporanTerkaitDisposisiFromRow_(row) {
  row = row || [];
  var rowIdLaporan = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
  var status = (row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString();
  var waktuRaw = row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN] || "";
  return {
    idLaporan: rowIdLaporan,
    status: status,
    waktuRaw: waktuRaw,
    waktu: formatTanggalIndonesiaDisposisi_(waktuRaw, true),
    kategori: (row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "").toString(),
    deskripsi: (row[SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || "").toString(),
    catatan: (row[SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || "").toString(),
    poinFinal: Number(row[SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
    bisaPerbaiki: status === REVIEW_STATUS.DITOLAK || status === REVIEW_STATUS.BANDING,
    bisaLihat: true
  };
}

function getLaporanTerkaitDisposisiInternal_(idLaporan, idUser) {
  var key = normalizeId_(idLaporan);
  var userKey = normalizeId_(idUser);
  if (!key || !userKey) return null;

  var data = getRekapKinerjaValuesReadOnly_();
  for (var i = data.length - 1; i >= 1; i--) {
    var rowIdLaporan = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    var rowIdUser = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idsEqual_(rowIdLaporan, key) || !idsEqual_(rowIdUser, userKey)) continue;
    return buildLaporanTerkaitDisposisiFromRow_(data[i]);
  }
  return null;
}

// Patch v24: notifikasi disposisi harus hilang jika laporan sudah ada.
// Fallback ini menangkap laporan yang sudah tersimpan di Rekap_Kinerja berdasarkan ID_DISPOSISI,
// meskipun kolom status_tindak_lanjut/id_laporan_terkait pada Disposisi_Penerima belum sempat terbarui.
function getLaporanTerkaitDisposisiByDisposisiInternal_(idDisposisi, idUser) {
  var key = normalizeId_(idDisposisi);
  var userKey = normalizeId_(idUser);
  if (!key || !userKey) return null;

  var data = getRekapKinerjaValuesReadOnly_();
  for (var i = data.length - 1; i >= 1; i--) {
    var rowDisposisi = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_DISPOSISI]);
    var rowIdUser = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idsEqual_(rowDisposisi, key) || !idsEqual_(rowIdUser, userKey)) continue;
    return buildLaporanTerkaitDisposisiFromRow_(data[i]);
  }
  return null;
}

function getLaporanTerkaitDisposisiForPenerima_(penerima, idUser) {
  penerima = penerima || {};
  return getLaporanTerkaitDisposisiInternal_(penerima.id_laporan_terkait, idUser) ||
    getLaporanTerkaitDisposisiByDisposisiInternal_(penerima.id_disposisi, idUser);
}

function penerimaDisposisiSudahLapor_(penerima, laporanTerkait) {
  penerima = penerima || {};
  var statusTindak = String(penerima.status_tindak_lanjut || '').toUpperCase();
  return statusTindak === DISPOSISI_TINDAK.SUDAH ||
    !!normalizeId_(penerima.id_laporan_terkait) ||
    !!(laporanTerkait && normalizeId_(laporanTerkait.idLaporan));
}

function penerimaDisposisiUntukStatusLapor_(penerima, laporanTerkait) {
  penerima = penerima || {};
  var copy = {};
  for (var k in penerima) {
    if (Object.prototype.hasOwnProperty.call(penerima, k)) copy[k] = penerima[k];
  }
  if (penerimaDisposisiSudahLapor_(penerima, laporanTerkait)) {
    copy.status_tindak_lanjut = DISPOSISI_TINDAK.SUDAH;
    copy.id_laporan_terkait = normalizeId_(copy.id_laporan_terkait) || normalizeId_(laporanTerkait && laporanTerkait.idLaporan);
    copy.waktu_lapor = copy.waktu_lapor || (laporanTerkait && laporanTerkait.waktuRaw) || '';
  }
  return copy;
}

function ambilDisposisiSayaInternal_(idUser) {
  var suratRows = ambilSemuaSuratDisposisiInternal_();
  var suratMap = {};
  suratRows.forEach(function (s) { suratMap[normalizeId_(s.id_disposisi)] = s; });

  return ambilSemuaPenerimaDisposisiInternal_()
    .filter(function (p) { return idsEqual_(p.id_penerima, idUser); })
    .map(function (p) {
      var s = suratMap[normalizeId_(p.id_disposisi)] || {};
      var laporanTerkait = getLaporanTerkaitDisposisiForPenerima_(p, idUser);
      var sudahLapor = penerimaDisposisiSudahLapor_(p, laporanTerkait);
      var pStatus = penerimaDisposisiUntukStatusLapor_(p, laporanTerkait);
      var ts = parseTanggalKosongAman_(s.dibuat_pada) || parseTanggalKosongAman_(s.tanggal_disposisi);
      var aksiLaporan = 'BUAT';
      if (sudahLapor) {
        if (laporanTerkait && laporanTerkait.idLaporan) {
          aksiLaporan = laporanTerkait.bisaPerbaiki ? 'PERBAIKI' : 'LIHAT';
        } else {
          aksiLaporan = 'PERBAIKI';
        }
      }
      var statusLapor = hitungStatusLaporDisposisi_(s, pStatus);
      var cutoffPelaporan = cutoffPelaporanDisposisi_(s);
      if (cutoffPelaporan.periodeDitutup) {
        if (aksiLaporan === 'BUAT') {
          aksiLaporan = 'TERKUNCI_CUTOFF';
        } else if (aksiLaporan === 'PERBAIKI') {
          aksiLaporan = (laporanTerkait && laporanTerkait.idLaporan) ? 'LIHAT' : 'TERKUNCI_CUTOFF';
        }
      }
      return {
        idDisposisi: normalizeId_(p.id_disposisi),
        nomor: s.nomor_disposisi || "-",
        tanggal: formatTanggalIndonesiaDisposisi_(s.tanggal_disposisi, false),
        jenis: s.jenis_disposisi || "-",
        perihal: s.perihal || "-",
        isiInstruksi: s.isi_ringkas_instruksi || "",
        pemberiNama: s.pemberi_nama || "-",
        pemberiJabatan: s.pemberi_jabatan || "-",
        lampiranUrl: safeHttpUrlServer_(s.lampiran_url),
        lampiranNama: s.lampiran_nama || "",
        statusBaca: p.status_baca || DISPOSISI_BACA.BARU,
        statusTindakLanjut: pStatus.status_tindak_lanjut || DISPOSISI_TINDAK.BELUM,
        tanggalMulai: formatTanggalIndonesiaDisposisi_(s.tanggal_mulai, false),
        tanggalSelesai: formatTanggalIndonesiaDisposisi_(s.tanggal_selesai, false),
        batasLapor: statusLapor.batasLabel,
        batasLaporIso: statusLapor.batasIso,
        periodePelaporan: cutoffPelaporan.periode || '',
        periodePelaporanLabel: cutoffPelaporan.periodeLabel || '',
        periodePelaporanDitutup: !!cutoffPelaporan.periodeDitutup,
        cutoffPelaporanLabel: cutoffPelaporan.cutoffLabel || '',
        pesanPeriodeDitutup: cutoffPelaporan.pesan || '',
        statusLaporCode: statusLapor.code,
        statusLaporLabel: statusLapor.label,
        isTerlambatLapor: statusLapor.terlambatBelumLapor,
        laporanTerlambat: statusLapor.sudahTerlambat,
        waktuLaporLabel: statusLapor.waktuLaporLabel,
        statusDisposisi: s.status_disposisi || DISPOSISI_STATUS.TERBIT,
        idLaporanTerkait: normalizeId_(pStatus.id_laporan_terkait),
        laporanTerkaitStatus: laporanTerkait ? (laporanTerkait.status || '') : '',
        laporanTerkaitWaktu: laporanTerkait ? (laporanTerkait.waktu || '') : '',
        laporanTerkaitKategori: laporanTerkait ? (laporanTerkait.kategori || '') : '',
        laporanTerkaitPoin: laporanTerkait ? Number(laporanTerkait.poinFinal || 0) : 0,
        aksiLaporan: aksiLaporan,
        _ts: ts ? ts.getTime() : 0
      };
    })
    .sort(function (a, b) { return (b._ts || 0) - (a._ts || 0); });
}

function getDisposisiSuratByIdInternal_(idDisposisi) {
  var key = normalizeId_(idDisposisi);
  if (!key) return null;
  var rows = ambilSemuaSuratDisposisiInternal_();
  for (var i = 0; i < rows.length; i++) {
    if (idsEqual_(rows[i].id_disposisi, key)) return rows[i];
  }
  return null;
}

function getDisposisiPenerimaForUserInternal_(idDisposisi, idUser) {
  var key = normalizeId_(idDisposisi);
  var userKey = normalizeId_(idUser);
  if (!key || !userKey) return null;
  var rows = ambilSemuaPenerimaDisposisiInternal_();
  for (var i = 0; i < rows.length; i++) {
    if (idsEqual_(rows[i].id_disposisi, key) && idsEqual_(rows[i].id_penerima, userKey)) {
      return rows[i];
    }
  }
  return null;
}

function tandaiDisposisiSudahDilaporkanInternal_(idDisposisi, idUser, idLaporan) {
  var penerima = getDisposisiPenerimaForUserInternal_(idDisposisi, idUser);
  if (!penerima) return false;
  var sh = ensureSheetDisposisiPenerima_();
  var C = SHEET_COLUMNS.DISPOSISI_PENERIMA;
  var now = new Date();
  sh.getRange(penerima.rowIndex, C.STATUS_BACA + 1).setValue(DISPOSISI_BACA.DIBUKA);
  sh.getRange(penerima.rowIndex, C.STATUS_TINDAK_LANJUT + 1).setValue(DISPOSISI_TINDAK.SUDAH);
  sh.getRange(penerima.rowIndex, C.ID_LAPORAN_TERKAIT + 1).setValue(normalizeId_(idLaporan));
  sh.getRange(penerima.rowIndex, C.WAKTU_LAPOR + 1).setValue(now);
  var surat = getDisposisiSuratByIdInternal_(idDisposisi) || {};
  var batas = batasLaporDisposisi_(surat.tanggal_selesai);
  var catatan = "Laporan dikirim dari tombol Buat Laporan dari Disposisi.";
  if (batas) {
    catatan += now.getTime() > batas.getTime()
      ? " Status: terlambat dari batas laporan " + formatTanggalIndonesiaDisposisi_(batas, true) + "."
      : " Status: tepat waktu sebelum batas laporan " + formatTanggalIndonesiaDisposisi_(batas, true) + ".";
  }
  sh.getRange(penerima.rowIndex, C.CATATAN_TINDAK_LANJUT + 1).setValue(catatan);
  sh.getRange(penerima.rowIndex, C.DIUBAH_PADA + 1).setValue(now);
  return true;
}


function routeFormDisposisiUntukPegawai_(pegawai, surat) {
  var jab = String((pegawai && pegawai.jabatan) || '').toLowerCase();
  var jenis = String((surat && surat.jenis_disposisi) || '').toUpperCase();

  // Routing laporan disposisi harus berbasis jabatan penerima, bukan jabatan pemberi disposisi.
  // Staf PHL selalu memakai Laporan Harian PHL.
  if (jab.indexOf('phl') !== -1 || jab.indexOf('lepas') !== -1) return 'PHL';
  if (jenis === 'TUGAS_UMUM') return 'TU';

  if (jenis === 'TUGAS_PIMPINAN') {
    // Urutan penting: "staf dukuh" tetap diperlakukan sebagai Staf Pamong, bukan Dukuh.
    if (jab.indexOf('staf') !== -1) return 'STAF_INSTRUKSI';

    // Dukuh punya route khusus agar tidak salah masuk Reguler/Tupoksi atau laporan wajib bulanan Dukuh.
    if (jab.indexOf('dukuh') !== -1) return 'DUKUH_INSTRUKSI';

    // PATCH v2026.05.10.16:
    // Carik/Kaur/Kasi/Pamong non-staf boleh menindaklanjuti disposisi Tugas Pimpinan
    // melalui Form Pelaksanaan Tugas Pimpinan, bukan dipaksa ke Form Reguler/Tupoksi.
    // Reguler/Tupoksi hanya dipakai jika jenis disposisinya memang diarahkan ke tupoksi.
    return 'PIMPINAN';
  }

  return 'TU';
}

function validasiRouteFormLaporanDisposisi_(pegawai, surat, paket, kategoriSheet) {
  if (!surat || !paket) return { sukses: true };
  var route = routeFormDisposisiUntukPegawai_(pegawai, surat);
  var kat = String(kategoriSheet || paket.kategori || '');
  var msg = '';

  if (route === 'PHL' && !(paket.detailPHL || kat.indexOf(KATEGORI_LAP.PHL) !== -1)) {
    msg = 'Akun Staf PHL wajib menindaklanjuti disposisi melalui Form Laporan Harian PHL.';
  } else if (route === 'TU' && !paket.detailTU) {
    msg = 'Disposisi tugas umum wajib ditindaklanjuti melalui Form Laporan Tugas Umum.';
  } else if (route === 'STAF_INSTRUKSI' && !paket.detailStafInstruksi) {
    msg = 'Akun Staf Pamong wajib menindaklanjuti tugas pimpinan melalui Form Pelaksanaan Instruksi Pimpinan.';
  } else if (route === 'REGULER_TUPOKSI' && !paket.detailReguler) {
    msg = 'Akun Carik/Kaur/Kasi wajib menindaklanjuti tugas pimpinan melalui Form Kegiatan Reguler/Tupoksi.';
  } else if (route === 'DUKUH_INSTRUKSI' && !paket.detailPimpinan) {
    msg = 'Akun Dukuh wajib menindaklanjuti tugas pimpinan melalui Form Pelaksanaan kegiatan tugas dan/atau instruksi Pimpinan.';
  } else if (route === 'PIMPINAN' && !paket.detailPimpinan) {
    msg = 'Disposisi tugas pimpinan wajib ditindaklanjuti melalui Form Pelaksanaan Tugas Pimpinan.';
  }

  return msg ? { sukses: false, pesan: msg } : { sukses: true, route: route };
}

function ambilDisposisiUntukLaporan(idDisposisi, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };

    var surat = getDisposisiSuratByIdInternal_(idDisposisi);
    if (!surat) return { sukses: false, pesan: "Disposisi tidak ditemukan." };

    var penerima = getDisposisiPenerimaForUserInternal_(idDisposisi, idUser);
    if (!penerima) return { sukses: false, pesan: "Anda bukan penerima disposisi ini." };
    var pegawai = getPegawaiById_(idUser);
    var routeForm = routeFormDisposisiUntukPegawai_(pegawai, surat);

    if ((surat.status_disposisi || DISPOSISI_STATUS.TERBIT) === DISPOSISI_STATUS.DIBATALKAN) {
      return { sukses: false, pesan: "Disposisi ini sudah dibatalkan." };
    }

    var cutoffPelaporan = cutoffPelaporanDisposisi_(surat);
    if (cutoffPelaporan.periodeDitutup) {
      return { sukses: false, pesan: cutoffPelaporan.pesan || "Periode pelaporan disposisi sudah ditutup. Laporan baru tidak dapat dibuat." };
    }

    if ((penerima.status_baca || "") !== DISPOSISI_BACA.DIBUKA) {
      try { tandaiDisposisiSudahDibuka(idDisposisi, token); } catch (e) { }
    }

    return {
      sukses: true,
      data: {
        idDisposisi: normalizeId_(surat.id_disposisi),
        nomor: surat.nomor_disposisi || "-",
        jenis: surat.jenis_disposisi || "-",
        perihal: surat.perihal || "",
        isiInstruksi: surat.isi_ringkas_instruksi || "",
        pemberiNama: surat.pemberi_nama || "",
        pemberiJabatan: surat.pemberi_jabatan || "",
        diinputOlehNama: surat.diinput_oleh_nama || "",
        diinputOlehJabatan: surat.diinput_oleh_jabatan || "",
        modeInput: surat.mode_input || "",
        sumberDisposisi: surat.sumber_disposisi || "",
        lampiranUrl: safeHttpUrlServer_(surat.lampiran_url),
        lampiranNama: surat.lampiran_nama || "",
        tanggalDisposisiIso: formatTanggalISODisposisi_(surat.tanggal_disposisi),
        tanggalMulaiIso: formatTanggalISODisposisi_(surat.tanggal_mulai),
        tanggalSelesaiIso: formatTanggalISODisposisi_(surat.tanggal_selesai),
        tanggalDisposisiLabel: formatTanggalIndonesiaDisposisi_(surat.tanggal_disposisi, false),
        tanggalMulaiLabel: formatTanggalIndonesiaDisposisi_(surat.tanggal_mulai, false),
        tanggalSelesaiLabel: formatTanggalIndonesiaDisposisi_(surat.tanggal_selesai, false),
        batasLaporLabel: formatBatasLaporDisposisi_(surat.tanggal_selesai),
        batasLaporIso: isoBatasLaporDisposisi_(surat.tanggal_selesai),
        periodePelaporan: cutoffPelaporan.periode || '',
        periodePelaporanLabel: cutoffPelaporan.periodeLabel || '',
        periodePelaporanDitutup: !!cutoffPelaporan.periodeDitutup,
        cutoffPelaporanLabel: cutoffPelaporan.cutoffLabel || '',
        routeForm: routeForm,
        statusBaca: penerima.status_baca || DISPOSISI_BACA.BARU,
        statusTindakLanjut: penerima.status_tindak_lanjut || DISPOSISI_TINDAK.BELUM,
        statusDisposisi: surat.status_disposisi || DISPOSISI_STATUS.TERBIT
      }
    };
  } catch (e) {
    return handleError("ambilDisposisiSaya", e, { sukses: false, pesan: "" });
  }
}

function tandaiDisposisiSudahDibuka(idDisposisi, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };
    var sh = ensureSheetDisposisiPenerima_();
    var rows = ambilSemuaPenerimaDisposisiInternal_().filter(function (r) {
      return idsEqual_(r.id_disposisi, idDisposisi) && idsEqual_(r.id_penerima, idUser);
    });
    if (!rows.length) return { sukses: false, pesan: "Disposisi penerima tidak ditemukan." };
    var now = new Date();
    rows.forEach(function (r) {
      if ((r.status_baca || "") !== DISPOSISI_BACA.DIBUKA) {
        var C = SHEET_COLUMNS.DISPOSISI_PENERIMA;
        sh.getRange(r.rowIndex, C.STATUS_BACA + 1).setValue(DISPOSISI_BACA.DIBUKA);
        sh.getRange(r.rowIndex, C.DIUBAH_PADA + 1).setValue(now);
      }
    });
    logDisposisi_(idDisposisi, "BUKA_DISPOSISI", idUser, "Penerima membuka disposisi.");
    return { sukses: true, pesan: "Status baca disposisi diperbarui." };
  } catch (e) {
    return handleError("tandaiDisposisiSudahDibuka", e, { sukses: false, pesan: "" });
  }
}

function getDisposisiBootstrap(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return { sukses: false, pesan: "Data pegawai tidak ditemukan." };

    ensureSheetDisposisiSurat_();
    ensureSheetDisposisiPenerima_();
    ensureSheetDisposisiLog_();
    ensureSheetDisposisiPetugas_();

    var canManage = cekHakAksesLurahDisposisi_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();
    var canOperateDisposisi = !canManage && !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser));
    var pegawaiList = (canManage || canOperateDisposisi) ? getDaftarPegawaiAktifUntukDisposisiInternal_() : [];
    var pemberiUntukDaftar = canManage ? idUser : (canOperateDisposisi && petugasAktif ? petugasAktif.ditetapkanOlehId : idUser);
    var daftarLurah = (canManage || canOperateDisposisi) ? ambilDaftarDisposisiLurahInternal_(pemberiUntukDaftar) : [];
    var disposisiSaya = ambilDisposisiSayaInternal_(idUser);

    return {
      sukses: true,
      canManage: canManage,
      canOperateDisposisi: canOperateDisposisi,
      petugasDisposisiAktif: petugasDisposisiToClient_(petugasAktif),
      currentUser: {
        id: normalizeId_(pegawai.id),
        nama: pegawai.nama || '',
        jabatan: pegawai.jabatan || '',
        username: pegawai.username || ''
      },
      pegawaiAktif: getDaftarPegawaiAktifUntukDisposisiInternal_().length,
      pegawaiList: pegawaiList,
      daftarLurah: daftarLurah,
      disposisiSaya: disposisiSaya,
      sheetStatus: {
        surat: 'Disposisi_Surat',
        penerima: 'Disposisi_Penerima',
        log: 'Disposisi_Log',
        petugas: 'Disposisi_Petugas'
      },
      tahap: '1D'
    };
  } catch (e) {
    return handleError("getDisposisiBootstrap", e, { sukses: false, pesan: "Gagal memuat modul disposisi: " + (e && e.message ? e.message : e) });
  }
}
// ===== END DISPOSISI SURAT TAHAP 1C =====

// ===== PATCH UTILITAS TUNJANGAN APRIL 2026 =====
// Jalankan perbaikiKolomPeriodeTunjangan() satu kali setelah paste kode ini,
// terutama jika data draft sebelumnya sudah terlanjur tersimpan dengan kolom periode
// yang dibaca sebagai Date oleh Google Sheets.
function perbaikiKolomPeriodeTunjangan() {
  var sh = ensureSheetRekapTunjanganBulanan_();
  var lastRow = sh.getLastRow();

  try {
    sh.getRange("A:A").setNumberFormat("@");
  } catch (e) {}

  if (lastRow < 2) {
    Logger.log("Tidak ada data tunjangan yang perlu diperbaiki.");
    return { sukses: true, pesan: "Tidak ada data tunjangan yang perlu diperbaiki." };
  }

  var range = sh.getRange(2, 1, lastRow - 1, 1);
  var values = range.getValues();
  var fixed = values.map(function (row) {
    return [periodeKeyTunjangan_(row[0], false)];
  });

  range.setNumberFormat("@");
  range.setValues(fixed);

  var pesan = "Kolom periode tunjangan diperbaiki: " + fixed.length + " baris.";
  Logger.log(pesan);
  return { sukses: true, pesan: pesan };
}


// DEBUG REMOVED FROM PRODUCTION: debugCekBatchTunjanganPeriode

// DEBUG REMOVED FROM PRODUCTION: debugCekBatchTunjanganApril2026
// ===== PATCH v11: Cut-off April valid sampai baris 703, buka kembali 28/04/2026 00:00 =====
// Kebijakan April 2026:
// - Laporan sampai 27/04/2026 18:13:40 tetap masuk periode April.
// - Laporan 27/04/2026 18:13:41 s.d. 27/04/2026 23:59:59 tidak memperoleh poin dan tidak masuk tunjangan.
// - Laporan mulai 28/04/2026 00:00 masuk periode berikutnya, bukan koreksi lewat cut-off April.
function parseJamCutoffTunjangan_(jamCutoff) {
  var fallback = (DEFAULT_TUNJANGAN_CUTOFF_TIME || "18:00").toString().trim();
  var raw = (jamCutoff === null || jamCutoff === undefined || jamCutoff === "") ? fallback : jamCutoff.toString().trim();
  var m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error("Jam cut-off harus valid (format HH:mm atau HH:mm:ss, contoh 18:13:40).");

  var h = parseInt(m[1], 10);
  var min = parseInt(m[2], 10);
  var sec = m[3] === undefined ? 59 : parseInt(m[3], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw new Error("Jam cut-off harus valid (format HH:mm atau HH:mm:ss, contoh 18:13:40).");
  }

  var label = String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
  if (m[3] !== undefined) label += ":" + String(sec).padStart(2, "0");

  return { jam: h, menit: min, detik: sec, label: label };
}

function metaCutoffTunjanganApril2026_() {
  return buildDateRangeMeta_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
}

function batasBukaKembaliApril2026_() {
  return new Date(2026, 3, 28, 0, 0, 0, 0);
}

function isBlackoutCutoffApril2026_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) return false;
  var meta = metaCutoffTunjanganApril2026_();
  var buka = batasBukaKembaliApril2026_();
  return d.getTime() > meta.endInclusive.getTime() && d.getTime() < buka.getTime();
}

function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: "", meta: null };
  }

  if (isBlackoutCutoffApril2026_(d)) {
    return {
      valid: true,
      lewatCutoff: true,
      periode: "2026-04",
      meta: metaCutoffTunjanganApril2026_(),
      tanggalLaporan: d
    };
  }

  return {
    valid: true,
    lewatCutoff: false,
    periode: periodeDariTanggalLaporan_(d),
    meta: null,
    tanggalLaporan: d
  };
}

function aturCutoffTunjanganApril2026() {
  var meta = simpanCutoffTunjanganPeriode_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
  Logger.log("Cut-off April 2026 disimpan: " + JSON.stringify({
    tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
    tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
    tanggalCutoff: meta.tanggalCutoff,
    jamCutoff: meta.jamCutoff,
    bukaKembali: "2026-04-28 00:00:00"
  }));
  return {
    sukses: true,
    pesan: "Cut-off April 2026 disimpan: " + meta.tanggalCutoff + ". Buka kembali: 2026-04-28 00:00:00",
    meta: {
      periode: "2026-04",
      tanggalMulaiPeriode: meta.tanggalMulaiPeriode,
      tanggalAkhirPeriode: meta.tanggalAkhirPeriode,
      tanggalCutoff: meta.tanggalCutoff,
      jamCutoff: meta.jamCutoff,
      bukaKembali: "2026-04-28 00:00:00"
    }
  };
}

function koreksiLaporanLewatCutoffApril2026() {
  return koreksiLaporanBlackoutCutoffApril2026_();
}

function koreksiLaporanBlackoutCutoffApril2026_() {
  try {
    var meta = simpanCutoffTunjanganPeriode_("2026-04", "2026-04-01", "2026-04-27", "18:13:40");
    var buka = batasBukaKembaliApril2026_();
    var sh = getSheet_("Rekap_Kinerja");
    var data = sh.getDataRange().getValues();
    var statusLewat = statusReviewLewatCutoff_();

    var totalBlackout = 0;
    var statusDisetujuiDikoreksi = 0;
    var statusSudahLewatCutoff = 0;
    var masihMenungguAtauLainnya = 0;
    var poinDinolkan = 0;
    var sample = [];

    for (var i = 1; i < data.length; i++) {
      var tglLap = parseTanggal(data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime()) || tglLap.getTime() === 0) continue;

      // Mekanisme blackout berlaku untuk SEMUA laporan pada jeda:
      // setelah 27/04/2026 18:13:40 sampai sebelum 28/04/2026 00:00:00.
      if (!(tglLap.getTime() > meta.endInclusive.getTime() && tglLap.getTime() < buka.getTime())) continue;

      totalBlackout++;

      var statusLama = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "").toString();
      var poinLama = Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
      var catatanLama = data[i][SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN] || "";
      var statusBaru = statusLama;

      // Semua laporan di jeda cut-off harus bernilai 0, termasuk yang masih Menunggu Review.
      // Jika nanti Admin menekan Setuju, prosesReviewAdmin() tetap akan memaksa status
      // menjadi "Disetujui - Lewat Cut-off" dan poin tetap 0.
      if (poinLama !== 0) {
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL + 1).setValue(0);
        poinDinolkan++;
      }

      sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN + 1).setValue(gabungCatatanCutoff_(catatanLama, meta));

      if (isStatusApproved_(statusLama)) {
        statusBaru = statusLewat;
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW + 1).setValue(statusBaru);
        if (!data[i][SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN]) {
          sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN + 1).setValue(new Date());
        }
        statusDisetujuiDikoreksi++;
      } else if (isStatusLewatCutoff_(statusLama)) {
        statusBaru = statusLewat;
        sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW + 1).setValue(statusBaru);
        if (!data[i][SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN]) {
          sh.getRange(i + 1, SHEET_COLUMNS.REKAP_KINERJA.WAKTU_REVIEW_ADMIN + 1).setValue(new Date());
        }
        statusSudahLewatCutoff++;
      } else {
        // Menunggu Review, Ditolak, Banding, dan status lain tetap tidak otomatis disetujui.
        // Tetapi sudah diberi catatan cut-off dan poinnya dipaksa 0.
        masihMenungguAtauLainnya++;
      }

      if (sample.length < 20) {
        sample.push({
          row: i + 1,
          idLaporan: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
          nama: (data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "").toString(),
          tanggalLaporan: formatTanggalJamClient_(tglLap),
          statusLama: statusLama,
          statusBaru: statusBaru,
          poinLama: poinLama,
          poinBaru: 0
        });
      }
    }

    if (poinDinolkan || statusDisetujuiDikoreksi || statusSudahLewatCutoff) invalidasiCacheRekapKinerjaReadOnly_();

    logAudit("SYSTEM", "KOREKSI_BLACKOUT_CUTOFF_APRIL_2026", "Cut-off: " + meta.tanggalCutoff + " | Buka kembali: 2026-04-28 00:00:00 | Status disetujui dikoreksi: " + statusDisetujuiDikoreksi + " | Poin dinolkan: " + poinDinolkan + " | Total blackout: " + totalBlackout);

    var hasil = {
      sukses: true,
      pesan: "Koreksi blackout cut-off April selesai. Semua laporan pada jeda cut-off sudah ditandai/dinolkan. Total laporan pada jeda cut-off: " + totalBlackout + ".",
      periode: "2026-04",
      tanggalCutoff: meta.tanggalCutoff,
      bukaKembali: "2026-04-28 00:00:00",
      totalBlackoutCutoff: totalBlackout,
      statusDisetujuiDikoreksi: statusDisetujuiDikoreksi,
      statusSudahLewatCutoff: statusSudahLewatCutoff,
      masihMenungguAtauLainnya: masihMenungguAtauLainnya,
      poinDinolkan: poinDinolkan,
      sample: sample
    };
    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;
  } catch (e) {
    return handleError("koreksiLaporanBlackoutCutoffApril2026", e, { sukses: false, pesan: "" });
  }
}

// ===== v14: BLOKIR INPUT LAPORAN SELAMA JEDA CUT-OFF =====
// Mekanisme ini berlaku umum untuk periode yang cut-off-nya sudah disimpan.
// Contoh: jika cut-off Mei 2026 adalah 27/05/2026 18:00, maka input laporan
// ditutup mulai setelah jam tersebut sampai 28/05/2026 00:00.
function tanggalBukaKembaliCutoff_(meta) {
  var end = meta && meta.endInclusive;
  if (!(end instanceof Date) || isNaN(end.getTime())) {
    end = parseTanggal(meta && meta.tanggalCutoff ? meta.tanggalCutoff : "");
  }
  if (!(end instanceof Date) || isNaN(end.getTime())) return null;
  return new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, 0, 0);
}

function isTanggalDalamJedaCutoff_(tanggal, meta) {
  var d = tanggal instanceof Date ? tanggal : parseTanggal(tanggal);
  if (!(d instanceof Date) || isNaN(d.getTime())) return false;
  if (!meta || !(meta.endInclusive instanceof Date) || isNaN(meta.endInclusive.getTime())) return false;
  var buka = tanggalBukaKembaliCutoff_(meta);
  if (!(buka instanceof Date) || isNaN(buka.getTime())) return false;
  return d.getTime() > meta.endInclusive.getTime() && d.getTime() < buka.getTime();
}

function metaCutoffTunjanganTersimpan_() {
  var metas = [];
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (key.indexOf("TUNJANGAN_CUTOFF_META_") !== 0) continue;
      try {
        var obj = JSON.parse(props[key] || "{}");
        if (!obj || !obj.periode) continue;
        metas.push(ambilCutoffTunjanganPeriode_(obj.periode));
      } catch (inner) {
        Logger.log("Gagal parsing meta cut-off " + key + ": " + (inner && inner.message ? inner.message : inner));
      }
    }
  } catch (e) {
    Logger.log("Gagal membaca daftar meta cut-off: " + (e && e.message ? e.message : e));
  }

  try {
    var april = metaCutoffTunjanganApril2026_();
    var adaApril = false;
    for (var i = 0; i < metas.length; i++) {
      if (formatTanggalISO_(metas[i].endInclusive).slice(0, 7) === "2026-04") {
        adaApril = true;
        break;
      }
    }
    if (!adaApril) metas.push(april);
  } catch (aprilErr) {}

  return metas;
}

function statusInputLaporanCutoffSaatIni_() {
  var now = new Date();
  var metas = metaCutoffTunjanganTersimpan_();
  for (var i = 0; i < metas.length; i++) {
    var meta = metas[i];
    if (!meta) continue;
    if (isTanggalDalamJedaCutoff_(now, meta)) {
      var buka = tanggalBukaKembaliCutoff_(meta);
      var label = meta.labelPembayaran || "periode berjalan";
      var mulai = formatTanggalJamClient_(meta.endInclusive);
      var kembali = buka ? formatTanggalJamClient_(buka) : "-";
      return {
        sukses: true,
        ditutup: true,
        labelPembayaran: label,
        mulaiCutoff: mulai,
        bukaKembali: kembali,
        pesan: "Input laporan ditutup karena " + label + " sudah memasuki cut-off.\n" +
          "Cut-off dimulai: " + mulai + "\n" +
          "Input dibuka kembali: " + kembali + "\n\n" +
          "Laporan dapat diajukan kembali setelah jeda cut-off berakhir dan akan masuk periode berikutnya."
      };
    }
  }
  return { sukses: true, ditutup: false, pesan: "Input laporan sedang dibuka." };
}

function ambilStatusInputLaporanCutoff(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, sessionExpired: true, ditutup: false, pesan: "Sesi habis, silakan login ulang." };
    return statusInputLaporanCutoffSaatIni_();
  } catch (e) {
    return handleError("ambilStatusInputLaporanCutoff", e, { sukses: false, ditutup: false, pesan: "" });
  }
}

function simpanCutoffInputLaporanPeriode(periode, tanggalMulai, tanggalAkhir, jamCutoff, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis, silakan login ulang." };
    if (!cekHakAksesAdmin(idUser) && !cekHakAksesCarikTunjangan(idUser)) {
      return { sukses: false, pesan: "Akses ditolak. Hanya Admin/Carik yang dapat menyimpan cut-off input laporan." };
    }

    var meta = simpanCutoffTunjanganPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff);
    var buka = tanggalBukaKembaliCutoff_(meta);
    logAudit(idUser, "SIMPAN_CUTOFF_INPUT_LAPORAN", normalizePeriode_(periode) + " | Cut-off: " + meta.tanggalCutoff + " | Buka kembali: " + formatTanggalJamClient_(buka));
    return {
      sukses: true,
      pesan: "Cut-off input laporan berhasil disimpan. Input akan ditutup setelah " + meta.tanggalCutoff + " dan dibuka kembali pada " + formatTanggalJamClient_(buka) + ".",
      periode: normalizePeriode_(periode),
      labelPembayaran: meta.labelPembayaran,
      tanggalCutoff: meta.tanggalCutoff,
      bukaKembali: formatTanggalJamClient_(buka)
    };
  } catch (e) {
    return handleError("simpanCutoffInputLaporanPeriode", e, { sukses: false, pesan: "" });
  }
}

// Override evaluasi cut-off laporan: laporan hanya dianggap lewat cut-off pada jeda
// setelah cut-off sampai sebelum input dibuka kembali. Laporan setelah 00:00 hari
// berikutnya tidak dikoreksi sebagai lewat cut-off periode sebelumnya.
function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: "", meta: null };
  }

  var p = periodeDariTanggalLaporan_(d);
  if (!p) return { valid: false, lewatCutoff: false, periode: "", meta: null };

  var meta = ambilCutoffTunjanganPeriode_(p);
  var buka = tanggalBukaKembaliCutoff_(meta);
  return {
    valid: true,
    lewatCutoff: isTanggalDalamJedaCutoff_(d, meta),
    periode: p,
    meta: meta,
    tanggalLaporan: d,
    bukaKembali: buka
  };
}


// ===== REVIEW ADMIN v26 HOTFIX: pastikan kolom K-Q benar-benar dikirim ke frontend =====
function buildAdminCoreDetailFromRow_(row) {
  row = row || [];
  var C = SHEET_COLUMNS.REKAP_KINERJA;

  function text_(value, options) {
    options = options || {};
    if (options.dateOnly) {
      var f = formatSpreadsheetReviewDateOnly_(value);
      if (f) return f;
    }
    return adminDetailText_(value);
  }

  return {
    dasarKehadiran: text_(row[C.DASAR_KEGIATAN]),
    namaKegiatan: text_(row[C.NAMA_KEGIATAN]),
    tanggalPelaksanaan: text_(row[C.TANGGAL_KEGIATAN], { dateOnly: true }),
    tempatLokasi: text_(row[C.LOKASI_KEGIATAN]),
    penyelenggara: text_(row[C.PENYELENGGARA]),
    peranPartisipasi: text_(row[C.PERAN])
  };
}

function buildAdminSpreadsheetDetailFromRow_(row) {
  row = row || [];
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var fields = [];

  // Data utama tetap dikirim untuk audit internal. Frontend tidak menampilkannya ulang.
  pushSpreadsheetReviewField_(fields, 'A', 'Waktu Lapor', row[C.TANGGAL_LAPORAN], { dateTime: true });
  pushSpreadsheetReviewField_(fields, 'B', 'Nama Pegawai', row[C.NAMA]);
  pushSpreadsheetReviewField_(fields, 'C', 'Jabatan', row[C.JABATAN]);
  pushSpreadsheetReviewField_(fields, 'D', 'Kategori Kegiatan', row[C.KATEGORI]);
  pushSpreadsheetReviewField_(fields, 'E', 'Deskripsi dan Hasil Kegiatan', row[C.DESKRIPSI], { longText: true });
  pushSpreadsheetReviewField_(fields, 'H', 'Catatan Evaluasi Sistem', row[C.ALASAN_SISTEM], { longText: true });

  // Kolom K-Q adalah sumber kebenaran detail dasar untuk laporan lama dan baru.
  pushSpreadsheetReviewField_(fields, 'K', 'Dasar Kehadiran', row[C.DASAR_KEGIATAN]);
  pushSpreadsheetReviewField_(fields, 'M', 'Nama Kegiatan', row[C.NAMA_KEGIATAN]);
  pushSpreadsheetReviewField_(fields, 'N', 'Tanggal Pelaksanaan', row[C.TANGGAL_KEGIATAN], { dateOnly: true });
  pushSpreadsheetReviewField_(fields, 'O', 'Tempat / Lokasi', row[C.LOKASI_KEGIATAN]);
  pushSpreadsheetReviewField_(fields, 'P', 'Penyelenggara / Pihak Terkait', row[C.PENYELENGGARA]);
  pushSpreadsheetReviewField_(fields, 'Q', 'Peran / Partisipasi', row[C.PERAN]);

  var compareUmum = [
    { value: row[C.DASAR_KEGIATAN] },
    { value: row[C.NAMA_KEGIATAN] },
    { value: row[C.TANGGAL_KEGIATAN], options: { dateOnly: true } },
    { value: row[C.LOKASI_KEGIATAN] },
    { value: row[C.PENYELENGGARA] },
    { value: row[C.PERAN] }
  ];

  // Detail tambahan AD-BQ: hanya yang bernilai dan tidak duplikat dengan K-Q/deskripsi.
  pushSpreadsheetReviewFieldUnique_(fields, 'AF', 'Output / Hasil Kegiatan', row[C.OUTPUT_RINGKAS], { longText: true }, compareUmum.concat([{ value: row[C.DESKRIPSI] }]));
  pushSpreadsheetReviewFieldUnique_(fields, 'AG', 'Tindak Lanjut / Rekomendasi', row[C.TINDAK_LANJUT_REKOMENDASI], { longText: true }, compareUmum.concat([{ value: row[C.DESKRIPSI] }]));

  pushSpreadsheetReviewFieldIfValue_(fields, 'AH', 'Bidang APBKal', row[C.APBKAL_BIDANG]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AI', 'Kode Rekening APBKal', row[C.APBKAL_KODE_REKENING]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AJ', 'Nama Kegiatan APBKal', row[C.APBKAL_NAMA_KEGIATAN], {}, compareUmum);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AK', 'Termin Pencairan', row[C.APBKAL_TERMIN_PENCAIRAN]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AL', 'Tahapan Kegiatan APBKal', tahapApbLabel_(row[C.APBKAL_TAHAPAN_KEGIATAN]));
  pushSpreadsheetReviewFieldIfValue_(fields, 'AM', 'Status Pelaksanaan APBKal', row[C.APBKAL_STATUS_PELAKSANAAN]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AN', 'Batas Waktu Pelaporan APBKal', row[C.APBKAL_BATAS_WAKTU_PELAPORAN], { dateOnly: true });
  pushSpreadsheetReviewFieldUnique_(fields, 'AO', 'Tanggal Pelaksanaan Riil APBKal', row[C.APBKAL_TANGGAL_PELAKSANAAN_RIIL], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AP', 'Lokasi APBKal', row[C.APBKAL_LOKASI], {}, compareUmum);
  pushSpreadsheetReviewFieldIfValue_(fields, 'AQ', 'Metode Pelaksanaan APBKal', row[C.APBKAL_METODE]);

  pushSpreadsheetReviewFieldIfValue_(fields, 'AR', 'Jenis Pelaksanaan APBKal Tahun Berjalan', row[C.APBKAL_CARIK_JENIS_TUGAS]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AS', 'Nama Kegiatan APBKal Carik', row[C.APBKAL_CARIK_NAMA_KEGIATAN], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AT', 'Tanggal Pelaksanaan APBKal Carik', row[C.APBKAL_CARIK_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BR', 'Tempat / Lokasi APBKal Carik', row[C.APBKAL_CARIK_LOKASI], {}, compareUmum);

  pushSpreadsheetReviewFieldIfValue_(fields, 'AU', 'Jenis Tugas / Instruksi Pimpinan', row[C.PIMPINAN_JENIS_TUGAS]);
  pushSpreadsheetReviewFieldUnique_(fields, 'AV', 'Dasar Tugas / Instruksi', row[C.PIMPINAN_DASAR], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AW', 'Pemberi Tugas / Instruksi', row[C.PIMPINAN_PEMBERI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AX', 'Nama Agenda / Kegiatan', row[C.PIMPINAN_NAMA_AGENDA], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AY', 'Tanggal Pelaksanaan', row[C.PIMPINAN_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'AZ', 'Tempat / Lokasi', row[C.PIMPINAN_LOKASI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BA', 'Penyelenggara', row[C.PIMPINAN_PENYELENGGARA], {}, compareUmum);

  var jenisForm = normalizeReviewDetailType_(row[C.JENIS_FORM_DETAIL]);
  var jabatanNorm = normalizeReviewDetailType_(row[C.JABATAN]);
  var isStaf = jabatanNorm.indexOf('staf') !== -1;
  var isReguler = jenisForm === 'reguler_tupoksi' || jenisForm === 'kegiatan_reguler_tupoksi' || jenisForm === 'regular_tupoksi';
  var isStafReguler = jenisForm.indexOf('staf_reguler') !== -1;
  var bfLabels = (isStafReguler || (isStaf && !isReguler))
    ? ['Nama Tugas / Pekerjaan', 'Tanggal Pelaksanaan', 'Tempat / Lokasi', 'Sasaran / Pihak Terlibat', 'Peran / Partisipasi']
    : ['Nama Kegiatan', 'Tanggal Pelaksanaan', 'Tempat / Lokasi', 'Sasaran / Pihak Terlibat', 'Peran / Partisipasi'];

  pushSpreadsheetReviewFieldUnique_(fields, 'BB', 'Pemberi Instruksi Staf', row[C.STAF_INSTRUKSI_PEMBERI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BC', 'Bentuk Instruksi Staf', row[C.STAF_INSTRUKSI_BENTUK], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BD', 'Nama Tugas / Instruksi Staf', row[C.STAF_INSTRUKSI_NAMA_TUGAS], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BE', 'Tanggal Pelaksanaan Instruksi Staf', row[C.STAF_INSTRUKSI_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BS', 'Tempat / Lokasi Instruksi Staf', row[C.STAF_INSTRUKSI_LOKASI], {}, compareUmum);

  pushSpreadsheetReviewFieldUnique_(fields, 'BF', bfLabels[0], row[C.STAF_REGULER_NAMA_TUGAS], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BG', bfLabels[1], row[C.STAF_REGULER_TANGGAL_PELAKSANAAN], { dateOnly: true }, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BH', bfLabels[2], row[C.STAF_REGULER_LOKASI], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BI', bfLabels[3], row[C.STAF_REGULER_SASARAN], {}, compareUmum);
  pushSpreadsheetReviewFieldUnique_(fields, 'BJ', bfLabels[4], row[C.STAF_REGULER_PERAN], {}, compareUmum);

  pushSpreadsheetReviewFieldIfValue_(fields, 'BK', 'Kategori / Fungsi Dukuh', row[C.DUKUH_KATEGORI_FUNGSI]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'BL', 'Detail Fungsi / Kegiatan Dukuh', row[C.DUKUH_DETAIL_FUNGSI], { longText: true });
  pushSpreadsheetReviewFieldIfValue_(fields, 'BM', 'Pihak Terlibat Dukuh', row[C.DUKUH_PIHAK_TERLIBAT]);
  pushSpreadsheetReviewFieldIfValue_(fields, 'BN', 'Bulan Laporan Wajib Pamong', row[C.WAJIB_PAMONG_BULAN]);

  return {
    title: 'Detail Laporan dari Spreadsheet',
    source: 'Rekap_Kinerja',
    note: 'Data berikut dibaca dari kolom K-Q sebagai detail dasar, ditambah kolom AD-BQ bila tersedia.',
    fields: fields
  };
}


// DEBUG REMOVED FROM PRODUCTION: debugReviewAdminKolomKQ
// ===== END REVIEW ADMIN v26 HOTFIX =====


// ===== REVIEW ADMIN v26 DEBUG: cari nilai K-Q berdasarkan nama/kategori/tanggal tampil =====

// DEBUG REMOVED FROM PRODUCTION: debugReviewAdminCariKolomKQ

// DEBUG REMOVED FROM PRODUCTION: debugReviewAdminCariMeitantoRegulerKQ
// ===== END REVIEW ADMIN v26 DEBUG =====


// ===== PATCH v13: Dashboard Admin Kinerja mengikuti periode cut-off Tunjangan =====
// Dashboard Admin Kinerja tidak lagi memiliki aturan periode sendiri.
// Sumber kebenaran periode adalah meta cut-off Tunjangan:
// - jika periode sudah disimpan lewat modul Tunjangan, gunakan rentang tersimpan;
// - jika belum ada meta tersimpan, gunakan batas cut-off Tunjangan periode berjalan
//   dan mulai dari tepat setelah cut-off Tunjangan periode sebelumnya agar tidak overlap.

function cutoffTunjanganRawMeta_(periode) {
  var p = normalizePeriode_(periode);
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(cutoffPropertyKeyTunjangan_(p));
    if (raw) {
      var obj = JSON.parse(raw);
      if (obj && obj.periode) {
        return {
          ada: true,
          sumber: 'tersimpan_modul_tunjangan',
          periode: p,
          obj: obj,
          meta: buildDateRangeMeta_(p, obj.tanggalMulaiPeriode, obj.tanggalAkhirPeriode, obj.jamCutoff)
        };
      }
    }
  } catch (e) {
    Logger.log('Gagal membaca meta cut-off Tunjangan untuk dashboard ' + p + ': ' + (e && e.message ? e.message : e));
  }

  // Kebijakan khusus yang sudah disepakati tetap berada di helper Tunjangan,
  // bukan di Dashboard Admin Kinerja.
  if (p === '2026-04') {
    return {
      ada: true,
      sumber: 'kebijakan_tunjangan_april_2026',
      periode: p,
      obj: null,
      meta: metaCutoffTunjanganApril2026_()
    };
  }

  return {
    ada: false,
    sumber: 'default_cutoff_tunjangan',
    periode: p,
    obj: null,
    meta: buildDefaultDateRangeFromPeriode_(p)
  };
}

function periodeKeyOffset_(periode, offsetBulan) {
  var p = normalizePeriode_(periode);
  var m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return p;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10) - 1;
  return Utilities.formatDate(new Date(y, mo + (offsetBulan || 0), 1), 'GMT+7', 'yyyy-MM');
}

function rentangPeriodeTunjanganUntukDashboard_(periode) {
  var p = normalizePeriode_(periode);
  var current = cutoffTunjanganRawMeta_(p);
  var currentMeta = current.meta;
  var prevP = periodeKeyOffset_(p, -1);
  var prev = cutoffTunjanganRawMeta_(prevP);
  var prevMeta = prev.meta;

  var start = currentMeta.start;
  var startSource = current.sumber;

  // Jika periode belum disimpan di modul Tunjangan, jangan memakai fallback tanggal 26
  // secara membabi buta. Mulai dari tepat setelah cut-off periode sebelumnya.
  if (!current.ada && prevMeta && prevMeta.endInclusive instanceof Date && !isNaN(prevMeta.endInclusive.getTime())) {
    start = new Date(prevMeta.endInclusive.getTime() + 1);
    startSource = 'setelah_cutoff_tunjangan_sebelumnya';
  }

  // Guard umum agar Dashboard tidak pernah menghitung overlap dengan periode sebelumnya.
  // Jika admin menyimpan tanggal mulai yang lebih awal dari cut-off periode sebelumnya,
  // dashboard tetap mengikuti garis batas cut-off Tunjangan agar laporan tidak dobel periode.
  if (prevMeta && prevMeta.endInclusive instanceof Date && !isNaN(prevMeta.endInclusive.getTime())) {
    var minStart = new Date(prevMeta.endInclusive.getTime() + 1);
    if (!(start instanceof Date) || isNaN(start.getTime()) || start.getTime() < minStart.getTime()) {
      start = minStart;
      startSource = startSource + '+anti_overlap_cutoff_tunjangan';
    }
  }

  var end = currentMeta.end;
  var endInclusive = currentMeta.endInclusive;
  return {
    periode: p,
    year: parseInt(p.slice(0, 4), 10),
    month: parseInt(p.slice(5, 7), 10) - 1,
    start: start,
    end: end,
    endInclusive: endInclusive,
    labelPembayaran: currentMeta.labelPembayaran || labelPembayaranPeriode_(p),
    tanggalMulaiPeriode: formatTanggalISO_(start),
    tanggalMulaiPeriodeJam: formatTanggalJamISO_(start),
    tanggalAkhirPeriode: formatTanggalISO_(endInclusive),
    tanggalCutoff: formatTanggalJamISO_(endInclusive),
    jamCutoff: currentMeta.jamCutoff || DEFAULT_TUNJANGAN_CUTOFF_TIME,
    sumberCutoffTunjangan: startSource,
    sumberCutoffAkhir: current.sumber,
    periodeSebelumnya: prevP,
    cutoffSebelumnya: prevMeta ? formatTanggalJamISO_(prevMeta.endInclusive) : '',
    modePeriode: 'mengikuti_cutoff_tunjangan'
  };
}

function periodeDariTanggalLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) return '';

  // Cari periode efektif dengan membandingkan tanggal laporan terhadap rentang
  // cut-off Tunjangan bulan kalender, bulan sebelumnya, dan bulan berikutnya.
  // Ini membuat kasus setelah cut-off otomatis jatuh ke periode berikutnya.
  var bulanKalender = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  var kandidat = [periodeKeyOffset_(bulanKalender, -1), bulanKalender, periodeKeyOffset_(bulanKalender, 1)];
  for (var i = 0; i < kandidat.length; i++) {
    var meta = rentangPeriodeTunjanganUntukDashboard_(kandidat[i]);
    if (d.getTime() >= meta.start.getTime() && d.getTime() < meta.end.getTime()) return meta.periode;
  }

  // Fallback defensif: jika tidak masuk rentang apa pun, gunakan aturan akhir cut-off
  // periode bulan kalender dari modul Tunjangan.
  var current = cutoffTunjanganRawMeta_(bulanKalender).meta;
  if (d.getTime() <= current.endInclusive.getTime()) return bulanKalender;
  return periodeKeyOffset_(bulanKalender, 1);
}

function parsePeriodeBulan_(periode) {
  var p;
  try {
    p = normalizePeriode_(periode);
  } catch (e) {
    p = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM');
  }

  var periodeMeta = rentangPeriodeTunjanganUntukDashboard_(p);
  var year = periodeMeta.year;
  var month = periodeMeta.month;

  // Predikat triwulan mengikuti periode pembayaran Tunjangan, bukan kalender murni.
  var triMonth = Math.floor(month / 3) * 3;
  var triFirstP = Utilities.formatDate(new Date(year, triMonth, 1), 'GMT+7', 'yyyy-MM');
  var triLastP = Utilities.formatDate(new Date(year, triMonth + 2, 1), 'GMT+7', 'yyyy-MM');
  var triFirstMeta = rentangPeriodeTunjanganUntukDashboard_(triFirstP);
  var triLastMeta = rentangPeriodeTunjanganUntukDashboard_(triLastP);

  periodeMeta.triStart = triFirstMeta.start;
  periodeMeta.triEnd = triLastMeta.end;
  return periodeMeta;
}

function dashboardAdminKinerjaPeriodeMeta_(meta) {
  meta = meta || {};
  return {
    periode: meta.periode || '',
    labelPembayaran: meta.labelPembayaran || (meta.periode ? labelPembayaranPeriode_(meta.periode) : ''),
    tanggalMulaiPeriode: meta.tanggalMulaiPeriode || (meta.start ? formatTanggalISO_(meta.start) : ''),
    tanggalMulaiPeriodeJam: meta.tanggalMulaiPeriodeJam || (meta.start ? formatTanggalJamISO_(meta.start) : ''),
    tanggalAkhirPeriode: meta.tanggalAkhirPeriode || (meta.endInclusive ? formatTanggalISO_(meta.endInclusive) : ''),
    tanggalCutoff: meta.tanggalCutoff || (meta.endInclusive ? formatTanggalJamISO_(meta.endInclusive) : ''),
    jamCutoff: meta.jamCutoff || DEFAULT_TUNJANGAN_CUTOFF_TIME,
    modePeriode: meta.modePeriode || 'mengikuti_cutoff_tunjangan',
    sumberCutoffTunjangan: meta.sumberCutoffTunjangan || '',
    sumberCutoffAkhir: meta.sumberCutoffAkhir || '',
    periodeSebelumnya: meta.periodeSebelumnya || '',
    cutoffSebelumnya: meta.cutoffSebelumnya || ''
  };
}


// DEBUG REMOVED FROM PRODUCTION: debugPeriodeEfektifDashboardAdmin
// ===== END PATCH v13 =====



// ===== PATCH v14: Review Admin mengikuti jeda cut-off input laporan dan fallback tanggal pelaksanaan =====
// Catatan: periode efektif Dashboard dapat menjadi bulan berikutnya, tetapi laporan yang
// dibuat pada jeda setelah cut-off sampai sebelum 00:00 tetap harus ditandai lewatCutoff.
function kandidatMetaCutoffUntukTanggalReview_(tanggalObj) {
  var d = tanggalObj instanceof Date ? tanggalObj : parseTanggal(tanggalObj);
  if (!(d instanceof Date) || isNaN(d.getTime())) return [];

  var bulanKalender = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  var periodeKandidat = [periodeKeyOffset_(bulanKalender, -1), bulanKalender, periodeKeyOffset_(bulanKalender, 1)];
  var hasil = [];
  var seen = {};

  function addMeta_(periode, meta, sumber) {
    if (!periode || !meta || !(meta.endInclusive instanceof Date) || isNaN(meta.endInclusive.getTime())) return;
    var key = periode + '|' + meta.endInclusive.getTime();
    if (seen[key]) return;
    seen[key] = true;
    hasil.push({ periode: periode, meta: meta, sumber: sumber || '' });
  }

  for (var i = 0; i < periodeKandidat.length; i++) {
    var p = periodeKandidat[i];
    try {
      addMeta_(p, ambilCutoffTunjanganPeriode_(p), 'periode_kandidat');
    } catch (e) {}
  }

  try {
    var tersimpan = metaCutoffTunjanganTersimpan_();
    for (var j = 0; j < tersimpan.length; j++) {
      var m = tersimpan[j];
      if (!m || !(m.endInclusive instanceof Date) || isNaN(m.endInclusive.getTime())) continue;
      // Batasi ke meta sekitar bulan laporan agar tidak perlu memeriksa semua periode jauh.
      var diffHari = Math.abs(d.getTime() - m.endInclusive.getTime()) / (24 * 60 * 60 * 1000);
      if (diffHari > 35) continue;
      var periodeMeta = m.periode || (m.tanggalAkhirPeriode ? String(m.tanggalAkhirPeriode).slice(0, 7) : Utilities.formatDate(m.endInclusive, 'GMT+7', 'yyyy-MM'));
      addMeta_(periodeMeta, m, 'meta_tersimpan');
    }
  } catch (err) {}

  return hasil;
}

function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: '', periodeEfektif: '', meta: null, tanggalLaporan: null, bukaKembali: null };
  }

  var kandidat = kandidatMetaCutoffUntukTanggalReview_(d);
  for (var i = 0; i < kandidat.length; i++) {
    var k = kandidat[i];
    if (isTanggalDalamJedaCutoff_(d, k.meta)) {
      return {
        valid: true,
        lewatCutoff: true,
        periode: k.periode,
        periodeEfektif: periodeDariTanggalLaporan_(d),
        meta: k.meta,
        tanggalLaporan: d,
        bukaKembali: tanggalBukaKembaliCutoff_(k.meta),
        sumber: k.sumber
      };
    }
  }

  var pEfektif = periodeDariTanggalLaporan_(d) || Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  var metaEfektif = null;
  try { metaEfektif = ambilCutoffTunjanganPeriode_(pEfektif); } catch (e2) { metaEfektif = null; }
  return {
    valid: true,
    lewatCutoff: false,
    periode: pEfektif,
    periodeEfektif: pEfektif,
    meta: metaEfektif,
    tanggalLaporan: d,
    bukaKembali: metaEfektif ? tanggalBukaKembaliCutoff_(metaEfektif) : null
  };
}

function adminTanggalPelaksanaanDariPayload_(payload) {
  payload = payload || {};
  var kandidat = [];
  function add_(value) { if (value !== null && value !== undefined && value !== '') kandidat.push(value); }

  add_(payload.detailReguler && payload.detailReguler.tanggal);
  add_(payload.detailDukuh && payload.detailDukuh.tanggal);
  add_(payload.detailTU && payload.detailTU.tanggal);
  add_(payload.detailPHL && payload.detailPHL.tanggal);
  add_(payload.detailPimpinan && payload.detailPimpinan.tanggal);
  add_(payload.detailAPBKal && payload.detailAPBKal.tanggal);
  add_(payload.detailAPBKalCarik && payload.detailAPBKalCarik.tanggal);
  add_(payload.detailStafInstruksi && payload.detailStafInstruksi.tanggal);
  add_(payload.detailStafReguler && payload.detailStafReguler.tanggal);
  add_(payload.ringkasanUmum && payload.ringkasanUmum.tanggalKegiatan);

  for (var i = 0; i < kandidat.length; i++) {
    var formatted = formatSpreadsheetReviewDateOnly_(kandidat[i]) || adminDetailText_(kandidat[i]);
    if (formatted && formatted !== '-') return formatted;
  }
  return '';
}


// ===== PATCH v18: Validasi periode pelaksanaan untuk Review Admin =====
// Tanggal Pelaksanaan menjadi dasar periode kegiatan. Jika laporan baru dikirim
// setelah cut-off periode kegiatan tersebut, Admin hanya dapat menyetujui 0 poin
// atau menolak, agar kegiatan periode lama tidak masuk rekap periode berjalan.
function evaluasiPeriodePelaksanaanReviewAdmin_(tanggalPelaksanaan, tanggalLaporan) {
  var tPelaksanaan = parseTanggal(tanggalPelaksanaan);
  var tLapor = parseTanggal(tanggalLaporan);
  if (!(tPelaksanaan instanceof Date) || isNaN(tPelaksanaan.getTime()) || tPelaksanaan.getTime() === 0 ||
      !(tLapor instanceof Date) || isNaN(tLapor.getTime()) || tLapor.getTime() === 0) {
    return {
      valid: false,
      periodeDitutup: false,
      periode: '',
      labelPeriode: '',
      tanggalPelaksanaan: null,
      tanggalLaporan: null,
      meta: null,
      pesan: ''
    };
  }

  var periode = periodeDariTanggalLaporan_(tPelaksanaan);
  var meta = periode ? ambilCutoffTunjanganPeriode_(periode) : null;
  var ditutup = !!(meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime()) &&
    tLapor.getTime() > meta.endInclusive.getTime());
  var labelPeriode = meta && meta.labelPembayaran ? meta.labelPembayaran : labelPembayaranPeriode_(periode);
  var cutoffLabel = meta && meta.tanggalCutoff ? meta.tanggalCutoff : '';
  var pesan = ditutup
    ? ('Tanggal pelaksanaan masuk periode ' + labelPeriode + ' yang sudah cut-off. Batas terakhir: ' + cutoffLabel + '. Jika disetujui, poin otomatis 0 dan tidak masuk rekap tunjangan periode berjalan.')
    : '';

  return {
    valid: true,
    periodeDitutup: ditutup,
    periode: periode,
    labelPeriode: labelPeriode,
    tanggalPelaksanaan: tPelaksanaan,
    tanggalLaporan: tLapor,
    meta: meta,
    cutoffLabel: cutoffLabel,
    pesan: pesan
  };
}

function catatanPeriodePelaksanaanDitutup_(hasilEvaluasi) {
  hasilEvaluasi = hasilEvaluasi || {};
  return hasilEvaluasi.pesan || ('Tanggal pelaksanaan masuk periode yang sudah cut-off; poin otomatis 0 dan tidak masuk rekap tunjangan periode berjalan.');
}

function gabungCatatanPeriodePelaksanaanDitutup_(catatanLama, hasilEvaluasi) {
  var tambahan = catatanPeriodePelaksanaanDitutup_(hasilEvaluasi);
  var lama = (catatanLama || '').toString().trim();
  if (!lama) return tambahan;
  if (lama.indexOf('Tanggal pelaksanaan masuk periode') !== -1) return lama;
  return lama + '\n' + tambahan;
}
// ===== END PATCH v18 =====


// DEBUG REMOVED FROM PRODUCTION: debugReviewAdminCutoffDanTanggal
// ===== END PATCH v14 =====


// ===== PATCH v2026.05.05.19: FREEZE INPUT LAPORAN SAAT CUT-OFF PERIODE BERLAKU =====
// Tujuan:
// 1) Berlaku untuk bulan Mei dan bulan-bulan berikutnya, tidak hanya April 2026.
// 2) Setelah Admin/Carik menyimpan cut-off input laporan, form input dibekukan
//    mulai setelah tanggal/jam cut-off sampai waktu buka kembali.
// 3) Backend simpanDataKinerja() tetap memakai statusInputLaporanCutoffSaatIni_(),
//    sehingga submit laporan tetap ditolak walaupun UI/cache lama mencoba mengirim request.
// 4) Review Admin berdasarkan tanggal pelaksanaan tetap menjadi lapisan pengaman kedua.

function inputLaporanCutoffLockPropertyKey_(periode) {
  return 'INPUT_LAPORAN_CUTOFF_LOCK_' + normalizePeriode_(periode);
}

function buildInputLaporanCutoffLock_(periode, meta) {
  var p = normalizePeriode_(periode);
  var buka = tanggalBukaKembaliCutoff_(meta);
  return {
    periode: p,
    labelPembayaran: (meta && meta.labelPembayaran) || labelPembayaranPeriode_(p),
    tanggalMulaiPeriode: meta && meta.tanggalMulaiPeriode ? meta.tanggalMulaiPeriode : '',
    tanggalAkhirPeriode: meta && meta.tanggalAkhirPeriode ? meta.tanggalAkhirPeriode : '',
    tanggalCutoff: meta && meta.tanggalCutoff ? meta.tanggalCutoff : '',
    jamCutoff: meta && meta.jamCutoff ? meta.jamCutoff : '',
    bukaKembali: buka ? formatTanggalJamISO_(buka) : '',
    status: 'AKTIF_OTOMATIS',
    updatedAt: formatTanggalJamISO_(new Date())
  };
}

function simpanLockInputLaporanPeriode_(periode, meta) {
  var lock = buildInputLaporanCutoffLock_(periode, meta);
  PropertiesService.getScriptProperties().setProperty(
    inputLaporanCutoffLockPropertyKey_(periode),
    JSON.stringify(lock)
  );
  return lock;
}

function parseInputLaporanCutoffLock_(obj) {
  if (!obj || !obj.periode) return null;
  var cutoff = parseTanggal(obj.tanggalCutoff || obj.tanggalAkhirPeriode || '');
  var buka = parseTanggal(obj.bukaKembali || '');
  if (!(cutoff instanceof Date) || isNaN(cutoff.getTime())) return null;
  if (!(buka instanceof Date) || isNaN(buka.getTime())) {
    buka = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1, 0, 0, 0, 0);
  }
  return {
    periode: normalizePeriode_(obj.periode),
    labelPembayaran: obj.labelPembayaran || labelPembayaranPeriode_(obj.periode),
    tanggalCutoff: formatTanggalJamISO_(cutoff),
    tanggalMulaiPeriode: obj.tanggalMulaiPeriode || '',
    tanggalAkhirPeriode: obj.tanggalAkhirPeriode || '',
    jamCutoff: obj.jamCutoff || '',
    cutoffDate: cutoff,
    bukaKembaliDate: buka,
    bukaKembali: formatTanggalJamISO_(buka),
    status: obj.status || 'AKTIF_OTOMATIS'
  };
}

function daftarLockInputLaporanCutoff_() {
  var hasil = [];
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (key.indexOf('INPUT_LAPORAN_CUTOFF_LOCK_') !== 0) continue;
      try {
        var parsed = parseInputLaporanCutoffLock_(JSON.parse(props[key] || '{}'));
        if (parsed) hasil.push(parsed);
      } catch (inner) {
        Logger.log('Gagal membaca lock input laporan ' + key + ': ' + (inner && inner.message ? inner.message : inner));
      }
    }
  } catch (e) {
    Logger.log('Gagal membaca daftar lock input laporan: ' + (e && e.message ? e.message : e));
  }

  // Backward compatible: cut-off meta lama juga tetap dipakai sebagai sumber freeze.
  try {
    var metas = metaCutoffTunjanganTersimpan_();
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];
      if (!meta || !(meta.endInclusive instanceof Date) || isNaN(meta.endInclusive.getTime())) continue;
      var buka = tanggalBukaKembaliCutoff_(meta);
      var periode = formatTanggalISO_(meta.endInclusive).slice(0, 7);
      var sudahAda = false;
      for (var j = 0; j < hasil.length; j++) {
        if (hasil[j].periode === periode) { sudahAda = true; break; }
      }
      if (!sudahAda) {
        hasil.push({
          periode: periode,
          labelPembayaran: meta.labelPembayaran || labelPembayaranPeriode_(periode),
          tanggalCutoff: meta.tanggalCutoff || formatTanggalJamISO_(meta.endInclusive),
          tanggalMulaiPeriode: meta.tanggalMulaiPeriode || '',
          tanggalAkhirPeriode: meta.tanggalAkhirPeriode || '',
          jamCutoff: meta.jamCutoff || '',
          cutoffDate: meta.endInclusive,
          bukaKembaliDate: buka,
          bukaKembali: buka ? formatTanggalJamISO_(buka) : '',
          status: 'LEGACY_META'
        });
      }
    }
  } catch (legacyErr) {
    Logger.log('Gagal membaca legacy meta cut-off untuk freeze input: ' + (legacyErr && legacyErr.message ? legacyErr.message : legacyErr));
  }

  return hasil;
}

// Override statusInputLaporanCutoffSaatIni_ agar freeze input berlaku umum untuk semua
// periode yang sudah disimpan cut-off-nya oleh Admin/Carik.
function statusInputLaporanCutoffSaatIni_() {
  var now = new Date();
  var locks = daftarLockInputLaporanCutoff_();

  for (var i = 0; i < locks.length; i++) {
    var lock = locks[i];
    if (!lock || !(lock.cutoffDate instanceof Date) || isNaN(lock.cutoffDate.getTime())) continue;
    if (!(lock.bukaKembaliDate instanceof Date) || isNaN(lock.bukaKembaliDate.getTime())) continue;

    if (now.getTime() > lock.cutoffDate.getTime() && now.getTime() < lock.bukaKembaliDate.getTime()) {
      var label = lock.labelPembayaran || labelPembayaranPeriode_(lock.periode);
      var mulai = formatTanggalJamClient_(lock.cutoffDate);
      var kembali = formatTanggalJamClient_(lock.bukaKembaliDate);
      return {
        sukses: true,
        ditutup: true,
        periode: lock.periode,
        labelPembayaran: label,
        mulaiCutoff: mulai,
        bukaKembali: kembali,
        pesan: 'Input laporan sedang dibekukan sementara karena ' + label + ' sudah memasuki cut-off.\n' +
          'Cut-off dimulai: ' + mulai + '\n' +
          'Input dibuka kembali: ' + kembali + '\n\n' +
          'Selama jeda cut-off, pegawai tidak dapat mengirim laporan. Setelah input dibuka kembali, laporan baru masuk periode berikutnya. ' +
          'Tanggal pelaksanaan periode yang sudah ditutup tetap akan dikunci di Review Admin.'
      };
    }
  }

  return { sukses: true, ditutup: false, pesan: 'Input laporan sedang dibuka.' };
}

// Override simpanCutoffInputLaporanPeriode agar saat Admin/Carik menyimpan cut-off,
// sistem juga mencatat lock input laporan. UI dan backend akan membaca lock ini.
function simpanCutoffInputLaporanPeriode(periode, tanggalMulai, tanggalAkhir, jamCutoff, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis, silakan login ulang.' };
    if (!cekHakAksesAdmin(idUser) && !cekHakAksesCarikTunjangan(idUser)) {
      return { sukses: false, pesan: 'Akses ditolak. Hanya Admin/Carik yang dapat menyimpan cut-off input laporan.' };
    }

    var meta = simpanCutoffTunjanganPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff);
    var lock = simpanLockInputLaporanPeriode_(periode, meta);
    var buka = parseTanggal(lock.bukaKembali || '');
    var bukaLabel = (buka instanceof Date && !isNaN(buka.getTime())) ? formatTanggalJamClient_(buka) : (lock.bukaKembali || '-');

    logAudit(idUser, 'SIMPAN_CUTOFF_INPUT_LAPORAN', normalizePeriode_(periode) + ' | Cut-off: ' + meta.tanggalCutoff + ' | Input dibekukan sampai: ' + bukaLabel);
    return {
      sukses: true,
      pesan: 'Cut-off input laporan berhasil disimpan. Input laporan akan dibekukan setelah ' + meta.tanggalCutoff + ' dan dibuka kembali pada ' + bukaLabel + '.',
      periode: normalizePeriode_(periode),
      labelPembayaran: meta.labelPembayaran,
      tanggalCutoff: meta.tanggalCutoff,
      bukaKembali: bukaLabel,
      lockInput: lock
    };
  } catch (e) {
    return handleError('simpanCutoffInputLaporanPeriode', e, { sukses: false, pesan: '' });
  }
}


// DEBUG REMOVED FROM PRODUCTION: debugStatusFreezeInputLaporan
// ===== END PATCH v2026.05.05.19 =====



// ===== PATCH v2026.05.12.09: Tutup Periode Laporan final =====
// Cut-off sementara tetap menutup input sampai 00.00.
// Tutup Periode Laporan menolak input baru untuk periode tertentu setelah batas akhir final.
// Mode revisi laporan ditolak tetap diperbolehkan.

function tutupPeriodeLaporanPropertyKey_(periode) {
  return 'TUTUP_PERIODE_LAPORAN_' + normalizePeriode_(periode);
}

function parseTanggalJamTutupPeriode_(tanggal, jam) {
  var tgl = String(tanggal || '').trim();
  var jm = String(jam || '18:00').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
    var parts = tgl.split('-');
    var timeParts = jm.split(':');
    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      Number(timeParts[0] || 0),
      Number(timeParts[1] || 0),
      Number(timeParts[2] || 0),
      0
    );
  }

  var d = parseTanggal(tgl + (jm ? (' ' + jm) : ''));
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  return null;
}

function formatTutupPeriodeClient_(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  return Utilities.formatDate(dateObj, 'GMT+7', 'dd/MM/yyyy HH:mm') + ' WIB';
}

function bacaTutupPeriodeLaporan_(periode) {
  var p = normalizePeriode_(periode);
  if (!p) return null;

  var raw = PropertiesService.getScriptProperties().getProperty(tutupPeriodeLaporanPropertyKey_(p));
  if (!raw) return null;

  try {
    var obj = JSON.parse(raw);
    var cutoff = parseTanggal(obj.tanggalTutup || obj.cutoffAt || '');
    if (!(cutoff instanceof Date) || isNaN(cutoff.getTime())) return null;

    return {
      periode: p,
      labelPeriode: obj.labelPeriode || labelPembayaranPeriode_(p),
      tanggalTutup: formatTanggalJamISO_(cutoff),
      cutoffDate: cutoff,
      status: obj.status || 'DITUTUP',
      alasan: obj.alasan || '',
      updatedAt: obj.updatedAt || '',
      updatedBy: obj.updatedBy || ''
    };
  } catch (e) {
    Logger.log('Gagal membaca tutup periode laporan ' + p + ': ' + (e && e.message ? e.message : e));
    return null;
  }
}

function simpanTutupPeriodeLaporan(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };

    if (!cekHakAksesAdmin(idUser) && !cekHakAksesCarikTunjangan(idUser)) {
      return { sukses: false, pesan: 'Akses ditolak. Hanya Admin/Carik yang dapat menutup periode laporan.' };
    }

    payload = payload || {};
    var periode = normalizePeriode_(payload.periode || payload.bulan || '');
    var tanggalTutup = String(payload.tanggalTutup || payload.tanggal || '').trim();
    var jamTutup = String(payload.jamTutup || payload.jam || '18:00').trim();
    var alasan = sanitizeForSheet_(payload.alasan || 'Penutupan periode laporan oleh Admin Kinerja.');

    if (!periode) return { sukses: false, pesan: 'Periode laporan tidak valid.' };
    if (!tanggalTutup) return { sukses: false, pesan: 'Tanggal batas akhir wajib diisi.' };

    var cutoff = parseTanggalJamTutupPeriode_(tanggalTutup, jamTutup);
    if (!(cutoff instanceof Date) || isNaN(cutoff.getTime())) {
      return { sukses: false, pesan: 'Tanggal/jam batas akhir tidak valid.' };
    }

    var obj = {
      periode: periode,
      labelPeriode: labelPembayaranPeriode_(periode),
      tanggalTutup: formatTanggalJamISO_(cutoff),
      jamTutup: jamTutup,
      status: 'DITUTUP',
      alasan: alasan,
      updatedAt: formatTanggalJamISO_(new Date()),
      updatedBy: String(idUser || '')
    };

    PropertiesService.getScriptProperties().setProperty(
      tutupPeriodeLaporanPropertyKey_(periode),
      JSON.stringify(obj)
    );

    logAudit(
      idUser,
      'TUTUP_PERIODE_LAPORAN',
      periode + ' | Batas akhir: ' + formatTutupPeriodeClient_(cutoff) + ' | Alasan: ' + alasan
    );

    return {
      sukses: true,
      pesan: 'Periode ' + labelPembayaranPeriode_(periode) + ' ditutup untuk input laporan baru setelah ' + formatTutupPeriodeClient_(cutoff) + '. Revisi laporan ditolak tetap diperbolehkan.',
      periode: periode,
      labelPeriode: labelPembayaranPeriode_(periode),
      tanggalTutup: formatTanggalJamISO_(cutoff),
      tanggalTutupLabel: formatTutupPeriodeClient_(cutoff),
      status: 'DITUTUP'
    };
  } catch (e) {
    return handleError('simpanTutupPeriodeLaporan', e, { sukses: false, pesan: 'Gagal menutup periode laporan.' });
  }
}

function bukaPeriodeLaporan(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };

    if (!cekHakAksesAdmin(idUser) && !cekHakAksesCarikTunjangan(idUser)) {
      return { sukses: false, pesan: 'Akses ditolak. Hanya Admin/Carik yang dapat membuka periode laporan.' };
    }

    payload = payload || {};
    var periode = normalizePeriode_(payload.periode || payload.bulan || '');
    var alasan = sanitizeForSheet_(payload.alasan || 'Pembukaan kembali periode laporan oleh Admin Kinerja.');

    if (!periode) return { sukses: false, pesan: 'Periode laporan tidak valid.' };

    PropertiesService.getScriptProperties().deleteProperty(tutupPeriodeLaporanPropertyKey_(periode));

    logAudit(
      idUser,
      'BUKA_PERIODE_LAPORAN',
      periode + ' | Alasan: ' + alasan
    );

    return {
      sukses: true,
      pesan: 'Periode ' + labelPembayaranPeriode_(periode) + ' dibuka kembali untuk input laporan baru.',
      periode: periode,
      status: 'TERBUKA'
    };
  } catch (e) {
    return handleError('bukaPeriodeLaporan', e, { sukses: false, pesan: 'Gagal membuka periode laporan.' });
  }
}

function ambilStatusTutupPeriodeLaporan(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };

    var p = normalizePeriode_(periode || '');
    if (!p) return { sukses: false, pesan: 'Periode laporan tidak valid.' };

    var lock = bacaTutupPeriodeLaporan_(p);
    var now = new Date();

    if (!lock) {
      return {
        sukses: true,
        periode: p,
        labelPeriode: labelPembayaranPeriode_(p),
        status: 'TERBUKA',
        tertutup: false,
        aktif: false,
        pesan: 'Periode ' + labelPembayaranPeriode_(p) + ' masih terbuka untuk input laporan baru.'
      };
    }

    var aktif = now.getTime() > lock.cutoffDate.getTime();

    return {
      sukses: true,
      periode: p,
      labelPeriode: lock.labelPeriode,
      status: lock.status,
      tertutup: true,
      aktif: aktif,
      tanggalTutup: lock.tanggalTutup,
      tanggalTutupLabel: formatTutupPeriodeClient_(lock.cutoffDate),
      alasan: lock.alasan,
      pesan: aktif
        ? ('Periode ' + lock.labelPeriode + ' sudah tertutup untuk input laporan baru sejak ' + formatTutupPeriodeClient_(lock.cutoffDate) + '.')
        : ('Periode ' + lock.labelPeriode + ' dijadwalkan tertutup untuk input laporan baru pada ' + formatTutupPeriodeClient_(lock.cutoffDate) + '.')
    };
  } catch (e) {
    return handleError('ambilStatusTutupPeriodeLaporan', e, { sukses: false, pesan: 'Gagal membaca status tutup periode laporan.' });
  }
}

function periodeLaporanDariPaketSubmit_(paket) {
  paket = paket || {};

  function normMonth_(value) {
    var s = String(value || '').trim();
    if (!s) return '';

    if (/^\d{4}-\d{2}$/.test(s)) return s;

    var d = parseTanggal(s);
    if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
      return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
    }

    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2];

    return '';
  }

  if (paket.detailWajibPamong && paket.detailWajibPamong.bulan) {
    var pWajib = normMonth_(paket.detailWajibPamong.bulan);
    if (pWajib) return pWajib;
  }

  if (paket.detailWajibDukuh && paket.detailWajibDukuh.bulan) {
    var pDukuhWajib = normMonth_(paket.detailWajibDukuh.bulan);
    if (pDukuhWajib) return pDukuhWajib;
  }

  var candidates = [
    paket.tanggalKegiatan,
    paket.tanggal,
    paket.bulan,
    paket.periode,
    paket.detailAPBKal && paket.detailAPBKal.tanggal,
    paket.detailAPBKal && paket.detailAPBKal.bulan,
    paket.detailAPBKalCarik && paket.detailAPBKalCarik.tanggal,
    paket.detailReguler && paket.detailReguler.tanggal,
    paket.detailDukuh && paket.detailDukuh.tanggal,
    paket.detailTU && paket.detailTU.tanggal,
    paket.detailPHL && paket.detailPHL.tanggal,
    paket.detailPimpinan && paket.detailPimpinan.tanggal,
    paket.detailStafInstruksi && paket.detailStafInstruksi.tanggal,
    paket.detailStafReguler && paket.detailStafReguler.tanggal
  ];

  for (var i = 0; i < candidates.length; i++) {
    var p = normMonth_(candidates[i]);
    if (p) return p;
  }

  return '';
}

function validasiTutupPeriodeLaporanBaru_(paket) {
  paket = paket || {};

  // Revisi laporan ditolak dikecualikan, karena ini bukan input laporan baru.
  if (paket.idLaporanRevisi) {
    return { sukses: true, periode: '', pesan: '' };
  }

  var periode = periodeLaporanDariPaketSubmit_(paket);
  if (!periode) {
    // Jangan blokir jika periode tidak dapat ditentukan. Validasi field lain akan tetap berjalan.
    return { sukses: true, periode: '', pesan: '' };
  }

  var lock = bacaTutupPeriodeLaporan_(periode);
  if (!lock || lock.status !== 'DITUTUP') {
    return { sukses: true, periode: periode, pesan: '' };
  }

  var now = new Date();
  if (now.getTime() <= lock.cutoffDate.getTime()) {
    return { sukses: true, periode: periode, pesan: '' };
  }

  return {
    sukses: false,
    periode: periode,
    pesan:
      '❌ PERIODE LAPORAN SUDAH DITUTUP\n\n' +
      'Periode laporan ' + lock.labelPeriode + ' sudah ditutup untuk input laporan baru sejak ' + formatTutupPeriodeClient_(lock.cutoffDate) + '.\n\n' +
      'Tanggal pelaksanaan boleh berada dalam periode tersebut, tetapi waktu pengiriman laporan baru sudah melewati batas akhir. ' +
      'Jika laporan sebelumnya ditolak admin, silakan gunakan menu revisi laporan. Jika memang perlu input baru, hubungi Admin Kinerja untuk membuka kembali periode.'
  };
}

// Wrapper validasi submit: tetap menjalankan validasi lama, lalu menambahkan validasi tutup periode final.
var validasiPayloadSubmitKinerja__SEBELUM_TUTUP_PERIODE_2026051209 = validasiPayloadSubmitKinerja_;
validasiPayloadSubmitKinerja_ = function (paket, pegawaiUser) {
  var hasilLama = validasiPayloadSubmitKinerja__SEBELUM_TUTUP_PERIODE_2026051209(paket, pegawaiUser);
  if (hasilLama) return hasilLama;

  var validasiPeriode = validasiTutupPeriodeLaporanBaru_(paket);
  if (!validasiPeriode.sukses) return validasiPeriode.pesan;

  return '';
};



// ===== PATCH v2026.05.12.11: Akses Admin hanya Lurah/Carik + fallback Dashboard Admin Kinerja =====
// Sesuai kebijakan: menu Dashboard Admin Kinerja dan Review Bukti Admin hanya untuk jabatan Lurah dan Carik.
// Fallback dashboard membaca Data_Pegawai langsung dari header agar tidak bergantung pada cache/schema yang mungkin stale.

function cekHakAksesLurahCarikAdmin_(idUser) {
  try {
    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return false;
    return isLurah_(pegawai.jabatan) || isCarik_(pegawai.jabatan);
  } catch (e) {
    return false;
  }
}

function headerIndexDataPegawaiLangsung_(headers) {
  var map = {};
  headers = headers || [];
  for (var i = 0; i < headers.length; i++) {
    var key = String(headers[i] || '').toLowerCase().trim().replace(/\s+/g, '_');
    if (key) map[key] = i;
  }

  function pick(names, fallback) {
    for (var n = 0; n < names.length; n++) {
      if (typeof map[names[n]] !== 'undefined') return map[names[n]];
    }
    return fallback;
  }

  return {
    id: pick(['id', 'id_user', 'userid', 'user_id', 'username'], 0),
    username: pick(['username', 'user_name', 'nama_pengguna'], 1),
    nama: pick(['nama', 'nama_lengkap', 'pegawai'], 2),
    jabatan: pick(['jabatan', 'posisi'], 3),
    akses: pick(['akses', 'role', 'level'], 5),
    status: pick(['status', 'status_pegawai'], 7)
  };
}

function ambilPegawaiAktifAdminKinerjaLangsung_() {
  var sh = getSheet_('Data_Pegawai');
  var raw = sh.getDataRange().getValues();
  if (!raw || raw.length < 2) return [];

  var idx = headerIndexDataPegawaiLangsung_(raw[0]);
  var list = [];

  for (var i = 1; i < raw.length; i++) {
    var row = raw[i] || [];
    var idPeg = normalizeId_(row[idx.id] || row[idx.username] || '');
    var username = String(row[idx.username] || idPeg || '').trim();
    var nama = String(row[idx.nama] || '').trim();
    var jabatan = String(row[idx.jabatan] || '').trim();
    var status = String(row[idx.status] || '').trim().toLowerCase();

    if (!idPeg || !nama || !jabatan) continue;
    if (status && status.indexOf('nonaktif') !== -1) continue;

    var jLow = normalizeJabatan_(jabatan);
    if (jLow.indexOf('phl') !== -1 || jLow.indexOf('lepas') !== -1) continue;
    if (isLurah_(jabatan)) continue;

    list.push({
      idUser: idPeg,
      username: username,
      nama: nama,
      jabatan: jabatan,
      kelompok: identifikasiKelompok_(jabatan),
      jumlahLaporan: 0,
      jumlahDisetujui: 0,
      jumlahMenunggu: 0,
      totalPoin: 0,
      poinProd: 0,
      poinTU: 0,
      estimasiTunjangan: 0,
      predikat: '-',
      warnaPredikat: 'bg-gray'
    });
  }

  return list;
}

function bangunDashboardAdminKinerjaFallback_(periode, kelompok, keyword) {
  var meta = parsePeriodeBulan_(periode);
  var keyKelompok = (kelompok || 'Semua').toString();
  var q = (keyword || '').toString().trim().toLowerCase();

  var baseRows = ambilPegawaiAktifAdminKinerjaLangsung_();
  var rowsById = {};
  baseRows.forEach(function (r) {
    rowsById[normalizeId_(r.idUser)] = r;
  });

  var data = getRekapKinerjaValuesReadOnly_();
  for (var r = 1; r < data.length; r++) {
    var rowId = normalizeId_(data[r][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!rowId || !rowsById[rowId]) continue;

    var tglLap = parseTanggal(data[r][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
    if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

    var status = (data[r][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '').toString();
    var kategori = (data[r][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '').toString();
    var poin = Number(data[r][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0;
    var row = rowsById[rowId];

    if (tglLap >= meta.start && tglLap < meta.end) {
      row.jumlahLaporan++;
      if (isStatusApproved_(status)) {
        row.jumlahDisetujui++;
        if (isKategoriProduktivitas_(kategori)) {
          if (!isKategoriWajibBulanan_(kategori)) row.poinProd += poin;
        } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) {
          row.poinTU += poin;
        }
      } else if (isPendingReviewStatus_(status)) {
        row.jumlahMenunggu++;
      }
    }

    if (tglLap >= meta.triStart && tglLap < meta.triEnd && isStatusApproved_(status)) {
      row.totalPoin += poin;
    }
  }

  var rows = Object.keys(rowsById).map(function (idPeg) {
    var row = rowsById[idPeg];
    var tunjangan = getTunjanganPegawai_(row.idUser, row.jabatan);
    var maxProd = Number(tunjangan.maxProd) || 0;
    var maxTU = Number(tunjangan.maxTU) || 0;
    var prProd = row.poinProd > 100 ? 100 : row.poinProd;
    var prTU = row.poinTU > 100 ? 100 : row.poinTU;
    row.estimasiTunjangan = ((prProd / 100) * maxProd) + ((prTU / 100) * maxTU);

    var pred = hitungPredikatAdminKinerja_(row.totalPoin, row.kelompok);
    row.predikat = pred.label;
    row.warnaPredikat = pred.warna;
    return row;
  });

  if (keyKelompok && keyKelompok !== 'Semua') {
    rows = rows.filter(function (r) { return (r.kelompok || '') === keyKelompok; });
  }

  if (q) {
    rows = rows.filter(function (r) {
      return (r.nama || '').toLowerCase().indexOf(q) !== -1 ||
        (r.jabatan || '').toLowerCase().indexOf(q) !== -1 ||
        (r.kelompok || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  rows.sort(function (a, b) {
    var diff = Number(b.totalPoin || 0) - Number(a.totalPoin || 0);
    if (diff !== 0) return diff;
    diff = Number(b.jumlahDisetujui || 0) - Number(a.jumlahDisetujui || 0);
    if (diff !== 0) return diff;
    return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
  });

  var summary = {
    pegawaiAktif: rows.length,
    laporanMasuk: 0,
    menungguReview: 0,
    estimasiTunjangan: 0,
    belumUnggah: 0,
    topPerformer: '-',
    bottomPerformer: '-',
    distribusiPredikat: { sangatBaik: 0, baik: 0, cukup: 0, perluPembinaan: 0 }
  };

  rows.forEach(function (r) {
    summary.laporanMasuk += Number(r.jumlahLaporan || 0);
    summary.menungguReview += Number(r.jumlahMenunggu || 0);
    summary.estimasiTunjangan += Number(r.estimasiTunjangan || 0);
    if (Number(r.jumlahLaporan || 0) === 0) summary.belumUnggah++;

    if (r.predikat === 'Sangat Baik') summary.distribusiPredikat.sangatBaik++;
    else if (r.predikat === 'Baik') summary.distribusiPredikat.baik++;
    else if (r.predikat === 'Cukup') summary.distribusiPredikat.cukup++;
    else summary.distribusiPredikat.perluPembinaan++;
  });

  var performer = pilihTopBottomPerformer_(rows);
  summary.topPerformer = performer.top ? (performer.top.nama + ' (' + Number(performer.top.totalPoin || 0) + ' poin)') : 'Belum ada kandidat';
  summary.bottomPerformer = performer.bottom ? (performer.bottom.nama + ' (' + Number(performer.bottom.totalPoin || 0) + ' poin)') : 'Belum ada kandidat';
  summary.distribusiPredikat = formatDistribusiPredikatAdmin_(summary.distribusiPredikat);

  return {
    sukses: true,
    summary: summary,
    rows: rows,
    periode: {
      label: meta.label,
      start: formatTanggalJamISO_(meta.start),
      end: formatTanggalJamISO_(meta.end),
      triStart: formatTanggalJamISO_(meta.triStart),
      triEnd: formatTanggalJamISO_(meta.triEnd)
    },
    sumberData: 'fallback_header_Data_Pegawai'
  };
}

// Override agar Dashboard Admin Kinerja hanya Lurah/Carik dan tidak kosong karena cache Data_Pegawai stale.
var ambilDashboardAdminKinerja__SEBELUM_LURAH_CARIK_2026051211 = ambilDashboardAdminKinerja;
ambilDashboardAdminKinerja = function (periode, kelompok, keyword, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', summary: {}, rows: [] };

    if (!cekHakAksesLurahCarikAdmin_(idUser)) {
      return { sukses: false, pesan: 'Akses ditolak. Dashboard Admin Kinerja hanya untuk Lurah dan Carik.', summary: {}, rows: [] };
    }

    var hasil = ambilDashboardAdminKinerja__SEBELUM_LURAH_CARIK_2026051211(periode, kelompok, keyword, token);

    if (hasil && hasil.sukses && hasil.summary && Number(hasil.summary.pegawaiAktif || 0) > 0) {
      return hasil;
    }

    var fallback = bangunDashboardAdminKinerjaFallback_(periode, kelompok, keyword);
    if (fallback && fallback.sukses) return fallback;

    return hasil || { sukses: false, pesan: 'Dashboard Admin Kinerja gagal dimuat.', summary: {}, rows: [] };
  } catch (e) {
    return handleError('ambilDashboardAdminKinerja_LurahCarikPatch', e, { sukses: false, pesan: '', summary: {}, rows: [] });
  }
};

// Override daftar pegawai review admin agar akses tepat: hanya Lurah/Carik.
var ambilDaftarPegawaiReviewAdmin__SEBELUM_LURAH_CARIK_2026051211 = ambilDaftarPegawaiReviewAdmin;
ambilDaftarPegawaiReviewAdmin = function (token) {
  var idUser = validasiSession(token);
  if (!idUser) return { sukses: false, pesan: 'Sesi habis, silakan login ulang.', data: [], debug: 'SESSION_INVALID' };

  if (!cekHakAksesLurahCarikAdmin_(idUser)) {
    return { sukses: false, pesan: 'Akses ditolak. Review Bukti Admin hanya untuk Lurah dan Carik.', data: [], debug: 'NOT_LURAH_CARIK' };
  }

  return ambilDaftarPegawaiReviewAdmin__SEBELUM_LURAH_CARIK_2026051211(token);
};

// Override laporan review per pegawai agar akses tepat: hanya Lurah/Carik.
var ambilLaporanAdminPerPegawai__SEBELUM_LURAH_CARIK_2026051211 = ambilLaporanAdminPerPegawai;
ambilLaporanAdminPerPegawai = function (idPegawai, filterStatus, tanggalMulai, tanggalAkhir, offset, limit, token) {
  var tokenArg = token;
  if (typeof tokenArg === 'undefined') {
    if (typeof limit !== 'undefined') tokenArg = limit;
    else if (typeof offset !== 'undefined') tokenArg = offset;
    else if (typeof tanggalAkhir !== 'undefined') tokenArg = tanggalAkhir;
    else if (typeof tanggalMulai !== 'undefined') tokenArg = tanggalMulai;
  }

  var idUser = validasiSession(tokenArg);
  if (!idUser) return { sukses: false, pesan: 'Sesi habis, silakan login ulang.', items: [], data: [], summary: {} };

  if (!cekHakAksesLurahCarikAdmin_(idUser)) {
    return { sukses: false, pesan: 'Akses ditolak. Review Bukti Admin hanya untuk Lurah dan Carik.', items: [], data: [], summary: {} };
  }

  return ambilLaporanAdminPerPegawai__SEBELUM_LURAH_CARIK_2026051211(idPegawai, filterStatus, tanggalMulai, tanggalAkhir, offset, limit, token);
};



// ===== PATCH v2026.05.12.12: Nonaktifkan status/nilai "Lewat Cut-off" =====
// Kebijakan baru:
// - Label "Disetujui - Lewat Cut-off" tidak digunakan lagi karena tanggal cut-off lama/default tidak dapat dipastikan.
// - Penolakan input baru setelah batas akhir hanya menggunakan fitur "Tutup Periode Laporan".
// - Review admin tidak mengubah status disetujui menjadi lewat cut-off dan tidak otomatis menjadikan poin 0 karena cut-off lama.

function statusReviewLewatCutoff_() {
  return REVIEW_STATUS.DISETUJUI;
}

function isStatusLewatCutoff_(status) {
  return false;
}

function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: "", periodeEfektif: "", meta: null, tanggalLaporan: null, bukaKembali: null };
  }

  var p = periodeDariTanggalLaporan_(d) || Utilities.formatDate(d, "GMT+7", "yyyy-MM");
  return {
    valid: true,
    lewatCutoff: false,
    periode: p,
    periodeEfektif: p,
    meta: null,
    tanggalLaporan: d,
    bukaKembali: null
  };
}

function catatanLewatCutoff_(meta) {
  return "";
}

function gabungCatatanCutoff_(catatanLama, meta) {
  return (catatanLama || "").toString();
}

function statusReviewUntukTampilan_(status) {
  var s = (status || "").toString();
  if (s.indexOf("Disetujui - Lewat Cut-off") === 0) return REVIEW_STATUS.DISETUJUI;
  return s;
}

// Override builder Review Admin agar arsip laporan lama yang masih berstatus
// "Disetujui - Lewat Cut-off" ditampilkan sebagai "Disetujui", tanpa memaksa poin tampil 0.
var buildAdminReviewItemFromRow__SEBELUM_NONAKTIF_CUTOFF_2026051212 = buildAdminReviewItemFromRow_;
buildAdminReviewItemFromRow_ = function (row, lampiranCache) {
  var item = buildAdminReviewItemFromRow__SEBELUM_NONAKTIF_CUTOFF_2026051212(row, lampiranCache);
  try {
    if (item && item.status && String(item.status).indexOf("Disetujui - Lewat Cut-off") === 0) {
      item.status = REVIEW_STATUS.DISETUJUI;
      item.statusAsliSebelumNormalisasi = "Disetujui - Lewat Cut-off";
    }
    if (item) {
      item.lewatCutoff = false;
      item.cutoffPesan = "";
      item.labelCutoff = "";
    }
  } catch (e) { }
  return item;
};

// Override proses review admin agar persetujuan tidak pernah diubah menjadi
// "Disetujui - Lewat Cut-off" oleh logika cut-off lama.
var prosesReviewAdmin__SEBELUM_NONAKTIF_CUTOFF_2026051212 = prosesReviewAdmin;
prosesReviewAdmin = function (idLaporan, status, poinFinal, catatan, token) {
  var statusNormal = status;
  if (String(statusNormal || "").indexOf("Disetujui - Lewat Cut-off") === 0) {
    statusNormal = REVIEW_STATUS.DISETUJUI;
  }

  var hasil = prosesReviewAdmin__SEBELUM_NONAKTIF_CUTOFF_2026051212(idLaporan, statusNormal, poinFinal, catatan, token);

  try {
    // Jika fungsi lama masih sempat menulis status lewat cut-off, normalisasi barisnya.
    if (hasil && hasil.sukses !== false) {
      var sh = getSheet_("Rekap_Kinerja");
      var rowIndex = cariRowRekapKinerjaById_(sh, idLaporan);
      if (rowIndex) {
        var C = SHEET_COLUMNS.REKAP_KINERJA;
        var statusSekarang = String(sh.getRange(rowIndex, C.STATUS_REVIEW + 1).getValue() || "");
        if (statusSekarang.indexOf("Disetujui - Lewat Cut-off") === 0) {
          sh.getRange(rowIndex, C.STATUS_REVIEW + 1).setValue(REVIEW_STATUS.DISETUJUI);

          var catatanSekarang = String(sh.getRange(rowIndex, C.CATATAN_ADMIN + 1).getValue() || "");
          catatanSekarang = catatanSekarang
            .replace(/Lewat cut-off[^\n]*(\n)?/gi, "")
            .replace(/tidak dihitung sebagai poin dan tidak masuk rekap tunjangan periode berjalan\.?/gi, "")
            .trim();
          sh.getRange(rowIndex, C.CATATAN_ADMIN + 1).setValue(catatanSekarang || catatan || "Disetujui.");
        }
      }
    }
  } catch (eNormalisasiCutoff) {
    Logger.log("Peringatan normalisasi status cut-off gagal: " + (eNormalisasiCutoff && eNormalisasiCutoff.message ? eNormalisasiCutoff.message : eNormalisasiCutoff));
  }

  return hasil;
};

function normalisasiStatusLewatCutoffLama(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses: false, pesan: "Akses ditolak. Hanya Lurah/Carik." };

    var sh = getSheet_("Rekap_Kinerja");
    var data = sh.getDataRange().getValues();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var updated = 0;

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][C.STATUS_REVIEW] || "");
      if (status.indexOf("Disetujui - Lewat Cut-off") !== 0) continue;

      sh.getRange(i + 1, C.STATUS_REVIEW + 1).setValue(REVIEW_STATUS.DISETUJUI);

      var catatan = String(data[i][C.CATATAN_ADMIN] || "");
      catatan = catatan
        .replace(/Lewat cut-off[^\n]*(\n)?/gi, "")
        .replace(/tidak dihitung sebagai poin dan tidak masuk rekap tunjangan periode berjalan\.?/gi, "")
        .trim();
      sh.getRange(i + 1, C.CATATAN_ADMIN + 1).setValue(catatan || "Disetujui.");
      updated++;
    }

    invalidasiCacheRekapKinerjaReadOnly_();
    logAudit(idUser, "NORMALISASI_STATUS_LEWAT_CUTOFF", "Jumlah dinormalisasi: " + updated);

    return {
      sukses: true,
      pesan: "Normalisasi selesai. Status 'Disetujui - Lewat Cut-off' yang ditemukan diubah menjadi 'Disetujui'. Jumlah: " + updated + ".",
      jumlah: updated
    };
  } catch (e) {
    return handleError("normalisasiStatusLewatCutoffLama", e, { sukses: false, pesan: "" });
  }
}



// ===== PATCH v2026.05.12.13: Pertahankan label peringatan periode ditutup =====
// v2026.05.12.12 terlalu luas karena menyembunyikan flag lewatCutoff/cutoffPesan
// pada tampilan Review Admin. Revisi ini:
// - tetap tidak memakai status otomatis "Disetujui - Lewat Cut-off";
// - tetap mempertahankan label/peringatan periode ditutup seperti
//   "Periode: April 2026 - Ditutup" dan pesan tanggal pelaksanaan masuk periode yang sudah cut-off.

if (typeof buildAdminReviewItemFromRow__SEBELUM_NONAKTIF_CUTOFF_2026051212 !== 'undefined') {
  buildAdminReviewItemFromRow_ = function (row, lampiranCache) {
    var item = buildAdminReviewItemFromRow__SEBELUM_NONAKTIF_CUTOFF_2026051212(row, lampiranCache);

    try {
      // Normalisasi hanya status "Disetujui - Lewat Cut-off".
      // Jangan hapus item.lewatCutoff, item.cutoffPesan, atau item.labelCutoff,
      // karena field tersebut dipakai sebagai peringatan audit periode tertutup.
      if (item && item.status && String(item.status).indexOf("Disetujui - Lewat Cut-off") === 0) {
        item.status = REVIEW_STATUS.DISETUJUI;
        item.statusAsliSebelumNormalisasi = "Disetujui - Lewat Cut-off";
      }
    } catch (e) { }

    return item;
  };
}



// ===== PATCH v2026.05.12.14: Optimasi Klasemen Kinerja dengan filter backend + paginasi =====
// Tidak mengubah rumus bisnis ambilDataRekap(); fungsi ini tetap menjadi sumber perhitungan.
// Patch hanya membungkus hasilnya dengan filter, offset, dan limit agar frontend tidak harus
// merender semua data sekaligus. Cache singkat dipakai untuk mengurangi hitung ulang saat klik "Muat Lagi".

var KLASMEN_REKAP_CACHE_KEY_2026051214 = 'KLASEMEN_REKAP_CACHE_2026051214';
var KLASMEN_REKAP_CACHE_TTL_SECONDS_2026051214 = 300;

function ambilDataRekapKlasemenCached_() {
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(KLASMEN_REKAP_CACHE_KEY_2026051214);
    if (raw) {
      try { return JSON.parse(raw); } catch (eParse) { }
    }

    var rows = ambilDataRekap() || [];
    try {
      var json = JSON.stringify(rows);
      // CacheService limit aman sekitar 100KB per item; jika terlalu besar, abaikan cache.
      if (json && json.length < 90000) {
        cache.put(KLASMEN_REKAP_CACHE_KEY_2026051214, json, KLASMEN_REKAP_CACHE_TTL_SECONDS_2026051214);
      }
    } catch (eCache) { }

    return rows;
  } catch (e) {
    Logger.log('ambilDataRekapKlasemenCached_ ERROR: ' + (e && e.message ? e.message : e));
    return [];
  }
}

function ambilDataRekapPaged(params, token) {
  try {
    // Klasemen boleh dilihat user yang sudah login, sama seperti ambilDataRekap lama.
    var idUser = validasiSession(token);
    if (!idUser) {
      return {
        sukses: false,
        pesan: 'Sesi habis. Silakan login ulang.',
        rows: [],
        total: 0,
        offset: 0,
        limit: 20,
        hasMore: false
      };
    }

    params = params || {};
    var kelompok = String(params.kelompok || 'Semua');
    var offset = parseInt(params.offset, 10);
    var limit = parseInt(params.limit, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    var semua = ambilDataRekapKlasemenCached_();

    var filtered = semua;
    if (kelompok && kelompok !== 'Semua') {
      filtered = filtered.filter(function (r) {
        return String((r && r.kelompok) || '') === kelompok;
      });
    }

    // Peringkat tetap dihitung berdasarkan urutan keseluruhan hasil filter, bukan urutan halaman.
    for (var i = 0; i < filtered.length; i++) {
      filtered[i].peringkat = i + 1;
    }

    var page = filtered.slice(offset, offset + limit);

    return {
      sukses: true,
      rows: page,
      total: filtered.length,
      offset: offset,
      limit: limit,
      hasMore: offset + limit < filtered.length,
      kelompok: kelompok,
      generatedAt: formatTanggalJamISO_(new Date())
    };
  } catch (e) {
    return handleError('ambilDataRekapPaged', e, {
      sukses: false,
      pesan: '',
      rows: [],
      total: 0,
      offset: 0,
      limit: 20,
      hasMore: false
    });
  }
}

function refreshKlasemenKinerjaCache(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };
    try { CacheService.getScriptCache().remove(KLASMEN_REKAP_CACHE_KEY_2026051214); } catch (e) { }
    var rows = ambilDataRekapKlasemenCached_();
    return { sukses: true, pesan: 'Cache Klasemen Kinerja diperbarui.', jumlah: rows.length };
  } catch (e2) {
    return handleError('refreshKlasemenKinerjaCache', e2, { sukses: false, pesan: '' });
  }
}



// ===== PATCH v2026.05.12.15: Perbaiki info cut-off periode sebelumnya =====
// Bug: label "Cut-off periode sebelumnya" di Dashboard Admin Kinerja bisa mengambil
// meta lama/default yang tersimpan, misalnya 25/04/2026, padahal kebijakan aktual
// April 2026 adalah 27/04/2026 18:13:40.
// Perbaikan ini hanya mengubah sumber informasi tampilan metadata dashboard.
// Logika poin/predikat tidak diubah.

function cutoffSebelumnyaDashboardAktual_(periodeSebelumnya, prevMeta) {
  var p = normalizePeriode_(periodeSebelumnya || '');
  var kandidat = [];

  function add_(meta, sumber) {
    try {
      if (meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime())) {
        kandidat.push({ meta: meta, sumber: sumber || '' });
      }
    } catch (e) { }
  }

  add_(prevMeta, 'prev_meta_awal');

  // Kebijakan khusus April 2026 yang sudah menjadi acuan operasional.
  // Jika ada meta tersimpan yang lebih lama/default, jangan tampilkan sebagai cut-off sebelumnya.
  if (p === '2026-04') {
    try { add_(metaCutoffTunjanganApril2026_(), 'kebijakan_april_2026'); } catch (eApril) { }
  }

  // Jika ada meta tersimpan lain untuk periode yang sama, ikut dipertimbangkan,
  // tetapi yang dipakai untuk tampilan adalah tanggal cut-off paling akhir.
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(cutoffPropertyKeyTunjangan_(p));
    if (raw) {
      var obj = JSON.parse(raw);
      if (obj && obj.periode) {
        add_(buildDateRangeMeta_(p, obj.tanggalMulaiPeriode, obj.tanggalAkhirPeriode, obj.jamCutoff), 'tersimpan_modul_tunjangan');
      }
    }
  } catch (eRaw) { }

  if (!kandidat.length) return null;

  kandidat.sort(function (a, b) {
    return b.meta.endInclusive.getTime() - a.meta.endInclusive.getTime();
  });

  return kandidat[0].meta;
}

// Override rentang dashboard agar field cutoffSebelumnya memakai cut-off aktual periode sebelumnya.
// Ini sengaja ditempatkan setelah definisi lama agar menimpa fungsi sebelumnya tanpa mengubah rumus lain.
function rentangPeriodeTunjanganUntukDashboard_(periode) {
  var p = normalizePeriode_(periode);
  var current = cutoffTunjanganRawMeta_(p);
  var currentMeta = current.meta;
  var prevP = periodeKeyOffset_(p, -1);
  var prev = cutoffTunjanganRawMeta_(prevP);
  var prevMetaAwal = prev.meta;
  var prevMetaAktual = cutoffSebelumnyaDashboardAktual_(prevP, prevMetaAwal) || prevMetaAwal;

  var start = currentMeta.start;
  var startSource = current.sumber;

  // Jika periode belum disimpan di modul Tunjangan, mulai dari tepat setelah cut-off periode sebelumnya.
  if (!current.ada && prevMetaAktual && prevMetaAktual.endInclusive instanceof Date && !isNaN(prevMetaAktual.endInclusive.getTime())) {
    start = new Date(prevMetaAktual.endInclusive.getTime() + 1);
    startSource = 'setelah_cutoff_tunjangan_sebelumnya';
  }

  // Guard agar Dashboard tidak menghitung overlap dengan periode sebelumnya.
  if (prevMetaAktual && prevMetaAktual.endInclusive instanceof Date && !isNaN(prevMetaAktual.endInclusive.getTime())) {
    var minStart = new Date(prevMetaAktual.endInclusive.getTime() + 1);
    if (!(start instanceof Date) || isNaN(start.getTime()) || start.getTime() < minStart.getTime()) {
      start = minStart;
      startSource = startSource + '+anti_overlap_cutoff_tunjangan';
    }
  }

  var end = currentMeta.end;
  var endInclusive = currentMeta.endInclusive;

  return {
    periode: p,
    year: parseInt(p.slice(0, 4), 10),
    month: parseInt(p.slice(5, 7), 10) - 1,
    start: start,
    end: end,
    endInclusive: endInclusive,
    labelPembayaran: currentMeta.labelPembayaran || labelPembayaranPeriode_(p),
    tanggalMulaiPeriode: formatTanggalISO_(start),
    tanggalMulaiPeriodeJam: formatTanggalJamISO_(start),
    tanggalAkhirPeriode: formatTanggalISO_(endInclusive),
    tanggalCutoff: formatTanggalJamISO_(endInclusive),
    jamCutoff: currentMeta.jamCutoff || DEFAULT_TUNJANGAN_CUTOFF_TIME,
    sumberCutoffTunjangan: startSource,
    sumberCutoffAkhir: current.sumber,
    periodeSebelumnya: prevP,
    cutoffSebelumnya: prevMetaAktual ? formatTanggalJamISO_(prevMetaAktual.endInclusive) : '',
    sumberCutoffSebelumnya: prevMetaAktual === prevMetaAwal ? prev.sumber : 'kebijakan_aktual_dashboard',
    modePeriode: 'mengikuti_cutoff_tunjangan'
  };
}



// ===== PATCH v2026.05.12.16: Deteksi Duplikasi Laporan Sangat Mirip =====
// Tujuan: mencegah laporan yang hampir pasti terkirim dua kali karena lupa/salah klik/unggah ulang.
// Prinsip ketat:
// - Tidak memblokir kegiatan rutin pada tanggal berbeda.
// - Tidak memblokir revisi laporan ditolak.
// - Tidak membandingkan dengan laporan lama yang sudah Ditolak.
// - Hanya menolak jika pegawai + kategori + periode/tanggal pelaksanaan sama,
//   dan deskripsi/nama kegiatan sangat mirip.

function normalisasiTeksDuplikasiLaporan_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u00a0]/g, ' ')
    .replace(/[^\w\s\u00c0-\u024f\u1e00-\u1eff]/g, ' ')
    .replace(/\b(yang|dan|di|ke|dari|pada|untuk|dengan|sebagai|adalah|ini|itu|saya|kami|telah|sudah|melaksanakan|melakukan)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenUnikDuplikasiLaporan_(text) {
  var s = normalisasiTeksDuplikasiLaporan_(text);
  if (!s) return [];
  var parts = s.split(' ');
  var seen = {};
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i];
    if (!t || t.length < 3 || seen[t]) continue;
    seen[t] = true;
    out.push(t);
  }
  return out;
}

function kemiripanTokenDuplikasiLaporan_(a, b) {
  var ta = tokenUnikDuplikasiLaporan_(a);
  var tb = tokenUnikDuplikasiLaporan_(b);
  if (!ta.length || !tb.length) return 0;

  var setB = {};
  for (var i = 0; i < tb.length; i++) setB[tb[i]] = true;

  var inter = 0;
  for (var j = 0; j < ta.length; j++) {
    if (setB[ta[j]]) inter++;
  }

  return (2 * inter) / (ta.length + tb.length);
}

function potongTeksDuplikasi_(value, maxLen) {
  var s = String(value || '').replace(/\s+/g, ' ').trim();
  maxLen = maxLen || 180;
  return s.length > maxLen ? s.substring(0, maxLen) + '...' : s;
}

function statusRekapDitolakDuplikasi_(status) {
  var s = String(status || '').toLowerCase();
  return s.indexOf('ditolak') !== -1;
}

function statusRekapAktifUntukDuplikasi_(status) {
  // Semua laporan selain Ditolak dianggap aktif untuk pencegahan double-submit:
  // Menunggu Review, Banding, Menunggu Persetujuan Lurah, Disetujui, Disetujui Lurah, dll.
  return !statusRekapDitolakDuplikasi_(status);
}

function tanggalOnlyKeyDuplikasiLaporan_(value) {
  var d = parseTanggal(value);
  if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
    return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
  }

  var s = String(value || '').trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  var id = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (id) return id[3] + '-' + String(id[2]).padStart(2, '0') + '-' + String(id[1]).padStart(2, '0');

  return '';
}

function periodeKeyDuplikasiLaporan_(value) {
  var s = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  var d = parseTanggal(value);
  if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
    return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  }

  var iso = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (iso) return iso[1] + '-' + iso[2];

  return '';
}

function nilaiPertamaDuplikasiLaporan_(list) {
  list = list || [];
  for (var i = 0; i < list.length; i++) {
    var v = list[i];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return '';
}

function ambilTanggalPelaksanaanDariPaketDuplikasi_(paket) {
  paket = paket || {};
  return nilaiPertamaDuplikasiLaporan_([
    paket.tanggalKegiatan,
    paket.tanggal,
    paket.detailReguler && paket.detailReguler.tanggal,
    paket.detailDukuh && paket.detailDukuh.tanggal,
    paket.detailTU && paket.detailTU.tanggal,
    paket.detailPHL && paket.detailPHL.tanggal,
    paket.detailPimpinan && paket.detailPimpinan.tanggal,
    paket.detailAPBKal && paket.detailAPBKal.tanggal,
    paket.detailAPBKalCarik && paket.detailAPBKalCarik.tanggal,
    paket.detailStafInstruksi && paket.detailStafInstruksi.tanggal,
    paket.detailStafReguler && paket.detailStafReguler.tanggal
  ]);
}

function ambilPeriodeDariPaketDuplikasi_(paket) {
  paket = paket || {};
  return nilaiPertamaDuplikasiLaporan_([
    paket.periode,
    paket.bulan,
    paket.detailWajibPamong && paket.detailWajibPamong.bulan,
    paket.detailWajibDukuh && paket.detailWajibDukuh.bulan,
    paket.detailAPBKal && paket.detailAPBKal.bulan
  ]);
}

function ambilNamaKegiatanDariPaketDuplikasi_(paket) {
  paket = paket || {};
  return nilaiPertamaDuplikasiLaporan_([
    paket.namaKegiatan,
    paket.namaKeg,
    paket.jenisTugas,
    paket.detailReguler && (paket.detailReguler.namaKegiatan || paket.detailReguler.namaKeg || paket.detailReguler.jenis),
    paket.detailDukuh && (paket.detailDukuh.namaKegiatan || paket.detailDukuh.namaKeg || paket.detailDukuh.jenis),
    paket.detailTU && (paket.detailTU.namaKegiatan || paket.detailTU.namaKeg || paket.detailTU.jenis),
    paket.detailPHL && (paket.detailPHL.namaKegiatan || paket.detailPHL.namaKeg || paket.detailPHL.jenis),
    paket.detailPimpinan && (paket.detailPimpinan.namaKegiatan || paket.detailPimpinan.namaKeg || paket.detailPimpinan.jenis),
    paket.detailAPBKal && (paket.detailAPBKal.namaKegiatan || paket.detailAPBKal.namaKeg || paket.detailAPBKal.tahap),
    paket.detailAPBKalCarik && (paket.detailAPBKalCarik.namaKegiatan || paket.detailAPBKalCarik.namaKeg || paket.detailAPBKalCarik.tahap)
  ]);
}

function ambilDeskripsiDariPaketDuplikasi_(paket) {
  paket = paket || {};
  var wajib = [];

  try {
    if (paket.detailWajibPamong && Array.isArray(paket.detailWajibPamong.tugasData)) {
      for (var i = 0; i < paket.detailWajibPamong.tugasData.length; i++) {
        var t = paket.detailWajibPamong.tugasData[i] || {};
        wajib.push((t.namaTugas || '') + ' ' + (t.deskripsi || ''));
      }
    }
  } catch (eWajibPamong) { }

  try {
    if (paket.detailWajibDukuh && Array.isArray(paket.detailWajibDukuh.tugasData)) {
      for (var j = 0; j < paket.detailWajibDukuh.tugasData.length; j++) {
        var d = paket.detailWajibDukuh.tugasData[j] || {};
        wajib.push((d.namaTugas || '') + ' ' + (d.deskripsi || ''));
      }
    }
  } catch (eWajibDukuh) { }

  return nilaiPertamaDuplikasiLaporan_([
    wajib.join(' '),
    paket.deskripsi,
    paket.uraian,
    paket.laporan,
    paket.detailReguler && (paket.detailReguler.deskripsi || paket.detailReguler.uraian),
    paket.detailDukuh && (paket.detailDukuh.deskripsi || paket.detailDukuh.uraian),
    paket.detailTU && (paket.detailTU.deskripsi || paket.detailTU.uraian),
    paket.detailPHL && (paket.detailPHL.deskripsi || paket.detailPHL.uraian),
    paket.detailPimpinan && (paket.detailPimpinan.deskripsi || paket.detailPimpinan.uraian),
    paket.detailAPBKal && (paket.detailAPBKal.deskripsi || paket.detailAPBKal.uraian),
    paket.detailAPBKalCarik && (paket.detailAPBKalCarik.deskripsi || paket.detailAPBKalCarik.uraian)
  ]);
}

function ambilFileNamesDariPaketDuplikasi_(paket) {
  var out = [];
  function addName_(v) {
    if (v !== null && v !== undefined && String(v).trim() !== '') out.push(String(v).trim().toLowerCase());
  }
  function scan_(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) scan_(obj[i]);
      return;
    }
    if (typeof obj === 'object') {
      addName_(obj.fileName);
      addName_(obj.namaFile);
      addName_(obj.name);
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (k === 'fileData' || k === 'data' || k === 'base64') continue;
        if (typeof obj[k] === 'object') scan_(obj[k]);
      }
    }
  }
  scan_(paket);
  return out;
}

function ambilPayloadJsonRekapDuplikasi_(row) {
  try {
    var raw = '';
    if (SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON !== undefined) {
      raw = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON];
    }
    if ((raw === null || raw === undefined || raw === '') &&
        SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON !== undefined) {
      raw = row[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON];
    }
    if (raw !== null && raw !== undefined && raw !== '') return JSON.parse(raw);
  } catch (e) { }
  return null;
}

function ambilFileNamesDariPayloadDuplikasi_(payload) {
  if (!payload) return [];
  return ambilFileNamesDariPaketDuplikasi_(payload);
}

function adaIrisanFileNameDuplikasi_(a, b) {
  if (!a || !b || !a.length || !b.length) return false;
  var set = {};
  for (var i = 0; i < a.length; i++) {
    var x = normalisasiTeksDuplikasiLaporan_(a[i]);
    if (x) set[x] = true;
  }
  for (var j = 0; j < b.length; j++) {
    var y = normalisasiTeksDuplikasiLaporan_(b[j]);
    if (y && set[y]) return true;
  }
  return false;
}

function kategoriDariPaketDuplikasi_(paket) {
  return String(
    paket && (paket.kategori || paket.kategoriKegiatan || paket.jenisLaporan || paket.kategoriSheet || '')
    || ''
  ).trim();
}

function kategoriSamaDuplikasi_(a, b) {
  var x = String(a || '').trim();
  var y = String(b || '').trim();
  if (!x || !y) return false;
  return x === y;
}

function tanggalAtauPeriodeSamaDuplikasi_(paket, row, payloadLama) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;

  var periodeBaru = periodeKeyDuplikasiLaporan_(ambilPeriodeDariPaketDuplikasi_(paket));
  var tanggalBaru = tanggalOnlyKeyDuplikasiLaporan_(ambilTanggalPelaksanaanDariPaketDuplikasi_(paket));

  var periodeLama = periodeKeyDuplikasiLaporan_(
    payloadLama && (ambilPeriodeDariPaketDuplikasi_(payloadLama) || '')
  );
  var tanggalLama = tanggalOnlyKeyDuplikasiLaporan_(row[C.TANGGAL_KEGIATAN] || (payloadLama && ambilTanggalPelaksanaanDariPaketDuplikasi_(payloadLama)));

  if (periodeBaru || periodeLama) return !!periodeBaru && !!periodeLama && periodeBaru === periodeLama;
  if (tanggalBaru || tanggalLama) return !!tanggalBaru && !!tanggalLama && tanggalBaru === tanggalLama;

  return false;
}

function buildRingkasDuplikasiDariRow_(row, payloadLama) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  return {
    idLaporan: normalizeId_(row[C.ID_LAPORAN]),
    waktuLapor: row[C.TANGGAL_LAPORAN],
    kategori: String(row[C.KATEGORI] || ''),
    tanggalPelaksanaan: row[C.TANGGAL_KEGIATAN],
    namaKegiatan: String(row[C.NAMA_KEGIATAN] || (payloadLama && ambilNamaKegiatanDariPaketDuplikasi_(payloadLama)) || ''),
    deskripsi: String(row[C.DESKRIPSI] || (payloadLama && ambilDeskripsiDariPaketDuplikasi_(payloadLama)) || '')
  };
}

function formatWaktuDuplikasiLaporan_(value) {
  var d = parseTanggal(value);
  if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
    return Utilities.formatDate(d, 'GMT+7', 'dd/MM/yyyy HH:mm') + ' WIB';
  }
  return String(value || '-');
}

function cekDuplikasiLaporanSangatMirip_(paket, pegawaiUser) {
  paket = paket || {};
  pegawaiUser = pegawaiUser || {};

  // Revisi laporan ditolak harus tetap boleh.
  if (paket.idLaporanRevisi || paket.modeRevisi || paket.revisi === true) {
    return { duplikat: false };
  }

  var idUser = normalizeId_(pegawaiUser.id || pegawaiUser.idUser || paket.idUser || paket.id_user || '');
  if (!idUser) return { duplikat: false };

  var kategoriBaru = kategoriDariPaketDuplikasi_(paket);
  var deskripsiBaru = ambilDeskripsiDariPaketDuplikasi_(paket);
  var namaKegiatanBaru = ambilNamaKegiatanDariPaketDuplikasi_(paket);
  var fileNamesBaru = ambilFileNamesDariPaketDuplikasi_(paket);

  if (!kategoriBaru || !deskripsiBaru) return { duplikat: false };

  var normDescBaru = normalisasiTeksDuplikasiLaporan_(deskripsiBaru);
  if (normDescBaru.length < 40) {
    // Deskripsi terlalu pendek berisiko false positive.
    return { duplikat: false };
  }

  var data = getRekapKinerjaValuesReadOnly_();
  var C = SHEET_COLUMNS.REKAP_KINERJA;

  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i] || [];

    if (!idsEqual_(row[C.ID_USER], idUser)) continue;
    if (!statusRekapAktifUntukDuplikasi_(row[C.STATUS_REVIEW])) continue;

    var kategoriLama = String(row[C.KATEGORI] || '');
    if (!kategoriSamaDuplikasi_(kategoriBaru, kategoriLama)) continue;

    var payloadLama = ambilPayloadJsonRekapDuplikasi_(row);
    if (!tanggalAtauPeriodeSamaDuplikasi_(paket, row, payloadLama)) continue;

    var descLama = String(row[C.DESKRIPSI] || (payloadLama && ambilDeskripsiDariPaketDuplikasi_(payloadLama)) || '');
    var normDescLama = normalisasiTeksDuplikasiLaporan_(descLama);
    if (normDescLama.length < 40) continue;

    var simDesc = kemiripanTokenDuplikasiLaporan_(deskripsiBaru, descLama);
    if (simDesc < 0.94) continue;

    var namaLama = String(row[C.NAMA_KEGIATAN] || (payloadLama && ambilNamaKegiatanDariPaketDuplikasi_(payloadLama)) || '');
    var simNama = (namaKegiatanBaru && namaLama)
      ? kemiripanTokenDuplikasiLaporan_(namaKegiatanBaru, namaLama)
      : 1;

    // Nama kegiatan tidak wajib selalu ada, tetapi bila ada dan sangat berbeda,
    // jangan langsung blokir.
    if (namaKegiatanBaru && namaLama && simNama < 0.86) continue;

    var fileNamesLama = ambilFileNamesDariPayloadDuplikasi_(payloadLama);
    var fileSama = adaIrisanFileNameDuplikasi_(fileNamesBaru, fileNamesLama);

    // Blokir jika:
    // - deskripsi hampir identik dan nama kegiatan cocok; atau
    // - deskripsi sangat mirip dan ada bukti/file name yang sama.
    var sangatMirip = simDesc >= 0.97 || (simDesc >= 0.94 && fileSama);
    if (!sangatMirip) continue;

    var ringkas = buildRingkasDuplikasiDariRow_(row, payloadLama);
    return {
      duplikat: true,
      idLaporan: ringkas.idLaporan,
      waktuLapor: ringkas.waktuLapor,
      kategori: ringkas.kategori,
      tanggalPelaksanaan: ringkas.tanggalPelaksanaan,
      namaKegiatan: ringkas.namaKegiatan,
      deskripsi: ringkas.deskripsi,
      similarity: simDesc,
      fileSama: fileSama
    };
  }

  return { duplikat: false };
}

function pesanDuplikasiLaporanSangatMirip_(hasil) {
  hasil = hasil || {};
  var persen = Math.round(Number(hasil.similarity || 0) * 100);

  return (
    '❌ LAPORAN TERINDIKASI DUPLIKAT\n\n' +
    'Sistem menemukan laporan yang sangat mirip dan sudah pernah dikirim sebelumnya.\n\n' +
    'Waktu lapor sebelumnya: ' + formatWaktuDuplikasiLaporan_(hasil.waktuLapor) + '\n' +
    'Kategori: ' + (hasil.kategori || '-') + '\n' +
    'Tanggal pelaksanaan: ' + formatWaktuDuplikasiLaporan_(hasil.tanggalPelaksanaan).replace(' 00:00 WIB', '') + '\n' +
    'Kemiripan deskripsi: ' + persen + '%\n\n' +
    'Cuplikan laporan sebelumnya:\n' +
    potongTeksDuplikasi_(hasil.deskripsi || '', 220) + '\n\n' +
    'Silakan cek menu Riwayat. Jika laporan sebelumnya ditolak admin, gunakan fitur Revisi. ' +
    'Jika ini memang kegiatan berbeda, ubah nama kegiatan/deskripsi agar perbedaannya jelas.'
  );
}

// Wrapper validasi submit: jalankan validasi lama dulu, lalu deteksi duplikasi sangat mirip.
var validasiPayloadSubmitKinerja__SEBELUM_DUPLIKASI_2026051216 = validasiPayloadSubmitKinerja_;
validasiPayloadSubmitKinerja_ = function (paket, pegawaiUser) {
  var hasilLama = validasiPayloadSubmitKinerja__SEBELUM_DUPLIKASI_2026051216(paket, pegawaiUser);
  if (hasilLama) return hasilLama;

  var cek = cekDuplikasiLaporanSangatMirip_(paket, pegawaiUser);
  if (cek && cek.duplikat) {
    return pesanDuplikasiLaporanSangatMirip_(cek);
  }

  return '';
};



// ===== PATCH v2026.05.12.18: Revisi hanya untuk periode aktif + alasan tampil jelas =====
// Patch ini sengaja dilanjutkan dari v2026.05.12.16, bukan v17.
// Kebijakan:
// - Laporan Ditolak + periode masih aktif/belum cut-off => boleh revisi.
// - Laporan Ditolak + periode sudah lewat cut-off => tidak boleh revisi.
// - Status Ditolak dibaca lebih toleran, termasuk variasi yang diawali "Ditolak".
// - Backend mengirim alasanTidakBisaRevisi agar frontend dapat menjelaskan kenapa tombol tidak muncul.

function isStatusDitolakUntukRevisi_(status) {
  var s = String(status || '').trim().toLowerCase();
  return s === String(REVIEW_STATUS.DITOLAK || 'Ditolak').toLowerCase() || s.indexOf('ditolak') === 0;
}

function cekBolehRevisiLaporanPegawai_(row, idUser) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  if (!row) return { boleh: false, kode: 'NOT_FOUND', pesan: 'Laporan tidak ditemukan.' };

  if (!idsEqual_(row[C.ID_USER], idUser)) {
    return { boleh: false, kode: 'NOT_OWNER', pesan: 'Laporan ini bukan milik akun Anda.' };
  }

  var status = String(row[C.STATUS_REVIEW] || '').trim();
  if (!isStatusDitolakUntukRevisi_(status)) {
    return { boleh: false, kode: 'NOT_REJECTED', pesan: 'Hanya laporan berstatus Ditolak yang dapat direvisi oleh pegawai.' };
  }

  var cekPeriode = cekPeriodeRevisiLaporanAktif_(row);
  if (!cekPeriode.boleh) {
    return {
      boleh: false,
      kode: 'PERIODE_LEWAT_CUTOFF',
      periode: cekPeriode.periode || '',
      tanggalCutoff: cekPeriode.tanggalCutoff || '',
      pesan: cekPeriode.pesan || 'Periode laporan sudah melewati cut-off. Revisi tidak dapat dilakukan.'
    };
  }

  return {
    boleh: true,
    kode: 'BOLEH',
    periode: cekPeriode.periode || '',
    tanggalCutoff: cekPeriode.tanggalCutoff || '',
    pesan: cekPeriode.pesan || 'Laporan dapat direvisi karena status Ditolak dan periode masih aktif.'
  };
}



// ===== PATCH v2026.05.12.19: Batas pelaporan disposisi maksimal H+2 =====
// Fokus sementara: hanya laporan yang berasal dari disposisi.
// Aturan:
// - Laporan disposisi baru/perbaikan melalui tombol disposisi maksimal H+2 kalender
//   dari tanggal pelaksanaan/surat disposisi, pukul 23:59:59 WIB.
// - Jika cut-off periode lebih awal dari H+2, maka batas efektif adalah cut-off periode.
// - Revisi laporan tetap mengikuti aturan revisi periode aktif yang sudah ada.
// - Laporan non-disposisi tidak diubah.

function tanggalAcuanPelaksanaanDisposisiDariPaket_(paket, surat) {
  paket = paket || {};
  surat = surat || {};

  function first_(list) {
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      if (v !== null && v !== undefined && String(v).trim() !== '') return v;
    }
    return '';
  }

  return first_([
    paket.tanggalKegiatan,
    paket.tanggal,
    paket.detailTU && paket.detailTU.tanggal,
    paket.detailPHL && paket.detailPHL.tanggal,
    paket.detailPimpinan && paket.detailPimpinan.tanggal,
    paket.detailStafInstruksi && paket.detailStafInstruksi.tanggal,
    paket.detailStafReguler && paket.detailStafReguler.tanggal,
    paket.detailReguler && paket.detailReguler.tanggal,
    paket.detailDukuh && paket.detailDukuh.tanggal,
    surat.tanggal_selesai,
    surat.tanggal_mulai,
    surat.tanggal_disposisi
  ]);
}

function batasH2PelaporanDisposisi_(tanggalPelaksanaanValue) {
  var d = parseTanggalKosongAman_(tanggalPelaksanaanValue);
  if (!d) return null;

  // H+2 kalender pada akhir hari.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2, 23, 59, 59, 999);
}

function formatTanggalJamDisposisiH2_(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return formatTanggalIndonesiaDisposisi_(d, true);
}

function hitungBatasPelaporanDisposisiH2_(surat, paket) {
  surat = surat || {};
  paket = paket || {};

  var tanggalAcuan = tanggalAcuanPelaksanaanDisposisiDariPaket_(paket, surat);
  var tanggalPelaksanaan = parseTanggalKosongAman_(tanggalAcuan);
  var batasH2 = batasH2PelaporanDisposisi_(tanggalAcuan);

  var tanggalPeriodeRef = tanggalPelaksanaan || parseTanggalKosongAman_(surat.tanggal_selesai || surat.tanggal_mulai || surat.tanggal_disposisi);
  var periode = '';
  var meta = null;
  var cutoff = null;

  if (tanggalPeriodeRef) {
    var tanggalPelaksanaanAwalHari = new Date(tanggalPeriodeRef.getFullYear(), tanggalPeriodeRef.getMonth(), tanggalPeriodeRef.getDate(), 0, 0, 0, 0);
    periode = periodeDariTanggalLaporan_(tanggalPelaksanaanAwalHari);
    meta = periode ? parsePeriodeBulan_(periode) : null;
    cutoff = meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime()) ? meta.endInclusive : null;
  }

  var batasEfektif = batasH2;
  var sumberBatas = 'H+2';
  if (cutoff && (!batasEfektif || cutoff.getTime() < batasEfektif.getTime())) {
    batasEfektif = cutoff;
    sumberBatas = 'CUT_OFF_PERIODE';
  }

  var now = new Date();
  var ditutup = !!(batasEfektif && now.getTime() > batasEfektif.getTime());
  var periodeLabel = periode ? labelPembayaranPeriode_(periode) : '';
  var cutoffLabel = cutoff ? formatTanggalJamDisposisiH2_(cutoff) : '';
  var batasH2Label = batasH2 ? formatTanggalJamDisposisiH2_(batasH2) : '';
  var batasEfektifLabel = batasEfektif ? formatTanggalJamDisposisiH2_(batasEfektif) : '';

  var pesan = '';
  if (ditutup) {
    if (sumberBatas === 'CUT_OFF_PERIODE') {
      pesan =
        'Batas pelaporan disposisi sudah berakhir karena periode pelaporan ' + (periodeLabel || '-') +
        ' ditutup pada ' + (cutoffLabel || '-') + '. Laporan dari disposisi ini tidak dapat dibuat melalui tombol pegawai.';
    } else {
      pesan =
        'Batas pelaporan disposisi maksimal H+2 sudah berakhir pada ' + (batasH2Label || '-') + '. ' +
        'Laporan dari disposisi ini tidak dapat dibuat melalui tombol pegawai.';
    }
  }

  return {
    tanggalPelaksanaan: tanggalPelaksanaan,
    tanggalPelaksanaanLabel: tanggalPelaksanaan ? formatTanggalIndonesiaDisposisi_(tanggalPelaksanaan, false) : '',
    batasH2: batasH2,
    batasH2Label: batasH2Label,
    batasEfektif: batasEfektif,
    batasEfektifLabel: batasEfektifLabel,
    sumberBatas: sumberBatas,
    periode: periode,
    periodeLabel: periodeLabel,
    cutoff: cutoff,
    cutoffLabel: cutoffLabel,
    periodeDitutup: ditutup,
    pesan: pesan
  };
}

// Override fungsi periode disposisi agar daftar Disposisi Saya dan banner dashboard
// memakai batas efektif H+2/cut-off periode.
function cutoffPelaporanDisposisi_(surat) {
  var info = hitungBatasPelaporanDisposisiH2_(surat || {}, {});
  return {
    periode: info.periode || '',
    periodeLabel: info.periodeLabel || '',
    periodeDitutup: !!info.periodeDitutup,
    cutoffLabel: info.batasEfektifLabel || info.cutoffLabel || '',
    batasH2Label: info.batasH2Label || '',
    sumberBatas: info.sumberBatas || '',
    pesan: info.pesan || ''
  };
}

// Override validasi submit disposisi agar memakai tanggal pelaksanaan yang benar-benar dikirim user.
var validasiDisposisiSubmitKinerja__SEBELUM_H2_2026051219 = validasiDisposisiSubmitKinerja_;
validasiDisposisiSubmitKinerja_ = function (paket, pegawaiUser, kategoriSheet) {
  var disposisiRef = (paket && paket.disposisiRef && paket.disposisiRef.idDisposisi) ? paket.disposisiRef : null;
  var disposisiSuratRef = disposisiRef ? getDisposisiSuratByIdInternal_(disposisiRef.idDisposisi) : null;

  if (disposisiRef && disposisiRef.idDisposisi) {
    if (!disposisiSuratRef) {
      return { sukses: false, pesan: 'Disposisi tidak ditemukan atau sudah tidak tersedia.' };
    }

    var batasDisposisi = hitungBatasPelaporanDisposisiH2_(disposisiSuratRef, paket || {});
    if (batasDisposisi.periodeDitutup) {
      return { sukses: false, pesan: batasDisposisi.pesan };
    }
  }

  // Jalankan validasi lama agar route form, hak kategori, dan pengaman lain tetap berlaku.
  return validasiDisposisiSubmitKinerja__SEBELUM_H2_2026051219(paket, pegawaiUser, kategoriSheet);
};



// ===== PATCH v2026.05.12.20: Tanggal Selesai Disposisi = Batas Maksimal Pelaporan =====
// Mengganti kebijakan v2026.05.12.19.
// Sebelumnya: batas disposisi = Tanggal Pelaksanaan/Selesai + H+2.
// Sekarang: Tanggal Selesai pada disposisi adalah tanggal maksimal pelaporan.
// Jika Tanggal Selesai kosong, fallback ke Tanggal Mulai. Jika Tanggal Mulai kosong,
// fallback ke Tanggal Disposisi.
// Batas efektif tetap yang lebih awal antara batas disposisi dan cut-off periode.

function tanggalBatasPelaporanDisposisiDariSurat_(surat) {
  surat = surat || {};
  var ref = surat.tanggal_selesai || surat.tanggal_mulai || surat.tanggal_disposisi;
  var d = parseTanggalKosongAman_(ref);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function tanggalAcuanPeriodeDisposisiDariSurat_(surat) {
  surat = surat || {};
  var ref = surat.tanggal_selesai || surat.tanggal_mulai || surat.tanggal_disposisi;
  var d = parseTanggalKosongAman_(ref);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function hitungBatasPelaporanDisposisiTanggalSelesai_(surat, paket) {
  surat = surat || {};
  paket = paket || {};

  var batasDisposisi = tanggalBatasPelaporanDisposisiDariSurat_(surat);
  var tanggalPeriodeRef = tanggalAcuanPeriodeDisposisiDariSurat_(surat);

  var periode = '';
  var meta = null;
  var cutoff = null;

  if (tanggalPeriodeRef) {
    periode = periodeDariTanggalLaporan_(tanggalPeriodeRef);
    meta = periode ? parsePeriodeBulan_(periode) : null;
    cutoff = meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime()) ? meta.endInclusive : null;
  }

  var batasEfektif = batasDisposisi;
  var sumberBatas = 'TANGGAL_SELESAI_DISPOSISI';

  if (cutoff && (!batasEfektif || cutoff.getTime() < batasEfektif.getTime())) {
    batasEfektif = cutoff;
    sumberBatas = 'CUT_OFF_PERIODE';
  }

  var now = new Date();
  var ditutup = !!(batasEfektif && now.getTime() > batasEfektif.getTime());

  var periodeLabel = periode ? labelPembayaranPeriode_(periode) : '';
  var batasDisposisiLabel = batasDisposisi ? formatTanggalIndonesiaDisposisi_(batasDisposisi, true) : '';
  var cutoffLabel = cutoff ? formatTanggalIndonesiaDisposisi_(cutoff, true) : '';
  var batasEfektifLabel = batasEfektif ? formatTanggalIndonesiaDisposisi_(batasEfektif, true) : '';

  var pesan = '';
  if (ditutup) {
    if (sumberBatas === 'CUT_OFF_PERIODE') {
      pesan =
        'Batas pelaporan disposisi sudah berakhir karena periode pelaporan ' + (periodeLabel || '-') +
        ' ditutup pada ' + (cutoffLabel || '-') + '. Laporan dari disposisi ini tidak dapat dibuat melalui tombol pegawai.';
    } else {
      pesan =
        'Batas pelaporan disposisi sudah berakhir pada ' + (batasDisposisiLabel || '-') + '. ' +
        'Tanggal Selesai disposisi digunakan sebagai tanggal maksimal pelaporan.';
    }
  }

  return {
    periode: periode,
    periodeLabel: periodeLabel,
    tanggalBatasDisposisi: batasDisposisi,
    tanggalBatasDisposisiLabel: batasDisposisiLabel,
    cutoff: cutoff,
    cutoffLabel: cutoffLabel,
    batasEfektif: batasEfektif,
    batasEfektifLabel: batasEfektifLabel,
    sumberBatas: sumberBatas,
    periodeDitutup: ditutup,
    pesan: pesan
  };
}

// Override ulang fungsi cutoffPelaporanDisposisi_ dari v19.
function cutoffPelaporanDisposisi_(surat) {
  var info = hitungBatasPelaporanDisposisiTanggalSelesai_(surat || {}, {});
  return {
    periode: info.periode || '',
    periodeLabel: info.periodeLabel || '',
    periodeDitutup: !!info.periodeDitutup,
    cutoffLabel: info.batasEfektifLabel || info.cutoffLabel || '',
    batasTanggalSelesaiLabel: info.tanggalBatasDisposisiLabel || '',
    sumberBatas: info.sumberBatas || '',
    pesan: info.pesan || ''
  };
}

// Override ulang validasi submit dari v19 agar tanggal pelaksanaan yang dikirim pegawai
// tidak memperpanjang batas. Batas berasal dari Tanggal Selesai disposisi.
var validasiDisposisiSubmitKinerja__SEBELUM_TGL_SELESAI_BATAS_2026051220 = validasiDisposisiSubmitKinerja_;
validasiDisposisiSubmitKinerja_ = function (paket, pegawaiUser, kategoriSheet) {
  var disposisiRef = (paket && paket.disposisiRef && paket.disposisiRef.idDisposisi) ? paket.disposisiRef : null;
  var disposisiSuratRef = disposisiRef ? getDisposisiSuratByIdInternal_(disposisiRef.idDisposisi) : null;

  if (disposisiRef && disposisiRef.idDisposisi) {
    if (!disposisiSuratRef) {
      return { sukses: false, pesan: 'Disposisi tidak ditemukan atau sudah tidak tersedia.' };
    }

    var batasDisposisi = hitungBatasPelaporanDisposisiTanggalSelesai_(disposisiSuratRef, paket || {});
    if (batasDisposisi.periodeDitutup) {
      return { sukses: false, pesan: batasDisposisi.pesan };
    }
  }

  return validasiDisposisiSubmitKinerja__SEBELUM_TGL_SELESAI_BATAS_2026051220(paket, pegawaiUser, kategoriSheet);
};



// ===== PATCH v2026.05.12.21: Batas H+2 untuk Kegiatan Reguler/Tupoksi Pamong tertentu =====
// Ruang lingkup:
// Laporan Produktivitas -> Pelaksanaan Tugas Pokok dan Fungsi -> Kegiatan Reguler/Tupoksi
// untuk jabatan: Carik, Jagabaya, Kamituwa, Ulu-ulu, Danarta, Tata Laksana, Pangripta.
// Aturan:
// - Submit laporan baru maksimal 2 hari kalender setelah tanggal pelaksanaan,
//   sampai pukul 23:59:59 WIB.
// - Jika cut-off periode lebih awal, maka batas efektif adalah cut-off periode.
// - Revisi tetap mengikuti aturan revisi periode aktif.
// - Laporan non-Reguler/Tupoksi tidak diubah.

function isJabatanPamongRegulerTupoksiH2_(jabatan) {
  var j = normalizeJabatan_(jabatan || '');
  var allowed = [
    'carik',
    'jagabaya',
    'kamituwa',
    'ulu ulu',
    'danarta',
    'tata laksana',
    'pangripta'
  ];

  for (var i = 0; i < allowed.length; i++) {
    if (j === allowed[i] || j.indexOf(allowed[i]) !== -1) return true;
  }
  return false;
}

function isPaketRegulerTupoksiH2_(paket, pegawaiUser) {
  paket = paket || {};
  pegawaiUser = pegawaiUser || {};

  if (!paket.detailReguler) return false;
  if (!isJabatanPamongRegulerTupoksiH2_(pegawaiUser.jabatan || paket.jabatan || '')) return false;

  var kategori = String(paket.kategori || paket.kategoriSheet || paket.jenisLaporan || '').toLowerCase();
  // detailReguler adalah penanda utama. Kategori tetap dicek lunak agar tidak salah blokir jika payload lama tidak mengisi kategori persis.
  if (kategori && kategori.indexOf('produkt') === -1 && kategori.indexOf('laporan') !== -1) {
    return false;
  }

  return true;
}

function batasH2DariTanggalPelaksanaanReguler_(tanggalPelaksanaanValue) {
  var d = parseTanggalKosongAman_(tanggalPelaksanaanValue);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2, 23, 59, 59, 999);
}

function hitungBatasRegulerTupoksiH2_(paket) {
  paket = paket || {};
  var reg = paket.detailReguler || {};
  var d = parseTanggalKosongAman_(reg.tanggal || paket.tanggalKegiatan || paket.tanggal);
  if (!d) {
    return {
      valid: false,
      pesan: 'Tanggal pelaksanaan tidak valid.'
    };
  }

  var batasH2 = batasH2DariTanggalPelaksanaanReguler_(d);
  var periode = periodeDariTanggalLaporan_(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  var meta = periode ? parsePeriodeBulan_(periode) : null;
  var cutoff = meta && meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime()) ? meta.endInclusive : null;

  var batasEfektif = batasH2;
  var sumberBatas = 'H+2';
  if (cutoff && (!batasEfektif || cutoff.getTime() < batasEfektif.getTime())) {
    batasEfektif = cutoff;
    sumberBatas = 'CUT_OFF_PERIODE';
  }

  return {
    valid: true,
    tanggalPelaksanaan: d,
    tanggalPelaksanaanLabel: formatTanggalIndonesiaDisposisi_(d, false),
    batasH2: batasH2,
    batasH2Label: batasH2 ? formatTanggalIndonesiaDisposisi_(batasH2, true) : '',
    periode: periode,
    periodeLabel: periode ? labelPembayaranPeriode_(periode) : '',
    cutoff: cutoff,
    cutoffLabel: cutoff ? formatTanggalIndonesiaDisposisi_(cutoff, true) : '',
    batasEfektif: batasEfektif,
    batasEfektifLabel: batasEfektif ? formatTanggalIndonesiaDisposisi_(batasEfektif, true) : '',
    sumberBatas: sumberBatas
  };
}

function validasiRegulerTupoksiH2_(paket, pegawaiUser) {
  if (!isPaketRegulerTupoksiH2_(paket, pegawaiUser)) return '';

  // Revisi ditangani oleh alur revisi dan validasi periode aktif tersendiri.
  if (paket && (paket.idLaporanRevisi || paket.modeRevisi || paket.revisi === true)) return '';

  var info = hitungBatasRegulerTupoksiH2_(paket);
  if (!info.valid) return '❌ GAGAL: ' + info.pesan;

  var now = new Date();
  if (info.batasEfektif && now.getTime() > info.batasEfektif.getTime()) {
    if (info.sumberBatas === 'CUT_OFF_PERIODE') {
      return (
        '❌ BATAS PELAPORAN SUDAH BERAKHIR\n\n' +
        'Laporan Kegiatan Reguler/Tupoksi untuk jabatan ini wajib dikirim maksimal 2 hari setelah tanggal pelaksanaan, ' +
        'namun periode ' + (info.periodeLabel || '-') + ' sudah cut-off lebih dahulu.\n\n' +
        'Tanggal pelaksanaan: ' + (info.tanggalPelaksanaanLabel || '-') + '\n' +
        'Batas H+2: ' + (info.batasH2Label || '-') + '\n' +
        'Cut-off periode: ' + (info.cutoffLabel || '-') + '\n\n' +
        'Laporan baru tidak dapat dikirim.'
      );
    }

    return (
      '❌ BATAS PELAPORAN H+2 TERLEWATI\n\n' +
      'Laporan Kegiatan Reguler/Tupoksi wajib dikirim maksimal 2 hari kalender setelah tanggal pelaksanaan.\n\n' +
      'Tanggal pelaksanaan: ' + (info.tanggalPelaksanaanLabel || '-') + '\n' +
      'Batas maksimal lapor: ' + (info.batasH2Label || '-') + '\n\n' +
      'Laporan baru tidak dapat dikirim karena sudah melewati batas waktu pelaporan.'
    );
  }

  return '';
}

var validasiPayloadSubmitKinerja__SEBELUM_REGULER_H2_2026051221 = validasiPayloadSubmitKinerja_;
validasiPayloadSubmitKinerja_ = function (paket, pegawaiUser) {
  var hasilLama = validasiPayloadSubmitKinerja__SEBELUM_REGULER_H2_2026051221(paket, pegawaiUser);
  if (hasilLama) return hasilLama;

  var hasilH2 = validasiRegulerTupoksiH2_(paket, pegawaiUser);
  if (hasilH2) return hasilH2;

  return '';
};


// ===== PATCH v2026.05.12.22: Catatan admin opsional saat menyetujui =====
// Backend prosesReviewAdmin(idLaporan, status, poinFinal, catatan, token) sudah mendukung catatan.
// Perubahan utama berada di Index.html: tombol Setuju memakai modal catatan, bukan confirm sederhana.


// ===== PATCH v2026.05.12.23: Update lokal Review Admin setelah aksi =====
// Backend tidak berubah. Perubahan utama berada di Index.html:
// setelah Setuju/Tolak/Revisi Nilai berhasil, daftar review tidak langsung reload penuh.



// ===== PATCH v2026.05.12.24: Audit Koreksi Cut-off Lama =====
// Fitur ini membantu admin mendeteksi laporan yang terlanjur berstatus
// "Disetujui - Lewat Cut-off" akibat logika cut-off lama/default.
// Aman untuk periode yang tunjangannya sudah cair:
// - Fungsi audit hanya menampilkan kandidat.
// - Fungsi koreksi hanya menormalisasi status/catatan laporan.
// - Poin final tidak diubah otomatis.
// - Rekap_Tunjangan_Bulanan yang sudah cair tidak diubah.
// - Admin tetap perlu melakukan Revisi Nilai / penyesuaian tunjangan secara terpisah dan tercatat.

function isStatusDisetujuiLewatCutoffLama_(status) {
  var s = String(status || '').toLowerCase();
  return s.indexOf('disetujui') === 0 && s.indexOf('lewat cut') !== -1;
}

function bersihkanCatatanCutoffLama_(catatan) {
  var s = String(catatan || '');
  if (!s) return '';
  s = s.replace(/Tanggal pelaksanaan masuk periode[\s\S]*?berjalan\.?/gi, '');
  s = s.replace(/Lewat cut-off[\s\S]*?berjalan\.?/gi, '');
  s = s.replace(/Jika disetujui,\s*poin otomatis 0[\s\S]*?berjalan\.?/gi, '');
  s = s.replace(/Batas terakhir:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.?/gi, '');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function statusTunjanganPegawaiPeriode_(periode, idUser) {
  try {
    var sh = getSheet_('Rekap_Tunjangan_Bulanan');
    var values = sh.getDataRange().getValues();
    var h = {};
    var headers = values[0] || [];
    headers.forEach(function (x, i) { h[String(x || '').trim()] = i; });

    var iPeriode = h.periode !== undefined ? h.periode : 0;
    var iId = h.id_user !== undefined ? h.id_user : 1;
    var iStatus = h.status_rekap !== undefined ? h.status_rekap : 15;
    var iRp = h.rp_total !== undefined ? h.rp_total : 14;

    for (var r = 1; r < values.length; r++) {
      if (String(values[r][iPeriode] || '').replace(/^'/, '').trim() !== String(periode || '').trim()) continue;
      if (!idsEqual_(values[r][iId], idUser)) continue;
      return {
        ada: true,
        status: String(values[r][iStatus] || ''),
        rpTotal: Number(values[r][iRp] || 0),
        sudahDicairkan: String(values[r][iStatus] || '') === TUNJANGAN_STATUS.SUDAH_DICAIRKAN
      };
    }
  } catch (e) { }
  return { ada: false, status: '', rpTotal: 0, sudahDicairkan: false };
}

function ambilAuditKoreksiCutoffLama(periode, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [] };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', items: [] };

    var p = normalizePeriode_(periode || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM'));
    var meta = parsePeriodeBulan_(p);
    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var status = String(row[C.STATUS_REVIEW] || '');
      if (!isStatusDisetujuiLewatCutoffLama_(status)) continue;

      var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

      // Fokus audit: laporan yang waktu lapornya masih berada dalam rentang periode yang benar,
      // sehingga status "lewat cut-off" patut dicurigai berasal dari cut-off lama/default.
      if (!(tglLap >= meta.start && tglLap <= meta.endInclusive)) continue;

      var idPeg = normalizeId_(row[C.ID_USER]);
      var tunj = statusTunjanganPegawaiPeriode_(p, idPeg);
      items.push({
        rowNumber: i + 1,
        idLaporan: normalizeId_(row[C.ID_LAPORAN]),
        idUser: idPeg,
        nama: String(row[C.NAMA] || ''),
        jabatan: String(row[C.JABATAN] || ''),
        kategori: String(row[C.KATEGORI] || ''),
        deskripsi: String(row[C.DESKRIPSI] || '').substring(0, 220),
        waktuLapor: formatTanggalJamISO_(tglLap),
        tanggalPelaksanaan: formatTanggalJamISO_(row[C.TANGGAL_KEGIATAN]) || String(row[C.TANGGAL_KEGIATAN] || ''),
        statusLama: status,
        poinFinal: Number(row[C.POIN_FINAL] || 0),
        catatan: String(row[C.CATATAN_ADMIN] || ''),
        periode: p,
        cutoffFinal: formatTanggalJamISO_(meta.endInclusive),
        tunjanganStatus: tunj.status || '',
        tunjanganSudahDicairkan: !!tunj.sudahDicairkan,
        rpTunjanganTotal: Number(tunj.rpTotal || 0),
        rekomendasi: tunj.sudahDicairkan
          ? 'Tunjangan sudah dicairkan. Koreksi status boleh dicatat, tetapi selisih tunjangan sebaiknya diproses sebagai penyesuaian/susulan.'
          : 'Tunjangan belum/sedang diproses. Admin dapat koreksi status lalu revisi nilai jika laporan valid.'
      });
    }

    return {
      sukses: true,
      periode: p,
      cutoffFinal: formatTanggalJamISO_(meta.endInclusive),
      total: items.length,
      items: items
    };
  } catch (e) {
    return handleError('ambilAuditKoreksiCutoffLama', e, { sukses: false, pesan: '', items: [] });
  }
}

function koreksiStatusCutoffLama(ids, catatanKoreksi, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', jumlah: 0 };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', jumlah: 0 };

    ids = Array.isArray(ids) ? ids.map(function (x) { return normalizeId_(x); }).filter(Boolean) : [];
    if (!ids.length) return { sukses: false, pesan: 'Pilih minimal satu laporan untuk dikoreksi.', jumlah: 0 };

    var idSet = {};
    ids.forEach(function (x) { idSet[x] = true; });

    var sh = getSheet_('Rekap_Kinerja');
    var data = sh.getDataRange().getValues();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var updated = 0;
    var detailAudit = [];

    var catatanTambahan = String(catatanKoreksi || '').trim();
    if (!catatanTambahan) {
      catatanTambahan = 'Koreksi status karena laporan terkena logika cut-off lama/default. Poin dan penyesuaian tunjangan perlu ditinjau admin sesuai kebijakan.';
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var idLap = normalizeId_(row[C.ID_LAPORAN]);
      if (!idSet[idLap]) continue;

      var status = String(row[C.STATUS_REVIEW] || '');
      if (!isStatusDisetujuiLewatCutoffLama_(status)) continue;

      var catatanLama = String(row[C.CATATAN_ADMIN] || '');
      var catatanBersih = bersihkanCatatanCutoffLama_(catatanLama);
      var catatanBaru = (catatanBersih ? catatanBersih + '\n\n' : '') +
        '[KOREKSI CUT-OFF LAMA] ' + catatanTambahan;

      sh.getRange(i + 1, C.STATUS_REVIEW + 1).setValue(REVIEW_STATUS.DISETUJUI);
      sh.getRange(i + 1, C.CATATAN_ADMIN + 1).setValue(catatanBaru);

      // Poin final sengaja tidak diubah otomatis.
      updated++;
      detailAudit.push(idLap + '|' + (row[C.NAMA] || '') + '|poin tetap ' + (row[C.POIN_FINAL] || 0));
    }

    invalidasiCacheRekapKinerjaReadOnly_();
    logAudit(idAdmin, 'KOREKSI_STATUS_CUTOFF_LAMA', 'Jumlah: ' + updated + '. Detail: ' + detailAudit.join('; '));

    return {
      sukses: true,
      jumlah: updated,
      pesan: 'Koreksi status selesai. Jumlah laporan dinormalisasi: ' + updated + '. Poin dan tunjangan tidak diubah otomatis; lakukan Revisi Nilai/penyesuaian tunjangan bila diperlukan.'
    };
  } catch (e) {
    return handleError('koreksiStatusCutoffLama', e, { sukses: false, pesan: '', jumlah: 0 });
  }
}



// ===== PATCH v2026.05.12.25: Audit Koreksi Cut-off Lama dikunci hanya untuk Mei 2026 =====
// Pengaman tambahan agar audit/koreksi tidak menyentuh April atau periode lain.
// Fitur Audit Koreksi Cut-off Lama saat ini hanya aktif untuk periode 2026-05.

var PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225 = '2026-05';

function validasiPeriodeAuditCutoffLamaMei2026_(periode) {
  var p = normalizePeriode_(periode || '');
  if (p !== PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225) {
    return {
      sukses: false,
      periode: p,
      pesan: 'Audit Koreksi Cut-off Lama saat ini hanya diaktifkan untuk periode Mei 2026 (2026-05). Periode lain tidak akan diperiksa atau dikoreksi agar data April/periode lain tetap aman.'
    };
  }
  return { sukses: true, periode: p };
}

var ambilAuditKoreksiCutoffLama__SEBELUM_KUNCI_MEI_2026051225 = ambilAuditKoreksiCutoffLama;
ambilAuditKoreksiCutoffLama = function (periode, token) {
  var valid = validasiPeriodeAuditCutoffLamaMei2026_(periode);
  if (!valid.sukses) {
    return {
      sukses: false,
      pesan: valid.pesan,
      periode: valid.periode || '',
      cutoffFinal: '',
      total: 0,
      items: []
    };
  }
  return ambilAuditKoreksiCutoffLama__SEBELUM_KUNCI_MEI_2026051225(valid.periode, token);
};

var koreksiStatusCutoffLama__SEBELUM_KUNCI_MEI_2026051225 = koreksiStatusCutoffLama;
koreksiStatusCutoffLama = function (ids, catatanKoreksi, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', jumlah: 0 };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', jumlah: 0 };

    ids = Array.isArray(ids) ? ids.map(function (x) { return normalizeId_(x); }).filter(Boolean) : [];
    if (!ids.length) return { sukses: false, pesan: 'Pilih minimal satu laporan untuk dikoreksi.', jumlah: 0 };

    var idSet = {};
    ids.forEach(function (x) { idSet[x] = true; });

    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var metaMei = parsePeriodeBulan_(PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225);

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var idLap = normalizeId_(row[C.ID_LAPORAN]);
      if (!idSet[idLap]) continue;

      var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) {
        return { sukses: false, pesan: 'Ada laporan terpilih dengan waktu lapor tidak valid. Koreksi dibatalkan.', jumlah: 0 };
      }

      if (!(tglLap >= metaMei.start && tglLap <= metaMei.endInclusive)) {
        return {
          sukses: false,
          pesan: 'Koreksi dibatalkan. Ada laporan terpilih yang bukan periode Mei 2026. Fitur ini sengaja dikunci hanya untuk Mei 2026 agar data April/periode lain tidak tersentuh.',
          jumlah: 0
        };
      }
    }

    return koreksiStatusCutoffLama__SEBELUM_KUNCI_MEI_2026051225(ids, catatanKoreksi, token);
  } catch (e) {
    return handleError('koreksiStatusCutoffLama_v25', e, { sukses: false, pesan: '', jumlah: 0 });
  }
};



// ===== PATCH v2026.05.12.26: Audit Cut-off Lama juga wajib membaca Tanggal Pelaksanaan =====
// Pengaman tambahan dari v25:
// - Audit tetap hanya untuk Mei 2026.
// - Kandidat wajib memiliki Tanggal Pelaksanaan kegiatan dari formulir user.
// - Tanggal Pelaksanaan harus berada dalam periode Mei efektif:
//   28/04/2026 s.d. 26/05/2026.
// - Jika tanggal pelaksanaan kosong/tidak terbaca, laporan tidak masuk kandidat audit.
// - Koreksi juga memvalidasi ulang tanggal pelaksanaan sebelum menulis perubahan.

function rentangTanggalPelaksanaanAuditMei2026_() {
  return {
    start: new Date(2026, 3, 28, 0, 0, 0, 0),       // 28 April 2026
    end: new Date(2026, 4, 26, 23, 59, 59, 999),    // 26 Mei 2026
    startLabel: '28/04/2026',
    endLabel: '26/05/2026'
  };
}

function tanggalPelaksanaanAuditDariRow_(row) {
  try {
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var v = row[C.TANGGAL_KEGIATAN];
    var d = parseTanggal(v);
    if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) return d;

    // Fallback ke payload JSON lama bila kolom TANGGAL_KEGIATAN kosong.
    var raw = '';
    if (SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON !== undefined) raw = row[C.PAYLOAD_JSON];
    if ((raw === null || raw === undefined || raw === '') &&
        SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_DETAIL_JSON !== undefined) {
      raw = row[C.PAYLOAD_DETAIL_JSON];
    }
    if (raw) {
      var payload = JSON.parse(raw);
      var tgl = '';
      if (payload && payload.ringkasanUmum && payload.ringkasanUmum.tanggalKegiatan) tgl = payload.ringkasanUmum.tanggalKegiatan;
      if (!tgl && payload && payload.detailReguler) tgl = payload.detailReguler.tanggal;
      if (!tgl && payload && payload.detailTU) tgl = payload.detailTU.tanggal;
      if (!tgl && payload && payload.detailPHL) tgl = payload.detailPHL.tanggal;
      if (!tgl && payload && payload.detailDukuh) tgl = payload.detailDukuh.tanggal;
      if (!tgl && payload && payload.detailPimpinan) tgl = payload.detailPimpinan.tanggal;
      if (!tgl && payload && payload.detailStafInstruksi) tgl = payload.detailStafInstruksi.tanggal;
      if (!tgl && payload && payload.detailStafReguler) tgl = payload.detailStafReguler.tanggal;
      if (!tgl && payload && payload.detailAPBKal) tgl = payload.detailAPBKal.tanggal;
      if (!tgl && payload && payload.detailAPBKalCarik) tgl = payload.detailAPBKalCarik.tanggal;
      var dp = parseTanggal(tgl);
      if (dp instanceof Date && !isNaN(dp.getTime()) && dp.getTime() !== 0) return dp;
    }
  } catch (e) { }

  return null;
}

function isTanggalPelaksanaanMasukAuditMei2026_(row) {
  var d = tanggalPelaksanaanAuditDariRow_(row);
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    return {
      masuk: false,
      tanggal: null,
      alasan: 'Tanggal pelaksanaan kegiatan kosong/tidak terbaca.'
    };
  }

  var day = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  var r = rentangTanggalPelaksanaanAuditMei2026_();
  if (day.getTime() < r.start.getTime() || day.getTime() > r.end.getTime()) {
    return {
      masuk: false,
      tanggal: d,
      alasan: 'Tanggal pelaksanaan di luar rentang Mei 2026 efektif (' + r.startLabel + ' s.d. ' + r.endLabel + ').'
    };
  }

  return {
    masuk: true,
    tanggal: d,
    alasan: ''
  };
}

// Override audit v25: tetap Mei saja, ditambah filter tanggal pelaksanaan kegiatan.
var ambilAuditKoreksiCutoffLama__SEBELUM_TGL_PELAKSANAAN_2026051226 = ambilAuditKoreksiCutoffLama;
ambilAuditKoreksiCutoffLama = function (periode, token) {
  try {
    var valid = validasiPeriodeAuditCutoffLamaMei2026_(periode);
    if (!valid.sukses) {
      return {
        sukses: false,
        pesan: valid.pesan,
        periode: valid.periode || '',
        cutoffFinal: '',
        total: 0,
        items: []
      };
    }

    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [] };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', items: [] };

    var p = PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225;
    var meta = parsePeriodeBulan_(p);
    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var items = [];
    var dilewatiTanggal = 0;
    var dilewatiTidakTerbaca = 0;

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var status = String(row[C.STATUS_REVIEW] || '');
      if (!isStatusDisetujuiLewatCutoffLama_(status)) continue;

      var cekTglPel = isTanggalPelaksanaanMasukAuditMei2026_(row);
      if (!cekTglPel.masuk) {
        if (!cekTglPel.tanggal) dilewatiTidakTerbaca++;
        else dilewatiTanggal++;
        continue;
      }

      var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;

      // Waktu lapor tetap harus sebelum/tepat cut-off final Mei.
      if (!(tglLap >= meta.start && tglLap <= meta.endInclusive)) continue;

      var idPeg = normalizeId_(row[C.ID_USER]);
      var tunj = statusTunjanganPegawaiPeriode_(p, idPeg);
      items.push({
        rowNumber: i + 1,
        idLaporan: normalizeId_(row[C.ID_LAPORAN]),
        idUser: idPeg,
        nama: String(row[C.NAMA] || ''),
        jabatan: String(row[C.JABATAN] || ''),
        kategori: String(row[C.KATEGORI] || ''),
        deskripsi: String(row[C.DESKRIPSI] || '').substring(0, 220),
        waktuLapor: formatTanggalJamISO_(tglLap),
        tanggalPelaksanaan: formatTanggalJamISO_(cekTglPel.tanggal) || String(row[C.TANGGAL_KEGIATAN] || ''),
        statusLama: status,
        poinFinal: Number(row[C.POIN_FINAL] || 0),
        catatan: String(row[C.CATATAN_ADMIN] || ''),
        periode: p,
        cutoffFinal: formatTanggalJamISO_(meta.endInclusive),
        rentangTanggalPelaksanaan: '28/04/2026 s.d. 26/05/2026',
        tunjanganStatus: tunj.status || '',
        tunjanganSudahDicairkan: !!tunj.sudahDicairkan,
        rpTunjanganTotal: Number(tunj.rpTotal || 0),
        rekomendasi: tunj.sudahDicairkan
          ? 'Tunjangan sudah dicairkan. Koreksi status boleh dicatat, tetapi selisih tunjangan sebaiknya diproses sebagai penyesuaian/susulan.'
          : 'Tunjangan belum/sedang diproses. Admin dapat koreksi status lalu revisi nilai jika laporan valid.'
      });
    }

    return {
      sukses: true,
      periode: p,
      cutoffFinal: formatTanggalJamISO_(meta.endInclusive),
      rentangTanggalPelaksanaan: '28/04/2026 s.d. 26/05/2026',
      total: items.length,
      dilewatiTanggalPelaksanaanDiLuarRentang: dilewatiTanggal,
      dilewatiTanggalPelaksanaanTidakTerbaca: dilewatiTidakTerbaca,
      items: items
    };
  } catch (e) {
    return handleError('ambilAuditKoreksiCutoffLama_v26', e, { sukses: false, pesan: '', items: [] });
  }
};

var koreksiStatusCutoffLama__SEBELUM_TGL_PELAKSANAAN_2026051226 = koreksiStatusCutoffLama;
koreksiStatusCutoffLama = function (ids, catatanKoreksi, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', jumlah: 0 };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', jumlah: 0 };

    ids = Array.isArray(ids) ? ids.map(function (x) { return normalizeId_(x); }).filter(Boolean) : [];
    if (!ids.length) return { sukses: false, pesan: 'Pilih minimal satu laporan untuk dikoreksi.', jumlah: 0 };

    var idSet = {};
    ids.forEach(function (x) { idSet[x] = true; });

    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var idLap = normalizeId_(row[C.ID_LAPORAN]);
      if (!idSet[idLap]) continue;

      var cekTglPel = isTanggalPelaksanaanMasukAuditMei2026_(row);
      if (!cekTglPel.masuk) {
        return {
          sukses: false,
          pesan: 'Koreksi dibatalkan. Ada laporan terpilih dengan tanggal pelaksanaan yang tidak masuk rentang Mei 2026 efektif (28/04/2026 s.d. 26/05/2026) atau tidak terbaca. Laporan tersebut harus diperiksa manual.',
          jumlah: 0
        };
      }
    }

    return koreksiStatusCutoffLama__SEBELUM_TGL_PELAKSANAAN_2026051226(ids, catatanKoreksi, token);
  } catch (e) {
    return handleError('koreksiStatusCutoffLama_v26', e, { sukses: false, pesan: '', jumlah: 0 });
  }
};



// ===== PATCH v2026.05.12.27: Hitung Poin & Estimasi Tunjangan Dampak Koreksi Cut-off Lama =====
// Masalah v26: setelah status dinormalisasi dari "Disetujui - Lewat Cut-off" menjadi "Disetujui",
// kandidat tidak muncul lagi pada audit sehingga admin sulit menindaklanjuti poin/tunjangan.
// v27 menambahkan daftar tindak lanjut yang membaca:
// - laporan yang masih berstatus Disetujui - Lewat Cut-off, dan
// - laporan yang sudah pernah dikoreksi dengan catatan [KOREKSI CUT-OFF LAMA].
// Sistem menghitung saran poin berdasarkan payload/kategori yang tersimpan dan estimasi dampak tunjangan.
// Penerapan poin tetap harus diklik admin agar tercatat.

var KOREKSI_CUTOFF_LAMA_HEADERS_2026051227 = [
  'waktu',
  'id_laporan',
  'id_user',
  'nama',
  'jabatan',
  'periode',
  'tanggal_pelaksanaan',
  'waktu_lapor',
  'kategori',
  'status_saat_dicatat',
  'poin_lama',
  'poin_saran',
  'poin_diterapkan',
  'rp_estimasi_delta',
  'status_tindak_lanjut',
  'catatan',
  'oleh_id'
];

function ensureSheetKoreksiCutoffLama_() {
  var ss = getSS_();
  var sh = ss.getSheetByName('Koreksi_Cutoff_Lama');
  if (!sh) sh = ss.insertSheet('Koreksi_Cutoff_Lama');
  ensureHeaderSheet_(sh, KOREKSI_CUTOFF_LAMA_HEADERS_2026051227);
  return sh;
}

function paketUntukHitungPoinDariRowKoreksi_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var payload = {};
  try { payload = payloadRevisiDariRowRekap_(row) || {}; } catch (e) { payload = {}; }

  var paket = {};
  try {
    for (var k in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) paket[k] = payload[k];
    }
  } catch (eCopy) { }

  paket.nama = String(row[C.NAMA] || paket.nama || '');
  paket.jabatan = String(row[C.JABATAN] || paket.jabatan || '');
  paket.kategori = String(row[C.KATEGORI] || paket.kategori || '');
  paket.deskripsi = String(row[C.DESKRIPSI] || paket.deskripsi || '');

  // Fallback detail dari ringkasan lama.
  if (!paket.detailReguler && !paket.detailTU && !paket.detailPHL && !paket.detailDukuh &&
      !paket.detailPimpinan && !paket.detailAPBKal && !paket.detailAPBKalCarik &&
      !paket.detailWajibPamong && !paket.detailWajibDukuh && !paket.detailStafInstruksi && !paket.detailStafReguler) {
    paket.detailReguler = {
      namaKeg: String(row[C.NAMA_KEGIATAN] || ''),
      tanggal: row[C.TANGGAL_KEGIATAN],
      lokasi: String(row[C.LOKASI_KEGIATAN] || ''),
      pihakTerlibat: String(row[C.PENYELENGGARA] || ''),
      peranAnda: String(row[C.PERAN] || ''),
      outputRingkas: String(row[C.DESKRIPSI] || ''),
      tindakLanjut: ''
    };
  }

  return paket;
}

function hitungSaranPoinKoreksiCutoff_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var kategori = String(row[C.KATEGORI] || '');
  var jabatan = String(row[C.JABATAN] || '');
  var jLow = jabatan.toLowerCase();
  var paket = paketUntukHitungPoinDariRowKoreksi_(row);
  var hasil = kalkulasiPoinKinerja_(paket, kategori, jLow);

  var poin = Number(hasil && hasil.poin || 0);
  var alasan = String(hasil && hasil.alasan || 'Saran sistem berdasarkan aturan poin yang tersimpan.');

  if (jLow.indexOf('phl') !== -1 || jLow.indexOf('lepas') !== -1 || kategori.indexOf(KATEGORI_LAP.PHL) !== -1) {
    poin = 0;
    alasan = 'Laporan PHL: honorarium tetap, tidak dihitung sebagai poin tunjangan.';
  }

  return { poin: poin, alasan: alasan };
}

function kumpulkanPoinPegawaiPeriodeKoreksi_(periode, idUser, kecualiIdLaporan) {
  var data = getRekapKinerjaValuesReadOnly_();
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var out = { prod: 0, tu: 0, total: 0 };

  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    if (!idsEqual_(row[C.ID_USER], idUser)) continue;

    var idLap = normalizeId_(row[C.ID_LAPORAN]);
    if (kecualiIdLaporan && idsEqual_(idLap, kecualiIdLaporan)) continue;

    var status = String(row[C.STATUS_REVIEW] || '');
    if (!isStatusApproved_(status)) continue;

    var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
    var p = periodeDariTanggalLaporan_(tglLap);
    if (p !== periode) continue;

    var poin = Number(row[C.POIN_FINAL] || 0);
    var kategori = String(row[C.KATEGORI] || '');
    out.total += poin;
    if (isKategoriProduktivitas_(kategori)) out.prod += poin;
    else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) out.tu += poin;
  }

  return out;
}

function estimasiDeltaTunjanganKoreksi_(row, poinSaran) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var idUser = normalizeId_(row[C.ID_USER]);
  var jabatan = String(row[C.JABATAN] || '');
  var kategori = String(row[C.KATEGORI] || '');
  var idLap = normalizeId_(row[C.ID_LAPORAN]);
  var periode = PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225;

  var poinLama = Number(row[C.POIN_FINAL] || 0);
  var deltaPoin = Math.max(0, Number(poinSaran || 0) - poinLama);
  if (deltaPoin <= 0) return { deltaPoin: 0, deltaRp: 0, basis: 'Tidak ada selisih poin.' };

  var tunjangan = { maxProd: 0, maxTU: 0 };
  try { tunjangan = getTunjanganPegawai_(idUser, jabatan) || tunjangan; } catch (e) { }

  var poinSaatIni = kumpulkanPoinPegawaiPeriodeKoreksi_(periode, idUser, idLap);
  var deltaRp = 0;
  var basis = '';

  if (isKategoriProduktivitas_(kategori)) {
    var sebelumProd = Math.min(100, Number(poinSaatIni.prod || 0) + poinLama);
    var sesudahProd = Math.min(100, Number(poinSaatIni.prod || 0) + Number(poinSaran || 0));
    deltaRp = ((sesudahProd - sebelumProd) / 100) * (Number(tunjangan.maxProd) || 0);
    basis = 'Produktivitas: ' + sebelumProd + '% → ' + sesudahProd + '% dari plafon Rp ' + Number(tunjangan.maxProd || 0);
  } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) {
    var sebelumTU = Math.min(100, Number(poinSaatIni.tu || 0) + poinLama);
    var sesudahTU = Math.min(100, Number(poinSaatIni.tu || 0) + Number(poinSaran || 0));
    deltaRp = ((sesudahTU - sebelumTU) / 100) * (Number(tunjangan.maxTU) || 0);
    basis = 'Tugas Umum: ' + sebelumTU + '% → ' + sesudahTU + '% dari plafon Rp ' + Number(tunjangan.maxTU || 0);
  } else {
    basis = 'Kategori tidak termasuk Produktivitas/Tugas Umum untuk estimasi tunjangan.';
  }

  return { deltaPoin: deltaPoin, deltaRp: Math.round(deltaRp), basis: basis };
}

function isRowTindakLanjutKoreksiCutoff_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var status = String(row[C.STATUS_REVIEW] || '');
  var catatan = String(row[C.CATATAN_ADMIN] || '');
  if (isStatusDisetujuiLewatCutoffLama_(status)) return true;
  if (status === REVIEW_STATUS.DISETUJUI && catatan.indexOf('[KOREKSI CUT-OFF LAMA]') !== -1) return true;
  return false;
}

function ambilTindakLanjutKoreksiCutoffLama(token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [] };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', items: [] };

    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var meta = parsePeriodeBulan_(PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225);
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      if (!isRowTindakLanjutKoreksiCutoff_(row)) continue;

      var cekTglPel = isTanggalPelaksanaanMasukAuditMei2026_(row);
      if (!cekTglPel.masuk) continue;

      var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
      if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;
      if (!(tglLap >= meta.start && tglLap <= meta.endInclusive)) continue;

      var saran = hitungSaranPoinKoreksiCutoff_(row);
      var delta = estimasiDeltaTunjanganKoreksi_(row, saran.poin);
      var idPeg = normalizeId_(row[C.ID_USER]);
      var tunj = statusTunjanganPegawaiPeriode_(PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225, idPeg);

      items.push({
        rowNumber: i + 1,
        idLaporan: normalizeId_(row[C.ID_LAPORAN]),
        idUser: idPeg,
        nama: String(row[C.NAMA] || ''),
        jabatan: String(row[C.JABATAN] || ''),
        kategori: String(row[C.KATEGORI] || ''),
        deskripsi: String(row[C.DESKRIPSI] || '').substring(0, 220),
        tanggalPelaksanaan: formatTanggalJamISO_(cekTglPel.tanggal) || String(row[C.TANGGAL_KEGIATAN] || ''),
        waktuLapor: formatTanggalJamISO_(tglLap),
        status: String(row[C.STATUS_REVIEW] || ''),
        poinSaatIni: Number(row[C.POIN_FINAL] || 0),
        poinSaran: Number(saran.poin || 0),
        alasanSaran: saran.alasan || '',
        deltaPoin: Number(delta.deltaPoin || 0),
        estimasiDeltaTunjangan: Number(delta.deltaRp || 0),
        basisEstimasi: delta.basis || '',
        tunjanganStatus: tunj.status || '',
        tunjanganSudahDicairkan: !!tunj.sudahDicairkan,
        rekomendasi: tunj.sudahDicairkan
          ? 'Tunjangan sudah dicairkan. Setelah poin diterapkan, selisih Rp ' + Number(delta.deltaRp || 0).toLocaleString('id-ID') + ' sebaiknya dicatat sebagai penyesuaian/susulan.'
          : 'Tunjangan belum final. Setelah poin diterapkan, rekap tunjangan dapat dihitung ulang sesuai prosedur.'
      });
    }

    return {
      sukses: true,
      periode: PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225,
      total: items.length,
      items: items
    };
  } catch (e) {
    return handleError('ambilTindakLanjutKoreksiCutoffLama', e, { sukses: false, pesan: '', items: [] });
  }
}

function terapkanPoinKoreksiCutoffLama(ids, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', jumlah: 0 };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', jumlah: 0 };

    ids = Array.isArray(ids) ? ids.map(function (x) { return normalizeId_(x); }).filter(Boolean) : [];
    if (!ids.length) return { sukses: false, pesan: 'Pilih minimal satu laporan.', jumlah: 0 };

    var idSet = {};
    ids.forEach(function (x) { idSet[x] = true; });

    var sh = getSheet_('Rekap_Kinerja');
    var data = sh.getDataRange().getValues();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var updated = 0;
    var totalDeltaRp = 0;
    var audit = [];

    var sheetLog = ensureSheetKoreksiCutoffLama_();

    for (var i = 1; i < data.length; i++) {
      var row = data[i] || [];
      var idLap = normalizeId_(row[C.ID_LAPORAN]);
      if (!idSet[idLap]) continue;
      if (!isRowTindakLanjutKoreksiCutoff_(row)) continue;

      var cekTglPel = isTanggalPelaksanaanMasukAuditMei2026_(row);
      if (!cekTglPel.masuk) continue;

      var saran = hitungSaranPoinKoreksiCutoff_(row);
      var poinLama = Number(row[C.POIN_FINAL] || 0);
      var poinBaru = Number(saran.poin || 0);
      var delta = estimasiDeltaTunjanganKoreksi_(row, poinBaru);
      var catatanLama = String(row[C.CATATAN_ADMIN] || '');
      var catatanBaru = catatanLama + '\n\n[KOREKSI POIN CUT-OFF LAMA] Poin diterapkan sistem dari ' + poinLama + ' menjadi ' + poinBaru + '. ' + (saran.alasan || '');

      sh.getRange(i + 1, C.STATUS_REVIEW + 1).setValue(REVIEW_STATUS.DISETUJUI);
      sh.getRange(i + 1, C.POIN_FINAL + 1).setValue(poinBaru);
      sh.getRange(i + 1, C.CATATAN_ADMIN + 1).setValue(catatanBaru);

      var idPeg = normalizeId_(row[C.ID_USER]);
      var tunj = statusTunjanganPegawaiPeriode_(PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225, idPeg);

      sheetLog.appendRow([
        new Date(),
        idLap,
        idPeg,
        row[C.NAMA] || '',
        row[C.JABATAN] || '',
        PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225,
        cekTglPel.tanggal || '',
        row[C.TANGGAL_LAPORAN] || '',
        row[C.KATEGORI] || '',
        row[C.STATUS_REVIEW] || '',
        poinLama,
        poinBaru,
        poinBaru,
        Number(delta.deltaRp || 0),
        tunj.sudahDicairkan ? 'PERLU_PENYESUAIAN_TUNJANGAN' : 'POIN_DITERAPKAN',
        (saran.alasan || '') + ' | ' + (delta.basis || ''),
        idAdmin
      ]);

      updated++;
      totalDeltaRp += Number(delta.deltaRp || 0);
      audit.push(idLap + ': ' + poinLama + '->' + poinBaru + ', deltaRp=' + Number(delta.deltaRp || 0));
    }

    if (updated) invalidasiCacheRekapKinerjaReadOnly_();
    logAudit(idAdmin, 'TERAPKAN_POIN_KOREKSI_CUTOFF_LAMA', 'Jumlah: ' + updated + ' | Estimasi delta Rp: ' + totalDeltaRp + ' | ' + audit.join('; '));

    return {
      sukses: true,
      jumlah: updated,
      estimasiDeltaTunjangan: Math.round(totalDeltaRp),
      pesan: 'Poin koreksi diterapkan untuk ' + updated + ' laporan. Estimasi total dampak tunjangan: Rp ' + Math.round(totalDeltaRp).toLocaleString('id-ID') + '. Rekap tunjangan/pencairan tidak diubah otomatis.'
    };
  } catch (e) {
    return handleError('terapkanPoinKoreksiCutoffLama', e, { sukses: false, pesan: '', jumlah: 0 });
  }
}



// ===== PATCH v2026.05.12.28: Optimasi Tindak Lanjut Koreksi Cut-off Lama =====
// Masalah v27: fungsi tindak lanjut memindai Rekap_Kinerja berulang untuk setiap kandidat,
// sehingga Apps Script dapat gagal dengan pesan "Melebihi jumlah eksekusi maksimum".
// v28:
// - Membaca Rekap_Kinerja satu kali.
// - Membuat index poin per pegawai untuk periode Mei.
// - Membuat cache tunjangan per pegawai.
// - Membatasi kandidat yang dihitung per eksekusi.
// - Mendukung offset/limit agar UI bisa memuat bertahap.
// - Rekap_Tunjangan_Bulanan tetap tidak diubah otomatis.

var KOREKSI_CUTOFF_V28_LIMIT_DEFAULT = 25;
var KOREKSI_CUTOFF_V28_LIMIT_MAX = 50;

function getTunjanganPegawaiCachedKoreksi_(cache, idUser, jabatan) {
  var key = normalizeId_(idUser) || String(jabatan || '');
  if (!cache[key]) {
    var t = { maxProd: 0, maxTU: 0 };
    try { t = getTunjanganPegawai_(idUser, jabatan) || t; } catch (e) { }
    cache[key] = {
      maxProd: Number(t.maxProd || 0),
      maxTU: Number(t.maxTU || 0)
    };
  }
  return cache[key];
}

function buildTunjanganStatusMapKoreksi_(periode) {
  var map = {};
  try {
    var sh = getSheet_('Rekap_Tunjangan_Bulanan');
    var values = sh.getDataRange().getValues();
    if (!values.length) return map;

    var h = {};
    var headers = values[0] || [];
    headers.forEach(function (x, i) { h[String(x || '').trim()] = i; });

    var iPeriode = h.periode !== undefined ? h.periode : 0;
    var iId = h.id_user !== undefined ? h.id_user : 1;
    var iStatus = h.status_rekap !== undefined ? h.status_rekap : 15;
    var iRp = h.rp_total !== undefined ? h.rp_total : 14;

    for (var r = 1; r < values.length; r++) {
      if (String(values[r][iPeriode] || '').replace(/^'/, '').trim() !== String(periode || '').trim()) continue;
      var id = normalizeId_(values[r][iId]);
      if (!id) continue;
      map[id] = {
        ada: true,
        status: String(values[r][iStatus] || ''),
        rpTotal: Number(values[r][iRp] || 0),
        sudahDicairkan: String(values[r][iStatus] || '') === TUNJANGAN_STATUS.SUDAH_DICAIRKAN
      };
    }
  } catch (e) { }
  return map;
}

function isApprovedMasukPeriodeKoreksiV28_(row, periode) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var status = String(row[C.STATUS_REVIEW] || '');
  if (!isStatusApproved_(status)) return false;

  var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
  if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) return false;

  return periodeDariTanggalLaporan_(tglLap) === periode;
}

function hitungDeltaTunjanganDariIndexKoreksi_(row, poinSaran, poinIndex, tunjCache) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var idUser = normalizeId_(row[C.ID_USER]);
  var jabatan = String(row[C.JABATAN] || '');
  var kategori = String(row[C.KATEGORI] || '');
  var poinLama = Number(row[C.POIN_FINAL] || 0);
  var poinBaru = Number(poinSaran || 0);
  var deltaPoin = Math.max(0, poinBaru - poinLama);
  if (deltaPoin <= 0) return { deltaPoin: 0, deltaRp: 0, basis: 'Tidak ada selisih poin.' };

  var idx = poinIndex[idUser] || { prod: 0, tu: 0 };
  var tunjangan = getTunjanganPegawaiCachedKoreksi_(tunjCache, idUser, jabatan);
  var deltaRp = 0;
  var basis = '';

  if (isKategoriProduktivitas_(kategori)) {
    var sebelumProd = Math.min(100, Number(idx.prod || 0));
    var sesudahProd = Math.min(100, Math.max(0, Number(idx.prod || 0) - poinLama + poinBaru));
    deltaRp = ((sesudahProd - sebelumProd) / 100) * (Number(tunjangan.maxProd) || 0);
    basis = 'Produktivitas: ' + sebelumProd + '% -> ' + sesudahProd + '% dari plafon Rp ' + Number(tunjangan.maxProd || 0);
  } else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) {
    var sebelumTU = Math.min(100, Number(idx.tu || 0));
    var sesudahTU = Math.min(100, Math.max(0, Number(idx.tu || 0) - poinLama + poinBaru));
    deltaRp = ((sesudahTU - sebelumTU) / 100) * (Number(tunjangan.maxTU) || 0);
    basis = 'Tugas Umum: ' + sebelumTU + '% -> ' + sesudahTU + '% dari plafon Rp ' + Number(tunjangan.maxTU || 0);
  } else {
    basis = 'Kategori tidak termasuk Produktivitas/Tugas Umum untuk estimasi tunjangan.';
  }

  return { deltaPoin: deltaPoin, deltaRp: Math.round(deltaRp), basis: basis };
}

function buildIndexKoreksiCutoffV28_(data, periode) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var poinIndex = {};
  var candidates = [];
  var meta = parsePeriodeBulan_(periode);

  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    var idUser = normalizeId_(row[C.ID_USER]);
    if (!idUser) continue;

    if (isApprovedMasukPeriodeKoreksiV28_(row, periode)) {
      if (!poinIndex[idUser]) poinIndex[idUser] = { prod: 0, tu: 0, total: 0 };
      var kategori = String(row[C.KATEGORI] || '');
      var poin = Number(row[C.POIN_FINAL] || 0);
      poinIndex[idUser].total += poin;
      if (isKategoriProduktivitas_(kategori)) poinIndex[idUser].prod += poin;
      else if (kategori.indexOf(KATEGORI_LAP.TU) !== -1) poinIndex[idUser].tu += poin;
    }

    if (!isRowTindakLanjutKoreksiCutoff_(row)) continue;

    var cekTglPel = isTanggalPelaksanaanMasukAuditMei2026_(row);
    if (!cekTglPel.masuk) continue;

    var tglLap = parseTanggal(row[C.TANGGAL_LAPORAN]);
    if (!(tglLap instanceof Date) || isNaN(tglLap.getTime())) continue;
    if (!(tglLap >= meta.start && tglLap <= meta.endInclusive)) continue;

    candidates.push({
      rowIndex: i,
      row: row,
      tanggalPelaksanaan: cekTglPel.tanggal,
      waktuLapor: tglLap
    });
  }

  return {
    poinIndex: poinIndex,
    candidates: candidates
  };
}

var ambilTindakLanjutKoreksiCutoffLama__V27_SEBELUM_OPTIMASI_2026051228 = ambilTindakLanjutKoreksiCutoffLama;
ambilTindakLanjutKoreksiCutoffLama = function (token, offset, limit) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [] };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', items: [] };

    var periode = PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225;
    offset = Math.max(0, parseInt(offset, 10) || 0);
    limit = Math.max(1, parseInt(limit, 10) || KOREKSI_CUTOFF_V28_LIMIT_DEFAULT);
    limit = Math.min(limit, KOREKSI_CUTOFF_V28_LIMIT_MAX);

    var data = getRekapKinerjaValuesReadOnly_();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var built = buildIndexKoreksiCutoffV28_(data, periode);
    var candidates = built.candidates || [];
    var page = candidates.slice(offset, offset + limit);
    var tunjStatusMap = buildTunjanganStatusMapKoreksi_(periode);
    var tunjCache = {};
    var items = [];

    for (var i = 0; i < page.length; i++) {
      var obj = page[i];
      var row = obj.row;
      var idPeg = normalizeId_(row[C.ID_USER]);
      var saran = hitungSaranPoinKoreksiCutoff_(row);
      var delta = hitungDeltaTunjanganDariIndexKoreksi_(row, saran.poin, built.poinIndex, tunjCache);
      var tunj = tunjStatusMap[idPeg] || { ada: false, status: '', rpTotal: 0, sudahDicairkan: false };

      items.push({
        rowNumber: obj.rowIndex + 1,
        idLaporan: normalizeId_(row[C.ID_LAPORAN]),
        idUser: idPeg,
        nama: String(row[C.NAMA] || ''),
        jabatan: String(row[C.JABATAN] || ''),
        kategori: String(row[C.KATEGORI] || ''),
        deskripsi: String(row[C.DESKRIPSI] || '').substring(0, 220),
        tanggalPelaksanaan: formatTanggalJamISO_(obj.tanggalPelaksanaan) || String(row[C.TANGGAL_KEGIATAN] || ''),
        waktuLapor: formatTanggalJamISO_(obj.waktuLapor),
        status: String(row[C.STATUS_REVIEW] || ''),
        poinSaatIni: Number(row[C.POIN_FINAL] || 0),
        poinSaran: Number(saran.poin || 0),
        alasanSaran: saran.alasan || '',
        deltaPoin: Number(delta.deltaPoin || 0),
        estimasiDeltaTunjangan: Number(delta.deltaRp || 0),
        basisEstimasi: delta.basis || '',
        tunjanganStatus: tunj.status || '',
        tunjanganSudahDicairkan: !!tunj.sudahDicairkan,
        rekomendasi: tunj.sudahDicairkan
          ? 'Tunjangan sudah dicairkan. Setelah poin diterapkan, selisih Rp ' + Number(delta.deltaRp || 0).toLocaleString('id-ID') + ' sebaiknya dicatat sebagai penyesuaian/susulan.'
          : 'Tunjangan belum final. Setelah poin diterapkan, rekap tunjangan dapat dihitung ulang sesuai prosedur.'
      });
    }

    return {
      sukses: true,
      periode: periode,
      total: candidates.length,
      offset: offset,
      limit: limit,
      nextOffset: offset + items.length,
      hasMore: (offset + items.length) < candidates.length,
      items: items
    };
  } catch (e) {
    return handleError('ambilTindakLanjutKoreksiCutoffLama_v28', e, { sukses: false, pesan: '', items: [] });
  }
};

var terapkanPoinKoreksiCutoffLama__V27_SEBELUM_OPTIMASI_2026051228 = terapkanPoinKoreksiCutoffLama;
terapkanPoinKoreksiCutoffLama = function (ids, token) {
  try {
    var idAdmin = validasiSession(token);
    if (!idAdmin) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', jumlah: 0 };
    if (!cekHakAksesLurahCarikAdmin_(idAdmin)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', jumlah: 0 };

    ids = Array.isArray(ids) ? ids.map(function (x) { return normalizeId_(x); }).filter(Boolean) : [];
    if (!ids.length) return { sukses: false, pesan: 'Pilih minimal satu laporan.', jumlah: 0 };
    if (ids.length > 25) return { sukses: false, pesan: 'Maksimal 25 laporan dapat diterapkan dalam satu kali proses. Pilih sebagian dulu.', jumlah: 0 };

    var idSet = {};
    ids.forEach(function (x) { idSet[x] = true; });

    var sh = getSheet_('Rekap_Kinerja');
    var data = sh.getDataRange().getValues();
    var C = SHEET_COLUMNS.REKAP_KINERJA;
    var periode = PERIODE_AUDIT_CUTOFF_LAMA_DIIJINKAN_2026051225;
    var built = buildIndexKoreksiCutoffV28_(data, periode);
    var tunjStatusMap = buildTunjanganStatusMapKoreksi_(periode);
    var tunjCache = {};
    var sheetLog = ensureSheetKoreksiCutoffLama_();

    var updated = 0;
    var totalDeltaRp = 0;
    var audit = [];

    for (var i = 0; i < built.candidates.length; i++) {
      var obj = built.candidates[i];
      var row = obj.row;
      var idLap = normalizeId_(row[C.ID_LAPORAN]);
      if (!idSet[idLap]) continue;

      var saran = hitungSaranPoinKoreksiCutoff_(row);
      var poinLama = Number(row[C.POIN_FINAL] || 0);
      var poinBaru = Number(saran.poin || 0);
      var delta = hitungDeltaTunjanganDariIndexKoreksi_(row, poinBaru, built.poinIndex, tunjCache);
      var catatanLama = String(row[C.CATATAN_ADMIN] || '');
      var catatanBaru = catatanLama + '\n\n[KOREKSI POIN CUT-OFF LAMA] Poin diterapkan sistem dari ' + poinLama + ' menjadi ' + poinBaru + '. ' + (saran.alasan || '');

      sh.getRange(obj.rowIndex + 1, C.STATUS_REVIEW + 1).setValue(REVIEW_STATUS.DISETUJUI);
      sh.getRange(obj.rowIndex + 1, C.POIN_FINAL + 1).setValue(poinBaru);
      sh.getRange(obj.rowIndex + 1, C.CATATAN_ADMIN + 1).setValue(catatanBaru);

      var idPeg = normalizeId_(row[C.ID_USER]);
      var tunj = tunjStatusMap[idPeg] || { sudahDicairkan: false };

      sheetLog.appendRow([
        new Date(),
        idLap,
        idPeg,
        row[C.NAMA] || '',
        row[C.JABATAN] || '',
        periode,
        obj.tanggalPelaksanaan || '',
        row[C.TANGGAL_LAPORAN] || '',
        row[C.KATEGORI] || '',
        row[C.STATUS_REVIEW] || '',
        poinLama,
        poinBaru,
        poinBaru,
        Number(delta.deltaRp || 0),
        tunj.sudahDicairkan ? 'PERLU_PENYESUAIAN_TUNJANGAN' : 'POIN_DITERAPKAN',
        (saran.alasan || '') + ' | ' + (delta.basis || ''),
        idAdmin
      ]);

      updated++;
      totalDeltaRp += Number(delta.deltaRp || 0);
      audit.push(idLap + ': ' + poinLama + '->' + poinBaru + ', deltaRp=' + Number(delta.deltaRp || 0));
    }

    if (updated) invalidasiCacheRekapKinerjaReadOnly_();
    logAudit(idAdmin, 'TERAPKAN_POIN_KOREKSI_CUTOFF_LAMA_V28', 'Jumlah: ' + updated + ' | Estimasi delta Rp: ' + totalDeltaRp + ' | ' + audit.join('; '));

    return {
      sukses: true,
      jumlah: updated,
      estimasiDeltaTunjangan: Math.round(totalDeltaRp),
      pesan: 'Poin koreksi diterapkan untuk ' + updated + ' laporan. Estimasi total dampak tunjangan: Rp ' + Math.round(totalDeltaRp).toLocaleString('id-ID') + '. Rekap tunjangan/pencairan tidak diubah otomatis.'
    };
  } catch (e) {
    return handleError('terapkanPoinKoreksiCutoffLama_v28', e, { sukses: false, pesan: '', jumlah: 0 });
  }
};



// ===== PATCH v2026.05.12.29: Matikan Cut-off Default/Lama sebagai Dasar Hukuman =====
// Kebijakan final:
// - Tidak ada lagi cut-off default/lama sebagai dasar status "Lewat Cut-off", poin 0, atau penolakan.
// - Cut-off yang sah untuk membatasi input hanya berasal dari konfigurasi admin yang tersimpan.
// - Review admin tidak lagi otomatis mengubah laporan disetujui menjadi "Disetujui - Lewat Cut-off" dan tidak otomatis menjadikan poin 0.
// - Fungsi koreksi massal cut-off lama dimatikan agar tidak bisa dipakai ulang tanpa sadar.
// - Fitur Audit/Tindak Lanjut Koreksi Cut-off Lama tetap dipertahankan untuk membereskan data historis Mei 2026.

function cutoffPropertyExistsAdminOnly_(periode) {
  try {
    var p = normalizePeriode_(periode);
    return !!PropertiesService.getScriptProperties().getProperty(cutoffPropertyKeyTunjangan_(p));
  } catch (e) {
    return false;
  }
}

function ambilCutoffTunjanganPeriodeTersimpanSaja_(periode) {
  var p = normalizePeriode_(periode);
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(cutoffPropertyKeyTunjangan_(p));
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (!obj || !obj.tanggalMulaiPeriode || !obj.tanggalAkhirPeriode) return null;
    return buildDateRangeMeta_(p, obj.tanggalMulaiPeriode, obj.tanggalAkhirPeriode, obj.jamCutoff || '23:59:59');
  } catch (e) {
    Logger.log('Gagal membaca cut-off admin-only periode ' + periode + ': ' + (e && e.message ? e.message : e));
    return null;
  }
}

// Override daftar meta cut-off: hanya properti yang benar-benar tersimpan oleh admin.
// Tidak lagi menyisipkan hard-code April 2026 atau default tanggal 25/26.
function metaCutoffTunjanganTersimpan_() {
  var metas = [];
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (key.indexOf('TUNJANGAN_CUTOFF_META_') !== 0) continue;
      try {
        var obj = JSON.parse(props[key] || '{}');
        if (!obj || !obj.periode) continue;
        var meta = ambilCutoffTunjanganPeriodeTersimpanSaja_(obj.periode);
        if (meta) metas.push(meta);
      } catch (inner) {
        Logger.log('Gagal parsing meta cut-off admin-only ' + key + ': ' + (inner && inner.message ? inner.message : inner));
      }
    }
  } catch (e) {
    Logger.log('Gagal membaca daftar meta cut-off admin-only: ' + (e && e.message ? e.message : e));
  }
  return metas;
}

// Override kandidat meta untuk review: hanya meta admin tersimpan, bukan default.
// Namun evaluasi review di bawah tetap tidak memberi hukuman nilai/poin.
function kandidatMetaCutoffUntukTanggalReview_(tanggalObj) {
  var d = tanggalObj instanceof Date ? tanggalObj : parseTanggal(tanggalObj);
  if (!(d instanceof Date) || isNaN(d.getTime())) return [];

  var hasil = [];
  var seen = {};
  var tersimpan = metaCutoffTunjanganTersimpan_();

  function periodeDariMeta_(meta) {
    if (!meta) return '';
    if (meta.periode) return normalizePeriode_(meta.periode);
    if (meta.tanggalAkhirPeriode) return String(meta.tanggalAkhirPeriode).slice(0, 7);
    if (meta.endInclusive instanceof Date && !isNaN(meta.endInclusive.getTime())) {
      return Utilities.formatDate(meta.endInclusive, 'GMT+7', 'yyyy-MM');
    }
    return '';
  }

  for (var i = 0; i < tersimpan.length; i++) {
    var m = tersimpan[i];
    if (!m || !(m.endInclusive instanceof Date) || isNaN(m.endInclusive.getTime())) continue;
    var diffHari = Math.abs(d.getTime() - m.endInclusive.getTime()) / (24 * 60 * 60 * 1000);
    if (diffHari > 35) continue;
    var p = periodeDariMeta_(m);
    var key = p + '|' + m.endInclusive.getTime();
    if (seen[key]) continue;
    seen[key] = true;
    hasil.push({ periode: p, meta: m, sumber: 'admin_tersimpan' });
  }

  return hasil;
}

// Override final: evaluasi cut-off waktu lapor tidak pernah menjadi dasar hukuman status/poin.
// Informasi periode tetap dikembalikan untuk tampilan saja.
function evaluasiCutoffLaporan_(tanggalLaporan) {
  var d = parseTanggal(tanggalLaporan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    return { valid: false, lewatCutoff: false, periode: '', periodeEfektif: '', meta: null, tanggalLaporan: null, bukaKembali: null };
  }

  var p = periodeDariTanggalLaporan_(d) || Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
  var meta = ambilCutoffTunjanganPeriodeTersimpanSaja_(p);

  return {
    valid: true,
    lewatCutoff: false,
    periode: p,
    periodeEfektif: p,
    meta: meta,
    tanggalLaporan: d,
    bukaKembali: meta ? tanggalBukaKembaliCutoff_(meta) : null,
    sumber: meta ? 'admin_tersimpan_non_punitif' : 'tanpa_cutoff_admin'
  };
}

// Override final: tanggal pelaksanaan yang berada pada periode tertutup tidak otomatis membuat poin 0 di Review Admin.
// Penutupan periode cukup digunakan untuk menolak input baru/revisi lewat mekanisme Tutup Periode Laporan, bukan menghukum laporan yang sudah masuk.
function evaluasiPeriodePelaksanaanReviewAdmin_(tanggalPelaksanaan, tanggalLaporan) {
  var tPelaksanaan = parseTanggal(tanggalPelaksanaan);
  var tLapor = parseTanggal(tanggalLaporan);
  var periode = '';
  if (tPelaksanaan instanceof Date && !isNaN(tPelaksanaan.getTime()) && tPelaksanaan.getTime() !== 0) {
    periode = periodeDariTanggalLaporan_(tPelaksanaan) || Utilities.formatDate(tPelaksanaan, 'GMT+7', 'yyyy-MM');
  }
  return {
    valid: !!periode,
    periodeDitutup: false,
    periode: periode,
    labelPeriode: periode ? labelPembayaranPeriode_(periode) : '',
    tanggalPelaksanaan: (tPelaksanaan instanceof Date && !isNaN(tPelaksanaan.getTime())) ? tPelaksanaan : null,
    tanggalLaporan: (tLapor instanceof Date && !isNaN(tLapor.getTime())) ? tLapor : null,
    meta: periode ? ambilCutoffTunjanganPeriodeTersimpanSaja_(periode) : null,
    cutoffLabel: '',
    pesan: ''
  };
}

function catatanPeriodePelaksanaanDitutup_(hasilEvaluasi) {
  return '';
}

function gabungCatatanPeriodePelaksanaanDitutup_(catatanLama, hasilEvaluasi) {
  return (catatanLama || '').toString();
}

// Override final: status lama "Lewat Cut-off" tidak dibuat lagi.
function statusReviewLewatCutoff_() {
  return REVIEW_STATUS.DISETUJUI;
}

// Tetap kenali status lama hanya untuk tampilan/audit historis? Tidak untuk logika hukuman.
// Karena fitur Audit Koreksi Cut-off Lama memakai isStatusDisetujuiLewatCutoffLama_ tersendiri.
function isStatusLewatCutoff_(status) {
  return false;
}

function catatanLewatCutoff_(meta) {
  return '';
}

function gabungCatatanCutoff_(catatanLama, meta) {
  return (catatanLama || '').toString();
}

// Matikan fungsi koreksi massal lama yang pernah mengubah status menjadi Lewat Cut-off dan poin 0.
function koreksiLaporanLewatCutoffPeriode_(periode, tanggalMulai, tanggalAkhir, jamCutoff) {
  return {
    sukses: false,
    pesan: 'Fungsi koreksi cut-off lama/default sudah dinonaktifkan pada v2026.05.12.29. Gunakan Pengaturan Tutup Periode Laporan untuk input baru, dan Audit Koreksi Cut-off Lama hanya untuk perbaikan historis.',
    periode: normalizePeriode_(periode || ''),
    dinonaktifkan: true
  };
}

function koreksiLaporanLewatCutoffApril2026() {
  return {
    sukses: false,
    pesan: 'Koreksi cut-off April 2026 model lama sudah dinonaktifkan pada v2026.05.12.29.',
    dinonaktifkan: true
  };
}

function koreksiLaporanBlackoutCutoffApril2026_() {
  return {
    sukses: false,
    pesan: 'Koreksi blackout cut-off April 2026 model lama sudah dinonaktifkan pada v2026.05.12.29.',
    dinonaktifkan: true
  };
}

function koreksiLaporanBlackoutCutoffApril2026() {
  return koreksiLaporanBlackoutCutoffApril2026_();
}

// Status input cut-off tetap boleh menutup form, tetapi hanya jika ada meta cut-off admin tersimpan.
// Tidak ada meta default/hard-code.
function statusInputLaporanCutoffSaatIni_() {
  var now = new Date();
  var metas = metaCutoffTunjanganTersimpan_();

  for (var i = 0; i < metas.length; i++) {
    var meta = metas[i];
    if (!meta) continue;
    if (isTanggalDalamJedaCutoff_(now, meta)) {
      var buka = tanggalBukaKembaliCutoff_(meta);
      var label = meta.labelPembayaran || 'periode berjalan';
      var mulai = formatTanggalJamClient_(meta.endInclusive);
      var kembali = buka ? formatTanggalJamClient_(buka) : '-';
      return {
        sukses: true,
        ditutup: true,
        labelPembayaran: label,
        mulaiCutoff: mulai,
        bukaKembali: kembali,
        sumber: 'admin_tersimpan',
        pesan: 'Input laporan ditutup berdasarkan cut-off yang telah dikonfigurasi admin.\n' +
          'Cut-off dimulai: ' + mulai + '\n' +
          'Input dibuka kembali: ' + kembali + '\n\n' +
          'Tidak ada cut-off default/lama yang digunakan.'
      };
    }
  }

  return {
    sukses: true,
    ditutup: false,
    sumber: 'tanpa_default',
    pesan: 'Input laporan sedang dibuka. Tidak ada cut-off default/lama yang digunakan.'
  };
}

function cekCutoffDefaultLamaDinonaktifkan(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.' };

    var metas = metaCutoffTunjanganTersimpan_();
    return {
      sukses: true,
      pesan: 'Cut-off default/lama sudah dinonaktifkan sebagai dasar hukuman status/poin. Meta aktif hanya berasal dari konfigurasi admin.',
      jumlahMetaAdminTersimpan: metas.length,
      statusReviewLewatCutoff: statusReviewLewatCutoff_(),
      isStatusLewatCutoffAktif: isStatusLewatCutoff_('Disetujui - Lewat Cut-off'),
      koreksiMassalLamaDinonaktifkan: true
    };
  } catch (e) {
    return handleError('cekCutoffDefaultLamaDinonaktifkan', e, { sukses: false, pesan: '' });
  }
}


// ===== PATCH v2026.05.12.30: Dropdown Alat Administrasi Admin Kinerja =====
// Panel admin administratif dirapikan ke dalam accordion di Index.html.



// ===== PATCH v2026.05.12.31: Tutup Periode Laporan berdasarkan Tanggal Pelaksanaan =====
// Bug yang diperbaiki:
// Form laporan baru dengan tanggal pelaksanaan 29/05/2026 masih ditolak oleh penutupan Mei 2026,
// karena validasi lama menentukan periode dari bulan kalender tanggal pelaksanaan/waktu submit.
// Kebijakan baru:
// - Validasi Tutup Periode Laporan untuk input baru memakai tanggal pelaksanaan kegiatan.
// - Periode tertutup berlaku sebagai rentang tanggal kegiatan:
//   start = sehari setelah cut-off periode sebelumnya,
//   end   = tanggal cut-off periode tersebut.
// - Contoh:
//   April ditutup 27/04/2026 -> rentang April: 01/04/2026 s.d. 27/04/2026.
//   Mei ditutup 26/05/2026   -> rentang Mei: 28/04/2026 s.d. 26/05/2026.
//   Tanggal pelaksanaan 29/05/2026 tidak diblokir oleh penutupan Mei.
// - Jika laporan berupa laporan wajib bulanan dan tidak memiliki tanggal pelaksanaan tunggal,
//   sistem tetap memakai periode bulan laporan seperti sebelumnya.

function tanggalPelaksanaanDariPaketSubmitV31_(paket) {
  paket = paket || {};
  var candidates = [
    paket.tanggalKegiatan,
    paket.tanggal,
    paket.detailAPBKal && paket.detailAPBKal.tanggal,
    paket.detailAPBKalCarik && paket.detailAPBKalCarik.tanggal,
    paket.detailReguler && paket.detailReguler.tanggal,
    paket.detailDukuh && paket.detailDukuh.tanggal,
    paket.detailTU && paket.detailTU.tanggal,
    paket.detailPHL && paket.detailPHL.tanggal,
    paket.detailPimpinan && paket.detailPimpinan.tanggal,
    paket.detailStafInstruksi && paket.detailStafInstruksi.tanggal,
    paket.detailStafReguler && paket.detailStafReguler.tanggal
  ];

  for (var i = 0; i < candidates.length; i++) {
    var d = parseTanggal(candidates[i]);
    if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    }
  }

  return null;
}

function semuaTutupPeriodeLaporanTersimpanV31_() {
  var locks = [];
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (key.indexOf('TUTUP_PERIODE_LAPORAN_') !== 0) continue;
      try {
        var obj = JSON.parse(props[key] || '{}');
        var p = normalizePeriode_(obj.periode || key.replace('TUTUP_PERIODE_LAPORAN_', ''));
        if (!p) continue;
        var cutoff = parseTanggal(obj.tanggalTutup || obj.cutoffAt || '');
        if (!(cutoff instanceof Date) || isNaN(cutoff.getTime())) continue;
        if (String(obj.status || 'DITUTUP') !== 'DITUTUP') continue;

        locks.push({
          periode: p,
          labelPeriode: obj.labelPeriode || labelPembayaranPeriode_(p),
          cutoffDate: cutoff,
          cutoffDay: new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate(), 23, 59, 59, 999),
          status: 'DITUTUP',
          alasan: obj.alasan || '',
          updatedAt: obj.updatedAt || '',
          updatedBy: obj.updatedBy || ''
        });
      } catch (inner) {
        Logger.log('Gagal parsing tutup periode laporan v31 ' + key + ': ' + (inner && inner.message ? inner.message : inner));
      }
    }
  } catch (e) {
    Logger.log('Gagal membaca tutup periode laporan v31: ' + (e && e.message ? e.message : e));
  }

  locks.sort(function (a, b) {
    return a.cutoffDay.getTime() - b.cutoffDay.getTime();
  });

  for (var i = 0; i < locks.length; i++) {
    var start;
    if (i > 0) {
      var prev = locks[i - 1].cutoffDay;
      start = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1, 0, 0, 0, 0);
    } else {
      // Untuk lock pertama yang tersimpan, start aman adalah tanggal 1 pada bulan cutoff.
      // Contoh April 2026 -> 01/04/2026.
      start = new Date(locks[i].cutoffDay.getFullYear(), locks[i].cutoffDay.getMonth(), 1, 0, 0, 0, 0);
    }

    locks[i].rangeStart = start;
    locks[i].rangeEnd = locks[i].cutoffDay;
    locks[i].rangeLabel = Utilities.formatDate(start, 'GMT+7', 'dd/MM/yyyy') + ' s.d. ' +
      Utilities.formatDate(locks[i].cutoffDay, 'GMT+7', 'dd/MM/yyyy');
  }

  return locks;
}

function cariLockTutupPeriodeUntukTanggalPelaksanaanV31_(tanggalPelaksanaan) {
  var d = tanggalPelaksanaan instanceof Date ? tanggalPelaksanaan : parseTanggal(tanggalPelaksanaan);
  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) return null;

  var day = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  var locks = semuaTutupPeriodeLaporanTersimpanV31_();

  for (var i = 0; i < locks.length; i++) {
    var lock = locks[i];
    if (day.getTime() >= lock.rangeStart.getTime() && day.getTime() <= lock.rangeEnd.getTime()) {
      return lock;
    }
  }

  return null;
}

function bulanLaporanWajibDariPaketSubmitV31_(paket) {
  paket = paket || {};
  function normMonth_(value) {
    var s = String(value || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    var d = parseTanggal(s);
    if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0) {
      return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM');
    }
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2];
    return '';
  }

  if (paket.detailWajibPamong && paket.detailWajibPamong.bulan) return normMonth_(paket.detailWajibPamong.bulan);
  if (paket.detailWajibDukuh && paket.detailWajibDukuh.bulan) return normMonth_(paket.detailWajibDukuh.bulan);
  return '';
}

// Override validasi tutup periode input baru.
var validasiTutupPeriodeLaporanBaru__SEBELUM_TGL_PELAKSANAAN_2026051231 = validasiTutupPeriodeLaporanBaru_;
validasiTutupPeriodeLaporanBaru_ = function (paket) {
  paket = paket || {};

  // Revisi laporan ditolak bukan input laporan baru.
  if (paket.idLaporanRevisi) {
    return { sukses: true, periode: '', pesan: '' };
  }

  var tglPelaksanaan = tanggalPelaksanaanDariPaketSubmitV31_(paket);
  if (tglPelaksanaan) {
    var lockByTanggal = cariLockTutupPeriodeUntukTanggalPelaksanaanV31_(tglPelaksanaan);
    if (!lockByTanggal) {
      // Tanggal pelaksanaan tidak berada pada rentang periode tertutup mana pun.
      return {
        sukses: true,
        periode: '',
        pesan: '',
        tanggalPelaksanaan: tglPelaksanaan
      };
    }

    var now = new Date();
    if (now.getTime() <= lockByTanggal.cutoffDate.getTime()) {
      return {
        sukses: true,
        periode: lockByTanggal.periode,
        pesan: '',
        tanggalPelaksanaan: tglPelaksanaan
      };
    }

    return {
      sukses: false,
      periode: lockByTanggal.periode,
      tanggalPelaksanaan: tglPelaksanaan,
      pesan:
        '❌ PERIODE LAPORAN SUDAH DITUTUP\n\n' +
        'Tanggal pelaksanaan kegiatan masuk ' + lockByTanggal.labelPeriode + ' (' + lockByTanggal.rangeLabel + ').\n' +
        'Periode tersebut sudah ditutup untuk input laporan baru sejak ' + formatTutupPeriodeClient_(lockByTanggal.cutoffDate) + '.\n\n' +
        'Jika laporan sebelumnya ditolak admin, silakan gunakan menu revisi laporan. Jika memang perlu input baru, hubungi Admin Kinerja untuk membuka kembali periode.'
    };
  }

  // Fallback hanya untuk laporan wajib bulanan atau payload yang memang tidak punya tanggal pelaksanaan tunggal.
  var periodeWajib = bulanLaporanWajibDariPaketSubmitV31_(paket);
  if (periodeWajib) {
    var lock = bacaTutupPeriodeLaporan_(periodeWajib);
    if (!lock || lock.status !== 'DITUTUP') return { sukses: true, periode: periodeWajib, pesan: '' };

    var now2 = new Date();
    if (now2.getTime() <= lock.cutoffDate.getTime()) return { sukses: true, periode: periodeWajib, pesan: '' };

    return {
      sukses: false,
      periode: periodeWajib,
      pesan:
        '❌ PERIODE LAPORAN SUDAH DITUTUP\n\n' +
        'Periode laporan ' + lock.labelPeriode + ' sudah ditutup untuk input laporan baru sejak ' + formatTutupPeriodeClient_(lock.cutoffDate) + '.\n\n' +
        'Jika laporan sebelumnya ditolak admin, silakan gunakan menu revisi laporan. Jika memang perlu input baru, hubungi Admin Kinerja untuk membuka kembali periode.'
    };
  }

  // Jika tanggal pelaksanaan tidak terbaca, jangan blokir di sini. Validasi field wajib lain tetap berjalan.
  return { sukses: true, periode: '', pesan: '' };
};

function debugPeriodeTutupDariTanggalPelaksanaanV31(tanggalPelaksanaan, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.' };

    var d = parseTanggal(tanggalPelaksanaan);
    var lock = cariLockTutupPeriodeUntukTanggalPelaksanaanV31_(d);
    return {
      sukses: true,
      tanggalPelaksanaan: d ? formatTanggalJamISO_(d) : '',
      terkenaPeriodeTertutup: !!lock,
      lock: lock ? {
        periode: lock.periode,
        labelPeriode: lock.labelPeriode,
        rentang: lock.rangeLabel,
        cutoff: formatTutupPeriodeClient_(lock.cutoffDate),
        status: lock.status
      } : null,
      pesan: lock
        ? 'Tanggal pelaksanaan masuk periode tertutup: ' + lock.labelPeriode + ' (' + lock.rangeLabel + ').'
        : 'Tanggal pelaksanaan tidak masuk rentang periode tertutup mana pun.'
    };
  } catch (e) {
    return handleError('debugPeriodeTutupDariTanggalPelaksanaanV31', e, { sukses: false, pesan: '' });
  }
}


// ===== PATCH v2026.05.12.32: Fix validasi checkbox Pihak Terlibat Dukuh =====
// Perubahan utama di Index.html:
// - Checkbox Pihak yang Terlibat diperlakukan sebagai satu grup.
// - Minimal satu checkbox cukup.
// - Kolom "Pihak lainnya" hanya wajib jika checkbox Lainnya dicentang.



// ===== PATCH v2026.05.12.33: Pesan Error Submit Laporan Lebih Jelas =====
// Fokus:
// - Saat submit laporan gagal setelah file dipilih/terunggah, user tidak lagi hanya mendapat pesan umum.
// - Sistem mengelompokkan sumber error menjadi: upload/Drive, folder bukti, spreadsheet/Rekap_Kinerja,
//   antrean server, batas waktu/kuota, validasi periode, atau koneksi.
// - Detail teknis tetap dicatat di Logger dan Audit_Log memakai Error ID.
// - Pesan ke user tetap aman, tetapi lebih bisa ditindaklanjuti.

function klasifikasiErrorSubmitKinerjaV33_(message) {
  var raw = String(message || '');
  var s = raw.toLowerCase();

  if (/folder bukti|folder_id_bukti|folder_id_bukti_kinerja|konfigurasi folder|folder/i.test(raw) &&
      /belum diatur|not found|tidak ditemukan|invalid|cannot find|akses|permission|denied/i.test(raw)) {
    return {
      kode: 'KONFIGURASI_FOLDER_BUKTI',
      judul: 'Konfigurasi folder bukti belum siap atau tidak dapat diakses.',
      saran: 'Hubungi Admin Kinerja untuk memeriksa Script Property FOLDER_ID_BUKTI_KINERJA/FOLDER_ID_BUKTI dan izin folder Drive.'
    };
  }

  if (/DriveApp|createFile|getFolderById|setSharing|file|blob|pdf|image|upload|unggah|terunggah|quota|permission|denied/i.test(raw)) {
    return {
      kode: 'GAGAL_UPLOAD_ATAU_AKSES_DRIVE',
      judul: 'Bukti/dokumen gagal diproses atau Drive tidak dapat diakses.',
      saran: 'Coba gunakan nama file sederhana, pastikan ukuran di bawah 10 MB, lalu kirim ulang. Jika bukti sudah terunggah, gunakan tombol simpan ulang tanpa upload ulang.'
    };
  }

  if (/SpreadsheetApp|getSheetByName|getRange|appendRow|setValue|insertRows|sheet|spreadsheet|Rekap_Kinerja|range|cell|kolom|baris/i.test(raw)) {
    return {
      kode: 'GAGAL_MENULIS_REKAP_KINERJA',
      judul: 'Data laporan gagal ditulis ke database Rekap_Kinerja.',
      saran: 'Coba kirim ulang sekali. Jika masih gagal, Admin perlu mengecek sheet Rekap_Kinerja, struktur kolom, proteksi sheet, dan log error.'
    };
  }

  if (/lock|antrean|queue|tryLock|timeout|timed out|exceeded maximum execution|melebihi.*eksekusi|service invoked too many times|too many/i.test(raw)) {
    return {
      kode: 'SERVER_SEDANG_SIBUK',
      judul: 'Server sedang sibuk atau melewati batas eksekusi.',
      saran: 'Tunggu beberapa saat lalu gunakan tombol simpan ulang. Jika sering terjadi, admin perlu mengarsipkan/meringankan database.'
    };
  }

  if (/periode laporan sudah ditutup|input laporan ditutup|cut-?off|tutup periode|validasi|ditolak|h\+2|tanggal/i.test(raw)) {
    return {
      kode: 'VALIDASI_LAPORAN_DITOLAK',
      judul: 'Data laporan ditolak oleh validasi sistem.',
      saran: 'Periksa tanggal pelaksanaan, periode laporan, dan ketentuan input/revisi. Jika ini laporan revisi, gunakan menu Riwayat.'
    };
  }

  if (/network|fetch|http 0|koneksi|connection|transport|socket/i.test(raw)) {
    return {
      kode: 'KONEKSI_TERPUTUS',
      judul: 'Koneksi browser ke server terputus saat pengiriman.',
      saran: 'Periksa koneksi internet, lalu cek Riwayat sebelum mencoba kirim ulang.'
    };
  }

  if (/Cannot read|undefined|null|not a function|TypeError|ReferenceError|Exception|Error/i.test(raw)) {
    return {
      kode: 'ERROR_SCRIPT_INTERNAL',
      judul: 'Terjadi error internal pada script saat menyimpan laporan.',
      saran: 'Admin perlu membuka Apps Script → Executions dan mencari Error ID yang ditampilkan.'
    };
  }

  return {
    kode: 'GANGGUAN_SISTEM',
    judul: 'Terjadi gangguan sistem saat menyimpan laporan.',
    saran: 'Coba kirim ulang sekali. Jika tetap gagal, hubungi Admin Kinerja dengan menyebutkan Error ID.'
  };
}

function pesanErrorSubmitKinerjaLebihJelasV33_(functionName, error, prefix) {
  var errorId = buatErrorIdAman_();
  catatErrorInternal_(functionName, error, errorId);

  var msg = getInternalErrorMessage_(error);
  var info = klasifikasiErrorSubmitKinerjaV33_(msg);

  return (prefix || '') +
    'GAGAL MENYIMPAN LAPORAN\n\n' +
    'Sumber masalah: ' + info.judul + '\n\n' +
    'Kode masalah: ' + info.kode + '\n' +
    'Kode error: ' + errorId + '\n\n' +
    'Saran: ' + info.saran;
}

// Override aman: hanya simpanDataKinerja / simpanRevisi dibuat lebih informatif.
// Fungsi lain tetap memakai mekanisme sanitasi lama.
var pesanErrorStringAman__SEBELUM_DETAIL_SUBMIT_2026051233 = pesanErrorStringAman_;
pesanErrorStringAman_ = function (functionName, error, prefix) {
  var fn = String(functionName || '');
  if (fn === 'simpanDataKinerja' || fn === 'simpanRevisiLaporanDitolakPegawai') {
    return pesanErrorSubmitKinerjaLebihJelasV33_(fn, error, prefix || '');
  }
  return pesanErrorStringAman__SEBELUM_DETAIL_SUBMIT_2026051233(functionName, error, prefix);
};

function cariLogErrorSubmitKinerjaV33(errorId, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [] };
    if (!cekHakAksesLurahCarikAdmin_(idUser)) return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah/Carik.', items: [] };

    var key = String(errorId || '').trim().toUpperCase();
    if (!key) return { sukses: false, pesan: 'Kode error wajib diisi.', items: [] };

    var sh = getSheet_('Audit_Log');
    var data = sh.getDataRange().getValues();
    var items = [];
    for (var i = data.length - 1; i >= 1 && items.length < 20; i--) {
      var row = data[i] || [];
      var detail = String(row[2] || '') + ' ' + String(row[3] || '');
      if (detail.toUpperCase().indexOf(key) !== -1) {
        items.push({
          waktu: formatTanggalJamISO_(row[0]) || String(row[0] || ''),
          idUser: String(row[1] || ''),
          aksi: String(row[2] || ''),
          detail: String(row[3] || '')
        });
      }
    }

    return {
      sukses: true,
      errorId: key,
      total: items.length,
      items: items,
      pesan: items.length ? 'Log error ditemukan.' : 'Log error tidak ditemukan di Audit_Log. Coba cek Apps Script → Executions.'
    };
  } catch (e) {
    return handleError('cariLogErrorSubmitKinerjaV33', e, { sukses: false, pesan: '', items: [] });
  }
}



// ===== PATCH v2026.05.12.34: Batasi Akses Modul Disposisi =====
// Kebijakan:
// - Modul Disposisi Surat hanya boleh dibuka oleh Lurah dan Operator Disposisi aktif.
// - Carik/Admin Kinerja tidak otomatis boleh membuka modul Disposisi.
// - Pegawai biasa tetap dapat membuat laporan dari disposisi melalui notifikasi/riwayat yang memang menjadi haknya,
//   tetapi tidak mendapat halaman penerbitan/manajemen Disposisi Surat.

function cekHakAksesDisposisiModul_(idUser) {
  if (!idUser) return false;
  if (cekHakAksesLurahDisposisi_(idUser)) return true;
  return isOperatorDisposisiAktif_(idUser);
}

function getStatusAksesDisposisiModul(token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, boleh: false, pesan: 'Sesi habis. Silakan login ulang.' };

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return { sukses: false, boleh: false, pesan: 'Data pegawai tidak ditemukan.' };

    var isLurah = cekHakAksesLurahDisposisi_(idUser);
    var isOperator = isOperatorDisposisiAktif_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();

    return {
      sukses: true,
      boleh: !!(isLurah || isOperator),
      isLurahDisposisi: !!isLurah,
      isOperatorDisposisiAktif: !!isOperator,
      jabatan: pegawai.jabatan || '',
      nama: pegawai.nama || '',
      petugasDisposisiAktif: petugasDisposisiToClient_(petugasAktif),
      pesan: (isLurah || isOperator)
        ? 'Akses Disposisi diizinkan.'
        : 'Akses Disposisi ditolak. Modul ini hanya untuk Lurah dan Operator Disposisi aktif.'
    };
  } catch (e) {
    return handleError('getStatusAksesDisposisiModul', e, { sukses: false, boleh: false, pesan: '' });
  }
}

var getDisposisiBootstrap__SEBELUM_AKSES_KHUSUS_2026051234 = getDisposisiBootstrap;
getDisposisiBootstrap = function (token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, aksesDitolak: true, pesan: 'Sesi habis. Silakan login ulang.' };

    if (!cekHakAksesDisposisiModul_(idUser)) {
      var pegawai = getPegawaiById_(idUser) || {};
      logDisposisi_('', 'AKSES_MODUL_DITOLAK', idUser, 'Mencoba membuka modul Disposisi Surat tanpa hak akses.', {
        alasan: 'Hanya Lurah dan Operator Disposisi aktif yang boleh membuka modul Disposisi Surat.',
        detailJson: {
          nama: pegawai.nama || '',
          jabatan: pegawai.jabatan || ''
        }
      });
      return {
        sukses: false,
        aksesDitolak: true,
        pesan: 'Akses ditolak. Modul Disposisi Surat hanya untuk Lurah dan Operator Disposisi aktif.'
      };
    }

    return getDisposisiBootstrap__SEBELUM_AKSES_KHUSUS_2026051234(token);
  } catch (e) {
    return handleError('getDisposisiBootstrap_v34', e, { sukses: false, pesan: 'Gagal memuat modul disposisi.' });
  }
};

// Pengaman tambahan untuk daftar pegawai target disposisi.
// Sebelumnya fungsi ini hanya perlu session valid. Sekarang harus Lurah/operator aktif.
var ambilDaftarPegawaiAktifUntukDisposisi__SEBELUM_AKSES_KHUSUS_2026051234 = ambilDaftarPegawaiAktifUntukDisposisi;
ambilDaftarPegawaiAktifUntukDisposisi = function (token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', data: [] };
    if (!cekHakAksesDisposisiModul_(idUser)) {
      return { sukses: false, pesan: 'Akses ditolak. Hanya Lurah dan Operator Disposisi aktif.', data: [] };
    }
    return { sukses: true, data: getDaftarPegawaiAktifUntukDisposisiInternal_() };
  } catch (e) {
    return handleError('ambilDaftarPegawaiAktifUntukDisposisi_v34', e, { sukses: false, pesan: '', data: [] });
  }
};



// ===== PATCH v2026.05.12.35: Menu Disposisi Tetap untuk Inbox Pegawai =====
// Koreksi v34:
// - v34 terlalu ketat karena menutup seluruh modul Disposisi untuk akun selain Lurah/operator.
// Kebijakan v35:
// - Semua pegawai aktif boleh membuka menu Disposisi untuk melihat Disposisi Saya/inbox.
// - Hanya Lurah dan Operator Disposisi aktif yang boleh melihat/menggunakan form penerbitan disposisi.
// - Daftar pegawai target disposisi tetap dibatasi untuk Lurah/operator aktif.
// - Backend bootstrap kembali mengembalikan disposisiSaya untuk semua pegawai.

function cekHakAksesDisposisiTerbit_(idUser) {
  if (!idUser) return false;
  if (cekHakAksesLurahDisposisi_(idUser)) return true;
  return isOperatorDisposisiAktif_(idUser);
}

function cekHakAksesDisposisiInbox_(idUser) {
  if (!idUser) return false;
  return !!getPegawaiById_(idUser);
}

var getDisposisiBootstrap__V34_TERLALU_KETAT_2026051235 = getDisposisiBootstrap;
getDisposisiBootstrap = function (token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return { sukses: false, pesan: 'Data pegawai tidak ditemukan.' };

    ensureSheetDisposisiSurat_();
    ensureSheetDisposisiPenerima_();
    ensureSheetDisposisiLog_();
    ensureSheetDisposisiPetugas_();

    var canManage = cekHakAksesLurahDisposisi_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();
    var canOperateDisposisi = !canManage && !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser));

    var bolehTerbit = canManage || canOperateDisposisi;
    var pegawaiList = bolehTerbit ? getDaftarPegawaiAktifUntukDisposisiInternal_() : [];
    var pemberiUntukDaftar = canManage ? idUser : (canOperateDisposisi && petugasAktif ? petugasAktif.ditetapkanOlehId : idUser);
    var daftarLurah = bolehTerbit ? ambilDaftarDisposisiLurahInternal_(pemberiUntukDaftar) : [];
    var disposisiSaya = ambilDisposisiSayaInternal_(idUser);

    return {
      sukses: true,
      canManage: canManage,
      canOperateDisposisi: canOperateDisposisi,
      canPublishDisposisi: bolehTerbit,
      canInboxDisposisi: true,
      petugasDisposisiAktif: petugasDisposisiToClient_(petugasAktif),
      currentUser: {
        id: normalizeId_(pegawai.id),
        nama: pegawai.nama || '',
        jabatan: pegawai.jabatan || '',
        username: pegawai.username || ''
      },
      pegawaiAktif: getDaftarPegawaiAktifUntukDisposisiInternal_().length,
      pegawaiList: pegawaiList,
      daftarLurah: daftarLurah,
      disposisiSaya: disposisiSaya,
      sheetStatus: {
        surat: 'Disposisi_Surat',
        penerima: 'Disposisi_Penerima',
        log: 'Disposisi_Log',
        petugas: 'Disposisi_Petugas'
      },
      tahap: '1D-v35',
      pesanAkses: bolehTerbit
        ? 'Akses penerbitan disposisi aktif.'
        : 'Mode inbox pegawai. Anda dapat melihat Disposisi Saya, tetapi tidak dapat menerbitkan disposisi.'
    };
  } catch (e) {
    return handleError('getDisposisiBootstrap_v35', e, { sukses: false, pesan: 'Gagal memuat modul disposisi.' });
  }
};

var getStatusAksesDisposisiModul__V34_TERLALU_KETAT_2026051235 = getStatusAksesDisposisiModul;
getStatusAksesDisposisiModul = function (token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, boleh: false, bolehInbox: false, bolehTerbit: false, pesan: 'Sesi habis. Silakan login ulang.' };

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return { sukses: false, boleh: false, bolehInbox: false, bolehTerbit: false, pesan: 'Data pegawai tidak ditemukan.' };

    var isLurah = cekHakAksesLurahDisposisi_(idUser);
    var isOperator = isOperatorDisposisiAktif_(idUser);
    var petugasAktif = getPetugasDisposisiAktif_();

    return {
      sukses: true,
      boleh: true,
      bolehInbox: true,
      bolehTerbit: !!(isLurah || isOperator),
      isLurahDisposisi: !!isLurah,
      isOperatorDisposisiAktif: !!isOperator,
      canAccessDisposisi: true,
      canPublishDisposisi: !!(isLurah || isOperator),
      jabatan: pegawai.jabatan || '',
      nama: pegawai.nama || '',
      petugasDisposisiAktif: petugasDisposisiToClient_(petugasAktif),
      pesan: (isLurah || isOperator)
        ? 'Akses Disposisi diizinkan untuk penerbitan dan inbox.'
        : 'Akses Disposisi diizinkan untuk inbox/Disposisi Saya. Penerbitan hanya untuk Lurah dan Operator Disposisi aktif.'
    };
  } catch (e) {
    return handleError('getStatusAksesDisposisiModul_v35', e, { sukses: false, boleh: false, bolehInbox: false, bolehTerbit: false, pesan: '' });
  }
};



// ===== PATCH v2026.05.12.36: Sembunyikan Panel WhatsApp Penerbitan untuk Non-Penerbit =====
// Koreksi lanjutan v35:
// - Menu Disposisi boleh tampil untuk semua pegawai.
// - Namun panel hasil penerbitan/WhatsApp hanya boleh tampil untuk Lurah/operator aktif.
// - Backend menandai setiap response simpanDisposisiSurat dengan canPublishDisposisi.
// - Data pending WhatsApp lama di browser non-penerbit harus dibersihkan oleh frontend.

var simpanDisposisiSurat__SEBELUM_FLAG_PUBLISH_2026051236 = simpanDisposisiSurat;
simpanDisposisiSurat = function (payload, token) {
  var res = simpanDisposisiSurat__SEBELUM_FLAG_PUBLISH_2026051236(payload, token);
  try {
    var idUser = validasiSession(token);
    var boleh = cekHakAksesDisposisiTerbit_(idUser);
    if (res && typeof res === 'object') {
      res.canPublishDisposisi = !!boleh;
      res.pesanWhatsAppKhususPenerbit = true;
    }
  } catch (e) { }
  return res;
};



// ===== PATCH v2026.05.12.37: Optimasi Timeline =====
// Fokus:
// - Timeline memakai getRekapKinerjaValuesReadOnly_() supaya tidak membaca sheet berat berulang.
// - Lampiran Timeline memakai mode skipDriveFetch agar tidak memanggil DriveApp.getFileById()
//   untuk setiap bukti visual.
// - Mode skip tetap menebak PDF/gambar dari label/URL, tidak dipaksa image/jpeg semua.
// - Fungsi buildDriveLampiranMeta_ tetap kompatibel dengan pemanggil lama:
//   argumen ke-4 skipDriveFetch bersifat opsional.

function tebakMimeLampiranTanpaDriveV37_(label, rawUrl) {
  var s = (String(label || '') + ' ' + String(rawUrl || '')).toLowerCase();
  if (/\.(pdf)(?:$|[?&#])/.test(s) || s.indexOf('pdf') !== -1) return 'application/pdf';
  if (/\.(png)(?:$|[?&#])/.test(s)) return 'image/png';
  if (/\.(webp)(?:$|[?&#])/.test(s)) return 'image/webp';
  if (/\.(gif)(?:$|[?&#])/.test(s)) return 'image/gif';
  if (/\.(bmp)(?:$|[?&#])/.test(s)) return 'image/bmp';
  if (/\.(svg)(?:$|[?&#])/.test(s)) return 'image/svg+xml';
  if (/\.(jpg|jpeg)(?:$|[?&#])/.test(s)) return 'image/jpeg';

  // Bukti visual pada timeline biasanya foto. Untuk timeline, asumsi gambar lebih cepat
  // dan tetap aman karena link asli masih dibuka via Drive bila thumbnail gagal.
  if (/bukti|visual|foto|gambar|lampiran/i.test(String(label || ''))) return 'image/jpeg';

  return '';
}

var buildDriveLampiranMeta__SEBELUM_OPT_TIMELINE_2026051237 = buildDriveLampiranMeta_;
buildDriveLampiranMeta_ = function (url, label, cache, skipDriveFetch) {
  var rawUrl = (url || '').toString().trim();
  if (!rawUrl || !isSafeDriveUrl_(rawUrl)) return null;

  var fileId = extractDriveFileId_(rawUrl);
  if (!fileId) return null;

  var cacheKey = 'DRIVE_FILE_' + fileId + (skipDriveFetch ? '_SKIP' : '');
  var base = null;

  if (cache && cache[cacheKey]) {
    base = cloneSimpleObject_(cache[cacheKey]);
  } else {
    var openUrl = 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view';
    var previewUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w800';
    var fullUrl = 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);

    base = {
      label: (label || 'Lampiran').toString(),
      rawUrl: openUrl,
      safeUrl: openUrl,
      openUrl: openUrl,
      fileId: fileId,
      fileName: '',
      mimeType: '',
      kind: 'drive',
      isImage: false,
      isPdf: false,
      canPreviewInline: false,
      previewUrl: previewUrl,
      fullUrl: fullUrl
    };

    if (skipDriveFetch) {
      base.fileName = (label || 'Lampiran').toString();
      base.mimeType = tebakMimeLampiranTanpaDriveV37_(label, rawUrl);
    } else {
      try {
        var file = DriveApp.getFileById(fileId);
        base.fileName = file.getName() || '';
        base.mimeType = file.getMimeType() || '';
      } catch (e) {
        return null;
      }
    }

    var nameLower = (base.fileName || '').toLowerCase();
    base.isImage = base.mimeType.indexOf('image/') === 0 || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(nameLower);
    base.isPdf = base.mimeType === MimeType.PDF || base.mimeType.indexOf('pdf') !== -1 || /\.pdf$/i.test(nameLower);

    if (base.isImage) {
      base.kind = 'image';
      base.canPreviewInline = true;
      base.stageUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w2000';
    } else if (base.isPdf) {
      base.kind = 'pdf';
      base.canPreviewInline = false;
    }

    if (cache) cache[cacheKey] = cloneSimpleObject_(base);
  }

  base = cloneSimpleObject_(base);
  if (label) base.label = label;
  return base;
};

var ambilTimelinePublik__SEBELUM_OPTIMASI_2026051237 = ambilTimelinePublik;
ambilTimelinePublik = function (token, offset, limit) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.', items: [], nextOffset: 0, hasMore: false, totalApproved: 0 };
    }

    var start = parseInt(offset, 10);
    if (isNaN(start) || start < 0) start = 0;

    var pageSize = parseInt(limit, 10);
    if (isNaN(pageSize) || pageSize < 1) pageSize = 12;
    if (pageSize > 30) pageSize = 30;

    var data = getRekapKinerjaValuesReadOnly_();
    var hasil = [];
    var totalApproved = 0;
    var lampiranCache = {};

    for (var i = data.length - 1; i >= 1; i--) {
      var status = (data[i][SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || '').toString();
      if (!isStatusApproved_(status)) continue;

      totalApproved++;
      if (totalApproved <= start) continue;
      if (hasil.length >= pageSize) continue;

      var w = data[i][SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
      var waktuObj = parseTanggal(w);
      var waktuTeks = (waktuObj instanceof Date && !isNaN(waktuObj.getTime()))
        ? Utilities.formatDate(waktuObj, 'GMT+7', 'dd/MM/yyyy HH:mm')
        : (w ? w.toString() : '');

      var urlDasar = data[i][SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL]
        ? data[i][SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL].toString()
        : '';

      // Dokumen dasar tetap boleh fetch Drive karena jumlahnya kecil dan perlu deteksi PDF lebih akurat.
      // Bukti visual timeline memakai skipDriveFetch karena jumlahnya bisa banyak.
      var dokumenDasarMeta = buildDriveLampiranMeta_(urlDasar, 'Dokumen Dasar', lampiranCache, false);

      var urlVisuals = data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL]
        ? data[i][SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL].toString().split(',')
        : [];
      var buktiVisualMeta = [];

      for (var u = 0; u < urlVisuals.length; u++) {
        var link = (urlVisuals[u] || '').toString().trim();
        if (!link) continue;
        var label = urlVisuals.length > 1 ? 'Bukti Visual ' + (u + 1) : 'Bukti Visual';
        var meta = buildDriveLampiranMeta_(link, label, lampiranCache, true);
        if (!meta || !meta.safeUrl) continue;
        buktiVisualMeta.push(meta);
      }

      hasil.push({
        idLaporan: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
        idUser: normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]),
        waktu: waktuTeks,
        waktuSort: (waktuObj instanceof Date && !isNaN(waktuObj.getTime())) ? waktuObj.getTime() : 0,
        nama: data[i][SHEET_COLUMNS.REKAP_KINERJA.NAMA] || '-',
        jabatan: data[i][SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || '-',
        kategori: data[i][SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || '-',
        deskripsi: data[i][SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || '-',
        status: status || '-',
        poinFinal: Number(data[i][SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
        dokumenDasar: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta : null,
        urlDasarRaw: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta.safeUrl : '',
        buktiVisualMeta: buktiVisualMeta,
        buktiVisual: buktiVisualMeta,
        urlVisualRaw: buktiVisualMeta.map(function (item) { return item.safeUrl; })
      });
    }

    return {
      sukses: true,
      items: hasil,
      nextOffset: start + hasil.length,
      hasMore: totalApproved > (start + hasil.length),
      totalApproved: totalApproved,
      optimasiTimeline: 'v2026.05.12.37'
    };
  } catch (e) {
    return handleError('ambilTimelinePublik_v37', e, { sukses: false, pesan: 'Gagal memuat timeline.', items: [], nextOffset: 0, hasMore: false, totalApproved: 0 });
  }
};



// ===== PATCH v2026.05.12.38: Optimasi Bootstrap Disposisi Surat =====
// Fokus:
// - Menu Disposisi tidak lagi memuat semua data berat untuk akun biasa.
// - Akun biasa hanya memuat Disposisi Saya.
// - Lurah/operator baru memuat pegawai target dan daftar disposisi yang diterbitkan.
// - Sheet Disposisi dibaca memakai cache singkat.
// - Pencarian laporan terkait disposisi memakai index Rekap_Kinerja sekali,
//   bukan scan Rekap_Kinerja berulang untuk setiap disposisi.

function disposisiCacheTtlV38_() {
  return 90; // detik; cukup untuk mempercepat buka menu, tetap cepat berubah setelah update.
}

function getDisposisiSheetValuesCachedV38_(sheetName, headers) {
  var cache = CacheService.getScriptCache();
  var key = 'DISPOSISI_VALUES_V38_' + sheetName;
  var cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  var sh = getSS_().getSheetByName(sheetName);
  if (!sh) {
    // Jika sheet belum ada, baru ensure. Pada kondisi normal tidak perlu ensure setiap buka menu.
    if (sheetName === 'Disposisi_Surat') sh = ensureSheetDisposisiSurat_();
    else if (sheetName === 'Disposisi_Penerima') sh = ensureSheetDisposisiPenerima_();
    else if (sheetName === 'Disposisi_Petugas') sh = ensureSheetDisposisiPetugas_();
    else sh = getSS_().insertSheet(sheetName);
  }

  var values = sh.getDataRange().getValues();
  try { cache.put(key, JSON.stringify(values), disposisiCacheTtlV38_()); } catch (e2) {}
  return values;
}

function invalidasiCacheDisposisiV38_() {
  var cache = CacheService.getScriptCache();
  ['Disposisi_Surat', 'Disposisi_Penerima', 'Disposisi_Petugas'].forEach(function (name) {
    try { cache.remove('DISPOSISI_VALUES_V38_' + name); } catch (e) {}
  });
}

function ambilSemuaSuratDisposisiCachedV38_() {
  var data = getDisposisiSheetValuesCachedV38_('Disposisi_Surat', DISPOSISI_SURAT_HEADERS);
  var rows = [];
  var C = SHEET_COLUMNS.DISPOSISI_SURAT;
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    if (!row[C.ID_DISPOSISI]) continue;
    rows.push({
      id_disposisi: normalizeId_(row[C.ID_DISPOSISI]),
      nomor_disposisi: (row[C.NOMOR_DISPOSISI] || '').toString(),
      tanggal_disposisi: row[C.TANGGAL_DISPOSISI] || '',
      jenis_disposisi: (row[C.JENIS_DISPOSISI] || '').toString(),
      perihal: (row[C.PERIHAL] || '').toString(),
      isi_ringkas_instruksi: (row[C.ISI_RINGKAS_INSTRUKSI] || '').toString(),
      pemberi_id: normalizeId_(row[C.PEMBERI_ID]),
      pemberi_nama: (row[C.PEMBERI_NAMA] || '').toString(),
      pemberi_jabatan: (row[C.PEMBERI_JABATAN] || '').toString(),
      lampiran_url: safeHttpUrlServer_(row[C.LAMPIRAN_URL]),
      lampiran_nama: (row[C.LAMPIRAN_NAMA] || '').toString(),
      tanggal_mulai: row[C.TANGGAL_MULAI] || '',
      tanggal_selesai: row[C.TANGGAL_SELESAI] || '',
      status_disposisi: (row[C.STATUS_DISPOSISI] || '').toString(),
      dibuat_pada: row[C.DIBUAT_PADA] || '',
      diubah_pada: row[C.DIUBAH_PADA] || '',
      sumber_disposisi: (row[C.SUMBER_DISPOSISI] || '').toString(),
      nomor_lembar_manual: (row[C.NOMOR_LEMBAR_MANUAL] || '').toString(),
      tanggal_lembar_manual: row[C.TANGGAL_LEMBAR_MANUAL] || '',
      diinput_oleh_id: normalizeId_(row[C.DIINPUT_OLEH_ID]),
      diinput_oleh_nama: (row[C.DIINPUT_OLEH_NAMA] || '').toString(),
      diinput_oleh_jabatan: (row[C.DIINPUT_OLEH_JABATAN] || '').toString(),
      diinput_pada: row[C.DIINPUT_PADA] || '',
      mode_input: (row[C.MODE_INPUT] || '').toString(),
      catatan_operator: (row[C.CATATAN_OPERATOR] || '').toString()
    });
  }
  return rows;
}

function ambilSemuaPenerimaDisposisiCachedV38_() {
  var data = getDisposisiSheetValuesCachedV38_('Disposisi_Penerima', DISPOSISI_PENERIMA_HEADERS);
  var rows = [];
  var C = SHEET_COLUMNS.DISPOSISI_PENERIMA;
  for (var i = 1; i < data.length; i++) {
    var row = data[i] || [];
    if (!row[C.ID_DISPOSISI] || !row[C.ID_PENERIMA]) continue;
    rows.push({
      rowIndex: i + 1,
      id_disposisi: normalizeId_(row[C.ID_DISPOSISI]),
      id_penerima: normalizeId_(row[C.ID_PENERIMA]),
      nama_penerima: (row[C.NAMA_PENERIMA] || '').toString(),
      jabatan_penerima: (row[C.JABATAN_PENERIMA] || '').toString(),
      mode_penerima: (row[C.MODE_PENERIMA] || '').toString(),
      status_baca: (row[C.STATUS_BACA] || '').toString(),
      status_tindak_lanjut: (row[C.STATUS_TINDAK_LANJUT] || '').toString(),
      id_laporan_terkait: normalizeId_(row[C.ID_LAPORAN_TERKAIT]),
      waktu_lapor: row[C.WAKTU_LAPOR] || '',
      catatan_tindak_lanjut: (row[C.CATATAN_TINDAK_LANJUT] || '').toString(),
      dibuat_pada: row[C.DIBUAT_PADA] || '',
      diubah_pada: row[C.DIUBAH_PADA] || ''
    });
  }
  return rows;
}

function getPetugasDisposisiAktifCachedV38_() {
  var data = getDisposisiSheetValuesCachedV38_('Disposisi_Petugas', DISPOSISI_PETUGAS_HEADERS);
  if (!data || data.length < 2) return null;
  for (var i = data.length - 1; i >= 1; i--) {
    var item = rowPetugasDisposisiToObject_(data[i], i + 1);
    if (statusPetugasDisposisiAktif_(item.statusPetugas) && item.pegawaiId) return item;
  }
  return null;
}

function jumlahPegawaiAktifUntukDisposisiV38_() {
  var data = getPegawaiDataCached_() || [];
  var n = 0;
  for (var i = 1; i < data.length; i++) {
    if (!data[i][SHEET_COLUMNS.DATA_PEGAWAI.ID]) continue;
    var statusPegawai = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.STATUS] || '').toString().trim().toLowerCase();
    if (statusPegawai && statusPegawai !== 'aktif') continue;
    var jabatan = (data[i][SHEET_COLUMNS.DATA_PEGAWAI.JABATAN] || '').toString();
    if (isLurah_(jabatan)) continue;
    n++;
  }
  return n;
}

function buatIndexLaporanDisposisiUserV38_(idUser) {
  var userKey = normalizeId_(idUser);
  var byIdLaporan = {};
  var byIdDisposisi = {};
  if (!userKey) return { byIdLaporan: byIdLaporan, byIdDisposisi: byIdDisposisi };

  var data = getRekapKinerjaValuesReadOnly_();
  for (var i = data.length - 1; i >= 1; i--) {
    var rowUser = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
    if (!idsEqual_(rowUser, userKey)) continue;

    var item = buildLaporanTerkaitDisposisiFromRow_(data[i]);
    var idLap = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
    var idDisp = normalizeId_(data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_DISPOSISI]);

    if (idLap && !byIdLaporan[idLap]) byIdLaporan[idLap] = item;
    if (idDisp && !byIdDisposisi[idDisp]) byIdDisposisi[idDisp] = item;
  }

  return { byIdLaporan: byIdLaporan, byIdDisposisi: byIdDisposisi };
}

function laporanTerkaitDisposisiFromIndexV38_(penerima, index) {
  penerima = penerima || {};
  index = index || { byIdLaporan: {}, byIdDisposisi: {} };
  var idLap = normalizeId_(penerima.id_laporan_terkait);
  var idDisp = normalizeId_(penerima.id_disposisi);
  return (idLap && index.byIdLaporan[idLap]) || (idDisp && index.byIdDisposisi[idDisp]) || null;
}

function ambilDisposisiSayaOptimizedV38_(idUser, suratRows, penerimaRows, laporanIndex) {
  var suratMap = {};
  (suratRows || []).forEach(function (s) { suratMap[normalizeId_(s.id_disposisi)] = s; });

  return (penerimaRows || [])
    .filter(function (p) { return idsEqual_(p.id_penerima, idUser); })
    .map(function (p) {
      var s = suratMap[normalizeId_(p.id_disposisi)] || {};
      var laporanTerkait = laporanTerkaitDisposisiFromIndexV38_(p, laporanIndex);
      var sudahLapor = penerimaDisposisiSudahLapor_(p, laporanTerkait);
      var pStatus = penerimaDisposisiUntukStatusLapor_(p, laporanTerkait);
      var ts = parseTanggalKosongAman_(s.dibuat_pada) || parseTanggalKosongAman_(s.tanggal_disposisi);
      var aksiLaporan = 'BUAT';

      if (sudahLapor) {
        if (laporanTerkait && laporanTerkait.idLaporan) {
          aksiLaporan = laporanTerkait.bisaPerbaiki ? 'PERBAIKI' : 'LIHAT';
        } else {
          aksiLaporan = 'PERBAIKI';
        }
      }

      var statusLapor = hitungStatusLaporDisposisi_(s, pStatus);
      var cutoffPelaporan = cutoffPelaporanDisposisi_(s);
      if (cutoffPelaporan.periodeDitutup) {
        if (aksiLaporan === 'BUAT') {
          aksiLaporan = 'TERKUNCI_CUTOFF';
        } else if (aksiLaporan === 'PERBAIKI') {
          aksiLaporan = (laporanTerkait && laporanTerkait.idLaporan) ? 'LIHAT' : 'TERKUNCI_CUTOFF';
        }
      }

      return {
        idDisposisi: normalizeId_(p.id_disposisi),
        nomor: s.nomor_disposisi || '-',
        tanggal: formatTanggalIndonesiaDisposisi_(s.tanggal_disposisi, false),
        jenis: s.jenis_disposisi || '-',
        perihal: s.perihal || '-',
        isiInstruksi: s.isi_ringkas_instruksi || '',
        pemberiNama: s.pemberi_nama || '-',
        pemberiJabatan: s.pemberi_jabatan || '-',
        lampiranUrl: safeHttpUrlServer_(s.lampiran_url),
        lampiranNama: s.lampiran_nama || '',
        statusBaca: p.status_baca || DISPOSISI_BACA.BARU,
        statusTindakLanjut: pStatus.status_tindak_lanjut || DISPOSISI_TINDAK.BELUM,
        tanggalMulai: formatTanggalIndonesiaDisposisi_(s.tanggal_mulai, false),
        tanggalSelesai: formatTanggalIndonesiaDisposisi_(s.tanggal_selesai, false),
        batasLapor: statusLapor.batasLabel,
        batasLaporIso: statusLapor.batasIso,
        periodePelaporan: cutoffPelaporan.periode || '',
        periodePelaporanLabel: cutoffPelaporan.periodeLabel || '',
        periodePelaporanDitutup: !!cutoffPelaporan.periodeDitutup,
        cutoffPelaporanLabel: cutoffPelaporan.cutoffLabel || '',
        pesanPeriodeDitutup: cutoffPelaporan.pesan || '',
        statusLaporCode: statusLapor.code,
        statusLaporLabel: statusLapor.label,
        isTerlambatLapor: statusLapor.terlambatBelumLapor,
        laporanTerlambat: statusLapor.sudahTerlambat,
        waktuLaporLabel: statusLapor.waktuLaporLabel,
        statusDisposisi: s.status_disposisi || DISPOSISI_STATUS.TERBIT,
        idLaporanTerkait: normalizeId_(pStatus.id_laporan_terkait),
        laporanTerkaitStatus: laporanTerkait ? (laporanTerkait.status || '') : '',
        laporanTerkaitWaktu: laporanTerkait ? (laporanTerkait.waktu || '') : '',
        laporanTerkaitKategori: laporanTerkait ? (laporanTerkait.kategori || '') : '',
        laporanTerkaitPoin: laporanTerkait ? Number(laporanTerkait.poinFinal || 0) : 0,
        aksiLaporan: aksiLaporan,
        _ts: ts ? ts.getTime() : 0
      };
    })
    .sort(function (a, b) { return (b._ts || 0) - (a._ts || 0); });
}

function ambilDaftarDisposisiLurahOptimizedV38_(idUser, suratRows, penerimaRows) {
  var grouped = {};
  (penerimaRows || []).forEach(function (p) {
    var key = normalizeId_(p.id_disposisi);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  return (suratRows || [])
    .filter(function (r) { return idsEqual_(r.pemberi_id, idUser); })
    .map(function (s) {
      var arr = grouped[normalizeId_(s.id_disposisi)] || [];
      var total = arr.length;
      var dibuka = 0, sudah = 0, belum = 0, tepatWaktu = 0, laporTerlambat = 0, terlambatBelum = 0, terkunciCutoffBelum = 0;
      var batasLapor = batasLaporDisposisi_(s.tanggal_selesai);
      var cutoffPelaporan = cutoffPelaporanDisposisi_(s);

      arr.forEach(function (p) {
        if ((p.status_baca || '') === DISPOSISI_BACA.DIBUKA) dibuka++;
        if ((p.status_tindak_lanjut || '') === DISPOSISI_TINDAK.SUDAH) sudah++;
        else belum++;

        var st = hitungStatusLaporDisposisi_(s, p);
        if (st.code === 'SUDAH_TEPAT_WAKTU') tepatWaktu++;
        else if (st.code === 'SUDAH_TERLAMBAT') laporTerlambat++;
        else if (st.code === 'TERLAMBAT_LAPOR') terlambatBelum++;
        if (cutoffPelaporan.periodeDitutup && st.code !== 'SUDAH_TEPAT_WAKTU' && st.code !== 'SUDAH_TERLAMBAT') terkunciCutoffBelum++;
      });

      return {
        idDisposisi: normalizeId_(s.id_disposisi),
        nomor: s.nomor_disposisi,
        tanggal: formatTanggalIndonesiaDisposisi_(s.tanggal_disposisi, false),
        jenis: s.jenis_disposisi,
        perihal: s.perihal,
        isiInstruksi: s.isi_ringkas_instruksi,
        status: s.status_disposisi || DISPOSISI_STATUS.TERBIT,
        lampiranUrl: safeHttpUrlServer_(s.lampiran_url),
        lampiranNama: s.lampiran_nama,
        tanggalMulai: formatTanggalIndonesiaDisposisi_(s.tanggal_mulai, false),
        tanggalSelesai: formatTanggalIndonesiaDisposisi_(s.tanggal_selesai, false),
        batasLapor: batasLapor ? formatTanggalIndonesiaDisposisi_(batasLapor, true) : '-',
        batasLaporIso: batasLapor ? Utilities.formatDate(batasLapor, 'GMT+7', "yyyy-MM-dd'T'HH:mm:ss") : '',
        periodePelaporan: cutoffPelaporan.periode || '',
        periodePelaporanLabel: cutoffPelaporan.periodeLabel || '',
        periodePelaporanDitutup: !!cutoffPelaporan.periodeDitutup,
        cutoffPelaporanLabel: cutoffPelaporan.cutoffLabel || '',
        pesanPeriodeDitutup: cutoffPelaporan.pesan || '',
        sumberDisposisi: s.sumber_disposisi || '',
        nomorLembarManual: s.nomor_lembar_manual || '',
        tanggalLembarManual: formatTanggalIndonesiaDisposisi_(s.tanggal_lembar_manual, false),
        diinputOlehNama: s.diinput_oleh_nama || '',
        diinputOlehJabatan: s.diinput_oleh_jabatan || '',
        diinputPada: formatTanggalIndonesiaDisposisi_(s.diinput_pada, true),
        modeInput: s.mode_input || '',
        catatanOperator: s.catatan_operator || '',
        totalPenerima: total,
        totalDibuka: dibuka,
        totalBelum: belum,
        totalSudah: sudah,
        totalTepatWaktu: tepatWaktu,
        totalLaporTerlambat: laporTerlambat,
        totalTerlambatBelumLapor: terlambatBelum,
        totalTerkunciCutoffBelumLapor: terkunciCutoffBelum,
        penerimaIds: arr.map(function (p) { return normalizeId_(p.id_penerima); }),
        penerimaList: arr.map(function (p) {
          return {
            id: normalizeId_(p.id_penerima),
            nama: p.nama_penerima || '',
            jabatan: p.jabatan_penerima || '',
            statusBaca: p.status_baca || '',
            statusTindakLanjut: p.status_tindak_lanjut || ''
          };
        }),
        dibuatPadaTs: parseTanggalKosongAman_(s.dibuat_pada) ? parseTanggalKosongAman_(s.dibuat_pada).getTime() : 0
      };
    })
    .sort(function (a, b) { return (b.dibuatPadaTs || 0) - (a.dibuatPadaTs || 0); });
}

var getDisposisiBootstrap__SEBELUM_OPTIMASI_2026051238 = getDisposisiBootstrap;
getDisposisiBootstrap = function (token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: 'Sesi habis. Silakan login ulang.' };

    var pegawai = getPegawaiById_(idUser);
    if (!pegawai) return { sukses: false, pesan: 'Data pegawai tidak ditemukan.' };

    var canManage = cekHakAksesLurahDisposisi_(idUser);
    var petugasAktif = getPetugasDisposisiAktifCachedV38_();
    var canOperateDisposisi = !canManage && !!(petugasAktif && idsEqual_(petugasAktif.pegawaiId, idUser));
    var bolehTerbit = canManage || canOperateDisposisi;

    var suratRows = ambilSemuaSuratDisposisiCachedV38_();
    var penerimaRows = ambilSemuaPenerimaDisposisiCachedV38_();
    var laporanIndex = buatIndexLaporanDisposisiUserV38_(idUser);
    var disposisiSaya = ambilDisposisiSayaOptimizedV38_(idUser, suratRows, penerimaRows, laporanIndex);

    // Optimasi utama: akun biasa tidak perlu memuat pegawaiList dan daftarLurah.
    var pegawaiList = [];
    var daftarLurah = [];
    var jumlahPegawai = jumlahPegawaiAktifUntukDisposisiV38_();

    if (bolehTerbit) {
      pegawaiList = getDaftarPegawaiAktifUntukDisposisiInternal_();
      var pemberiUntukDaftar = canManage ? idUser : (canOperateDisposisi && petugasAktif ? petugasAktif.ditetapkanOlehId : idUser);
      daftarLurah = ambilDaftarDisposisiLurahOptimizedV38_(pemberiUntukDaftar, suratRows, penerimaRows);
    }

    return {
      sukses: true,
      canManage: canManage,
      canOperateDisposisi: canOperateDisposisi,
      canPublishDisposisi: bolehTerbit,
      canInboxDisposisi: true,
      petugasDisposisiAktif: petugasDisposisiToClient_(petugasAktif),
      currentUser: {
        id: normalizeId_(pegawai.id),
        nama: pegawai.nama || '',
        jabatan: pegawai.jabatan || '',
        username: pegawai.username || ''
      },
      pegawaiAktif: jumlahPegawai,
      pegawaiList: pegawaiList,
      daftarLurah: daftarLurah,
      disposisiSaya: disposisiSaya,
      sheetStatus: {
        surat: 'Disposisi_Surat',
        penerima: 'Disposisi_Penerima',
        log: 'Disposisi_Log',
        petugas: 'Disposisi_Petugas'
      },
      tahap: '1D-v38-optimized',
      pesanAkses: bolehTerbit
        ? 'Akses penerbitan disposisi aktif.'
        : 'Mode inbox pegawai. Data yang dimuat dibatasi agar lebih cepat.',
      optimasiDisposisi: 'v2026.05.12.38'
    };
  } catch (e) {
    return handleError('getDisposisiBootstrap_v38', e, { sukses: false, pesan: 'Gagal memuat modul disposisi.' });
  }
};

// Invalidasi cache setelah write disposisi penting.
var simpanDisposisiSurat__SEBELUM_INVALIDASI_CACHE_2026051238 = simpanDisposisiSurat;
simpanDisposisiSurat = function (payload, token) {
  var res = simpanDisposisiSurat__SEBELUM_INVALIDASI_CACHE_2026051238(payload, token);
  try { if (res && res.sukses) invalidasiCacheDisposisiV38_(); } catch (e) {}
  return res;
};

var simpanPetugasDisposisi__SEBELUM_INVALIDASI_CACHE_2026051238 = simpanPetugasDisposisi;
simpanPetugasDisposisi = function (payload, token) {
  var res = simpanPetugasDisposisi__SEBELUM_INVALIDASI_CACHE_2026051238(payload, token);
  try { if (res && res.sukses) invalidasiCacheDisposisiV38_(); } catch (e) {}
  return res;
};

var tandaiDisposisiSudahDibuka__SEBELUM_INVALIDASI_CACHE_2026051238 = tandaiDisposisiSudahDibuka;
tandaiDisposisiSudahDibuka = function (idDisposisi, token) {
  var res = tandaiDisposisiSudahDibuka__SEBELUM_INVALIDASI_CACHE_2026051238(idDisposisi, token);
  try { if (res && res.sukses) invalidasiCacheDisposisiV38_(); } catch (e) {}
  return res;
};
