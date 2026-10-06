// ============================================================
// PRODUCTION SMOKE & FRONTEND INTEGRITY GUARD v1.0
// Kandidat APP_VERSION 2026.10.05.01 — BDR v1.0 RC1 read-only integration
//
// READ-ONLY:
// - tidak membaca/menulis Spreadsheet;
// - tidak mengubah session, poin, status review, tunjangan, atau schema;
// - manifest publik hanya berisi metadata build non-sensitif.
// ============================================================

var PORTAL_FRONTEND_INTEGRITY_V10_VERSION = "PSFIG-v1.0-2026.10.05.01";
var PORTAL_FRONTEND_INTEGRITY_APP_VERSION_V10 = "2026.10.05.01";
var PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10 = "PSFIG-2026.10.05.01-423da779a13c";
var PORTAL_FRONTEND_INTEGRITY_FINGERPRINT_V10 = "423da779a13c8d7fa73c418a06ad85aa5a2e88863c9d2b41c8f6b04cecac8493";

var PORTAL_FRONTEND_CRITICAL_DOM_IDS_V10_ = [
  "halamanLogin", "aplikasiUtama", "inputUsername", "inputPin", "btnLogin", "pesanLogin",
  "menuNavigasi", "judulHal", "halDash", "halTimeline", "halDisposisi", "halInput",
  "halRiwayat", "halRekap", "halTunjangan", "halReviewCenter", "halAdminKinerja",
  "halMonthlyClosing", "halMonthlyArchive", "halOperationalHealth", "menuReviewCenter", "menuMonthlyClosing", "menuMonthlyArchive", "menuAdminKinerja", "menuOperationalHealth",
  "btnKoreksiTanggalPembayaran", "modalKoreksiTanggalPembayaran", "halWorkflowReminder", "menuWorkflowReminder", "workflowReminderBadgeV10",
  "halExceptionActionCenter", "menuExceptionActionCenter", "exceptionActionBadgeV10", "exceptionActionNoticeV10", "exceptionActionSummaryV10", "exceptionActionMineV10", "exceptionActionMonitoringV10", "exceptionActionListV10",
  "halExecutiveDashboard", "menuExecutiveDashboard", "executiveDashboardNoticeV10", "executiveDashboardSummaryV10", "execDashTrendV10", "execDashReviewEfficiencyV10", "execDashAllowanceTrendV10", "execDashAttentionV10", "execDashCycleV10", "execDashEacCountsV10",
  "halBackupRecovery", "menuBackupRecovery", "backupRecoveryRefreshV10", "backupRecoveryNoticeV10", "backupRecoverySummaryV10", "backupRecoveryPointsV10", "bdrRpoV10", "bdrSchedulerV10", "bdrSourceV10", "bdrEvidenceV10"
];

var PORTAL_FRONTEND_CRITICAL_FUNCTIONS_V10_ = [
  "prosesLogin", "prosesLogout", "aktifkanPortalSetelahSesiValid_", "aturMenuRoleVisibility",
  "bukaHalaman", "muatDashboard", "muatTimeline", "muatRiwayat", "muatRekap", "muatTunjangan",
  "muatReviewCenterAdminV10", "muatDashboardAdminKinerja", "muatOperationalHealthV10", "muatMonthlyClosingV10", "muatMonthlyArchiveV10",
  "userIsAdminUtama", "terapkanAksesDisposisiDariSesi_", "koreksiAdministratifTanggalPembayaranUI_", "simpanKoreksiTanggalPembayaranUI_",
  "muatWorkflowReminderV10", "mulaiMonitorWorkflowReminderV10_", "muatExceptionActionCenterV10", "mulaiMonitorExceptionActionV10_", "muatExecutiveDashboardV10", "muatBackupRecoveryV10"
];

var PORTAL_FRONTEND_ROUTE_TARGETS_V10_ = [
  "halDash", "halTimeline", "halDisposisi", "halInput", "halRiwayat", "halRekap",
  "halTunjangan", "halReviewCenter", "halMonthlyClosing", "halMonthlyArchive", "halWorkflowReminder", "halExceptionActionCenter", "halExecutiveDashboard", "halBackupRecovery", "halAdminKinerja", "halOperationalHealth"
];

var PORTAL_FRONTEND_FORBIDDEN_LEGACY_IDS_V10_ = ["menuAdmin", "halAdmin"];

var PORTAL_FRONTEND_STATIC_ATTESTATION_V10_ = {
  appVersion: "2026.10.05.01",
  buildId: "PSFIG-2026.10.05.01-423da779a13c",
  fingerprint: "423da779a13c8d7fa73c418a06ad85aa5a2e88863c9d2b41c8f6b04cecac8493",
  staticAuditPassed: true,
  unexpectedMissingDomRefs: 0,
  missingCriticalDom: 0,
  missingCriticalFunctions: 0,
  missingRouteTargets: 0,
  forbiddenLegacyRefs: 0,
  inlineScriptCompileErrors: 0,
  sourceGeneratedAt: "2026-10-06"
};

function validasiBuildAttestationFrontendV10_() {
  var a = PORTAL_FRONTEND_STATIC_ATTESTATION_V10_ || {};
  var issues = [];
  var appVersion = typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "";
  if (appVersion !== PORTAL_FRONTEND_INTEGRITY_APP_VERSION_V10) issues.push("APP_VERSION_MISMATCH");
  if (String(a.appVersion || "") !== PORTAL_FRONTEND_INTEGRITY_APP_VERSION_V10) issues.push("ATTESTATION_APP_VERSION_MISMATCH");
  if (String(a.buildId || "") !== PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10) issues.push("BUILD_ID_MISMATCH");
  if (String(a.fingerprint || "") !== PORTAL_FRONTEND_INTEGRITY_FINGERPRINT_V10) issues.push("FINGERPRINT_MISMATCH");
  if (a.staticAuditPassed !== true) issues.push("STATIC_AUDIT_NOT_PASSED");
  ["unexpectedMissingDomRefs","missingCriticalDom","missingCriticalFunctions","missingRouteTargets","forbiddenLegacyRefs","inlineScriptCompileErrors"].forEach(function (key) {
    if (Number(a[key] || 0) !== 0) issues.push(String(key).toUpperCase());
  });
  return {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: PORTAL_FRONTEND_INTEGRITY_V10_VERSION,
    appVersion: appVersion,
    buildId: PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10,
    fingerprint: PORTAL_FRONTEND_INTEGRITY_FINGERPRINT_V10,
    issues: issues,
    staticAudit: JSON.parse(JSON.stringify(a)),
    dataDiubah: false,
    schemaDiubah: false
  };
}

function ambilFrontendIntegrityManifestV10() {
  var build = validasiBuildAttestationFrontendV10_();
  return {
    sukses: build.valid,
    versi: PORTAL_FRONTEND_INTEGRITY_V10_VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    buildId: PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10,
    fingerprint: PORTAL_FRONTEND_INTEGRITY_FINGERPRINT_V10,
    criticalDomIds: PORTAL_FRONTEND_CRITICAL_DOM_IDS_V10_.slice(),
    criticalFunctions: PORTAL_FRONTEND_CRITICAL_FUNCTIONS_V10_.slice(),
    routeTargets: PORTAL_FRONTEND_ROUTE_TARGETS_V10_.slice(),
    forbiddenLegacyIds: PORTAL_FRONTEND_FORBIDDEN_LEGACY_IDS_V10_.slice(),
    staticAuditPassed: build.valid,
    issues: build.issues.slice(),
    readOnly: true
  };
}

function validasiProductionSmokeFrontendV10() {
  var maintainer = pastikanMaintainerPortal3B0_("VALIDASI_PRODUCTION_SMOKE_FRONTEND_V10");
  var checks = [];
  function add_(name, pass, detail) {
    checks.push({ nama: name, lulus: pass === true, detail: detail || "" });
  }

  var build = validasiBuildAttestationFrontendV10_();
  add_("APP_VERSION", String(APP_VERSION || "") === PORTAL_FRONTEND_INTEGRITY_APP_VERSION_V10, String(APP_VERSION || ""));
  add_("STATIC_BUILD_ATTESTATION", build.valid, build.issues.join(", "));

  var struktur = typeof validasiStrukturRegistryFungsi3B1B1_ === "function" ? validasiStrukturRegistryFungsi3B1B1_() : { valid:false };
  add_("FUNCTION_REGISTRY", struktur.valid === true, struktur.valid ? "valid" : "invalid");

  var snap = typeof bangunSnapshotKontrakAktif3B1B2_ === "function" ? bangunSnapshotKontrakAktif3B1B2_() : { rows:[], checksumAktif:"" };
  var bindingOk = snap.rows.length === 204 && snap.rows.every(function (r) { return r.match === true; }) && String(snap.checksumAktif || "") === String(PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_ || "");
  add_("BUSINESS_BINDING_204", bindingOk, snap.rows.length + "/204");

  var backendNames = ["cekLogin","cekSessionAktif","getAppVersion","ambilReviewCenterAdminV10","ambilOperationalHealthCenterV10","ambilMonthlyClosingV10","tutupPeriodeMonthlyClosingV10","ambilMonthlyArchiveV10","buatArsipBulananV10","verifikasiArsipBulananV10","prosesReviewAdmin","ambilWorkflowReminderV10","ambilExceptionActionCenterV10","ambilExecutiveDashboardV10","ambilBackupRecoveryCenterV10"];
  var missingBackend = backendNames.filter(function (name) { return typeof resolveBindingFungsi3B1B2_ === "function" ? !resolveBindingFungsi3B1B2_(name) : true; });
  add_("CRITICAL_BACKEND_FUNCTIONS", missingBackend.length === 0, missingBackend.join(", "));

  var guard = typeof evaluasiGuardPraDeploy3B1B3_ === "function" ? evaluasiGuardPraDeploy3B1B3_([]) : { keputusan:"BLOCK", blocker:["GUARD_UNAVAILABLE"] };
  add_("PREDEPLOY_GUARD", guard.keputusan === "ALLOW", guard.keputusan || "BLOCK");

  var manifest = ambilFrontendIntegrityManifestV10();
  add_("RUNTIME_MANIFEST", manifest.sukses === true && manifest.buildId === PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10, manifest.buildId || "");

  var gagal = checks.filter(function (c) { return !c.lulus; });
  var result = {
    sukses: gagal.length === 0,
    valid: gagal.length === 0,
    versi: PORTAL_FRONTEND_INTEGRITY_V10_VERSION,
    appVersion: String(APP_VERSION || ""),
    buildId: PORTAL_FRONTEND_INTEGRITY_BUILD_ID_V10,
    fingerprint: PORTAL_FRONTEND_INTEGRITY_FINGERPRINT_V10,
    lulus: checks.length - gagal.length,
    gagal: gagal.length,
    total: checks.length,
    checks: checks,
    keputusan: gagal.length ? "BLOCK" : "ALLOW",
    bolehDeploy: gagal.length === 0,
    maintainerAktif: String(maintainer || ""),
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END PRODUCTION SMOKE & FRONTEND INTEGRITY GUARD v1.0 =====
