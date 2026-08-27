// ============================================================
// PATCH 3B-0.4A
// AUDIT DAN KLASIFIKASI LAPORAN LEWAT PERIODE
//
// Baseline produksi : APP_VERSION 2026.08.19.01
// Sifat patch       : read-only / diagnostik
// Penyempurnaan     : 19 Agustus 2026
//
// Patch ini TIDAK:
// - mengubah status review;
// - mengubah poin;
// - mengubah Rekap_Kinerja;
// - mengubah Index_Laporan;
// - mengubah dual-write;
// - mengubah feature flag;
// - membuat sheet baru.
// ============================================================

var AUDIT_LAPORAN_LEWAT_PERIODE_3B04A = {
  VERSION: "3B04A-2026.08.27.02",
  DEFAULT_PERIODE: "2026-07",
  TIMEZONE: "Asia/Jakarta",
  MAX_DETAIL_RETURN: 500,
  MAX_DETAIL_LOG: 10
};


function parseTanggalAudit3B04A_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  try {
    if (typeof parseTanggalKosongAman_ === "function") {
      var aman = parseTanggalKosongAman_(value);
      if (aman instanceof Date && !isNaN(aman.getTime())) {
        return aman;
      }
    }
  } catch (eAman) {}

  try {
    if (typeof parseTanggal === "function") {
      var parsed = parseTanggal(value);
      if (
        parsed instanceof Date &&
        !isNaN(parsed.getTime()) &&
        parsed.getTime() !== 0
      ) {
        return parsed;
      }
    }
  } catch (eParsed) {}

  try {
    var direct = new Date(value);
    if (!isNaN(direct.getTime())) return direct;
  } catch (eDirect) {}

  return null;
}


function periodeValidAudit3B04A_(value) {
  var match = String(value || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return "";

  var bulan = Number(match[2]);
  if (bulan < 1 || bulan > 12) return "";

  return match[1] + "-" + match[2];
}


function tanggalIsoValidAudit3B04A_(value) {
  var match = String(value || "").trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/
  );
  if (!match) return false;

  var tahun = Number(match[1]);
  var bulan = Number(match[2]);
  var tanggal = Number(match[3]);
  var candidate = new Date(tahun, bulan - 1, tanggal, 12, 0, 0, 0);

  return candidate.getFullYear() === tahun &&
    candidate.getMonth() === bulan - 1 &&
    candidate.getDate() === tanggal;
}


function normalisasiPeriodeAudit3B04A_(value) {
  var raw = String(value || "").trim();
  if (!raw) return "";

  var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) {
    if (!tanggalIsoValidAudit3B04A_(raw)) return "";
    return periodeValidAudit3B04A_(iso[1] + "-" + iso[2]);
  }

  try {
    if (typeof normalizePeriode_ === "function") {
      var normalized = normalizePeriode_(raw);
      var periodeNormalized = periodeValidAudit3B04A_(normalized);
      if (periodeNormalized) return periodeNormalized;
    }
  } catch (eNormalize) {}

  var exact = periodeValidAudit3B04A_(raw);
  if (exact) return exact;

  var dateValue = parseTanggalAudit3B04A_(value);
  if (dateValue) {
    return Utilities.formatDate(
      dateValue,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
      "yyyy-MM"
    );
  }

  return "";
}


function labelPeriodeAudit3B04A_(periode) {
  var p = normalisasiPeriodeAudit3B04A_(periode);
  if (!p) return "";

  try {
    if (typeof labelPembayaranPeriode_ === "function") {
      var label = labelPembayaranPeriode_(p);
      if (label) return String(label);
    }
  } catch (eLabel) {}

  var namaBulan = [
    "Januari", "Februari", "Maret", "April",
    "Mei", "Juni", "Juli", "Agustus",
    "September", "Oktober", "November", "Desember"
  ];

  var tahun = Number(p.substring(0, 4));
  var bulan = Number(p.substring(5, 7));

  return bulan >= 1 && bulan <= 12
    ? namaBulan[bulan - 1] + " " + tahun
    : p;
}


function formatTanggalAudit3B04A_(dateValue) {
  var d = parseTanggalAudit3B04A_(dateValue);
  if (!d) return "";

  return Utilities.formatDate(
    d,
    AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
    "dd/MM/yyyy HH:mm:ss"
  ) + " WIB";
}


function formatDurasiTerlambat3B04A_(milliseconds) {
  var totalDetik = Math.max(
    0,
    Math.ceil(Number(milliseconds) / 1000) || 0
  );

  var hari = Math.floor(totalDetik / 86400);
  var jam = Math.floor((totalDetik % 86400) / 3600);
  var menit = Math.floor((totalDetik % 3600) / 60);
  var detik = totalDetik % 60;

  var parts = [];
  if (hari) parts.push(hari + " hari");
  if (jam) parts.push(jam + " jam");
  if (menit) parts.push(menit + " menit");
  if (detik || !parts.length) parts.push(detik + " detik");

  return parts.join(" ");
}


function rincianTerlambat3B04A_(waktu, cutoffDate) {
  var d = parseTanggalAudit3B04A_(waktu);
  var cutoff = parseTanggalAudit3B04A_(cutoffDate);
  var diff = d && cutoff
    ? Math.max(0, d.getTime() - cutoff.getTime())
    : 0;

  return {
    milidetik: diff,
    detik: diff > 0 ? Math.ceil(diff / 1000) : 0,
    menit: diff > 0 ? Math.ceil(diff / 60000) : 0,
    label: diff > 0 ? formatDurasiTerlambat3B04A_(diff) : ""
  };
}


function parsePayloadAudit3B04A_(row, columns) {
  var raw = row[columns.PAYLOAD_JSON];

  if (
    (raw === null || raw === undefined || raw === "") &&
    typeof columns.PAYLOAD_DETAIL_JSON !== "undefined"
  ) {
    raw = row[columns.PAYLOAD_DETAIL_JSON];
  }

  if (!raw) return null;

  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(String(raw));
  } catch (e) {
    return null;
  }
}


function ambilPeriodeEksplisitPayload3B04A_(payload) {
  payload = payload || {};

  var candidates = [
    payload.periode,
    payload.bulan,

    payload.detailWajibPamong &&
      payload.detailWajibPamong.bulan,

    payload.detailWajibDukuh &&
      payload.detailWajibDukuh.bulan,

    payload.detailAPBKal &&
      payload.detailAPBKal.bulan,

    payload.detailAPBKalCarik &&
      payload.detailAPBKalCarik.bulan
  ];

  for (var i = 0; i < candidates.length; i++) {
    var periode = normalisasiPeriodeAudit3B04A_(candidates[i]);
    if (periode) return periode;
  }

  return "";
}


function periodeBerikutnyaAudit3B04A_(periode) {
  var p = normalisasiPeriodeAudit3B04A_(periode);
  if (!p) return "";
  var y = Number(p.slice(0, 4));
  var m = Number(p.slice(5, 7)) - 1;
  return Utilities.formatDate(
    new Date(y, m + 1, 1, 12, 0, 0, 0),
    AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
    "yyyy-MM"
  );
}


function isKategoriWajibBulananAudit3B04A_(kategori) {
  try {
    if (typeof isKategoriWajibBulanan_ === "function") {
      return isKategoriWajibBulanan_(kategori);
    }
  } catch (eGlobal) {}

  var k = String(kategori || "").toLowerCase();
  return k.indexOf("pelaksanaan kegiatan wajib bulanan") !== -1;
}


function bulanIsiWajibBulananAudit3B04A_(row, columns, payload) {
  row = row || [];
  columns = columns || {};
  payload = payload || {};

  var explicit = payload.detailWajibPamong && payload.detailWajibPamong.bulan;
  var p = normalisasiPeriodeAudit3B04A_(explicit);
  if (p) return p;

  if (typeof columns.WAJIB_PAMONG_BULAN === "number") {
    p = normalisasiPeriodeAudit3B04A_(row[columns.WAJIB_PAMONG_BULAN]);
    if (p) return p;
  }

  if (typeof columns.TANGGAL_KEGIATAN === "number") {
    var d = parseTanggalAudit3B04A_(row[columns.TANGGAL_KEGIATAN]);
    if (d) {
      return Utilities.formatDate(
        d,
        AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
        "yyyy-MM"
      );
    }
  }

  return "";
}


function tentukanPeriodeRowAudit3B04A_(row, columns) {
  var payload = parsePayloadAudit3B04A_(row, columns);
  var periodePayload = ambilPeriodeEksplisitPayload3B04A_(payload);

  // Pasal 33: laporan bulan M memang berisi pekerjaan bulan M, tetapi hak poin
  // dan review-nya berada pada periode M+1. Perbedaan ini bukan "lewat periode".
  var kategori = typeof columns.KATEGORI === "number"
    ? row[columns.KATEGORI]
    : "";
  if (isKategoriWajibBulananAudit3B04A_(kategori)) {
    var bulanIsiWajib = bulanIsiWajibBulananAudit3B04A_(row, columns, payload);
    var periodeHak = periodeBerikutnyaAudit3B04A_(bulanIsiWajib);
    if (periodeHak) {
      return {
        periode: periodeHak,
        sumber: "BULAN_HAK_PASAL33",
        tanggalAcuan: parseTanggalAudit3B04A_(row[columns.TANGGAL_LAPORAN]),
        sumberTanggal: "BULAN_LAPORAN_WAJIB",
        periodePayload: periodePayload,
        periodePayloadBerbeda: false,
        bulanIsiLaporanWajib: bulanIsiWajib,
        periodeHakPasal33: periodeHak
      };
    }
  }

  var tanggalPelaksanaan =
    parseTanggalAudit3B04A_(row[columns.TANGGAL_KEGIATAN]);

  var tanggalSubmit =
    parseTanggalAudit3B04A_(row[columns.TANGGAL_LAPORAN]);

  var tanggalAcuan = tanggalPelaksanaan || tanggalSubmit;

  if (!tanggalAcuan) {
    return {
      periode: periodePayload,
      sumber: periodePayload
        ? "PAYLOAD_FALLBACK_TANPA_TANGGAL"
        : "TANGGAL_TIDAK_VALID",
      tanggalAcuan: null,
      sumberTanggal: "TANGGAL_TIDAK_VALID",
      periodePayload: periodePayload,
      periodePayloadBerbeda: false
    };
  }

  var periodeTanggal = "";
  var sumber = "";

  try {
    if (typeof periodePelaporanResmiDariTanggalV36_ === "function") {
      var resmi =
        periodePelaporanResmiDariTanggalV36_(tanggalAcuan);

      resmi = normalisasiPeriodeAudit3B04A_(resmi);

      if (resmi) {
        periodeTanggal = resmi;
        sumber = tanggalPelaksanaan
          ? "TANGGAL_PELAKSANAAN_RESMI"
          : "TANGGAL_SUBMIT_RESMI";
      }
    }
  } catch (eResmi) {}

  if (!periodeTanggal) {
    try {
      if (typeof periodeDariTanggalLaporan_ === "function") {
        var periodeLama =
          periodeDariTanggalLaporan_(tanggalAcuan);

        periodeLama =
          normalisasiPeriodeAudit3B04A_(periodeLama);

        if (periodeLama) {
          periodeTanggal = periodeLama;
          sumber = tanggalPelaksanaan
            ? "TANGGAL_PELAKSANAAN"
            : "TANGGAL_SUBMIT";
        }
      }
    } catch (ePeriode) {}
  }

  if (!periodeTanggal) {
    periodeTanggal = Utilities.formatDate(
      tanggalAcuan,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
      "yyyy-MM"
    );
    sumber = tanggalPelaksanaan
      ? "TANGGAL_PELAKSANAAN_FALLBACK"
      : "TANGGAL_SUBMIT_FALLBACK";
  }

  return {
    periode: periodeTanggal,
    sumber: sumber,
    tanggalAcuan: tanggalAcuan,
    sumberTanggal: tanggalPelaksanaan
      ? "TANGGAL_PELAKSANAAN"
      : "TANGGAL_PENGIRIMAN",
    periodePayload: periodePayload,
    periodePayloadBerbeda:
      !!periodePayload && periodePayload !== periodeTanggal
  };
}


function tentukanPeriodeReviewAudit3B04A_(waktuEfektif, periodeAsal) {
  var d = parseTanggalAudit3B04A_(waktuEfektif);
  var asal = normalisasiPeriodeAudit3B04A_(periodeAsal);

  if (!d) {
    return {
      periode: asal,
      sumber: "WAKTU_EFEKTIF_TIDAK_VALID"
    };
  }

  try {
    if (typeof periodePelaporanResmiDariTanggalV36_ === "function") {
      var resmi = normalisasiPeriodeAudit3B04A_(
        periodePelaporanResmiDariTanggalV36_(d)
      );
      if (resmi) {
        return {
          periode: resmi,
          sumber: "PERIODE_PELAPORAN_RESMI_ADMIN"
        };
      }
    }
  } catch (eResmi) {}

  return {
    periode: Utilities.formatDate(
      d,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
      "yyyy-MM"
    ),
    sumber: "KALENDER_FALLBACK"
  };
}


function klasifikasiTanggal3B04A_(
  waktuSubmit,
  waktuRevisi,
  revisiKe,
  cutoffDate
) {
  var submit = parseTanggalAudit3B04A_(waktuSubmit);
  var revisi = parseTanggalAudit3B04A_(waktuRevisi);
  var cutoff = parseTanggalAudit3B04A_(cutoffDate);
  var numericRevision = Number(revisiKe);
  var countRevisi = isFinite(numericRevision)
    ? Math.max(0, Math.floor(numericRevision))
    : 0;
  var revisionExists = countRevisi > 0;
  var warnings = [];

  if (!revisionExists && revisi) {
    warnings.push("WAKTU_REVISI_DIABAIKAN_TANPA_NOMOR_REVISI");
  }
  if (revisionExists && !submit) {
    warnings.push("WAKTU_SUBMIT_TIDAK_VALID");
  }

  var effectiveDate = revisionExists ? revisi : submit;
  var sumberWaktuEfektif = revisionExists
    ? "WAKTU_REVISI"
    : "WAKTU_SUBMIT";

  var masalah = "";
  if (!cutoff) {
    masalah = "CUTOFF_TIDAK_VALID";
  } else if (revisionExists && !revisi) {
    masalah = "ADA_REVISI_TETAPI_WAKTU_REVISI_TIDAK_VALID";
  } else if (!effectiveDate) {
    masalah = revisionExists
      ? "WAKTU_REVISI_TIDAK_VALID"
      : "WAKTU_SUBMIT_TIDAK_VALID";
  } else if (
    revisionExists &&
    submit &&
    revisi.getTime() < submit.getTime()
  ) {
    masalah = "WAKTU_REVISI_SEBELUM_WAKTU_SUBMIT";
  }

  var submitLate = !!(
    submit &&
    cutoff &&
    submit.getTime() > cutoff.getTime()
  );
  var revisionLate = !!(
    revisionExists &&
    revisi &&
    cutoff &&
    revisi.getTime() > cutoff.getTime()
  );
  var effectiveLate = !!(
    effectiveDate &&
    cutoff &&
    effectiveDate.getTime() > cutoff.getTime()
  );

  var submitDuration = rincianTerlambat3B04A_(submit, cutoff);
  var revisionDuration = rincianTerlambat3B04A_(revisi, cutoff);
  var effectiveDuration = rincianTerlambat3B04A_(effectiveDate, cutoff);

  if (masalah) {
    return {
      klasifikasi: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      submitSetelahCutoff: submitLate,
      revisiSetelahCutoff: revisionLate,
      efektifSetelahCutoff: false,
      submitDate: submit,
      revisiDate: revisionExists ? revisi : null,
      waktuEfektif: effectiveDate,
      sumberWaktuEfektif: sumberWaktuEfektif,
      revisiKe: countRevisi,
      terlambatMilidetikSubmit: submitDuration.milidetik,
      terlambatDetikSubmit: submitDuration.detik,
      terlambatMenitSubmit: submitDuration.menit,
      terlambatMilidetikRevisi: revisionDuration.milidetik,
      terlambatDetikRevisi: revisionDuration.detik,
      terlambatMenitRevisi: revisionDuration.menit,
      terlambatMilidetikEfektif: 0,
      terlambatDetikEfektif: 0,
      terlambatMenitEfektif: 0,
      terlambatLabelEfektif: "",
      masalah: masalah,
      peringatan: warnings
    };
  }

  var klasifikasi = "TEPAT_WAKTU";

  if (submitLate && revisionLate) {
    klasifikasi =
      "SUBMIT_DAN_REVISI_SETELAH_CUTOFF";
  } else if (submitLate) {
    klasifikasi = "SUBMIT_SETELAH_CUTOFF";
  } else if (revisionLate) {
    klasifikasi = "REVISI_SETELAH_CUTOFF";
  }

  return {
    klasifikasi: klasifikasi,
    submitSetelahCutoff: submitLate,
    revisiSetelahCutoff: revisionLate,
    efektifSetelahCutoff: effectiveLate,
    submitDate: submit,
    revisiDate: revisionExists ? revisi : null,
    waktuEfektif: effectiveDate,
    sumberWaktuEfektif: sumberWaktuEfektif,
    revisiKe: countRevisi,
    terlambatMilidetikSubmit: submitLate
      ? submitDuration.milidetik
      : 0,
    terlambatDetikSubmit: submitLate
      ? submitDuration.detik
      : 0,
    terlambatMenitSubmit: submitLate
      ? submitDuration.menit
      : 0,
    terlambatMilidetikRevisi: revisionLate
      ? revisionDuration.milidetik
      : 0,
    terlambatDetikRevisi: revisionLate
      ? revisionDuration.detik
      : 0,
    terlambatMenitRevisi: revisionLate
      ? revisionDuration.menit
      : 0,
    terlambatMilidetikEfektif: effectiveLate
      ? effectiveDuration.milidetik
      : 0,
    terlambatDetikEfektif: effectiveLate
      ? effectiveDuration.detik
      : 0,
    terlambatMenitEfektif: effectiveLate
      ? effectiveDuration.menit
      : 0,
    terlambatLabelEfektif: effectiveLate
      ? effectiveDuration.label
      : "",
    masalah: "",
    peringatan: warnings
  };
}


function hasilGagalAudit3B04A_(config) {
  config = config || {};
  return {
    sukses: false,
    versi: AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
    appVersion: typeof APP_VERSION !== "undefined"
      ? String(APP_VERSION)
      : "",
    periode: String(config.periode || ""),
    labelPeriode: config.periode
      ? labelPeriodeAudit3B04A_(config.periode)
      : "",
    kode: String(config.kode || "AUDIT_GAGAL"),
    pesan: String(config.pesan || "Audit gagal dijalankan."),
    issues: Array.isArray(config.issues) ? config.issues : [],
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false
  };
}


function validasiKolomAudit3B04A_(columns) {
  var required = [
    "TANGGAL_LAPORAN",
    "NAMA",
    "JABATAN",
    "KATEGORI",
    "STATUS_REVIEW",
    "POIN_FINAL",
    "TANGGAL_KEGIATAN",
    "ID_LAPORAN",
    "ID_USER",
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


function statusAuditLaporanLewatPeriode3B04A() {
  pastikanMaintainerPortal3B0_(
    "STATUS_AUDIT_LAPORAN_LEWAT_PERIODE_3B04A"
  );

  var periode =
    normalisasiPeriodeAudit3B04A_(
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.DEFAULT_PERIODE
    );

  var lock = bacaTutupPeriodeLaporan_(periode);
  var lockValid = !!(
    lock &&
    lock.cutoffDate instanceof Date &&
    !isNaN(lock.cutoffDate.getTime()) &&
    String(lock.status || "DITUTUP").toUpperCase() === "DITUTUP"
  );

  var result = {
    sukses: true,
    versi:
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    periode: periode,
    labelPeriode: labelPeriodeAudit3B04A_(periode),
    lockTersedia: lockValid,
    batasAkhir:
      lock && lock.cutoffDate
        ? formatTanggalAudit3B04A_(lock.cutoffDate)
        : "",
    statusLock: lock ? String(lock.status || "") : "",
    sumberBatasAkhir: "TUTUP_PERIODE_LAPORAN",
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false,
    pesan: lockValid
      ? "Konfigurasi audit siap."
      : "Penutupan resmi Admin untuk periode belum ditemukan atau tidak valid."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function auditLaporanLewatPeriode3B04A(periodeInput) {
  pastikanMaintainerPortal3B0_(
    "AUDIT_LAPORAN_LEWAT_PERIODE_3B04A"
  );

  var startedAt = new Date().getTime();

  var periode = normalisasiPeriodeAudit3B04A_(
    periodeInput ||
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.DEFAULT_PERIODE
  );

  if (!periode) {
    var invalidPeriod = hasilGagalAudit3B04A_({
      kode: "PERIODE_TIDAK_VALID",
      pesan: "Periode audit harus menggunakan format YYYY-MM dengan bulan 01 sampai 12."
    });

    Logger.log(JSON.stringify(invalidPeriod, null, 2));
    return invalidPeriod;
  }

  var lock = bacaTutupPeriodeLaporan_(periode);

  if (
    !lock ||
    !(lock.cutoffDate instanceof Date) ||
    isNaN(lock.cutoffDate.getTime()) ||
    String(lock.status || "DITUTUP").toUpperCase() !== "DITUTUP"
  ) {
    var noLock = hasilGagalAudit3B04A_({
      periode: periode,
      kode: "BATAS_AKHIR_TIDAK_DITEMUKAN",
      pesan:
        "Script Property TUTUP_PERIODE_LAPORAN_" +
        periode +
        " tidak ditemukan, tidak valid, atau belum berstatus DITUTUP."
    });

    Logger.log(JSON.stringify(noLock, null, 2));
    return noLock;
  }

  var sheet = getSheet_("Rekap_Kinerja");
  if (!sheet) {
    var noSheet = hasilGagalAudit3B04A_({
      periode: periode,
      kode: "SHEET_REKAP_TIDAK_DITEMUKAN",
      pesan: "Sheet Rekap_Kinerja tidak ditemukan."
    });
    Logger.log(JSON.stringify(noSheet, null, 2));
    return noSheet;
  }

  var columns = typeof SHEET_COLUMNS !== "undefined" &&
    SHEET_COLUMNS &&
    SHEET_COLUMNS.REKAP_KINERJA
    ? SHEET_COLUMNS.REKAP_KINERJA
    : null;
  var columnValidation = validasiKolomAudit3B04A_(columns);

  if (!columnValidation.valid) {
    var invalidColumns = hasilGagalAudit3B04A_({
      periode: periode,
      kode: "KONTRAK_KOLOM_TIDAK_VALID",
      pesan: "Kontrak kolom Rekap_Kinerja tidak lengkap untuk audit.",
      issues: columnValidation.missing.map(function (name) {
        return "Kolom tidak tersedia: " + name;
      })
    });
    Logger.log(JSON.stringify(invalidColumns, null, 2));
    return invalidColumns;
  }

  var requiredWidth = columnValidation.requiredWidth;

  var lastRow = sheet.getLastRow();
  var rows = [];

  if (lastRow > 1) {
    rows = sheet
      .getRange(2, 1, lastRow - 1, requiredWidth)
      .getValues();
  }

  var classificationCounts = {
    TEPAT_WAKTU: 0,
    SUBMIT_SETELAH_CUTOFF: 0,
    REVISI_SETELAH_CUTOFF: 0,
    SUBMIT_DAN_REVISI_SETELAH_CUTOFF: 0,
    TIDAK_DAPAT_DIKLASIFIKASIKAN: 0
  };

  var statusReviewTerdampak = {};
  var perPegawaiMap = {};
  var detailTerdampak = [];
  var jumlahPeriode = 0;
  var jumlahPayloadPeriodeBerbeda = 0;
  var jumlahBarisDenganPeringatan = 0;
  var sumberPeriodeCounts = {};

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var periodeInfo =
      tentukanPeriodeRowAudit3B04A_(row, columns);

    if (periodeInfo.periode !== periode) continue;

    jumlahPeriode++;
    sumberPeriodeCounts[periodeInfo.sumber] = Number(
      sumberPeriodeCounts[periodeInfo.sumber] || 0
    ) + 1;
    if (periodeInfo.periodePayloadBerbeda) {
      jumlahPayloadPeriodeBerbeda++;
    }

    var klasifikasi = klasifikasiTanggal3B04A_(
      row[columns.TANGGAL_LAPORAN],
      row[columns.TERAKHIR_DIREVISI_PADA],
      row[columns.REVISI_KE],
      lock.cutoffDate
    );
    var periodeReviewInfo = tentukanPeriodeReviewAudit3B04A_(
      klasifikasi.waktuEfektif,
      periode
    );
    if (
      Array.isArray(klasifikasi.peringatan) &&
      klasifikasi.peringatan.length
    ) {
      jumlahBarisDenganPeringatan++;
    }

    if (
      typeof classificationCounts[
        klasifikasi.klasifikasi
      ] === "undefined"
    ) {
      classificationCounts[
        "TIDAK_DAPAT_DIKLASIFIKASIKAN"
      ]++;
    } else {
      classificationCounts[
        klasifikasi.klasifikasi
      ]++;
    }

    var idUser = String(
      row[columns.ID_USER] || ""
    ).trim();

    var nama = String(
      row[columns.NAMA] || ""
    ).trim();

    var pegawaiKey =
      idUser ||
      nama ||
      ("ROW_" + String(i + 2));

    if (!perPegawaiMap[pegawaiKey]) {
      perPegawaiMap[pegawaiKey] = {
        idUser: idUser,
        nama: nama,
        jabatan: String(
          row[columns.JABATAN] || ""
        ).trim(),
        totalLaporan: 0,
        tepatWaktu: 0,
        submitSetelahCutoff: 0,
        revisiSetelahCutoff: 0,
        submitDanRevisiSetelahCutoff: 0,
        tidakDapatDiklasifikasikan: 0,
        totalTerdampak: 0
      };
    }

    var pegawai = perPegawaiMap[pegawaiKey];
    pegawai.totalLaporan++;

    if (klasifikasi.klasifikasi === "TEPAT_WAKTU") {
      pegawai.tepatWaktu++;
    } else if (
      klasifikasi.klasifikasi ===
      "SUBMIT_SETELAH_CUTOFF"
    ) {
      pegawai.submitSetelahCutoff++;
      pegawai.totalTerdampak++;
    } else if (
      klasifikasi.klasifikasi ===
      "REVISI_SETELAH_CUTOFF"
    ) {
      pegawai.revisiSetelahCutoff++;
      pegawai.totalTerdampak++;
    } else if (
      klasifikasi.klasifikasi ===
      "SUBMIT_DAN_REVISI_SETELAH_CUTOFF"
    ) {
      pegawai.submitDanRevisiSetelahCutoff++;
      pegawai.totalTerdampak++;
    } else {
      pegawai.tidakDapatDiklasifikasikan++;
    }

    var isLate = klasifikasi.efektifSetelahCutoff === true;

    var isUnknown =
      klasifikasi.klasifikasi ===
      "TIDAK_DAPAT_DIKLASIFIKASIKAN";

    if (!isLate && !isUnknown) continue;

    var statusReview = String(
      row[columns.STATUS_REVIEW] || ""
    ).trim() || "(Kosong)";

    if (isLate) {
      statusReviewTerdampak[statusReview] =
        Number(
          statusReviewTerdampak[statusReview] || 0
        ) + 1;
    }

    detailTerdampak.push({
      rowRekap: i + 2,
      idLaporan: String(
        row[columns.ID_LAPORAN] || ""
      ).trim(),
      idUser: idUser,
      nama: nama,
      jabatan: String(
        row[columns.JABATAN] || ""
      ).trim(),
      kategori: String(
        row[columns.KATEGORI] || ""
      ).trim(),
      periode: periode,
      periodeAsal: periode,
      periodeReview: periodeReviewInfo.periode || periode,
      labelPeriodeReview: labelPeriodeAudit3B04A_(
        periodeReviewInfo.periode || periode
      ),
      sumberPeriodeReview: periodeReviewInfo.sumber,
      sumberPeriode: periodeInfo.sumber,
      sumberTanggalPeriode: periodeInfo.sumberTanggal || "",
      periodePayload: periodeInfo.periodePayload || "",
      periodePayloadBerbeda:
        periodeInfo.periodePayloadBerbeda === true,
      tanggalPelaksanaan:
        formatTanggalAudit3B04A_(
          row[columns.TANGGAL_KEGIATAN]
        ),
      waktuSubmit:
        formatTanggalAudit3B04A_(
          klasifikasi.submitDate
        ),
      waktuRevisi:
        formatTanggalAudit3B04A_(
          klasifikasi.revisiDate
        ),
      waktuEfektif:
        formatTanggalAudit3B04A_(
          klasifikasi.waktuEfektif
        ),
      sumberWaktuEfektif:
        klasifikasi.sumberWaktuEfektif,
      revisiKe: klasifikasi.revisiKe,
      batasAkhir:
        formatTanggalAudit3B04A_(
          lock.cutoffDate
        ),
      statusReview: statusReview,
      poinFinal:
        Number(row[columns.POIN_FINAL]) || 0,
      klasifikasi: klasifikasi.klasifikasi,
      submitSetelahCutoff:
        klasifikasi.submitSetelahCutoff,
      revisiSetelahCutoff:
        klasifikasi.revisiSetelahCutoff,
      efektifSetelahCutoff:
        klasifikasi.efektifSetelahCutoff,
      terlambatMilidetikSubmit:
        klasifikasi.terlambatMilidetikSubmit,
      terlambatDetikSubmit:
        klasifikasi.terlambatDetikSubmit,
      terlambatMenitSubmit:
        klasifikasi.terlambatMenitSubmit,
      terlambatLabelSubmit:
        klasifikasi.submitSetelahCutoff
          ? formatDurasiTerlambat3B04A_(
              klasifikasi.terlambatMilidetikSubmit
            )
          : "",
      terlambatMilidetikRevisi:
        klasifikasi.terlambatMilidetikRevisi,
      terlambatDetikRevisi:
        klasifikasi.terlambatDetikRevisi,
      terlambatMenitRevisi:
        klasifikasi.terlambatMenitRevisi,
      terlambatLabelRevisi:
        klasifikasi.revisiSetelahCutoff
          ? formatDurasiTerlambat3B04A_(
              klasifikasi.terlambatMilidetikRevisi
            )
          : "",
      terlambatMilidetikEfektif:
        klasifikasi.terlambatMilidetikEfektif,
      terlambatDetikEfektif:
        klasifikasi.terlambatDetikEfektif,
      terlambatMenitEfektif:
        klasifikasi.terlambatMenitEfektif,
      terlambatLabelEfektif:
        klasifikasi.terlambatLabelEfektif,
      masalah: klasifikasi.masalah || "",
      peringatan: klasifikasi.peringatan || []
    });
  }

  detailTerdampak.sort(function (a, b) {
    var diff =
      Math.max(
        Number(b.terlambatMilidetikEfektif) || 0,
        Number(b.terlambatMilidetikSubmit) || 0,
        Number(b.terlambatMilidetikRevisi) || 0
      ) -
      Math.max(
        Number(a.terlambatMilidetikEfektif) || 0,
        Number(a.terlambatMilidetikSubmit) || 0,
        Number(a.terlambatMilidetikRevisi) || 0
      );

    if (diff !== 0) return diff;

    return Number(b.rowRekap || 0) -
      Number(a.rowRekap || 0);
  });

  var perPegawai = Object.keys(perPegawaiMap)
    .map(function (key) {
      return perPegawaiMap[key];
    })
    .sort(function (a, b) {
      var diff =
        Number(b.totalTerdampak || 0) -
        Number(a.totalTerdampak || 0);

      if (diff !== 0) return diff;

      return String(a.nama || "").localeCompare(
        String(b.nama || ""),
        "id",
        { sensitivity: "base" }
      );
    });

  var pegawaiTerdampak = perPegawai.filter(
    function (item) {
      return Number(item.totalTerdampak || 0) > 0;
    }
  ).length;

  var totalLate =
    classificationCounts.SUBMIT_SETELAH_CUTOFF +
    classificationCounts.REVISI_SETELAH_CUTOFF +
    classificationCounts
      .SUBMIT_DAN_REVISI_SETELAH_CUTOFF;

  var detailDipangkas =
    detailTerdampak.length >
    AUDIT_LAPORAN_LEWAT_PERIODE_3B04A
      .MAX_DETAIL_RETURN;

  var result = {
    sukses: true,
    versi:
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
    appVersion:
      typeof APP_VERSION !== "undefined"
        ? String(APP_VERSION)
        : "",
    periode: periode,
    labelPeriode:
      lock.labelPeriode ||
      labelPeriodeAudit3B04A_(periode),
    batasAkhir:
      formatTanggalAudit3B04A_(
        lock.cutoffDate
      ),
    sumberBatasAkhir:
      "TUTUP_PERIODE_LAPORAN",
    alasanPenutupan:
      String(lock.alasan || ""),
    statusLock:
      String(lock.status || ""),
    summary: {
      totalLaporanPeriode: jumlahPeriode,
      tepatWaktu:
        classificationCounts.TEPAT_WAKTU,
      totalLaporanTerdampak: totalLate,

      submitSetelahCutoff:
        classificationCounts
          .SUBMIT_SETELAH_CUTOFF +
        classificationCounts
          .SUBMIT_DAN_REVISI_SETELAH_CUTOFF,

      revisiSetelahCutoff:
        classificationCounts
          .REVISI_SETELAH_CUTOFF +
        classificationCounts
          .SUBMIT_DAN_REVISI_SETELAH_CUTOFF,

      submitDanRevisiSetelahCutoff:
        classificationCounts
          .SUBMIT_DAN_REVISI_SETELAH_CUTOFF,

      tidakDapatDiklasifikasikan:
        classificationCounts
          .TIDAK_DAPAT_DIKLASIFIKASIKAN,

      pegawaiTerdampak: pegawaiTerdampak,
      payloadPeriodeBerbeda:
        jumlahPayloadPeriodeBerbeda,
      barisDenganPeringatan:
        jumlahBarisDenganPeringatan
    },
    classificationCounts:
      classificationCounts,
    sumberPeriodeCounts:
      sumberPeriodeCounts,
    statusReviewTerdampak:
      statusReviewTerdampak,
    perPegawai: perPegawai,
    jumlahDetailTerdampak:
      detailTerdampak.length,
    detailDipangkas: detailDipangkas,
    laporan: detailTerdampak.slice(
      0,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A
        .MAX_DETAIL_RETURN
    ),
    durasiMs:
      new Date().getTime() - startedAt,
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false
  };

  Logger.log(JSON.stringify({
    sukses: result.sukses,
    versi: result.versi,
    appVersion: result.appVersion,
    periode: result.periode,
    labelPeriode: result.labelPeriode,
    batasAkhir: result.batasAkhir,
    summary: result.summary,
    classificationCounts:
      result.classificationCounts,
    statusReviewTerdampak:
      result.statusReviewTerdampak,
    jumlahDetailTerdampak:
      result.jumlahDetailTerdampak,
    detailDipangkas:
      result.detailDipangkas,
    durasiMs: result.durasiMs,
    contohBarisTanpaIdentitas:
      result.laporan.slice(
        0,
        AUDIT_LAPORAN_LEWAT_PERIODE_3B04A
          .MAX_DETAIL_LOG
      ).map(function (item) {
        return {
          rowRekap: item.rowRekap,
          klasifikasi: item.klasifikasi,
          periodeAsal: item.periodeAsal,
          periodeReview: item.periodeReview,
          masalah: item.masalah,
          peringatan: item.peringatan
        };
      }),
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false
  }, null, 2));

  return result;
}


function auditLaporanLewatPeriodeJuli2026_3B04A() {
  return auditLaporanLewatPeriode3B04A(
    "2026-07"
  );
}


function ujiKlasifikasiLaporanLewatPeriode3B04A() {
  pastikanMaintainerPortal3B0_(
    "UJI_KLASIFIKASI_LAPORAN_LEWAT_PERIODE_3B04A"
  );

  var cutoff =
    new Date(2026, 6, 29, 16, 0, 0, 0);

  var cases = [
    {
      nama: "Submit sebelum cutoff",
      submit:
        new Date(2026, 6, 29, 15, 59, 0, 0),
      revisi: null,
      revisiKe: 0,
      expected: "TEPAT_WAKTU",
      expectedSumber: "WAKTU_SUBMIT",
      expectedLate: false
    },
    {
      nama: "Submit tepat pada detik cutoff",
      submit:
        new Date(2026, 6, 29, 16, 0, 0, 0),
      revisi: null,
      revisiKe: 0,
      expected: "TEPAT_WAKTU",
      expectedSumber: "WAKTU_SUBMIT",
      expectedLate: false
    },
    {
      nama: "Submit satu milidetik setelah cutoff",
      submit:
        new Date(2026, 6, 29, 16, 0, 0, 1),
      revisi: null,
      revisiKe: 0,
      expected: "SUBMIT_SETELAH_CUTOFF",
      expectedSumber: "WAKTU_SUBMIT",
      expectedLate: true,
      expectedDetikEfektif: 1,
      expectedMenitEfektif: 1
    },
    {
      nama: "Submit setelah cutoff",
      submit:
        new Date(2026, 6, 30, 13, 2, 0, 0),
      revisi: null,
      revisiKe: 0,
      expected: "SUBMIT_SETELAH_CUTOFF",
      expectedSumber: "WAKTU_SUBMIT",
      expectedLate: true
    },
    {
      nama: "Timestamp revisi diabaikan saat revisiKe nol",
      submit:
        new Date(2026, 6, 29, 15, 0, 0, 0),
      revisi:
        new Date(2026, 6, 30, 10, 0, 0, 0),
      revisiKe: 0,
      expected: "TEPAT_WAKTU",
      expectedSumber: "WAKTU_SUBMIT",
      expectedLate: false,
      expectedWarning:
        "WAKTU_REVISI_DIABAIKAN_TANPA_NOMOR_REVISI"
    },
    {
      nama: "Revisi setelah cutoff",
      submit:
        new Date(2026, 6, 29, 14, 0, 0, 0),
      revisi:
        new Date(2026, 6, 30, 10, 0, 0, 0),
      revisiKe: 1,
      expected: "REVISI_SETELAH_CUTOFF",
      expectedSumber: "WAKTU_REVISI",
      expectedLate: true
    },
    {
      nama: "Submit dan revisi setelah cutoff",
      submit:
        new Date(2026, 6, 30, 8, 0, 0, 0),
      revisi:
        new Date(2026, 6, 31, 9, 0, 0, 0),
      revisiKe: 1,
      expected:
        "SUBMIT_DAN_REVISI_SETELAH_CUTOFF",
      expectedSumber: "WAKTU_REVISI",
      expectedLate: true
    },
    {
      nama: "Nomor revisi ada tetapi waktu revisi kosong",
      submit:
        new Date(2026, 6, 29, 15, 0, 0, 0),
      revisi: null,
      revisiKe: 1,
      expected: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      expectedSumber: "WAKTU_REVISI",
      expectedLate: false,
      expectedMasalah:
        "ADA_REVISI_TETAPI_WAKTU_REVISI_TIDAK_VALID"
    },
    {
      nama: "Waktu revisi sebelum waktu submit",
      submit:
        new Date(2026, 6, 30, 10, 0, 0, 0),
      revisi:
        new Date(2026, 6, 30, 9, 0, 0, 0),
      revisiKe: 1,
      expected: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      expectedSumber: "WAKTU_REVISI",
      expectedLate: false,
      expectedMasalah:
        "WAKTU_REVISI_SEBELUM_WAKTU_SUBMIT"
    },
    {
      nama: "Waktu submit kosong tetapi revisi valid",
      submit: null,
      revisi:
        new Date(2026, 6, 30, 10, 0, 0, 0),
      revisiKe: 1,
      expected: "REVISI_SETELAH_CUTOFF",
      expectedSumber: "WAKTU_REVISI",
      expectedLate: true,
      expectedWarning: "WAKTU_SUBMIT_TIDAK_VALID"
    }
  ];

  var hasil = cases.map(function (item) {
    var actual = klasifikasiTanggal3B04A_(
      item.submit,
      item.revisi,
      item.revisiKe,
      cutoff
    );

    var checks = {
      klasifikasi:
        actual.klasifikasi === item.expected,
      sumberWaktuEfektif:
        actual.sumberWaktuEfektif === item.expectedSumber,
      efektifSetelahCutoff:
        actual.efektifSetelahCutoff === item.expectedLate,
      masalah: typeof item.expectedMasalah === "undefined" ||
        actual.masalah === item.expectedMasalah,
      warning: typeof item.expectedWarning === "undefined" ||
        (actual.peringatan || []).indexOf(item.expectedWarning) !== -1,
      detikEfektif:
        typeof item.expectedDetikEfektif === "undefined" ||
        actual.terlambatDetikEfektif === item.expectedDetikEfektif,
      menitEfektif:
        typeof item.expectedMenitEfektif === "undefined" ||
        actual.terlambatMenitEfektif === item.expectedMenitEfektif
    };

    return {
      nama: item.nama,
      expected: item.expected,
      actual: actual.klasifikasi,
      sumberWaktuEfektif: actual.sumberWaktuEfektif,
      efektifSetelahCutoff: actual.efektifSetelahCutoff,
      terlambatDetikEfektif: actual.terlambatDetikEfektif,
      terlambatMenitEfektif: actual.terlambatMenitEfektif,
      masalah: actual.masalah,
      peringatan: actual.peringatan,
      checks: checks,
      sesuai: Object.keys(checks).every(function (key) {
        return checks[key] === true;
      })
    };
  });

  var periodCases = [
    { input: "2026-07", expected: "2026-07" },
    { input: "2026-13", expected: "" },
    { input: "2026-00", expected: "" },
    { input: "2026-02-31", expected: "" },
    { input: "2026-07-29", expected: "2026-07" }
  ].map(function (item) {
    var actual = normalisasiPeriodeAudit3B04A_(item.input);
    return {
      input: item.input,
      expected: item.expected,
      actual: actual,
      sesuai: actual === item.expected
    };
  });

  var sukses =
    hasil.every(function (item) {
      return item.sesuai === true;
    }) &&
    periodCases.every(function (item) {
      return item.sesuai === true;
    });

  var result = {
    sukses: sukses,
    versi:
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
    batasUji:
      formatTanggalAudit3B04A_(cutoff),
    jumlahKasus: hasil.length,
    cases: hasil,
    normalisasiPeriodeCases: periodCases,
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function validasiAuditLaporanLewatPeriode3B04A() {
  pastikanMaintainerPortal3B0_(
    "VALIDASI_AUDIT_LAPORAN_LEWAT_PERIODE_3B04A"
  );

  var audit =
    auditLaporanLewatPeriode3B04A(
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A
        .DEFAULT_PERIODE
    );

  if (!audit || audit.sukses !== true) {
    var failed = hasilGagalAudit3B04A_({
      periode: audit && audit.periode,
      kode: audit && audit.kode
        ? audit.kode
        : "AUDIT_GAGAL_DIJALANKAN",
      pesan: audit && audit.pesan
        ? audit.pesan
        : "Audit gagal dijalankan.",
      issues: audit && audit.issues
        ? audit.issues
        : []
    });
    failed.auditSukses = false;

    Logger.log(JSON.stringify(failed, null, 2));
    return failed;
  }

  var counts = audit.classificationCounts || {};

  var totalKlasifikasi =
    Number(counts.TEPAT_WAKTU || 0) +
    Number(counts.SUBMIT_SETELAH_CUTOFF || 0) +
    Number(counts.REVISI_SETELAH_CUTOFF || 0) +
    Number(
      counts.SUBMIT_DAN_REVISI_SETELAH_CUTOFF || 0
    ) +
    Number(
      counts.TIDAK_DAPAT_DIKLASIFIKASIKAN || 0
    );

  var totalLaporan =
    Number(
      audit.summary &&
      audit.summary.totalLaporanPeriode
    ) || 0;

  var totalTerlambat =
    Number(counts.SUBMIT_SETELAH_CUTOFF || 0) +
    Number(counts.REVISI_SETELAH_CUTOFF || 0) +
    Number(counts.SUBMIT_DAN_REVISI_SETELAH_CUTOFF || 0);

  var totalStatusReview = Object.keys(
    audit.statusReviewTerdampak || {}
  ).reduce(function (total, key) {
    return total + Number(audit.statusReviewTerdampak[key] || 0);
  }, 0);

  var totalPerPegawai = (audit.perPegawai || []).reduce(
    function (total, item) {
      return total + Number(item.totalLaporan || 0);
    },
    0
  );

  var jumlahTidakDapat = Number(
    counts.TIDAK_DAPAT_DIKLASIFIKASIKAN || 0
  );
  var expectedDetail = totalTerlambat + jumlahTidakDapat;
  var expectedReturned = Math.min(
    expectedDetail,
    AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.MAX_DETAIL_RETURN
  );
  var unitTests = ujiKlasifikasiLaporanLewatPeriode3B04A();

  var checks = {
    jumlahKlasifikasi:
      totalKlasifikasi === totalLaporan,
    jumlahTerlambat:
      totalTerlambat === Number(
        audit.summary && audit.summary.totalLaporanTerdampak || 0
      ),
    distribusiStatusReview:
      totalStatusReview === totalTerlambat,
    distribusiPerPegawai:
      totalPerPegawai === totalLaporan,
    jumlahDetail:
      Number(audit.jumlahDetailTerdampak || 0) === expectedDetail,
    jumlahDetailDikembalikan:
      (audit.laporan || []).length === expectedReturned,
    statusPemangkasan:
      audit.detailDipangkas ===
        (expectedDetail > AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.MAX_DETAIL_RETURN),
    unitTests: !!unitTests && unitTests.sukses === true,
    readOnly:
      audit.hanyaAudit === true &&
      audit.operasiTulisDijalankan === false &&
      audit.dataDiubah === false &&
      audit.poinDiubah === false &&
      audit.statusReviewDiubah === false &&
      audit.indexDiubah === false &&
      audit.schemaDiubah === false
  };

  var issueMessages = {
    jumlahKlasifikasi:
      "Jumlah klasifikasi tidak sama dengan total laporan periode.",
    jumlahTerlambat:
      "Ringkasan laporan terlambat tidak konsisten.",
    distribusiStatusReview:
      "Distribusi status review tidak sama dengan jumlah laporan terlambat.",
    distribusiPerPegawai:
      "Distribusi laporan per pegawai tidak sama dengan total laporan.",
    jumlahDetail:
      "Jumlah detail terlambat/anomali tidak konsisten.",
    jumlahDetailDikembalikan:
      "Jumlah detail yang dikembalikan tidak sesuai batas maksimum.",
    statusPemangkasan:
      "Status pemangkasan detail tidak konsisten.",
    unitTests:
      "Pengujian batas waktu atau normalisasi periode gagal.",
    readOnly:
      "Kontrak read-only audit tidak terpenuhi."
  };

  var issues = Object.keys(checks).filter(function (key) {
    return checks[key] !== true;
  }).map(function (key) {
    return issueMessages[key];
  });

  var valid = issues.length === 0;

  var result = {
    sukses: valid,
    valid: valid,
    versi:
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
    periode: audit.periode,
    batasAkhir: audit.batasAkhir,
    totalLaporan: totalLaporan,
    totalKlasifikasi: totalKlasifikasi,
    jumlahTerdampak:
      Number(
        audit.summary &&
        audit.summary.totalLaporanTerdampak
      ) || 0,
    pegawaiTerdampak:
      Number(
        audit.summary &&
        audit.summary.pegawaiTerdampak
      ) || 0,
    counts: counts,
    checks: checks,
    unitTestsSukses: !!unitTests && unitTests.sukses === true,
    hanyaAudit: true,
    operasiTulisDijalankan: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false,
    schemaDiubah: false,
    issues: issues,
    pesan: valid
      ? "Audit 3B-0.4A lulus validasi konsistensi."
      : "Audit 3B-0.4A belum konsisten."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END PATCH 3B-0.4A =====
