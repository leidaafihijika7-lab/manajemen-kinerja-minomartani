# ACE-DSP-004 — PHA-07 Isolated Sandbox Write Acceptance RC1

**Version**: PHA07-SANDBOX-WRITER-RC1-2026.10.10.01
**Production status**: NO-GO, canonical ACE-DSP-004 remains FAIL.
**Branch**: `feature/ace-dsp004-protection-acceptance-rc1`

## Scope

The maintainer has created a **new blank, separate** Apps Script project named `SANDBOX_PHA_RC1_SCRIPT_TEST` (shown with default `myFunction()` only). It is distinct from the live `Manajemen Kinerja` project and must remain that way.

Source file `PHASandboxWriteAcceptanceRC1.gs` is **standalone** and deliberately hard-coded to the *synthetic-only sandbox* spreadsheet ID. It has no production spreadsheet ID, no Script Properties access, no triggers creation, and no Web App deployment functions.

## Immutable fixture protections

- Accept exact spreadsheet ID and exact title `SANDBOX_PHA_RC1_SYNTHETIC_ONLY` only.
- Demand exactly six tab names and a known synthetic-only sentinel in `MULAI_DI_SINI!A1/A4`.
- Demand exactly two synthetic records in `Rekap_Kinerja` and `Index_Laporan`, one disposition recipient record and historic synthetic log fixture.
- Demand report ID/pointer exact matching: `PHA-TEST-RPT-0001` and `PHA-TEST-RPT-0002` with indexed source rows 2 and 3.
- Demand that `Rekap_Kinerja!R2` is initially blank and protected by a strict **SHEET** protection with no exception for R2.
- Demand executor can edit the protected sheet and that **current caller** has zero visible installable project triggers. Triggers owned by other accounts are not detectable with this method.
- Guard explicitly fails closed if any of the above change.

## Entrypoints (in order)

| Function | Writes | Expected |
|---|---|---|
| `validasiLogikaPHA07RC1()` | No | 7/7 PASS |
| `praUjiSandboxPHA07RC1()` | No | `sukses:true`, `mode:READ_ONLY`, synthetic and strict protection confirmed, zero current-caller triggers |
| `ujiPenulisanTerproteksiPHA07RC1()` | Disabled while `PHA07_ALLOW_WRITE_RC1=false` | `WRITE_TEST_DISABLED`, zero writes. **Do not enable until preflight logs are reviewed.** |

## Future limited write test — NOT YET APPROVED

Only after user accepts the exact destination and preflight results, set `PHA07_ALLOW_WRITE_RC1 = true` **in the separate sandbox project only** and run `ujiPenulisanTerproteksiPHA07RC1()`.

The test will set only **`Rekap_Kinerja!R2`** to `PHA07_SYNTHETIC_PROTECTED_WRITE_PROBE`, flush, read it, and restore the previous synthetic value (expected blank). Success requires both write observation and restore verification. If restoration fails, STOP and restore R2 manually **on the sandbox only**; do not run other tests.

This is an **owner-authorized protected-cell smoke test**, not an end-to-end Portal submit/review/disposition workflow, not a cross-account editor permission test, and not a proof that an Apps Script production Web App will work under production protections.

## Validation already performed offline

- 7/7 pure guard checks passed.
- Sandbox fixture preflight with mock Apps Script passed.
- `canEdit=false` mock was rejected before writes.
- Current caller trigger count > 0 mock was rejected before reads/writes.
- Disabled write entrypoint performed zero sheet calls.
- With explicit test-only opt-in in a mock, `R2` was written and restored, exactly two sandbox test writes and zero production file references.

**No real sandbox write or production mutation has been performed by the assistant.**

## Operator checklist

1. In the new blank `SANDBOX_PHA_RC1_SCRIPT_TEST` editor, replace the default `myFunction()` code with **only** `PHASandboxWriteAcceptanceRC1.gs` from this branch.
2. Do not paste into the production `Manajemen Kinerja` Apps Script project.
3. Do not deploy or create triggers. Do not edit any production Script Properties.
4. Run `validasiLogikaPHA07RC1()`; target 7/7 PASS.
5. Run `praUjiSandboxPHA07RC1()`; review the `PHA07_PREFLIGHT` log and share the log without account addresses or secret tokens.
6. Keep `PHA07_ALLOW_WRITE_RC1=false`. No protected write test until user and assistant verify preflight.

**GO/NO-GO for production remains NO-GO regardless of success of this isolated smoke test.**