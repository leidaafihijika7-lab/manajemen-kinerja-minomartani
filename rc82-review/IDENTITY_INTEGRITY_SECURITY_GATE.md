# RC8.2 Security Gate — Submit Identity Integrity (Pending Runtime Confirmation)

**Scope:** isolated, synthetic business-function test only. **No production changes.**

## Evidence from source inspection

1. `validasiRequestAwalSubmitKinerja_(ctx,paket,token)` resolves `ctx.idUser=validasiSession(token)` and `ctx.pegawaiUser=getPegawaiById_(ctx.idUser)`, but does not visibly bind `paket.nama` or `paket.jabatan` to that authoritative session account.
2. `validasiPayloadSubmitKinerja_(paket,pegawaiUser)` requires name/jabatan to be nonempty, but its inspected body has no identity equality assertion.
3. `buildBarisRekapKinerjaSubmit_(paket,...)` stores `paket.nama` and `paket.jabatan` (client supplied) alongside `ctx.idUser`.
4. `hitungEvaluasiAwalSubmitKinerja_(paket,...)` uses `paket.jabatan.toLowerCase()`, then automatically approves if it includes `lurah`.

**Potential impact:** a genuine employee session could submit a payload claiming to be Lurah and receive inappropriate automatic review status, despite `ID_USER` remaining the employee's identity. This is **not proven exploited** until the isolated RC8.2 runtime test.

## Required empirical gate

`CLIENT_ROLE_AND_NAME_SPOOF_REJECTED` must pass: submit a deliberately falsified client `nama`/`jabatan=Lurah` using a signed **synthetic employee token**, require an explicit identity/role mismatch rejection and **no newly inserted report**. If a report is appended, record `RC82_SECURITY_NOT_ACCEPTED` even if every other business-flow check passed; do not merge/deploy.

## Suggested remediation after evidence

Bind the authoritative user's `nama` and `jabatan` server-side to the active signed session **before any role-dependent evaluation, persistence, or downstream action**. Reject request identity mismatches explicitly (or ignore untrusted identity fields and use authoritative server fields consistently). Add regression tests for name/role manipulation, inactive sessions, owner-only revision, and admin authorization. Review adjacent identity-dependent business functions before applying to production.

**Do not weaken the RC8.2 security gate to force a green test result.**
