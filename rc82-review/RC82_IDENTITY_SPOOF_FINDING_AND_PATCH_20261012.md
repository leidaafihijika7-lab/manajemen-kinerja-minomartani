# RC8.2 — Authenticated Submit Identity Spoofing: Confirmed Staging Finding & Patch

**Date:** 2026-10-12, Asia/Jakarta. **Stage:** PHA-07B B2 RC8.2. **Production:** NO-GO; no deployment or merge.

## Runtime finding (operator log at 16:47:10 WIB)

- Version: `PHA07B2-RC82-REVISION-INDEX-FIX-2026.10.11.3`
- `RC82_SECURITY_NOT_ACCEPTED`; **20/21** server-handler checks passed.
- The prior NONCE/index fix now **PASS**: `AUTHENTICATED_OWNER_REVISION`, `indexIdentical:true`, `indexDifferences:[]`, and `queueRows:0`. Admin final review and audit provenance passed.
- **Failure:** `CLIENT_ROLE_AND_NAME_SPOOF_REJECTED`. A synthetic employee session submitted a report with client-supplied `nama=Lurah Palsu Sintetis`, `jabatan=Lurah`, resulting in **one appended row** and `status=Disetujui`. This is a **confirmed staging security defect**, not a mere test assertion mismatch.
- The harness reported `rollbackRestored:true`, `postPreflight:RC82_PREFLIGHT_PASS`; independent Google Sheets verification compared **425 populated/metadata cell positions in 12 bounded tab ranges, 0 differences** against the original baseline snapshot.
- This is **not evidence of exploitation in a deployed production application**. HTTP/PWA was not deployed/tested.

## Root cause

`simpanDataKinerja(paket, token)` authenticates the signed user via `validasiSession` but previously trusted `paket.nama` and `paket.jabatan` from the client. `hitungEvaluasiAwalSubmitKinerja_` used `paket.jabatan` to decide whether to autoapprove a Lurah report; `buildBarisRekapKinerjaSubmit_` wrote the client identity into the report. Therefore the authenticated ID_USER and recorded name/role could disagree.

## Isolated fix candidate

**Branch:** `feat/pha07b2-rc82-submit-identity-hardening` — derived from the accepted RC7 revision-NONCE patch branch.

`Kode.gs` changes:
1. New pure helpers `normalisasiIdentitasSubmitKinerjaSesi_` and `validasiIdentitasSubmitKinerjaSesi_` require matching name and role against `ctx.pegawaiUser` resolved from signed session. Invalid accounts, inactive status, owner mismatch, forged role/name or malformed identity are rejected **before** NONCE reservation, uploads, point evaluation, or append.
2. Once validated, rebind `paket.nama` and `paket.jabatan` to the authoritative server values (cloned packet).
3. Pass `ctx.pegawaiUser` into `hitungEvaluasiAwalSubmitKinerja_`; the autoapproval decision uses that role, not `paket.jabatan`.
4. Persist name/role from `ctx.pegawaiUser` directly in `buildBarisRekapKinerjaSubmit_`.
5. Hard-pin `getSS_()` to a **new** synthetic-only database.

`RC82_AuthenticatedBusinessIntegration.gs` changes:
1. Fail-closed read-only `rc82SubmitIdentityGuardProbeV1_`, including valid name+role, role-only forgery, name-only forgery, inactive account, wrong user ID, and harmless case/whitespace differences.
2. Additional real-handler negative gates `CLIENT_ROLE_ONLY_SPOOF_REJECTED` and `CLIENT_NAME_ONLY_SPOOF_REJECTED`, in addition to the original combined forgery test. Require **no changes to source, index or queue**.
3. Security failures remain classified `RC82_SECURITY_NOT_ACCEPTED`.

## Verification and limits

- Local mock/functional-mirror Node.js regression **27/27 PASS**; **not equivalent to Apps Script runtime acceptance**.
- Static review: all 11 targeted code and staging invariants PASS; only `Kode.gs` and the RC8.2 harness changed relative to the previous branch. `IndexQueueGuardRC7.gs` retains the revision-NONCE fix unchanged.
- New disposable target: `1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU`.
- Independent untouched snapshot: `1p9O9MHQ7gaZI9EbdMB4-Dj9N3LxS9tCfQ8mb0gg1Pzg`.
- Before any runtime transaction, 12 selected tab ranges / 425 cell positions matched, 0 differences (entered/effective values, display, formatting, validations, notes, hyperlinks).
- Neither new preflight nor the authenticated matrix has run in Apps Script yet.
- Residual risks needing separate review: role taxonomy for automatic Lurah approval, alternate submit APIs and HTTP/PWA upload/client surfaces.

**Gate:** In a fresh isolated Apps Script project, first run `rc82ReadOnlyPreflightV1` with all write/replay properties `false`. Review its log before authorizing the one-shot authenticated matrix. A matrix PASS remains provisional until external snapshot readback confirms zero differences. No production deployment, trigger, replay or main merge is authorized.
