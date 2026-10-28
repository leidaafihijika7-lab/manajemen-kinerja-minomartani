# Diagnostik STAGING — Galaxy A07: logout saat unggah bukti

Tanggal persiapan: 28 Oktober 2026. **STATUS: CODE PREPARED; NOT DEPLOYED, NOT ENABLED.**

## Tujuan dan batasan
Membedakan: (a) respons penyimpanan `ERROR_SESSION_EXPIRED`,
(b) sesi terverifikasi tidak valid oleh monitor, (c) kegagalan upload/transpor,
(d) browser reload/kehilangan konteks halaman saat unggah.

Diagnosis ini **tidak** mengubah kebijakan autentikasi, masa berlaku token,
pengiriman laporan, proses review, atau data pegawai. Tidak boleh diterapkan
ke database/deployment produksi. Jangan gabungkan dengan PR indeks yang dipending.

## Berkas
- `StagingUploadDiagV1.gs`: whitelist, log terstruktur, pengaman staging.
- `Kode.gs`: satu variabel flag template pada `doGet`.
- `Index.html`: hanya panggilan diagnostik nonblocking di transisi kritis.

## Pengunci dua lapis — wajib keduanya cocok
1. Di **STAGING Apps Script project** saja, Script Property
   `STAGING_UPLOAD_DIAG_V1` harus tepat bernilai `ON`.
2. `getSS_()` harus menghasilkan ID
   `1lyQuCfr5kOzDnzKthYhMbjum95d8yDxKz7LLdwM6NzY`
   serta judul yang dimulai `STAGING -`.

Jika properti tidak ada/OFF, ID atau judul berbeda, atau akses DB gagal,
fitur tidak aktif. Properti **tidak diubah oleh commit** ini.

## Persiapan staging (operator berizin)
1. Pastikan project Apps Script yang akan diuji adalah project STAGING,
   bukan "Manajemen Kinerja" produksi. Catat deployment ID dan commit SHA
   staging lama sebagai titik pemulihan; backup kode staging sebelum sync.
2. Pastikan `getSS_()` pada project staging menunjuk salinan STAGING yang
   disebut di atas. Periksa bahwa akun uji, folder bukti, dan cutoff staging
   benar-benar terisolasi dari sumber produksi.
3. Sinkronkan **hanya** tiga berkas di PR ini ke project staging, termasuk
   modul baru. Jangan merge branch ke `main` atau sinkronkan ke produksi.
4. Pastikan kode dapat dievaluasi, serta jalankan
   `ujiSanitasiStagingUploadDiagV1_` di **staging saja**.
   Harapan: 7/7 lulus. Fungsi uji tersebut tidak mengakses sheet.
5. Set Script Property `STAGING_UPLOAD_DIAG_V1=ON` **hanya pada project staging**.
   Buka ulang URL STAGING `/dev` untuk uji sebagai editor, atau deployment
   staging terpisah yang jelas. Jangan gunakan URL produksi. Verifikasi log
   berawalan `STAGING_UPLOAD_DIAG_V1` saat PAGE_LOAD.
6. Jika tidak ada PAGE_LOAD, jangan meneruskan pengujian pengiriman:
   periksa flag, ID dan judul database, serta template/project yang dipakai.

## Matriks uji aman
Gunakan akun uji staging, data laporan sintetis, satu JPG tanpa informasi
pribadi (~100–500 KB), dan sambungan yang wajar. Buka STAGING di
**Galaxy A07**, Chrome langsung, bukan in-app browser.
Setiap percobaan menggunakan entri sintetis berbeda dan pastikan tidak
menciptakan laporan duplikat. Cek rekap staging setelahnya.

| Kasus | Prosedur | Bukti yang diharapkan |
| --- | --- | --- |
| S01 | Buka staging, login, tidak mengirim | PAGE_LOAD, LOGIN_OK |
| S02 | Kirim satu laporan sintetis + JPG kecil | UPLOAD_REQUEST, UPLOAD_OK, SAVE_REQUEST, SAVE_OK |
| S03 | Bila UI kembali ke login | LOGOUT_CALLED dengan code NO_MESSAGE, atau PAGE_LOAD baru |
| S04 | Tutup tab dan buka lagi | PAGE_LOAD baru; sesi tidak dipaksa dipertahankan |
| S05 | Gangguan jaringan pada staging saja (opsional) | TRANSPORT_FAIL tanpa logout paksa |
| S06 | Respons sesi-invalid sintetis dalam mock/unit test, bukan token nyata | SAVE_SESSION_EXPIRED lalu LOGOUT_CALLED |
| S07 | Ulang uji S02 dengan perangkat/browser pembanding | Bandingkan trace terpisah, bukan identitas pegawai |

**Larangan:** jangan memaksa token nyata kedaluwarsa, menonaktifkan otorisasi,
memindahkan data produksi, mengirim bukti asli pegawai, atau mengubah cutoff
produksi. S06 belum menjadi pengujian integrasi sampai mock dijalankan.

## Interpretasi log
Teks filter di Executions > Logs: `STAGING_UPLOAD_DIAG_V1`.
Setiap event hanya memuat `traceId` acak, `event` dari whitelist, `code`
terbatas, urutan per page instance, dan waktu klien/server. Tidak memuat
ID pegawai, token, PIN, file, nama file, narasi, ataupun error mentah.

- `UPLOAD_OK` lalu `SAVE_SESSION_EXPIRED` dan `LOGOUT_CALLED`:
  fokus pada validasi token saat penyimpanan.
- `SESSION_MONITOR_INVALID` + `LOGOUT_CALLED`:
  fokus pada monitor/registry/akun, bukan file.
- `UPLOAD_REQUEST` tanpa respons kemudian `PAGE_LOAD` baru:
  dugaan halaman berhenti/reload, tetapi kehilangan log jaringan tetap mungkin.
- `UPLOAD_OK`, `SAVE_OK`, kemudian `PAGE_LOAD`:
  periksa lifecycle browser sesudah simpan.
- `UPLOAD_REJECTED` + `TOKEN_INVALID`: jalur unggah menolak sesi;
  tidak berarti UI otomatis logout.
- Absen `PAGEHIDE` bukan bukti tidak reload: event unload best effort.

`traceId` tetap di localStorage hanya sebagai penanda diagnostik anonim
(selama maksimal tiga jam) untuk menghubungkan PAGE_LOAD yang berulang.
Hapus secara manual jika sudah selesai uji; tidak mengandung token/sesi.
Jangan mengumpulkan identifier atau screenshot kredensial.

## Kriteria penerimaan dan rollback
- ON di staging menghasilkan event tanpa data pribadi; OFF dan database
  non-staging tidak menghasilkan event.
- Alur laporan staging dan anti-duplikasi tetap sama dengan baseline.
- Tidak ada penurunan fungsi login, unggah, review, atau riwayat.
- Akun/folder/data produksi tidak disentuh.

Selesai investigasi: ubah property staging menjadi `OFF` atau hapus
property, periksa tidak ada log diagnostik baru, kembalikan deployment
staging lama bila terdapat regresi. Jangan mencabut/mengganti konfigurasi
sesi produksi sebagai bagian dari eksperimen.

## Verifikasi otomatis saat persiapan kode
- 7/7 pengujian sanitasi event server lulus dalam mock JavaScript.
- 5/5 pengujian gate (ON staging, OFF, ID produksi, nama salah,
  ID salah) lulus dalam mock JavaScript.
- Index.html: sintaks satu script utama lolos kompilasi V8 setelah
  mengganti ekspresi template dengan boolean untuk pemeriksaan sintaks.
- **Belum** diuji end-to-end di Apps Script staging/Galaxy A07; belum deploy.
