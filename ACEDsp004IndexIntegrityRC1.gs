// ============================================================================
// ACE-DSP-004 | Index Integrity Hardening v1.0 RC1 | 2026-10-10
// Independent guard for existing 2B1 per-row sync. No sheet writes here.
// Integration in Kode.gs must call aceDsp004AssertIndexCollisionSafeRC1_
// AFTER target-row resolution and BEFORE index formatting / setValues.
// ============================================================================

var ACE_DSP004_INTEGRITY_RC1_VERSION_='ACE-DSP004-INDEX-GUARD-RC1-2026.10.10.01';

function aceDsp004NormalizeIdRC1_(value) {
  return value===null||value===undefined?'':String(value).trim().toLowerCase();
}
function aceDsp004IndexDecisionRC1_(input) {
  input=input||{};
  var row=Number(input.rowRekap),target=Number(input.targetRow),
      actual=aceDsp004NormalizeIdRC1_(input.sourceId),
      expected=aceDsp004NormalizeIdRC1_(input.expectedId),
      candidate=aceDsp004NormalizeIdRC1_(input.indexId),
      pointerRaw=input.indexRowRekap,
      pointer=pointerRaw===''||pointerRaw===null||pointerRaw===undefined?0:Number(pointerRaw),
      exists=input.targetExists===true,
      dirty=!!(input.indexOwnerPresent||input.indexDispositionPresent||
        input.indexOtherMetadataPresent);
  if(!Number.isInteger(row)||row<2||!Number.isInteger(target)||target<2)
    return {safe:false,reason:'INVALID_ROW_POINTER'};
  if(!actual||!expected||actual!==expected)
    return {safe:false,reason:'REKAP_ID_CHANGED_OR_EXPECTED_ID_MISMATCH'};
  if(!exists)return {safe:true,reason:'NEW_INDEX_ROW'};
  if(!Number.isInteger(pointer)||pointer<0)
    return {safe:false,reason:'INDEX_POINTER_INVALID'};
  if(candidate&&candidate!==expected)
    return {safe:false,reason:'FOREIGN_REPORT_ID_COLLISION'};
  if(pointer&&pointer!==row)
    return {safe:false,reason:'INDEX_POINTER_COLLISION'};
  if(!candidate&&(pointer||dirty))
    return {safe:false,reason:'OCCUPIED_INDEX_ROW_MISSING_ID'};
  if(candidate&&!pointer)
    return {safe:false,reason:'EXISTING_INDEX_POINTER_EMPTY'};
  return {safe:true,reason:candidate?'SAME_REPORT_ID':'EMPTY_INDEX_ROW'};
}

function aceDsp004AssertIndexCollisionSafeRC1_(shRekap,shIndex,rowRekap,targetRow,idLaporan,expected) {
  if(typeof SHEET_COLUMNS==='undefined'||!SHEET_COLUMNS.REKAP_KINERJA||
      !SHEET_COLUMNS.INDEX_LAPORAN)throw new Error('ACE_DSP004_GUARD_SCHEMA_MISSING');
  var R=SHEET_COLUMNS.REKAP_KINERJA,I=SHEET_COLUMNS.INDEX_LAPORAN,
      row=Number(rowRekap),target=Number(targetRow);
  if(!Array.isArray(expected)||!shRekap||!shIndex)
    throw new Error('ACE_DSP004_GUARD_INPUT_INVALID');
  if(!Number.isInteger(row)||row<2||row>shRekap.getLastRow()||
      !Number.isInteger(target)||target<2)
    throw new Error('ACE_DSP004_GUARD_SOURCE_ROW_INVALID');
  var source=shRekap.getRange(row,R.ID_LAPORAN+1).getValue();
  var expectedId=expected[I.ID_LAPORAN];
  // No silent edits and no per-person details in raised errors.
  var targetExists=target<=shIndex.getLastRow();
  var indexRow=null;
  if(targetExists){
    var max=Math.max(I.ID_LAPORAN,I.ROW_REKAP,I.ID_USER,I.ID_DISPOSISI,I.NONCE)+1;
    indexRow=shIndex.getRange(target,1,1,max).getValues()[0];
  }
  var decision=aceDsp004IndexDecisionRC1_({
    rowRekap:row,targetRow:target,
    sourceId:source,expectedId:expectedId,
    targetExists:targetExists,
    indexId:indexRow?indexRow[I.ID_LAPORAN]:'',
    indexRowRekap:indexRow?indexRow[I.ROW_REKAP]:'',
    indexOwnerPresent:!!(indexRow&&indexRow[I.ID_USER]),
    indexDispositionPresent:!!(indexRow&&indexRow[I.ID_DISPOSISI]),
    indexOtherMetadataPresent:!!(indexRow&&indexRow[I.NONCE])
  });
  if(!decision.safe)throw new Error('ACE_DSP004_INDEX_WRITE_BLOCKED_'+decision.reason);
  if(aceDsp004NormalizeIdRC1_(idLaporan)!==aceDsp004NormalizeIdRC1_(source))
    throw new Error('ACE_DSP004_GUARD_ARGUMENT_SOURCE_MISMATCH');
  if(Number(expected[I.ROW_REKAP])!==row)
    throw new Error('ACE_DSP004_GUARD_EXPECTED_ROW_POINTER_MISMATCH');
  return {
    allowed:true,reason:decision.reason,
    sourceRow:row,indexRow:target,
    checkedUnderExistingIndexSyncLock:true,readOnly:true
  };
}

function validasiPengamanIndexACEDsp004RC1() {
  var t=[];function check(n,pass){t.push({name:n,pass:pass===true});}
  var base={rowRekap:3958,targetRow:3958,
    sourceId:'new-report',expectedId:'new-report',targetExists:true,
    indexId:'new-report',indexRowRekap:3958,indexOwnerPresent:true};
  var dec=aceDsp004IndexDecisionRC1_;
  check('SAME_ID_ALLOWED',dec(base).safe);
  check('FOREIGN_ID_REJECTED',dec(Object.assign({},base,{indexId:'old-report'})).reason==='FOREIGN_REPORT_ID_COLLISION');
  check('TARGET_POINTER_REJECTED',dec(Object.assign({},base,{indexRowRekap:3957})).reason==='INDEX_POINTER_COLLISION');
  check('EMPTY_EXISTING_ALLOWED',dec(Object.assign({},base,{
    indexId:'',indexRowRekap:'',indexOwnerPresent:false})).safe);
  check('ORPHAN_POINTER_REJECTED',dec(Object.assign({},base,{
    indexId:'',indexRowRekap:3958,indexOwnerPresent:false})).reason==='OCCUPIED_INDEX_ROW_MISSING_ID');
  check('ORPHAN_METADATA_REJECTED',dec(Object.assign({},base,{
    indexId:'',indexRowRekap:'',indexOwnerPresent:true})).reason==='OCCUPIED_INDEX_ROW_MISSING_ID');
  check('MISSING_POINTER_SAME_ID_REJECTED',dec(Object.assign({},base,{
    indexRowRekap:''})).reason==='EXISTING_INDEX_POINTER_EMPTY');
  check('SOURCE_ID_CHANGED_REJECTED',dec(Object.assign({},base,{
    sourceId:'different-report'})).reason==='REKAP_ID_CHANGED_OR_EXPECTED_ID_MISMATCH');
  check('EMPTY_SOURCE_REJECTED',!dec(Object.assign({},base,{sourceId:''})).safe);
  check('BAD_ROW_REJECTED',!dec(Object.assign({},base,{rowRekap:1})).safe);
  check('NEW_ROW_ALLOWED',dec(Object.assign({},base,{targetExists:false})).safe);
  check('CASE_INSENSITIVE_ID',dec(Object.assign({},base,{sourceId:'NEW-REPORT'})).safe);
  var fail=t.filter(function(x){return !x.pass;});
  var result={sukses:fail.length===0,lulus:t.length-fail.length,gagal:fail.length,
    tests:t,version:ACE_DSP004_INTEGRITY_RC1_VERSION_,
    noDataWritten:true,readOnly:true};
  Logger.log('ACE_DSP004_INDEX_GUARD_VALIDATION '+JSON.stringify(result));
  return result;
}

// No protections are created or modified. Advisory inspection only.
function diagnostikProteksiSheetACEDsp004RC1() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_DSP004_MAINTAINER_GATE_REQUIRED');
  pastikanMaintainerPortal3B0_('ACE_DSP004_SHEET_PROTECTION_INSPECTION');
  var ss=getSS_(),types=SpreadsheetApp.ProtectionType.SHEET;
  var targets=['Rekap_Kinerja','Index_Laporan','Disposisi_Penerima','Audit_Log','Disposisi_Log'];
  var results=targets.map(function(name){
    var sh=ss.getSheetByName(name);
    if(!sh)return {sheet:name,available:false};
    var protections=sh.getProtections(types);
    return {sheet:name,available:true,protectionCount:protections.length,
      warningOnly:protections.some(function(p){return p.isWarningOnly();}),
      editRestrictingProtectionPresent:protections.some(function(p){
        return !p.isWarningOnly();})};
  });
  var out={success:true,version:ACE_DSP004_INTEGRITY_RC1_VERSION_,
    results:results,recommendation:'REVIEW_WITH_MAINTAINER; DO_NOT_AUTOMATICALLY_APPLY',
    readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_SHEET_PROTECTION_AUDIT '+JSON.stringify(out));
  return out;
}
