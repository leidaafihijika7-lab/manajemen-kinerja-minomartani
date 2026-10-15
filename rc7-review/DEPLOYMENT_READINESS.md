# PHA-07B B2 RC7 | Deployment readiness: NO-GO

This review branch is based on main commit 4ae900b051200e12d6f1bdc66a09a345004dabb9. Only the candidate helper and reviewed bridge instructions are in this branch. The legacy Kode.gs file is unchanged, and the guard is NOT installed on the production Apps Script project.

RC7 candidate: fail-closed triple (ID_LAPORAN, ID_USER, NONCE), queue provenance, ScriptLock-owned checks, idempotent index writes, quarantine stale/duplicate legacy jobs, and manual-only full rebuild. Replay requires existing dual-write enabled AND a distinct INDEX_LAPORAN_RC7_REPLAY_ENABLED=true property; no automatic activation is provided.

Local Node.js mock regression: 38/38 passed. RC7 has not been integrated into the real Apps Script runtime. RC6 synthetic acceptance is not RC7 candidate acceptance.

## Required before a production GO
- Review authenticated origin of business actions and connect submit, revision, admin review, cutoff paths at original commit boundaries; incomplete BY_ID/BY_NONCE jobs remain quarantined.
- Review every index and source mutator, including manual edits, bulk rebuilds, permissions, shared locking, trigger coverage, and data reconciliation.
- Profile latency, Apps Script quotas and lock contention at actual row volumes; candidate limits scan to 10000 rows and replay batches to 25.
- Stage together with four bridge changes, replay OFF; test realistic non-sensitive data, legacy queue, idempotency, partial failures, disposition/audit semantics, and rollback.
- Save current production script version and deployment IDs, metadata, and secure data snapshots. On failure, disable replay, restore previous verified script revision, and reconcile Index_Laporan to source without deleting audit history.
- Require a new explicit operator approval for any production merge/deploy; RC7 does not grant it.

Status: REVIEW ONLY / PRODUCTION NO-GO.
