// ============================================================
// TAHAP 3B-1B BATCH 1
// REGISTRY FUNGSI EKSPLISIT — RILIS KEBIJAKAN/PERFORMA 3C-4
// Baseline aplikasi terintegrasi: APP_VERSION 2026.10.03.03
// ============================================================

var PORTAL_FUNCTION_REGISTRY_3B1B1_VERSION =
  "3B1B1v-2026.10.03.03";

var PORTAL_FUNCTION_REGISTRY_3B1B1_ = {
  registryVersion: PORTAL_FUNCTION_REGISTRY_3B1B1_VERSION,
  baselineAppVersion: "2026.10.03.03",

  policy: {
    privateByDefault: true,
    privateSuffix: "_",
    publicRule:
      "Hanya nama yang tercantum dalam kategori public yang dianggap kontrak public resmi.",
    enforcement:
      "STRUCTURE_VALIDATION_AND_PREDEPLOY_GUARD",
    behaviorChanged: true,
    functionRemoved: false,
    featureFlagsChanged: false,
    governanceBaselineExclusion:
      "Kategori governanceToolsExcludedFromBaseline adalah tooling pra-deploy dan tidak mengubah snapshot kontrak binding aktif."
  },

  categories: {
    appsScriptTriggers: [
      "doGet",
      "prosesWorkflowReminderTerjadwalV10"
    ],

    frontendEndpoints: [
      "adminGantiPinPegawai",
      "ajukanTunjanganKeLurah",
      "akhiriSession",
      "ambilAuditKoreksiCutoffLama",
      "ambilConstantsAplikasi",
      "ambilDaftarPegawaiUntukAdmin",
      "ambilDashboardAdminKinerja",
      "ambilDiagnostikCakupanV02",
      "ambilDataRekapPaged",
      "ambilDetailPegawaiAdminKinerja",
      "ambilDetailRiwayatLaporan",
      "ambilDetailRiwayatLaporan3B04C",
      "ambilDetailRiwayatLaporan3B04C1",
      "ambilDetailRiwayatLaporan3B04C1c",
      "ambilDisposisiUntukLaporan",
      "ambilLaporanDitolakUntukRevisi",
      "ambilMetadataLampiranAdminLazy",
      "ambilOperationalHealthCenterV10",
      "ambilWorkflowReminderV10",
      "ambilExceptionActionCenterV10",
      "ambilReviewCenterAdminV10",
      "ambilMonthlyClosingV10",
      "ambilMonthlyArchiveV10",
      "buatArsipBulananV10",
      "verifikasiArsipBulananV10",
      "ambilRekapTunjanganBulanan",
      "ambilRingkasanDisposisiBaru",
      "ambilRiwayatKuPaged",
      "ambilRiwayatKuPaged3B04C",
      "ambilRiwayatKuPaged3B04C1",
      "ambilRiwayatKuPaged3B04C1b",
      "ambilRiwayatKuPaged3B04C1c",
      "ambilPengingatTutupPeriode3B04C1",
      "ambilKonfigurasiTutupPeriode3B04C1d1",
      "ambilStatusInputLaporanCutoff",
      "ambilStatusTutupPeriodeLaporan",
      "ambilTimelinePublik",
      "ambilTindakLanjutKoreksiCutoffLama",
      "batalkanDisposisiSurat",
      "bukaPeriodeLaporan",
      "cekCutoffDefaultLamaDinonaktifkan",
      "cekLogin",
      "cekSessionAktif",
      "cekNotifikasiLaporanWajib",
      "generateDraftTunjanganBulanan",
      "generateNarasiBulananAI",
      "getAppVersion",
      "getDashboardStats",
      "getDisposisiInboxData",
      "getDisposisiManagementBootstrap",
      "getDisposisiShellBootstrap",
      "getStatusAksesDisposisiModul",
      "kembalikanRekapTunjangan",
      "koreksiAdministratifTanggalPembayaranV10",
      "koreksiJenisDisposisi",
      "koreksiStatusCutoffLama",
      "kunciDraftTunjanganBulanan",
      "prosesReviewAdmin",
      "rapikanBahasaLaporanAI",
      "refreshDataPegawaiCache",
      "setujuiRekapTunjangan",
      "simpanCutoffInputLaporanPeriode",
      "simpanDataKinerja",
      "simpanDisposisiSurat",
      "simpanPetugasDisposisi",
      "simpanRevisiLaporanDitolakPegawai",
      "simpanTutupPeriodeLaporan",
      "tutupPeriodeMonthlyClosingV10",
      "tambahPenerimaDisposisi",
      "tandaiDisposisiSudahDibuka",
      "tandaiSudahDicairkan",
      "terapkanPoinKoreksiCutoffLama",
      "teruskanKeBendahara",
      "uploadBuktiKinerjaBlob",
      "uploadLampiranDisposisiBlob"
    ],

    maintenanceOwnerOnly: [
      "auditTarifTunjanganV03",
      "maintenanceRefreshMasterTunjanganV03",
      "auditMaintenanceOHICV101",
      "maintenanceRekonsiliasiQueueIndexV101",
      "maintenanceBersihkanMetadataBatchResiduV101",
      "maintenanceStatusPortal3B0",
      "maintenanceInitializeAppConstants3B0",
      "maintenanceSiapkanKolomKeamananPin3B0",
      "maintenanceSiapkanKolomDetailRekap3B0",
      "maintenancePerbaikiPeriodeTunjangan3B0",
      "statusMaintenanceAksesBuktiLama3C3",
      "maintenancePerbaikiAksesBuktiLama3C3",
      "maintenanceDiagnostikCacheDisposisi3B01",
      "maintenanceDiagnostikCacheDisposisi3B02",
      "statusTriggerWorkflowReminderV10",
      "pasangTriggerWorkflowReminderV10",
      "hapusTriggerWorkflowReminderV10",
      "statusRegistryFungsi3B1B1",
      "validasiRegistryFungsi3B1B1",
      "statusPenandaLewatPeriodeAdmin3B04B1",
      "aktifkanPenandaLewatPeriodeAdmin3B04B1",
      "nonaktifkanPenandaLewatPeriodeAdmin3B04B1",
      "statusPenandaLewatPeriodePegawai3B04C",
      "aktifkanPenandaLewatPeriodePegawai3B04C",
      "nonaktifkanPenandaLewatPeriodePegawai3B04C",
      "statusPatch3B04C1",
      "aktifkanPatch3B04C1",
      "nonaktifkanPatch3B04C1",
      "statusHotfix3B04C1a",
      "aktifkanHotfix3B04C1a",
      "nonaktifkanHotfix3B04C1a",
      "statusPenyempurnaanPeriodeReview3B04C1b",
      "aktifkanPenyempurnaanPeriodeReview3B04C1b",
      "nonaktifkanPenyempurnaanPeriodeReview3B04C1b",
      "statusHotfixPeriodeReview3B04C1c",
      "aktifkanHotfixPeriodeReview3B04C1c",
      "nonaktifkanHotfixPeriodeReview3B04C1c",
      "statusPresisiCutoff3B04C1d",
      "statusSinkronisasiFormPeriode3B04C1d1",
      "statusPosisiScrollReview3B04C1d2",
      "statusBindingAktif3B1B2",
      "snapshotKontrakFungsi3B1B2",
      "statusOptimasiReviewAdmin3C1",
      "aktifkanOptimasiReviewAdmin3C1",
      "nonaktifkanOptimasiReviewAdmin3C1",
      "aturPersentaseShadowOptimasiReviewAdmin3C1",
      "resetMetrikOptimasiReviewAdmin3C1",
      "guardTerencanaOptimasiReviewAdmin3C1",
      "statusOptimasiBuildReviewAdmin3C2",
      "aktifkanOptimasiBuildReviewAdmin3C2",
      "nonaktifkanOptimasiBuildReviewAdmin3C2",
      "aturShadow20OptimasiBuildReviewAdmin3C2",
      "resetMetrikOptimasiBuildReviewAdmin3C2",
      "guardTerencanaOptimasiBuildReviewAdmin3C2"
    ],

    governanceToolsExcludedFromBaseline: [
      "statusGuardKontrakPraDeploy3B1B3",
      "validasiGuardKontrakPraDeploy3B1B3",
      "laporanGuardKontrakPraDeploy3B1B3",
      "evaluasiPerubahanTerencanaPraDeploy3B1B3",
      "validasiConsistencyGuardTunjanganV01",
      "validasiCakupanTunjanganV02",
      "validasiTarifTunjanganV03",
      "validasiOperationalHealthV101",
      "validasiReviewCenterAdminV10",
      "validasiMonthlyClosingV10",
      "validasiMonthlyArchiveV10",
      "validasiTunjanganWorkflowDateBackfillV10",
      "validasiKoreksiAdministratifTanggalPembayaranV10",
      "validasiWorkflowReminderEscalationV10",
      "validasiExceptionActionCenterV10",
      "ambilFrontendIntegrityManifestV10",
      "validasiProductionSmokeFrontendV10",
      "validasiPreflightSeptember2026V01",
      "validasiLoadingPeriodeTunjanganV01",
      "validasiNativeXlsxTunjanganV01",
      "validasiPdfTunjanganV01"
    ],

    blockedCompatibilityStubs: [
      "initializeAppConstants",
      "siapkanKolomKeamananPinPegawai",
      "siapkanKolomDetailFormRekapKinerja",
      "perbaikiKolomPeriodeTunjangan",
      "logAudit",
      "logAI",
      "dapatkanAtauBuatFolder"
    ],

    manualDiagnostics: [
      "auditIndexLaporan2B0",
      "bangunUlangIndexLaporan2B0",
      "buatLaporanAuditIndexLaporan2B0",
      "validasiIndexLaporan2B0",

      "statusDualWriteIndexLaporan2B1",
      "ujiSinkronisasiBarisTerakhirIndexLaporan2B1",
      "aktifkanDualWriteIndexLaporan2B1",
      "nonaktifkanDualWriteIndexLaporan2B1",
      "validasiDualWriteIndexLaporan2B1",
      "prosesAntreanPerbaikanIndexLaporan2B1",

      "statusReadRiwayatIndex2B2A",
      "ujiReadRiwayatIndex2B2A",
      "validasiReadRiwayatIndex2B2A",
      "aktifkanReadRiwayatIndex2B2A",
      "nonaktifkanReadRiwayatIndex2B2A",
      "resetMetrikReadRiwayatIndex2B2A",

      "koreksiLaporanBlackoutCutoffApril2026",
      "koreksiLaporanLewatCutoffApril2026",
      "normalisasiStatusLewatCutoffLama",
      "prosesAntreanAI",
      "statusAuditLaporanLewatPeriode3B04A",
      "auditLaporanLewatPeriode3B04A",
      "auditLaporanLewatPeriodeJuli2026_3B04A",
      "ujiKlasifikasiLaporanLewatPeriode3B04A",
      "validasiAuditLaporanLewatPeriode3B04A",

      "statusPenandaLewatPeriodeAdmin3B04B",
      "validasiPenandaLewatPeriodeAdmin3B04B",
      "validasiPenandaLewatPeriodeAdmin3B04B1",
      "validasiPenandaLewatPeriodePegawai3B04C",
      "validasiPatch3B04C1",
      "validasiPenandaLewatPeriodePegawai3B04C1",
      "validasiSerialisasiRespons3B04C1a",
      "validasiHotfix3B04C1a",
      "validasiPenyempurnaanPeriodeReview3B04C1b",
      "validasiHotfixPeriodeReview3B04C1c",
      "validasiPresisiCutoff3B04C1d",
      "validasiSinkronisasiFormPeriode3B04C1d1",
      "validasiPosisiScrollReview3B04C1d2",
      "validasiOptimasiReviewAdmin3C1",
      "validasiOptimasiBuildReviewAdmin3C2",
      "validasiBindingAktif3B1B2",
      "cekKontrakFungsi3B1B2"
    ],

    legacyPublicCompatibility: [
      "ambilDaftarPegawaiReviewAdmin",
      "ambilLaporanAdminPerPegawai",
      "ambilLaporanAdminPerPegawai3B04B",
      "ambilLaporanAdminPerPegawai3B04B1",
      "ambilLaporanAdminPerPegawai3B04C1b",
      "ambilLaporanAdminPerPegawai3B04C1c",
      "ambilLaporanAdminPerPegawai3C1",
      "ambilSemuaLaporanAdmin",
      "ambilDaftarPegawaiAktifUntukDisposisi",
      "ambilRiwayatKu",
      "getDisposisiBootstrap",
      "cariLogErrorSubmitKinerjaV33",
      "debugPeriodeTutupDariTanggalPelaksanaanV31"
    ]
  }
};


/**
 * Menghasilkan salinan registry agar object sumber tidak dimodifikasi
 * oleh fungsi pemeriksaan atau pemanggilan manual.
 */
function salinRegistryFungsi3B1B1_() {
  return JSON.parse(
    JSON.stringify(PORTAL_FUNCTION_REGISTRY_3B1B1_)
  );
}


/**
 * Memeriksa struktur registry saja.
 *
 * Tidak memanggil endpoint produksi, tidak membaca Spreadsheet,
 * tidak menulis Properties, dan tidak mengubah feature flag.
 */
function validasiStrukturRegistryFungsi3B1B1_() {
  var registry = salinRegistryFungsi3B1B1_();
  var categories = registry.categories || {};
  var seen = {};
  var counts = {};
  var duplicateNames = [];
  var invalidNames = [];
  var emptyCategories = [];

  Object.keys(categories).forEach(function (categoryName) {
    var list = categories[categoryName];

    if (!Array.isArray(list)) {
      invalidNames.push({
        category: categoryName,
        name: "",
        reason: "CATEGORY_NOT_ARRAY"
      });
      counts[categoryName] = 0;
      return;
    }

    counts[categoryName] = list.length;

    if (!list.length) {
      emptyCategories.push(categoryName);
    }

    list.forEach(function (functionName) {
      var name = String(functionName || "").trim();

      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        invalidNames.push({
          category: categoryName,
          name: name,
          reason: "INVALID_FUNCTION_NAME"
        });
        return;
      }

      if (seen[name]) {
        duplicateNames.push({
          name: name,
          firstCategory: seen[name],
          duplicateCategory: categoryName
        });
      } else {
        seen[name] = categoryName;
      }
    });
  });

  var totalNames = Object.keys(seen).length;
  var valid =
    duplicateNames.length === 0 &&
    invalidNames.length === 0 &&
    emptyCategories.length === 0;

  return {
    sukses: true,
    valid: valid,
    registryVersion: registry.registryVersion,
    baselineAppVersion: registry.baselineAppVersion,
    totalNamaUnik: totalNames,
    counts: counts,
    duplicateNames: duplicateNames,
    invalidNames: invalidNames,
    emptyCategories: emptyCategories,
    behaviorChanged: registry.policy.behaviorChanged === true,
    functionRemoved: registry.policy.functionRemoved === true,
    featureFlagsChanged: registry.policy.featureFlagsChanged === true
  };
}


/**
 * Status ringkas Batch 1.
 *
 * Owner/maintainer only. Fungsi ini bersifat read-only.
 */
function statusRegistryFungsi3B1B1() {
  var maintainer = pastikanMaintainerPortal3B0_(
    "STATUS_REGISTRY_FUNGSI_3B1B1"
  );

  var validation = validasiStrukturRegistryFungsi3B1B1_();

  var result = {
    sukses: validation.valid,
    versi: PORTAL_FUNCTION_REGISTRY_3B1B1_VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    maintainerAktif: String(maintainer || ""),
    registryValid: validation.valid,
    totalNamaUnik: validation.totalNamaUnik,
    counts: validation.counts,
    policy: salinRegistryFungsi3B1B1_().policy,
    pesan: validation.valid
      ? "Registry fungsi Tahap 3B-1B Batch 1 valid dan bersifat dokumentasi saja."
      : "Registry memiliki duplikasi atau nama yang tidak valid."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


/**
 * Validasi lengkap registry.
 *
 * Owner/maintainer only. Tidak memanggil fungsi yang terdaftar,
 * sehingga tidak menimbulkan efek samping produksi.
 */
function validasiRegistryFungsi3B1B1() {
  var maintainer = pastikanMaintainerPortal3B0_(
    "VALIDASI_REGISTRY_FUNGSI_3B1B1"
  );

  var result = validasiStrukturRegistryFungsi3B1B1_();
  result.maintainerAktif = String(maintainer || "");
  result.pesan = result.valid
    ? "Registry 3B-1B Batch 1 lulus validasi struktur."
    : "Registry 3B-1B Batch 1 belum valid.";

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END TAHAP 3B-1B BATCH 1 =====
