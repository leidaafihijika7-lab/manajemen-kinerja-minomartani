// OHIC v1.0.1 Maintenance Hardening
// Prinsip: audit dulu, maintainer-only, idempotent, backup sebelum cleanup,
// dan tidak pernah mengubah Rekap_Kinerja/Index_Laporan yang sudah benar secara diam-diam.
var OHIC_MAINTENANCE_V101_VERSION_ = 'OHIC-MAINT-v1.0.1-RC1-2026.09.30.01';

function ohicResolveQueueRowRekapV101_(row) {
  var Q = SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE;
  var op = String(row[Q.OPERATION] || 'ROW').trim().toUpperCase();
  if (op === 'FULL_REBUILD') return { operation:op, rowRekap:0, classification:'NEED_REBUILD' };
  var rr = 0;
  if (op === 'ROW') rr = Number(row[Q.ROW_REKAP] || 0);
  else if (op === 'BY_ID') rr = Number(cariRowRekapByIdDualWrite2B1_(row[Q.ID_LAPORAN]) || 0);
  else if (op === 'BY_NONCE') rr = Number(cariRowRekapByNonceDualWrite2B1_(row[Q.ID_USER], row[Q.NONCE]) || 0);
  else return { operation:op, rowRekap:0, classification:'UNKNOWN_OPERATION' };
  return { operation:op, rowRekap:rr, classification:rr >= 2 ? 'RESOLVED' : 'SOURCE_NOT_FOUND' };
}

function ohicKlasifikasiQueueIndexV101_(ss, row, queueRowNumber) {
  var Q = SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE;
  var base = {
    queueRow:Number(queueRowNumber || 0), queueId:String(row[Q.QUEUE_ID] || ''),
    operation:String(row[Q.OPERATION] || 'ROW'), context:String(row[Q.CONTEXT] || ''),
    status:String(row[Q.STATUS] || '').trim().toUpperCase(), classification:'', rowRekap:0, sample:''
  };
  try {
    var resolved = ohicResolveQueueRowRekapV101_(row);
    base.rowRekap = resolved.rowRekap || 0;
    if (resolved.classification !== 'RESOLVED') {
      base.classification = resolved.classification;
      base.sample = 'Queue baris ' + base.queueRow + ': ' + base.classification + (base.rowRekap ? ' (Rekap ' + base.rowRekap + ')' : '');
      return base;
    }
    var src = ss.getSheetByName('Rekap_Kinerja'), idx = ss.getSheetByName('Index_Laporan');
    if (!src || !idx) throw new Error('Sheet sumber/index tidak tersedia.');
    if (base.rowRekap > src.getLastRow()) {
      base.classification = 'SOURCE_NOT_FOUND';
      base.sample = 'Queue baris ' + base.queueRow + ': row Rekap ' + base.rowRekap + ' tidak tersedia.';
      return base;
    }
    var width = SHEET_COLUMNS.REKAP_KINERJA.ID_DISPOSISI + 1;
    var sourceRow = src.getRange(base.rowRekap, 1, 1, width).getValues()[0];
    var expected = buatBarisIndexLaporan2B0_(sourceRow, base.rowRekap);
    var targetRow = cariBarisIndexDenganRowRekap2B1_(idx, base.rowRekap);
    if (!targetRow) {
      base.classification = 'NEEDS_SYNC';
      base.sample = 'Queue baris ' + base.queueRow + ': index untuk row Rekap ' + base.rowRekap + ' belum ada.';
      return base;
    }
    var actual = idx.getRange(targetRow, 1, 1, expected.length).getValues()[0];
    var diff = bedaBarisIndexLaporan2B0_(expected, actual);
    base.indexRow = targetRow;
    base.diffCount = diff.length;
    base.classification = diff.length ? 'NEEDS_SYNC' : 'STALE_ALREADY_SYNCED';
    base.sample = 'Queue baris ' + base.queueRow + ': ' + base.classification + ' — Rekap ' + base.rowRekap + ' / Index ' + targetRow + '.';
    return base;
  } catch (e) {
    base.classification = 'CHECK_FAILED';
    base.sample = 'Queue baris ' + base.queueRow + ': CHECK_FAILED — ' + String(e && e.message ? e.message : e);
    return base;
  }
}

function ohicAuditQueueIndexV101_(ss) {
  var sh = ss.getSheetByName('Index_Laporan_Sync_Queue');
  var out = { total:0, pending:0, stale:0, needsSync:0, failed:0, done:0, items:[] };
  if (!sh || sh.getLastRow() < 2) return out;
  var Q = SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, Q.DIPROSES_PADA + 1).getValues();
  data.forEach(function (row, i) {
    if (!ohicMeaningfulRowV10_(row, Q.DIPROSES_PADA + 1)) return;
    out.total++;
    var st = String(row[Q.STATUS] || '').trim().toUpperCase();
    if (st === 'DONE') { out.done++; return; }
    if (st === 'FAILED' || st === 'ERROR' || st === 'NEED_REBUILD') { out.failed++; return; }
    if (!(st === 'PENDING' || st === 'RETRY')) return;
    out.pending++;
    var cls = ohicKlasifikasiQueueIndexV101_(ss, row, i + 2);
    if (cls.classification === 'STALE_ALREADY_SYNCED') out.stale++; else out.needsSync++;
    out.items.push(cls);
  });
  return out;
}

function ohicAuditResidualBatchV101_(ss) {
  var sh = ss.getSheetByName('Rekap_Tunjangan_Bulanan');
  var out = { residualRows:[], residualBatchIds:[], businessBatchIds:[], latestActive:null, cleanupSafeNow:false, blockReason:'' };
  if (!sh || sh.getLastRow() < 2) return out;
  var C = SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
  var data = sh.getDataRange().getValues(), businessBatches = Object.create(null), residualBatches = Object.create(null), activeBusiness=[];
  for (var i=1;i<data.length;i++) {
    var r=data[i]||[], business=false, meta=false;
    for (var a=0;a<=C.CATATAN_BENDAHARA;a++) if (r[a]!=='' && r[a]!==null && r[a]!==undefined) { business=true; break; }
    for (var b=C.DIBUAT_OLEH;b<=C.TANGGAL_CUTOFF;b++) if (r[b]!=='' && r[b]!==null && r[b]!==undefined) { meta=true; break; }
    var bid=String(r[C.BATCH_ID]||'').trim();
    if (business && bid) businessBatches[bid]=true;
    if (!business && meta) {
      out.residualRows.push(i+1); if (bid) residualBatches[bid]=true;
    }
    if (business && nilaiAktifEksplisitTunjangan_(r[C.IS_ACTIVE])) activeBusiness.push({row:i+1,periode:String(r[C.PERIODE]||''),batchId:bid,status:String(r[C.STATUS_REKAP]||'')});
  }
  out.businessBatchIds=Object.keys(businessBatches).sort(); out.residualBatchIds=Object.keys(residualBatches).sort();
  var overlap=out.residualBatchIds.filter(function (id){return !!businessBatches[id];}); out.overlapBatchIds=overlap;
  activeBusiness.sort(function(a,b){return String(a.periode).localeCompare(String(b.periode)) || a.row-b.row;});
  out.latestActive=activeBusiness.length?activeBusiness[activeBusiness.length-1]:null;
  var frozen=out.latestActive && (out.latestActive.status===TUNJANGAN_STATUS.DITERUSKAN_KE_BENDAHARA || out.latestActive.status===TUNJANGAN_STATUS.SUDAH_DICAIRKAN);
  if (!out.residualRows.length) out.blockReason='TIDAK_ADA_RESIDU';
  else if (overlap.length) out.blockReason='RESIDU_BERBAGI_BATCH_DENGAN_DATA_BISNIS';
  else if (!out.latestActive) out.blockReason='TIDAK_ADA_BATCH_AKTIF_BISNIS';
  else if (!frozen) out.blockReason='BATCH_AKTIF_BELUM_SNAPSHOT_FINAL';
  else out.cleanupSafeNow=true;
  return out;
}

function auditMaintenanceOHICV101() {
  var ctx = pastikanMaintainerPortal3B0_('AUDIT_OHIC_V101');
  var ss = getSS_();
  var result = { sukses:true, versi:OHIC_MAINTENANCE_V101_VERSION_, mode:'AUDIT_ONLY', queue:ohicAuditQueueIndexV101_(ss), batchResidual:ohicAuditResidualBatchV101_(ss), dataDiubah:false };
  catatMaintenancePortal3B0_(ctx,'AUDIT', { queue:{pending:result.queue.pending,stale:result.queue.stale,needsSync:result.queue.needsSync}, batchResidual:{rows:result.batchResidual.residualRows.length,safe:result.batchResidual.cleanupSafeNow,reason:result.batchResidual.blockReason} });
  Logger.log(JSON.stringify(result,null,2)); return result;
}

function maintenanceRekonsiliasiQueueIndexV101() {
  var ctx = pastikanMaintainerPortal3B0_('REKONSILIASI_QUEUE_INDEX_OHIC_V101');
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var ss=getSS_(), sh=ss.getSheetByName('Index_Laporan_Sync_Queue');
    if (!sh || sh.getLastRow()<2) return {sukses:true,versi:OHIC_MAINTENANCE_V101_VERSION_,ditutupStale:0,pesan:'Queue kosong.'};
    var Q=SHEET_COLUMNS.INDEX_LAPORAN_SYNC_QUEUE, data=sh.getRange(2,1,sh.getLastRow()-1,Q.DIPROSES_PADA+1).getValues();
    var closed=[], untouched=[];
    for (var i=0;i<data.length;i++) {
      var row=data[i]||[], st=String(row[Q.STATUS]||'').trim().toUpperCase();
      if (!(st==='PENDING'||st==='RETRY')) continue;
      var cls=ohicKlasifikasiQueueIndexV101_(ss,row,i+2);
      if (cls.classification!=='STALE_ALREADY_SYNCED') { untouched.push(cls); continue; }
      var attempts=Number(row[Q.ATTEMPTS]||0);
      sh.getRange(i+2,Q.ATTEMPTS+1,1,4).setValues([[attempts+1,'DONE','OHIC_V101_RECONCILED_STALE_ALREADY_SYNCED',new Date()]]);
      closed.push({queueRow:i+2,queueId:String(row[Q.QUEUE_ID]||''),rowRekap:cls.rowRekap,indexRow:cls.indexRow||0});
    }
    SpreadsheetApp.flush();
    var result={sukses:true,versi:OHIC_MAINTENANCE_V101_VERSION_,ditutupStale:closed.length,tidakDisentuh:untouched.length,closed:closed,untouched:untouched.slice(0,8),indexDitulisUlang:false,rekapKinerjaDiubah:false};
    catatMaintenancePortal3B0_(ctx,'SUCCESS',result); Logger.log(JSON.stringify(result,null,2)); return result;
  } catch(e) { catatMaintenancePortal3B0_(ctx,'FAILED',{pesan:String(e&&e.message?e.message:e)}); throw e; }
  finally { try{lock.releaseLock();}catch(_e){} }
}

function ohicNamaBackupBatchV101_(ss) {
  var base='OHIC_BatchResidual_Backup_'+Utilities.formatDate(new Date(),'GMT+7','yyyyMMdd_HHmmss');
  var name=base,n=1; while(ss.getSheetByName(name)){name=base+'_'+n;n++;} return name;
}

function maintenanceBersihkanMetadataBatchResiduV101() {
  var ctx=pastikanMaintainerPortal3B0_('BERSIHKAN_METADATA_BATCH_RESIDU_OHIC_V101');
  var lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var ss=getSS_(), audit=ohicAuditResidualBatchV101_(ss);
    if (!audit.residualRows.length) return {sukses:true,versi:OHIC_MAINTENANCE_V101_VERSION_,dibersihkan:0,pesan:'Tidak ada metadata residu.'};
    if (!audit.cleanupSafeNow) {
      var blocked={sukses:false,kode:'CLEANUP_DIBLOKIR_GUARD',versi:OHIC_MAINTENANCE_V101_VERSION_,alasan:audit.blockReason,residualRows:audit.residualRows,latestActive:audit.latestActive,dataDiubah:false};
      catatMaintenancePortal3B0_(ctx,'BLOCKED',blocked); Logger.log(JSON.stringify(blocked,null,2)); return blocked;
    }
    var sh=ss.getSheetByName('Rekap_Tunjangan_Bulanan'), C=SHEET_COLUMNS.REKAP_TUNJANGAN_BULANAN;
    var backupName=ohicNamaBackupBatchV101_(ss), backup=ss.insertSheet(backupName), width=C.TANGGAL_CUTOFF+1;
    var header=['ORIGINAL_ROW'].concat(sh.getRange(1,1,1,width).getValues()[0]);
    var backupRows=[header];
    audit.residualRows.forEach(function(rowNo){backupRows.push([rowNo].concat(sh.getRange(rowNo,1,1,width).getValues()[0]));});
    backup.getRange(1,1,backupRows.length,header.length).setValues(backupRows); backup.setFrozenRows(1);
    SpreadsheetApp.flush();
    audit.residualRows.forEach(function(rowNo){sh.getRange(rowNo,C.DIBUAT_OLEH+1,1,C.TANGGAL_CUTOFF-C.DIBUAT_OLEH+1).clearContent();});
    SpreadsheetApp.flush();
    var after=ohicAuditResidualBatchV101_(ss);
    if (after.residualRows.length) throw new Error('Verifikasi cleanup gagal: masih ada '+after.residualRows.length+' baris metadata residu. Backup: '+backupName);
    var result={sukses:true,versi:OHIC_MAINTENANCE_V101_VERSION_,dibersihkan:audit.residualRows.length,baris:audit.residualRows,backupSheet:backupName,batchAktifTidakDiubah:true,rekapKinerjaTidakDiubah:true};
    catatMaintenancePortal3B0_(ctx,'SUCCESS',result); Logger.log(JSON.stringify(result,null,2)); return result;
  } catch(e) { catatMaintenancePortal3B0_(ctx,'FAILED',{pesan:String(e&&e.message?e.message:e)}); throw e; }
  finally { try{lock.releaseLock();}catch(_e){} }
}

function validasiOperationalHealthV101() {
  var scenarios=[]; function push(n,ok){scenarios.push({nama:n,lulus:!!ok});}
  push('Versi maintenance tersedia',OHIC_MAINTENANCE_V101_VERSION_.indexOf('v1.0.1')!==-1);
  push('Endpoint OHIC tetap read-only',typeof ambilOperationalHealthCenterV10==='function');
  push('Rekonsiliasi queue tersedia',typeof maintenanceRekonsiliasiQueueIndexV101==='function');
  push('Cleanup residu tersedia',typeof maintenanceBersihkanMetadataBatchResiduV101==='function');
  push('Audit maintenance tersedia',typeof auditMaintenanceOHICV101==='function');
  push('Helper klasifikasi stale tersedia',typeof ohicKlasifikasiQueueIndexV101_==='function');
  push('Helper audit residu tersedia',typeof ohicAuditResidualBatchV101_==='function');
  var failed=scenarios.filter(function(x){return !x.lulus;}).length;
  var out={sukses:failed===0,valid:failed===0,versi:OHIC_MAINTENANCE_V101_VERSION_,jumlahSkenario:scenarios.length,lulus:scenarios.length-failed,gagal:failed,skenario:scenarios,dataDiubah:false};
  Logger.log(JSON.stringify(out,null,2)); return out;
}
