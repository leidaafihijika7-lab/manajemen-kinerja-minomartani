// ============================================================
// TAHAP 3B-1B BATCH 3
// GUARD KONTRAK PRA-DEPLOY
// Baseline kontrak: Review Center v1.2 Legacy Retirement — 178 binding aktif
// Baseline kode kandidat: APP_VERSION 2026.10.01.01
//
// READ-ONLY:
// - tidak memanggil endpoint/fungsi bisnis yang dilindungi;
// - tidak membaca/menulis Spreadsheet;
// - tidak mengubah Properties/feature flag;
// - tidak mengubah poin/status review/schema.
// ============================================================

var PORTAL_PREDEPLOY_GUARD_3B1B3_VERSION = "3B1B3t-2026.10.01.01";
var PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3 = "2026.10.01.01";
var PORTAL_PREDEPLOY_BASELINE_TOTAL_3B1B3 = 178;
var PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3 = "ab66775079f1c382ebe0cab2d461fdb08bcccb605e15459aca82171bef15ef8d";

// Tool governance Batch 3 sengaja tidak menjadi bagian snapshot 173 Batch 2g.
// Nama-nama ini boleh tercatat di registry tanpa dianggap ekspansi kontrak bisnis.
var PORTAL_PREDEPLOY_SELF_NAMES_3B1B3_ = [
  "statusGuardKontrakPraDeploy3B1B3",
  "validasiGuardKontrakPraDeploy3B1B3",
  "laporanGuardKontrakPraDeploy3B1B3",
  "evaluasiPerubahanTerencanaPraDeploy3B1B3",
  "validasiConsistencyGuardTunjanganV01",
  "validasiCakupanTunjanganV02",
  "validasiTarifTunjanganV03",
  "validasiPreflightSeptember2026V01",
  "validasiLoadingPeriodeTunjanganV01",
  "validasiNativeXlsxTunjanganV01",
  "validasiPdfTunjanganV01",
  "validasiOperationalHealthV101",
  "validasiReviewCenterAdminV10",
  "auditMaintenanceOHICV101",
  "maintenanceRekonsiliasiQueueIndexV101",
  "maintenanceBersihkanMetadataBatchResiduV101"
];

function dependensiGuardPraDeploy3B1B3_() {
  var issues = [];
  if (typeof PORTAL_FUNCTION_CONTRACT_3B1B2_ === "undefined") issues.push("CONTRACT_3B1B2_TIDAK_TERSEDIA");
  if (typeof PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_ === "undefined") issues.push("CHECKSUM_3B1B2_TIDAK_TERSEDIA");
  if (typeof bangunSnapshotKontrakAktif3B1B2_ !== "function") issues.push("SNAPSHOT_BUILDER_3B1B2_TIDAK_TERSEDIA");
  if (typeof validasiStrukturRegistryFungsi3B1B1_ !== "function") issues.push("VALIDATOR_REGISTRY_3B1B1_TIDAK_TERSEDIA");
  if (typeof salinRegistryFungsi3B1B1_ !== "function") issues.push("REGISTRY_COPY_3B1B1_TIDAK_TERSEDIA");
  if (typeof sha256Teks3B1B2_ !== "function") issues.push("SHA256_HELPER_3B1B2_TIDAK_TERSEDIA");
  return { valid: issues.length === 0, issues: issues };
}

function normalisasiRencanaPerubahanPraDeploy3B1B3_(rencana) {
  var out = {};
  if (!Array.isArray(rencana)) return out;

  rencana.forEach(function (item) {
    var cfg;
    if (typeof item === "string") {
      cfg = {
        name: String(item || "").trim(),
        allowSourceChange: true,
        allowArityChange: false,
        allowNew: false,
        reason: "PERUBAHAN_SUMBER_TERENCANA"
      };
    } else if (item && typeof item === "object") {
      cfg = {
        name: String(item.name || "").trim(),
        allowSourceChange: item.allowSourceChange === true,
        allowArityChange: item.allowArityChange === true,
        allowNew: item.allowNew === true,
        reason: String(item.reason || "PERUBAHAN_TERENCANA")
      };
    } else {
      return;
    }

    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cfg.name)) return;
    out[cfg.name] = cfg;
  });
  return out;
}

function kumpulkanNamaRegistryPraDeploy3B1B3_() {
  var registry = salinRegistryFungsi3B1B1_();
  var categories = registry.categories || {};
  var names = [];
  var categoryByName = {};

  Object.keys(categories).forEach(function (category) {
    var list = Array.isArray(categories[category]) ? categories[category] : [];
    list.forEach(function (name) {
      var n = String(name || "").trim();
      if (!n) return;
      names.push(n);
      categoryByName[n] = category;
    });
  });

  return { names: names, categoryByName: categoryByName, registry: registry };
}

function buatFingerprintGuardPraDeploy3B1B3_(payload) {
  return sha256Teks3B1B2_(JSON.stringify(payload || {}));
}

function evaluasiGuardPraDeploy3B1B3_(rencana) {
  var deps = dependensiGuardPraDeploy3B1B3_();
  var appVersion = typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "";

  if (!deps.valid) {
    return {
      sukses: false,
      valid: false,
      versi: PORTAL_PREDEPLOY_GUARD_3B1B3_VERSION,
      appVersion: appVersion,
      keputusan: "BLOCK",
      bolehDeploy: false,
      perluReviewManual: false,
      blocker: deps.issues.slice(),
      reviewRequired: [],
      warnings: [],
      targetDipanggil: false,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    };
  }

  var plan = normalisasiRencanaPerubahanPraDeploy3B1B3_(rencana);
  var struktur = validasiStrukturRegistryFungsi3B1B1_();
  var snap = bangunSnapshotKontrakAktif3B1B2_();
  var regInfo = kumpulkanNamaRegistryPraDeploy3B1B3_();
  var baselineByName = {};
  var rowByName = {};
  var selfSet = {};
  var blocker = [];
  var reviewRequired = [];
  var warnings = [];
  var perubahanTerdeteksi = [];
  var plannedNames = Object.keys(plan);

  PORTAL_PREDEPLOY_SELF_NAMES_3B1B3_.forEach(function (name) { selfSet[name] = true; });
  PORTAL_FUNCTION_CONTRACT_3B1B2_.forEach(function (c) { baselineByName[c.name] = c; });
  snap.rows.forEach(function (row) { rowByName[row.name] = row; });

  if (!struktur.valid) blocker.push({ code: "REGISTRY_INVALID", detail: struktur });
  if (PORTAL_FUNCTION_CONTRACT_3B1B2_.length !== PORTAL_PREDEPLOY_BASELINE_TOTAL_3B1B3) {
    blocker.push({ code: "BASELINE_TOTAL_CHANGED", expected: PORTAL_PREDEPLOY_BASELINE_TOTAL_3B1B3, actual: PORTAL_FUNCTION_CONTRACT_3B1B2_.length });
  }
  if (String(PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_) !== PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3) {
    blocker.push({ code: "BASELINE_CHECKSUM_CONSTANT_CHANGED", expected: PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3, actual: String(PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_) });
  }

  snap.rows.forEach(function (row) {
    var cfg = plan[row.name] || null;
    if (!row.tersedia) {
      blocker.push({ code: "BINDING_MISSING", name: row.name });
      perubahanTerdeteksi.push(row.name);
      return;
    }
    if (!row.matchArity) {
      perubahanTerdeteksi.push(row.name);
      if (cfg && cfg.allowArityChange) {
        reviewRequired.push({ code: "ARITY_CHANGE_PLANNED", name: row.name, expected: row.arityExpected, actual: row.arityAktif, reason: cfg.reason });
      } else {
        blocker.push({ code: "ARITY_CHANGE_UNEXPECTED", name: row.name, expected: row.arityExpected, actual: row.arityAktif });
      }
    }
    if (!row.matchSource) {
      perubahanTerdeteksi.push(row.name);
      if (cfg && cfg.allowSourceChange) {
        reviewRequired.push({ code: "SOURCE_CHANGE_PLANNED", name: row.name, expected: row.hashExpected, actual: row.hashAktif, reason: cfg.reason });
      } else {
        blocker.push({ code: "SOURCE_CHANGE_UNEXPECTED", name: row.name, expected: row.hashExpected, actual: row.hashAktif });
      }
    }
  });

  var registrySet = {};
  regInfo.names.forEach(function (name) { registrySet[name] = true; });

  // Fungsi baseline tidak boleh hilang dari registry walaupun binding runtime masih ada.
  Object.keys(baselineByName).forEach(function (name) {
    if (!registrySet[name]) blocker.push({ code: "REGISTRY_BASELINE_REMOVED", name: name });
  });

  // Ekspansi kontrak public harus dinyatakan sebagai perubahan terencana.
  regInfo.names.forEach(function (name) {
    if (baselineByName[name] || selfSet[name]) return;
    var cfg = plan[name] || null;
    if (cfg && cfg.allowNew) {
      reviewRequired.push({ code: "NEW_REGISTRY_FUNCTION_PLANNED", name: name, category: regInfo.categoryByName[name] || "", reason: cfg.reason });
      perubahanTerdeteksi.push(name);
    } else {
      blocker.push({ code: "NEW_REGISTRY_FUNCTION_UNEXPECTED", name: name, category: regInfo.categoryByName[name] || "" });
    }
  });

  // Nama yang direncanakan harus dapat dijelaskan terhadap baseline/registry.
  plannedNames.forEach(function (name) {
    if (baselineByName[name]) {
      var row = rowByName[name];
      if (row && row.matchArity && row.matchSource) {
        warnings.push({ code: "PLANNED_NAME_UNCHANGED", name: name, reason: plan[name].reason });
      }
      return;
    }
    if (!registrySet[name]) {
      blocker.push({ code: "PLANNED_NEW_FUNCTION_NOT_IN_REGISTRY", name: name, reason: plan[name].reason });
    } else if (!plan[name].allowNew && !selfSet[name]) {
      blocker.push({ code: "PLANNED_NEW_FUNCTION_ALLOW_NEW_FALSE", name: name, reason: plan[name].reason });
    }
  });

  // Bila ada perubahan kontrak bisnis terencana, APP_VERSION harus sudah dinaikkan.
  var adaPerubahanTerencanaNyata = reviewRequired.length > 0;
  if (adaPerubahanTerencanaNyata && appVersion === PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3) {
    blocker.push({ code: "APP_VERSION_NOT_BUMPED", baselineAppVersion: PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3, appVersion: appVersion });
  }

  var checksumCocok = snap.checksumAktif === PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3;
  if (!blocker.length && !reviewRequired.length && !checksumCocok) {
    blocker.push({ code: "CHECKSUM_CHANGED_WITHOUT_CLASSIFIED_DIFF", expected: PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3, actual: snap.checksumAktif });
  }

  var keputusan = blocker.length ? "BLOCK" : (reviewRequired.length ? "REVIEW_REQUIRED" : "ALLOW");
  var payloadFingerprint = {
    guardVersion: PORTAL_PREDEPLOY_GUARD_3B1B3_VERSION,
    appVersion: appVersion,
    baselineChecksum: PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3,
    activeChecksum: snap.checksumAktif,
    keputusan: keputusan,
    blocker: blocker,
    reviewRequired: reviewRequired,
    warnings: warnings
  };

  return {
    sukses: keputusan !== "BLOCK",
    valid: keputusan === "ALLOW",
    versi: PORTAL_PREDEPLOY_GUARD_3B1B3_VERSION,
    appVersion: appVersion,
    baselineAppVersion: PORTAL_PREDEPLOY_BASELINE_APP_VERSION_3B1B3,
    baselineTotal: PORTAL_PREDEPLOY_BASELINE_TOTAL_3B1B3,
    totalBindingAktif: snap.rows.filter(function (r) { return r.tersedia; }).length,
    checksumExpected: PORTAL_PREDEPLOY_BASELINE_CHECKSUM_3B1B3,
    checksumAktif: snap.checksumAktif,
    checksumCocok: checksumCocok,
    registryValid: !!struktur.valid,
    keputusan: keputusan,
    bolehDeploy: keputusan === "ALLOW",
    perluReviewManual: keputusan === "REVIEW_REQUIRED",
    blocker: blocker,
    reviewRequired: reviewRequired,
    warnings: warnings,
    perubahanTerdeteksi: perubahanTerdeteksi.filter(function (name, index, arr) { return arr.indexOf(name) === index; }),
    rencanaPerubahan: plannedNames.map(function (name) { return plan[name]; }),
    governanceToolsDikecualikan: PORTAL_PREDEPLOY_SELF_NAMES_3B1B3_.slice(),
    fingerprintGuard: buatFingerprintGuardPraDeploy3B1B3_(payloadFingerprint),
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
}

function validasiGuardKontrakPraDeploy3B1B3() {
  var maintainer = pastikanMaintainerPortal3B0_("VALIDASI_GUARD_KONTRAK_PRA_DEPLOY_3B1B3");
  var result = evaluasiGuardPraDeploy3B1B3_([]);
  result.maintainerAktif = String(maintainer || "");
  Logger.log(JSON.stringify({
    sukses: result.sukses,
    valid: result.valid,
    versi: result.versi,
    appVersion: result.appVersion,
    baselineTotal: result.baselineTotal,
    totalBindingAktif: result.totalBindingAktif,
    checksumCocok: result.checksumCocok,
    registryValid: result.registryValid,
    keputusan: result.keputusan,
    bolehDeploy: result.bolehDeploy,
    perluReviewManual: result.perluReviewManual,
    jumlahBlocker: result.blocker.length,
    jumlahReviewRequired: result.reviewRequired.length,
    blocker: result.blocker,
    reviewRequired: result.reviewRequired,
    warnings: result.warnings,
    fingerprintGuard: result.fingerprintGuard,
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  }, null, 2));
  return result;
}

function statusGuardKontrakPraDeploy3B1B3() {
  var maintainer = pastikanMaintainerPortal3B0_("STATUS_GUARD_KONTRAK_PRA_DEPLOY_3B1B3");
  var result = evaluasiGuardPraDeploy3B1B3_([]);
  var ringkas = {
    sukses: result.sukses,
    valid: result.valid,
    versi: result.versi,
    appVersion: result.appVersion,
    keputusan: result.keputusan,
    bolehDeploy: result.bolehDeploy,
    checksumCocok: result.checksumCocok,
    registryValid: result.registryValid,
    totalBindingAktif: result.totalBindingAktif,
    jumlahBlocker: result.blocker.length,
    jumlahReviewRequired: result.reviewRequired.length,
    fingerprintGuard: result.fingerprintGuard,
    maintainerAktif: String(maintainer || ""),
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(ringkas, null, 2));
  return ringkas;
}

function laporanGuardKontrakPraDeploy3B1B3() {
  var maintainer = pastikanMaintainerPortal3B0_("LAPORAN_GUARD_KONTRAK_PRA_DEPLOY_3B1B3");
  var result = evaluasiGuardPraDeploy3B1B3_([]);
  result.maintainerAktif = String(maintainer || "");
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Evaluasi kandidat patch dengan daftar perubahan yang memang direncanakan.
 *
 * Contoh source-only:
 *   evaluasiPerubahanTerencanaPraDeploy3B1B3([
 *     "ambilRiwayatKuPaged"
 *   ])
 *
 * Contoh arity berubah (harus eksplisit):
 *   evaluasiPerubahanTerencanaPraDeploy3B1B3([
 *     {name:"fungsiX", allowSourceChange:true, allowArityChange:true, reason:"Patch X"}
 *   ])
 *
 * Contoh public function baru (harus sudah dicatat di registry):
 *   {name:"fungsiBaru", allowNew:true, reason:"Patch X"}
 *
 * Fungsi ini tidak memberikan ALLOW otomatis untuk perubahan terencana.
 * Hasil yang benar untuk perubahan terencana adalah REVIEW_REQUIRED,
 * sehingga manusia tetap harus meninjau diff sebelum deployment.
 */
function evaluasiPerubahanTerencanaPraDeploy3B1B3(rencana) {
  var maintainer = pastikanMaintainerPortal3B0_("EVALUASI_PERUBAHAN_TERENCANA_PRA_DEPLOY_3B1B3");
  var result = evaluasiGuardPraDeploy3B1B3_(rencana);
  result.maintainerAktif = String(maintainer || "");
  Logger.log(JSON.stringify({
    sukses: result.sukses,
    valid: result.valid,
    versi: result.versi,
    appVersion: result.appVersion,
    keputusan: result.keputusan,
    bolehDeploy: result.bolehDeploy,
    perluReviewManual: result.perluReviewManual,
    checksumCocok: result.checksumCocok,
    perubahanTerdeteksi: result.perubahanTerdeteksi,
    rencanaPerubahan: result.rencanaPerubahan,
    blocker: result.blocker,
    reviewRequired: result.reviewRequired,
    warnings: result.warnings,
    fingerprintGuard: result.fingerprintGuard,
    targetDipanggil: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  }, null, 2));
  return result;
}

// ===== END TAHAP 3B-1B BATCH 3 =====
