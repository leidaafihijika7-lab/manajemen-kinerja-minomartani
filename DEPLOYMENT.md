# Deployment kandidat CGT & Dashboard v0.2-RC2

Versi kode `2026.09.28.01`; belum dideploy. Sumber baseline `2026.08.28.07`.

Panduan terbaru ada di `../MULAI_DI_SINI.md` pada paket rilis. Untuk repository
mandiri, simpan panduan itu sebagai dokumentasi rilis bersama perubahan ini.
Baca juga `README_CGT_DASHBOARD_V02.md`.

Ganti Kode.gs, Index.html, FunctionRegistry.gs, BindingAktif3B1B2.gs,
GuardKontrakPraDeploy3B1B3.gs; tambahkan CakupanTunjanganV02.gs dan
ValidasiCakupanTunjanganV02.gs. Semua skrip aktif lama lainnya tetap diperlukan.
Jangan deploy archive/, laporan pengujian, file ZIP/DOCX, atau tests/ ke Apps Script.

Buat salinan proyek/database untuk pengujian dan verifikasi SPREADSHEET_ID,
folder bukti, trigger, manifest, runtime, serta zona waktu sendiri. Jangan
menyalin credential ke GitHub. Paket tidak menyediakan manifest pengganti.

Jalankan tiga suite memori: validasiCakupanTunjanganV02 (27),
validasiConsistencyGuardTunjanganV01 (8), validasiPreflightSeptember2026V01 (14).
Jalankan validasiBindingAktif3B1B2 dan validasiGuardKontrakPraDeploy3B1B3 dengan
maintainer yang sah. Target 174 kontrak cocok. ALLOW kontrak bukan persetujuan
produksi/pencairan. Inisialisasi setup, migrasi, dan koreksi data tidak diperlukan
untuk menempelkan patch; jangan jalankan nama fungsi setup lama secara membabi buta.
Cache dashboard memiliki namespace baru sehingga data ringkasan schema lama
bukan dasar hasil RC2.

Tahan penerapan produksi sampai benturan alias Kaur/staf yang tercatat dalam
README rilis diperiksa dan seluruh uji staging lulus. Setelah disetujui, buat
versi baru dan edit deployment aktif untuk mempertahankan URL. Catat versi
sebelumnya agar dapat diarahkan kembali bila terjadi regresi.

Rujukan: https://developers.google.com/apps-script/concepts/deployments
