// ============================================================
// HOTFIX 3B-0.4C1c — RESOLVER RENTANG CUT-OFF + OPTIMASI REVIEW
// Target aplikasi: APP_VERSION 2026.08.27.02
//
// Tujuan:
// - periode asal ditentukan dari rentang cut-off manual yang disimpan admin;
// - tanggal 30 Juni dapat menjadi Periode Juli bila rentang Juli dimulai 30 Juni;
// - badge Lewat Periode hanya muncul bila waktu kirim/revisi melewati cut-off
//   periode asal yang benar;
// - endpoint Riwayat Pegawai dan Review Admin membaca Rekap_Kinerja sekali
//   per request, lalu membaca baris lengkap hanya untuk halaman yang dikirim;
// - tidak mengubah Spreadsheet, poin, status review, atau skema.
// ============================================================

var HOTFIX_PERIODE_REVIEW_3B04C1C = {
  VERSION: "3B04C1c-2026.08.27.02",
  PROPERTY: "HOTFIX_PERIODE_REVIEW_3B04C1C_ENABLED",
  INDEX_WIDTH: 26,
  EMPLOYEE_MAX_PAGE: 50,
  ADMIN_MAX_PAGE: 30,
  MAX_FORWARD_MONTHS: 36,
  TIMEZONE: "GMT+7"
};


function hotfixPeriodeReviewAktif3B04C1c_() {
  var ownFlag = PropertiesService
    .getScriptProperties()
    .getProperty(HOTFIX_PERIODE_REVIEW_3B04C1C.PROPERTY);

  var c1bActive = typeof penyempurnaanPeriodeReviewAktif3B04C1b_ === "function"
    ? penyempurnaanPeriodeReviewAktif3B04C1b_()
    : false;

  return c1bActive && String(ownFlag || "").trim().toLowerCase() === "true";
}


function salinData3B04C1c_(value) {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}


function normalisasiPeriode3B04C1c_(value) {
  if (typeof normalisasiPeriode3B04C1_ === "function") {
    return normalisasiPeriode3B04C1_(value);
  }
  var v = String(value || "").trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : "";
}


function periodeBerikutnya3B04C1c_(value) {
  var p = normalisasiPeriode3B04C1c_(value);
  if (!p) return "";
  if (typeof periodeBerikutnya3B04C1_ === "function") {
    return periodeBerikutnya3B04C1_(p);
  }
  var parts = p.split("-");
  return Utilities.formatDate(
    new Date(Number(parts[0]), Number(parts[1]), 1),
    HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE,
    "yyyy-MM"
  );
}


function labelPeriode3B04C1c_(value) {
  var p = normalisasiPeriode3B04C1c_(value);
  if (!p) return "";
  if (typeof labelPeriode3B04C1_ === "function") return labelPeriode3B04C1_(p);
  if (typeof labelPembayaranPeriode_ === "function") return labelPembayaranPeriode_(p);
  return p;
}


function parseTanggal3B04C1c_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return new Date(value.getTime());
  if (typeof parseTanggal3B04C1_ === "function") return parseTanggal3B04C1_(value);
  if (typeof parseTanggal === "function") return parseTanggal(value);
  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}


function formatTanggal3B04C1c_(value) {
  var d = parseTanggal3B04C1c_(value);
  if (!d) return "";
  return Utilities.formatDate(d, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "dd/MM/yyyy HH:mm") + " WIB";
}

// PATCH 3B-0.4C1d — hanya metadata cut-off yang memakai presisi detik adaptif.
function formatCutoff3B04C1c_(value) {
  if (typeof formatCutoffPresisi3B04C1d_ === "function") {
    return formatCutoffPresisi3B04C1d_(value);
  }
  var d = parseTanggal3B04C1c_(value);
  if (!d) return "";
  var sec = Number(Utilities.formatDate(d, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "ss"));
  return Utilities.formatDate(d, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, sec !== 0 ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm") + " WIB";
}


function periodeKalender3B04C1c_(value) {
  var d = parseTanggal3B04C1c_(value);
  return d
    ? Utilities.formatDate(d, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "yyyy-MM")
    : "";
}


function buatRangeCutoff3B04C1c_(periode, obj, sumber) {
  var p = normalisasiPeriode3B04C1c_(periode || (obj && obj.periode));
  if (!p || !obj) return null;

  var mulai = obj.tanggalMulaiPeriode || obj.start || "";
  var akhir = obj.tanggalAkhirPeriode || obj.endInclusive || "";
  var jam = obj.jamCutoff || "";

  if (!mulai || !akhir) return null;

  try {
    var meta = typeof buildDateRangeMeta_ === "function"
      ? buildDateRangeMeta_(p, mulai, akhir, jam || "23:59:59")
      : null;

    if (!meta || !(meta.start instanceof Date) || !(meta.endInclusive instanceof Date)) {
      return null;
    }

    return {
      periode: p,
      start: new Date(meta.start.getTime()),
      end: new Date(meta.end.getTime()),
      endInclusive: new Date(meta.endInclusive.getTime()),
      cutoffDate: new Date(meta.endInclusive.getTime()),
      tanggalMulaiPeriode: meta.tanggalMulaiPeriode || String(mulai),
      tanggalAkhirPeriode: meta.tanggalAkhirPeriode || String(akhir),
      tanggalCutoff: meta.tanggalCutoff || "",
      jamCutoff: meta.jamCutoff || String(jam || ""),
      labelPeriode: meta.labelPembayaran || labelPeriode3B04C1c_(p),
      sumber: String(sumber || "CUTOFF_TUNJANGAN_ADMIN")
    };
  } catch (e) {
    return null;
  }
}


/**
 * Membaca seluruh cut-off manual satu kali per request.
 * Tidak memakai DEFAULT_CUTOFF_DAY atau rentang default.
 */
function buatKonteksCutoff3B04C1c_() {
  var props = typeof portalScriptPropertiesSnapshot_ === "function"
    ? portalScriptPropertiesSnapshot_()
    : PropertiesService.getScriptProperties().getProperties();

  var byPeriod = {};
  var ranges = [];
  var prefix = "TUNJANGAN_CUTOFF_META_";

  Object.keys(props || {}).forEach(function (key) {
    if (key.indexOf(prefix) !== 0) return;
    try {
      var obj = JSON.parse(props[key] || "{}");
      var p = normalisasiPeriode3B04C1c_(obj.periode || key.substring(prefix.length));
      var range = buatRangeCutoff3B04C1c_(p, obj, "CUTOFF_TUNJANGAN_ADMIN");
      if (!range) return;
      byPeriod[p] = range;
      ranges.push(range);
    } catch (e) {}
  });

  // Fallback kompatibilitas: penutupan periode resmi hanya dipakai bila
  // periode tersebut belum memiliki meta cut-off Tunjangan tersimpan.
  try {
    if (typeof daftarTutupPeriodeLaporanResmiV36_ === "function") {
      var locks = daftarTutupPeriodeLaporanResmiV36_() || [];
      var lockMap = {};
      locks.forEach(function (lock) {
        var p = normalisasiPeriode3B04C1c_(lock && lock.periode);
        var cutoff = parseTanggal3B04C1c_(lock && lock.cutoffDate);
        if (p && cutoff) lockMap[p] = cutoff;
      });

      locks.forEach(function (lock) {
        var p = normalisasiPeriode3B04C1c_(lock && lock.periode);
        var cutoff = parseTanggal3B04C1c_(lock && lock.cutoffDate);
        if (!p || !cutoff || byPeriod[p]) return;

        var prev = lockMap[typeof periodeKeyOffset_ === "function"
          ? periodeKeyOffset_(p, -1)
          : ""] || null;
        var parts = p.split("-");
        var start = prev
          ? new Date(prev.getTime() + 1)
          : new Date(Number(parts[0]), Number(parts[1]) - 1, 1, 0, 0, 0, 0);

        var compatible = {
          periode: p,
          start: start,
          end: new Date(cutoff.getTime() + 1),
          endInclusive: cutoff,
          cutoffDate: cutoff,
          tanggalMulaiPeriode: Utilities.formatDate(start, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "yyyy-MM-dd"),
          tanggalAkhirPeriode: Utilities.formatDate(cutoff, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "yyyy-MM-dd"),
          tanggalCutoff: typeof formatTanggalJamISO_ === "function" ? formatTanggalJamISO_(cutoff) : "",
          jamCutoff: Utilities.formatDate(cutoff, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "HH:mm:ss"),
          labelPeriode: labelPeriode3B04C1c_(p),
          sumber: "TUTUP_PERIODE_LAPORAN_KOMPATIBILITAS"
        };
        byPeriod[p] = compatible;
        ranges.push(compatible);
      });
    }
  } catch (eLocks) {}

  ranges.sort(function (a, b) {
    var byStart = a.start.getTime() - b.start.getTime();
    if (byStart !== 0) return byStart;
    return String(a.periode).localeCompare(String(b.periode));
  });

  return {
    byPeriod: byPeriod,
    ranges: ranges,
    totalRanges: ranges.length,
    sumberDefaultDigunakan: false
  };
}


function cariPeriodeRentang3B04C1c_(tanggal, context) {
  var d = parseTanggal3B04C1c_(tanggal);
  var ctx = context || buatKonteksCutoff3B04C1c_();
  if (!d) {
    return { periode: "", range: null, sumber: "TANGGAL_TIDAK_VALID", exact: false };
  }

  var matches = (ctx.ranges || []).filter(function (range) {
    return d.getTime() >= range.start.getTime() &&
      d.getTime() <= range.endInclusive.getTime();
  });

  if (matches.length) {
    // Bila konfigurasi lama overlap, pilih rentang dengan tanggal mulai paling akhir.
    matches.sort(function (a, b) {
      return b.start.getTime() - a.start.getTime();
    });
    return {
      periode: matches[0].periode,
      range: matches[0],
      sumber: "RENTANG_CUTOFF_ADMIN",
      exact: true
    };
  }

  var latestPast = null;
  (ctx.ranges || []).forEach(function (range) {
    if (range.endInclusive.getTime() < d.getTime()) {
      if (!latestPast || range.endInclusive.getTime() > latestPast.endInclusive.getTime()) {
        latestPast = range;
      }
    }
  });

  if (latestPast) {
    var next = periodeBerikutnya3B04C1c_(latestPast.periode);
    return {
      periode: next,
      range: ctx.byPeriod[next] || null,
      sumber: "SETELAH_CUTOFF_TERAKHIR",
      exact: !!ctx.byPeriod[next]
    };
  }

  return {
    periode: periodeKalender3B04C1c_(d),
    range: null,
    sumber: "FALLBACK_KALENDER_TANPA_CUTOFF",
    exact: false
  };
}


function periodeAsalRow3B04C1c_(row, columns, context) {
  row = row || [];
  columns = columns || SHEET_COLUMNS.REKAP_KINERJA;

  // Kebijakan Pasal 33: laporan wajib pada periode hak M melaporkan bulan M-1.
  // Karena itu bulan isi tidak boleh dipakai langsung sebagai periode asal.
  try {
    var kategori = String(row[columns.KATEGORI] || "");
    if (typeof isKategoriWajibBulanan_ === "function" && isKategoriWajibBulanan_(kategori)) {
      var payload = null;
      var rawPayload = typeof columns.PAYLOAD_JSON === "number"
        ? row[columns.PAYLOAD_JSON]
        : "";
      if ((!rawPayload && rawPayload !== 0) && typeof columns.PAYLOAD_DETAIL_JSON === "number") {
        rawPayload = row[columns.PAYLOAD_DETAIL_JSON];
      }
      if (rawPayload && typeof rawPayload === "object") payload = rawPayload;
      else if (rawPayload) {
        try { payload = JSON.parse(String(rawPayload)); } catch (eJson) {}
      }

      var bulanIsi = payload && payload.detailWajibPamong
        ? normalisasiPeriode3B04C1c_(payload.detailWajibPamong.bulan)
        : "";
      if (!bulanIsi && typeof columns.WAJIB_PAMONG_BULAN === "number") {
        bulanIsi = normalisasiPeriode3B04C1c_(row[columns.WAJIB_PAMONG_BULAN]);
      }
      if (!bulanIsi) {
        bulanIsi = periodeKalender3B04C1c_(row[columns.TANGGAL_KEGIATAN]);
      }

      var periodeHak = periodeBerikutnya3B04C1c_(bulanIsi);
      if (periodeHak) {
        var ctx = context || buatKonteksCutoff3B04C1c_();
        return {
          periode: periodeHak,
          range: ctx.byPeriod ? (ctx.byPeriod[periodeHak] || null) : null,
          sumber: "BULAN_HAK_PASAL33",
          exact: !!(ctx.byPeriod && ctx.byPeriod[periodeHak]),
          tanggalAcuan: parseTanggal3B04C1c_(row[columns.TANGGAL_LAPORAN]),
          sumberTanggal: "BULAN_LAPORAN_WAJIB",
          bulanIsiLaporanWajib: bulanIsi,
          periodeHakPasal33: periodeHak
        };
      }
    }
  } catch (eWajib) {}

  var tanggalKegiatan = parseTanggal3B04C1c_(row[columns.TANGGAL_KEGIATAN]);
  var tanggalSubmit = parseTanggal3B04C1c_(row[columns.TANGGAL_LAPORAN]);
  var acuan = tanggalKegiatan || tanggalSubmit;
  var result = cariPeriodeRentang3B04C1c_(acuan, context);
  result.tanggalAcuan = acuan;
  result.sumberTanggal = tanggalKegiatan ? "TANGGAL_PELAKSANAAN" : "TANGGAL_PENGIRIMAN";
  return result;
}


function waktuReviewRow3B04C1c_(row, columns) {
  row = row || [];
  columns = columns || SHEET_COLUMNS.REKAP_KINERJA;
  var submitDate = parseTanggal3B04C1c_(row[columns.TANGGAL_LAPORAN]);
  var revisionDate = parseTanggal3B04C1c_(row[columns.TERAKHIR_DIREVISI_PADA]);
  var revisionNumber = Math.max(0, Number(row[columns.REVISI_KE]) || 0);
  var useRevision = revisionNumber > 0 && !!revisionDate;
  return {
    submitDate: submitDate,
    revisionDate: revisionDate,
    revisionNumber: revisionNumber,
    effectiveDate: useRevision ? revisionDate : submitDate,
    sumber: useRevision ? "WAKTU_REVISI" : "WAKTU_SUBMIT"
  };
}


function hitungRutePeriode3B04C1c_(periodeAsal, waktuEfektif, context) {
  var origin = normalisasiPeriode3B04C1c_(periodeAsal);
  var time = parseTanggal3B04C1c_(waktuEfektif);
  var ctx = context || buatKonteksCutoff3B04C1c_();
  if (!origin || !time) {
    return {
      sukses: false,
      periodeAsal: origin,
      periodeReview: origin,
      dialihkan: false,
      kode: "PERIODE_ATAU_WAKTU_TIDAK_VALID",
      riwayatPengalihan: []
    };
  }

  var current = origin;
  var history = [];
  var originRange = ctx.byPeriod[origin] || null;
  var lastRange = originRange;

  // Tanpa cut-off manual periode asal, sistem tidak mengarang keterlambatan.
  if (!originRange) {
    return {
      sukses: true,
      periodeAsal: origin,
      periodeReview: origin,
      dialihkan: false,
      jumlahPeriodeDialihkan: 0,
      kode: "CUTOFF_PERIODE_ASAL_BELUM_DITETAPKAN",
      riwayatPengalihan: [],
      cutoffPeriodeAsal: null,
      cutoffPeriodeTerakhir: null,
      menungguCutoffPeriodeReview: false
    };
  }

  for (var step = 0; step < HOTFIX_PERIODE_REVIEW_3B04C1C.MAX_FORWARD_MONTHS; step++) {
    var range = ctx.byPeriod[current] || null;
    if (!range) {
      return {
        sukses: true,
        periodeAsal: origin,
        periodeReview: current,
        dialihkan: current !== origin,
        jumlahPeriodeDialihkan: history.length,
        kode: "MENUNGGU_CUTOFF_PERIODE_REVIEW",
        riwayatPengalihan: history,
        cutoffPeriodeAsal: originRange,
        cutoffPeriodeTerakhir: lastRange,
        menungguCutoffPeriodeReview: current !== origin
      };
    }

    lastRange = range;
    if (time.getTime() <= range.cutoffDate.getTime()) {
      return {
        sukses: true,
        periodeAsal: origin,
        periodeReview: current,
        dialihkan: current !== origin,
        jumlahPeriodeDialihkan: history.length,
        kode: current === origin ? "TEPAT_PADA_PERIODE_ASAL" : "DIALIHKAN_KE_PERIODE_REVIEW",
        riwayatPengalihan: history,
        cutoffPeriodeAsal: originRange,
        cutoffPeriodeTerakhir: lastRange,
        menungguCutoffPeriodeReview: false
      };
    }

    history.push({
      periode: current,
      cutoffDate: formatTanggal3B04C1c_(range.cutoffDate),
      sumber: range.sumber || ""
    });
    current = periodeBerikutnya3B04C1c_(current);
  }

  return {
    sukses: false,
    periodeAsal: origin,
    periodeReview: current,
    dialihkan: current !== origin,
    jumlahPeriodeDialihkan: history.length,
    kode: "BATAS_PENGALIHAN_TERLAMPAUI",
    riwayatPengalihan: history,
    cutoffPeriodeAsal: originRange,
    cutoffPeriodeTerakhir: lastRange
  };
}


function metadataDefault3B04C1c_() {
  return {
    lewatPeriode: false,
    dialihkan: false,
    jenisKetepatan: "CUTOFF_BELUM_DITETAPKAN",
    periode: "",
    periodeLabel: "",
    periodeAsal: "",
    periodeAsalLabel: "",
    periodeReview: "",
    periodeReviewLabel: "",
    jumlahPeriodeDialihkan: 0,
    pesanKetepatan: "",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };
}


function buatMetadataRow3B04C1c_(row, columns, context) {
  var originInfo = periodeAsalRow3B04C1c_(row, columns, context);
  var timing = waktuReviewRow3B04C1c_(row, columns);
  var origin = originInfo.periode;

  if (!origin || !timing.effectiveDate) {
    var invalid = metadataDefault3B04C1c_();
    invalid.jenisKetepatan = "TIDAK_DAPAT_DIKLASIFIKASIKAN";
    invalid.masalah = "Periode asal atau waktu laporan tidak valid.";
    return invalid;
  }

  var route = hitungRutePeriode3B04C1c_(origin, timing.effectiveDate, context);
  var late = route.dialihkan === true;
  var originRange = route.cutoffPeriodeAsal || originInfo.range || null;
  var type = "TEPAT_WAKTU";

  if (late) {
    type = timing.sumber === "WAKTU_REVISI"
      ? "REVISI_SETELAH_CUTOFF"
      : "SUBMIT_SETELAH_CUTOFF";
  } else if (route.kode === "CUTOFF_PERIODE_ASAL_BELUM_DITETAPKAN") {
    type = "CUTOFF_BELUM_DITETAPKAN";
  }

  var originLabel = labelPeriode3B04C1c_(origin);
  var reviewPeriod = route.periodeReview || origin;
  var reviewLabel = labelPeriode3B04C1c_(reviewPeriod);
  var actionWord = timing.sumber === "WAKTU_REVISI" ? "Revisi" : "Laporan";
  var message = "";

  if (late) {
    message = actionWord + " melewati cut-off periode " + originLabel +
      " dan direview pada periode " + reviewLabel + ".";
  } else if (type === "CUTOFF_BELUM_DITETAPKAN") {
    message = "Cut-off periode " + originLabel + " belum ditetapkan admin.";
  }

  return {
    lewatPeriode: late,
    dialihkan: late,
    jenisKetepatan: type,
    periode: origin,
    periodeLabel: originLabel,
    periodeAsal: origin,
    periodeAsalLabel: originLabel,
    sumberPeriodeAsal: originInfo.sumber,
    sumberTanggalPeriodeAsal: originInfo.sumberTanggal,
    bulanIsiLaporanWajib: originInfo.bulanIsiLaporanWajib || "",
    periodeHakPasal33: originInfo.periodeHakPasal33 || "",
    periodeReview: reviewPeriod,
    periodeReviewLabel: reviewLabel,
    jumlahPeriodeDialihkan: Number(route.jumlahPeriodeDialihkan || 0),
    riwayatPengalihan: route.riwayatPengalihan || [],
    waktuSubmitPertama: formatTanggal3B04C1c_(timing.submitDate),
    waktuRevisi: formatTanggal3B04C1c_(timing.revisionDate),
    waktuEfektifReview: formatTanggal3B04C1c_(timing.effectiveDate),
    sumberWaktuEfektif: timing.sumber,
    batasAkhirPeriode: originRange ? formatCutoff3B04C1c_(originRange.cutoffDate) : "",
    tanggalMulaiPeriodeAsal: originRange
      ? Utilities.formatDate(originRange.start, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "dd/MM/yyyy HH:mm") + " WIB"
      : "",
    sumberCutoff: originRange ? String(originRange.sumber || "") : "",
    menungguCutoffPeriodeReview: route.menungguCutoffPeriodeReview === true,
    pesanKetepatan: message,
    kodePengalihan: route.kode || "",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };
}


function gabungkanMetadata3B04C1c_(item, metadata) {
  var out = salinData3B04C1c_(item || {}) || {};
  Object.keys(metadata || {}).forEach(function (key) {
    out[key] = metadata[key];
  });
  if (typeof tambahkanLabelWaktuPenilaian3B04C1b_ === "function") {
    out = tambahkanLabelWaktuPenilaian3B04C1b_(out);
  }
  var periodeReview = String((metadata && metadata.periodeReview) || "");
  var policyActive = !!(metadata && metadata.lewatPeriode === true &&
    /^\d{4}-\d{2}$/.test(periodeReview) && periodeReview >= "2026-09");
  out.kebijakanCutoffImbalanAktif = policyActive;
  out.tanpaImbalanKarenaCutoff = policyActive;
  return out;
}


function buatItemRiwayatRow3B04C1c_(row, idUser) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var rowId = normalizeId_(row[C.ID_LAPORAN]);
  var rawTime = row[C.TANGGAL_LAPORAN];
  var time = parseTanggal3B04C1c_(rawTime);
  var timeText = time
    ? Utilities.formatDate(time, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "dd/MM/yyyy HH:mm")
    : String(rawTime || "");
  var description = row[C.DESKRIPSI] || "-";
  var visualRaw = row[C.VISUAL_URL] ? String(row[C.VISUAL_URL]) : "";
  var visualList = visualRaw
    ? visualRaw.split(",").map(function (url) { return String(url || "").trim(); }).filter(Boolean)
    : [];
  var revision = typeof cekBolehRevisiLaporanPegawai_ === "function"
    ? cekBolehRevisiLaporanPegawai_(row, idUser)
    : { boleh: false, pesan: "", periode: "" };

  return {
    idLaporan: rowId,
    waktu: timeText,
    kategori: row[C.KATEGORI] || "-",
    judul: row[C.NAMA_KEGIATAN] || row[C.KATEGORI] || "Laporan Kinerja",
    namaKegiatan: row[C.NAMA_KEGIATAN] || "",
    deskripsi: description,
    deskripsiRingkas: String(description).length > 240
      ? String(description).substring(0, 240) + "..."
      : String(description),
    status: row[C.STATUS_REVIEW] || "-",
    poinFinal: Number(row[C.POIN_FINAL]) || 0,
    catatan: row[C.CATATAN_ADMIN] || "-",
    jumlahBukti: visualList.length,
    urlVisualPreview: visualList.slice(0, 3),
    bisaRevisi: !!revision.boleh,
    alasanTidakBisaRevisi: revision.boleh ? "" : String(revision.pesan || ""),
    periodeRevisi: revision.periode || ""
  };
}


function fallbackRiwayat3B04C1c_(params, token, reason) {
  var response = ambilRiwayatKuPaged3B04C1b(params || {}, token);
  response = response || { sukses: false, items: [], total: 0, hasMore: false };
  response.patch3B04C1c = {
    versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
    aktif: false,
    configuredAktif: hotfixPeriodeReviewAktif3B04C1c_(),
    fallback: true,
    fallbackReason: reason && reason.message ? String(reason.message) : String(reason || "FEATURE_NONAKTIF"),
    resolverRentangCutoff: false,
    optimasiSatuScan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };
  return typeof siapkanResponsClient3B04C1b_ === "function"
    ? siapkanResponsClient3B04C1b_(response)
    : response;
}

function bacaRowsRiwayatUserIndex3C4_(idUser) {
  var result = { rows: null, sumber: "REKAP_KINERJA", totalDipindai: 0, fallbackReason: "" };
  try {
    if (typeof readRiwayatIndexAktif2B2A_ !== "function" || !readRiwayatIndexAktif2B2A_()) {
      throw new Error("INDEX_READ_NONAKTIF");
    }
    if (typeof bacaCircuitReadRiwayat2B2A_ === "function") {
      var circuit = bacaCircuitReadRiwayat2B2A_();
      if (circuit && circuit.aktif) throw new Error("INDEX_CIRCUIT_AKTIF");
    }
    var health = cekKesehatanRinganReadRiwayatIndex2B2A_();
    if (!health.valid) throw new Error("INDEX_TIDAK_SEHAT_" + String(health.alasan || ""));

    var entries = bacaKandidatIndexRiwayat2B2A_(idUser, {});
    var rowsByNumber = bacaBarisRekapTerpilih2B2A_(entries);
    // Fungsi utama di bawah berjalan dari indeks terakhir ke awal. Susun baris
    // secara ascending agar urutan hasil tetap identik dengan Rekap_Kinerja.
    result.rows = entries.slice().reverse().map(function (entry) {
      var row = rowsByNumber["r" + entry.rowRekap];
      if (!row) throw new Error("INDEX_ROW_TIDAK_TERSEDIA_" + entry.rowRekap);
      return row;
    });
    result.sumber = "INDEX_LAPORAN_USER_3C4";
    result.totalDipindai = result.rows.length;
    return result;
  } catch (e) {
    result.fallbackReason = String(e && e.message ? e.message : e);
    var sheet = getSheet_("Rekap_Kinerja");
    var lastRow = sheet.getLastRow();
    var width = Math.min(sheet.getLastColumn(), HOTFIX_PERIODE_REVIEW_3B04C1C.INDEX_WIDTH);
    result.rows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
    result.totalDipindai = result.rows.length;
    return result;
  }
}


function ambilRiwayatKuPaged3B04C1c(params, token) {
  params = params || {};
  if (!hotfixPeriodeReviewAktif3B04C1c_()) {
    return fallbackRiwayat3B04C1c_(params, token, "FEATURE_NONAKTIF");
  }

  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi tidak valid.", items: [], total: 0, hasMore: false };

    var mode = typeof normalisasiDasarPeriode3B04C1b_ === "function"
      ? normalisasiDasarPeriode3B04C1b_(params.dasarFilter)
      : (String(params.dasarFilter || "") === "periode_review" ? "periode_review" : "pengiriman");
    var targetPeriod = normalisasiPeriode3B04C1c_(params.periodeReview || params.bulan);
    var keyword = String(params.keyword || "").trim().toLowerCase();
    var offset = Math.max(0, Number(params.offset) || 0);
    var limit = Math.max(1, Math.min(HOTFIX_PERIODE_REVIEW_3B04C1C.EMPLOYEE_MAX_PAGE, Number(params.limit) || 20));
    var targetId = normalizeId_(params.fokusIdLaporan || params.fokusId || "");

    if (!targetPeriod) {
      return { sukses: false, pesan: "Periode belum dipilih atau tidak valid.", items: [], total: 0, hasMore: false };
    }

    var rowSource = bacaRowsRiwayatUserIndex3C4_(idUser);
    var rows = rowSource.rows || [];
    var context = buatKonteksCutoff3B04C1c_();
    var selected = [];
    var targetRecord = null;
    var total = 0;

    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i] || [];
      if (!idsEqual_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER], idUser)) continue;

      var id = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]);
      var isTarget = !!(targetId && idsEqual_(id, targetId));
      var metadata = buatMetadataRow3B04C1c_(row, SHEET_COLUMNS.REKAP_KINERJA, context);
      var submitPeriod = periodeKalender3B04C1c_(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      var matchesPeriod = mode === "periode_review"
        ? metadata.periodeReview === targetPeriod
        : submitPeriod === targetPeriod;

      if (!matchesPeriod && !isTarget) continue;

      var time = parseTanggal3B04C1c_(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      var timeText = time
        ? Utilities.formatDate(time, HOTFIX_PERIODE_REVIEW_3B04C1C.TIMEZONE, "dd/MM/yyyy HH:mm")
        : String(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN] || "");
      var searchText = [
        timeText,
        row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI],
        row[SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI],
        row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW],
        row[SHEET_COLUMNS.REKAP_KINERJA.CATATAN_ADMIN],
        id,
        metadata.periodeAsalLabel,
        metadata.periodeReviewLabel
      ].join(" ").toLowerCase();
      if (keyword && searchText.indexOf(keyword) === -1 && !isTarget) continue;

      var record = { row: row, metadata: metadata };
      if (isTarget) targetRecord = record;
      if (total >= offset && selected.length < limit) selected.push(record);
      total++;
    }

    if (targetRecord) {
      var targetAlready = selected.some(function (record) {
        return idsEqual_(record.row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN], targetId);
      });
      if (!targetAlready) selected.unshift(targetRecord);
    }

    var items = selected.map(function (record) {
      return gabungkanMetadata3B04C1c_(
        buatItemRiwayatRow3B04C1c_(record.row, idUser),
        record.metadata
      );
    });

    var result = {
      sukses: true,
      items: items,
      total: total,
      limit: limit,
      offset: offset,
      nextOffset: offset + items.length,
      hasMore: total > (offset + limit),
      bulan: targetPeriod,
      periodeReview: mode === "periode_review" ? targetPeriod : "",
      periodeReviewLabel: mode === "periode_review" ? labelPeriode3B04C1c_(targetPeriod) : "",
      dasarFilterDiminta: mode,
      dasarFilterEfektif: mode,
      patch3B04C1c: {
        versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
        aktif: true,
        fallback: false,
        mode: mode,
        resolverRentangCutoff: true,
        optimasiSatuScan: true,
        totalBarisDipindai: rowSource.totalDipindai,
        sumberData: rowSource.sumber,
        fallbackIndexReason: rowSource.fallbackReason || "",
        totalRentangCutoff: context.totalRanges,
        sumberDefaultDigunakan: false,
        dataDiubah: false,
        poinDiubah: false,
        statusReviewDiubah: false
      }
    };

    return typeof siapkanResponsClient3B04C1b_ === "function"
      ? siapkanResponsClient3B04C1b_(result)
      : result;
  } catch (error) {
    return fallbackRiwayat3B04C1c_(params, token, error);
  }
}


function cariRowLaporan3B04C1c_(idLaporan) {
  var id = normalizeId_(idLaporan);
  if (!id) return null;
  var sheet = getSheet_("Rekap_Kinerja");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var width = Math.min(sheet.getLastColumn(), HOTFIX_PERIODE_REVIEW_3B04C1C.INDEX_WIDTH);
  var rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (idsEqual_(rows[i][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN], id)) {
      return rows[i];
    }
  }
  return null;
}


function ambilDetailRiwayatLaporan3B04C1c(idLaporan, token) {
  if (!hotfixPeriodeReviewAktif3B04C1c_()) {
    return ambilDetailRiwayatLaporan3B04C1(idLaporan, token);
  }

  try {
    var base = ambilDetailRiwayatLaporan(idLaporan, token);
    if (!base || base.sukses === false || !base.data) return base;
    var row = cariRowLaporan3B04C1c_(base.data.idLaporan || idLaporan);
    if (!row) return base;
    var metadata = buatMetadataRow3B04C1c_(
      row,
      SHEET_COLUMNS.REKAP_KINERJA,
      buatKonteksCutoff3B04C1c_()
    );
    var result = salinData3B04C1c_(base);
    result.data = gabungkanMetadata3B04C1c_(base.data, metadata);
    result.patch3B04C1c = {
      versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
      aktif: true,
      fallback: false,
      resolverRentangCutoff: true,
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false
    };
    return typeof siapkanResponsClient3B04C1b_ === "function"
      ? siapkanResponsClient3B04C1b_(result)
      : result;
  } catch (error) {
    return ambilDetailRiwayatLaporan3B04C1(idLaporan, token);
  }
}


function filterStatusItem3B04C1c_(item, filterStatus) {
  var filter = String(filterStatus || "semua").trim().toLowerCase();
  if (filter === "menunggu") {
    return typeof isPendingReviewStatus_ === "function"
      ? isPendingReviewStatus_(String(item.status || ""))
      : String(item.status || "") === "Menunggu Review";
  }
  if (filter === "lewat_periode") return item.lewatPeriode === true;
  return true;
}


function fallbackAdmin3B04C1c_(args, reason) {
  var response = ambilLaporanAdminPerPegawai3B04C1b(
    args.selectedId,
    args.filterStatus,
    args.dasarPeriode,
    args.periodeReview,
    args.tanggalMulai,
    args.tanggalAkhir,
    args.offset,
    args.limit,
    args.token
  );
  response = response || { sukses: false, items: [], summary: {} };
  response.patch3B04C1c = {
    versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
    aktif: false,
    configuredAktif: hotfixPeriodeReviewAktif3B04C1c_(),
    fallback: true,
    fallbackReason: reason && reason.message ? String(reason.message) : String(reason || "FEATURE_NONAKTIF"),
    resolverRentangCutoff: false,
    optimasiSatuScan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false
  };
  return typeof siapkanResponsClient3B04C1b_ === "function"
    ? siapkanResponsClient3B04C1b_(response)
    : response;
}


function ambilLaporanAdminPerPegawai3B04C1c(
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
  var args = {
    selectedId: selectedId,
    filterStatus: filterStatus,
    dasarPeriode: dasarPeriode,
    periodeReview: periodeReview,
    tanggalMulai: tanggalMulai,
    tanggalAkhir: tanggalAkhir,
    offset: offset,
    limit: limit,
    token: token
  };

  if (!hotfixPeriodeReviewAktif3B04C1c_()) {
    return fallbackAdmin3B04C1c_(args, "FEATURE_NONAKTIF");
  }

  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", pegawai: null, summary: {}, items: [] };
    if (!cekHakAksesAdmin(idUser)) return { sukses: false, pesan: "Akses ditolak.", pegawai: null, summary: {}, items: [] };

    var targetId = normalizeId_(selectedId);
    if (!targetId) return { sukses: false, pesan: "Pegawai belum dipilih.", pegawai: null, summary: {}, items: [] };

    var mode = typeof normalisasiDasarPeriode3B04C1b_ === "function"
      ? normalisasiDasarPeriode3B04C1b_(dasarPeriode)
      : (String(dasarPeriode || "") === "periode_review" ? "periode_review" : "pengiriman");
    var targetPeriod = normalisasiPeriode3B04C1c_(periodeReview);
    if (mode === "periode_review" && !targetPeriod) {
      return { sukses: false, pesan: "Periode review belum dipilih atau tidak valid.", pegawai: null, summary: {}, items: [] };
    }

    var startDate = typeof parseDateOnly_ === "function" ? parseDateOnly_(tanggalMulai) : parseTanggal3B04C1c_(tanggalMulai);
    var endDate = typeof parseDateOnly_ === "function" ? parseDateOnly_(tanggalAkhir) : parseTanggal3B04C1c_(tanggalAkhir);
    if (mode === "pengiriman") {
      if (!startDate || !endDate) throw new Error("Rentang pengiriman tidak valid.");
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    var startOffset = Math.max(0, Number(offset) || 0);
    var pageSize = Math.max(1, Math.min(HOTFIX_PERIODE_REVIEW_3B04C1C.ADMIN_MAX_PAGE, Number(limit) || 10));
    var sheet = getSheet_("Rekap_Kinerja");
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var width = Math.min(lastColumn, HOTFIX_PERIODE_REVIEW_3B04C1C.INDEX_WIDTH);
    var rows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, width).getValues() : [];
    var context = buatKonteksCutoff3B04C1c_();
    var pegawai = typeof getPegawaiById_ === "function" ? getPegawaiById_(targetId) : null;
    var pegawaiInfo = pegawai ? {
      id: normalizeId_(pegawai.id || targetId),
      username: pegawai.username || "",
      nama: pegawai.nama || "",
      jabatan: pegawai.jabatan || ""
    } : { id: targetId, username: "", nama: "", jabatan: "" };

    var summary = {
      totalLaporan: 0,
      totalMenunggu: 0,
      totalSelesai: 0,
      totalLewatPeriode: 0,
      totalDialihkan: 0
    };
    var filteredCount = 0;
    var selectedRecords = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || [];
      if (!idsEqual_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER], targetId)) continue;
      var jabatan = String(row[SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || "");
      if (typeof isLurah_ === "function" && isLurah_(jabatan)) continue;
      if (!pegawaiInfo.nama) pegawaiInfo.nama = String(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "");
      if (!pegawaiInfo.jabatan) pegawaiInfo.jabatan = jabatan;

      var metadata = buatMetadataRow3B04C1c_(row, SHEET_COLUMNS.REKAP_KINERJA, context);
      var submitDate = parseTanggal3B04C1c_(row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN]);
      var inScope = mode === "periode_review"
        ? metadata.periodeReview === targetPeriod
        : !!(submitDate && submitDate >= startDate && submitDate <= endDate);
      if (!inScope) continue;

      var status = String(row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "");
      var summaryItem = {
        status: status,
        lewatPeriode: metadata.lewatPeriode,
        dialihkan: metadata.dialihkan
      };
      summary.totalLaporan++;
      if (typeof isPendingReviewStatus_ === "function" && isPendingReviewStatus_(status)) summary.totalMenunggu++;
      else summary.totalSelesai++;
      if (metadata.lewatPeriode) summary.totalLewatPeriode++;
      if (metadata.dialihkan) summary.totalDialihkan++;

      if (!filterStatusItem3B04C1c_(summaryItem, filterStatus)) continue;
      if (filteredCount >= startOffset && selectedRecords.length < pageSize) {
        selectedRecords.push({ sheetRow: i + 2, metadata: metadata });
      }
      filteredCount++;
    }

    var rowNumbers = selectedRecords.map(function (record) { return record.sheetRow; });
    var fullRows = typeof bacaBarisLengkapAdminReviewV2A1C_ === "function"
      ? bacaBarisLengkapAdminReviewV2A1C_(sheet, rowNumbers, lastColumn)
      : {};
    var lampiranCache = {};
    var items = selectedRecords.map(function (record) {
      var fullRow = fullRows[record.sheetRow] || [];
      var item = typeof buildAdminReviewItemFromRow_ === "function"
        ? buildAdminReviewItemFromRow_(fullRow, lampiranCache)
        : {};
      if (typeof injectKolomKQKeItemReview_ === "function") {
        item = injectKolomKQKeItemReview_(item, fullRow);
      }
      return gabungkanMetadata3B04C1c_(item, record.metadata);
    });

    var result = {
      sukses: true,
      pegawai: pegawaiInfo,
      summary: summary,
      items: items,
      totalFiltered: filteredCount,
      offset: startOffset,
      limit: pageSize,
      nextOffset: startOffset + items.length,
      hasMore: (startOffset + items.length) < filteredCount,
      tanggalMulai: mode === "pengiriman" ? String(tanggalMulai || "") : "",
      tanggalAkhir: mode === "pengiriman" ? String(tanggalAkhir || "") : "",
      periodeReview: mode === "periode_review" ? targetPeriod : "",
      periodeReviewLabel: mode === "periode_review" ? labelPeriode3B04C1c_(targetPeriod) : "",
      dasarPeriodeDiminta: mode,
      dasarPeriodeEfektif: mode,
      patch3B04C1c: {
        versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
        aktif: true,
        fallback: false,
        mode: mode,
        resolverRentangCutoff: true,
        optimasiSatuScan: true,
        totalBarisDipindai: rows.length,
        totalBarisLengkapDibaca: rowNumbers.length,
        totalRentangCutoff: context.totalRanges,
        sumberDefaultDigunakan: false,
        dataDiubah: false,
        poinDiubah: false,
        statusReviewDiubah: false
      }
    };

    return typeof siapkanResponsClient3B04C1b_ === "function"
      ? siapkanResponsClient3B04C1b_(result)
      : result;
  } catch (error) {
    return fallbackAdmin3B04C1c_(args, error);
  }
}


function ujiResolverRentangCutoff3B04C1c_() {
  function range(period, start, cutoff) {
    var startDate = new Date(start);
    var cutoffDate = new Date(cutoff);
    return {
      periode: period,
      start: startDate,
      end: new Date(cutoffDate.getTime() + 1),
      endInclusive: cutoffDate,
      cutoffDate: cutoffDate,
      sumber: "TEST_MANUAL"
    };
  }

  var june = range("2026-06", "2026-05-27T00:00:00+07:00", "2026-06-29T11:00:00+07:00");
  var july = range("2026-07", "2026-06-30T00:00:00+07:00", "2026-07-29T16:00:00+07:00");
  var august = range("2026-08", "2026-07-30T00:00:00+07:00", "2026-08-27T17:30:00+07:00");
  var context = {
    byPeriod: { "2026-06": june, "2026-07": july, "2026-08": august },
    ranges: [june, july, august],
    totalRanges: 3
  };

  function row(activity, submit, kategori, bulanWajib) {
    var result = [];
    result[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_KEGIATAN] = new Date(activity);
    result[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN] = new Date(submit);
    result[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] = kategori || "";
    result[SHEET_COLUMNS.REKAP_KINERJA.REVISI_KE] = 0;
    result[SHEET_COLUMNS.REKAP_KINERJA.TERAKHIR_DIREVISI_PADA] = "";
    if (bulanWajib) {
      result[SHEET_COLUMNS.REKAP_KINERJA.PAYLOAD_JSON] = JSON.stringify({
        detailWajibPamong: { bulan: bulanWajib }
      });
    }
    return result;
  }

  var june30 = buatMetadataRow3B04C1c_(
    row("2026-06-30T10:00:00+07:00", "2026-07-06T15:27:00+07:00"),
    SHEET_COLUMNS.REKAP_KINERJA,
    context
  );
  var lateJuly = buatMetadataRow3B04C1c_(
    row("2026-07-28T10:00:00+07:00", "2026-07-31T16:25:00+07:00"),
    SHEET_COLUMNS.REKAP_KINERJA,
    context
  );
  var july31Activity = buatMetadataRow3B04C1c_(
    row("2026-07-31T10:00:00+07:00", "2026-07-31T16:25:00+07:00"),
    SHEET_COLUMNS.REKAP_KINERJA,
    context
  );
  var mandatoryJulyReportedAugust = buatMetadataRow3B04C1c_(
    row(
      "2026-07-01T10:00:00+07:00",
      "2026-08-06T15:56:00+07:00",
      "Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Bulanan",
      "2026-07"
    ),
    SHEET_COLUMNS.REKAP_KINERJA,
    context
  );

  var valid =
    june30.periodeAsal === "2026-07" &&
    june30.periodeReview === "2026-07" &&
    june30.lewatPeriode === false &&
    lateJuly.periodeAsal === "2026-07" &&
    lateJuly.periodeReview === "2026-08" &&
    lateJuly.lewatPeriode === true &&
    july31Activity.periodeAsal === "2026-08" &&
    july31Activity.periodeReview === "2026-08" &&
    july31Activity.lewatPeriode === false &&
    mandatoryJulyReportedAugust.periodeAsal === "2026-08" &&
    mandatoryJulyReportedAugust.periodeReview === "2026-08" &&
    mandatoryJulyReportedAugust.lewatPeriode === false &&
    mandatoryJulyReportedAugust.bulanIsiLaporanWajib === "2026-07";

  return {
    valid: valid,
    tanggal30Juni: june30,
    terlambatJuli: lateJuly,
    kegiatan31Juli: july31Activity,
    wajibJuliDilaporAgustus: mandatoryJulyReportedAugust
  };
}

function statusHotfixPeriodeReview3B04C1c() {
  pastikanMaintainerPortal3B0_("STATUS_HOTFIX_PERIODE_REVIEW_3B04C1C");
  var result = {
    sukses: true,
    versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    aktif: hotfixPeriodeReviewAktif3B04C1c_(),
    c1bAktif: typeof penyempurnaanPeriodeReviewAktif3B04C1b_ === "function"
      ? penyempurnaanPeriodeReviewAktif3B04C1b_()
      : false,
    resolverRentangCutoff: true,
    cutoffDefaultDigunakan: false,
    endpointPegawaiTersedia: typeof ambilRiwayatKuPaged3B04C1c === "function",
    endpointDetailTersedia: typeof ambilDetailRiwayatLaporan3B04C1c === "function",
    endpointAdminTersedia: typeof ambilLaporanAdminPerPegawai3B04C1c === "function",
    optimasiSatuScan: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiHotfixPeriodeReview3B04C1c() {
  pastikanMaintainerPortal3B0_("VALIDASI_HOTFIX_PERIODE_REVIEW_3B04C1C");
  var c1b = typeof validasiPenyempurnaanPeriodeReview3B04C1b === "function"
    ? validasiPenyempurnaanPeriodeReview3B04C1b()
    : { valid: false, issues: ["Validasi C1b tidak tersedia."] };
  var synthetic = ujiResolverRentangCutoff3B04C1c_();
  var dependencies = {
    sheet: typeof getSheet_ === "function",
    session: typeof validasiSession === "function",
    adminAccess: typeof cekHakAksesAdmin === "function",
    adminBuilder: typeof buildAdminReviewItemFromRow_ === "function",
    adminTwoStage: typeof bacaBarisLengkapAdminReviewV2A1C_ === "function",
    safeResponse: typeof siapkanResponsClient3B04C1b_ === "function"
  };
  var dependencyValid = Object.keys(dependencies).every(function (key) {
    return dependencies[key] === true;
  });
  var issues = [];
  if (c1b.valid !== true) issues.push("Validasi C1b belum lulus.");
  if (!synthetic.valid) issues.push("Skenario resolver rentang cut-off belum lulus.");
  if (!dependencyValid) issues.push("Dependency endpoint optimasi belum lengkap.");

  var valid = c1b.valid === true && synthetic.valid === true && dependencyValid && issues.length === 0;
  var result = {
    sukses: valid,
    valid: valid,
    versi: HOTFIX_PERIODE_REVIEW_3B04C1C.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    c1bValid: c1b.valid === true,
    dependencies: dependencies,
    skenarioRentang: synthetic,
    tanggal30JuniMasukJuli:
      synthetic.tanggal30Juni && synthetic.tanggal30Juni.periodeAsal === "2026-07",
    tanggal30JuniTidakLewatPeriode:
      synthetic.tanggal30Juni && synthetic.tanggal30Juni.lewatPeriode === false,
    laporanJuliTerlambatDialihkanAgustus:
      synthetic.terlambatJuli && synthetic.terlambatJuli.periodeReview === "2026-08",
    kegiatanSetelahCutoffMasukPeriodeBerikutnya:
      synthetic.kegiatan31Juli && synthetic.kegiatan31Juli.periodeAsal === "2026-08",
    cutoffDefaultDigunakan: false,
    optimasiSatuScan: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: issues
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanHotfixPeriodeReview3B04C1c() {
  pastikanMaintainerPortal3B0_("AKTIFKAN_HOTFIX_PERIODE_REVIEW_3B04C1C");
  var validation = validasiHotfixPeriodeReview3B04C1c();
  if (!validation.valid) {
    return {
      sukses: false,
      aktif: false,
      validation: validation,
      pesan: "Hotfix C1c tidak diaktifkan karena validasi belum lulus."
    };
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty(SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY, "true");
  props.setProperty(PENYEMPURNAAN_PERIODE_REVIEW_3B04C1B.PROPERTY, "true");
  props.setProperty(HOTFIX_PERIODE_REVIEW_3B04C1C.PROPERTY, "true");

  var result = statusHotfixPeriodeReview3B04C1c();
  result.pesan = "Hotfix 3B-0.4C1c telah diaktifkan.";
  return result;
}


function nonaktifkanHotfixPeriodeReview3B04C1c() {
  pastikanMaintainerPortal3B0_("NONAKTIFKAN_HOTFIX_PERIODE_REVIEW_3B04C1C");
  PropertiesService.getScriptProperties().setProperty(
    HOTFIX_PERIODE_REVIEW_3B04C1C.PROPERTY,
    "false"
  );
  var result = statusHotfixPeriodeReview3B04C1c();
  result.pesan = "Hotfix C1c dinonaktifkan; endpoint kembali ke C1b.";
  return result;
}

// ===== END HOTFIX 3B-0.4C1c =====
