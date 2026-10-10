// ============================================================================
// PHA-07 SANDBOX ONLY -- isolated Apps Script v1.0 RC1 (2026-10-10)
// Copy into the *separate* project SANDBOX_PHA_RC1_SCRIPT_TEST only.
// NO production IDs, Script Properties, triggers, deployment or live data.
// First run praUjiSandboxPHA07RC1() (read-only).
// Test writer is OFF unless explicitly authorized via PHA07_ALLOW_WRITE_RC1.
// ============================================================================

var PHA07_SANDBOX_ID_RC1 = '1ZrZvG3qdS3VLCUpJJIa8RpMZTFdmFEM_q8F1UzpYDNk';
var PHA07_SANDBOX_TITLE_RC1 = 'SANDBOX_PHA_RC1_SYNTHETIC_ONLY';
var PHA07_ALLOW_WRITE_RC1 = false; // KEEP false until preflight reviewed
var PHA07_VERSION_RC1 = 'PHA07-SANDBOX-WRITER-RC1-2026.10.10.01';

function pha07EqualsRC1_(a,b) {
  return String(a === null || a === undefined ? '' : a).trim() === b;
}
function pha07RequireRC1_(condition,code) {
  if(!condition)throw new Error('PHA07_STOP_'+code);
}
function pha07CheckFixtureRC1_(ss) {
  pha07RequireRC1_(ss.getId()===PHA07_SANDBOX_ID_RC1,'WRONG_SPREADSHEET_ID');
  pha07RequireRC1_(ss.getName()===PHA07_SANDBOX_TITLE_RC1,'WRONG_SPREADSHEET_TITLE');
  var names=['MULAI_DI_SINI','Rekap_Kinerja','Index_Laporan',
    'Disposisi_Penerima','Audit_Log','Disposisi_Log'];
  var sheets=ss.getSheets();
  pha07RequireRC1_(sheets.length===6,'EXPECTED_SIX_TEST_TABS');
  var sh=Object.create(null);
  names.forEach(function(name) {
    sh[name]=ss.getSheetByName(name);
    pha07RequireRC1_(!!sh[name],'MISSING_TEST_TAB');
  });
  pha07RequireRC1_(
    pha07EqualsRC1_(sh.MULAI_DI_SINI.getRange('A1').getValue(),
      'SANDBOX PHA RC1  |  PORTAL KINERJA MINOMARTANI'),
    'SANDBOX_HEADER_MISMATCH');
  pha07RequireRC1_(
    pha07EqualsRC1_(sh.MULAI_DI_SINI.getRange('A4').getValue(),
      'DATA SINTETIS • BUKAN DATABASE PRODUKSI'),
    'SYNTHETIC_ONLY_MARKER_MISSING');
  pha07RequireRC1_(
    sh.Rekap_Kinerja.getLastRow()===3&&
    sh.Index_Laporan.getLastRow()===3&&
    sh.Disposisi_Penerima.getLastRow()===2&&
    sh.Audit_Log.getLastRow()===3&&
    sh.Disposisi_Log.getLastRow()===2,
    'SYNTHETIC_ROW_COUNTS_CHANGED');
  var expected=['PHA-TEST-RPT-0001','PHA-TEST-RPT-0002'];
  [2,3].forEach(function(row,i){
    pha07RequireRC1_(
      pha07EqualsRC1_(sh.Rekap_Kinerja.getRange('S'+row).getValue(),expected[i])&&
      pha07EqualsRC1_(sh.Index_Laporan.getRange('A'+row).getValue(),expected[i])&&
      Number(sh.Index_Laporan.getRange('B'+row).getValue())===row,
      'REPORT_INDEX_FIXTURE_MISMATCH');
  });
  pha07RequireRC1_(
    pha07EqualsRC1_(sh.Disposisi_Penerima.getRange('H2').getValue(),expected[0]),
    'DISPOSITION_FIXTURE_MISMATCH');
  pha07RequireRC1_(
    pha07EqualsRC1_(sh.Audit_Log.getRange('D2').getValue(),expected[0]),
    'AUDIT_FIXTURE_MISMATCH');
  pha07RequireRC1_(
    pha07EqualsRC1_(sh.Rekap_Kinerja.getRange('R2').getValue(),''),
    'PROBE_CELL_NOT_EMPTY');
  return sh;
}
function pha07CheckProtectionRC1_(sheet) {
  var protections=sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  var strict=protections.filter(function(p){return !p.isWarningOnly();});
  pha07RequireRC1_(strict.length>0,'NO_RESTRICTING_SHEET_PROTECTION');
  strict.forEach(function(p){
    pha07RequireRC1_(p.canEdit()===true,'EXECUTOR_CANNOT_EDIT_PROTECTED_SHEET');
    p.getUnprotectedRanges().forEach(function(r){
      var col=r.getColumn(),lastCol=r.getLastColumn(),
        row=r.getRow(),lastRow=r.getLastRow();
      // R2 is the designated harmless synthetic probe; it MUST be protected.
      pha07RequireRC1_(!(row<=2&&lastRow>=2&&col<=18&&lastCol>=18),
        'PROBE_CELL_IS_UNPROTECTED_EXCEPTION');
    });
  });
  return strict.length;
}
function pha07ConfirmNoTriggersRC1_() {
  pha07RequireRC1_(typeof ScriptApp!=='undefined'&&
    typeof ScriptApp.getProjectTriggers==='function','TRIGGER_AUDIT_UNAVAILABLE');
  var list=ScriptApp.getProjectTriggers();
  pha07RequireRC1_(Array.isArray(list)&&list.length===0,
    'SANDBOX_HAS_VISIBLE_TRIGGERS');
  // Other users' project triggers are not visible to this caller.
  return true;
}
function pha07PreflightCoreRC1_() {
  pha07ConfirmNoTriggersRC1_();
  var ss=SpreadsheetApp.openById(PHA07_SANDBOX_ID_RC1);
  var sh=pha07CheckFixtureRC1_(ss);
  var strictCount=pha07CheckProtectionRC1_(sh.Rekap_Kinerja);
  return {ss:ss,sheet:sh.Rekap_Kinerja,strictCount:strictCount};
}
function praUjiSandboxPHA07RC1() {
  var v={sukses:false,versi:PHA07_VERSION_RC1,mode:'READ_ONLY',
    spreadsheetIsSynthetic:false,strictProtectionPresent:false,
    noVisibleTriggers:false,writeEnabled:PHA07_ALLOW_WRITE_RC1,
    productionDataWritten:false};
  try {
    var x=pha07PreflightCoreRC1_();
    v.sukses=true;
    v.spreadsheetIsSynthetic=true;
    v.strictProtectionPresent=x.strictCount>0;
    v.noVisibleTriggers=true;
  }catch(e){
    v.stopCode=String(e&&e.message||'UNKNOWN').slice(0,110);
  }
  Logger.log('PHA07_PREFLIGHT '+JSON.stringify(v));
  return v;
}
function ujiPenulisanTerproteksiPHA07RC1() {
  // Intentional hard stop until operator explicitly enables write testing.
  if(PHA07_ALLOW_WRITE_RC1!==true) {
    var skipped={sukses:false,status:'WRITE_TEST_DISABLED',
      readOnly:true,dataBisnisDiubah:false};
    Logger.log('PHA07_WRITE_TEST '+JSON.stringify(skipped));
    return skipped;
  }
  var result={sukses:false,status:'STARTED',
    target:'SANDBOX_ONLY_REKAP_R2',
    writeObserved:false,restoreVerified:false,
    productionDataWritten:false,manualRestoreRequired:false};
  var sheet=null, original='',didWrite=false,lock=null,lockHeld=false;
  try{
    var v=pha07PreflightCoreRC1_();
    sheet=v.sheet;
    original=sheet.getRange('R2').getValue();
    pha07RequireRC1_(pha07EqualsRC1_(original,''),'PROBE_CELL_CHANGED');
    lock=LockService.getScriptLock();
    pha07RequireRC1_(lock.tryLock(5000),'TEST_LOCK_UNAVAILABLE');
    lockHeld=true;
    // One test-only cell in the verified isolated workbook.
    sheet.getRange('R2').setValue('PHA07_SYNTHETIC_PROTECTED_WRITE_PROBE');
    didWrite=true;
    SpreadsheetApp.flush();
    pha07RequireRC1_(
      pha07EqualsRC1_(sheet.getRange('R2').getValue(),
        'PHA07_SYNTHETIC_PROTECTED_WRITE_PROBE'),
      'TEST_WRITE_NOT_OBSERVED');
    result.writeObserved=true;
    result.status='WRITE_OBSERVED_RESTORE_PENDING';
  }catch(e){
    result.status='STOPPED';
    result.stopCode=String(e&&e.message||'UNKNOWN').slice(0,110);
  }finally{
    if(didWrite&&sheet){
      try{
        // Restore the exact previous synthetic content, even after assertion failure.
        sheet.getRange('R2').setValue(original);
        SpreadsheetApp.flush();
        result.restoreVerified=pha07EqualsRC1_(
          sheet.getRange('R2').getValue(),String(original));
      }catch(e){
        result.restoreVerified=false;
        result.restoreStopCode='RESTORE_ERROR';
      }
      if(!result.restoreVerified){
        result.manualRestoreRequired=true;
        result.status='SANDBOX_RESTORE_NEEDS_ATTENTION';
      }
    }
    if(lockHeld)lock.releaseLock();
  }
  result.sukses=result.writeObserved&&result.restoreVerified&&
    !result.manualRestoreRequired;
  if(result.sukses)result.status='PASS_WRITE_AND_RESTORE';
  Logger.log('PHA07_WRITE_TEST '+JSON.stringify(result));
  return result;
}
function validasiLogikaPHA07RC1() {
  // Pure guard tests; never touches Drive, Sheet, or triggers.
  var tests=[];
  function ck(n,b){tests.push({name:n,pass:b===true});}
  ck('TITLE_MATCH',pha07EqualsRC1_('SANDBOX_PHA_RC1_SYNTHETIC_ONLY',
    PHA07_SANDBOX_TITLE_RC1));
  ck('DIFFERENT_TITLE_STOP',!pha07EqualsRC1_('Database Kinerja Minomartani 2026',
    PHA07_SANDBOX_TITLE_RC1));
  ck('TEST_ID_ONLY',PHA07_SANDBOX_ID_RC1==='1ZrZvG3qdS3VLCUpJJIa8RpMZTFdmFEM_q8F1UzpYDNk');
  ck('SYNTHETIC_TARGET_LOCKED',PHA07_SANDBOX_TITLE_RC1.indexOf('SYNTHETIC_ONLY')>0);
  ck('WRITE_DISABLED_BY_DEFAULT',PHA07_ALLOW_WRITE_RC1===false);
  ck('NORMALIZATION',pha07EqualsRC1_('  ',''));
  ck('FAIL_CLOSED',function(){
    try{pha07RequireRC1_(false,'SAMPLE');}catch(e){
      return String(e.message)==='PHA07_STOP_SAMPLE';
    }
    return false;
  }());
  var failures=tests.filter(function(x){return !x.pass;});
  var result={sukses:failures.length===0,lulus:tests.length-failures.length,
    gagal:failures.length,checks:tests,readOnly:true,dataBisnisDiubah:false};
  Logger.log('PHA07_PURE_VALIDATION '+JSON.stringify(result));
  return result;
}
