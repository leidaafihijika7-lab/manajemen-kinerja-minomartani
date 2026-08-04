// ============================================================
// PATCH 3B-0.4C1
// SINKRONISASI CUT-OFF DAN PENGINGAT TUTUP PERIODE
//
// Baseline aplikasi : APP_VERSION 2026.08.03.02
// Target aplikasi   : APP_VERSION 2026.08.04.02
//
// Prinsip bisnis:
// - tanggal/jam cut-off tidak ditentukan otomatis;
// - cut-off sah berasal dari konfigurasi yang disimpan admin;
// - Tutup Periode Laporan tetap merupakan tindakan administratif;
// - laporan setelah cut-off tetap tersimpan sebagai arsip;
// - antrean review dialihkan secara logis ke periode berikutnya;
// - status review, poin, dan Spreadsheet tidak diubah patch ini.
// ============================================================

var SINKRONISASI_CUTOFF_PERIODE_3B04C1 = {
  VERSION: "3B04C1a-2026.08.04.02",
  PROPERTY: "SINKRONISASI_CUTOFF_PERIODE_3B04C1_ENABLED",
  MAX_FORWARD_MONTHS: 36
};


function sinkronisasiCutoffPeriodeAktif3B04C1_() {
  var raw = PropertiesService
    .getScriptProperties()
    .getProperty(SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY);

  return String(raw || "").trim().toLowerCase() === "true";
}


function salinObject3B04C1_(source) {
  var result = {};
  source = source || {};
  Object.keys(source).forEach(function (key) {
    result[key] = source[key];
  });
  return result;
}


function normalisasiPeriode3B04C1_(value) {
  var raw = String(value || "").trim();
  var m = raw.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  var month = Number(m[2]);
  if (month < 1 || month > 12) return "";
  return m[1] + "-" + m[2];
}


function periodeBerikutnya3B04C1_(periode) {
  var p = normalisasiPeriode3B04C1_(periode);
  if (!p) return "";
  var y = Number(p.slice(0, 4));
  var m = Number(p.slice(5, 7)) - 1;
  return Utilities.formatDate(
    new Date(y, m + 1, 1, 12, 0, 0, 0),
    "GMT+7",
    "yyyy-MM"
  );
}


function labelPeriode3B04C1_(periode) {
  var p = normalisasiPeriode3B04C1_(periode);
  if (!p) return "";

  try {
    if (typeof labelPembayaranPeriode_ === "function") {
      return String(labelPembayaranPeriode_(p) || p);
    }
  } catch (eLabel) {}

  var months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return months[Number(p.slice(5, 7)) - 1] + " " + p.slice(0, 4);
}


function parseTanggal3B04C1_(value) {
  var d = null;
  try {
    if (typeof parseTanggal === "function") d = parseTanggal(value);
  } catch (eParse) {}

  if (!(d instanceof Date) || isNaN(d.getTime()) || d.getTime() === 0) {
    if (value instanceof Date) d = new Date(value.getTime());
    else d = new Date(value);
  }

  return d instanceof Date && !isNaN(d.getTime()) && d.getTime() !== 0
    ? d
    : null;
}


function formatTanggal3B04C1_(value) {
  var d = parseTanggal3B04C1_(value);
  if (!d) return "";
  return Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy HH:mm") + " WIB";
}




// ============================================================
// HOTFIX 3B-0.4C1a — SERIALISASI AMAN GOOGLE.SCRIPT.RUN
//
// Respons endpoint HTML Service tidak boleh membawa Date mentah,
// object layanan Apps Script, function, undefined, atau siklus object.
// Hotfix mengonversi Date menjadi string dan menolak object non-plain.
// ============================================================

var SERIALISASI_CLIENT_3B04C1A = {
  VERSION: "3B04C1a-2026.08.04.02",
  MAX_DEPTH: 40
};

var OMIT_CLIENT_3B04C1A_ = {};


function formatTanggalClient3B04C1a_(value) {
  var d = parseTanggal3B04C1_(value);
  if (!d) return "";

  try {
    if (typeof formatTanggalJamISO_ === "function") {
      return String(formatTanggalJamISO_(d) || "");
    }
  } catch (eFormatExisting) {}

  return Utilities.formatDate(
    d,
    "GMT+7",
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}


function tagObjectClient3B04C1a_(value) {
  try {
    return Object.prototype.toString.call(value);
  } catch (eTag) {
    return "[object Unknown]";
  }
}


function serialisasiNilaiClient3B04C1a_(
  value,
  path,
  stack,
  depth,
  issues,
  conversions
) {
  if (value === null) return null;

  var valueType = typeof value;

  if (valueType === "string" || valueType === "boolean") {
    return value;
  }

  if (valueType === "number") {
    return isFinite(value) ? value : null;
  }

  if (
    valueType === "undefined" ||
    valueType === "function" ||
    valueType === "symbol"
  ) {
    conversions.push({
      path: path,
      from: valueType,
      to: "OMITTED"
    });
    return OMIT_CLIENT_3B04C1A_;
  }

  var objectTag = tagObjectClient3B04C1a_(value);
  if (value instanceof Date || objectTag === "[object Date]") {
    var formattedDate = formatTanggalClient3B04C1a_(value);
    conversions.push({
      path: path,
      from: "Date",
      to: "string"
    });
    return formattedDate;
  }

  if (depth > SERIALISASI_CLIENT_3B04C1A.MAX_DEPTH) {
    issues.push({
      path: path,
      code: "MAX_DEPTH_EXCEEDED"
    });
    return null;
  }

  if (stack.indexOf(value) !== -1) {
    issues.push({
      path: path,
      code: "CIRCULAR_REFERENCE"
    });
    return null;
  }

  stack.push(value);

  if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      var arrayValue = serialisasiNilaiClient3B04C1a_(
        value[i],
        path + "[" + i + "]",
        stack,
        depth + 1,
        issues,
        conversions
      );
      arr.push(arrayValue === OMIT_CLIENT_3B04C1A_ ? null : arrayValue);
    }
    stack.pop();
    return arr;
  }

  var tag = objectTag;
  if (tag !== "[object Object]") {
    issues.push({
      path: path,
      code: "NON_PLAIN_OBJECT",
      objectTag: tag
    });
    stack.pop();
    return null;
  }

  var result = {};
  var keys = Object.keys(value);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var propertyValue;

    try {
      propertyValue = value[key];
    } catch (eRead) {
      issues.push({
        path: path + "." + key,
        code: "PROPERTY_READ_FAILED",
        message: String(eRead && eRead.message ? eRead.message : eRead)
      });
      continue;
    }

    var safeValue = serialisasiNilaiClient3B04C1a_(
      propertyValue,
      path + "." + key,
      stack,
      depth + 1,
      issues,
      conversions
    );

    if (safeValue !== OMIT_CLIENT_3B04C1A_) {
      result[key] = safeValue;
    }
  }

  stack.pop();
  return result;
}


function auditNilaiClient3B04C1a_(value, path, stack, depth, issues) {
  if (value === null) return;

  var valueType = typeof value;
  if (
    valueType === "string" ||
    valueType === "boolean" ||
    valueType === "number"
  ) {
    if (valueType === "number" && !isFinite(value)) {
      issues.push({ path: path, code: "NON_FINITE_NUMBER" });
    }
    return;
  }

  if (
    valueType === "undefined" ||
    valueType === "function" ||
    valueType === "symbol"
  ) {
    issues.push({ path: path, code: "FORBIDDEN_TYPE", type: valueType });
    return;
  }

  var objectTag = tagObjectClient3B04C1a_(value);
  if (value instanceof Date || objectTag === "[object Date]") {
    issues.push({ path: path, code: "RAW_DATE" });
    return;
  }

  if (depth > SERIALISASI_CLIENT_3B04C1A.MAX_DEPTH) {
    issues.push({ path: path, code: "MAX_DEPTH_EXCEEDED" });
    return;
  }

  if (stack.indexOf(value) !== -1) {
    issues.push({ path: path, code: "CIRCULAR_REFERENCE" });
    return;
  }

  stack.push(value);

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      auditNilaiClient3B04C1a_(
        value[i],
        path + "[" + i + "]",
        stack,
        depth + 1,
        issues
      );
    }
    stack.pop();
    return;
  }

  var tag = objectTag;
  if (tag !== "[object Object]") {
    issues.push({ path: path, code: "NON_PLAIN_OBJECT", objectTag: tag });
    stack.pop();
    return;
  }

  Object.keys(value).forEach(function (key) {
    auditNilaiClient3B04C1a_(
      value[key],
      path + "." + key,
      stack,
      depth + 1,
      issues
    );
  });

  stack.pop();
}


function assertResponsClientSerializable3B04C1a_(value) {
  var issues = [];
  auditNilaiClient3B04C1a_(value, "$", [], 0, issues);
  return {
    valid: issues.length === 0,
    issues: issues
  };
}


function buatResponsClientAman3B04C1a_(value) {
  var issues = [];
  var conversions = [];
  var safeValue = serialisasiNilaiClient3B04C1a_(
    value,
    "$",
    [],
    0,
    issues,
    conversions
  );

  if (safeValue === OMIT_CLIENT_3B04C1A_) safeValue = null;

  var audit = assertResponsClientSerializable3B04C1a_(safeValue);
  var allIssues = issues.concat(audit.issues || []);

  return {
    valid: allIssues.length === 0,
    value: safeValue,
    issues: allIssues,
    conversions: conversions
  };
}


function pastikanResponsClientAman3B04C1a_(value) {
  var result = buatResponsClientAman3B04C1a_(value);
  if (!result.valid) {
    var first = result.issues && result.issues.length
      ? JSON.stringify(result.issues[0])
      : "UNKNOWN_SERIALIZATION_ERROR";
    throw new Error("RESPONS_CLIENT_TIDAK_AMAN: " + first);
  }
  return result.value;
}


function ujiSerialisasiRespons3B04C1a_() {
  var synthetic = {
    sukses: true,
    items: [
      {
        idLaporan: "TEST-SERIAL-3B04C1A",
        riwayatPengalihan: [
          {
            periode: "2026-07",
            cutoffDate: new Date(2026, 6, 29, 23, 59, 0, 0)
          }
        ],
        nested: {
          waktu: new Date(2026, 6, 31, 16, 25, 0, 0)
        }
      }
    ]
  };

  var safe = buatResponsClientAman3B04C1a_(synthetic);
  var dateHistory = safe.value && safe.value.items && safe.value.items[0]
    ? safe.value.items[0].riwayatPengalihan[0].cutoffDate
    : null;
  var nestedDate = safe.value && safe.value.items && safe.value.items[0]
    ? safe.value.items[0].nested.waktu
    : null;

  return {
    valid:
      safe.valid === true &&
      typeof dateHistory === "string" &&
      typeof nestedDate === "string" &&
      safe.conversions.length >= 2,
    auditValid: safe.valid === true,
    dateHistoryType: typeof dateHistory,
    nestedDateType: typeof nestedDate,
    conversionCount: safe.conversions.length,
    issues: safe.issues || []
  };
}


function validasiSerialisasiRespons3B04C1a() {
  pastikanMaintainerPortal3B0_("VALIDASI_SERIALISASI_RESPONS_3B04C1A");
  var test = ujiSerialisasiRespons3B04C1a_();
  var result = {
    sukses: test.valid === true,
    valid: test.valid === true,
    versi: SERIALISASI_CLIENT_3B04C1A.VERSION,
    nestedDateConverted: test.nestedDateType === "string",
    historyDateConverted: test.dateHistoryType === "string",
    conversionCount: test.conversionCount,
    clientAuditValid: test.auditValid === true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    issues: test.issues || []
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function tanggalDanJamInput3B04C1_(value) {
  var d = parseTanggal3B04C1_(value);
  if (!d) return { tanggal: "", jam: "" };
  return {
    tanggal: Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd"),
    jam: Utilities.formatDate(d, "GMT+7", "HH:mm:ss")
  };
}


function periodeKalenderDariTanggal3B04C1_(value) {
  var d = parseTanggal3B04C1_(value);
  return d ? Utilities.formatDate(d, "GMT+7", "yyyy-MM") : "";
}


function periodeAsalRow3B04C1_(row, columns) {
  row = row || [];
  columns = columns || SHEET_COLUMNS.REKAP_KINERJA;

  try {
    if (
      typeof parsePayloadAudit3B04A_ === "function" &&
      typeof ambilPeriodeEksplisitPayload3B04A_ === "function"
    ) {
      var payload = parsePayloadAudit3B04A_(row, columns);
      var explicit = normalisasiPeriode3B04C1_(
        ambilPeriodeEksplisitPayload3B04A_(payload)
      );
      if (explicit) {
        return { periode: explicit, sumber: "PAYLOAD_EXPLICIT" };
      }
    }
  } catch (ePayload) {}

  var kegiatan = periodeKalenderDariTanggal3B04C1_(
    row[columns.TANGGAL_KEGIATAN]
  );
  if (kegiatan) {
    return { periode: kegiatan, sumber: "BULAN_TANGGAL_KEGIATAN" };
  }

  var submit = periodeKalenderDariTanggal3B04C1_(
    row[columns.TANGGAL_LAPORAN]
  );
  if (submit) {
    return { periode: submit, sumber: "BULAN_TANGGAL_SUBMIT" };
  }

  return { periode: "", sumber: "TANGGAL_TIDAK_VALID" };
}


function waktuReviewRow3B04C1_(row, columns) {
  row = row || [];
  columns = columns || SHEET_COLUMNS.REKAP_KINERJA;

  var submitDate = parseTanggal3B04C1_(row[columns.TANGGAL_LAPORAN]);
  var revisionDate = parseTanggal3B04C1_(row[columns.TERAKHIR_DIREVISI_PADA]);
  var revisionNumber = Math.max(0, Number(row[columns.REVISI_KE]) || 0);

  var effectiveDate = revisionNumber > 0 && revisionDate
    ? revisionDate
    : submitDate;

  return {
    submitDate: submitDate,
    revisionDate: revisionDate,
    revisionNumber: revisionNumber,
    effectiveDate: effectiveDate,
    sumber: revisionNumber > 0 && revisionDate
      ? "WAKTU_REVISI"
      : "WAKTU_SUBMIT"
  };
}


/**
 * Membaca cut-off operasional tanpa menggunakan tanggal default.
 * Prioritas:
 * 1. cut-off tersimpan dari menu Tunjangan;
 * 2. penutupan periode resmi sebagai fallback kompatibilitas.
 */
function bacaCutoffOperasional3B04C1_(periode) {
  var p = normalisasiPeriode3B04C1_(periode);
  if (!p) return null;

  try {
    if (typeof ambilCutoffTunjanganPeriodeTersimpanSaja_ === "function") {
      var manual = ambilCutoffTunjanganPeriodeTersimpanSaja_(p);
      var manualCutoffDate = manual
        ? parseTanggal3B04C1_(manual.endInclusive)
        : null;
      if (manual && manualCutoffDate) {
        return {
          periode: p,
          cutoffDate: manualCutoffDate,
          sumber: "CUTOFF_TUNJANGAN_ADMIN",
          labelPeriode: labelPeriode3B04C1_(p),
          meta: manual
        };
      }
    }
  } catch (eManual) {}

  try {
    if (typeof bacaTutupPeriodeLaporan_ === "function") {
      var official = bacaTutupPeriodeLaporan_(p);
      var officialCutoffDate = official
        ? parseTanggal3B04C1_(official.cutoffDate)
        : null;
      if (official && officialCutoffDate) {
        return {
          periode: p,
          cutoffDate: officialCutoffDate,
          sumber: "TUTUP_PERIODE_LAPORAN",
          labelPeriode: official.labelPeriode || labelPeriode3B04C1_(p),
          meta: official
        };
      }
    }
  } catch (eOfficial) {}

  return null;
}


function statusPenutupanAdmin3B04C1_(periode) {
  var p = normalisasiPeriode3B04C1_(periode);
  var lock = null;
  try {
    if (typeof bacaTutupPeriodeLaporan_ === "function") {
      lock = bacaTutupPeriodeLaporan_(p);
    }
  } catch (eLock) {}

  return {
    periode: p,
    ditutup: !!lock,
    tanggalTutup: lock && lock.cutoffDate
      ? formatTanggal3B04C1_(lock.cutoffDate)
      : "",
    lock: lock || null
  };
}


function hitungPeriodeReviewDenganResolver3B04C1_(
  periodeAsal,
  waktuEfektif,
  cutoffResolver
) {
  var origin = normalisasiPeriode3B04C1_(periodeAsal);
  var time = parseTanggal3B04C1_(waktuEfektif);
  var resolver = typeof cutoffResolver === "function"
    ? cutoffResolver
    : bacaCutoffOperasional3B04C1_;

  if (!origin || !time) {
    return {
      sukses: false,
      periodeAsal: origin,
      periodeReview: origin,
      dialihkan: false,
      jumlahPeriodeDialihkan: 0,
      kode: "PERIODE_ATAU_WAKTU_TIDAK_VALID",
      riwayatPengalihan: []
    };
  }

  var current = origin;
  var history = [];
  var originCutoff = null;
  var lastCutoff = null;

  for (
    var step = 0;
    step < SINKRONISASI_CUTOFF_PERIODE_3B04C1.MAX_FORWARD_MONTHS;
    step++
  ) {
    var cutoff = resolver(current);

    if (!cutoff || !parseTanggal3B04C1_(cutoff.cutoffDate)) {
      return {
        sukses: true,
        periodeAsal: origin,
        periodeReview: current,
        dialihkan: current !== origin,
        jumlahPeriodeDialihkan: history.length,
        kode: current === origin
          ? "CUTOFF_PERIODE_ASAL_BELUM_DITETAPKAN"
          : "MENUNGGU_CUTOFF_PERIODE_REVIEW",
        riwayatPengalihan: history,
        cutoffPeriodeAsal: originCutoff,
        cutoffPeriodeTerakhir: lastCutoff,
        menungguCutoffPeriodeReview: current !== origin
      };
    }

    var cutoffDate = parseTanggal3B04C1_(cutoff.cutoffDate);
    var cutoffInfo = salinObject3B04C1_(cutoff);
    cutoffInfo.cutoffDate = cutoffDate;
    lastCutoff = cutoffInfo;
    if (!originCutoff) originCutoff = cutoffInfo;

    if (time.getTime() <= cutoffDate.getTime()) {
      return {
        sukses: true,
        periodeAsal: origin,
        periodeReview: current,
        dialihkan: current !== origin,
        jumlahPeriodeDialihkan: history.length,
        kode: current === origin
          ? "TEPAT_PADA_PERIODE_ASAL"
          : "DIALIHKAN_KE_PERIODE_REVIEW",
        riwayatPengalihan: history,
        cutoffPeriodeAsal: originCutoff,
        cutoffPeriodeTerakhir: lastCutoff,
        menungguCutoffPeriodeReview: false
      };
    }

    history.push({
      periode: current,
      cutoffDate: formatTanggalClient3B04C1a_(cutoffDate),
      sumber: cutoff.sumber || ""
    });
    current = periodeBerikutnya3B04C1_(current);
  }

  return {
    sukses: false,
    periodeAsal: origin,
    periodeReview: current,
    dialihkan: current !== origin,
    jumlahPeriodeDialihkan: history.length,
    kode: "BATAS_PENGALIHAN_TERLAMPAUI",
    riwayatPengalihan: history,
    cutoffPeriodeAsal: originCutoff,
    cutoffPeriodeTerakhir: lastCutoff
  };
}


function tentukanPeriodeReview3B04C1_(periodeAsal, waktuEfektif) {
  return hitungPeriodeReviewDenganResolver3B04C1_(
    periodeAsal,
    waktuEfektif,
    bacaCutoffOperasional3B04C1_
  );
}


function metadataDefaultPengalihan3B04C1_() {
  return {
    lewatPeriode: false,
    dialihkan: false,
    jenisKetepatan: "CUTOFF_BELUM_DITETAPKAN",
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


function buatMetadataPengalihanById3B04C1_(idList) {
  var requested = {};
  (idList || []).forEach(function (id) {
    var key = String(id || "").trim();
    if (key) requested[key] = true;
  });

  var requestedKeys = Object.keys(requested);
  if (!requestedKeys.length) return {};

  var sheet = getSheet_("Rekap_Kinerja");
  var columns = SHEET_COLUMNS.REKAP_KINERJA;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  var requiredWidth = Math.max(
    columns.ID_LAPORAN,
    columns.TANGGAL_LAPORAN,
    columns.TANGGAL_KEGIATAN,
    columns.REVISI_KE,
    columns.TERAKHIR_DIREVISI_PADA,
    columns.PAYLOAD_JSON || 0
  ) + 1;
  var width = Math.min(sheet.getLastColumn(), requiredWidth);
  var rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  var result = {};
  var remaining = requestedKeys.length;

  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i] || [];
    var idLaporan = String(row[columns.ID_LAPORAN] || "").trim();
    if (!idLaporan || !requested[idLaporan] || result[idLaporan]) continue;

    var originInfo = periodeAsalRow3B04C1_(row, columns);
    var timing = waktuReviewRow3B04C1_(row, columns);
    var origin = originInfo.periode;

    if (!origin || !timing.effectiveDate) {
      result[idLaporan] = metadataDefaultPengalihan3B04C1_();
      result[idLaporan].jenisKetepatan = "TIDAK_DAPAT_DIKLASIFIKASIKAN";
      result[idLaporan].masalah = "Periode asal atau waktu laporan tidak valid.";
      remaining--;
      if (remaining <= 0) break;
      continue;
    }

    var route = tentukanPeriodeReview3B04C1_(origin, timing.effectiveDate);
    var late = route.dialihkan === true;
    var originCutoff = route.cutoffPeriodeAsal || null;
    var closeStatus = statusPenutupanAdmin3B04C1_(origin);
    var type = "TEPAT_WAKTU";

    if (late) {
      type = timing.sumber === "WAKTU_REVISI"
        ? "REVISI_SETELAH_CUTOFF"
        : "SUBMIT_SETELAH_CUTOFF";
    } else if (route.kode === "CUTOFF_PERIODE_ASAL_BELUM_DITETAPKAN") {
      type = "CUTOFF_BELUM_DITETAPKAN";
    }

    var originLabel = labelPeriode3B04C1_(origin);
    var reviewLabel = labelPeriode3B04C1_(route.periodeReview || origin);
    var actionWord = timing.sumber === "WAKTU_REVISI" ? "Revisi" : "Laporan";
    var message = "";

    if (late) {
      message = actionWord + " melewati cut-off periode " + originLabel +
        " dan direview pada periode " + reviewLabel + ".";
    } else if (type === "CUTOFF_BELUM_DITETAPKAN") {
      message = "Cut-off periode " + originLabel + " belum ditetapkan admin.";
    }

    result[idLaporan] = {
      lewatPeriode: late,
      dialihkan: late,
      jenisKetepatan: type,
      periode: origin,
      periodeLabel: originLabel,
      periodeAsal: origin,
      periodeAsalLabel: originLabel,
      sumberPeriodeAsal: originInfo.sumber,
      periodeReview: route.periodeReview || origin,
      periodeReviewLabel: reviewLabel,
      jumlahPeriodeDialihkan: Number(route.jumlahPeriodeDialihkan || 0),
      riwayatPengalihan: route.riwayatPengalihan || [],
      waktuSubmitPertama: formatTanggal3B04C1_(timing.submitDate),
      waktuRevisi: formatTanggal3B04C1_(timing.revisionDate),
      waktuEfektifReview: formatTanggal3B04C1_(timing.effectiveDate),
      sumberWaktuEfektif: timing.sumber,
      batasAkhirPeriode: originCutoff
        ? formatTanggal3B04C1_(originCutoff.cutoffDate)
        : "",
      sumberCutoff: originCutoff ? String(originCutoff.sumber || "") : "",
      periodeAsalDitutupAdmin: closeStatus.ditutup,
      tanggalPenutupanAdmin: closeStatus.tanggalTutup,
      menungguCutoffPeriodeReview: route.menungguCutoffPeriodeReview === true,
      pesanKetepatan: message,
      kodePengalihan: route.kode || "",
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false
    };

    remaining--;
    if (remaining <= 0) break;
  }

  requestedKeys.forEach(function (id) {
    if (!result[id]) result[id] = metadataDefaultPengalihan3B04C1_();
  });

  return result;
}


function pengingatTutupPeriodeUntukPeriode3B04C1_(periode, nowValue) {
  var p = normalisasiPeriode3B04C1_(periode);
  var cutoff = bacaCutoffOperasional3B04C1_(p);
  if (!p || !cutoff) return null;

  var now = parseTanggal3B04C1_(nowValue) || new Date();
  var closeStatus = statusPenutupanAdmin3B04C1_(p);
  var closedCutoff = closeStatus.lock && closeStatus.lock.cutoffDate
    ? parseTanggal3B04C1_(closeStatus.lock.cutoffDate)
    : null;
  var mismatch = !!(
    closedCutoff &&
    Math.abs(closedCutoff.getTime() - cutoff.cutoffDate.getTime()) > 60000
  );
  var inputParts = tanggalDanJamInput3B04C1_(cutoff.cutoffDate);
  var reached = now.getTime() > cutoff.cutoffDate.getTime();
  var actionNeeded = !closeStatus.ditutup || mismatch;
  var status = "DITUTUP";

  if (!closeStatus.ditutup) {
    status = reached
      ? "MELEWATI_CUTOFF_BELUM_DITUTUP"
      : "CUTOFF_DITETAPKAN_BELUM_DITUTUP";
  } else if (mismatch) {
    status = "TANGGAL_TUTUP_TIDAK_SINKRON";
  }

  return {
    periode: p,
    periodeLabel: labelPeriode3B04C1_(p),
    cutoffAt: formatTanggalJamISO_(cutoff.cutoffDate),
    cutoffLabel: formatTanggal3B04C1_(cutoff.cutoffDate),
    cutoffTanggalInput: inputParts.tanggal,
    cutoffJamInput: inputParts.jam,
    sumberCutoff: cutoff.sumber,
    cutoffSudahTercapai: reached,
    periodeDitutupAdmin: closeStatus.ditutup,
    tanggalTutupAdmin: closeStatus.tanggalTutup,
    tidakSinkron: mismatch,
    perluTindakan: actionNeeded,
    status: status,
    pesan: actionNeeded
      ? ("Cut-off " + labelPeriode3B04C1_(p) + " telah ditetapkan pada " +
          formatTanggal3B04C1_(cutoff.cutoffDate) +
          ", tetapi periode laporan belum ditutup dengan konfigurasi yang sama.")
      : ("Cut-off dan penutupan periode " + labelPeriode3B04C1_(p) + " sudah sinkron.")
  };
}


function buatPengingatTutupPeriodeSetelahCutoff3B04C1_(periode) {
  if (!sinkronisasiCutoffPeriodeAktif3B04C1_()) return null;
  return pengingatTutupPeriodeUntukPeriode3B04C1_(periode, new Date());
}


function daftarPeriodeCutoffAdmin3B04C1_() {
  var result = [];
  var seen = {};
  var props = portalScriptPropertiesSnapshot_();

  for (var key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
    if (key.indexOf("TUNJANGAN_CUTOFF_META_") !== 0) continue;
    var p = normalisasiPeriode3B04C1_(
      key.replace("TUNJANGAN_CUTOFF_META_", "")
    );
    if (p && !seen[p]) {
      seen[p] = true;
      result.push(p);
    }
  }

  result.sort();
  return result;
}


function ambilPengingatTutupPeriode3B04C1(token, periode) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", items: [] };
    }

    if (!cekHakAksesLurahCarikAdmin_(idUser)) {
      return { sukses: false, pesan: "Akses ditolak.", items: [] };
    }

    var aktif = sinkronisasiCutoffPeriodeAktif3B04C1_();
    if (!aktif) {
      return {
        sukses: true,
        aktif: false,
        perluTindakan: false,
        jumlahPerluTindakan: 0,
        items: [],
        pesan: "Patch 3B-0.4C1 belum diaktifkan."
      };
    }

    var selected = normalisasiPeriode3B04C1_(periode || "");
    var periods = selected ? [selected] : daftarPeriodeCutoffAdmin3B04C1_();
    var items = [];

    periods.forEach(function (p) {
      var item = pengingatTutupPeriodeUntukPeriode3B04C1_(p, new Date());
      if (item && item.perluTindakan) items.push(item);
    });

    items.sort(function (a, b) {
      return String(b.periode).localeCompare(String(a.periode));
    });

    return {
      sukses: true,
      aktif: true,
      perluTindakan: items.length > 0,
      jumlahPerluTindakan: items.length,
      items: items,
      pesan: items.length
        ? (items.length + " periode memiliki cut-off tetapi belum ditutup secara administratif.")
        : "Tidak ada periode yang memerlukan penutupan."
    };
  } catch (e) {
    return handleError(
      "ambilPengingatTutupPeriode3B04C1",
      e,
      { sukses: false, pesan: "Gagal membaca pengingat penutupan periode.", items: [] }
    );
  }
}


function statusPatch3B04C1() {
  pastikanMaintainerPortal3B0_("STATUS_PATCH_3B04C1");
  var result = {
    sukses: true,
    versi: SINKRONISASI_CUTOFF_PERIODE_3B04C1.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    aktif: sinkronisasiCutoffPeriodeAktif3B04C1_(),
    cutoffManualTersedia:
      typeof ambilCutoffTunjanganPeriodeTersimpanSaja_ === "function",
    penutupanPeriodeTersedia:
      typeof bacaTutupPeriodeLaporan_ === "function",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiPatch3B04C1() {
  pastikanMaintainerPortal3B0_("VALIDASI_PATCH_3B04C1");

  var cutoffJul = new Date(2026, 6, 29, 23, 59, 0, 0);
  var submitLate = new Date(2026, 6, 31, 16, 25, 0, 0);
  var submitOnTime = new Date(2026, 6, 29, 20, 0, 0, 0);

  function testResolver(period) {
    if (period === "2026-07") {
      return {
        periode: period,
        cutoffDate: cutoffJul,
        sumber: "TEST_CUTOFF_ADMIN"
      };
    }
    return null;
  }

  var late = hitungPeriodeReviewDenganResolver3B04C1_(
    "2026-07",
    submitLate,
    testResolver
  );
  var onTime = hitungPeriodeReviewDenganResolver3B04C1_(
    "2026-07",
    submitOnTime,
    testResolver
  );

  var dependencies = {
    cutoffManual:
      typeof ambilCutoffTunjanganPeriodeTersimpanSaja_ === "function",
    tutupPeriode:
      typeof bacaTutupPeriodeLaporan_ === "function",
    riwayatBase:
      typeof ambilRiwayatKuPaged === "function",
    detailBase:
      typeof ambilDetailRiwayatLaporan === "function",
    spreadsheet:
      typeof getSheet_ === "function"
  };

  var lateValid =
    late.sukses === true &&
    late.dialihkan === true &&
    late.periodeAsal === "2026-07" &&
    late.periodeReview === "2026-08" &&
    late.kode === "MENUNGGU_CUTOFF_PERIODE_REVIEW";

  var onTimeValid =
    onTime.sukses === true &&
    onTime.dialihkan === false &&
    onTime.periodeReview === "2026-07";

  var dependencyValid = Object.keys(dependencies).every(function (key) {
    return dependencies[key] === true;
  });

  var serializationTest = ujiSerialisasiRespons3B04C1a_();
  var serializationValid = serializationTest.valid === true;

  var valid = lateValid && onTimeValid && dependencyValid && serializationValid;
  var issues = [];
  if (!lateValid) issues.push("Skenario lewat cut-off Juli ke Agustus belum lulus.");
  if (!onTimeValid) issues.push("Skenario tepat waktu belum lulus.");
  if (!dependencyValid) issues.push("Satu atau lebih dependency produksi tidak tersedia.");
  if (!serializationValid) issues.push("Respons C1 masih mengandung nilai yang tidak aman untuk google.script.run.");

  var result = {
    sukses: valid,
    valid: valid,
    versi: SINKRONISASI_CUTOFF_PERIODE_3B04C1.VERSION,
    dependencies: dependencies,
    skenarioLewatPeriode: {
      valid: lateValid,
      periodeAsal: late.periodeAsal,
      periodeReview: late.periodeReview,
      dialihkan: late.dialihkan,
      kode: late.kode
    },
    skenarioTepatWaktu: {
      valid: onTimeValid,
      periodeReview: onTime.periodeReview,
      dialihkan: onTime.dialihkan
    },
    serialisasiRespons: {
      valid: serializationValid,
      historyDateConverted: serializationTest.dateHistoryType === "string",
      nestedDateConverted: serializationTest.nestedDateType === "string",
      conversionCount: serializationTest.conversionCount
    },
    badgeKartuDiharuskan: true,
    badgeDetailDiharuskan: true,
    pengingatTunjanganDiharuskan: true,
    bannerDashboardDiharuskan: true,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanPatch3B04C1() {
  pastikanMaintainerPortal3B0_("AKTIFKAN_PATCH_3B04C1");
  var validation =
    typeof validasiHotfix3B04C1a === "function"
      ? validasiHotfix3B04C1a()
      : (typeof validasiPenandaLewatPeriodePegawai3B04C1 === "function"
          ? validasiPenandaLewatPeriodePegawai3B04C1()
          : validasiPatch3B04C1());
  if (!validation.valid) {
    return {
      sukses: false,
      aktif: false,
      validation: validation,
      pesan: "Patch tidak diaktifkan karena validasi belum lulus."
    };
  }

  PropertiesService.getScriptProperties().setProperty(
    SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY,
    "true"
  );

  var result = statusPatch3B04C1();
  result.pesan = "Patch 3B-0.4C1 telah diaktifkan.";
  return result;
}


function nonaktifkanPatch3B04C1() {
  pastikanMaintainerPortal3B0_("NONAKTIFKAN_PATCH_3B04C1");
  PropertiesService.getScriptProperties().setProperty(
    SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY,
    "false"
  );
  var result = statusPatch3B04C1();
  result.pesan = "Patch 3B-0.4C1 dinonaktifkan; endpoint memakai fallback produksi.";
  return result;
}



// ============================================================
// ENTRY POINT HOTFIX 3B-0.4C1a
// ============================================================

function statusHotfix3B04C1a() {
  pastikanMaintainerPortal3B0_("STATUS_HOTFIX_3B04C1A");
  var base = statusPatch3B04C1();
  base.hotfix = "3B-0.4C1a";
  base.serialisasiClientVersion = SERIALISASI_CLIENT_3B04C1A.VERSION;
  base.serialisasiAmanTersedia =
    typeof pastikanResponsClientAman3B04C1a_ === "function";
  return base;
}


function validasiHotfix3B04C1a() {
  pastikanMaintainerPortal3B0_("VALIDASI_HOTFIX_3B04C1A");

  var core = validasiPatch3B04C1();
  var employee = typeof validasiPenandaLewatPeriodePegawai3B04C1 === "function"
    ? validasiPenandaLewatPeriodePegawai3B04C1()
    : { valid: false, issues: ["Validasi penanda pegawai tidak tersedia."] };
  var serialization = validasiSerialisasiRespons3B04C1a();

  var issues = [];
  (core.issues || []).forEach(function (item) { issues.push(item); });
  (employee.issues || []).forEach(function (item) { issues.push(item); });
  (serialization.issues || []).forEach(function (item) {
    issues.push(typeof item === "string" ? item : JSON.stringify(item));
  });

  var valid =
    core.valid === true &&
    employee.valid === true &&
    serialization.valid === true &&
    issues.length === 0;

  var result = {
    sukses: valid,
    valid: valid,
    versi: SERIALISASI_CLIENT_3B04C1A.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    coreValid: core.valid === true,
    employeeMetadataValid: employee.valid === true,
    serializationValid: serialization.valid === true,
    endpointRiwayatTersedia:
      typeof ambilRiwayatKuPaged3B04C1 === "function",
    endpointDetailTersedia:
      typeof ambilDetailRiwayatLaporan3B04C1 === "function",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function aktifkanHotfix3B04C1a() {
  pastikanMaintainerPortal3B0_("AKTIFKAN_HOTFIX_3B04C1A");
  var validation = validasiHotfix3B04C1a();
  if (!validation.valid) {
    return {
      sukses: false,
      aktif: false,
      validation: validation,
      pesan: "Hotfix tidak diaktifkan karena validasi belum lulus."
    };
  }

  PropertiesService.getScriptProperties().setProperty(
    SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY,
    "true"
  );

  var result = statusHotfix3B04C1a();
  result.pesan = "Hotfix 3B-0.4C1a telah diaktifkan.";
  return result;
}


function nonaktifkanHotfix3B04C1a() {
  pastikanMaintainerPortal3B0_("NONAKTIFKAN_HOTFIX_3B04C1A");
  PropertiesService.getScriptProperties().setProperty(
    SINKRONISASI_CUTOFF_PERIODE_3B04C1.PROPERTY,
    "false"
  );
  var result = statusHotfix3B04C1a();
  result.pesan = "Hotfix 3B-0.4C1a dinonaktifkan; Riwayat memakai fallback produksi.";
  return result;
}


// ===== END PATCH 3B-0.4C1a =====
