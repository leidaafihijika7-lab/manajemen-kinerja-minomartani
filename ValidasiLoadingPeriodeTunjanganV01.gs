// ============================================================
// VALIDASI LOADING PERIODE TUNJANGAN v0.1
// Target aplikasi: APP_VERSION 2026.08.28.07
// READ-ONLY: hanya membaca source Index.html melalui HtmlService.
// Tidak membaca/menulis Spreadsheet/Properties dan tidak memanggil endpoint bisnis.
// ============================================================

var VALIDASI_LOADING_PERIODE_TUNJANGAN_V01_VERSION_ = "LOAD-TUNJ-v0.1-2026.08.28.07";

function validasiLoadingPeriodeTunjanganV01() {
  var source = "";
  var issues = [];
  try {
    source = HtmlService.createHtmlOutputFromFile("Index").getContent();
  } catch (err) {
    issues.push("INDEX_HTML_TIDAK_DAPAT_DIBACA: " + String(err && err.message ? err.message : err));
  }

  function ada_(marker) {
    return source.indexOf(marker) >= 0;
  }
  function jumlah_(marker) {
    if (!marker) return 0;
    return source.split(marker).length - 1;
  }

  var checks = [
    { id:"S01", nama:"Perubahan periode memakai handler terpusat", valid:ada_('onchange="gantiPeriodeTunjanganUI_()"') },
    { id:"S02", nama:"Sequence request tersedia", valid:ada_("var tunjanganLoadSeq_ = 0;") && ada_("++tunjanganLoadSeq_") },
    { id:"S03", nama:"Payload lama dikosongkan saat loading", valid:ada_("tunjanganPayloadAktif = null;") && ada_("Data periode sebelumnya sementara disembunyikan") },
    { id:"S04", nama:"Guard request aktif memeriksa sequence dan periode", valid:ada_("function requestTunjanganMasihAktif_") && ada_("requestId === tunjanganLoadSeq_") && ada_("periodeTunjanganAktif()") },
    { id:"S05", nama:"Success handler mengabaikan respons lama", valid:jumlah_("if (!requestTunjanganMasihAktif_(requestId, periode))") >= 2 && ada_("Respons lama diabaikan") },
    { id:"S06", nama:"Failure handler mengabaikan error lama", valid:ada_("Error request lama diabaikan") },
    { id:"S07", nama:"Respons periode tidak cocok diblokir", valid:ada_("RESPONS_PERIODE_TIDAK_COCOK") && ada_("responsePeriode !== String(periode || '')") },
    { id:"S08", nama:"Aksi workflow disembunyikan selama loading", valid:ada_("TUNJANGAN_ACTION_BUTTON_IDS_") && ada_("sembunyikanAksiTunjanganSelamaLoading_") },
    { id:"S09", nama:"Input range/cut-off dikunci selama loading", valid:ada_("kunciInputTunjanganSelamaLoading_") && ada_("Menunggu data periode selesai dimuat.") },
    { id:"S10", nama:"Summary lama dikosongkan", valid:ada_("setTextTunjangan_('tunjanganTotalNominal', '—')") && ada_("setTextTunjangan_('tunjanganJumlahPegawai', '—')") },
    { id:"S11", nama:"UI mengumumkan status loading", valid:ada_("aria-busy") && ada_("tunjangan-loading-spin") && ada_("aria-live=\"polite\"") },
    { id:"S12", nama:"Error state tidak menampilkan data lama", valid:ada_("Data periode sebelumnya tidak ditampilkan.") && ada_("Gagal memuat data periode ini") }
  ];

  checks.forEach(function (c) {
    if (!c.valid) issues.push(c.id + "_GAGAL: " + c.nama);
  });

  var lulus = checks.filter(function (c) { return c.valid; }).length;
  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: VALIDASI_LOADING_PERIODE_TUNJANGAN_V01_VERSION_,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    mode: "STATIC_FRONTEND_READ_ONLY",
    jumlahSkenario: checks.length,
    lulus: lulus,
    gagal: checks.length - lulus,
    skenario: checks,
    issues: issues,
    spreadsheetDibaca: false,
    spreadsheetDitulis: false,
    propertiesDibaca: false,
    propertiesDitulis: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    statusTunjanganDiubah: false,
    schemaDiubah: false,
    pesan: issues.length ? "Hardening Loading Periode belum lengkap." : "Hardening Loading Periode v0.1 terpasang lengkap pada Index.html."
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
