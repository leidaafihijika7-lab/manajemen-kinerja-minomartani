// ACE-REV-003 Focused Diagnostic v1.0 RC1
// Read-only investigation; does not alter review, points, indexes, payments or history.
var ACE_REV003_DIAGNOSTIC_V10_VERSION_='ACE-REV003-DIAG-v1.0-RC1-2026.10.08.01';

function aceRev003ViolationV10_(r){
  var status=String(r.status||'');
  if(aceBv10IsRejected_(status)||status.indexOf('Lewat Cut-off')!==-1)
    return Math.abs(Number(r.poinFinal||0))>0.001;
  return Number(r.poinFinal||0)<0;
}
function aceRev003ReportV10_(bundle){
  if(!bundle||!bundle.reports||!Array.isArray(bundle.reports.records))
    throw new Error('ACE_REV003_SOURCE_UNAVAILABLE');
  var all=bundle.reports.records;
  var bad=all.filter(aceRev003ViolationV10_);
  var canonical=aceBv10EvalControl_('ACE-REV-003',bundle);
  var explanation=String(canonical.explanation||'');
  var match=/Poin final tidak konsisten dengan status:\s*(\d+)/.exec(explanation);
  var canonicalCount=match?Number(match[1]):null;
  var out={
    sukses:canonicalCount!==null&&canonicalCount===bad.length&&
      canonical.result===(bad.length?'FAIL':'PASS'),
    versi:ACE_REV003_DIAGNOSTIC_V10_VERSION_,
    period:bundle.period||'', controlId:'ACE-REV-003',
    canonicalResult:canonical.result,canonicalSeverity:canonical.severity,
    canonicalCount:canonicalCount,diagnosticCount:bad.length,
    sesuaiEvaluator:canonicalCount!==null&&canonicalCount===bad.length,
    rows:bad.map(function(r){
      var idx=r.index||null, audit=(r.auditReview||[]);
      return {
        reportId:String(r.id||''),sheetRow:Number(r.row||0),
        statusReview:String(r.status||''),poinFinal:Number(r.poinFinal||0),
        indexStatus:idx?String(idx.status||''):null,
        indexPoinFinal:idx?Number(idx.poinFinal||0):null,
        statusIndexSama:idx?String(idx.status||'')===String(r.status||''):null,
        poinIndexSama:idx?Math.abs(Number(idx.poinFinal||0)-Number(r.poinFinal||0))<=0.001:null,
        tanggalLaporan:String(r.submittedAt||''),
        waktuReview:String(r.reviewedAt||''),
        revisiKe:Number(r.revisionNo||0),
        revisiTerakhir:String(r.lastRevisedAt||''),
        legacyBackfill:r.legacyBackfill===true,
        auditReviewCount:audit.length,
        auditReviewTerakhir:audit.slice(-3).map(function(a){
          return {row:Number(a.row||0),waktu:String(a.waktu||''),action:String(a.action||'')};
        }),
        alasan:'Poin final melanggar aturan status yang digunakan ACE-REV-003'
      };
    }),
    sourceErrors:bundle.runtime&&bundle.runtime.errors||[],
    readOnly:true,dataBisnisDiubah:false
  };
  return out;
}
function diagnostikACERev003V10(){
  // Maintainer-only; directly builds source bundle to avoid unrelated verbose live-smoke logs.
  if(typeof pastikanMaintainerPortal3B0_!=='function')
    throw new Error('ACE_REV003_MAINTAINER_GATE_UNAVAILABLE');
  pastikanMaintainerPortal3B0_('ACE_REV003_READ_ONLY_DIAGNOSTIC');
  var result=aceRev003ReportV10_(aceBv10BuildSourceBundle_({period:'2026-09'}));
  if(!result.sukses)throw new Error('ACE_REV003_DIAGNOSTIC_CANONICAL_MISMATCH');
  Logger.log('ACE_REV003_SUMMARY '+JSON.stringify({
    sukses:result.sukses,controlId:result.controlId,
    canonicalCount:result.canonicalCount,diagnosticCount:result.diagnosticCount,
    canonicalResult:result.canonicalResult,sourceErrors:result.sourceErrors,
    readOnly:true,dataBisnisDiubah:false
  }));
  result.rows.forEach(function(r,i){Logger.log('ACE_REV003_CASE '+(i+1)+'/'+result.rows.length+' '+JSON.stringify(r));});
  return result;
}
function validasiDiagnostikACERev003V10(){
  var tests=[];function check(n,ok){tests.push({nama:n,lulus:ok===true});}
  function x(status,poin){return {status:status,poinFinal:poin};}
  check('REJECTED_NONZERO',aceRev003ViolationV10_(x('Ditolak',5))===true);
  check('REJECTED_ZERO',aceRev003ViolationV10_(x('Ditolak',0))===false);
  check('CUTOFF_NONZERO',aceRev003ViolationV10_(x('Lewat Cut-off',1))===true);
  check('CUTOFF_ZERO',aceRev003ViolationV10_(x('Lewat Cut-off',0))===false);
  check('NEGATIVE_FINAL',aceRev003ViolationV10_(x('Disetujui',-1))===true);
  check('APPROVED_POSITIVE',aceRev003ViolationV10_(x('Disetujui',5))===false);
  var f=aceBv10EvalControl_; // dependency contract check only; no external writes
  check('EVALUATOR_AVAILABLE',typeof f==='function');
  check('SOURCE_BUILDER_AVAILABLE',typeof aceBv10BuildSourceBundle_==='function');
  var fails=tests.filter(function(t){return !t.lulus;});
  var ret={sukses:fails.length===0,lulus:tests.length-fails.length,gagal:fails.length,tests:tests,readOnly:true};
  Logger.log('ACE_REV003_VALIDATION '+JSON.stringify(ret));return ret;
}
