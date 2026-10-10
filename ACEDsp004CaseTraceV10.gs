// ============================================================================
// ACE-DSP-004 focused case trace v1.0 RC1 | 2026-10-10
// READ-ONLY. Investigate the two verified source links without modifying them.
// Depend on SheetSchema.gs, Kode.gs and ACEDsp004DiagnosticsV10.gs.
// Never print free-text details, employee names, AI prompts or private notes.
// ============================================================================

var ACE_DSP004_CASE_TRACE_V10_VERSION_='ACE-DSP004-TRACE-v1.0-RC1-2026.10.10.01';

function aceDsp004TraceCasesV10_(){
  return [
    {caseId:'LEGACY_14',recipientRow:14,dispositionRow:2,
      dispositionId:'DSP-20260426174603-4497',
      reportId:'e49e660b-d8f2-4205-a375-5573ccdab61f',
      expectedReportRow:632,expectedIndexRow:632,
      expectedState:'REPORT_PRESENT_REVERSE_LINK_EMPTY'},
    {caseId:'ACTIVE_622',recipientRow:622,dispositionRow:127,
      dispositionId:'DSP-e3e9dd3f-20c8-46ef-b80c-78daced67ad8',
      reportId:'4810bf4f-6cac-4a05-b75e-fdd5acb81df5',
      expectedReportRow:null,expectedIndexRow:null,
      expectedState:'REFERENCED_REPORT_ABSENT'}
  ];
}

function aceDsp004TraceTextV10_(v){
  return v===null||v===undefined?'':String(v).trim();
}
function aceDsp004TraceIsoV10_(v){
  if(!v)return '';
  var d=v instanceof Date?v:new Date(v);
  return !isNaN(d.getTime())?d.toISOString():'';
}
function aceDsp004TraceEventActionV10_(value){
  var s=aceDsp004TraceTextV10_(value).toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,79}$/.test(s)?s:'OTHER_ACTION_REDACTED';
}
function aceDsp004TraceIdFromCreateDetailV10_(detail){
  // Kode.gs writes "Laporan terkait: " + ctx.idLaporan.
  // Only this exact structured prefix is allowed, never arbitrary free text.
  var m=/^Laporan terkait:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i.exec(
    aceDsp004TraceTextV10_(detail));
  return m?m[1].toLowerCase():'';
}
function aceDsp004TraceIndexRowsV10_(sheet,C,targetIds){
  var found=Object.create(null),n=sheet.getLastRow();
  if(n<2)return found;
  var ids=sheet.getRange(2,C.ID_LAPORAN+1,n-1,1).getValues();
  ids.forEach(function(row,i){
    var id=aceDsp004TraceTextV10_(row[0]).toLowerCase();
    if(!targetIds[id])return;
    if(!found[id])found[id]=[];
    found[id].push(i+2);
  });
  return found;
}
function aceDsp004TraceCoreV10_(ss,cases,C){
  var rec=ss.getSheetByName('Disposisi_Penerima'),
    surat=ss.getSheetByName('Disposisi_Surat'),
    reports=ss.getSheetByName('Rekap_Kinerja'),
    index=ss.getSheetByName('Index_Laporan');
  if(!rec||!surat||!reports||!index)throw new Error('DSP004_TRACE_REQUIRED_SHEET_UNAVAILABLE');
  var targetIds=Object.create(null);
  cases.forEach(function(x){targetIds[x.reportId.toLowerCase()]=true;});
  var rekapRows=aceDsp004TraceIndexRowsV10_(reports,C.REKAP_KINERJA,targetIds);
  var indexRows=aceDsp004TraceIndexRowsV10_(index,C.INDEX_LAPORAN,targetIds);
  var n=reports.getLastRow(),idRows=n>=2?
    reports.getRange(2,C.REKAP_KINERJA.ID_LAPORAN+1,n-1,1).getValues():[],
    dispRows=n>=2?
    reports.getRange(2,C.REKAP_KINERJA.ID_DISPOSISI+1,n-1,1).getValues():[];
  return cases.map(function(x){
    var D=C.DISPOSISI_PENERIMA,S=C.DISPOSISI_SURAT,R=C.REKAP_KINERJA,I=C.INDEX_LAPORAN;
    if(rec.getLastRow()<x.recipientRow||surat.getLastRow()<x.dispositionRow)
      throw new Error('DSP004_TRACE_ANCHOR_OUT_OF_RANGE_'+x.caseId);
    var dp=rec.getRange(x.recipientRow,1,1,Math.max(D.WAKTU_LAPOR,D.ID_LAPORAN_TERKAIT,D.ID_PENERIMA,D.STATUS_TINDAK_LANJUT)+1).getValues()[0];
    var su=surat.getRange(x.dispositionRow,S.ID_DISPOSISI+1).getValue();
    var sameRecipientId=aceDsp004TraceTextV10_(dp[D.ID_LAPORAN_TERKAIT]).toLowerCase()===x.reportId.toLowerCase();
    var sameDisposition=aceDsp004TraceTextV10_(dp[D.ID_DISPOSISI])===x.dispositionId;
    var parentMatches=aceDsp004TraceTextV10_(su)===x.dispositionId;
    if(!sameRecipientId||!sameDisposition||!parentMatches)
      throw new Error('DSP004_TRACE_SOURCE_ANCHOR_CHANGED_'+x.caseId);
    var ownerId=aceDsp004TraceTextV10_(dp[D.ID_PENERIMA]);
    var rr=rekapRows[x.reportId.toLowerCase()]||[],
      ir=indexRows[x.reportId.toLowerCase()]||[];
    var report=rr.length===1?
      reports.getRange(rr[0],1,1,Math.max(R.ID_USER,R.ID_DISPOSISI)+1).getValues()[0]:null;
    var ind=ir.length===1?
      index.getRange(ir[0],1,1,Math.max(I.ID_USER,I.ID_DISPOSISI,I.ROW_REKAP)+1).getValues()[0]:null;
    var matchedDispositions=0;
    dispRows.forEach(function(v){if(aceDsp004TraceTextV10_(v[0])===x.dispositionId)matchedDispositions++;});
    var actualState=rr.length===0&&ir.length===0?'REFERENCED_REPORT_ABSENT':
      rr.length===1&&ir.length===1&&report&&ind&&
        !aceDsp004TraceTextV10_(report[R.ID_DISPOSISI])&&
        !aceDsp004TraceTextV10_(ind[I.ID_DISPOSISI])
        ?'REPORT_PRESENT_REVERSE_LINK_EMPTY':'OTHER_OR_CHANGED';
    var guard=actualState===x.expectedState&&
      (x.expectedReportRow===null||rr[0]===x.expectedReportRow)&&
      (x.expectedIndexRow===null||ir[0]===x.expectedIndexRow);
    return {
      caseId:x.caseId,recipientRow:x.recipientRow,
      dispositionRow:x.dispositionRow,dispositionId:x.dispositionId,
      reportId:x.reportId,
      recipientOwnerRecorded:!!ownerId,
      recipientOwnerIdInternal:ownerId,
      recipientFollowStatusRecorded:!!aceDsp004TraceTextV10_(dp[D.STATUS_TINDAK_LANJUT]),
      recipientReportedAt:aceDsp004TraceIsoV10_(dp[D.WAKTU_LAPOR]),
      reportRowCount:rr.length,reportRows:rr.slice(0,5),
      indexRowCount:ir.length,indexRows:ir.slice(0,5),
      indexRowPointerMatches:!!ind&&rr.length===1&&Number(ind[I.ROW_REKAP])===rr[0],
      ownerMatchesReport:!!report?aceDsp004TraceTextV10_(report[R.ID_USER])===ownerId:null,
      ownerMatchesIndex:!!ind?aceDsp004TraceTextV10_(ind[I.ID_USER])===ownerId:null,
      directReportsToDisposition:matchedDispositions,
      sourceState:actualState,expectedState:x.expectedState,sourceStateMatchesPrevious:guard
    };
  });
}
function aceDsp004TraceAuditV10_(ss,C,cases) {
  var sheet=ss.getSheetByName('Audit_Log');
  if(!sheet)throw new Error('DSP004_TRACE_AUDIT_LOG_UNAVAILABLE');
  var last=sheet.getLastRow(),matches=Object.create(null);
  cases.forEach(function(c){matches[c.caseId]=[];});
  if(last<2)return matches;
  var data=sheet.getRange(2,1,last-1,Math.max(C.ID_USER,C.AKSI,C.DETAIL,C.WAKTU)+1).getValues();
  data.forEach(function(row,i){
    var action=aceDsp004TraceTextV10_(row[C.AKSI]);
    var detail=aceDsp004TraceTextV10_(row[C.DETAIL]);
    cases.forEach(function(c){
      // Exact submit ID or uniquely identifying literal UUID in other audit text.
      var exact=action==='SUBMIT_LAPORAN'&&detail.toLowerCase()===c.reportId.toLowerCase();
      var hasId=detail.toLowerCase().indexOf(c.reportId.toLowerCase())!==-1;
      if(!exact&&!hasId)return;
      matches[c.caseId].push({
        auditRow:i+2,time:aceDsp004TraceIsoV10_(row[C.WAKTU]),
        action:aceDsp004TraceEventActionV10_(action),
        exactSubmitReportId:exact,
        otherTextReference:hasId&&!exact,
        actorMatchesRecipient:aceDsp004TraceTextV10_(row[C.ID_USER])===c.recipientOwnerIdInternal
      });
    });
  });
  return matches;
}
function aceDsp004TraceDispositionLogsV10_(ss,C,cases){
  var sh=ss.getSheetByName('Disposisi_Log');
  if(!sh)throw new Error('DSP004_TRACE_DISPOSITION_LOG_UNAVAILABLE');
  var last=sh.getLastRow(),matches=Object.create(null);
  cases.forEach(function(c){matches[c.caseId]=[];});
  if(last<2)return matches;
  var rows=sh.getRange(2,1,last-1,Math.max(C.DETAIL,C.AKSI,C.OLEH_ID,C.ID_DISPOSISI,C.TARGET_ID,C.WAKTU)+1).getValues();
  rows.forEach(function(r,i){
    var disp=aceDsp004TraceTextV10_(r[C.ID_DISPOSISI]);
    cases.forEach(function(c){
      if(disp!==c.dispositionId)return;
      var action=aceDsp004TraceTextV10_(r[C.AKSI]);
      if(action!=='BUAT_LAPORAN_DARI_DISPOSISI')return;
      var linked=aceDsp004TraceIdFromCreateDetailV10_(r[C.DETAIL]);
      matches[c.caseId].push({
        logRow:i+2,time:aceDsp004TraceIsoV10_(r[C.WAKTU]),
        action:'BUAT_LAPORAN_DARI_DISPOSISI',
        detailFormatRecognized:!!linked,
        detailReferencesTarget:!!linked&&linked===c.reportId.toLowerCase(),
        structuredTargetMatches:aceDsp004TraceTextV10_(r[C.TARGET_ID]).toLowerCase()===c.reportId.toLowerCase(),
        actorMatchesRecipient:aceDsp004TraceTextV10_(r[C.OLEH_ID])===c.recipientOwnerIdInternal
      });
    });
  });
  return matches;
}
function aceDsp004TraceRelatedRowsV10_(ss,name,idCol,caseRows,maxCols) {
  var sh=ss.getSheetByName(name),out=Object.create(null);
  caseRows.forEach(function(c){out[c.caseId]={sheetAvailable:!!sh,matchedRows:[],matchCount:0};});
  if(!sh||sh.getLastRow()<2)return out;
  var n=sh.getLastRow(),values=sh.getRange(2,idCol+1,n-1,1).getValues();
  values.forEach(function(v,i){
    var id=aceDsp004TraceTextV10_(v[0]).toLowerCase();
    caseRows.forEach(function(c){
      if(id!==c.reportId.toLowerCase())return;
      out[c.caseId].matchCount++;
      if(out[c.caseId].matchedRows.length<maxCols)out[c.caseId].matchedRows.push(i+2);
    });
  });
  return out;
}
function aceDsp004TraceClassifyV10_(item) {
  if(!item.sourceStateMatchesPrevious)return 'SOURCE_CHANGED_STOP';
  if(item.sourceState==='REPORT_PRESENT_REVERSE_LINK_EMPTY')
    return 'HISTORICAL_BACKLINK_GAP_E1_COMPENSATION_NEEDS_VERIFICATION';
  if(item.sourceState!=='REFERENCED_REPORT_ABSENT')return 'OTHER_STATE_REVIEW';
  if(item.exactSubmitAuditCount>0&&item.targetedCreateLogCount>0)
    return 'SUBMISSION_AND_DISPOSITION_CREATE_TRACED_REPORT_NOW_ABSENT';
  if(item.exactSubmitAuditCount>0)
    return 'SUBMISSION_AUDIT_FOUND_REPORT_NOW_ABSENT';
  if(item.targetedCreateLogCount>0)
    return 'DISPOSITION_CREATE_LOG_FOUND_REPORT_NOW_ABSENT';
  return 'NO_EXACT_SUBMISSION_PROOF_IN_CHECKED_SOURCES';
}
function diagnostikJejakKasusACEDsp004V10(){
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('DSP004_TRACE_MAINTAINER_GATE_REQUIRED');
  pastikanMaintainerPortal3B0_('ACE_DSP004_CASE_TRACE_READ_ONLY');
  if(typeof SHEET_COLUMNS==='undefined'||typeof getSS_!=='function')
    throw new Error('DSP004_TRACE_SCHEMA_OR_SOURCE_UNAVAILABLE');
  var ss=getSS_(),C=SHEET_COLUMNS,
    req=['REKAP_KINERJA','INDEX_LAPORAN','DISPOSISI_PENERIMA','DISPOSISI_SURAT','DISPOSISI_LOG','AUDIT_LOG'];
  req.forEach(function(k){if(!C[k])throw new Error('DSP004_TRACE_SCHEMA_MISSING_'+k);});
  var cases=aceDsp004TraceCoreV10_(ss,aceDsp004TraceCasesV10_(),C);
  var audit=aceDsp004TraceAuditV10_(ss,C.AUDIT_LOG,cases);
  var dsp=aceDsp004TraceDispositionLogsV10_(ss,C.DISPOSISI_LOG,cases);
  var ai=C.AI_LOGS?aceDsp004TraceRelatedRowsV10_(ss,'AI_Logs',C.AI_LOGS.ID_LAPORAN,cases,5):null;
  var queue=C.INDEX_LAPORAN_SYNC_QUEUE?aceDsp004TraceRelatedRowsV10_(
    ss,'Index_Laporan_Sync_Queue',C.INDEX_LAPORAN_SYNC_QUEUE.ID_LAPORAN,cases,5):null;
  var rows=cases.map(function(c){
    var audits=audit[c.caseId]||[],logs=dsp[c.caseId]||[];
    var exact=audits.filter(function(x){return x.exactSubmitReportId;});
    var creates=logs.filter(function(x){return x.detailReferencesTarget;});
    var result={
      caseId:c.caseId,recipientRow:c.recipientRow,dispositionRow:c.dispositionRow,
      reportId:c.reportId,dispositionId:c.dispositionId,
      sourceState:c.sourceState,sourceStateMatchesPrevious:c.sourceStateMatchesPrevious,
      recipientOwnerRecorded:c.recipientOwnerRecorded,
      recipientFollowStatusRecorded:c.recipientFollowStatusRecorded,
      recipientReportedAt:c.recipientReportedAt,
      reportRowCount:c.reportRowCount,reportRows:c.reportRows,
      indexRowCount:c.indexRowCount,indexRows:c.indexRows,
      indexRowPointerMatches:c.indexRowPointerMatches,
      ownerMatchesReport:c.ownerMatchesReport,ownerMatchesIndex:c.ownerMatchesIndex,
      directReportsToDisposition:c.directReportsToDisposition,
      exactSubmitAuditCount:exact.length,
      otherAuditReferenceCount:audits.length-exact.length,
      exactSubmitEvents:exact.slice(-6),
      targetedCreateLogCount:creates.length,
      dispositionCreateLogCount:logs.length,
      dispositionCreateEvents:logs.slice(-10),
      aiLogMatches:ai?ai[c.caseId]:null,
      indexSyncQueueMatches:queue?queue[c.caseId]:null
    };
    result.preliminaryClassification=aceDsp004TraceClassifyV10_(result);
    return result;
  });
  // Do not print or return recipient owner IDs, free text, names, or secrets.
  var ok=rows.length===2&&rows.every(function(r){return r.sourceStateMatchesPrevious;});
  var out={sukses:ok,versi:ACE_DSP004_CASE_TRACE_V10_VERSION_,
    periodScope:'GLOBAL_INTEGRITY',cases:rows,
    sourceError:false,
    evidenceBoundary:'EVENT_REFERENCES_DO_NOT_PROVE_CURRENT_REPORT_EXISTENCE',
    readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_TRACE_SUMMARY '+JSON.stringify({
    sukses:out.sukses,versi:out.versi,caseCount:rows.length,
    classifications:rows.map(function(r){return {
      caseId:r.caseId,classification:r.preliminaryClassification,
      sourceStateMatchesPrevious:r.sourceStateMatchesPrevious,
      exactSubmitAuditCount:r.exactSubmitAuditCount,
      targetedCreateLogCount:r.targetedCreateLogCount
    };}),readOnly:true,dataBisnisDiubah:false}));
  rows.forEach(function(row){
    Logger.log('ACE_DSP004_TRACE_CASE '+JSON.stringify(row));
  });
  if(!ok)throw new Error('DSP004_TRACE_ANCHOR_OR_STATE_CHANGED_NO_ACTION');
  return out;
}
function validasiJejakKasusACEDsp004V10(){
  var checks=[];function add(name,pass){checks.push({nama:name,lulus:pass===true});}
  var id='4810bf4f-6cac-4a05-b75e-fdd5acb81df5';
  var parsed=aceDsp004TraceIdFromCreateDetailV10_('Laporan terkait: '+id);
  add('LEGACY_DETAIL_EXACT_ID',parsed===id);
  add('LEGACY_DETAIL_CASE_INSENSITIVE',
    aceDsp004TraceIdFromCreateDetailV10_('laporan TERKAIT: '+id.toUpperCase())===id);
  add('DETAIL_REJECTS_EXTRA_TEXT',aceDsp004TraceIdFromCreateDetailV10_(
    'Laporan terkait: '+id+' someone')==='');
  add('DETAIL_REJECTS_WRONG_PREFIX',aceDsp004TraceIdFromCreateDetailV10_(
    'Other field: '+id)==='');
  add('DETAIL_REJECTS_INCOMPLETE_ID',aceDsp004TraceIdFromCreateDetailV10_(
    'Laporan terkait: 4810bf4f')==='');
  add('CASE_ANCHORS_COUNT',aceDsp004TraceCasesV10_().length===2);
  var missing={sourceState:'REFERENCED_REPORT_ABSENT',sourceStateMatchesPrevious:true,
    exactSubmitAuditCount:1,targetedCreateLogCount:1};
  add('BOTH_AUDITS_CLASSIFIED',aceDsp004TraceClassifyV10_(missing)===
    'SUBMISSION_AND_DISPOSITION_CREATE_TRACED_REPORT_NOW_ABSENT');
  missing.targetedCreateLogCount=0;
  add('SUBMIT_ONLY_CLASSIFIED',aceDsp004TraceClassifyV10_(missing)===
    'SUBMISSION_AUDIT_FOUND_REPORT_NOW_ABSENT');
  missing.exactSubmitAuditCount=0;missing.targetedCreateLogCount=1;
  add('CREATE_ONLY_CLASSIFIED',aceDsp004TraceClassifyV10_(missing)===
    'DISPOSITION_CREATE_LOG_FOUND_REPORT_NOW_ABSENT');
  missing.targetedCreateLogCount=0;
  add('UNVERIFIABLE_CLASSIFIED',aceDsp004TraceClassifyV10_(missing)===
    'NO_EXACT_SUBMISSION_PROOF_IN_CHECKED_SOURCES');
  missing.sourceStateMatchesPrevious=false;
  add('STATE_CHANGE_BLOCKED',aceDsp004TraceClassifyV10_(missing)==='SOURCE_CHANGED_STOP');
  var history={sourceState:'REPORT_PRESENT_REVERSE_LINK_EMPTY',sourceStateMatchesPrevious:true};
  add('HISTORICAL_NOT_AUTO_WAIVED',aceDsp004TraceClassifyV10_(history)===
    'HISTORICAL_BACKLINK_GAP_E1_COMPENSATION_NEEDS_VERIFICATION');
  add('TEXT_ACTION_SANITIZED',
    aceDsp004TraceEventActionV10_('PRIVATE USER ID')==='OTHER_ACTION_REDACTED');
  var failed=checks.filter(function(c){return !c.lulus;});
  var result={sukses:failed.length===0,lulus:checks.length-failed.length,
    gagal:failed.length,checks:checks,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_TRACE_VALIDATION '+JSON.stringify(result));
  return result;
}
