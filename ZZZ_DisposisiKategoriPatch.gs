// ZZZ_DisposisiKategoriPatch.gs
// Patch siap pasang untuk Google Apps Script.
// Cara pakai: buat file baru di Apps Script dengan nama persis ZZZ_DisposisiKategoriPatch.gs,
// lalu copy seluruh isi file ini. File ini sengaja diberi awalan ZZZ agar dimuat setelah Kode.js.

function cekHakKoreksiDisposisi_(idUser, surat) {
  surat = surat || {};

  var canManage = cekHakAksesLurahDisposisi_(idUser) && idsEqual_(surat.pemberi_id, idUser);

  var petugasAktif = getPetugasDisposisiAktif_();
  var canOperate = !!(
    petugasAktif &&
    idsEqual_(petugasAktif.pegawaiId, idUser) &&
    idsEqual_(surat.pemberi_id, petugasAktif.ditetapkanOlehId)
  );

  return canManage || canOperate;
}

function cariRowDisposisiSuratById_(sh, idDisposisi) {
  var key = normalizeId_(idDisposisi);
  if (!key) return 0;

  var C = SHEET_COLUMNS.DISPOSISI_SURAT;
  var values = sh.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (idsEqual_(values[i][C.ID_DISPOSISI], key)) {
      return i + 1;
    }
  }

  return 0;
}

function updateJenisDisposisiPadaRekapTerkait_(idDisposisi, jenisBaru) {
  var key = normalizeId_(idDisposisi);
  if (!key) return 0;

  var sh = getSheet_("Rekap_Kinerja");
  var C = SHEET_COLUMNS.REKAP_KINERJA;
  var lastRow = sh.getLastRow();

  if (lastRow < 2) return 0;

  var lastCol = Math.max(sh.getLastColumn(), C.JENIS_DISPOSISI + 1);
  var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var updated = 0;

  for (var i = 0; i < values.length; i++) {
    if (!idsEqual_(values[i][C.ID_DISPOSISI], key)) continue;

    sh.getRange(i + 2, C.JENIS_DISPOSISI + 1).setValue(jenisBaru);
    updated++;
  }

  if (updated) invalidasiCacheRekapKinerjaReadOnly_();
  return updated;
}

function koreksiJenisDisposisi(payload, token) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return { sukses: false, pesan: "Sesi habis. Silakan login ulang." };
    }

    payload = payload || {};

    var idDisposisi = normalizeId_(payload.idDisposisi || payload.id_disposisi || "");
    var jenisBaru = String(payload.jenisDisposisi || payload.jenis_disposisi || "").trim().toUpperCase();
    var alasan = sanitizeForSheet_(payload.alasan || payload.catatan || "Koreksi jenis disposisi oleh operator.");

    if (!idDisposisi) {
      return { sukses: false, pesan: "ID disposisi tidak valid." };
    }

    if (jenisBaru !== "TUGAS_UMUM" && jenisBaru !== "TUGAS_PIMPINAN") {
      return { sukses: false, pesan: "Jenis disposisi harus TUGAS_UMUM atau TUGAS_PIMPINAN." };
    }

    if (!alasan) {
      return { sukses: false, pesan: "Alasan koreksi wajib diisi." };
    }

    var surat = getSuratDisposisiByIdInternal_(idDisposisi);
    if (!surat) {
      return { sukses: false, pesan: "Disposisi tidak ditemukan." };
    }

    if (!cekHakKoreksiDisposisi_(idUser, surat)) {
      return {
        sukses: false,
        pesan: "Akses ditolak. Hanya Lurah pemberi disposisi atau operator aktif yang dapat mengoreksi jenis disposisi."
      };
    }

    var jenisLama = String(surat.jenis_disposisi || "").trim().toUpperCase();

    if (jenisLama === jenisBaru) {
      return {
        sukses: true,
        pesan: "Jenis disposisi sudah sesuai. Tidak ada perubahan.",
        jenisLama: jenisLama,
        jenisBaru: jenisBaru
      };
    }

    var sh = ensureSheetDisposisiSurat_();
    var C = SHEET_COLUMNS.DISPOSISI_SURAT;
    var rowIndex = cariRowDisposisiSuratById_(sh, idDisposisi);

    if (!rowIndex) {
      return { sukses: false, pesan: "Baris disposisi tidak ditemukan." };
    }

    var now = new Date();

    sh.getRange(rowIndex, C.JENIS_DISPOSISI + 1).setValue(jenisBaru);
    sh.getRange(rowIndex, C.DIUBAH_PADA + 1).setValue(now);

    var catatanLama = String(surat.catatan_operator || "").trim();
    var tambahanCatatan = "[" + Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm") + "] Koreksi jenis disposisi: " +
      jenisLama + " -> " + jenisBaru + ". Alasan: " + alasan;

    sh.getRange(rowIndex, C.CATATAN_OPERATOR + 1).setValue(
      catatanLama ? (catatanLama + "\n" + tambahanCatatan) : tambahanCatatan
    );

    var jumlahRekap = updateJenisDisposisiPadaRekapTerkait_(idDisposisi, jenisBaru);

    logDisposisi_(
      idDisposisi,
      "KOREKSI_JENIS_DISPOSISI",
      idUser,
      "Jenis: " + jenisLama + " -> " + jenisBaru + " | Alasan: " + alasan,
      {
        targetTipe: "SURAT",
        targetId: idDisposisi,
        targetNama: surat.perihal || "",
        alasan: alasan,
        detailJson: {
          jenis_lama: jenisLama,
          jenis_baru: jenisBaru,
          rekap_terkait_diperbarui: jumlahRekap
        }
      }
    );

    return {
      sukses: true,
      pesan: "Jenis disposisi berhasil dikoreksi dari " + jenisLama + " menjadi " + jenisBaru + ". Laporan terkait diperbarui: " + jumlahRekap + ".",
      jenisLama: jenisLama,
      jenisBaru: jenisBaru,
      rekapTerkaitDiperbarui: jumlahRekap
    };

  } catch (e) {
    return handleError("koreksiJenisDisposisi", e, {
      sukses: false,
      pesan: "Gagal mengoreksi jenis disposisi."
    });
  }
}

// Wrapper aman: tidak mengganti isi fungsi asli, hanya menambahkan metadata route revisi
// ke hasil ambilLaporanDitolakUntukRevisi().
var ambilLaporanDitolakUntukRevisi__SEBELUM_PATCH_DISPOSISI = ambilLaporanDitolakUntukRevisi;
ambilLaporanDitolakUntukRevisi = function (idLaporan, token) {
  var hasil = ambilLaporanDitolakUntukRevisi__SEBELUM_PATCH_DISPOSISI(idLaporan, token);

  try {
    if (!hasil || !hasil.sukses || !hasil.data) return hasil;

    var data = hasil.data;
    var idDisposisi = normalizeId_(data.idDisposisi || data.id_disposisi || "");
    if (!idDisposisi) return hasil;

    var idUser = validasiSession(token);
    var pegawai = getPegawaiById_(idUser);
    var suratAktual = getSuratDisposisiByIdInternal_(idDisposisi);

    if (pegawai && suratAktual) {
      var routeFormDisposisi = routeFormDisposisiUntukPegawai_(pegawai, suratAktual);
      var kategoriSaranDisposisi = KATEGORI_LAP.PROD;

      if (routeFormDisposisi === "TU") {
        kategoriSaranDisposisi = KATEGORI_LAP.TU;
      } else if (routeFormDisposisi === "PHL") {
        kategoriSaranDisposisi = KATEGORI_LAP.PHL;
      }

      data.routeFormDisposisi = routeFormDisposisi;
      data.jenisDisposisiAktual = String(suratAktual.jenis_disposisi || "");
      data.kategoriSaranDisposisi = kategoriSaranDisposisi;
    }
  } catch (eRouteRevisiPatch) { }

  return hasil;
};

// Wrapper pesan validasi revisi: jika laporan revisi masih dikirim dari form lama,
// tampilkan instruksi yang lebih jelas untuk buka ulang revisi.
var bangunDataRevisiKinerjaDariPaket__SEBELUM_PATCH_DISPOSISI = bangunDataRevisiKinerjaDariPaket_;
bangunDataRevisiKinerjaDariPaket_ = function (paket, idUser) {
  try {
    return bangunDataRevisiKinerjaDariPaket__SEBELUM_PATCH_DISPOSISI(paket, idUser);
  } catch (e) {
    try {
      paket = paket || {};
      var idDisposisi = normalizeId_(paket.idDisposisi || paket.id_disposisi || "");
      if (idDisposisi) {
        var pegawai = getPegawaiById_(idUser);
        var surat = getSuratDisposisiByIdInternal_(idDisposisi);
        if (pegawai && surat) {
          var route = routeFormDisposisiUntukPegawai_(pegawai, surat);
          if (route === "TU" && !paket.detailTU) {
            throw new Error(
              "Jenis disposisi terkait sudah dikoreksi menjadi Tugas Umum. " +
              "Silakan buka ulang halaman revisi agar form berubah ke Laporan Tugas Umum, lalu simpan ulang."
            );
          }
        }
      }
    } catch (ePesanKhusus) {
      throw ePesanKhusus;
    }

    throw e;
  }
};
