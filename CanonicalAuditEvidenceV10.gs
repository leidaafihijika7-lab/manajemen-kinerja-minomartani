// ============================================================================
// AUDIT & COMPLIANCE EXPLORER v1.0 - BATCH A
// Canonical Audit Event / Evidence Engine
// Pure deterministic engine: no source reads and no business-state writes.
// ============================================================================

var ACE_CANONICAL_AUDIT_EVIDENCE_V10_VERSION_ = 'ACE-CAE-v1.0-RC1-2026.10.07.01';
var ACE_V10_EVENT_SCHEMA_VERSION_ = 'ACE-AUDIT-EVENT-1.0';
var ACE_V10_EVIDENCE_SCHEMA_VERSION_ = 'ACE-EVIDENCE-REF-1.0';
var ACE_V10_FINDING_SCHEMA_VERSION_ = 'ACE-COMPLIANCE-FINDING-1.0';
var ACE_V10_POSTURE_SCHEMA_VERSION_ = 'ACE-COMPLIANCE-POSTURE-1.0';

var ACE_V10_OUTCOMES_ = ['SUCCESS','FAILED','BLOCKED','INFO'];
var ACE_V10_CONFIDENCE_ = ['LOW','MEDIUM','HIGH'];
var ACE_V10_RESULTS_ = ['PASS','WARN','FAIL','UNKNOWN','NOT_APPLICABLE'];
var ACE_V10_SEVERITY_ = ['INFO','LOW','MEDIUM','HIGH','CRITICAL'];
var ACE_V10_EVIDENCE_INTEGRITY_ = ['VERIFIED','PARTIAL','MISSING','UNAVAILABLE'];
var ACE_V10_EVIDENCE_CLASS_CONFIDENCE_ = { E1:'HIGH', E2:'HIGH', E3:'HIGH', E4:'MEDIUM', E5:'MEDIUM', E6:'LOW' };
var ACE_V10_SECRET_KEY_RE_ = /(^|_)(pin|pin_hash|pin_salt|password|passwd|secret|api_key|apikey|authorization|cookie|session|session_token|token|access_token|refresh_token)(_|$)/i;

function aceV10IsPlainObject_(value) {
  return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function aceV10UniqueStrings_(values) {
  var out = [];
  (values || []).forEach(function (v) {
    var s = String(v == null ? '' : v).trim();
    if (s && out.indexOf(s) === -1) out.push(s);
  });
  return out;
}

function aceV10SanitizeString_(value) {
  var s = String(value == null ? '' : value);
  return s.replace(/\b(API_KEY_GEMINI|PIN_PEPPER|PASSWORD|PASSWD|SECRET|SESSION_TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|AUTHORIZATION|TOKEN)\b\s*[:=]\s*([^\s,;]+)/gi, function (_m, key) {
    return key + '=[REDACTED]';
  });
}

function aceV10SanitizeUri_(value) {
  var s = aceV10SanitizeString_(value);
  return s.replace(/([?&](?:token|access_token|refresh_token|api_key|apikey|key|signature|sig|auth|authorization)=)[^&#]*/gi, '$1[REDACTED]');
}

function aceV10NormalizeScalar_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : value.toISOString();
  if (typeof value === 'number') return isFinite(value) ? value : String(value);
  if (typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return null;
  return aceV10SanitizeString_(value);
}

function aceV10SanitizeValue_(value, keyHint, depth) {
  var d = Number(depth || 0);
  if (d > 20) return '[TRUNCATED_DEPTH]';
  var key = String(keyHint || '');
  if (key && ACE_V10_SECRET_KEY_RE_.test(key)) return '[REDACTED]';
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : value.toISOString();
  if (Array.isArray(value)) return value.map(function (v) { return aceV10SanitizeValue_(v, '', d + 1); });
  if (aceV10IsPlainObject_(value)) {
    var out = {};
    Object.keys(value).forEach(function (k) { out[k] = aceV10SanitizeValue_(value[k], k, d + 1); });
    return out;
  }
  return aceV10NormalizeScalar_(value);
}

function aceV10StableJson_(value) {
  function normalize_(v) {
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
    if (Array.isArray(v)) return v.map(normalize_);
    if (aceV10IsPlainObject_(v)) {
      var out = {};
      Object.keys(v).sort().forEach(function (k) { out[k] = normalize_(v[k]); });
      return out;
    }
    if (typeof v === 'number' && !isFinite(v)) return String(v);
    if (v === undefined) return null;
    return v;
  }
  return JSON.stringify(normalize_(value));
}

function aceV10Sha_(text) {
  var s = String(text == null ? '' : text);
  if (typeof sha256Hex === 'function') return sha256Hex(s);
  if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
    return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  throw new Error('ACE_SHA256_UNAVAILABLE');
}

function aceV10HashValue_(value) {
  return aceV10Sha_(aceV10StableJson_(aceV10SanitizeValue_(value, '', 0)));
}

function aceV10Pad2_(n) { return ('0' + Number(n || 0)).slice(-2); }

function aceV10NormalizeTimestamp_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : value.toISOString();
  if (typeof value === 'number' && isFinite(value)) {
    var dn = new Date(value); return isNaN(dn.getTime()) ? '' : dn.toISOString();
  }
  var s = String(value == null ? '' : value).trim();
  if (!s) return '';
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var isoLocal = m[3]+'-'+m[2]+'-'+m[1]+'T'+aceV10Pad2_(m[4] || 0)+':'+m[5]+':'+aceV10Pad2_(m[6] || 0)+'+07:00';
    var dl = new Date(isoLocal); return isNaN(dl.getTime()) ? '' : dl.toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    var isoJkt = m[1]+'-'+m[2]+'-'+m[3]+'T'+(m[4] || '00')+':'+(m[5] || '00')+':'+(m[6] || '00')+'+07:00';
    var dj = new Date(isoJkt); return isNaN(dj.getTime()) ? '' : dj.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var di = new Date(s); return isNaN(di.getTime()) ? '' : di.toISOString();
  }
  return '';
}

function aceV10NormalizePeriod_(value) {
  var s = String(value == null ? '' : value).trim();
  if (!s) return '';
  var m = s.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return m ? m[1]+'-'+m[2] : '';
}

function aceV10NormalizeCode_(value, fallback) {
  var s = String(value == null ? '' : value).trim().toUpperCase().replace(/[^A-Z0-9_.:\-]/g,'_').replace(/_+/g,'_');
  return s || String(fallback || 'INFO');
}

function aceV10ConfidenceRank_(value) {
  var s = String(value || '').toUpperCase();
  return s === 'HIGH' ? 3 : (s === 'MEDIUM' ? 2 : (s === 'LOW' ? 1 : 0));
}

function aceV10ConfidenceMin_(a, b) {
  var aa = String(a || '').toUpperCase(), bb = String(b || '').toUpperCase();
  if (!ACE_V10_CONFIDENCE_.includes(aa)) aa = 'LOW';
  if (!ACE_V10_CONFIDENCE_.includes(bb)) bb = 'LOW';
  return aceV10ConfidenceRank_(aa) <= aceV10ConfidenceRank_(bb) ? aa : bb;
}

function aceV10SourceClassConfidence_(evidenceClass) {
  return ACE_V10_EVIDENCE_CLASS_CONFIDENCE_[String(evidenceClass || '').toUpperCase()] || 'LOW';
}

function aceV10TryParseDetail_(value) {
  if (aceV10IsPlainObject_(value) || Array.isArray(value)) return { parsed:true, value:aceV10SanitizeValue_(value, '', 0), raw:'' };
  var s = String(value == null ? '' : value).trim();
  if (!s) return { parsed:false, value:'', raw:'' };
  if ((s.charAt(0) === '{' && s.charAt(s.length-1) === '}') || (s.charAt(0) === '[' && s.charAt(s.length-1) === ']')) {
    try { return { parsed:true, value:aceV10SanitizeValue_(JSON.parse(s), '', 0), raw:'' }; } catch (e) { }
  }
  s = aceV10SanitizeString_(s);
  return { parsed:false, value:s, raw:s };
}

function aceV10NormalizeActor_(actor) {
  var a = actor && typeof actor === 'object' ? actor : {};
  return { id:String(a.id || ''), name:String(a.name || ''), role:String(a.role || '').trim().toUpperCase() };
}

function aceV10NormalizeSubject_(subject) {
  var s = subject && typeof subject === 'object' ? subject : {};
  var type = String(s.type || '').trim().toUpperCase();
  if (ACE_V10_ENTITY_TYPES_.indexOf(type) === -1) throw new Error('ACE_SUBJECT_TYPE_INVALID:'+type);
  var id = String(s.id || '').trim();
  if (!id) throw new Error('ACE_SUBJECT_ID_REQUIRED');
  return { type:type, id:id, label:String(s.label || '') };
}

function aceV10NormalizeEvidenceIntegrity_(value) {
  var s = String(value || 'VERIFIED').trim().toUpperCase();
  return ACE_V10_EVIDENCE_INTEGRITY_.indexOf(s) !== -1 ? s : 'UNAVAILABLE';
}

function aceV10BuildEvidenceRef_(input) {
  var x = input && typeof input === 'object' ? input : {};
  var evidenceClass = String(x.evidenceClass || '').trim().toUpperCase();
  if (!aceV10Registry_().evidenceClasses[evidenceClass]) throw new Error('ACE_EVIDENCE_CLASS_INVALID:'+evidenceClass);
  var sourceName = String(x.sourceName || '').trim();
  var sourceRecordId = String(x.sourceRecordId || x.sourceRowOrObjectId || '').trim();
  if (!sourceName) throw new Error('ACE_EVIDENCE_SOURCE_REQUIRED');
  if (!sourceRecordId) throw new Error('ACE_EVIDENCE_RECORD_ID_REQUIRED');
  var payload = aceV10SanitizeValue_(x.payload == null ? (x.metadata == null ? {} : x.metadata) : x.payload, '', 0);
  var payloadHash = String(x.payloadHash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(payloadHash)) payloadHash = aceV10HashValue_(payload);
  var integrity = aceV10NormalizeEvidenceIntegrity_(x.integrity || 'VERIFIED');
  var baseConfidence = aceV10SourceClassConfidence_(evidenceClass);
  var requestedConfidence = String(x.confidence || baseConfidence).trim().toUpperCase();
  if (ACE_V10_CONFIDENCE_.indexOf(requestedConfidence) === -1) requestedConfidence = baseConfidence;
  var confidence = aceV10ConfidenceMin_(requestedConfidence, baseConfidence);
  if (integrity !== 'VERIFIED') confidence = aceV10ConfidenceMin_(confidence, integrity === 'PARTIAL' ? 'MEDIUM' : 'LOW');
  var limitations = aceV10UniqueStrings_(x.limitations || []);
  if (evidenceClass === 'E6' && limitations.indexOf('LEGACY_RECONSTRUCTED_SOURCE') === -1) limitations.push('LEGACY_RECONSTRUCTED_SOURCE');
  if (integrity !== 'VERIFIED' && limitations.indexOf('EVIDENCE_INTEGRITY_'+integrity) === -1) limitations.push('EVIDENCE_INTEGRITY_'+integrity);
  var uri = aceV10SanitizeUri_(x.uri || '');
  var fingerprint = aceV10Sha_([
    ACE_V10_EVIDENCE_SCHEMA_VERSION_,evidenceClass,sourceName,sourceRecordId,payloadHash,uri
  ].join('|'));
  return {
    schemaVersion:ACE_V10_EVIDENCE_SCHEMA_VERSION_, evidenceId:'ACE-EVD-'+fingerprint.substring(0,24).toUpperCase(),
    evidenceClass:evidenceClass, evidenceType:String(aceV10Registry_().evidenceClasses[evidenceClass] || ''),
    sourceName:sourceName, sourceRecordId:sourceRecordId, sourceModule:String(x.sourceModule || ''),
    referenceType:aceV10NormalizeCode_(x.referenceType || 'OBJECT','OBJECT'), label:String(x.label || ''), uri:uri,
    integrity:integrity, payloadHash:payloadHash, metadata:payload, confidence:confidence,
    observedAt:aceV10NormalizeTimestamp_(x.observedAt) || '', limitations:limitations,
    evidenceFingerprint:fingerprint
  };
}

function aceV10DedupeEvidence_(refs) {
  var out = [], seen = Object.create(null);
  (refs || []).forEach(function (ref) {
    var r = ref && ref.schemaVersion === ACE_V10_EVIDENCE_SCHEMA_VERSION_ ? ref : aceV10BuildEvidenceRef_(ref);
    if (!seen[r.evidenceId]) { seen[r.evidenceId] = true; out.push(r); }
  });
  return out;
}

function aceV10BuildEvent_(input) {
  var x = input && typeof input === 'object' ? input : {};
  var domainId = String(x.domainId || '').trim().toUpperCase();
  if (!aceV10Domain_(domainId)) throw new Error('ACE_DOMAIN_UNKNOWN:'+domainId);
  var actionCode = aceV10NormalizeCode_(x.actionCode || 'INFO','INFO');
  var subject = aceV10NormalizeSubject_(x.subject);
  var eventAt = aceV10NormalizeTimestamp_(x.eventAt);
  var limitations = aceV10UniqueStrings_(x.limitations || []);
  if (!eventAt) {
    eventAt = String(x.eventAt || '');
    if (!eventAt) throw new Error('ACE_EVENT_AT_REQUIRED');
    if (limitations.indexOf('EVENT_AT_UNPARSEABLE') === -1) limitations.push('EVENT_AT_UNPARSEABLE');
  }
  var observedAt = aceV10NormalizeTimestamp_(x.observedAt) || new Date().toISOString();
  var outcome = String(x.outcome || 'INFO').trim().toUpperCase();
  if (ACE_V10_OUTCOMES_.indexOf(outcome) === -1) outcome = 'INFO';
  var period = aceV10NormalizePeriod_(x.period || '');
  if (x.period && !period && limitations.indexOf('PERIOD_UNPARSEABLE') === -1) limitations.push('PERIOD_UNPARSEABLE');
  var source = x.source && typeof x.source === 'object' ? x.source : {};
  var evidenceClass = String(source.evidenceClass || '').trim().toUpperCase();
  if (!aceV10Registry_().evidenceClasses[evidenceClass]) throw new Error('ACE_EVENT_SOURCE_CLASS_INVALID:'+evidenceClass);
  var sourceName = String(source.sourceName || '').trim();
  var sourceRecordId = String(source.sourceRecordId || source.sourceRowOrObjectId || '').trim();
  if (!sourceName || !sourceRecordId) throw new Error('ACE_EVENT_SOURCE_REFERENCE_REQUIRED');
  var parsedDetail = aceV10TryParseDetail_(x.detailNormalized == null ? x.detail : x.detailNormalized);
  var detailNormalized = parsedDetail.value;
  var sanitizedSourcePayload = aceV10SanitizeValue_(x.sourcePayload == null ? detailNormalized : x.sourcePayload, '', 0);
  var sourcePayloadHash = aceV10HashValue_(sanitizedSourcePayload);
  var sourceEvidence = aceV10BuildEvidenceRef_({
    evidenceClass:evidenceClass, sourceName:sourceName, sourceRecordId:sourceRecordId,
    sourceModule:String(source.sourceModule || ''), referenceType:String(source.referenceType || 'OBJECT'),
    integrity:source.integrity || 'VERIFIED', payloadHash:sourcePayloadHash, payload:sanitizedSourcePayload,
    label:String(source.label || ''), uri:String(source.uri || ''), observedAt:observedAt,
    confidence:source.confidence, limitations:source.limitations || []
  });
  var evidenceRefs = aceV10DedupeEvidence_([sourceEvidence].concat(x.evidenceRefs || []));
  var baseConfidence = aceV10SourceClassConfidence_(evidenceClass);
  var requestedConfidence = String(x.confidence || baseConfidence).trim().toUpperCase();
  if (ACE_V10_CONFIDENCE_.indexOf(requestedConfidence) === -1) requestedConfidence = baseConfidence;
  var confidence = aceV10ConfidenceMin_(requestedConfidence, baseConfidence);
  evidenceRefs.forEach(function (e) { confidence = aceV10ConfidenceMin_(confidence,e.confidence); });
  if (evidenceClass === 'E6' && limitations.indexOf('LEGACY_RECONSTRUCTED_SOURCE') === -1) limitations.push('LEGACY_RECONSTRUCTED_SOURCE');
  var fingerprint = aceV10Sha_([
    ACE_V10_EVENT_SCHEMA_VERSION_,evidenceClass,sourceName,sourceRecordId,eventAt,actionCode,subject.id,sourcePayloadHash
  ].join('|'));
  return {
    schemaVersion:ACE_V10_EVENT_SCHEMA_VERSION_, eventId:'ACE-EVT-'+fingerprint.substring(0,24).toUpperCase(),
    eventAt:eventAt, observedAt:observedAt, domainId:domainId, actionCode:actionCode,
    actor:aceV10NormalizeActor_(x.actor), subject:subject, period:period,
    stateBefore:aceV10SanitizeValue_(x.stateBefore == null ? null : x.stateBefore,'',0),
    stateAfter:aceV10SanitizeValue_(x.stateAfter == null ? null : x.stateAfter,'',0),
    outcome:outcome,
    source:{ evidenceClass:evidenceClass, sourceName:sourceName, sourceRowOrObjectId:sourceRecordId, sourceModule:String(source.sourceModule || '') },
    evidenceRefs:evidenceRefs, detailNormalized:detailNormalized, sourcePayloadHash:sourcePayloadHash,
    eventFingerprint:fingerprint, confidence:confidence, limitations:limitations
  };
}

function aceV10DedupeEvents_(events) {
  var out = [], seen = Object.create(null);
  (events || []).forEach(function (item) {
    var event = item && item.schemaVersion === ACE_V10_EVENT_SCHEMA_VERSION_ ? item : aceV10BuildEvent_(item);
    if (!seen[event.eventId]) { seen[event.eventId] = event.eventFingerprint; out.push(event); return; }
    if (seen[event.eventId] !== event.eventFingerprint) throw new Error('ACE_EVENT_ID_COLLISION:'+event.eventId);
  });
  return out;
}

function aceV10SortEvents_(events, direction) {
  var out = aceV10DedupeEvents_(events).slice();
  var desc = String(direction || 'DESC').toUpperCase() !== 'ASC';
  out.sort(function (a,b) {
    var av = aceV10NormalizeTimestamp_(a.eventAt) || String(a.eventAt || '');
    var bv = aceV10NormalizeTimestamp_(b.eventAt) || String(b.eventAt || '');
    var cmp = av < bv ? -1 : (av > bv ? 1 : 0);
    if (cmp === 0) cmp = String(a.eventId).localeCompare(String(b.eventId));
    return desc ? -cmp : cmp;
  });
  return out;
}

function aceV10EvidenceRefsFromEvents_(events) {
  var refs = [];
  (events || []).forEach(function (e) { (e && e.evidenceRefs || []).forEach(function (r) { refs.push(r); }); });
  return aceV10DedupeEvidence_(refs);
}

function aceV10AssessEvidenceRequirement_(requiredClasses, evidenceRefs) {
  var required = aceV10UniqueStrings_(requiredClasses || []).map(function (x) { return x.toUpperCase(); });
  if (!required.length) return { integrity:'VERIFIED', required:[], present:[], missing:[], unavailable:[], partial:[] };
  var refs = aceV10DedupeEvidence_(evidenceRefs || []), present = [], missing = [], unavailable = [], partial = [];
  required.forEach(function (cls) {
    var matches = refs.filter(function (r) { return r.evidenceClass === cls; });
    if (!matches.length) { missing.push(cls); return; }
    present.push(cls);
    var hasVerified = matches.some(function (r) { return r.integrity === 'VERIFIED'; });
    var hasPartial = matches.some(function (r) { return r.integrity === 'PARTIAL'; });
    var onlyUnavailable = matches.every(function (r) { return r.integrity === 'UNAVAILABLE'; });
    if (hasVerified) return;
    if (onlyUnavailable) unavailable.push(cls); else if (hasPartial) partial.push(cls); else missing.push(cls);
  });
  var integrity = 'VERIFIED';
  if (missing.length) integrity = 'MISSING';
  else if (unavailable.length) integrity = 'UNAVAILABLE';
  else if (partial.length) integrity = 'PARTIAL';
  return { integrity:integrity, required:required, present:present, missing:missing, unavailable:unavailable, partial:partial };
}

function aceV10DefaultFindingSeverity_(result, control) {
  var r = String(result || '').toUpperCase();
  if (r === 'FAIL') return String(control && control.severityOnFail || 'MEDIUM').toUpperCase();
  if (r === 'WARN') {
    var sev = String(control && control.severityOnFail || 'MEDIUM').toUpperCase();
    return ['CRITICAL','HIGH'].indexOf(sev) !== -1 ? 'MEDIUM' : sev;
  }
  if (r === 'UNKNOWN') return 'MEDIUM';
  return 'INFO';
}

function aceV10BuildFinding_(input) {
  var x = input && typeof input === 'object' ? input : {};
  var controlId = String(x.controlId || '').trim().toUpperCase(), control = aceV10Control_(controlId);
  if (!control) throw new Error('ACE_CONTROL_UNKNOWN:'+controlId);
  var domainId = aceV10ControlDomainId_(controlId), result = String(x.result || 'UNKNOWN').trim().toUpperCase();
  if (ACE_V10_RESULTS_.indexOf(result) === -1) throw new Error('ACE_FINDING_RESULT_INVALID:'+result);
  var entityKey = String(x.entityKey || '').trim();
  if (!entityKey) throw new Error('ACE_FINDING_ENTITY_REQUIRED');
  var period = aceV10NormalizePeriod_(x.period || '');
  var events = aceV10DedupeEvents_(x.events || []), refs = aceV10DedupeEvidence_((x.evidenceRefs || []).concat(aceV10EvidenceRefsFromEvents_(events)));
  var evidenceAssessment = aceV10AssessEvidenceRequirement_(control.evidenceRequired || [], refs);
  var evidenceIntegrity = String(x.evidenceIntegrity || evidenceAssessment.integrity).toUpperCase();
  if (ACE_V10_EVIDENCE_INTEGRITY_.indexOf(evidenceIntegrity) === -1) evidenceIntegrity = evidenceAssessment.integrity;
  var severity = String(x.severity || aceV10DefaultFindingSeverity_(result,control)).trim().toUpperCase();
  if (ACE_V10_SEVERITY_.indexOf(severity) === -1) severity = aceV10DefaultFindingSeverity_(result,control);
  var evidenceEventIds = aceV10UniqueStrings_((x.evidenceEventIds || []).concat(events.map(function (e) { return e.eventId; }))).sort();
  var fingerprint = aceV10Sha_([
    ACE_V10_FINDING_SCHEMA_VERSION_,controlId,domainId,entityKey,period,result,severity,evidenceIntegrity,evidenceEventIds.join(',')
  ].join('|'));
  return {
    schemaVersion:ACE_V10_FINDING_SCHEMA_VERSION_, findingId:'ACE-FND-'+fingerprint.substring(0,24).toUpperCase(),
    controlId:controlId, domainId:domainId, entityKey:entityKey, period:period, result:result, severity:severity,
    title:String(x.title || control.title || ''), explanation:String(x.explanation || ''), recommendation:String(x.recommendation || ''),
    evidenceEventIds:evidenceEventIds, evidenceIntegrity:evidenceIntegrity, evidenceAssessment:evidenceAssessment,
    sourceModuleRoute:aceV10SanitizeValue_(x.sourceModuleRoute || null,'',0),
    controlFingerprint:fingerprint, evaluatedAt:aceV10NormalizeTimestamp_(x.evaluatedAt) || new Date().toISOString(),
    limitations:aceV10UniqueStrings_(x.limitations || [])
  };
}

function aceV10SeverityRank_(severity) {
  var map = { INFO:0, LOW:1, MEDIUM:2, HIGH:3, CRITICAL:4 };
  return map[String(severity || '').toUpperCase()] == null ? 0 : map[String(severity || '').toUpperCase()];
}

function aceV10AggregatePosture_(findings) {
  var rows = (findings || []).map(function (f) { return f && f.schemaVersion === ACE_V10_FINDING_SCHEMA_VERSION_ ? f : aceV10BuildFinding_(f); });
  var applicable = rows.filter(function (f) { return f.result !== 'NOT_APPLICABLE'; });
  var counts = { PASS:0, WARN:0, FAIL:0, UNKNOWN:0, NOT_APPLICABLE:0, CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, INFO:0 };
  rows.forEach(function (f) { counts[f.result] = (counts[f.result] || 0) + 1; counts[f.severity] = (counts[f.severity] || 0) + 1; });
  var posture = 'COMPLIANT';
  if (!applicable.length) posture = 'NOT_APPLICABLE';
  else if (applicable.some(function (f) { return f.result === 'FAIL' && aceV10SeverityRank_(f.severity) >= aceV10SeverityRank_('HIGH'); })) posture = 'NON_COMPLIANT';
  else if (applicable.some(function (f) { return f.result === 'WARN' || (f.result === 'FAIL' && aceV10SeverityRank_(f.severity) <= aceV10SeverityRank_('MEDIUM')); })) posture = 'NEEDS_REVIEW';
  else if (applicable.some(function (f) { return f.result === 'UNKNOWN' || f.evidenceIntegrity === 'MISSING' || f.evidenceIntegrity === 'UNAVAILABLE'; })) posture = 'UNVERIFIABLE';
  else if (applicable.some(function (f) { return f.evidenceIntegrity === 'PARTIAL'; })) posture = 'NEEDS_REVIEW';
  return { schemaVersion:ACE_V10_POSTURE_SCHEMA_VERSION_, posture:posture, total:rows.length, applicable:applicable.length, counts:counts };
}

function aceV10ValidatePureEngineSafety_() {
  var source = '';
  try { source = String(aceV10BuildEvent_) + String(aceV10BuildEvidenceRef_) + String(aceV10BuildFinding_); } catch (e) { }
  var forbidden = ['SpreadsheetApp','DriveApp','PropertiesService','ScriptApp','LockService','CacheService','UrlFetchApp'];
  return { ok:forbidden.every(function (x) { return source.indexOf(x) === -1; }), forbidden:forbidden.filter(function (x) { return source.indexOf(x) !== -1; }) };
}

function validasiCanonicalAuditEvidenceV10() {
  var checks = [];
  function add_(name, ok, detail) { checks.push({ nama:name, lulus:ok === true, detail:String(detail == null ? '' : detail) }); }
  function sampleEvidence_(cls, integrity, id) {
    return aceV10BuildEvidenceRef_({ evidenceClass:cls, sourceName:'TEST_'+cls, sourceRecordId:id || cls, sourceModule:'SYNTHETIC', integrity:integrity || 'VERIFIED', payload:{ id:id || cls, secret:'hidden' } });
  }
  var ev1 = aceV10BuildEvent_({
    eventAt:'07/10/2026 17:08:10', observedAt:'2026-10-07T10:09:00Z', domainId:'BACKUP_RECOVERY', actionCode:'DR_DRILL_PASSED',
    actor:{id:'SYSTEM_BDR',name:'System BDR',role:'SYSTEM'}, subject:{type:'DR_DRILL',id:'DR-001',label:'Drill'}, period:'2026-10', outcome:'SUCCESS',
    source:{evidenceClass:'E3',sourceName:'DR_DRILLS',sourceRecordId:'DR-001',sourceModule:'BackupDisasterRecoveryV10.gs'},
    sourcePayload:{ status:'PASSED', token:'secret-token', pointerBefore:'A', pointerAfter:'A' }, detail:{ status:'PASSED' }
  });
  var ev2 = aceV10BuildEvent_({
    eventAt:'07/10/2026 17:08:10', observedAt:'2026-10-07T11:00:00Z', domainId:'BACKUP_RECOVERY', actionCode:'DR_DRILL_PASSED',
    actor:{id:'SYSTEM_BDR',name:'System BDR',role:'SYSTEM'}, subject:{type:'DR_DRILL',id:'DR-001'}, period:'2026-10', outcome:'SUCCESS',
    source:{evidenceClass:'E3',sourceName:'DR_DRILLS',sourceRecordId:'DR-001',sourceModule:'BackupDisasterRecoveryV10.gs'},
    sourcePayload:{ pointerAfter:'A', token:'different-secret', pointerBefore:'A', status:'PASSED' }, detail:{ status:'PASSED' }
  });
  // Secret values are redacted before hash, so changing only the secret must not change identity.
  add_('EVENT_SCHEMA',ev1.schemaVersion === ACE_V10_EVENT_SCHEMA_VERSION_,ev1.schemaVersion);
  add_('EVENT_ID_PREFIX',ev1.eventId.indexOf('ACE-EVT-') === 0,ev1.eventId);
  add_('EVENT_DOMAIN',ev1.domainId === 'BACKUP_RECOVERY',ev1.domainId);
  add_('EVENT_PERIOD',ev1.period === '2026-10',ev1.period);
  add_('EVENT_TIME_NORMALIZED',ev1.eventAt === '2026-10-07T10:08:10.000Z',ev1.eventAt);
  add_('OBSERVED_AT_NOT_IDENTITY',ev1.eventId === ev2.eventId,ev1.eventId+' / '+ev2.eventId);
  add_('SECRET_REDACTION_HASH_STABLE',ev1.sourcePayloadHash === ev2.sourcePayloadHash,ev1.sourcePayloadHash);
  add_('SOURCE_EVIDENCE_AUTO',ev1.evidenceRefs.length === 1,String(ev1.evidenceRefs.length));
  add_('SOURCE_EVIDENCE_CLASS',ev1.evidenceRefs[0].evidenceClass === 'E3',ev1.evidenceRefs[0].evidenceClass);
  add_('SOURCE_CONFIDENCE_HIGH',ev1.confidence === 'HIGH',ev1.confidence);
  add_('DETAIL_OBJECT',aceV10IsPlainObject_(ev1.detailNormalized),typeof ev1.detailNormalized);

  var secret = aceV10BuildEvidenceRef_({evidenceClass:'E1',sourceName:'Audit_Log',sourceRecordId:'1',payload:{pin:'1234',nested:{api_key:'abc',safe:'ok'}}});
  add_('SECRET_PIN_REDACTED',secret.metadata.pin === '[REDACTED]',secret.metadata.pin);
  add_('SECRET_API_KEY_REDACTED',secret.metadata.nested.api_key === '[REDACTED]',secret.metadata.nested.api_key);
  add_('SAFE_VALUE_PRESERVED',secret.metadata.nested.safe === 'ok',secret.metadata.nested.safe);
  add_('RAW_SECRET_STRING_REDACTED',aceV10TryParseDetail_('API_KEY_GEMINI=abc123 next').value.indexOf('abc123') === -1,aceV10TryParseDetail_('API_KEY_GEMINI=abc123 next').value);
  var signedUri = aceV10BuildEvidenceRef_({evidenceClass:'E5',sourceName:'Drive',sourceRecordId:'FILE-X',uri:'https://example.invalid/file?token=abc123&x=1',payload:{id:'FILE-X'}});
  add_('URI_SECRET_REDACTED',signedUri.uri.indexOf('abc123') === -1,signedUri.uri);

  var legacy = sampleEvidence_('E6','VERIFIED','LEGACY-1');
  add_('LEGACY_CONFIDENCE_LOW',legacy.confidence === 'LOW',legacy.confidence);
  add_('LEGACY_LIMITATION',legacy.limitations.indexOf('LEGACY_RECONSTRUCTED_SOURCE') !== -1,legacy.limitations.join(','));
  var partial = sampleEvidence_('E5','PARTIAL','FILE-1');
  add_('PARTIAL_CONFIDENCE_NOT_HIGH',partial.confidence !== 'HIGH',partial.confidence);
  add_('PARTIAL_LIMITATION',partial.limitations.indexOf('EVIDENCE_INTEGRITY_PARTIAL') !== -1,partial.limitations.join(','));

  var reqOk = aceV10AssessEvidenceRequirement_(['E1','E2'],[sampleEvidence_('E1','VERIFIED','1'),sampleEvidence_('E2','VERIFIED','2')]);
  var reqPartial = aceV10AssessEvidenceRequirement_(['E1','E5'],[sampleEvidence_('E1','VERIFIED','1'),sampleEvidence_('E5','PARTIAL','2')]);
  var reqMissing = aceV10AssessEvidenceRequirement_(['E1','E2'],[sampleEvidence_('E1','VERIFIED','1')]);
  var reqUnavailable = aceV10AssessEvidenceRequirement_(['E3'],[sampleEvidence_('E3','UNAVAILABLE','1')]);
  add_('REQ_VERIFIED',reqOk.integrity === 'VERIFIED',reqOk.integrity);
  add_('REQ_PARTIAL',reqPartial.integrity === 'PARTIAL',reqPartial.integrity);
  add_('REQ_MISSING',reqMissing.integrity === 'MISSING',reqMissing.integrity);
  add_('REQ_UNAVAILABLE',reqUnavailable.integrity === 'UNAVAILABLE',reqUnavailable.integrity);

  var duplicate = aceV10DedupeEvents_([ev1,ev1]);
  add_('EVENT_DEDUPE',duplicate.length === 1,String(duplicate.length));
  var sorted = aceV10SortEvents_([aceV10BuildEvent_({
    eventAt:'2026-10-07T09:00:00Z',domainId:'REVIEW',actionCode:'REVIEW',subject:{type:'REPORT',id:'R2'},source:{evidenceClass:'E2',sourceName:'Rekap_Kinerja',sourceRecordId:'2'},sourcePayload:{a:1}
  }),ev1],'DESC');
  add_('EVENT_SORT_DESC',sorted[0].eventId === ev1.eventId,sorted.map(function(x){return x.eventAt;}).join(','));

  var findingPass = aceV10BuildFinding_({ controlId:'ACE-BDR-005',entityKey:'DR-001',period:'2026-10',result:'PASS',events:[ev1],evidenceRefs:[sampleEvidence_('E3','VERIFIED','DR-001')] });
  add_('FINDING_SCHEMA',findingPass.schemaVersion === ACE_V10_FINDING_SCHEMA_VERSION_,findingPass.schemaVersion);
  add_('FINDING_DOMAIN',findingPass.domainId === 'BACKUP_RECOVERY',findingPass.domainId);
  add_('FINDING_PASS_INFO',findingPass.severity === 'INFO',findingPass.severity);
  add_('FINDING_EVIDENCE_VERIFIED',findingPass.evidenceIntegrity === 'VERIFIED',findingPass.evidenceIntegrity);
  var findingFail = aceV10BuildFinding_({ controlId:'ACE-BDR-005',entityKey:'DR-002',period:'2026-10',result:'FAIL',evidenceRefs:[sampleEvidence_('E3','VERIFIED','DR-002')] });
  add_('FINDING_FAIL_CRITICAL',findingFail.severity === 'CRITICAL',findingFail.severity);
  var findingUnknown = aceV10BuildFinding_({ controlId:'ACE-ARC-003',entityKey:'ARC-1',period:'2026-09',result:'UNKNOWN',evidenceRefs:[] });
  add_('FINDING_UNKNOWN_MISSING',findingUnknown.evidenceIntegrity === 'MISSING',findingUnknown.evidenceIntegrity);
  add_('POSTURE_NON_COMPLIANT',aceV10AggregatePosture_([findingPass,findingFail]).posture === 'NON_COMPLIANT',aceV10AggregatePosture_([findingPass,findingFail]).posture);
  add_('POSTURE_UNVERIFIABLE',aceV10AggregatePosture_([findingUnknown]).posture === 'UNVERIFIABLE',aceV10AggregatePosture_([findingUnknown]).posture);
  var warn = aceV10BuildFinding_({controlId:'ACE-DSP-005',entityKey:'DSP-1',result:'WARN',evidenceRefs:[sampleEvidence_('E5','PARTIAL','D1')]});
  add_('POSTURE_NEEDS_REVIEW',aceV10AggregatePosture_([warn]).posture === 'NEEDS_REVIEW',aceV10AggregatePosture_([warn]).posture);
  var na = aceV10BuildFinding_({controlId:'ACE-DSP-005',entityKey:'DSP-NA',result:'NOT_APPLICABLE',evidenceRefs:[sampleEvidence_('E5','VERIFIED','D2')]});
  add_('POSTURE_NOT_APPLICABLE',aceV10AggregatePosture_([na]).posture === 'NOT_APPLICABLE',aceV10AggregatePosture_([na]).posture);

  var safety = aceV10ValidatePureEngineSafety_();
  add_('PURE_ENGINE_NO_IO',safety.ok,safety.forbidden.join(','));
  add_('STABLE_JSON_ORDER',aceV10StableJson_({b:2,a:1}) === aceV10StableJson_({a:1,b:2}),aceV10StableJson_({b:2,a:1}));
  add_('PERIOD_INVALID_EMPTY',aceV10NormalizePeriod_('2026-13') === '',aceV10NormalizePeriod_('2026-13'));
  add_('PERIOD_VALID',aceV10NormalizePeriod_('2026-01') === '2026-01',aceV10NormalizePeriod_('2026-01'));
  add_('JSON_DETAIL_PARSE',aceV10TryParseDetail_('{"a":1}').parsed === true,JSON.stringify(aceV10TryParseDetail_('{"a":1}')));
  add_('TEXT_DETAIL_PRESERVE',aceV10TryParseDetail_('legacy detail').value === 'legacy detail',aceV10TryParseDetail_('legacy detail').value);

  var mutationInput = {safe:'x',nested:{secret:'y'}}, before = JSON.stringify(mutationInput);
  aceV10SanitizeValue_(mutationInput,'',0);
  add_('SANITIZE_NO_INPUT_MUTATION',JSON.stringify(mutationInput) === before,JSON.stringify(mutationInput));

  var failed = checks.filter(function (x) { return x.lulus !== true; });
  var out = { sukses:failed.length === 0, valid:failed.length === 0, versi:ACE_CANONICAL_AUDIT_EVIDENCE_V10_VERSION_, batchVersion:AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_A_VERSION_, jumlah:checks.length, lulus:checks.length-failed.length, gagal:failed.length, checks:checks, dataBisnisDiubah:false };
  try { Logger.log(JSON.stringify(out,null,2)); } catch (e) { }
  return out;
}

function validasiAuditComplianceExplorerBatchAV10() {
  var registry = validasiComplianceDomainRegistryV10();
  var engine = validasiCanonicalAuditEvidenceV10();
  var out = {
    sukses:registry.sukses === true && engine.sukses === true,
    valid:registry.valid === true && engine.valid === true,
    versi:AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_A_VERSION_,
    registry:{ versi:registry.versi, jumlah:registry.jumlah, lulus:registry.lulus, gagal:registry.gagal, domainCount:registry.summary.domainCount, controlCount:registry.summary.controlCount },
    canonicalEngine:{ versi:engine.versi, jumlah:engine.jumlah, lulus:engine.lulus, gagal:engine.gagal },
    pureEngine:true, dataBisnisDiubah:false
  };
  try { Logger.log(JSON.stringify(out,null,2)); } catch (e) { }
  return out;
}
