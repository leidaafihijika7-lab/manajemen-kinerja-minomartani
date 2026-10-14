# RC8.2 — Authenticated Business Endpoint Integration Matrix

| Gate | Uses actual application handler? | Criterion |
|---|---|---|
| A0: environment | Read-only Apps Script + staging Spreadsheet | Exactly RC8.2 ID/marker, 12 tabs, two synthetic reports/index, 0 triggers, 0 credentials, 0 write flag |
| A1: signed login | Yes, `cekLogin`, `validasiSession` | Three test roles log in through PIN-v2 hashes; signed session IDs match |
| A2: disabled PIN / token | Yes | Wrong PIN, disabled account, tampered token denied |
| A3: non-admin review | Yes, `prosesReviewAdmin` | Employee cannot review |
| B1: submit | Yes, `simpanDataKinerja` | One new row, owner ID & nonce correct, pending status |
| B2: dual-write | Yes, RC7 guard via Kode.gs wrapper | Index row matches source projection (no separate direct patch) |
| B3: nonce retry | Yes | Same submit nonce does not add report |
| B4: premature revise | Yes | Pending report cannot be revised |
| B5: admin rejection | Yes | Admin rejects, status and index both updated |
| B6: cross-user revision | Yes | Other employee rejected, no data changes |
| B7: owner revision | Yes | Rejected report revised by owner, status returns pending, nonce/ID/index consistent |
| B8: repeat revision | Yes | Same nonce rejected |
| B9: final admin review | Yes | Approved status is consistent with real cutoff logic, index matches |
| B10: audit | Yes, `logAudit_` via handlers | Submit / revise / review entries carry report ID |
| B11: queue | Yes, RC7 integration | No repair queue remains after valid mutations |
| **SEC-1: name/role spoof** | **Yes, real `simpanDataKinerja`** | **MUST reject client-claimed `Lurah` name/jabatan under employee token. If accepted: SECURITY NOT ACCEPTED** |
| R0: rollback | Native CellData `PASTE_NORMAL` | Data, formats, notes, validations restored, script properties cleaned; no secrets/tokens logged |
| R1: independent parity | Google Sheets API outside Apps Script | 12 tabs / 0 differences vs pre-drill snapshot |

The matrix executes direct Apps Script server functions, **not an authenticated HTTP endpoint**. No production change or deployment is permitted.