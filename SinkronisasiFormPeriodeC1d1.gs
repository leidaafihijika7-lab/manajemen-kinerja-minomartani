// ============================================================
// HOTFIX 3B-0.4C1d1 — SINKRONISASI FORM TUTUP PERIODE
// Mencegah periode terpilih membawa tanggal/jam/alasan periode lain.
// Tidak mengubah data laporan, poin, status review, atau schema.
// ============================================================

var SINKRONISASI_FORM_PERIODE_3B04C1D1 = Object.freeze({
  VERSION: "3B04C1d1-2026.08.07.02",
  APP_VERSION: "2026.08.07.02"
});

function ambilKonfigurasiTutupPeriode3B04C1d1(periode, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };

    if (!cekHakAksesLurahCarikAdmin_(idUser)) {
      return { sukses: false, pesan: "Akses ditolak." };
    }

    var p = normalisasiPeriode3B04C1_(periode || "");
    if (!p) return { sukses: false, pesan: "Periode laporan tidak valid." };

    var cutoff = bacaCutoffOperasional3B04C1_(p);
    var closeStatus = statusPenutupanAdmin3B04C1_(p);
    var parts = cutoff && cutoff.cutoffDate
      ? tanggalDanJamInput3B04C1_(cutoff.cutoffDate)
      : { tanggal: "", jam: "" };

    return {
      sukses: true,
      versi: SINKRONISASI_FORM_PERIODE_3B04C1D1.VERSION,
      periode: p,
      periodeLabel: labelPeriode3B04C1_(p),
      cutoffTersedia: !!(cutoff && cutoff.cutoffDate),
      cutoffAt: cutoff && cutoff.cutoffDate ? formatTanggalJamISO_(cutoff.cutoffDate) : "",
      cutoffLabel: cutoff && cutoff.cutoffDate ? formatCutoff3B04C1_(cutoff.cutoffDate) : "",
      cutoffTanggalInput: parts.tanggal,
      cutoffJamInput: parts.jam,
      sumberCutoff: cutoff ? String(cutoff.sumber || "") : "",
      periodeDitutupAdmin: !!closeStatus.ditutup,
      tanggalTutupAdmin: closeStatus.tanggalTutup || "",
      dataDiubah: false,
      poinDiubah: false,
      statusReviewDiubah: false,
      schemaDiubah: false
    };
  } catch (e) {
    return handleError(
      "ambilKonfigurasiTutupPeriode3B04C1d1",
      e,
      { sukses: false, pesan: "Gagal memuat konfigurasi periode." }
    );
  }
}

function statusSinkronisasiFormPeriode3B04C1d1() {
  pastikanMaintainerPortal3B0_("STATUS_SINKRONISASI_FORM_PERIODE_3B04C1D1");
  var result = {
    sukses: true,
    valid: true,
    versi: SINKRONISASI_FORM_PERIODE_3B04C1D1.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    endpointTersedia: typeof ambilKonfigurasiTutupPeriode3B04C1d1 === "function",
    resolverCutoffTersedia: typeof bacaCutoffOperasional3B04C1_ === "function",
    inputDetikTersedia: typeof tanggalDanJamInput3B04C1_ === "function",
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function validasiSinkronisasiFormPeriode3B04C1d1() {
  var result = statusSinkronisasiFormPeriode3B04C1d1();
  var test = new Date(2026, 3, 25, 18, 13, 40, 0);
  var parts = tanggalDanJamInput3B04C1_(test);
  result.inputTanggalTest = parts.tanggal;
  result.inputJamTest = parts.jam;
  result.valid = result.valid &&
    parts.tanggal === "2026-04-25" &&
    parts.jam === "18:13:40" &&
    result.appVersion === SINKRONISASI_FORM_PERIODE_3B04C1D1.APP_VERSION;
  result.issues = result.valid ? [] : ["VALIDASI_FORM_PERIODE_GAGAL"];
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
