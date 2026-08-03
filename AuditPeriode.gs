// ============================================================
// PATCH 3B-0.4A
// AUDIT DAN KLASIFIKASI LAPORAN LEWAT PERIODE
//
// Baseline produksi : APP_VERSION 2026.08.02.01
// Sifat patch       : read-only / diagnostik
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
  VERSION: "3B04A-2026.08.02.01",
  DEFAULT_PERIODE: "2026-07",
  TIMEZONE: "Asia/Jakarta",
  MAX_DETAIL_RETURN: 500,
  MAX_DETAIL_LOG: 30
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


function normalisasiPeriodeAudit3B04A_(value) {
  var raw = String(value || "").trim();
  if (!raw) return "";

  try {
    if (typeof normalizePeriode_ === "function") {
      var normalized = normalizePeriode_(raw);
      if (/^\d{4}-\d{2}$/.test(String(normalized || ""))) {
        return String(normalized);
      }
    }
  } catch (eNormalize) {}

  var exact = raw.match(/^(\d{4})-(\d{2})$/);
  if (exact) return exact[1] + "-" + exact[2];

  var iso = raw.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (iso) return iso[1] + "-" + iso[2];

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
    "dd/MM/yyyy HH:mm"
  ) + " WIB";
}


function formatDurasiTerlambat3B04A_(minutes) {
  var total = Math.max(0, Math.floor(Number(minutes) || 0));

  var hari = Math.floor(total / 1440);
  var jam = Math.floor((total % 1440) / 60);
  var menit = total % 60;

  var parts = [];
  if (hari) parts.push(hari + " hari");
  if (jam) parts.push(jam + " jam");
  if (menit || !parts.length) parts.push(menit + " menit");

  return parts.join(" ");
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


function tentukanPeriodeRowAudit3B04A_(row, columns) {
  var payload = parsePayloadAudit3B04A_(row, columns);
  var eksplisit = ambilPeriodeEksplisitPayload3B04A_(payload);

  if (eksplisit) {
    return {
      periode: eksplisit,
      sumber: "PAYLOAD_EXPLICIT"
    };
  }

  var tanggalPelaksanaan =
    parseTanggalAudit3B04A_(row[columns.TANGGAL_KEGIATAN]);

  var tanggalSubmit =
    parseTanggalAudit3B04A_(row[columns.TANGGAL_LAPORAN]);

  var tanggalAcuan = tanggalPelaksanaan || tanggalSubmit;

  if (!tanggalAcuan) {
    return {
      periode: "",
      sumber: "TANGGAL_TIDAK_VALID"
    };
  }

  try {
    if (typeof periodePelaporanResmiDariTanggalV36_ === "function") {
      var resmi =
        periodePelaporanResmiDariTanggalV36_(tanggalAcuan);

      resmi = normalisasiPeriodeAudit3B04A_(resmi);

      if (resmi) {
        return {
          periode: resmi,
          sumber: tanggalPelaksanaan
            ? "TANGGAL_PELAKSANAAN_RESMI"
            : "TANGGAL_SUBMIT_RESMI"
        };
      }
    }
  } catch (eResmi) {}

  try {
    if (typeof periodeDariTanggalLaporan_ === "function") {
      var periodeLama =
        periodeDariTanggalLaporan_(tanggalAcuan);

      periodeLama =
        normalisasiPeriodeAudit3B04A_(periodeLama);

      if (periodeLama) {
        return {
          periode: periodeLama,
          sumber: tanggalPelaksanaan
            ? "TANGGAL_PELAKSANAAN"
            : "TANGGAL_SUBMIT"
        };
      }
    }
  } catch (ePeriode) {}

  return {
    periode: Utilities.formatDate(
      tanggalAcuan,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.TIMEZONE,
      "yyyy-MM"
    ),
    sumber: tanggalPelaksanaan
      ? "TANGGAL_PELAKSANAAN_FALLBACK"
      : "TANGGAL_SUBMIT_FALLBACK"
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
  var countRevisi = Number(revisiKe) || 0;

  if (!submit || !cutoffDate) {
    return {
      klasifikasi: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      submitSetelahCutoff: false,
      revisiSetelahCutoff: false,
      submitDate: submit,
      revisiDate: revisi,
      terlambatMenitSubmit: 0,
      terlambatMenitRevisi: 0,
      masalah: !submit
        ? "WAKTU_SUBMIT_TIDAK_VALID"
        : "CUTOFF_TIDAK_VALID"
    };
  }

  if (countRevisi > 0 && !revisi) {
    return {
      klasifikasi: "TIDAK_DAPAT_DIKLASIFIKASIKAN",
      submitSetelahCutoff:
        submit.getTime() > cutoffDate.getTime(),
      revisiSetelahCutoff: false,
      submitDate: submit,
      revisiDate: null,
      terlambatMenitSubmit: Math.max(
        0,
        Math.floor(
          (submit.getTime() - cutoffDate.getTime()) / 60000
        )
      ),
      terlambatMenitRevisi: 0,
      masalah: "ADA_REVISI_TETAPI_WAKTU_REVISI_TIDAK_VALID"
    };
  }

  var submitLate =
    submit.getTime() > cutoffDate.getTime();

  var revisionExists =
    countRevisi > 0 || !!revisi;

  var revisionLate =
    revisionExists &&
    !!revisi &&
    revisi.getTime() > cutoffDate.getTime();

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
    submitDate: submit,
    revisiDate: revisi,
    terlambatMenitSubmit: submitLate
      ? Math.floor(
          (submit.getTime() - cutoffDate.getTime()) / 60000
        )
      : 0,
    terlambatMenitRevisi: revisionLate
      ? Math.floor(
          (revisi.getTime() - cutoffDate.getTime()) / 60000
        )
      : 0,
    masalah: ""
  };
}


function statusAuditLaporanLewatPeriode3B04A() {
  pastikanMaintainerPortal3B0_(
    "STATUS_AUDIT_LAPORAN_LEWAT_PERIODE_3B04A"
  );

  var periode =
    AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.DEFAULT_PERIODE;

  var lock = bacaTutupPeriodeLaporan_(periode);

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
    lockTersedia: !!lock,
    batasAkhir:
      lock && lock.cutoffDate
        ? formatTanggalAudit3B04A_(lock.cutoffDate)
        : "",
    statusLock: lock ? String(lock.status || "") : "",
    sumberBatasAkhir: "TUTUP_PERIODE_LAPORAN",
    hanyaAudit: true,
    dataDiubah: false,
    pesan: lock
      ? "Konfigurasi audit siap."
      : "Batas akhir periode belum ditemukan."
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
    var invalidPeriod = {
      sukses: false,
      versi:
        AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
      kode: "PERIODE_TIDAK_VALID",
      pesan: "Periode audit tidak valid.",
      hanyaAudit: true,
      dataDiubah: false
    };

    Logger.log(JSON.stringify(invalidPeriod, null, 2));
    return invalidPeriod;
  }

  var lock = bacaTutupPeriodeLaporan_(periode);

  if (
    !lock ||
    !(lock.cutoffDate instanceof Date) ||
    isNaN(lock.cutoffDate.getTime())
  ) {
    var noLock = {
      sukses: false,
      versi:
        AUDIT_LAPORAN_LEWAT_PERIODE_3B04A.VERSION,
      periode: periode,
      labelPeriode: labelPeriodeAudit3B04A_(periode),
      kode: "BATAS_AKHIR_TIDAK_DITEMUKAN",
      pesan:
        "Script Property TUTUP_PERIODE_LAPORAN_" +
        periode +
        " tidak ditemukan atau tidak valid.",
      hanyaAudit: true,
      dataDiubah: false
    };

    Logger.log(JSON.stringify(noLock, null, 2));
    return noLock;
  }

  var sheet = getSheet_("Rekap_Kinerja");
  var columns = SHEET_COLUMNS.REKAP_KINERJA;

  var requiredWidth = Math.max(
    columns.TANGGAL_LAPORAN,
    columns.NAMA,
    columns.JABATAN,
    columns.KATEGORI,
    columns.STATUS_REVIEW,
    columns.POIN_FINAL,
    columns.TANGGAL_KEGIATAN,
    columns.ID_LAPORAN,
    columns.ID_USER,
    columns.REVISI_KE,
    columns.TERAKHIR_DIREVISI_PADA,
    columns.PAYLOAD_JSON,
    typeof columns.PAYLOAD_DETAIL_JSON === "number"
      ? columns.PAYLOAD_DETAIL_JSON
      : 0
  ) + 1;

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

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var periodeInfo =
      tentukanPeriodeRowAudit3B04A_(row, columns);

    if (periodeInfo.periode !== periode) continue;

    jumlahPeriode++;

    var klasifikasi = klasifikasiTanggal3B04A_(
      row[columns.TANGGAL_LAPORAN],
      row[columns.TERAKHIR_DIREVISI_PADA],
      row[columns.REVISI_KE],
      lock.cutoffDate
    );

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

    var isLate =
      klasifikasi.submitSetelahCutoff ||
      klasifikasi.revisiSetelahCutoff;

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
      sumberPeriode: periodeInfo.sumber,
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
      revisiKe:
        Number(row[columns.REVISI_KE]) || 0,
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
    });
  }

  detailTerdampak.sort(function (a, b) {
    var diff =
      Math.max(
        Number(b.terlambatMenitSubmit) || 0,
        Number(b.terlambatMenitRevisi) || 0
      ) -
      Math.max(
        Number(a.terlambatMenitSubmit) || 0,
        Number(a.terlambatMenitRevisi) || 0
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

      pegawaiTerdampak: pegawaiTerdampak
    },
    classificationCounts:
      classificationCounts,
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
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    indexDiubah: false
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
    contohLaporan: result.laporan.slice(
      0,
      AUDIT_LAPORAN_LEWAT_PERIODE_3B04A
        .MAX_DETAIL_LOG
    ),
    hanyaAudit: true,
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
      expected: "TEPAT_WAKTU"
    },
    {
      nama: "Submit setelah cutoff",
      submit:
        new Date(2026, 6, 30, 13, 2, 0, 0),
      revisi: null,
      revisiKe: 0,
      expected: "SUBMIT_SETELAH_CUTOFF"
    },
    {
      nama: "Revisi setelah cutoff",
      submit:
        new Date(2026, 6, 29, 14, 0, 0, 0),
      revisi:
        new Date(2026, 6, 30, 10, 0, 0, 0),
      revisiKe: 1,
      expected: "REVISI_SETELAH_CUTOFF"
    },
    {
      nama: "Submit dan revisi setelah cutoff",
      submit:
        new Date(2026, 6, 30, 8, 0, 0, 0),
      revisi:
        new Date(2026, 6, 31, 9, 0, 0, 0),
      revisiKe: 1,
      expected:
        "SUBMIT_DAN_REVISI_SETELAH_CUTOFF"
    }
  ];

  var hasil = cases.map(function (item) {
    var actual = klasifikasiTanggal3B04A_(
      item.submit,
      item.revisi,
      item.revisiKe,
      cutoff
    );

    return {
      nama: item.nama,
      expected: item.expected,
      actual: actual.klasifikasi,
      sesuai:
        actual.klasifikasi === item.expected
    };
  });

  var sukses = hasil.every(function (item) {
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
    dataDiubah: false
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
    var failed = {
      sukses: false,
      auditSukses: false,
      pesan:
        audit && audit.pesan
          ? audit.pesan
          : "Audit gagal dijalankan.",
      dataDiubah: false
    };

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

  var valid =
    totalKlasifikasi === totalLaporan &&
    audit.dataDiubah === false &&
    audit.poinDiubah === false &&
    audit.statusReviewDiubah === false &&
    audit.indexDiubah === false;

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
    dataDiubah: false,
    issues: valid
      ? []
      : [
          "Jumlah klasifikasi tidak sama dengan total laporan periode."
        ],
    pesan: valid
      ? "Audit 3B-0.4A lulus validasi konsistensi."
      : "Audit 3B-0.4A belum konsisten."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END PATCH 3B-0.4A =====