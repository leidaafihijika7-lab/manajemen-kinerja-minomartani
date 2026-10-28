/**
 * Galaxy A07 staging-only upload/session diagnostics, v1.
 * No production spreadsheet writes; never logs identity, token, PIN, file,
 * filename, narrative, image, payload, URL, or raw backend error.
 * Enabling conditions are BOTH a deliberate staging-only Script Property
 * and a hard-pinned staging spreadsheet ID/name (fail closed).
 */
var STAGING_UPLOAD_DIAG_DB_ID_V1_ = '1lyQuCfr5kOzDnzKthYhMbjum95d8yDxKz7LLdwM6NzY';
var STAGING_UPLOAD_DIAG_EVENTS_V1_ = {
  PAGE_LOAD:1, LOGIN_OK:1, UPLOAD_REQUEST:1, UPLOAD_OK:1,
  UPLOAD_REJECTED:1, UPLOAD_TRANSPORT_FAIL:1,
  SAVE_REQUEST:1, SAVE_OK:1, SAVE_REJECTED:1,
  SAVE_SESSION_EXPIRED:1, SAVE_UNKNOWN_RESPONSE:1, SAVE_TRANSPORT_FAIL:1,
  SESSION_MONITOR_INVALID:1, SESSION_RESTORE_INVALID:1,
  LOGOUT_CALLED:1, PAGEHIDE:1
};
var STAGING_UPLOAD_DIAG_CODES_V1_ = {
  NONE:1, UPLOAD:1, SAVE:1, SESSION:1,
  TOKEN_INVALID:1, REJECTED:1, TRANSPORT:1,
  NO_MESSAGE:1, MESSAGE:1, SKIP_SERVER:1, OTHER:1
};

function stagingUploadDiagEnabledV1_() {
  try {
    var property = PropertiesService.getScriptProperties().getProperty('STAGING_UPLOAD_DIAG_V1');
    if (property !== 'ON') return false;
    var db = getSS_();
    return !!db && db.getId() === STAGING_UPLOAD_DIAG_DB_ID_V1_
      && /^STAGING\s*-\s*/i.test(String(db.getName() || ''));
  } catch (e) {
    return false; // never fail open
  }
}

function normalizeStagingDiagEventV1_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  var event = String(input.event || '');
  var code = String(input.code || 'NONE');
  var traceId = String(input.traceId || '');
  if (!Object.prototype.hasOwnProperty.call(STAGING_UPLOAD_DIAG_EVENTS_V1_, event)) return null;
  if (!Object.prototype.hasOwnProperty.call(STAGING_UPLOAD_DIAG_CODES_V1_, code)) return null;
  if (!/^A07-[0-9a-f]{24}$/.test(traceId)) return null;
  var seq = Number(input.seq);
  var clientMs = Number(input.clientMs);
  if (!Number.isInteger(seq) || seq < 1 || seq > 10000) return null;
  if (!Number.isFinite(clientMs) || clientMs <= 0 || clientMs > 4102444800000) return null;
  return {tag:'STAGING_UPLOAD_DIAG_V1',traceId:traceId,event:event,code:code,
    seq:seq,clientMs:Math.floor(clientMs),serverAt:new Date().toISOString()};
}

function catatStagingUploadDiagV1_(input) {
  if (!stagingUploadDiagEnabledV1_()) return { recorded:false,reason:'DISABLED' };
  var safe = normalizeStagingDiagEventV1_(input);
  if (!safe) return { recorded:false,reason:'INVALID_EVENT' };
  // No additional fields are copied into the log or response.
  console.info(JSON.stringify(safe));
  return { recorded:true };
}

function ujiSanitasiStagingUploadDiagV1_() {
  // Synthetic, no spreadsheet, no properties, no portal users.
  var cases = [], id = 'A07-0123456789abcdef01234567';
  function assert(label,pass){cases.push({name:label,pass:!!pass});}
  var sample = {traceId:id,event:'UPLOAD_OK',code:'UPLOAD',seq:2,clientMs:1793196000000,
    token:'SENSITIVE',pin:'SENSITIVE',filename:'SENSITIVE',user:'SENSITIVE',foto:'SENSITIVE'};
  var safe = normalizeStagingDiagEventV1_(sample);
  assert('whitelisted_fields',!!safe && Object.keys(safe).sort().join(',') ===
    ['tag','traceId','event','code','seq','clientMs','serverAt'].sort().join(','));
  assert('credentials_not_logged',!!safe && !JSON.stringify(safe).includes('SENSITIVE'));
  assert('unknown_event_rejected',normalizeStagingDiagEventV1_(
    {traceId:id,event:'READ_TOKEN',code:'NONE',seq:1,clientMs:1793196000000})===null);
  assert('unknown_code_rejected',normalizeStagingDiagEventV1_(
    {traceId:id,event:'UPLOAD_OK',code:'raw error',seq:1,clientMs:1793196000000})===null);
  assert('bad_trace_rejected',normalizeStagingDiagEventV1_(
    {traceId:'account-token',event:'UPLOAD_OK',code:'NONE',seq:1,clientMs:1793196000000})===null);
  assert('bad_sequence_rejected',normalizeStagingDiagEventV1_(
    {traceId:id,event:'UPLOAD_OK',code:'NONE',seq:-1,clientMs:1793196000000})===null);
  assert('bad_timestamp_rejected',normalizeStagingDiagEventV1_(
    {traceId:id,event:'UPLOAD_OK',code:'NONE',seq:1,clientMs:'invalid'})===null);
  return {passed:cases.filter(function(x){return x.pass;}).length,total:cases.length,cases:cases,
    mode:'PURE_SYNTHETIC_NO_SHEETS'};
}
