# RC8 - Staging bridge integration report

**Decision: STAGING PREPARED; production NO-GO.**

## Objectives reached

- Created a distinct synthetic staging Google Sheets workbook with exact-ID scope and an RC8-only sentinel.
- Created a GitHub staging branch from the RC7 candidate review branch.
- Staged six deliberate changes to the full `Kode.gs` (HTTP surface disabled, `getSS_` fail-closed, and four RC7 queue bridge replacements).
- Added a staging preflight module and an operator-gated storage-proxy drill.
- Added a minimal-scope `appsscript.json` to the RC8 branch.
- Reran local RC7 guard tests (38 cases) and locally tested RC8 staging preflight/denial conditions (15 cases).

## Traceability and limits

| Area | Current evidence | Remaining blocker |
| --- | --- | --- |
| Isolated database | Verified native Google Sheets copy; ID locked | None for preflight |
| Schema and fixture | Two synthetic reports and two index rows | Broad production-shaped data not available |
| Git branch | Dedicated RC8 branch with `Kode.gs` staging changes | Human code review and stage Apps Script import |
| RC7 guard code | Existing RC7 candidate inherited | Real staging runtime not yet verified |
| Authz | Distinct `RC8_STAGING_MODE` and explicit Script Properties | New staging Apps Script project not provisioned |
| Submit | Opt-in storage-proxy prepared | Real submit function, tokens, file handling not executed |
| Revision | Opt-in storage-proxy prepared | Real revision rules, payload/audit beyond proxy not executed |
| Admin review | Opt-in storage-proxy prepared | Real `prosesReviewAdmin` auth, cut-off, audit not executed |
| Disposition | Read-only fixture exists | Real disposition transition not executed |
| Replay | Default OFF | Subsequent staged replay plan and maintainer review |
| Rollback | Code has finally/readback checks | Crash/timeout rollback cannot be claimed |

## Guardrail notes

This repo includes legacy functions capable of Drive and external API actions. The minimal explicit staging OAuth scopes exclude those services, and only RC8 preflight and drill functions are authorized. An owner should review consent scopes before running. No web app deployment or trigger should be created.

## Exit criteria

1. Create a separate standalone RC8 Apps Script project.
2. Install ONLY the five listed files from the RC8 branch (see README).
3. Add only synthetic-stage Script Properties; run preflight and send logs.
4. Resolve any staging errors before enabling a storage-proxy write drill.
5. Evaluate real business workflows separately. Never infer production readiness from two-row synthetic fixtures.

**Production deployment decision: NO-GO**.