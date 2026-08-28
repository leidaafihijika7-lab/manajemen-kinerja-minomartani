// ============================================================
// VALIDASI NATIVE XLSX TUNJANGAN v0.1
// Target aplikasi: APP_VERSION 2026.08.28.04
// READ-ONLY: hanya membaca source Index.html melalui HtmlService.
// Tidak membaca/menulis Spreadsheet/Properties dan tidak memanggil endpoint bisnis.
// ============================================================

var VALIDASI_NATIVE_XLSX_TUNJANGAN_V01_VERSION_ = "XLSX-TUNJ-v0.1-2026.08.28.04";

function validasiNativeXlsxTunjanganV01() {
  var source = "";
  var issues = [];
  try {
    source = HtmlService.createHtmlOutputFromFile("Index").getContent();
  } catch (err) {
    issues.push("INDEX_HTML_TIDAK_DAPAT_DIBACA: " + String(err && err.message ? err.message : err));
  }

  function ada_(marker) { return source.indexOf(marker) >= 0; }
  var fnStart = source.indexOf("function unduhExcelTunjangan()");
  var fnEnd = fnStart >= 0 ? source.indexOf("var daftarPegawaiPinState_", fnStart) : -1;
  var exportSource = fnStart >= 0 && fnEnd > fnStart ? source.substring(fnStart, fnEnd) : "";

  var checks = [
    { id:"S01", nama:"Tombol export menegaskan format .xlsx", valid:ada_("Unduh Excel (.xlsx)") },
    { id:"S02", nama:"Generator OOXML native tersedia", valid:ada_("function buatNativeXlsxTunjangan_") && ada_("function bangunSheetRekapTunjanganXlsx_") },
    { id:"S03", nama:"MIME type XLSX native digunakan", valid:ada_("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") },
    { id:"S04", nama:"ZIP container XLSX dibangun lokal", valid:ada_("function zipStoreXlsxTunjangan_") && ada_("0x04034b50") && ada_("0x02014b50") && ada_("0x06054b50") },
    { id:"S05", nama:"Paket OOXML memiliki workbook, worksheet, styles dan relationships", valid:ada_("[Content_Types].xml") && ada_("xl/workbook.xml") && ada_("xl/worksheets/sheet1.xml") && ada_("xl/styles.xml") && ada_("xl/_rels/workbook.xml.rels") },
    { id:"S06", nama:"Nominal rupiah tersimpan sebagai angka native", valid:ada_("[$Rp-421] #,##0") && ada_("cellNumXlsxTunjangan_('F' + r, angkaTunjangan_(row.rpTotal), 8)") },
    { id:"S07", nama:"Total tunjangan memakai formula Excel native", valid:ada_("cellFormulaXlsxTunjangan_") && ada_("'SUM(F' + firstDataRow + ':F' + lastDataRow + ')'") },
    { id:"S08", nama:"Jabatan dan capaian memakai wrap text dan tinggi baris adaptif", valid:ada_("wrapText=\"1\"") && ada_("function estimasiTinggiBarisTunjanganXlsx_") },
    { id:"S09", nama:"Print area dan page setup landscape tersedia", valid:ada_("_xlnm.Print_Area") && ada_("orientation=\"landscape\"") && ada_("fitToWidth=\"1\"") },
    { id:"S10", nama:"Freeze pane dan autofilter tersedia", valid:ada_("state=\"frozen\"") && ada_("<autoFilter ref=\"") },
    { id:"S11", nama:"Metadata pencairan dan catatan tetap dibawa ke workbook", valid:ada_("Tanggal Pencairan:") && ada_("No. / Referensi Bukti:") && ada_("Catatan Bendahara:") },
    { id:"S12", nama:"Redaksi cut-off hasil audit tetap dipertahankan", valid:ada_("Poin Periode adalah poin dari laporan yang dikirim atau direvisi pegawai sebelum atau tepat pada waktu cut-off") },
    { id:"S13", nama:"Exporter Tunjangan lama HTML .xls sudah tidak digunakan", valid:exportSource && exportSource.indexOf("application/vnd.ms-excel") < 0 && exportSource.indexOf("tableHTML") < 0 },
    { id:"S14", nama:"Tidak bergantung pada library XLSX eksternal", valid:!ada_("SheetJS") && !ada_("XLSX.write") && !ada_("cdn.sheetjs") }
  ];

  checks.forEach(function (c) { if (!c.valid) issues.push(c.id + "_GAGAL: " + c.nama); });
  var lulus = checks.filter(function (c) { return c.valid; }).length;
  var result = {
    sukses: issues.length === 0,
    valid: issues.length === 0,
    versi: VALIDASI_NATIVE_XLSX_TUNJANGAN_V01_VERSION_,
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
    pesan: issues.length ? "Native XLSX Export v0.1 belum lengkap." : "Native XLSX Export v0.1 terpasang lengkap pada Index.html."
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
