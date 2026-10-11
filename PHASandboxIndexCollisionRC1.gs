// ============================================================================
// PHA-08 INDEX COLLISION ACCEPTANCE | SANDBOX-ONLY RC1 | 2026-10-11
// ONLY add to separate Apps Script project SANDBOX_PHA_RC1_SCRIPT_TEST.
// Requires PHASandboxWriteAcceptanceRC1.gs from PHA-07 (no production code).
// Uses VERBATIM guard functions from ACEDsp004IndexIntegrityRC1.gs,
// enclosed in a local namespace with isolated synthetic SHEET_COLUMNS.
// Strictly NO production IDs, deployment, trigger, or Script Properties access.
// First run validasiLogikaPHA08RC1 and praUjiKolisiIndexPHA08RC1 only.
// ============================================================================

var PHA08_VERSION_RC1 = 'PHA08-INDEX-COLLISION-RC1-2026.10.11.02';
var PHA08_ALLOW_WRITE_RC1 = false; // DO NOT enable before read-only preflight reviewed.
var PHA08_ORIGINAL_A = 'PHA-TEST-RPT-0001';
var PHA08_ORIGINAL_B = 'PHA-TEST-RPT-0002';
var PHA08_PROBE_NONCE = 'PHA08-TEST-NONCE-TEMP-RESTORE';

var PHA08_ACTUAL_RC1_GUARD_ = (function() {
  // Isolated schema map; does NOT redefine production's SHEET_COLUMNS.
  var SHEET_COLUMNS = {
    REKAP_KINERJA: {ID_LAPORAN: 18},
    INDEX_LAPORAN: {ID_LAPORAN: 0, ROW_REKAP: 1, ID_USER: 2,
      ID_DISPOSISI: 8, NONCE: 9}
  };
  // BEGIN unchanged production guard helper functions:

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

  // END unchanged production guard helper functions.
  return {
    decision: aceDsp004IndexDecisionRC1_,
    assertSafe: aceDsp004AssertIndexCollisionSafeRC1_
  };
})();

function pha08AssertRC1_(condition, reason) {
  if (!condition) throw new Error('PHA08_STOP_' + reason);
}
function pha08NormRC1_(value) {
  if (value instanceof Date) return 'DATE:' + value.getTime();
  if(value===undefined||value===null)return '';
  return String(value);
}
function pha08RowsEqualRC1_(a,b) {
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
    a.every(function(row,i){
      return Array.isArray(row)&&Array.isArray(b[i])&&row.length===b[i].length&&
        row.every(function(v,j){return pha08NormRC1_(v)===pha08NormRC1_(b[i][j]);});
    });
}
function pha08RequireFixtureRC1_() {
  pha08AssertRC1_(typeof pha07PreflightCoreRC1_==='function'&&
    typeof PHA07_ALLOW_WRITE_RC1!=='undefined',
    'PHA07_STANDALONE_GUARD_NOT_FOUND');
  pha08AssertRC1_(PHA07_ALLOW_WRITE_RC1===false,
    'PHA07_PREVIOUS_WRITE_FLAG_MUST_BE_FALSE');
  pha08AssertRC1_(typeof PHA08_ACTUAL_RC1_GUARD_==='object'&&
    typeof PHA08_ACTUAL_RC1_GUARD_.assertSafe==='function',
    'PRODUCTION_GUARD_MISSING');
  var base=pha07PreflightCoreRC1_(); // validates exact sandbox ID & title, 6 test tabs,
  // synthetic markers, no visible triggers and restrictive Rekap protection.
  var ss=base.ss;
  var source=ss.getSheetByName('Rekap_Kinerja');
  var index=ss.getSheetByName('Index_Laporan');
  pha08AssertRC1_(!!source&&!!index,'REQUIRED_SYNTHETIC_SHEETS_ABSENT');
  pha08AssertRC1_(source.getLastRow()===3&&index.getLastRow()===3,
    'REPORT_OR_INDEX_ROW_COUNT_CHANGED');
  var snapshot=index.getRange(2,1,2,12).getValues();
  pha08AssertRC1_(snapshot.length===2&&snapshot[0].length===12&&
    snapshot[1].length===12,'INDEX_DIMENSIONS_CHANGED');
  pha08AssertRC1_(String(snapshot[0][0]).trim()===PHA08_ORIGINAL_A&&
    Number(snapshot[0][1])===2&&
    String(snapshot[1][0]).trim()===PHA08_ORIGINAL_B&&
    Number(snapshot[1][1])===3,'FIXTURE_ID_OR_POINTER_CHANGED');
  pha08AssertRC1_(String(snapshot[1][9]).trim()==='PHA-TEST-NONCE-0002',
    'INDEX_NONCE_NOT_BASELINE');
  // Guard original synthetic TEXT dates against setValues auto-coercion.
  // After failed RC1.01 test, manually restore D3/E3/K3 to plain text first.
  var textDateBaseline={3:'2026-10-10 09:15:00',4:'2026-10',10:'2026-10-10 09:15:02'};
  Object.keys(textDateBaseline).forEach(function(k){
    var col=Number(k);
    pha08AssertRC1_(typeof snapshot[1][col]==='string'&&
      snapshot[1][col]===textDateBaseline[k],
      'INDEX_DATE_TEXT_BASELINE_CHANGED');
  });
  pha08AssertRC1_(String(source.getRange('S2').getValue()).trim()===
    PHA08_ORIGINAL_A&&
    String(source.getRange('S3').getValue()).trim()===PHA08_ORIGINAL_B,
    'SOURCE_ID_CHANGED');
  return {index:index,source:source,before:snapshot,ss:ss};
}
function pha08TryThroughGateRC1_(ctx,sourceRow,targetRow,expected,onAuthorizedWrite) {
  var result=PHA08_ACTUAL_RC1_GUARD_.assertSafe(ctx.source,ctx.index,
    sourceRow,targetRow,expected[0],expected);
  if(typeof onAuthorizedWrite==='function')onAuthorizedWrite();
  return result;
}
function pha08CollisionRC1_(ctx) {
  var expected=ctx.before[1].slice(); // report B is at SOURCE row3
  var called=false,stopped=false,code='';
  try{
    pha08TryThroughGateRC1_(ctx,3,2,expected,function(){
      called=true;
      // Fatal if guard unexpectedly returned; test NEVER writes on collision.
      throw new Error('PHA08_FATAL_FOREIGN_ID_WRITE_PATH_REACHED');
    });
  }catch(e){
    code=String(e&&e.message||'');
    stopped=code==='ACE_DSP004_INDEX_WRITE_BLOCKED_FOREIGN_REPORT_ID_COLLISION';
  }
  pha08AssertRC1_(stopped&&!called,
    'FOREIGN_ID_GUARD_NOT_FAIL_CLOSED');
  pha08AssertRC1_(pha08RowsEqualRC1_(ctx.before,
    ctx.index.getRange(2,1,2,12).getValues()),
    'INDEX_CHANGED_DURING_BLOCKED_ATTEMPT');
  return {foreignIdBlocked:true,writeCallbackReached:false,
    exactErrorCategory:'FOREIGN_REPORT_ID_COLLISION'};
}
function pha08SameIdRC1_(ctx) {
  var expected=ctx.before[1].slice();
  var invoked=false;
  var accepted=pha08TryThroughGateRC1_(ctx,3,3,expected,function(){
    invoked=true; // simulation only; does NOT write any sheet.
  });
  pha08AssertRC1_(accepted&&accepted.allowed===true&&invoked,
    'SAME_ID_NOT_ALLOWED');
  pha08AssertRC1_(pha08RowsEqualRC1_(ctx.before,
    ctx.index.getRange(2,1,2,12).getValues()),
    'INDEX_CHANGED_DURING_READ_ONLY_CHECK');
  return {sameIdAllowed:true,noWriteToSheet:true};
}
function praUjiKolisiIndexPHA08RC1() {
  var out={sukses:false,versi:PHA08_VERSION_RC1,mode:'READ_ONLY',
    fixtureVerified:false,foreignIdBlocked:false,sameIdAllowed:false,
    noWriteObserved:false,writeEnabled:PHA08_ALLOW_WRITE_RC1,
    productionDataWritten:false};
  try {
    var ctx=pha08RequireFixtureRC1_();
    var collision=pha08CollisionRC1_(ctx),
      same=pha08SameIdRC1_(ctx);
    out.sukses=true;
    out.fixtureVerified=true;
    out.foreignIdBlocked=collision.foreignIdBlocked;
    out.sameIdAllowed=same.sameIdAllowed;
    out.noWriteObserved=true;
  }catch(e){
    out.stopCode=String(e&&e.message||'UNKNOWN').slice(0,150);
  }
  Logger.log('PHA08_PREFLIGHT '+JSON.stringify(out));
  return out;
}
function ujiKolisiDanPemulihanIndexPHA08RC1() {
  if(PHA08_ALLOW_WRITE_RC1!==true) {
    var stop={sukses:false,status:'WRITE_TEST_DISABLED',
      readOnly:true,dataBisnisDiubah:false};
    Logger.log('PHA08_WRITE_TEST '+JSON.stringify(stop));
    return stop;
  }
  var result={sukses:false,versi:PHA08_VERSION_RC1,
    status:'STARTED',target:'SANDBOX_ONLY_INDEX_J3',
    foreignIdBlocked:false,foreignIdWrites:0,
    sameIdWriteObserved:false,restoreVerified:false,
    manualRestoreRequired:false,productionDataWritten:false};
  var lock=null,held=false,ctx=null,restoreNeeded=false;
  try {
    pha08AssertRC1_(typeof LockService!=='undefined',
      'LOCKSERVICE_MISSING');
    lock=LockService.getScriptLock();
    pha08AssertRC1_(lock.tryLock(5000),'TEST_LOCK_NOT_AVAILABLE');
    held=true;
    ctx=pha08RequireFixtureRC1_();
    pha08CollisionRC1_(ctx); // must throw before writer; 0 writes.
    result.foreignIdBlocked=true;
    var probe=ctx.before[1].slice();
    probe[9]=PHA08_PROBE_NONCE;
    pha08AssertRC1_(String(ctx.index.getRange('J3').getValue())===
      'PHA-TEST-NONCE-0002','NONCE_CHANGED_BEFORE_WRITE');
    // Guard permits matching ID and ROW_REKAP; only the known synthetic index row3.
    var auth=PHA08_ACTUAL_RC1_GUARD_.assertSafe(ctx.source,ctx.index,
      3,3,PHA08_ORIGINAL_B,probe);
    pha08AssertRC1_(auth.allowed===true,'SAME_ID_WRITE_GUARD_REJECTED');
    // Critical: update only J3. Rewriting all 12 index cells coerced
    // synthetic text dates in D3, E3, K3 and broke strict restoration checks.
    // Zero writes before this point. Restore J3 even if flush/assertion fails.
    restoreNeeded=true;
    ctx.index.getRange('J3').setValue(PHA08_PROBE_NONCE);
    SpreadsheetApp.flush();
    var observed=ctx.index.getRange(3,1,1,12).getValues()[0];
    var otherCellsUnchanged=observed.every(function(value,j){
      return j===9||pha08NormRC1_(value)===pha08NormRC1_(ctx.before[1][j]);
    });
    result.sameIdWriteObserved=otherCellsUnchanged&&
      String(observed[9])===PHA08_PROBE_NONCE&&
      pha08RowsEqualRC1_([ctx.before[0]],
        ctx.index.getRange(2,1,1,12).getValues());
    pha08AssertRC1_(result.sameIdWriteObserved,
      'SAME_ID_WRITE_NOT_OBSERVED');
  }catch(e){
    result.status='STOPPED';
    result.stopCode=String(e&&e.message||'UNKNOWN').slice(0,150);
  }finally{
    if(restoreNeeded&&ctx){
      try{
        ctx.index.getRange('J3').setValue(String(ctx.before[1][9]));
        SpreadsheetApp.flush();
        result.restoreVerified=pha08RowsEqualRC1_(ctx.before,
          ctx.index.getRange(2,1,2,12).getValues());
      }catch(e){
        result.restoreVerified=false;
        result.restoreStopCode='INDEX_RESTORE_FAILED';
      }
      if(!result.restoreVerified){
        result.manualRestoreRequired=true;
        result.status='SANDBOX_INDEX_RESTORE_NEEDS_ATTENTION';
      }
    }
    if(held){try{lock.releaseLock();}catch(e){}}
  }
  result.sukses=result.foreignIdBlocked&&result.foreignIdWrites===0&&
    result.sameIdWriteObserved&&result.restoreVerified&&
    !result.manualRestoreRequired;
  if(result.sukses)result.status='PASS_COLLISION_BLOCK_AND_RESTORE';
  Logger.log('PHA08_WRITE_TEST '+JSON.stringify(result));
  return result;
}
function validasiLogikaPHA08RC1() {
  var t=[];function ck(n,ok){t.push({name:n,pass:ok===true});}
  var d=PHA08_ACTUAL_RC1_GUARD_.decision;
  var base={rowRekap:3,targetRow:3,sourceId:PHA08_ORIGINAL_B,
    expectedId:PHA08_ORIGINAL_B,targetExists:true,
    indexId:PHA08_ORIGINAL_B,indexRowRekap:3,indexOwnerPresent:true};
  ck('SOURCE_EXACT_GUARD_FUNCTION',typeof PHA08_ACTUAL_RC1_GUARD_.assertSafe==='function');
  ck('SAME_ID_ALLOWED',d(base).safe===true);
  ck('FOREIGN_ID_REJECTED',d(Object.assign({},base,{
    targetRow:2,indexId:PHA08_ORIGINAL_A,indexRowRekap:2
  })).reason==='FOREIGN_REPORT_ID_COLLISION');
  ck('INDEX_POINTER_CHANGED_REJECTED',d(Object.assign({},base,{
    indexRowRekap:2})).reason==='INDEX_POINTER_COLLISION');
  ck('SOURCE_CHANGED_REJECTED',d(Object.assign({},base,{
    sourceId:PHA08_ORIGINAL_A})).reason==='REKAP_ID_CHANGED_OR_EXPECTED_ID_MISMATCH');
  ck('EMPTY_OWNED_ROW_REJECTED',d(Object.assign({},base,{
    indexId:'',indexRowRekap:3})).reason==='OCCUPIED_INDEX_ROW_MISSING_ID');
  ck('EMPTY_TARGET_ALLOWED',d(Object.assign({},base,{
    indexId:'',indexRowRekap:'',indexOwnerPresent:false})).safe===true);
  ck('MISSING_POINTER_REJECTED',d(Object.assign({},base,{
    indexRowRekap:''})).reason==='EXISTING_INDEX_POINTER_EMPTY');
  ck('NEW_INDEX_ROW_ALLOWED',d(Object.assign({},base,{
    targetExists:false})).safe===true);
  ck('INVALID_SOURCE_ROW_REJECTED',d(Object.assign({},base,{
    rowRekap:1})).reason==='INVALID_ROW_POINTER');
  ck('WRITE_FLAG_DEFAULT_OFF',PHA08_ALLOW_WRITE_RC1===false);
  ck('SANDBOX_EXACT_TEST_IDS_ONLY',
    PHA08_ORIGINAL_A==='PHA-TEST-RPT-0001'&&PHA08_ORIGINAL_B==='PHA-TEST-RPT-0002');
  var failed=t.filter(function(x){return !x.pass;});
  var result={sukses:failed.length===0,
    lulus:t.length-failed.length,gagal:failed.length,checks:t,
    readOnly:true,dataBisnisDiubah:false};
  Logger.log('PHA08_PURE_VALIDATION '+JSON.stringify(result));
  return result;
}
