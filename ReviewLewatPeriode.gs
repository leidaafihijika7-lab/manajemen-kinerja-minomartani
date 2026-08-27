// ============================================================
// PATCH 3B-0.4B
// PENANDA LEWAT PERIODE PADA REVIEW BUKTI ADMIN
// ============================================================

var REVIEW_LEWAT_PERIODE_3B04B = {
  VERSION: "3B04B-2026.08.27.02",
  PAGE_FETCH_SIZE: 30,
  MAX_FETCH_LOOPS: 30,
  MAX_FETCH_ROWS: 900
};


function salinObject3B04B_(source) {
  var result = {};
  source = source || {};

  Object.keys(source).forEach(function (key) {
    result[key] = source[key];
  });

  return result;
}


function normalisasiBilanganBulat3B04B_(value, fallback, min, max) {
  var parsed = Number(value);
  if (!isFinite(parsed)) parsed = Number(fallback) || 0;
  parsed = Math.floor(parsed);
  if (typeof min === "number") parsed = Math.max(min, parsed);
  if (typeof max === "number") parsed = Math.min(max, parsed);
  return parsed;
}


function metadataDefault3B04B_(overrides) {
  var result = {
    lewatPeriode: false,
    dialihkan: false,
    jenisKetepatan: "TEPAT_WAKTU",
    periode: "",
    periodeLabel: "",
    periodeAsal: "",
    periodeAsalLabel: "",
    periodeReview: "",
    periodeReviewLabel: "",
    sumberPeriode: "",
    sumberPeriodeReview: "",
    sumberWaktuEfektif: "",
    waktuSubmitPertama: "",
    waktuRevisi: "",
    waktuEfektifReview: "",
    waktuPengirimanLabel: "",
    batasAkhirPeriode: "",
    terlambatMilidetikSubmit: 0,
    terlambatDetikSubmit: 0,
    terlambatMenitSubmit: 0,
    terlambatLabelSubmit: "",
    terlambatMilidetikRevisi: 0,
    terlambatDetikRevisi: 0,
    terlambatMenitRevisi: 0,
    terlambatLabelRevisi: "",
    terlambatMilidetikEfektif: 0,
    terlambatDetikEfektif: 0,
    terlambatMenitEfektif: 0,
    terlambatLabelEfektif: "",
    pesanKetepatan: "",
    masalah: "",
    peringatan: [],
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };

  Object.keys(overrides || {}).forEach(function (key) {
    result[key] = overrides[key];
  });

  return result;
}


function validasiKolomReview3B04B_(columns) {
  var required = [
    "TANGGAL_LAPORAN",
    "TANGGAL_KEGIATAN",
    "ID_LAPORAN",
    "REVISI_KE",
    "TERAKHIR_DIREVISI_PADA"
  ];
  var missing = [];
  var indexes = [];

  required.forEach(function (name) {
    var index = columns && columns[name];
    if (typeof index !== "number" || index < 0 || !isFinite(index)) {
      missing.push(name);
      return;
    }
    indexes.push(index);
  });

  ["PAYLOAD_JSON", "PAYLOAD_DETAIL_JSON"].forEach(function (name) {
    var index = columns && columns[name];
    if (typeof index === "number" && index >= 0 && isFinite(index)) {
      indexes.push(index);
    }
  });

  return {
    valid: missing.length === 0,
    missing: missing,
    requiredWidth: indexes.length
      ? Math.max.apply(null, indexes) + 1
      : 0
  };
}


function bacaRowsMetadataReview3B04B_(requiredWidth) {
  if (typeof getRekapKinerjaValuesReadOnly_ === "function") {
    try {
      var cached = getRekapKinerjaValuesReadOnly_();
      if (Array.isArray(cached)) {
        return {
          rows: cached.length > 1 ? cached.slice(1) : [],
          sumber: "REKAP_READ_ONLY_CACHE"
        };
      }
    } catch (eCache) {}
  }

  var sheet = getSheet_("Rekap_Kinerja");
  if (!sheet) throw new Error("SHEET_REKAP_TIDAK_DITEMUKAN");

  var lastRow = sheet.getLastRow();
  return {
    rows: lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, requiredWidth).getValues()
      : [],
    sumber: "REKAP_RANGE_LANGSUNG"
  };
}


function buatPesanKetepatan3B04B_(metadata) {
  metadata = metadata || {};

  var periodeAsal =
    metadata.periodeAsalLabel ||
    metadata.periodeLabel ||
    metadata.periodeAsal ||
    metadata.periode ||
    "laporan";

  var periodeReview =
    metadata.periodeReviewLabel ||
    metadata.periodeReview ||
    periodeAsal;

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
      periodeAsal +
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
      ".\nDireview pada periode " +
      periodeReview +
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
      periodeAsal +
      ".\nDirevisi: " +
      revisi +
      ".\nBatas akhir: " +
      cutoff +
      ".\nKeterlambatan revisi: " +
      terlambatRevisi +
      ".\nDireview pada periode " +
      periodeReview +
      "."
    );
  }

  return (
    "Laporan dikirim setelah batas akhir periode " +
    periodeAsal +
    ".\nDikirim: " +
    submit +
    ".\nBatas akhir: " +
    cutoff +
    ".\nKeterlambatan: " +
    terlambatSubmit +
    ".\nDireview pada periode " +
    periodeReview +
    "."
  );
}


function buatMetadataKetepatanRow3B04B_(
  row,
  columns,
  periodeInfo,
  lock
) {
  row = row || [];
  periodeInfo = periodeInfo || {};

  var periode = normalisasiPeriodeAudit3B04A_(
    periodeInfo.periode
  );

  if (!periode) {
    return metadataDefault3B04B_({
      jenisKetepatan: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      masalah: "PERIODE_TIDAK_VALID",
      sumberPeriode: periodeInfo.sumber || ""
    });
  }

  var lockValid = !!(
    lock &&
    lock.cutoffDate instanceof Date &&
    !isNaN(lock.cutoffDate.getTime()) &&
    String(lock.status || "").toUpperCase() === "DITUTUP"
  );

  if (!lockValid) {
    return metadataDefault3B04B_({
      jenisKetepatan: "BATAS_AKHIR_TIDAK_TERSEDIA",
      periode: periode,
      periodeLabel: labelPeriodeAudit3B04A_(periode),
      periodeAsal: periode,
      periodeAsalLabel: labelPeriodeAudit3B04A_(periode),
      periodeReview: periode,
      periodeReviewLabel: labelPeriodeAudit3B04A_(periode),
      sumberPeriode: periodeInfo.sumber || "",
      masalah: "Batas akhir resmi Admin untuk periode tidak tersedia."
    });
  }

  var klasifikasi = klasifikasiTanggal3B04A_(
    row[columns.TANGGAL_LAPORAN],
    row[columns.TERAKHIR_DIREVISI_PADA],
    row[columns.REVISI_KE],
    lock.cutoffDate
  );

  var reviewInfo = tentukanPeriodeReviewAudit3B04A_(
    klasifikasi.waktuEfektif,
    periode
  );
  var periodeReview = normalisasiPeriodeAudit3B04A_(
    reviewInfo.periode
  ) || periode;
  var lewatPeriode =
    klasifikasi.klasifikasi !== "TIDAK_DAPAT_DIKLASIFIKASIKAN" &&
    klasifikasi.efektifSetelahCutoff === true;
  var waktuSubmit = formatTanggalAudit3B04A_(klasifikasi.submitDate);
  var waktuEfektif = formatTanggalAudit3B04A_(klasifikasi.waktuEfektif);

  var metadata = metadataDefault3B04B_({
    lewatPeriode: lewatPeriode,
    dialihkan: lewatPeriode && periodeReview !== periode,
    jenisKetepatan: klasifikasi.klasifikasi,
    periode: periode,
    periodeLabel:
      lock.labelPeriode || labelPeriodeAudit3B04A_(periode),
    periodeAsal: periode,
    periodeAsalLabel:
      lock.labelPeriode || labelPeriodeAudit3B04A_(periode),
    periodeReview: periodeReview,
    periodeReviewLabel: labelPeriodeAudit3B04A_(periodeReview),
    sumberPeriode: periodeInfo.sumber || "",
    sumberPeriodeReview: reviewInfo.sumber || "",
    sumberWaktuEfektif: klasifikasi.sumberWaktuEfektif || "",
    waktuSubmitPertama: waktuSubmit,
    waktuRevisi: formatTanggalAudit3B04A_(klasifikasi.revisiDate),
    waktuEfektifReview: waktuEfektif,
    waktuPengirimanLabel: waktuEfektif || waktuSubmit,
    batasAkhirPeriode: formatTanggalAudit3B04A_(lock.cutoffDate),
    terlambatMilidetikSubmit:
      Number(klasifikasi.terlambatMilidetikSubmit || 0),
    terlambatDetikSubmit:
      Number(klasifikasi.terlambatDetikSubmit || 0),
    terlambatMenitSubmit:
      Number(klasifikasi.terlambatMenitSubmit || 0),
    terlambatLabelSubmit: klasifikasi.submitSetelahCutoff
      ? formatDurasiTerlambat3B04A_(
          klasifikasi.terlambatMilidetikSubmit
        )
      : "",
    terlambatMilidetikRevisi:
      Number(klasifikasi.terlambatMilidetikRevisi || 0),
    terlambatDetikRevisi:
      Number(klasifikasi.terlambatDetikRevisi || 0),
    terlambatMenitRevisi:
      Number(klasifikasi.terlambatMenitRevisi || 0),
    terlambatLabelRevisi: klasifikasi.revisiSetelahCutoff
      ? formatDurasiTerlambat3B04A_(
          klasifikasi.terlambatMilidetikRevisi
        )
      : "",
    terlambatMilidetikEfektif:
      Number(klasifikasi.terlambatMilidetikEfektif || 0),
    terlambatDetikEfektif:
      Number(klasifikasi.terlambatDetikEfektif || 0),
    terlambatMenitEfektif:
      Number(klasifikasi.terlambatMenitEfektif || 0),
    terlambatLabelEfektif:
      String(klasifikasi.terlambatLabelEfektif || ""),
    masalah: klasifikasi.masalah || "",
    peringatan: klasifikasi.peringatan || []
  });

  metadata.pesanKetepatan = lewatPeriode
    ? buatPesanKetepatan3B04B_(metadata)
    : "";

  return metadata;
}


function buatMetadataKetepatanById3B04B_(idList) {
  var requested = {};

  (idList || []).forEach(function (id) {
    var key = String(id || "").trim();
    if (key) requested[key] = true;
  });

  var requestedKeys = Object.keys(requested);
  if (!requestedKeys.length) return {};

  var columns =
    typeof SHEET_COLUMNS !== "undefined" &&
    SHEET_COLUMNS.REKAP_KINERJA
      ? SHEET_COLUMNS.REKAP_KINERJA
      : null;
  var columnValidation = validasiKolomReview3B04B_(columns);

  if (!columnValidation.valid) {
    throw new Error(
      "KOLOM_REKAP_TIDAK_LENGKAP: " +
      columnValidation.missing.join(", ")
    );
  }

  var rowSource = bacaRowsMetadataReview3B04B_(
    columnValidation.requiredWidth
  );
  var rows = rowSource.rows;

  var cutoffCache = {};
  var result = {};

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

    var periode = normalisasiPeriodeAudit3B04A_(
      periodeInfo.periode
    );

    if (periode && !Object.prototype.hasOwnProperty.call(
      cutoffCache,
      periode
    )) {
      cutoffCache[periode] =
        bacaTutupPeriodeLaporan_(periode) ||
        null;
    }

    result[idLaporan] = buatMetadataKetepatanRow3B04B_(
      row,
      columns,
      periodeInfo,
      periode ? cutoffCache[periode] : null
    );
    result[idLaporan].sumberData = rowSource.sumber;

    delete requested[idLaporan];
    if (!Object.keys(requested).length) break;
  }

  Object.keys(requested).forEach(function (idLaporan) {
    result[idLaporan] = metadataDefault3B04B_({
      jenisKetepatan: "METADATA_TIDAK_DITEMUKAN",
      masalah: "ID_LAPORAN_TIDAK_DITEMUKAN",
      sumberData: rowSource.sumber
    });
  });

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

    var metadata = metadataMap[id] || metadataDefault3B04B_({
      jenisKetepatan: "METADATA_TIDAK_DITEMUKAN",
      masalah: "ID_LAPORAN_TIDAK_DITEMUKAN"
    });

    Object.keys(metadata).forEach(function (key) {
      enriched[key] = metadata[key];
    });

    return enriched;
  });
}


function normalisasiFilterReview3B04B_(filterStatus) {
  var filter = String(filterStatus || "semua")
    .trim()
    .toLowerCase();

  return ["semua", "menunggu", "lewat_periode"].indexOf(filter) >= 0
    ? filter
    : "semua";
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
  var sourceComplete = false;

  while (
    loop <
      REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_LOOPS &&
    allItems.length <
      REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_ROWS
  ) {
    loop++;

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

    if (
      !response ||
      response.sukses === false
    ) {
      return response;
    }

    if (!firstResponse) {
      firstResponse = salinObject3B04B_(response);
      firstResponse.summary = salinObject3B04B_(
        response.summary || {}
      );
    }

    var incoming = Array.isArray(response.items)
      ? response.items
      : [];

    var remainingCapacity =
      REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_ROWS -
      allItems.length;

    Array.prototype.push.apply(
      allItems,
      incoming.slice(0, remainingCapacity)
    );

    if (incoming.length > remainingCapacity) {
      break;
    }

    if (!response.hasMore) {
      sourceComplete = true;
      break;
    }

    var nextOffset = Number(
      response.nextOffset || 0
    );

    if (!isFinite(nextOffset) || nextOffset <= offset) {
      return {
        sukses: false,
        kode: "PAGINASI_REVIEW_TIDAK_VALID",
        pesan: "Pagination Review Admin tidak dapat dilanjutkan.",
        items: [],
        summary: {},
        hanyaInformasi: true,
        operasiTulisDijalankan: false,
        dataDiubah: false
      };
    }

    offset = Math.floor(nextOffset);
  }

  if (!sourceComplete) {
    return {
      sukses: false,
      kode: "BATAS_SCAN_REVIEW_TERCAPAI",
      pesan:
        "Pemindaian laporan belum lengkap; filter lewat periode tidak diterapkan sebagian.",
      jumlahDipindai: allItems.length,
      batasBaris: REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_ROWS,
      batasPutaran: REVIEW_LEWAT_PERIODE_3B04B.MAX_FETCH_LOOPS,
      items: [],
      summary: {},
      hanyaInformasi: true,
      operasiTulisDijalankan: false,
      dataDiubah: false
    };
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
  firstResponse.scanLengkap = true;
  firstResponse.jumlahPutaranScan = loop;

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
  var filter = normalisasiFilterReview3B04B_(filterStatus);

  var safeOffset = normalisasiBilanganBulat3B04B_(
    offset,
    0,
    0
  );

  var safeLimit = normalisasiBilanganBulat3B04B_(
    limit,
    10,
    1,
    100
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

    var normalResult = salinObject3B04B_(normalResponse);

    normalResult.items =
      perkayaItemReviewAdmin3B04B_(
        normalResponse.items
      );

    var loadedLate =
      normalResult.items.filter(
        function (item) {
          return !!item.lewatPeriode;
        }
      ).length;

    normalResult.summary = salinObject3B04B_(
      normalResponse.summary || {}
    );

    normalResult.summary
      .totalLewatPeriodeLoaded =
      loadedLate;

    normalResult.patch3B04B = {
      versi:
        REVIEW_LEWAT_PERIODE_3B04B.VERSION,
      filter: filter,
      hanyaInformasi: true,
      operasiTulisDijalankan: false,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    };

    return normalResult;
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
    filter: "lewat_periode",
    scanLengkap: allResponse.scanLengkap === true,
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };

  return result;
}


function ujiMetadataKetepatan3B04B_() {
  var cutoff = new Date("2026-07-31T16:59:59.999Z");
  var tepat = new Date(cutoff.getTime());
  var lewatSatuMilidetik = new Date(cutoff.getTime() + 1);
  var columns = {
    TANGGAL_LAPORAN: 0,
    TANGGAL_KEGIATAN: 1,
    ID_LAPORAN: 2,
    REVISI_KE: 3,
    TERAKHIR_DIREVISI_PADA: 4,
    PAYLOAD_JSON: 5,
    PAYLOAD_DETAIL_JSON: 6
  };
  var periodeInfo = {
    periode: "2026-07",
    sumber: "UJI_METADATA"
  };
  var lock = {
    status: "DITUTUP",
    cutoffDate: cutoff,
    labelPeriode: "Juli 2026"
  };

  function metadata(row) {
    return buatMetadataKetepatanRow3B04B_(
      row,
      columns,
      periodeInfo,
      lock
    );
  }

  var batasPersis = metadata([
    tepat,
    new Date("2026-07-15T03:00:00.000Z"),
    "UJI-TEPAT",
    0,
    "",
    "{}",
    ""
  ]);
  var submitTerlambat = metadata([
    lewatSatuMilidetik,
    new Date("2026-07-15T03:00:00.000Z"),
    "UJI-SUBMIT",
    0,
    "",
    "{}",
    ""
  ]);
  var timestampRevisiUsang = metadata([
    tepat,
    new Date("2026-07-15T03:00:00.000Z"),
    "UJI-REVISI-USANG",
    0,
    lewatSatuMilidetik,
    "{}",
    ""
  ]);
  var revisiTerlambat = metadata([
    tepat,
    new Date("2026-07-15T03:00:00.000Z"),
    "UJI-REVISI",
    1,
    lewatSatuMilidetik,
    "{}",
    ""
  ]);

  var checks = {
    batasPersisTidakTerlambat:
      batasPersis.lewatPeriode === false &&
      batasPersis.jenisKetepatan === "TEPAT_WAKTU",
    satuMilidetikTerlambat:
      submitTerlambat.lewatPeriode === true &&
      submitTerlambat.jenisKetepatan === "SUBMIT_SETELAH_CUTOFF" &&
      submitTerlambat.terlambatMilidetikSubmit === 1 &&
      submitTerlambat.terlambatLabelSubmit === "1 detik",
    revisiUsangDiabaikan:
      timestampRevisiUsang.lewatPeriode === false &&
      timestampRevisiUsang.sumberWaktuEfektif === "WAKTU_SUBMIT" &&
      timestampRevisiUsang.peringatan.indexOf(
        "WAKTU_REVISI_DIABAIKAN_TANPA_NOMOR_REVISI"
      ) >= 0,
    revisiSahMenjadiWaktuEfektif:
      revisiTerlambat.lewatPeriode === true &&
      revisiTerlambat.jenisKetepatan === "REVISI_SETELAH_CUTOFF" &&
      revisiTerlambat.sumberWaktuEfektif === "WAKTU_REVISI" &&
      revisiTerlambat.terlambatMilidetikEfektif === 1,
    readOnly:
      submitTerlambat.hanyaInformasi === true &&
      submitTerlambat.operasiTulisDijalankan === false &&
      submitTerlambat.dataDiubah === false &&
      submitTerlambat.poinDiubah === false &&
      submitTerlambat.statusReviewDiubah === false &&
      submitTerlambat.schemaDiubah === false
  };
  var issues = Object.keys(checks).filter(function (key) {
    return checks[key] !== true;
  });

  return {
    sukses: issues.length === 0,
    checks: checks,
    issues: issues
  };
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
    operasiTulisDijalankan: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    dataDiubah: false,
    indexDiubah: false,
    schemaDiubah: false
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

  var audit = validasiAuditLaporanLewatPeriode3B04A();
  var unitTests = ujiMetadataKetepatan3B04B_();
  var affected = audit
    ? Number(audit.jumlahTerdampak || 0)
    : 0;

  var valid =
    !!audit &&
    audit.valid === true &&
    audit.operasiTulisDijalankan === false &&
    audit.dataDiubah === false &&
    unitTests.sukses === true;

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
        ? audit.counts
        : {},
    auditValid:
      !!audit && audit.valid === true,
    unitTests: unitTests,
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false,
    issues: (audit && audit.issues || []).concat(
      unitTests.issues.map(function (key) {
        return "Uji metadata gagal: " + key;
      })
    )
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
  VERSION: "3B04B1-2026.08.19.01",
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
  var requestedFilter = normalisasiFilterReview3B04B_(filterStatus);
  var safeOffset = normalisasiBilanganBulat3B04B_(
    offset,
    0,
    0
  );
  var safeLimit = normalisasiBilanganBulat3B04B_(
    limit,
    10,
    1,
    100
  );

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
          safeOffset,
          safeLimit,
          token
        );

      if (
        !result ||
        result.sukses === false
      ) {
        fallback = true;
        fallbackReason =
          result && result.kode
            ? String(result.kode)
            : "ENDPOINT_BARU_MENGEMBALIKAN_GAGAL";
      }
    } catch (errorBaru) {
      fallback = true;
      fallbackReason = "KESALAHAN_ENDPOINT_BARU";
      Logger.log(
        "Fallback Review Admin 3B04B1: " +
        (errorBaru && errorBaru.message
          ? String(errorBaru.message)
          : String(errorBaru))
      );
    }
  }

  if (!aktif || fallback) {
    result =
      ambilLaporanAdminPerPegawai(
        selectedId,
        fallbackFilter,
        tanggalMulai,
        tanggalAkhir,
        safeOffset,
        safeLimit,
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

  result = salinObject3B04B_(result);
  result.items = Array.isArray(result.items)
    ? result.items.slice()
    : [];
  result.summary = salinObject3B04B_(result.summary || {});

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
        : fallbackFilter,
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
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
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
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
    hanyaInformasi: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: valid
      ? []
      : (audit && audit.issues && audit.issues.length
          ? audit.issues.slice()
          : [
              "Komponen backend 3B-0.4A/3B-0.4B belum lengkap."
            ])
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
