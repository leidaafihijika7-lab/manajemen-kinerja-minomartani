# PHA-07B B2 — RPC Public Surface Static Inventory v1.0

**As-of:** 2026-10-15 | **Source pinned:** `51fb7a0cd68927eb1a263f1edb8c421d40defd83` | **Scope:** seven-file `e2e-runtime/` only.

**Warning:** These are *syntactic signals*, not authorization PASS. All top-level non-underscore Apps Script functions are potential HTML Service RPC surfaces. Names may be overridden later by function assignments; final exposed semantics require runtime verification. No deploy/run/write performed.

Summary: `122` public-function declarations in `Kode.gs` (`118` unique function names); `2` preflight public functions; `3` duplicated names; `63` direct browser RPC names recognized (plus two separately observed dynamically referenced core submit/revision calls); `18` browser RPC names absent from the packaged server declarations.

## Per-function entrypoint inventory

Legend: **UI** = literal name observed in browser source, not a whitelist; **Gate** = direct E2E gate token found; **Auth hint** = `validasiSession` or maintainer check syntactically present; **Write hint** = mutating API token found in function's nearby source, not proof of full transitive effects. `—` means not detected, not proof safe.

| File | Line | Public function | UI | E2E gate | Auth hint | Write hint |
|---|---:|---|:---:|---|---|:---:|
| `Kode.gs` | 1 | `doGet` | — | WEB | — | — |
| `Kode.gs` | 268 | `ambilConstantsAplikasi` | YES | — | — | — |
| `Kode.gs` | 402 | `maintenanceStatusPortal3B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 421 | `maintenanceInitializeAppConstants3B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 435 | `maintenanceSiapkanKolomKeamananPin3B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 449 | `maintenanceSiapkanKolomDetailRekap3B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 463 | `maintenancePerbaikiPeriodeTunjangan3B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 479 | `initializeAppConstants` | — | — | — | — |
| `Kode.gs` | 480 | `siapkanKolomKeamananPinPegawai` | — | — | — | — |
| `Kode.gs` | 481 | `siapkanKolomDetailFormRekapKinerja` | — | — | — | — |
| `Kode.gs` | 482 | `perbaikiKolomPeriodeTunjangan` | — | — | — | — |
| `Kode.gs` | 483 | `logAudit` | — | — | — | — |
| `Kode.gs` | 484 | `logAI` | — | — | — | — |
| `Kode.gs` | 485 | `dapatkanAtauBuatFolder` | — | — | — | — |
| `Kode.gs` | 496 | `getAppVersion` | YES | — | — | — |
| `Kode.gs` | 708 | `refreshCacheRekapKinerjaReadOnly` | — | — | SESSION | — |
| `Kode.gs` | 833 | `refreshDataPegawaiCache` | — | — | SESSION | — |
| `Kode.gs` | 901 | `buatToken` | — | — | — | — |
| `Kode.gs` | 1091 | `validasiSession` | — | — | SESSION | — |
| `Kode.gs` | 1149 | `akhiriSession` | YES | — | — | — |
| `Kode.gs` | 1190 | `cekSessionAktif` | YES | — | SESSION | — |
| `Kode.gs` | 1237 | `cekHakAksesAdmin` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1629 | `cekNotifikasiLaporanWajib` | YES | — | SESSION | — |
| `Kode.gs` | 1824 | `cekHakAksesCarikTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1830 | `cekHakAksesLurahTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1836 | `cekHakAksesBendaharaTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1842 | `cekHakAksesTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1846 | `cekHakAksesPredikatPimpinan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 1964 | `handleError` | — | — | — | — |
| `Kode.gs` | 2047 | `parseTanggal` | — | — | — | — |
| `Kode.gs` | 2382 | `ambilDaftarPegawaiAktifUntukDisposisi` | — | — | SESSION | — |
| `Kode.gs` | 2818 | `aturCutoffTunjanganApril2026` | — | — | MAINTAINER | — |
| `Kode.gs` | 2848 | `koreksiLaporanLewatCutoffApril2026` | — | — | — | — |
| `Kode.gs` | 3763 | `generateDraftTunjanganBulanan` | YES | — | SESSION | YES |
| `Kode.gs` | 3912 | `ambilRekapTunjanganBulanan` | YES | — | SESSION | — |
| `Kode.gs` | 4110 | `kunciDraftTunjanganBulanan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 4131 | `ajukanTunjanganKeLurah` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 4149 | `setujuiRekapTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 4167 | `kembalikanRekapTunjangan` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 4185 | `teruskanKeBendahara` | — | — | ROLE_ONLY | — |
| `Kode.gs` | 4357 | `tandaiSudahDicairkan` | YES | — | SESSION | — |
| `Kode.gs` | 4472 | `sha256Hex` | — | — | — | — |
| `Kode.gs` | 4621 | `ambilDaftarPegawaiUntukAdmin` | YES | — | SESSION | — |
| `Kode.gs` | 4753 | `adminGantiPinPegawai` | YES | — | SESSION | — |
| `Kode.gs` | 4792 | `cekLogin` | YES | WRITE | — | — |
| `Kode.gs` | 5685 | `statusMaintenanceAksesBuktiLama3C3` | — | — | MAINTAINER | — |
| `Kode.gs` | 5717 | `maintenancePerbaikiAksesBuktiLama3C3` | — | — | MAINTAINER | — |
| `Kode.gs` | 5950 | `uploadBuktiKinerjaBlob` | YES | UPLOAD | SESSION | YES |
| `Kode.gs` | 6064 | `hapusUploadBuktiKinerjaSementara` | — | UPLOAD | SESSION | YES |
| `Kode.gs` | 6165 | `simpanDataKinerja` | YES | WRITE | — | — |
| `Kode.gs` | 7424 | `rapikanBahasaLaporanAI` | YES | — | SESSION | — |
| `Kode.gs` | 7481 | `prosesAntreanAI` | — | — | — | — |
| `Kode.gs` | 7506 | `getDashboardStats` | YES | — | SESSION | — |
| `Kode.gs` | 7664 | `ambilRiwayatKuPaged` | — | — | SESSION | — |
| `Kode.gs` | 7760 | `ambilDetailRiwayatLaporan` | — | — | SESSION | — |
| `Kode.gs` | 7962 | `ambilLaporanDitolakUntukRevisi` | YES | — | SESSION | — |
| `Kode.gs` | 8264 | `simpanRevisiLaporanDitolakPegawai` | YES | WRITE | SESSION | YES |
| `Kode.gs` | 8414 | `ambilRiwayatKu` | — | — | — | — |
| `Kode.gs` | 8670 | `ambilMetadataLampiranAdminLazy` | YES | — | SESSION | — |
| `Kode.gs` | 9628 | `ambilDaftarPegawaiReviewAdmin` | — | — | SESSION | — |
| `Kode.gs` | 9743 | `ambilLaporanAdminPerPegawai` | — | — | SESSION | — |
| `Kode.gs` | 9860 | `ambilSemuaLaporanAdmin` | — | — | SESSION | — |
| `Kode.gs` | 9881 | `ambilTimelinePublik` | YES | — | SESSION | — |
| `Kode.gs` | 9956 | `prosesReviewAdmin` | YES | WRITE | SESSION | YES |
| `Kode.gs` | 10207 | `generateNarasiBulananAI` | YES | — | SESSION | — |
| `Kode.gs` | 10847 | `ambilDashboardAdminKinerja` | YES | — | SESSION | — |
| `Kode.gs` | 10952 | `ambilDetailPegawaiAdminKinerja` | YES | — | SESSION | — |
| `Kode.gs` | 11137 | `uploadLampiranDisposisiBlob` | YES | UPLOAD | SESSION | YES |
| `Kode.gs` | 11376 | `simpanPetugasDisposisi` | YES | — | SESSION | YES |
| `Kode.gs` | 11547 | `simpanDisposisiSurat` | YES | — | SESSION | YES |
| `Kode.gs` | 11804 | `koreksiJenisDisposisi` | YES | — | SESSION | YES |
| `Kode.gs` | 11911 | `tambahPenerimaDisposisi` | YES | — | SESSION | YES |
| `Kode.gs` | 12227 | `ambilRingkasanDisposisiBaru` | YES | — | SESSION | — |
| `Kode.gs` | 12653 | `ambilDisposisiUntukLaporan` | YES | — | SESSION | — |
| `Kode.gs` | 12718 | `tandaiDisposisiSudahDibuka` | YES | — | SESSION | YES |
| `Kode.gs` | 13029 | `getDisposisiShellBootstrap` | YES | — | SESSION | — |
| `Kode.gs` | 13041 | `getDisposisiInboxData` | YES | — | SESSION | — |
| `Kode.gs` | 13061 | `getDisposisiInboxBootstrap` | — | — | SESSION | — |
| `Kode.gs` | 13245 | `getDisposisiManagementBootstrap` | YES | — | SESSION | — |
| `Kode.gs` | 13265 | `getDisposisiBootstrap` | — | — | SESSION | — |
| `Kode.gs` | 13438 | `aturCutoffTunjanganApril2026` | — | — | MAINTAINER | — |
| `Kode.gs` | 13470 | `koreksiLaporanLewatCutoffApril2026` | — | — | — | — |
| `Kode.gs` | 13681 | `ambilStatusInputLaporanCutoff` | YES | — | SESSION | — |
| `Kode.gs` | 13699 | `simpanCutoffInputLaporanPeriode` | YES | — | SESSION | — |
| `Kode.gs` | 14446 | `simpanCutoffInputLaporanPeriode` | YES | — | SESSION | — |
| `Kode.gs` | 14580 | `simpanTutupPeriodeLaporan` | YES | — | SESSION | YES |
| `Kode.gs` | 14642 | `bukaPeriodeLaporan` | YES | — | SESSION | YES |
| `Kode.gs` | 14679 | `ambilStatusTutupPeriodeLaporan` | YES | — | SESSION | — |
| `Kode.gs` | 15235 | `normalisasiStatusLewatCutoffLama` | — | — | SESSION | YES |
| `Kode.gs` | 15561 | `ambilDataRekapPaged` | YES | — | SESSION | — |
| `Kode.gs` | 15625 | `refreshKlasemenKinerjaCache` | — | — | SESSION | — |
| `Kode.gs` | 16642 | `ambilAuditKoreksiCutoffLama` | YES | — | SESSION | — |
| `Kode.gs` | 16704 | `koreksiStatusCutoffLama` | YES | — | SESSION | YES |
| `Kode.gs` | 17213 | `ambilTindakLanjutKoreksiCutoffLama` | YES | — | SESSION | — |
| `Kode.gs` | 17276 | `terapkanPoinKoreksiCutoffLama` | YES | — | SESSION | YES |
| `Kode.gs` | 17858 | `koreksiLaporanLewatCutoffApril2026` | — | — | — | — |
| `Kode.gs` | 17874 | `koreksiLaporanBlackoutCutoffApril2026` | — | — | — | — |
| `Kode.gs` | 17917 | `cekCutoffDefaultLamaDinonaktifkan` | YES | — | SESSION | — |
| `Kode.gs` | 18314 | `debugPeriodeTutupDariTanggalPelaksanaanV31` | — | — | SESSION | — |
| `Kode.gs` | 18453 | `cariLogErrorSubmitKinerjaV33` | — | — | SESSION | — |
| `Kode.gs` | 18505 | `getStatusAksesDisposisiModul` | YES | — | SESSION | — |
| `Kode.gs` | 19334 | `batalkanDisposisiSurat` | YES | — | SESSION | YES |
| `Kode.gs` | 20061 | `auditIndexLaporan2B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 20075 | `buatLaporanAuditIndexLaporan2B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 20091 | `bangunUlangIndexLaporan2B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 20098 | `validasiIndexLaporan2B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 20105 | `statusIndexLaporan2B0` | — | — | MAINTAINER | — |
| `Kode.gs` | 20448 | `prosesAntreanPerbaikanIndexLaporan2B1` | — | — | — | — |
| `Kode.gs` | 20452 | `ujiSinkronisasiBarisTerakhirIndexLaporan2B1` | — | — | MAINTAINER | — |
| `Kode.gs` | 20463 | `aktifkanDualWriteIndexLaporan2B1` | — | — | MAINTAINER | YES |
| `Kode.gs` | 20484 | `nonaktifkanDualWriteIndexLaporan2B1` | — | — | MAINTAINER | YES |
| `Kode.gs` | 20490 | `validasiDualWriteIndexLaporan2B1` | — | — | MAINTAINER | — |
| `Kode.gs` | 20501 | `statusDualWriteIndexLaporan2B1` | — | — | MAINTAINER | — |
| `Kode.gs` | 20605 | `maintenanceDiagnostikCacheDisposisi3B02` | — | — | MAINTAINER | — |
| `Kode.gs` | 20644 | `maintenanceDiagnostikCacheDisposisi3B01` | — | — | — | — |
| `Kode.gs` | 21219 | `statusReadRiwayatIndex2B2A` | — | — | MAINTAINER | — |
| `Kode.gs` | 21246 | `ujiReadRiwayatIndex2B2A` | — | — | MAINTAINER | — |
| `Kode.gs` | 21255 | `validasiReadRiwayatIndex2B2A` | — | — | MAINTAINER | — |
| `Kode.gs` | 21278 | `aktifkanReadRiwayatIndex2B2A` | — | — | MAINTAINER | YES |
| `Kode.gs` | 21296 | `nonaktifkanReadRiwayatIndex2B2A` | — | — | MAINTAINER | YES |
| `Kode.gs` | 21305 | `aturPersentaseShadowReadRiwayatIndex2B2A` | — | — | MAINTAINER | YES |
| `Kode.gs` | 21315 | `resetMetrikReadRiwayatIndex2B2A` | — | — | MAINTAINER | — |
| `E2E10_IsolatedReadOnlyPreflight.gs` | 16 | `e2e10GetScriptIdReadOnlyV1` | — | — | — | — |
| `E2E10_IsolatedReadOnlyPreflight.gs` | 22 | `e2e10ReadOnlyPreflightV1` | — | — | — | — |

## Duplicate declaration names
- `aturCutoffTunjanganApril2026` (definitions at 2818, 13438)
- `koreksiLaporanLewatCutoffApril2026` (definitions at 2848, 13470, 17858)
- `simpanCutoffInputLaporanPeriode` (definitions at 13699, 14446)

## Browser RPC referenced but missing from seven-file runtime
- `ambilBackupRecoveryCenterV10`
- `ambilDetailRiwayatLaporan3B04C1c`
- `ambilDiagnostikCakupanV02`
- `ambilExceptionActionCenterV10`
- `ambilExecutiveDashboardV10`
- `ambilFrontendIntegrityManifestV10`
- `ambilKonfigurasiTutupPeriode3B04C1d1`
- `ambilMonthlyArchiveV10`
- `ambilMonthlyClosingV10`
- `ambilOperationalHealthCenterV10`
- `ambilPengingatTutupPeriode3B04C1`
- `ambilReviewCenterAdminV10`
- `ambilRiwayatKuPaged3B04C1c`
- `ambilWorkflowReminderV10`
- `buatArsipBulananV10`
- `koreksiAdministratifTanggalPembayaranV10`
- `tutupPeriodeMonthlyClosingV10`
- `verifikasiArsipBulananV10`

**Caveats:** This is static inspection of top-level `function` declarations, plus limited known assignment checks; it is not a complete JS parser or an exhaustive call graph. `doGet` is separately invoked by HTTP entrypoint; not counted as a verified RPC call. Inlined/nested callbacks, renamed exports and script properties may introduce additional surfaces. Actual user consent, execution identity, role boundary and read/write behavior cannot be proven until E2E security tests. Current flags must remain OFF.
