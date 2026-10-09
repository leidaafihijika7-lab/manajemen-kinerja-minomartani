// ============================================================================
// ACE-REV-003 | Targeted historical allowance trace | RC1 2026.10.09
// Strictly read-only: investigate whether April rejected reports intersect
// with April/May allowance batch records. Never infer actual disbursement
// attributable to an individual report from aggregated employee totals.
// Requires SheetSchema.gs, Kode.gs and ACERev003HistoricalEvidenceV10.gs.
// ============================================================================

var ACE_REV003_ALLOWANCE_TRACE_V10_VERSION_='ACE-REV003-TUN-TRACE-v1.0-RC1-2026.10.09.01';

function aceRev003AllowanceTargetsV10_(){
  return [
    {id:'c140dd0f-8a08-4644-af8a-7bc2f8742445',reportRow:39,auditRow:264,points:2},
    {id:'aa387c3e-a168-4434-a99a-63a34093af17',reportRow:44,auditRow:245,points:25},
    {id:'1a0f26e7-3296-435d-990d-c33424f2be9e',reportRow:50,auditRow:250,points:25},
    {id:'bc760b49-5b1a-47f6-b240-69d48345ca44',reportRow:51,auditRow:247,points:2},
    {id:'7a590d7e-6403-492c-94aa-be1f2d3aaaab',reportRow:53,auditRow:251,points:2}
  ];
}
function aceRev003AllowPeriodV10_(v){
  if(typeof periodeKeyTunjangan_==='function')return periodeKeyTunjangan_(v,false);
  var t=String(v==null?'':v).trim();return /^\d{4}-(0[1-9]|1[0-2])$/.test(t)?t:'';
}
function aceRev003AllowDateV10_(v){
  if(v instanceof Date&&!isNaN(v.getTime()))
    return Utilities.formatDate(v,'GMT+7','yyyy-MM-dd');
  var s=String(v==null?'':v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
}
function aceRev003AllowActiveV10_(v){
  return v===true||v===1||v==='TRUE'||v==='true'||v==='1';
}
function aceRev003AllowSnapshotRecordV10_(r,C,rowNo){
  var period=aceRev003AllowPeriodV10_(r[C.PERIODE]);
  return {
    sheetRow:rowNo,period:period,
    idUser:String(r[C.ID_USER]||'').trim(),
    status:String(r[C.STATUS_REKAP]||'').trim(),
    active:aceRev003AllowActiveV10_(r[C.IS_ACTIVE]),
    batchKey:String(r[C.BATCH_ID]||'').trim(),
    jumlahDisetujui:Number(r[C.JUMLAH_LAPORAN_DISETUJUI]||0),
    poinProd:Number(r[C.POIN_PROD]||0),
    poinTu:Number(r[C.POIN_TU]||0),
    payoutTimestampPresent:!!r[C.DICAIRKAN_PADA],
    windowStart:aceRev003AllowDateV10_(r[C.TANGGAL_MULAI_PERIODE]),
    windowEnd:aceRev003AllowDateV10_(r[C.TANGGAL_AKHIR_PERIODE])
  };
}
function aceRev003AllowUniqueV10_(a){
  var unique=Object.create(null);
  (a||[]).forEach(function(x){var s=String(x||'');if(s)unique[s]=true;});
  return Object.keys(unique).sort();
}
function aceRev003AllowSummaryV10_(rows,period){
  rows=(rows||[]).filter(function(r){return r.period===period;});
  return {
    period:period,snapshotRows:rows.length,
    activeRows:rows.filter(function(r){return r.active;}).length,
    paidStatusRows:rows.filter(function(r){return r.status==='Sudah Dicairkan';}).length,
    payoutDateRows:rows.filter(function(r){return r.payoutTimestampPresent;}).length,
    batchCount:aceRev003AllowUniqueV10_(rows.map(function(r){return r.batchKey;})).length,
    statuses:aceRev003AllowUniqueV10_(rows.map(function(r){return r.status;})),
    windows:aceRev003AllowUniqueV10_(rows.map(function(r){return r.windowStart+'..'+r.windowEnd;}))
  };
}
function aceRev003AllowanceReadRowsV10_(ss,C){
  var sh=ss.getSheetByName('Rekap_Tunjangan_Bulanan');
  if(!sh)return {available:false,rows:[]};
  if(!C||typeof C.TANGGAL_AKHIR_PERIODE!=='number')
    throw new Error('ACE_REV003_TUN_SCHEMA_UNAVAILABLE');
  var last=sh.getLastRow(),n=Math.max(C.TANGGAL_CUTOFF+1,34);
  if(last<2)return {available:true,rows:[]};
  var cells=sh.getRange(2,1,last-1,n).getValues(),records=[];
  cells.forEach(function(row,i){
    var rec=aceRev003AllowSnapshotRecordV10_(row,C,i+2);
    if(rec.period==='2026-04'||rec.period==='2026-05')records.push(rec);
  });
  return {available:true,rows:records};
}
function aceRev003AllowanceReadAuditV10_(ss,C){
  var sh=ss.getSheetByName('Audit_Tunjangan');
  if(!sh)return {available:false,records:[]};
  if(!C||typeof C.DETAIL!=='number')
    throw new Error('ACE_REV003_TUN_AUDIT_SCHEMA_UNAVAILABLE');
  var last=sh.getLastRow();
  if(last<2)return {available:true,records:[]};
  var cells=sh.getRange(2,1,last-1,C.DETAIL+1).getValues(),records=[];
  cells.forEach(function(row,i){
    var period=aceRev003AllowPeriodV10_(row[C.PERIODE]);
    if(period!=='2026-04'&&period!=='2026-05')return;
    records.push({row:i+2,period:period,
      targetIdUser:String(row[C.TARGET_ID_USER]||'').trim(),
      action:String(row[C.AKSI]||'').trim().substring(0,80),
      statusBefore:String(row[C.STATUS_LAMA]||'').trim().substring(0,80),
      statusAfter:String(row[C.STATUS_BARU]||'').trim().substring(0,80)});
  });
  return {available:true,records:records};
}
function diagnostikDampakTunjanganACERev003V10(){
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_REV003_MAINTAINER_GATE_UNAVAILABLE');
  pastikanMaintainerPortal3B0_('ACE_REV003_ALLOWANCE_TRACE_READ_ONLY');
  if(typeof aceRev003SummarizeAuditFormatV10_!=='function'||
     typeof isStatusApproved_!=='function')
    throw new Error('ACE_REV003_REQUIRED_HELPERS_UNAVAILABLE');
  var ss=getSS_(),R=SHEET_COLUMNS.REKAP_KINERJA,
      A=SHEET_COLUMNS.AUDIT_LOG,T=SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN,
      AT=SHEET_COLUMNS.AUDIT_TUNJANGAN;
  var reports=ss.getSheetByName('Rekap_Kinerja'), audit=ss.getSheetByName('Audit_Log');
  if(!reports||!audit)throw new Error('ACE_REV003_REQUIRED_SHEETS_UNAVAILABLE');
  var targets=aceRev003AllowanceTargetsV10_();
  var anchors=targets.map(function(t,i){
    if(t.reportRow>reports.getLastRow()||t.auditRow>audit.getLastRow())
      throw new Error('ACE_REV003_ANCHOR_MISSING_CASE_'+(i+1));
    var raw=reports.getRange(t.reportRow,1,1,Math.max(R.ID_USER+1,R.POIN_FINAL+1)).getValues()[0];
    var id=String(raw[R.ID_LAPORAN]||'').trim(),
      ownerId=String(raw[R.ID_USER]||'').trim(),
      status=String(raw[R.STATUS_REVIEW]||'').trim(),points=Number(raw[R.POIN_FINAL]);
    if(id!==t.id||!ownerId||status!=='Ditolak'||!isFinite(points)||
      Math.abs(points-t.points)>0.001)
      throw new Error('ACE_REV003_REKAP_ANCHOR_CHANGED_CASE_'+(i+1));
    var log=audit.getRange(t.auditRow,1,1,4).getValues()[0];
    if(String(log[A.AKSI]||'').trim()!=='REVIEW_LAPORAN')
      throw new Error('ACE_REV003_AUDIT_ACTION_CHANGED_CASE_'+(i+1));
    var evidence=aceRev003SummarizeAuditFormatV10_(log[A.DETAIL],t.id);
    if(!evidence.firstSegmentIdMatches||!evidence.decisionParsed||
      evidence.parsedStatus!=='Ditolak'||Math.abs(evidence.parsedPoints-points)>0.001)
      throw new Error('ACE_REV003_AUDIT_EVIDENCE_CHANGED_CASE_'+(i+1));
    return {caseId:i+1,reportId:t.id,reportRow:t.reportRow,ownerId:ownerId,
      officialPeriod:'2026-04',currentStatus:status,currentFinalPoints:points,
      auditStatus:evidence.parsedStatus,auditPoints:evidence.parsedPoints,
      currentRuleEligible:isStatusApproved_(status)};
  });
  var allowance=aceRev003AllowanceReadRowsV10_(ss,T),
      auditTun=aceRev003AllowanceReadAuditV10_(ss,AT);
  var periods=['2026-04','2026-05'];
  var cases=anchors.map(function(anchor){
    var ownerBatches=allowance.rows.filter(function(b){return b.idUser===anchor.ownerId;});
    var ownerAudit=auditTun.records.filter(function(a){return a.targetIdUser===anchor.ownerId;});
    return {
      caseId:anchor.caseId,reportId:anchor.reportId,reportRow:anchor.reportRow,
      currentStatus:anchor.currentStatus,currentFinalPoints:anchor.currentFinalPoints,
      auditStatus:anchor.auditStatus,auditPoints:anchor.auditPoints,
      currentRuleEligible:anchor.currentRuleEligible,
      periods:periods.map(function(p){
        var matches=ownerBatches.filter(function(b){return b.period===p;});
        return {period:p,ownerBatchRowCount:matches.length,
          snapshots:matches.map(function(b){return {
            sheetRow:b.sheetRow,batchStatus:b.status,active:b.active,
            jumlahLaporanDisetujui:b.jumlahDisetujui,
            poinProduktivitasAgregat:b.poinProd,poinTugasUtamaAgregat:b.poinTu,
            payoutTimestampPresent:b.payoutTimestampPresent,
            windowStart:b.windowStart,windowEnd:b.windowEnd
          };}),
          targetAuditTunjanganEvents:ownerAudit.filter(function(a){return a.period===p;}).length};
      }),
      historicalIndividualReportContribution:'UNDETERMINED_FROM_AGGREGATED_BATCH',
      actualPaymentEffect:'NOT_VERIFIED'
    };
  });
  var summary=periods.map(function(p){
    var item=aceRev003AllowSummaryV10_(allowance.rows,p);
    item.tunjanganAuditEvents=auditTun.records.filter(function(a){return a.period===p;}).length;
    return item;
  });
  var ret={sukses:cases.length===5&&cases.every(function(x){return !x.currentRuleEligible;}),
    versi:ACE_REV003_ALLOWANCE_TRACE_V10_VERSION_,
    targetReportCount:cases.length,
    allowanceSheetAvailable:allowance.available,
    allowanceAuditSheetAvailable:auditTun.available,
    periods:summary,
    cases:cases,
    limitations:[
      'Current review eligibility rule is not proof of historical calculator behavior.',
      'Employee-level allowance totals cannot identify contribution of a specific report.',
      'Missing current batch rows do not prove historical payments never occurred.'
    ],
    readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_TUN_TRACE_SUMMARY '+JSON.stringify({
    sukses:ret.sukses,versi:ret.versi,targetReportCount:ret.targetReportCount,
    allowanceSheetAvailable:ret.allowanceSheetAvailable,
    allowanceAuditSheetAvailable:ret.allowanceAuditSheetAvailable,
    periods:ret.periods,readOnly:true,dataBisnisDiubah:false
  }));
  ret.cases.forEach(function(r){Logger.log('ACE_REV003_TUN_TRACE_CASE '+JSON.stringify(r));});
  return ret;
}
function validasiDampakTunjanganACERev003V10(){
  var checks=[];function add(n,ok){checks.push({nama:n,lulus:ok===true});}
  var C=SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  var r=[];r[C.PERIODE]='2026-04';r[C.ID_USER]='TEST';r[C.STATUS_REKAP]='Sudah Dicairkan';
  r[C.IS_ACTIVE]=true;r[C.BATCH_ID]='B-TEST';r[C.JUMLAH_LAPORAN_DISETUJUI]=3;
  r[C.POIN_PROD]=20;r[C.POIN_TU]=25;r[C.DICAIRKAN_PADA]='TEST_DATE';
  var rec=aceRev003AllowSnapshotRecordV10_(r,C,2);
  add('TARGET_COUNT_5',aceRev003AllowanceTargetsV10_().length===5);
  add('TARGET_IDS_UNIQUE',aceRev003AllowUniqueV10_(aceRev003AllowanceTargetsV10_().map(function(x){return x.id;})).length===5);
  add('REJECTED_EXCLUDED_IN_CURRENT_CODE',typeof isStatusApproved_==='function'&&!isStatusApproved_('Ditolak'));
  add('APPROVED_ACCEPTED_IN_CURRENT_CODE',typeof isStatusApproved_==='function'&&isStatusApproved_('Disetujui'));
  add('SNAPSHOT_PERIOD',rec.period==='2026-04');
  add('SNAPSHOT_ACTIVE',rec.active===true);
  add('SNAPSHOT_PAID_STATUS',rec.status==='Sudah Dicairkan'&&rec.payoutTimestampPresent);
  var sum=aceRev003AllowSummaryV10_([rec],'2026-04');
  add('SUMMARY_MATCH',sum.snapshotRows===1&&sum.activeRows===1&&sum.paidStatusRows===1);
  add('SUMMARY_UNRELATED_PERIOD_EMPTY',aceRev003AllowSummaryV10_([rec],'2026-05').snapshotRows===0);
  add('READ_ONLY_HELPER_AVAILABLE',typeof aceRev003SummarizeAuditFormatV10_==='function');
  var fail=checks.filter(function(x){return !x.lulus;});
  var out={sukses:fail.length===0,lulus:checks.length-fail.length,gagal:fail.length,
    checks:checks,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_REV003_TUN_TRACE_VALIDATION '+JSON.stringify(out));return out;
}
