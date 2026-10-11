/**
 * PHA-07B B2 RC8.1 — Type-Safe Storage Integration & Rollback Validation.
 * SYNTHETIC-ONLY. Requires a NEW isolated Apps Script project from the RC8.1 branch.
 * No triggers, web deployments, authentication bypass, production database, or full business endpoint execution.
 *
 * Rollback differs from retired RC8 V1: BACK UP NATIVE CELLS and RESTORE via Range.copyTo(PASTE_NORMAL).
 * This preserves text-vs-date input types, number formats, formulas, and cell validation.
 * Failure snapshots persist for a separate, explicit manual recovery; never blindly rerun a failed drill.
 */
var RC81_STAGE_ = Object.freeze({
  VERSION: 'PHA07B2-RC81-TYPE-SAFE-2026.10.11.1',
  ID: '1Ub4d0brD-JcAokxysGFQM1rBc0cbewvGgGWPwagQqOM',
  MARKER: 'STAGE_RC81_TYPESAFE_DISPOSABLE',
  AUTH_MARKER: 'RC81_DISPOSABLE_WRITES_REQUIRE_EXPLICIT_OPT_IN',
  ACTIVE_KEY: 'RC81_RECOVERY_PENDING',
  OPT_IN_KEY: 'RC81_WRITE_DRILL_ENABLED',
  PREFIX: '__RC81_BK_',
  EXPECTED_IDS: ['B0-RPT-0001', 'B0-RPT-0002'],
  // Rows include the empty tail that submit, index and audit may write.
  BLOCKS: [
    {tab: 'Rekap_Kinerja', rows: 5, cols: 71, backupRow: 1},
    {tab: 'Index_Laporan', rows: 5, cols: 12, backupRow: 9},
    {tab: 'Audit_Log', rows: 8, cols: 4, backupRow: 18},
    {tab: 'Index_Laporan_Sync_Queue', rows: 5, cols: 12, backupRow: 30}
  ]
});

function rc81Error_(code) { throw new Error('RC81_STAGE_BLOCKED:' + code); }
function rc81Props_() { return PropertiesService.getScriptProperties(); }
function rc81Backups_(ss) {
  return ss.getSheets().filter(function(s) {
    return s.getName().indexOf(RC81_STAGE_.PREFIX) === 0;
  });
}
function rc81AssertEnv_() {
  var p = rc81Props_();
  if (p.getProperty('RC81_STAGING_MODE') !== 'true' ||
      String(p.getProperty('SPREADSHEET_ID') || '').trim() !== RC81_STAGE_.ID ||
      p.getProperty('RC8_STAGING_MODE') === 'true') rc81Error_('STAGING_PROPERTIES_MISMATCH');
  if (p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED') === 'true' ||
      p.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED') === 'true') rc81Error_('PRODUCTION_FLAGS_MUST_REMAIN_OFF');
  var ss = getSS_();
  if (ss.getId() !== RC81_STAGE_.ID) rc81Error_('WRONG_DATABASE');
  var c = ss.getSheetByName('MULAI_DI_SINI');
  if (!c || String(c.getRange('A5').getValue()) !== RC81_STAGE_.MARKER ||
      String(c.getRange('A8').getValue()) !== RC81_STAGE_.AUTH_MARKER ||
      String(c.getRange('B16').getValue()) !== RC81_STAGE_.ID) rc81Error_('SENTINEL_MISMATCH');
  return {ss:ss,props:p};
}
function rc81SourceIndexChecks_(ss) {
  var source = ss.getSheetByName('Rekap_Kinerja');
  var index = ss.getSheetByName('Index_Laporan');
  var queue = ss.getSheetByName('Index_Laporan_Sync_Queue');
  var audit = ss.getSheetByName('Audit_Log');
  var issues = [], probes = [], C = SHEET_COLUMNS.REKAP_KINERJA;
  if (!source || !index || !queue || !audit) return {issues:['REQUIRED_SHEETS_MISSING'],probes:[]};
  if (source.getLastRow() !== 3 || index.getLastRow() !== 3) issues.push('BASELINE_TWO_REPORTS_REQUIRED');
  if (queue.getLastRow() !== 1) issues.push('QUEUE_NOT_EMPTY');
  if (audit.getLastRow() !== 3) issues.push('AUDIT_NOT_BASELINE');
  if (source.getLastRow() === 3 && index.getLastRow() === 3) {
    for (var i=0;i<2;i++) {
      var row=i+2, actualSource=rc7Source_(ss,row), expected=buatBarisIndexLaporan2B0_(actualSource.row,row);
      var actual=index.getRange(row,1,1,expected.length).getValues()[0];
      var diff=bedaBarisIndexLaporan2B0_(expected,actual);
      var match=actualSource.triple.idLaporan===RC81_STAGE_.EXPECTED_IDS[i] && diff.length===0;
      if (!match) issues.push('BASELINE_SOURCE_INDEX_MISMATCH:'+row);
      probes.push({row:row,idLaporan:actualSource.triple.idLaporan,indexIdentical:diff.length===0,differences:diff});
    }
  }
  // This fixture intentionally uses text dates, not numeric Google Sheets date serials.
  var mustBeText = [
    [source,'A2'],[source,'N2'],[index,'D2'],[index,'E2'],[index,'K2'],
    [source,'A3'],[index,'D3'],[index,'K3']
  ];
  mustBeText.forEach(function(pair) {
    if (typeof pair[0].getRange(pair[1]).getValue() !== 'string')
      issues.push('DATE_OR_PERIOD_TYPE_CHANGED:'+pair[0].getName()+'!'+pair[1]);
  });
  return {issues:issues,probes:probes,sourceRows:source.getLastRow()-1,
    indexRows:index.getLastRow()-1,queueRows:queue.getLastRow()-1,auditRows:audit.getLastRow()-1};
}
function rc81ReadOnlyPreflightV1() {
  var ctx=rc81AssertEnv_(), ss=ctx.ss, p=ctx.props, r=rc81SourceIndexChecks_(ss);
  var issues=r.issues.slice();
  if (p.getProperty(RC81_STAGE_.ACTIVE_KEY)) issues.push('UNRESOLVED_RECOVERY_PENDING');
  if (rc81Backups_(ss).length) issues.push('BACKUP_SHEETS_PRESENT');
  if (p.getProperty(RC81_STAGE_.OPT_IN_KEY)==='true') issues.push('WRITE_OPT_IN_STILL_ACTIVE');
  var triggers='UNVERIFIED';
  try { triggers=ScriptApp.getProjectTriggers().length; if (triggers) issues.push('TRIGGERS_PRESENT'); }
  catch(e) { issues.push('TRIGGER_INVENTORY_UNVERIFIED'); }
  var out={stage:'PHA-07B B2 RC8.1',version:RC81_STAGE_.VERSION,
    status:issues.length?'RC81_PREFLIGHT_NOT_ACCEPTED':'RC81_PREFLIGHT_PASS',
    targetSpreadsheetId:RC81_STAGE_.ID,probes:r.probes,sourceRows:r.sourceRows,
    indexRows:r.indexRows,queueRows:r.queueRows,auditRows:r.auditRows,triggers:triggers,
    issues:issues,writesPerformed:0,productionReady:false};
  console.log('PHA07B2_RC81_PREFLIGHT:\n'+JSON.stringify(out,null,2));
  return out;
}

function rc81CopyMode_() { return SpreadsheetApp.CopyPasteType.PASTE_NORMAL; }
function rc81ValueToken_(v) {
  if (v instanceof Date) return ['date',v.getTime()];
  if (v === null || v === undefined) return ['null'];
  return [typeof v,v];
}
function rc81RangeSignature_(range) {
  function mapped(m,transform) {return m.map(function(r){return r.map(transform);});}
  var vals=mapped(range.getValues(),rc81ValueToken_);
  var checks={values:vals,display:range.getDisplayValues(),formats:range.getNumberFormats(),
    formulas:range.getFormulas(),notes:range.getNotes()};
  // Validation rules cannot be JSON-serialized directly; their criteria type and
  // whether a validation exists are sufficient for this synthetic baseline.
  checks.validation=mapped(range.getDataValidations(),function(x){
    return x ? String(x.getCriteriaType()) : null;
  });
  return JSON.stringify(checks);
}
function rc81CreateBackup_(ss,props,scenario) {
  if (props.getProperty(RC81_STAGE_.ACTIVE_KEY) || rc81Backups_(ss).length)
    rc81Error_('PRIOR_RECOVERY_NOT_RESOLVED');
  var backupName=RC81_STAGE_.PREFIX+scenario+'_'+Utilities.getUuid().replace(/-/g,'').slice(0,10);
  var backup=ss.insertSheet(backupName);
  if (backup.getMaxColumns()<71)
    backup.insertColumnsAfter(backup.getMaxColumns(),71-backup.getMaxColumns());
  for(var i=0;i<RC81_STAGE_.BLOCKS.length;i++) {
    var b=RC81_STAGE_.BLOCKS[i],source=ss.getSheetByName(b.tab);
    if (!source) rc81Error_('SNAPSHOT_SOURCE_MISSING:'+b.tab);
    source.getRange(1,1,b.rows,b.cols)
      .copyTo(backup.getRange(b.backupRow,1,b.rows,b.cols),rc81CopyMode_(),false);
  }
  SpreadsheetApp.flush();
  backup.hideSheet();
  var keys=[INDEX_LAPORAN_2B0_CONFIG.METADATA_PROPERTY,INDEX_LAPORAN_2B1_CONFIG.LAST_SYNC_PROPERTY];
  var metadata={};keys.forEach(function(k){metadata[k]=props.getProperty(k);});
  var record={version:1,targetId:RC81_STAGE_.ID,scenario:scenario,
    backupName:backupName,backupSheetId:backup.getSheetId(),
    metadata:metadata,createdAt:new Date().toISOString()};
  // Ledger committed before the first simulated business mutation.
  props.setProperty(RC81_STAGE_.ACTIVE_KEY,JSON.stringify(record));
  return record;
}
function rc81Rollback_(ss,props,record) {
  if (!record || record.targetId!==RC81_STAGE_.ID ||
      String(record.backupName||'').indexOf(RC81_STAGE_.PREFIX)!==0)
    rc81Error_('INVALID_RECOVERY_MANIFEST');
  var backup=ss.getSheetByName(record.backupName);
  if (!backup || backup.getSheetId()!==record.backupSheetId)
    rc81Error_('RECOVERY_SNAPSHOT_MISSING_OR_CHANGED');
  // Native PASTE_NORMAL copies original CellData; setValues() is intentionally forbidden.
  RC81_STAGE_.BLOCKS.forEach(function(b){
    backup.getRange(b.backupRow,1,b.rows,b.cols).copyTo(
      ss.getSheetByName(b.tab).getRange(1,1,b.rows,b.cols),rc81CopyMode_(),false);
  });
  var metadata=record.metadata||{};
  Object.keys(metadata).forEach(function(k){
    if (metadata[k]===null) props.deleteProperty(k);
    else props.setProperty(k,metadata[k]);
  });
  SpreadsheetApp.flush();
  var diffs=[];
  RC81_STAGE_.BLOCKS.forEach(function(b){
    var old=rc81RangeSignature_(backup.getRange(b.backupRow,1,b.rows,b.cols));
    var now=rc81RangeSignature_(ss.getSheetByName(b.tab).getRange(1,1,b.rows,b.cols));
    if (old!==now) diffs.push('CELL_STATE_MISMATCH:'+b.tab);
  });
  var r=rc81SourceIndexChecks_(ss); diffs=diffs.concat(r.issues);
  for(var k in metadata){
    if (props.getProperty(k)!==metadata[k]) diffs.push('PROPERTY_NOT_RESTORED:'+k);
  }
  if (diffs.length) return {restored:false,differences:diffs,backupRetained:true};
  // Delete the temporary snapshot only after readback has confirmed restoration.
  ss.deleteSheet(backup);
  props.deleteProperty(RC81_STAGE_.ACTIVE_KEY);
  return {restored:true,differences:[],backupRetained:false};
}
function rc81Inject_(fault,point) {
  if (fault===point) throw new Error('RC81_INJECTED_'+point);
}
function rc81ProxyOperations_(ss,fault) {
  var source=ss.getSheetByName('Rekap_Kinerja'),index=ss.getSheetByName('Index_Laporan'),
    audit=ss.getSheetByName('Audit_Log'), C=SHEET_COLUMNS.REKAP_KINERJA;
  var width=source.getLastColumn(),actionLog=[],writes=0;
  // Storage-level submit proxy. No real login, upload, PWA, AI or HTTP endpoint is called.
  var newRow=source.getRange(2,1,1,width).getValues()[0].slice();
  newRow[C.ID_LAPORAN]='RC81-RPT-0003';
  newRow[C.ID_USER]='RC81-USR-0003';
  newRow[C.NONCE]='RC81-NONCE-0003';
  newRow[C.ID_DISPOSISI]='';
  newRow[C.DESKRIPSI]='RC81 synthetic submit proxy';
  newRow[C.POIN_FINAL]=0;
  newRow[C.STATUS_REVIEW]='Menunggu Review';
  source.getRange(4,1,1,width).setValues([newRow]);
  var result=rc7WriteIndexLocked_(ss,rc7Source_(ss,4),'RC81_SUBMIT_STORAGE_PROXY');
  if (!result.indexWritten) throw Error('RC81_SUBMIT_NOT_INDEXED');
  audit.appendRow([new Date(),'RC81-USR-0003','RC81_SUBMIT_PROXY','RC81-RPT-0003']);
  writes+=1; actionLog.push('SUBMIT_PROXY');
  rc81Inject_(fault,'AFTER_SUBMIT');
  // Revision must change the indexed modification timestamp, not only description.
  source.getRange(2,C.DESKRIPSI+1).setValue('RC81 revised description');
  source.getRange(2,C.REVISI_KE+1).setValue(1);
  source.getRange(2,C.TERAKHIR_DIREVISI_PADA+1).setValue(new Date('2026-10-11T11:00:00+07:00'));
  result=rc7WriteIndexLocked_(ss,rc7Source_(ss,2),'RC81_REVISION_STORAGE_PROXY');
  if (!result.indexWritten) throw Error('RC81_REVISION_NOT_INDEXED');
  audit.appendRow([new Date(),'B0-USR-0001','RC81_REVISION_PROXY','B0-RPT-0001']);
  writes+=1; actionLog.push('REVISION_PROXY');
  rc81Inject_(fault,'AFTER_REVISION');
  // Admin review proxy: storage/index only, not the authenticated business endpoint.
  source.getRange(2,C.STATUS_REVIEW+1,1,2).setValues([['Disetujui',3]]);
  source.getRange(2,C.WAKTU_REVIEW_ADMIN+1).setValue(new Date('2026-10-11T11:15:00+07:00'));
  source.getRange(2,C.CATATAN_ADMIN+1).setValue('RC81 review proxy');
  result=rc7WriteIndexLocked_(ss,rc7Source_(ss,2),'RC81_REVIEW_STORAGE_PROXY');
  if (!result.indexWritten ||
      index.getRange(2,7).getValue()!=='Disetujui' ||
      Number(index.getRange(2,8).getValue())!==3)
    throw Error('RC81_REVIEW_NOT_INDEXED');
  audit.appendRow([new Date(),'RC81-ADMIN','RC81_REVIEW_PROXY','B0-RPT-0001']);
  writes+=1; actionLog.push('REVIEW_PROXY');
  rc81Inject_(fault,'AFTER_REVIEW');
  // Replaying the same canonical state must not rewrite the index a second time.
  var duplicate=rc7WriteIndexLocked_(ss,rc7Source_(ss,2),'RC81_IDEMPOTENT_VERIFY');
  if (duplicate.indexWritten) throw Error('RC81_IDEMPOTENCE_FAILED');
  actionLog.push('IDEMPOTENCE_VERIFIED');
  return {actionLog:actionLog,indexWrites:writes,idempotent:true};
}
function rc81RunOneScenario_(ss,props,fault) {
  var label=fault==='NONE'?'NORMAL':fault;
  var record=rc81CreateBackup_(ss,props,label);
  var failure='',proxy=null,restoration=null;
  try { proxy=rc81ProxyOperations_(ss,fault); }
  catch(e) { failure=String(e&&e.message||e); }
  try { restoration=rc81Rollback_(ss,props,record); }
  catch(e2){ restoration={restored:false,differences:['ROLLBACK_EXCEPTION:'+String(e2&&e2.message||e2)],backupRetained:true}; }
  var expectedFault=fault==='NONE'?'':'RC81_INJECTED_'+fault;
  var matched=fault==='NONE'?!failure:failure===expectedFault;
  return {caseId:'RC81-'+label,expectedFault:expectedFault||'NONE',observedError:failure||'',
    faultMatched:matched,storageActions:proxy?proxy.actionLog:[],
    indexWrites:proxy?proxy.indexWrites:null,idempotent:proxy?proxy.idempotent:false,
    rollbackRestored:!!(restoration&&restoration.restored),
    differences:restoration?restoration.differences:['NO_RESTORATION'],
    passed:matched&&!!(restoration&&restoration.restored)};
}
function rc81RunTypeSafeMatrixV1() {
  var ctx=rc81AssertEnv_(),p=ctx.props,lock=null,results=[],issues=[];
  if (p.getProperty(RC81_STAGE_.OPT_IN_KEY)!=='true') rc81Error_('EXPLICIT_WRITE_OPT_IN_REQUIRED');
  if (p.getProperty(RC81_STAGE_.ACTIVE_KEY)||rc81Backups_(ctx.ss).length)
    rc81Error_('RECOVERY_PENDING_RUN_MANUAL_RECOVERY_FIRST');
  lock=LockService.getScriptLock();
  if (!lock.tryLock(12000)) rc81Error_('SCRIPT_LOCK_BUSY');
  try {
    ctx=rc81AssertEnv_();
    if (p.getProperty(RC81_STAGE_.OPT_IN_KEY)!=='true') rc81Error_('WRITE_OPT_IN_CHANGED');
    if (p.getProperty(RC81_STAGE_.ACTIVE_KEY)||rc81Backups_(ctx.ss).length)
      rc81Error_('RECOVERY_PENDING_INSIDE_LOCK');
    var base=rc81SourceIndexChecks_(ctx.ss);
    if (base.issues.length) rc81Error_('BASELINE_INVALID:'+base.issues.join(','));
    var faults=['NONE','AFTER_SUBMIT','AFTER_REVISION','AFTER_REVIEW'];
    for(var i=0;i<faults.length;i++){
      var r=rc81RunOneScenario_(ctx.ss,p,faults[i]);results.push(r);
      if(!r.passed) {issues.push('SCENARIO_FAILED:'+r.caseId);break;}
    }
  } catch(e){ issues.push(String(e&&e.message||e)); }
  finally {
    // Authorization is consumed; the operator must opt in again for any new run.
    try {p.setProperty(RC81_STAGE_.OPT_IN_KEY,'false');}
    catch(e3){issues.push('CANNOT_DISABLE_OPT_IN:'+String(e3));}
    if(lock)lock.releaseLock();
  }
  var post=null;
  try {post=rc81ReadOnlyPreflightV1();}
  catch(e4){issues.push('POST_PREFLIGHT_ERROR:'+String(e4));}
  if(!post||post.status!=='RC81_PREFLIGHT_PASS') issues.push('POST_PREFLIGHT_NOT_ACCEPTED');
  var passed=results.filter(function(x){return x.passed;}).length;
  var out={stage:'PHA-07B B2 RC8.1',version:RC81_STAGE_.VERSION,
    status:!issues.length&&results.length===4&&passed===4
      ?'RC81_TYPE_SAFE_STORAGE_PASS':'RC81_TYPE_SAFE_STORAGE_NOT_ACCEPTED',
    targetSpreadsheetId:RC81_STAGE_.ID,casesExpected:4,casesExecuted:results.length,
    passed:passed,failed:results.length-passed,
    rollbackRestored:results.length===4&&results.every(function(x){return x.rollbackRestored;}),
    actualStorageWritesOccurred:results.length>0,
    method:'NATIVE_COPY_PASTE_NORMAL_FROM_SNAPSHOT',
    scenarios:results,postPreflight:post&&post.status,issues:issues,
    productionPatchInstalled:false,productionReady:false,
    caveat:'Synthetic storage paths only; authenticated submit/revision/review not executed.'};
  console.log('PHA07B2_RC81_MATRIX:\n'+JSON.stringify(out,null,2));
  return out;
}
/** Recovery is a separate, user-initiated action after interrupted/failed matrix. */
function rc81RecoverPendingV1() {
  var ctx=rc81AssertEnv_(),p=ctx.props,ss=ctx.ss;
  var raw=p.getProperty(RC81_STAGE_.ACTIVE_KEY);
  if (!raw) {
    var existing=rc81Backups_(ss);
    var none={status:existing.length?'RC81_ORPHAN_SNAPSHOT_MANUAL_REVIEW':'RC81_NO_PENDING_RECOVERY',
      backups:existing.map(function(x){return x.getName();}),productionReady:false};
    console.log('PHA07B2_RC81_RECOVERY:\n'+JSON.stringify(none,null,2));return none;
  }
  var record;
  try {record=JSON.parse(raw);} catch(e){rc81Error_('RECOVERY_MANIFEST_MALFORMED');}
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(12000))rc81Error_('RECOVERY_LOCK_BUSY');
  var restoration;
  try { restoration=rc81Rollback_(ss,p,record);p.setProperty(RC81_STAGE_.OPT_IN_KEY,'false'); }
  finally {lock.releaseLock();}
  var out={status:restoration.restored?'RC81_MANUAL_RECOVERY_PASS':'RC81_MANUAL_RECOVERY_NOT_ACCEPTED',
    restored:restoration.restored,differences:restoration.differences,
    backupRetained:restoration.backupRetained,productionReady:false};
  console.log('PHA07B2_RC81_RECOVERY:\n'+JSON.stringify(out,null,2));
  return out;
}