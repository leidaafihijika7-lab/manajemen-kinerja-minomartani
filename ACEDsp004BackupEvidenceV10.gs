// ============================================================================
// ACE-DSP-004 | BDR Snapshot Evidence Diagnostic v1.0 RC1 (2026-10-10)
// Maintainer-only, strictly READ-ONLY. No recovery, no Drive modifications.
// Bounded, exact-ID snapshot probe (Rekap_Kinerja and Index_Laporan).
// Never publish backup Spreadsheet IDs or unrelated/individual report content.
// "VERIFIED" refers to stored BDR manifest; this is NOT a new hash verification.
// Requires BackupDisasterRecoveryV10.gs, SheetSchema.gs and Kode.gs.
// ============================================================================

var ACE_DSP004_BDR_DIAG_V10_VERSION_ = 'ACE-DSP004-BDR-DIAG-v1.0-RC1-2026.10.10.01';
var ACE_DSP004_BDR_EVENT_AT_ = '2026-10-01T06:26:18.507Z';
var ACE_DSP004_BDR_WINDOW_START_ = '2026-09-28T00:00:00.000Z';
var ACE_DSP004_BDR_WINDOW_END_ = '2026-10-11T23:59:59.999Z';
var ACE_DSP004_BDR_MAX_SNAPSHOTS_ = 4;
var ACE_DSP004_BDR_TARGETS_ = [
  {code:'LEGACY_14',id:'e49e660b-d8f2-4205-a375-5573ccdab61f'},
  {code:'ACTIVE_622',id:'4810bf4f-6cac-4a05-b75e-fdd5acb81df5'}
];

function aceDsp004BdrOnlyIsoV10_(v) {
  var t=Date.parse(String(v||''));
  return isFinite(t)?new Date(t).toISOString():'';
}
function aceDsp004BdrPickV10_(items,eventAt) {
  // Closes time gap: nearest before, earliest after, middle after, last after.
  var ev=Date.parse(eventAt);
  if(!isFinite(ev))throw new Error('DSP004_BDR_EVENT_DATE_INVALID');
  var sorted=(items||[]).slice().sort(function(a,b) {
    return Date.parse(a.createdAt)-Date.parse(b.createdAt);
  });
  var before=sorted.filter(function(p){return Date.parse(p.createdAt)<ev;});
  var after=sorted.filter(function(p){return Date.parse(p.createdAt)>=ev;});
  var chosen=[],seen=Object.create(null);
  function add(p){
    if(!p||seen[p.backupId])return;
    seen[p.backupId]=true;chosen.push(p);
  }
  add(before.length?before[before.length-1]:null);
  add(after[0]);
  if(after.length>2)add(after[Math.floor(after.length/2)]);
  add(after.length?after[after.length-1]:null);
  if(chosen.length<ACE_DSP004_BDR_MAX_SNAPSHOTS_&&after.length>1)add(after[1]);
  return chosen.slice(0,ACE_DSP004_BDR_MAX_SNAPSHOTS_).sort(function(a,b) {
    return Date.parse(a.createdAt)-Date.parse(b.createdAt);
  });
}
function aceDsp004BdrCandidatesV10_() {
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('DSP004_BDR_MAINTAINER_GATE_UNAVAILABLE');
  pastikanMaintainerPortal3B0_('ACE_DSP004_BDR_SNAPSHOT_READ_ONLY');
  var required=[
    ['bdrV10ResolveRoot_',typeof bdrV10ResolveRoot_],
    ['bdrV10ListRecoveryPoints_',typeof bdrV10ListRecoveryPoints_],
    ['bdrV10ManifestFromFolder_',typeof bdrV10ManifestFromFolder_]
  ];
  required.forEach(function(x){if(x[1]!=='function')throw new Error('DSP004_BDR_DEPENDENCY_MISSING:'+x[0]);});
  var ss=getSS_(),sourceId=String(ss.getId()||'');
  var root=bdrV10ResolveRoot_();
  if(!root.valid)return {available:false,code:String(root.code||'BDR_ROOT_UNAVAILABLE'),
    points:[],candidates:[],selected:[],totalPoints:0,sourceIdMatchedCount:0};
  var points=bdrV10ListRecoveryPoints_(root.folder),valid=[],sourceMatches=0,
    start=Date.parse(ACE_DSP004_BDR_WINDOW_START_),
    end=Date.parse(ACE_DSP004_BDR_WINDOW_END_);
  points.forEach(function(p) {
    if(!p||p.manifestValid!==true||String(p.status||'').toUpperCase()!=='VERIFIED')
      return;
    var parsed=bdrV10ManifestFromFolder_(p._folder);
    if(!parsed.valid)return;
    var m=parsed.manifest||{};
    if(String(m.source&&m.source.spreadsheetId||'')!==sourceId)return;
    sourceMatches++;
    var createdAt=aceDsp004BdrOnlyIsoV10_(m.createdAt||p.createdAt);
    var time=Date.parse(createdAt);
    if(!isFinite(time)||time<start||time>end)return;
    if(String(m.verification&&m.verification.status||'')!=='VERIFIED')return;
    if(!String(m.backup&&m.backup.spreadsheetId||''))return;
    valid.push({
      backupId:String(m.backupId||''),
      createdAt:createdAt,
      backupSpreadsheetId:String(m.backup.spreadsheetId||''),
      manifestVerification:'VERIFIED'
    });
  });
  var selected=aceDsp004BdrPickV10_(valid,ACE_DSP004_BDR_EVENT_AT_);
  return {available:true,code:'OK',points:points,candidates:valid,
    selected:selected,totalPoints:points.length,sourceIdMatchedCount:sourceMatches};
}
function aceDsp004BdrPublicPointV10_(p) {
  return {backupId:p.backupId,createdAt:p.createdAt,
    temporalPosition:Date.parse(p.createdAt)<Date.parse(ACE_DSP004_BDR_EVENT_AT_)
      ?'BEFORE_SUBMISSION':'AFTER_SUBMISSION',
    evidenceStatus:'VERIFIED_MANIFEST_ONLY_NOT_REVERIFIED'};
}
function diagnostikDaftarCadanganACEDsp004V10() {
  var found=aceDsp004BdrCandidatesV10_();
  var result={
    sukses:found.available,
    versi:ACE_DSP004_BDR_DIAG_V10_VERSION_,
    code:found.code,
    eventAt:ACE_DSP004_BDR_EVENT_AT_,
    coverageWindow:{start:ACE_DSP004_BDR_WINDOW_START_,end:ACE_DSP004_BDR_WINDOW_END_},
    recoveryPointCount:found.totalPoints,
    matchingSourceVerifiedCount:found.sourceIdMatchedCount,
    windowQualifiedCount:found.candidates.length,
    selectedSnapshotCount:found.selected.length,
    selected:found.selected.map(aceDsp004BdrPublicPointV10_),
    dataBisnisDiubah:false,readOnly:true
  };
  Logger.log('ACE_DSP004_BDR_LIST '+JSON.stringify(result));
  return result;
}
function aceDsp004BdrExactRowsV10_(ss,name,colIndex,id) {
  var sheet=ss.getSheetByName(name);
  if(!sheet)return {sourceAvailable:false,count:0,rows:[]};
  var last=sheet.getLastRow();
  if(last<2)return {sourceAvailable:true,count:0,rows:[]};
  var range=sheet.getRange(2,colIndex+1,last-1,1);
  var found=range.createTextFinder(id).matchEntireCell(true)
    .useRegularExpression(false).findAll();
  // More than 10 exact ID matches means unusable ambiguous evidence.
  if(found.length>10)throw new Error('DSP004_BDR_DUPLICATE_ID_EXCEEDS_LIMIT');
  return {sourceAvailable:true,count:found.length,rows:found.map(function(r){return r.getRow();})};
}
function aceDsp004BdrSnapshotV10_(backupSs,meta) {
  var C=SHEET_COLUMNS,R=C.REKAP_KINERJA,I=C.INDEX_LAPORAN,
    P=C.DISPOSISI_PENERIMA,A=C.AUDIT_LOG;
  if(!R||!I||!P||!A)throw new Error('DSP004_BDR_SCHEMA_MISSING');
  var results=ACE_DSP004_BDR_TARGETS_.map(function(t) {
    var rekap=aceDsp004BdrExactRowsV10_(backupSs,'Rekap_Kinerja',R.ID_LAPORAN,t.id);
    var index=aceDsp004BdrExactRowsV10_(backupSs,'Index_Laporan',I.ID_LAPORAN,t.id);
    var recipient=aceDsp004BdrExactRowsV10_(backupSs,'Disposisi_Penerima',
      P.ID_LAPORAN_TERKAIT,t.id);
    var audit=aceDsp004BdrExactRowsV10_(backupSs,'Audit_Log',A.DETAIL,t.id);
    var link=null,idx=null;
    if(rekap.count===1){
      var sh=backupSs.getSheetByName('Rekap_Kinerja');
      link=String(sh.getRange(rekap.rows[0],R.ID_DISPOSISI+1).getValue()||'');
    }
    if(index.count===1){
      var si=backupSs.getSheetByName('Index_Laporan');
      idx=String(si.getRange(index.rows[0],I.ID_DISPOSISI+1).getValue()||'');
    }
    return {
      caseId:t.code,
      rekap:rekap,index:index,
      recipientRef:recipient,
      exactSubmitOrOtherAuditReferenceCount:audit.count,
      reportLinkPresent:link===null?null:!!link,
      indexLinkPresent:idx===null?null:!!idx,
      reportAndIndexBothFound:rekap.count===1&&index.count===1,
      // Indicate uncertainty rather than inferring deletions across snapshots.
      classification:rekap.count===1?'PRESENT_IN_BACKUP_SNAPSHOT':
        (rekap.sourceAvailable?'ABSENT_IN_BACKUP_SNAPSHOT':'REKAP_SHEET_UNAVAILABLE')
    };
  });
  return {
    backupId:meta.backupId,
    createdAt:meta.createdAt,
    evidenceStatus:'VERIFIED_MANIFEST_ONLY_NOT_REVERIFIED',
    cases:results
  };
}
function aceDsp004BdrCurrentAnchorV10_() {
  var ss=getSS_(),C=SHEET_COLUMNS,rec=ss.getSheetByName('Disposisi_Penerima');
  if(!rec||rec.getLastRow()<622||!C.DISPOSISI_PENERIMA)
    throw new Error('DSP004_BDR_CURRENT_RECIPIENT_MISSING');
  var P=C.DISPOSISI_PENERIMA,record=rec.getRange(622,1,1,
    Math.max(P.ID_DISPOSISI,P.ID_LAPORAN_TERKAIT)+1).getValues()[0];
  var target=ACE_DSP004_BDR_TARGETS_[1].id;
  if(String(record[P.ID_DISPOSISI]||'')!=='DSP-e3e9dd3f-20c8-46ef-b80c-78daced67ad8'||
     String(record[P.ID_LAPORAN_TERKAIT]||'').toLowerCase()!==target)
    throw new Error('DSP004_BDR_CURRENT_SOURCE_ANCHOR_CHANGED');
  var R=C.REKAP_KINERJA,I=C.INDEX_LAPORAN;
  var foundR=aceDsp004BdrExactRowsV10_(ss,'Rekap_Kinerja',R.ID_LAPORAN,target);
  var foundI=aceDsp004BdrExactRowsV10_(ss,'Index_Laporan',I.ID_LAPORAN,target);
  if(!foundR.sourceAvailable||!foundI.sourceAvailable||foundR.count||foundI.count)
    throw new Error('DSP004_BDR_CURRENT_MISSING_REPORT_STATE_CHANGED');
  return true;
}
function diagnostikIsiCadanganACEDsp004V10() {
  var found=aceDsp004BdrCandidatesV10_();
  if(!found.available)throw new Error('DSP004_BDR_SOURCE_UNAVAILABLE:'+found.code);
  aceDsp004BdrCurrentAnchorV10_();
  // Max four selected VERIFIED manifest snapshots. No copy, import, restore.
  var records=found.selected.map(function(point){
    try{
      return aceDsp004BdrSnapshotV10_(
        SpreadsheetApp.openById(point.backupSpreadsheetId),point);
    }catch(e){
      return {
        backupId:point.backupId,createdAt:point.createdAt,
        evidenceStatus:'SNAPSHOT_READ_FAILED',
        failureCode:'UNAVAILABLE_OR_READ_ERROR',cases:[]
      };
    }
  });
  var summary={
    sukses:records.every(function(x){return x.evidenceStatus!=='SNAPSHOT_READ_FAILED';}),
    versi:ACE_DSP004_BDR_DIAG_V10_VERSION_,
    scannedSnapshots:records.length,
    availableWindowSnapshots:found.candidates.length,
    missingSnapshotCount:records.filter(function(x){
      return x.evidenceStatus==='SNAPSHOT_READ_FAILED';}).length,
    scans:records,
    limitation:[
      'A verified BDR manifest is not new independent hash verification.',
      'No snapshot after the submission proves neither deletion nor its cause.',
      'Report existence in two snapshots can narrow a change interval only.'
    ],
    readOnly:true,dataBisnisDiubah:false
  };
  Logger.log('ACE_DSP004_BDR_SCAN_SUMMARY '+JSON.stringify({
    sukses:summary.sukses,versi:summary.versi,
    scannedSnapshots:summary.scannedSnapshots,
    availableWindowSnapshots:summary.availableWindowSnapshots,
    missingSnapshotCount:summary.missingSnapshotCount,
    readOnly:true,dataBisnisDiubah:false
  }));
  records.forEach(function(r){
    Logger.log('ACE_DSP004_BDR_SCAN_CASE '+JSON.stringify(r));
  });
  return summary;
}
function validasiCadanganACEDsp004V10() {
  var tests=[];function ck(n,ok){tests.push({nama:n,lulus:ok===true});}
  var event=ACE_DSP004_BDR_EVENT_AT_;
  var d=['2026-09-30T00:00:00Z','2026-10-02T00:00:00Z',
    '2026-10-05T00:00:00Z','2026-10-07T00:00:00Z','2026-10-10T00:00:00Z'];
  var entries=d.map(function(x,i){return {backupId:'B'+i,createdAt:x};});
  var chosen=aceDsp004BdrPickV10_(entries,event);
  ck('PICK_BOUNDED',chosen.length===4);
  ck('PICK_NEAREST_BEFORE',chosen[0].backupId==='B0');
  ck('PICK_FIRST_AFTER',chosen.some(function(x){return x.backupId==='B1';}));
  ck('PICK_LATEST_AFTER',chosen.some(function(x){return x.backupId==='B4';}));
  ck('PICK_UNIQUE',chosen.map(function(x){return x.backupId;})
    .filter(function(x,i,a){return a.indexOf(x)===i;}).length===chosen.length);
  ck('NO_CANDIDATES_SUPPORTED',aceDsp004BdrPickV10_([],event).length===0);
  var testId=ACE_DSP004_BDR_TARGETS_[1].id,
    sheets=Object.create(null);
  sheets.Rekap_Kinerja={getLastRow:function(){return 4;},getRange:function(){
    return {createTextFinder:function(v){return {
      matchEntireCell:function(){return this;},
      useRegularExpression:function(){return this;},
      findAll:function(){return v===testId?[{getRow:function(){return 3;}}]:[];}
    };}};}};
  var fakeSs={getSheetByName:function(n){return sheets[n]||null;}};
  var m=aceDsp004BdrExactRowsV10_(fakeSs,'Rekap_Kinerja',18,testId);
  ck('EXACT_MATCH',m.sourceAvailable&&m.count===1&&m.rows[0]===3);
  ck('MISSING_SHEET_EXPLICIT',aceDsp004BdrExactRowsV10_(
    fakeSs,'Index_Laporan',0,testId).sourceAvailable===false);
  ck('VERIFIED_MANIFEST_LABEL',
    aceDsp004BdrPublicPointV10_({backupId:'A',createdAt:'2026-10-02T00:00:00Z'})
      .evidenceStatus==='VERIFIED_MANIFEST_ONLY_NOT_REVERIFIED');
  ck('TWO_TARGETS',ACE_DSP004_BDR_TARGETS_.length===2);
  ck('VALID_EVENT_TIME',aceDsp004BdrOnlyIsoV10_(event)===event);
  var failed=tests.filter(function(x){return !x.lulus;});
  var out={sukses:failed.length===0,lulus:tests.length-failed.length,
    gagal:failed.length,checks:tests,readOnly:true,dataBisnisDiubah:false};
  Logger.log('ACE_DSP004_BDR_VALIDATION '+JSON.stringify(out));
  return out;
}
