# RC8.1 — Scenario matrix

| ID | Domain | Stimulus | Kriteria penerimaan |
|---|---|---|---|
| RC81-00 | Preflight | 2 synthetic source, 2 index, empty queue, zero triggers | `RC81_PREFLIGHT_PASS`; source-index exact & typed text |
| RC81-01 | Normal | Storage submit → revision → admin review proxy | Three actions and audit rows; canonical index updated, no auth endpoint |
| RC81-02 | Idempotensi | Repeat index sync after unchanged review | `indexWritten=false` |
| RC81-03 | Fault | Throw after submit | Expected injection seen, typed rollback PASS |
| RC81-04 | Fault | Throw after revision | Expected injection seen, typed rollback PASS |
| RC81-05 | Fault | Throw after review | Expected injection seen, typed rollback PASS |
| RC81-06 | Recovery | Original string dates and periods vs serial dates | `getValues` type + display + number format unchanged after rollback |
| RC81-07 | Recovery | New source/index row 4, audit tail 4–6 | Blank values/format restored; last rows baseline |
| RC81-08 | Recovery | Metadata properties changed by index sync | Original property values restored |
| RC81-09 | Recovery | Interrupted execution with manifest + backup | `rc81RecoverPendingV1` restores and verifies |
| RC81-10 | Fail closed | Pending recovery, orphan backup, malformed manifest, missing backup | New matrix denied; do not discard backup |
| RC81-11 | Fail closed | Wrong spreadsheet ID, missing mode, original RC8 mode enabled | Block before writes |
| RC81-12 | Fail closed | Dual-write or replay flag enabled | Block before writes |
| RC81-13 | Fail closed | No explicit one-shot write opt-in | Block before writes |
| RC81-14 | Fail closed | ScriptLock busy / trigger installed | Block and consume authorization |
| RC81-15 | Independent acceptance | Compare post-drill target vs pristine RC8.1 snapshot | Zero differences on `userEnteredValue`,`effectiveValue`,`formattedValue`,`userEnteredFormat`,validation in affected ranges |

Note: RC81-00 through RC81-14 were exercised by local mocks; native Google Sheets `PASTE_NORMAL` mechanics were independently exercised on a 36-cell index probe. Actual Apps Script runtime matrix and RC81-15 **remain pending**, not accepted.