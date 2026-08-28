// ============================================================
// DIAGNOSTIK MANUAL — CONSISTENCY GUARD TUNJANGAN v0.1
// APP_VERSION target 2026.08.28.05
//
// Tujuan:
// - menguji Consistency Guard dengan data simulasi di memori;
// - tidak membaca/menulis Spreadsheet;
// - tidak mengubah poin, status review, workflow, atau schema produksi.
//
// Jalankan manual dari Apps Script editor:
//   validasiConsistencyGuardTunjanganV01
// ============================================================

var VALIDASI_CGT_V01_VERSION_ = "CGT-TEST-v0.1-2026.08.28.05";

function cloneCgtTest_(value) {
  return JSON.parse(JSON.stringify(value));
}

function buatRowCgtTest_(cfg) {
  cfg = cfg || {};
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  var row = new Array(34).fill("");
  var status = String(cfg.status || TUNJANGAN_STATUS.DRAFT);
  var persenProd = cfg.persenProd === undefined ? 50 : Number(cfg.persenProd);
  var persenTU = cfg.persenTU === undefined ? 25 : Number(cfg.persenTU);
  var maxProd = cfg.maxProd === undefined ? 360000 : Number(cfg.maxProd);
  var maxTU = cfg.maxTU === undefined ? 180000 : Number(cfg.maxTU);
  var rpProd = cfg.rpProd === undefined ? (persenProd / 100) * maxProd : cfg.rpProd;
  var rpTU = cfg.rpTU === undefined ? (persenTU / 100) * maxTU : cfg.rpTU;
  var rpTotal = cfg.rpTotal === undefined ? Number(rpProd) + Number(rpTU) : cfg.rpTotal;

  row[C.PERIODE] = cfg.periode || "2026-09";
  row[C.ID_USER] = cfg.idUser || "CGT-USER-01";
  row[C.NAMA] = cfg.nama || "Pegawai Simulasi 1";
  row[C.JABATAN] = cfg.jabatan || "Staf Simulasi";
  row[C.KELOMPOK] = cfg.kelompok || "Staf Pamong Kalurahan";
  row[C.JUMLAH_LAPORAN_DISETUJUI] = cfg.jumlahLaporan === undefined ? 10 : cfg.jumlahLaporan;
  row[C.POIN_PROD] = cfg.poinProd === undefined ? persenProd : cfg.poinProd;
  row[C.POIN_TU] = cfg.poinTU === undefined ? persenTU : cfg.poinTU;
  row[C.PERSEN_PROD] = persenProd;
  row[C.PERSEN_TU] = persenTU;
  row[C.MAX_PROD] = maxProd;
  row[C.MAX_TU] = maxTU;
  row[C.RP_PROD] = rpProd;
  row[C.RP_TU] = rpTU;
  row[C.RP_TOTAL] = rpTotal;
  row[C.STATUS_REKAP] = status;
  row[C.CATATAN_CARIK] = "Simulasi CGT";
  row[C.CATATAN_LURAH] = "Simulasi CGT";
  row[C.CATATAN_BENDAHARA] = "";
  row[C.DIBUAT_OLEH] = "DIAGNOSTIK_CGT";
  row[C.DIBUAT_PADA] = "28/08/2026 08:00:00";
  row[C.BATCH_ID] = cfg.batchId || "CGT-TEST-202609-001";
  row[C.IS_ACTIVE] = cfg.isActive === undefined ? true : cfg.isActive;
  row[C.LABEL_PEMBAYARAN] = cfg.labelPembayaran || "September 2026";
  row[C.TANGGAL_MULAI_PERIODE] = cfg.tanggalMulai || "2026-08-28";
  row[C.TANGGAL_AKHIR_PERIODE] = cfg.tanggalAkhir || "2026-09-27";
  row[C.TANGGAL_CUTOFF] = cfg.tanggalCutoff || "2026-09-27 17:30:00";

  if (status === TUNJANGAN_STATUS.DISETUJUI_LURAH || status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN) {
    row[C.DIKUNCI_PADA] = "28/09/2026 18:00:00";
    row[C.DIAJUKAN_PADA] = "28/09/2026 18:05:00";
    row[C.DISETUJUI_PADA] = "28/09/2026 18:10:00";
  }
  if (status === TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN) {
    row[C.DITERUSKAN_BENDAHARA_PADA] = "28/09/2026 18:15:00";
  }
  if (status === TUNJANGAN_STATUS.SUDAH_DICAIRKAN) {
    row[C.DICAIRKAN_PADA] = "29/09/2026 10:00:00";
  }

  return row;
}

function buatBatchCgtTest_(status) {
  var row1 = buatRowCgtTest_({
    status: status,
    idUser: "CGT-USER-01",
    nama: "Pegawai Simulasi 1",
    persenProd: 50,
    persenTU: 25,
    maxProd: 360000,
    maxTU: 180000,
    poinProd: 50,
    poinTU: 25,
    jumlahLaporan: 10
  });
  var row2 = buatRowCgtTest_({
    status: status,
    idUser: "CGT-USER-02",
    nama: "Pegawai Simulasi 2",
    persenProd: 80,
    persenTU: 50,
    maxProd: 348000,
    maxTU: 174000,
    poinProd: 80,
    poinTU: 50,
    jumlahLaporan: 14
  });
  return {
    periode: "2026-09",
    status: status,
    batchId: "CGT-TEST-202609-001",
    rows: [
      { rowIndex: 2, values: row1 },
      { rowIndex: 3, values: row2 }
    ]
  };
}

function hasilHitungUlangDariBatchCgtTest_(batch) {
  return (batch.rows || []).map(function (item) {
    var s = snapshotRowConsistencyTunjangan_(item.values || []);
    return {
      idUser: s.idUser,
      nama: s.nama,
      jabatan: s.jabatan,
      jumlahLaporanDisetujui: s.jumlahLaporanDisetujui,
      poinProd: s.poinProd,
      poinTU: s.poinTU,
      persenProd: s.persenProd,
      persenTU: s.persenTU,
      maxProd: s.maxProd,
      maxTU: s.maxTU,
      rpProd: s.rpProd,
      rpTU: s.rpTU,
      rpTotal: s.rpTotal
    };
  });
}

function kodeBlockerCgtTest_(hasil) {
  return (hasil && Array.isArray(hasil.blockers) ? hasil.blockers : []).map(function (b) {
    return String((b && b.code) || "");
  });
}

function nilaiSkenarioCgtTest_(id, nama, hasil, expectedValid, expectedCode, extraCheck) {
  var codes = kodeBlockerCgtTest_(hasil);
  var validMatch = !!(hasil && hasil.valid) === !!expectedValid;
  var codeMatch = expectedCode ? codes.indexOf(expectedCode) !== -1 : codes.length === 0;
  var extraOk = typeof extraCheck === "function" ? extraCheck(hasil) === true : true;
  return {
    id: id,
    nama: nama,
    expectedValid: !!expectedValid,
    actualValid: !!(hasil && hasil.valid),
    expectedBlocker: expectedCode || "",
    blockerCodes: codes,
    lulus: validMatch && codeMatch && extraOk
  };
}

function validasiConsistencyGuardTunjanganV01() {
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  var hasilSkenario = [];
  var opsiDasar = {
    modeSimulasi: true,
    token: "CGT_TEST_V01",
    pendingOverride: { count: 0, contoh: [] }
  };

  // 1) Batch Draft valid -> ALLOW.
  var batchValid = buatBatchCgtTest_(TUNJANGAN_STATUS.DRAFT);
  var recalcValid = hasilHitungUlangDariBatchCgtTest_(batchValid);
  var r1 = jalankanConsistencyGuardTunjangan_(batchValid, "KUNCI_DRAFT", {
    modeSimulasi: true,
    token: "CGT_TEST_V01",
    pendingOverride: { count: 0, contoh: [] },
    hitungUlangOverride: recalcValid
  });
  hasilSkenario.push(nilaiSkenarioCgtTest_(
    "S01", "Draft valid lulus Kunci", r1, true, "",
    function (h) { return h.totalSnapshot === h.totalHitungUlang && h.delta === 0; }
  ));

  // 2) Laporan masih menunggu review -> BLOCK.
  var r2 = jalankanConsistencyGuardTunjangan_(cloneCgtTest_(batchValid), "KUNCI_DRAFT", {
    modeSimulasi: true,
    token: "CGT_TEST_V01",
    pendingOverride: {
      count: 2,
      contoh: [
        { idLaporan: "CGT-LAP-01", nama: "Pegawai Simulasi 1", status: "Menunggu Review" },
        { idLaporan: "CGT-LAP-02", nama: "Pegawai Simulasi 2", status: "Menunggu Review" }
      ]
    },
    hitungUlangOverride: recalcValid
  });
  hasilSkenario.push(nilaiSkenarioCgtTest_(
    "S02", "Pending review diblokir", r2, false, "LAPORAN_MASIH_MENUNGGU_REVIEW",
    function (h) { return Number(h.pendingReviewCount) === 2; }
  ));

  // 3) Snapshot berubah setelah Draft dibuat -> BLOCK.
  var recalcBerubah = cloneCgtTest_(recalcValid);
  recalcBerubah[0].poinProd = 55;
  recalcBerubah[0].persenProd = 55;
  recalcBerubah[0].rpProd = 198000;
  recalcBerubah[0].rpTotal = 243000;
  var r3 = jalankanConsistencyGuardTunjangan_(cloneCgtTest_(batchValid), "KUNCI_DRAFT", {
    modeSimulasi: true,
    token: "CGT_TEST_V01",
    pendingOverride: { count: 0, contoh: [] },
    hitungUlangOverride: recalcBerubah
  });
  hasilSkenario.push(nilaiSkenarioCgtTest_(
    "S03", "Perubahan snapshot diblokir", r3, false, "SNAPSHOT_BERUBAH",
    function (h) { return Number(h.delta) !== 0; }
  ));

  // Untuk skenario integritas snapshot berikutnya gunakan tahap TANDAI_CAIR
  // agar tidak ada pembacaan live / hitung ulang.
  var batchCair = buatBatchCgtTest_(TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA);

  // 4) Pegawai duplikat -> BLOCK.
  var b4 = cloneCgtTest_(batchCair);
  b4.rows[1].values[C.ID_USER] = b4.rows[0].values[C.ID_USER];
  var r4 = jalankanConsistencyGuardTunjangan_(b4, "TANDAI_CAIR", opsiDasar);
  hasilSkenario.push(nilaiSkenarioCgtTest_("S04", "Pegawai duplikat diblokir", r4, false, "PEGAWAI_DUPLIKAT"));

  // 5) Metadata periode/cut-off berbeda antarbaris -> BLOCK.
  var b5 = cloneCgtTest_(batchCair);
  b5.rows[1].values[C.TANGGAL_CUTOFF] = "2026-09-27 18:00:00";
  var r5 = jalankanConsistencyGuardTunjangan_(b5, "TANDAI_CAIR", opsiDasar);
  hasilSkenario.push(nilaiSkenarioCgtTest_("S05", "Metadata baris tidak konsisten diblokir", r5, false, "METADATA_BARIS_TIDAK_KONSISTEN"));

  // 6) Kolom angka wajib kosong/bukan angka -> BLOCK.
  var b6 = cloneCgtTest_(batchCair);
  b6.rows[0].values[C.RP_TOTAL] = "BUKAN_ANGKA";
  var r6 = jalankanConsistencyGuardTunjangan_(b6, "TANDAI_CAIR", opsiDasar);
  hasilSkenario.push(nilaiSkenarioCgtTest_("S06", "Nilai numerik rusak diblokir", r6, false, "NILAI_NUMERIK_TIDAK_VALID"));

  // 7) Aritmetika rupiah tidak cocok -> BLOCK.
  var b7 = cloneCgtTest_(batchCair);
  b7.rows[0].values[C.RP_TOTAL] = Number(b7.rows[0].values[C.RP_TOTAL]) + 1000;
  var r7 = jalankanConsistencyGuardTunjangan_(b7, "TANDAI_CAIR", opsiDasar);
  hasilSkenario.push(nilaiSkenarioCgtTest_("S07", "Aritmetika tunjangan rusak diblokir", r7, false, "ARITMETIKA_TUNJANGAN_TIDAK_KONSISTEN"));

  // 8) Batch sudah diteruskan: integritas snapshot lulus dan tidak dihitung ulang.
  // hitungUlangOverride sengaja dibuat berbeda. Tahap TANDAI_CAIR harus mengabaikannya.
  var recalcPalsu = hasilHitungUlangDariBatchCgtTest_(batchCair);
  recalcPalsu[0].rpTotal = recalcPalsu[0].rpTotal + 999999;
  var r8 = jalankanConsistencyGuardTunjangan_(cloneCgtTest_(batchCair), "TANDAI_CAIR", {
    modeSimulasi: true,
    token: "CGT_TEST_V01",
    pendingOverride: { count: 99, contoh: [] },
    hitungUlangOverride: recalcPalsu
  });
  hasilSkenario.push(nilaiSkenarioCgtTest_(
    "S08", "Tandai Cair memakai snapshot beku", r8, true, "",
    function (h) { return h.totalHitungUlang === null && h.delta === null && Number(h.pendingReviewCount) === 0; }
  ));

  var lulus = hasilSkenario.filter(function (s) { return s.lulus; }).length;
  var gagal = hasilSkenario.length - lulus;
  var result = {
    sukses: gagal === 0,
    valid: gagal === 0,
    versi: VALIDASI_CGT_V01_VERSION_,
    guardVersion: CONSISTENCY_GUARD_TUNJANGAN_VERSION_,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    mode: "SIMULASI_MEMORI_NON_DESTRUKTIF",
    jumlahSkenario: hasilSkenario.length,
    lulus: lulus,
    gagal: gagal,
    skenario: hasilSkenario,
    spreadsheetDibaca: false,
    spreadsheetDitulis: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    statusTunjanganDiubah: false,
    schemaDiubah: false,
    pesan: gagal === 0
      ? "Consistency Guard Tunjangan v0.1 lulus seluruh simulasi non-destruktif."
      : "Terdapat " + gagal + " skenario Consistency Guard yang belum sesuai."
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
