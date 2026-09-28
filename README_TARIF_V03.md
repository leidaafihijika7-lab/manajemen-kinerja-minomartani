# Tarif Tunjangan v0.3 - kandidat RC3

Versi aplikasi 2026.09.28.02, melanjutkan paket CGT v0.2-RC2.

`Master_Tunjangan` tetap sumber tarif. Lookup memakai nama yang dinormalisasi dan
alias eksplisit, bukan substring/fuzzy. Staf tidak boleh menggunakan alias Kaur.
Konflik nominal pada alias yang sama membuat kalkulasi gagal; tidak ada overwrite
berdasarkan urutan baris. Jabatan tanpa padanan juga tidak diberi tarif acak/nol.

CacheService hanya akselerator, dengan envelope berversi, identitas spreadsheet,
generation, kedaluwarsa dan pemeriksaan struktur. Map tarif tidak disimpan lagi
secara permanen di PropertiesService. Properti generation bukan data tarif.
Kalkulasi rekap menggunakan pembacaan master langsung; cache dipakai untuk
estimasi/tampilan. Refresh tertarget juga menginvalidasi namespace ringkasan.

Pemilik/maintainer dapat menjalankan `auditTarifTunjanganV03` (baca langsung) dan
`maintenanceRefreshMasterTunjanganV03` (cache/properties saja). Akun aktif harus
lulus `pastikanMaintainerPortal3B0_`. `validasiTarifTunjanganV03` menggunakan data
simulasi di memori dan tidak mengubah spreadsheet.

Fallback lama C/D kosong atau 0 ketika B positif tetap dipertahankan: plafon
40% dan 20%, dengan warning eksplisit. Master pada snapshot berisi angka penuh,
sehingga fallback tidak digunakan. Kolom nilai harus berupa angka/formula angka.

Semua perbaikan CGT/dashboard RC2 tetap ada. Hash kontrak baru dibekukan pada
waktu penyiapan paket (176 kontrak); aplikasi tidak membuat baseline hash sendiri
saat runtime. Manifest checksum paket diperlukan untuk memeriksa seluruh berkas,
karena registry kontrak hanya mencakup fungsi yang terdaftar, bukan semua helper.

Tidak ada migrasi spreadsheet, persetujuan otomatis, penghapusan metadata batch,
atau perubahan tarif/poin melalui patch. Setelah lookup benar, Draft lama bisa
berbeda dari kalkulasi dan harus direkonsiliasi melalui alur aplikasi.
