// ============================================================
// TAHAP 3B-1B BATCH 2g
// PEMUTAKHIRAN SNAPSHOT BINDING AKTIF — KEBIJAKAN CUTOFF + OPTIMASI 3C-4
// Baseline produksi: APP_VERSION 2026.08.27.01
// Read-only: tidak memanggil endpoint target dan tidak mengubah data.
// ============================================================

var PORTAL_BINDING_SNAPSHOT_3B1B2_VERSION = "3B1B2g-2026.08.27.01";
var PORTAL_BINDING_BASELINE_APP_VERSION_3B1B2 = "2026.08.27.01";

var PORTAL_FUNCTION_CONTRACT_3B1B2_ = [{"name":"doGet","category":"appsScriptTriggers","arity":0,"sha256":"444716dc640b5101e1a301ad73d35cd9e2cdc8e57d76efc5eab505e0c99e8519","sourceFile":"Kode.gs","sourceLine":1,"sourceKind":"declaration","occurrenceCount":1},{"name":"adminGantiPinPegawai","category":"frontendEndpoints","arity":3,"sha256":"6257b16cd65ee823013f76edf3e9b5e573819dc5967956b8610e1cc98afeae79","sourceFile":"Kode.gs","sourceLine":3499,"sourceKind":"declaration","occurrenceCount":1},{"name":"ajukanTunjanganKeLurah","category":"frontendEndpoints","arity":3,"sha256":"fbef0e4f671eaa637bfe73f80006ebe229fc4861b80b5fbc296f95f80386f805","sourceFile":"Kode.gs","sourceLine":3157,"sourceKind":"declaration","occurrenceCount":1},{"name":"akhiriSession","category":"frontendEndpoints","arity":1,"sha256":"b8b9f286f301409006ad5c5ae9e6b9055e9e570c3dcd4a9affd0a5433d378746","sourceFile":"Kode.gs","sourceLine":865,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilAuditKoreksiCutoffLama","category":"frontendEndpoints","arity":2,"sha256":"01448d58d297d41963d5841591fdc630603e45cb9b2c0a82939da0a509faf842","sourceFile":"Kode.gs","sourceLine":14717,"sourceKind":"reassignment","occurrenceCount":3},{"name":"ambilConstantsAplikasi","category":"frontendEndpoints","arity":0,"sha256":"aa9782df4636770f2fe6a88dce48902a1747be323dabf7cbe9383776c7a05442","sourceFile":"Kode.gs","sourceLine":254,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDaftarPegawaiReviewAdmin","category":"frontendEndpoints","arity":1,"sha256":"8430affc1a713ef1867e201bb3f69d07c04950f2712f3d952ac4f6057a581d73","sourceFile":"Kode.gs","sourceLine":12942,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ambilDaftarPegawaiUntukAdmin","category":"frontendEndpoints","arity":1,"sha256":"aa37861bcdaf9bfedb44152b5b8c0059efbe9a5bd7000ecffbafdeaa4daf3c02","sourceFile":"Kode.gs","sourceLine":3387,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDashboardAdminKinerja","category":"frontendEndpoints","arity":4,"sha256":"f8c3d9aa3475e9db7b8d959d781881d71b88df05ac682bdfec9a95f2ebe6d8bd","sourceFile":"Kode.gs","sourceLine":12916,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ambilDataRekapPaged","category":"frontendEndpoints","arity":2,"sha256":"6f94c1405e78d8e5320b01d58b83a5787503d59ce1487878e49e66620fa69f7b","sourceFile":"Kode.gs","sourceLine":13376,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDetailPegawaiAdminKinerja","category":"frontendEndpoints","arity":3,"sha256":"57cddd81c33e823c2fc1828768d4339cf3277cd727c5734946a657ac14fe512f","sourceFile":"Kode.gs","sourceLine":8932,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDetailRiwayatLaporan","category":"frontendEndpoints","arity":2,"sha256":"6faa5fde9e710369784ef8686115c906a3f139c45d7dcdc7a64c0be2da1303fb","sourceFile":"Kode.gs","sourceLine":5819,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDetailRiwayatLaporan3B04C","category":"frontendEndpoints","arity":2,"sha256":"19ca483f9bf76d273816946c938564901fc1194ebe183ddb79ab0a8207c95c18","sourceFile":"PenandaPegawai.gs","sourceLine":248,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDetailRiwayatLaporan3B04C1","category":"frontendEndpoints","arity":2,"sha256":"ac0ccd05e3a93126c64db67546e10ec8db546ff063369db99cbeda830ce672f4","sourceFile":"PenandaPegawai.gs","sourceLine":779,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDetailRiwayatLaporan3B04C1c","category":"frontendEndpoints","arity":2,"sha256":"82515a1a387fa01685eebe52f055060815c1a91d868fdf319615eade61cc16da","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":711,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDisposisiUntukLaporan","category":"frontendEndpoints","arity":2,"sha256":"e842ba0a9ac8d3f3805df71572753f7d420fff91132d98d2c4359bbc42568a3a","sourceFile":"Kode.gs","sourceLine":10611,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilLaporanAdminPerPegawai","category":"frontendEndpoints","arity":7,"sha256":"8616dc85e0e93668a038cc60c92868b8470905b99a7e02479b118e3c0e593297","sourceFile":"Kode.gs","sourceLine":12955,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ambilLaporanAdminPerPegawai3B04B","category":"frontendEndpoints","arity":7,"sha256":"5dd1f191fd0522fe06d2c5072706aaafba03ba4a37db09ff3b0d5f796c8ea00f","sourceFile":"ReviewLewatPeriode.gs","sourceLine":625,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilLaporanAdminPerPegawai3B04B1","category":"frontendEndpoints","arity":7,"sha256":"756364b9812623674bd81e45cfd098095abf98e2371419e619601458f24f0f89","sourceFile":"ReviewLewatPeriode.gs","sourceLine":1026,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilLaporanAdminPerPegawai3B04C1b","category":"frontendEndpoints","arity":9,"sha256":"3e444bc9c0317b844f69ac8e40a4976b9984ca0f8c7f01a66ed57eb511f05b72","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":480,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilLaporanAdminPerPegawai3B04C1c","category":"frontendEndpoints","arity":9,"sha256":"c294eab0ac708349540454d20128855feab059f29d6b8cd54faee2bcb014f40e","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":789,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilLaporanDitolakUntukRevisi","category":"frontendEndpoints","arity":2,"sha256":"e2aa6e7410fa0b81bd9414c6900f673bae19441cc25747b0d939a8775000addc","sourceFile":"Kode.gs","sourceLine":6021,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilMetadataLampiranAdminLazy","category":"frontendEndpoints","arity":3,"sha256":"363a5db8381c217c21514b1e491c13c23e178a42bf132533c9d6f9062341611b","sourceFile":"Kode.gs","sourceLine":6715,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRekapTunjanganBulanan","category":"frontendEndpoints","arity":2,"sha256":"395de8d944547c1a8253be4703060299f920858cc0861151603fb6c5dba115f9","sourceFile":"Kode.gs","sourceLine":3015,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRingkasanDisposisiBaru","category":"frontendEndpoints","arity":1,"sha256":"d64a547aa62d7aa0ebffba6f257579869fa9a5f3be57f4c16fafa980d6cb1ee4","sourceFile":"Kode.gs","sourceLine":10186,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRiwayatKuPaged","category":"frontendEndpoints","arity":2,"sha256":"2feeca3ec4db386029f6bcf055cf617b1cd08ca14344a0134a6a411e0d4cd01d","sourceFile":"Kode.gs","sourceLine":18989,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ambilRiwayatKuPaged3B04C","category":"frontendEndpoints","arity":2,"sha256":"f173643a00863c711d1e1fe8029b161b983bace87fd95743cdae4d66355edab0","sourceFile":"PenandaPegawai.gs","sourceLine":148,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRiwayatKuPaged3B04C1","category":"frontendEndpoints","arity":2,"sha256":"566d1c0f895720a03f1b7082789d63c42ca9372ba629180de626df9a2a218e7b","sourceFile":"PenandaPegawai.gs","sourceLine":695,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRiwayatKuPaged3B04C1b","category":"frontendEndpoints","arity":2,"sha256":"7a2d27ec345bea7bd6eae7c33e9597ae71c7ebfd11d49b7b4791defd57bb0a0a","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":264,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRiwayatKuPaged3B04C1c","category":"frontendEndpoints","arity":2,"sha256":"2c4d2047efa16e190406abafcded9dd03456a4ef0107f2e25aa022011087aa1b","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":574,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilPengingatTutupPeriode3B04C1","category":"frontendEndpoints","arity":2,"sha256":"30b5e4301bf4a4f14806167406cafa77dbc63b77291b8b6aa64f44bba3390ca1","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":943,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilKonfigurasiTutupPeriode3B04C1d1","category":"frontendEndpoints","arity":2,"sha256":"ac72e2b281636bce968b22d7baeb14261afeadf9aa4040fcb3c8c4eae2339542","sourceFile":"SinkronisasiFormPeriodeC1d1.gs","sourceLine":11,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilStatusInputLaporanCutoff","category":"frontendEndpoints","arity":2,"sha256":"5447c9278181f4e80d57efe3c3c8bb8212208ac4e2b3e29aeddac598fe363b80","sourceFile":"Kode.gs","sourceLine":11576,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilStatusTutupPeriodeLaporan","category":"frontendEndpoints","arity":2,"sha256":"ce32214c447c46e1173630618764bad416d389fc7985002025587ca5ed4d0d23","sourceFile":"Kode.gs","sourceLine":12561,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilTimelinePublik","category":"frontendEndpoints","arity":3,"sha256":"0b61ca0b12b50f0665de43b559459a8a9ce9cb7c98bc2881b17f7850264e5d33","sourceFile":"Kode.gs","sourceLine":16466,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ambilTindakLanjutKoreksiCutoffLama","category":"frontendEndpoints","arity":3,"sha256":"dad26aac427fc2a44f4a656f1af2df8146f58e5b48605fad3c4c1256b16eca97","sourceFile":"Kode.gs","sourceLine":15300,"sourceKind":"reassignment","occurrenceCount":2},{"name":"batalkanDisposisiSurat","category":"frontendEndpoints","arity":2,"sha256":"836f0c11daab76e94090d7c634eeaed4b5387f21953d453f0d7c13f03cd15ecf","sourceFile":"Kode.gs","sourceLine":17084,"sourceKind":"declaration","occurrenceCount":1},{"name":"bukaPeriodeLaporan","category":"frontendEndpoints","arity":2,"sha256":"d243b3488d25fae84077a2b6ec145b6cd75511035302d4d4d056f160e85fd615","sourceFile":"Kode.gs","sourceLine":12524,"sourceKind":"declaration","occurrenceCount":1},{"name":"cekCutoffDefaultLamaDinonaktifkan","category":"frontendEndpoints","arity":1,"sha256":"62c12f1fbe9f1871f4cef4bc6ccbe518fe06496cf3758a8128bf41c9b2588cf7","sourceFile":"Kode.gs","sourceLine":15710,"sourceKind":"declaration","occurrenceCount":1},{"name":"cekLogin","category":"frontendEndpoints","arity":3,"sha256":"25125db98de78266893d815f6ebe44efa21d67c37251c0b147d5d9f333b7d5af","sourceFile":"Kode.gs","sourceLine":3648,"sourceKind":"declaration","occurrenceCount":1},{"name":"cekNotifikasiLaporanWajib","category":"frontendEndpoints","arity":1,"sha256":"1d38e9a21268337a48ec875fac3714dc67ac6eedcea4a15151c191b7b9872ad9","sourceFile":"Kode.gs","sourceLine":1267,"sourceKind":"declaration","occurrenceCount":1},{"name":"generateDraftTunjanganBulanan","category":"frontendEndpoints","arity":5,"sha256":"e6b0d68101f979ffb57cb934328425647a7911fc2669f6a19142084b81fea55f","sourceFile":"Kode.gs","sourceLine":2932,"sourceKind":"declaration","occurrenceCount":1},{"name":"generateNarasiBulananAI","category":"frontendEndpoints","arity":3,"sha256":"3f16128bb0baf787374fa7620885514b3e58998bac4e0435d1040409f390293b","sourceFile":"Kode.gs","sourceLine":8204,"sourceKind":"declaration","occurrenceCount":1},{"name":"getAppVersion","category":"frontendEndpoints","arity":0,"sha256":"5b59037f7a9b8c6704675d91f4f03b2dfca3604bd47b68a9cf7f603fdbae1464","sourceFile":"Kode.gs","sourceLine":479,"sourceKind":"declaration","occurrenceCount":1},{"name":"getDashboardStats","category":"frontendEndpoints","arity":1,"sha256":"1dac045369910345530559ce20f64906cff256b8b1d702edd7ce2ae0e7d7658b","sourceFile":"Kode.gs","sourceLine":5565,"sourceKind":"declaration","occurrenceCount":1},{"name":"getDisposisiInboxData","category":"frontendEndpoints","arity":1,"sha256":"d44dd728f119dac7455236d55b6838bf4498fec75426601278aa33791121aa8a","sourceFile":"Kode.gs","sourceLine":10937,"sourceKind":"declaration","occurrenceCount":1},{"name":"getDisposisiManagementBootstrap","category":"frontendEndpoints","arity":1,"sha256":"3ee1a91112e8fd0be06aa217e23be828e6dcbd8b3b957761563277ab4f21327b","sourceFile":"Kode.gs","sourceLine":11141,"sourceKind":"declaration","occurrenceCount":1},{"name":"getDisposisiShellBootstrap","category":"frontendEndpoints","arity":1,"sha256":"bb9b34c0b42bba55e25109f52f30c2995e8b79386de3cce646ca8a08c8e75267","sourceFile":"Kode.gs","sourceLine":10925,"sourceKind":"declaration","occurrenceCount":1},{"name":"getStatusAksesDisposisiModul","category":"frontendEndpoints","arity":1,"sha256":"4587e3f13e64c26329d8894a823c16ff0eeae025d31876370538bbf00695f876","sourceFile":"Kode.gs","sourceLine":16298,"sourceKind":"declaration","occurrenceCount":1},{"name":"kembalikanRekapTunjangan","category":"frontendEndpoints","arity":3,"sha256":"f7123d4eff25fde1a3910416ae3b1a4b4ba826068f4cc5dce5020a2aa8e1d9e7","sourceFile":"Kode.gs","sourceLine":3185,"sourceKind":"declaration","occurrenceCount":1},{"name":"koreksiJenisDisposisi","category":"frontendEndpoints","arity":2,"sha256":"442dc1993c027634c4f62e95341d6a3fe33a98d8013b60bbe2dc0cc62bd385f0","sourceFile":"Kode.gs","sourceLine":9762,"sourceKind":"declaration","occurrenceCount":1},{"name":"koreksiStatusCutoffLama","category":"frontendEndpoints","arity":3,"sha256":"d6cc45fd8112b2c2cbc298dd05d94b3b60c00fcd66c86767b1403d429a8cfa20","sourceFile":"Kode.gs","sourceLine":18394,"sourceKind":"reassignment","occurrenceCount":4},{"name":"kunciDraftTunjanganBulanan","category":"frontendEndpoints","arity":3,"sha256":"8e8a8533d8b2abd93a03a7841aaddb81de6b1691296791d930aa43438f973772","sourceFile":"Kode.gs","sourceLine":3143,"sourceKind":"declaration","occurrenceCount":1},{"name":"prosesReviewAdmin","category":"frontendEndpoints","arity":5,"sha256":"a2a7a24e9b61abb3d7fc5d122cf12b0f2802f64a39c45213f3916eef1c09abff","sourceFile":"Kode.gs","sourceLine":18385,"sourceKind":"reassignment","occurrenceCount":3},{"name":"rapikanBahasaLaporanAI","category":"frontendEndpoints","arity":3,"sha256":"6db1031d36ab26d01cf8a890f7d3c3344851f275a0051d679d7b475e70baf078","sourceFile":"Kode.gs","sourceLine":5482,"sourceKind":"declaration","occurrenceCount":1},{"name":"refreshDataPegawaiCache","category":"frontendEndpoints","arity":1,"sha256":"b5340e311d9ad73437cf72d689596544766c7cb6af698a57e063a2f62f3598a4","sourceFile":"Kode.gs","sourceLine":807,"sourceKind":"declaration","occurrenceCount":1},{"name":"setujuiRekapTunjangan","category":"frontendEndpoints","arity":3,"sha256":"2cd19ca01ef391f79a25069c86199f2375c850f369f048658b34595eea37a424","sourceFile":"Kode.gs","sourceLine":3171,"sourceKind":"declaration","occurrenceCount":1},{"name":"simpanCutoffInputLaporanPeriode","category":"frontendEndpoints","arity":5,"sha256":"cce986b675494b3d11b835ebb5d8b262ea5aeb9d7275343daab0e803338e20fa","sourceFile":"Kode.gs","sourceLine":12342,"sourceKind":"declaration","occurrenceCount":2},{"name":"simpanDataKinerja","category":"frontendEndpoints","arity":2,"sha256":"2ec388738a0a636d934eabed88ddf48de20edb6e7446b409e6a4e857481bfc8b","sourceFile":"Kode.gs","sourceLine":4427,"sourceKind":"declaration","occurrenceCount":1},{"name":"simpanDisposisiSurat","category":"frontendEndpoints","arity":2,"sha256":"aed83fbbf387c7e471d012526486f60e35564b9ae845d2c2c6cea381ad22239d","sourceFile":"Kode.gs","sourceLine":9853,"sourceKind":"declaration","occurrenceCount":1},{"name":"simpanPetugasDisposisi","category":"frontendEndpoints","arity":2,"sha256":"b6d0e47a55c4df04bce53bbb4819564198a231e850762c8c7d107acf90e7ebff","sourceFile":"Kode.gs","sourceLine":9337,"sourceKind":"declaration","occurrenceCount":1},{"name":"simpanRevisiLaporanDitolakPegawai","category":"frontendEndpoints","arity":2,"sha256":"b1f7bcb2c47fe99afe770dae0fe064d4ee6cedfb03927111851550b098b071c0","sourceFile":"Kode.gs","sourceLine":18375,"sourceKind":"reassignment","occurrenceCount":2},{"name":"simpanTutupPeriodeLaporan","category":"frontendEndpoints","arity":2,"sha256":"a15efc27e5d7e49374a580e35cc8a16545f9b80789f4905709fb97ddb2cfafc8","sourceFile":"Kode.gs","sourceLine":12462,"sourceKind":"declaration","occurrenceCount":1},{"name":"tambahPenerimaDisposisi","category":"frontendEndpoints","arity":2,"sha256":"051a20491423f6b9b098c1bdca38f8b38de582a422a13b64f78a274390ac49db","sourceFile":"Kode.gs","sourceLine":9868,"sourceKind":"declaration","occurrenceCount":1},{"name":"tandaiDisposisiSudahDibuka","category":"frontendEndpoints","arity":2,"sha256":"3871bd9a07868267b2152b682f670639fbe2525a833754935443020693cf7080","sourceFile":"Kode.gs","sourceLine":10676,"sourceKind":"declaration","occurrenceCount":1},{"name":"tandaiSudahDicairkan","category":"frontendEndpoints","arity":4,"sha256":"6e65f98b4cf83d6b5a9d408be5de6b4e3638aa6fb8326cc659489c521dd5cc39","sourceFile":"Kode.gs","sourceLine":3213,"sourceKind":"declaration","occurrenceCount":1},{"name":"terapkanPoinKoreksiCutoffLama","category":"frontendEndpoints","arity":2,"sha256":"ec195fe5abe07d6dc8b2b884f1f4cb451a18e8186a395bcf8f60342312865e0f","sourceFile":"Kode.gs","sourceLine":18403,"sourceKind":"reassignment","occurrenceCount":3},{"name":"teruskanKeBendahara","category":"frontendEndpoints","arity":3,"sha256":"dd2382f0008d3a36399f13c481848cb52b1c13f2c0d760389a521b72bac94dbb","sourceFile":"Kode.gs","sourceLine":3199,"sourceKind":"declaration","occurrenceCount":1},{"name":"uploadBuktiKinerjaBlob","category":"frontendEndpoints","arity":1,"sha256":"fa1c3dc482d7103454633bd015cbe8c8dc5013f301fb5abd3c9154c69d27a529","sourceFile":"Kode.gs","sourceLine":4525,"sourceKind":"declaration","occurrenceCount":1},{"name":"uploadLampiranDisposisiBlob","category":"frontendEndpoints","arity":1,"sha256":"78bbc39a78366359562582c9b543eccef5828b849592da2da07796ce90491d60","sourceFile":"Kode.gs","sourceLine":9445,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceStatusPortal3B0","category":"maintenanceOwnerOnly","arity":0,"sha256":"cdf621abadd0a55f6fe18ae8ead644751a2b3a4481bef3232910e79b6afe42c9","sourceFile":"Kode.gs","sourceLine":384,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceInitializeAppConstants3B0","category":"maintenanceOwnerOnly","arity":0,"sha256":"eea428feacb5361841269c289c1b8a3a1fdb0ed8e48d163b3dc39802ddbc868f","sourceFile":"Kode.gs","sourceLine":403,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceSiapkanKolomKeamananPin3B0","category":"maintenanceOwnerOnly","arity":0,"sha256":"423b10d0b09001c043d57e44c0300d40ead7c0e25743036261d065605c772939","sourceFile":"Kode.gs","sourceLine":417,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceSiapkanKolomDetailRekap3B0","category":"maintenanceOwnerOnly","arity":0,"sha256":"5fcabe17b6909d9e706f00d2e7975574bb9f5910d78c7612fbb14be7e5a1f1bb","sourceFile":"Kode.gs","sourceLine":431,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenancePerbaikiPeriodeTunjangan3B0","category":"maintenanceOwnerOnly","arity":0,"sha256":"89716221244ef7cfe85001381bbb7f2ac6855b72097d7ecf0e15e607130a331a","sourceFile":"Kode.gs","sourceLine":445,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceDiagnostikCacheDisposisi3B01","category":"maintenanceOwnerOnly","arity":0,"sha256":"44ea89e540a2887bd6469f12ff861490e62d785d346a57e2d15a2888c5b57d67","sourceFile":"Kode.gs","sourceLine":18478,"sourceKind":"declaration","occurrenceCount":1},{"name":"maintenanceDiagnostikCacheDisposisi3B02","category":"maintenanceOwnerOnly","arity":0,"sha256":"c0b877133425250fcc44768c03b02c8e127b69c6a007a7cd7732d7f33b28a094","sourceFile":"Kode.gs","sourceLine":18439,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusRegistryFungsi3B1B1","category":"maintenanceOwnerOnly","arity":0,"sha256":"1a52d9f41fc702dfab0a2de5c91260a78dcff16ea260f7199433e0d7eb184e6a","sourceFile":"FunctionRegistry.gs","sourceLine":304,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiRegistryFungsi3B1B1","category":"maintenanceOwnerOnly","arity":0,"sha256":"bd6b7ba9afe338f577c990edc0fdbcbaec2321260e34d2389c2d7e26ceb86e9f","sourceFile":"FunctionRegistry.gs","sourceLine":339,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPenandaLewatPeriodeAdmin3B04B1","category":"maintenanceOwnerOnly","arity":0,"sha256":"37a55918b9e8889e320c676263207a0026b2943d90f49a94c01ea09b802e0761","sourceFile":"ReviewLewatPeriode.gs","sourceLine":1147,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanPenandaLewatPeriodeAdmin3B04B1","category":"maintenanceOwnerOnly","arity":0,"sha256":"5a84b4763fe7ea48f9a64a7d3dd8b9d055cefa2367e149206261dc75e284d493","sourceFile":"ReviewLewatPeriode.gs","sourceLine":1252,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanPenandaLewatPeriodeAdmin3B04B1","category":"maintenanceOwnerOnly","arity":0,"sha256":"0b0db06fcc290d808f6373595dd8e7aaeb3e5c9539d9330b4095af5905ad82bf","sourceFile":"ReviewLewatPeriode.gs","sourceLine":1287,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPenandaLewatPeriodePegawai3B04C","category":"maintenanceOwnerOnly","arity":0,"sha256":"e90cd39dd496f63cb005f8eb5b2a2c97e1035cafe91849014c07a26741ab8543","sourceFile":"PenandaPegawai.gs","sourceLine":358,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanPenandaLewatPeriodePegawai3B04C","category":"maintenanceOwnerOnly","arity":0,"sha256":"99fd81014a3ce955627a6a9858d4b4cafaf32752585820b1c28f8f0ee54e4b0b","sourceFile":"PenandaPegawai.gs","sourceLine":529,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanPenandaLewatPeriodePegawai3B04C","category":"maintenanceOwnerOnly","arity":0,"sha256":"d931ae3124d8f9046348889c3161441e644e5621f78847f43d6cca6ef3697a9f","sourceFile":"PenandaPegawai.gs","sourceLine":564,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPatch3B04C1","category":"maintenanceOwnerOnly","arity":0,"sha256":"09b3f3150bd08955f27c33efd2d595c6f06b800b3efc8ba5013f787e3329a62a","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":999,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanPatch3B04C1","category":"maintenanceOwnerOnly","arity":0,"sha256":"7ae8c50080a0f3c0cc6f7f304579acff572545e9ab9f7da943664ef1219cbc01","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1127,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanPatch3B04C1","category":"maintenanceOwnerOnly","arity":0,"sha256":"692f88b7129720a54e8e2c141dbf75ac58acd00f8dbc61c80bbe7510b12fde3f","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1155,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusHotfix3B04C1a","category":"maintenanceOwnerOnly","arity":0,"sha256":"9bcd3f3b96d917a4cbb62d37e39f46cca932a5bda2f30dde5fcd9b6218bccb91","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1173,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanHotfix3B04C1a","category":"maintenanceOwnerOnly","arity":0,"sha256":"f8e8d964faa87101be908626afdecaa4b3081c3769aa522affb1ea2085b26b44","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1229,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanHotfix3B04C1a","category":"maintenanceOwnerOnly","arity":0,"sha256":"861d578c2fd9f6fcd0d0a9d896f2024ee4fa43654ae1027a5c84c86594aaa4f2","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1252,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPenyempurnaanPeriodeReview3B04C1b","category":"maintenanceOwnerOnly","arity":0,"sha256":"d4229ed7b065c02d63993ff036a3fcd37e95175217c2b94b88b701b80f91d400","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":676,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanPenyempurnaanPeriodeReview3B04C1b","category":"maintenanceOwnerOnly","arity":0,"sha256":"f0143965d371f683dbb7b840ae35b9a9e2e1f58f6d98f02d218d7560df9d94d4","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":755,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanPenyempurnaanPeriodeReview3B04C1b","category":"maintenanceOwnerOnly","arity":0,"sha256":"a18b5445dd8f56e424efff99716c499214083cd84ca10ba0155dee18db3e16db","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":782,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusHotfixPeriodeReview3B04C1c","category":"maintenanceOwnerOnly","arity":0,"sha256":"c764ed94963890a14184ece21a9176bf44aa91bf1264875a46055fa0956ba468","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":1025,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanHotfixPeriodeReview3B04C1c","category":"maintenanceOwnerOnly","arity":0,"sha256":"1c289dcdf95d96988c292ee8600ceedcd4d874c2f89a5cbd2b43a08eb1a61731","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":1103,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanHotfixPeriodeReview3B04C1c","category":"maintenanceOwnerOnly","arity":0,"sha256":"11c135ddb95378d9b20f45620ca34ce3ff2cf372c1321a76665e7978547c0b80","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":1126,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPresisiCutoff3B04C1d","category":"maintenanceOwnerOnly","arity":0,"sha256":"84636da65b7d0c235009a457487f9572991fbbf8b9fc3da7a9d3f76d90253582","sourceFile":"PresisiCutoffC1d.gs","sourceLine":11,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusSinkronisasiFormPeriode3B04C1d1","category":"maintenanceOwnerOnly","arity":0,"sha256":"5a3ebce2b375630945b42d78d6d459cbb61fc5f63ee636bca25c953d0a629c6d","sourceFile":"SinkronisasiFormPeriodeC1d1.gs","sourceLine":56,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPosisiScrollReview3B04C1d2","category":"maintenanceOwnerOnly","arity":0,"sha256":"4b614730d1da9eb3ef1d487aaf76cce58243e83ea81564564fe2bcf4744d99cc","sourceFile":"PosisiScrollReviewC1d2.gs","sourceLine":11,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusBindingAktif3B1B2","category":"maintenanceOwnerOnly","arity":0,"sha256":"ddf1b69e17a0732b3ac66fb19c98fd88d2b224a22faf7bab06444465768fc0ad","sourceFile":"BindingAktif3B1B2.gs","sourceLine":126,"sourceKind":"declaration","occurrenceCount":1},{"name":"snapshotKontrakFungsi3B1B2","category":"maintenanceOwnerOnly","arity":0,"sha256":"a8b00d515c151627a8e041be3c04a58c01bc8cfcc2e88ffa5f5b1f8193128954","sourceFile":"BindingAktif3B1B2.gs","sourceLine":138,"sourceKind":"declaration","occurrenceCount":1},{"name":"initializeAppConstants","category":"blockedCompatibilityStubs","arity":0,"sha256":"41c3baed98b2f646208cfb3868ea3b83f43e61643fd848b4b44496c9d679033a","sourceFile":"Kode.gs","sourceLine":462,"sourceKind":"declaration","occurrenceCount":1},{"name":"siapkanKolomKeamananPinPegawai","category":"blockedCompatibilityStubs","arity":0,"sha256":"d284bd83d525f2be66129f9dd7ea4fe9d304adf0e99822869ea7542b54056548","sourceFile":"Kode.gs","sourceLine":463,"sourceKind":"declaration","occurrenceCount":1},{"name":"siapkanKolomDetailFormRekapKinerja","category":"blockedCompatibilityStubs","arity":0,"sha256":"ef284c07b7ae16ad69a99a139d4681b7ce65c8e090d017838be79513aaac306c","sourceFile":"Kode.gs","sourceLine":464,"sourceKind":"declaration","occurrenceCount":1},{"name":"perbaikiKolomPeriodeTunjangan","category":"blockedCompatibilityStubs","arity":0,"sha256":"8cd9cb061e6922827f86735fe7ece2e2e542d91a3faf011cea18fc39fb34b750","sourceFile":"Kode.gs","sourceLine":465,"sourceKind":"declaration","occurrenceCount":1},{"name":"logAudit","category":"blockedCompatibilityStubs","arity":0,"sha256":"6f57fcb0fbb62df12bc7b78c497fb819ab336f5370504198ddc58608ad809071","sourceFile":"Kode.gs","sourceLine":466,"sourceKind":"declaration","occurrenceCount":1},{"name":"logAI","category":"blockedCompatibilityStubs","arity":0,"sha256":"3aae22a05c3b860954f1204c90fb2fbe70834bb8aad8d2e7180c3f994d894717","sourceFile":"Kode.gs","sourceLine":467,"sourceKind":"declaration","occurrenceCount":1},{"name":"dapatkanAtauBuatFolder","category":"blockedCompatibilityStubs","arity":0,"sha256":"17745898abb59982c51cad6d4781777dabcce59eebc987aa0c5fe83b88237314","sourceFile":"Kode.gs","sourceLine":468,"sourceKind":"declaration","occurrenceCount":1},{"name":"auditIndexLaporan2B0","category":"manualDiagnostics","arity":0,"sha256":"34d7ad2dca50a61d9bb7b88197eb1b5f17a17ba498b20f496a894e8fbd4ba829","sourceFile":"Kode.gs","sourceLine":17810,"sourceKind":"declaration","occurrenceCount":1},{"name":"bangunUlangIndexLaporan2B0","category":"manualDiagnostics","arity":0,"sha256":"45fd4d399d812f70196d5a0ef93e787193acf7d1167e7ea481a730c42c5f92d5","sourceFile":"Kode.gs","sourceLine":17840,"sourceKind":"declaration","occurrenceCount":1},{"name":"buatLaporanAuditIndexLaporan2B0","category":"manualDiagnostics","arity":0,"sha256":"3aedfb3cd7556d30913c466f194b9e88c29d4c9204a852e15221638d561182b9","sourceFile":"Kode.gs","sourceLine":17824,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiIndexLaporan2B0","category":"manualDiagnostics","arity":0,"sha256":"dfb5304377fe3ca25552f9291163241a97d34dcce0614ff59ec4b76580afc024","sourceFile":"Kode.gs","sourceLine":17847,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusDualWriteIndexLaporan2B1","category":"manualDiagnostics","arity":0,"sha256":"8cd028a0aa5688f6fbeb38c6542930cae6b47656935f6957af1f5172b52133dd","sourceFile":"Kode.gs","sourceLine":19160,"sourceKind":"reassignment","occurrenceCount":2},{"name":"ujiSinkronisasiBarisTerakhirIndexLaporan2B1","category":"manualDiagnostics","arity":0,"sha256":"1533129cc126a4f678bf155e2d44ff0645db2c71e7adbb8679959af3b34840da","sourceFile":"Kode.gs","sourceLine":18285,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanDualWriteIndexLaporan2B1","category":"manualDiagnostics","arity":0,"sha256":"e2e539fef7257fe8187da1159810c91e2b43b33cba560d89d1ea73d3642d2628","sourceFile":"Kode.gs","sourceLine":18296,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanDualWriteIndexLaporan2B1","category":"manualDiagnostics","arity":0,"sha256":"319f69acf53941cd751a348db5f4bf16dd1becee7bfd8dda03d02fd79b60ef80","sourceFile":"Kode.gs","sourceLine":18317,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiDualWriteIndexLaporan2B1","category":"manualDiagnostics","arity":0,"sha256":"74b28e2c21e33d62eeda79c19ff373b622276a1fbb991cfbfee716195a61a672","sourceFile":"Kode.gs","sourceLine":18323,"sourceKind":"declaration","occurrenceCount":1},{"name":"prosesAntreanPerbaikanIndexLaporan2B1","category":"manualDiagnostics","arity":1,"sha256":"0dd20633a5acf6d6f7d8c6fa5f0784f703b0d93f94870668160fd2baf2e7de05","sourceFile":"Kode.gs","sourceLine":18238,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":0,"sha256":"9d50d1cb04c29561c642a5a3bec54c9d416970b18fadd0f78e4bfe68b39c1363","sourceFile":"Kode.gs","sourceLine":19052,"sourceKind":"declaration","occurrenceCount":1},{"name":"ujiReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":2,"sha256":"7491036fa95b6b6b21fac754a515ba3e0c35c5943c993c41110ce75e6d949a31","sourceFile":"Kode.gs","sourceLine":19079,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":0,"sha256":"1b0056d8b12e431cf023eb3344e7a74053baab24c65109c897fc760dbfca81dd","sourceFile":"Kode.gs","sourceLine":19088,"sourceKind":"declaration","occurrenceCount":1},{"name":"aktifkanReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":0,"sha256":"f63cc23f59627a9ae2eb59f40dd8bd111fc92ad4c86b580bed076f207343438f","sourceFile":"Kode.gs","sourceLine":19111,"sourceKind":"declaration","occurrenceCount":1},{"name":"nonaktifkanReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":0,"sha256":"402ad6d738d8b79329700e3ad94fa54e66293587763d67fee8a0e55c8249c45d","sourceFile":"Kode.gs","sourceLine":19129,"sourceKind":"declaration","occurrenceCount":1},{"name":"resetMetrikReadRiwayatIndex2B2A","category":"manualDiagnostics","arity":0,"sha256":"74075e85745fa1582be186acf3f33c1e7c28357ce3056a98832b635bf498bee9","sourceFile":"Kode.gs","sourceLine":19148,"sourceKind":"declaration","occurrenceCount":1},{"name":"koreksiLaporanBlackoutCutoffApril2026","category":"manualDiagnostics","arity":0,"sha256":"ef0fb7ecad54612e5b94a80944afd363917f4d7f95bf875b035ef9c41ca93a34","sourceFile":"Kode.gs","sourceLine":15667,"sourceKind":"declaration","occurrenceCount":1},{"name":"koreksiLaporanLewatCutoffApril2026","category":"manualDiagnostics","arity":0,"sha256":"f32a336c40005155476b9ae8a7212d3f905fca576c93df0b9da03792e4f76ee2","sourceFile":"Kode.gs","sourceLine":15651,"sourceKind":"declaration","occurrenceCount":3},{"name":"normalisasiStatusLewatCutoffLama","category":"manualDiagnostics","arity":1,"sha256":"d8308da6a0a1113f42c68c0b71ab98039671dfb60bcea1cc2786a75575d9ce73","sourceFile":"Kode.gs","sourceLine":18412,"sourceKind":"reassignment","occurrenceCount":2},{"name":"prosesAntreanAI","category":"manualDiagnostics","arity":0,"sha256":"f0179dddb70c85f96473aecf69b895cbd622e06ad87058dd4b2108620ca3f5c5","sourceFile":"Kode.gs","sourceLine":5540,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusAuditLaporanLewatPeriode3B04A","category":"manualDiagnostics","arity":0,"sha256":"f60f8774281eff3f87934e6b82bcd312b9b89851e7ff37fd71375ed7576c4791","sourceFile":"AuditPeriode.gs","sourceLine":598,"sourceKind":"declaration","occurrenceCount":1},{"name":"auditLaporanLewatPeriode3B04A","category":"manualDiagnostics","arity":1,"sha256":"b5363faac20a8ce4ac6d0b795ecef7d3b8572d7041ced9b1abb6bc29898dfaab","sourceFile":"AuditPeriode.gs","sourceLine":650,"sourceKind":"declaration","occurrenceCount":1},{"name":"auditLaporanLewatPeriodeJuli2026_3B04A","category":"manualDiagnostics","arity":0,"sha256":"51581a030f4b0b5d6abbe718a3ddf0843759a544300489861039d8561040d66e","sourceFile":"AuditPeriode.gs","sourceLine":1143,"sourceKind":"declaration","occurrenceCount":1},{"name":"ujiKlasifikasiLaporanLewatPeriode3B04A","category":"manualDiagnostics","arity":0,"sha256":"e67894e49f664f9c41527ddfb37ea3d52652ddb166606f58066ead9e3f8e7be5","sourceFile":"AuditPeriode.gs","sourceLine":1150,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiAuditLaporanLewatPeriode3B04A","category":"manualDiagnostics","arity":0,"sha256":"531a4f1c3ccedd73d6e628d9b5fb72425be2f9397a605f2caa668dfad8c416ab","sourceFile":"AuditPeriode.gs","sourceLine":1366,"sourceKind":"declaration","occurrenceCount":1},{"name":"statusPenandaLewatPeriodeAdmin3B04B","category":"manualDiagnostics","arity":0,"sha256":"f713405ecff0d54b32e2203a646c494b84351558a12abcd67f2b8d767ca69a3a","sourceFile":"ReviewLewatPeriode.gs","sourceLine":885,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPenandaLewatPeriodeAdmin3B04B","category":"manualDiagnostics","arity":0,"sha256":"bf78089c3005d979d8d40df20f88cb135d7d51a9612e4e47ead6ae260893a079","sourceFile":"ReviewLewatPeriode.gs","sourceLine":927,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPenandaLewatPeriodeAdmin3B04B1","category":"manualDiagnostics","arity":0,"sha256":"a6ae3bbb6e7568940b515bec32267ae549a99c51c6fb6cbcd9c36b220407d89e","sourceFile":"ReviewLewatPeriode.gs","sourceLine":1188,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPenandaLewatPeriodePegawai3B04C","category":"manualDiagnostics","arity":0,"sha256":"15fda29f67ee15b0f5b8d2f153866ecfc618956a548438482a232ce694c1dc99","sourceFile":"PenandaPegawai.gs","sourceLine":397,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPatch3B04C1","category":"manualDiagnostics","arity":0,"sha256":"12089eb7ac232442bb8aa4f4c25f3433ecd67b7ba398d24c66f655c1ee14474c","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1020,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPenandaLewatPeriodePegawai3B04C1","category":"manualDiagnostics","arity":0,"sha256":"93225461578d7c755cafbc2c03f9e26e85173525282c47afdcf25dc7e9a399de","sourceFile":"PenandaPegawai.gs","sourceLine":872,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiSerialisasiRespons3B04C1a","category":"manualDiagnostics","arity":0,"sha256":"909505a820872278c44b8a35393dc30641080f9dfa6470ec215cbdd5d015ff52","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":455,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiHotfix3B04C1a","category":"manualDiagnostics","arity":0,"sha256":"08d9d4c669aba6714a9b817c6a2f63dc4460751ade797c7c68113cd2f1ff5024","sourceFile":"SinkronisasiCutoffPeriode.gs","sourceLine":1183,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPenyempurnaanPeriodeReview3B04C1b","category":"manualDiagnostics","arity":0,"sha256":"f65ba38bc361e4f853bef4fdec62de351020d3e7e2fcd76ca05866385a5b39ea","sourceFile":"PenyempurnaanPeriodeReview.gs","sourceLine":704,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiHotfixPeriodeReview3B04C1c","category":"manualDiagnostics","arity":0,"sha256":"fb0931b40f84026aa42f1ffb866c7a64e6cc60e86abcb39432f8a6b37d4bfe07","sourceFile":"HotfixPeriodeReviewC1c.gs","sourceLine":1051,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPresisiCutoff3B04C1d","category":"manualDiagnostics","arity":0,"sha256":"71407c812b9f964df8ca5f405debe920a62e6f7d37b2aa0c0c110a4766a2d0a7","sourceFile":"PresisiCutoffC1d.gs","sourceLine":34,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiSinkronisasiFormPeriode3B04C1d1","category":"manualDiagnostics","arity":0,"sha256":"31a5ed695c8ce83ddd086172a8bf2bcbbf4ee92de6f30c4a8311d918fac454e9","sourceFile":"SinkronisasiFormPeriodeC1d1.gs","sourceLine":75,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiPosisiScrollReview3B04C1d2","category":"manualDiagnostics","arity":0,"sha256":"ceffb19bcbae50ac1d7480797e86697ff5dbf18934949d28e7cf29c81e24b039","sourceFile":"PosisiScrollReviewC1d2.gs","sourceLine":29,"sourceKind":"declaration","occurrenceCount":1},{"name":"validasiBindingAktif3B1B2","category":"manualDiagnostics","arity":0,"sha256":"4cac2be362d2d91d394b91f6f9143fbba713805ded80f74474bae58343990d72","sourceFile":"BindingAktif3B1B2.gs","sourceLine":88,"sourceKind":"declaration","occurrenceCount":1},{"name":"cekKontrakFungsi3B1B2","category":"manualDiagnostics","arity":1,"sha256":"d79e35a290b4be8d3c5545acdadab62d28cee169784afb4f33115faed09e6a0a","sourceFile":"BindingAktif3B1B2.gs","sourceLine":157,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilSemuaLaporanAdmin","category":"legacyPublicCompatibility","arity":1,"sha256":"0fa18c0b2bd735fc77db09fc2e45d5dd173af0b24b95c4273c820086a60b167c","sourceFile":"Kode.gs","sourceLine":7904,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilDaftarPegawaiAktifUntukDisposisi","category":"legacyPublicCompatibility","arity":1,"sha256":"c687c35c12967665aa10faf34429b8af5987eb1b1b3f68a82e417fcd92f0c5ce","sourceFile":"Kode.gs","sourceLine":2162,"sourceKind":"declaration","occurrenceCount":1},{"name":"ambilRiwayatKu","category":"legacyPublicCompatibility","arity":2,"sha256":"e205c7f812a52bc18ce468c6d0631483ce9be24f436c94e9965dc55dc431e5b9","sourceFile":"Kode.gs","sourceLine":6458,"sourceKind":"declaration","occurrenceCount":1},{"name":"getDisposisiBootstrap","category":"legacyPublicCompatibility","arity":1,"sha256":"1beaa878c2435b486a304bf4f04c1343e31b5760cc47c0d373f1ac66bee018be","sourceFile":"Kode.gs","sourceLine":11161,"sourceKind":"declaration","occurrenceCount":1},{"name":"cariLogErrorSubmitKinerjaV33","category":"legacyPublicCompatibility","arity":2,"sha256":"70b948de237f7bb14298e32b694886771ec7bd1d5c37979d2079b1a4b1011ff0","sourceFile":"Kode.gs","sourceLine":16246,"sourceKind":"declaration","occurrenceCount":1},{"name":"debugPeriodeTutupDariTanggalPelaksanaanV31","category":"legacyPublicCompatibility","arity":2,"sha256":"1eac8d7d7cd43943ccf2887b53a479aef8ac293e3cea88543875ef873985c75c","sourceFile":"Kode.gs","sourceLine":16107,"sourceKind":"declaration","occurrenceCount":1}];

// Patch deterministik terhadap snapshot sebelumnya. Batch 2g mempertahankan
// 173 kontrak dan memperbarui hash endpoint Riwayat yang dioptimalkan.
function terapkanPatchBindingAktif3B1B2g_() {
  var updates = {
    ambilRiwayatKuPaged3B04C1c: {
      sha256: "24f1530ea02ce9a208e8251b31ca82476af47140599d2bc6aa233ea283675be5",
      sourceLine: 617
    },
    akhiriSession: {
      sha256: "c7885e7afe3e2d49b465068bb993ef81acd34cf06109f910e838edcac1ac4a02",
      sourceLine: 1138
    },
    cekLogin: {
      sha256: "320a637a8c54befea774c3853a8fde5eb9829026ef7bd5d6b715f2237d68ae3a",
      sourceLine: 3919
    }
  };
  PORTAL_FUNCTION_CONTRACT_3B1B2_.forEach(function (row) {
    if (updates[row.name]) {
      row.sha256 = updates[row.name].sha256;
      row.sourceLine = updates[row.name].sourceLine;
    }
  });

  function sisipkanSebelum_(anchorName, additions) {
    var existing = {};
    PORTAL_FUNCTION_CONTRACT_3B1B2_.forEach(function (row) { existing[row.name] = true; });
    var pending = additions.filter(function (row) { return !existing[row.name]; });
    if (!pending.length) return;

    var anchorIndex = -1;
    PORTAL_FUNCTION_CONTRACT_3B1B2_.some(function (row, index) {
      if (row.name !== anchorName) return false;
      anchorIndex = index;
      return true;
    });
    if (anchorIndex < 0) throw new Error("Anchor kontrak tidak ditemukan: " + anchorName);

    PORTAL_FUNCTION_CONTRACT_3B1B2_ = PORTAL_FUNCTION_CONTRACT_3B1B2_
      .slice(0, anchorIndex)
      .concat(pending, PORTAL_FUNCTION_CONTRACT_3B1B2_.slice(anchorIndex));
  }

  sisipkanSebelum_("ambilLaporanDitolakUntukRevisi", [{
    name: "ambilLaporanAdminPerPegawai3C1",
    category: "frontendEndpoints",
    arity: 9,
    sha256: "2f40aafc34c8bac175700283c0db3327d86f3ee825a1cc737ad0274a5ada7b05",
    sourceFile: "OptimasiReviewAdmin3C1.gs",
    sourceLine: 684,
    sourceKind: "declaration",
    occurrenceCount: 1
  }]);

  sisipkanSebelum_("cekNotifikasiLaporanWajib", [{
      name: "cekSessionAktif",
      category: "frontendEndpoints",
      arity: 1,
      sha256: "9dc8cb7c20ba05891ebd6efc73373cb36ff539a8f858623a44531dabb7b94358",
      sourceFile: "Kode.gs",
      sourceLine: 1179,
      sourceKind: "declaration",
      occurrenceCount: 1
  }]);

  sisipkanSebelum_("maintenanceDiagnostikCacheDisposisi3B01", [
    {
      name: "statusMaintenanceAksesBuktiLama3C3",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "4ded295be5306e5150dd58e7efdd061d1c7f45be21286303619b8ea80ed25e7e",
      sourceFile: "Kode.gs",
      sourceLine: 4841,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "maintenancePerbaikiAksesBuktiLama3C3",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "8e5339832d8c2f219edc61ee84bb908206e4b90fe571aa0dec850a919b714ced",
      sourceFile: "Kode.gs",
      sourceLine: 4873,
      sourceKind: "declaration",
      occurrenceCount: 1
    }
  ]);

  sisipkanSebelum_("initializeAppConstants", [
    {
      name: "statusOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "a0bca6b8e834d05e26280ca49713d47b40aaf0c63f314e7ca6307d9f5c13ac58",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 851,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "aktifkanOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "7edef7b9cbc2fe05122bde382afe2858ff4ccbb5cb627c337a100e5aa2c674d9",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 873,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "nonaktifkanOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "3567471751847e0c2b3f8021a2e790fa10e3bd2b7c8273778864d05e558c8259",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 897,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "aturPersentaseShadowOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 1,
      sha256: "93e96b9618f883540a81697d6d4908daa4d1062178627d15bc11f24955d17b01",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 911,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "resetMetrikOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "5a32d05b4259f6ce836a7d03ef1c54e1b2d7382d01df64d46f448baf11376c85",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 921,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "guardTerencanaOptimasiReviewAdmin3C1",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "55f105f212e8dd50126f8a7596bf0987f07856e8c1eea16adc60bf8948d4bc47",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 938,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "statusOptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "c8e1429bfc92d57a4f3c1794503ab56d672a19dcd3b1256c9deece32a6e12913",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 441,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "aktifkanOptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "cb5c7e4f43ae5207a14963d4c7a8058bbc259b5e716ddb25959b8984e96b9fd6",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 462,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "nonaktifkanOptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "bcf6c415111a6c6af489aae82202ddea0f2e6863b883509e0ded92cc203786fb",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 486,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "aturShadow20OptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "cbd0fc5b1c6af6e3445e20bfb63994a4a67d4577399f00639866b551ce356954",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 501,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "resetMetrikOptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "5c5630a116abfc907c2306575ebf089cadc49e56deefede585b8ca89b830ea98",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 509,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "guardTerencanaOptimasiBuildReviewAdmin3C2",
      category: "maintenanceOwnerOnly",
      arity: 0,
      sha256: "f27a0098dcd7ee0026046fac4ac9d7b6f99b49bcc5ab86ed5d46c4d19f58e527",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 518,
      sourceKind: "declaration",
      occurrenceCount: 1
    }
  ]);

  sisipkanSebelum_("validasiBindingAktif3B1B2", [
    {
      name: "validasiOptimasiReviewAdmin3C1",
      category: "manualDiagnostics",
      arity: 0,
      sha256: "ce7d18fd6f0ce05d6fb8b451c096b18be54213b59a426b1857a477f3766160e8",
      sourceFile: "OptimasiReviewAdmin3C1.gs",
      sourceLine: 812,
      sourceKind: "declaration",
      occurrenceCount: 1
    },
    {
      name: "validasiOptimasiBuildReviewAdmin3C2",
      category: "manualDiagnostics",
      arity: 0,
      sha256: "0abc4eab79068aa52bbaad284c23a63c6880a948205940e786feddb3bf4d52da",
      sourceFile: "OptimasiBuildReviewAdmin3C2.gs",
      sourceLine: 405,
      sourceKind: "declaration",
      occurrenceCount: 1
    }
  ]);
}
terapkanPatchBindingAktif3B1B2g_();

var PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_ = "4c6670adb92dc8a4d2272c19a3435ea3cd6713cf9c6342181139f97f0e1b6444";

var PORTAL_DUPLICATE_BINDING_TARGETS_3B1B2_ = [{"name":"ambilAuditKoreksiCutoffLama","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":14717,"expectedSourceKind":"reassignment"},{"name":"ambilDaftarPegawaiReviewAdmin","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12942,"expectedSourceKind":"reassignment"},{"name":"ambilDashboardAdminKinerja","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12916,"expectedSourceKind":"reassignment"},{"name":"ambilLaporanAdminPerPegawai","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12955,"expectedSourceKind":"reassignment"},{"name":"ambilRiwayatKuPaged","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18989,"expectedSourceKind":"reassignment"},{"name":"ambilTimelinePublik","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":16466,"expectedSourceKind":"reassignment"},{"name":"ambilTindakLanjutKoreksiCutoffLama","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":15300,"expectedSourceKind":"reassignment"},{"name":"koreksiStatusCutoffLama","occurrenceCount":4,"expectedSourceFile":"Kode.gs","expectedSourceLine":18394,"expectedSourceKind":"reassignment"},{"name":"prosesReviewAdmin","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":18385,"expectedSourceKind":"reassignment"},{"name":"simpanCutoffInputLaporanPeriode","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12342,"expectedSourceKind":"declaration"},{"name":"simpanRevisiLaporanDitolakPegawai","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18375,"expectedSourceKind":"reassignment"},{"name":"terapkanPoinKoreksiCutoffLama","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":18403,"expectedSourceKind":"reassignment"},{"name":"statusDualWriteIndexLaporan2B1","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":19160,"expectedSourceKind":"reassignment"},{"name":"koreksiLaporanLewatCutoffApril2026","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":15651,"expectedSourceKind":"declaration"},{"name":"normalisasiStatusLewatCutoffLama","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18412,"expectedSourceKind":"reassignment"}];

var PORTAL_REASSIGNED_BINDING_TARGETS_3B1B2_ = [{"name":"ambilAuditKoreksiCutoffLama","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":14717,"expectedSourceKind":"reassignment"},{"name":"ambilDaftarPegawaiReviewAdmin","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12942,"expectedSourceKind":"reassignment"},{"name":"ambilDashboardAdminKinerja","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12916,"expectedSourceKind":"reassignment"},{"name":"ambilLaporanAdminPerPegawai","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":12955,"expectedSourceKind":"reassignment"},{"name":"ambilRiwayatKuPaged","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18989,"expectedSourceKind":"reassignment"},{"name":"ambilTimelinePublik","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":16466,"expectedSourceKind":"reassignment"},{"name":"ambilTindakLanjutKoreksiCutoffLama","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":15300,"expectedSourceKind":"reassignment"},{"name":"koreksiStatusCutoffLama","occurrenceCount":4,"expectedSourceFile":"Kode.gs","expectedSourceLine":18394,"expectedSourceKind":"reassignment"},{"name":"prosesReviewAdmin","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":18385,"expectedSourceKind":"reassignment"},{"name":"simpanRevisiLaporanDitolakPegawai","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18375,"expectedSourceKind":"reassignment"},{"name":"terapkanPoinKoreksiCutoffLama","occurrenceCount":3,"expectedSourceFile":"Kode.gs","expectedSourceLine":18403,"expectedSourceKind":"reassignment"},{"name":"statusDualWriteIndexLaporan2B1","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":19160,"expectedSourceKind":"reassignment"},{"name":"normalisasiStatusLewatCutoffLama","occurrenceCount":2,"expectedSourceFile":"Kode.gs","expectedSourceLine":18412,"expectedSourceKind":"reassignment"}];

function normalisasiSumberFungsi3B1B2_(source) {
  return String(source || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function sha256Teks3B1B2_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ""),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}

function resolveBindingFungsi3B1B2_(name) {
  var n = String(name || "").trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) return null;
  try {
    if (typeof globalThis !== "undefined" && globalThis && typeof globalThis[n] === "function") {
      return globalThis[n];
    }
  } catch (e1) {}
  try {
    var fn = (new Function("return (typeof " + n + " === 'function') ? " + n + " : null;"))();
    return typeof fn === "function" ? fn : null;
  } catch (e2) {
    return null;
  }
}

function kontrakAktifSatu3B1B2_(expected) {
  var fn = resolveBindingFungsi3B1B2_(expected.name);
  if (!fn) {
    return {
      name: expected.name, category: expected.category, tersedia: false,
      arityExpected: expected.arity, arityAktif: null,
      hashExpected: expected.sha256, hashAktif: "", match: false,
      reason: "BINDING_NOT_FOUND"
    };
  }
  var src = normalisasiSumberFungsi3B1B2_(Function.prototype.toString.call(fn));
  var hash = sha256Teks3B1B2_(src);
  var arity = Number(fn.length);
  var sameArity = arity === Number(expected.arity);
  var sameHash = hash === String(expected.sha256);
  return {
    name: expected.name, category: expected.category, tersedia: true,
    arityExpected: Number(expected.arity), arityAktif: arity,
    hashExpected: expected.sha256, hashAktif: hash,
    matchArity: sameArity, matchSource: sameHash,
    match: sameArity && sameHash,
    occurrenceCount: Number(expected.occurrenceCount || 1),
    expectedSourceFile: expected.sourceFile || "",
    expectedSourceLine: Number(expected.sourceLine || 0),
    reason: sameArity && sameHash ? "OK" : (!sameArity ? "ARITY_MISMATCH" : "SOURCE_MISMATCH")
  };
}

function bangunSnapshotKontrakAktif3B1B2_() {
  var rows = PORTAL_FUNCTION_CONTRACT_3B1B2_.map(kontrakAktifSatu3B1B2_);
  var checksumPayload = rows.map(function (r) {
    return [r.name, r.category, r.arityAktif == null ? "" : r.arityAktif, r.hashAktif || ""].join("|");
  }).join("\n");
  return { rows: rows, checksumAktif: sha256Teks3B1B2_(checksumPayload) };
}

function validasiBindingAktif3B1B2() {
  var maintainer = pastikanMaintainerPortal3B0_("VALIDASI_BINDING_AKTIF_3B1B2");
  var struktur = validasiStrukturRegistryFungsi3B1B1_();
  var snap = bangunSnapshotKontrakAktif3B1B2_();
  var missing = [], arityMismatch = [], sourceMismatch = [];
  snap.rows.forEach(function (r) {
    if (!r.tersedia) missing.push(r.name);
    else if (!r.matchArity) arityMismatch.push({ name:r.name, expected:r.arityExpected, aktif:r.arityAktif });
    else if (!r.matchSource) sourceMismatch.push({
      name:r.name, expected:r.hashExpected, aktif:r.hashAktif,
      expectedSourceFile:r.expectedSourceFile, expectedSourceLine:r.expectedSourceLine,
      occurrenceCount:r.occurrenceCount
    });
  });
  var valid = !!struktur.valid && !missing.length && !arityMismatch.length && !sourceMismatch.length &&
    snap.checksumAktif === PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_;
  var result = {
    sukses: valid, valid: valid, versi: PORTAL_BINDING_SNAPSHOT_3B1B2_VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "",
    baselineAppVersion: PORTAL_BINDING_BASELINE_APP_VERSION_3B1B2,
    registryVersion: typeof PORTAL_FUNCTION_REGISTRY_3B1B1_VERSION !== "undefined" ? PORTAL_FUNCTION_REGISTRY_3B1B1_VERSION : "",
    maintainerAktif: String(maintainer || ""), registryValid: !!struktur.valid,
    totalKontrak: PORTAL_FUNCTION_CONTRACT_3B1B2_.length, totalBindingAktif: snap.rows.filter(function(r){return r.tersedia;}).length,
    checksumExpected: PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_, checksumAktif: snap.checksumAktif,
    missing: missing, arityMismatch: arityMismatch, sourceMismatch: sourceMismatch,
    targetDuplikatDivalidasi: PORTAL_DUPLICATE_BINDING_TARGETS_3B1B2_,
    targetDipanggil: false, dataDiubah: false, poinDiubah: false, statusReviewDiubah: false, schemaDiubah: false,
    issues: missing.concat(arityMismatch.map(function(x){return x.name;})).concat(sourceMismatch.map(function(x){return x.name;}))
  };
  Logger.log(JSON.stringify({
    sukses:result.sukses, valid:result.valid, versi:result.versi, appVersion:result.appVersion,
    registryValid:result.registryValid, totalKontrak:result.totalKontrak, totalBindingAktif:result.totalBindingAktif,
    checksumCocok:result.checksumExpected===result.checksumAktif, missing:missing, arityMismatch:arityMismatch, sourceMismatch:sourceMismatch,
    targetDuplikatDivalidasi:result.targetDuplikatDivalidasi, targetDipanggil:false, dataDiubah:false, poinDiubah:false, statusReviewDiubah:false, schemaDiubah:false
  }, null, 2));
  return result;
}

function statusBindingAktif3B1B2() {
  var result = validasiBindingAktif3B1B2();
  return {
    sukses: result.sukses, valid: result.valid, versi: result.versi, appVersion: result.appVersion,
    totalKontrak: result.totalKontrak, totalBindingAktif: result.totalBindingAktif,
    checksumCocok: result.checksumExpected === result.checksumAktif,
    jumlahMissing: result.missing.length, jumlahArityMismatch: result.arityMismatch.length, jumlahSourceMismatch: result.sourceMismatch.length,
    targetDuplikatDivalidasi: result.targetDuplikatDivalidasi,
    targetDipanggil:false, dataDiubah:false, poinDiubah:false, statusReviewDiubah:false, schemaDiubah:false
  };
}

function snapshotKontrakFungsi3B1B2() {
  var maintainer = pastikanMaintainerPortal3B0_("SNAPSHOT_KONTRAK_FUNGSI_3B1B2");
  var snap = bangunSnapshotKontrakAktif3B1B2_();
  var result = {
    sukses: true, versi: PORTAL_BINDING_SNAPSHOT_3B1B2_VERSION,
    appVersion: typeof APP_VERSION !== "undefined" ? String(APP_VERSION) : "", maintainerAktif:String(maintainer || ""),
    checksumExpected: PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_, checksumAktif: snap.checksumAktif,
    samaDenganBaseline: snap.checksumAktif === PORTAL_FUNCTION_CONTRACT_CHECKSUM_3B1B2_,
    totalKontrak: snap.rows.length, rows: snap.rows,
    targetDipanggil:false, dataDiubah:false, poinDiubah:false, statusReviewDiubah:false, schemaDiubah:false
  };
  Logger.log(JSON.stringify({
    sukses:true, versi:result.versi, appVersion:result.appVersion, totalKontrak:result.totalKontrak,
    checksumExpected:result.checksumExpected, checksumAktif:result.checksumAktif, samaDenganBaseline:result.samaDenganBaseline,
    targetDipanggil:false, dataDiubah:false, poinDiubah:false, statusReviewDiubah:false, schemaDiubah:false
  }, null, 2));
  return result;
}

function cekKontrakFungsi3B1B2(namaFungsi) {
  var maintainer = pastikanMaintainerPortal3B0_("CEK_KONTRAK_FUNGSI_3B1B2");
  var name = String(namaFungsi || "").trim();
  var expected = null;
  for (var i=0;i<PORTAL_FUNCTION_CONTRACT_3B1B2_.length;i++) {
    if (PORTAL_FUNCTION_CONTRACT_3B1B2_[i].name === name) { expected = PORTAL_FUNCTION_CONTRACT_3B1B2_[i]; break; }
  }
  var result = expected ? kontrakAktifSatu3B1B2_(expected) : { name:name, tersedia:false, match:false, reason:"NOT_IN_CONTRACT" };
  result.maintainerAktif = String(maintainer || "");
  result.targetDipanggil = false; result.dataDiubah=false; result.poinDiubah=false; result.statusReviewDiubah=false; result.schemaDiubah=false;
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ===== END TAHAP 3B-1B BATCH 2d =====
