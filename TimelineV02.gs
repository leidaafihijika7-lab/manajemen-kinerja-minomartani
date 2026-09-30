// ============================================================
// TIMELINE v0.2 - FEED BERIMBANG + FILTER
// APP_VERSION 2026.09.28.03
// Read-only: tidak mengubah laporan, review, poin, atau tunjangan.
// ============================================================

var TIMELINE_V02_VERSION_ = "TIMELINE-v0.2-RC1-2026.09.28.03";

function normalisasiTeksTimelineV02_(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kelompokTimelineV02_(jabatan) {
  var j = normalisasiTeksTimelineV02_(jabatan);
  if (j.indexOf("phl") !== -1 || j.indexOf("lepas") !== -1) return "PHL";
  if (j.indexOf("dukuh") !== -1) return "DUKUH";
  if (j.indexOf("staf") !== -1) return "STAF";
  return "PAMONG";
}

function labelKelompokTimelineV02_(kelompok) {
  var k = String(kelompok || "").toUpperCase();
  if (k === "PHL") return "PHL";
  if (k === "DUKUH") return "Dukuh";
  if (k === "STAF") return "Staf";
  return "Pamong";
}

function actorKeyTimelineV02_(row) {
  var id = normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]);
  if (id) return "ID:" + id;
  return "LEGACY:" + normalisasiTeksTimelineV02_(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA]) + "|" +
    normalisasiTeksTimelineV02_(row[SHEET_COLUMNS.REKAP_KINERJA.JABATAN]);
}

function normalisasiRequestTimelineV02_(offsetOrRequest, legacyLimit) {
  var raw = (offsetOrRequest && typeof offsetOrRequest === "object" && !Array.isArray(offsetOrRequest))
    ? offsetOrRequest : { offset: offsetOrRequest };

  var offset = parseInt(raw.offset, 10);
  if (isNaN(offset) || offset < 0) offset = 0;
  if (offset > 100000) throw new Error("TIMELINE_OFFSET_TIDAK_VALID");

  var limitRaw = raw.limit != null ? raw.limit : legacyLimit;
  var limit = parseInt(limitRaw, 10);
  if (isNaN(limit) || limit < 1) limit = 12;
  if (limit > 30) limit = 30;

  var kelompok = String(raw.kelompok || "SEMUA").toUpperCase().trim();
  if (["SEMUA", "PAMONG", "DUKUH", "STAF", "PHL"].indexOf(kelompok) === -1) {
    throw new Error("TIMELINE_KELOMPOK_TIDAK_VALID");
  }

  var q = String(raw.q || "").trim();
  var pegawai = String(raw.pegawai || "").trim();
  var kategori = String(raw.kategori || "").trim();
  if (q.length > 100 || pegawai.length > 220 || kategori.length > 220) {
    throw new Error("TIMELINE_FILTER_TERLALU_PANJANG");
  }

  return {
    offset: offset,
    limit: limit,
    q: normalisasiTeksTimelineV02_(q),
    pegawai: pegawai,
    kategori: kategori,
    kelompok: kelompok
  };
}

function kandidatTimelineV02_(data) {
  var out = [];
  var pegawaiMap = {};
  var kategoriMap = {};
  var groupCounts = { PAMONG: 0, DUKUH: 0, STAF: 0, PHL: 0 };

  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i] || [];
    var status = String(row[SHEET_COLUMNS.REKAP_KINERJA.STATUS_REVIEW] || "");
    if (!isStatusApproved_(status)) continue;

    var nama = String(row[SHEET_COLUMNS.REKAP_KINERJA.NAMA] || "-");
    var jabatan = String(row[SHEET_COLUMNS.REKAP_KINERJA.JABATAN] || "-");
    var kategori = String(row[SHEET_COLUMNS.REKAP_KINERJA.KATEGORI] || "-");
    var kelompok = kelompokTimelineV02_(jabatan);
    var actorKey = actorKeyTimelineV02_(row);
    var item = {
      rowIndex: i,
      actorKey: actorKey,
      nama: nama,
      jabatan: jabatan,
      kategori: kategori,
      kelompok: kelompok,
      searchText: normalisasiTeksTimelineV02_(nama + " " + jabatan),
      status: status
    };
    out.push(item);
    groupCounts[kelompok] = Number(groupCounts[kelompok] || 0) + 1;

    if (!pegawaiMap[actorKey]) {
      pegawaiMap[actorKey] = {
        value: actorKey,
        nama: nama,
        jabatan: jabatan,
        kelompok: kelompok,
        label: nama + " — " + jabatan
      };
    }
    if (kategori && kategori !== "-") kategoriMap[kategori] = true;
  }

  var pegawai = Object.keys(pegawaiMap).map(function (key) { return pegawaiMap[key]; });
  pegawai.sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  var kategori = Object.keys(kategoriMap).sort(function (a, b) { return a.localeCompare(b); });

  return {
    candidates: out,
    filterOptions: { pegawai: pegawai, kategori: kategori },
    groupCounts: groupCounts
  };
}

function filterKandidatTimelineV02_(candidates, req) {
  return (candidates || []).filter(function (item) {
    if (req.kelompok !== "SEMUA" && item.kelompok !== req.kelompok) return false;
    if (req.pegawai && item.actorKey !== req.pegawai) return false;
    if (req.kategori && item.kategori !== req.kategori) return false;
    if (req.q && item.searchText.indexOf(req.q) === -1) return false;
    return true;
  });
}

// Reorder per jendela laporan terbaru. Dalam setiap jendela, laporan pertama
// dari pegawai berbeda diprioritaskan sebelum laporan kedua/ketiga pegawai yang
// sama. Jendela membatasi agar keseimbangan tidak menarik laporan sangat lama
// ke halaman awal.
function urutkanBerimbangTimelineV02_(candidates, pageSize) {
  var src = (candidates || []).slice();
  var out = [];
  var windowSize = Math.max(120, Number(pageSize || 12) * 10);

  for (var start = 0; start < src.length; start += windowSize) {
    var block = src.slice(start, start + windowSize);
    var selectedRow = {};
    var seenGroup = {};
    var seenActor = {};

    // Tahap 1: wakil terbaru tiap kelompok yang tersedia di jendela.
    // Ini membuat PHL tidak kembali tenggelam hanya karena banyak pegawai
    // non-PHL aktif pada jam-jam terakhir.
    for (var g = 0; g < block.length; g++) {
      var groupItem = block[g];
      var groupKey = groupItem.kelompok || "PAMONG";
      if (seenGroup[groupKey]) continue;
      seenGroup[groupKey] = true;
      selectedRow[groupItem.rowIndex] = true;
      seenActor[groupItem.actorKey] = true;
      out.push(groupItem);
    }

    // Tahap 2: satu laporan terbaru dari pegawai lain yang belum terwakili.
    for (var a = 0; a < block.length; a++) {
      var actorItem = block[a];
      if (selectedRow[actorItem.rowIndex]) continue;
      if (seenActor[actorItem.actorKey]) continue;
      seenActor[actorItem.actorKey] = true;
      selectedRow[actorItem.rowIndex] = true;
      out.push(actorItem);
    }

    // Tahap 3: seluruh laporan sisanya tetap tersedia, dalam urutan awal
    // di jendela, sehingga tidak ada laporan yang hilang dari pagination.
    for (var r = 0; r < block.length; r++) {
      var rest = block[r];
      if (selectedRow[rest.rowIndex]) continue;
      selectedRow[rest.rowIndex] = true;
      out.push(rest);
    }
  }
  return out;
}

function buatItemTimelineV02_(data, candidate, lampiranCache) {
  var row = data[candidate.rowIndex] || [];
  var w = row[SHEET_COLUMNS.REKAP_KINERJA.TANGGAL_LAPORAN];
  var waktuObj = parseTanggal(w);
  var waktuTeks = (waktuObj instanceof Date && !isNaN(waktuObj.getTime()))
    ? Utilities.formatDate(waktuObj, "GMT+7", "dd/MM/yyyy HH:mm")
    : (w ? String(w) : "");

  var urlDasar = row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL]
    ? String(row[SHEET_COLUMNS.REKAP_KINERJA.DASAR_URL]) : "";
  var dokumenDasarMeta = buildDriveLampiranMeta_(urlDasar, "Dokumen Dasar", lampiranCache, false);

  var urlVisuals = row[SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL]
    ? String(row[SHEET_COLUMNS.REKAP_KINERJA.VISUAL_URL]).split(",") : [];
  var buktiVisualMeta = [];
  for (var u = 0; u < urlVisuals.length; u++) {
    var link = String(urlVisuals[u] || "").trim();
    if (!link) continue;
    var label = urlVisuals.length > 1 ? "Bukti Visual " + (u + 1) : "Bukti Visual";
    var meta = buildDriveLampiranMeta_(link, label, lampiranCache, true);
    if (!meta || !meta.safeUrl) continue;
    buktiVisualMeta.push(meta);
  }

  return {
    idLaporan: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_LAPORAN]),
    idUser: normalizeId_(row[SHEET_COLUMNS.REKAP_KINERJA.ID_USER]),
    waktu: waktuTeks,
    waktuSort: (waktuObj instanceof Date && !isNaN(waktuObj.getTime())) ? waktuObj.getTime() : 0,
    nama: candidate.nama,
    jabatan: candidate.jabatan,
    kategori: candidate.kategori,
    kelompok: candidate.kelompok,
    kelompokLabel: labelKelompokTimelineV02_(candidate.kelompok),
    deskripsi: row[SHEET_COLUMNS.REKAP_KINERJA.DESKRIPSI] || "-",
    status: candidate.status || "-",
    poinFinal: Number(row[SHEET_COLUMNS.REKAP_KINERJA.POIN_FINAL]) || 0,
    dokumenDasar: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta : null,
    urlDasarRaw: dokumenDasarMeta && dokumenDasarMeta.safeUrl ? dokumenDasarMeta.safeUrl : "",
    buktiVisualMeta: buktiVisualMeta,
    buktiVisual: buktiVisualMeta,
    urlVisualRaw: buktiVisualMeta.map(function (item) { return item.safeUrl; })
  };
}

function ambilTimelinePublikV02_(token, offsetOrRequest, legacyLimit) {
  try {
    var idUser = validasiSession(token);
    if (!idUser) {
      return { sukses: false, pesan: "Sesi habis. Silakan login ulang.", items: [], nextOffset: 0, hasMore: false, totalApproved: 0, totalMatched: 0 };
    }

    var req = normalisasiRequestTimelineV02_(offsetOrRequest, legacyLimit);
    var data = getRekapKinerjaValuesReadOnly_();
    var base = kandidatTimelineV02_(data);
    var filtered = filterKandidatTimelineV02_(base.candidates, req);
    var ordered = urutkanBerimbangTimelineV02_(filtered, req.limit);
    var selected = ordered.slice(req.offset, req.offset + req.limit);
    var lampiranCache = {};
    var items = selected.map(function (candidate) {
      return buatItemTimelineV02_(data, candidate, lampiranCache);
    });

    return {
      sukses: true,
      versi: TIMELINE_V02_VERSION_,
      modeUrutan: "BERIMBANG",
      items: items,
      nextOffset: req.offset + items.length,
      hasMore: (req.offset + items.length) < ordered.length,
      totalApproved: base.candidates.length,
      totalMatched: ordered.length,
      filterAktif: {
        q: req.q,
        pegawai: req.pegawai,
        kategori: req.kategori,
        kelompok: req.kelompok
      },
      filterOptions: base.filterOptions,
      groupCounts: base.groupCounts,
      balancing: { windowSize: Math.max(120, req.limit * 10) },
      readOnly: true
    };
  } catch (e) {
    return handleError("ambilTimelinePublikV02", e, {
      sukses: false, pesan: "Gagal memuat timeline.", items: [], nextOffset: 0,
      hasMore: false, totalApproved: 0, totalMatched: 0
    });
  }
}
