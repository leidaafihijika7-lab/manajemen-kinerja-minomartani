// ============================================================================
// PHA-07B B1 | SYNTHETIC TRANSACTION & QUEUE FAILURE INJECTION | RC1
// DATE: 2026-10-11   VERSION: PHA07B-B1-FAULT-RC1-2026.10.11.02
// ONLY install in a NEW standalone project SANDBOX_PHA07B_B1_SCRIPT_TEST.
// This is a TEST HARNESS, NOT a copy of the live production transaction code.
// B1 is a disposable native copy of the verified B0 fixture.
// NO deployments, triggers, Script Properties, production IDs or real records.
// 1) validasiModelB1PHA07BRC1()             PURE, no Spreadsheet access
// 2) praUjiTransaksiB1PHA07BRC1()           READ-ONLY
// NEVER run the write functions until their preflight has been reviewed.
// ============================================================================
var PHA07B_B1_VERSION_RC1='PHA07B-B1-FAULT-RC1-2026.10.11.02';
var PHA07B_B1_SPREADSHEET_ID='1hldhvaMRo5etOCQlqCYISgvbpAdOIfAJN5IfGa3kD3Q';
var PHA07B_B1_TITLE='SANDBOX_PHA07B_B1_DISPOSABLE_SYNTHETIC_ONLY';
var PHA07B_B1_ALLOW_WRITE_RC1=false; // KEEP FALSE UNTIL HUMAN APPROVAL
var PHA07B_B1_TEST_REPORT_ID='B1-RPT-0003';
var PHA07B_B1_TEST_OWNER_ID='B1-USR-0003';
var PHA07B_B1_TEST_NONCE='B1-NONCE-0003';
var PHA07B_B1_TEST_DISPOSITION='B1-DSP-0003';

function pha07bB1Stop_(condition,code){
  if(!condition)throw new Error('PHA07B_B1_STOP_'+code);
}
function pha07bB1Txt_(v){return v===null||v===undefined?'':String(v).trim();}
function pha07bB1Eq_(a,b){return pha07bB1Txt_(a).toLowerCase()===pha07bB1Txt_(b).toLowerCase();}
function pha07bB1Fingerprint_(a){
  // Encode type BEFORE Date.toJSON() can convert it into an ISO string.
  // Only the in-memory comparison is used; business values are never logged.
  function typed(v){
    if(Object.prototype.toString.call(v)==='[object Date]')
      return ['date',v.getTime()];
    if(Array.isArray(v))return v.map(typed);
    if(v===null)return ['null'];
    return [typeof v,v];
  }
  return JSON.stringify(typed(a));
}
function pha07bB1AllBlank_(cells,formulas){
  for(var i=0;i<cells.length;i++){
    for(var j=0;j<cells[i].length;j++){
      if(!(cells[i][j]===''||cells[i][j]===null))return false;
      if(formulas&&formulas[i]&&formulas[i][j])return false;
    }
  }
  return true;
}
// Advisory proposed safety policy; NOT installed in production handlers.
function pha07bB1QueueDecision_(item,observed){
  item=item||{};observed=observed||{};
  var status=pha07bB1Txt_(item.status).toUpperCase(),
      op=pha07bB1Txt_(item.operation).toUpperCase(),
      n=Number(item.attempts);
  if(!Number.isInteger(n)||n<0)return 'HOLD_INVALID_ATTEMPTS';
  if(['PENDING','RETRY','FAILED'].indexOf(status)<0)return 'SKIP_NON_RETRY_STATUS';
  if(n>=5)return 'SKIP_MAX_ATTEMPTS';
  if(op==='FULL_REBUILD')return 'HOLD_MANUAL_REBUILD';
  if(op==='ROW')return 'HOLD_ROW_UNBOUND_ORIGINAL_ID';
  if(op==='BY_ID'){
    if(!pha07bB1Txt_(item.reportId))return 'HOLD_MISSING_REPORT_ID';
    if(!pha07bB1Eq_(item.reportId,observed.reportId))return 'HOLD_SOURCE_ID_CHANGED';
    if(pha07bB1Txt_(observed.indexId)&&
       !pha07bB1Eq_(item.reportId,observed.indexId))
      return 'HOLD_FOREIGN_INDEX_ID';
    return 'ALLOW_EXACT_ID_RETRY';
  }
  if(op==='BY_NONCE'){
    if(!pha07bB1Txt_(item.userId)||!pha07bB1Txt_(item.nonce))
      return 'HOLD_MISSING_OWNER_NONCE';
    if(!pha07bB1Eq_(item.userId,observed.userId)||
       pha07bB1Txt_(item.nonce)!==pha07bB1Txt_(observed.nonce))
      return 'HOLD_OWNER_NONCE_CHANGED';
    if(observed.ownerNonceUnique!==true)return 'HOLD_NONCE_NOT_UNIQUE';
    if(!pha07bB1Txt_(observed.reportId))return 'HOLD_MISSING_SOURCE_REPORT_ID';
    if(pha07bB1Txt_(observed.indexId)&&
       !pha07bB1Eq_(observed.indexId,observed.reportId))
      return 'HOLD_FOREIGN_INDEX_ID';
    return 'ALLOW_UNIQUE_OWNER_NONCE';
  }
  return 'HOLD_UNKNOWN_OPERATION';
}
function pha07bB1TransactionModel_(failAt){
  var stages=['SOURCE','INDEX','AUDIT','RECIPIENT','DISPOSITION_LOG'];
  var state={modelOnly:true,atomic:false,source:false,index:false,
    audit:false,recipient:false,dispositionLog:false,
    queue:'NONE',manualReview:false,stopAt:'NONE'};
  for(var i=0;i<stages.length;i++){
    var stage=stages[i];
    if(stage===failAt){
      state.stopAt=stage;
      if(stage==='INDEX')state.queue='PENDING_ROW_UNBOUND';
      state.manualReview=state.source;
      return state;
    }
    if(stage==='SOURCE')state.source=true;
    if(stage==='INDEX')state.index=true;
    if(stage==='AUDIT')state.audit=true;
    if(stage==='RECIPIENT')state.recipient=true;
    if(stage==='DISPOSITION_LOG')state.dispositionLog=true;
  }
  return state;
}
function pha07bB1ReviewModel_(source,idx,sourcePts,indexPts){
  return source===idx&&Number(sourcePts)===Number(indexPts);
}
function validasiModelB1PHA07BRC1(){
  var t=[];function ck(name,ok){t.push({name:name,pass:ok===true});}
  var p=pha07bB1QueueDecision_,m=pha07bB1TransactionModel_;
  var source={reportId:'B1-RPT-0003',userId:'B1-USR-0003',
    nonce:'B1-NONCE-0003',indexId:'',ownerNonceUnique:true};
  ck('B1_TITLE_FIXED',PHA07B_B1_TITLE==='SANDBOX_PHA07B_B1_DISPOSABLE_SYNTHETIC_ONLY');
  ck('B1_ID_FIXED',PHA07B_B1_SPREADSHEET_ID==='1hldhvaMRo5etOCQlqCYISgvbpAdOIfAJN5IfGa3kD3Q');
  ck('WRITE_OFF_BY_DEFAULT',PHA07B_B1_ALLOW_WRITE_RC1===false);
  ck('DISTINCT_SYNTHETIC_REPORT','B1-RPT-0003'!=='B0-RPT-0001');
  ck('ROW_UNBOUND_HELD',p({operation:'ROW',status:'PENDING',attempts:0,row:4},source)==='HOLD_ROW_UNBOUND_ORIGINAL_ID');
  ck('ROW_UNBOUND_EVEN_IF_SOURCE_MATCH',p({operation:'ROW',status:'RETRY',attempts:1,reportId:'B1-RPT-0003'},source)==='HOLD_ROW_UNBOUND_ORIGINAL_ID');
  ck('BY_ID_EXACT',p({operation:'BY_ID',status:'PENDING',attempts:0,reportId:'B1-RPT-0003'},source)==='ALLOW_EXACT_ID_RETRY');
  ck('BY_ID_DIFFERENT',p({operation:'BY_ID',status:'PENDING',attempts:0,reportId:'B1-RPT-OTHER'},source)==='HOLD_SOURCE_ID_CHANGED');
  ck('BY_ID_MISSING',p({operation:'BY_ID',status:'PENDING',attempts:0,reportId:''},source)==='HOLD_MISSING_REPORT_ID');
  ck('BY_ID_FOREIGN_INDEX',p({operation:'BY_ID',status:'PENDING',attempts:0,reportId:'B1-RPT-0003'},
    {reportId:source.reportId,indexId:'B1-RPT-OTHER'})==='HOLD_FOREIGN_INDEX_ID');
  ck('BY_ID_INDEX_SAME',p({operation:'BY_ID',status:'FAILED',attempts:4,reportId:'B1-RPT-0003'},
    {reportId:source.reportId,indexId:source.reportId})==='ALLOW_EXACT_ID_RETRY');
  ck('FAILED_MAX_SKIP',p({operation:'BY_ID',status:'FAILED',attempts:5,reportId:'B1-RPT-0003'},source)==='SKIP_MAX_ATTEMPTS');
  ck('DONE_SKIP',p({operation:'BY_ID',status:'DONE',attempts:1,reportId:'B1-RPT-0003'},source)==='SKIP_NON_RETRY_STATUS');
  ck('NEED_REBUILD_SKIP',p({operation:'FULL_REBUILD',status:'NEED_REBUILD',attempts:1},source)==='SKIP_NON_RETRY_STATUS');
  ck('FULL_REBUILD_MANUAL',p({operation:'FULL_REBUILD',status:'PENDING',attempts:0},source)==='HOLD_MANUAL_REBUILD');
  ck('UNKNOWN_OPERATION_HELD',p({operation:'NOT_RECOGNIZED',status:'PENDING',attempts:0},source)==='HOLD_UNKNOWN_OPERATION');
  ck('INVALID_ATTEMPTS',p({operation:'ROW',status:'PENDING',attempts:-1},source)==='HOLD_INVALID_ATTEMPTS');
  ck('BY_NONCE_EXACT',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:source.userId,nonce:source.nonce},source)==='ALLOW_UNIQUE_OWNER_NONCE');
  ck('BY_NONCE_DIFFERENT_OWNER',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:'OTHER',nonce:source.nonce},source)==='HOLD_OWNER_NONCE_CHANGED');
  ck('BY_NONCE_DIFFERENT_NONCE',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:source.userId,nonce:'OTHER'},source)==='HOLD_OWNER_NONCE_CHANGED');
  ck('BY_NONCE_DUPLICATE',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:source.userId,nonce:source.nonce},
    {userId:source.userId,nonce:source.nonce,ownerNonceUnique:false})==='HOLD_NONCE_NOT_UNIQUE');
  ck('BY_NONCE_MISSING',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:'',nonce:''},source)==='HOLD_MISSING_OWNER_NONCE');
  ck('BY_NONCE_MISSING_REPORT',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:source.userId,nonce:source.nonce},
    {userId:source.userId,nonce:source.nonce,ownerNonceUnique:true,reportId:''})==='HOLD_MISSING_SOURCE_REPORT_ID');
  ck('BY_NONCE_FOREIGN_INDEX',p({operation:'BY_NONCE',status:'PENDING',attempts:0,userId:source.userId,nonce:source.nonce},
    {userId:source.userId,nonce:source.nonce,ownerNonceUnique:true,reportId:source.reportId,indexId:'OTHER'})==='HOLD_FOREIGN_INDEX_ID');
  ck('MISSING_SOURCE_FAIL',p({operation:'BY_ID',status:'PENDING',attempts:0,reportId:source.reportId},{reportId:''})==='HOLD_SOURCE_ID_CHANGED');
  ck('MODEL_SUCCESS_STILL_NONATOMIC',m('').source&&m('').index&&m('').audit&&m('').recipient&&m('').dispositionLog&&!m('').atomic);
  ck('MODEL_SOURCE_FAILURE',!m('SOURCE').source);
  ck('MODEL_INDEX_FAILURE_SOURCE_PERSISTS',m('INDEX').source&&!m('INDEX').index&&m('INDEX').queue==='PENDING_ROW_UNBOUND');
  ck('MODEL_AUDIT_FAILURE_SOURCE_PERSISTS',m('AUDIT').source&&m('AUDIT').index&&!m('AUDIT').audit&&m('AUDIT').manualReview);
  ck('MODEL_RECIPIENT_FAILURE',m('RECIPIENT').audit&&!m('RECIPIENT').recipient&&m('RECIPIENT').manualReview);
  ck('MODEL_DISPOSITION_LOG_FAILURE',m('DISPOSITION_LOG').recipient&&!m('DISPOSITION_LOG').dispositionLog&&m('DISPOSITION_LOG').manualReview);
  ck('REVIEW_STATUS_DIVERGENCE',!pha07bB1ReviewModel_('Disetujui','Menunggu Review',2,2));
  ck('REVIEW_POINTS_DIVERGENCE',!pha07bB1ReviewModel_('Disetujui','Disetujui',2,0));
  ck('REVIEW_MATCHED',pha07bB1ReviewModel_('Disetujui','Disetujui',2,2));
  ck('REJECTED_POINTS_ZERO',pha07bB1ReviewModel_('Ditolak','Ditolak',0,0));
  ck('TYPED_EQUALS',pha07bB1Fingerprint_([[0,'']])===pha07bB1Fingerprint_([[0,'']]));
  ck('TYPE_CHANGE_DETECTED',pha07bB1Fingerprint_([['2']])!==pha07bB1Fingerprint_([[2]]));
  ck('DATE_TO_STRING_CHANGE_DETECTED',pha07bB1Fingerprint_([[new Date('2026-10-11T00:00:00Z')]])!==
    pha07bB1Fingerprint_([['2026-10-11T00:00:00.000Z']]));
  ck('EMPTY_SCRATCH_REJECTS_OTHER',!pha07bB1AllBlank_([['B1-RPT-OTHER']],[['']]));
  ck('EMPTY_SCRATCH_REJECTS_FORMULA',!pha07bB1AllBlank_([['']],[['=NOW()']]));
  ck('EMPTY_SCRATCH_ACCEPTS_BLANK',pha07bB1AllBlank_([['',null]],[['','']]));
  var fail=t.filter(function(x){return !x.pass;});
  var out={sukses:fail.length===0,lulus:t.length-fail.length,
    gagal:fail.length,checks:t,mode:'PURE_IN_MEMORY',
    readOnly:true,productionDataWritten:false,liveHandlersExercised:false};
  Logger.log('PHA07B_B1_PURE_VALIDATION '+JSON.stringify(out));
  return out;
}
function pha07bB1Rects_(){
  return [
    {name:'Rekap_Kinerja',row:4,rows:1,width:71},
    {name:'Index_Laporan',row:4,rows:1,width:12},
    {name:'Index_Laporan_Sync_Queue',row:2,rows:1,width:12},
    {name:'Audit_Log',row:4,rows:2,width:4},
    {name:'Disposisi_Surat',row:3,rows:1,width:25},
    {name:'Disposisi_Penerima',row:3,rows:1,width:12},
    {name:'Disposisi_Log',row:3,rows:1,width:14},
    {name:'EVENT_JOURNAL_B0',row:2,rows:1,width:11}
  ];
}
function pha07bB1ScratchClear_(ss){
  return pha07bB1Rects_().every(function(d){
    var sh=ss.getSheetByName(d.name),range=sh.getRange(d.row,1,d.rows,d.width);
    return pha07bB1AllBlank_(range.getValues(),range.getFormulas());
  });
}
function pha07bB1BaseSnapshot_(ss){
  var ranges=[
    ['Rekap_Kinerja',2,2,71],['Index_Laporan',2,2,12],
    ['Disposisi_Surat',2,1,25],['Disposisi_Penerima',2,1,12],
    ['Audit_Log',2,2,4],['Disposisi_Log',2,1,14],
    ['Index_Laporan_Sync_Queue',1,1,12],
    ['EVENT_JOURNAL_B0',1,1,11],['SKENARIO_B0',1,16,6]
  ];
  return ranges.map(function(d){
    return {name:d[0],row:d[1],count:d[2],width:d[3],
      values:ss.getSheetByName(d[0]).getRange(d[1],1,d[2],d[3]).getValues()};
  });
}
function pha07bB1BaseUntouched_(ss,before){
  return before.every(function(d){
    var actual=ss.getSheetByName(d.name).getRange(d.row,1,d.count,d.width).getValues();
    return pha07bB1Fingerprint_(actual)===pha07bB1Fingerprint_(d.values);
  });
}
function pha07bB1FixtureRC1_(){
  pha07bB1Stop_(typeof SpreadsheetApp!=='undefined'&&
    typeof ScriptApp!=='undefined','SERVICES_UNAVAILABLE');
  var triggers=ScriptApp.getProjectTriggers();
  pha07bB1Stop_(Array.isArray(triggers)&&triggers.length===0,
    'VISIBLE_TRIGGERS_PRESENT');
  var ss=SpreadsheetApp.openById(PHA07B_B1_SPREADSHEET_ID);
  pha07bB1Stop_(ss.getId()===PHA07B_B1_SPREADSHEET_ID,'WRONG_SPREADSHEET_ID');
  pha07bB1Stop_(ss.getName()===PHA07B_B1_TITLE,'WRONG_SPREADSHEET_TITLE');
  var tabs=['MULAI_DI_SINI','SKENARIO_B0','Rekap_Kinerja',
    'Index_Laporan','Index_Laporan_Sync_Queue','Disposisi_Surat',
    'Disposisi_Penerima','Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0'];
  pha07bB1Stop_(ss.getSheets().length===tabs.length,'TAB_COUNT_CHANGED');
  tabs.forEach(function(t){
    pha07bB1Stop_(!!ss.getSheetByName(t),'MISSING_'+t);
  });
  var start=ss.getSheetByName('MULAI_DI_SINI');
  pha07bB1Stop_(start.getRange('A4').getValue()==='SYNTHETIC_ONLY_NO_PRODUCTION_DATA',
    'SYNTHETIC_MARKER_ABSENT');
  pha07bB1Stop_(start.getRange('A5').getValue()==='STAGE_B1_DISPOSABLE_TEST_COPY',
    'B1_COPY_MARKER_ABSENT');
  pha07bB1Stop_(start.getRange('A8').getValue()==='B1_WRITES_REQUIRE_OPERATOR_OPT_IN',
    'MANUAL_WRITE_GATE_MARKER_ABSENT');
  var counts={Rekap_Kinerja:3,Index_Laporan:3,
    Index_Laporan_Sync_Queue:1,Disposisi_Surat:2,
    Disposisi_Penerima:2,Audit_Log:3,Disposisi_Log:2,
    EVENT_JOURNAL_B0:1,SKENARIO_B0:16};
  Object.keys(counts).forEach(function(t){
    pha07bB1Stop_(ss.getSheetByName(t).getLastRow()===counts[t],
      'BASELINE_ROW_COUNT_'+t);
  });
  var queueHeaders=['QUEUE_ID','WAKTU','OPERATION','ROW_REKAP',
    'ID_LAPORAN','ID_USER','NONCE','CONTEXT','ATTEMPTS','STATUS',
    'LAST_ERROR','DIPROSES_PADA'];
  var h=ss.getSheetByName('Index_Laporan_Sync_Queue')
    .getRange(1,1,1,12).getValues()[0];
  pha07bB1Stop_(queueHeaders.every(function(v,i){return v===h[i]}),
    'QUEUE_HEADER_CHANGED');
  var r=ss.getSheetByName('Rekap_Kinerja').getRange(2,1,2,71).getValues(),
      ix=ss.getSheetByName('Index_Laporan').getRange(2,1,2,12).getValues(),
      audit=ss.getSheetByName('Audit_Log').getRange(2,1,2,4).getValues();
  for(var i=0;i<2;i++){
    var id='B0-RPT-000'+(i+1);
    pha07bB1Stop_(r[i][18]===id&&ix[i][0]===id&&
      Number(ix[i][1])===i+2&&r[i][19]===ix[i][2]&&
      r[i][21]===ix[i][9]&&r[i][8]===ix[i][6]&&
      Number(r[i][9])===Number(ix[i][7])&&
      pha07bB1Eq_(r[i][26],ix[i][8]),
      'SOURCE_INDEX_FIXTURE_'+i);
    pha07bB1Stop_(audit[i][2]==='SUBMIT_LAPORAN'&&
      audit[i][3]===id&&audit[i][1]===r[i][19],
      'SUBMIT_AUDIT_FIXTURE_'+i);
  }
  pha07bB1Stop_(ss.getSheetByName('Disposisi_Penerima')
    .getRange('H2').getValue()==='B0-RPT-0001'&&
    ss.getSheetByName('Disposisi_Log').getRange('K2').getValue()==='B0-RPT-0001',
    'DISPOSITION_FIXTURE');
  var scenarios=ss.getSheetByName('SKENARIO_B0').getRange(2,6,15,1).getValues();
  pha07bB1Stop_(scenarios.every(function(row){return row[0]==='PENDING'}),
    'SCENARIO_STATUS_CHANGED');
  pha07bB1Stop_(pha07bB1ScratchClear_(ss),'TEST_SCRATCH_NOT_EMPTY');
  return ss;
}
function praUjiTransaksiB1PHA07BRC1(){
  var out={sukses:false,versi:PHA07B_B1_VERSION_RC1,mode:'READ_ONLY',
    exactB1SandboxVerified:false,baselineUntouched:false,
    queueEmpty:true,scratchEmpty:false,noVisibleTriggers:false,
    writeEnabled:PHA07B_B1_ALLOW_WRITE_RC1,
    productionDataWritten:false,actualTransactionApproved:false};
  try{
    pha07bB1Stop_(PHA07B_B1_ALLOW_WRITE_RC1===false,
      'WRITE_FLAG_MUST_BE_FALSE_DURING_PREFLIGHT');
    var ss=pha07bB1FixtureRC1_();
    out.exactB1SandboxVerified=true;
    out.baselineUntouched=true;
    out.scratchEmpty=true;
    out.noVisibleTriggers=true;
    out.sukses=true;
  }catch(e){out.queueEmpty=false;
    out.stopCode=String(e&&e.message||'UNKNOWN').slice(0,175);
  }
  Logger.log('PHA07B_B1_PREFLIGHT '+JSON.stringify(out));
  return out;
}
function pha07bB1SyntheticReport_(){
  var row=[];for(var i=0;i<71;i++)row.push('');
  row[0]='2026-10-11 13:00:00';
  row[1]='Pegawai B1 Sintetis 3';row[2]='Staf Uji B1';
  row[3]='Kegiatan Uji B1';row[4]='Hanya simulasi transaksi dan antrean';
  row[8]='Menunggu Review';row[9]=0;
  row[12]='B1 Percontohan';row[13]='2026-10-11';
  row[18]=PHA07B_B1_TEST_REPORT_ID;
  row[19]=PHA07B_B1_TEST_OWNER_ID;
  row[21]=PHA07B_B1_TEST_NONCE;
  row[26]=PHA07B_B1_TEST_DISPOSITION;
  return row;
}
function pha07bB1SyntheticIndex_(status,points){
  return [PHA07B_B1_TEST_REPORT_ID,4,PHA07B_B1_TEST_OWNER_ID,
    '2026-10-11 13:00:00','2026-10','Kegiatan Uji B1',
    status,points,PHA07B_B1_TEST_DISPOSITION,
    PHA07B_B1_TEST_NONCE,'2026-10-11 13:00:02','B1-SYNTHETIC'];
}
function pha07bB1Restore_(ss,touched,before){
  // Clear ONLY scratch rectangles previously earmarked by this test.
  var errors=[],seen={};
  for(var i=touched.length-1;i>=0;i--){
    var key=touched[i].name+':'+touched[i].row;
    if(seen[key])continue;seen[key]=true;
    try {
      var d=touched[i];
      ss.getSheetByName(d.name).getRange(d.row,1,d.rows,d.width).clearContent();
    }catch(e){errors.push('CLEAR_'+touched[i].name);}
  }
  try{SpreadsheetApp.flush();}catch(e){errors.push('FLUSH');}
  var clean=false,base=false;
  try{clean=pha07bB1ScratchClear_(ss);}catch(e){errors.push('SCRATCH_READ');}
  try{base=pha07bB1BaseUntouched_(ss,before);}catch(e){errors.push('BASE_READ');}
  return {restored:errors.length===0&&clean&&base,
    scratchCleared:clean,baseUntouched:base,
    restoreWarnings:errors};
}
function pha07bB1WriteInRect_(ss,name,row,values,touched){
  var dims=pha07bB1Rects_().filter(function(d){return d.name===name&&d.row===row;});
  pha07bB1Stop_(dims.length===1,'OUT_OF_SCOPE_WRITE_'+name);
  var d=dims[0],rowCount=values.length;
  pha07bB1Stop_(rowCount<=d.rows&&
    values.every(function(v){return Array.isArray(v)&&v.length===d.width;}),
    'INVALID_SYNTHETIC_WRITE_DIMENSIONS');
  touched.push(d); // Mark BEFORE performing any write, including partial failures.
  ss.getSheetByName(name).getRange(row,1,rowCount,d.width).setValues(values);
  SpreadsheetApp.flush();
}
function pha07bB1RunCase_(caseId){
  var out={sukses:false,versi:PHA07B_B1_VERSION_RC1,caseId:caseId,
    status:'STARTED',target:'B1_DISPOSABLE_SANDBOX_ONLY',
    sourceCommittedObserved:false,indexFaultInjected:false,
    queuePersistedObserved:false,rowReplayHeld:false,
    byIdRetrySafe:false,reviewDivergenceDetected:false,
    auditGapDetected:false,dispositionGapDetected:false,
    recoveryLinksVerified:false,restored:false,
    manualRestoreRequired:false,productionDataWritten:false,
    actualProductionHandlersUsed:false};
  if(PHA07B_B1_ALLOW_WRITE_RC1!==true){
    out.status='WRITE_DISABLED';out.readOnly=true;
    Logger.log('PHA07B_B1_WRITE_TEST '+JSON.stringify(out));
    return out;
  }
  var lock=null,locked=false,ss=null,before=null,touched=[];
  try{
    pha07bB1Stop_(caseId==='B1-INDEX-FAILURE'||caseId==='B1-RETRY-REVIEW_DISPOSITION',
      'UNKNOWN_CASE');
    lock=LockService.getScriptLock();
    pha07bB1Stop_(lock.tryLock(5000),'SCRIPT_LOCK_UNAVAILABLE');
    locked=true;
    ss=pha07bB1FixtureRC1_();
    before=pha07bB1BaseSnapshot_(ss);
    var report=pha07bB1SyntheticReport_();
    pha07bB1WriteInRect_(ss,'Rekap_Kinerja',4,[report],touched);
    var sh=ss.getSheetByName('Rekap_Kinerja');
    pha07bB1Stop_(sh.getRange('S4').getValue()===PHA07B_B1_TEST_REPORT_ID&&
      sh.getRange('T4').getValue()===PHA07B_B1_TEST_OWNER_ID&&
      sh.getRange('V4').getValue()===PHA07B_B1_TEST_NONCE,
      'SOURCE_APPEND_NOT_OBSERVED');
    out.sourceCommittedObserved=true;
    if(caseId==='B1-INDEX-FAILURE'){
      // Deliberate synthetic injection: do not invoke production sync.
      var injected='FAULT_INJECTED_INDEX_SYNC_UNAVAILABLE';
      out.indexFaultInjected=injected==='FAULT_INJECTED_INDEX_SYNC_UNAVAILABLE';
      pha07bB1Stop_(ss.getSheetByName('Index_Laporan').getLastRow()===3,
        'INDEX_UNEXPECTEDLY_MODIFIED');
      var q=['B1-QUEUE-0001','2026-10-11 13:00:01','ROW',4,'','','',
        'B1_FAULT_INJECTION',0,'PENDING',injected,''];
      pha07bB1WriteInRect_(ss,'Index_Laporan_Sync_Queue',2,[q],touched);
      var actual=ss.getSheetByName('Index_Laporan_Sync_Queue')
        .getRange(2,1,1,12).getValues()[0];
      out.queuePersistedObserved=actual[2]==='ROW'&&Number(actual[3])===4&&
        actual[4]===''&&actual[9]==='PENDING'&&Number(actual[8])===0;
      out.rowReplayHeld=pha07bB1QueueDecision_({
        operation:'ROW',status:'PENDING',attempts:0,row:4
      },{reportId:PHA07B_B1_TEST_REPORT_ID})==='HOLD_ROW_UNBOUND_ORIGINAL_ID';
      pha07bB1Stop_(out.queuePersistedObserved&&out.rowReplayHeld,
        'UNBOUND_ROW_REPLAY_NOT_HELD');
      out.status='FAULT_AND_QUEUE_OBSERVED_RESTORE_PENDING';
    }else{
      var q2=['B1-QUEUE-0002','2026-10-11 13:00:01','BY_ID',4,
        PHA07B_B1_TEST_REPORT_ID,'','','B1_RETRY_BY_ID',0,'PENDING','',''];
      pha07bB1WriteInRect_(ss,'Index_Laporan_Sync_Queue',2,[q2],touched);
      var can=pha07bB1QueueDecision_({
        operation:'BY_ID',status:'PENDING',attempts:0,
        reportId:PHA07B_B1_TEST_REPORT_ID},
        {reportId:sh.getRange('S4').getValue(),indexId:''});
      pha07bB1Stop_(can==='ALLOW_EXACT_ID_RETRY','BY_ID_IDENTITY_REJECTED');
      out.byIdRetrySafe=true;
      pha07bB1WriteInRect_(ss,'Index_Laporan',4,
        [pha07bB1SyntheticIndex_('Menunggu Review',0)],touched);
      // Failures are injected by skipping subsequent writes, then detecting gaps.
      out.auditGapDetected=ss.getSheetByName('Audit_Log').getLastRow()===3;
      pha07bB1Stop_(out.auditGapDetected,'AUDIT_MISSING_EVENT_NOT_DETECTED');
      pha07bB1WriteInRect_(ss,'Audit_Log',4,[
        ['2026-10-11 13:00:02',PHA07B_B1_TEST_OWNER_ID,
          'SUBMIT_LAPORAN',PHA07B_B1_TEST_REPORT_ID],
        ['2026-10-11 13:05:02','B1-ADMIN-0001',
          'REVIEW_LAPORAN',PHA07B_B1_TEST_REPORT_ID]
      ],touched);
      // Simulate review step finishing source before index; detect divergence.
      sh.getRange('I4').setValue('Disetujui');
      sh.getRange('J4').setValue(2);
      SpreadsheetApp.flush();
      out.reviewDivergenceDetected=!pha07bB1ReviewModel_(
        sh.getRange('I4').getValue(),
        ss.getSheetByName('Index_Laporan').getRange('G4').getValue(),
        sh.getRange('J4').getValue(),
        ss.getSheetByName('Index_Laporan').getRange('H4').getValue());
      pha07bB1Stop_(out.reviewDivergenceDetected,'REVIEW_GAP_NOT_DETECTED');
      ss.getSheetByName('Index_Laporan').getRange('G4').setValue('Disetujui');
      ss.getSheetByName('Index_Laporan').getRange('H4').setValue(2);
      SpreadsheetApp.flush();
      pha07bB1Stop_(pha07bB1ReviewModel_(
        sh.getRange('I4').getValue(),
        ss.getSheetByName('Index_Laporan').getRange('G4').getValue(),
        sh.getRange('J4').getValue(),
        ss.getSheetByName('Index_Laporan').getRange('H4').getValue()),
        'REVIEW_SYNC_NOT_OBSERVED');
      var surat=Array(25).fill('');
      surat[0]=PHA07B_B1_TEST_DISPOSITION;
      surat[1]='B1/DSP/003';surat[2]='2026-10-11';
      surat[3]='TEST_ONLY';surat[4]='Instruksi B1 Sintetis';
      surat[6]='B1-ADMIN-0001';surat[13]='AKTIF';
      pha07bB1WriteInRect_(ss,'Disposisi_Surat',3,[surat],touched);
      var penerima=Array(12).fill('');
      penerima[0]=PHA07B_B1_TEST_DISPOSITION;
      penerima[1]=PHA07B_B1_TEST_OWNER_ID;
      penerima[2]='Pegawai B1 Sintetis 3';
      penerima[6]='SUDAH_DILAPORKAN';
      penerima[7]=PHA07B_B1_TEST_REPORT_ID;
      pha07bB1WriteInRect_(ss,'Disposisi_Penerima',3,[penerima],touched);
      out.dispositionGapDetected=ss.getSheetByName('Disposisi_Log').getLastRow()===2;
      pha07bB1Stop_(out.dispositionGapDetected,'DISPOSITION_LOG_GAP_NOT_DETECTED');
      var event=Array(14).fill('');
      event[0]='2026-10-11 13:00:03';
      event[1]=PHA07B_B1_TEST_DISPOSITION;
      event[2]='BUAT_LAPORAN_DARI_DISPOSISI';
      event[3]=PHA07B_B1_TEST_OWNER_ID;
      event[6]='Laporan terkait: '+PHA07B_B1_TEST_REPORT_ID;
      event[10]=PHA07B_B1_TEST_REPORT_ID;
      pha07bB1WriteInRect_(ss,'Disposisi_Log',3,[event],touched);
      // Mark queue DONE ONLY after exact ID and cross-sheet relationships match.
      var idx=ss.getSheetByName('Index_Laporan').getRange(4,1,1,12).getValues()[0],
        rec=ss.getSheetByName('Disposisi_Penerima').getRange(3,1,1,12).getValues()[0],
        log=ss.getSheetByName('Disposisi_Log').getRange(3,1,1,14).getValues()[0],
        aud=ss.getSheetByName('Audit_Log').getRange(4,1,2,4).getValues();
      var consistent=idx[0]===PHA07B_B1_TEST_REPORT_ID&&Number(idx[1])===4&&
        idx[2]===PHA07B_B1_TEST_OWNER_ID&&
        idx[9]===PHA07B_B1_TEST_NONCE&&
        rec[0]===PHA07B_B1_TEST_DISPOSITION&&
        rec[1]===PHA07B_B1_TEST_OWNER_ID&&
        rec[6]==='SUDAH_DILAPORKAN'&&
        rec[7]===PHA07B_B1_TEST_REPORT_ID&&
        log[1]===PHA07B_B1_TEST_DISPOSITION&&
        log[2]==='BUAT_LAPORAN_DARI_DISPOSISI'&&
        log[3]===PHA07B_B1_TEST_OWNER_ID&&
        log[10]===PHA07B_B1_TEST_REPORT_ID&&
        log[6]==='Laporan terkait: '+PHA07B_B1_TEST_REPORT_ID&&
        aud[0][1]===PHA07B_B1_TEST_OWNER_ID&&
        aud[0][2]==='SUBMIT_LAPORAN'&&
        aud[0][3]===PHA07B_B1_TEST_REPORT_ID&&
        aud[1][2]==='REVIEW_LAPORAN'&&
        aud[1][3]===PHA07B_B1_TEST_REPORT_ID;
      pha07bB1Stop_(consistent,'RECOVERY_REFERENCES_INCONSISTENT');
      out.recoveryLinksVerified=true;
      ss.getSheetByName('Index_Laporan_Sync_Queue').getRange('I2')
        .setValue(1);
      ss.getSheetByName('Index_Laporan_Sync_Queue').getRange('J2')
        .setValue('DONE');
      SpreadsheetApp.flush();
      out.queuePersistedObserved=ss.getSheetByName('Index_Laporan_Sync_Queue')
        .getRange('J2').getValue()==='DONE'&&
        Number(ss.getSheetByName('Index_Laporan_Sync_Queue')
          .getRange('I2').getValue())===1;
      pha07bB1Stop_(out.queuePersistedObserved,'QUEUE_DONE_NOT_OBSERVED');
      out.status='RETRY_AND_INTEGRITY_OBSERVED_RESTORE_PENDING';
    }
  }catch(e){
    out.status='STOPPED';out.stopCode=String(e&&e.message||'UNKNOWN').slice(0,170);
  }finally{
    if(ss&&before){
      var restoration=pha07bB1Restore_(ss,touched,before);
      out.restored=restoration.restored;
      out.originalFixtureUntouched=restoration.baseUntouched;
      out.scratchCleared=restoration.scratchCleared;
      if(!restoration.restored){
        out.manualRestoreRequired=true;
        out.status='SANDBOX_B1_RESTORE_NEEDS_ATTENTION';
        out.restoreWarnings=restoration.restoreWarnings;
      }
    }
    if(locked){try{lock.releaseLock();}catch(e){}}
  }
  var passCase=caseId==='B1-INDEX-FAILURE'?
    (out.sourceCommittedObserved&&out.indexFaultInjected&&
     out.queuePersistedObserved&&out.rowReplayHeld):
    (out.sourceCommittedObserved&&out.byIdRetrySafe&&
     out.reviewDivergenceDetected&&out.auditGapDetected&&
     out.dispositionGapDetected&&out.recoveryLinksVerified&&
     out.queuePersistedObserved);
  out.sukses=passCase&&out.restored&&!out.manualRestoreRequired;
  if(out.sukses)out.status='PASS_SYNTHETIC_WRITE_AND_RESTORE';
  Logger.log('PHA07B_B1_WRITE_TEST '+JSON.stringify(out));
  return out;
}
// Both write functions are intentionally gated; no generic queue processor exists.
function ujiGagalIndexAntreanB1PHA07BRC1(){
  return pha07bB1RunCase_('B1-INDEX-FAILURE');
}
function ujiPemulihanReviewDisposisiB1PHA07BRC1(){
  return pha07bB1RunCase_('B1-RETRY-REVIEW_DISPOSITION');
}
