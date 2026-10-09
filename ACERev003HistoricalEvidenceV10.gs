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


// ============================================================================
// RC2: TARGETED AUDIT DETAIL FORMAT PROBE (READ-ONLY)
// Five known historical April cases only. Do not print raw Audit_Log.DETAIL.
// ============================================================================

var ACE_REV003_AUDIT_FORMAT_V10_VERSION_='ACE-REV003-FORMAT-v1.0-RC2-2026.10.09.01';

function aceRev003AuditTokenTypeV10_(raw,reportId){
  var value=String(raw==null?'':raw).trim();
  if(!value)return {type:'EMPTY',length:0};
  if(value===String(reportId||''))return {type:'REPORT_ID_MATCH'};
  var rm=/^row\s+([0-9]+)$/i.exec(value);
  if(rm)return {type:'ROW_LABEL',row:Number(rm[1])};
  if(/^(Ditolak|Disetujui|Menunggu Review|Banding|Menunggu Persetujuan Lurah|Disetujui - Lewat Cut-off)$/i.test(value))
    return {type:'STATUS',value:value};
  if(/^-?[0-9]+(?:\.[0-9]+)?$/.test(value))
    return {type:'NUMBER',value:Number(value)};
  return {type:'OTHER_REDACTED',length:value.length};
}

function aceRev003SummarizeAuditFormatV10_(raw,reportId){
  var value=String(raw==null?'':raw);
  var parts=value.split('|').map(function(s){return String(s).trim();});
  var tokens=parts.map(function(s){return aceRev003AuditTokenTypeV10_(s,reportId);});
  var idMatches=parts.length>0&&parts[0]===String(reportId||'');
  var template='UNRECOGNIZED',status=null,points=null,row=null;
  if(idMatches&&tokens.length===4&&tokens[1].type==='ROW_LABEL'&&
     tokens[2].type==='STATUS'&&tokens[3].type==='NUMBER'){
    template='ID_ROW_STATUS_POINTS';row=tokens[1].row;
    status=tokens[2].value;points=tokens[3].value;
  }else if(idMatches&&tokens.length===3&&tokens[1].type==='STATUS'&&
            tokens[2].type==='NUMBER'){
    template='ID_STATUS_POINTS_LEGACY';status=tokens[1].value;points=tokens[2].value;
  }else if(idMatches&&tokens.length===1){
    template='ID_ONLY_NO_DECISION_DETAILS';
  }
  return {firstSegmentIdMatches:idMatches,segmentCount:parts.length,
    separatorCount:Math.max(0,parts.length-1),tokens:tokens,
    template:template,decisionParsed:status!==null&&points!==null,
    parsedStatus:status,parsedPoints:points,parsedRow:row};
}

function diagnostikFormatAuditHistorisACERev003V10(){
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_REV003_MAINTAINER_GATE_REQUIRED');
  pastikanMaintainerPortal3B0_('ACE_REV003_AUDIT_FORMAT_PROBE_READ_ONLY');
  var ss=getSS_(),sh=ss.getSheetByName('Audit_Log'),
    rek=ss.getSheetByName('Rekap_Kinerja');
  var A=SHEET_COLUMNS.AUDIT_LOG,C=SHEET_COLUMNS.REKAP_KINERJA;
  if(!sh||!rek||!A||!C)throw new Error('ACE_REV003_REQUIRED_SHEET_UNAVAILABLE');

  // Fixed read-only, source-verified 2026-04 case anchors. Nothing is written.
  var targets=[
    {caseId:1,id:'c140dd0f-8a08-4644-af8a-7bc2f8742445',rekapRow:39,auditRow:264,points:2},
    {caseId:2,id:'aa387c3e-a168-4434-a99a-63a34093af17',rekapRow:44,auditRow:245,points:25},
    {caseId:3,id:'1a0f26e7-3296-435d-990d-c33424f2be9e',rekapRow:50,auditRow:250,points:25},
    {caseId:4,id:'bc760b49-5b1a-47f6-b240-69d48345ca44',rekapRow:51,auditRow:247,points:2},
    {caseId:5,id:'7a590d7e-6403-492c-94aa-be1f2d3aaaab',rekapRow:53,auditRow:251,points:2}
  ];
  var rows=targets.map(function(t){
    if(t.auditRow>sh.getLastRow()||t.rekapRow>rek.getLastRow())
      return {caseId:t.caseId,verified:false,reason:'ANCHOR_ROW_OUT_OF_RANGE'};
    var reportId=String(rek.getRange(t.rekapRow,C.ID_LAPORAN+1).getValue()||'').trim();
    if(reportId!==t.id)return {caseId:t.caseId,verified:false,reason:'REKAP_ID_CHANGED'};
    var state=rek.getRange(t.rekapRow,C.STATUS_REVIEW+1,1,2).getValues()[0],
      status=String(state[0]||'').trim(),points=Number(state[1]);
    if(status!=='Ditolak'||!isFinite(points)||Math.abs(points-t.points)>0.001)
      return {caseId:t.caseId,verified:false,reason:'REKAP_STATE_CHANGED'};
    var audit=sh.getRange(t.auditRow,1,1,4).getValues()[0];
    if(String(audit[A.AKSI]||'').trim()!=='REVIEW_LAPORAN')
      return {caseId:t.caseId,verified:false,reason:'AUDIT_ACTION_CHANGED'};
    var shape=aceRev003SummarizeAuditFormatV10_(audit[A.DETAIL],t.id);
    return {caseId:t.caseId,verified:shape.firstSegmentIdMatches,
      auditRow:t.auditRow,rekapRow:t.rekapRow,
      actorPresent:!!String(audit[A.ID_USER]||'').trim(),
      format:shape,reason:shape.firstSegmentIdMatches?'':'AUDIT_ID_MISMATCH'};
  });
  var matches=rows.filter(function(r){return r.verified;}).length,
    parsed=rows.filter(function(r){return r.verified&&r.format.decisionParsed;}).length;
  var out={sukses:matches===5,versi:ACE_REV003_AUDIT_FORMAT_V10_VERSION_,
    expected:targets.length,verified:matches,decisionParsed:parsed,
    decisionUnknown:matches-parsed,rows:rows,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_AUDIT_FORMAT_SUMMARY '+JSON.stringify({
    sukses:out.sukses,versi:out.versi,expected:out.expected,verified:out.verified,
    decisionParsed:out.decisionParsed,decisionUnknown:out.decisionUnknown,
    readOnly:true,dataBisnisDiubah:false}));
  rows.forEach(function(r){Logger.log('ACE_REV003_AUDIT_FORMAT_CASE '+JSON.stringify(r));});
  return out;
}

function validasiFormatAuditHistorisACERev003V10(){
  var checks=[];function add(n,ok){checks.push({nama:n,lulus:ok===true});}
  var id='EXAMPLE-REPORT';
  var m=aceRev003SummarizeAuditFormatV10_(id+' | row 39 | Ditolak | 25',id);
  add('MODERN_FOUR_PARTS',m.decisionParsed&&m.parsedRow===39&&m.parsedPoints===25);
  var l=aceRev003SummarizeAuditFormatV10_(id+' | Ditolak | 0',id);
  add('LEGACY_THREE_PARTS',l.decisionParsed&&l.parsedPoints===0);
  var o=aceRev003SummarizeAuditFormatV10_(id,id);
  add('ID_ONLY_UNVERIFIABLE',!o.decisionParsed&&o.template==='ID_ONLY_NO_DECISION_DETAILS');
  var w=aceRev003SummarizeAuditFormatV10_('WRONG | row 39 | Ditolak | 25',id);
  add('ID_MISMATCH_BLOCKED',!w.firstSegmentIdMatches&&!w.decisionParsed);
  var u=aceRev003SummarizeAuditFormatV10_(id+' | text rahasia',id);
  add('UNRECOGNIZED_REDACTED',u.tokens[1].type==='OTHER_REDACTED'&&
    JSON.stringify(u).indexOf('text rahasia')===-1);
  var n=aceRev003SummarizeAuditFormatV10_(id+' | row 39 | Ditolak | unknown',id);
  add('UNKNOWN_SCORE_NOT_GUESSED',n.decisionParsed===false);
  var z=aceRev003SummarizeAuditFormatV10_(id+' | Ditolak | 25',id);
  add('NO_FAKE_ROW',z.parsedRow===null);
  add('ALL_PARSE_CASES_BOUNDED',[m,l,o,w,u,n,z].every(function(x){return x.segmentCount<=4;}));
  var fail=checks.filter(function(x){return !x.lulus;});
  var ret={sukses:fail.length===0,lulus:checks.length-fail.length,gagal:fail.length,
    checks:checks,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_AUDIT_FORMAT_VALIDATION '+JSON.stringify(ret));
  return ret;
}
