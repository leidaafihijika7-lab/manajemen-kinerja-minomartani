# PHA-07B B0 — Isolated Transaction & Queue Test Environment

**Date:** 11 October 2026 (Asia/Jakarta)  
**Version:** PHA07B-B0-ENV-RC1-2026.10.11.01  
**Environment:** SANDBOX_PHA07B_B0_SYNTHETIC_ONLY  
**Native Google Sheet:** https://docs.google.com/spreadsheets/d/1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8/edit  
**Status:** ENVIRONMENT CREATED AND CONNECTOR VERIFIED / OPERATOR SCRIPT PREFLIGHT PENDING / PRODUCTION NO-GO.

## Deliverables

New isolated, native Google Sheets file, not a copy of production, comprising ten tabs:

1. `MULAI_DI_SINI` — synthetic-only sentinel and operating constraints.
2. `SKENARIO_B0` — 15 acceptance scenarios, all not yet performed.
3. `Rekap_Kinerja` — 2 synthetic reports, 71-column production-aligned header.
4. `Index_Laporan` — 2 index rows, 12-column header.
5. `Index_Laporan_Sync_Queue` — exact queue header, **zero queued rows**.
6. `Disposisi_Surat` — one synthetic disposition.
7. `Disposisi_Penerima` — one synthetic recipient/report link.
8. `Audit_Log` — two synthetic submit audit entries.
9. `Disposisi_Log` — one synthetic disposition creation event.
10. `EVENT_JOURNAL_B0` — header-only, zero synthetic test events.

## Verified isolation and baseline

Connector read-back verified native title, all ten exact tab names, IDs B0-RPT-0001 and B0-RPT-0002 in both source/index, original index pointer rows 2 and 3, queue header only, two audit submits, and synthetic disposition relationship.

The first two synthetic reports are **test fixtures**, not reconstructed historic user reports. No real user IDs, personnel, Drive URLs, auth tokens or production data are imported.

The local source workbook `/mnt/data/SANDBOX_PHA07B_B0_SYNTHETIC_ONLY.xlsx` passed local openpyxl structure validation. Native spreadsheet was authored through connected Google Sheets directly after the connector import endpoint could not resolve the local-file reference; the verified **native Google Sheets URL** above is the canonical output. The local XLSX should not be treated as the canonical live fixture.

## Read-only operator action (B0)

1. In Apps Script create a **new standalone project** `SANDBOX_PHA07B_B0_SCRIPT_TEST`. Do NOT reuse `SANDBOX_PHA_RC1_SCRIPT_TEST`, which is bound to a different six-tab workbook.
2. Add `PHASandboxB0EnvironmentRC1.gs` from the feature branch to the new blank project. Do NOT paste into live `Manajemen Kinerja`.
3. Do NOT create triggers or Web App deployment. Do NOT copy production Kode.gs, SheetSchema.gs, or Script Properties.
4. Run `validasiLogikaB0PHA07BRC1()`: expected **8/8 PASS**.
5. Run `praUjiLingkunganB0PHA07BRC1()`: expected `sukses=true`, `mode=READ_ONLY`, `isolatedSyntheticVerified=true`, `queueInitiallyEmpty=true`, `crossReferencesVerified=true`, `noVisibleTriggers=true`, `writesEnabled=false`, `productionDataWritten=false`, `acceptanceApproved=false`.
6. Share `PHA07B_B0_PURE_VALIDATION` and `PHA07B_B0_PREFLIGHT` logs. No write tests are approved.

## Scope boundary

**B0 acceptance establishes the environment only**, not real transaction/queue behavior. B1 will separately instrument synthetic submit, idempotency, review, disposition, error injection, queue retry and typed rollback. In particular, source ROW replay without a bound original ID must not be classified as safely reconciled.

Neither `ACE-DSP-004` nor `ACE-REV-003` may be automatically changed to PASS. No production edits, deployments or `main` merges are authorized.