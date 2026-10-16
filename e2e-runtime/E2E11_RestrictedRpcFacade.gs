/**
 * PHA-07B B2 — RPC Surface Remediation & Universal Write Guard v1.0.
 * Candidate staging-only browser API. NEVER deploy to RC8.2 or production.
 *
 * All legacy Kode.gs globals (except doGet) MUST have an underscore suffix.
 * This file is the sole browser RPC surface; every callable non-status RPC
 * requires BOTH reviewed web gating and the universal E0/write gate.
 *
 * All functions that can mint sessions, update cache/properties, read legacy
 * status, review, or mutate data deliberately use the write gate.
 */
var E2E11_RPC_CONTRACT_ = Object.freeze({
  version: 'PHA07B2-B2-RPC-REMEDIATION-V1-2026.10.16',
  baselineSourceCommit: '51fb7a0cd68927eb1a263f1edb8c421d40defd83',
  surface: [
    'doGet',
    'e2e11RpcStatus',
    'e2e11RpcLogin',
    'e2e11RpcSession',
    'e2e11RpcLogout',
    'e2e11RpcHistory',
    'e2e11RpcRejectedReport',
    'e2e11RpcSubmit',
    'e2e11RpcRevise',
    'e2e11RpcReview',
    'e2e11RpcReviewEmployees',
    'e2e11RpcReviewReports',
    'e2e11RpcUploadEvidence'
  ]
});

function e2e11RequireRpcWrite_() {
  // Always check deployment + real tester identity, even for direct RPC calls.
  e2e10RequireWebGate_();
  var p = e2e10AssertStage_();
  if (p.getProperty('E2E_RPC_SECURITY_AUDIT_APPROVED') !== 'true') {
    throw new Error('E2E_RPC_SECURITY_REVIEW_REQUIRED');
  }
  // Checks pinned project, principal, independent E0, sentinel, run ID,
  // no triggers and E2E_WRITE_ENABLED before any app-side mutation.
  e2e10RequireWrites_();
  return true;
}

function e2e11RequireRpcUpload_() {
  e2e11RequireRpcWrite_();
  e2e10RequireUploadWrite_();
  return true;
}

// The only intentionally non-mutating browser RPC. No caller identity,
// raw tokens, script IDs, exact storage IDs or confidential configuration.
function e2e11RpcStatus() {
  e2e10RequireWebGate_();
  var p = e2e10AssertStage_();
  return {
    sukses: true,
    version: E2E11_RPC_CONTRACT_.version,
    environment: 'SYNTHETIC_STAGING_ONLY',
    auditApproved: p.getProperty('E2E_RPC_SECURITY_AUDIT_APPROVED') === 'true',
    writesFlag: p.getProperty('E2E_WRITE_ENABLED') === 'true',
    uploadFlag: p.getProperty('E2E_UPLOAD_ENABLED') === 'true',
    productionReady: false
  };
}

function e2e11RpcLogin(username, pin, clientId) {
  e2e11RequireRpcWrite_(); // Login mutates rate-limit/cache/session state.
  if (typeof username !== 'string' || username.length > 160 ||
      typeof pin !== 'string' || pin.length > 160) {
    throw new Error('E2E_INVALID_LOGIN_INPUT');
  }
  var cid = String(clientId || '');
  if (cid.length > 128) throw new Error('E2E_INVALID_CLIENT_ID');
  return cekLogin_(username, pin, cid);
}

function e2e11RpcSession(token) {
  e2e11RequireRpcWrite_(); // Legacy session check may migrate/cache a token.
  return cekSessionAktif_(String(token || ''));
}

function e2e11RpcLogout(token) {
  e2e11RequireRpcWrite_();
  return akhiriSession_(String(token || ''));
}

function e2e11RpcHistory(params, token) {
  e2e11RequireRpcWrite_(); // Conservative guard for cache and audit effects.
  return ambilRiwayatKuPaged_(params || {}, String(token || ''));
}

function e2e11RpcRejectedReport(reportId, token) {
  e2e11RequireRpcWrite_();
  return ambilLaporanDitolakUntukRevisi_(reportId, String(token || ''));
}

function e2e11RpcSubmit(payload, token) {
  e2e11RequireRpcWrite_();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('E2E_INVALID_SUBMIT_PAYLOAD');
  }
  return simpanDataKinerja_(payload, String(token || ''));
}

function e2e11RpcRevise(payload, token) {
  e2e11RequireRpcWrite_();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('E2E_INVALID_REVISION_PAYLOAD');
  }
  return simpanRevisiLaporanDitolakPegawai_(payload, String(token || ''));
}

function e2e11RpcReview(reportId, status, points, notes, token) {
  e2e11RequireRpcWrite_();
  return prosesReviewAdmin_(reportId, status, points, notes, String(token || ''));
}

function e2e11RpcReviewEmployees(token) {
  e2e11RequireRpcWrite_();
  return ambilDaftarPegawaiReviewAdmin_(String(token || ''));
}

function e2e11RpcReviewReports(employeeId, status, fromDate, toDate, offset, limit, token) {
  e2e11RequireRpcWrite_();
  return ambilLaporanAdminPerPegawai_(
    employeeId, status || '', fromDate || '', toDate || '',
    offset || 0, limit || 10, String(token || '')
  );
}

function e2e11RpcUploadEvidence(formObject) {
  e2e11RequireRpcUpload_();
  if (!formObject || typeof formObject !== 'object') {
    throw new Error('E2E_INVALID_UPLOAD_FORM');
  }
  return uploadBuktiKinerjaBlob_(formObject);
}
