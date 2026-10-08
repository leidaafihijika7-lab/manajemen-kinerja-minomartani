// ACE Batch B RC1 - diagnostik temuan non-PASS (read-only)
// Tidak membuat sheet, cache, trigger, file, atau mengubah data bisnis.
// Jalankan hanya melalui Apps Script editor dengan otorisasi maintainer.
var ACE_BATCH_B_DIAGNOSTICS_V10_VERSION_ = 'ACE-BB-DIAG-v1.0-RC1-2026.10.08.01';

function aceBatchBNonPassSummarizeV10_(liveResult) {
  if (!liveResult || liveResult.sukses !== true || !Array.isArray(liveResult.findings)) {
    throw new Error('ACE_DIAG_SOURCE_INVALID');
  }
  if (liveResult.maintainerVerified !== true) throw new Error('ACE_DIAG_MAINTAINER_NOT_VERIFIED');
  if (liveResult.readOnly !== true || liveResult.dataBisnisDiubah !== false) {
    throw new Error('ACE_DIAG_READ_ONLY_ASSERTION_FAILED');
  }
  var statuses = {FAIL:true,WARN:true,UNKNOWN:true};
  var findings = liveResult.findings.filter(function(f) {
    return !!(f && statuses[String(f.result || '').toUpperCase()]);
  }).map(function(f) {
    return {
      controlId:String(f.controlId || ''),
      domainId:String(f.domainId || ''),
      result:String(f.result || ''),
      severity:String(f.severity || ''),
      title:String(f.title || ''),
      explanation:String(f.explanation || ''),
      recommendation:String(f.recommendation || ''),
      evidenceIntegrity:String(f.evidenceIntegrity || ''),
      evidenceAssessment:f.evidenceAssessment || null,
      limitations:Array.isArray(f.limitations) ? f.limitations : [],
      evidenceEventCount:Array.isArray(f.evidenceEventIds) ? f.evidenceEventIds.length : 0,
      // Jangan mencetak entityKey, raw records, atau isi evidence.
      sourceModuleRoute:f.sourceModuleRoute || null
    };
  });
  var rank={FAIL:0,WARN:1,UNKNOWN:2}, severityRank={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3,INFO:4};
  findings.sort(function(a,b) {
    return (rank[a.result]-rank[b.result]) ||
      ((severityRank[a.severity] == null ? 9 : severityRank[a.severity]) -
       (severityRank[b.severity] == null ? 9 : severityRank[b.severity])) ||
      a.controlId.localeCompare(b.controlId);
  });
  var counts={FAIL:0,WARN:0,UNKNOWN:0};
  findings.forEach(function(f){counts[f.result]++;});
  var expected=liveResult.posture && liveResult.posture.counts || {};
  var fullMatch=Object.keys(counts).every(function(k){return counts[k]===Number(expected[k] || 0);});
  return {
    sukses:fullMatch,
    versi:ACE_BATCH_B_DIAGNOSTICS_V10_VERSION_,
    batchVersion:String(liveResult.versi || ''),
    period:String(liveResult.period || ''),
    posture:liveResult.posture && liveResult.posture.posture || '',
    totals:{findings:liveResult.findings.length,nonPass:findings.length,counts:counts},
    sesuaiPostureCounts:fullMatch,
    sourceErrors:liveResult.sourceSummary && liveResult.sourceSummary.sourceErrors || [],
    findings:findings,
    maintainerVerified:true,
    readOnly:true,
    dataBisnisDiubah:false
  };
}

function diagnostikACEBatchBNonPassV10() {
  // Live smoke sudah mempunyai otorisasi maintainer dan tidak melakukan write.
  var result=aceBatchBNonPassSummarizeV10_(auditComplianceLiveReadSmokeBatchBV10());
  Logger.log(JSON.stringify(result,null,2));
  return result;
}

function validasiDiagnostikACEBatchBV10() {
  var example={sukses:true,maintainerVerified:true,readOnly:true,dataBisnisDiubah:false,
    versi:'ACE-v1.0-BATCH-B-RC1-2026.10.07.01',period:'2026-09',
    posture:{posture:'NON_COMPLIANT',counts:{FAIL:1,WARN:1,UNKNOWN:1}},
    sourceSummary:{sourceErrors:[]},
    findings:[
      {controlId:'ACE-REV-003',domainId:'REVIEW',result:'FAIL',severity:'HIGH',explanation:'contoh'},
      {controlId:'ACE-MNT-003',domainId:'MAINTENANCE',result:'UNKNOWN',severity:'MEDIUM'},
      {controlId:'ACE-AI-001',domainId:'AI_GOVERNANCE',result:'WARN',severity:'LOW'},
      {controlId:'ACE-REV-001',domainId:'REVIEW',result:'PASS',severity:'INFO'},
      {controlId:'ACE-REV-002',domainId:'REVIEW',result:'NOT_APPLICABLE',severity:'INFO'}
    ]};
  var checks=[];function add(n,ok){checks.push({nama:n,lulus:ok===true});}
  var r=aceBatchBNonPassSummarizeV10_(example);
  add('JUMLAH_NON_PASS',r.totals.nonPass===3);
  add('HANYA_NON_PASS',r.findings.every(function(f){return ['FAIL','WARN','UNKNOWN'].indexOf(f.result)!==-1;}));
  add('SORTING',r.findings.map(function(f){return f.result;}).join(',')==='FAIL,WARN,UNKNOWN');
  add('REKONSILIASI_POSTURE',r.sesuaiPostureCounts===true);
  add('TIDAK_MENGUBAH_INPUT',example.findings.length===5);
  add('READ_ONLY',r.readOnly===true&&r.dataBisnisDiubah===false);
  add('MINIMAL_EVIDENCE',r.findings.every(function(f){return !Object.prototype.hasOwnProperty.call(f,'entityKey') && !Object.prototype.hasOwnProperty.call(f,'evidenceRefs');}));
  var bad=JSON.parse(JSON.stringify(example));bad.posture.counts.FAIL=2;
  add('COUNT_MISMATCH_DETECTED',aceBatchBNonPassSummarizeV10_(bad).sukses===false);
  bad=JSON.parse(JSON.stringify(example));bad.maintainerVerified=false;
  var rejected=false;try{aceBatchBNonPassSummarizeV10_(bad);}catch(e){rejected=true;}
  add('MAINTAINER_GUARD',rejected);
  var failed=checks.filter(function(c){return !c.lulus;});
  var report={sukses:failed.length===0,lulus:checks.length-failed.length,gagal:failed.length,checks:checks,readOnly:true};
  Logger.log(JSON.stringify(report,null,2));return report;
}
