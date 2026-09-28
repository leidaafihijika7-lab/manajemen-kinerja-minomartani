// Pengujian tarif dalam memori. Tidak membaca/menulis spreadsheet/cache/properties.
function fixtureMasterTarifV03_() {
  return [
    ['Jabatan', 'Jumlah Total Tunjangan Kinerja', 'Plafon Tunjangan Produktifitas', 'Plafon Tunjangan Tugas Umum'],
    ['Lurah', 1282500, 513000, 256500], ['Carik', 990000, 396000, 198000],
    ['Jagabaya', 900000, 360000, 180000], ['Ulu-Ulu', 900000, 360000, 180000], ['Kamituwa', 900000, 360000, 180000],
    ['Kepala Urusan Pangripta', 900000, 360000, 180000], ['Kepala Urusan Danarta', 900000, 360000, 180000],
    ['Kepala Urusan Tata Laksana', 900000, 360000, 180000],
    ['Dukuh Gantalan', 870000, 348000, 174000], ['Dukuh Plosokuning II', 870000, 348000, 174000],
    ['Dukuh Plosokuning III', 870000, 348000, 174000], ['Dukuh Plosokuning IV', 870000, 348000, 174000],
    ['Dukuh Plosokuning V', 870000, 348000, 174000], ['Dukuh Mlandangan', 870000, 348000, 174000],
    ['Staf Kamituwa', 696000, 278400, 139200], ['Staf Jagabaya', 696000, 278400, 139200],
    ['Staf Ulu-Ulu', 696000, 278400, 139200], ['Staf Kepala Urusan Tata Laksana', 696000, 278400, 139200],
    ['Staf Kepala Urusan Pangripta', 696000, 278400, 139200]
  ];
}

function validasiTarifTunjanganV03() {
  var scenarios = [], raw = fixtureMasterTarifV03_();
  var master = bangunMasterTarifV03_(raw, 'TEST_ONLY');
  function run(name, fn) {
    try { fn(); scenarios.push({nama: name, lulus: true}); }
    catch (e) { scenarios.push({nama: name, lulus: false, pesan: String(e.message || e)}); }
  }
  function check(ok, message) { if (!ok) throw new Error(message || 'Tidak sesuai'); }
  function throws(fn, code) {
    var found = false;
    try { fn(); } catch (e) { found = String(e.message || e).indexOf(code) >= 0; }
    check(found, 'Harus menolak dengan ' + code);
  }
  function rate(m, job, prod, umum) {
    var r = resolveTarifDariMasterV03_(m, job);
    check(r.maxProd === prod && r.maxTU === umum, 'Tarif tidak cocok: ' + job);
  }
  raw.slice(1).forEach(function (row) {
    run('Tarif tepat: ' + row[0], function () { rate(master, row[0], row[2], row[3]); });
  });
  run('Alias Ka.Ur. tidak bercampur staf', function () { rate(master, 'Ka.Ur. Pangripta', 360000, 180000); rate(master, 'Staf Ka.Ur. Pangripta', 278400, 139200); });
  run('Alias Tata Laksana dan Danarta', function () { rate(master, 'tata laksana', 360000, 180000); rate(master, 'danarta', 360000, 180000); });
  run('Kapital, spasi, NBSP', function () { rate(master, '  STAF\u00a0 KAUR   TATA LAKSANA  ', 278400, 139200); });
  run('Alias Ulu-Ulu tetap terpisah staf', function () { rate(master, 'Ulu Ulu', 360000, 180000); rate(master, 'Staf Ulu Ulu', 278400, 139200); });
  run('Staf Danarta tanpa master tidak mengambil Kaur', function () { throws(function () { resolveTarifDariMasterV03_(master, 'Staf Kaur Danarta'); }, 'TARIF_JABATAN_TIDAK_DITEMUKAN'); });
  run('Jabatan kosong tidak mengambil baris pertama', function () { throws(function () { resolveTarifDariMasterV03_(master, ''); }, 'TARIF_JABATAN_KOSONG'); });
  run('Jabatan tidak dikenal tidak memakai fuzzy', function () { ['Dukuh', 'Staf', 'Kepala Urusan', 'Kepala Urusan Pangripta Tambahan'].forEach(function (job) { throws(function () { resolveTarifDariMasterV03_(master, job); }, 'TARIF_JABATAN_TIDAK_DITEMUKAN'); }); });
  run('PHL eksplisit dikecualikan', function () { check(resolveTarifDariMasterV03_(master, 'Staf PHL').excludedPHL === true); });
  run('Urutan baris terbalik identik', function () { var m = bangunMasterTarifV03_([raw[0]].concat(raw.slice(1).reverse()), 'TEST_ONLY'); raw.slice(1).forEach(function (row) { rate(m, row[0], row[2], row[3]); }); });
  run('100 urutan acak deterministik identik', function () {
    var seed = 99;
    for (var n = 0; n < 100; n++) {
      var data = raw.slice(1);
      for (var i = data.length - 1; i > 0; i--) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; var j = seed % (i + 1), temp = data[i]; data[i] = data[j]; data[j] = temp; }
      var m = bangunMasterTarifV03_([raw[0]].concat(data), 'TEST_ONLY');
      raw.slice(1).forEach(function (row) { rate(m, row[0], row[2], row[3]); });
    }
  });
  run('Nomor padukuhan II/III tidak berbenturan', function () { var m = bangunMasterTarifV03_([raw[0], ['Dukuh Plosokuning II', 100, 40, 20], ['Dukuh Plosokuning III', 200, 80, 40]], 'TEST'); rate(m, 'Dukuh Plosokuning II', 40, 20); rate(m, 'Dukuh Plosokuning III', 80, 40); });
  run('Duplikat beda tarif diblokir pada kedua urutan', function () { var a = ['Kaur Pangripta', 800000, 320000, 160000], b = raw[6]; [[a,b],[b,a]].forEach(function (list) { throws(function () { bangunMasterTarifV03_([raw[0]].concat(list), 'TEST'); }, 'TARIF_ALIAS_KONFLIK'); }); });
  run('Duplikat identik tidak mengubah tarif', function () { rate(bangunMasterTarifV03_(raw.concat([raw[6].slice()]), 'TEST'), raw[6][0], 360000, 180000); });
  run('Header baris kedua dan kolom berpindah', function () { var m=bangunMasterTarifV03_([['Judul'],['Maks TU','Jabatan','Maks Produktivitas','Total Tunjangan'],[180000,'Kaur Pangripta',360000,900000]],'TEST');rate(m,'Kaur Pangripta',360000,180000); });
  run('Master kosong/header salah ditolak', function () { throws(function () { bangunMasterTarifV03_([], 'TEST'); }, 'TARIF_MASTER_KOSONG'); throws(function () { bangunMasterTarifV03_([['Salah'],['x']], 'TEST'); }, 'TARIF_HEADER'); });
  run('Nominal rusak bukan nol palsu', function () { ['Rp 360.000', '#REF!', -1, Infinity, true].forEach(function (bad) { throws(function () { bangunMasterTarifV03_([raw[0],['Kaur Pangripta',900000,bad,180000]],'TEST'); }, 'TARIF_ANGKA_TIDAK_VALID'); }); });
  run('Fallback plafon lama eksplisit dengan warning', function () { var m=bangunMasterTarifV03_([raw[0],['Kaur Pangripta',900000,'',180000]],'TEST');rate(m,'Kaur Pangripta',360000,180000);check(m.warnings.length===1); });
  run('Objek hasil tidak merusak cache master', function () { var r=resolveTarifDariMasterV03_(master,'Kaur Pangripta');r.maxProd=1;rate(master,'Kaur Pangripta',360000,180000); });
  var lulus = scenarios.filter(function (x) { return x.lulus; }).length;
  var result = { sukses: lulus === scenarios.length, versi: TARIF_TUNJANGAN_V03_VERSION_, jumlah: scenarios.length,
    lulus: lulus, gagal: scenarios.length - lulus, skenario: scenarios, dataDiubah: false };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
