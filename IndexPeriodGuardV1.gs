/**
 * Official period immutability guard. Does not mutate Rekap_Kinerja.
 * Never derive a replacement for an existing Index_Laporan identity.
 */
function ipgNormalizePeriodV1_(value) {
  var s=normalisasiPeriodeIndexLaporan2B0_(value);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new Error('PERIODE_RESMI_INVALID:' + s);
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

/* Integrasi: wrap legacy implementation, never replace source records. */
var ipgOriginalBuildRowV1_=buatBarisIndexLaporan2B0_;
buatBarisIndexLaporan2B0_=function(sourceRow,rowNumber){
  var expected=ipgOriginalBuildRowV1_(sourceRow,rowNumber);
  // An individual sync must verify the existing identity before overwriting.
  // A rebuild calls auditRekapKinerjaUntukIndex_ which validates the whole snapshot.
  if(ipgInsideAuditV1_)return expected;
  var sh=getSS_().getSheetByName(INDEX_LAPORAN_2B0_CONFIG.SHEET_NAME);
  if(!sh)throw new Error('INDEX_BASELINE_MISSING');
  var M=getIndexLaporanColumnMap2B0_();
  if(rowNumber<=sh.getLastRow()){
    var previous=sh.getRange(rowNumber,1,1,INDEX_LAPORAN_2B0_CONFIG.HEADERS.length).getValues()[0];
    return ipgPreservePeriodV1_(expected,previous);
  }
  if(rowNumber!==sh.getLastRow()+1)throw new Error('INDEX_APPEND_GAP');
  expected[M.PERIODE_RESMI]=ipgNormalizePeriodV1_(expected[M.PERIODE_RESMI]);
  return expected;
};
var ipgInsideAuditV1_=false;
var ipgOriginalAuditV1_=auditRekapKinerjaUntukIndex_;
auditRekapKinerjaUntukIndex_=function(){
  if(ipgInsideAuditV1_)throw new Error('INDEX_AUDIT_REENTRANT');
  ipgInsideAuditV1_=true;
  try{
    var report=ipgOriginalAuditV1_();
    // Rebuild on an absent baseline is prohibited, except through a separately
    // authorized initialization/recovery procedure.
    var protection=ipgProtectSnapshotV1_(report.expectedRows);
    if(protection.missingIndex)throw new Error('INDEX_BASELINE_MISSING');
    report.checksumSumber=checksumRowsIndexLaporan2B0_(report.expectedRows);
    report.periodeTerjaga=protection;
    return report;
  } finally {ipgInsideAuditV1_=false;}
};
var ipgOriginalHealthV1_=cekKesehatanRinganReadRiwayatIndex2B2A_;
cekKesehatanRinganReadRiwayatIndex2B2A_=function(){
  var out={valid:false,dualWriteAktif:dualWriteIndexLaporanAktif2B1_(),sourceRows:0,
    indexRows:0,headerValid:false,queue:{},alasan:'',mode:'LIGHTWEIGHT_INDEPENDENT'};
  try {
    var ss=getSS_(),source=ss.getSheetByName('Rekap_Kinerja'),
      index=ss.getSheetByName(INDEX_LAPORAN_2B0_CONFIG.SHEET_NAME);
    if(!source||!index){out.alasan='SHEET_TIDAK_TERSEDIA';return out;}
    out.sourceRows=Math.max(0,source.getLastRow()-1);
    out.indexRows=Math.max(0,index.getLastRow()-1);
    pastikanHeaderIndexLaporan2B1_(index);
    out.headerValid=true;
    out.queue=hitungStatusQueueIndexLaporan2B1_();
    if(out.sourceRows!==out.indexRows){out.alasan='JUMLAH_BARIS_TIDAK_SAMA';return out;}
    if(out.queue.pending||out.queue.gagal||out.queue.perluRebuild){out.alasan='QUEUE_TIDAK_BERSIH';return out;}
    var M=getIndexLaporanColumnMap2B0_(),C=SHEET_COLUMNS.REKAP_KINERJA;
    var probes=[2,Math.floor((out.sourceRows+1)/2)+1,out.sourceRows+1],seen=Object.create(null);
    for(var i=0;i<probes.length && out.sourceRows>0;i++){
      var row=probes[i];if(seen[row])continue;seen[row]=true;
      var src=source.getRange(row,C.ID_LAPORAN+1,1,2).getValues()[0],
        idx=index.getRange(row,1,1,INDEX_LAPORAN_2B0_CONFIG.HEADERS.length).getValues()[0];
      if(normalizeId_(src[0])!==normalizeId_(idx[M.ID_LAPORAN])||
         normalizeId_(src[1])!==normalizeId_(idx[M.ID_USER])||
         Number(idx[M.ROW_REKAP])!==row)throw new Error('INDEX_IDENTITY_MISMATCH_ROW_'+row);
      ipgNormalizePeriodV1_(idx[M.PERIODE_RESMI]);
      if(String(idx[M.INDEX_VERSION]||'')!==INDEX_LAPORAN_2B0_CONFIG.VERSION)
        throw new Error('INDEX_VERSION_INVALID_ROW_'+row);
    }
    out.valid=true;return out;
  }catch(e){out.alasan='HEALTH_ERROR:'+String(e.message||e);return out;}
};
