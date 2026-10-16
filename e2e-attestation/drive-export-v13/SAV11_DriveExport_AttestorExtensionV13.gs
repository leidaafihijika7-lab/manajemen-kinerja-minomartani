/**
 * SAV11 Drive-Export Read-Only Attestation Extension v1.3.
 * APPEND to the end of Project B's existing SAV11_IndependentSourceAttestor.gs.
 * Do not install in Project A. Preserve existing Project B Script Properties,
 * Drive API v3 service, and successful 3-scope OAuth configuration.
 *
 * Preliminary check: sav11DriveHashPreflightV13()
 * Final check (only after preflight): sav11IndependentDriveAttestationV13()
 *
 * Transport: Drive v3 files.export GET; no Script API, no Drive file update.
 * The final check additionally requires independent Drive files.get metadata
 * matching the pinned Script ID and exact title. Fail closed if unavailable.
 */
var SAV11_DRIVE_V13_ = Object.freeze({
  VERSION: 'PHA07B2-B2-SAV11-DRIVE-2026.10.16.1',
  TRANSPORT: 'DRIVE_V3_FILES_EXPORT_GET_ONLY',
  TYPE_MAP: Object.freeze({server_js: 'SERVER_JS', html: 'HTML', json: 'JSON'})
});

function sav11DriveV13Get_(url, label) {
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()},
    followRedirects: false,
    muteHttpExceptions: true
  });
  var httpCode = response.getResponseCode();
  if (httpCode !== 200) throw new Error('SAV11_DRIVE_HTTP_' + httpCode + ':' + label);
  var text = response.getContentText('UTF-8');
  if (text.length > 9500000) throw new Error('SAV11_DRIVE_RESPONSE_TOO_LARGE:' + label);
  return JSON.parse(text);
}

function sav11DriveV13Read_(verifyMetadata) {
  var c = sav11CheckConfig_(); // Checks IDs, exact title property format, no write flag.
  var policy = SAV11_POLICY_;
  var issues = [], observed = [], source, metadata = null;
  var base = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(c.targetId);
  var titleVerified = false, typeVerified = false, metadataVersion = '';
  var expectedMap = {}, seen = {};

  policy.EXPECTED.forEach(function (x) { expectedMap[x.name] = x; });

  if (verifyMetadata) {
    try {
      // This metadata lookup may be unavailable even when export works.
      // Never falsely mark full attestation PASS if name/ID cannot be checked.
      metadata = sav11DriveV13Get_(
        base + '?fields=id,name,mimeType,modifiedTime,trashed', 'TARGET_METADATA');
      titleVerified = String(metadata.name || '') === c.expectedTitle;
      typeVerified = String(metadata.mimeType || '') === 'application/vnd.google-apps.script';
      metadataVersion = String(metadata.modifiedTime || '');
      if (String(metadata.id || '') !== c.targetId) issues.push('TARGET_DRIVE_ID_MISMATCH');
      if (!titleVerified) issues.push('TARGET_TITLE_NOT_VERIFIED');
      if (!typeVerified) issues.push('TARGET_MIME_NOT_APPS_SCRIPT');
      if (metadata.trashed === true) issues.push('TARGET_TRASHED');
    } catch (err) {
      issues.push('TARGET_METADATA_READ_FAILED:' + String(err && err.message || err).slice(0,85));
    }
  }

  try {
    source = sav11DriveV13Get_(
      base + '/export?mimeType=' +
      encodeURIComponent('application/vnd.google-apps.script+json'), 'TARGET_SOURCE_EXPORT');
    if (!source || !Array.isArray(source.files)) throw new Error('SAV11_SOURCE_FILES_NOT_ARRAY');

    if (source.files.length !== policy.EXPECTED.length) {
      issues.push('FILE_COUNT_MISMATCH:' + source.files.length);
    }
    source.files.forEach(function (f) {
      var name = String(f && f.name || '');
      var rawType = String(f && f.type || '').trim().toLowerCase();
      var canonicalType = SAV11_DRIVE_V13_.TYPE_MAP[rawType] || '';
      var expected = expectedMap[name];
      if (seen[name]) { issues.push('DUPLICATE_FILE:' + name); return; }
      seen[name] = true;
      if (!expected) { issues.push('UNEXPECTED_FILE:' + name.slice(0, 60)); return; }
      if (!canonicalType || canonicalType !== expected.type) {
        issues.push('FILE_TYPE_MISMATCH:' + name);
        return;
      }
      try {
        var sourceText = sav11CanonicalSource_(f.source, canonicalType);
        var actualSha256 = sav11HexDigest_(sourceText);
        observed.push({
          name: name,
          type: canonicalType,
          expectedSha256: expected.sha256,
          actualSha256: actualSha256,
          same: actualSha256 === expected.sha256
        });
        if (actualSha256 !== expected.sha256) issues.push('SOURCE_SHA256_MISMATCH:' + name);
      } catch (err) {
        issues.push('FILE_DIGEST_FAILED:' + name);
      }
    });
    policy.EXPECTED.forEach(function (x) {
      if (!seen[x.name]) issues.push('MISSING_FILE:' + x.name);
    });
  } catch (err) {
    issues.push('TARGET_EXPORT_FAILED:' + String(err && err.message || err).slice(0,85));
  }

  observed.sort(function (a, b) { return a.name.localeCompare(b.name); });

  var hashesPass = observed.length === policy.EXPECTED.length &&
    observed.every(function (x) { return x.same === true; });
  var fullIdentity = !verifyMetadata || (titleVerified && typeVerified && metadata !== null);
  var passed = issues.length === 0 && hashesPass && fullIdentity;
  return {
    version: SAV11_DRIVE_V13_.VERSION,
    referenceCommit: policy.REFERENCE_COMMIT,
    transport: SAV11_DRIVE_V13_.TRANSPORT,
    verifiedAt: new Date().toISOString(),
    status: passed
      ? (verifyMetadata ? 'SAV11_DRIVE_SOURCE_MATCH_PASS' :
                          'SAV11_DRIVE_HASH_PREFLIGHT_PASS')
      : 'SAV11_SOURCE_ATTESTATION_BLOCKED',
    auditorScriptId: c.auditorId,
    targetScriptId: c.targetId,
    targetProjectTitleClaimed: c.expectedTitle,
    targetProjectTitleVerified: !!(verifyMetadata && titleVerified && typeVerified),
    metadataModifiedTime: verifyMetadata ? metadataVersion : '',
    expectedFiles: policy.EXPECTED.length,
    observed: observed,
    issues: issues,
    targetWrites: 0,
    evidenceWrites: 0,
    productionReady: false
  };
}

function sav11DriveHashPreflightV13() {
  var result;
  try { result = sav11DriveV13Read_(false); }
  catch (err) {
    result = {
      status: 'SAV11_SOURCE_ATTESTATION_BLOCKED',
      issues: [String(err && err.message || err).slice(0, 140)],
      targetWrites: 0, evidenceWrites: 0, productionReady: false
    };
  }
  console.log('SAV11_V13_HASH_PREFLIGHT:\n' + JSON.stringify(result, null, 2));
  return result;
}

function sav11IndependentDriveAttestationV13() {
  var result;
  try {
    var first = sav11DriveV13Read_(true);
    if (first.status !== 'SAV11_DRIVE_SOURCE_MATCH_PASS') {
      first.evidenceWrites = 0;
      result = first;
    } else {
      var second = sav11DriveV13Read_(true);
      var bothMatch = second.status === 'SAV11_DRIVE_SOURCE_MATCH_PASS' &&
        second.targetScriptId === first.targetScriptId &&
        second.targetProjectTitleClaimed === first.targetProjectTitleClaimed &&
        second.targetProjectTitleVerified === true &&
        second.metadataModifiedTime === first.metadataModifiedTime &&
        sav11SameObserved_(first.observed, second.observed);
      if (!bothMatch) {
        first.status = 'SAV11_SOURCE_ATTESTATION_BLOCKED';
        first.issues.push('SAV11_DRIVE_DOUBLE_READ_MISMATCH');
        first.evidenceWrites = 0;
        result = first;
      } else {
        first.sourceStablePreSave = true;
        first.sourceRecheckAt = second.verifiedAt;
        // Original SAV11 v1.2 helper checks PRIVATE folder, creates a
        // unique JSON file and readbacks its bytes; targeted rollback on error.
        first.evidence = sav11SavePrivateJson_('SAV11_DRIVE_SOURCE_ATTESTATION_V13', first);
        first.evidenceWrites = 1;
        result = first;
      }
    }
  } catch (err) {
    result = {
      version: SAV11_DRIVE_V13_.VERSION,
      status: 'SAV11_SOURCE_ATTESTATION_BLOCKED',
      issues: [String(err && err.message || err).slice(0, 140)],
      targetWrites: 0, evidenceWrites: 0, productionReady: false
    };
  }
  console.log('SAV11_V13_RESULT:\n' + JSON.stringify(result, null, 2));
  return result;
}
