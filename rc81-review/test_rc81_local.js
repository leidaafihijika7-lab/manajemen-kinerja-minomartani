'use strict';
const fs=require('fs'), vm=require('vm'),assert=require('assert');
const MODULE=fs.readFileSync(__dirname+'/RC81_TypeSafeStorageValidation.gs','utf8');
const ID='1Ub4d0brD-JcAokxysGFQM1rBc0cbewvGgGWPwagQqOM';
const INDEX_VERSION='2B0.2-2026.06.27.08';
const clone=x=>x instanceof Date?new Date(x.getTime()):x && typeof x==='object'?Array.isArray(x)?x.map(clone):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,clone(v)])):x;
class MockRange {
  constructor(sheet,row,col,rows=1,cols=1){this.s=sheet;this.r=row;this.c=col;this.h=rows;this.w=cols;}
  fromEach(fn){return Array.from({length:this.h},(_,i)=>Array.from({length:this.w},(_,j)=>fn(this.s.getCell(this.r+i,this.c+j),this.r+i,this.c+j)));}
  getValues(){return this.fromEach(x=>clone(x.value??''));}
  getValue(){return this.getValues()[0][0];}
  getDisplayValues(){return this.fromEach(x=>x.value instanceof Date?x.value.toISOString():String(x.value??''));}
  getNumberFormats(){return this.fromEach(x=>x.format||'General');}
  getFormulas(){return this.fromEach(x=>x.formula||'');}
  getNotes(){return this.fromEach(x=>x.note||'');}
  getDataValidations(){return this.fromEach(x=>x.validation||null);}
  getCell(i,j){return new MockRange(this.s,this.r+i-1,this.c+j-1);}
  getSheet(){return this.s;}
  setValues(data){assert.strictEqual(data.length,this.h);data.forEach((row,i)=>{assert.strictEqual(row.length,this.w);row.forEach((v,j)=>this.s.setCell(this.r+i,this.c+j,this.convert(v,this.s.getCell(this.r+i,this.c+j))));});return this;}
  convert(v,orig){let cell=clone(orig);cell.value=clone(v);if(typeof v==='string' && cell.format!=='@' && /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d):(\d\d):(\d\d))?$/.test(v) && /^\d\d\d\d-/.test(v)){
    const m=v.match(/^(\d{4})-(\d\d)-(\d\d)(?: (\d\d):(\d\d):(\d\d))?$/);
    if(m){cell.value=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0)-7,+(m[5]||0),+(m[6]||0)));cell.format='DATE_TIME';}
  }
  return cell;}
  setValue(v){return this.setValues([[v]]);}
  setNumberFormat(fmt){for(let i=0;i<this.h;i++)for(let j=0;j<this.w;j++){const t=this.s.getCell(this.r+i,this.c+j);t.format=fmt;this.s.setCell(this.r+i,this.c+j,t);}return this;}
  copyTo(target,pasteType,transpose){assert.strictEqual(pasteType,'PASTE_NORMAL');assert.strictEqual(transpose,false);assert.strictEqual(target.h,this.h);assert.strictEqual(target.w,this.w);
    const saved=this.fromEach(x=>clone(x));for(let i=0;i<this.h;i++)for(let j=0;j<this.w;j++)target.s.setCell(target.r+i,target.c+j,saved[i][j]);return this;
  }
}
let SHEETID=1000;
class MockSheet {
  constructor(name,cols=80){this.name=name;this.id=SHEETID++;this.maxCols=cols;this.cells=new Map();this.hidden=false;}
  getName(){return this.name;}getSheetId(){return this.id;}getMaxColumns(){return this.maxCols;}
  insertColumnsAfter(_,howMany){this.maxCols+=howMany;}hideSheet(){this.hidden=true;}
  getCell(r,c){return clone(this.cells.get(`${r}:${c}`)||{});}
  setCell(r,c,cell){if(cell.value!==undefined && cell.value!==null && cell.value!=='' || cell.format||cell.note||cell.formula||cell.validation)this.cells.set(`${r}:${c}`,clone(cell));else this.cells.delete(`${r}:${c}`);}
  put(r,c,v){this.setCell(r,c,{value:clone(v)});}
  getRange(a,b,h=1,w=1){if(typeof a==='string'){
    const m=a.match(/^([A-Z]+)(\d+)$/);if(!m)throw Error('BAD_A1 '+a);
    let col=0;for(const l of m[1])col=col*26+(l.charCodeAt(0)-64);return new MockRange(this,+m[2],col);
  }return new MockRange(this,a,b,h,w);}
  getLastRow(){let max=0;for(const [key,x] of this.cells){if(x.value!==undefined&&x.value!==null&&x.value!=='' || x.formula){max=Math.max(max,+key.split(':')[0]);}}return max;}
  getLastColumn(){let max=0;for(const [key,x] of this.cells){if(x.value!==undefined&&x.value!==null&&x.value!==''||x.formula)max=Math.max(max,+key.split(':')[1]);}return max;}
  appendRow(row){const n=this.getLastRow()+1;row.forEach((x,j)=>this.getRange(n,j+1).setValue(x));return this;}
}
class MockSpreadsheet {
  constructor(){this.id=ID;this.sheets=[];}getId(){return this.id;}getSheets(){return this.sheets.slice();}
  getSheetByName(name){return this.sheets.find(x=>x.name===name)||null;}
  add(name,cols=80){let s=new MockSheet(name,cols);this.sheets.push(s);return s;}
  insertSheet(name){if(this.getSheetByName(name))throw Error('DUPLICATE_SHEET');return this.add(name,26);}
  deleteSheet(s){this.sheets=this.sheets.filter(x=>x!==s);}
}
class MockProps {constructor(){this.map=new Map();}getProperty(k){return this.map.has(k)?this.map.get(k):null;}setProperty(k,v){this.map.set(k,String(v));}deleteProperty(k){this.map.delete(k);}}
function makeContext(){
  const p=new MockProps();const ss=new MockSpreadsheet();
  p.setProperty('RC81_STAGING_MODE','true');p.setProperty('SPREADSHEET_ID',ID);
  p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','false');p.setProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED','false');p.setProperty('RC81_WRITE_DRILL_ENABLED','false');
  const control=ss.add('MULAI_DI_SINI',30);control.put(5,1,'STAGE_RC81_TYPESAFE_DISPOSABLE');control.put(8,1,'RC81_DISPOSABLE_WRITES_REQUIRE_EXPLICIT_OPT_IN');control.put(16,2,ID);
  const source=ss.add('Rekap_Kinerja');const index=ss.add('Index_Laporan');const audit=ss.add('Audit_Log');const queue=ss.add('Index_Laporan_Sync_Queue');
  let sh=['Waktu Lapor','Nama','Jabatan','Kategori','Deskripsi','Bukti','Poin','Alasan','Status','Poin Final','Dasar','URL','Nama Kegiatan','Tanggal Kegiatan','Lokasi','Penyelenggara','Peran','Catatan','ID','USER','Waktu Review','NONCE','Revisi','Waktu Revisi','Diedit Oleh','Payload','ID Disposisi','Nomor','Jenis'];
  sh.forEach((x,i)=>source.put(1,i+1,x));
  ['ID_LAPORAN','ROW_REKAP','ID_USER','TANGGAL_LAPORAN','PERIODE_RESMI','KATEGORI','STATUS_REVIEW','POIN_FINAL','ID_DISPOSISI','NONCE','TERAKHIR_DIUBAH','INDEX_VERSION'].forEach((x,i)=>index.put(1,i+1,x));
  ['WAKTU','ID_USER','AKSI','DETAIL'].forEach((x,i)=>audit.put(1,i+1,x));
  ['QUEUE_ID','WAKTU','OPERATION','ROW_REKAP','ID_LAPORAN','ID_USER','NONCE','CONTEXT','ATTEMPTS','STATUS','LAST_ERROR','DIPROSES_PADA'].forEach((x,i)=>queue.put(1,i+1,x));
  const dates=['2026-10-11 09:00:00','2026-10-11 09:15:00'];
  for(let i=0;i<2;i++){
    const r=i+2;
    source.put(r,1,dates[i]);source.put(r,4,'Kegiatan Uji B0');source.put(r,5,'Laporan sintetis');
    source.put(r,9,i?'Disetujui':'Menunggu Review');source.put(r,10,i?3:0);
    source.put(r,14,'2026-10-11');source.put(r,19,'B0-RPT-000'+(i+1));source.put(r,20,'B0-USR-000'+(i+1));source.put(r,22,'B0-NONCE-000'+(i+1));source.put(r,23,0);
    if(!i)source.put(r,27,'B0-DSP-0001');
    ['B0-RPT-000'+(i+1),r,'B0-USR-000'+(i+1),dates[i],'2026-10','Kegiatan Uji B0',i?'Disetujui':'Menunggu Review',i?3:0,i?'':'B0-DSP-0001','B0-NONCE-000'+(i+1),dates[i],INDEX_VERSION]
      .forEach((v,j)=>{if(v!=='')index.put(r,j+1,v);});
    audit.put(r,1,dates[i]);audit.put(r,2,'B0-USR-000'+(i+1));audit.put(r,3,'SUBMIT_LAPORAN');audit.put(r,4,'B0-RPT-000'+(i+1));
  }
  let uid=0, locks=0;
  const C={TANGGAL_LAPORAN:0,KATEGORI:3,DESKRIPSI:4,STATUS_REVIEW:8,POIN_FINAL:9,CATATAN_ADMIN:17,ID_LAPORAN:18,ID_USER:19,WAKTU_REVIEW_ADMIN:20,NONCE:21,REVISI_KE:22,TERAKHIR_DIREVISI_PADA:23,ID_DISPOSISI:26};
  function showDate(v){return v instanceof Date?`${v.getUTCFullYear()}-${String(v.getUTCMonth()+1).padStart(2,'0')}-${String(v.getUTCDate()).padStart(2,'0')} ${String(v.getUTCHours()+7).padStart(2,'0')}:${String(v.getUTCMinutes()).padStart(2,'0')}:00`:String(v||'');}
  function canonicalDate(a,b,c){const candidates=[a,b,c].filter(Boolean).map(v=>v instanceof Date?v.getTime():Date.parse(v.replace(' ','T')+'+07:00'));let max=Math.max(...candidates);return Number.isFinite(max)?new Date(max):'';}
  function buildIndex(row,n){const latest=canonicalDate(row[23],row[20],row[0]);return [row[18],n,row[19],row[0],showDate(row[0]).slice(0,7),row[3],row[8],row[9],row[26]||'',row[21],latest,INDEX_VERSION];}
  function sameRow(a,b){const norm=v=>v instanceof Date?showDate(v):String(v??'');return a.length===b.length&&a.every((v,i)=>norm(v)===norm(b[i]));}
  const ctx={Object,Date,JSON,String,Number,Array,Error,console:{log(){}},
    RC81_TEST_SOURCE_ID:ID,
    PropertiesService:{getScriptProperties:()=>p},
    SpreadsheetApp:{CopyPasteType:{PASTE_NORMAL:'PASTE_NORMAL'},flush(){},openById:()=>ss},
    ScriptApp:{getProjectTriggers:()=>[]},Utilities:{getUuid:()=>`test-uuid-${++uid}`},
    LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},releaseLock:()=>{locks--;}})},
    getSS_:()=>ss,
    SHEET_COLUMNS:{REKAP_KINERJA:C},
    INDEX_LAPORAN_2B0_CONFIG:{HEADERS:Array(12).fill(null),METADATA_PROPERTY:'INDEX_META'},
    INDEX_LAPORAN_2B1_CONFIG:{LAST_SYNC_PROPERTY:'INDEX_LAST_SYNC'},
    rc7Source_:(book,n)=>{let row=book.getSheetByName('Rekap_Kinerja').getRange(n,1,1,29).getValues()[0];let t={idLaporan:row[18],idUser:row[19],nonce:row[21]};if(!t.idLaporan||!t.idUser||!t.nonce)throw Error('BAD_TRIPLE');return {row, rowRekap:n,triple:t};},
    buatBarisIndexLaporan2B0_:buildIndex,
    bedaBarisIndexLaporan2B0_:(exp,act)=>sameRow(exp,act)?[]:[{kolom:'INDEX',expected:exp,actual:act}],
    rc7WriteIndexLocked_:(book,src,context)=>{
      const ind=book.getSheetByName('Index_Laporan'), n=src.rowRekap,exp=buildIndex(src.row,n);
      const now=ind.getRange(n,1,1,12).getValues()[0];const equal=sameRow(exp,now);
      if(!equal){ // Mock "Native index writing" updates typed dates and formats.
        exp.forEach((v,j)=>ind.getRange(n,j+1).setNumberFormat(j===3||j===10?'yyyy-mm-dd hh:mm:ss':j===4?'@':'@'));
        ind.getRange(n,1,1,12).setValues([exp]);
        p.setProperty('INDEX_META',JSON.stringify({context,sourceRows:book.getSheetByName('Rekap_Kinerja').getLastRow()}));
        p.setProperty('INDEX_LAST_SYNC',JSON.stringify({context}));
      }
      return {rowIndex:n,indexWritten:!equal};
    }
  };
  // Adjust row 2/3 mock index to actual RC7 projected Dates for parity.
  for(let i=0;i<2;i++){
    const r=i+2;const src=source.getRange(r,1,1,29).getValues()[0];
    // Keep text dates in fixtures; comparator accepts normalized semantic match.
  }
  vm.createContext(ctx);vm.runInContext(MODULE,ctx,{filename:'RC81_TypeSafeStorageValidation.gs'});
  return {ctx,ss,p,source,index,audit,queue,get locks(){return locks}};
}
let pass=0,fail=[];
function test(name,fn){try{fn();pass++;process.stdout.write(`PASS ${String(pass).padStart(2,'0')} ${name}\n`);}catch(e){fail.push({name,error:String(e.stack||e)});process.stdout.write(`FAIL ${name}: ${e.message}\n`);}}
function raises(fn,substr){assert.throws(fn,e=>String(e.message).includes(substr));}
// Local unit tests run entirely in memory. Real Sheets PASTE_NORMAL has been tested separately.
test('module parses in V8 and constants identify RC8.1 only',()=>{const a=makeContext();assert(a.ctx.RC81_STAGE_.ID===ID);});
test('baseline preflight returns PASS with zero writes',()=>{const a=makeContext();const r=a.ctx.rc81ReadOnlyPreflightV1();assert.strictEqual(r.status,'RC81_PREFLIGHT_PASS');assert.strictEqual(r.writesPerformed,0);});
test('preflight blocks missing staging mode',()=>{const a=makeContext();a.p.deleteProperty('RC81_STAGING_MODE');raises(()=>a.ctx.rc81ReadOnlyPreflightV1(),'STAGING_PROPERTIES_MISMATCH');});
test('preflight blocks incorrect Spreadsheet ID',()=>{const a=makeContext();a.p.setProperty('SPREADSHEET_ID','production-danger');raises(()=>a.ctx.rc81ReadOnlyPreflightV1(),'STAGING_PROPERTIES_MISMATCH');});
test('preflight blocks RC8 original mode',()=>{const a=makeContext();a.p.setProperty('RC8_STAGING_MODE','true');raises(()=>a.ctx.rc81ReadOnlyPreflightV1(),'STAGING_PROPERTIES_MISMATCH');});
test('preflight blocks dual-write enabled',()=>{const a=makeContext();a.p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','true');raises(()=>a.ctx.rc81ReadOnlyPreflightV1(),'PRODUCTION_FLAGS_MUST_REMAIN_OFF');});
test('preflight blocks replay enabled',()=>{const a=makeContext();a.p.setProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED','true');raises(()=>a.ctx.rc81ReadOnlyPreflightV1(),'PRODUCTION_FLAGS_MUST_REMAIN_OFF');});
test('preflight blocks active write flag',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');assert(a.ctx.rc81ReadOnlyPreflightV1().issues.includes('WRITE_OPT_IN_STILL_ACTIVE'));});
test('write matrix requires explicit opt-in',()=>{const a=makeContext();raises(()=>a.ctx.rc81RunTypeSafeMatrixV1(),'EXPLICIT_WRITE_OPT_IN_REQUIRED');});
test('preflight rejects source date changed to Date object',()=>{const a=makeContext();a.source.put(2,1,new Date('2026-10-11T02:00:00Z'));assert(a.ctx.rc81ReadOnlyPreflightV1().issues.some(x=>x.includes('DATE_OR_PERIOD_TYPE_CHANGED')));});
test('preflight blocks nonempty queue',()=>{const a=makeContext();a.queue.put(2,1,'Q-0001');assert(a.ctx.rc81ReadOnlyPreflightV1().issues.includes('QUEUE_NOT_EMPTY'));});
test('cannot run matrix with leftover backup',()=>{const a=makeContext();a.ss.insertSheet('__RC81_BK_ORPHAN');a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');raises(()=>a.ctx.rc81RunTypeSafeMatrixV1(),'RECOVERY_PENDING_RUN_MANUAL_RECOVERY_FIRST');});
test('matrix fully processes 4 cases and restores exact snapshot',()=>{
  const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');
  const before={s:a.source.getRange(1,1,5,71).getValues(),i:a.index.getRange(1,1,5,12).getValues()};
  const r=a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(r.status,'RC81_TYPE_SAFE_STORAGE_PASS',JSON.stringify(r.issues));
  assert.strictEqual(r.passed,4);assert.strictEqual(r.scenarios.length,4);assert.strictEqual(r.postPreflight,'RC81_PREFLIGHT_PASS');
  assert.deepStrictEqual(a.source.getRange(1,1,5,71).getValues(),before.s);
  assert.deepStrictEqual(a.index.getRange(1,1,5,12).getValues(),before.i);
  assert.strictEqual(a.ss.getSheets().filter(x=>x.getName().startsWith('__RC81_BK_')).length,0);
  assert.strictEqual(a.p.getProperty('RC81_RECOVERY_PENDING'),null);
});
test('fault injection triggers at each required point',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');const r=a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(JSON.stringify(r.scenarios.map(x=>x.expectedFault).slice(1)),JSON.stringify(['RC81_INJECTED_AFTER_SUBMIT','RC81_INJECTED_AFTER_REVISION','RC81_INJECTED_AFTER_REVIEW']));});
test('four successful rollbacks remain verified',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');const r=a.ctx.rc81RunTypeSafeMatrixV1();assert(r.scenarios.every(x=>x.rollbackRestored));});
test('normal path proves idempotence',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');const r=a.ctx.rc81RunTypeSafeMatrixV1();assert(r.scenarios[0].idempotent);assert(r.scenarios[0].storageActions.includes('IDEMPOTENCE_VERIFIED'));});
test('write authorization automatically disabled after matrix',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(a.p.getProperty('RC81_WRITE_DRILL_ENABLED'),'false');});
test('metadata properties restored after matrix',()=>{const a=makeContext();a.p.setProperty('INDEX_META','BASELINE_M');a.p.setProperty('INDEX_LAST_SYNC','BASELINE_L');a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(a.p.getProperty('INDEX_META'),'BASELINE_M');assert.strictEqual(a.p.getProperty('INDEX_LAST_SYNC'),'BASELINE_L');});
test('manual recovery rolls back previous partially written run',()=>{
  const a=makeContext(),old=a.source.getRange('A2').getValue();
  const snapshot=a.ctx.rc81CreateBackup_(a.ss,a.p,'NORMAL');
  a.source.getRange('A2').setValue(new Date('2026-10-11T02:00:00Z'));
  const r=a.ctx.rc81RecoverPendingV1();
  assert.strictEqual(r.status,'RC81_MANUAL_RECOVERY_PASS');assert.strictEqual(a.source.getRange('A2').getValue(),old);
  assert.strictEqual(a.p.getProperty('RC81_RECOVERY_PENDING'),null);
});
test('manual recovery without pending returns no-op',()=>{const a=makeContext();assert.strictEqual(a.ctx.rc81RecoverPendingV1().status,'RC81_NO_PENDING_RECOVERY');});
test('manual recovery refuses orphan backup without manifest',()=>{const a=makeContext();a.ss.insertSheet('__RC81_BK_ORPHAN');assert.strictEqual(a.ctx.rc81RecoverPendingV1().status,'RC81_ORPHAN_SNAPSHOT_MANUAL_REVIEW');});
test('manual recovery refuses malformed manifest',()=>{const a=makeContext();a.p.setProperty('RC81_RECOVERY_PENDING','{not-json');raises(()=>a.ctx.rc81RecoverPendingV1(),'RECOVERY_MANIFEST_MALFORMED');});
test('manual recovery fails closed if backup sheet disappeared',()=>{const a=makeContext();a.ctx.rc81CreateBackup_(a.ss,a.p,'AFTER_SUBMIT');let backup=a.ss.getSheets().find(x=>x.getName().startsWith('__RC81_BK_'));a.ss.deleteSheet(backup);raises(()=>a.ctx.rc81RecoverPendingV1(),'RECOVERY_SNAPSHOT_MISSING_OR_CHANGED');});
test('both production flags remain disabled after full test',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(a.p.getProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED'),'false');assert.strictEqual(a.p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED'),'false');});
test('lock contention consumes write authorization fail-closed',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.ctx.LockService.getScriptLock=()=>({tryLock:()=>false,releaseLock:()=>{}});raises(()=>a.ctx.rc81RunTypeSafeMatrixV1(),'SCRIPT_LOCK_BUSY');assert.strictEqual(a.p.getProperty('RC81_WRITE_DRILL_ENABLED'),'false');});
test('pending recovery consumes write authorization fail-closed',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.p.setProperty('RC81_RECOVERY_PENDING','PENDING');raises(()=>a.ctx.rc81RunTypeSafeMatrixV1(),'RECOVERY_PENDING_RUN_MANUAL_RECOVERY_FIRST');assert.strictEqual(a.p.getProperty('RC81_WRITE_DRILL_ENABLED'),'false');});
test('matrix blocks installed triggers without storage writes',()=>{const a=makeContext();a.p.setProperty('RC81_WRITE_DRILL_ENABLED','true');a.ctx.ScriptApp.getProjectTriggers=()=>[{}];const r=a.ctx.rc81RunTypeSafeMatrixV1();assert.strictEqual(r.status,'RC81_TYPE_SAFE_STORAGE_NOT_ACCEPTED');assert.strictEqual(r.casesExecuted,0);assert(r.issues.join().includes('TRIGGERS_PRESENT'));assert.strictEqual(a.p.getProperty('RC81_WRITE_DRILL_ENABLED'),'false');});
const report={total:pass+fail.length,passed:pass,failed:fail.length,cases:fail};fs.writeFileSync(__dirname+'/RC81_Local_Test_Results.json',JSON.stringify(report,null,2)+'\n');
process.stdout.write('\n'+JSON.stringify({total:report.total,passed:pass,failed:fail.length})+'\n');
if(fail.length)process.exitCode=1;