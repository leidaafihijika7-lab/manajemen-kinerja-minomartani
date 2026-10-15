/**
 * PHA-07B B2 RC8.2 - AUTHENTICATED BUSINESS SERVER FUNCTION INTEGRATION.
 * ISOLATED SYNTHETIC FIXTURE ONLY. NEVER DEPLOY; no web/trigger endpoints.
 * Calls the actual cekLogin, simpanDataKinerja, simpanRevisiLaporanDitolakPegawai,
 * prosesReviewAdmin and RC7 dual-write integration from staging Kode.gs.
 * A positive result is NOT HTTP/PWA end-to-end acceptance.
 * Credentials/tokens are random and never logged. Evidence stays on disposable Sheet.
 */
var RC82_STAGE_ = Object.freeze({
  VERSION: 'PHA07B2-RC82-IDENTITY-GUARD-2026.10.12.1',
  ID: '1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  MARKER: 'STAGE_RC82_SUBMIT_IDENTITY_HARDENING',
  AUTH_MARKER: 'RC82_IDENTITY_HARDENING_WRITES_OPTIN_ONLY',
  OPT_KEY: 'RC82_WRITE_DRILL_ENABLED',
  PENDING_KEY: 'RC82_RECOVERY_PENDING',
  PREFIX: '__RC82_BK_',
  OWNER: 'RC82-USR-OWNER',
  OTHER: 'RC82-USR-OTHER',
  ADMIN: 'RC82-USR-ADMIN',
  DISABLED: 'RC82-USR-DISABLED',
  BLOCKS: [
    { tab:'Rekap_Kinerja', rows:14, cols:71, backupRow:1 },
    { tab:'Index_Laporan', rows:14, cols:12, backupRow:18 },
    { tab:'Audit_Log', rows:45, cols:4, backupRow:34 },
    { tab:'Index_Laporan_Sync_Queue', rows:20, cols:12, backupRow:81 },
    { tab:'Data_Pegawai', rows:12, cols:11, backupRow:104 },
    { tab:'Disposisi_Petugas', rows:8, cols:12, backupRow:118 }
  ],
  EXPECTED_SHEETS: [
    'MULAI_DI_SINI','SKENARIO_B0','Rekap_Kinerja','Index_Laporan',
    'Index_Laporan_Sync_Queue','Disposisi_Surat','Disposisi_Penerima',
    'Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0','Data_Pegawai','Disposisi_Petugas'
  ]
});
function rc82Fail_(code) { throw new Error('RC82_STAGE_BLOCKED:'+code); }
function rc82Props_() { return PropertiesService.getScriptProperties(); }
function rc82Backups_(ss) { return ss.getSheets().filter(function(sh){return sh.getName().indexOf(RC82_STAGE_.PREFIX)===0;}); }
function rc82AssertEnv_() {
  var p=rc82Props_();
  if(p.getProperty('RC82_STAGING_MODE')!=='true' ||
     String(p.getProperty('SPREADSHEET_ID')||'').trim()!==RC82_STAGE_.ID ||
     p.getProperty('RC81_STAGING_MODE')==='true' || p.getProperty('RC8_STAGING_MODE')==='true')
    rc82Fail_('STAGING_CONFIG_INVALID');
  if(p.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED')==='true')
    rc82Fail_('QUEUE_REPLAY_MUST_BE_OFF');
  var ss=getSS_();
  if(ss.getId()!==RC82_STAGE_.ID)rc82Fail_('WRONG_DATABASE');
  var sh=ss.getSheetByName('MULAI_DI_SINI');
  if(!sh || String(sh.getRange('A5').getValue())!==RC82_STAGE_.MARKER ||
      String(sh.getRange('A8').getValue())!==RC82_STAGE_.AUTH_MARKER ||
      String(sh.getRange('B16').getValue())!==RC82_STAGE_.ID)
    rc82Fail_('WORKBOOK_SENTINEL_MISMATCH');
  return {ss:ss,p:p};
}
function rc82Baseline_(ss) {
  var issues=[],source=ss.getSheetByName('Rekap_Kinerja'),index=ss.getSheetByName('Index_Laporan'),
      audit=ss.getSheetByName('Audit_Log'),queue=ss.getSheetByName('Index_Laporan_Sync_Queue'),
      employees=ss.getSheetByName('Data_Pegawai');
  var actualNames=ss.getSheets().map(function(s){return s.getName();}).sort().join('|');
  var expectedNames=RC82_STAGE_.EXPECTED_SHEETS.slice().sort().join('|');
  if(actualNames!==expectedNames)issues.push('UNEXPECTED_OR_MISSING_SHEET');
  if(!source||!index||!audit||!queue||!employees)return {issues:issues.concat(['REQUIRED_SHEET_MISSING'])};
  if(source.getLastRow()!==3||index.getLastRow()!==3)issues.push('BASELINE_ROW_COUNT');
  if(audit.getLastRow()!==3||queue.getLastRow()!==1)issues.push('AUDIT_OR_QUEUE_NOT_BASELINE');
  if(employees.getLastRow()!==1)issues.push('EMPLOYEE_FIXTURE_NOT_EMPTY');
  var userHeader=employees.getRange(1,1,1,11).getValues()[0].map(String);
  var required=['ID','Username','Nama','Jabatan','PIN_HASH','Akses','WA','Status',
    'pin_salt','pin_hash_version','pin_updated_at'];
  if(required.some(function(x,i){return x!==userHeader[i];}))issues.push('EMPLOYEE_HEADER_INVALID');
  for(var i=0;i<2;i++){
    var row=i+2,expectedId='B0-RPT-000'+(i+1);
    if(String(source.getRange(row,19).getValue())!==expectedId)issues.push('SOURCE_ID_MISMATCH:'+row);
    var projected=buatBarisIndexLaporan2B0_(rc7Source_(ss,row).row,row);
    var actual=index.getRange(row,1,1,projected.length).getValues()[0];
    if(bedaBarisIndexLaporan2B0_(projected,actual).length)issues.push('INDEX_NOT_BASELINE:'+row);
  }
  [['Rekap_Kinerja','A2'],['Rekap_Kinerja','N2'],['Index_Laporan','D2'],
   ['Index_Laporan','E2'],['Index_Laporan','K2']].forEach(function(p){
    if(typeof ss.getSheetByName(p[0]).getRange(p[1]).getValue()!=='string')
      issues.push('DATE_TEXT_TYPE_CHANGED:'+p[0]+'!'+p[1]);
  });
  return {issues:issues,sourceRows:source.getLastRow()-1,indexRows:index.getLastRow()-1,
    auditRows:audit.getLastRow()-1,queueRows:queue.getLastRow()-1,employeeRows:employees.getLastRow()-1};
}
/**
 * Pure, in-memory sanity check: the patched RC7 helper is present and only
 * allows the exact owner-revision rotation. Never edits workbook/properties.
 */
function rc82RevisionNoncePatchProbeV1_() {
  if (typeof rc7AllowOwnerRevisionNonceChange_!=='function') return false;
  try {
    var C=SHEET_COLUMNS.REKAP_KINERJA,M=getIndexLaporanColumnMap2B0_();
    var row=Array(C.STAF_INSTRUKSI_LOKASI+1).fill('');
    row[C.STATUS_REVIEW]=REVIEW_STATUS.MENUNGGU;
    row[C.REVISI_KE]=1;
    row[C.TERAKHIR_DIREVISI_PADA]=new Date();
    row[C.TERAKHIR_DIREVISI_OLEH]='RC82-PROBE-OWNER - Probe';
    var source={rowRekap:4,row:row,
      triple:{idLaporan:'RC82-PROBE-REPORT',idUser:'RC82-PROBE-OWNER',nonce:'RC82-PROBE-NEW'}};
    var prior=Array(INDEX_LAPORAN_2B0_CONFIG.HEADERS.length).fill('');
    prior[M.ID_LAPORAN]='RC82-PROBE-REPORT';prior[M.ROW_REKAP]=4;
    prior[M.ID_USER]='RC82-PROBE-OWNER';prior[M.NONCE]='RC82-PROBE-OLD';
    prior[M.STATUS_REVIEW]=REVIEW_STATUS.DITOLAK;
    if (!rc7AllowOwnerRevisionNonceChange_(source,prior,'REVISI_PEGAWAI',M)) return false;
    if (rc7AllowOwnerRevisionNonceChange_(source,prior,'REVIEW_ADMIN_FINAL',M)) return false;
    var wrongOwner=prior.slice();wrongOwner[M.ID_USER]='RC82-FOREIGN-OWNER';
    if (rc7AllowOwnerRevisionNonceChange_(source,wrongOwner,'REVISI_PEGAWAI',M)) return false;
    var wrongRow=prior.slice();wrongRow[M.ROW_REKAP]=3;
    if (rc7AllowOwnerRevisionNonceChange_(source,wrongRow,'REVISI_PEGAWAI',M)) return false;
    return true;
  } catch (e) {return false;}
}
/**
 * Read-only RC8.2 security probe. Executes only the pure identity validator:
 * no session issuance, uploads, cache, spreadsheet writes or property changes.
 */
function rc82SubmitIdentityGuardProbeV1_() {
  if (typeof validasiIdentitasSubmitKinerjaSesi_ !== 'function' ||
      typeof normalisasiIdentitasSubmitKinerjaSesi_ !== 'function') return false;
  try {
    var u={id:RC82_STAGE_.OWNER,nama:'Pegawai Sintetis Owner',
      jabatan:'Kasi Pemerintahan',status:'Aktif'};
    var ctx={idUser:u.id,pegawaiUser:u};
    var authentic={nama:u.nama,jabatan:u.jabatan};
    var roleSpoof={nama:u.nama,jabatan:'Lurah'};
    var nameSpoof={nama:'Lurah Palsu Sintetis',jabatan:u.jabatan};
    var foreignContext={idUser:RC82_STAGE_.OTHER,pegawaiUser:u};
    var ok=validasiIdentitasSubmitKinerjaSesi_(ctx,authentic)==='';
    var roleDenied=/(identitas|jabatan|nama)/i.test(
      validasiIdentitasSubmitKinerjaSesi_(ctx,roleSpoof));
    var nameDenied=/(identitas|jabatan|nama)/i.test(
      validasiIdentitasSubmitKinerjaSesi_(ctx,nameSpoof));
    var foreignDenied=!!validasiIdentitasSubmitKinerjaSesi_(foreignContext,authentic);
    var disabled=Object.assign({},u,{status:'Nonaktif'});
    var inactiveDenied=!!validasiIdentitasSubmitKinerjaSesi_(
      {idUser:u.id,pegawaiUser:disabled},authentic);
    var differentCase=validasiIdentitasSubmitKinerjaSesi_(ctx,
      {nama:' pegawai   sintetis owner ',jabatan:' kasi pemerintahan '})==='';
    return ok&&roleDenied&&nameDenied&&foreignDenied&&inactiveDenied&&differentCase;
  } catch (e) {return false;}
}
function rc82ReadOnlyPreflightV1() {
  var ctx=rc82AssertEnv_(),p=ctx.p,r=rc82Baseline_(ctx.ss),issues=r.issues.slice();
  if(p.getProperty(RC82_STAGE_.PENDING_KEY))issues.push('RECOVERY_PENDING');
  if(!rc82RevisionNoncePatchProbeV1_())issues.push('RC7_REVISION_NONCE_PATCH_MISSING_OR_UNSAFE');
  if(!rc82SubmitIdentityGuardProbeV1_())issues.push('RC82_SUBMIT_IDENTITY_GUARD_MISSING_OR_UNSAFE');
  if(rc82Backups_(ctx.ss).length)issues.push('BACKUP_PRESENT');
  if(p.getProperty(RC82_STAGE_.OPT_KEY)==='true')issues.push('OPT_IN_ACTIVE');
  if(p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED')==='true')issues.push('DUAL_WRITE_ACTIVE_OUTSIDE_MATRIX');
  // Entire project must be synthetic: reject leaked credentials or copied production configuration.
  ['PIN_PEPPER','FOLDER_ID_BUKTI_KINERJA','FOLDER_ID_BUKTI','API_KEY_GEMINI',
   'DATA_PEGAWAI_V3_SECURE_PIN'].forEach(function(k){if(p.getProperty(k))issues.push('FORBIDDEN_PRECONFIG:'+k);});
  var triggers='NOT_VERIFIED';
  try {triggers=ScriptApp.getProjectTriggers().length;if(triggers)issues.push('INSTALLED_TRIGGERS');}
  catch(e){issues.push('TRIGGER_INVENTORY_FAILED');}
  var out={stage:'PHA-07B B2 RC8.2',version:RC82_STAGE_.VERSION,
    status:issues.length?'RC82_PREFLIGHT_NOT_ACCEPTED':'RC82_PREFLIGHT_PASS',
    targetSpreadsheetId:RC82_STAGE_.ID,sourceRows:r.sourceRows,indexRows:r.indexRows,
    auditRows:r.auditRows,queueRows:r.queueRows,employeeRows:r.employeeRows,
    triggers:triggers,issues:issues,writesPerformed:0,productionReady:false};
  console.log('PHA07B2_RC82_PREFLIGHT:\n'+JSON.stringify(out,null,2));return out;
}
function rc82Typed_(v){if(v instanceof Date)return ['date',v.getTime()];if(v==null)return ['null'];return [typeof v,v];}
function rc82Signature_(range){
  function map(a,fn){return a.map(function(r){return r.map(fn);});}
  var validations=map(range.getDataValidations(),function(v){return v?String(v.getCriteriaType()):null;});
  return JSON.stringify({values:map(range.getValues(),rc82Typed_),
    display:range.getDisplayValues(),formats:range.getNumberFormats(),
    formulas:range.getFormulas(),notes:range.getNotes(),validations:validations});
}
function rc82Keys_(){
  var ids=[RC82_STAGE_.OWNER,RC82_STAGE_.OTHER,RC82_STAGE_.ADMIN,RC82_STAGE_.DISABLED];
  var keys=['PIN_PEPPER','FOLDER_ID_BUKTI_KINERJA','INDEX_LAPORAN_2B1_WRITE_ENABLED',
    INDEX_LAPORAN_2B0_CONFIG.METADATA_PROPERTY,INDEX_LAPORAN_2B1_CONFIG.LAST_SYNC_PROPERTY,
    'REKAP_KINERJA_DETAIL_SCHEMA_READY_'+REKAP_KINERJA_DETAIL_SCHEMA_VERSION,
    'DATA_PEGAWAI_V3_SECURE_PIN'];
  ids.forEach(function(id){keys.push(sessionRegistryKeyV2_(id));});
  return keys;
}
function rc82PrepareBackup_(ss,p) {
  if(p.getProperty(RC82_STAGE_.PENDING_KEY)||rc82Backups_(ss).length)rc82Fail_('PRIOR_RECOVERY_NOT_RESOLVED');
  var name=RC82_STAGE_.PREFIX+'AUTH_'+Utilities.getUuid().replace(/-/g,'').substring(0,12);
  var backup=ss.insertSheet(name);
  if(backup.getMaxColumns()<71)backup.insertColumnsAfter(backup.getMaxColumns(),71-backup.getMaxColumns());
  var lastRows={},metadata={};
  // Snapshot before real login, sessions, sheet mutation, or dual-write flag changes.
  RC82_STAGE_.BLOCKS.forEach(function(b){
    var source=ss.getSheetByName(b.tab);
    if(!source)rc82Fail_('BACKUP_SOURCE_MISSING:'+b.tab);
    lastRows[b.tab]=source.getLastRow();
    source.getRange(1,1,b.rows,b.cols).copyTo(
      backup.getRange(b.backupRow,1,b.rows,b.cols),SpreadsheetApp.CopyPasteType.PASTE_NORMAL,false);
  });
  rc82Keys_().forEach(function(k){metadata[k]=p.getProperty(k);});
  SpreadsheetApp.flush();
  backup.hideSheet();
  var record={v:1,targetId:RC82_STAGE_.ID,backupName:name,backupId:backup.getSheetId(),
    lastRows:lastRows,originalSheetNames:ss.getSheets().filter(function(x){return x.getName()!==name;}).map(function(x){return x.getName();}).sort(),
    properties:metadata,createdAt:new Date().toISOString()};
  p.setProperty(RC82_STAGE_.PENDING_KEY,JSON.stringify(record));
  return record;
}
function rc82Restore_(ss,p,record) {
  if(!record||record.targetId!==RC82_STAGE_.ID||
     String(record.backupName||'').indexOf(RC82_STAGE_.PREFIX)!==0)rc82Fail_('RECOVERY_MANIFEST_INVALID');
  var backup=ss.getSheetByName(record.backupName);
  if(!backup||backup.getSheetId()!==record.backupId)rc82Fail_('RECOVERY_BACKUP_LOST');
  var diffs=[];
  RC82_STAGE_.BLOCKS.forEach(function(b){
    var target=ss.getSheetByName(b.tab),save=backup.getRange(b.backupRow,1,b.rows,b.cols);
    if(!target){diffs.push('SHEET_MISSING:'+b.tab);return;}
    // Do not overwrite anything beyond the protected snapshot rectangle.
    if(target.getLastRow()>b.rows) {diffs.push('ROWS_BEYOND_BACKUP:'+b.tab);return;}
    save.copyTo(target.getRange(1,1,b.rows,b.cols),SpreadsheetApp.CopyPasteType.PASTE_NORMAL,false);
  });
  var before=record.properties||{};
  Object.keys(before).forEach(function(key){
    if(before[key]===null)p.deleteProperty(key);else p.setProperty(key,before[key]);
  });
  try{bersihkanCacheDataPegawai_();}catch(e){diffs.push('EMPLOYEE_CACHE_RESET_ERROR');}
  SpreadsheetApp.flush();
  RC82_STAGE_.BLOCKS.forEach(function(b){
    var target=ss.getSheetByName(b.tab);
    if(!target)return;
    if(target.getLastRow()!==record.lastRows[b.tab])diffs.push('ROW_COUNT_CHANGED:'+b.tab);
    if(rc82Signature_(target.getRange(1,1,b.rows,b.cols))!==
       rc82Signature_(backup.getRange(b.backupRow,1,b.rows,b.cols)))
      diffs.push('TYPED_CELL_STATE_CHANGED:'+b.tab);
  });
  var currentNames=ss.getSheets().filter(function(x){return x.getName()!==record.backupName;}).map(function(x){return x.getName();}).sort().join('|');
  if(currentNames!==record.originalSheetNames.join('|'))diffs.push('UNEXPECTED_SHEETS_REMAIN');
  Object.keys(before).forEach(function(k){
    if(p.getProperty(k)!==before[k])diffs.push('SCRIPT_PROPERTY_CHANGED:'+k);
  });
  if(diffs.length)return {restored:false,differences:diffs,backupRetained:true};
  ss.deleteSheet(backup);
  p.deleteProperty(RC82_STAGE_.PENDING_KEY);
  return {restored:true,differences:[],backupRetained:false};
}
function rc82InstallSyntheticUsers_(ss,p) {
  if(p.getProperty('PIN_PEPPER'))rc82Fail_('PIN_PEPPER_PREEXISTING');
  p.setProperty('PIN_PEPPER',Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''));
  // Non-upload path only. This sentinel is NOT a real Drive folder and MUST NOT be used to upload.
  p.setProperty('FOLDER_ID_BUKTI_KINERJA','RC82_NO_UPLOAD_SENTINEL');
  var rows=[],credentials={};
  var users=[
    [RC82_STAGE_.OWNER,'rc82_owner','Pegawai Sintetis Owner','Kasi Pemerintahan','User','Aktif'],
    [RC82_STAGE_.OTHER,'rc82_other','Pegawai Sintetis Other','Kaur Pangripta','User','Aktif'],
    [RC82_STAGE_.ADMIN,'rc82_admin','Admin Sintetis','Carik','Admin','Aktif'],
    [RC82_STAGE_.DISABLED,'rc82_disabled','Pegawai Sintetis Nonaktif','Kasi Pemerintahan','User','Nonaktif']
  ];
  users.forEach(function(u){
    var pin=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    var salt=buatPinSalt_();
    credentials[u[1]]=pin;
    rows.push([u[0],u[1],u[2],u[3],hashPinV2_(pin,salt),u[4],'',u[5],salt,'v2',new Date()]);
  });
  ss.getSheetByName('Data_Pegawai').getRange(2,1,rows.length,11).setValues(rows);
  bersihkanCacheDataPegawai_();
  return credentials;
}
function rc82Require_(condition,reason){if(!condition)throw new Error('RC82_ASSERT_FAILED:'+reason);}
function rc82Report_(phase,ok,detail){return {phase:phase,passed:!!ok,detail:detail||''};}
function rc82Package_(nonce,spoof){
  var today=Utilities.formatDate(new Date(),'GMT+7','dd/MM/yyyy');
  var paket={nama:'Pegawai Sintetis Owner',jabatan:'Kasi Pemerintahan',
    kategori:'Laporan Produktifitas - Pelaksanaan Kegiatan tugas pokok dan fungsi - Kegiatan Reguler Tupoksi',
    deskripsi:spoof?'RC82 synthetic identity spoof probe, unique narrative and audit trail.':'RC82 synthetic endpoint submit, pelaporan kegiatan uji integrasi login dan review.',
    fileUrl:'https://example.invalid/rc82/synthetic-only-proof.jpg',
    submitNonce:nonce,
    detailReguler:{namaKeg:spoof?'Pengujian penyalahgunaan identitas RC82':'Kegiatan uji API otentikasi RC82',
      tanggal:today,lokasi:'STAGING ONLY',pihakTerlibat:'Akun uji sintetis',
      peranAnda:'Pelaksana uji',outputRingkas:'Skenario sintetis saja',tindakLanjut:'Audit staging'}
  };
  if(spoof){paket.nama='Lurah Palsu Sintetis';paket.jabatan='Lurah';}
  return paket;
}
function rc82CheckIndex_(ss,row){
  var src=rc7Source_(ss,row),expected=buatBarisIndexLaporan2B0_(src.row,row);
  var actual=ss.getSheetByName('Index_Laporan').getRange(row,1,1,expected.length).getValues()[0];
  return bedaBarisIndexLaporan2B0_(expected,actual).length===0;
}
function rc82ExecuteActualHandlers_(ss,credentials,runtime) {
  var p=rc82Props_(),results=[],C=SHEET_COLUMNS.REKAP_KINERJA;
  runtime.tests=results;
  var tokenOwner='',tokenOther='',tokenAdmin='';
  function add(phase,ok,detail){results.push(rc82Report_(phase,ok,detail));if(!ok)throw new Error('RC82_GATE_FAILED:'+phase+':'+detail);}
  function login(user){return cekLogin(user,credentials[user], 'rc82-client-'+user);}
  // Real password + salted PIN hash validation, signed token, session registry.
  var owner=login('rc82_owner'),other=login('rc82_other'),admin=login('rc82_admin');
  tokenOwner=owner&&owner.token||'';tokenOther=other&&other.token||'';tokenAdmin=admin&&admin.token||'';
  runtime.tokens=[tokenOwner,tokenOther,tokenAdmin].filter(Boolean);
  add('LOGIN_VALID_USERS',!!(owner.sukses&&other.sukses&&admin.sukses),'three genuine cekLogin calls');
  add('SIGNED_SESSION',validasiSession(tokenOwner)===RC82_STAGE_.OWNER &&
      validasiSession(tokenOther)===RC82_STAGE_.OTHER && validasiSession(tokenAdmin)===RC82_STAGE_.ADMIN,
      'original validasiSession accepted genuine signed tokens');
  add('WRONG_PIN_REJECTED',cekLogin('rc82_owner','RC82_WRONG_PIN','rc82-invalid-owner').sukses===false,
      'wrong PIN rejected');
  add('DISABLED_ACCOUNT_REJECTED',login('rc82_disabled').sukses===false,'inactive user rejected');
  add('TAMPERED_SESSION_REJECTED',validasiSession(tokenOwner+'altered')===null,'tampered signed token rejected');
  add('NONADMIN_ROLE_DENIED',!cekHakAksesAdmin(RC82_STAGE_.OWNER)&&cekHakAksesAdmin(RC82_STAGE_.ADMIN),
      'admin role check uses source Data_Pegawai');
  var bogus=prosesReviewAdmin('B0-RPT-0001',REVIEW_STATUS.DITOLAK,0,'rc82 forbidden',tokenOwner);
  add('NONADMIN_REVIEW_REJECTED',!bogus.sukses&&String(bogus.pesan||'').indexOf('Admin')>=0,
      'actual review endpoint rejects non-admin');
  // Enable stage-only dual write AFTER login. Replay remains OFF.
  rc82Require_(p.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED')!=='true','REPLAY_NOT_OFF');
  p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','true');
  var nonce=Utilities.getUuid().replace(/-/g,'');runtime.nonces.push('SUBMIT_NONCE_'+RC82_STAGE_.OWNER+'_'+nonce);
  var packageOwner=rc82Package_(nonce,false);
  var source=ss.getSheetByName('Rekap_Kinerja'),index=ss.getSheetByName('Index_Laporan'),audit=ss.getSheetByName('Audit_Log');
  var before=source.getLastRow();
  var submitted=simpanDataKinerja(packageOwner,tokenOwner);
  var after=source.getLastRow();
  add('AUTHENTICATED_SUBMIT',typeof submitted==='string'&&submitted.indexOf('Laporan terkirim')>=0&&after===before+1,
      'actual simpanDataKinerja with authenticated owner; success='+String(submitted).slice(0,160));
  var newRow=after,idLaporan=String(source.getRange(newRow,C.ID_LAPORAN+1).getValue()||'');
  add('SUBMIT_PROVENANCE',String(source.getRange(newRow,C.ID_USER+1).getValue())===RC82_STAGE_.OWNER &&
      String(source.getRange(newRow,C.NONCE+1).getValue())===nonce &&!!idLaporan,
      'owner id and nonce preserved');
  add('INDEX_DUAL_WRITE_ON_SUBMIT',index.getLastRow()===newRow&&rc82CheckIndex_(ss,newRow),
      'RC7 canonical index matches real submit output');
  var again=simpanDataKinerja(packageOwner,tokenOwner);
  add('SUBMIT_NONCE_IDEMPOTENT',source.getLastRow()===newRow &&
      String(again).indexOf('pernah diproses')>=0,
      'same nonce not appended twice');
  // The report may only be revised when rejected.
  var revisionNonce=Utilities.getUuid().replace(/-/g,'');runtime.nonces.push('REVISI_NONCE_'+RC82_STAGE_.OWNER+'_'+idLaporan+'_'+revisionNonce);
  var rev=rc82Package_(revisionNonce,false);rev.idLaporanRevisi=idLaporan;
  var tooEarly=simpanRevisiLaporanDitolakPegawai(rev,tokenOwner);
  add('REVISION_BEFORE_REJECTION_DENIED',String(tooEarly).indexOf('Hanya laporan')>=0&&
      String(source.getRange(newRow,C.STATUS_REVIEW+1).getValue())===REVIEW_STATUS.MENUNGGU,
      'owner cannot revise pending review');
  var deniedReview=prosesReviewAdmin(idLaporan,REVIEW_STATUS.DITOLAK,0,'cross user denial',tokenOther);
  add('OTHER_EMPLOYEE_REVIEW_DENIED',!deniedReview.sukses&&String(deniedReview.pesan||'').indexOf('Admin')>=0,
      'different employee cannot review');
  var rejection=prosesReviewAdmin(idLaporan,REVIEW_STATUS.DITOLAK,0,'RC82 staged rejection',tokenAdmin);
  add('ADMIN_REJECTION',!!rejection.sukses &&
      String(source.getRange(newRow,C.STATUS_REVIEW+1).getValue())===REVIEW_STATUS.DITOLAK &&
      rc82CheckIndex_(ss,newRow),'admin rejection persisted and dual-write synchronized');
  var alien=rc82Package_(Utilities.getUuid().replace(/-/g,''),false);alien.idLaporanRevisi=idLaporan;
  var cross=simpanRevisiLaporanDitolakPegawai(alien,tokenOther);
  add('CROSS_OWNER_REVISION_DENIED',String(cross).indexOf('bukan milik')>=0&&
      String(source.getRange(newRow,C.STATUS_REVIEW+1).getValue())===REVIEW_STATUS.DITOLAK,
      'other employee rejected by original revision endpoint');
  var fixed=simpanRevisiLaporanDitolakPegawai(rev,tokenOwner);
  // Capture independent predicates BEFORE throwing. All fields synthetic; never log PINs, session tokens, or raw nonces.
  var revisionStatus=String(source.getRange(newRow,C.STATUS_REVIEW+1).getValue());
  var revisionNonceMatches=String(source.getRange(newRow,C.NONCE+1).getValue())===revisionNonce;
  var revisionResponse=String(fixed||'');
  var revisionResponseOk=revisionResponse.indexOf('Revisi laporan tersimpan')>=0;
  var revisionIndexSame=false, revisionIndexDifferences=[], revisionIndexError='';
  try {
    var revisionSrc=rc7Source_(ss,newRow);
    var revisionProjected=buatBarisIndexLaporan2B0_(revisionSrc.row,newRow);
    var revisionActual=index.getRange(newRow,1,1,revisionProjected.length).getValues()[0];
    revisionIndexDifferences=bedaBarisIndexLaporan2B0_(revisionProjected,revisionActual);
    revisionIndexSame=revisionIndexDifferences.length===0;
  } catch(indexDiagnosticError) {
    revisionIndexError=String(indexDiagnosticError&&indexDiagnosticError.message||indexDiagnosticError).slice(0,300);
  }
  var revisionEvidence={
    response:revisionResponse.slice(0,360),
    responseSuccess:revisionResponseOk,
    sourceStatus:revisionStatus,
    statusMatches:revisionStatus===REVIEW_STATUS.MENUNGGU,
    nonceMatches:revisionNonceMatches,
    indexIdentical:revisionIndexSame,
    indexDifferences:revisionIndexDifferences.slice(0,12),
    indexError:revisionIndexError,
    queueRows:Math.max(0,ss.getSheetByName('Index_Laporan_Sync_Queue').getLastRow()-1)
  };
  runtime.ownerRevisionEvidence=revisionEvidence;
  add('AUTHENTICATED_OWNER_REVISION',revisionResponseOk &&
      revisionEvidence.statusMatches && revisionNonceMatches && revisionIndexSame,
      'diagnostic='+JSON.stringify(revisionEvidence).slice(0,1800));
  var revisiAgain=simpanRevisiLaporanDitolakPegawai(rev,tokenOwner);
  add('REVISION_NONCE_IDEMPOTENT',String(revisiAgain).indexOf('pernah diproses')>=0,
      'same revision nonce rejected');
  var approval=prosesReviewAdmin(idLaporan,REVIEW_STATUS.DISETUJUI,3,'RC82 final approval',tokenAdmin);
  add('ADMIN_FINAL_REVIEW',!!approval.sukses && rc82CheckIndex_(ss,newRow) &&
      String(source.getRange(newRow,C.STATUS_REVIEW+1).getValue())===String(approval.statusFinal),
      'actual admin final review and canonical index');
  var relevant=audit.getDataRange().getValues().slice(3).filter(function(r){return String(r[3]||'').indexOf(idLaporan)>=0;});
  var actions=relevant.map(function(r){return String(r[2]||'');});
  add('AUDIT_PROVENANCE',actions.indexOf('SUBMIT_LAPORAN')>=0 &&
      actions.indexOf('REVISI_LAPORAN_PEGAWAI')>=0 && actions.indexOf('REVIEW_LAPORAN')>=0,
      'genuine audit log for submit, revision, review');
  add('QUEUE_NOT_USED',ss.getSheetByName('Index_Laporan_Sync_Queue').getLastRow()===1,
      'canonical sync did not enqueue repair');
  // HIGH-PRIORITY SECURITY PROBE: try to impersonate Lurah using a valid employee token.
  // It must be explicitly rejected for identity mismatch. No real user is affected.
  var spoofNonce=Utilities.getUuid().replace(/-/g,'');runtime.nonces.push('SUBMIT_NONCE_'+RC82_STAGE_.OWNER+'_'+spoofNonce);
  var spoofPayload=rc82Package_(spoofNonce,true);
  var countBefore=source.getLastRow(),spoofResult=simpanDataKinerja(spoofPayload,tokenOwner);
  var countAfter=source.getLastRow();
  var spoofAccepted=countAfter>countBefore;
  var rejectionReason=String(spoofResult||'');
  runtime.spoofEvidence={submitted:spoofAccepted,sourceRowDelta:countAfter-countBefore,
    reportedClaimedJabatan:spoofAccepted?String(source.getRange(countAfter,C.JABATAN+1).getValue()):'',
    reportedClaimedNama:spoofAccepted?String(source.getRange(countAfter,C.NAMA+1).getValue()):'',
    reportedStatus:spoofAccepted?String(source.getRange(countAfter,C.STATUS_REVIEW+1).getValue()):''};
  add('CLIENT_ROLE_AND_NAME_SPOOF_REJECTED',!spoofAccepted &&
      /(identitas|jabatan|nama|akses)/i.test(rejectionReason) &&
      index.getLastRow()===source.getLastRow() &&
      ss.getSheetByName('Index_Laporan_Sync_Queue').getLastRow()===1,
      spoofAccepted?'SECURITY_FINDING: employee token submitted client-supplied Lurah identity':
      ('explicit identity rejection required; response='+rejectionReason.slice(0,180)));

  function requireRejectedClientIdentity_(phase,modifiedName,modifiedRole) {
    var attempt=rc82Package_(Utilities.getUuid().replace(/-/g,''),false);
    attempt.nama=modifiedName; attempt.jabatan=modifiedRole;
    var beforeRows=source.getLastRow(),beforeIndex=index.getLastRow();
    var result=simpanDataKinerja(attempt,tokenOwner);
    var success=source.getLastRow()===beforeRows &&
      index.getLastRow()===beforeIndex &&
      ss.getSheetByName('Index_Laporan_Sync_Queue').getLastRow()===1 &&
      /(identitas|jabatan|nama)/i.test(String(result||''));
    add(phase,success,success?'rejected without source/index/queue writes':
        'SECURITY_FINDING: forged client identity not explicitly rejected');
  }
  requireRejectedClientIdentity_('CLIENT_ROLE_ONLY_SPOOF_REJECTED','Pegawai Sintetis Owner','Lurah');
  requireRejectedClientIdentity_('CLIENT_NAME_ONLY_SPOOF_REJECTED','Lurah Palsu Sintetis','Kasi Pemerintahan');
  return {tests:results,recordId:idLaporan,indexRows:index.getLastRow(),auditActions:actions,
    spoofProbeAccepted:spoofAccepted,sourceRows:source.getLastRow()};
}
function rc82ClearRuntime_(runtime){
  (runtime.tokens||[]).forEach(function(token){try{akhiriSession(token);}catch(e){} });
  (runtime.nonces||[]).forEach(function(key){try{CacheService.getScriptCache().remove(key);}catch(e){} });
  [RC82_STAGE_.OWNER,RC82_STAGE_.OTHER,RC82_STAGE_.ADMIN,RC82_STAGE_.DISABLED].forEach(function(id){
    try{CacheService.getScriptCache().remove(statusSessionPegawaiCacheKey_(id));}catch(e){}
  });
  try{bersihkanCacheDataPegawai_();}catch(e){}
  try { PORTAL_RUNTIME_CACHE_.sessionByToken={};PORTAL_RUNTIME_CACHE_.pegawaiData=null; }catch(e){}
}
function rc82RunAuthenticatedMatrixV1() {
  var ctx=rc82AssertEnv_(),ss=ctx.ss,p=ctx.p,issues=[],actual=null,manifest=null,
      runtime={tokens:[],nonces:[],tests:[],spoofEvidence:null,ownerRevisionEvidence:null},rollback=null;
  if(p.getProperty(RC82_STAGE_.OPT_KEY)!=='true')rc82Fail_('EXPLICIT_OPT_IN_REQUIRED');
  if(p.getProperty(RC82_STAGE_.PENDING_KEY)||rc82Backups_(ss).length){
    p.setProperty(RC82_STAGE_.OPT_KEY,'false');rc82Fail_('RECOVERY_PENDING');
  }
  // Cannot hold ScriptLock around genuine handlers: they acquire their own locks.
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000)){
    p.setProperty(RC82_STAGE_.OPT_KEY,'false');rc82Fail_('SNAPSHOT_LOCK_BUSY');
  }
  try {
    if(ScriptApp.getProjectTriggers().length)rc82Fail_('TRIGGERS_PRESENT');
    var base=rc82Baseline_(ss);
    if(base.issues.length)rc82Fail_('BASELINE_NOT_ACCEPTED:'+base.issues.join(','));
    if(p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED')==='true')rc82Fail_('DUAL_WRITE_ALREADY_ENABLED');
    ['PIN_PEPPER','FOLDER_ID_BUKTI_KINERJA','FOLDER_ID_BUKTI','API_KEY_GEMINI'].forEach(function(key){
      if(p.getProperty(key))rc82Fail_('PREEXISTING_SENSITIVE_PROPERTY:'+key);
    });
    manifest=rc82PrepareBackup_(ss,p);
  } catch(e){issues.push('SETUP:'+String(e&&e.message||e));}
  finally {lock.releaseLock();}
  try {
    if(!manifest)rc82Fail_('NO_SNAPSHOT_NO_MUTATION');
    var creds=rc82InstallSyntheticUsers_(ss,p);
    actual=rc82ExecuteActualHandlers_(ss,creds,runtime);
    creds=null;
  } catch(e2){issues.push('BUSINESS:'+String(e2&&e2.message||e2));}
  finally {
    // Recovery ALWAYS restores staging write permissions to their original values.
    try{rc82ClearRuntime_(runtime);}catch(e3){issues.push('SESSION_CLEANUP:'+String(e3));}
    if(manifest){
      try{rollback=rc82Restore_(ss,p,manifest);}catch(e4){rollback={restored:false,differences:['RESTORE_EXCEPTION:'+String(e4&&e4.message||e4)],backupRetained:true};}
    }
    try{p.setProperty(RC82_STAGE_.OPT_KEY,'false');}catch(e5){issues.push('CANNOT_DISABLE_OPT_IN');}
    try{p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','false');}catch(e6){issues.push('CANNOT_DISABLE_DUAL_WRITE');}
  }
  var post=null;
  try{post=rc82ReadOnlyPreflightV1();}catch(e7){issues.push('POST_PREFLIGHT_ERROR:'+String(e7&&e7.message||e7));}
  if(!rollback||!rollback.restored)issues.push('ROLLBACK_NOT_VERIFIED');
  if(!post||post.status!=='RC82_PREFLIGHT_PASS')issues.push('POST_PREFLIGHT_NOT_ACCEPTED');
  var checks=runtime.tests||[];
  var passed=checks.filter(function(x){return x.passed;}).length;
  var status=issues.length?'RC82_AUTH_BUSINESS_NOT_ACCEPTED':'RC82_AUTH_BUSINESS_PASS_PENDING_EXTERNAL_SNAPSHOT';
  if(issues.some(function(x){return /CLIENT_(ROLE_AND_NAME|ROLE_ONLY|NAME_ONLY)_SPOOF_REJECTED/.test(x)}))status='RC82_SECURITY_NOT_ACCEPTED';
  var out={stage:'PHA-07B B2 RC8.2',version:RC82_STAGE_.VERSION,
    status:status,realHandlers:['cekLogin','validasiSession','simpanDataKinerja',
      'simpanRevisiLaporanDitolakPegawai','prosesReviewAdmin'],
    testsPassed:passed,testsExecuted:checks.length,checks:checks,
    spoofEvidence:runtime.spoofEvidence,
    ownerRevisionEvidence:runtime.ownerRevisionEvidence,
    rollbackRestored:!!(rollback&&rollback.restored),rollbackDifferences:rollback?rollback.differences:[],
    postPreflight:post&&post.status,issues:issues,
    replayEnabled:false,productionPatchInstalled:false,productionReady:false,
    caveat:'Direct authenticated server functions only, not deployed HTTP/PWA/upload end-to-end.'};
  console.log('PHA07B2_RC82_AUTH_MATRIX:\n'+JSON.stringify(out,null,2));return out;
}
/** Separate, explicit recovery after interruption. Do not run blindly or on production. */
function rc82RecoverPendingV1() {
  var ctx=rc82AssertEnv_(),p=ctx.p,raw=p.getProperty(RC82_STAGE_.PENDING_KEY);
  if(!raw){var names=rc82Backups_(ctx.ss).map(function(s){return s.getName();});
    return {status:names.length?'RC82_ORPHAN_BACKUP_NEEDS_MANUAL_REVIEW':'RC82_NOTHING_TO_RECOVER',backups:names};}
  var record;
  try{record=JSON.parse(raw);}catch(e){rc82Fail_('MALFORMED_RECOVERY_RECORD');}
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))rc82Fail_('RECOVERY_LOCK_BUSY');
  var restored=null;
  try{restored=rc82Restore_(ctx.ss,p,record);}
  finally{
    p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','false');
    p.setProperty(RC82_STAGE_.OPT_KEY,'false');lock.releaseLock();
  }
  var out={status:restored.restored?'RC82_MANUAL_RECOVERY_PASS':'RC82_MANUAL_RECOVERY_NOT_ACCEPTED',
    restored:restored.restored,differences:restored.differences,backupRetained:restored.backupRetained,
    productionReady:false};
  console.log('PHA07B2_RC82_RECOVERY:\n'+JSON.stringify(out,null,2));return out;
}