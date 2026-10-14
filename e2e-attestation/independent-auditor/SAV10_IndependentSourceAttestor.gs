/**
 * SAV10 — Independent Source Attestor v1.0
 * Install ONLY in a NEW, SEPARATE auditor Apps Script project, never in target.
 * Source read: Google Apps Script API (HEAD) via script.projects.readonly.
 * Only permitted write: JSON attestation in separate evidence Drive folder.
 */
var SAV10_POLICY_ = Object.freeze({
  VERSION: 'PHA07B2-B2-SAV10-2026.10.14.1',
  REFERENCE_COMMIT: '51fb7a0cd68927eb1a263f1edb8c421d40defd83',
  TARGET_SPREADSHEET_ID: '1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  FROZEN_RC82_ID: '1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  UPLOAD_FOLDER_ID: '1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE_FOLDER_ID: '1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  EXPECTED: Object.freeze([
    {name:'Kode', type:'SERVER_JS', sha256:'c5293e8d7dd699ba6d3d6b328207e275f1383f100555a89e85fbb632f9becc8b'},
    {name:'Index', type:'HTML', sha256:'504cbffd74e841b3ef6638c43a3d76f9647923aa3aa376fd9ab1a957ea8f9a11'},
    {name:'SheetSchema', type:'SERVER_JS', sha256:'3f76d416a8e5f1b2d495a7e38b89f539ada19c7027cef64a2a30abd9d86e5c10'},
    {name:'IndexQueueGuardRC7', type:'SERVER_JS', sha256:'b7c1b23060390d1397927a2f75b81a5060b1976149a4695b7ec9bc3823ea0ef4'},
    {name:'E2E10_RuntimeGuard', type:'SERVER_JS', sha256:'3b555171c1192964bc4107e6d06c3e1d510cd117bafe5196830f059413777a02'},
    {name:'E2E10_IsolatedReadOnlyPreflight', type:'SERVER_JS', sha256:'c5ace0f14bd317a04d1ffee63072d25d73b89e0ee6a7bfa0a18e584b911f2e1e'},
    {name:'appsscript', type:'JSON', sha256:'04bd6d2a0d756fab43bccb2237584f9c9c53046487ff4256db4aa72c79fff86d'}
  ])
});

function sav10StableJson_(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(sav10StableJson_).join(',') + ']';
  return '{' + Object.keys(v).sort().map(function(k) {
    return JSON.stringify(k) + ':' + sav10StableJson_(v[k]);
  }).join(',') + '}';
}

function sav10CanonicalSource_(source, type) {
  if (typeof source !== 'string') throw new Error('SAV10_SOURCE_MISSING');
  if (type === 'JSON') return sav10StableJson_(JSON.parse(source));
  // Canonicalization exactly matches pinned GitHub manifest.
  return source.replace(/\r\n?/g, '\n').replace(/\n+$/g, '');
}

function sav10HexDigest_(input) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function sav10ErrorCode_(code, urlTag) {
  throw new Error('SAV10_API_HTTP_' + code + ':' + urlTag);
}

function sav10ApiGet_(url, tag) {
  // OAuth token is intentionally NEVER logged or saved.
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()},
    followRedirects: false,
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) sav10ErrorCode_(code, tag);
  return JSON.parse(response.getContentText('UTF-8'));
}

function sav10CheckConfig_() {
  var policy = SAV10_POLICY_;
  var p = PropertiesService.getScriptProperties();
  var currentAuditor = String(ScriptApp.getScriptId() || '').trim();
  var auditorPinned = String(p.getProperty('SAV10_AUDITOR_SCRIPT_ID') || '').trim();
  var targetId = String(p.getProperty('SAV10_TARGET_SCRIPT_ID') || '').trim();
  var expectedTitle = String(p.getProperty('SAV10_TARGET_PROJECT_TITLE') || '').trim();
  if (!auditorPinned || auditorPinned !== currentAuditor)
    throw new Error('SAV10_AUDITOR_BINDING_INVALID');
  if (!targetId || targetId.length < 20 || targetId === currentAuditor)
    throw new Error('SAV10_TARGET_SCRIPT_ID_INVALID');
  if (!expectedTitle || !/PHA07B2.*B2.*E2E/i.test(expectedTitle))
    throw new Error('SAV10_TARGET_TITLE_NOT_ATTESTED');
  if (policy.TARGET_SPREADSHEET_ID === policy.FROZEN_RC82_ID ||
      policy.EVIDENCE_FOLDER_ID === policy.UPLOAD_FOLDER_ID)
    throw new Error('SAV10_RESOURCE_COLLISION');
  if (p.getProperty('SAV10_ALLOW_TARGET_WRITES') === 'true')
    throw new Error('SAV10_FORBIDDEN_WRITE_FLAG');
  return {targetId:targetId, expectedTitle:expectedTitle, auditorId:currentAuditor};
}

function sav10CompareSourceCore_() {
  var policy = SAV10_POLICY_;
  var c = sav10CheckConfig_();
  var issues = [], observed = [], content, meta, seen = {};
  var base = 'https://script.googleapis.com/v1/projects/' + encodeURIComponent(c.targetId);
  try {
    meta = sav10ApiGet_(base, 'PROJECT_META');
    if (meta.scriptId !== c.targetId) issues.push('TARGET_PROJECT_ID_MISMATCH');
    if (String(meta.title || '') !== c.expectedTitle) issues.push('TARGET_PROJECT_TITLE_MISMATCH');
    content = sav10ApiGet_(base + '/content', 'SOURCE_HEAD');
    if (content.scriptId !== c.targetId || !Array.isArray(content.files))
      issues.push('TARGET_CONTENT_INVALID');
  } catch (e) {
    issues.push(String(e && e.message || 'SOURCE_API_UNAVAILABLE').slice(0,120));
  }

  if (content && Array.isArray(content.files)) {
    if (content.files.length !== policy.EXPECTED.length)
      issues.push('FILE_COUNT_MISMATCH:' + content.files.length);
    var expectedMap = {};
    policy.EXPECTED.forEach(function(it){ expectedMap[it.name] = it; });
    content.files.forEach(function(file){
      var key = String(file && file.name || ''), type = String(file && file.type || '');
      var allowed = expectedMap[key];
      if (seen[key]) { issues.push('DUPLICATE_FILE:' + key); return; }
      seen[key] = true;
      if (!allowed) { issues.push('UNEXPECTED_FILE:' + key.slice(0,60)); return; }
      if (type !== allowed.type) { issues.push('FILE_TYPE_MISMATCH:' + key); return; }
      try {
        var normalized = sav10CanonicalSource_(file.source, type);
        var actualHash = sav10HexDigest_(normalized);
        observed.push({
          name:key, type:type, expectedSha256:allowed.sha256, actualSha256:actualHash,
          same:actualHash === allowed.sha256
        });
        if (actualHash !== allowed.sha256) issues.push('SOURCE_SHA256_MISMATCH:' + key);
      } catch (hashError) { issues.push('SOURCE_HASH_FAILED:' + key); }
    });
    policy.EXPECTED.forEach(function(it){ if (!seen[it.name]) issues.push('MISSING_FILE:' + it.name); });
  }

  observed.sort(function(a,b){return a.name.localeCompare(b.name);});
  return {
    version: policy.VERSION,
    referenceCommit: policy.REFERENCE_COMMIT,
    verifiedAt:new Date().toISOString(),
    status:issues.length === 0 ? 'SAV10_SOURCE_MATCH_PASS' : 'SAV10_SOURCE_ATTESTATION_BLOCKED',
    auditorScriptId:c.auditorId,
    targetScriptId:c.targetId,
    targetProjectTitle:meta && meta.title || '',
    observed:observed, expectedFiles:policy.EXPECTED.length,
    issues:issues, targetWrites:0,
    e0Baseline:'NOT_CAPTURED_BY_SOURCE_ATTESTATION',
    productionReady:false
  };
}

function sav10PrivateEvidenceFolder_() {
  var folder=DriveApp.getFolderById(SAV10_POLICY_.EVIDENCE_FOLDER_ID);
  if (String(folder.getId()) !== SAV10_POLICY_.EVIDENCE_FOLDER_ID ||
      folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    throw new Error('SAV10_EVIDENCE_FOLDER_NOT_PRIVATE');
  }
  return folder;
}

function sav10SavePrivateJson_(prefix, document) {
  var name=prefix + '_' + Utilities.formatDate(new Date(),'Asia/Jakarta','yyyyMMdd_HHmmss') + '.json';
  var payload=JSON.stringify(document);
  var expectedHash=sav10HexDigest_(payload);
  var evidenceFolder=sav10PrivateEvidenceFolder_();
  var created=evidenceFolder.createFile(name,payload,'application/json');
  if (created.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    // Do not publish an unsafe URL in the execution log.
    throw new Error('SAV10_EVIDENCE_FILE_NOT_PRIVATE');
  }
  var roundTrip=sav10HexDigest_(created.getBlob().getDataAsString('UTF-8'));
  if (roundTrip !== expectedHash) throw new Error('SAV10_EVIDENCE_WRITE_VERIFY_FAILED');
  return {fileId:created.getId(), fileName:name, sha256:expectedHash};
}

function sav10GetAuditorScriptIdV1() {
  var id=ScriptApp.getScriptId();
  console.log('SAV10_AUDITOR_SCRIPT_ID: '+id);
  return {auditorScriptId:id, productionReady:false};
}

function sav10IndependentSourceAttestationV1() {
  var r;
  try {
    r=sav10CompareSourceCore_();
    if (r.status === 'SAV10_SOURCE_MATCH_PASS') {
      r.evidence=sav10SavePrivateJson_('SAV10_SOURCE_ATTESTATION',r);
      r.evidenceWrites=1;
    } else r.evidenceWrites=0;
  } catch(e) {
    r={version:SAV10_POLICY_.VERSION,status:'SAV10_SOURCE_ATTESTATION_BLOCKED',
      issues:[String(e && e.message || 'UNKNOWN').slice(0,160)],
      targetWrites:0,evidenceWrites:0,productionReady:false};
  }
  console.log('SAV10_RESULT:\n'+JSON.stringify(r,null,2));
  return r;
}
