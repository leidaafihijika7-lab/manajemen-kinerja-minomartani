# Deployment — Workflow Reminder & Escalation Engine v1.0

## Release
- APP_VERSION: `2026.10.03.01`
- Stable basis: `2026.10.02.07`
- Binding: `189/189`
- Frontend Build ID: `PSFIG-2026.10.03.01-e643b97e6e42`

## New module
- `WorkflowReminderEscalationV10.gs`

## Files replaced from baseline
- `Kode.gs`
- `Index.html`
- `FrontendIntegrityGuardV10.gs`
- `FunctionRegistry.gs`
- `BindingAktif3B1B2.gs`
- `GuardKontrakPraDeploy3B1B3.gs`
- `MonthlyArchiveV10.gs` (validator integration only)
- `TunjanganWorkflowDateBackfillV10.gs` (validator integration only)
- `KoreksiAdministratifTanggalPembayaranV10.gs` (validator integration only)

`MonthlyClosingV10.gs` remains frozen.

## Required post-deploy action
Run `pasangTriggerWorkflowReminderV10()` once and verify `statusTriggerWorkflowReminderV10()` reports one trigger with 4-hour cadence.

## Rollback
Rollback deployment to `2026.10.02.07`. If rolling back, remove/disable the WRE trigger using `hapusTriggerWorkflowReminderV10()` before switching source versions when possible.
