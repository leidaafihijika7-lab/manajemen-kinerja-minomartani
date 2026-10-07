// ============================================================================
// AUDIT & COMPLIANCE EXPLORER v1.0 - BATCH B
// Source Adapters v1.0
// Read-only adapters from Portal authoritative sources to canonical ACE evidence.
// Requires Batch A: ComplianceDomainRegistryV10.gs + CanonicalAuditEvidenceV10.gs
// Target Portal APP_VERSION: 2026.10.05.01
// ============================================================================

var AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_B_VERSION_ = 'ACE-v1.0-BATCH-B-RC1-2026.10.07.01';
var ACE_SOURCE_ADAPTERS_V10_VERSION_ = 'ACE-SA-v1.0-RC1-2026.10.07.01';
var ACE_V10_SOURCE_MAX_SAMPLE_ = 12;

function aceBv10Now_() { return new Date(); }

function aceBv10Text_(value) { return String(value == null ? '' : value).trim(); }
function aceBv10Upper_(value) { return aceBv10Text_(value).toUpperCase(); }
function aceBv10Num_(value) { var n = Number(value); return isFinite(n) ? n : 0; }
function aceBv10Bool_(value) {
  if (value === true || value === false) return value;
  var s = aceBv10Upper_(value); return s === 'TRUE' || s === 'YA' || s === 'YES' || s === '1';
}
function aceBv10Arr_(value) { return Array.isArray(value) ? value : []; }
function aceBv10Obj_(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function aceBv10Unique_(values) {
  var out=[]; (values||[]).forEach(function(v){ var s=aceBv10Text_(v); if(s && out.indexOf(s)===-1) out.push(s); }); return out;
}
function aceBv10SafeJsonParse_(value) {
  if (value && typeof value === 'object') return value;
  var s=aceBv10Text_(value); if(!s) return null;
  try { return JSON.parse(s); } catch(e) { return null; }
}
function aceBv10Iso_(value) {
  try { return aceV10NormalizeTimestamp_(value); } catch(e) { return ''; }
}
function aceBv10Period_(value) {
  try { return aceV10NormalizePeriod_(value); } catch(e) { return ''; }
}
function aceBv10DriveUrls_(value) {
  return aceBv10Text_(value).split(',').map(function(x){return x.trim();}).filter(function(x){return !!x;});
}
function aceBv10ExtractDriveId_(url) {
  var s=aceBv10Text_(url); if(!s) return '';
  var m=s.match(/\/d\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || s.match(/^([A-Za-z0-9_-]{20,})$/);
  return m ? String(m[1]) : '';
}
function aceBv10Route_(domainId) {
  var map={
    AUTH_ACCESS:{menuId:'',pageId:'',title:'Akses & Otorisasi'},
    REPORTING:{menuId:'menuInput',pageId:'halInput',title:'Pelaporan Kinerja'},
    REVIEW:{menuId:'menuReviewCenter',pageId:'halReviewCenter',title:'Pusat Review'},
    DISPOSISI:{menuId:'menuDisposisi',pageId:'halDisposisi',title:'Disposisi'},
    PERIOD_CLOSING:{menuId:'menuMonthlyClosing',pageId:'halMonthlyClosing',title:'Penutupan Bulan'},
    ALLOWANCE:{menuId:'menuTunjangan',pageId:'halTunjangan',title:'Tunjangan'},
    MONTHLY_ARCHIVE:{menuId:'menuMonthlyArchive',pageId:'halMonthlyArchive',title:'Arsip Bulanan'},
    INDEX_INTEGRITY:{menuId:'menuOperationalHealth',pageId:'halOperationalHealth',title:'Kesehatan Sistem'},
    REMINDER_ESCALATION:{menuId:'menuWorkflowReminder',pageId:'halWorkflowReminder',title:'Pengingat Workflow'},
    EXCEPTION_ACTION:{menuId:'menuExceptionActionCenter',pageId:'halExceptionActionCenter',title:'Perlu Tindakan'},
    SYSTEM_HEALTH:{menuId:'menuOperationalHealth',pageId:'halOperationalHealth',title:'Kesehatan Sistem'},
    BACKUP_RECOVERY:{menuId:'menuBackupRecovery',pageId:'halBackupRecovery',title:'Cadangan & Pemulihan'},
    AI_GOVERNANCE:{menuId:'menuRiwayat',pageId:'halRiwayat',title:'Riwayat'},
    MAINTENANCE:{menuId:'menuOperationalHealth',pageId:'halOperationalHealth',title:'Kesehatan Sistem'}
  };
  return map[String(domainId||'').toUpperCase()] || null;
}

function aceBv10Evidence_(cfg) {
  cfg=cfg||{};
  return aceV10BuildEvidenceRef_({
    evidenceClass:cfg.evidenceClass||'E2', sourceName:cfg.sourceName||'UNKNOWN', sourceRecordId:String(cfg.sourceRecordId||'GLOBAL'),
    sourceModule:cfg.sourceModule||'', referenceType:cfg.referenceType||'OBJECT', integrity:cfg.integrity||'VERIFIED',
    payload:cfg.payload==null?{}:cfg.payload, label:cfg.label||'', uri:cfg.uri||'', observedAt:cfg.observedAt||'',
    confidence:cfg.confidence, limitations:cfg.limitations||[]
  });
}

function aceBv10Event_(cfg) {
  cfg=cfg||{};
  return aceV10BuildEvent_({
    eventAt:cfg.eventAt, observedAt:cfg.observedAt||'', domainId:cfg.domainId, actionCode:cfg.actionCode||'INFO',
    actor:cfg.actor||{}, subject:cfg.subject, period:cfg.period||'', stateBefore:cfg.stateBefore, stateAfter:cfg.stateAfter,
    outcome:cfg.outcome||'INFO', detail:cfg.detail, sourcePayload:cfg.sourcePayload,
    source:{evidenceClass:cfg.evidenceClass||'E1',sourceName:cfg.sourceName||'UNKNOWN',sourceRecordId:String(cfg.sourceRecordId||'GLOBAL'),sourceModule:cfg.sourceModule||'',referenceType:cfg.referenceType||'ROW',integrity:cfg.integrity||'VERIFIED',limitations:cfg.limitations||[]},
    evidenceRefs:cfg.evidenceRefs||[], confidence:cfg.confidence, limitations:cfg.limitations||[]
  });
}

function aceBv10Sheet_(ss,name) { return ss && ss.getSheetByName ? ss.getSheetByName(name) : null; }
function aceBv10Values_(ss,name,maxColumns) {
  var sh=aceBv10Sheet_(ss,name); if(!sh) return {exists:false,name:name,rows:[],lastRow:0,lastColumn:0,readColumns:0};
  var lastRow=Number(sh.getLastRow()||0), lastColumn=Number(sh.getLastColumn()||0);
  var requested=Math.max(0,Number(maxColumns||0)), readColumns=requested?Math.min(lastColumn,requested):lastColumn;
  var rows=lastRow>0 && readColumns>0 ? sh.getRange(1,1,lastRow,readColumns).getValues() : [];
  return {exists:true,name:name,rows:rows,lastRow:lastRow,lastColumn:lastColumn,readColumns:readColumns};
}
function aceBv10DataRows_(sheet) { return sheet && sheet.rows ? sheet.rows.slice(1) : []; }

function aceBv10AuditDomain_(actor, action) {
  var a=aceBv10Upper_(action), who=aceBv10Upper_(actor);
  if (a==='LOGIN' || a.indexOf('SESSION')!==-1 || a.indexOf('PIN')!==-1) return 'AUTH_ACCESS';
  if (a==='REVIEW_LAPORAN' || a.indexOf('REVIEW_')===0) return 'REVIEW';
  if (a.indexOf('WORKFLOW_REMINDER')!==-1 || who==='SYSTEM_WRE') return 'REMINDER_ESCALATION';
  if (who==='SYSTEM_BDR' || a.indexOf('BACKUP_')!==-1 || a.indexOf('RECOVERY_')!==-1 || a.indexOf('DR_DRILL')!==-1) return 'BACKUP_RECOVERY';
  if (a.indexOf('3B0_')===0 || who.indexOf('MAINTENANCE:')===0) return 'MAINTENANCE';
  if (a.indexOf('DISPOSISI')!==-1) return 'DISPOSISI';
  if (a.indexOf('LAPORAN')!==-1) return 'REPORTING';
  return 'AUTH_ACCESS';
}
function aceBv10AuditSubject_(domain, actor, action, detail, rowNo) {
  var d=aceBv10SafeJsonParse_(detail), id='AUDIT-'+rowNo, type='USER', label=aceBv10Text_(actor);
  if(domain==='REVIEW') { type='REPORT'; id=aceBv10Text_(detail).split('|')[0].trim() || id; }
  else if(domain==='REMINDER_ESCALATION') { type='PERIOD'; id=d&&d.periode?String(d.periode):id; label=d&&d.ruleId?String(d.ruleId):action; }
  else if(domain==='BACKUP_RECOVERY') { type=(aceBv10Upper_(action).indexOf('DR_DRILL')!==-1?'DR_DRILL':'RECOVERY_POINT'); id=(d&&(d.drillId||d.backupId||d.recoveryPointId))?String(d.drillId||d.backupId||d.recoveryPointId):id; }
  else if(domain==='MAINTENANCE') { type='MAINTENANCE_ACTION'; id=aceBv10Text_(action)+'@'+rowNo; label=action; }
  else if(domain==='DISPOSISI') { type='DISPOSITION'; id=d&&d.idDisposisi?String(d.idDisposisi):id; }
  return {type:type,id:id,label:label};
}

function aceBv10AdaptAuditLog_(ss, observedAt) {
  var sh=aceBv10Values_(ss,'Audit_Log',4), rows=aceBv10DataRows_(sh), events=[], records=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.AUDIT_LOG)?SHEET_COLUMNS.AUDIT_LOG:{WAKTU:0,ID_USER:1,AKSI:2,DETAIL:3};
  rows.forEach(function(r,i){
    r=r||[]; var at=r[C.WAKTU], actor=aceBv10Text_(r[C.ID_USER]), action=aceBv10Text_(r[C.AKSI]), detail=r[C.DETAIL];
    if(!at && !actor && !action && !aceBv10Text_(detail)) return;
    var rowNo=i+2, domain=aceBv10AuditDomain_(actor,action), subject=aceBv10AuditSubject_(domain,actor,action,detail,rowNo), parsed=aceBv10SafeJsonParse_(detail);
    var actorRole=actor.indexOf('SYSTEM_')===0?'SYSTEM':(actor.indexOf('MAINTENANCE:')===0?'MAINTAINER':'');
    var period=parsed&&parsed.periode?aceBv10Period_(parsed.periode):'';
    records.push({row:rowNo,waktu:aceBv10Iso_(at)||aceBv10Text_(at),actor:actor,action:action,detail:detail,parsed:parsed,domainId:domain,period:period});
    var eventAt=aceBv10Iso_(at); if(!eventAt) return;
    try { events.push(aceBv10Event_({eventAt:eventAt,observedAt:observedAt,domainId:domain,actionCode:action||'AUDIT_EVENT',actor:{id:actor,name:actor,role:actorRole},subject:subject,period:period,outcome:action.indexOf('FAILED')!==-1?'FAILED':(action.indexOf('BLOCKED')!==-1?'BLOCKED':'SUCCESS'),detail:detail,sourcePayload:{row:rowNo,actor:actor,action:action,detail:detail},sourceName:'Audit_Log',sourceRecordId:String(rowNo),sourceModule:'Kode.gs',evidenceClass:'E1'})); } catch(e) { records[records.length-1].eventError=String(e&&e.message||e); }
  });
  return {source:'Audit_Log',available:sh.exists,records:records,events:aceV10DedupeEvents_(events),evidenceRefs:aceV10EvidenceRefsFromEvents_(events)};
}

function aceBv10AdaptEmployees_(ss, observedAt) {
  var sh=aceBv10Values_(ss,'Data_Pegawai',11), rows=aceBv10DataRows_(sh), out=[], byId=Object.create(null), duplicateIds=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.DATA_PEGAWAI)?SHEET_COLUMNS.DATA_PEGAWAI:{ID:0,USERNAME:1,NAMA:2,JABATAN:3,AKSES:5,STATUS:7};
  rows.forEach(function(r,i){ r=r||[]; var id=aceBv10Text_(r[C.ID]); if(!id && !aceBv10Text_(r[C.NAMA]) && !aceBv10Text_(r[C.JABATAN])) return; var rec={row:i+2,id:id,username:aceBv10Text_(r[C.USERNAME]),name:aceBv10Text_(r[C.NAMA]),role:aceBv10Text_(r[C.JABATAN]),access:aceBv10Text_(r[C.AKSES]),status:aceBv10Text_(r[C.STATUS])}; if(id){if(byId[id]) duplicateIds.push(id); else byId[id]=rec;} out.push(rec); });
  var ev=aceBv10Evidence_({evidenceClass:'E2',sourceName:'Data_Pegawai',sourceRecordId:'SNAPSHOT',sourceModule:'SheetSchema.gs',payload:{count:out.length,duplicateIds:duplicateIds,records:out},observedAt:observedAt});
  return {source:'Data_Pegawai',available:sh.exists,records:out,byId:byId,duplicateIds:aceBv10Unique_(duplicateIds),evidenceRefs:[ev]};
}

function aceBv10IndexMap_(ss, observedAt) {
  var sh=aceBv10Values_(ss,'Index_Laporan',12), rows=aceBv10DataRows_(sh), out=[], byId=Object.create(null), duplicateIds=[];
  var I=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.INDEX_LAPORAN)?SHEET_COLUMNS.INDEX_LAPORAN:{ID_LAPORAN:0,ROW_REKAP:1,ID_USER:2,TANGGAL_LAPORAN:3,PERIODE_RESMI:4,KATEGORI:5,STATUS_REVIEW:6,POIN_FINAL:7,ID_DISPOSISI:8,NONCE:9,TERAKHIR_DIUBAH:10,INDEX_VERSION:11};
  rows.forEach(function(r,i){r=r||[];var id=aceBv10Text_(r[I.ID_LAPORAN]);if(!id)return;var rec={row:i+2,id:id,rowRekap:aceBv10Num_(r[I.ROW_REKAP]),idUser:aceBv10Text_(r[I.ID_USER]),tanggal:aceBv10Iso_(r[I.TANGGAL_LAPORAN])||aceBv10Text_(r[I.TANGGAL_LAPORAN]),period:aceBv10Period_(r[I.PERIODE_RESMI]),kategori:aceBv10Text_(r[I.KATEGORI]),status:aceBv10Text_(r[I.STATUS_REVIEW]),poinFinal:aceBv10Num_(r[I.POIN_FINAL]),idDisposisi:aceBv10Text_(r[I.ID_DISPOSISI]),nonce:aceBv10Text_(r[I.NONCE]),changedAt:aceBv10Iso_(r[I.TERAKHIR_DIUBAH])||aceBv10Text_(r[I.TERAKHIR_DIUBAH]),version:aceBv10Text_(r[I.INDEX_VERSION])};if(byId[id])duplicateIds.push(id);else byId[id]=rec;out.push(rec);});
  var ev=aceBv10Evidence_({evidenceClass:'E2',sourceName:'Index_Laporan',sourceRecordId:'SNAPSHOT',sourceModule:'SheetSchema.gs',payload:{count:out.length,duplicates:duplicateIds,versionSamples:aceBv10Unique_(out.map(function(x){return x.version;})).slice(0,5)},observedAt:observedAt});
  return {source:'Index_Laporan',available:sh.exists,records:out,byId:byId,duplicateIds:aceBv10Unique_(duplicateIds),evidenceRefs:[ev]};
}

function aceBv10AdaptReports_(ss, employees, indexMap, auditLog, observedAt) {
  var sh=aceBv10Values_(ss,'Rekap_Kinerja',31), rows=aceBv10DataRows_(sh), out=[], byId=Object.create(null), duplicateIds=[], missingIds=[], events=[], evidence=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.REKAP_KINERJA)?SHEET_COLUMNS.REKAP_KINERJA:null;
  if(!C) return {source:'Rekap_Kinerja',available:false,records:[],byId:byId,duplicateIds:[],missingIds:[],events:[],evidenceRefs:[]};
  var auditByReport=Object.create(null), periodResolver=null;
  try { if(typeof buatResolverPeriodeResmiAdminV2A2_==='function') periodResolver=buatResolverPeriodeResmiAdminV2A2_(); } catch(eResolver) { periodResolver=null; }
  aceBv10Arr_(auditLog&&auditLog.records).forEach(function(a){ if(a.domainId!=='REVIEW') return; var id=aceBv10Text_(a.detail).split('|')[0].trim(); if(id){ if(!auditByReport[id])auditByReport[id]=[]; auditByReport[id].push(a); } });
  rows.forEach(function(r,i){
    r=r||[]; var meaningful=false; for(var z=0;z<=Math.min(C.ID_USER,r.length-1);z++){if(r[z]!==''&&r[z]!=null){meaningful=true;break;}} if(!meaningful)return;
    var rowNo=i+2,id=aceBv10Text_(r[C.ID_LAPORAN]),idUser=aceBv10Text_(r[C.ID_USER]),idx=id?indexMap.byId[id]:null;
    if(!id)missingIds.push(rowNo); else if(byId[id])duplicateIds.push(id);
    var payload=aceBv10SafeJsonParse_(r[C.PAYLOAD_JSON]), detailPayload=aceBv10SafeJsonParse_(r[C.PAYLOAD_DETAIL_JSON]);
    var legacy=!!((payload&&payload.legacyBackfill===true)||(detailPayload&&detailPayload.legacyBackfill===true));
    var submittedDate=(r[C.TANGGAL_LAPORAN] instanceof Date)?r[C.TANGGAL_LAPORAN]:null;var sourcePeriod='';try{if(periodResolver&&submittedDate)sourcePeriod=aceBv10Period_(periodResolver(submittedDate));}catch(ePeriod){}var rec={row:rowNo,id:id,idUser:idUser,name:aceBv10Text_(r[C.NAMA]),role:aceBv10Text_(r[C.JABATAN]),kategori:aceBv10Text_(r[C.KATEGORI]),submittedAt:aceBv10Iso_(r[C.TANGGAL_LAPORAN])||aceBv10Text_(r[C.TANGGAL_LAPORAN]),sourcePeriod:sourcePeriod,status:aceBv10Text_(r[C.STATUS_REVIEW]),poinFinal:aceBv10Num_(r[C.POIN_FINAL]),reviewedAt:aceBv10Iso_(r[C.WAKTU_REVIEW_ADMIN])||aceBv10Text_(r[C.WAKTU_REVIEW_ADMIN]),revisionNo:aceBv10Num_(r[C.REVISI_KE]),lastRevisedAt:aceBv10Iso_(r[C.TERAKHIR_DIREVISI_PADA])||aceBv10Text_(r[C.TERAKHIR_DIREVISI_PADA]),lastRevisedBy:aceBv10Text_(r[C.TERAKHIR_DIREVISI_OLEH]),visualUrls:aceBv10DriveUrls_(r[C.VISUAL_URL]),dasarUrl:aceBv10Text_(r[C.DASAR_URL]),dasar:aceBv10Text_(r[C.DASAR_KEGIATAN]),payload:payload,payloadDetail:detailPayload,idDisposisi:aceBv10Text_(r[C.ID_DISPOSISI]),nonce:aceBv10Text_(r[C.NONCE]),legacyBackfill:legacy,index:idx||null,period:idx?idx.period:'',auditReview:auditByReport[id]||[],employee:employees.byId[idUser]||null};
    if(id&&!byId[id])byId[id]=rec; out.push(rec);
    var stateEvidence=aceBv10Evidence_({evidenceClass:legacy?'E6':'E2',sourceName:'Rekap_Kinerja',sourceRecordId:id||String(rowNo),sourceModule:'SheetSchema.gs',referenceType:'ROW',payload:{row:rowNo,id:id,idUser:idUser,status:rec.status,poinFinal:rec.poinFinal,reviewedAt:rec.reviewedAt,revisionNo:rec.revisionNo,lastRevisedAt:rec.lastRevisedAt,lastRevisedBy:rec.lastRevisedBy,idDisposisi:rec.idDisposisi,period:rec.period,legacyBackfill:legacy},observedAt:observedAt,limitations:legacy?['LEGACY_RECONSTRUCTED_SOURCE']:[]});
    evidence.push(stateEvidence);
    rec.visualUrls.forEach(function(u,n){var fid=aceBv10ExtractDriveId_(u);if(fid)evidence.push(aceBv10Evidence_({evidenceClass:'E5',sourceName:'Drive',sourceRecordId:fid,sourceModule:'Rekap_Kinerja',referenceType:'FILE',payload:{reportId:id,kind:'VISUAL',index:n+1},uri:u,observedAt:observedAt,integrity:'PARTIAL'}));});
    if(rec.dasarUrl){var dfid=aceBv10ExtractDriveId_(rec.dasarUrl);if(dfid)evidence.push(aceBv10Evidence_({evidenceClass:'E5',sourceName:'Drive',sourceRecordId:dfid,sourceModule:'Rekap_Kinerja',referenceType:'FILE',payload:{reportId:id,kind:'DASAR'},uri:rec.dasarUrl,observedAt:observedAt,integrity:'PARTIAL'}));}
    (rec.auditReview||[]).forEach(function(a){var ev=(auditLog.events||[]).filter(function(e){return e.source&&e.source.sourceRowOrObjectId===String(a.row);})[0];if(ev)events.push(ev);});
  });
  return {source:'Rekap_Kinerja',available:sh.exists,records:out,byId:byId,duplicateIds:aceBv10Unique_(duplicateIds),missingIds:missingIds,events:aceV10DedupeEvents_(events),evidenceRefs:aceV10DedupeEvidence_(evidence.concat(indexMap.evidenceRefs||[]))};
}


function aceBv10AdaptIndexAuditSnapshot_(ss, observedAt) {
  var sh=aceBv10Values_(ss,'Audit_Index_Laporan',6), rows=sh.rows||[], meta={}, findings=[];
  rows.forEach(function(r,i){r=r||[];var k=aceBv10Text_(r[0]),v=r[1];if(i<13&&k)meta[k]=v;if(i>=14&&aceBv10Text_(r[0]))findings.push({row:i+1,severity:aceBv10Text_(r[0]),code:aceBv10Text_(r[1]),rowRekap:aceBv10Num_(r[2]),message:aceBv10Text_(r[3]),detail:aceBv10Text_(r[4]),status:aceBv10Text_(r[5])});});
  var ref=aceBv10Evidence_({evidenceClass:'E3',sourceName:'Audit_Index_Laporan',sourceRecordId:aceBv10Text_(meta.WAKTU_AUDIT)||'SNAPSHOT',sourceModule:'AuditPeriode.gs',payload:{metadata:meta,findings:findings.slice(0,50),findingCount:findings.length},observedAt:observedAt,limitations:['SNAPSHOT_NOT_LEDGER']});
  return {source:'Audit_Index_Laporan',available:sh.exists,metadata:meta,findings:findings,evidenceRefs:[ref]};
}

function aceBv10AdaptAuditTunjangan_(ss, observedAt) {
  var sh=aceBv10Values_(ss,'Audit_Tunjangan',10), rows=aceBv10DataRows_(sh), records=[],events=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.AUDIT_TUNJANGAN)?SHEET_COLUMNS.AUDIT_TUNJANGAN:{WAKTU:0,ID_USER:1,NAMA_USER:2,AKSI:3,PERIODE:4,TARGET_ID_USER:5,TARGET_NAMA:6,STATUS_LAMA:7,STATUS_BARU:8,DETAIL:9};
  rows.forEach(function(r,i){r=r||[];var action=aceBv10Text_(r[C.AKSI]);if(!action)return;var rowNo=i+2,period=aceBv10Period_(r[C.PERIODE]),at=aceBv10Iso_(r[C.WAKTU]),detail=r[C.DETAIL],parsed=aceBv10SafeJsonParse_(detail);var batchMatch=aceBv10Text_(detail).match(/(?:Batch(?: lama| baru)?|batchId)\s*[:=]\s*([A-Za-z0-9_-]+)/i);var batchId=batchMatch?batchMatch[1]:'';var rec={row:rowNo,waktu:at||aceBv10Text_(r[C.WAKTU]),idUser:aceBv10Text_(r[C.ID_USER]),name:aceBv10Text_(r[C.NAMA_USER]),action:action,period:period,targetIdUser:aceBv10Text_(r[C.TARGET_ID_USER]),targetName:aceBv10Text_(r[C.TARGET_NAMA]),statusBefore:aceBv10Text_(r[C.STATUS_LAMA]),statusAfter:aceBv10Text_(r[C.STATUS_BARU]),detail:detail,parsed:parsed,batchId:batchId};records.push(rec);if(at){try{events.push(aceBv10Event_({eventAt:at,observedAt:observedAt,domainId:'ALLOWANCE',actionCode:action,actor:{id:rec.idUser,name:rec.name,role:''},subject:{type:'ALLOWANCE_BATCH',id:batchId||period||('AUDIT-TUN-'+rowNo),label:period},period:period,stateBefore:rec.statusBefore,stateAfter:rec.statusAfter,outcome:'SUCCESS',detail:detail,sourcePayload:rec,sourceName:'Audit_Tunjangan',sourceRecordId:String(rowNo),sourceModule:'Kode.gs',evidenceClass:'E1'}));}catch(e){rec.eventError=String(e&&e.message||e);}}});
  return {source:'Audit_Tunjangan',available:sh.exists,records:records,events:aceV10DedupeEvents_(events),evidenceRefs:aceV10EvidenceRefsFromEvents_(events)};
}

function aceBv10AdaptAllowance_(ss,auditTunjangan,observedAt) {
  var sh=aceBv10Values_(ss,'Rekap_Tunjangan_Bulanan',34),rows=aceBv10DataRows_(sh),records=[],byPeriod=Object.create(null),residual=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN)?SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN:null;
  if(!C)return {source:'Rekap_Tunjangan_Bulanan',available:false,records:[],byPeriod:byPeriod,residualRows:[],audit:auditTunjangan,evidenceRefs:[]};
  rows.forEach(function(r,i){r=r||[];var business=false,meta=false;for(var a=0;a<=C.CATATAN_BENDAHARA;a++){if(r[a]!==''&&r[a]!=null){business=true;break;}}for(var b=C.DIBUAT_OLEH;b<=C.TANGGAL_CUTOFF;b++){if(r[b]!==''&&r[b]!=null){meta=true;break;}}if(!business&&!meta)return;var rowNo=i+2,period='';try{period=typeof periodeKeyTunjangan_==='function'?periodeKeyTunjangan_(r[C.PERIODE],false):aceBv10Period_(r[C.PERIODE]);}catch(e){period=aceBv10Period_(r[C.PERIODE]);}var rec={row:rowNo,period:period,idUser:aceBv10Text_(r[C.ID_USER]),name:aceBv10Text_(r[C.NAMA]),role:aceBv10Text_(r[C.JABATAN]),group:aceBv10Text_(r[C.KELOMPOK]),poinProd:aceBv10Num_(r[C.POIN_PROD]),poinTu:aceBv10Num_(r[C.POIN_TU]),persenProd:aceBv10Num_(r[C.PERSEN_PROD]),persenTu:aceBv10Num_(r[C.PERSEN_TU]),maxProd:aceBv10Num_(r[C.MAX_PROD]),maxTu:aceBv10Num_(r[C.MAX_TU]),rpProd:aceBv10Num_(r[C.RP_PROD]),rpTu:aceBv10Num_(r[C.RP_TU]),rpTotal:aceBv10Num_(r[C.RP_TOTAL]),status:aceBv10Text_(r[C.STATUS_REKAP]),dibuatOleh:aceBv10Text_(r[C.DIBUAT_OLEH]),dibuatPada:aceBv10Iso_(r[C.DIBUAT_PADA])||aceBv10Text_(r[C.DIBUAT_PADA]),dikunciPada:aceBv10Iso_(r[C.DIKUNCI_PADA])||aceBv10Text_(r[C.DIKUNCI_PADA]),diajukanPada:aceBv10Iso_(r[C.DIAJUKAN_PADA])||aceBv10Text_(r[C.DIAJUKAN_PADA]),disetujuiPada:aceBv10Iso_(r[C.DISETUJUI_PADA])||aceBv10Text_(r[C.DISETUJUI_PADA]),dikembalikanPada:aceBv10Iso_(r[C.DIKEMBALIKAN_PADA])||aceBv10Text_(r[C.DIKEMBALIKAN_PADA]),diteruskanPada:aceBv10Iso_(r[C.DITERUSKAN_BENDAHARA_PADA])||aceBv10Text_(r[C.DITERUSKAN_BENDAHARA_PADA]),dicairkanPada:aceBv10Iso_(r[C.DICAIRKAN_PADA])||aceBv10Text_(r[C.DICAIRKAN_PADA]),nomorBukti:aceBv10Text_(r[C.NOMOR_BUKTI_CAIR]),batchId:aceBv10Text_(r[C.BATCH_ID]),active:typeof nilaiAktifEksplisitTunjangan_==='function'?nilaiAktifEksplisitTunjangan_(r[C.IS_ACTIVE]):aceBv10Bool_(r[C.IS_ACTIVE]),label:aceBv10Text_(r[C.LABEL_PEMBAYARAN]),start:aceBv10Iso_(r[C.TANGGAL_MULAI_PERIODE])||aceBv10Text_(r[C.TANGGAL_MULAI_PERIODE]),end:aceBv10Iso_(r[C.TANGGAL_AKHIR_PERIODE])||aceBv10Text_(r[C.TANGGAL_AKHIR_PERIODE]),cutoff:aceBv10Iso_(r[C.TANGGAL_CUTOFF])||aceBv10Text_(r[C.TANGGAL_CUTOFF]),business:business,metadata:meta};records.push(rec);if(!business&&meta)residual.push(rec);if(business&&period&&rec.active){if(!byPeriod[period])byPeriod[period]=[];byPeriod[period].push(rec);}});
  var evidence=[];Object.keys(byPeriod).forEach(function(p){var rs=byPeriod[p],first=rs[0]||{};evidence.push(aceBv10Evidence_({evidenceClass:'E2',sourceName:'Rekap_Tunjangan_Bulanan',sourceRecordId:first.batchId||p,sourceModule:'SheetSchema.gs',payload:{period:p,batchId:first.batchId,status:first.status,count:rs.length,rows:rs.map(function(x){return {row:x.row,idUser:x.idUser,rpTotal:x.rpTotal,active:x.active};})},observedAt:observedAt}));});
  return {source:'Rekap_Tunjangan_Bulanan',available:sh.exists,records:records,byPeriod:byPeriod,residualRows:residual,audit:auditTunjangan,evidenceRefs:aceV10DedupeEvidence_(evidence.concat(auditTunjangan.evidenceRefs||[]))};
}

function aceBv10AdaptDisposisi_(ss, reports, observedAt) {
  var surat=aceBv10Values_(ss,'Disposisi_Surat',25), penerima=aceBv10Values_(ss,'Disposisi_Penerima',12), log=aceBv10Values_(ss,'Disposisi_Log',14), petugas=aceBv10Values_(ss,'Disposisi_Petugas',12);
  var DS=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.DISPOSISI_SURAT)?SHEET_COLUMNS.DISPOSISI_SURAT:null;
  var DP=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.DISPOSISI_PENERIMA)?SHEET_COLUMNS.DISPOSISI_PENERIMA:null;
  var DL=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.DISPOSISI_LOG)?SHEET_COLUMNS.DISPOSISI_LOG:null;
  var byId=Object.create(null),recipients=[],logs=[],events=[],evidence=[];
  if(DS)aceBv10DataRows_(surat).forEach(function(r,i){r=r||[];var id=aceBv10Text_(r[DS.ID_DISPOSISI]);if(!id)return;var rec={row:i+2,id:id,number:aceBv10Text_(r[DS.NOMOR_DISPOSISI]),date:aceBv10Iso_(r[DS.TANGGAL_DISPOSISI])||aceBv10Text_(r[DS.TANGGAL_DISPOSISI]),type:aceBv10Text_(r[DS.JENIS_DISPOSISI]),subject:aceBv10Text_(r[DS.PERIHAL]),giverId:aceBv10Text_(r[DS.PEMBERI_ID]),giverName:aceBv10Text_(r[DS.PEMBERI_NAMA]),giverRole:aceBv10Text_(r[DS.PEMBERI_JABATAN]),attachmentUrl:aceBv10Text_(r[DS.LAMPIRAN_URL]),status:aceBv10Text_(r[DS.STATUS_DISPOSISI]),source:aceBv10Text_(r[DS.SUMBER_DISPOSISI]),inputById:aceBv10Text_(r[DS.DIINPUT_OLEH_ID]),inputByName:aceBv10Text_(r[DS.DIINPUT_OLEH_NAMA]),inputByRole:aceBv10Text_(r[DS.DIINPUT_OLEH_JABATAN]),modeInput:aceBv10Text_(r[DS.MODE_INPUT]),createdAt:aceBv10Iso_(r[DS.DIBUAT_PADA])||aceBv10Text_(r[DS.DIBUAT_PADA])};byId[id]=rec;evidence.push(aceBv10Evidence_({evidenceClass:'E2',sourceName:'Disposisi_Surat',sourceRecordId:id,sourceModule:'SheetSchema.gs',payload:rec,observedAt:observedAt}));if(rec.attachmentUrl){var fid=aceBv10ExtractDriveId_(rec.attachmentUrl);if(fid)evidence.push(aceBv10Evidence_({evidenceClass:'E5',sourceName:'Drive',sourceRecordId:fid,sourceModule:'Disposisi_Surat',referenceType:'FILE',payload:{idDisposisi:id},uri:rec.attachmentUrl,observedAt:observedAt,integrity:'PARTIAL'}));}});
  if(DP)aceBv10DataRows_(penerima).forEach(function(r,i){r=r||[];var id=aceBv10Text_(r[DP.ID_DISPOSISI]);if(!id)return;recipients.push({row:i+2,idDisposisi:id,idUser:aceBv10Text_(r[DP.ID_PENERIMA]),name:aceBv10Text_(r[DP.NAMA_PENERIMA]),role:aceBv10Text_(r[DP.JABATAN_PENERIMA]),mode:aceBv10Text_(r[DP.MODE_PENERIMA]),readStatus:aceBv10Text_(r[DP.STATUS_BACA]),followStatus:aceBv10Text_(r[DP.STATUS_TINDAK_LANJUT]),reportId:aceBv10Text_(r[DP.ID_LAPORAN_TERKAIT]),reportAt:aceBv10Iso_(r[DP.WAKTU_LAPOR])||aceBv10Text_(r[DP.WAKTU_LAPOR])});});
  if(DL)aceBv10DataRows_(log).forEach(function(r,i){r=r||[];var action=aceBv10Text_(r[DL.AKSI]);if(!action)return;var rowNo=i+2,rec={row:rowNo,waktu:aceBv10Iso_(r[DL.WAKTU])||aceBv10Text_(r[DL.WAKTU]),idDisposisi:aceBv10Text_(r[DL.ID_DISPOSISI]),action:action,actorId:aceBv10Text_(r[DL.OLEH_ID]),actorName:aceBv10Text_(r[DL.OLEH_NAMA]),actorRole:aceBv10Text_(r[DL.OLEH_JABATAN]),detail:r[DL.DETAIL],logId:aceBv10Text_(r[DL.ID_LOG]),actorMode:aceBv10Text_(r[DL.AKTOR_PERAN]),targetType:aceBv10Text_(r[DL.TARGET_TIPE]),targetId:aceBv10Text_(r[DL.TARGET_ID]),targetName:aceBv10Text_(r[DL.TARGET_NAMA]),reason:aceBv10Text_(r[DL.ALASAN]),detailJson:aceBv10SafeJsonParse_(r[DL.DETAIL_JSON])};logs.push(rec);if(rec.waktu){try{events.push(aceBv10Event_({eventAt:rec.waktu,observedAt:observedAt,domainId:'DISPOSISI',actionCode:action,actor:{id:rec.actorId,name:rec.actorName,role:rec.actorRole},subject:{type:'DISPOSITION',id:rec.idDisposisi||rec.logId||('DSPLOG-'+rowNo),label:rec.idDisposisi},outcome:'SUCCESS',detail:rec.detailJson||rec.detail,sourcePayload:rec,sourceName:'Disposisi_Log',sourceRecordId:rec.logId||String(rowNo),sourceModule:'SheetSchema.gs',evidenceClass:'E1'}));}catch(e){rec.eventError=String(e&&e.message||e);}}});
  return {source:'DISPOSISI',available:surat.exists&&penerima.exists&&log.exists,records:Object.keys(byId).map(function(k){return byId[k];}),byId:byId,recipients:recipients,logs:logs,petugasRows:aceBv10DataRows_(petugas),events:aceV10DedupeEvents_(events),evidenceRefs:aceV10DedupeEvidence_(evidence.concat(aceV10EvidenceRefsFromEvents_(events))),reportsById:reports.byId||{}};
}

function aceBv10AdaptAi_(ss,reports,observedAt) {
  var sh=aceBv10Values_(ss,'AI_Logs',8),rows=aceBv10DataRows_(sh),records=[],evidence=[];
  var C=(typeof SHEET_COLUMNS!=='undefined'&&SHEET_COLUMNS.AI_LOGS)?SHEET_COLUMNS.AI_LOGS:{WAKTU:0,ID_LAPORAN:1,PROMPT:2,RESPONS:3,POIN:4,STATUS:5,INDEX_REKAP:6,MODEL:7};
  rows.forEach(function(r,i){r=r||[];if(!aceBv10Text_(r[C.ID_LAPORAN])&&!aceBv10Text_(r[C.MODEL])&&!aceBv10Text_(r[C.PROMPT]))return;var promptSafe=aceBv10SanitizeValue_(r[C.PROMPT]),responseSafe=aceBv10SanitizeValue_(r[C.RESPONS]);var rec={row:i+2,waktu:aceBv10Iso_(r[C.WAKTU])||aceBv10Text_(r[C.WAKTU]),reportId:aceBv10Text_(r[C.ID_LAPORAN]),promptHash:aceV10HashValue_(promptSafe),responseHash:aceV10HashValue_(responseSafe),promptLength:aceBv10Text_(promptSafe).length,responseLength:aceBv10Text_(responseSafe).length,poin:aceBv10Num_(r[C.POIN]),status:aceBv10Text_(r[C.STATUS]),indexRekap:aceBv10Num_(r[C.INDEX_REKAP]),model:aceBv10Text_(r[C.MODEL])};rec.report=reports.byId[rec.reportId]||null;records.push(rec);evidence.push(aceBv10Evidence_({evidenceClass:'E2',sourceName:'AI_Logs',sourceRecordId:String(rec.row),sourceModule:'SheetSchema.gs',payload:rec,observedAt:observedAt}));});
  return {source:'AI_Logs',available:sh.exists,records:records,evidenceRefs:evidence};
}
function aceBv10SanitizeValue_(v){try{return aceV10SanitizeValue_(v,'',0);}catch(e){return '';}}

function aceBv10AdaptRuntimeDerived_(ss, period, observedAt, now) {
  var out={period:period,closing:null,archive:null,wre:null,eac:null,ohic:null,bdr:null,governance:null,evidenceRefs:[],errors:[]};
  function capture_(key,fn,evidenceClass,sourceName,moduleName){try{var value=fn();out[key]=value;out.evidenceRefs.push(aceBv10Evidence_({evidenceClass:evidenceClass,sourceName:sourceName,sourceRecordId:period||'GLOBAL',sourceModule:moduleName,payload:value,observedAt:observedAt}));}catch(e){out.errors.push({source:key,error:String(e&&e.message||e)});out[key]=null;}}
  if(typeof bangunMonthlyClosingV10_==='function')capture_('closing',function(){return bangunMonthlyClosingV10_(period);},'E2','MONTHLY_CLOSING','MonthlyClosingV10.gs');
  if(typeof bangunMonthlyArchiveV10_==='function')capture_('archive',function(){return bangunMonthlyArchiveV10_(period);},'E3','MONTHLY_ARCHIVE','MonthlyArchiveV10.gs');
  if(typeof bangunWorkflowReminderEscalationV10_==='function'){capture_('wre',function(){return bangunWorkflowReminderEscalationV10_(now);},'E4','WRE_SNAPSHOT','WorkflowReminderEscalationV10.gs');if(out.wre){out.wre.rules=typeof WRE_V10_RULES_!=='undefined'?aceBv10SanitizeValue_(WRE_V10_RULES_):{};out.wre.auditCooldownHours=typeof WRE_V10_AUDIT_COOLDOWN_HOURS_!=='undefined'?Number(WRE_V10_AUDIT_COOLDOWN_HOURS_):null;}}
  try {
    if(typeof EAC_V10_ACTION_REGISTRY_!=='undefined'&&typeof EAC_V10_ROUTE_MAP_!=='undefined'){
      out.eac={version:typeof EXCEPTION_ACTION_CENTER_V10_VERSION_!=='undefined'?String(EXCEPTION_ACTION_CENTER_V10_VERSION_):'',actionRegistry:aceBv10SanitizeValue_(EAC_V10_ACTION_REGISTRY_),routeMap:aceBv10SanitizeValue_(EAC_V10_ROUTE_MAP_),priorityMap:typeof EAC_V10_PRIORITY_!=='undefined'?aceBv10SanitizeValue_(EAC_V10_PRIORITY_):{},policy:{readOnly:true,sourceOwnedCompletion:true}};
      out.evidenceRefs.push(aceBv10Evidence_({evidenceClass:'E4',sourceName:'EAC_REGISTRY',sourceRecordId:'REGISTRY',sourceModule:'ExceptionActionCenterV10.gs',payload:out.eac,observedAt:observedAt}));
    }
  } catch(eEac){out.errors.push({source:'eac',error:String(eEac&&eEac.message||eEac)});}
  try {
    if(typeof ohicGovernanceCheckV10_==='function'){
      var reportDiag=typeof ohicReportDiagnosticsV10_==='function'?ohicReportDiagnosticsV10_(ss):null;
      var checks=[]; checks.push(ohicGovernanceCheckV10_()); if(typeof ohicRequiredSheetsCheckV10_==='function')checks.push(ohicRequiredSheetsCheckV10_(ss)); if(typeof ohicEmployeeCheckV10_==='function')checks.push(ohicEmployeeCheckV10_(ss)); if(typeof ohicTariffCheckV10_==='function')checks.push(ohicTariffCheckV10_(ss)); if(reportDiag&&reportDiag.check)checks.push(reportDiag.check); if(typeof ohicReviewQueueCheckV10_==='function'&&reportDiag)checks.push(ohicReviewQueueCheckV10_(reportDiag)); if(typeof ohicIndexCheckV10_==='function'&&reportDiag)checks.push(ohicIndexCheckV10_(ss,reportDiag)); if(typeof ohicPeriodCheckV10_==='function')checks.push(ohicPeriodCheckV10_()); if(typeof ohicAllowanceCheckV10_==='function')checks.push(ohicAllowanceCheckV10_(ss)); if(typeof ohicBackupRecoveryCheckV10_==='function')checks.push(ohicBackupRecoveryCheckV10_());
      out.ohic={version:typeof OPERATIONAL_HEALTH_V10_VERSION_!=='undefined'?String(OPERATIONAL_HEALTH_V10_VERSION_):'',checks:checks};out.evidenceRefs.push(aceBv10Evidence_({evidenceClass:'E4',sourceName:'OHIC_SNAPSHOT',sourceRecordId:'CURRENT',sourceModule:'OperationalHealthV10.gs',payload:out.ohic,observedAt:observedAt}));
    }
  }catch(eOhic){out.errors.push({source:'ohic',error:String(eOhic&&eOhic.message||eOhic)});}
  if(typeof bdrV10BuildHealthSnapshot_==='function'){capture_('bdr',function(){return bdrV10BuildHealthSnapshot_();},'E3','BDR_HEALTH','BackupDisasterRecoveryV10.gs');if(out.bdr&&out.bdr.evidence){out.evidenceRefs.push(aceBv10Evidence_({evidenceClass:'E5',sourceName:'BDR_EVIDENCE_INVENTORY',sourceRecordId:String(out.bdr.latestVerified&&out.bdr.latestVerified.backupId||period||'CURRENT'),sourceModule:'BackupDisasterRecoveryV10.gs',payload:out.bdr.evidence,observedAt:observedAt,integrity:String(out.bdr.evidence.status||'UNAVAILABLE').toUpperCase()==='PARTIAL'?'PARTIAL':(out.bdr.evidence.unavailable?'UNAVAILABLE':'VERIFIED')}));}}
  try {
    var binding=null,guard=null;
    if(typeof bangunSnapshotKontrakAktif3B1B2_==='function')binding=bangunSnapshotKontrakAktif3B1B2_();
    if(typeof evaluasiGuardPraDeploy3B1B3_==='function')guard=evaluasiGuardPraDeploy3B1B3_([]);
    out.governance={binding:binding,guard:guard,maintainerGateAvailable:typeof pastikanMaintainerPortal3B0_==='function',sessionValidatorAvailable:typeof validasiSession==='function',accessGateAvailable:typeof cekHakAksesLurahCarikAdmin_==='function'};
    out.evidenceRefs.push(aceBv10Evidence_({evidenceClass:'E3',sourceName:'PORTAL_GOVERNANCE',sourceRecordId:'CURRENT',sourceModule:'BindingAktif3B1B2.gs',payload:out.governance,observedAt:observedAt}));
  }catch(eGov){out.errors.push({source:'governance',error:String(eGov&&eGov.message||eGov)});}
  return out;
}

function aceBv10ResolvePeriod_(request,now) {
  var p=aceBv10Period_(request&&request.period||request&&request.periode||''); if(p)return p;
  try { if(typeof mcV10DefaultPeriode_==='function'){p=aceBv10Period_(mcV10DefaultPeriode_());if(p)return p;} } catch(e){}
  try { if(typeof periodeKinerjaAktifUntukLaporanWajibV34_==='function'){p=aceBv10Period_(periodeKinerjaAktifUntukLaporanWajibV34_(now));if(p)return p;} } catch(e2){}
  return Utilities && Utilities.formatDate ? Utilities.formatDate(now,'GMT+7','yyyy-MM') : '';
}

function aceBv10BuildSourceBundle_(request) {
  request=request||{}; var started=Date.now(), now=request.now instanceof Date?request.now:aceBv10Now_(), observedAt=now.toISOString(), ss=getSS_(), period=aceBv10ResolvePeriod_(request,now);
  var employees=aceBv10AdaptEmployees_(ss,observedAt), indexMap=aceBv10IndexMap_(ss,observedAt), indexAudit=aceBv10AdaptIndexAuditSnapshot_(ss,observedAt), auditLog=aceBv10AdaptAuditLog_(ss,observedAt), reports=aceBv10AdaptReports_(ss,employees,indexMap,auditLog,observedAt), auditTunjangan=aceBv10AdaptAuditTunjangan_(ss,observedAt), allowance=aceBv10AdaptAllowance_(ss,auditTunjangan,observedAt), disposisi=aceBv10AdaptDisposisi_(ss,reports,observedAt), ai=aceBv10AdaptAi_(ss,reports,observedAt), runtime=aceBv10AdaptRuntimeDerived_(ss,period,observedAt,now);
  var events=[];[auditLog.events,reports.events,auditTunjangan.events,disposisi.events].forEach(function(a){events=events.concat(a||[]);});
  var evidence=[];[employees.evidenceRefs,indexMap.evidenceRefs,indexAudit.evidenceRefs,auditLog.evidenceRefs,reports.evidenceRefs,auditTunjangan.evidenceRefs,allowance.evidenceRefs,disposisi.evidenceRefs,ai.evidenceRefs,runtime.evidenceRefs].forEach(function(a){evidence=evidence.concat(a||[]);});
  return {version:ACE_SOURCE_ADAPTERS_V10_VERSION_,batchVersion:AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_B_VERSION_,appVersion:String(typeof APP_VERSION!=='undefined'?APP_VERSION:''),period:period,generatedAt:observedAt,serverMs:Date.now()-started,employees:employees,index:indexMap,indexAudit:indexAudit,auditLog:auditLog,reports:reports,auditTunjangan:auditTunjangan,allowance:allowance,disposisi:disposisi,ai:ai,runtime:runtime,events:aceV10SortEvents_(events,'DESC'),evidenceRefs:aceV10DedupeEvidence_(evidence),policy:{readOnly:true,businessWrites:false,newSheets:false,propertiesWrites:false,driveWrites:false}};
}

function aceBv10ValidateSourceAdapterSafety_() {
  var fns=[aceBv10BuildSourceBundle_,aceBv10AdaptAuditLog_,aceBv10AdaptEmployees_,aceBv10IndexMap_,aceBv10AdaptIndexAuditSnapshot_,aceBv10AdaptReports_,aceBv10AdaptAuditTunjangan_,aceBv10AdaptAllowance_,aceBv10AdaptDisposisi_,aceBv10AdaptAi_,aceBv10AdaptRuntimeDerived_];
  var src=fns.map(function(f){return String(f);}).join('\n');
  var forbidden=['setValue(','setValues(','appendRow(','clearContent(','deleteRow(','deleteRows(','insertSheet(','deleteSheet(','createFile(','createFolder(','setProperty(','deleteProperty(','newTrigger(','deleteTrigger('];
  var hits=forbidden.filter(function(x){return src.indexOf(x)!==-1;}); return {ok:hits.length===0,hits:hits};
}

function validasiAuditComplianceSourceAdaptersV10() {
  var checks=[]; function add(n,ok,d){checks.push({nama:n,lulus:ok===true,detail:String(d==null?'':d)});} var safety=aceBv10ValidateSourceAdapterSafety_();
  add('VERSION',ACE_SOURCE_ADAPTERS_V10_VERSION_==='ACE-SA-v1.0-RC1-2026.10.07.01',ACE_SOURCE_ADAPTERS_V10_VERSION_);
  add('BATCH_VERSION',AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_B_VERSION_==='ACE-v1.0-BATCH-B-RC1-2026.10.07.01',AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_B_VERSION_);
  add('BATCH_A_REGISTRY',typeof aceV10Registry_==='function',typeof aceV10Registry_);
  add('BATCH_A_EVENT',typeof aceV10BuildEvent_==='function',typeof aceV10BuildEvent_);
  add('BATCH_A_EVIDENCE',typeof aceV10BuildEvidenceRef_==='function',typeof aceV10BuildEvidenceRef_);
  add('READ_ONLY_STATIC',safety.ok,safety.hits.join(','));
  add('BOUNDED_COLUMN_READ_HELPER',String(aceBv10Values_).indexOf('maxColumns')!==-1&&String(aceBv10Values_).indexOf('readColumns')!==-1,'per-source bounded columns');
  add('DRIVE_ID_PATH',aceBv10ExtractDriveId_('https://drive.google.com/file/d/1abcdefghijklmnopqrstuv/view')==='1abcdefghijklmnopqrstuv',aceBv10ExtractDriveId_('https://drive.google.com/file/d/1abcdefghijklmnopqrstuv/view'));
  add('DRIVE_ID_QUERY',aceBv10ExtractDriveId_('https://drive.google.com/open?id=1abcdefghijklmnopqrstuv')==='1abcdefghijklmnopqrstuv',aceBv10ExtractDriveId_('https://drive.google.com/open?id=1abcdefghijklmnopqrstuv'));
  add('AUDIT_DOMAIN_LOGIN',aceBv10AuditDomain_('U','LOGIN')==='AUTH_ACCESS',aceBv10AuditDomain_('U','LOGIN'));
  add('AUDIT_DOMAIN_REVIEW',aceBv10AuditDomain_('U','REVIEW_LAPORAN')==='REVIEW',aceBv10AuditDomain_('U','REVIEW_LAPORAN'));
  add('AUDIT_DOMAIN_WRE',aceBv10AuditDomain_('SYSTEM_WRE','WORKFLOW_REMINDER_RAISED')==='REMINDER_ESCALATION',aceBv10AuditDomain_('SYSTEM_WRE','WORKFLOW_REMINDER_RAISED'));
  add('AUDIT_DOMAIN_BDR',aceBv10AuditDomain_('SYSTEM_BDR','BACKUP_VERIFIED')==='BACKUP_RECOVERY',aceBv10AuditDomain_('SYSTEM_BDR','BACKUP_VERIFIED'));
  add('AUDIT_DOMAIN_MAINT',aceBv10AuditDomain_('MAINTENANCE:x@y.id','3B0_SUCCESS_X')==='MAINTENANCE',aceBv10AuditDomain_('MAINTENANCE:x@y.id','3B0_SUCCESS_X'));
  add('ROUTE_REVIEW',aceBv10Route_('REVIEW').pageId==='halReviewCenter',JSON.stringify(aceBv10Route_('REVIEW')));
  add('ROUTE_BDR',aceBv10Route_('BACKUP_RECOVERY').pageId==='halBackupRecovery',JSON.stringify(aceBv10Route_('BACKUP_RECOVERY')));
  var failed=checks.filter(function(x){return !x.lulus;}); var out={sukses:failed.length===0,valid:failed.length===0,versi:ACE_SOURCE_ADAPTERS_V10_VERSION_,batchVersion:AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_B_VERSION_,jumlah:checks.length,lulus:checks.length-failed.length,gagal:failed.length,checks:checks,readOnly:true,dataBisnisDiubah:false}; try{Logger.log(JSON.stringify(out,null,2));}catch(e){} return out;
}
