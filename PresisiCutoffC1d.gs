// ============================================================
// PATCH 3B-0.4C1d — PRESISI CUT-OFF SAMPAI DETIK
// Target APP_VERSION: 2026.08.07.01
// Tidak mengubah data Spreadsheet, poin, status review, atau skema.
// ============================================================

var PRESISI_CUTOFF_3B04C1D = {
  VERSION: "3B04C1d-2026.08.07.01",
  APP_VERSION: "2026.08.07.01"
};

function statusPresisiCutoff3B04C1d() {
  var april = parseTanggalJamTutupPeriode_("2026-04-25", "18:13:40");
  var june = parseTanggalJamTutupPeriode_("2026-06-29", "11:00:00");
  var aprilMinuteOnly = parseTanggalJamTutupPeriode_("2026-04-25", "18:13:00");

  return {
    sukses: true,
    versi: PRESISI_CUTOFF_3B04C1D.VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? APP_VERSION : "",
    formatterTersedia: typeof formatCutoffPresisi3B04C1d_ === "function",
    comparatorDetikTersedia: typeof cutoffSamaSampaiDetik3B04C1d_ === "function",
    formatterC1Tersedia: typeof formatCutoff3B04C1_ === "function",
    formatterC1cTersedia: typeof formatCutoff3B04C1c_ === "function",
    aprilDenganDetik: formatCutoffPresisi3B04C1d_(april),
    juniTanpaDetikNol: formatCutoffPresisi3B04C1d_(june),
    april40DetikBerbedaDianggapSinkron: cutoffSamaSampaiDetik3B04C1d_(april, aprilMinuteOnly),
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false
  };
}

function validasiPresisiCutoff3B04C1d() {
  var status = statusPresisiCutoff3B04C1d();
  var issues = [];

  if (status.aprilDenganDetik !== "25/04/2026 18:13:40 WIB") {
    issues.push("Cut-off April tidak tampil lengkap sampai detik.");
  }
  if (status.juniTanpaDetikNol !== "29/06/2026 11:00 WIB") {
    issues.push("Cut-off berdetik 00 seharusnya tetap tampil ringkas HH:mm.");
  }
  if (status.april40DetikBerbedaDianggapSinkron !== false) {
    issues.push("Selisih 40 detik masih dianggap sinkron.");
  }
  if (!status.formatterC1Tersedia || !status.formatterC1cTersedia) {
    issues.push("Formatter integrasi C1/C1c belum tersedia.");
  }

  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: PRESISI_CUTOFF_3B04C1D.VERSION,
    appVersion: status.appVersion,
    aprilDenganDetik: status.aprilDenganDetik,
    juniTanpaDetikNol: status.juniTanpaDetikNol,
    beda40DetikTerdeteksi: status.april40DetikBerbedaDianggapSinkron === false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    schemaDiubah: false,
    issues: issues
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
