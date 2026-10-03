# Portal Kinerja Minomartani — 2026.10.03.01

Release focus: **Workflow Reminder & Escalation Engine v1.0**.

The engine adds an in-portal reminder inbox for Carik, Lurah, and Bendahara. It evaluates delayed review, period closing, tunjangan workflow, payment, archive creation, and archive verification. It assigns DUE/ESCALATED/CRITICAL severity, routes users to the correct action page, and records escalated reminders to `Audit_Log` with a 24-hour anti-spam cooldown.

A 4-hour Apps Script trigger is installed explicitly after deployment. `LockService` prevents overlapping scheduled executions. The engine does not change report status, points, allowance status, Monthly Closing, or Monthly Archive state.

See the package root `PANDUAN_PEMASANGAN.txt`, `reports/TEST_REPORT.md`, and `ROADMAP_SETELAH_WRE.md`.
