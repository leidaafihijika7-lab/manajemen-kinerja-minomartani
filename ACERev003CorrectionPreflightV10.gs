// ============================================================================
// ACE-REV-003 HISTORICAL CORRECTION PREFLIGHT v1.0 RC1 (2026-10-09)
// Preview only. NO writes, NO deployment, NO payment recomputation.
// Preserve source score and immutable 2026-04 review audit.
// Actual remediation requires human authorization and PRE_MAINTENANCE backup.
// Depends on ACERev003HistoricalEvidenceV10.gs and ACERev003AllowanceTraceV10.gs.
// ============================================================================

var ACE_REV003_CORRECTION_PREFLIGHT_VERSION_='ACE-REV003-CORR-PREFLIGHT-v1.0-RC1-2026.10.09.01';

function aceRev003CorrPreflightAssessV10_(x) {
  x=x||{};
  var issues=[];
  function require_(pass,code){if(pass!==true)issues.push(code);}
  require_(x.reportIdMatches===true,'REKAP_REPORT_ID_CHANGED');
  require_(x.status==='Ditolak','REVIEW_STATUS_CHANGED');
  require_(typeof x.poinFinal==='number'&&isFinite(x.poinFinal)&&
    Math.abs(x.poinFinal-x.expectedPoints)<=0.001,'REKAP_FINAL_POINTS_CHANGED');
  require_(x.legacyBackfill===true,'LEGACY_BACKFILL_NOT_VERIFIED');
  require_(x.indexCount===1,'INDEX_REPORT_ID_NOT_UNIQUE');
  require_(x.indexMatches===true,'INDEX_STATUS_POINTS_OR_ROW_DIFFER');
  require_(x.auditCount===1,'AUDIT_REVIEW_EVENT_NOT_UNIQUE');
  require_(x.auditMatches===true,'HISTORIC_AUDIT_STATUS_OR_POINTS_DIFFER');
  return {eligibleForReview:issues.length===0,blockers:issues};
}

function aceRev003CorrPreflightLegacyV10_(raw1,raw2) {
  function parse_(v){
    if(v===null||v===undefined||v==='')return null;
    if(typeof v==='object'&&!Array.isArray(v))return v;
    try{return JSON.parse(String(v));}catch(e){return null;}
  }
  var a=parse_(raw1),b=parse_(raw2);
  return !!((a&&a.legacyBackfill===true)||(b&&b.legacyBackfill===true));
}

function aceRev003CorrPreflightReadIndexV10_(ss,I,targetMap){
  var sh=ss.getSheetByName('Index_Laporan');
  if(!sh||!I)throw new Error('ACE_REV003_INDEX_SOURCE_UNAVAILABLE');
  var max=Math.max(I.ID_LAPORAN,I.ROW_REKAP,I.STATUS_REVIEW,I.POIN_FINAL,I.PERIODE_RESMI)+1;
  var n=sh.getLastRow(),matched=Object.create(null);
  if(n<2)return matched;
  sh.getRange(2,1,n-1,max).getValues().forEach(function(r,j){
    var id=String(r[I.ID_LAPORAN]||'').trim();
    if(!targetMap[id])return;
    if(!matched[id])matched[id]=[];
    matched[id].push({sheetRow:j+2,rekapRow:Number(r[I.ROW_REKAP]),
      status:String(r[I.STATUS_REVIEW]||'').trim(),
      poinFinal:Number(r[I.POIN_FINAL]),period:String(r[I.PERIODE_RESMI]||'').trim()});
  });
  return matched;
}

function aceRev003CorrPreflightReadAuditsV10_(ss,A,targetMap){
  var sh=ss.getSheetByName('Audit_Log');
  if(!sh||!A)throw new Error('ACE_REV003_AUDIT_SOURCE_UNAVAILABLE');
  var matched=Object.create(null),n=sh.getLastRow();
  if(n<2)return matched;
  var lastCol=Math.max(A.AKSI,A.DETAIL,A.ID_USER)+1;
  sh.getRange(2,1,n-1,lastCol).getValues().forEach(function(r,j){
    if(String(r[A.AKSI]||'').trim()!=='REVIEW_LAPORAN')return;
    var detail=String(r[A.DETAIL]||''),id=detail.split('|')[0].trim();
    if(!targetMap[id])return;
    if(!matched[id])matched[id]=[];
    var parsed=aceRev003SummarizeAuditFormatV10_(detail,id);
    matched[id].push({row:j+2,
      actorPresent:!!String(r[A.ID_USER]||'').trim(),
      parsed:parsed.decisionParsed,
      idMatches:parsed.firstSegmentIdMatches,
      status:parsed.parsedStatus,
      points:parsed.parsedPoints,
      template:parsed.template});
  });
  return matched;
}

function praKoreksiHistorisACERev003V10(){
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_REV003_MAINTAINER_GATE_UNAVAILABLE');
  pastikanMaintainerPortal3B0_('ACE_REV003_CORRECTION_PREFLIGHT_READ_ONLY');
  if(typeof aceRev003AllowanceTargetsV10_!=='function'||
     typeof aceRev003AllowanceReadRowsV10_!=='function'||
     typeof aceRev003AllowanceReadAuditV10_!=='function'||
     typeof aceRev003SummarizeAuditFormatV10_!=='function')
    throw new Error('ACE_REV003_PREFLIGHT_DEPENDENCY_UNAVAILABLE');

  var ss=getSS_(),S=SHEET_COLUMNS||{},C=S.REKAP_KINERJA,
      I=S.INDEX_LAPORAN,A=S.AUDIT_LOG,T=S.REKAP_TUNJANGAN_BULANAN,AT=S.AUDIT_TUNJANGAN;
  if(!C||!I||!A||!T||!AT)throw new Error('ACE_REV003_PREFLIGHT_SCHEMA_UNAVAILABLE');
  var sh=ss.getSheetByName('Rekap_Kinerja');
  if(!sh)throw new Error('ACE_REV003_REKAP_SHEET_UNAVAILABLE');
  var specs=aceRev003AllowanceTargetsV10_();
  var allowed=Object.create(null);
  specs.forEach(function(s){allowed[s.id]=true;});
  if(specs.length!==5||Object.keys(allowed).length!==5)
    throw new Error('ACE_REV003_ANCHOR_ALLOWLIST_INVALID');

  var indexes=aceRev003CorrPreflightReadIndexV10_(ss,I,allowed),
      audits=aceRev003CorrPreflightReadAuditsV10_(ss,A,allowed);
  var endCol=Math.max(C.ID_LAPORAN,C.ID_USER,C.STATUS_REVIEW,C.POIN_FINAL,
    C.POIN_SISTEM,C.PAYLOAD_JSON,C.PAYLOAD_DETAIL_JSON)+1;
  var items=specs.map(function(s,i){
    var r=s.reportRow<=sh.getLastRow()
      ?sh.getRange(s.reportRow,1,1,endCol).getValues()[0]:[];
    var id=String(r[C.ID_LAPORAN]||'').trim(),
      status=String(r[C.STATUS_REVIEW]||'').trim(),
      points=r[C.POIN_FINAL],
      score=r[C.POIN_SISTEM],
      pointsNumber=typeof points==='number'?points:Number(points),
      sourceScore=score===''||score==null?null:Number(score),
      legacy=aceRev003CorrPreflightLegacyV10_(r[C.PAYLOAD_JSON],r[C.PAYLOAD_DETAIL_JSON]),
      foundIndex=indexes[s.id]||[],index=foundIndex.length===1?foundIndex[0]:null,
      foundAudit=audits[s.id]||[],aud=foundAudit.length===1?foundAudit[0]:null;
    var idxMatches=!!index&&index.rekapRow===s.reportRow&&
      index.status===status&&Math.abs(index.poinFinal-pointsNumber)<=0.001&&
      aceRev003AllowPeriodV10_(index.period)==='2026-04';
    var audMatches=!!aud&&aud.row===s.auditRow&&aud.actorPresent&&
      aud.idMatches&&aud.parsed&&aud.status==='Ditolak'&&
      Math.abs(Number(aud.points)-s.points)<=0.001;
    var assessment=aceRev003CorrPreflightAssessV10_({
      reportIdMatches:id===s.id,status:status,
      poinFinal:pointsNumber,expectedPoints:s.points,
      legacyBackfill:legacy,indexCount:foundIndex.length,
      indexMatches:idxMatches,auditCount:foundAudit.length,
      auditMatches:audMatches
    });
    return {
      caseId:i+1,reportId:s.id,
      rekapRow:s.reportRow,indexRow:index?index.sheetRow:null,
      auditRow:s.auditRow,
      sourceScore:sourceScore,
      statusReview:status,legacyBackfill:legacy,
      oldFinalPoints:isFinite(pointsNumber)?pointsNumber:null,
      proposedFinalPoints:0,
      indexOldFinalPoints:index?index.poinFinal:null,
      indexProposedFinalPoints:0,
      auditTemplate:aud?aud.template:null,
      readOnlyProposedEdits:[
        {sheet:'Rekap_Kinerja',row:s.reportRow,column:C.POIN_FINAL+1},
        {sheet:'Index_Laporan',row:index?index.sheetRow:null,column:I.POIN_FINAL+1}
      ],
      eligibleForReview:assessment.eligibleForReview,
      blockers:assessment.blockers
    };
  });

  var allowance=aceRev003AllowanceReadRowsV10_(ss,T),
      auditAllowance=aceRev003AllowanceReadAuditV10_(ss,AT);
  var periods=['2026-04','2026-05'].map(function(p){
    var summary=aceRev003AllowSummaryV10_(allowance.rows,p);
    summary.allowanceAuditEventCount=auditAllowance.records.filter(function(a){
      return a.period===p;}).length;
    return summary;
  });
  var paymentEvidence=allowance.rows.filter(function(r){
    return (r.period==='2026-04'||r.period==='2026-05')&&
      (r.status==='Sudah Dicairkan'||r.payoutTimestampPresent);
  });
  var blockers=[];
  if(!allowance.available)blockers.push('ALLOWANCE_SHEET_UNAVAILABLE');
  if(!auditAllowance.available)blockers.push('ALLOWANCE_AUDIT_SHEET_UNAVAILABLE');
  if(paymentEvidence.length)blockers.push('PAYMENT_FLAG_PRESENT_REVIEW_REQUIRED');
  items.forEach(function(r){r.blockers.forEach(function(b){
    blockers.push('CASE_'+r.caseId+':'+b);
  });});
  var outcome={
    sukses:items.length===5,
    versi:ACE_REV003_CORRECTION_PREFLIGHT_VERSION_,
    mode:'DRY_RUN_ONLY',
    caseCount:items.length,
    readiness:blockers.length?'BLOCKED':'READY_FOR_HUMAN_REVIEW_ONLY',
    blockers:blockers,
    periods:periods,
    proposedUpdates:10,
    proposedPointReduction:items.reduce(function(n,r){return n+Number(r.oldFinalPoints||0);},0),
    reportRows:items,
    humanApprovalRequired:true,
    independentPaymentReconciliationRequired:true,
    preMaintenanceBackupRequired:true,
    futureCorrectionMustAppendAudit:true,
    historicAuditRecordsAreImmutable:true,
    mustNotRecomputeHistoricalAllowance:true,
    permittedToApplyNow:false,
    dataBisnisDiubah:false,readOnly:true
  };
  Logger.log('ACE_REV003_CORRECTION_PREFLIGHT_SUMMARY '+JSON.stringify({
    sukses:outcome.sukses,versi:outcome.versi,mode:outcome.mode,
    readiness:outcome.readiness,blockers:outcome.blockers,
    caseCount:outcome.caseCount,proposedUpdates:outcome.proposedUpdates,
    proposedPointReduction:outcome.proposedPointReduction,
    periods:outcome.periods,
    permittedToApplyNow:false,dataBisnisDiubah:false,readOnly:true
  }));
  items.forEach(function(r){
    Logger.log('ACE_REV003_CORRECTION_PREFLIGHT_CASE '+JSON.stringify(r));
  });
  return outcome;
}

function validasiPraKoreksiHistorisACERev003V10(){
  var checks=[];function add(n,pass){checks.push({nama:n,lulus:pass===true});}
  var base={reportIdMatches:true,status:'Ditolak',poinFinal:25,expectedPoints:25,
    legacyBackfill:true,indexCount:1,indexMatches:true,auditCount:1,auditMatches:true};
  add('NORMAL_READY',aceRev003CorrPreflightAssessV10_(base).eligibleForReview);
  var names=[
    ['ID_CHANGED','reportIdMatches',false],
    ['STATUS_CHANGED','status','Disetujui'],
    ['POINT_CHANGED','poinFinal',7],
    ['NOT_LEGACY','legacyBackfill',false],
    ['INDEX_DUPLICATE','indexCount',2],
    ['INDEX_DIFF','indexMatches',false],
    ['AUDIT_DUPLICATE','auditCount',2],
    ['AUDIT_DIFF','auditMatches',false]
  ];
  names.forEach(function(t){
    var v=Object.assign({},base);v[t[1]]=t[2];
    add(t[0],!aceRev003CorrPreflightAssessV10_(v).eligibleForReview);
  });
  add('LEGACY_JSON_TRUE',aceRev003CorrPreflightLegacyV10_('{"legacyBackfill":true}',''));
  add('BAD_JSON_NOT_TRUSTED',!aceRev003CorrPreflightLegacyV10_('{broken',''));
  add('TARGET_ALLOWLIST_FIVE',aceRev003AllowanceTargetsV10_().length===5);
  add('HELPERS_AVAILABLE',typeof aceRev003AllowSummaryV10_==='function'&&
    typeof aceRev003SummarizeAuditFormatV10_==='function');
  var fail=checks.filter(function(x){return !x.lulus;});
  var result={sukses:fail.length===0,lulus:checks.length-fail.length,
    gagal:fail.length,checks:checks,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_CORRECTION_PREFLIGHT_VALIDATION '+JSON.stringify(result));
  return result;
}
