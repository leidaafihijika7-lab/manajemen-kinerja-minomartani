# Deployment kandidat 2026.09.28.02

Ini versi **kandidat**, bukan pernyataan versi yang sudah aktif di produksi.
Baca `../PANDUAN_PEMASANGAN.txt` untuk instruksi penuh dan perubahan nominal.

## Staging dahulu

Cadangkan kode dan catat versi/deployment saat ini. Verifikasi sumber aktif
terhadap sumber paket; gabungkan perubahan yang belum ada sebelum menimpa kode.
Gunakan proyek Apps Script dan salinan database uji terpisah. SPREADSHEET_ID
harus menunjuk database uji; pertahankan manifest/OAuth yang benar. Jangan
menjalankan trigger atau menulis ke folder/database produksi selama pengujian.

Folder ini berisi 26 berkas .gs + Index.html. Jangan deploy `archive/`, tests,
reports, berkas docx/md/txt, atau .github. Manifest tidak ada dalam ZIP sumber.

Jalankan suite tarif/cakupan/guard/preflight dan pemeriksaan 176 kontrak. Jalankan
audit master langsung dan refresh cache dari akun maintainer. Tidak perlu
menjalankan fungsi setup schema atau stub maintenance lama untuk patch ini.

## Sesudah pemilik menyetujui hasil

Deploy > Manage deployments > pilih deployment aktif > Edit > New version > Deploy.
Versi kode baru pada deployment yang sama mempertahankan URL. Jalankan audit dan
refresh cache pada proyek yang benar, muat ulang browser, periksa versi.

Perbedaan tarif membuat Draft lama terblokir SNAPSHOT_BERUBAH. Jangan mengubah
status/nominal manual. Periksa per pegawai lalu lakukan Generate Draft ulang atau
alur koreksi sesuai status, setelah disetujui. Batch sudah dicairkan tidak disentuh
oleh patch. Lulus guard bukan izin membayar.

Pemulihan: arahkan deployment ke nomor versi lama yang dicatat. Kode lama masih
memiliki bug tarif; pemulihan tidak membatalkan data yang sudah ditulis sesudah
deploy dan tidak membenarkan pembayaran dengan tarif salah.

Sumber resmi Google, diperiksa 28 September 2026:
- https://developers.google.com/apps-script/concepts/deployments
- https://developers.google.com/apps-script/reference/cache/cache
- https://developers.google.com/apps-script/reference/properties
