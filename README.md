# Portal Kinerja Minomartani — `2026.10.02.04`

## Monthly Archive v1.0 RC1

Rilis ini dibangun di atas Stable Baseline `2026.10.02.03`. **Monthly Closing v1.0 RC2 dibekukan**; modul baru Arsip Bulanan berdiri terpisah sebagai tahap akhir setelah closing dan pencairan tunjangan selesai.

### Kapabilitas

- readiness Arsip Bulanan per periode;
- status `BELUM_SIAP`, `SIAP_DIARSIPKAN`, `SUDAH_DIARSIPKAN`;
- akses Lurah/Carik;
- explicit final create, tidak otomatis;
- paket immutable di Google Drive;
- snapshot laporan/tunjangan/audit;
- PDF + XLSX tunjangan resmi;
- manifest dan SHA-256;
- ZIP final;
- verifikasi checksum pasca-arsip;
- idempotent per periode/batch.

### Paket arsip

`00_MANIFEST.json`, `01_RINGKASAN_PENUTUPAN.json`, `02_REKAP_LAPORAN.csv`, `03_LAPORAN_DITOLAK.csv`, `04_LAPORAN_PHL.csv`, `05_REKAP_TUNJANGAN.csv`, `06_AUDIT_TUNJANGAN.csv`, `07_AUDIT_LAPORAN.csv`, PDF/XLSX resmi, `99_SHA256SUMS.txt`, dan ZIP paket final.

Bukti media tidak digandakan pada v1.0; referensi Drive tetap tercatat dalam snapshot laporan.

### Governance

- Business binding: `183/183`.
- Binding checksum: `02fc81eb872fbb90f068a3791321e0375421460fe71f49ba7d39af360d9090d4`.
- Frontend Build ID: `PSFIG-2026.10.02.04-e0e73842d203`.
- Node tests: `159/159`.
- Browser tests: `83/83`.
- Monthly Archive validator: `14/14`.
- Monthly Closing frozen validator: `12/12`.
- Production Smoke: `7/7 ALLOW`.
- Pre-deploy Guard: `ALLOW`.

Tidak ada perubahan schema Google Sheet maupun mesin Review/Tunjangan.
