// ============================================================================
// PHA-07B | TRANSACTION & QUEUE INTEGRITY ACCEPTANCE RC1 | 2026-10-11
// READ-ONLY + PURE IN-MEMORY SIMULATION -- SANDBOX-ONLY.
// Install ONLY in the separate SANDBOX_PHA_RC1_SCRIPT_TEST Apps Script project.
// Requires prior PHA-07 and PHA-08 test helpers. NO spreadsheet writes.
// No queue sheet is created; NO production scripts/IDs or triggers are accessed.
// "PROPOSED_SAFE_POLICY" checks are advisory; not live production enforcement.
// ============================================================================
var PHA07B_VERSION_RC1='PHA07B-TXN-QUEUE-RC1-2026.10.11.01';

function pha07bAssertRC1_(test,reason){
  if(!test)throw new Error('PHA07B_STOP_'+reason);
}
function pha07bTextRC1_(v){
  return v===undefined||v===null?'':String(v).trim();
}
function pha07bIdRC1_(v){return pha07bTextRC1_(v).toLowerCase();}
function pha07bSameRC1_(a,b){return pha07bIdRC1_(a)===pha07bIdRC1_(b);}
function pha07bModelQueueRC1_(x){
  x=x||{};
  var action=pha07bTextRC1_(x.operation).toUpperCase();
  var status=pha07bTextRC1_(x.status).toUpperCase();
  var attempts=Number(x.attempts);
  if(!Number.isInteger(attempts)||attempts<0)
    return {productionEligible:false,proposed:'BLOCK_INVALID_ATTEMPTS'};
  if(['PENDING','RETRY','FAILED'].indexOf(status)<0)
    return {productionEligible:false,proposed:'SKIP_NON_RETRY_STATUS'};
  if(attempts>=5)
    return {productionEligible:false,proposed:'SKIP_ATTEMPT_LIMIT'};
  if(action==='FULL_REBUILD')
    return {productionEligible:true,proposed:'REQUIRE_MANUAL_REBUILD'};
  if(action==='ROW'){
    // Production 2B1 queue ROW item stores row pointer only, not a report ID.
    // Production eligible is true, but replay after manual row deletion/reuse
    // is NOT evidence that the original queued report was safely reconciled.
    return {productionEligible:true,proposed:'HUMAN_REVIEW_ROW_UNBOUND',
      originalReportIdentityVerified:false};
  }
  if(action==='BY_ID'){
    var id=pha07bIdRC1_(x.reportId);
    return {productionEligible:true,
      proposed:id&&pha07bSameRC1_(id,x.currentSourceId)?
        'EXACT_ID_CANDIDATE_FOR_SANDBOX_TEST':'HOLD_ID_SOURCE_MISMATCH',
      originalReportIdentityVerified:!!(id&&pha07bSameRC1_(id,x.currentSourceId))};
  }
  if(action==='BY_NONCE'){
    var user=pha07bIdRC1_(x.userId),nonce=pha07bTextRC1_(x.nonce);
    var ok=!!(user&&nonce&&pha07bSameRC1_(user,x.currentSourceOwner)&&
      nonce===pha07bTextRC1_(x.currentSourceNonce));
    return {productionEligible:true,proposed:ok?
      'OWNER_AND_NONCE_CANDIDATE_FOR_SANDBOX_TEST':'HOLD_NONCE_OWNER_MISMATCH',
      originalReportIdentityVerified:ok};
  }
  return {productionEligible:true,proposed:'HOLD_UNKNOWN_OPERATION'};
}
function pha07bSimulatedTxRC1_(opts){
  opts=opts||{};
  var step=pha07bTextRC1_(opts.failureAt).toUpperCase();
  var stages=['SOURCE_APPEND','INDEX_SYNC','AUDIT_APPEND',
    'RECIPIENT_UPDATE','DISPOSITION_LOG'];
  var state={modelOnly:true,transactionAtomic:false,
    sourceCommitted:false,indexConsistent:false,auditPresent:false,
    recipientLinked:false,dispositionLogPresent:false,
    queueMode:'NONE',terminalStage:'COMPLETE',manualReconciliationRequired:false,
    applicationMayReturnSuccess:false};
  for(var i=0;i<stages.length;i++){
    var stage=stages[i];
    if(stage===step){
      state.terminalStage='ERROR_AT_'+stage;
      if(stage==='INDEX_SYNC'){
        state.queueMode='PENDING_ROW_UNBOUND'; // 2B1 wrapper can enqueue
        state.applicationMayReturnSuccess=true; // source append already committed
      }else if(stage==='AUDIT_APPEND'){
        state.applicationMayReturnSuccess=true; // logAudit_ swallows errors
      }else if(stage==='RECIPIENT_UPDATE'){
        state.applicationMayReturnSuccess=true; // caller catches exception
      }else if(stage==='DISPOSITION_LOG'){
        state.applicationMayReturnSuccess=true; // logDisposisi_ swallows errors
      }
      state.manualReconciliationRequired=state.sourceCommitted&&
        (!state.indexConsistent||!state.auditPresent||
         (opts.withDisposition!==false&&
          (!state.recipientLinked||!state.dispositionLogPresent)));
      return state;
    }
    if(stage==='SOURCE_APPEND')state.sourceCommitted=true;
    if(stage==='INDEX_SYNC')state.indexConsistent=true;
    if(stage==='AUDIT_APPEND')state.auditPresent=true;
    if(stage==='RECIPIENT_UPDATE')state.recipientLinked=opts.withDisposition!==false;
    if(stage==='DISPOSITION_LOG')state.dispositionLogPresent=opts.withDisposition!==false;
  }
  state.applicationMayReturnSuccess=true;
  return state;
}
function pha07bSimulatedReviewRC1_(opts){
  opts=opts||{};
  var exists=opts.sourceExists===true,
      idx=opts.indexWriteSucceeded===true,
      same=pha07bSameRC1_(opts.sourceId,opts.targetId);
  if(!exists||!same||!pha07bTextRC1_(opts.sourceId))
    return {modelOnly:true,sourceUpdated:false,indexUpdated:false,
      manualReviewRequired:true,reason:'EXACT_REPORT_ID_REQUIRED'};
  return {modelOnly:true,sourceUpdated:true,indexUpdated:idx,
    manualReviewRequired:!idx,
    reason:idx?'CONSISTENT_REVIEW':'REVIEW_SOURCE_INDEX_DIVERGENCE'};
}
function pha07bEvidenceRC1_(d){
  d=d||{};
  var errs=[],reports=d.reports,indexes=d.indexes,
      recipient=d.recipient,audits=d.audits,logs=d.dispositionLogs;
  function require(test,code){if(!test)errs.push(code);}
  require(Array.isArray(reports)&&reports.length===2,'REKAP_COUNT');
  require(Array.isArray(indexes)&&indexes.length===2,'INDEX_COUNT');
  require(Array.isArray(recipient)&&recipient.length===1,'RECIPIENT_COUNT');
  require(Array.isArray(audits)&&audits.length===2,'AUDIT_COUNT');
  require(Array.isArray(logs)&&logs.length===1,'DISPOSITION_LOG_COUNT');
  if(errs.length)return {ok:false,errorCodes:errs};
  var expected=['PHA-TEST-RPT-0001','PHA-TEST-RPT-0002'],seen={},seenNonces={};
  for(var i=0;i<2;i++){
    var R=reports[i]||[],I=indexes[i]||[],
        id=pha07bIdRC1_(expected[i]),audit=audits[i]||[];
    require(pha07bSameRC1_(R[18],id),'REKAP_ID_'+i);
    require(pha07bSameRC1_(I[0],id),'INDEX_ID_'+i);
    require(Number(I[1])===i+2,'INDEX_ROW_POINTER_'+i);
    require(pha07bSameRC1_(R[19],I[2]),'INDEX_OWNER_'+i);
    require(pha07bTextRC1_(R[21])===pha07bTextRC1_(I[9]),'INDEX_NONCE_'+i);
    require(pha07bTextRC1_(R[8])===pha07bTextRC1_(I[6]),'REVIEW_STATUS_'+i);
    require(Number(R[9])===Number(I[7]),'REVIEW_POINTS_'+i);
    require(pha07bSameRC1_(R[26],I[8]),'INDEX_DISPOSITION_'+i);
    require(pha07bTextRC1_(audit[2])==='SUBMIT_LAPORAN','SUBMIT_AUDIT_ACTION_'+i);
    require(pha07bSameRC1_(audit[1],R[19]),'SUBMIT_AUDIT_ACTOR_'+i);
    require(pha07bSameRC1_(audit[3],id),'SUBMIT_AUDIT_TARGET_'+i);
    require(!Object.prototype.hasOwnProperty.call(seen,id),'DUPLICATE_REPORT_ID');
    seen[id]=true;
    var nk=pha07bIdRC1_(R[19])+'|'+pha07bTextRC1_(R[21]);
    require(!!pha07bIdRC1_(R[19])&&!!pha07bTextRC1_(R[21]),
      'MISSING_OWNER_OR_NONCE_'+i);
    require(!Object.prototype.hasOwnProperty.call(seenNonces,nk),
      'DUPLICATE_OWNER_NONCE');
    seenNonces[nk]=true;
  }
  var r0=reports[0]||[],p=recipient[0]||[],log=logs[0]||[];
  require(pha07bSameRC1_(p[0],r0[26]),'RECIPIENT_DISPOSITION');
  require(pha07bSameRC1_(p[1],r0[19]),'RECIPIENT_OWNER');
  require(pha07bSameRC1_(p[7],r0[18]),'RECIPIENT_REPORT');
  require(pha07bTextRC1_(p[6])==='SUDAH_DILAPORKAN','RECIPIENT_STATUS');
  require(pha07bSameRC1_(log[1],p[0]),'DISPOSITION_LOG_DISPOSITION');
  require(pha07bSameRC1_(log[3],p[1]),'DISPOSITION_LOG_ACTOR');
  require(pha07bTextRC1_(log[2])==='BUAT_LAPORAN_DARI_DISPOSISI',
    'DISPOSITION_LOG_ACTION');
  require(pha07bTextRC1_(log[6])==='Laporan terkait: '+pha07bTextRC1_(r0[18]),
    'DISPOSITION_LOG_DETAIL_EXACT');
  require(pha07bSameRC1_(log[10],r0[18]),'DISPOSITION_LOG_TARGET');
  return {ok:errs.length===0,errorCodes:errs,syntheticReportsChecked:2,
    indexedReportsChecked:2,submitAuditRowsChecked:2,
    recipientLinksChecked:1,dispositionCreateLogsChecked:1};
}
function pha07bSyntheticFixtureRC1_(){
  function row(width){var a=[];for(var i=0;i<width;i++)a.push('');return a;}
  var r1=row(27),r2=row(27);
  r1[18]='PHA-TEST-RPT-0001';r1[19]='PHA-TEST-USR-0001';
  r1[21]='PHA-TEST-NONCE-0001';r1[8]='Menunggu Review';
  r1[9]=0;r1[26]='PHA-TEST-DSP-0001';
  r2[18]='PHA-TEST-RPT-0002';r2[19]='PHA-TEST-USR-0002';
  r2[21]='PHA-TEST-NONCE-0002';r2[8]='Disetujui';r2[9]=2;
  var i1=['PHA-TEST-RPT-0001',2,'PHA-TEST-USR-0001','', '',
    'Kegiatan Uji','Menunggu Review',0,'PHA-TEST-DSP-0001',
    'PHA-TEST-NONCE-0001','',''];
  var i2=['PHA-TEST-RPT-0002',3,'PHA-TEST-USR-0002','', '',
    'Kegiatan Uji','Disetujui',2,'','PHA-TEST-NONCE-0002','',''];
  var p=row(12);p[0]='PHA-TEST-DSP-0001';p[1]='PHA-TEST-USR-0001';
  p[6]='SUDAH_DILAPORKAN';p[7]='PHA-TEST-RPT-0001';
  var l=row(14);l[1]='PHA-TEST-DSP-0001';l[2]='BUAT_LAPORAN_DARI_DISPOSISI';
  l[3]='PHA-TEST-USR-0001';
  l[6]='Laporan terkait: PHA-TEST-RPT-0001';l[10]='PHA-TEST-RPT-0001';
  return {reports:[r1,r2],indexes:[i1,i2],recipient:[p],
    audits:[['','PHA-TEST-USR-0001','SUBMIT_LAPORAN','PHA-TEST-RPT-0001'],
      ['','PHA-TEST-USR-0002','SUBMIT_LAPORAN','PHA-TEST-RPT-0002']],
    dispositionLogs:[l]};
}
function validasiLogikaPHA07BRC1(){
  // No Sheets, Drive, trigger, time or network APIs used here.
  var t=[];function ck(name,pass){t.push({name:name,pass:pass===true});}
  var base=pha07bSyntheticFixtureRC1_(),
      copy=function(x){return JSON.parse(JSON.stringify(x));};
  ck('FIXTURE_CONSISTENT',pha07bEvidenceRC1_(base).ok);
  var bad=copy(base);bad.indexes[1][0]='PHA-TEST-RPT-OTHER';
  ck('FOREIGN_INDEX_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.indexes[0][1]=3;
  ck('POINTER_MISMATCH_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.indexes[1][6]='Menunggu Review';
  ck('REVIEW_STATUS_DIVERGENCE_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.indexes[1][7]=0;
  ck('REVIEW_SCORE_DIVERGENCE_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.audits[0][1]='PHA-TEST-USR-OTHER';
  ck('AUDIT_OWNER_MISMATCH_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.recipient[0][7]='PHA-TEST-RPT-OTHER';
  ck('RECIPIENT_LINK_MISMATCH_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.dispositionLogs[0][6]='Laporan terkait: OTHER';
  ck('DISPOSITION_LOG_DETAIL_MISMATCH_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.reports[1][18]=bad.reports[0][18];
  ck('DUPLICATE_SOURCE_ID_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  bad=copy(base);bad.reports[1][19]=bad.reports[0][19];
  bad.reports[1][21]=bad.reports[0][21];
  bad.indexes[1][2]=bad.indexes[0][2];
  bad.indexes[1][9]=bad.indexes[0][9];
  bad.audits[1][1]=bad.audits[0][1];
  ck('DUPLICATE_OWNER_NONCE_DETECTED',!pha07bEvidenceRC1_(bad).ok);
  var q=pha07bModelQueueRC1_;
  ck('QUEUE_PENDING_ROW_UNBOUND',
    q({operation:'ROW',status:'PENDING',attempts:0}).proposed===
    'HUMAN_REVIEW_ROW_UNBOUND');
  ck('QUEUE_FAILED_UNDER_LIMIT_ELIGIBLE',
    q({operation:'ROW',status:'FAILED',attempts:4}).productionEligible===true);
  ck('QUEUE_AT_LIMIT_SKIPPED',
    q({operation:'ROW',status:'FAILED',attempts:5}).productionEligible===false);
  ck('QUEUE_DONE_SKIPPED',
    q({operation:'ROW',status:'DONE',attempts:0}).productionEligible===false);
  ck('QUEUE_FULL_REBUILD_MANUAL',
    q({operation:'FULL_REBUILD',status:'PENDING',attempts:0}).proposed===
    'REQUIRE_MANUAL_REBUILD');
  ck('QUEUE_BY_ID_EXACT_ALLOWED_CANDIDATE',
    q({operation:'BY_ID',status:'PENDING',attempts:0,
      reportId:'PHA-TEST-RPT-0001',
      currentSourceId:'PHA-TEST-RPT-0001'}).originalReportIdentityVerified===true);
  ck('QUEUE_BY_ID_MISMATCH_HELD',
    q({operation:'BY_ID',status:'PENDING',attempts:0,
      reportId:'PHA-TEST-RPT-0001',
      currentSourceId:'PHA-TEST-RPT-0002'}).proposed==='HOLD_ID_SOURCE_MISMATCH');
  ck('QUEUE_BY_NONCE_OWNER_CANDIDATE',
    q({operation:'BY_NONCE',status:'PENDING',attempts:0,
      userId:'PHA-TEST-USR-0001',nonce:'NONCE-A',
      currentSourceOwner:'PHA-TEST-USR-0001',
      currentSourceNonce:'NONCE-A'}).originalReportIdentityVerified===true);
  ck('QUEUE_BY_NONCE_OWNER_MISMATCH_HELD',
    q({operation:'BY_NONCE',status:'PENDING',attempts:0,
      userId:'PHA-TEST-USR-0001',nonce:'NONCE-A',
      currentSourceOwner:'PHA-TEST-USR-0002',
      currentSourceNonce:'NONCE-A'}).proposed==='HOLD_NONCE_OWNER_MISMATCH');
  ck('QUEUE_UNKNOWN_OPERATION_HELD',
    q({operation:'UNEXPECTED',status:'RETRY',attempts:1}).proposed===
    'HOLD_UNKNOWN_OPERATION');
  ck('QUEUE_INVALID_ATTEMPTS_BLOCKED',
    q({operation:'ROW',status:'RETRY',attempts:-1}).productionEligible===false);
  var tx=pha07bSimulatedTxRC1_({});
  ck('MODEL_SUCCESS_WITH_NONATOMIC_WARNING',
    tx.sourceCommitted&&tx.indexConsistent&&tx.auditPresent&&
    tx.recipientLinked&&tx.dispositionLogPresent&&tx.transactionAtomic===false);
  tx=pha07bSimulatedTxRC1_({failureAt:'INDEX_SYNC'});
  ck('MODEL_INDEX_FAILED_SOURCE_PERSISTS_AND_QUEUE',
    tx.sourceCommitted&&!tx.indexConsistent&&
    tx.queueMode==='PENDING_ROW_UNBOUND'&&tx.manualReconciliationRequired);
  tx=pha07bSimulatedTxRC1_({failureAt:'AUDIT_APPEND'});
  ck('MODEL_AUDIT_FAILURE_NOT_ROLLBACK',
    tx.sourceCommitted&&tx.indexConsistent&&!tx.auditPresent&&
    tx.applicationMayReturnSuccess);
  tx=pha07bSimulatedTxRC1_({failureAt:'RECIPIENT_UPDATE'});
  ck('MODEL_RECIPIENT_FAILURE_NOT_ROLLBACK',
    tx.sourceCommitted&&tx.indexConsistent&&!tx.recipientLinked&&
    tx.manualReconciliationRequired);
  tx=pha07bSimulatedTxRC1_({failureAt:'DISPOSITION_LOG'});
  ck('MODEL_DISPOSITION_LOG_FAILURE_NOT_ROLLBACK',
    tx.sourceCommitted&&tx.indexConsistent&&tx.recipientLinked&&
    !tx.dispositionLogPresent&&tx.manualReconciliationRequired);
  ck('MODEL_REVIEW_ID_REQUIRED',
    !pha07bSimulatedReviewRC1_({sourceExists:true,sourceId:'A',
      targetId:'B',indexWriteSucceeded:true}).sourceUpdated);
  ck('MODEL_REVIEW_INDEX_DIVERGENCE',
    pha07bSimulatedReviewRC1_({sourceExists:true,sourceId:'A',
      targetId:'A',indexWriteSucceeded:false}).manualReviewRequired);
  ck('MODEL_REVIEW_SYNC_OK',
    !pha07bSimulatedReviewRC1_({sourceExists:true,sourceId:'A',
      targetId:'A',indexWriteSucceeded:true}).manualReviewRequired);
  ck('WRITE_FLAGS_NOT_REFERENCED_IN_PURE_MODEL',true);
  var fail=t.filter(function(x){return !x.pass;});
  var output={sukses:fail.length===0,lulus:t.length-fail.length,
    gagal:fail.length,checks:t,readOnly:true,dataBisnisDiubah:false,
    classification:'PURE_IN_MEMORY_ONLY'};
  Logger.log('PHA07B_PURE_VALIDATION '+JSON.stringify(output));
  return output;
}
function pha07bReadSandboxRC1_(){
  pha07bAssertRC1_(typeof pha08RequireFixtureRC1_==='function'&&
    typeof PHA07_ALLOW_WRITE_RC1!=='undefined'&&
    typeof PHA08_ALLOW_WRITE_RC1!=='undefined',
    'PREREQUISITE_PHA07_PHA08_NOT_PRESENT');
  pha07bAssertRC1_(PHA07_ALLOW_WRITE_RC1===false&&
    PHA08_ALLOW_WRITE_RC1===false,'PREVIOUS_WRITE_FLAGS_NOT_DISABLED');
  // Existing guard verifies exact sandbox ID, exact title, 6 tabs,
  // protected sheet editor and all test fixture IDs/nonce/date text baseline.
  var verified=pha08RequireFixtureRC1_();
  var ss=verified.ss;
  pha07bAssertRC1_(!ss.getSheetByName('Index_Laporan_Sync_Queue'),
    'UNEXPECTED_LIVE_QUEUE_TAB_IN_SIX_TAB_FIXTURE');
  var sheets={
    reports:ss.getSheetByName('Rekap_Kinerja'),
    indexes:ss.getSheetByName('Index_Laporan'),
    recipient:ss.getSheetByName('Disposisi_Penerima'),
    audits:ss.getSheetByName('Audit_Log'),
    dispositionLogs:ss.getSheetByName('Disposisi_Log')
  };
  pha07bAssertRC1_(sheets.reports.getLastRow()===3&&
    sheets.indexes.getLastRow()===3&&
    sheets.recipient.getLastRow()===2&&
    sheets.audits.getLastRow()===3&&
    sheets.dispositionLogs.getLastRow()===2,'FIXTURE_ROW_COUNTS_CHANGED');
  // Read only the specific bounded data needed for five canonical relationships.
  var values={
    reports:sheets.reports.getRange(2,1,2,27).getValues(),
    indexes:sheets.indexes.getRange(2,1,2,12).getValues(),
    recipient:sheets.recipient.getRange(2,1,1,12).getValues(),
    audits:sheets.audits.getRange(2,1,2,4).getValues(),
    dispositionLogs:sheets.dispositionLogs.getRange(2,1,1,14).getValues()
  };
  var evidence=pha07bEvidenceRC1_(values);
  pha07bAssertRC1_(evidence.ok,
    'RELATIONSHIPS_'+(evidence.errorCodes[0]||'UNKNOWN'));
  return evidence;
}
function diagnostikTransaksiAntreanPHA07BRC1(){
  var out={sukses:false,versi:PHA07B_VERSION_RC1,mode:'READ_ONLY',
    sandboxFixtureVerified:false,sourceIndexAuditDispositionConsistent:false,
    queueSheetTouched:false,queueSimulatedOnly:true,
    writeGatesDisabled:false,productionDataWritten:false,
    fullTransactionAcceptanceApproved:false,
    productionRolloutAuthorized:false};
  try {
    var evidence=pha07bReadSandboxRC1_();
    out.sukses=true;
    out.sandboxFixtureVerified=true;
    out.sourceIndexAuditDispositionConsistent=true;
    out.writeGatesDisabled=true;
    out.checks={
      syntheticReports:evidence.syntheticReportsChecked,
      indexedReports:evidence.indexedReportsChecked,
      submitAudits:evidence.submitAuditRowsChecked,
      recipientLinks:evidence.recipientLinksChecked,
      dispositionCreateLogs:evidence.dispositionCreateLogsChecked};
    out.queueRiskDecisions={
      rowPointerOnly:pha07bModelQueueRC1_({
        operation:'ROW',status:'PENDING',attempts:0}).proposed,
      fullRebuild:pha07bModelQueueRC1_({
        operation:'FULL_REBUILD',status:'PENDING',attempts:0}).proposed,
      sourcePersistedOnIndexFailure:
        pha07bSimulatedTxRC1_({failureAt:'INDEX_SYNC'}).sourceCommitted};
  }catch(e){
    var message=String(e&&e.message||'UNKNOWN');
    out.stopCode=(/^PHA0(?:7|8|7B)_STOP_/.test(message)?message:
      'PHA07B_STOP_UNEXPECTED_READ_OR_AUTH').slice(0,165);
  }
  Logger.log('PHA07B_PREFLIGHT '+JSON.stringify(out));
  return out;
}
