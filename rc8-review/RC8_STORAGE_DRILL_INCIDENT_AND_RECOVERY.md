# PHA-07B B2 RC8 — Storage Drill Incident / Recovery

Date: 2026-10-11 Asia/Jakarta. Scope: **synthetic staging only**.
Target workbook ID: `1EdmIg1te51db4_hQO6f9-VEt8EuLiB-ZmRAhxuvDg68`.
Pre-drill independent snapshot: `1ur6ekK3SDF0GoecSTBZH7aXKsGDJw4h2GMqErhM6ySk`.

## Incident

Runtime summary at 17:30:02:
- `status=RC8_STORAGE_PROXY_DRILL_NOT_ACCEPTED`
- `passed=3` storage proxies, `rollbackRestored=false`
- `error=RC8_ROLLBACK_READBACK_MISMATCH`
- `verifiedAfterRollback=true` was only a **structural** preflight and did not establish equality.

Comparing staging to the pre-drill snapshot using authenticated Google Sheets cell readback exposed:
- `Rekap_Kinerja!A2,N2`: original `stringValue` dates converted to numeric date serials; `A4,N4` acquired residual number formats.
- `Index_Laporan!D2,E2,K2`: original strings converted to numeric serials. `A2:L2` and `A4:L4` acquired residual General number formats.
- `Audit_Log!A4:A6`: empty cells acquired DATE_TIME formatting.
- 31 **cell-level** differences across inspected regions before recovery: 4 source, 24 index, 3 audit.
- Queue, disposition recipient, disposition log remained equal to snapshot.

**Cause:** The RC8 V1 rollback used `Range.setValues` and `setNumberFormats`. Writing text date/period strings in a non-text-formatted cell permitted Google Sheets to parse them as dates/serials; formatting and newly created empty cells were not fully restored. `JSON.stringify` comparison correctly rejected typed-value changes even though the preflight did not.

## Recovery executed

Using the Google Sheets structured `updateCells` API on staging only:
1. Restored original typed `stringValue` values for source `A2,N2`, index `A2:L2`.
2. Cleared residual user-entered number formats on `Rekap_Kinerja!A4,N4`, `Index_Laporan!A4:L4`, and `Audit_Log!A4:A6`.
3. Preserved unrelated cell fields and workbook structure.
4. Independent readback compared **userEnteredValue, effectiveValue, formattedValue, userEnteredFormat.numberFormat, dataValidation** against the snapshot.

Result: **0 differences** across inspected `Rekap_Kinerja!A1:BS5`, `Index_Laporan!A1:L5`, `Audit_Log!A1:D8`, `Index_Laporan_Sync_Queue!A1:L5`, `Disposisi_Penerima!A1:L4`, and `Disposisi_Log!A1:N4`.

Snapshot is retained. `main` and production Apps Script were not modified.

## Mitigation

The staging-branch `RC8_StagingAcceptance.gs` was updated to `PHA07B2-RC8-STAGING-2026.10.11.2`:
- `rc8StagingWriteDrillV1` now **always refuses execution**.
- New `rc8ReadOnlyRollbackAuditV12` checks staging structure, two projection rows, typed text dates/period, baseline row emptiness, audit/queue counts, and disabled drill property.
- Operators must set `RC8_WRITE_DRILL_ENABLED=false` in their independently configured staging Apps Script project; this property cannot be checked remotely here.
- Future write drills require a separate disposable copy with a type-safe restoration strategy and complete state comparison. No rerun of V1.
- Runtime acceptance of V1 remains **NOT ACCEPTED**, despite external recovery.

Production decision: **NO-GO**. This incident does not establish acceptance of authenticated submit/revision/admin-review endpoints.
