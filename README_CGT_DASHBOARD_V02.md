# CGT & Dashboard v0.2-RC2

Versi kode: `2026.09.28.01`. Status: kandidat terintegrasi, belum dideploy.
Baseline ZIP: commit `6a7cb55f5a35c7aba5996d9762170e9702cc7839`.

## Perubahan

Penyaring pending memakai klasifikasi pegawai bersama kalkulator: PHL tetap
menunggu review administrasi tetapi tidak memblokir tunjangan non-PHL.
Poin 0 tidak menjadi alasan mengabaikan laporan relevan. Data ambigu/gagal
baca tidak dianggap aman. Pemeriksaan snapshot, jumlah, aritmetika, dan alur
persetujuan lama tetap berlaku.

Dashboard menjelaskan cakupan 18 pegawai dibanding 19 baris batch, menampilkan
rincian status dan antrean PHL terpisah, serta konteks periode resmi.
Tombol diagnostik membaca batch tersimpan, menyediakan rincian berhalaman,
memeriksa respons kedaluwarsa/perubahan data, dan tidak menulis laporan.
Jalur cadangan kalender tidak lagi menyamarkan hasil filter kosong/kegagalan.

Satu endpoint publik baru `ambilDiagnostikCakupanV02` ber-otorisasi. Registry
serta snapshot kontrak diperbarui statis menjadi 174, tanpa pembelajaran ulang
baseline saat runtime. Suite memori baru didaftarkan sebagai alat diagnostik.

## Batasan dan masalah lama yang harus ditindaklanjuti

Pengujian lokal 41 pemeriksaan integrasi dan 18 pemeriksaan browser komponen
lulus; runtime Google dan alur menyeluruh staging belum diuji.

Replay snapshot mempertahankan nominal lama Rp6.791.772 dan semua angka
per pegawai. Kesetaraan bukan jaminan tarif benar: `registerJabatanAliases_`
memakai pencocokan substring sehingga alias Kaur Pangripta/Tata Laksana dapat
tertimpa tarif staf. Snapshot menunjukkan master plafon 360000/180000 tetapi
resolver mengembalikan 278400/139200. Temuan ini tidak diubah dalam patch.
Pastikan aturan/master resmi dan perbaiki lookup melalui perubahan terpisah
sebelum produksi/pencairan. Data historis tidak boleh dibersihkan otomatis.

Pedoman pemasangan dan laporan rinci disertakan di direktori atas paket.
