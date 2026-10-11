// ============================================================================
// PHA-07B B2 | ISOLATED PRODUCTION-PATH INTEGRATION RC1 | 2026-10-11
// EXACT production candidate excerpts from pinned GitHub source SHA:
// Kode.gs: 387c179c684c3a1820da662f961133b4e7a67ccb
// ACEDsp004IndexIntegrityRC1.gs: 22991bb74fe812b6df1e7e8fe44d989f71b62684
// Functions below are verbatim *inside local in-memory runner scopes*.
// Helpers for Sheets, cache, authorization, cutoffs, IDs and dispatch are isolated
// deterministic test adapters, NOT actual deployed Portal dependencies.
// No production access, no Script Properties, no trigger/deploy, NO SHEET WRITES.
// Install only in NEW standalone SANDBOX_PHA07B_B2_SCRIPT_TEST.
// ============================================================================
var PHA07B_B2_VERSION='PHA07B-B2-SOURCE-TRACE-RC1-2026.10.11.01';
var PHA07B_B2_SHEET_ID='1xW2kMz1lFv6wtaWNNgNoyVCuLZnsqsGpAQ886blVtcU';
var PHA07B_B2_TITLE='SANDBOX_PHA07B_B2_ISOLATED_PRODUCTION_PATH';
var PHA07B_B2_WRITE_ENABLED=false; // THERE ARE NO WRITE ENTRYPOINTS.
var PHA07B_B2_PINNED_KODE_SHA='387c179c684c3a1820da662f961133b4e7a67ccb';
var PHA07B_B2_PINNED_GUARD_SHA='22991bb74fe812b6df1e7e8fe44d989f71b62684';
function phaB2Assert_(ok,code){if(!ok)throw new Error('PHA07B_B2_STOP_'+code);}
function phaB2Safe_(v){return v===null||v===undefined?'':String(v).trim();}

function phaB2SubmitInMemory_(mode){
  mode=mode||'IDEMPOTENT';
  var INTERNAL_SUBMIT_CONTEXT_MARKER_={syntheticOnly:true};
  var CONFIG={CACHE:{SESSION_TIMEOUT_SECONDS:600}};
  var SHEET_COLUMNS={REKAP_KINERJA:{ID_USER:19,NONCE:21}};
  var rows=[];
  function report(id,owner,nonce){
    var a=Array(71).fill('');
    a[18]=id;a[19]=owner;a[21]=nonce;return a;
  }
  rows.push(report('B2-RPT-0001','B2-USR-0001','B2-NONCE-0001'));
  var state={lockReleased:false,lockAcquired:false,appended:0,
    setupCalled:false,cutoffAdapterCalled:false,cacheWrites:0};
  var LockService={getScriptLock:function(){return {
    tryLock:function(){state.lockAcquired=mode!=='LOCK_DENIED';return state.lockAcquired;},
    releaseLock:function(){state.lockReleased=true;}
  };}};
  function siapkanKolomDetailFormRekapKinerja_(){state.setupCalled=true;}
  function getSheet_(name){
    if(name!=='Rekap_Kinerja')throw new Error('B2_MOCK_SHEET_DENIED');
    return {
      getLastRow:function(){return rows.length+1;},
      appendRow:function(row){if(mode==='APPEND_EXCEPTION')throw new Error('B2_MOCK_APPEND_FAILED');
        rows.push(row.slice());state.appended++;},
      getRange:function(startRow,col,h,w){
        return {
          getValue:function(){return rows[startRow-2][col-1];},
          createTextFinder:function(needle){
            return {
              matchEntireCell:function(){return this;},
              useRegularExpression:function(){return this;},
              findAll:function(){var out=[];for(var i=0;i<rows.length;i++)
                if(String(rows[i][col-1])===String(needle))
                  out.push({getRow:(function(x){return function(){return x;};})(i+2)});
                return out;}
            };
          }
        };
      }
    };
  }
  function idsEqual_(a,b){return String(a||'').toLowerCase()===String(b||'').toLowerCase();}
  function terapkanKebijakanCutoffImbalan3C4KeRow_(){state.cutoffAdapterCalled=true;return {syntheticStub:true};}
  function invalidasiCacheRekapKinerjaReadOnly_(){}
  function terapkanValidasiAPBKalSubmit_(){throw new Error('B2_APB_PATH_NOT_IN_SCOPE');}
function simpanBarisRekapKinerjaSubmit_(paket, ctx, draft, evaluasi, barisBaru) {
  // Fungsi ini memiliki binding cadangan historis tanpa suffix privat. Marker
  // berbasis identitas objek memastikan hanya konteks yang dibuat server dalam
  // alur simpanDataKinerja() yang dapat mencapai operasi appendRow.
  if (!ctx || ctx.internalMarker !== INTERNAL_SUBMIT_CONTEXT_MARKER_ ||
      !ctx.submitCache || typeof ctx.submitCache.put !== 'function' ||
      !Array.isArray(barisBaru)) {
    return { sukses: false, pesan: 'Permintaan simpan internal tidak valid.' };
  }

  // Siapkan schema sebelum lock simpan final. Fungsi ini sudah memakai guard
  // sehingga pada kondisi normal tidak menulis header berulang kali.
  siapkanKolomDetailFormRekapKinerja_();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      sukses: false,
      pesan: "❌ GAGAL: Antrean server sedang penuh. Data Anda aman, silakan klik 'Kirim' lagi dalam beberapa detik."
    };
  }

  var lastRowIdx = 0;
  try {
    var sheetRekap = getSheet_("Rekap_Kinerja");
    var IDX_IDUSER = SHEET_COLUMNS.REKAP_KINERJA.ID_USER;
    var IDX_NONCE = SHEET_COLUMNS.REKAP_KINERJA.NONCE;
    var lastRowSebelumSimpan = sheetRekap.getLastRow();

    // Cari nonce di sisi Spreadsheet. Ini menghindari transfer seluruh rentang
    // ID_USER..NONCE (termasuk URL/deskripsi panjang) pada setiap submit.
    if (lastRowSebelumSimpan > 1) {
      var nonceMatches = sheetRekap
        .getRange(2, IDX_NONCE + 1, lastRowSebelumSimpan - 1, 1)
        .createTextFinder(ctx.submitNonce)
        .matchEntireCell(true)
        .useRegularExpression(false)
        .findAll();

      for (var rr = nonceMatches.length - 1; rr >= 0; rr--) {
        var existingUserId = sheetRekap.getRange(nonceMatches[rr].getRow(), IDX_IDUSER + 1).getValue();
        if (idsEqual_(existingUserId, ctx.idUser)) {
          ctx.submitCache.put(ctx.nonceKey, "DONE", CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
          ctx.pertahankanNonce = true;
          return {
            sukses: false,
            pesan: "⚠️ Permintaan yang sama sudah pernah diproses. Laporan tidak dikirim ulang."
          };
        }
      }
    }

    // Validasi APBKal tetap memakai data lengkap agar seluruh aturan bisnis lama
    // tetap identik. Full-sheet read hanya dilakukan untuk kategori ini.
    if (paket.detailAPBKal) {
      var dataRekap = sheetRekap.getDataRange().getValues();
      var hasilApb = terapkanValidasiAPBKalSubmit_(paket, ctx, draft, evaluasi, barisBaru, dataRekap);
      if (!hasilApb.sukses) return hasilApb;
    }

    ctx.kebijakanCutoffImbalan = terapkanKebijakanCutoffImbalan3C4KeRow_(
      barisBaru,
      null,
      "SUBMIT_LAPORAN"
    );

    sheetRekap.appendRow(barisBaru);
    invalidasiCacheRekapKinerjaReadOnly_();
    lastRowIdx = sheetRekap.getLastRow();
    ctx.laporanBerhasilDisimpan = true;
    ctx.submitCache.put(ctx.nonceKey, "DONE", CONFIG.CACHE.SESSION_TIMEOUT_SECONDS);
    ctx.pertahankanNonce = true;
  } finally {
    lock.releaseLock();
  }

  return {
    sukses: true,
    lastRowIdx: lastRowIdx
  };
}
  var ctx={
    internalMarker:mode==='INVALID_MARKER'?{}:INTERNAL_SUBMIT_CONTEXT_MARKER_,
    submitCache:{put:function(){state.cacheWrites++;}},
    nonceKey:'B2-SYNTHETIC-KEY',submitNonce:'B2-NONCE-0003',
    idUser:'B2-USR-0003',idLaporan:'B2-RPT-0003',
    pertahankanNonce:false
  };
  var input=report('B2-RPT-0003','B2-USR-0003','B2-NONCE-0003');
  var first=null,repeat=null,exceptionCode=null;
  try {
    first=simpanBarisRekapKinerjaSubmit_({detailAPBKal:false},ctx,{},null,input);
    if(mode==='IDEMPOTENT')repeat=simpanBarisRekapKinerjaSubmit_({detailAPBKal:false},ctx,{},null,input);
  }catch(e){exceptionCode=String(e.message||e);}
  return {
    firstSuccess:first&&first.sukses===true,
    firstRejected:first&&first.sukses===false,
    repeatRejected:repeat&&repeat.sukses===false,
    appended:state.appended,
    sourceRows:rows.length,
    lockReleased:state.lockReleased,
    lockAcquired:state.lockAcquired,
    cacheWrites:state.cacheWrites,
    cutoffAdapterCalled:state.cutoffAdapterCalled,
    exceptionCode:exceptionCode,
    originalIntact:rows[0][18]==='B2-RPT-0001',
    pureInMemory:true
  };
}

function phaB2QueueInMemory_(mode){
  mode=mode||'QUEUE_EMPTY';
  var state={dispatch:[],queueWrites:0,queueAppends:0,cacheWrites:0,loggerCount:0,
    ownerBlocked:false,failAppend:false,failSync:false};
  var rows=[['QUEUE_ID','WAKTU','OPERATION','ROW_REKAP','ID_LAPORAN',
    'ID_USER','NONCE','CONTEXT','ATTEMPTS','STATUS','LAST_ERROR','DIPROSES_PADA']];
  var cache={};
  function mockSheet(){
    return {
      getLastRow:function(){return rows.length;},
      getRange:function(r,c,h,w){
        return {
          getValues:function(){return rows.slice(r-1,r-1+h).map(function(row){return row.slice(c-1,c-1+w);});},
          setValues:function(v){
            if(v.length!==h||v.some(function(z){return z.length!==w;}))
              throw new Error('B2_MOCK_DIMENSION_MISMATCH');
            for(var i=0;i<h;i++)for(var j=0;j<w;j++)rows[r-1+i][c-1+j]=v[i][j];
            state.queueWrites++;return this;
          }
        };
      },
      appendRow:function(row){
        if(state.failAppend)throw new Error('B2_INJECTED_APPEND_FAILURE');
        rows.push(row.slice());state.queueAppends++;
      }
    };
  }
  var sheet=mockSheet();
  var INDEX_LAPORAN_2B1_CONFIG={
    QUEUE_SHEET_NAME:'Index_Laporan_Sync_Queue',
    QUEUE_HEADERS:rows[0].slice(),
    QUEUE_PROCESS_LIMIT_DEFAULT:50,QUEUE_MAX_ATTEMPTS:5
  };
  var CacheService={getScriptCache:function(){return {
    get:function(k){return cache[k]||'';},
    put:function(k,v){cache[k]=v;state.cacheWrites++;}
  };}};
  var Utilities={getUuid:function(){return 'B2-UUID-SYNTHETIC';}};
  var Logger={log:function(){state.loggerCount++;}};
  function getSS_(){return {getSheetByName:function(n){
    if(n!=='Index_Laporan_Sync_Queue')throw new Error('B2_QUEUE_NAME_DENIED');
    return sheet;
  }};}
  function ensureIndexSyncQueueSheet2B1_(){return sheet;}
  function queueDedupKeyIndexLaporan2B1_(item){
    return JSON.stringify([item.operation,item.rowRekap,item.idLaporan,item.idUser,item.nonce,item.context]);
  }
  function pastikanPemilikDatabaseIndexLaporan2B0_(){
    if(state.ownerBlocked)throw new Error('B2_OWNER_AUTH_STOP');
  }
  function dualWriteIndexLaporanAktif2B1_(){return false;}
  function cariRowRekapByIdDualWrite2B1_(id){return String(id)==='B2-RPT-CURRENT'?4:0;}
  function cariRowRekapByNonceDualWrite2B1_(id,nonce){
    return id==='B2-USR-CURRENT'&&nonce==='B2-NONCE-CURRENT'?4:0;
  }
  function sinkronkanSatuRowIndexLaporan2B1Internal_(rowRekap,context,force){
    state.dispatch.push({rowRekap:rowRekap,context:context,force:force});
    if(state.failSync)throw new Error('B2_INJECTED_SYNC_FAILED');
    if(Number(rowRekap)!==4)throw new Error('B2_MOCK_ROW_NOT_AVAILABLE');
    return {sukses:true,rowRekap:4,idLaporan:'B2-RPT-CURRENT'};
  }
function normalizeId_(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/ /g, " ").trim();
}
function sinkronkanSatuRowIndexLaporan2B1_(rowRekap, context, options) {
  options = options || {};
  try {
    return sinkronkanSatuRowIndexLaporan2B1Internal_(rowRekap, context, !!options.force);
  } catch (e) {
    if (!options.noQueue) {
      antrekanPerbaikanIndexLaporan2B1_({
        operation: 'ROW', rowRekap: rowRekap, context: context
      }, e);
    }
    Logger.log('DUAL-WRITE INDEX GAGAL [' + String(context || '') + '] row ' + rowRekap + ': ' + (e && e.message ? e.message : e));
    return { sukses: false, rowRekap: Number(rowRekap || 0), pesan: String(e && e.message ? e.message : e) };
  }
}
function sinkronkanIndexLaporanById2B1_(idLaporan, context, options) {
  options = options || {};
  var rowRekap = 0;
  try {
    if (!options.force && !dualWriteIndexLaporanAktif2B1_()) return { sukses: true, dilewati: true, alasan: 'DUAL_WRITE_NONAKTIF' };
    rowRekap = cariRowRekapByIdDualWrite2B1_(idLaporan);
    if (!rowRekap) throw new Error('ROW_REKAP tidak ditemukan untuk ID_LAPORAN ' + normalizeId_(idLaporan));
    return sinkronkanSatuRowIndexLaporan2B1_(rowRekap, context, options);
  } catch (e) {
    if (!options.noQueue) {
      antrekanPerbaikanIndexLaporan2B1_({ operation: 'BY_ID', idLaporan: idLaporan, context: context }, e);
    }
    return { sukses: false, rowRekap: rowRekap, pesan: String(e && e.message ? e.message : e) };
  }
}
function sinkronkanIndexLaporanByNonce2B1_(idUser, nonce, context, options) {
  options = options || {};
  var rowRekap = 0;
  try {
    if (!options.force && !dualWriteIndexLaporanAktif2B1_()) return { sukses: true, dilewati: true, alasan: 'DUAL_WRITE_NONAKTIF' };
    rowRekap = cariRowRekapByNonceDualWrite2B1_(idUser, nonce);
    if (!rowRekap) throw new Error('ROW_REKAP tidak ditemukan untuk nonce submit.');
    return sinkronkanSatuRowIndexLaporan2B1_(rowRekap, context, options);
  } catch (e) {
    if (!options.noQueue) {
      antrekanPerbaikanIndexLaporan2B1_({ operation: 'BY_NONCE', idUser: idUser, nonce: nonce, context: context }, e);
    }
    return { sukses: false, rowRekap: rowRekap, pesan: String(e && e.message ? e.message : e) };
  }
}
function antrekanPerbaikanIndexLaporan2B1_(item, error) {
  item = item || {};
  try {
    var cache = CacheService.getScriptCache();
    var dedupKey = queueDedupKeyIndexLaporan2B1_(item);
    if (cache.get(dedupKey)) return { sukses: true, duplikat: true };
    cache.put(dedupKey, '1', 600);

    var sh = ensureIndexSyncQueueSheet2B1_();
    sh.appendRow([
      Utilities.getUuid(), new Date(), String(item.operation || 'ROW'), Number(item.rowRekap || 0),
      normalizeId_(item.idLaporan), normalizeId_(item.idUser), String(item.nonce || ''),
      String(item.context || ''), 0, 'PENDING', String(error && error.message ? error.message : error || ''), ''
    ]);
    return { sukses: true, duplikat: false };
  } catch (queueError) {
    Logger.log('GAGAL MENULIS QUEUE INDEX 2B1: ' + (queueError && queueError.message ? queueError.message : queueError));
    return { sukses: false, pesan: String(queueError && queueError.message ? queueError.message : queueError) };
  }
}
function hitungStatusQueueIndexLaporan2B1_() {
  var sh = getSS_().getSheetByName(INDEX_LAPORAN_2B1_CONFIG.QUEUE_SHEET_NAME);
  var out = { total: 0, pending: 0, selesai: 0, gagal: 0, perluRebuild: 0 };
  if (!sh || sh.getLastRow() < 2) return out;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, INDEX_LAPORAN_2B1_CONFIG.QUEUE_HEADERS.length).getValues();
  out.total = data.length;
  for (var i = 0; i < data.length; i++) {
    var op = String(data[i][2] || '');
    var st = String(data[i][9] || '').toUpperCase();
    if (op === 'FULL_REBUILD' && st !== 'DONE') out.perluRebuild++;
    if (st === 'PENDING' || st === 'RETRY') out.pending++;
    else if (st === 'DONE') out.selesai++;
    else if (st === 'FAILED' || st === 'NEED_REBUILD') out.gagal++;
  }
  return out;
}
function prosesAntreanPerbaikanIndexLaporan2B1(limit) {
  pastikanPemilikDatabaseIndexLaporan2B0_();
  limit = Math.max(1, Math.min(Number(limit || INDEX_LAPORAN_2B1_CONFIG.QUEUE_PROCESS_LIMIT_DEFAULT), 200));
  var sh = getSS_().getSheetByName(INDEX_LAPORAN_2B1_CONFIG.QUEUE_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return { sukses: true, diproses: 0, selesai: 0, gagal: 0, pesan: 'Queue kosong.' };

  var width = INDEX_LAPORAN_2B1_CONFIG.QUEUE_HEADERS.length;
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
  var diproses = 0, selesai = 0, gagal = 0, needRebuild = 0;
  for (var i = 0; i < data.length && diproses < limit; i++) {
    var status = String(data[i][9] || '').toUpperCase();
    var attempts = Number(data[i][8] || 0);
    if (!(status === 'PENDING' || status === 'RETRY' || status === 'FAILED')) continue;
    if (attempts >= INDEX_LAPORAN_2B1_CONFIG.QUEUE_MAX_ATTEMPTS) continue;

    diproses++;
    var operation = String(data[i][2] || 'ROW');
    var res = null;
    if (operation === 'FULL_REBUILD') {
      needRebuild++;
      sh.getRange(i + 2, 9, 1, 4).setValues([[attempts + 1, 'NEED_REBUILD', 'Nonaktifkan dual-write lalu jalankan bangunUlangIndexLaporan2B0() secara manual.', new Date()]]);
      continue;
    }

    if (operation === 'ROW') {
      res = sinkronkanSatuRowIndexLaporan2B1_(Number(data[i][3] || 0), String(data[i][7] || 'QUEUE'), { force: true, noQueue: true });
    } else if (operation === 'BY_ID') {
      res = sinkronkanIndexLaporanById2B1_(data[i][4], String(data[i][7] || 'QUEUE'), { force: true, noQueue: true });
    } else if (operation === 'BY_NONCE') {
      res = sinkronkanIndexLaporanByNonce2B1_(data[i][5], data[i][6], String(data[i][7] || 'QUEUE'), { force: true, noQueue: true });
    } else {
      res = { sukses: false, pesan: 'Operation queue tidak dikenal: ' + operation };
    }

    if (res && res.sukses) {
      selesai++;
      sh.getRange(i + 2, 9, 1, 4).setValues([[attempts + 1, 'DONE', '', new Date()]]);
    } else {
      gagal++;
      var nextStatus = attempts + 1 >= INDEX_LAPORAN_2B1_CONFIG.QUEUE_MAX_ATTEMPTS ? 'FAILED' : 'RETRY';
      sh.getRange(i + 2, 9, 1, 4).setValues([[attempts + 1, nextStatus, String(res && res.pesan ? res.pesan : 'Sinkronisasi gagal.'), new Date()]]);
    }
  }

  return { sukses: gagal === 0, diproses: diproses, selesai: selesai, gagal: gagal, perluRebuild: needRebuild, queue: hitungStatusQueueIndexLaporan2B1_() };
}
  function job(operation,status,attempts,reportId){
    return ['B2-QUEUE-0001','2026-10-11 15:00:00',operation,4,
      reportId||'','B2-USR-CURRENT','B2-NONCE-CURRENT',
      'B2_SOURCE_TRACE_ONLY',attempts,status,'',''];
  }
  function add(row){rows.push(row);}
  var output={};
  if(mode==='QUEUE_EMPTY'){
    output=prosesAntreanPerbaikanIndexLaporan2B1(5);
  }else if(mode==='QUEUE_ROW_STALE'){
    add(job('ROW','PENDING',0,'')); // original report ID not represented in actual ROW queue
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
    output.originalReportIdentityProved=false;
    output.sourceRowNow='B2-RPT-CURRENT';output.historicalReportId='B2-RPT-OLD';
  }else if(mode==='QUEUE_BY_ID'){
    add(job('BY_ID','PENDING',0,'B2-RPT-CURRENT'));
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_BY_ID_MISSING'){
    add(job('BY_ID','PENDING',0,'B2-RPT-MISSING'));
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_BY_NONCE'){
    add(job('BY_NONCE','PENDING',0,''));output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_FAILED_FOUR'){
    add(job('BY_ID','FAILED',4,'B2-RPT-CURRENT'));
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_FAILED_FIVE'){
    add(job('BY_ID','FAILED',5,'B2-RPT-CURRENT'));
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_FULL_REBUILD'){
    add(job('FULL_REBUILD','PENDING',0,''));output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_UNKNOWN'){
    add(job('UNKNOWN_OPERATION','PENDING',0,''));output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_LIMIT_ONE'){
    add(job('BY_ID','PENDING',0,'B2-RPT-CURRENT'));
    add(['B2-QUEUE-0002','2026-10-11 15:00:00','BY_ID',4,
      'B2-RPT-CURRENT','B2-USR-CURRENT','B2-NONCE-CURRENT','B2_TEST',0,'PENDING','','']);
    output=prosesAntreanPerbaikanIndexLaporan2B1(1);
  }else if(mode==='QUEUE_OWNER_DENIED'){
    state.ownerBlocked=true;add(job('BY_ID','PENDING',0,'B2-RPT-CURRENT'));
    try{prosesAntreanPerbaikanIndexLaporan2B1(1);}catch(e){output={stopCode:e.message};}
  }else if(mode==='ENQUEUE_ROW'){
    state.failSync=true;
    output=sinkronkanSatuRowIndexLaporan2B1_(4,'B2_SUBMIT_FAULT',{force:true});
  }else if(mode==='ENQUEUE_DUPLICATE'){
    state.failSync=true;
    var a=sinkronkanSatuRowIndexLaporan2B1_(4,'B2_SUBMIT_FAULT',{force:true});
    var b=sinkronkanSatuRowIndexLaporan2B1_(4,'B2_SUBMIT_FAULT',{force:true});
    output={first:a,second:b};
  }else if(mode==='ENQUEUE_FAILED_APPEND_CACHE'){
    state.failSync=true;state.failAppend=true;
    var first=sinkronkanSatuRowIndexLaporan2B1_(4,'B2_SUBMIT_FAULT',{force:true});
    state.failAppend=false;
    var second=sinkronkanSatuRowIndexLaporan2B1_(4,'B2_SUBMIT_FAULT',{force:true});
    output={first:first,second:second};
  }else throw new Error('B2_UNKNOWN_TEST_CASE');
  return {mode:mode,summary:output,queueRows:rows.slice(1).map(function(r){
    return {operation:r[2],rowRekap:r[3],reportId:r[4],attempts:r[8],status:r[9]};
  }),dispatch:state.dispatch,queueWrites:state.queueWrites,
    queueAppends:state.queueAppends,cacheWrites:state.cacheWrites,ownerBlocked:state.ownerBlocked,pureInMemory:true};
}

function phaB2EffectsInMemory_(recipientFails){
  var actions=[],Logger={log:function(){actions.push('WARNING');}};
  function logAI_(){actions.push('AI_LOG');}
  function logAudit_(user,action,target){actions.push('AUDIT:'+action+':'+target);}
  function tandaiDisposisiSudahDilaporkanInternal_(disposition,user,report){
    actions.push('RECIPIENT_ATTEMPT:'+report);
    if(recipientFails)throw new Error('B2_RECIPIENT_FAULT');
    actions.push('RECIPIENT_COMMITTED');
  }
  function logDisposisi_(disposition,action,user,detail){actions.push('DISPOSITION_LOG:'+action);}
function jalankanEfekSampingSubmitKinerja_(ctx, draft, evaluasi, lastRowIdx) {
  // Pekerjaan non-kritis dilakukan setelah lock final dilepas agar antrean submit
  // dan review admin tidak tertahan oleh audit/disposisi/log AI.
  if (ctx.aiAktif) {
    logAI_(ctx.idLaporan, evaluasi.promptAI, "", evaluasi.parsed.poin, "PENDING", lastRowIdx, "gemini-2.5-flash");
  }

  logAudit_(ctx.idUser, "SUBMIT_LAPORAN", ctx.idLaporan);

  if (draft.disposisiRef && draft.disposisiRef.idDisposisi) {
    try {
      tandaiDisposisiSudahDilaporkanInternal_(draft.disposisiRef.idDisposisi, ctx.idUser, ctx.idLaporan);
      logDisposisi_(draft.disposisiRef.idDisposisi, "BUAT_LAPORAN_DARI_DISPOSISI", ctx.idUser, "Laporan terkait: " + ctx.idLaporan);
    } catch (disErr) {
      Logger.log("Peringatan disposisi tidak ikut terbarui: " + disErr.message);
    }
  }
}
  jalankanEfekSampingSubmitKinerja_(
    {idUser:'B2-USR-SYNTH',idLaporan:'B2-RPT-SYNTH',aiAktif:false},
    {disposisiRef:{idDisposisi:'B2-DSP-SYNTH'}},{parsed:{poin:0}},4);
  return {actions:actions,auditLogged:actions.some(function(x){return x.indexOf('AUDIT:')===0;}),
    recipientCommitted:actions.indexOf('RECIPIENT_COMMITTED')>=0,
    dispositionLogged:actions.some(function(x){return x.indexOf('DISPOSITION_LOG:')===0;}),
    pureInMemory:true};
}

function phaB2GuardDecisionInMemory_(input){
function aceDsp004NormalizeIdRC1_(value) {
  return value===null||value===undefined?'':String(value).trim().toLowerCase();
}
function aceDsp004IndexDecisionRC1_(input) {
  input=input||{};
  var row=Number(input.rowRekap),target=Number(input.targetRow),
      actual=aceDsp004NormalizeIdRC1_(input.sourceId),
      expected=aceDsp004NormalizeIdRC1_(input.expectedId),
      candidate=aceDsp004NormalizeIdRC1_(input.indexId),
      pointerRaw=input.indexRowRekap,
      pointer=pointerRaw===''||pointerRaw===null||pointerRaw===undefined?0:Number(pointerRaw),
      exists=input.targetExists===true,
      dirty=!!(input.indexOwnerPresent||input.indexDispositionPresent||
        input.indexOtherMetadataPresent);
  if(!Number.isInteger(row)||row<2||!Number.isInteger(target)||target<2)
    return {safe:false,reason:'INVALID_ROW_POINTER'};
  if(!actual||!expected||actual!==expected)
    return {safe:false,reason:'REKAP_ID_CHANGED_OR_EXPECTED_ID_MISMATCH'};
  if(!exists)return {safe:true,reason:'NEW_INDEX_ROW'};
  if(!Number.isInteger(pointer)||pointer<0)
    return {safe:false,reason:'INDEX_POINTER_INVALID'};
  if(candidate&&candidate!==expected)
    return {safe:false,reason:'FOREIGN_REPORT_ID_COLLISION'};
  if(pointer&&pointer!==row)
    return {safe:false,reason:'INDEX_POINTER_COLLISION'};
  if(!candidate&&(pointer||dirty))
    return {safe:false,reason:'OCCUPIED_INDEX_ROW_MISSING_ID'};
  if(candidate&&!pointer)
    return {safe:false,reason:'EXISTING_INDEX_POINTER_EMPTY'};
  return {safe:true,reason:candidate?'SAME_REPORT_ID':'EMPTY_INDEX_ROW'};
}
  return aceDsp004IndexDecisionRC1_(input);
}

function validasiJalurProduksiB2RC1(){
  var checks=[];function ck(name,yes){checks.push({name:name,pass:yes===true});}
  var submit=phaB2SubmitInMemory_('IDEMPOTENT');
  ck('SUBMIT_VERBATIM_FIRST_COMMIT',submit.firstSuccess===true&&submit.appended===1&&submit.sourceRows===2);
  ck('SUBMIT_VERBATIM_REPEAT_NONCE_REJECTED',submit.repeatRejected===true&&submit.appended===1);
  ck('SUBMIT_LOCK_RELEASED',submit.lockAcquired&&submit.lockReleased);
  ck('SUBMIT_CUTOFF_DEPENDENCY_ADAPTED',submit.cutoffAdapterCalled===true);
  var invalid=phaB2SubmitInMemory_('INVALID_MARKER');
  ck('SUBMIT_INVALID_MARKER_BLOCKED',invalid.firstRejected===true&&invalid.appended===0);
  var denied=phaB2SubmitInMemory_('LOCK_DENIED');
  ck('SUBMIT_LOCK_DENIED',denied.firstRejected===true&&denied.appended===0);
  var fail=phaB2SubmitInMemory_('APPEND_EXCEPTION');
  ck('SUBMIT_APPEND_FAILURE_NO_SOURCE',fail.appended===0&&fail.lockReleased&&
    String(fail.exceptionCode).indexOf('B2_MOCK_APPEND_FAILED')>=0);
  var q=phaB2QueueInMemory_('QUEUE_EMPTY');
  ck('REAL_QUEUE_EMPTY',q.summary.diproses===0&&q.queueRows.length===0);
  q=phaB2QueueInMemory_('QUEUE_ROW_STALE');
  ck('REAL_ROW_REPLAY_CAN_MARK_DONE_WITHOUT_ORIGINAL_ID',
    q.queueRows[0].status==='DONE'&&q.queueRows[0].reportId===''&&
    q.dispatch.length===1&&q.summary.originalReportIdentityProved===false);
  ck('ROW_DISPATCH_CARRIES_ONLY_ROW_CONTEXT',q.dispatch[0].rowRekap===4&&
    q.dispatch[0].context==='B2_SOURCE_TRACE_ONLY'&&
    !Object.prototype.hasOwnProperty.call(q.dispatch[0],'idLaporan'));
  q=phaB2QueueInMemory_('QUEUE_BY_ID');
  ck('REAL_QUEUE_BY_ID_DISPATCH',q.queueRows[0].status==='DONE'&&q.dispatch.length===1);
  q=phaB2QueueInMemory_('QUEUE_BY_ID_MISSING');
  ck('REAL_QUEUE_BY_ID_MISSING_RETRY',q.queueRows[0].status==='RETRY'&&q.queueRows[0].attempts===1);
  q=phaB2QueueInMemory_('QUEUE_BY_NONCE');
  ck('REAL_QUEUE_BY_NONCE_DISPATCH',q.queueRows[0].status==='DONE'&&q.dispatch.length===1);
  q=phaB2QueueInMemory_('QUEUE_FAILED_FOUR');
  ck('REAL_FAILED_WITH_FOUR_ATTEMPTS_REPLAYED',q.queueRows[0].status==='DONE'&&q.queueRows[0].attempts===5);
  q=phaB2QueueInMemory_('QUEUE_FAILED_FIVE');
  ck('REAL_FAILED_MAX_ATTEMPTS_SKIPPED',q.queueRows[0].status==='FAILED'&&q.queueRows[0].attempts===5&&q.summary.diproses===0);
  q=phaB2QueueInMemory_('QUEUE_FULL_REBUILD');
  ck('REAL_FULL_REBUILD_MANUAL',q.queueRows[0].status==='NEED_REBUILD'&&q.summary.perluRebuild===1);
  q=phaB2QueueInMemory_('QUEUE_UNKNOWN');
  ck('REAL_UNKNOWN_OPERATION_RETRY',q.queueRows[0].status==='RETRY'&&q.summary.gagal===1);
  q=phaB2QueueInMemory_('QUEUE_LIMIT_ONE');
  ck('REAL_QUEUE_LIMIT_HONORED',q.queueRows[0].status==='DONE'&&q.queueRows[1].status==='PENDING'&&q.summary.diproses===1);
  q=phaB2QueueInMemory_('QUEUE_OWNER_DENIED');
  ck('REAL_QUEUE_OWNER_GATE',q.summary.stopCode==='B2_OWNER_AUTH_STOP'&&q.dispatch.length===0);
  q=phaB2QueueInMemory_('ENQUEUE_ROW');
  ck('REAL_ENQUEUE_ROW_MISSING_REPORT_ID',q.queueRows.length===1&&q.queueRows[0].operation==='ROW'&&
    q.queueRows[0].reportId===''&&q.queueRows[0].status==='PENDING');
  q=phaB2QueueInMemory_('ENQUEUE_DUPLICATE');
  ck('REAL_QUEUE_CACHE_DEDUP',q.queueRows.length===1&&q.queueAppends===1&&q.cacheWrites===1);
  q=phaB2QueueInMemory_('ENQUEUE_FAILED_APPEND_CACHE');
  ck('REAL_CACHE_PREWRITE_CAN_SUPPRESS_RETRY',q.queueRows.length===0&&q.queueAppends===0&&q.cacheWrites===1);
  var effects=phaB2EffectsInMemory_(false);
  ck('REAL_EFFECTS_ORDER_AUDIT_BEFORE_RECIPIENT',effects.auditLogged&&effects.recipientCommitted&&effects.dispositionLogged&&
    effects.actions.findIndex(function(x){return x.indexOf('AUDIT:')===0;})<
      effects.actions.findIndex(function(x){return x.indexOf('RECIPIENT_ATTEMPT:')===0;}));
  effects=phaB2EffectsInMemory_(true);
  ck('REAL_RECIPIENT_FAILURE_LEAVES_AUDIT_ONLY',effects.auditLogged&&!effects.recipientCommitted&&
    !effects.dispositionLogged);
  var safe={rowRekap:4,targetRow:4,sourceId:'B2-RPT-4',expectedId:'B2-RPT-4',
    targetExists:true,indexId:'B2-RPT-4',indexRowRekap:4,indexOwnerPresent:true};
  ck('REAL_GUARD_SAME_ID_ALLOWED',phaB2GuardDecisionInMemory_(safe).safe===true);
  ck('REAL_GUARD_FOREIGN_ID_BLOCKED',phaB2GuardDecisionInMemory_(Object.assign({},safe,
    {indexId:'B2-RPT-FOREIGN'})).reason==='FOREIGN_REPORT_ID_COLLISION');
  ck('REAL_GUARD_POINTER_COLLISION_BLOCKED',phaB2GuardDecisionInMemory_(Object.assign({},safe,
    {indexRowRekap:5})).reason==='INDEX_POINTER_COLLISION');
  ck('B2_WRITE_DISABLED',PHA07B_B2_WRITE_ENABLED===false);
  ck('B2_DISTINCT_SHEET_TITLE',PHA07B_B2_TITLE==='SANDBOX_PHA07B_B2_ISOLATED_PRODUCTION_PATH');
  var failed=checks.filter(function(c){return !c.pass;});
  var out={sukses:failed.length===0,versi:PHA07B_B2_VERSION,
    lulus:checks.length-failed.length,gagal:failed.length,checks:checks,
    codeOrigin:'PINNED_VERBATIM_CANDIDATE_WITH_IN_MEMORY_DEPENDENCY_ADAPTERS',
    inMemoryOnly:true,spreadsheetAccessed:false,
    productionHandlersFullyIntegrated:false,productionDataWritten:false};
  Logger.log('PHA07B_B2_SOURCE_PATH_VALIDATION '+JSON.stringify(out));return out;
}
function diagnostikLingkunganB2PHA07BRC1(){
  var out={sukses:false,versi:PHA07B_B2_VERSION,mode:'READ_ONLY',
    codePinned:true,copyIdentityVerified:false,baselineConsistent:false,
    queueEmpty:false,scenarioBaseline:false,scratchEmpty:false,
    noVisibleTriggers:false,writeEnabled:PHA07B_B2_WRITE_ENABLED,
    productionDataWritten:false,productionPathLiveSheetsTested:false,
    productionRolloutAuthorized:false};
  try{
    phaB2Assert_(PHA07B_B2_WRITE_ENABLED===false,'WRITE_FLAG_MUST_REMAIN_FALSE');
    phaB2Assert_(ScriptApp.getProjectTriggers().length===0,'VISIBLE_TRIGGERS_PRESENT');
    var ss=SpreadsheetApp.openById(PHA07B_B2_SHEET_ID);
    phaB2Assert_(ss.getId()===PHA07B_B2_SHEET_ID,'WRONG_SHEET_ID');
    phaB2Assert_(ss.getName()===PHA07B_B2_TITLE,'WRONG_TITLE');
    var tabs=['MULAI_DI_SINI','SKENARIO_B0','Rekap_Kinerja','Index_Laporan',
      'Index_Laporan_Sync_Queue','Disposisi_Surat','Disposisi_Penerima',
      'Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0'];
    phaB2Assert_(ss.getSheets().length===tabs.length,'TAB_COUNT');
    tabs.forEach(function(x){phaB2Assert_(!!ss.getSheetByName(x),'MISSING_'+x);});
    var first=ss.getSheetByName('MULAI_DI_SINI');
    phaB2Assert_(first.getRange('A4').getValue()==='SYNTHETIC_ONLY_NO_PRODUCTION_DATA','SYNTHETIC_MARKER');
    phaB2Assert_(first.getRange('A5').getValue()==='STAGE_B2_PRODUCTION_PATH_ISOLATED','WRONG_STAGE');
    phaB2Assert_(first.getRange('A8').getValue()==='B2_ALL_WRITES_NOT_AUTHORIZED','UNAUTHORIZED_WRITER');
    var counts={Rekap_Kinerja:3,Index_Laporan:3,Index_Laporan_Sync_Queue:1,
      Disposisi_Surat:2,Disposisi_Penerima:2,Audit_Log:3,Disposisi_Log:2,
      EVENT_JOURNAL_B0:1,SKENARIO_B0:16};
    Object.keys(counts).forEach(function(x){
      phaB2Assert_(ss.getSheetByName(x).getLastRow()===counts[x],'ROW_COUNT_'+x);
    });
    var report=ss.getSheetByName('Rekap_Kinerja'),
      index=ss.getSheetByName('Index_Laporan'),
      audit=ss.getSheetByName('Audit_Log');
    for(var i=0;i<2;i++){
      var r=i+2,id='B0-RPT-000'+(i+1);
      phaB2Assert_(report.getRange(r,19).getValue()===id &&
        index.getRange(r,1).getValue()===id &&
        Number(index.getRange(r,2).getValue())===r &&
        report.getRange(r,20).getValue()===index.getRange(r,3).getValue()&&
        report.getRange(r,22).getValue()===index.getRange(r,10).getValue(),
        'SOURCE_INDEX_'+i);
      phaB2Assert_(audit.getRange(r,3).getValue()==='SUBMIT_LAPORAN'&&
        audit.getRange(r,4).getValue()===id,'AUDIT_'+i);
    }
    phaB2Assert_(ss.getSheetByName('Disposisi_Penerima').getRange('H2').getValue()==='B0-RPT-0001'&&
      ss.getSheetByName('Disposisi_Log').getRange('K2').getValue()==='B0-RPT-0001',
      'DISPOSITION_BASELINE');
    var blank=[
      ['Rekap_Kinerja',4,1,1,71],['Index_Laporan',4,1,1,12],
      ['Index_Laporan_Sync_Queue',2,1,1,12],
      ['Disposisi_Surat',3,1,1,25],
      ['Disposisi_Penerima',3,1,1,12],
      ['Audit_Log',4,1,2,4],['Disposisi_Log',3,1,1,14],
      ['EVENT_JOURNAL_B0',2,1,1,11]
    ];
    blank.forEach(function(d){
      var range=ss.getSheetByName(d[0]).getRange(d[1],d[2],d[3],d[4]);
      var v=range.getValues(),f=range.getFormulas();
      phaB2Assert_(v.every(function(row){return row.every(function(cell){return cell===''||cell===null;});})&&
        f.every(function(row){return row.every(function(cell){return !cell;});}),
        'SCRATCH_DIRTY_'+d[0]);
    });
    var scenarios=ss.getSheetByName('SKENARIO_B0').getRange(2,6,15,1).getValues();
    phaB2Assert_(scenarios.every(function(x){return x[0]==='PENDING';}),
      'SCENARIOS_CHANGED');
    out.sukses=true;out.copyIdentityVerified=true;out.baselineConsistent=true;
    out.queueEmpty=true;out.scenarioBaseline=true;out.scratchEmpty=true;
    out.noVisibleTriggers=true;
  }catch(e){
    var x=String(e&&e.message||'UNKNOWN');
    out.stopCode=(x.indexOf('PHA07B_B2_STOP_')===0?x:'PHA07B_B2_STOP_UNEXPECTED_READ').slice(0,160);
  }
  Logger.log('PHA07B_B2_PREFLIGHT '+JSON.stringify(out));return out;
}
