# Panduan Deploy — Portal Kinerja Minomartani

Dokumen ini merangkum langkah deploy Web App Google Apps Script. Detail teknis backend ada di komentar `DEPLOYMENT CHECKLIST` di `Kode.js` / `Kode.gs`.

## Versi aktif (repo)

| Item | Nilai |
|------|--------|
| `APP_VERSION` | `2026.06.14.07` |
| Terakhir diperbarui (dokumen) | 2026-06-14 |
| Refactor | Tahap 1.1 + 1.3 — `cekLogin` memakai `getSS_()` |

Setiap deploy produksi **wajib** menaikkan `APP_VERSION` di `Kode.js` / `Kode.gs` dan baris ini.

---

## Prasyarat Script Properties

Atur di **Apps Script → Project Settings → Script Properties**:

| Property | Wajib | Keterangan |
|----------|-------|------------|
| `SPREADSHEET_ID` | Ya | ID spreadsheet database utama. Semua akses data (termasuk login) memakai ini via `getSS_()`. |
| `PIN_PEPPER` | Ya | Secret untuk hash PIN v2. Generate string acak panjang; jangan commit ke git. |
| `APP_CONSTANTS` | Auto | Diisi otomatis saat menjalankan `initializeAppConstants()`. |

Jika `SPREADSHEET_ID` atau `PIN_PEPPER` kosong, aplikasi akan gagal dengan pesan konfigurasi — ini disengaja.

---

## Struktur file yang di-deploy ke Apps Script

| File | Peran |
|------|--------|
| `Kode.gs` atau `Kode.js` | Backend (pilih satu sumber; jangan biarkan keduanya berbeda isi) |
| `SheetSchema.gs` | Definisi kolom spreadsheet |
| `Index.html` | Frontend Web App |

File di folder `archive/` **tidak** di-push ke project Apps Script.

---

## Langkah deploy (setiap release)

### 1. Sebelum deploy

- [ ] Uji perubahan di spreadsheet **copy** jika ada migrasi/destruktif.
- [ ] Pastikan `Kode.js` dan `Kode.gs` identik (jika keduanya ada di repo).
- [ ] Naikkan `APP_VERSION` di backend.
- [ ] Commit perubahan ke git.

### 2. Deploy di Google Apps Script

1. Buka project Apps Script terkait.
2. Sinkronkan file dari repo (manual copy atau `clasp push`).
3. **Deploy → New deployment** (Web app).
4. Execute as: akun owner project.
5. Who has access: sesuai kebijakan kalurahan (biasanya domain atau user terdaftar).

### 3. Inisialisasi pasca-deploy (Script Editor)

Jalankan sekali setelah deploy besar atau setup baru:

| Fungsi | Kapan |
|--------|--------|
| `initializeAppConstants()` | Deploy pertama / setelah ubah `APP_SHARED_DEFAULTS` |
| `siapkanKolomKeamananPinPegawai()` | Setup PIN v2 / kolom salt di `Data_Pegawai` |
| `refreshMasterTunjanganCache()` atau `refreshMasterTunjanganCache_()` | Setelah ubah Master Tunjangan atau deploy performa |

Fungsi admin (butuh login token admin di Web App, bukan dari editor):

- `refreshDataPegawaiCache(token)`
- `refreshCacheRekapKinerjaReadOnly(token)`

### 4. Verifikasi di browser

- Hard refresh: **Ctrl+F5** (Windows) / **Cmd+Shift+R** (Mac).
- Cek banner versi di UI login (jika ada) atau respons `getAppVersion()`.

### 5. Checklist regresi manual (wajib)

- [ ] Login dengan username + PIN valid
- [ ] Login gagal (pesan generik, throttle setelah banyak percobaan)
- [ ] Logout dan login ulang
- [ ] Submit laporan (satu kategori)
- [ ] Review admin (setujui/tolak)
- [ ] Riwayat / revisi laporan ditolak
- [ ] Modul tunjangan (buka rekap periode aktif)
- [ ] Modul disposisi (inbox / terbit, sesuai role)

---

## Alur login (ringkas)

```
Browser (Index.html)
  → prosesLogin() → google.script.run.cekLogin(user, pin, clientId)
  → Backend: rate limit → getSheet_("Data_Pegawai") → verifikasi PIN
  → Token UUID → CacheService (TTL 6 jam)
  → Frontend: sessionStorage (kinerja_token, kinerja_data)
```

---

## Troubleshooting

| Gejala | Langkah |
|--------|---------|
| "Konfigurasi SPREADSHEET_ID belum diatur" | Set `SPREADSHEET_ID` di Script Properties |
| "PIN_PEPPER tidak ditemukan" | Set `PIN_PEPPER`; jalankan `siapkanKolomKeamananPinPegawai()` |
| Login OK, fitur lain error database | Pastikan tidak ada ID spreadsheet hardcode tersisa (`grep openById`) |
| Data pegawai stale | Admin: refresh cache pegawai dari UI admin |
| Master tunjangan lambat | Jalankan `refreshMasterTunjanganCache()` dari Script Editor |
| UI versi lama | Hard refresh; cek deployment URL mengarah ke versi terbaru |

Log error: **Apps Script → Executions** dan **View → Logs** di Script Editor.

---

## Sinkronisasi repo ↔ Apps Script

Saat ini deploy manual. Rekomendasi:

- Gunakan [clasp](https://github.com/google/clasp) dengan `Kode.gs` sebagai mirror `Kode.js`.
- Satu branch `main` = versi production.
- Catat URL deployment Web App di README internal tim (bukan di repo publik jika sensitif).
