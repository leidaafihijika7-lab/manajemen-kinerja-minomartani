'use strict';
const fs=require('fs'), vm=require('vm'),assert=require('assert');
const MODULE=fs.readFileSync(__dirname+'/RC82_AuthenticatedBusinessIntegration.gs','utf8');
const ID='1JcX6PLGcjf6YraMl9VO0RfjGNpwwIxSaidOvdjaZiJA';
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
  getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn()));}
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
const crypto=require('crypto');
function makeContext({spoofSafe=true,blockLogin=false,failSubmit=false,triggers=false}={}) {
 const p=new MockProps(),ss=new MockSpreadsheet(),cache=new Map(),uuid={v:0},tokens=new Map(),usedSubmit=new Set(),usedRev=new Set();
 p.setProperty('RC82_STAGING_MODE','true');p.setProperty('SPREADSHEET_ID',ID);
 p.setProperty('RC82_WRITE_DRILL_ENABLED','false');p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','false');p.setProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED','false');
 const control=ss.add('MULAI_DI_SINI',30);control.put(5,1,'STAGE_RC82_AUTH_BUSINESS_DISPOSABLE');control.put(8,1,'RC82_DISPOSABLE_BUSINESS_WRITES_EXPLICIT_OPT_IN_ONLY');control.put(16,2,ID);
 const needed=['SKENARIO_B0','Rekap_Kinerja','Index_Laporan','Index_Laporan_Sync_Queue','Disposisi_Surat','Disposisi_Penerima','Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0','Data_Pegawai','Disposisi_Petugas'];
 for(const name of needed)ss.add(name,name==='Rekap_Kinerja'?80:30);
 const source=ss.getSheetByName('Rekap_Kinerja'),index=ss.getSheetByName('Index_Laporan'),audit=ss.getSheetByName('Audit_Log'),queue=ss.getSheetByName('Index_Laporan_Sync_Queue'),emps=ss.getSheetByName('Data_Pegawai');
 for(let i=0;i<71;i++)source.put(1,i+1,'HEADER'+i);
 const H=['ID_LAPORAN','ROW_REKAP','ID_USER','TANGGAL_LAPORAN','PERIODE_RESMI','KATEGORI','STATUS_REVIEW','POIN_FINAL','ID_DISPOSISI','NONCE','TERAKHIR_DIUBAH','INDEX_VERSION'];H.forEach((h,i)=>index.put(1,i+1,h));
 ['Waktu','ID','Aksi','Detail'].forEach((h,i)=>audit.put(1,i+1,h));
 ['QUEUE_ID','WAKTU','OPERATION','ROW_REKAP','ID_LAPORAN','ID_USER','NONCE','CONTEXT','ATTEMPTS','STATUS','LAST_ERROR','DIPROSES_PADA'].forEach((h,i)=>queue.put(1,i+1,h));
 const EH=['ID','Username','Nama','Jabatan','PIN_HASH','Akses','WA','Status','pin_salt','pin_hash_version','pin_updated_at'];EH.forEach((h,i)=>emps.put(1,i+1,h));
 ['id_penugasan','pegawai_id','pegawai_nama','pegawai_jabatan','status_petugas','ditetapkan_oleh_id','ditetapkan_oleh_nama','ditetapkan_pada','dinonaktifkan_oleh_id','dinonaktifkan_oleh_nama','dinonaktifkan_pada','catatan'].forEach((h,i)=>ss.getSheetByName('Disposisi_Petugas').put(1,i+1,h));
 const C={TANGGAL_LAPORAN:0,NAMA:1,JABATAN:2,KATEGORI:3,DESKRIPSI:4,STATUS_REVIEW:8,POIN_FINAL:9,CATATAN_ADMIN:17,ID_LAPORAN:18,ID_USER:19,WAKTU_REVIEW_ADMIN:20,NONCE:21,REVISI_KE:22,TERAKHIR_DIREVISI_PADA:23,ID_DISPOSISI:26};
 const INDEX_VERSION='2B0.2-2026.06.27.08';
 const base=['2026-10-11 09:00:00','2026-10-11 09:15:00'];
 for(let i=0;i<2;i++){const n=i+2,row=Array(71).fill('');row[C.TANGGAL_LAPORAN]=base[i];row[C.KATEGORI]='Kegiatan Uji B0';row[C.STATUS_REVIEW]=i?'Disetujui':'Menunggu Review';row[C.POIN_FINAL]=i?3:0;row[C.ID_LAPORAN]='B0-RPT-000'+(i+1);row[C.ID_USER]='B0-USR-000'+(i+1);row[C.NONCE]='B0-NONCE-000'+(i+1);row[13]='2026-10-11';row[C.REVISI_KE]=0;if(!i)row[26]='B0-DSP-0001';row.forEach((v,j)=>{if(v!=='' )source.put(n,j+1,v)});
 const idx=[row[C.ID_LAPORAN],n,row[C.ID_USER],base[i],'2026-10',row[C.KATEGORI],row[C.STATUS_REVIEW],row[C.POIN_FINAL],row[C.ID_DISPOSISI]||'',row[C.NONCE],base[i],INDEX_VERSION];idx.forEach((v,j)=>{if(v!=='')index.put(n,j+1,v)});audit.put(n,1,base[i]);audit.put(n,2,row[C.ID_USER]);audit.put(n,3,'SUBMIT_LAPORAN');audit.put(n,4,row[C.ID_LAPORAN]);}
 function norm(v){return v instanceof Date?v.toISOString():String(v??'');}
 function buildIndex(row,n){const dt=row[C.TANGGAL_LAPORAN];return [row[C.ID_LAPORAN],n,row[C.ID_USER],dt,'2026-10',row[C.KATEGORI],row[C.STATUS_REVIEW],row[C.POIN_FINAL],row[C.ID_DISPOSISI]||'',row[C.NONCE],row[C.TERAKHIR_DIREVISI_PADA]||row[C.WAKTU_REVIEW_ADMIN]||dt,INDEX_VERSION];}
 function matches(a,b){return a.length===b.length&&a.every((v,i)=>norm(v)===norm(b[i]));}
 function sync(n){if(p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED')==='true'){const row=source.getRange(n,1,1,71).getValues()[0];buildIndex(row,n).forEach((v,j)=>{if(v!==''&&v!==null)index.put(n,j+1,v);else index.setCell(n,j+1,{})});p.setProperty('INDEX_METADATA','test-meta');p.setProperty('INDEX_LASTSYNC','test-sync');}}
 function loginId(token){return tokens.get(token)||null;}
 function appendAudit(uid,action,detail){audit.appendRow([new Date(),uid,action,detail]);}
 const ctx={Date,Object,JSON,String,Number,Array,Error,Math,console:{log(){}},
  PropertiesService:{getScriptProperties:()=>p},getSS_:()=>ss,
  ScriptApp:{getProjectTriggers:()=>triggers?[{kind:'trigger'}]:[]},
  SpreadsheetApp:{CopyPasteType:{PASTE_NORMAL:'PASTE_NORMAL'},flush(){},openById:()=>ss},
  Utilities:{getUuid:()=>`uuid0000${++uuid.v}-abcd-4aaa-bbbb-cccccccccccc`,formatDate:(d,tz,fmt)=>fmt==='dd/MM/yyyy'?'11/10/2026':'20261011_180000'},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
  SHEET_COLUMNS:{REKAP_KINERJA:C},REVIEW_STATUS:{MENUNGGU:'Menunggu Review',DITOLAK:'Ditolak',DISETUJUI:'Disetujui'},
  INDEX_LAPORAN_2B0_CONFIG:{METADATA_PROPERTY:'INDEX_METADATA'},INDEX_LAPORAN_2B1_CONFIG:{LAST_SYNC_PROPERTY:'INDEX_LASTSYNC'},
  REKAP_KINERJA_DETAIL_SCHEMA_VERSION:'schema-version-1',
  statusSessionPegawaiCacheKey_:uid=>'SS_'+uid,
  sessionRegistryKeyV2_:uid=>'REG_'+uid,
  rc7Source_:(book,n)=>{const row=book.getSheetByName('Rekap_Kinerja').getRange(n,1,1,71).getValues()[0];return {row,rowRekap:n,triple:{idLaporan:row[C.ID_LAPORAN],idUser:row[C.ID_USER],nonce:row[C.NONCE]}}},
  buatBarisIndexLaporan2B0_:buildIndex,bedaBarisIndexLaporan2B0_:(a,b)=>matches(a,b)?[]:[{kolom:'DIFF'}],
  buatPinSalt_:()=>`s-${++uuid.v}`,
  hashPinV2_:(pin,salt)=>crypto.createHash('sha256').update(`${salt}|${pin}|${p.getProperty('PIN_PEPPER')}`).digest('hex'),
  bersihkanCacheDataPegawai_:()=>{cache.delete('DATA_PEGAWAI_V3_SECURE_PIN');p.deleteProperty('DATA_PEGAWAI_V3_SECURE_PIN')},
  cekLogin:(user,pin)=>{if(blockLogin)return {sukses:false};const all=emps.getRange(2,1,4,11).getValues();const data=all.find(a=>a[1]===user);if(!data||data[7]==='Nonaktif'||data[4]!==ctx.hashPinV2_(pin,data[8]))return {sukses:false};const token=`v2.synthetic.${user}`;tokens.set(token,data[0]);p.setProperty('REG_'+data[0],'registered');appendAudit(data[0],'LOGIN','ok');return {sukses:true,token};},
  validasiSession:t=>loginId(t),
  cekHakAksesAdmin:uid=>uid==='RC82-USR-ADMIN',
  prosesReviewAdmin:(id,status,points,note,token)=>{if(!loginId(token))return {pesan:'Sesi habis.'};if(!ctx.cekHakAksesAdmin(loginId(token)))return {pesan:'Akses Ditolak! Anda bukan Admin.'};let n=0;for(let i=2;i<=source.getLastRow();i++)if(source.getRange(i,C.ID_LAPORAN+1).getValue()===id)n=i;if(!n)return {pesan:'not found'};source.put(n,C.STATUS_REVIEW+1,status);source.put(n,C.POIN_FINAL+1,status==='Ditolak'?0:points);source.put(n,C.WAKTU_REVIEW_ADMIN+1,new Date('2026-10-11T11:15:00+07:00'));sync(n);appendAudit(loginId(token),'REVIEW_LAPORAN',id);return {sukses:true,statusFinal:status};},
  simpanDataKinerja:(pkg,token)=>{let uid=loginId(token);if(!uid)return 'ERROR_SESSION_EXPIRED';if(failSubmit)return '❌ GAGAL: rejected';if(usedSubmit.has(pkg.submitNonce))return '⚠️ Permintaan yang sama sudah pernah diproses';if(pkg.jabatan==='Lurah'&&spoofSafe)return '❌ GAGAL: identitas jabatan akun tidak cocok';usedSubmit.add(pkg.submitNonce);const row=Array(71).fill('');row[C.TANGGAL_LAPORAN]='11/10/2026 18:10:00';row[C.NAMA]=pkg.nama;row[C.JABATAN]=pkg.jabatan;row[C.KATEGORI]=pkg.kategori;row[C.STATUS_REVIEW]=pkg.jabatan==='Lurah'?'Disetujui':'Menunggu Review';row[C.POIN_FINAL]=0;row[C.ID_LAPORAN]='RC82-RPT-'+uuid.v;row[C.ID_USER]=uid;row[C.NONCE]=pkg.submitNonce;row[C.DESKRIPSI]=pkg.deskripsi;const n=source.getLastRow()+1;row.forEach((v,j)=>{if(v!=='')source.put(n,j+1,v)});sync(n);appendAudit(uid,'SUBMIT_LAPORAN',row[C.ID_LAPORAN]);return '✅ Laporan terkirim!';},
  simpanRevisiLaporanDitolakPegawai:(pkg,token)=>{const uid=loginId(token);if(!uid)return 'ERROR_SESSION_EXPIRED';let n=0;for(let i=2;i<=source.getLastRow();i++){if(source.getRange(i,C.ID_LAPORAN+1).getValue()===pkg.idLaporanRevisi)n=i;}if(!n)return '❌ NOT FOUND';if(source.getRange(n,C.ID_USER+1).getValue()!==uid)return '❌ GAGAL: Laporan ini bukan milik akun Anda.';if(usedRev.has(pkg.submitNonce))return '⚠️ Revisi yang sama sudah pernah diproses.';if(source.getRange(n,C.STATUS_REVIEW+1).getValue()!=='Ditolak')return '❌ GAGAL: Hanya laporan berstatus Ditolak yang dapat direvisi';usedRev.add(pkg.submitNonce);source.put(n,C.NONCE+1,pkg.submitNonce);source.put(n,C.STATUS_REVIEW+1,'Menunggu Review');source.put(n,C.TERAKHIR_DIREVISI_PADA+1,new Date('2026-10-11T11:00:00+07:00'));sync(n);appendAudit(uid,'REVISI_LAPORAN_PEGAWAI',pkg.idLaporanRevisi);return '✅ Revisi laporan tersimpan.';},
  akhiriSession:(token)=>{tokens.delete(token);return {sukses:true}},
  PORTAL_RUNTIME_CACHE_:{sessionByToken:{},pegawaiData:null}
 };
 // NOTE: source id stubs and index normalization are simulation-only. Mock tests do NOT assert real backend correctness.
 vm.createContext(ctx);vm.runInContext(MODULE,ctx,{filename:'RC82_AuthenticatedBusinessIntegration.gs'});
 return {ctx,p,ss,source,index,audit,emps};
}
let passed=0,failed=[];
function test(name,fn){try{fn();passed++;process.stdout.write(`PASS ${String(passed).padStart(2,'0')} ${name}\n`);}catch(e){failed.push({name,error:String(e.stack||e)});process.stdout.write(`FAIL ${name}: ${e.message}\n`);}}
function raises(f,str){assert.throws(f,e=>String(e.message).includes(str));}
test('RC82 module syntax and new spreadsheet ID',()=>{const a=makeContext();assert.strictEqual(a.ctx.RC82_STAGE_.ID,ID);});
test('read-only preflight baseline',()=>{const a=makeContext();const v=a.ctx.rc82ReadOnlyPreflightV1();assert.strictEqual(v.status,'RC82_PREFLIGHT_PASS',JSON.stringify(v.issues));});
test('read-only blocks mismatched spreadsheet property',()=>{const a=makeContext();a.p.setProperty('SPREADSHEET_ID','DANGER_PROD');raises(()=>a.ctx.rc82ReadOnlyPreflightV1(),'STAGING_CONFIG_INVALID');});
test('read-only blocks original RC8 mode',()=>{const a=makeContext();a.p.setProperty('RC8_STAGING_MODE','true');raises(()=>a.ctx.rc82ReadOnlyPreflightV1(),'STAGING_CONFIG_INVALID');});
test('read-only blocks previous RC81 mode',()=>{const a=makeContext();a.p.setProperty('RC81_STAGING_MODE','true');raises(()=>a.ctx.rc82ReadOnlyPreflightV1(),'STAGING_CONFIG_INVALID');});
test('read-only blocks replay enabled',()=>{const a=makeContext();a.p.setProperty('INDEX_LAPORAN_RC7_REPLAY_ENABLED','true');raises(()=>a.ctx.rc82ReadOnlyPreflightV1(),'QUEUE_REPLAY_MUST_BE_OFF');});
test('preflight blocks PIN_PEPPER copied from production',()=>{const a=makeContext();a.p.setProperty('PIN_PEPPER','copied-value');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.some(x=>x.includes('PIN_PEPPER')));});
test('preflight blocks existing real API key',()=>{const a=makeContext();a.p.setProperty('API_KEY_GEMINI','sensitive');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.some(x=>x.includes('API_KEY_GEMINI')));});
test('preflight blocks nonempty account data',()=>{const a=makeContext();a.emps.put(2,1,'REAL_ID');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('EMPLOYEE_FIXTURE_NOT_EMPTY'));});
test('preflight blocks bad account header',()=>{const a=makeContext();a.emps.put(1,5,'NOT_PIN_HASH');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('EMPLOYEE_HEADER_INVALID'));});
test('preflight blocks trigger presence',()=>{const a=makeContext({triggers:true});assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('INSTALLED_TRIGGERS'));});
test('preflight blocks orphan backup',()=>{const a=makeContext();a.ss.insertSheet('__RC82_BK_ORPHAN');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('BACKUP_PRESENT'));});
test('preflight blocks nonempty queue',()=>{const a=makeContext();a.ss.getSheetByName('Index_Laporan_Sync_Queue').put(2,1,'queue');assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('AUDIT_OR_QUEUE_NOT_BASELINE'));});
test('no opt-in no matrix',()=>{const a=makeContext();raises(()=>a.ctx.rc82RunAuthenticatedMatrixV1(),'EXPLICIT_OPT_IN_REQUIRED');});
test('matrix fails closed on stale backup and consumes opt-in',()=>{const a=makeContext();a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');a.ss.insertSheet('__RC82_BK_ORPHAN');raises(()=>a.ctx.rc82RunAuthenticatedMatrixV1(),'RECOVERY_PENDING');assert.strictEqual(a.p.getProperty('RC82_WRITE_DRILL_ENABLED'),'false');});
test('typed backup restores values, text formats, metadata',()=>{const a=makeContext();const sig=a.ctx.rc82Signature_(a.index.getRange(1,1,14,12));const original=a.p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED');const manifest=a.ctx.rc82PrepareBackup_(a.ss,a.p);a.index.getRange('D2').setValue(46306.375);a.index.getRange('D2').setNumberFormat('General');a.p.setProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED','true');const restored=a.ctx.rc82Restore_(a.ss,a.p,manifest);assert(restored.restored,JSON.stringify(restored.differences));assert.strictEqual(a.ctx.rc82Signature_(a.index.getRange(1,1,14,12)),sig);assert.strictEqual(a.p.getProperty('INDEX_LAPORAN_2B1_WRITE_ENABLED'),original);});
test('pending recovery blocks new preflight',()=>{const a=makeContext();a.ctx.rc82PrepareBackup_(a.ss,a.p);assert(a.ctx.rc82ReadOnlyPreflightV1().issues.includes('RECOVERY_PENDING'));});
test('manual recovery resumes interrupted stage',()=>{const a=makeContext();a.ctx.rc82PrepareBackup_(a.ss,a.p);a.source.getRange('A2').setValue(46306.375);assert.strictEqual(a.ctx.rc82RecoverPendingV1().status,'RC82_MANUAL_RECOVERY_PASS');});
test('orphan snapshot requires manual review',()=>{const a=makeContext();a.ss.insertSheet('__RC82_BK_ORPHAN');assert.strictEqual(a.ctx.rc82RecoverPendingV1().status,'RC82_ORPHAN_BACKUP_NEEDS_MANUAL_REVIEW');});
test('manual recovery blocks malformed ledger',()=>{const a=makeContext();a.p.setProperty('RC82_RECOVERY_PENDING','not-json');raises(()=>a.ctx.rc82RecoverPendingV1(),'MALFORMED_RECOVERY_RECORD');});
test('typed backup refuses missing snapshot',()=>{const a=makeContext();const record=a.ctx.rc82PrepareBackup_(a.ss,a.p);a.ss.deleteSheet(a.ss.getSheetByName(record.backupName));raises(()=>a.ctx.rc82RecoverPendingV1(),'RECOVERY_BACKUP_LOST');});
test('real auth server functions named explicitly',()=>{const a=makeContext();const source=MODULE;for(const name of ['cekLogin','validasiSession','simpanDataKinerja','simpanRevisiLaporanDitolakPegawai','prosesReviewAdmin'])assert(source.includes(name+'('));});
test('no doGet or doPost exported by RC82 module',()=>{assert(!/function\s+do(?:Get|Post)\s*\(/.test(MODULE));});
test('full mocked authenticated matrix passes security and rollback',()=>{const a=makeContext({spoofSafe:true});a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');const out=a.ctx.rc82RunAuthenticatedMatrixV1();assert.strictEqual(out.status,'RC82_AUTH_BUSINESS_PASS_PENDING_EXTERNAL_SNAPSHOT',JSON.stringify(out.issues));assert.strictEqual(out.rollbackRestored,true);assert.strictEqual(out.postPreflight,'RC82_PREFLIGHT_PASS');assert(out.testsPassed>=15);assert(out.checks.some(x=>x.phase==='CLIENT_ROLE_AND_NAME_SPOOF_REJECTED'&&x.passed));assert.strictEqual(a.p.getProperty('RC82_WRITE_DRILL_ENABLED'),'false');assert.strictEqual(a.p.getProperty('PIN_PEPPER'),null);assert.strictEqual(a.p.getProperty('FOLDER_ID_BUKTI_KINERJA'),null);});
test('spoof simulation fails security gate and restores baseline',()=>{const a=makeContext({spoofSafe:false});a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');const out=a.ctx.rc82RunAuthenticatedMatrixV1();assert.strictEqual(out.status,'RC82_SECURITY_NOT_ACCEPTED',JSON.stringify(out.issues));assert.strictEqual(out.rollbackRestored,true);assert.strictEqual(out.postPreflight,'RC82_PREFLIGHT_PASS');assert.strictEqual(out.spoofEvidence.submitted,true);assert.strictEqual(a.source.getLastRow(),3);assert.strictEqual(a.index.getLastRow(),3);});
test('failed submit marks matrix not accepted but still restores',()=>{const a=makeContext({failSubmit:true});a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');const out=a.ctx.rc82RunAuthenticatedMatrixV1();assert.strictEqual(out.status,'RC82_AUTH_BUSINESS_NOT_ACCEPTED');assert.strictEqual(out.rollbackRestored,true);assert.strictEqual(out.postPreflight,'RC82_PREFLIGHT_PASS');assert(out.issues.some(x=>x.includes('AUTHENTICATED_SUBMIT')));});
test('failed login marks matrix not accepted and retains no account data',()=>{const a=makeContext({blockLogin:true});a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');const out=a.ctx.rc82RunAuthenticatedMatrixV1();assert.strictEqual(out.status,'RC82_AUTH_BUSINESS_NOT_ACCEPTED');assert.strictEqual(out.rollbackRestored,true);assert.strictEqual(a.emps.getLastRow(),1);});
test('installed triggers are rejected before matrix writes',()=>{const a=makeContext({triggers:true});a.p.setProperty('RC82_WRITE_DRILL_ENABLED','true');const out=a.ctx.rc82RunAuthenticatedMatrixV1();assert.strictEqual(out.status,'RC82_AUTH_BUSINESS_NOT_ACCEPTED');assert.strictEqual(out.rollbackRestored,false);assert.strictEqual(a.source.getLastRow(),3);assert.strictEqual(a.p.getProperty('RC82_WRITE_DRILL_ENABLED'),'false');});
test('no cleartext secret in output structure',()=>{const a=makeContext();assert(!JSON.stringify(a.ctx.RC82_STAGE_).includes('PIN_PEPPER'));});
const results={total:passed+failed.length,passed,failed:failed.length,failedCases:failed};
fs.writeFileSync(__dirname+'/RC82_Local_Test_Results.json',JSON.stringify(results,null,2)+'\n');
process.stdout.write('\n'+JSON.stringify({total:results.total,passed,failed:results.failed})+'\n');
if(failed.length)process.exitCode=1;