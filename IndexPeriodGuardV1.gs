/**
 * Official period immutability guard. Does not mutate Rekap_Kinerja.
 * Never derive a replacement for an existing Index_Laporan identity.
 */
function ipgNormalizePeriodV1_(value) {
  var s=normalisasiPeriodeIndexLaporan2B0_(value);
  if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new Error('PERIODE_RESMI_INVALID:' + s);
  return s;
}
function ipgAssertSameIdentityV1_(oldRow,newRow) {
  var M=getIndexLaporanColumnMap2B0_();
  var fields=['ID_LAPORAN','ROW_REKAP','ID_USER'];
  for(var k=0;k<fields.length;k++){
    var col=M[fields[k]], a=String(oldRow[col]===null?'':oldRow[col]).trim(),b=String(newRow[col]===null?'':newRow[col]).trim();
    if(a!==b) throw new Error('INDEX_IDENTITY_CONFLICT:'+fields[k]+':'+b);
  }
}
function ipgPreservePeriodV1_(expected, existing) {
  var M=getIndexLaporanColumnMap2B0_();
  ipgAssertSameIdentityV1_(existing,expected);
  expected[M.PERIODE_RESMI]=ipgNormalizePeriodV1_(existing[M.PERIODE_RESMI]);
  return expected;
}
function ipgProtectSnapshotV1_(expectedRows) {
  var ss=getSS_(), sh=ss.getSheetByName(INDEX_LAPORAN_2B0_CONFIG.SHEET_NAME);
  if(!sh) return {preserved:0,newRows:expectedRows.length,missingIndex:true};
  pastikanHeaderIndexLaporan2B1_(sh);
  var M=getIndexLaporanColumnMap2B0_(),n=Math.max(0,sh.getLastRow()-1);
  var old=n?sh.getRange(2,1,n,INDEX_LAPORAN_2B0_CONFIG.HEADERS.length).getValues():[];
  if(old.length>expectedRows.length) throw new Error('INDEX_ORPHAN_ROWS');
  var seen=Object.create(null);
  for(var i=0;i<old.length;i++){
    var a=old[i],id=normalizeId_(a[M.ID_LAPORAN]),row=Number(a[M.ROW_REKAP]||0);
    if(!id||row!==i+2||seen[id]) throw new Error('INDEX_EXISTING_IDENTITY_INVALID:'+ (i+2));
    seen[id]=true;
    if(!expectedRows[i]) throw new Error('INDEX_ROW_MISSING_SOURCE:'+row);
    ipgPreservePeriodV1_(expectedRows[i],a);
  }
  // A short index may mean legitimate new append(s) or lost historical rows.
  // Fail closed unless only the latest appended rows are absent.
  return {preserved:old.length,newRows:expectedRows.length-old.length,missingIndex:false};
}
function ipgCheckHealthV1_(source,index,queue) {
  var o={valid:false,alasan:'',sourceRows:source.length,indexRows:index.length,headerValid:true,queue:queue||{}};
  if(source.length!==index.length){o.alasan='JUMLAH_BARIS_TIDAK_SAMA';return o;}
  var M=getIndexLaporanColumnMap2B0_(),C=SHEET_COLUMNS.REKAP_KINERJA,seen=Object.create(null);
  for(var i=0;i<index.length;i++){
    var r=index[i]||[],s=source[i]||[],id=normalizeId_(r[M.ID_LAPORAN]);
    if(!id||seen[id]||Number(r[M.ROW_REKAP])!==i+2||id!==normalizeId_(s[C.ID_LAPORAN])||normalizeId_(r[M.ID_USER])!==normalizeId_(s[C.ID_USER])){
      o.alasan='INDEX_IDENTITY_MISMATCH';o.rowIndex=i+2;return o;
    }
    seen[id]=true;
    try{ipgNormalizePeriodV1_(r[M.PERIODE_RESMI]);}catch(e){o.alasan='PERIODE_RESMI_INVALID';o.rowIndex=i+2;return o;}
    if(String(r[M.INDEX_VERSION]||'')!==INDEX_LAPORAN_2B0_CONFIG.VERSION){o.alasan='INDEX_VERSION_INVALID';o.rowIndex=i+2;return o;}
  }
  if(o.queue.pending||o.queue.gagal||o.queue.perluRebuild){o.alasan='QUEUE_TIDAK_BERSIH';return o;}
  o.valid=true;return o;
}
function validasiSkenarioProteksiPeriodeV1() {
  // Pure synthetic tests: no Sheets, Properties or production mutations.
  pastikanPemilikDatabaseIndexLaporan2B0_();
  var M=getIndexLaporanColumnMap2B0_(),cases=[];
  function check(name,fn){try{fn();cases.push({nama:name,lulus:true});}catch(e){cases.push({nama:name,lulus:false,pesan:String(e.message||e)});}}
  function expectThrow(fn){var threw=false;try{fn();}catch(e){threw=true;}if(!threw)throw new Error('GUARD_DID_NOT_BLOCK');}
  function row(id,n,user,period){var x=new Array(12).fill('');x[M.ID_LAPORAN]=id;x[M.ROW_REKAP]=n;x[M.ID_USER]=user;x[M.PERIODE_RESMI]=period;x[M.INDEX_VERSION]=INDEX_LAPORAN_2B0_CONFIG.VERSION;return x;}
  check('existing_period_preserved',function(){var x=ipgPreservePeriodV1_(row('L1',2,'U1','2026-07'),row('L1',2,'U1','2026-06'));if(x[M.PERIODE_RESMI]!=='2026-06')throw new Error('CHANGED');});
  check('identity_mismatch_blocked',function(){expectThrow(function(){ipgPreservePeriodV1_(row('L2',2,'U1','2026-07'),row('L1',2,'U1','2026-06'));});});
  check('bad_period_blocked',function(){expectThrow(function(){ipgPreservePeriodV1_(row('L1',2,'U1','2026-07'),row('L1',2,'U1','garbled'));});});
  check('health_clean_without_dual_write',function(){var s=[[]];s[0][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]='L1';s[0][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]='U1';if(!ipgCheckHealthV1_(s,[row('L1',2,'U1','2026-06')],{}).valid)throw new Error('FALSE_NEGATIVE');});
  check('missing_row_detected',function(){if(ipgCheckHealthV1_([[]],[],{}).valid)throw new Error('FALSE_POSITIVE');});
  check('pending_queue_detected',function(){var s=[[]];s[0][SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]='L1';s[0][SHEET_COLUMNS.REKAP_KINERJA.ID_USER]='U1';if(ipgCheckHealthV1_(s,[row('L1',2,'U1','2026-06')],{pending:1}).valid)throw new Error('FALSE_POSITIVE');});
  return {sukses:cases.every(function(x){return x.lulus;}),jumlahKasus:cases.length,cases:cases,mode:'SYNTHETIC_READ_ONLY'};
}
