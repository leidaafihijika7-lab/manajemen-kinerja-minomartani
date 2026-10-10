// ============================================================================
// ACE-DSP-004 Focused Diagnostics v1.0 RC1 | 2026-10-10
// READ-ONLY. Investigates disposition <-> report links and source E1 metadata.
// Uses existing ACE Batch B source adapters and canonical evaluator.
// Does NOT write sheets, Drive, properties, logs, triggers or business data.
// No raw audit detail, employee names, attachment URLs or letter content logged.
// ============================================================================

var ACE_DSP004_DIAGNOSTICS_V10_VERSION_ = 'ACE-DSP004-DIAG-v1.0-RC1-2026.10.10.01';
var ACE_DSP004_DIAGNOSTICS_MAX_LOG_CASES_ = 12;
var ACE_DSP004_DIAGNOSTICS_MAX_EVENTS_PER_CASE_ = 6;

function aceDsp004TextV10_(value) {
  return value===null||value===undefined?'':String(value).trim();
}
function aceDsp004HasV10_(obj,key) {
  return !!obj&&Object.prototype.hasOwnProperty.call(obj,key);
}
function aceDsp004SafeActionV10_(value) {
  var s=aceDsp004TextV10_(value).toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,79}$/.test(s)?s:'OTHER_ACTION_REDACTED';
}
function aceDsp004DetailReportIdV10_(detail) {
  if(!detail||typeof detail!=='object'||Array.isArray(detail))return '';
  var keys=['idLaporan','reportId','id_laporan','ID_LAPORAN','idLaporanTerkait','relatedReportId'];
  for(var i=0;i<keys.length;i++){
    var v=detail[keys[i]];
    if(typeof v==='string'&&v.trim())return v.trim();
  }
  return '';
}
function aceDsp004RequireBundleV10_(bundle) {
  if(!bundle||!bundle.disposisi||bundle.disposisi.available!==true||
    !bundle.reports||bundle.reports.available!==true||
    !bundle.index||!Array.isArray(bundle.index.records)||
    !Array.isArray(bundle.reports.records)||
    !Array.isArray(bundle.disposisi.recipients)||
    !Array.isArray(bundle.disposisi.records)||
    !Array.isArray(bundle.disposisi.logs)||
    !bundle.disposisi.byId||!bundle.reports.byId)
    throw new Error('ACE_DSP004_REQUIRED_SOURCE_UNAVAILABLE');
  return true;
}

// Reproduce only the *raw* bi-directional mismatch scan from Batch B.
// RC2 may compensate historical mismatches with E1; do not override its ruling.
function aceDsp004ScanRawV10_(bundle) {
  aceDsp004RequireBundleV10_(bundle);
  var disp=bundle.disposisi, reports=bundle.reports, indexes=bundle.index||{},
    indexById=indexes.byId||Object.create(null),found=[];
  reports.records.forEach(function(r) {
    var dispositionId=aceDsp004TextV10_(r.idDisposisi);
    if(!dispositionId||aceDsp004HasV10_(disp.byId,dispositionId))return;
    var reportId=aceDsp004TextV10_(r.id);
    var idx=indexById[reportId]||null;
    found.push({
      key:'report:'+reportId,
      kind:'REPORT_REFERENCES_ABSENT_DISPOSITION',
      sourceSheet:'Rekap_Kinerja',sourceRow:Number(r.row||0),
      recipientRow:null,reportId:reportId,dispositionId:dispositionId,
      reportFound:true,reportRow:Number(r.row||0),
      reportDispositionId:dispositionId,
      dispositionFound:false,
      recipientOwnerMatchesReportOwner:null,
      indexFound:!!idx,indexRow:idx?Number(idx.row||0):null,
      indexRekapRow:idx?Number(idx.rowRekap||0):null,
      indexDispositionId:idx?aceDsp004TextV10_(idx.idDisposisi):null,
      indexMatchesReport:!!idx&&
        Number(idx.rowRekap||0)===Number(r.row||0)&&
        aceDsp004TextV10_(idx.idDisposisi)===dispositionId
    });
  });
  disp.recipients.forEach(function(r) {
    var reportId=aceDsp004TextV10_(r.reportId);
    if(!reportId)return;
    var dispositionId=aceDsp004TextV10_(r.idDisposisi);
    var report=reports.byId[reportId]||null;
    var idx=indexById[reportId]||null;
    if(report&&aceDsp004TextV10_(report.idDisposisi)===dispositionId)return;
    var kind=!report?'RECIPIENT_REFERENCES_ABSENT_REPORT':
      !aceDsp004TextV10_(report.idDisposisi)?'RECIPIENT_REPORT_REVERSE_LINK_EMPTY':
      'RECIPIENT_REPORT_REFERENCES_OTHER_DISPOSITION';
    found.push({
      key:'recipient:'+String(r.row),
      kind:kind,
      sourceSheet:'Disposisi_Penerima',sourceRow:Number(r.row||0),
      recipientRow:Number(r.row||0),reportId:reportId,
      dispositionId:dispositionId,
      reportFound:!!report,reportRow:report?Number(report.row||0):null,
      reportDispositionId:report?aceDsp004TextV10_(report.idDisposisi):null,
      dispositionFound:aceDsp004HasV10_(disp.byId,dispositionId),
      recipientOwnerMatchesReportOwner:report?
        aceDsp004TextV10_(r.idUser)===aceDsp004TextV10_(report.idUser):null,
      indexFound:!!idx,indexRow:idx?Number(idx.row||0):null,
      indexRekapRow:idx?Number(idx.rowRekap||0):null,
      indexDispositionId:idx?aceDsp004TextV10_(idx.idDisposisi):null,
      indexMatchesReport:!!idx&&!!report&&
        Number(idx.rowRekap||0)===Number(report.row||0)&&
        aceDsp004TextV10_(idx.idDisposisi)===aceDsp004TextV10_(report.idDisposisi)
    });
  });
  return found;
}

function aceDsp004FindEvidenceV10_(bundle,issue) {
  var related=(bundle.disposisi.logs||[]).filter(function(l) {
    var byDisposition=aceDsp004TextV10_(l.idDisposisi)===issue.dispositionId;
    var byTarget=!!issue.reportId&&aceDsp004TextV10_(l.targetId)===issue.reportId;
    var byJson=!!issue.reportId&&
      aceDsp004DetailReportIdV10_(l.detailJson)===issue.reportId;
    return byDisposition||byTarget||byJson;
  });
  related.sort(function(a,b){return Number(a.row||0)-Number(b.row||0);});
  var directTargetCount=related.filter(function(l){
    return aceDsp004TextV10_(l.targetId)===issue.reportId ||
      aceDsp004DetailReportIdV10_(l.detailJson)===issue.reportId;
  }).length;
  var sample=related.slice(-ACE_DSP004_DIAGNOSTICS_MAX_EVENTS_PER_CASE_).map(function(l){
    return {
      auditRow:Number(l.row||0),at:aceDsp004TextV10_(l.waktu).slice(0,40),
      action:aceDsp004SafeActionV10_(l.action),
      targetType:aceDsp004SafeActionV10_(l.targetType),
      actorRecorded:!!aceDsp004TextV10_(l.actorId),
      sameDisposition:aceDsp004TextV10_(l.idDisposisi)===issue.dispositionId,
      reportIdInTarget:aceDsp004TextV10_(l.targetId)===issue.reportId,
      reportIdInStructuredDetail:
        aceDsp004DetailReportIdV10_(l.detailJson)===issue.reportId
    };
  });
  return {
    relatedDispositionLogCount:related.length,
    explicitReportTargetEventCount:directTargetCount,
    lastLogEvents:sample,
    // E1 metadata presence is not itself proof of a valid historic linkage.
    historicalE1Compensation:'NOT_DETERMINED_BY_DIAGNOSTIC'
  };
}

function aceDsp004EnrichV10_(bundle,issue) {
  var disp=bundle.disposisi;
  var parent=disp.byId[issue.dispositionId]||null;
  var recCount=disp.recipients.filter(function(r) {
    return aceDsp004TextV10_(r.idDisposisi)===issue.dispositionId&&
      aceDsp004TextV10_(r.reportId)===issue.reportId;
  }).length;
  var tip=issue.kind==='RECIPIENT_REFERENCES_ABSENT_REPORT'?
    (issue.indexFound?'CHECK_INDEX_ONLY_REPORT_AND_BACKUP':
      'CHECK_REPORT_HISTORY_BACKUP_AND_CREATION_EVENTS'):
    issue.kind==='RECIPIENT_REPORT_REVERSE_LINK_EMPTY'?
      'CHECK_HISTORICAL_E1_AND_REPORT_SOURCE':
    issue.kind==='REPORT_REFERENCES_ABSENT_DISPOSITION'?
      'CHECK_DISPOSITION_HISTORY_AND_BACKUP':
      'CHECK_CONFLICTING_DISPOSITION_LINK';
  return Object.assign({},issue,{
    dispositionSheetRow:parent?Number(parent.row||0):null,
    matchingRecipientReportPairs:recCount,
    triageSuggestion:tip,
    sourceEvidence:aceDsp004FindEvidenceV10_(bundle,issue),
    classification:'INVESTIGATION_REQUIRED_NOT_AUTO_REPAIRED'
  });
}

// Re-check source row IDs after the broad source snapshot; fail closed if changed.
function aceDsp004VerifyAnchorV10_(ss,issue) {
  if(typeof SHEET_COLUMNS==='undefined')return false;
  var isRecipient=issue.sourceSheet==='Disposisi_Penerima';
  var C=isRecipient?SHEET_COLUMNS.DISPOSISI_PENERIMA:SHEET_COLUMNS.REKAP_KINERJA;
  var sheet=ss.getSheetByName(issue.sourceSheet),row=Number(issue.sourceRow||0);
  if(!sheet||!C||row<2||row>sheet.getLastRow())return false;
  var idCol=isRecipient?C.ID_LAPORAN_TERKAIT:C.ID_LAPORAN;
  var dispCol=isRecipient?C.ID_DISPOSISI:C.ID_DISPOSISI;
  if(typeof idCol!=='number'||typeof dispCol!=='number')return false;
  var cols=Math.max(idCol,dispCol)+1;
  var rec=sheet.getRange(row,1,1,cols).getValues()[0]||[];
  if(aceDsp004TextV10_(rec[idCol])!==issue.reportId||
    aceDsp004TextV10_(rec[dispCol])!==issue.dispositionId)return false;
  if(issue.indexFound&&issue.indexRow){
    var I=SHEET_COLUMNS.INDEX_LAPORAN,idx=ss.getSheetByName('Index_Laporan');
    if(!I||!idx||issue.indexRow>idx.getLastRow())return false;
    if(aceDsp004TextV10_(idx.getRange(issue.indexRow,I.ID_LAPORAN+1).getValue())!==issue.reportId)
      return false;
  }
  return true;
}

function aceDsp004ReportV10_(bundle,ss) {
  aceDsp004RequireBundleV10_(bundle);
  var raw=aceDsp004ScanRawV10_(bundle),canonical=aceBv10EvalControl_('ACE-DSP-004',bundle);
  if(!canonical||canonical.controlId!=='ACE-DSP-004')
    throw new Error('ACE_DSP004_CANONICAL_EVALUATOR_INVALID');
  var issues=raw.map(function(item){
    var detail=aceDsp004EnrichV10_(bundle,item);
    detail.sourceAnchorVerified=ss?aceDsp004VerifyAnchorV10_(ss,detail):null;
    return detail;
  });
  var counts=Object.create(null);
  issues.forEach(function(r){counts[r.kind]=(counts[r.kind]||0)+1;});
  var checked=ss?issues.every(function(r){return r.sourceAnchorVerified===true;}):null;
  var reconciliation=String(canonical.explanation||'').split('|')[0].trim().slice(0,240);
  return {
    sukses:checked!==false,
    versi:ACE_DSP004_DIAGNOSTICS_V10_VERSION_,
    controlId:'ACE-DSP-004',period:String(bundle.period||''),
    scope:'GLOBAL_INTEGRITY_WITH_WORKFLOW_PERIOD',
    batchVersion:String(bundle.batchVersion||''),
    canonicalResult:String(canonical.result||''),
    canonicalEvidenceIntegrity:String(canonical.evidenceIntegrity||''),
    canonicalExplanationSummary:reconciliation,
    rawLinkMismatchCount:issues.length,
    rawMismatchByKind:counts,
    sourceSummary:{
      reportRecords:bundle.reports.records.length,
      indexRecords:bundle.index.records.length,
      dispositionRecords:bundle.disposisi.records.length,
      recipientRecords:bundle.disposisi.recipients.length,
      dispositionLogRecords:bundle.disposisi.logs.length
    },
    anchorsAllVerified:checked,
    cases:issues,
    interpretation:'Raw links may include legacy E1-compensated cases in RC2; canonical judgment is authoritative.',
    sourceErrorsPresent:!!(bundle.runtime&&bundle.runtime.errors&&bundle.runtime.errors.length),
    readOnly:true,dataBisnisDiubah:false
  };
}

// PUBLIC MAINTAINER ENTRYPOINTS ------------------------------------------------
function diagnostikACEDsp004V10() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_DSP004_MAINTAINER_GATE_UNAVAILABLE');
  pastikanMaintainerPortal3B0_('ACE_DSP004_DIAGNOSTIC_READ_ONLY');
  if(typeof aceBv10BuildSourceBundle_!=='function'||
     typeof aceBv10EvalControl_!=='function')
    throw new Error('ACE_DSP004_ENGINE_UNAVAILABLE');
  var bundle=aceBv10BuildSourceBundle_({period:'2026-09'});
  var ret=aceDsp004ReportV10_(bundle,getSS_());
  Logger.log('ACE_DSP004_SUMMARY '+JSON.stringify({
    sukses:ret.sukses,versi:ret.versi,batchVersion:ret.batchVersion,
    controlId:ret.controlId,period:ret.period,
    canonicalResult:ret.canonicalResult,
    canonicalEvidenceIntegrity:ret.canonicalEvidenceIntegrity,
    canonicalExplanationSummary:ret.canonicalExplanationSummary,
    rawLinkMismatchCount:ret.rawLinkMismatchCount,
    rawMismatchByKind:ret.rawMismatchByKind,
    sourceSummary:ret.sourceSummary,
    anchorsAllVerified:ret.anchorsAllVerified,
    sourceErrorsPresent:ret.sourceErrorsPresent,
    readOnly:true,dataBisnisDiubah:false
  }));
  var max=ACE_DSP004_DIAGNOSTICS_MAX_LOG_CASES_;
  ret.cases.slice(0,max).forEach(function(c,i){
    Logger.log('ACE_DSP004_CASE '+(i+1)+'/'+ret.cases.length+' '+JSON.stringify(c));
  });
  if(ret.cases.length>max)Logger.log('ACE_DSP004_LOG_LIMIT '+JSON.stringify({
    printed:max,total:ret.cases.length,remaining:ret.cases.length-max
  }));
  if(!ret.sukses)throw new Error('ACE_DSP004_SOURCE_ANCHOR_CHANGED_NO_ACTION');
  return ret;
}

function validasiACEDsp004V10() {
  var checks=[];function check(name,ok){checks.push({nama:name,lulus:ok===true});}
  var r1={id:'R1',row:10,idUser:'U1',idDisposisi:'D1'};
  var r2={id:'R2',row:11,idUser:'U2',idDisposisi:''};
  var r3={id:'R3',row:12,idUser:'U3',idDisposisi:'D2'};
  var r4={id:'R4',row:13,idUser:'U4',idDisposisi:'D-NOT-FOUND'};
  var records=[r1,r2,r3,r4];
  var idx=function(id,row,disp){return {id:id,row:row+100,rowRekap:row,idDisposisi:disp};};
  var indexRecords=[idx('R1',10,'D1'),idx('R2',11,''),idx('R3',12,'D2'),
    idx('R4',13,'D-NOT-FOUND'),idx('R-GONE',14,'D1')];
  var ix=Object.create(null);indexRecords.forEach(function(r){ix[r.id]=r;});
  var dispoRecords=[{id:'D1',row:2},{id:'D2',row:3}];
  var dispoById=Object.create(null);dispoRecords.forEach(function(r){dispoById[r.id]=r;});
  var recipients=[
    {row:622,idDisposisi:'D1',reportId:'R-GONE',idUser:'U5'},
    {row:623,idDisposisi:'D1',reportId:'R2',idUser:'U2'},
    {row:624,idDisposisi:'D1',reportId:'R3',idUser:'U3'},
    {row:625,idDisposisi:'D1',reportId:'R1',idUser:'U1'}
  ];
  var logs=[
    {row:40,idDisposisi:'D1',targetId:'R2',targetType:'REPORT',action:'LINK_REPORT',
      actorId:'U2',waktu:'2026-09-01T00:00:00Z'},
    {row:41,idDisposisi:'D1',targetId:'R1',action:'OTHER_EVENT',
      actorName:'SENSITIVE_PERSON_NAME',detail:'SENSITIVE_PERSON_NAME'},
    {row:42,idDisposisi:'D2',targetId:'',action:'REVIEW'},
    {row:43,idDisposisi:'OTHER',targetId:'',detailJson:{reportId:'R-GONE'},
      action:'REPORT_ATTEMPT'}
  ];
  var bundle={
    period:'2026-09',batchVersion:'SYNTHETIC',
    reports:{available:true,records:records,byId:{R1:r1,R2:r2,R3:r3,R4:r4}},
    index:{records:indexRecords,byId:ix},
    disposisi:{available:true,records:dispoRecords,byId:dispoById,
      recipients:recipients,logs:logs}
  };
  var raw=aceDsp004ScanRawV10_(bundle);
  check('RAW_FOUR_CASES',raw.length===4);
  check('REPORT_MISSING_DISPOSITION',raw.some(function(x){
    return x.key==='report:R4'&&x.kind==='REPORT_REFERENCES_ABSENT_DISPOSITION';}));
  check('RECIPIENT_REPORT_NOT_FOUND',raw.some(function(x){
    return x.key==='recipient:622'&&x.kind==='RECIPIENT_REFERENCES_ABSENT_REPORT';}));
  check('RECIPIENT_BLANK_REVERSE',raw.some(function(x){
    return x.key==='recipient:623'&&x.kind==='RECIPIENT_REPORT_REVERSE_LINK_EMPTY';}));
  check('RECIPIENT_OTHER_DISPOSITION',raw.some(function(x){
    return x.key==='recipient:624'&&x.kind==='RECIPIENT_REPORT_REFERENCES_OTHER_DISPOSITION';}));
  check('VALID_RECIPIENT_SKIPPED',!raw.some(function(x){return x.key==='recipient:625';}));
  check('INDEX_ONLY_DISCOVERED',raw.some(function(x){
    return x.key==='recipient:622'&&x.indexFound&&x.reportFound===false;}));
  var gap=aceDsp004EnrichV10_(bundle,raw.filter(function(x){
    return x.key==='recipient:623';})[0]);
  check('TRACE_EXPLICIT_REPORT_TARGET',gap.sourceEvidence.explicitReportTargetEventCount===1);
  check('TRACE_NO_UNRELATED_EVENTS',gap.sourceEvidence.relatedDispositionLogCount===2);
  check('TRACE_NOT_AUTOMATIC_WAIVER',
    gap.sourceEvidence.historicalE1Compensation==='NOT_DETERMINED_BY_DIAGNOSTIC');
  check('NO_PRIVATE_DETAILS_IN_RESULT',JSON.stringify(gap).indexOf('SENSITIVE_PERSON_NAME')===-1&&
    JSON.stringify(gap).indexOf('U2')===-1);
  var none={period:'2026-09',reports:{available:true,records:[r1],byId:{R1:r1}},
    index:{records:[],byId:{}},
    disposisi:{available:true,records:dispoRecords,byId:dispoById,
      recipients:[recipients[3]],logs:[]}};
  check('CORRECT_LINKS_NO_CASES',aceDsp004ScanRawV10_(none).length===0);
  var rejected=false;
  try{aceDsp004ScanRawV10_({reports:{available:false,records:[]}});}catch(e){rejected=true;}
  check('MISSING_SOURCE_BLOCKED',rejected);
  check('SAFE_ACTION_REDACTION',aceDsp004SafeActionV10_('PRIVATE person name')==='OTHER_ACTION_REDACTED');
  check('EXPLICIT_STRUCTURED_REPORT_ID',
    aceDsp004DetailReportIdV10_({idLaporan:'R1'})==='R1');
  check('NO_GUESS_FROM_FREE_TEXT',
    aceDsp004DetailReportIdV10_({message:'R1'})==='');
  var failed=checks.filter(function(c){return !c.lulus;});
  var ret={sukses:failed.length===0,lulus:checks.length-failed.length,
    gagal:failed.length,checks:checks,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_VALIDATION '+JSON.stringify(ret));return ret;
}
