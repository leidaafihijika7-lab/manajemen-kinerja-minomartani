'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');

// Targeted source-copy regression of the RC7 nonce-transition helper and
// rc7WriteIndexLocked_ as committed on feat/pha07b2-rc82-revision-index-fix.
const targetSource = String.raw`
function rc7AllowOwnerRevisionNonceChange_(source, priorIndexRow, context, M) {
  if (rc7Text_(context)!=='REVISI_PEGAWAI' || !source || !source.triple ||
      !Array.isArray(source.row) || !priorIndexRow) return false;
  var C=SHEET_COLUMNS.REKAP_KINERJA,oldNonce=rc7Text_(priorIndexRow[M.NONCE]),
      newNonce=rc7Text_(source.triple.nonce);
  if (!oldNonce || !newNonce || oldNonce===newNonce) return false;
  if (rc7Id_(priorIndexRow[M.ID_LAPORAN])!==source.triple.idLaporan ||
      rc7Id_(priorIndexRow[M.ID_USER])!==source.triple.idUser ||
      rc7Number_(priorIndexRow[M.ROW_REKAP])!==source.rowRekap) return false;
  if (rc7Text_(priorIndexRow[M.STATUS_REVIEW])!==REVIEW_STATUS.DITOLAK ||
      rc7Text_(source.row[C.STATUS_REVIEW])!==REVIEW_STATUS.MENUNGGU) return false;
  var revision=Number(source.row[C.REVISI_KE]),
      changedAt=source.row[C.TERAKHIR_DIREVISI_PADA],
      changedBy=rc7Text_(source.row[C.TERAKHIR_DIREVISI_OLEH]);
  if (!Number.isSafeInteger(revision) || revision<1 ||
      !(changedAt instanceof Date) || isNaN(changedAt.getTime())) return false;
  if (changedBy.indexOf(source.triple.idUser+' - ')!==0) return false;
  return true;
}
function rc7WriteIndexLocked_(ss, source, context) {
  var sourceIdentities=rc7SourceUnique_(ss,source);
  var sh=rc7IndexSheet_(ss), M=getIndexLaporanColumnMap2B0_();
  rc7WithinBounds_(sh);
  var lastRow=sh.getLastRow(), width=INDEX_LAPORAN_2B0_CONFIG.HEADERS.length;
  var records=lastRow>1?sh.getRange(2,1,lastRow-1,width).getValues():[];
  var usedIds={}, usedRows={}, existing=0;
  for (var i=0;i<records.length;i++) {
    var r=records[i], id=rc7Id_(r[M.ID_LAPORAN]), row=rc7Number_(r[M.ROW_REKAP]);
    if (!id || !Number.isSafeInteger(row) || row !== i+2 || usedIds[id] || usedRows[row])
      throw new Error('RC7_INDEX_DUPLICATE_OR_ROW_GAP');
    usedIds[id]=true; usedRows[row]=true;
    if (row>sourceIdentities.length+1) throw new Error('RC7_INDEX_ORPHAN');
    var actual=sourceIdentities[row-2];
    var fromIndex={idLaporan:id,idUser:rc7Id_(r[M.ID_USER]),nonce:rc7Text_(r[M.NONCE])};
    if (!rc7Equal_(actual,fromIndex) &&
        !(row===source.rowRekap &&
          rc7AllowOwnerRevisionNonceChange_(source,r,context,M)))
      throw new Error('RC7_INDEX_GLOBAL_PROVENANCE_MISMATCH');
    if (id===source.triple.idLaporan) existing=row;
  }
  if (existing && existing!==source.rowRekap) throw new Error('RC7_INDEX_POSITION_CHANGED');
  if (!existing && source.rowRekap!==lastRow+1)
    throw new Error('RC7_INDEX_NON_TRAILING_APPEND_BLOCKED');
  var targetRow=existing || source.rowRekap;
  var expected=buatBarisIndexLaporan2B0_(source.row,source.rowRekap);
  if (expected.length!==width) throw new Error('RC7_PROJECTION_SCHEMA_MISMATCH');
  if (existing && barisIndexSama2B0_(expected,records[existing-2]))
    return {rowIndex:targetRow,indexWritten:false};
  formatSatuBarisIndexLaporan2B1_(sh,targetRow);
  sh.getRange(targetRow,1,1,width).setValues([expected]);
  SpreadsheetApp.flush();
  var after=sh.getRange(targetRow,1,1,width).getValues()[0];
  if (!barisIndexSama2B0_(expected,after)) throw new Error('RC7_INDEX_READBACK_MISMATCH');
  updateMetadataDualWriteIndexLaporan2B1_(context,source.rowRekap);
  return {rowIndex:targetRow,indexWritten:true};
}
`;
const M={ID_LAPORAN:0,ROW_REKAP:1,ID_USER:2,TANGGAL_LAPORAN:3,PERIODE_RESMI:4,
 KATEGORI:5,STATUS_REVIEW:6,POIN_FINAL:7,ID_DISPOSISI:8,NONCE:9,TERAKHIR_DIUBAH:10,INDEX_VERSION:11};
const C={STATUS_REVIEW:8,ID_LAPORAN:18,ID_USER:19,NONCE:21,REVISI_KE:22,TERAKHIR_DIREVISI_PADA:23,TERAKHIR_DIREVISI_OLEH:24};
function fixture(){
 const row=Array(71).fill('');row[C.STATUS_REVIEW]='Menunggu Review';row[C.ID_LAPORAN]='RPT-OWNER';row[C.ID_USER]='USR-OWNER';
 row[C.NONCE]='NONCE-NEW';row[C.REVISI_KE]=1;row[C.TERAKHIR_DIREVISI_PADA]=new Date('2026-10-11T12:00:00Z');row[C.TERAKHIR_DIREVISI_OLEH]='USR-OWNER - Synthetic Owner';
 const source={rowRekap:4,row,triple:{idLaporan:'RPT-OWNER',idUser:'USR-OWNER',nonce:'NONCE-NEW'}};
 const old=['RPT-OWNER',4,'USR-OWNER','2026-10-11 19:00:00','2026-10','Category','Ditolak',0,'','NONCE-OLD',new Date('2026-10-11T11:00:00Z'),'v'];
 const preceding=[['RPT-1',2,'USR-1','','','Category','Disetujui',3,'','NONCE-1','','v'],['RPT-2',3,'USR-2','','','Category','Disetujui',3,'','NONCE-2','','v']];
 const records=[...preceding,old];
 return {source,records,precedingSource:preceding.map(r=>({idLaporan:r[0],idUser:r[2],nonce:r[9]}))};
}
function runtime(F,updateBefore=null){
 const sh={reads:0,writes:0,getLastRow:()=>F.records.length+1,getRange(row,col,n,w){return {
   getValues(){return F.records.slice(row-2,row-2+n).map(r=>r.slice(col-1,col-1+w));},
   setValues(values){sh.writes++; F.records[row-2]=values[0];}
 };}};
 const c={
   Date,Number,Array,isNaN,
   rc7Text_:x=>x==null?'':String(x).trim(),rc7Id_:x=>x==null?'':String(x).trim(),
   rc7Number_:x=>Number(x),
   rc7Equal_:(a,b)=>a.idLaporan===b.idLaporan&&a.idUser===b.idUser&&a.nonce===b.nonce,
   SHEET_COLUMNS:{REKAP_KINERJA:C},REVIEW_STATUS:{DITOLAK:'Ditolak',MENUNGGU:'Menunggu Review'},
   INDEX_LAPORAN_2B0_CONFIG:{HEADERS:Array(12).fill('h')},
   rc7SourceUnique_:()=>F.precedingSource.concat([F.source.triple]),
   rc7IndexSheet_:()=>sh,rc7WithinBounds_:()=>{},
   getIndexLaporanColumnMap2B0_:()=>M,
   buatBarisIndexLaporan2B0_:(row,rowNum)=>[F.source.triple.idLaporan,rowNum,F.source.triple.idUser,
     '2026-10-11 19:00:00','2026-10','Category',row[C.STATUS_REVIEW],2,'',row[C.NONCE],
      new Date('2026-10-11T12:00:00Z'),'v'],
   barisIndexSama2B0_:(x,y)=>x.every((v,i)=>String(v)===String(y[i])),
   formatSatuBarisIndexLaporan2B1_:()=>{},
   SpreadsheetApp:{flush:()=>{}},updateMetadataDualWriteIndexLaporan2B1_:()=>{c.metaWrites++;},metaWrites:0
 };
 vm.createContext(c);vm.runInContext(targetSource,c);
 return {c,sh};
}
const tests=[];
function test(label,fn){try{fn();tests.push({label,ok:true});}catch(e){tests.push({label,ok:false,error:String(e)});}}
function helperFixture(){const F=fixture();const rt=runtime(F);return {...F,...rt};}
function deny(f,reason){const F=fixture();const {c,sh}=runtime(F);f(F);assert.equal(c.rc7AllowOwnerRevisionNonceChange_(F.source,F.records[2],reason||'REVISI_PEGAWAI',M),false);assert.throws(()=>c.rc7WriteIndexLocked_(null,F.source,reason||'REVISI_PEGAWAI'),/RC7_INDEX_GLOBAL_PROVENANCE_MISMATCH/);assert.equal(sh.writes,0);}
test('valid owner revision changes nonce while preserving report and owner',()=>{const {c,source,records}=helperFixture();assert.equal(c.rc7AllowOwnerRevisionNonceChange_(source,records[2],'REVISI_PEGAWAI',M),true);});
test('legitimate rotation writes index exactly once',()=>{const F=fixture(),{c,sh}=runtime(F);const r=c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI');assert.equal(r.indexWritten,true);assert.equal(sh.writes,1);assert.equal(c.metaWrites,1);assert.equal(F.records[2][9],'NONCE-NEW');assert.equal(F.records[2][6],'Menunggu Review');assert.equal(F.records[2][7],2);});
test('readback check prevents duplicate index write',()=>{const F=fixture(),{c,sh}=runtime(F);c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI');const r=c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI');assert.equal(r.indexWritten,false);assert.equal(sh.writes,1);});
test('reject different context',()=>deny(F=>{},'REVIEW_ADMIN_FINAL'));
test('reject different existing report id',()=>deny(F=>{F.records[2][0]='RPT-IMPERSONATION';}));
test('reject different existing owner id',()=>deny(F=>{F.records[2][2]='USR-IMPERSONATION';}));
test('reject mismatched index position',()=>{const F=fixture(),{c,sh}=runtime(F);F.records[2][1]=5;assert.equal(c.rc7AllowOwnerRevisionNonceChange_(F.source,F.records[2],'REVISI_PEGAWAI',M),false);assert.throws(()=>c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI'),/RC7_INDEX_DUPLICATE_OR_ROW_GAP/);assert.equal(sh.writes,0);});
test('same nonce uses normal provenance path, no exception needed',()=>{const F=fixture(),{c,sh}=runtime(F);F.records[2][9]='NONCE-NEW';assert.equal(c.rc7AllowOwnerRevisionNonceChange_(F.source,F.records[2],'REVISI_PEGAWAI',M),false);const result=c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI');assert.equal(result.indexWritten,true);assert.equal(sh.writes,1);});
test('reject missing old nonce',()=>deny(F=>{F.records[2][9]='';}));
test('reject old status other than Ditolak',()=>deny(F=>{F.records[2][6]='Menunggu Review';}));
test('reject new source status other than Menunggu Review',()=>deny(F=>{F.source.row[C.STATUS_REVIEW]='Disetujui';}));
test('reject revision zero',()=>deny(F=>{F.source.row[C.REVISI_KE]=0;}));
test('reject revision invalid',()=>deny(F=>{F.source.row[C.REVISI_KE]='abc';}));
test('reject missing revision timestamp',()=>deny(F=>{F.source.row[C.TERAKHIR_DIREVISI_PADA]='';}));
test('reject invalid revision timestamp',()=>deny(F=>{F.source.row[C.TERAKHIR_DIREVISI_PADA]=new Date(NaN);}));
test('reject different revision actor',()=>deny(F=>{F.source.row[C.TERAKHIR_DIREVISI_OLEH]='USR-OTHER - User';}));
test('reject missing revision actor',()=>deny(F=>{F.source.row[C.TERAKHIR_DIREVISI_OLEH]='';}));
test('reject stale nonce for unrelated source row despite valid target',()=>{const F=fixture(),{c,sh}=runtime(F);F.records[0][9]='STALE-OTHER';assert.throws(()=>c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI'),/RC7_INDEX_GLOBAL_PROVENANCE_MISMATCH/);assert.equal(sh.writes,0);});
test('reject source owner different from index owner',()=>{const F=fixture(),{c,sh}=runtime(F);F.source.triple.idUser='USR-OTHER';assert.throws(()=>c.rc7WriteIndexLocked_(null,F.source,'REVISI_PEGAWAI'),/RC7_INDEX_GLOBAL_PROVENANCE_MISMATCH/);assert.equal(sh.writes,0);});
const failed=tests.filter(x=>!x.ok);console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',passed:tests.length-failed.length,total:tests.length,failed},null,2));if(failed.length)process.exit(1);