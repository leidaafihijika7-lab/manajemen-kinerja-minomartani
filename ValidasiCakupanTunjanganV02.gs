// Tes integrasi cakupan, data sintetis di memori. Tidak membaca/menulis spreadsheet atau properties.
// Jalankan validasiCakupanTunjanganV02() dari editor untuk memeriksa helper aktif sebenarnya.
function validasiCakupanTunjanganV02() {
  var C = SHEET_COLUMNS.REKAP_KINERJA, P = SHEET_COLUMNS.DATA_PEGAWAI;
  var hasil = [];
  var window = buildDateRangeMeta_('2026-09', '2026-08-28', '2026-09-25', '16:00:00');
  function peg(id, jabatan) { var r = new Array(11).fill(''); r[P.ID] = id; r[P.NAMA] = 'Pegawai Simulasi ' + id; r[P.JABATAN] = jabatan; r[P.STATUS] = 'Aktif'; return r; }
  function lap(id, jabatan, tanggal, status, poin) {
    var r = new Array(71).fill(''); r[C.ID_USER] = id; r[C.ID_LAPORAN] = 'LAP-' + id + '-' + tanggal;
    r[C.NAMA] = 'Pegawai Simulasi ' + id; r[C.JABATAN] = jabatan;
    r[C.TANGGAL_LAPORAN] = tanggal; r[C.TANGGAL_KEGIATAN] = '2026-09-01';
    r[C.KATEGORI] = jabatan === 'Staf PHL' ? 'Laporan Harian PHL' : 'Laporan Produktifitas - Melaksanakan Tugas Unit Kerja';
    r[C.STATUS_REVIEW] = status || 'Menunggu Review'; r[C.POIN_FINAL] = poin || 0; return r;
  }
  var ctx = mapPegawaiTunjanganCgtV02_([[], peg('PHL', 'Staf PHL'), peg('STAF', 'Staf Jagabaya')]);
  function policy() { return { tanpaImbalan: false }; }
  function scan(rows, fn) { return filterPendingTunjanganCgtV02_([[]].concat(rows), ctx, window, fn || policy); }
  function check(name, fn) { try { if (!fn()) throw new Error('Hasil tidak sesuai'); hasil.push({nama:name,lulus:true}); } catch(e) { hasil.push({nama:name,lulus:false,pesan:String(e.message||e)}); } }
  function throws(fn, code) { try { fn(); return false; } catch(e) { return String(e.message||e).indexOf(code) !== -1; } }
  var ordinary = lap('STAF','Staf Jagabaya','2026-09-01 10:00:00');
  var phls = [];
  for (var i=0;i<26;i++) { var r=lap('PHL','Staf PHL','2026-09-01 10:00:00');r[C.ID_LAPORAN]='PHL-SIM-'+i;phls.push(r); }
  check('26 PHL tidak memblokir; 26 tetap tercatat',function(){var x=scan(phls);return x.count===0&&x.ignoredPhlCount===26&&x.rawPendingCount===26&&x.items.length===26;});
  check('Laporan relevan dengan poin 0 tetap memblokir',function(){return scan([ordinary]).count===1;});
  check('Campuran PHL dan relevan dipisahkan',function(){var x=scan(phls.concat([ordinary]));return x.count===1&&x.ignoredPhlCount===26;});
  check('Banding tetap pending',function(){var r=ordinary.slice();r[C.STATUS_REVIEW]='Banding';return scan([r]).count===1;});
  check('Menunggu Persetujuan Lurah tetap pending',function(){var r=ordinary.slice();r[C.STATUS_REVIEW]='Menunggu Persetujuan Lurah';return scan([r]).count===1;});
  check('Ditolak bukan pending',function(){var r=ordinary.slice();r[C.STATUS_REVIEW]='Ditolak';return scan([r]).count===0;});
  check('Disetujui bukan pending',function(){var r=ordinary.slice();r[C.STATUS_REVIEW]='Disetujui';return scan([r]).count===0;});
  check('Identitas historis tanpa master tidak tersembunyi',function(){return scan([lap('HIST','Staf Jagabaya','2026-09-02 10:00:00')]).count===1;});
  check('Identitas lengkap master dapat dipakai',function(){var r=ordinary.slice();r[C.NAMA]='';r[C.JABATAN]='';return scan([r]).count===1;});
  check('Sebelum awal rentang tidak dihitung',function(){return scan([lap('STAF','Staf Jagabaya','2026-08-27 23:59:59')]).count===0;});
  check('Awal rentang dihitung',function(){return scan([lap('STAF','Staf Jagabaya','2026-08-28 00:00:00')]).count===1;});
  check('Detik cutoff tetap dihitung',function(){return scan([lap('STAF','Staf Jagabaya','2026-09-25 16:00:00')]).count===1;});
  check('Milidetik terakhir cutoff tetap dihitung',function(){return scan([lap('STAF','Staf Jagabaya',new Date(2026,8,25,16,0,0,999))]).count===1;});
  check('Satu detik sesudah cutoff tidak dihitung',function(){return scan([lap('STAF','Staf Jagabaya','2026-09-25 16:00:01')]).count===0;});
  check('ID pegawai kosong menghentikan pemeriksaan',function(){var r=ordinary.slice();r[C.ID_USER]='';return throws(function(){scan([r]);},'IDENTITAS_PENDING');});
  check('ID laporan kosong menghentikan pemeriksaan',function(){var r=ordinary.slice();r[C.ID_LAPORAN]='';return throws(function(){scan([r]);},'ID_LAPORAN_PENDING_KOSONG');});
  check('ID laporan pending duplikat terdeteksi',function(){return throws(function(){scan([ordinary,ordinary]);},'DUPLIKAT');});
  check('ID master duplikat terdeteksi',function(){return throws(function(){mapPegawaiTunjanganCgtV02_([[],peg('A','Staf PHL'),peg('A','Staf PHL')]);},'DUPLIKAT');});
  check('Tanggal rusak bukan hasil aman 0',function(){var r=ordinary.slice();r[C.TANGGAL_LAPORAN]='bukan tanggal';return throws(function(){scan([r]);},'TANGGAL_PENDING');});
  check('Tanggal rollover seperti 31 Februari ditolak',function(){var r=ordinary.slice();r[C.TANGGAL_LAPORAN]='31/02/2026 10:00:00';return throws(function(){scan([r]);},'TANGGAL_PENDING');});
  check('Konflik PHL dan non-PHL dihentikan',function(){return throws(function(){scan([lap('PHL','Staf Jagabaya','2026-09-01 10:00:00')]);},'KLASIFIKASI_PHL_BERUBAH');});
  check('Resolver gagal tidak menjadi 0 penghambat',function(){return throws(function(){scan([ordinary],function(){return {tanpaImbalan:false,alasan:'EVALUASI_GAGAL: tes'};});},'EVALUASI_CUTOFF');});
  check('Tanpa imbalan cutoff dicatat terpisah',function(){var x=scan([ordinary],function(){return {tanpaImbalan:true};});return x.count===0&&x.ignoredLateCount===1;});
  check('Paginasi dibatasi dan lengkap',function(){var x=scan(phls),a=halamanDiagnostikCgtV02_(x.items,{limit:20}),b=halamanDiagnostikCgtV02_(x.items,{offset:20,limit:20,expectedFingerprint:a.fingerprint});return a.items.length===20&&b.items.length===6&&b.hasMore===false;});
  check('Fingerprint halaman mendeteksi perubahan',function(){return throws(function(){halamanDiagnostikCgtV02_([],{expectedFingerprint:'berubah'});},'DAFTAR_BERUBAH');});
  check('Limit tak valid ditolak',function(){return throws(function(){halamanDiagnostikCgtV02_([],{limit:1000});},'PAGINASI');});
  check('Pemeriksaan tidak memutasi data input',function(){var input=phls.concat([ordinary]);var before=JSON.stringify(input);scan(input);return JSON.stringify(input)===before;});
  var gagal=hasil.filter(function(x){return !x.lulus;}).length;
  var out={sukses:gagal===0,valid:gagal===0,versi:CAKUPAN_TUNJANGAN_CGT_V02_VERSION_,jumlahSkenario:hasil.length,lulus:hasil.length-gagal,gagal:gagal,skenario:hasil,
    mode:'SIMULASI_MEMORI',spreadsheetDibaca:false,spreadsheetDitulis:false,dataDiubah:false};
  Logger.log(JSON.stringify(out,null,2));return out;
}
