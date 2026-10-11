/**
 * PHA-07B B2 RC8 -- staging-only preflight and controlled synthetic drill.
 * NO onOpen/doGet/doPost, NO triggers, NO deployments, NO production properties.
 * Must run in a NEW isolated Apps Script project populated from the RC8 staging branch.
 */
var RC8_STAGE_ = {
  VERSION: 'PHA07B2-RC8-STAGING-2026.10.11.2',
  SPREADSHEET_ID: '1EdmIg1te51db4_hQO6f9-VEt8EuLiB-ZmRAhxuvDg68',
  MARKER: 'STAGE_RC8_STAGING_BUSINESS_PATH',
  AUTH_MARKER: 'RC8_DISPOSABLE_STAGING_WRITES_AUTHORIZED',
  EXPECTED_SOURCE: ['B0-RPT-0001', 'B0-RPT-0002'],
  REQUIRED_SHEETS: ['MULAI_DI_SINI', 'Rekap_Kinerja', 'Index_Laporan',
    'Index_Laporan_Sync_Queue', 'Audit_Log', 'Disposisi_Penerima', 'Disposisi_Log']
};
function rc8Fail_(msg) { throw new Error('RC8_STAGE_BLOCKED:' + msg); }
function rc8Props_() { return PropertiesService.getScriptProperties(); }
function rc8AssertStage_() {
  var p=rc8Props_();
  if (p.getProperty('RC8_STAGING_MODE')!=='true') rc8Fail_('STAGING_MODE_REQUIRED');
  if (String(p.getProperty('SPREADSHEET_ID')||'').trim()!==RC8_STAGE_.SPREADSHEET_ID)
    rc8Fail_('SPREADSHEET_ID_MISMATCH');
  var ss=getSS_();
  if (ss.getId()!==RC8_STAGE_.SPREADSHEET_ID) rc8Fail_('OPENED_WRONG_DATABASE');
  var sh=ss.getSheetByName('MULAI_DI_SINI');
  if (!sh || String(sh.getRange('A5').getValue())!==RC8_STAGE_.MARKER ||
      String(sh.getRange('A8').getValue())!==RC8_STAGE_.AUTH_MARKER ||
      String(sh.getRange('B16').getValue())!==RC8_STAGE_.SPREADSHEET_ID)
    rc8Fail_('WORKBOOK_SENTINEL_MISMATCH');
  return ss;
}
function rc8ReadOnlyPreflightV1() {
  var ss=rc8AssertStage_(),p=rc8Props_(),issues=[];
  var details={};
  RC8_STAGE_.REQUIRED_SHEETS.forEach(function(n){if(!ss.getSheetByName(n))issues.push('MISSING_SHEET:'+n);});
  var source=ss.getSheetByName('Rekap_Kinerja');
  var index=ss.getSheetByName('Index_Laporan');
  var queue=ss.getSheetByName('Index_Laporan_Sync_Queue');
  var audit=ss.getSheetByName('Audit_Log');
  if(source&&index&&queue&&audit){
    var C=SHEET_COLUMNS.REKAP_KINERJA;
    if(source.getLastRow()!==3 || index.getLastRow()!==3)issues.push('FIXTURE_NOT_BASELINE');
    RC8_STAGE_.EXPECTED_SOURCE.forEach(function(id,i){
      var r=i+2;
      var sourceId=normalizeId_(source.getRange(r,C.ID_LAPORAN+1).getValue());
      var indexId=normalizeId_(index.getRange(r,1).getValue());
      var indexRow=Number(index.getRange(r,2).getValue());
      if(sourceId!==id||indexId!==id||indexRow!==r)issues.push('SOURCE_INDEX_MISMATCH:'+r);
    });
    var expected=INDEX_LAPORAN_2B1_CONFIG.QUEUE_HEADERS;
    var header=queue.getRange(1,1,1,expected.length).getValues()[0];
    if(expected.some(function(v,i){return String(header[i])!==v;}))issues.push('QUEUE_HEADER_INVALID');
    if(queue.getLastRow()!==1)issues.push('QUEUE_NOT_EMPTY');
    if(audit.getLastRow()!==3)issues.push('AUDIT_NOT_BASELINE');
    details.sourceRows=source.getLastRow()-1;
    details.indexRows=index.getLastRow()-1;
    details.queueRows=queue.getLastRow()-1;
    details.auditRows=audit.getLastRow()-1;
  }
  if (p.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED')==='true')issues.push('REPLAY_MUST_BE_OFF');
  if (p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED')==='true')issues.push('DUAL_WRITE_MUST_BE_OFF');
  if (typeof rc7WriteIndexLocked_!=='function'||typeof rc7Source_!=='function')issues.push('RC7_GUARD_MISSING');
  var bridgeChecks=[
    ['sinkronkanSatuRowIndexLaporan2B1_', typeof sinkronkanSatuRowIndexLaporan2B1_==='function'?sinkronkanSatuRowIndexLaporan2B1_:null, 'rc7SinkronkanSatuRowIndexLaporan2B1_'],
    ['antrekanPerbaikanIndexLaporan2B1_', typeof antrekanPerbaikanIndexLaporan2B1_==='function'?antrekanPerbaikanIndexLaporan2B1_:null, 'rc7AntrekanPerbaikanIndexLaporan2B1_'],
    ['prosesAntreanPerbaikanIndexLaporan2B1', typeof prosesAntreanPerbaikanIndexLaporan2B1==='function'?prosesAntreanPerbaikanIndexLaporan2B1:null, 'rc7ProsesAntreanPerbaikanIndexLaporan2B1_'],
    ['hitungStatusQueueIndexLaporan2B1_', typeof hitungStatusQueueIndexLaporan2B1_==='function'?hitungStatusQueueIndexLaporan2B1_:null, 'rc7HitungStatusQueueIndexLaporan2B1_']
  ];
  bridgeChecks.forEach(function(spec){
    if(typeof spec[1]!=='function'||spec[1].toString().indexOf(spec[2])<0)issues.push('BRIDGE_NOT_CONNECTED:'+spec[0]);
  });
  // No ScriptApp write operations. Read-only trigger inspection is best-effort.
  var triggers='NOT_VERIFIED';
  try { triggers=ScriptApp.getProjectTriggers().length; if(triggers>0)issues.push('TRIGGERS_PRESENT'); }
  catch(e){issues.push('TRIGGER_INVENTORY_NOT_VERIFIED');}
  var result={stage:'PHA-07B B2 RC8',version:RC8_STAGE_.VERSION,
    status:issues.length?'RC8_STAGING_PREFLIGHT_NOT_ACCEPTED':'RC8_STAGING_PREFLIGHT_PASS',
    targetSpreadsheetId:RC8_STAGE_.SPREADSHEET_ID,details:details,triggers:triggers,
    replayEnabled:false,productionReady:false,productionPatchInstalled:false,
    writesPerformed:0,issues:issues};
  console.log('PHA07B2_RC8_PREFLIGHT:\n'+JSON.stringify(result,null,2));
  return result;
}
/** Read-only inspection: source/index projection and RC7 guard, no write permission. */
function rc8ReadOnlyBusinessPlanV1() {
  var preflight = rc8ReadOnlyPreflightV1();
  if (preflight.status !== 'RC8_STAGING_PREFLIGHT_PASS') {
    var blocked = {
      status: 'RC8_PLAN_BLOCKED',
      issues: preflight.issues || ['PREFLIGHT_NOT_PASSED'],
      writesPerformed: 0,
      productionReady: false
    };
    console.log('PHA07B2_RC8_BUSINESS_PLAN:\n' + JSON.stringify(blocked, null, 2));
    return blocked;
  }
  var ss = rc8AssertStage_();
  var probes = [], issues = [];
  var indexSheet = ss.getSheetByName('Index_Laporan');
  for (var row = 2; row <= 3; row++) {
    var src = rc7Source_(ss, row);
    rc7SourceUnique_(ss, src);
    var projected = buatBarisIndexLaporan2B0_(src.row, row);
    var actual = indexSheet.getRange(row, 1, 1, projected.length).getValues()[0];
    var differences = bedaBarisIndexLaporan2B0_(projected, actual);
    if (differences.length) issues.push('INDEX_MISMATCH_ROW_' + row);
    probes.push({
      row: row,
      idLaporan: src.triple.idLaporan,
      idUser: src.triple.idUser,
      nonce: src.triple.nonce,
      indexIdentical: differences.length === 0,
      differences: differences
    });
  }
  var out = {
    status: issues.length
      ? 'RC8_READONLY_BUSINESS_PLAN_MISMATCH'
      : 'RC8_READONLY_BUSINESS_PLAN_PASS',
    validationVersion: 'RC8-BUSINESS-PLAN-STRICT-1.1',
    probes: probes,
    issues: issues,
    caveat: 'Storage/projection only; full application submit/review/auth not executed.',
    writesPerformed: 0,
    productionReady: false
  };
  console.log('PHA07B2_RC8_BUSINESS_PLAN:\n' + JSON.stringify(out, null, 2));
  return out;
}
/**
 * Historical write drill V1 was retired after it left cell types/formatting
 * changed despite a structural preflight PASS. Do not re-enable V1.
 */
function rc8StagingWriteDrillV1() {
  rc8Fail_('STORAGE_DRILL_V1_RETIRED_UNSAFE_TYPED_ROLLBACK');
}

/** Read-only verification after RC8 fixture recovery; no cell/property writes. */
function rc8ReadOnlyRollbackAuditV12() {
  var pre=rc8ReadOnlyPreflightV1();
  var plan=rc8ReadOnlyBusinessPlanV1();
  var ss=rc8AssertStage_();
  var source=ss.getSheetByName('Rekap_Kinerja');
  var index=ss.getSheetByName('Index_Laporan');
  var audit=ss.getSheetByName('Audit_Log');
  var queue=ss.getSheetByName('Index_Laporan_Sync_Queue');
  var checks=[
    {check:'PREFLIGHT',ok:pre.status==='RC8_STAGING_PREFLIGHT_PASS'},
    {check:'BUSINESS_PLAN',ok:plan.status==='RC8_READONLY_BUSINESS_PLAN_PASS'},
    {check:'SOURCE_DATE_A2_AS_TEXT',ok:typeof source.getRange('A2').getValue()==='string'},
    {check:'SOURCE_DATE_N2_AS_TEXT',ok:typeof source.getRange('N2').getValue()==='string'},
    {check:'INDEX_DATE_D2_AS_TEXT',ok:typeof index.getRange('D2').getValue()==='string'},
    {check:'INDEX_PERIOD_E2_AS_TEXT',ok:typeof index.getRange('E2').getValue()==='string'},
    {check:'INDEX_MODIFIED_K2_AS_TEXT',ok:typeof index.getRange('K2').getValue()==='string'},
    {check:'SOURCE_ROW_4_EMPTY',ok:source.getRange(4,1,1,source.getLastColumn()).getValues()[0].every(function(x){return x===''||x===null;})},
    {check:'INDEX_ROW_4_EMPTY',ok:index.getRange(4,1,1,12).getValues()[0].every(function(x){return x===''||x===null;})},
    {check:'QUEUE_EMPTY',ok:queue.getLastRow()===1},
    {check:'AUDIT_ROWS_BASELINE',ok:audit.getLastRow()===3},
    {check:'DRILL_FLAG_DISABLED',ok:rc8Props_().getProperty('RC8_WRITE_DRILL_ENABLED')!=='true'}
  ];
  var issues=checks.filter(function(x){return !x.ok;}).map(function(x){return x.check;});
  var out={
    status:issues.length?'RC8_ROLLBACK_AUDIT_NOT_ACCEPTED':'RC8_ROLLBACK_AUDIT_PASS',
    checks:checks,issues:issues,writesPerformed:0,productionReady:false,
    caveat:'Structural and typed-value checks. Snapshot comparison is an independent external step, not performed by this function.'
  };
  console.log('PHA07B2_RC8_ROLLBACK_AUDIT:\n'+JSON.stringify(out,null,2));
  return out;
}
