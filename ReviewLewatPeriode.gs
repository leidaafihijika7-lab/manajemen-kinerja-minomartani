// ============================================================
// PATCH 3B-0.4B
// PENANDA LEWAT PERIODE PADA REVIEW BUKTI ADMIN
// ============================================================

var REVIEW_LEWAT_PERIODE_3B04B = {
  VERSION: "3B04B-2026.08.02.02",
  PAGE_FETCH_SIZE: 200,
  MAX_FETCH_LOOPS: 30,
  MAX_FETCH_ROWS: 5000
};


function salinObject3B04B_(source) {
  var result = {};
  source = source || {};

  Object.keys(source).forEach(function (key) {
    result[key] = source[key];
  });

  return result;
}


function buatPesanKetepatan3B04B_(metadata) {
  metadata = metadata || {};

  var periode =
    metadata.periodeLabel ||
    metadata.periode ||
    "laporan";

  var submit =
    metadata.waktuSubmitPertama || "-";

  var revisi =
    metadata.waktuRevisi || "-";

  var cutoff =
    metadata.batasAkhirPeriode || "-";

  var terlambatSubmit =
    metadata.terlambatLabelSubmit || "-";

  var terlambatRevisi =
    metadata.terlambatLabelRevisi || "-";

  if (
    metadata.jenisKetepatan ===
    "SUBMIT_DAN_REVISI_SETELAH_CUTOFF"
  ) {
    return (
      "Submit awal dan revisi laporan melewati batas periode " +
      periode +
      ".\nDikirim: " +
      submit +
      ".\nDirevisi: " +
      revisi +
      ".\nBatas akhir: " +
      cutoff +
      ".\nKeterlambatan submit: " +
      terlambatSubmit +
      ".\nKeterlambatan revisi: " +
      terlambatRevisi +
      "."
    );
  }

  if (
    metadata.jenisKetepatan ===
    "REVISI_SETELAH_CUTOFF"
  ) {
    return (
      "Submit awal dilakukan tepat waktu, tetapi revisi melewati " +
      "batas periode " +
      periode +
      ".\nDirevisi: " +
      revisi +
      ".\nBatas akhir: " +
      cutoff +
      ".\nKeterlambatan revisi: " +
      terlambatRevisi +
      "."
    );
  }

  return (
    "Laporan dikirim setelah batas akhir periode " +
    periode +
    ".\nDikirim: " +
    submit +
    ".\nBatas akhir: " +
    cutoff +
    ".\nKeterlambatan: " +
    terlambatSubmit +
    "."
  );
}


function buatMetadataKetepatanById3B04B_(idList) {
  var requested = {};

  (idList || []).forEach(function (id) {
    var key = String(id || "").trim();
    if (key) requested[key] = true;
  });

  var requestedKeys = Object.keys(requested);
  if (!requestedKeys.length) return {};

  var sheet = getSheet_("Rekap_Kinerja");
  var columns = SHEET_COLUMNS.REKAP_KINERJA;

  var requiredWidth =
    Math.max(
      columns.TANGGAL_LAPORAN,
      columns.TANGGAL_KEGIATAN,
      columns.ID_LAPORAN,
      columns.REVISI_KE,
      columns.TERAKHIR_DIREVISI_PADA,
      columns.PAYLOAD_JSON,
      typeof columns.PAYLOAD_DETAIL_JSON === "number"
        ? columns.PAYLOAD_DETAIL_JSON
        : 0
    ) + 1;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  var rows = sheet
    .getRange(2, 1, lastRow - 1, requiredWidth)
    .getValues();

  var cutoffCache = {};
  var result = {};
  var remaining = requestedKeys.length;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];

    var idLaporan = String(
      row[columns.ID_LAPORAN] || ""
    ).trim();

    if (!idLaporan || !requested[idLaporan]) continue;

    var periodeInfo =
      tentukanPeriodeRowAudit3B04A_(
        row,
        columns
      );

    var periode = String(
      periodeInfo.periode || ""
    );

    if (!periode) {
      result[idLaporan] = {
        lewatPeriode: false,
        jenisKetepatan:
          "TIDAK_DAPAT_DIKLASIFIKASIKAN",
        periode: "",
        periodeLabel: "",
        masalah: "PERIODE_TIDAK_VALID"
      };

      remaining--;
      if (remaining <= 0) break;
      continue;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        cutoffCache,
        periode
      )
    ) {
      cutoffCache[periode] =
        bacaTutupPeriodeLaporan_(periode) ||
        null;
    }

    var lock = cutoffCache[periode];

    if (
      !lock ||
      !(lock.cutoffDate instanceof Date) ||
      isNaN(lock.cutoffDate.getTime())
    ) {
      result[idLaporan] = {
        lewatPeriode: false,
        jenisKetepatan:
          "BATAS_AKHIR_TIDAK_TERSEDIA",
        periode: periode,
        periodeLabel:
          labelPeriodeAudit3B04A_(periode),
        masalah:
          "Batas akhir periode tidak tersedia."
      };

      remaining--;
      if (remaining <= 0) break;
      continue;
    }

    var klasifikasi =
      klasifikasiTanggal3B04A_(
        row[columns.TANGGAL_LAPORAN],
        row[columns.TERAKHIR_DIREVISI_PADA],
        row[columns.REVISI_KE],
        lock.cutoffDate
      );

    var lewatPeriode =
      klasifikasi.submitSetelahCutoff ||
      klasifikasi.revisiSetelahCutoff;

    var metadata = {
      lewatPeriode: lewatPeriode,
      jenisKetepatan:
        klasifikasi.klasifikasi,

      periode: periode,
      periodeLabel:
        lock.labelPeriode ||
        labelPeriodeAudit3B04A_(periode),

      waktuSubmitPertama:
        formatTanggalAudit3B04A_(
          klasifikasi.submitDate
        ),

      waktuRevisi:
        formatTanggalAudit3B04A_(
          klasifikasi.revisiDate
        ),

      batasAkhirPeriode:
        formatTanggalAudit3B04A_(
          lock.cutoffDate
        ),

      terlambatMenitSubmit:
        klasifikasi.terlambatMenitSubmit,

      terlambatLabelSubmit:
        klasifikasi.submitSetelahCutoff
          ? formatDurasiTerlambat3B04A_(
              klasifikasi.terlambatMenitSubmit
            )
          : "",

      terlambatMenitRevisi:
        klasifikasi.terlambatMenitRevisi,

      terlambatLabelRevisi:
        klasifikasi.revisiSetelahCutoff
          ? formatDurasiTerlambat3B04A_(
              klasifikasi.terlambatMenitRevisi
            )
          : "",

      masalah: klasifikasi.masalah || ""
    };

    metadata.pesanKetepatan =
      lewatPeriode
        ? buatPesanKetepatan3B04B_(metadata)
        : "";

    result[idLaporan] = metadata;

    remaining--;
    if (remaining <= 0) break;
  }

  return result;
}


function perkayaItemReviewAdmin3B04B_(items) {
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

  var metadataMap =
    buatMetadataKetepatanById3B04B_(ids);

  return items.map(function (item) {
    var enriched = salinObject3B04B_(item);
    var id = String(
      enriched.idLaporan || ""
    ).trim();

    var metadata =
      metadataMap[id] || {
        lewatPeriode: false,
        jenisKetepatan: "TEPAT_WAKTU"
      };

    Object.keys(metadata).forEach(function (key) {
      enriched[key] = metadata[key];
    });

    return enriched;
  });
}


function ambilSemuaReviewAdmin3B04B_(
  selectedId,
  tanggalMulai,
  tanggalAkhir,
  token
) {
  var allItems = [];
  var offset = 0;
  var loop = 0;
  var firstResponse = null;

  while (
    loop <
      REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_LOOPS &&
    allItems.length <
      REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_ROWS
  ) {
    var response =
      ambilLaporanAdminPerPegawai(
        selectedId,
        "semua",
        tanggalMulai,
        tanggalAkhir,
        offset,
        REVIEW_LEWAT_PERIODE_3B04B
          .PAGE_FETCH_SIZE,
        token
      );

    if (!firstResponse) {
      firstResponse = response || {};
    }

    if (
      !response ||
      response.sukses === false
    ) {
      return response;
    }

    var incoming = Array.isArray(response.items)
      ? response.items
      : [];

    Array.prototype.push.apply(
      allItems,
      incoming
    );

    if (!response.hasMore) break;

    var nextOffset = Number(
      response.nextOffset || 0
    );

    if (nextOffset <= offset) break;

    offset = nextOffset;
    loop++;
  }

  firstResponse =
    firstResponse || {
      sukses: true,
      items: [],
      summary: {}
    };

  firstResponse.items = allItems;
  firstResponse.hasMore = false;
  firstResponse.nextOffset = allItems.length;
  firstResponse.totalFiltered = allItems.length;

  return firstResponse;
}


/**
 * Endpoint baru untuk Review Bukti Admin.
 *
 * Filter:
 * - semua
 * - menunggu
 * - lewat_periode
 */
function ambilLaporanAdminPerPegawai3B04B(
  selectedId,
  filterStatus,
  tanggalMulai,
  tanggalAkhir,
  offset,
  limit,
  token
) {
  var filter = String(
    filterStatus || "semua"
  ).toLowerCase();

  var safeOffset = Math.max(
    0,
    Number(offset) || 0
  );

  var safeLimit = Math.max(
    1,
    Math.min(100, Number(limit) || 10)
  );

  if (filter !== "lewat_periode") {
    var normalResponse =
      ambilLaporanAdminPerPegawai(
        selectedId,
        filter,
        tanggalMulai,
        tanggalAkhir,
        safeOffset,
        safeLimit,
        token
      );

    if (
      !normalResponse ||
      normalResponse.sukses === false
    ) {
      return normalResponse;
    }

    normalResponse.items =
      perkayaItemReviewAdmin3B04B_(
        normalResponse.items
      );

    var loadedLate =
      normalResponse.items.filter(
        function (item) {
          return !!item.lewatPeriode;
        }
      ).length;

    normalResponse.summary =
      normalResponse.summary || {};

    normalResponse.summary
      .totalLewatPeriodeLoaded =
      loadedLate;

    normalResponse.patch3B04B = {
      versi:
        REVIEW_LEWAT_PERIODE_3B04B.VERSION,
      filter: filter
    };

    return normalResponse;
  }

  var allResponse =
    ambilSemuaReviewAdmin3B04B_(
      selectedId,
      tanggalMulai,
      tanggalAkhir,
      token
    );

  if (
    !allResponse ||
    allResponse.sukses === false
  ) {
    return allResponse;
  }

  var enrichedAll =
    perkayaItemReviewAdmin3B04B_(
      allResponse.items
    );

  var lateItems =
    enrichedAll.filter(function (item) {
      return !!item.lewatPeriode;
    });

  var pageItems = lateItems.slice(
    safeOffset,
    safeOffset + safeLimit
  );

  var nextOffset =
    safeOffset + pageItems.length;

  var result = salinObject3B04B_(
    allResponse
  );

  result.items = pageItems;
  result.totalFiltered = lateItems.length;
  result.nextOffset = nextOffset;
  result.hasMore =
    nextOffset < lateItems.length;

  result.summary =
    salinObject3B04B_(
      allResponse.summary || {}
    );

  result.summary.totalLewatPeriode =
    lateItems.length;

  result.summary.totalFiltered =
    lateItems.length;

  result.patch3B04B = {
    versi:
      REVIEW_LEWAT_PERIODE_3B04B.VERSION,
    filter: "lewat_periode"
  };

  return result;
}


function statusPenandaLewatPeriodeAdmin3B04B() {
  pastikanMaintainerPortal3B0_(
    "STATUS_PENANDA_LEWAT_PERIODE_ADMIN_3B04B"
  );

  var audit =
    validasiAuditLaporanLewatPeriode3B04A();

  var result = {
    sukses:
      !!audit && audit.sukses === true,
    versi:
      REVIEW_LEWAT_PERIODE_3B04B.VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    periodeAudit:
      audit ? audit.periode : "",
    totalLaporan:
      audit ? audit.totalLaporan : 0,
    jumlahTerdampak:
      audit ? audit.jumlahTerdampak : 0,
    pegawaiTerdampak:
      audit ? audit.pegawaiTerdampak : 0,
    hanyaInformasi: true,
    poinDiubah: false,
    statusReviewDiubah: false,
    dataDiubah: false
  };

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}


function validasiPenandaLewatPeriodeAdmin3B04B() {
  pastikanMaintainerPortal3B0_(
    "VALIDASI_PENANDA_LEWAT_PERIODE_ADMIN_3B04B"
  );

  var audit =
    auditLaporanLewatPeriode3B04A(
      "2026-07"
    );

  var affected = audit &&
    audit.summary
      ? Number(
          audit.summary
            .totalLaporanTerdampak || 0
        )
      : 0;

  var valid =
    !!audit &&
    audit.sukses === true &&
    audit.dataDiubah === false &&
    affected >= 0;

  var result = {
    sukses: valid,
    valid: valid,
    versi:
      REVIEW_LEWAT_PERIODE_3B04B.VERSION,
    periode:
      audit ? audit.periode : "",
    batasAkhir:
      audit ? audit.batasAkhir : "",
    jumlahTerdampak: affected,
    klasifikasi:
      audit
        ? audit.classificationCounts
        : {},
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    issues: valid
      ? []
      : [
          "Audit periode belum dapat digunakan."
        ]
  };

  Logger.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}

// ===== END PATCH 3B-0.4B =====

// ============================================================
// PATCH 3B-0.4B.1
// INTEGRASI AMAN PENANDA LEWAT PERIODE REVIEW ADMIN
//
// - Feature flag Script Property, default nonaktif.
// - Fallback otomatis ke endpoint Review Admin lama.
// - Tidak mengubah poin, status review, atau Spreadsheet.
// ============================================================

var PENANDA_LEWAT_PERIODE_ADMIN_3B04B1 = {
  VERSION: "3B04B1-2026.08.03.01",
  PROPERTY:
    "PENANDA_LEWAT_PERIODE_ADMIN_3B04B1_ENABLED"
};


function penandaLewatPeriodeAdminAktif3B04B1_() {
  var raw = PropertiesService
    .getScriptProperties()
    .getProperty(
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.PROPERTY
    );

  return String(raw || "")
    .trim()
    .toLowerCase() === "true";
}


/**
 * Endpoint aman untuk frontend Review Admin.
 *
 * Saat flag nonaktif:
 *   → menggunakan endpoint lama.
 *
 * Saat flag aktif:
 *   → menggunakan endpoint metadata 3B-0.4B.
 *
 * Jika endpoint baru gagal:
 *   → otomatis kembali ke endpoint lama.
 */
function ambilLaporanAdminPerPegawai3B04B1(
  selectedId,
  filterStatus,
  tanggalMulai,
  tanggalAkhir,
  offset,
  limit,
  token
) {
  var requestedFilter = String(
    filterStatus || "semua"
  ).toLowerCase();

  var fallbackFilter =
    requestedFilter === "lewat_periode"
      ? "semua"
      : requestedFilter;

  var aktif =
    penandaLewatPeriodeAdminAktif3B04B1_();

  var result = null;
  var fallback = false;
  var fallbackReason = "";

  if (aktif) {
    try {
      result =
        ambilLaporanAdminPerPegawai3B04B(
          selectedId,
          requestedFilter,
          tanggalMulai,
          tanggalAkhir,
          offset,
          limit,
          token
        );

      if (
        !result ||
        result.sukses === false
      ) {
        fallback = true;
        fallbackReason =
          result && result.pesan
            ? String(result.pesan)
            : "ENDPOINT_BARU_MENGEMBALIKAN_GAGAL";
      }
    } catch (errorBaru) {
      fallback = true;
      fallbackReason =
        errorBaru && errorBaru.message
          ? String(errorBaru.message)
          : String(errorBaru);
    }
  }

  if (!aktif || fallback) {
    result =
      ambilLaporanAdminPerPegawai(
        selectedId,
        fallbackFilter,
        tanggalMulai,
        tanggalAkhir,
        offset,
        limit,
        token
      );
  }

  result = result || {
    sukses: false,
    pesan:
      "Respons Review Admin tidak tersedia.",
    items: [],
    summary: {}
  };

  result.patch3B04B1 = {
    versi:
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.VERSION,
    aktif:
      aktif && !fallback,
    configuredAktif: aktif,
    fallback: fallback,
    fallbackReason: fallbackReason,
    requestedFilter: requestedFilter,
    effectiveFilter:
      aktif && !fallback
        ? requestedFilter
        : fallbackFilter
  };

  return result;
}


function statusPenandaLewatPeriodeAdmin3B04B1() {
  pastikanMaintainerPortal3B0_(
    "STATUS_PENANDA_LEWAT_PERIODE_ADMIN_3B04B1"
  );

  var result = {
    sukses: true,
    versi:
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    aktif:
      penandaLewatPeriodeAdminAktif3B04B1_(),
    backendAuditTersedia:
      typeof auditLaporanLewatPeriode3B04A ===
      "function",
    backendMetadataTersedia:
      typeof ambilLaporanAdminPerPegawai3B04B ===
      "function",
    endpointLamaTersedia:
      typeof ambilLaporanAdminPerPegawai ===
      "function",
    defaultAman: true,
    fallbackOtomatis: true,
    dataDiubah: false,
    pesan:
      "Integrasi 3B-0.4B.1 menggunakan feature flag dan fallback otomatis."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiPenandaLewatPeriodeAdmin3B04B1() {
  pastikanMaintainerPortal3B0_(
    "VALIDASI_PENANDA_LEWAT_PERIODE_ADMIN_3B04B1"
  );

  var audit =
    validasiPenandaLewatPeriodeAdmin3B04B();

  var backendAudit =
    typeof auditLaporanLewatPeriode3B04A ===
    "function";

  var backendMetadata =
    typeof ambilLaporanAdminPerPegawai3B04B ===
    "function";

  var endpointLama =
    typeof ambilLaporanAdminPerPegawai ===
    "function";

  var valid =
    !!audit &&
    audit.valid === true &&
    backendAudit &&
    backendMetadata &&
    endpointLama;

  var result = {
    sukses: valid,
    valid: valid,
    versi:
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.VERSION,
    audit3B04BValid:
      !!audit && audit.valid === true,
    backendAuditTersedia: backendAudit,
    backendMetadataTersedia: backendMetadata,
    endpointLamaTersedia: endpointLama,
    jumlahTerdampak:
      audit
        ? Number(audit.jumlahTerdampak || 0)
        : 0,
    aktif:
      penandaLewatPeriodeAdminAktif3B04B1_(),
    fallbackOtomatis: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    issues: valid
      ? []
      : [
          "Komponen backend 3B-0.4A/3B-0.4B belum lengkap."
        ]
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanPenandaLewatPeriodeAdmin3B04B1() {
  pastikanMaintainerPortal3B0_(
    "AKTIFKAN_PENANDA_LEWAT_PERIODE_ADMIN_3B04B1"
  );

  var validation =
    validasiPenandaLewatPeriodeAdmin3B04B1();

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
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.PROPERTY,
      "true"
    );

  var result =
    statusPenandaLewatPeriodeAdmin3B04B1();

  result.pesan =
    "Penanda lewat periode Review Admin telah diaktifkan.";

  return result;
}


function nonaktifkanPenandaLewatPeriodeAdmin3B04B1() {
  pastikanMaintainerPortal3B0_(
    "NONAKTIFKAN_PENANDA_LEWAT_PERIODE_ADMIN_3B04B1"
  );

  PropertiesService
    .getScriptProperties()
    .setProperty(
      PENANDA_LEWAT_PERIODE_ADMIN_3B04B1.PROPERTY,
      "false"
    );

  var result =
    statusPenandaLewatPeriodeAdmin3B04B1();

  result.pesan =
    "Penanda lewat periode dinonaktifkan; Review Admin kembali memakai endpoint lama.";

  return result;
}

// ===== END PATCH 3B-0.4B.1 =====