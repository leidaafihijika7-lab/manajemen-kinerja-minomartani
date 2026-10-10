// ============================================================================
// ACE-DSP-004 | Protection Hardening Acceptance v1.0 RC1 | 2026-10-10
// PRODUCTION SAFE: MAINTAINER-GATED, READ-ONLY, ZERO SHEET/DRIVE WRITES.
// Inspects SHEET + RANGE protections, current caller identity and only that
// caller's installable triggers. Does not infer deployed Web App executeAs.
// No editor emails, spreadsheet IDs, trigger UIDs, or report data are logged.
// NO APPLY/ROLLBACK/DEPLOY/PROTECTION-MUTATION FUNCTIONS IN THIS MODULE.
// ============================================================================

var ACE_DSP004_PHA_RC1_VERSION_='ACE-DSP004-PROTECTION-ACCEPTANCE-RC1-2026.10.10.01';
var ACE_DSP004_PHA_RC1_MAX_SAMPLES_=8;
var ACE_DSP004_PHA_RC1_TARGETS_=[
  {sheet:'Rekap_Kinerja',schema:'REKAP_KINERJA',critical:'ID_LAPORAN'},
  {sheet:'Index_Laporan',schema:'INDEX_LAPORAN',critical:'ID_LAPORAN'},
  {sheet:'Disposisi_Penerima',schema:'DISPOSISI_PENERIMA',critical:'ID_LAPORAN_TERKAIT'},
  {sheet:'Audit_Log',schema:'AUDIT_LOG',critical:'DETAIL'},
  {sheet:'Disposisi_Log',schema:'DISPOSISI_LOG',critical:'DETAIL'}
];

function aceDsp004PhaEnumRC1_(v) {
  var text=String(v===null||v===undefined?'':v).trim().toUpperCase();
  return /^[A-Z_]{1,48}$/.test(text)?text:'UNKNOWN';
}
function aceDsp004PhaStateRC1_(r) {
  if(!r||r.available!==true)return 'MISSING_SHEET';
  if(r.inspectionErrorCount>0||!r.sheetInspected||!r.rangeInspected)
    return 'INDETERMINATE_INSPECTION';
  if(r.restrictingSheetCount>0) {
    return r.unprotectedExceptionsCount>0?
      'SHEET_RESTRICTED_WITH_EXCEPTIONS':'SHEET_RESTRICTED';
  }
  if(r.warningSheetCount>0)return 'SHEET_WARNING_ONLY';
  if(r.restrictingRangeCount>0)return 'RANGE_RESTRICTION_PARTIAL';
  if(r.warningRangeCount>0)return 'RANGE_WARNING_PARTIAL';
  return 'NO_PROTECTION_OBSERVED';
}
function aceDsp004PhaExtractProtectRC1_(protection,kind,criticalOneBased,maxRows) {
  var data={type:kind,warningOnly:null,currentCallerCanEdit:null,
    domainMayEdit:null,unprotectedExceptionsCount:0,
    rangeA1:'',criticalColumnIntersect:false,criticalColumnFullHeight:false,
    warnings:[]};
  try {data.warningOnly=protection.isWarningOnly()===true;}
  catch(e){data.warnings.push('WARNING_STATUS_UNREADABLE');}
  try {data.currentCallerCanEdit=protection.canEdit()===true;}
  catch(e){data.warnings.push('CURRENT_ACTOR_ACCESS_UNREADABLE');}
  try {data.domainMayEdit=protection.canDomainEdit()===true;}
  catch(e){data.warnings.push('DOMAIN_ACCESS_UNREADABLE');}
  if(kind==='SHEET'){
    try {data.unprotectedExceptionsCount=protection.getUnprotectedRanges().length;}
    catch(e){data.unprotectedExceptionsCount=null;data.warnings.push('UNPROTECTED_EXCEPTIONS_UNREADABLE');}
  } else {
    try {
      var rng=protection.getRange();
      var col=Number(rng.getColumn()),lastCol=Number(rng.getLastColumn()),
          row=Number(rng.getRow()),lastRow=Number(rng.getLastRow());
      data.rangeA1=String(rng.getA1Notation()||'').slice(0,60);
      data.criticalColumnIntersect=col<=criticalOneBased&&lastCol>=criticalOneBased;
      data.criticalColumnFullHeight=data.criticalColumnIntersect&&row<=1&&
        lastRow>=maxRows&&maxRows>0;
    }catch(e){data.warnings.push('RANGE_METADATA_UNREADABLE');}
  }
  // No getEditors/getTargetAudiences: avoids collecting private identities.
  return data;
}
function aceDsp004PhaReadSheetRC1_(ss,target,types,C) {
  var sh=ss.getSheetByName(target.sheet);
  var r={sheet:target.sheet,available:!!sh,sheetInspected:false,rangeInspected:false,
    sheetProtectionCount:0,rangeProtectionCount:0,
    warningSheetCount:0,restrictingSheetCount:0,
    warningRangeCount:0,restrictingRangeCount:0,
    rangeFullCriticalColumnCount:0,unprotectedExceptionsCount:0,
    currentActorEditableProtectionCount:0,domainEditableProtectionCount:0,
    inspectionErrorCount:0,warningCodes:[],rangeSamples:[]};
  if(!sh){r.state=aceDsp004PhaStateRC1_(r);return r;}
  var map=C&&C[target.schema],critical=map&&map[target.critical];
  if(typeof critical!=='number'||critical<0||critical%1!==0){
    r.inspectionErrorCount++;r.warningCodes.push('CRITICAL_SCHEMA_UNAVAILABLE');
    r.state=aceDsp004PhaStateRC1_(r);return r;
  }
  var maxRows;
  try{maxRows=sh.getMaxRows();}
  catch(e){maxRows=0;r.inspectionErrorCount++;r.warningCodes.push('MAX_ROWS_UNAVAILABLE');}
  [['SHEET',types.SHEET],['RANGE',types.RANGE]].forEach(function(item){
    var kind=item[0],list;
    try{
      list=sh.getProtections(item[1]);
      if(!Array.isArray(list))throw new Error('NOT_AN_ARRAY');
      if(kind==='SHEET')r.sheetInspected=true;
      else r.rangeInspected=true;
    }catch(e){
      r.inspectionErrorCount++;r.warningCodes.push(kind+'_PROTECTIONS_UNREADABLE');
      return;
    }
    if(kind==='SHEET')r.sheetProtectionCount=list.length;
    else r.rangeProtectionCount=list.length;
    list.forEach(function(p){
      var d=aceDsp004PhaExtractProtectRC1_(p,kind,critical+1,maxRows);
      if(d.warningOnly===null)r.inspectionErrorCount++;
      if(d.warningOnly===true){
        if(kind==='SHEET')r.warningSheetCount++;
        else r.warningRangeCount++;
      }else if(d.warningOnly===false){
        if(kind==='SHEET')r.restrictingSheetCount++;
        else r.restrictingRangeCount++;
      }
      if(d.unprotectedExceptionsCount===null)r.inspectionErrorCount++;
      else r.unprotectedExceptionsCount+=d.unprotectedExceptionsCount;
      if(d.currentCallerCanEdit===true)r.currentActorEditableProtectionCount++;
      if(d.domainMayEdit===true)r.domainEditableProtectionCount++;
      if(d.criticalColumnFullHeight)r.rangeFullCriticalColumnCount++;
      if(d.warnings.length) {
        r.warningCodes=r.warningCodes.concat(d.warnings);
        // Unknown current actor permission does not invalidate protection type.
        d.warnings.forEach(function(x){
          if(x==='CURRENT_ACTOR_ACCESS_UNREADABLE'||
             x==='DOMAIN_ACCESS_UNREADABLE'||
             x==='RANGE_METADATA_UNREADABLE')r.inspectionErrorCount++;
        });
      }
      if(kind==='RANGE'&&r.rangeSamples.length<ACE_DSP004_PHA_RC1_MAX_SAMPLES_){
        r.rangeSamples.push({
          a1:d.rangeA1||'UNAVAILABLE',
          warningOnly:d.warningOnly,
          coversCriticalColumn:d.criticalColumnIntersect,
          coversCriticalColumnFullHeight:d.criticalColumnFullHeight
        });
      }
    });
  });
  // Sorted unique machine-readable codes, no source free text.
  r.warningCodes=Array.from(new Set(r.warningCodes)).sort();
  r.state=aceDsp004PhaStateRC1_(r);
  r.isProtectionEvidenceSufficient=r.inspectionErrorCount===0&&
    r.sheetInspected&&r.rangeInspected;
  return r;
}
function aceDsp004PhaSafeIdentityRC1_() {
  var active='',effective='',status='UNKNOWN';
  try {active=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();}
  catch(e){}
  try {effective=String(Session.getEffectiveUser().getEmail()||'').trim().toLowerCase();}
  catch(e){}
  if(active&&effective)status=active===effective?'MATCH':'DIFFER';
  return {activeIdentityAvailable:!!active,effectiveIdentityAvailable:!!effective,
    currentExecutionIdentityRelation:status,
    doesNotProveWebAppExecuteAs:true,doesNotProveTriggerCreator:true};
}
function aceDsp004PhaTriggerAuditRC1_() {
  var out={visibility:'UNKNOWN',scope:'CURRENT_USER_ONLY',totalVisible:null,
    byEventType:[],bySource:[],errorCode:null};
  try{
    if(typeof ScriptApp==='undefined'||typeof ScriptApp.getProjectTriggers!=='function')
      throw new Error('SCRIPTAPP_UNAVAILABLE');
    var list=ScriptApp.getProjectTriggers(),byEvent=Object.create(null),
        bySource=Object.create(null);
    list.forEach(function(t){
      var event='UNKNOWN',source='UNKNOWN';
      try{event=aceDsp004PhaEnumRC1_(t.getEventType());}catch(e){}
      try{source=aceDsp004PhaEnumRC1_(t.getTriggerSource());}catch(e){}
      byEvent[event]=(byEvent[event]||0)+1;
      bySource[source]=(bySource[source]||0)+1;
    });
    out.visibility='CURRENT_USER_TRIGGERS_OBSERVED';
    out.totalVisible=list.length;
    out.byEventType=Object.keys(byEvent).sort().map(function(key){
      return {eventType:key,count:byEvent[key]};
    });
    out.bySource=Object.keys(bySource).sort().map(function(key){
      return {sourceType:key,count:bySource[key]};
    });
  }catch(e){
    out.visibility='NOT_AVAILABLE';
    out.errorCode='TRIGGER_SCOPE_OR_AUTH_UNAVAILABLE';
  }
  out.allOtherAccountsTriggersRemainUnknown=true;
  return out;
}
function aceDsp004PhaDecisionRC1_(results,triggerInfo) {
  var complete=Array.isArray(results)&&results.length===5&&
    results.every(function(r){return r&&r.available&&r.isProtectionEvidenceSufficient;});
  var zero=complete&&results.every(function(r) {
    return r.sheetProtectionCount===0&&r.rangeProtectionCount===0;
  });
  return {
    diagnosticComplete:!!complete,
    existingProtectionsObserved:!!(results||[]).some(function(r){
      return (r.sheetProtectionCount||0)+(r.rangeProtectionCount||0)>0;}),
    noProtectionsOnAllFive:!!zero,
    triggerInventoryComplete:false,
    webAppExecuteAsVerified:false,
    protectedWriteFlowSandboxTested:false,
    ownerEditBlockVerified:false,
    readiness:!complete?'INSPECTION_INCOMPLETE':
      'READY_FOR_CONTROLLED_SANDBOX_TESTS_ONLY',
    productionChangeAuthorized:false,
    acceptanceApproved:false,
    rationale:'No production protection or deployment may be auto-applied'
  };
}
function diagnostikProtectionAcceptanceACEDsp004RC1() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_DSP004_PHA_MAINTAINER_GATE_MISSING');
  pastikanMaintainerPortal3B0_('ACE_DSP004_PHA_READ_ONLY');
  if(typeof getSS_!=='function'||typeof SHEET_COLUMNS==='undefined')
    throw new Error('ACE_DSP004_PHA_REQUIRED_HELPER_MISSING');
  var ss=getSS_(),type=SpreadsheetApp.ProtectionType;
  if(!type||!type.SHEET||!type.RANGE)
    throw new Error('ACE_DSP004_PHA_PROTECTION_ENUM_UNAVAILABLE');
  var rows=ACE_DSP004_PHA_RC1_TARGETS_.map(function(target){
    return aceDsp004PhaReadSheetRC1_(ss,target,type,SHEET_COLUMNS);
  });
  var identity=aceDsp004PhaSafeIdentityRC1_(),
      triggers=aceDsp004PhaTriggerAuditRC1_(),
      decision=aceDsp004PhaDecisionRC1_(rows,triggers);
  var out={
    sukses:decision.diagnosticComplete,
    versi:ACE_DSP004_PHA_RC1_VERSION_,
    protectedSheetsInspected:rows.filter(function(r){return r.available;}).length,
    sourceValuesRead:false,identitiesRedacted:true,
    identity:identity,triggers:triggers,decision:decision,
    sheets:rows,readOnly:true,dataBisnisDiubah:false
  };
  Logger.log('ACE_DSP004_PHA_SUMMARY '+JSON.stringify({
    sukses:out.sukses,versi:out.versi,
    protectedSheetsInspected:out.protectedSheetsInspected,
    identity:identity,triggers:triggers,decision:decision,
    readOnly:true,dataBisnisDiubah:false
  }));
  rows.forEach(function(r){
    Logger.log('ACE_DSP004_PHA_SHEET '+JSON.stringify(r));
  });
  return out;
}
function validasiProtectionAcceptanceACEDsp004RC1() {
  var tests=[];function ck(name,pass){tests.push({name:name,pass:pass===true});}
  var type={SHEET:'SHEET',RANGE:'RANGE'},
      cols={REKAP_KINERJA:{ID_LAPORAN:18}};
  function mockProt(warn,kind,exceptions,fromCol,toCol,toRow) {
    return {
      isWarningOnly:function(){return warn;},
      canEdit:function(){return true;},
      canDomainEdit:function(){return false;},
      getUnprotectedRanges:function(){return Array(exceptions||0).fill(null);},
      getRange:function(){return {
        getColumn:function(){return fromCol||19;},
        getLastColumn:function(){return toCol||19;},
        getRow:function(){return 1;},
        getLastRow:function(){return toRow||200;},
        getA1Notation:function(){return 'S1:S'+(toRow||200);}
      };}
    };
  }
  function make(warningSheets,strictSheets,warnRanges,strictRanges,exceptions){
    var sheet={getMaxRows:function(){return 200;},
      getProtections:function(kind){return kind==='SHEET'?
        Array(warningSheets||0).fill(null).map(function(){
          return mockProt(true,'SHEET',exceptions);
        }).concat(Array(strictSheets||0).fill(null).map(function(){
          return mockProt(false,'SHEET',exceptions);
        })):
        Array(warnRanges||0).fill(null).map(function(){
          return mockProt(true,'RANGE',0);
        }).concat(Array(strictRanges||0).fill(null).map(function(){
          return mockProt(false,'RANGE',0);
        }));
      }};
    return aceDsp004PhaReadSheetRC1_({
      getSheetByName:function(){return sheet;}
    },{sheet:'Rekap_Kinerja',schema:'REKAP_KINERJA',critical:'ID_LAPORAN'},type,cols);
  }
  var none=make(0,0,0,0,0),warn=make(1,0,0,0,0),
      strict=make(0,1,0,0,0),exceptions=make(0,1,0,0,2),
      partial=make(0,0,1,1,0);
  ck('EMPTY_SHEET_NO_PROTECTION',none.state==='NO_PROTECTION_OBSERVED');
  ck('WARNING_SHEET_NOT_RESTRICTED',warn.state==='SHEET_WARNING_ONLY');
  ck('RESTRICTED_SHEET',strict.state==='SHEET_RESTRICTED');
  ck('RESTRICTED_SHEET_EXCEPTIONS',exceptions.state==='SHEET_RESTRICTED_WITH_EXCEPTIONS');
  ck('RANGE_PROTECTION_PARTIAL',partial.state==='RANGE_RESTRICTION_PARTIAL');
  ck('RANGE_FULL_CRITICAL_COLUMN_DETECTED',partial.rangeFullCriticalColumnCount===2);
  ck('NO_USER_IDENTITIES_IN_SAMPLES',
    JSON.stringify(partial).indexOf('@')===-1);
  ck('MISSING_SHEET_NOT_PASS',aceDsp004PhaStateRC1_({available:false})==='MISSING_SHEET');
  ck('UNKNOWN_SHEET_FAILS_CLOSED',aceDsp004PhaStateRC1_({
    available:true,sheetInspected:false,rangeInspected:false,
    inspectionErrorCount:1})==='INDETERMINATE_INSPECTION');
  var five=[none,none,none,none,none],decision=aceDsp004PhaDecisionRC1_(five,{});
  ck('FIVE_NO_PROTECTION_COMPLETE',decision.diagnosticComplete===true);
  ck('FIVE_NO_PROTECTION_FLAG',decision.noProtectionsOnAllFive===true);
  ck('NEVER_AUTO_AUTHORIZE',decision.productionChangeAuthorized===false);
  ck('NEVER_AUTO_ACCEPT',decision.acceptanceApproved===false);
  ck('TRIGGER_VISIBILITY_NOT_GLOBAL',decision.triggerInventoryComplete===false);
  ck('WEBAPP_EXECUTEAS_NOT_INFERRED',decision.webAppExecuteAsVerified===false);
  ck('SANDBOX_TEST_REQUIRED',decision.protectedWriteFlowSandboxTested===false);
  ck('INCOMPLETE_FIVE_NOT_READY',aceDsp004PhaDecisionRC1_(
    [none,none],{}).readiness==='INSPECTION_INCOMPLETE');
  ck('ALLOWED_EVENT_TYPE_SANITIZED',
    aceDsp004PhaEnumRC1_('clock time')==='UNKNOWN');
  ck('READ_ONLY_SCHEMA_5_TARGETS',ACE_DSP004_PHA_RC1_TARGETS_.length===5);
  ck('DIAGNOSTIC_MOCK_DETERMINATE',none.isProtectionEvidenceSufficient===true);
  var failed=tests.filter(function(x){return !x.pass;});
  var out={sukses:failed.length===0,lulus:tests.length-failed.length,
    gagal:failed.length,checks:tests,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_PHA_VALIDATION '+JSON.stringify(out));
  return out;
}
