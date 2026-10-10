// ============================================================================
// ACE-DSP-004 | Administrative Reconciliation v1.0 RC1 | 2026-10-10
// Maintainer-only, strictly READ-ONLY. A deleted report must NOT be recreated
// or automatically linked to a candidate report of the same employee.
// This diagnostic only proposes evidence-backed candidates for manual review.
// Requires Kode.gs, SheetSchema.gs, existing Disposisi/Audit_Log sheets.
// ============================================================================

var ACE_DSP004_RECONCILIATION_RC1_VERSION_='ACE-DSP004-ADMIN-RECON-RC1-2026.10.10.01';
var ACE_DSP004_RECONCILIATION_RC1_CASE_={
  caseId:'ACTIVE_622',recipientRow:622,dispositionRow:127,
  reportId:'4810bf4f-6cac-4a05-b75e-fdd5acb81df5',
  dispositionId:'DSP-e3e9dd3f-20c8-46ef-b80c-78daced67ad8',
  originalSubmittedAt:'2026-10-01T06:26:18.507Z',
  candidateWindowEnd:'2026-10-10T16:59:59.999Z',
  earliestAppendRow:3958
};
var ACE_DSP004_RECONCILIATION_RC1_MAX_SCAN_ROWS_=650;
var ACE_DSP004_RECONCILIATION_RC1_MAX_CANDIDATES_=30;

function aceDsp004ReconTextRC1_(v){
  return v===null||v===undefined?'':String(v).trim();
}
function aceDsp004ReconIsoRC1_(value) {
  if(value instanceof Date&&!isNaN(value.getTime()))return value.toISOString();
  if(typeof value==='number'&&isFinite(value)) {
    var epoch=new Date(Date.UTC(1899,11,30)+Math.round(value*86400000));
    return isNaN(epoch.getTime())?'':epoch.toISOString();
  }
  var s=aceDsp004ReconTextRC1_(value);
  var m=/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if(m){
    var iso=m[3]+'-'+m[2]+'-'+m[1]+'T'+(m[4]||'00').padStart(2,'0')+':'+
      (m[5]||'00')+':'+(m[6]||'00')+'+07:00';
    var dt=new Date(iso);return isNaN(dt.getTime())?'':dt.toISOString();
  }
  var d=new Date(s);
  return isNaN(d.getTime())?'':d.toISOString();
}
function aceDsp004ReconReviewCandidateRC1_(candidate,ctx){
  if(!candidate||!ctx)return {eligible:false,reason:'NO_DATA'};
  if(aceDsp004ReconTextRC1_(candidate.ownerId)!==aceDsp004ReconTextRC1_(ctx.ownerId))
    return {eligible:false,reason:'DIFFERENT_OWNER'};
  if(aceDsp004ReconTextRC1_(candidate.id)===aceDsp004ReconTextRC1_(ctx.oldReportId))
    return {eligible:false,reason:'ORIGINAL_ID'};
  var submittedMs=Date.parse(candidate.submittedAt),
      sinceMs=Date.parse(ctx.submittedAt),
      untilMs=Date.parse(ctx.endAt);
  if(!isFinite(submittedMs)||!isFinite(sinceMs)||!isFinite(untilMs))
    return {eligible:false,reason:'TIMESTAMP_NOT_AUTHORITATIVE'};
  if(submittedMs<=sinceMs||submittedMs>untilMs)
    return {eligible:false,reason:'OUTSIDE_REVIEW_WINDOW'};
  return {eligible:true,
    level:candidate.dispositionId===ctx.dispositionId?
      'DIRECT_DISPOSITION_ID_MATCH':'SAME_EMPLOYEE_ONLY',
    certainty:'NOT_PROVEN_REPLACEMENT',
    requiresHumanApproval:true};
}
function aceDsp004ReconAuditSubmitsRC1_(sheet,C,ids,ownerId) {
  var result=Object.create(null),n=sheet.getLastRow();
  if(n<2)return result;
  var data=sheet.getRange(2,1,n-1,Math.max(C.AKSI,C.DETAIL,C.ID_USER,C.WAKTU)+1).getValues();
  data.forEach(function(r,i){
    if(aceDsp004ReconTextRC1_(r[C.AKSI])!=='SUBMIT_LAPORAN')return;
    var id=aceDsp004ReconTextRC1_(r[C.DETAIL]).toLowerCase();
    if(!ids[id])return;
    if(!result[id])result[id]={count:0,ownerMatched:0,lastSubmitAt:''};
    result[id].count++;
    if(aceDsp004ReconTextRC1_(r[C.ID_USER])===ownerId)result[id].ownerMatched++;
    var at=aceDsp004ReconIsoRC1_(r[C.WAKTU]);
    if(at&&at>result[id].lastSubmitAt)result[id].lastSubmitAt=at;
  });
  return result;
}
function aceDsp004ReconDispositionSubmitsRC1_(sheet,C,ids,dispId) {
  var result=Object.create(null),n=sheet.getLastRow();
  if(n<2)return result;
  var rows=sheet.getRange(2,1,n-1,Math.max(C.DETAIL,C.AKSI,C.ID_DISPOSISI)+1).getValues();
  rows.forEach(function(r){
    if(aceDsp004ReconTextRC1_(r[C.ID_DISPOSISI])!==dispId||
       aceDsp004ReconTextRC1_(r[C.AKSI])!=='BUAT_LAPORAN_DARI_DISPOSISI')return;
    var m=/^Laporan terkait:\s*([0-9a-f-]{36})\s*$/i.exec(aceDsp004ReconTextRC1_(r[C.DETAIL]));
    if(!m)return;
    var id=m[1].toLowerCase();
    if(ids[id])result[id]=(result[id]||0)+1;
  });
  return result;
}
function aceDsp004ReconIndexByIdsRC1_(sheet,C,ids) {
  var n=sheet.getLastRow(),byId=Object.create(null);
  if(n<2)return byId;
  var raw=sheet.getRange(2,C.ID_LAPORAN+1,n-1,1).getValues();
  raw.forEach(function(r,i){
    var id=aceDsp004ReconTextRC1_(r[0]).toLowerCase();
    if(!ids[id])return;
    if(!byId[id])byId[id]=[];
    byId[id].push(i+2);
  });
  return byId;
}

function diagnostikRekonsiliasiAdministratifACEDsp004RC1() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_DSP004_RECON_MAINTAINER_REQUIRED');
  pastikanMaintainerPortal3B0_('ACE_DSP004_ADMIN_RECON_READ_ONLY');
  var ss=getSS_(),C=SHEET_COLUMNS,k=ACE_DSP004_RECONCILIATION_RC1_CASE_;
  var rec=ss.getSheetByName('Disposisi_Penerima'),
      surat=ss.getSheetByName('Disposisi_Surat'),
      rekap=ss.getSheetByName('Rekap_Kinerja'),
      index=ss.getSheetByName('Index_Laporan'),
      audit=ss.getSheetByName('Audit_Log'),
      dispLog=ss.getSheetByName('Disposisi_Log');
  if(!rec||!surat||!rekap||!index||!audit||!dispLog)
    throw new Error('ACE_DSP004_RECON_REQUIRED_SHEET_MISSING');
  var DP=C.DISPOSISI_PENERIMA,DS=C.DISPOSISI_SURAT,R=C.REKAP_KINERJA,I=C.INDEX_LAPORAN;
  if(!DP||!DS||!R||!I||!C.AUDIT_LOG||!C.DISPOSISI_LOG)
    throw new Error('ACE_DSP004_RECON_SCHEMA_MISSING');
  if(rec.getLastRow()<k.recipientRow||surat.getLastRow()<k.dispositionRow)
    throw new Error('ACE_DSP004_RECON_ANCHOR_ROW_MISSING');
  var recipient=rec.getRange(k.recipientRow,1,1,
      Math.max(DP.ID_LAPORAN_TERKAIT,DP.ID_PENERIMA,DP.ID_DISPOSISI)+1).getValues()[0],
      ownerId=aceDsp004ReconTextRC1_(recipient[DP.ID_PENERIMA]),
      oldReportId=aceDsp004ReconTextRC1_(recipient[DP.ID_LAPORAN_TERKAIT]),
      dispId=aceDsp004ReconTextRC1_(recipient[DP.ID_DISPOSISI]);
  if(!ownerId||oldReportId.toLowerCase()!==k.reportId||dispId!==k.dispositionId||
      aceDsp004ReconTextRC1_(surat.getRange(
        k.dispositionRow,DS.ID_DISPOSISI+1).getValue())!==dispId)
    throw new Error('ACE_DSP004_RECON_HISTORICAL_ANCHOR_CHANGED');

  // Confirm original ID truly absent before examining proposed replacement.
  function countExact(sheet,col,id){
    var n=sheet.getLastRow();if(n<2)return 0;
    return sheet.getRange(2,col+1,n-1,1)
      .createTextFinder(id).matchEntireCell(true)
      .useRegularExpression(false).findAll().length;
  }
  var oldRekap=countExact(rekap,R.ID_LAPORAN,k.reportId),
      oldIndex=countExact(index,I.ID_LAPORAN,k.reportId);
  if(oldRekap||oldIndex)
    throw new Error('ACE_DSP004_RECON_ORIGINAL_REPORT_STATE_CHANGED');
  var last=rekap.getLastRow(),start=k.earliestAppendRow,
      count=Math.max(0,last-start+1);
  if(count>ACE_DSP004_RECONCILIATION_RC1_MAX_SCAN_ROWS_)
    throw new Error('ACE_DSP004_RECON_SCAN_WINDOW_EXCEEDS_LIMIT');
  var rows=count?rekap.getRange(start,1,count,
    Math.max(R.TANGGAL_LAPORAN,R.ID_LAPORAN,R.ID_USER,R.ID_DISPOSISI,
      R.KATEGORI,R.STATUS_REVIEW)+1).getValues():[];
  var ctx={ownerId:ownerId,oldReportId:k.reportId,dispositionId:k.dispositionId,
    submittedAt:k.originalSubmittedAt,endAt:k.candidateWindowEnd};
  var candidates=[],totalCandidates=0,seenIds=Object.create(null);
  rows.forEach(function(r,j){
    var candidate={row:start+j,id:aceDsp004ReconTextRC1_(r[R.ID_LAPORAN]),
      ownerId:aceDsp004ReconTextRC1_(r[R.ID_USER]),
      dispositionId:aceDsp004ReconTextRC1_(r[R.ID_DISPOSISI]),
      submittedAt:aceDsp004ReconIsoRC1_(r[R.TANGGAL_LAPORAN]),
      status:aceDsp004ReconTextRC1_(r[R.STATUS_REVIEW])};
    if(!candidate.id)return;
    var cls=aceDsp004ReconReviewCandidateRC1_(candidate,ctx);
    if(!cls.eligible)return;
    totalCandidates++;
    if(seenIds[candidate.id.toLowerCase()])
      throw new Error('ACE_DSP004_RECON_DUPLICATE_CANDIDATE_ID');
    seenIds[candidate.id.toLowerCase()]=true;
    if(candidates.length<ACE_DSP004_RECONCILIATION_RC1_MAX_CANDIDATES_){
      candidates.push({
        row:candidate.row,reportId:candidate.id,
        submittedAt:candidate.submittedAt,
        status:candidate.status.substring(0,70),
        hasDirectDispositionLink:cls.level==='DIRECT_DISPOSITION_ID_MATCH',
        evidenceCategory:cls.level,
        replacementProof:'NOT_PROVEN'
      });
    }
  });
  var submitted=aceDsp004ReconAuditSubmitsRC1_(audit,C.AUDIT_LOG,seenIds,ownerId),
      create=aceDsp004ReconDispositionSubmitsRC1_(
        dispLog,C.DISPOSISI_LOG,seenIds,dispId),
      idx=aceDsp004ReconIndexByIdsRC1_(index,I,seenIds);
  candidates.forEach(function(c){
    var id=c.reportId.toLowerCase(),a=submitted[id]||{};
    c.auditSubmitFound=!!a.count;
    c.auditSubmitOwnerMatches=!!a.ownerMatched;
    c.auditSubmitLastAt=a.lastSubmitAt||'';
    c.dispositionCreateLogCount=create[id]||0;
    c.indexRowCount=(idx[id]||[]).length;
    c.indexUnique=(idx[id]||[]).length===1;
    c.humanReviewRequired=true;
    c.autoReplacementApproved=false;
  });
  // Confirm the anchor did not change while the scan was being performed.
  var latest=rec.getRange(k.recipientRow,1,1,Math.max(DP.ID_DISPOSISI,
    DP.ID_LAPORAN_TERKAIT)+1).getValues()[0];
  if(aceDsp004ReconTextRC1_(latest[DP.ID_LAPORAN_TERKAIT]).toLowerCase()!==k.reportId||
      aceDsp004ReconTextRC1_(latest[DP.ID_DISPOSISI])!==k.dispositionId)
    throw new Error('ACE_DSP004_RECON_ANCHOR_CHANGED_DURING_SCAN');
  var result={
    sukses:true,versi:ACE_DSP004_RECONCILIATION_RC1_VERSION_,
    caseId:k.caseId,recipientRow:k.recipientRow,
    originalReportId:k.reportId,dispositionId:k.dispositionId,
    originalAbsentFromRekap:oldRekap===0,originalAbsentFromIndex:oldIndex===0,
    candidateWindow:{from:k.originalSubmittedAt,to:k.candidateWindowEnd},
    searchedFromRow:start,rowsScanned:rows.length,
    totalSameOwnerAfterSubmission:totalCandidates,
    emittedCandidateCount:candidates.length,
    candidateListTruncated:totalCandidates>candidates.length,
    candidates:candidates,
    verdict:'NO_AUTOMATIC_REPLACEMENT_IDENTIFIED',
    nextStep:'COMPARE_ORIGINAL_ACTIVITY_WITH_CANDIDATES_AND_DOCUMENT_ADMIN_DECISION',
    manualAdministrativeApprovalRequired:true,
    financialAndReviewImpactNotAssessed:true,
    historicEvidenceMustRemainUntouched:true,
    permittedToWrite:false,readOnly:true,dataBisnisDiubah:false
  };
  Logger.log('ACE_DSP004_RECON_SUMMARY '+JSON.stringify({
    sukses:result.sukses,versi:result.versi,caseId:result.caseId,
    originalAbsentFromRekap:result.originalAbsentFromRekap,
    originalAbsentFromIndex:result.originalAbsentFromIndex,
    rowsScanned:result.rowsScanned,
    totalSameOwnerAfterSubmission:result.totalSameOwnerAfterSubmission,
    emittedCandidateCount:result.emittedCandidateCount,
    candidateListTruncated:result.candidateListTruncated,
    verdict:result.verdict,readOnly:true,dataBisnisDiubah:false
  }));
  candidates.forEach(function(c,i){
    Logger.log('ACE_DSP004_RECON_CANDIDATE '+(i+1)+'/'+candidates.length+' '+JSON.stringify(c));
  });
  return result;
}

function validasiRekonsiliasiAdministratifACEDsp004RC1() {
  var t=[];function ck(n,ok){t.push({name:n,pass:ok===true});}
  var base={id:'new-id',ownerId:'USER-X',dispositionId:'',
      submittedAt:'2026-10-05T07:22:12Z'};
  var ctx={ownerId:'USER-X',oldReportId:'old-id',
    dispositionId:'DISP-1',submittedAt:'2026-10-01T06:26:18Z',
    endAt:'2026-10-10T16:59:59Z'};
  var classify=aceDsp004ReconReviewCandidateRC1_;
  ck('SAME_OWNER_POSSIBLE_NOT_VERIFIED',
    classify(base,ctx).eligible&&classify(base,ctx).certainty==='NOT_PROVEN_REPLACEMENT');
  ck('DIFFERENT_OWNER_EXCLUDED',!classify(Object.assign({},base,{ownerId:'OTHER'}),ctx).eligible);
  ck('ORIGINAL_EXCLUDED',!classify(Object.assign({},base,{id:'old-id'}),ctx).eligible);
  ck('BEFORE_SUBMISSION_EXCLUDED',!classify(Object.assign({},base,{
    submittedAt:'2026-10-01T06:00:00Z'}),ctx).eligible);
  ck('AFTER_WINDOW_EXCLUDED',!classify(Object.assign({},base,{
    submittedAt:'2026-10-11T00:00:00Z'}),ctx).eligible);
  ck('MISSING_TIME_NOT_GUESSED',!classify(Object.assign({},base,{
    submittedAt:''}),ctx).eligible);
  ck('DIRECT_LINK_STILL_NOT_PROOF',classify(Object.assign({},base,{
    dispositionId:'DISP-1'}),ctx).certainty==='NOT_PROVEN_REPLACEMENT');
  ck('LOCAL_DATE_CONVERSION',
    aceDsp004ReconIsoRC1_('05/10/2026 14:22:12')==='2026-10-05T07:22:12.000Z');
  ck('ISO_DATE_CONVERSION',
    aceDsp004ReconIsoRC1_('2026-10-05T07:22:12Z')==='2026-10-05T07:22:12.000Z');
  ck('NO_NAME_IN_OUTPUT_SCHEMA',
    Object.keys(classify(base,ctx)).indexOf('employeeName')===-1);
  ck('TARGET_ANCHOR_STATIC',ACE_DSP004_RECONCILIATION_RC1_CASE_.recipientRow===622);
  var failed=t.filter(function(x){return !x.pass;});
  var out={sukses:failed.length===0,lulus:t.length-failed.length,
    gagal:failed.length,checks:t,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_RECON_VALIDATION '+JSON.stringify(out));return out;
}
