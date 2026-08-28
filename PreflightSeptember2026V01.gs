// ============================================================
// DIAGNOSTIK MANUAL — PREFLIGHT SEPTEMBER 2026 v0.1
// APP_VERSION target 2026.08.28.04
//
// Tujuan:
// - menguji logika periode September sebelum laporan produksi masuk;
// - memastikan Laporan Wajib Agustus menjadi hak September;
// - menguji pengurangan mingguan Pasal 33;
// - menguji cut-off September, revisi, dan review Admin setelah cut-off;
// - memastikan kebijakan tanpa imbalan mulai efektif untuk laporan/revisi
//   yang melewati cut-off mulai periode review September 2026;
// - seluruh pengujian memakai data simulasi di memori.
//
// PENTING:
// - cut-off September dalam file ini adalah CUT-OFF SIMULASI berdasarkan
//   CONFIG.TUNJANGAN.DEFAULT_CUTOFF_DAY/TIME, BUKAN pengaturan produksi;
// - fungsi ini tidak membaca/menulis Spreadsheet atau PropertiesService;
// - fungsi ini tidak mengubah poin, status review, workflow, atau schema.
//
// Jalankan manual dari Apps Script editor:
//   validasiPreflightSeptember2026V01
// ============================================================

var PREFLIGHT_SEPTEMBER_2026_V01_VERSION_ = "PREFLIGHT-SEP-2026-v0.1-2026.08.28.04";

function pad2PreflightSep_(value) {
  var n = Number(value) || 0;
  return n < 10 ? "0" + n : String(n);
}

function parseJamPreflightSep_(value) {
  var s = String(value || "18:00").trim();
  var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return { jam: 18, menit: 0, detik: 0, label: "18:00:00" };
  var h = Number(m[1]);
  var min = Number(m[2]);
  var sec = Number(m[3] || 0);
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    return { jam: 18, menit: 0, detik: 0, label: "18:00:00" };
  }
  return { jam: h, menit: min, detik: sec, label: pad2PreflightSep_(h) + ":" + pad2PreflightSep_(min) + ":" + pad2PreflightSep_(sec) };
}

function tanggalLokalPreflightSep_(tahun, bulanIdx, tanggal, jam, menit, detik) {
  return new Date(Number(tahun), Number(bulanIdx), Number(tanggal), Number(jam || 0), Number(menit || 0), Number(detik || 0), 0);
}

function rangePreflightSep_(periode, startDate, cutoffDate, sumber) {
  return {
    periode: String(periode || ""),
    start: new Date(startDate.getTime()),
    end: new Date(cutoffDate.getTime() + 1),
    endInclusive: new Date(cutoffDate.getTime()),
    cutoffDate: new Date(cutoffDate.getTime()),
    sumber: String(sumber || "SIMULASI_PREFLIGHT_SEPTEMBER")
  };
}

function konteksPreflightSep_(denganSeptember) {
  var cutoffCfg = parseJamPreflightSep_(CONFIG && CONFIG.TUNJANGAN ? CONFIG.TUNJANGAN.DEFAULT_CUTOFF_TIME : "18:00");
  var cutoffDay = Number(CONFIG && CONFIG.TUNJANGAN ? CONFIG.TUNJANGAN.DEFAULT_CUTOFF_DAY : 25) || 25;
  cutoffDay = Math.max(1, Math.min(30, cutoffDay));

  // Agustus memakai metadata produksi yang sudah final: 30/07 s.d. 27/08, 17:30.
  var aug = rangePreflightSep_(
    "2026-08",
    tanggalLokalPreflightSep_(2026, 6, 30, 0, 0, 0),
    tanggalLokalPreflightSep_(2026, 7, 27, 17, 30, 0),
    "BASELINE_AGUSTUS_FINAL"
  );

  var sepCutoff = tanggalLokalPreflightSep_(2026, 8, cutoffDay, cutoffCfg.jam, cutoffCfg.menit, cutoffCfg.detik);
  var sep = rangePreflightSep_(
    "2026-09",
    tanggalLokalPreflightSep_(2026, 7, 28, 0, 0, 0),
    sepCutoff,
    "SIMULASI_DEFAULT_CONFIG"
  );

  var octStart = tanggalLokalPreflightSep_(2026, 8, cutoffDay + 1, 0, 0, 0);
  var octCutoff = tanggalLokalPreflightSep_(2026, 9, cutoffDay, cutoffCfg.jam, cutoffCfg.menit, cutoffCfg.detik);
  var oct = rangePreflightSep_(
    "2026-10",
    octStart,
    octCutoff,
    "SIMULASI_DEFAULT_CONFIG"
  );

  var byPeriod = { "2026-08": aug };
  var ranges = [aug];
  if (denganSeptember !== false) {
    byPeriod["2026-09"] = sep;
    byPeriod["2026-10"] = oct;
    ranges.push(sep, oct);
  }
  return {
    byPeriod: byPeriod,
    ranges: ranges,
    totalRanges: ranges.length,
    cutoffSimulasiSeptember: sepCutoff,
    cutoffSimulasiLabel: pad2PreflightSep_(cutoffDay) + "/09/2026 " + cutoffCfg.label + " WIB",
    cutoffAdalahKonfigurasiProduksi: false
  };
}

function buatRowWajibPreflightSep_(cfg) {
  cfg = cfg || {};
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var maxIndex = 0;
  Object.keys(C || {}).forEach(function (key) {
    var idx = Number(C[key]);
    if (isFinite(idx) && idx > maxIndex) maxIndex = idx;
  });
  var row = new Array(maxIndex + 1).fill("");

  row[C.TANGGAL_KEGIATAN] = cfg.tanggalKegiatan || tanggalLokalPreflightSep_(2026, 7, 1, 9, 0, 0);
  row[C.TANGGAL_LAPORAN] = cfg.submit || tanggalLokalPreflightSep_(2026, 8, 1, 9, 0, 0);
  row[C.KATEGORI] = cfg.kategori || "Laporan Produktifitas - Pelaksanaan Kegiatan Wajib Bulanan";
  row[C.REVISI_KE] = Number(cfg.revisiKe || 0);
  row[C.TERAKHIR_DIREVISI_PADA] = cfg.revisiPada || "";
  if (typeof C.WAKTU_REVIEW_ADMIN === "number") row[C.WAKTU_REVIEW_ADMIN] = cfg.reviewAdmin || "";
  if (typeof C.STATUS_REVIEW === "number") row[C.STATUS_REVIEW] = cfg.statusReview || "Disetujui";
  if (typeof C.POIN_FINAL === "number") row[C.POIN_FINAL] = cfg.poinFinal === undefined ? 20 : cfg.poinFinal;
  if (typeof C.WAJIB_PAMONG_BULAN === "number") row[C.WAJIB_PAMONG_BULAN] = cfg.bulanWajib || "2026-08";
  if (typeof C.PAYLOAD_JSON === "number") {
    row[C.PAYLOAD_JSON] = JSON.stringify({
      detailWajibPamong: { bulan: cfg.bulanWajib || "2026-08" },
      preflightSeptember2026: true
    });
  }
  return row;
}

function buatRowRegulerPreflightSep_(activity, submit) {
  return buatRowWajibPreflightSep_({
    tanggalKegiatan: activity,
    submit: submit,
    kategori: "Laporan Produktifitas - Pelaksanaan Kegiatan",
    bulanWajib: ""
  });
}

function nilaiPreflightSep_(id, nama, kondisi, detail) {
  return {
    id: id,
    nama: nama,
    lulus: kondisi === true,
    detail: detail || {}
  };
}

function validasiPreflightSeptember2026V01() {
  var hasil = [];
  var context = konteksPreflightSep_(true);
  var contextTanpaCutoffSep = konteksPreflightSep_(false);
  var cutoffSep = context.cutoffSimulasiSeptember;

  // S01 — Bulan isi Agustus harus menjadi hak September.
  var parsed = parsePeriodePasal33_("2026-08");
  var periodHak = parsed
    ? Utilities.formatDate(new Date(parsed.tahunHak, parsed.bulanHakIdx, 1), "GMT+7", "yyyy-MM")
    : "";
  hasil.push(nilaiPreflightSep_(
    "S01",
    "Laporan wajib Agustus menjadi hak September",
    !!parsed && periodHak === "2026-09" && periodeBerikutnya3B04C1c_("2026-08") === "2026-09",
    { bulanIsi: "2026-08", periodeHak: periodHak }
  ));

  // S02 — Setelah cut-off Agustus, laporan wajib Agustus sudah berada pada periode September.
  var submitAwal = tanggalLokalPreflightSep_(2026, 7, 28, 9, 0, 0);
  var rowAwal = buatRowWajibPreflightSep_({ submit: submitAwal });
  var metaAwal = buatMetadataRow3B04C1c_(rowAwal, SHEET_COLUMNS.REKAP_KINERJA, context);
  var hakAwal = evaluasiPasal33Hak_("2026-08", submitAwal, submitAwal);
  hasil.push(nilaiPreflightSep_(
    "S02",
    "Awal periode September menerima laporan wajib Agustus",
    metaAwal.periodeAsal === "2026-09" && metaAwal.periodeReview === "2026-09" && metaAwal.lewatPeriode === false && Number(hakAwal.poinHak) === 20,
    { periodeAsal: metaAwal.periodeAsal, periodeReview: metaAwal.periodeReview, poinHak: hakAwal.poinHak, statusPasal33: hakAwal.statusLabel }
  ));

  // S03-S07 — Pengurangan mingguan Pasal 33 selama bulan hak September.
  [
    { id: "S03", day: 3, poin: 20, nama: "Minggu pertama September = 20 poin" },
    { id: "S04", day: 10, poin: 15, nama: "Minggu kedua September = 15 poin" },
    { id: "S05", day: 17, poin: 10, nama: "Minggu ketiga September = 10 poin" },
    { id: "S06", day: 24, poin: 5, nama: "Minggu keempat September = 5 poin" },
    { id: "S07", day: 29, poin: 0, nama: "Akhir September = 0 poin" }
  ].forEach(function (cfg) {
    var d = tanggalLokalPreflightSep_(2026, 8, cfg.day, 9, 0, 0);
    var ev = evaluasiPasal33Hak_("2026-08", d, d);
    hasil.push(nilaiPreflightSep_(cfg.id, cfg.nama, ev.valid === true && Number(ev.poinHak) === cfg.poin, {
      tanggalSubmit: cfg.day + "/09/2026",
      poinHak: ev.poinHak,
      statusPasal33: ev.statusLabel
    }));
  });

  // S08 — Admin mereview setelah cut-off tidak boleh mengubah ketepatan bila pegawai submit tepat waktu.
  var submitTepat = new Date(cutoffSep.getTime() - 60 * 1000);
  var reviewSesudah = new Date(cutoffSep.getTime() + 24 * 60 * 60 * 1000);
  var rowReviewAdmin = buatRowWajibPreflightSep_({ submit: submitTepat, reviewAdmin: reviewSesudah });
  var metaReviewAdmin = buatMetadataRow3B04C1c_(rowReviewAdmin, SHEET_COLUMNS.REKAP_KINERJA, context);
  var policyReviewAdmin = evaluasiKebijakanCutoffImbalan3C4_(rowReviewAdmin, context);
  hasil.push(nilaiPreflightSep_(
    "S08",
    "Review Admin setelah cut-off tidak menghukum submit tepat waktu",
    metaReviewAdmin.lewatPeriode === false && metaReviewAdmin.periodeReview === "2026-09" && metaReviewAdmin.sumberWaktuEfektif === "WAKTU_SUBMIT" && policyReviewAdmin.tanpaImbalan === false,
    { periodeReview: metaReviewAdmin.periodeReview, sumberWaktuEfektif: metaReviewAdmin.sumberWaktuEfektif, tanpaImbalan: policyReviewAdmin.tanpaImbalan }
  ));

  // S09 — Revisi pegawai setelah cut-off adalah waktu efektif dan harus dialihkan/0 imbalan.
  var submitSebelum = new Date(cutoffSep.getTime() - 5 * 24 * 60 * 60 * 1000);
  var revisiSesudah = new Date(cutoffSep.getTime() + 60 * 1000);
  var rowRevisiLate = buatRowWajibPreflightSep_({ submit: submitSebelum, revisiKe: 1, revisiPada: revisiSesudah });
  var metaRevisiLate = buatMetadataRow3B04C1c_(rowRevisiLate, SHEET_COLUMNS.REKAP_KINERJA, context);
  var policyRevisiLate = evaluasiKebijakanCutoffImbalan3C4_(rowRevisiLate, context);
  hasil.push(nilaiPreflightSep_(
    "S09",
    "Revisi setelah cut-off dialihkan dan tanpa imbalan",
    metaRevisiLate.lewatPeriode === true && metaRevisiLate.periodeAsal === "2026-09" && metaRevisiLate.periodeReview === "2026-10" && metaRevisiLate.sumberWaktuEfektif === "WAKTU_REVISI" && policyRevisiLate.tanpaImbalan === true,
    { periodeAsal: metaRevisiLate.periodeAsal, periodeReview: metaRevisiLate.periodeReview, jenisKetepatan: metaRevisiLate.jenisKetepatan, tanpaImbalan: policyRevisiLate.tanpaImbalan }
  ));

  // S10 — Submit setelah cut-off September dialihkan ke Oktober dan kebijakan 3C-4 aktif.
  var submitLate = new Date(cutoffSep.getTime() + 15 * 60 * 60 * 1000);
  var rowSubmitLate = buatRowWajibPreflightSep_({ submit: submitLate });
  var metaSubmitLate = buatMetadataRow3B04C1c_(rowSubmitLate, SHEET_COLUMNS.REKAP_KINERJA, context);
  var policySubmitLate = evaluasiKebijakanCutoffImbalan3C4_(rowSubmitLate, context);
  hasil.push(nilaiPreflightSep_(
    "S10",
    "Submit setelah cut-off September dialihkan dan tanpa imbalan",
    metaSubmitLate.lewatPeriode === true && metaSubmitLate.periodeReview === "2026-10" && policySubmitLate.berlaku === true && policySubmitLate.tanpaImbalan === true,
    { periodeReview: metaSubmitLate.periodeReview, jenisKetepatan: metaSubmitLate.jenisKetepatan, tanpaImbalan: policySubmitLate.tanpaImbalan }
  ));

  // S11 — Bila cut-off September belum ditetapkan Admin, sistem tidak boleh mengarang keterlambatan.
  var dNoCutoff = tanggalLokalPreflightSep_(2026, 8, 10, 9, 0, 0);
  var rowNoCutoff = buatRowWajibPreflightSep_({ submit: dNoCutoff });
  var metaNoCutoff = buatMetadataRow3B04C1c_(rowNoCutoff, SHEET_COLUMNS.REKAP_KINERJA, contextTanpaCutoffSep);
  var policyNoCutoff = evaluasiKebijakanCutoffImbalan3C4_(rowNoCutoff, contextTanpaCutoffSep);
  hasil.push(nilaiPreflightSep_(
    "S11",
    "Cut-off September belum ditetapkan tidak menimbulkan false late",
    metaNoCutoff.periodeAsal === "2026-09" && metaNoCutoff.lewatPeriode === false && metaNoCutoff.jenisKetepatan === "CUTOFF_BELUM_DITETAPKAN" && policyNoCutoff.tanpaImbalan === false,
    { periodeAsal: metaNoCutoff.periodeAsal, jenisKetepatan: metaNoCutoff.jenisKetepatan, tanpaImbalan: policyNoCutoff.tanpaImbalan }
  ));

  // S12 — Kegiatan reguler 28 Agustus masuk rentang periode September.
  var actSepStart = tanggalLokalPreflightSep_(2026, 7, 28, 10, 0, 0);
  var rowReg = buatRowRegulerPreflightSep_(actSepStart, actSepStart);
  var metaReg = buatMetadataRow3B04C1c_(rowReg, SHEET_COLUMNS.REKAP_KINERJA, context);
  hasil.push(nilaiPreflightSep_(
    "S12",
    "Kegiatan reguler 28 Agustus masuk periode September",
    metaReg.periodeAsal === "2026-09" && metaReg.periodeReview === "2026-09" && metaReg.lewatPeriode === false,
    { periodeAsal: metaReg.periodeAsal, periodeReview: metaReg.periodeReview, sumberPeriodeAsal: metaReg.sumberPeriodeAsal }
  ));

  // S13 — Invariant batas produktivitas: raw 95 + hak wajib 20 tetap maksimum 100%.
  var hakFull = evaluasiPasal33Hak_("2026-08", tanggalLokalPreflightSep_(2026, 8, 3, 9, 0, 0), tanggalLokalPreflightSep_(2026, 8, 3, 9, 0, 0));
  var rawProd = 95 + Number(hakFull.poinHak || 0);
  var persenTerbatas = Math.min(100, rawProd);
  hasil.push(nilaiPreflightSep_(
    "S13",
    "Batas produktivitas tetap maksimum 100%",
    rawProd === 115 && persenTerbatas === 100,
    { jenisUji: "INVARIANT_ARITMETIKA", poinSebelumWajib: 95, poinWajib: hakFull.poinHak, rawPoin: rawProd, persenDibayar: persenTerbatas }
  ));

  // S14 — Target Pasal 33 tetap hanya jabatan sekretariat/teknis yang dikonfigurasi.
  var targetDanarta = isTargetPasal33_("Kepala Urusan Danarta");
  var targetDukuh = isTargetPasal33_("Dukuh Gantalan");
  hasil.push(nilaiPreflightSep_(
    "S14",
    "Target jabatan Pasal 33 tetap konsisten",
    targetDanarta === true && targetDukuh === false,
    { kepalaUrusanDanarta: targetDanarta, dukuhGantalan: targetDukuh }
  ));

  var lulus = hasil.filter(function (item) { return item.lulus; }).length;
  var gagal = hasil.length - lulus;
  var result = {
    sukses: gagal === 0,
    valid: gagal === 0,
    versi: PREFLIGHT_SEPTEMBER_2026_V01_VERSION_,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    mode: "SIMULASI_MEMORI_NON_DESTRUKTIF",
    periodeTarget: "2026-09",
    bulanLaporanWajibTarget: "2026-08",
    tanggalMulaiPeriodeSimulasi: "28/08/2026",
    cutoffSimulasi: context.cutoffSimulasiLabel,
    cutoffSimulasiBukanKonfigurasiProduksi: true,
    jumlahSkenario: hasil.length,
    lulus: lulus,
    gagal: gagal,
    skenario: hasil,
    spreadsheetDibaca: false,
    spreadsheetDitulis: false,
    propertiesDibaca: false,
    propertiesDitulis: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    statusTunjanganDiubah: false,
    schemaDiubah: false,
    pesan: gagal === 0
      ? "Preflight September 2026 v0.1 lulus seluruh simulasi non-destruktif."
      : "Terdapat " + gagal + " skenario Preflight September yang belum sesuai."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
