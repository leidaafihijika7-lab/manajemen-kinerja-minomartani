#!/usr/bin/env node
'use strict';
/**
 * PHA-07B B2 / SAV11 Static QA v1.1
 * Pure local source-only checks, no Google API calls and NO staging writes.
 * Run from a clone: node e2e-review/qa/run_rpc_static_qa_v11.cjs
 * This is NOT installed Apps Script attestation or E2E acceptance.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const runtime = path.join(root, 'e2e-runtime');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'e2e-attestation/SAV11_SOURCE_REFERENCE_V1.json'),'utf8'));
const checks = [];
function check(name, pass, meta = {}) {
  checks.push({name, pass: !!pass, ...meta});
}
function canonText(s) { return s.replace(/\r\n?/g, '\n').replace(/\n+$/, ''); }
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
const hash = s => crypto.createHash('sha256').update(s,'utf8').digest('hex');
const gitBlob = b => crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const expectedFiles = manifest.expected.map(x=>x.githubName).sort();
const observedFiles = fs.readdirSync(runtime).filter(x=>/\.(?:gs|html|json)$/.test(x)).sort();
check('SAV11_8_EXACT_FILES', manifest.expectedInstalledFileCount === 8 && JSON.stringify(expectedFiles) === JSON.stringify(observedFiles), {count:observedFiles.length});
check('NO_LEGACY_INDEX_HTML', !fs.existsSync(path.join(runtime,'Index.html')));
check('SHA256_STANDARD_VECTOR',hash('abc')==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
check('MANIFEST_REFERENCE_PIN',manifest.referenceCommit==='b865d6c830e215cc062e553b33db5bb866db95dc');
const files = {};
const sourceSummary = [];
for (const f of manifest.expected) {
  const filename=path.join(runtime,f.githubName);
  if (!fs.existsSync(filename)) {check('FILE_PRESENT:'+f.githubName,false);continue;}
  const raw=fs.readFileSync(filename),src=raw.toString('utf8');
  files[f.githubName]=src;
  let code=src;
  if(f.type==='JSON'){try{code=stable(JSON.parse(src))}catch(e){code='!INVALID_JSON!'}}
  else code=canonText(src);
  const digest=hash(code);
  const blob=gitBlob(raw);
  sourceSummary.push({name:f.name,type:f.type,canonicalSha256:digest,gitBlob:blob});
  check('CANONICAL_SHA256:'+f.name, digest===f.sha256);
  check('EXACT_GIT_BLOB:'+f.name, blob===f.gitBlob);
  if(f.type==='SERVER_JS') {
    try {new vm.Script(src,{filename:f.githubName});check('V8_SYNTAX:'+f.name,true)}
    catch(e){check('V8_SYNTAX:'+f.name,false,{error:String(e.message).slice(0,140)})}
  }
}
const kode=files['Kode.gs']||'',facade=files['E2E11_RestrictedRpcFacade.gs']||'',html=files['IndexE2E11.html']||'',guard=files['E2E10_RuntimeGuard.gs']||'';
const server = Object.keys(files).filter(x=>x.endsWith('.gs')).map(n=>files[n]).join('\n');
const declarations = [...server.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]);
const publicNames = declarations.filter(n=>!n.endsWith('_'));
const surfaceMatch=/surface:\s*\[([\s\S]*?)\]/.exec(facade);
const listed=surfaceMatch ? [...surfaceMatch[1].matchAll(/['"]([A-Za-z_$][\w$]*)['"]/g)].map(m=>m[1]) : [];
check('RPC_SURFACE_EXACT_ALLOWLIST', listed.length===13 && JSON.stringify([...publicNames].sort())===JSON.stringify([...listed].sort()),{total:publicNames.length});
check('PUBLIC_NAMES_UNIQUE',new Set(publicNames).size===publicNames.length);
check('NO_PUBLIC_ASSIGNMENT_OVERRIDE',![...server.matchAll(/^([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/gm)].some(m=>!m[1].endsWith('_')));
check('NO_LEGACY_TOKEN_OR_MAINTENANCE_RPC',!publicNames.some(n=>/buatToken|maintenance|IndexLaporan|adminGantiPin/i.test(n)));
for (const n of ['logAudit_','logAI_','dapatkanAtauBuatFolder_','siapkanKolomDetailFormRekapKinerja_']) {
  check('NO_PRIVATE_COLLISION:'+n,declarations.filter(x=>x===n).length===1);
}
check('NO_LEGACY_BLACKOUT_PUBLIC_COLLISION',!declarations.includes('koreksiLaporanBlackoutCutoffApril2026'));
check('DOGET_GUARDED_FOCUSED_UI',/function doGet\(\)\s*\{\s*e2e10RequireWebGate_\(\);/.test(kode)&&/createTemplateFromFile\('IndexE2E11'\)/.test(kode));
check('EDITOR_PREFLIGHT_PRIVATE_ONLY',!publicNames.includes('e2e10ReadOnlyPreflightV1')&&!publicNames.includes('e2e10GetScriptIdReadOnlyV1'));
const uiCalls=[...html.matchAll(/\brun\('([^']+)'/g)].map(m=>m[1]);
check('FOCUSED_UI_CALLS_RESOLVED',uiCalls.length===4 && uiCalls.every(x=>publicNames.includes(x)),{calls:uiCalls});
const inlineScripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
for(let i=0;i<inlineScripts.length;i++){
 try{new vm.Script(inlineScripts[i][1],{filename:'IndexE2E11.script'+i+'.js'});check('HTML_INLINE_SCRIPT_SYNTAX_'+i,true)}
 catch(e){check('HTML_INLINE_SCRIPT_SYNTAX_'+i,false,{error:String(e.message).slice(0,140)})}
}
check('ONE_FOCUSED_INLINE_SCRIPT',inlineScripts.length===1);
check('GUARD_HAS_E0_REQUIREMENT',/function e2e10RequireWrites_\(\)/.test(guard)&&/E2E_E0_ATTESTED/.test(guard)&&/E2E_WRITE_ENABLED/.test(guard)&&/getProjectTriggers/.test(guard));
check('RPC_AUTH_REVIEW_GATE',facade.includes('E2E_RPC_SECURITY_AUDIT_APPROVED') && /function e2e11RequireRpcWrite_\(\)/.test(facade) && facade.includes('e2e10RequireWebGate_()') && facade.includes('e2e10RequireWrites_()'));
const signatures=[
 ['e2e11RpcLogin',['user','synthetic-pin','cid']],
 ['e2e11RpcSession',['token']],
 ['e2e11RpcLogout',['token']],
 ['e2e11RpcHistory',[{limit:1},'token']],
 ['e2e11RpcRejectedReport',['report','token']],
 ['e2e11RpcSubmit',[{},'token']],
 ['e2e11RpcRevise',[{},'token']],
 ['e2e11RpcReview',['report','APPROVE',1,'notes','token']],
 ['e2e11RpcReviewEmployees',['token']],
 ['e2e11RpcReviewReports',['u','','','',0,10,'token']],
 ['e2e11RpcUploadEvidence',[{test:true}]]
];
const targetFns=['cekLogin_','cekSessionAktif_','akhiriSession_','ambilRiwayatKuPaged_','ambilLaporanDitolakUntukRevisi_','simpanDataKinerja_','simpanRevisiLaporanDitolakPegawai_','prosesReviewAdmin_','ambilDaftarPegawaiReviewAdmin_','ambilLaporanAdminPerPegawai_','uploadBuktiKinerjaBlob_'];
function loadMocks(cfg) {
  const events=[],props={E2E_RPC_SECURITY_AUDIT_APPROVED:cfg.approved?'true':'false'};
  const ctx={};
  ctx.e2e10RequireWebGate_=()=>{events.push('web');if(!cfg.web)throw Error('WEB_BLOCKED')};
  ctx.e2e10AssertStage_=()=>({getProperty:k=>props[k]||''});
  ctx.e2e10RequireWrites_=()=>{events.push('writes');if(!cfg.writes)throw Error('WRITES_BLOCKED')};
  ctx.e2e10RequireUploadWrite_=()=>{events.push('upload');if(!cfg.upload)throw Error('UPLOAD_BLOCKED')};
  for(const n of targetFns) ctx[n]=()=>{events.push('TARGET:'+n);return{sukses:true}};
  vm.createContext(ctx);
  new vm.Script(facade).runInContext(ctx,{timeout:500});
  return {ctx,events};
}
for(const scenario of [
  {name:'WEB_DISABLED',web:false,approved:false,writes:false,upload:false},
  {name:'REVIEW_DISABLED',web:true,approved:false,writes:true,upload:true},
  {name:'WRITE_DISABLED',web:true,approved:true,writes:false,upload:true}
]){
 let denied=0,bad=[];
 for(const [name,args] of signatures){
  const t=loadMocks(scenario);try{t.ctx[name](...args)}catch(e){denied++}
  if(t.events.some(x=>x.startsWith('TARGET:')))bad.push(name);
 }
 check('MOCK_DENY_ALL_11_'+scenario.name,denied===11 && bad.length===0,{denied,wrongCalls:bad.length});
}
const upload=loadMocks({web:true,approved:true,writes:true,upload:false});
let uploadDenied=false;try{upload.ctx.e2e11RpcUploadEvidence({test:true})}catch(e){uploadDenied=true}
check('MOCK_UPLOAD_FLAG_DENIAL',uploadDenied&&!upload.events.some(x=>x.startsWith('TARGET:')));
const allApproved=loadMocks({web:true,approved:true,writes:true,upload:true});
let ok=0;for(const [n,args] of signatures) {try{allApproved.ctx[n](...args);ok++}catch(e){}}
check('MOCK_POSITIVE_DISPATCH_ONLY',ok===11&&allApproved.events.filter(x=>x.startsWith('TARGET:')).length===11,{dispatched:ok});
check('NO_PRODUCTION_DEPLOYMENT_IN_QA', !server.includes('function onInstall') && !server.includes('function doPost('));
const status=checks.every(x=>x.pass)?'STATIC_QA_PASS_NO_RUNTIME_ATTESTATION':'STATIC_QA_FAIL';
const out={
  schema:'PHA07B2_SAV11_STATIC_QA_REPORT_V1',
  status,sourceReferenceCommit:manifest.referenceCommit,
  checks:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass),
  sourceSummary,unverified:['APPS_SCRIPT_API_INSTALLED_HEAD','INDEPENDENT_SAV11_RUN','DEPLOYMENT_EXECUTE_AS','E0_LINEAGE','LIVE_NEGATIVE_TESTS'],
  stageReady:false,productionReady:false
};
process.stdout.write(JSON.stringify(out,null,2)+'\n');
if(status!=='STATIC_QA_PASS_NO_RUNTIME_ATTESTATION')process.exitCode=1;
