> **Kandidat RC3 / 2026.09.28.02:** baca `README_TARIF_V03.md` dan `DEPLOYMENT.md`. Belum diterapkan ke produksi. Dokumentasi historis di bawah dipertahankan sebagai konteks.

> **Kandidat CGT & Dashboard v0.2-RC2 (`2026.09.28.01`)**: baca
> [catatan rilis](README_CGT_DASHBOARD_V02.md) dan [deployment](DEPLOYMENT.md).
> Belum dideploy; temuan alias tarif lama harus diperiksa sebelum produksi.
> Dokumen di bawah berasal dari baseline dan bukan panduan rilis terbaru.

# Portal Kinerja Minomartani

Sistem manajemen kinerja terpadu untuk Kalurahan Minomartani (Kabupaten Sleman), dibangun sebagai **Google Apps Script Web App** dengan database **Google Spreadsheet**.

## Versi

| | |
|---|---|
| **APP_VERSION** | `2026.06.14.07` |
| **Dokumentasi repo** | 2026-06-14 |
| **Refactor aktif** | Tahap 1 — stabilisasi (1.1 dokumentasi, 1.3 konsistensi database login) |

Naikkan `APP_VERSION` di `Kode.js` / `Kode.gs` setiap deploy. Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk checklist lengkap.

## Struktur project

```
├── Index.html          # Frontend (UI, CSS, JavaScript)
├── Kode.js             # Backend Apps Script (sumber repo)
├── Kode.gs             # Mirror backend untuk clasp/GAS — harus identik dengan Kode.js
├── SheetSchema.gs      # Peta kolom spreadsheet (sumber kebenaran schema)
├── DEPLOYMENT.md       # Panduan deploy & regresi
├── archive/            # File lama (tidak di-deploy ke Apps Script)
└── .github/prompts/    # Audit & rencana refactor internal
```

## Fitur utama

- Login pegawai (username + PIN 6 digit)
- Submit laporan kinerja (produktifitas, tugas umum, PHL, form detail per jabatan)
- Review admin & alur persetujuan Lurah
- Rekap tunjangan bulanan & cut-off periode
- Modul disposisi surat
- Audit log & migrasi keamanan PIN (hash v2)

## Prasyarat konfigurasi

Atur **Script Properties** di project Apps Script:

| Property | Deskripsi |
|----------|-----------|
| `SPREADSHEET_ID` | ID spreadsheet database |
| `PIN_PEPPER` | Secret untuk hash PIN v2 (jangan commit) |

Tanpa kedua property ini, aplikasi sengaja diblokir. Detail: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Alur login (singkat)

1. User membuka Web App → `doGet()` menyajikan `Index.html`.
2. Form login memanggil `cekLogin(username, pin, clientId)` via `google.script.run`.
3. Backend membaca sheet `Data_Pegawai` melalui `getSS_()` (Script Properties).
4. PIN diverifikasi (legacy v1 atau salted v2); token sesi disimpan di `CacheService` (6 jam).
5. Frontend menyimpan token di `sessionStorage`, lalu memuat dashboard sesuai jabatan.

## Deploy cepat

1. Naikkan `APP_VERSION`.
2. Sinkronkan file ke Apps Script (`Kode.gs`, `SheetSchema.gs`, `Index.html`).
3. **Deploy → New deployment** (Web app).
4. Jalankan `initializeAppConstants()` dari Script Editor (jika perlu).
5. Hard refresh browser dan jalankan checklist regresi.

Panduan lengkap: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Pengembangan

- **Backend:** `Kode.js` — edit di sini, lalu salin/sync ke `Kode.gs` sebelum deploy.
- **Schema kolom:** ubah hanya di `SheetSchema.gs`, sesuaikan header di spreadsheet.
- **Audit duplikasi fungsi:** `.github/prompts/audit_duplikasi_fungsi_portal_kinerja.md`
- **Roadmap refactor:** stabilisasi → keamanan → modularisasi → maintainability

## Changelog singkat

### 2026-06-14 — Refactor Tahap 1.1 + 1.3

- Dokumentasi: `README.md`, `DEPLOYMENT.md`, `archive/README.md`
- File arsip dipindah ke `archive/` (tidak memengaruhi deploy GAS)
- **Fix:** `cekLogin` memakai `getSheet_("Data_Pegawai")` / `getSS_()` — tidak lagi hardcode spreadsheet ID

### Sebelumnya

- Portal kinerja v2.0, PIN security v2, rate limit login, modul disposisi & tunjangan
