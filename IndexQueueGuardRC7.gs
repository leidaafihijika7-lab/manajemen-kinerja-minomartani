/**
 * PHA-07B B2 RC7 -- production patch candidate. NOT DEPLOYED.
 * Requires a reviewed bridge in Kode.gs, and existing SheetSchema.gs helpers.
 * NO trigger, no onOpen/doGet, no automatic enablement and no property writes to enable.
 * Queue replay is OFF unless BOTH the existing dual-write flag and the new
 * INDEX_LAPORAN_RC7_REPLAY_ENABLED property are explicitly 'true'.
 * Original source Rekap_Kinerja stays authoritative; this file never edits it.
 * All queue and index writes occur while owning ONE ScriptLock.
 */
var INDEX_QUEUE_RC7_ = {
  VERSION: 'PHA07B2-RC7-CANDIDATE-2026.10.11',
  REPLAY_PROPERTY: 'INDEX_LAPORAN_RC7_REPLAY_ENABLED',
  CONTEXT_PREFIX: 'RC7V1:',
  MAX_ATTEMPTS: 5,
  MAX_SCAN_ROWS: 10000,
  MAX_BATCH: 25,
  MAX_CONTEXT_LENGTH: 3000,
  ALLOWED_OPERATIONS: ['ROW', 'BY_ID', 'BY_NONCE'],
  ALLOWED_ACTIONS: ['SUBMIT_LAPORAN', 'REVISI_PEGAWAI', 'REVIEW_ADMIN_FINAL',
    'KOREKSI_STATUS_CUTOFF_LAMA', 'KOREKSI_POIN_CUTOFF_LAMA']
};
function rc7Text_(v) { return v == null ? '' : String(v).trim(); }
function rc7Id_(v) { return normalizeId_(v); }
function rc7Number_(v) {
  if (typeof v === 'string' && !/^(0|[1-9][0-9]*)$/.test(v)) return NaN;
  var n = Number(v);
  return isFinite(n) && Math.floor(n) === n && n >= 0 ? n : NaN;
}
function rc7Canonical_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? 'BAD_DATE' : v.toISOString();
  return v == null ? '' : String(v);
}
function rc7Stamp_(row) {
  // Identity + revision/review payload relevant to an index refresh.
  var selected = [0, 3, 6, 8, 9, 17, 18, 19, 20, 21, 22, 23, 26];
  var parts = selected.map(function (n) { return rc7Canonical_(row[n]); });
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(parts), Utilities.Charset.UTF_8);
  return bytes.map(function(b) { var s = ((b + 256) % 256).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
}
function rc7Triple_(row) {
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  return {idLaporan:rc7Id_(row[C.ID_LAPORAN]),idUser:rc7Id_(row[C.ID_USER]),
    nonce:rc7Text_(row[C.NONCE])};
}
function rc7Complete_(t) {
  return !!(t && rc7Text_(t.idLaporan) && rc7Text_(t.idUser) && rc7Text_(t.nonce));
}
function rc7Equal_(a,b) {
  return !!(a && b && a.idLaporan === b.idLaporan &&
    a.idUser === b.idUser && a.nonce === b.nonce);
}
function rc7Source_(ss, rowNumber) {
  var sh = ss.getSheetByName('Rekap_Kinerja'), C = SHEET_COLUMNS.REKAP_KINERJA;
  if (!sh) throw new Error('RC7_SOURCE_MISSING');
  if (!Number.isSafeInteger(rowNumber) || rowNumber < 2 || rowNumber > sh.getLastRow())
    throw new Error('RC7_SOURCE_ROW_INVALID');
  var width = Math.max(sh.getLastColumn(), C.ID_DISPOSISI + 1);
  var row = sh.getRange(rowNumber,1,1,width).getValues()[0];
  var triple = rc7Triple_(row);
  if (!rc7Complete_(triple)) throw new Error('RC7_SOURCE_TRIPLE_INCOMPLETE');
  return {rowRekap:rowNumber,row:row,triple:triple,stamp:rc7Stamp_(row)};
}
function rc7QueueSheet_(ss) {
  var sh = ss.getSheetByName(INDEX_LAPORAN_2B1_CONFIG.QUEUE_SHEET_NAME);
  if (!sh) throw new Error('RC7_QUEUE_SHEET_MISSING_MANUAL_REVIEW');
  var expected = INDEX_LAPORAN_2B1_CONFIG.QUEUE_HEADERS;
  var actual = sh.getRange(1,1,1,expected.length).getValues()[0];
  if (expected.some(function(s,i){return rc7Text_(actual[i]) !== s;}))
    throw new Error('RC7_QUEUE_HEADER_MISMATCH');
  return sh;
}
function rc7IndexSheet_(ss) {
  var sh = ss.getSheetByName(INDEX_LAPORAN_2B0_CONFIG.SHEET_NAME);
  pastikanHeaderIndexLaporan2B1_(sh);
  return sh;
}
function rc7WithinBounds_(sh) {
  if (sh.getLastRow() > INDEX_QUEUE_RC7_.MAX_SCAN_ROWS + 1)
    throw new Error('RC7_SCAN_CAP_REACHED_REVIEW_REQUIRED');
}
function rc7ReadEnvelope_(context) {
  var prefix = INDEX_QUEUE_RC7_.CONTEXT_PREFIX, s = rc7Text_(context);
  if (s.length > INDEX_QUEUE_RC7_.MAX_CONTEXT_LENGTH || s.slice(0,prefix.length) !== prefix)
    return null;
  try {
    var p = JSON.parse(s.slice(prefix.length));
    var cr=rc7Number_(p && p.commitRow);
    if (!p || p.schema !== 1 || !/^RC7-[0-9a-f-]{12,}$/i.test(p.eventId || '') ||
       INDEX_QUEUE_RC7_.ALLOWED_ACTIONS.indexOf(p.action) < 0 ||
       !Number.isSafeInteger(cr) || cr < 2 ||
       !/^[0-9a-f]{64}$/i.test(p.stamp || '') || p.trusted !== true) return null;
    return p;
  } catch (e) { return null; }
}
function rc7QueueIdentity_(r) {
  return {idLaporan:rc7Id_(r[4]),idUser:rc7Id_(r[5]),nonce:rc7Text_(r[6])};
}
function rc7WriteQueueStatus_(sh, row, attempts, status, reason) {
  sh.getRange(row,9,1,4).setValues([[attempts,status,String(reason || '').slice(0,450),new Date()]]);
}
function rc7Acquire_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(INDEX_LAPORAN_2B1_CONFIG.LOCK_WAIT_MS))
    throw new Error('RC7_SCRIPTLOCK_BUSY');
  return lock;
}
function rc7SourceUnique_(ss, target) {
  var sh = ss.getSheetByName('Rekap_Kinerja');
  rc7WithinBounds_(sh);
  var C = SHEET_COLUMNS.REKAP_KINERJA, len = sh.getLastRow()-1;
  if (len < 1) throw new Error('RC7_SOURCE_EMPTY');
  // One bounded batch read; never issue O(N) per-row SpreadsheetApp requests.
  var vals = sh.getRange(2,C.ID_LAPORAN+1,len,C.NONCE-C.ID_LAPORAN+1).getValues();
  var ids = {}, nonceKeys = {}, count = 0, identities=[];
  for (var i=0;i<vals.length;i++) {
    var triple={idLaporan:rc7Id_(vals[i][0]),
      idUser:rc7Id_(vals[i][1]),nonce:rc7Text_(vals[i][3])};
    if (!triple.idLaporan || !triple.idUser)
      throw new Error('RC7_SOURCE_ID_OR_OWNER_MISSING');
    var nk=triple.idUser+'\u001f'+triple.nonce;
    if (ids[triple.idLaporan] || (triple.nonce && nonceKeys[nk]))
      throw new Error('RC7_SOURCE_DUPLICATE_GLOBAL');
    ids[triple.idLaporan]=true;
    if (triple.nonce) nonceKeys[nk]=true;
    identities.push(triple);
    if (i+2 === target.rowRekap && rc7Equal_(triple,target.triple)) count++;
  }
  if (count !== 1) throw new Error('RC7_SOURCE_STALE_OR_MOVED');
  return identities;
}
function rc7WriteIndexLocked_(ss, source, context) {
  var sourceIdentities=rc7SourceUnique_(ss,source);
  var sh=rc7IndexSheet_(ss), M=getIndexLaporanColumnMap2B0_();
  rc7WithinBounds_(sh);
  var lastRow=sh.getLastRow(), width=INDEX_LAPORAN_2B0_CONFIG.HEADERS.length;
  var records=lastRow>1?sh.getRange(2,1,lastRow-1,width).getValues():[];
  var usedIds={}, usedRows={}, existing=0;
  for (var i=0;i<records.length;i++) {
    var r=records[i], id=rc7Id_(r[M.ID_LAPORAN]), row=rc7Number_(r[M.ROW_REKAP]);
    if (!id || !Number.isSafeInteger(row) || row !== i+2 || usedIds[id] || usedRows[row])
      throw new Error('RC7_INDEX_DUPLICATE_OR_ROW_GAP');
    usedIds[id]=true; usedRows[row]=true;
    if (row>sourceIdentities.length+1) throw new Error('RC7_INDEX_ORPHAN');
    var actual=sourceIdentities[row-2];
    var fromIndex={idLaporan:id,idUser:rc7Id_(r[M.ID_USER]),nonce:rc7Text_(r[M.NONCE])};
    if (!rc7Equal_(actual,fromIndex)) throw new Error('RC7_INDEX_GLOBAL_PROVENANCE_MISMATCH');
    if (id===source.triple.idLaporan) existing=row;
  }
  if (existing && existing!==source.rowRekap) throw new Error('RC7_INDEX_POSITION_CHANGED');
  if (!existing && source.rowRekap!==lastRow+1)
    throw new Error('RC7_INDEX_NON_TRAILING_APPEND_BLOCKED');
  var targetRow=existing || source.rowRekap;
  var expected=buatBarisIndexLaporan2B0_(source.row,source.rowRekap);
  if (expected.length!==width) throw new Error('RC7_PROJECTION_SCHEMA_MISMATCH');
  if (existing && barisIndexSama2B0_(expected,records[existing-2]))
    return {rowIndex:targetRow,indexWritten:false};
  formatSatuBarisIndexLaporan2B1_(sh,targetRow);
  sh.getRange(targetRow,1,1,width).setValues([expected]);
  SpreadsheetApp.flush();
  var after=sh.getRange(targetRow,1,1,width).getValues()[0];
  if (!barisIndexSama2B0_(expected,after)) throw new Error('RC7_INDEX_READBACK_MISMATCH');
  updateMetadataDualWriteIndexLaporan2B1_(context,source.rowRekap);
  return {rowIndex:targetRow,indexWritten:true};
}
/** Replacement bridge for one-row sync. Fail-closed queue binds the origin from inside the first lock. */
function rc7SinkronkanSatuRowIndexLaporan2B1_(rowRekap,context,options) {
  options=options || {};
  if (!dualWriteIndexLaporanAktif2B1_())
    return {sukses:true,dilewati:true,alasan:'DUAL_WRITE_NONAKTIF_RC7'};
  var lock=null, source=null, contextText=rc7Text_(context), sourceError=null;
  try {
    rowRekap=rc7Number_(rowRekap);
    if (!Number.isSafeInteger(rowRekap)||rowRekap<2) throw new Error('RC7_ROW_INVALID');
    lock=rc7Acquire_();
    var ss=getSS_();
    source=rc7Source_(ss,rowRekap);
    var result=rc7WriteIndexLocked_(ss,source,contextText);
    return {sukses:true,rowRekap:rowRekap,rowIndex:result.rowIndex,
      idLaporan:source.triple.idLaporan,indexWritten:result.indexWritten,context:contextText};
  } catch(e) {
    sourceError=e;
  } finally { if(lock) lock.releaseLock(); }
  if (!options.noQueue) {
    // Source-origin is captured before the attempted write, not reconstructed from a later row.
    try { rc7AntrekanPerbaikanIndexLaporan2B1_({operation:'ROW',rowRekap:rowRekap,
      idLaporan:source&&source.triple.idLaporan,
      idUser:source&&source.triple.idUser,nonce:source&&source.triple.nonce,
      originalStamp:source&&source.stamp,sourceWasCaptured:!!source,
      context:contextText},sourceError);
    } catch (queueErr) { Logger.log('RC7 enqueue failed: '+queueErr); }
  }
  return {sukses:false,rowRekap:rowRekap,pesan:String(sourceError&&sourceError.message||sourceError)};
}
/** Replacement bridge for all legacy enqueue callers; partial records are quarantined. */
function rc7AntrekanPerbaikanIndexLaporan2B1_(item,error) {
  item=item||{};
  var lock=null;
  try {
    lock=rc7Acquire_();
    var ss=getSS_(), sh=rc7QueueSheet_(ss);
    rc7WithinBounds_(sh);
    var op=rc7Text_(item.operation || 'ROW');
    var identity={idLaporan:rc7Id_(item.idLaporan),idUser:rc7Id_(item.idUser),nonce:rc7Text_(item.nonce)};
    var source=null, valid=false;
    if (op!=='FULL_REBUILD' && item.sourceWasCaptured===true &&
        rc7Complete_(identity) && /^[0-9a-f]{64}$/i.test(item.originalStamp||'')) {
      try {
        source=rc7Source_(ss,rc7Number_(item.rowRekap));
        valid=rc7Equal_(source.triple,identity) && source.stamp===item.originalStamp;
      } catch(ignore) { valid=false; }
    }
    var status=op==='FULL_REBUILD'?'NEED_REBUILD':valid?'PENDING':'QUARANTINED';
    var action=rc7Text_(item.context);
    if (status==='PENDING' && INDEX_QUEUE_RC7_.ALLOWED_ACTIONS.indexOf(action)<0)
      status='QUARANTINED';
    var envelope=status==='PENDING'?INDEX_QUEUE_RC7_.CONTEXT_PREFIX + JSON.stringify({
      schema:1,trusted:true,eventId:'RC7-'+Utilities.getUuid(),
      action:action,commitRow:source.rowRekap,stamp:source.stamp}):rc7Text_(item.context);
    if (envelope.length>INDEX_QUEUE_RC7_.MAX_CONTEXT_LENGTH) {
      status='QUARANTINED';envelope='CONTEXT_TOO_LONG';
    }
    // Persistent dedup under lock; do not rely on short-lived CacheService.
    var existing=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,12).getValues():[];
    if (status==='PENDING') {
      for (var i=0;i<existing.length;i++) {
        var r=existing[i], tr=rc7QueueIdentity_(r), oldEnv=rc7ReadEnvelope_(r[7]);
        if ((r[9]==='PENDING'||r[9]==='RETRY') && rc7Equal_(tr,identity) &&
            oldEnv && oldEnv.stamp===source.stamp) return {sukses:true,duplikat:true};
      }
    }
    sh.appendRow([Utilities.getUuid(),new Date(),op,rc7Number_(item.rowRekap)||0,
      identity.idLaporan,identity.idUser,identity.nonce,envelope,0,status,
      rc7Text_(error&&error.message||error||'').slice(0,450),status==='PENDING'?'':new Date()]);
    return {sukses:status==='PENDING',duplikat:false,status:status};
  } catch(e) {
    Logger.log('RC7 enqueue hardening failure: '+e);
    return {sukses:false,status:'NOT_ENQUEUED',pesan:String(e.message||e)};
  } finally {if(lock) lock.releaseLock();}
}
function rc7ReplayEnabled_() {
  try { return dualWriteIndexLaporanAktif2B1_() &&
    rc7Text_(portalScriptProperties_().getProperty(INDEX_QUEUE_RC7_.REPLAY_PROPERTY))==='true';
  } catch(e) {return false;}
}
function rc7ProsesAntreanPerbaikanIndexLaporan2B1_(limit) {
  pastikanPemilikDatabaseIndexLaporan2B0_();
  if (!rc7ReplayEnabled_()) return {sukses:true,dilewati:true,
    alasan:'RC7_REPLAY_DEFAULT_OFF',diproses:0,productionReady:false};
  var lock=null, diproses=0, selesai=0, gagal=0, karantina=0, indeksDitulis=0;
  try {
    lock=rc7Acquire_();
    var ss=getSS_(),sh=rc7QueueSheet_(ss);
    rc7WithinBounds_(sh);
    rc7IndexSheet_(ss);
    var rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,12).getValues():[];
    var seenIds={},seenEvents={},seenOrigin={};
    // A duplicate within the same queued batch invalidates BOTH jobs.
    rows.forEach(function(r){
      var id=rc7Text_(r[0]),env=rc7ReadEnvelope_(r[7]);
      seenIds[id]=(seenIds[id]||0)+1;
      if(env) seenEvents[env.eventId]=(seenEvents[env.eventId]||0)+1;
      if(env) {var key=JSON.stringify(rc7QueueIdentity_(r))+'|'+env.stamp;
        seenOrigin[key]=(seenOrigin[key]||0)+1;}
    });
    var max=Math.max(1,Math.min(rc7Number_(limit)||INDEX_QUEUE_RC7_.MAX_BATCH,INDEX_QUEUE_RC7_.MAX_BATCH));
    for(var i=0;i<rows.length&&diproses<max;i++) {
      var q=rows[i],status=rc7Text_(q[9]).toUpperCase(),attempts=rc7Number_(q[8]),
        op=rc7Text_(q[2]),id=rc7Text_(q[0]);
      if(status!=='PENDING'&&status!=='RETRY') continue;
      diproses++;
      var env=rc7ReadEnvelope_(q[7]), tr=rc7QueueIdentity_(q), reason='';
      var key=env?JSON.stringify(tr)+'|'+env.stamp:'';
      if(!id||seenIds[id]>1||env&&(seenEvents[env.eventId]>1||seenOrigin[key]>1))
        reason='RC7_DUPLICATE_QUEUE_OR_EVENT';
      else if(op==='FULL_REBUILD') reason='RC7_FULL_REBUILD_MANUAL_ONLY';
      else if(INDEX_QUEUE_RC7_.ALLOWED_OPERATIONS.indexOf(op)<0) reason='RC7_UNKNOWN_OPERATION';
      else if(!Number.isSafeInteger(attempts)||attempts>=INDEX_QUEUE_RC7_.MAX_ATTEMPTS)
        reason='RC7_ATTEMPTS_EXHAUSTED';
      else if(!rc7Complete_(tr)||!env) reason='RC7_LEGACY_UNTRUSTED_QUEUE';
      if(reason) {
        var terminal=reason==='RC7_FULL_REBUILD_MANUAL_ONLY'?'NEED_REBUILD':
          reason==='RC7_ATTEMPTS_EXHAUSTED'?'FAILED':'QUARANTINED';
        rc7WriteQueueStatus_(sh,i+2,Number.isSafeInteger(attempts)?attempts:0,terminal,reason);
        if(terminal==='QUARANTINED')karantina++;else gagal++;
        continue;
      }
      try {
        var rowNumber=rc7Number_(q[3]),src=rc7Source_(ss,env.commitRow);
        if(rowNumber>=2 && rowNumber!==env.commitRow)
          throw new Error('RC7_ROW_HINT_CHANGED');
        if(op==='ROW' && rowNumber!==env.commitRow)
          throw new Error('RC7_ROW_MOVED');
        if(!rc7Equal_(src.triple,tr)||src.stamp!==env.stamp)
          throw new Error('RC7_STALE_OR_DIFFERENT_SOURCE');
        var projected=rc7WriteIndexLocked_(ss,src,env.action);
        if(projected.indexWritten) indeksDitulis++;
        rc7WriteQueueStatus_(sh,i+2,attempts+1,'DONE','');
        selesai++;
      } catch(e) {
        var why=String(e&&e.message||e);
        if(/SOURCE|INDEX_|STALE|ROW_|PROVENANCE|TRIPLE|DUPLICATE|ORPHAN|APPEND|SCAN_CAP/.test(why)) {
          rc7WriteQueueStatus_(sh,i+2,attempts+1,'QUARANTINED',why);karantina++;
        } else {
          var next=attempts+1>=INDEX_QUEUE_RC7_.MAX_ATTEMPTS?'FAILED':'RETRY';
          rc7WriteQueueStatus_(sh,i+2,attempts+1,next,why);gagal++;
        }
      }
    }
    return {sukses:gagal===0&&karantina===0,diproses:diproses,selesai:selesai,
      gagal:gagal,karantina:karantina,indexWrites:indeksDitulis,productionReady:false};
  } catch(e) {
    return {sukses:false,diproses:diproses,selesai:selesai,gagal:gagal,
      karantina:karantina,pesan:String(e&&e.message||e),productionReady:false};
  } finally {if(lock)lock.releaseLock();}
}
function rc7HitungStatusQueueIndexLaporan2B1_() {
  var sh=getSS_().getSheetByName(INDEX_LAPORAN_2B1_CONFIG.QUEUE_SHEET_NAME);
  var out={total:0,pending:0,selesai:0,gagal:0,perluRebuild:0,karantina:0};
  if(!sh||sh.getLastRow()<2)return out;
  var values=sh.getRange(2,1,sh.getLastRow()-1,12).getValues();
  values.forEach(function(r){
    var st=rc7Text_(r[9]).toUpperCase(),op=rc7Text_(r[2]);
    out.total++;
    if(st==='PENDING'||st==='RETRY')out.pending++;
    else if(st==='DONE')out.selesai++;
    else if(st==='QUARANTINED'){out.karantina++;out.gagal++;}
    else if(st==='FAILED'||st==='NEED_REBUILD')out.gagal++;
    if(op==='FULL_REBUILD'&&st!=='DONE')out.perluRebuild++;
  });
  return out;
}
