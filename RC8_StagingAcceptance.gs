/**
 * PHA-07B B2 RC8 -- staging-only preflight and controlled synthetic drill.
 * NO onOpen/doGet/doPost, NO triggers, NO deployments, NO production properties.
 * Must run in a NEW isolated Apps Script project populated from the RC8 staging branch.
 */
var RC8_STAGE_ = {
  VERSION: 'PHA07B2-RC8-STAGING-2026.10.11.1',
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
 * Controlled opt-in value-level drill; NOT a production business endpoint.
 * Executes the real RC7 core over synthetic source and index data under one ScriptLock.
 * Writes are restored in finally. Does NOT promise transaction-atomic rollback on
 * timeout/forced termination. A new workbook copy should be used for any rerun.
 */
function rc8StagingWriteDrillV1() {
  var ss=rc8AssertStage_(), props=rc8Props_();
  if(props.getProperty('RC8_WRITE_DRILL_ENABLED')!=='true') rc8Fail_('WRITE_DRILL_OPT_IN_REQUIRED');
  if(props.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED')==='true')rc8Fail_('REPLAY_ENABLED_BLOCKED');
  if(props.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED')==='true')rc8Fail_('DUAL_WRITE_ENABLED_BLOCKED');
  var baseline=rc8ReadOnlyPreflightV1();
  if(baseline.status!=='RC8_STAGING_PREFLIGHT_PASS')rc8Fail_('PREFLIGHT_REQUIRED');
  var businessPlan=rc8ReadOnlyBusinessPlanV1();
  if(businessPlan.status!=='RC8_READONLY_BUSINESS_PLAN_PASS')
    rc8Fail_('BUSINESS_PLAN_MISMATCH');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))rc8Fail_('LOCK_BUSY');
  var source=ss.getSheetByName('Rekap_Kinerja'),index=ss.getSheetByName('Index_Laporan'),
      audit=ss.getSheetByName('Audit_Log');
  var sw=source.getLastColumn(),iw=INDEX_LAPORAN_2B0_CONFIG.HEADERS.length;
  var before;
  try { before={s2:source.getRange(2,1,1,sw).getValues(),s4:source.getRange(4,1,1,sw).getValues(),
    i2:index.getRange(2,1,1,iw).getValues(),i4:index.getRange(4,1,1,iw).getValues(),
    fmt2:index.getRange(2,1,1,iw).getNumberFormats(),fmt4:index.getRange(4,1,1,iw).getNumberFormats(),
    auditLast:audit.getLastRow(), metadata:props.getProperty(INDEX_LAPORAN_2B0_CONFIG.METADATA_PROPERTY),
    lastSync:props.getProperty(INDEX_LAPORAN_2B1_CONFIG.LAST_SYNC_PROPERTY)};
  } catch(eSnapshot) { lock.releaseLock(); throw eSnapshot; }
  var written=[],failure=null,rolledBack=false;
  try {
    // Synthetic new-submit proxy: append a brand-new trailing identity.
    var newReport=before.s2[0].slice();
    var C=SHEET_COLUMNS.REKAP_KINERJA;
    newReport[C.ID_LAPORAN]='RC8-RPT-0003';
    newReport[C.ID_USER]='RC8-USR-0003';
    newReport[C.NONCE]='RC8-NONCE-0003';
    newReport[C.ID_DISPOSISI]='';
    newReport[C.DESKRIPSI]='RC8 synthetic submit proxy';
    newReport[C.POIN_FINAL]=0;
    newReport[C.STATUS_REVIEW]='Menunggu Review';
    source.getRange(4,1,1,sw).setValues([newReport]);
    var submitted=rc7WriteIndexLocked_(ss,rc7Source_(ss,4),'RC8_SUBMIT_STORAGE_PROXY');
    if(!submitted.indexWritten)throw Error('RC8_SUBMIT_NOT_INDEXED');
    audit.appendRow([new Date(),'RC8-USR-0003','RC8_SUBMIT_PROXY','RC8-RPT-0003']);
    written.push('SUBMIT_PROXY');
    // Synthetic employee revision proxy for the first existing report.
    source.getRange(2,C.DESKRIPSI+1).setValue('RC8 revision proxy');
    source.getRange(2,C.REVISI_KE+1).setValue(1);
    rc7WriteIndexLocked_(ss,rc7Source_(ss,2),'RC8_REVISION_STORAGE_PROXY');
    audit.appendRow([new Date(),'B0-USR-0001','RC8_REVISION_PROXY','B0-RPT-0001']);
    written.push('REVISION_PROXY');
    // Synthetic admin review proxy. Does not call the real auth/session endpoint.
    source.getRange(2,C.STATUS_REVIEW+1,1,2).setValues([['Disetujui',3]]);
    source.getRange(2,C.CATATAN_ADMIN+1).setValue('RC8 synthetic review proxy');
    rc7WriteIndexLocked_(ss,rc7Source_(ss,2),'RC8_REVIEW_STORAGE_PROXY');
    audit.appendRow([new Date(),'RC8-ADMIN','RC8_REVIEW_PROXY','B0-RPT-0001']);
    written.push('REVIEW_PROXY');
    if(index.getRange(2,7).getValue()!=='Disetujui'||Number(index.getRange(2,8).getValue())!==3)
      throw Error('RC8_REVIEW_INDEX_MISMATCH');
  }catch(e){failure=String(e&&e.message||e);}finally{
    try {
      source.getRange(2,1,1,sw).setValues(before.s2);
      source.getRange(4,1,1,sw).setValues(before.s4);
      index.getRange(2,1,1,iw).setValues(before.i2);
      index.getRange(4,1,1,iw).setValues(before.i4);
      index.getRange(2,1,1,iw).setNumberFormats(before.fmt2);
      index.getRange(4,1,1,iw).setNumberFormats(before.fmt4);
      if(audit.getLastRow()>before.auditLast)
        audit.getRange(before.auditLast+1,1,audit.getLastRow()-before.auditLast,4).clearContent();
      if(before.metadata===null)props.deleteProperty(INDEX_LAPORAN_2B0_CONFIG.METADATA_PROPERTY);
      else props.setProperty(INDEX_LAPORAN_2B0_CONFIG.METADATA_PROPERTY,before.metadata);
      if(before.lastSync===null)props.deleteProperty(INDEX_LAPORAN_2B1_CONFIG.LAST_SYNC_PROPERTY);
      else props.setProperty(INDEX_LAPORAN_2B1_CONFIG.LAST_SYNC_PROPERTY,before.lastSync);
      SpreadsheetApp.flush();
      var source2restored=source.getRange(2,1,1,sw).getValues();
      var source4restored=source.getRange(4,1,1,sw).getValues();
      var index2restored=index.getRange(2,1,1,iw).getValues();
      var index4restored=index.getRange(4,1,1,iw).getValues();
      function eq(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
      rolledBack=eq(source2restored,before.s2)&&eq(source4restored,before.s4)&&
        eq(index2restored,before.i2)&&eq(index4restored,before.i4)&&
        audit.getLastRow()===before.auditLast;
      if(!rolledBack)failure=(failure?failure+';':'')+'RC8_ROLLBACK_READBACK_MISMATCH';
    }catch(eRestore){failure=(failure?failure+';':'')+'ROLLBACK_FAILED:'+String(eRestore&&eRestore.message||eRestore);}
    lock.releaseLock();
  }
  var post=rc8ReadOnlyPreflightV1();
  var out={status:!failure&&rolledBack&&post.status==='RC8_STAGING_PREFLIGHT_PASS'
    ?'RC8_STORAGE_PROXY_DRILL_PASS':'RC8_STORAGE_PROXY_DRILL_NOT_ACCEPTED',
    scenarios:3,passed:written.length,proxyActions:written,rollbackRestored:rolledBack,
    verifiedAfterRollback:post.status==='RC8_STAGING_PREFLIGHT_PASS',error:failure||'',
    productionReady:false,productionPatchInstalled:false,
    caveat:'Storage-only submit/revision/review proxies; not complete business endpoints.'};
  console.log('PHA07B2_RC8_STORAGE_DRILL:\n'+JSON.stringify(out,null,2));
  return out;
}