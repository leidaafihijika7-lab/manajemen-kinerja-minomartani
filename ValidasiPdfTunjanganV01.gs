// ============================================================
// VALIDASI PDF EXPORT RESMI TUNJANGAN v0.1
// Target aplikasi: APP_VERSION 2026.08.28.05
// READ-ONLY: hanya membaca source Index.html melalui HtmlService.
// Tidak membaca/menulis Spreadsheet/Drive/Properties dan tidak memanggil endpoint bisnis.
// ============================================================

var VALIDASI_PDF_TUNJANGAN_V01_VERSION_ = "PDF-TUNJ-v0.1-2026.08.28.05";

function validasiPdfTunjanganV01() {
  var source = "";
  var issues = [];
  try {
    source = HtmlService.createHtmlOutputFromFile("Index").getContent();
  } catch (err) {
    issues.push("INDEX_HTML_TIDAK_DAPAT_DIBACA: " + String(err && err.message ? err.message : err));
  }

  function ada_(marker) { return source.indexOf(marker) >= 0; }
  var fnStart = source.indexOf("function unduhPdfTunjangan()");
  var fnEnd = fnStart >= 0 ? source.indexOf("var daftarPegawaiPinState_", fnStart) : -1;
  var pdfSource = fnStart >= 0 && fnEnd > fnStart ? source.substring(fnStart, fnEnd) : "";

  var checks = [
    { id:"S01", nama:"Tombol Unduh PDF Resmi tersedia", valid:ada_('id="btnUnduhPdfTunjangan"') && ada_("unduhPdfTunjangan()") },
    { id:"S02", nama:"Generator PDF native tersedia", valid:ada_("function buatNativePdfTunjangan_") && ada_("function rangkaiPdfTunjangan_") },
    { id:"S03", nama:"MIME type PDF native digunakan", valid:ada_("application/pdf") },
    { id:"S04", nama:"Struktur PDF memiliki header, xref, trailer dan EOF", valid:ada_("%PDF-1.4") && ada_("xref\\n0 ") && ada_("trailer\\n<<") && ada_("%%EOF") },
    { id:"S05", nama:"Ukuran halaman A4 landscape ditetapkan", valid:ada_("841.89") && ada_("595.28") && ada_("/MediaBox") },
    { id:"S06", nama:"PDF tidak bergantung library eksternal atau window.print", valid:pdfSource && pdfSource.indexOf("window.print") < 0 && source.indexOf("jsPDF") < 0 && source.indexOf("pdfmake") < 0 },
    { id:"S07", nama:"Header identitas pemerintah dan judul rekap tersedia", valid:ada_("PEMERINTAH KABUPATEN SLEMAN") && ada_("KAPANEWON NGAGLIK") && ada_("KALURAHAN MINOMARTANI") && ada_("REKAP TUNJANGAN KINERJA PEGAWAI") },
    { id:"S08", nama:"Tabel mendukung multipage dan header berulang", valid:ada_("gambarHeaderTabelPdfTunjangan_") && ada_("gambarHeaderLanjutanPdfTunjangan_") && ada_("PDF_TUNJANGAN_FOOTER_TOP_") },
    { id:"S09", nama:"Total tunjangan dicetak pada baris total", valid:ada_("gambarTotalPdfTunjangan_") && ada_("TOTAL TUNJANGAN") },
    { id:"S10", nama:"Catatan workflow Carik/Lurah/Bendahara dibawa ke PDF", valid:ada_("Catatan Carik") && ada_("Catatan Lurah") && ada_("Catatan Bendahara") },
    { id:"S11", nama:"Metadata pencairan dan referensi bukti dibawa ke PDF", valid:ada_("Pencairan:") && ada_("No. / Referensi Bukti:") },
    { id:"S12", nama:"Footer nomor halaman tersedia", valid:ada_("Halaman ' + pageNo + ' dari ' + totalPages") && ada_("tambahFooterPdfTunjangan_") },
    { id:"S13", nama:"Nama file menggunakan ekstensi .pdf", valid:ada_("Rekap_Tunjangan_Kinerja_") && ada_(".pdf") && ada_("namaFilePdfTunjangan_") },
    { id:"S14", nama:"Font PDF memakai Helvetica/WinAnsi tanpa embed asset eksternal", valid:ada_("/BaseFont /Helvetica") && ada_("/BaseFont /Helvetica-Bold") && ada_("/WinAnsiEncoding") },
    { id:"S15", nama:"Download memakai Blob dan Object URL lokal", valid:ada_("new Blob([bytes], { type:'application/pdf' })") && ada_("URL.createObjectURL(blob)") },
    { id:"S16", nama:"Redaksi cut-off hasil audit tetap dipertahankan", valid:ada_("Poin Periode adalah poin dari laporan yang dikirim atau direvisi pegawai sebelum atau tepat pada waktu cut-off") },
    { id:"S17", nama:"PDF ikut dinonaktifkan saat loading periode", valid:ada_("'btnUnduhPdfTunjangan'") && ada_("TUNJANGAN_ACTION_BUTTON_IDS_") && ada_("sembunyikanAksiTunjanganSelamaLoading_") }
  ];

  checks.forEach(function (c) { if (!c.valid) issues.push(c.id + "_GAGAL: " + c.nama); });
  var lulus = checks.filter(function (c) { return c.valid; }).length;
  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: VALIDASI_PDF_TUNJANGAN_V01_VERSION_,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    mode: "STATIC_FRONTEND_READ_ONLY",
    jumlahSkenario: checks.length,
    lulus: lulus,
    gagal: checks.length - lulus,
    skenario: checks,
    issues: issues,
    spreadsheetDibaca: false,
    spreadsheetDitulis: false,
    driveDibaca: false,
    driveDitulis: false,
    propertiesDibaca: false,
    propertiesDitulis: false,
    dataDiubah: false,
    poinDiubah: false,
    statusReviewDiubah: false,
    statusTunjanganDiubah: false,
    schemaDiubah: false,
    pesan: issues.length ? "PDF Export Resmi v0.1 belum lengkap." : "PDF Export Resmi Tunjangan v0.1 terpasang lengkap pada Index.html."
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
