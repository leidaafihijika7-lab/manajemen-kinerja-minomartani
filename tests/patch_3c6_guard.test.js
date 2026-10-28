/* eslint-disable no-new-func */
/**
 * Patch 3C-6 regression checks: run with
 *   node tests/patch_3c6_guard.test.js
 *
 * Runs functions extracted from the exact Kode.gs file using in-memory
 * Spreadsheet mocks. DOES NOT connect to Google Apps Script or Sheets.
 */
function runTests(code) {
  const assert = require('assert');
  const names = [
    'ambilAnchorPeriodeIndex3C6_',
    'bacaAnchorIndexUntukRebuild3C6_',
    'buatBarisIndexLaporan2B0_',
    'cekKonsistensiSumberIndexReadOnly3C6_',
    'cekKesehatanRinganReadRiwayatIndex2B2A_',
    'ambilDataRekapKlasemenFastCached_'
  ];
  function extract(name) {
    const a = code.indexOf('function ' + name + '(');
    if (a < 0) throw Error('SOURCE_NOT_FOUND: ' + name);
    const b = code.indexOf('\nfunction ', a + 10);
    return code.slice(a, b >= 0 ? b : undefined);
  }
  const body = names.map(extract).join('\n');
  const HEADERS = [
    'ID_LAPORAN','ROW_REKAP','ID_USER','TANGGAL_LAPORAN','PERIODE_RESMI',
    'KATEGORI','STATUS_REVIEW','POIN_FINAL','ID_DISPOSISI','NONCE',
    'TERAKHIR_DIUBAH','INDEX_VERSION'
  ];
  const M = Object.fromEntries(HEADERS.map((h, i) => [h, i]));
  const C = {
    TANGGAL_LAPORAN: 0, KATEGORI: 3, STATUS_REVIEW: 8,
    POIN_FINAL: 9, ID_LAPORAN: 18, ID_USER: 19,
    NONCE: 24, ID_DISPOSISI: 26
  };
  const state = {
    write: false, read: true, cutoff: true, queueDirty: false,
    circuit: false, headers: HEADERS.slice(), src: [], idx: [],
    cachedResult: [{nama:'FROM_CACHE', totalPoin:125}], actualCalls:0
  };
  const sheet = (which) => ({
    getLastRow: () => state[which].length + 1,
    getRange: (row) => ({getValues: () =>
      row === 1 ? [state.headers.slice()] : state[which].map(x => x.slice())})
  });
  const ss = {
    getSheetByName: name => name === 'Rekap_Kinerja' ? sheet('src') :
      name === 'Index_Laporan' ? sheet('idx') : null
  };
  const normalize = value => String(value || '').trim();
  const date = value => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(String(value).replace(' ','T'));
    return isNaN(d.getTime()) ? null : d;
  };
  const cache = {
    get: () => JSON.stringify(state.cachedResult),
    put: () => {}
  };
  const defs = {
    SHEET_COLUMNS:{REKAP_KINERJA:C},
    INDEX_LAPORAN_2B0_CONFIG:{HEADERS, SHEET_NAME:'Index_Laporan', VERSION:'TEST'},
    getIndexLaporanColumnMap2B0_:()=>M,
    normalizeId_: normalize,
    tanggalValidIndexLaporan2B0_:date,
    periodePelaporanResmiDariTanggalV36_:()=> '2026-10',
    daftarTutupPeriodeLaporanResmiV36_:()=>state.cutoff?[{periode:'2026-09'}]:[],
    tanggalTerakhirDiubahIndexLaporan2B0_:()=>new Date(),
    dualWriteIndexLaporanAktif2B1_:()=>state.write,
    pastikanHeaderIndexReadRiwayat2B2A_:()=>true,
    hitungStatusQueueIndexLaporan2B1_:()=>({
      pending:Number(state.queueDirty),gagal:0,perluRebuild:0
    }),
    getSS_:()=>ss,
    getSheet_:()=>sheet('src'),
    readRiwayatIndexAktif2B2A_:()=>state.read,
    bacaCircuitReadRiwayat2B2A_:()=>({aktif:state.circuit}),
    CacheService:{getScriptCache:()=>cache},
    kunciCacheKlasemenFast3C5_:()=> 'cacheKey',
    periodeKinerjaAktifUntukLaporanWajibV34_:()=> '2026-10',
    ambilDataRekapKlasemenFast_:()=>{state.actualCalls++;return [{nama:'COMPUTED'}]}
  };
  const keys=Object.keys(defs);
  const fns = new Function(...keys, body +
    '\nreturn {' + names.join(',') + '};')(...keys.map(k=>defs[k]));
  const source=()=>{
    const r=Array(27).fill('');
    r[0]=new Date('2026-09-25T14:00:00+07:00');
    r[3]='TUGAS';r[8]='Disetujui';r[9]=5;
    r[18]='report-1';r[19]='employee-1';
    return r;
  };
  const historic=()=>[
    'report-1',2,'employee-1',new Date('2026-09-25T17:20:00+07:00'),
    '2026-09','TUGAS','Disetujui',5,'','','','TEST'
  ];
  const tests=[];
  const test=(name, fn)=>{ try {fn();tests.push({name,pass:true})}
    catch(e){tests.push({name,pass:false,error:e.message})} };
  const reset=()=>{
    state.write=false;state.read=true;state.cutoff=true;
    state.queueDirty=false;state.circuit=false;
    state.headers=HEADERS.slice();state.src=[source()];state.idx=[historic()];
    state.actualCalls=0;
  };
  const rejects=(pattern,fn)=>{
    assert.throws(fn,pattern);
  };
  reset();
  test('historical period stays September',()=>{
    const x=fns.buatBarisIndexLaporan2B0_(state.src[0],2,state.idx[0]);
    assert.equal(x[4],'2026-09')
  });
  test('original submission time stays immutable',()=>{
    const x=fns.buatBarisIndexLaporan2B0_(state.src[0],2,state.idx[0]);
    assert.equal(x[3].getTime(),state.idx[0][3].getTime())
  });
  test('review status can change without changing period',()=>{
    state.src[0][8]='Ditolak';
    const x=fns.buatBarisIndexLaporan2B0_(state.src[0],2,state.idx[0]);
    assert.equal(x[6],'Ditolak');assert.equal(x[4],'2026-09');
    state.src[0][8]='Disetujui'
  });
  test('different report id rejected',()=>{
    const bad=historic();bad[0]='wrong';
    rejects(/IDENTITAS_BERUBAH/,()=>fns.buatBarisIndexLaporan2B0_(state.src[0],2,bad));
  });
  test('different employee id rejected',()=>{
    const bad=historic();bad[2]='other';
    rejects(/IDENTITAS_BERUBAH/,()=>fns.buatBarisIndexLaporan2B0_(state.src[0],2,bad));
  });
  test('invalid period rejected',()=>{
    const bad=historic();bad[4]='2026-13';
    rejects(/TIDAK_VALID/,()=>fns.buatBarisIndexLaporan2B0_(state.src[0],2,bad));
  });
  test('new append uses configured period',()=>{
    assert.equal(fns.buatBarisIndexLaporan2B0_(state.src[0],3,null)[4],'2026-10');
  });
  test('new append without cutoff config rejected',()=>{
    state.cutoff=false;
    rejects(/TANPA_KONFIGURASI/,()=>fns.buatBarisIndexLaporan2B0_(state.src[0],3,null));
    state.cutoff=true
  });
  test('healthy with write disabled',()=>{
    const r=fns.cekKesehatanRinganReadRiwayatIndex2B2A_();
    assert.equal(r.valid,true);assert.equal(r.dualWriteAktif,false)
  });
  test('stale final points rejected',()=>{
    state.idx[0][7]=99;
    assert.match(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,/SUMBER_BERBEDA/);
    state.idx[0][7]=5
  });
  test('stale review status rejected',()=>{
    state.src[0][8]='Ditolak';
    assert.match(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,/SUMBER_BERBEDA/);
    state.src[0][8]='Disetujui'
  });
  test('bad index period rejected',()=>{
    state.idx[0][4]='2026-00';
    assert.match(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,/ANCHOR_TIDAK_VALID/);
    state.idx[0][4]='2026-09'
  });
  test('bad header rejected even if cached header passed',()=>{
    state.headers[4]='PERIODE_PALSU';
    assert.equal(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,'INDEX_HEADER_BERUBAH');
    state.headers=HEADERS.slice()
  });
  test('duplicate report IDs rejected',()=>{
    state.src.push(source());state.idx.push([...historic()]);
    state.idx[1][1]=3;
    assert.match(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,/ID_DUPLIKAT/);
    state.src.pop();state.idx.pop()
  });
  test('dirty sync queue rejected',()=>{
    state.queueDirty=true;
    assert.equal(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,'QUEUE_TIDAK_BERSIH');
    state.queueDirty=false
  });
  test('missing report in index rejected',()=>{
    state.idx=[];
    assert.equal(fns.cekKesehatanRinganReadRiwayatIndex2B2A_().alasan,'JUMLAH_BARIS_TIDAK_SAMA');
    state.idx=[historic()]
  });
  test('rebuild without historical index rejected',()=>{
    state.idx=[];
    rejects(/REBUILD_DITOLAK/,()=>fns.bacaAnchorIndexUntukRebuild3C6_());
    state.idx=[historic()]
  });
  test('rebuild with valid anchors reads immutable period',()=>{
    assert.equal(
      fns.ambilAnchorPeriodeIndex3C6_(fns.bacaAnchorIndexUntukRebuild3C6_().anchors[2],
        'report-1','employee-1',2).periode,'2026-09')
  });
  test('cached result accessible when healthy',()=>{
    assert.equal(fns.ambilDataRekapKlasemenFastCached_()[0].nama,'FROM_CACHE');
  });
  test('stale points block even previously populated cache',()=>{
    state.idx[0][7]=999;
    rejects(/INDEX_UNAVAILABLE/,()=>fns.ambilDataRekapKlasemenFastCached_());
    state.idx[0][7]=5
  });
  test('open circuit blocks cached data',()=>{
    state.circuit=true;
    rejects(/CIRCUIT_AKTIF/,()=>fns.ambilDataRekapKlasemenFastCached_());
    state.circuit=false
  });
  test('disabled index read blocks cached data',()=>{
    state.read=false;
    rejects(/READ_NONAKTIF/,()=>fns.ambilDataRekapKlasemenFastCached_());
    state.read=true
  });
  const failed=tests.filter(t=>!t.pass);
  return {total:tests.length,passed:tests.length-failed.length,failed,tests};
}
if (typeof module !== 'undefined') module.exports={runTests};
if (typeof require !== 'undefined' && typeof module !== 'undefined' &&
    require.main === module) {
  const fs=require('fs');
  const path=require('path');
  const code=fs.readFileSync(path.join(__dirname,'..','Kode.gs'),'utf8');
  const result=runTests(code);
  for(const t of result.tests) console.log((t.pass?'PASS':'FAIL')+' '+t.name+(t.error?' — '+t.error:''));
  console.log(result.passed+'/'+result.total+' passed');
  if(result.failed.length) process.exitCode=1;
}