// ============================================================
// PATCH 3B-0.4C1b — PENYEMPURNAAN PERIODE REVIEW
// Target aplikasi: APP_VERSION 2026.08.04.03
//
// Tujuan:
// - akun pegawai dapat melihat Riwayat menurut Bulan Pengiriman
//   atau Periode Review;
// - akun admin dapat membuka antrean berdasarkan Periode Review;
// - istilah teknis "Waktu efektif" diganti dengan label yang jelas;
// - laporan tetap satu baris/arsip, tidak dipindahkan secara fisik;
// - seluruh endpoint memiliki feature flag, fallback, dan serialisasi aman.
// ============================================================

var PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B = {
  VERSION: "3B04C1b-2026.08.04.03",
  PROPERTY: "PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B_ENABLED",
  EMPLOYEE_FETCH_SIZE: 50,
  EMPLOYEE_MAX_ITEMS: 3000,
  ADMIN_FETCH_SIZE: 30,
  ADMIN_MAX_ITEMS: 3000,
  ADMIN_SCAN_START: "2000-01-01",
  ADMIN_SCAN_END: "2100-12-31"
};


function penyempurnaanPeriodeReviewAktif3B04C1b_() {
  var ownFlag = PropertiesService
    .getScriptProperties()
    .getProperty(PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.PROPERTY);

  var coreActive = typeof sinkronisasiCutoffPeriodeAktif3B04C1_ === "function"
    ? sinkronisasiCutoffPeriodeAktif3B04C1_()
    : false;

  return coreActive && String(ownFlag || "").trim().toLowerCase() === "true";
}


function normalisasiDasarPeriode3B04C1b_(value) {
  var v = String(value || "").trim().toLowerCase();
  return v === "periode_review" ? "periode_review" : "pengiriman";
}


function normalisasiPeriodeFilter3B04C1b_(value) {
  if (typeof normalisasiPeriode3B04C1_ === "function") {
    return normalisasiPeriode3B04C1_(value);
  }
  var v = String(value || "").trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : "";
}


function labelPeriodeFilter3B04C1b_(value) {
  var p = normalisasiPeriodeFilter3B04C1b_(value);
  if (!p) return "";
  if (typeof labelPeriode3B04C1_ === "function") {
    return labelPeriode3B04C1_(p);
  }
  return p;
}


function salinData3B04C1b_(value) {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}


function siapkanResponsClient3B04C1b_(value) {
  if (typeof pastikanResponsClientAman3B04C1a_ === "function") {
    return pastikanResponsClientAman3B04C1a_(value);
  }
  return value;
}


function tambahkanLabelWaktuPenilaian3B04C1b_(item) {
  var out = salinData3B04C1b_(item || {}) || {};
  var revisi = String(out.sumberWaktuEfektif || "") === "WAKTU_REVISI";

  out.labelWaktuPenilaian = revisi
    ? "Waktu revisi terakhir"
    : "Waktu pengiriman";

  out.waktuPenilaian = revisi
    ? String(out.waktuRevisi || out.waktuEfektifReview || "")
    : String(out.waktuSubmitPertama || out.waktuEfektifReview || out.waktu || "");

  out.waktuPengirimanLabel = String(
    out.waktuSubmitPertama || out.waktu || ""
  );

  out.waktuRevisiTerakhirLabel = String(out.waktuRevisi || "");
  return out;
}


function tambahkanLabelWaktuDaftar3B04C1b_(items) {
  return (Array.isArray(items) ? items : []).map(function (item) {
    return tambahkanLabelWaktuPenilaian3B04C1b_(item);
  });
}


function filterPeriodeReview3B04C1b_(items, periodeReview) {
  var target = normalisasiPeriodeFilter3B04C1b_(periodeReview);
  if (!target) return [];

  return (Array.isArray(items) ? items : []).filter(function (item) {
    return normalisasiPeriodeFilter3B04C1b_(
      item && (item.periodeReview || item.periodeReviewEfektif)
    ) === target;
  });
}


function filterStatusAdmin3B04C1b_(items, filterStatus) {
  var filter = String(filterStatus || "semua").trim().toLowerCase();
  var list = Array.isArray(items) ? items : [];

  if (filter === "menunggu") {
    return list.filter(function (item) {
      var status = String(item && item.status || "");
      if (typeof isPendingReviewStatus_ === "function") {
        return isPendingReviewStatus_(status);
      }
      return status === "Menunggu Review" ||
        status === "Banding" ||
        status === "Menunggu Persetujuan Lurah";
    });
  }

  if (filter === "lewat_periode") {
    return list.filter(function (item) {
      return !!(item && item.lewatPeriode);
    });
  }

  return list.slice();
}


function buatRingkasanAdmin3B04C1b_(items) {
  var list = Array.isArray(items) ? items : [];
  var summary = {
    totalLaporan: list.length,
    totalMenunggu: 0,
    totalSelesai: 0,
    totalLewatPeriode: 0,
    totalDialihkan: 0
  };

  list.forEach(function (item) {
    var status = String(item && item.status || "");
    var pending = typeof isPendingReviewStatus_ === "function"
      ? isPendingReviewStatus_(status)
      : status === "Menunggu Review";

    if (pending) summary.totalMenunggu++;
    else summary.totalSelesai++;
    if (item && item.lewatPeriode) summary.totalLewatPeriode++;
    if (item && item.dialihkan) summary.totalDialihkan++;
  });

  return summary;
}


function paginasikan3B04C1b_(items, offset, limit, maxLimit) {
  var list = Array.isArray(items) ? items : [];
  var safeOffset = Math.max(0, Number(offset) || 0);
  var safeLimit = Math.max(1, Math.min(Number(maxLimit || 100), Number(limit) || 20));
  var page = list.slice(safeOffset, safeOffset + safeLimit);
  var nextOffset = safeOffset + page.length;

  return {
    items: page,
    offset: safeOffset,
    limit: safeLimit,
    nextOffset: nextOffset,
    hasMore: nextOffset < list.length,
    total: list.length
  };
}


function ambilSemuaRiwayatPegawaiDasar3B04C1b_(params, token) {
  params = params || {};
  var allItems = [];
  var offset = 0;
  var first = null;
  var loops = 0;

  while (allItems.length < PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.EMPLOYEE_MAX_ITEMS) {
    var response = ambilRiwayatKuPaged({
      bulan: "",
      keyword: String(params.keyword || ""),
      limit: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.EMPLOYEE_FETCH_SIZE,
      offset: offset,
      fokusIdLaporan: ""
    }, token);

    if (!first) first = response || {};
    if (!response || response.sukses === false) return response;

    var incoming = Array.isArray(response.items) ? response.items : [];
    Array.prototype.push.apply(allItems, incoming);

    if (!response.hasMore || !incoming.length) break;
    var next = offset + incoming.length;
    if (next <= offset) break;
    offset = next;
    loops++;
    if (loops > 100) break;
  }

  first = first || { sukses: true, items: [] };
  first.items = allItems;
  first.total = allItems.length;
  first.offset = 0;
  first.hasMore = false;
  first.partial = allItems.length >= PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.EMPLOYEE_MAX_ITEMS;
  return first;
}


function fallbackRiwayatPegawai3B04C1b_(params, token, reason) {
  var fallback = ambilRiwayatKuPaged3B04C1(params || {}, token);
  fallback = fallback || {
    sukses: false,
    pesan: "Riwayat laporan tidak tersedia.",
    items: [],
    total: 0,
    hasMore: false
  };

  fallback.items = tambahkanLabelWaktuDaftar3B04C1b_(fallback.items);
  fallback.dasarFilterDiminta = normalisasiDasarPeriode3B04C1b_(
    params && params.dasarFilter
  );
  fallback.dasarFilterEfektif = "pengiriman";
  fallback.patch3B04C1b = {
    versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
    aktif: false,
    configuredAktif: penyempurnaanPeriodeReviewAktif3B04C1b_(),
    fallback: true,
    fallbackReason: String(reason || "FEATURE_NONAKTIF"),
    peringatan: "Filter Periode Review sementara tidak tersedia; data ditampilkan menurut Bulan Pengiriman."
  };
  return siapkanResponsClient3B04C1b_(fallback);
}


/**
 * Endpoint Riwayat Pegawai dengan dua dasar tampilan:
 * - pengiriman: bulan kalender TANGGAL_LAPORAN;
 * - periode_review: periode antrean review hasil pengalihan cut-off.
 */
function ambilRiwayatKuPaged3B04C1b(params, token) {
  params = params || {};
  var requestedMode = normalisasiDasarPeriode3B04C1b_(params.dasarFilter);
  var active = penyempurnaanPeriodeReviewAktif3B04C1b_();

  if (!active) {
    return fallbackRiwayatPegawai3B04C1b_(params, token, "FEATURE_NONAKTIF");
  }

  if (requestedMode === "pengiriman") {
    try {
      var normal = ambilRiwayatKuPaged3B04C1(params, token);
      normal = normal || { sukses: false, items: [] };
      normal.items = tambahkanLabelWaktuDaftar3B04C1b_(normal.items);
      normal.dasarFilterDiminta = requestedMode;
      normal.dasarFilterEfektif = "pengiriman";
      normal.patch3B04C1b = {
        versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
        aktif: true,
        fallback: false,
        mode: "pengiriman"
      };
      return siapkanResponsClient3B04C1b_(normal);
    } catch (normalError) {
      return fallbackRiwayatPegawai3B04C1b_(params, token, normalError);
    }
  }

  try {
    var targetPeriod = normalisasiPeriodeFilter3B04C1b_(
      params.periodeReview || params.bulan
    );
    if (!targetPeriod) {
      return siapkanResponsClient3B04C1b_({
        sukses: false,
        pesan: "Periode review belum dipilih atau tidak valid.",
        items: [],
        total: 0,
        hasMore: false,
        dasarFilterDiminta: requestedMode,
        dasarFilterEfektif: requestedMode,
        patch3B04C1b: {
          versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
          aktif: true,
          fallback: false,
          mode: requestedMode
        }
      });
    }

    var allBase = ambilSemuaRiwayatPegawaiDasar3B04C1b_(params, token);
    if (!allBase || allBase.sukses === false) {
      return fallbackRiwayatPegawai3B04C1b_(
        params,
        token,
        allBase && allBase.pesan ? allBase.pesan : "BASE_ENDPOINT_FAILED"
      );
    }

    var enriched = perkayaDaftarRiwayatPegawai3B04C1_(allBase.items);
    enriched = tambahkanLabelWaktuDaftar3B04C1b_(enriched);
    var filtered = filterPeriodeReview3B04C1b_(enriched, targetPeriod);
    var page = paginasikan3B04C1b_(
      filtered,
      params.offset,
      params.limit,
      50
    );

    var result = {
      sukses: true,
      items: page.items,
      total: page.total,
      limit: page.limit,
      offset: page.offset,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      bulan: targetPeriod,
      periodeReview: targetPeriod,
      periodeReviewLabel: labelPeriodeFilter3B04C1b_(targetPeriod),
      dasarFilterDiminta: requestedMode,
      dasarFilterEfektif: requestedMode,
      partial: !!allBase.partial,
      patch3B04C1b: {
        versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
        aktif: true,
        fallback: false,
        mode: requestedMode,
        totalSumberDipindai: Array.isArray(allBase.items) ? allBase.items.length : 0
      }
    };

    return siapkanResponsClient3B04C1b_(result);
  } catch (errorReview) {
    return fallbackRiwayatPegawai3B04C1b_(params, token, errorReview);
  }
}


function perkayaDaftarAdmin3B04C1b_(items) {
  var list = Array.isArray(items) ? items : [];
  var ids = list.map(function (item) {
    return String(item && item.idLaporan || "").trim();
  }).filter(function (id) { return !!id; });

  var metadataMap = buatMetadataPengalihanById3B04C1_(ids);
  return list.map(function (item) {
    var out = salinData3B04C1b_(item || {}) || {};
    var id = String(out.idLaporan || "").trim();
    var metadata = metadataMap[id] || {};
    Object.keys(metadata).forEach(function (key) {
      out[key] = metadata[key];
    });
    return tambahkanLabelWaktuPenilaian3B04C1b_(out);
  });
}


function ambilSemuaLaporanAdminDasar3B04C1b_(
  selectedId,
  tanggalMulai,
  tanggalAkhir,
  token
) {
  var allItems = [];
  var offset = 0;
  var first = null;
  var loops = 0;

  while (allItems.length < PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.ADMIN_MAX_ITEMS) {
    var response = ambilLaporanAdminPerPegawai(
      selectedId,
      "semua",
      tanggalMulai,
      tanggalAkhir,
      offset,
      PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.ADMIN_FETCH_SIZE,
      token
    );

    if (!first) first = response || {};
    if (!response || response.sukses === false) return response;

    var incoming = Array.isArray(response.items) ? response.items : [];
    Array.prototype.push.apply(allItems, incoming);

    if (!response.hasMore || !incoming.length) break;
    var next = Number(response.nextOffset || (offset + incoming.length));
    if (next <= offset) break;
    offset = next;
    loops++;
    if (loops > 120) break;
  }

  first = first || { sukses: true, items: [], pegawai: null };
  first.items = allItems;
  first.totalFiltered = allItems.length;
  first.hasMore = false;
  first.nextOffset = allItems.length;
  first.partial = allItems.length >= PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.ADMIN_MAX_ITEMS;
  return first;
}


function fallbackAdmin3B04C1b_(
  selectedId,
  filterStatus,
  tanggalMulai,
  tanggalAkhir,
  offset,
  limit,
  token,
  requestedMode,
  reason
) {
  var fallbackFilter = String(filterStatus || "semua").toLowerCase() === "lewat_periode"
    ? "semua"
    : String(filterStatus || "semua").toLowerCase();

  var response = ambilLaporanAdminPerPegawai3B04B1(
    selectedId,
    fallbackFilter,
    tanggalMulai,
    tanggalAkhir,
    offset,
    limit,
    token
  );

  response = response || {
    sukses: false,
    pesan: "Respons Review Admin tidak tersedia.",
    items: [],
    summary: {}
  };

  response.items = tambahkanLabelWaktuDaftar3B04C1b_(response.items);
  response.dasarPeriodeDiminta = requestedMode;
  response.dasarPeriodeEfektif = "pengiriman";
  response.patch3B04C1b = {
    versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
    aktif: false,
    configuredAktif: penyempurnaanPeriodeReviewAktif3B04C1b_(),
    fallback: true,
    fallbackReason: String(reason || "FEATURE_NONAKTIF"),
    peringatan: "Antrean Periode Review sementara tidak tersedia; data ditampilkan menurut rentang pengiriman."
  };
  return siapkanResponsClient3B04C1b_(response);
}


/**
 * Endpoint Review Admin dengan dua dasar antrean:
 * - periode_review: berdasarkan metadata periodeReview;
 * - pengiriman: kompatibilitas rentang tanggal pengiriman lama.
 */
function ambilLaporanAdminPerPegawai3B04C1b(
  selectedId,
  filterStatus,
  dasarPeriode,
  periodeReview,
  tanggalMulai,
  tanggalAkhir,
  offset,
  limit,
  token
) {
  var requestedMode = normalisasiDasarPeriode3B04C1b_(dasarPeriode);
  var active = penyempurnaanPeriodeReviewAktif3B04C1b_();

  if (!active) {
    return fallbackAdmin3B04C1b_(
      selectedId,
      filterStatus,
      tanggalMulai,
      tanggalAkhir,
      offset,
      limit,
      token,
      requestedMode,
      "FEATURE_NONAKTIF"
    );
  }

  try {
    var targetPeriod = normalisasiPeriodeFilter3B04C1b_(periodeReview);
    if (requestedMode === "periode_review" && !targetPeriod) {
      return siapkanResponsClient3B04C1b_({
        sukses: false,
        pesan: "Periode review belum dipilih atau tidak valid.",
        items: [],
        summary: {},
        totalFiltered: 0,
        hasMore: false,
        patch3B04C1b: {
          versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
          aktif: true,
          fallback: false,
          mode: requestedMode
        }
      });
    }

    var scanStart = requestedMode === "periode_review"
      ? PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.ADMIN_SCAN_START
      : tanggalMulai;
    var scanEnd = requestedMode === "periode_review"
      ? PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.ADMIN_SCAN_END
      : tanggalAkhir;

    var base = ambilSemuaLaporanAdminDasar3B04C1b_(
      selectedId,
      scanStart,
      scanEnd,
      token
    );

    if (!base || base.sukses === false) {
      return fallbackAdmin3B04C1b_(
        selectedId,
        filterStatus,
        tanggalMulai,
        tanggalAkhir,
        offset,
        limit,
        token,
        requestedMode,
        base && base.pesan ? base.pesan : "BASE_ENDPOINT_FAILED"
      );
    }

    var enriched = perkayaDaftarAdmin3B04C1b_(base.items);
    var scoped = requestedMode === "periode_review"
      ? filterPeriodeReview3B04C1b_(enriched, targetPeriod)
      : enriched;
    var summary = buatRingkasanAdmin3B04C1b_(scoped);
    var filtered = filterStatusAdmin3B04C1b_(scoped, filterStatus);
    var page = paginasikan3B04C1b_(filtered, offset, limit, 30);

    var result = {
      sukses: true,
      pegawai: base.pegawai || null,
      summary: summary,
      items: page.items,
      totalFiltered: page.total,
      offset: page.offset,
      limit: page.limit,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      tanggalMulai: requestedMode === "pengiriman" ? String(tanggalMulai || "") : "",
      tanggalAkhir: requestedMode === "pengiriman" ? String(tanggalAkhir || "") : "",
      periodeReview: requestedMode === "periode_review" ? targetPeriod : "",
      periodeReviewLabel: requestedMode === "periode_review"
        ? labelPeriodeFilter3B04C1b_(targetPeriod)
        : "",
      dasarPeriodeDiminta: requestedMode,
      dasarPeriodeEfektif: requestedMode,
      partial: !!base.partial,
      patch3B04C1b: {
        versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
        aktif: true,
        fallback: false,
        mode: requestedMode,
        totalSumberDipindai: Array.isArray(base.items) ? base.items.length : 0
      }
    };

    return siapkanResponsClient3B04C1b_(result);
  } catch (errorAdmin) {
    return fallbackAdmin3B04C1b_(
      selectedId,
      filterStatus,
      tanggalMulai,
      tanggalAkhir,
      offset,
      limit,
      token,
      requestedMode,
      errorAdmin
    );
  }
}


function ujiPenyempurnaanPeriodeReview3B04C1b_() {
  var samples = [
    {
      idLaporan: "LATE-JUL",
      status: "Menunggu Review",
      lewatPeriode: true,
      dialihkan: true,
      periodeAsal: "2026-07",
      periodeReview: "2026-08",
      sumberWaktuEfektif: "WAKTU_SUBMIT",
      waktuSubmitPertama: "31/07/2026 16:25 WIB"
    },
    {
      idLaporan: "ONTIME-AUG",
      status: "Menunggu Review",
      lewatPeriode: false,
      dialihkan: false,
      periodeAsal: "2026-08",
      periodeReview: "2026-08",
      sumberWaktuEfektif: "WAKTU_SUBMIT",
      waktuSubmitPertama: "20/08/2026 10:00 WIB"
    },
    {
      idLaporan: "REVISED-AUG",
      status: "Ditolak",
      lewatPeriode: true,
      dialihkan: true,
      periodeAsal: "2026-07",
      periodeReview: "2026-08",
      sumberWaktuEfektif: "WAKTU_REVISI",
      waktuSubmitPertama: "28/07/2026 09:00 WIB",
      waktuRevisi: "31/07/2026 17:00 WIB"
    },
    {
      idLaporan: "JUL-ONLY",
      status: "Disetujui",
      lewatPeriode: false,
      dialihkan: false,
      periodeAsal: "2026-07",
      periodeReview: "2026-07"
    }
  ];

  var august = filterPeriodeReview3B04C1b_(samples, "2026-08");
  var pendingAugust = filterStatusAdmin3B04C1b_(august, "menunggu");
  var lateAugust = filterStatusAdmin3B04C1b_(august, "lewat_periode");
  var revised = tambahkanLabelWaktuPenilaian3B04C1b_(samples[2]);
  var summary = buatRingkasanAdmin3B04C1b_(august);

  return {
    valid:
      august.length === 3 &&
      pendingAugust.length === 2 &&
      lateAugust.length === 2 &&
      revised.labelWaktuPenilaian === "Waktu revisi terakhir" &&
      revised.waktuPenilaian === "31/07/2026 17:00 WIB" &&
      summary.totalLaporan === 3 &&
      summary.totalMenunggu === 2 &&
      summary.totalSelesai === 1 &&
      summary.totalLewatPeriode === 2,
    augustCount: august.length,
    pendingCount: pendingAugust.length,
    lateCount: lateAugust.length,
    revisionLabel: revised.labelWaktuPenilaian,
    revisionTime: revised.waktuPenilaian,
    summary: summary
  };
}


function statusPenyempurnaanPeriodeReview3B04C1b() {
  pastikanMaintainerPortal3B0_("STATUS_PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B");
  var result = {
    sukses: true,
    versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    aktif: penyempurnaanPeriodeReviewAktif3B04C1b_(),
    coreC1Aktif: typeof sinkronisasiCutoffPeriodeAktif3B04C1_ === "function"
      ? sinkronisasiCutoffPeriodeAktif3B04C1_()
      : false,
    endpointPegawaiTersedia:
      typeof ambilRiwayatKuPaged3B04C1b === "function",
    endpointAdminTersedia:
      typeof ambilLaporanAdminPerPegawai3B04C1b === "function",
    filterBulanPengiriman: true,
    filterPeriodeReviewPegawai: true,
    antreanPeriodeReviewAdmin: true,
    labelWaktuTeknisDihapus: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiPenyempurnaanPeriodeReview3B04C1b() {
  pastikanMaintainerPortal3B0_("VALIDASI_PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B");

  var core = typeof validasiHotfix3B04C1a === "function"
    ? validasiHotfix3B04C1a()
    : { valid: false, issues: ["Validasi C1a tidak tersedia."] };
  var synthetic = ujiPenyempurnaanPeriodeReview3B04C1b_();
  var dependencies = {
    riwayatBase: typeof ambilRiwayatKuPaged === "function",
    riwayatC1a: typeof ambilRiwayatKuPaged3B04C1 === "function",
    adminBase: typeof ambilLaporanAdminPerPegawai === "function",
    adminFallback: typeof ambilLaporanAdminPerPegawai3B04B1 === "function",
    metadataC1: typeof buatMetadataPengalihanById3B04C1_ === "function",
    serialisasiAman: typeof pastikanResponsClientAman3B04C1a_ === "function"
  };

  var dependencyValid = Object.keys(dependencies).every(function (key) {
    return dependencies[key] === true;
  });

  var issues = [];
  (core.issues || []).forEach(function (item) { issues.push(item); });
  if (!synthetic.valid) issues.push("Skenario filter Periode Review belum lulus.");
  if (!dependencyValid) issues.push("Satu atau lebih dependency endpoint belum tersedia.");

  var valid = core.valid === true && synthetic.valid === true && dependencyValid && issues.length === 0;
  var result = {
    sukses: valid,
    valid: valid,
    versi: PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    coreC1aValid: core.valid === true,
    dependencies: dependencies,
    skenario: synthetic,
    endpointPegawaiTersedia:
      typeof ambilRiwayatKuPaged3B04C1b === "function",
    endpointAdminTersedia:
      typeof ambilLaporanAdminPerPegawai3B04C1b === "function",
    waktuEfektifDigantiLabelJelas: synthetic.revisionLabel === "Waktu revisi terakhir",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanPenyempurnaanPeriodeReview3B04C1b() {
  pastikanMaintainerPortal3B0_("AKTIFKAN_PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B");
  var validation = validasiPenyempurnaanPeriodeReview3B04C1b();
  if (!validation.valid) {
    return {
      sukses: false,
      aktif: false,
      validation: validation,
      pesan: "Penyempurnaan tidak diaktifkan karena validasi belum lulus."
    };
  }

  PropertiesService.getScriptProperties().setProperty(
    SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY,
    "true"
  );
  PropertiesService.getScriptProperties().setProperty(
    PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.PROPERTY,
    "true"
  );

  var result = statusPenyempurnaanPeriodeReview3B04C1b();
  result.pesan = "Penyempurnaan Periode Review 3B-0.4C1b telah diaktifkan.";
  return result;
}


function nonaktifkanPenyempurnaanPeriodeReview3B04C1b() {
  pastikanMaintainerPortal3B0_("NONAKTIFKAN_PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B");
  PropertiesService.getScriptProperties().setProperty(
    PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.PROPERTY,
    "false"
  );
  var result = statusPenyempurnaanPeriodeReview3B04C1b();
  result.pesan = "Penyempurnaan C1b dinonaktifkan; endpoint kembali ke perilaku C1a/produksi.";
  return result;
}

// ===== END PATCH 3B-0.4C1b =====
