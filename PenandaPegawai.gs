// ============================================================
// PATCH 3B-0.4C
// PENANDA LEWAT PERIODE PADA AKUN PEGAWAI
//
// Baseline produksi : APP_VERSION 2026.08.03.01
// Target aplikasi   : APP_VERSION 2026.08.03.02
// Sifat patch       : informatif, feature flag, fallback otomatis
//
// Patch ini TIDAK:
// - mengubah status review;
// - mengubah poin;
// - mengubah Rekap_Kinerja atau sheet lain;
// - mengubah aturan boleh/tidaknya revisi;
// - membuat kolom atau sheet baru.
// ============================================================

var PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C = {
  VERSION: "3B04C-2026.08.03.01",
  PROPERTY:
    "PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C_ENABLED"
};


function salinObject3B04C_(source) {
  var result = {};
  source = source || {};

  Object.keys(source).forEach(function (key) {
    result[key] = source[key];
  });

  return result;
}


function penandaLewatPeriodePegawaiAktif3B04C_() {
  var raw = PropertiesService
    .getScriptProperties()
    .getProperty(
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.PROPERTY
    );

  return String(raw || "")
    .trim()
    .toLowerCase() === "true";
}


function metadataKetepatanDefaultPegawai3B04C_() {
  return {
    lewatPeriode: false,
    jenisKetepatan: "TEPAT_WAKTU"
  };
}


function gabungkanMetadataPegawai3B04C_(
  item,
  metadataMap
) {
  var enriched = salinObject3B04C_(item);
  var id = String(
    enriched.idLaporan || ""
  ).trim();

  var metadata =
    (metadataMap && metadataMap[id]) ||
    metadataKetepatanDefaultPegawai3B04C_();

  Object.keys(metadata).forEach(function (key) {
    enriched[key] = metadata[key];
  });

  return enriched;
}


function perkayaDaftarRiwayatPegawai3B04C_(items) {
  items = Array.isArray(items) ? items : [];

  var ids = items
    .map(function (item) {
      return String(
        (item && item.idLaporan) || ""
      ).trim();
    })
    .filter(function (id) {
      return !!id;
    });

  var metadataMap = ids.length
    ? buatMetadataKetepatanById3B04B_(ids)
    : {};

  return items.map(function (item) {
    return gabungkanMetadataPegawai3B04C_(
      item,
      metadataMap
    );
  });
}


function tambahStatusPatchPegawai3B04C_(
  response,
  options
) {
  options = options || {};
  response = response || {
    sukses: false,
    pesan: "Respons Riwayat Pegawai tidak tersedia."
  };

  response.patch3B04C = {
    versi:
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.VERSION,
    aktif: options.aktif === true,
    configuredAktif:
      options.configuredAktif === true,
    fallback: options.fallback === true,
    fallbackReason: String(
      options.fallbackReason || ""
    ),
    sourceEndpoint: String(
      options.sourceEndpoint || ""
    ),
    itemsDiperkaya: Math.max(
      0,
      Number(options.itemsDiperkaya) || 0
    ),
    hanyaInformasi: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };

  return response;
}


/**
 * Endpoint aman untuk daftar Riwayat Pegawai.
 *
 * - Selalu memakai endpoint produksi ambilRiwayatKuPaged sebagai sumber.
 * - Metadata lewat periode hanya ditambahkan ketika flag aktif.
 * - Jika pengayaan gagal, respons lama tetap dikembalikan.
 */
function ambilRiwayatKuPaged3B04C(params, token) {
  var configuredAktif =
    penandaLewatPeriodePegawaiAktif3B04C_();

  var baseResponse = null;

  try {
    baseResponse = ambilRiwayatKuPaged(
      params,
      token
    );
  } catch (baseError) {
    return tambahStatusPatchPegawai3B04C_(
      {
        sukses: false,
        pesan:
          "Gagal memuat riwayat laporan.",
        items: [],
        total: 0,
        hasMore: false
      },
      {
        configuredAktif: configuredAktif,
        fallback: false,
        fallbackReason:
          baseError && baseError.message
            ? String(baseError.message)
            : String(baseError),
        sourceEndpoint:
          "ambilRiwayatKuPaged"
      }
    );
  }

  if (
    !baseResponse ||
    baseResponse.sukses === false ||
    !configuredAktif
  ) {
    return tambahStatusPatchPegawai3B04C_(
      baseResponse,
      {
        aktif: false,
        configuredAktif: configuredAktif,
        fallback: false,
        fallbackReason:
          baseResponse &&
          baseResponse.sukses === false
            ? "BASE_ENDPOINT_FAILED"
            : "",
        sourceEndpoint:
          "ambilRiwayatKuPaged"
      }
    );
  }

  try {
    var result = salinObject3B04C_(
      baseResponse
    );

    result.items =
      perkayaDaftarRiwayatPegawai3B04C_(
        baseResponse.items
      );

    return tambahStatusPatchPegawai3B04C_(
      result,
      {
        aktif: true,
        configuredAktif: true,
        fallback: false,
        sourceEndpoint:
          "ambilRiwayatKuPaged",
        itemsDiperkaya: result.items.length
      }
    );
  } catch (enrichmentError) {
    return tambahStatusPatchPegawai3B04C_(
      baseResponse,
      {
        aktif: false,
        configuredAktif: true,
        fallback: true,
        fallbackReason:
          enrichmentError &&
          enrichmentError.message
            ? String(enrichmentError.message)
            : String(enrichmentError),
        sourceEndpoint:
          "ambilRiwayatKuPaged"
      }
    );
  }
}


/**
 * Endpoint aman untuk Detail Riwayat Pegawai.
 */
function ambilDetailRiwayatLaporan3B04C(
  idLaporan,
  token
) {
  var configuredAktif =
    penandaLewatPeriodePegawaiAktif3B04C_();

  var baseResponse = null;

  try {
    baseResponse =
      ambilDetailRiwayatLaporan(
        idLaporan,
        token
      );
  } catch (baseError) {
    return tambahStatusPatchPegawai3B04C_(
      {
        sukses: false,
        pesan:
          "Gagal memuat detail laporan."
      },
      {
        configuredAktif: configuredAktif,
        fallback: false,
        fallbackReason:
          baseError && baseError.message
            ? String(baseError.message)
            : String(baseError),
        sourceEndpoint:
          "ambilDetailRiwayatLaporan"
      }
    );
  }

  if (
    !baseResponse ||
    baseResponse.sukses === false ||
    !baseResponse.data ||
    !configuredAktif
  ) {
    return tambahStatusPatchPegawai3B04C_(
      baseResponse,
      {
        aktif: false,
        configuredAktif: configuredAktif,
        fallback: false,
        fallbackReason:
          baseResponse &&
          baseResponse.sukses === false
            ? "BASE_ENDPOINT_FAILED"
            : "",
        sourceEndpoint:
          "ambilDetailRiwayatLaporan"
      }
    );
  }

  try {
    var result = salinObject3B04C_(
      baseResponse
    );

    var detailId = String(
      baseResponse.data.idLaporan ||
      idLaporan ||
      ""
    ).trim();

    var metadataMap = detailId
      ? buatMetadataKetepatanById3B04B_(
          [detailId]
        )
      : {};

    result.data =
      gabungkanMetadataPegawai3B04C_(
        baseResponse.data,
        metadataMap
      );

    return tambahStatusPatchPegawai3B04C_(
      result,
      {
        aktif: true,
        configuredAktif: true,
        fallback: false,
        sourceEndpoint:
          "ambilDetailRiwayatLaporan",
        itemsDiperkaya: 1
      }
    );
  } catch (enrichmentError) {
    return tambahStatusPatchPegawai3B04C_(
      baseResponse,
      {
        aktif: false,
        configuredAktif: true,
        fallback: true,
        fallbackReason:
          enrichmentError &&
          enrichmentError.message
            ? String(enrichmentError.message)
            : String(enrichmentError),
        sourceEndpoint:
          "ambilDetailRiwayatLaporan"
      }
    );
  }
}


function statusPenandaLewatPeriodePegawai3B04C() {
  pastikanMaintainerPortal3B0_(
    "STATUS_PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C"
  );

  var result = {
    sukses: true,
    versi:
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    aktif:
      penandaLewatPeriodePegawaiAktif3B04C_(),
    endpointRiwayatTersedia:
      typeof ambilRiwayatKuPaged ===
      "function",
    endpointDetailTersedia:
      typeof ambilDetailRiwayatLaporan ===
      "function",
    backendMetadataTersedia:
      typeof buatMetadataKetepatanById3B04B_ ===
      "function",
    defaultAman: true,
    fallbackOtomatis: true,
    hanyaInformasi: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    pesan:
      "Penanda Riwayat Pegawai 3B-0.4C menggunakan feature flag dan fallback otomatis."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiPenandaLewatPeriodePegawai3B04C() {
  pastikanMaintainerPortal3B0_(
    "VALIDASI_PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C"
  );

  var endpointRiwayat =
    typeof ambilRiwayatKuPaged ===
    "function";

  var endpointDetail =
    typeof ambilDetailRiwayatLaporan ===
    "function";

  var backendMetadata =
    typeof buatMetadataKetepatanById3B04B_ ===
    "function";

  var adminValidation = null;

  try {
    adminValidation =
      typeof validasiPenandaLewatPeriodeAdmin3B04B1 ===
      "function"
        ? validasiPenandaLewatPeriodeAdmin3B04B1()
        : null;
  } catch (adminValidationError) {
    adminValidation = {
      valid: false,
      sukses: false,
      pesan:
        adminValidationError &&
        adminValidationError.message
          ? String(adminValidationError.message)
          : String(adminValidationError)
    };
  }

  var sample = gabungkanMetadataPegawai3B04C_(
    {
      idLaporan: "TEST-3B04C",
      status: "Disetujui",
      poinFinal: 10
    },
    {
      "TEST-3B04C": {
        lewatPeriode: true,
        jenisKetepatan:
          "SUBMIT_SETELAH_CUTOFF",
        periode: "2026-07",
        periodeLabel: "Juli 2026",
        pesanKetepatan:
          "Laporan dikirim setelah batas akhir periode Juli 2026."
      }
    }
  );

  var mergeValid =
    sample.lewatPeriode === true &&
    sample.status === "Disetujui" &&
    Number(sample.poinFinal) === 10;

  var adminValid =
    !!adminValidation &&
    adminValidation.valid === true;

  var valid =
    endpointRiwayat &&
    endpointDetail &&
    backendMetadata &&
    adminValid &&
    mergeValid;

  var issues = [];

  if (!endpointRiwayat) {
    issues.push(
      "Endpoint ambilRiwayatKuPaged tidak tersedia."
    );
  }

  if (!endpointDetail) {
    issues.push(
      "Endpoint ambilDetailRiwayatLaporan tidak tersedia."
    );
  }

  if (!backendMetadata) {
    issues.push(
      "Backend metadata 3B-0.4B tidak tersedia."
    );
  }

  if (!adminValid) {
    issues.push(
      "Validasi backend 3B-0.4A/3B-0.4B1 belum lulus."
    );
  }

  if (!mergeValid) {
    issues.push(
      "Penggabungan metadata mengubah status atau poin."
    );
  }

  var result = {
    sukses: valid,
    valid: valid,
    versi:
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.VERSION,
    endpointRiwayatTersedia:
      endpointRiwayat,
    endpointDetailTersedia:
      endpointDetail,
    backendMetadataTersedia:
      backendMetadata,
    adminBackendValid: adminValid,
    mergeMetadataValid: mergeValid,
    aktif:
      penandaLewatPeriodePegawaiAktif3B04C_(),
    fallbackOtomatis: true,
    hanyaInformasi: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanPenandaLewatPeriodePegawai3B04C() {
  pastikanMaintainerPortal3B0_(
    "AKTIFKAN_PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C"
  );

  var validation =
    validasiPenandaLewatPeriodePegawai3B04C();

  if (!validation.valid) {
    return {
      sukses: false,
      aktif: false,
      validation: validation,
      pesan:
        "Feature tidak diaktifkan karena validasi belum lulus."
    };
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.PROPERTY,
      "true"
    );

  var result =
    statusPenandaLewatPeriodePegawai3B04C();

  result.pesan =
    "Penanda lewat periode pada akun pegawai telah diaktifkan.";

  return result;
}


function nonaktifkanPenandaLewatPeriodePegawai3B04C() {
  pastikanMaintainerPortal3B0_(
    "NONAKTIFKAN_PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C"
  );

  PropertiesService
    .getScriptProperties()
    .setProperty(
      PENANDA_LEWAT_PERIODE_PEGAWAI_3B04C.PROPERTY,
      "false"
    );

  var result =
    statusPenandaLewatPeriodePegawai3B04C();

  result.pesan =
    "Penanda lewat periode akun pegawai dinonaktifkan; Riwayat kembali ke tampilan lama.";

  return result;
}

// ===== END PATCH 3B-0.4C =====


// ============================================================
// PATCH 3B-0.4C1
// PENANDA LEWAT PERIODE + PERIODE REVIEW PADA AKUN PEGAWAI
//
// Menggunakan metadata dari SinkronisasiCutoffPeriode.gs.
// Feature flag C1 terpisah dari flag 3B-0.4C agar rollback aman.
// ============================================================

function gabungkanMetadataPegawai3B04C1_(item, metadataMap) {
  var enriched = salinObject3B04C1_(item || {});
  var id = String(enriched.idLaporan || "").trim();
  var metadata = metadataMap && metadataMap[id]
    ? metadataMap[id]
    : metadataDefaultPengalihan3B04C1_();

  Object.keys(metadata).forEach(function (key) {
    enriched[key] = metadata[key];
  });

  return enriched;
}


function perkayaDaftarRiwayatPegawai3B04C1_(items) {
  items = Array.isArray(items) ? items : [];
  var ids = items.map(function (item) {
    return String((item && item.idLaporan) || "").trim();
  }).filter(function (id) {
    return !!id;
  });

  var metadataMap = ids.length
    ? buatMetadataPengalihanById3B04C1_(ids)
    : {};

  return items.map(function (item) {
    return gabungkanMetadataPegawai3B04C1_(item, metadataMap);
  });
}


function tambahStatusPatchPegawai3B04C1_(response, options) {
  options = options || {};
  response = response || {
    sukses: false,
    pesan: "Respons Riwayat Pegawai tidak tersedia."
  };

  response.patch3B04C1 = {
    versi: SINKRONISASI_CUTOFF_PERIODE_3B04C1.VERSION,
    aktif: options.aktif === true,
    configuredAktif: options.configuredAktif === true,
    fallback: options.fallback === true,
    fallbackReason: String(options.fallbackReason || ""),
    sourceEndpoint: String(options.sourceEndpoint || ""),
    itemsDiperkaya: Math.max(0, Number(options.itemsDiperkaya) || 0),
    cutoffManual: true,
    pengalihanPeriodeReview: true,
    badgeRiwayatPegawai: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };

  return response;
}


function ambilRiwayatKuPaged3B04C1(params, token) {
  var configuredAktif = sinkronisasiCutoffPeriodeAktif3B04C1_();
  var baseResponse = null;

  try {
    baseResponse = ambilRiwayatKuPaged(params, token);
  } catch (baseError) {
    return tambahStatusPatchPegawai3B04C1_(
      {
        sukses: false,
        pesan: "Gagal memuat riwayat laporan.",
        items: [],
        total: 0,
        hasMore: false
      },
      {
        configuredAktif: configuredAktif,
        fallbackReason: baseError && baseError.message
          ? String(baseError.message)
          : String(baseError),
        sourceEndpoint: "ambilRiwayatKuPaged"
      }
    );
  }

  if (!baseResponse || baseResponse.sukses === false || !configuredAktif) {
    return tambahStatusPatchPegawai3B04C1_(baseResponse, {
      aktif: false,
      configuredAktif: configuredAktif,
      fallback: false,
      fallbackReason: baseResponse && baseResponse.sukses === false
        ? "BASE_ENDPOINT_FAILED"
        : "",
      sourceEndpoint: "ambilRiwayatKuPaged"
    });
  }

  try {
    var result = salinObject3B04C1_(baseResponse);
    result.items = perkayaDaftarRiwayatPegawai3B04C1_(baseResponse.items);

    return tambahStatusPatchPegawai3B04C1_(result, {
      aktif: true,
      configuredAktif: true,
      fallback: false,
      sourceEndpoint: "ambilRiwayatKuPaged",
      itemsDiperkaya: result.items.length
    });
  } catch (enrichmentError) {
    return tambahStatusPatchPegawai3B04C1_(baseResponse, {
      aktif: false,
      configuredAktif: true,
      fallback: true,
      fallbackReason: enrichmentError && enrichmentError.message
        ? String(enrichmentError.message)
        : String(enrichmentError),
      sourceEndpoint: "ambilRiwayatKuPaged"
    });
  }
}


function ambilDetailRiwayatLaporan3B04C1(idLaporan, token) {
  var configuredAktif = sinkronisasiCutoffPeriodeAktif3B04C1_();
  var baseResponse = null;

  try {
    baseResponse = ambilDetailRiwayatLaporan(idLaporan, token);
  } catch (baseError) {
    return tambahStatusPatchPegawai3B04C1_(
      { sukses: false, pesan: "Gagal memuat detail laporan." },
      {
        configuredAktif: configuredAktif,
        fallbackReason: baseError && baseError.message
          ? String(baseError.message)
          : String(baseError),
        sourceEndpoint: "ambilDetailRiwayatLaporan"
      }
    );
  }

  if (
    !baseResponse ||
    baseResponse.sukses === false ||
    !baseResponse.data ||
    !configuredAktif
  ) {
    return tambahStatusPatchPegawai3B04C1_(baseResponse, {
      aktif: false,
      configuredAktif: configuredAktif,
      fallback: false,
      fallbackReason: baseResponse && baseResponse.sukses === false
        ? "BASE_ENDPOINT_FAILED"
        : "",
      sourceEndpoint: "ambilDetailRiwayatLaporan"
    });
  }

  try {
    var result = salinObject3B04C1_(baseResponse);
    var detailId = String(
      baseResponse.data.idLaporan || idLaporan || ""
    ).trim();
    var metadataMap = detailId
      ? buatMetadataPengalihanById3B04C1_([detailId])
      : {};

    result.data = gabungkanMetadataPegawai3B04C1_(
      baseResponse.data,
      metadataMap
    );

    return tambahStatusPatchPegawai3B04C1_(result, {
      aktif: true,
      configuredAktif: true,
      fallback: false,
      sourceEndpoint: "ambilDetailRiwayatLaporan",
      itemsDiperkaya: 1
    });
  } catch (enrichmentError) {
    return tambahStatusPatchPegawai3B04C1_(baseResponse, {
      aktif: false,
      configuredAktif: true,
      fallback: true,
      fallbackReason: enrichmentError && enrichmentError.message
        ? String(enrichmentError.message)
        : String(enrichmentError),
      sourceEndpoint: "ambilDetailRiwayatLaporan"
    });
  }
}


function validasiPenandaLewatPeriodePegawai3B04C1() {
  pastikanMaintainerPortal3B0_("VALIDASI_PENANDA_PEGAWAI_3B04C1");

  var core = validasiPatch3B04C1();
  var sample = gabungkanMetadataPegawai3B04C1_(
    {
      idLaporan: "TEST-3B04C1",
      status: "Ditolak",
      poinFinal: 7
    },
    {
      "TEST-3B04C1": {
        lewatPeriode: true,
        dialihkan: true,
        jenisKetepatan: "SUBMIT_SETELAH_CUTOFF",
        periodeAsal: "2026-07",
        periodeAsalLabel: "Juli 2026",
        periodeReview: "2026-08",
        periodeReviewLabel: "Agustus 2026",
        pesanKetepatan: "Laporan melewati cut-off periode Juli 2026 dan direview pada periode Agustus 2026."
      }
    }
  );

  var mergeValid =
    sample.lewatPeriode === true &&
    sample.dialihkan === true &&
    sample.periodeReview === "2026-08" &&
    sample.status === "Ditolak" &&
    Number(sample.poinFinal) === 7;

  var valid = core.valid === true && mergeValid;
  var issues = (core.issues || []).slice();
  if (!mergeValid) {
    issues.push("Penggabungan metadata mengubah status/poin atau kehilangan periode review.");
  }

  var result = {
    sukses: valid,
    valid: valid,
    versi: SINKRONISASI_CUTOFF_PERIODE_3B04C1.VERSION,
    coreValid: core.valid === true,
    mergeMetadataValid: mergeValid,
    endpointRiwayatC1Tersedia:
      typeof ambilRiwayatKuPaged3B04C1 === "function",
    endpointDetailC1Tersedia:
      typeof ambilDetailRiwayatLaporan3B04C1 === "function",
    badgeKartuTampil: true,
    badgeDetailTampil: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END PENANDA PEGAWAI 3B-0.4C1 =====
