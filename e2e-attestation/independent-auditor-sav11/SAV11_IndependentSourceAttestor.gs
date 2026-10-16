/**
 * SAV11 — Independent Source Attestor v1.0
 * Install ONLY in a NEW, SEPARATE auditor Apps Script project; NEVER in target or production. Existing SAV10/E0 session must remain untouched.
 * Source read: Google Apps Script API (HEAD) via script.projects.readonly.
 * Only permitted write: versioned SAV11 JSON attestation in private evidence Drive folder. This attests installed HEAD, NOT deployment metadata nor E0/E1.
 */
var SAV11_POLICY_ = Object.freeze({
  VERSION: 'PHA07B2-B2-SAV11-2026.10.16.1',
  REFERENCE_COMMIT: 'b865d6c830e215cc062e553b33db5bb866db95dc',
  TARGET_SPREADSHEET_ID: '1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  FROZEN_RC82_ID: '1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  UPLOAD_FOLDER_ID: '1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE_FOLDER_ID: '1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  EXPECTED: Object.freeze([
    {name:'Kode', type:'SERVER_JS', sha256:'4011e87f26d283f8d85d66e9008ad00fa9346446984a754c45c9adb75ae27ae5'},
    {name:'IndexE2E11', type:'HTML', sha256:'432be7b72cf0eaabb772cc78f6ef108e2200696a7107af974a1ce408c97d555c'},
    {name:'E2E11_RestrictedRpcFacade', type:'SERVER_JS', sha256:'ded9b238d37b6d2f6dcf7af8331c80f1c3bb6ff05ec5fc1679139b8b3c0471da'},
    {name:'SheetSchema', type:'SERVER_JS', sha256:'3f76d416a8e5f1b2d495a7e38b89f539ada19c7027cef64a2a30abd9d86e5c10'},
    {name:'IndexQueueGuardRC7', type:'SERVER_JS', sha256:'b7c1b23060390d1397927a2f75b81a5060b1976149a4695b7ec9bc3823ea0ef4'},
    {name:'E2E10_RuntimeGuard', type:'SERVER_JS', sha256:'3b555171c1192964bc4107e6d06c3e1d510cd117bafe5196830f059413777a02'},
    {name:'E2E10_IsolatedReadOnlyPreflight', type:'SERVER_JS', sha256:'7ac3aa3a928b4c392e8a698c90074b7f8e867d577ea94b55905417f7ae77e8bb'},
    {name:'appsscript', type:'JSON', sha256:'04bd6d2a0d756fab43bccb2237584f9c9c53046487ff4256db4aa72c79fff86d'}
  ])
});

function sav11StableJson_(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(sav11StableJson_).join(',') + ']';
  return '{' + Object.keys(v).sort().map(function(k) {
    return JSON.stringify(k) + ':' + sav11StableJson_(v[k]);
  }).join(',') + '}';
}

function sav11CanonicalSource_(source, type) {
  if (typeof source !== 'string') throw new Error('SAV11_SOURCE_MISSING');
  if (type === 'JSON') return sav11StableJson_(JSON.parse(source));
  // Canonicalization exactly matches pinned GitHub manifest.
  return source.replace(/\r\n?/g, '\n').replace(/\n+$/g, '');
}

function sav11HexDigest_(input) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function sav11ErrorCode_(code, urlTag) {
  throw new Error('SAV11_API_HTTP_' + code + ':' + urlTag);
}

function sav11ApiGet_(url, tag) {
  // OAuth token is intentionally NEVER logged or saved.
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()},
    followRedirects: false,
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code !== 200) sav11ErrorCode_(code, tag);
  return JSON.parse(response.getContentText('UTF-8'));
}

function sav11CheckConfig_() {
  var policy = SAV11_POLICY_;
  var p = PropertiesService.getScriptProperties();
  var currentAuditor = String(ScriptApp.getScriptId() || '').trim();
  var auditorPinned = String(p.getProperty('SAV11_AUDITOR_SCRIPT_ID') || '').trim();
  var targetId = String(p.getProperty('SAV11_TARGET_SCRIPT_ID') || '').trim();
  var expectedTitle = String(p.getProperty('SAV11_TARGET_PROJECT_TITLE') || '').trim();
  if (!auditorPinned || auditorPinned !== currentAuditor)
    throw new Error('SAV11_AUDITOR_BINDING_INVALID');
  if (!targetId || targetId.length < 20 || targetId === currentAuditor)
    throw new Error('SAV11_TARGET_SCRIPT_ID_INVALID');
  if (!expectedTitle || !/PHA07B2.*B2.*E2E/i.test(expectedTitle))
    throw new Error('SAV11_TARGET_TITLE_NOT_ATTESTED');
  if (policy.TARGET_SPREADSHEET_ID === policy.FROZEN_RC82_ID ||
      policy.EVIDENCE_FOLDER_ID === policy.UPLOAD_FOLDER_ID)
    throw new Error('SAV11_RESOURCE_COLLISION');
  if (p.getProperty('SAV11_ALLOW_TARGET_WRITES') === 'true')
    throw new Error('SAV11_FORBIDDEN_WRITE_FLAG');
  return {targetId:targetId, expectedTitle:expectedTitle, auditorId:currentAuditor};
}

function sav11CompareSourceCore_() {
  var policy = SAV11_POLICY_;
  var c = sav11CheckConfig_();
  var issues = [], observed = [], content, meta, seen = {};
  var base = 'https://script.googleapis.com/v1/projects/' + encodeURIComponent(c.targetId);
  try {
    meta = sav11ApiGet_(base, 'PROJECT_META');
    if (meta.scriptId !== c.targetId) issues.push('TARGET_PROJECT_ID_MISMATCH');
    if (String(meta.title || '') !== c.expectedTitle) issues.push('TARGET_PROJECT_TITLE_MISMATCH');
    content = sav11ApiGet_(base + '/content', 'SOURCE_HEAD');
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
        var normalized = sav11CanonicalSource_(file.source, type);
        var actualHash = sav11HexDigest_(normalized);
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
    status:issues.length === 0 ? 'SAV11_SOURCE_MATCH_PASS' : 'SAV11_SOURCE_ATTESTATION_BLOCKED',
    auditorScriptId:c.auditorId,
    targetScriptId:c.targetId,
    targetProjectTitle:meta && meta.title || '',
    observed:observed, expectedFiles:policy.EXPECTED.length,
    issues:issues, targetWrites:0,
    e0Baseline:'NOT_CAPTURED_BY_SOURCE_ATTESTATION',
    productionReady:false
  };
}

function sav11PrivateEvidenceFolder_() {
  var folder=DriveApp.getFolderById(SAV11_POLICY_.EVIDENCE_FOLDER_ID);
  if (String(folder.getId()) !== SAV11_POLICY_.EVIDENCE_FOLDER_ID ||
      folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    throw new Error('SAV11_EVIDENCE_FOLDER_NOT_PRIVATE');
  }
  return folder;
}

function sav11SavePrivateJson_(prefix, document) {
  var name=prefix + '_' + Utilities.formatDate(new Date(),'Asia/Jakarta','yyyyMMdd_HHmmss') + '.json';
  var payload=JSON.stringify(document);
  var expectedHash=sav11HexDigest_(payload);
  var evidenceFolder=sav11PrivateEvidenceFolder_();
  var created=evidenceFolder.createFile(name,payload,'application/json');
  if (created.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    // Do not publish an unsafe URL in the execution log.
    throw new Error('SAV11_EVIDENCE_FILE_NOT_PRIVATE');
  }
  var roundTrip=sav11HexDigest_(created.getBlob().getDataAsString('UTF-8'));
  if (roundTrip !== expectedHash) throw new Error('SAV11_EVIDENCE_WRITE_VERIFY_FAILED');
  return {fileId:created.getId(), fileName:name, sha256:expectedHash};
}

function sav11GetAuditorScriptIdV1() {
  var id=ScriptApp.getScriptId();
  console.log('SAV11_AUDITOR_SCRIPT_ID: '+id);
  return {auditorScriptId:id, productionReady:false};
}

function sav11IndependentSourceAttestationV1() {
  var r;
  try {
    r=sav11CompareSourceCore_();
    if (r.status === 'SAV11_SOURCE_MATCH_PASS') {
      r.evidence=sav11SavePrivateJson_('SAV11_SOURCE_ATTESTATION',r);
      r.evidenceWrites=1;
    } else r.evidenceWrites=0;
  } catch(e) {
    r={version:SAV11_POLICY_.VERSION,status:'SAV11_SOURCE_ATTESTATION_BLOCKED',
      issues:[String(e && e.message || 'UNKNOWN').slice(0,160)],
      targetWrites:0,evidenceWrites:0,productionReady:false};
  }
  console.log('SAV11_RESULT:\n'+JSON.stringify(r,null,2));
  return r;
}
