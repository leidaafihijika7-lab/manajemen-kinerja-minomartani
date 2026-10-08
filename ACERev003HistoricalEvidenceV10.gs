// ============================================================================
// ACE-REV-003 HISTORICAL REVIEW EVIDENCE v1.0 RC1 (2026.10.08)
// Independent read-only evidence inspection for historical rejected reports.
// Requires ACE Batch A, Batch B, and ACERev003DiagnosticsV10.gs.
// No writes, no historical mutations, no raw audit detail / personal data logs.
// ============================================================================

var ACE_REV003_HISTORICAL_EVIDENCE_V10_VERSION_ =
  'ACE-REV003-HISTORY-v1.0-RC1-2026.10.08.01';

function aceRev003ParseReviewAuditV10_(entry, reportId) {
  var detail=String(entry&&entry.detail||'').trim();
  var parts=detail.split(/\s*\|\s*/);
  var belongs=parts.length>=4&&parts[0].trim()===String(reportId||'');
  var rawPoints=belongs?String(parts[3]||'').trim():'';
  var numeric=!!rawPoints&&/^-?\d+(?:\.\d+)?$/.test(rawPoints);
  var score=belongs&&numeric?Number(rawPoints):null;
  return {
    auditRow:Number(entry&&entry.row||0),
    time:String(entry&&entry.waktu||''),
    action:String(entry&&entry.action||''),
    actorRecorded:!!String(entry&&entry.actor||'').trim(),
    parsed:belongs&&numeric&&isFinite(score),
    auditedStatus:belongs?String(parts[2]||'').trim():null,
    auditedPoints:belongs&&numeric&&isFinite(score)?score:null,
    auditReportIdMatched:belongs,
    auditRekapRow:belongs&&/^row\s+\d+$/i.test(String(parts[1]||'').trim())
      ?Number(String(parts[1]).replace(/[^\d]/g,'')):null
  };
}

function aceRev003ReadRawScoreV10_(sheet, cols, report) {
  if(!sheet||!cols||typeof cols.POIN_SISTEM!=='number'||
      typeof cols.ID_LAPORAN!=='number')
    return {verified:false,reason:'SCHEMA_OR_SHEET_UNAVAILABLE'};
  var row=Number(report.row||0);
  if(row<2||row>sheet.getLastRow())
    return {verified:false,reason:'ROW_OUT_OF_RANGE'};
  var liveId=String(sheet.getRange(row,cols.ID_LAPORAN+1).getValue()||'').trim();
  if(liveId!==String(report.id||''))
    return {verified:false,reason:'REPORT_ID_ROW_MISMATCH'};
  var v=sheet.getRange(row,cols.POIN_SISTEM+1).getValue();
  var n=typeof v==='number'?v:Number(String(v||'').trim());
  return {verified:true,poinSistem:v===''||v==null?null:(isFinite(n)?n:null),
    scoreCellIsNumeric:v!==''&&v!=null&&isFinite(n),
    catatanAdminAda:typeof cols.CATATAN_ADMIN==='number'
      ?!!String(sheet.getRange(row,cols.CATATAN_ADMIN+1).getValue()||'').trim():null};
}

function aceRev003ClassifyHistoricalV10_(status,points,audit) {
  if(!audit||!audit.parsed) return 'AUDIT_DETAIL_UNVERIFIABLE';
  var nowRejected=aceBv10IsRejected_(status);
  var auditRejected=aceBv10IsRejected_(audit.auditedStatus);
  if(nowRejected&&auditRejected&&audit.auditedPoints>0)
    return 'REJECTED_WITH_NONZERO_POINTS_ALREADY_IN_AUDIT';
  if(nowRejected&&auditRejected&&audit.auditedPoints===0&&Number(points)>0)
    return 'CURRENT_STATE_DIFFERS_FROM_REVIEW_AUDIT';
  if(String(status||'')!==String(audit.auditedStatus||''))
    return 'REVIEW_STATUS_DIFFERS_FROM_AUDIT';
  if(Math.abs(Number(points)-Number(audit.auditedPoints))>0.001)
    return 'REVIEW_POINTS_DIFFER_FROM_AUDIT';
  return 'OTHER_HISTORICAL_INCONSISTENCY';
}

function diagnostikJejakHistorisACERev003V10() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_REV003_MAINTAINER_GATE_REQUIRED');
  pastikanMaintainerPortal3B0_('ACE_REV003_HISTORICAL_EVIDENCE_READ_ONLY');
  var bundle=aceBv10BuildSourceBundle_({period:'2026-09'});
  var base=aceRev003ReportV10_(bundle);
  if(!base.sukses||base.sourceErrors.length)
    throw new Error('ACE_REV003_SOURCE_OR_CANONICAL_MISMATCH');
  var sheet=getSS_().getSheetByName('Rekap_Kinerja');
  var C=typeof SHEET_COLUMNS!=='undefined'?SHEET_COLUMNS.REKAP_KINERJA:null;
  var bad=bundle.reports.records.filter(aceRev003ViolationV10_);
  var rows=bad.map(function(r){
    var audits=(r.auditReview||[]).slice().sort(function(a,b){
      return Number(a.row||0)-Number(b.row||0);
    });
    var allAudits=audits.map(function(a){
      return aceRev003ParseReviewAuditV10_(a,r.id);
    });
    var latest=allAudits.length?allAudits[allAudits.length-1]:null;
    var raw=aceRev003ReadRawScoreV10_(sheet,C,r);
    return {
      reportId:String(r.id||''),sheetRow:Number(r.row||0),
      officialPeriod:String(r.period||''),sourcePeriod:String(r.sourcePeriod||''),
      statusReview:String(r.status||''),poinFinal:Number(r.poinFinal||0),
      indexMatches:!!r.index&&r.index.status===r.status&&
        Math.abs(Number(r.index.poinFinal||0)-Number(r.poinFinal||0))<=0.001,
      legacyBackfill:r.legacyBackfill===true,
      rawScoreSnapshot:raw,
      auditCount:allAudits.length,
      latestAudit:latest,
      auditAssessment:aceRev003ClassifyHistoricalV10_(r.status,r.poinFinal,latest),
      // Do not infer allowance impact from raw final points.
      historicalAllowanceImpact:'NOT_ASSESSED'
    };
  });
  var out={sukses:rows.length===base.diagnosticCount,
    version:ACE_REV003_HISTORICAL_EVIDENCE_V10_VERSION_,
    controlId:'ACE-REV-003',period:bundle.period,
    canonicalCount:base.canonicalCount,caseCount:rows.length,
    sourceErrors:base.sourceErrors,rows:rows,
    readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_HISTORY_SUMMARY '+JSON.stringify({
    sukses:out.sukses,version:out.version,caseCount:out.caseCount,
    canonicalCount:out.canonicalCount,readOnly:true,dataBisnisDiubah:false
  }));
  rows.forEach(function(r,i){
    Logger.log('ACE_REV003_HISTORY_CASE '+(i+1)+'/'+rows.length+' '+JSON.stringify(r));
  });
  return out;
}

function validasiJejakHistorisACERev003V10(){
  var tests=[];function ck(n,ok){tests.push({name:n,pass:ok===true});}
  var id='TEST-REPORT',a={row:10,waktu:'2026-04-06T02:00:00Z',
    actor:'ADMIN',action:'REVIEW_LAPORAN',
    detail:'TEST-REPORT | row 39 | Ditolak | 25'};
  var parsed=aceRev003ParseReviewAuditV10_(a,id);
  ck('AUDIT_FORMAT',parsed.parsed===true&&parsed.auditRekapRow===39);
  ck('AUDIT_STATUS_SCORE',parsed.auditedStatus==='Ditolak'&&parsed.auditedPoints===25);
  ck('AUDIT_ID_GUARD',aceRev003ParseReviewAuditV10_(a,'OTHER').parsed===false);
  ck('NONNUMERIC_NOT_GUESSED',aceRev003ParseReviewAuditV10_({
    detail:'TEST-REPORT | row 39 | Ditolak | unknown'},id).parsed===false);
  ck('REJECTED_ALREADY_IN_AUDIT',
    aceRev003ClassifyHistoricalV10_('Ditolak',25,parsed)==='REJECTED_WITH_NONZERO_POINTS_ALREADY_IN_AUDIT');
  ck('SCORE_CHANGED_SINCE_AUDIT',
    aceRev003ClassifyHistoricalV10_('Ditolak',25,
      aceRev003ParseReviewAuditV10_({detail:'TEST-REPORT | row 39 | Ditolak | 0'},id))
    ==='CURRENT_STATE_DIFFERS_FROM_REVIEW_AUDIT');
  ck('UNPARSEABLE_IS_NOT_PROVEN',
    aceRev003ClassifyHistoricalV10_('Ditolak',25,{parsed:false})
    ==='AUDIT_DETAIL_UNVERIFIABLE');
  ck('SOURCE_RECONCILIATION_HELPERS',
    typeof aceRev003ReportV10_==='function'&&typeof aceBv10BuildSourceBundle_==='function');
  var fails=tests.filter(function(t){return !t.pass;});
  var out={sukses:fails.length===0,lulus:tests.length-fails.length,
    gagal:fails.length,tests:tests,readOnly:true};
  Logger.log('ACE_REV003_HISTORY_VALIDATION '+JSON.stringify(out));return out;
}
