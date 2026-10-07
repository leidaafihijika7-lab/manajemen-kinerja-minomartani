// ============================================================================
// AUDIT & COMPLIANCE EXPLORER v1.0 - BATCH A
// Compliance Domain Registry v1.0
// Pure registry: no SpreadsheetApp/DriveApp/PropertiesService/trigger/cache I/O.
// Target Portal APP_VERSION: 2026.10.05.01
// ============================================================================

var AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_A_VERSION_ = 'ACE-v1.0-BATCH-A-RC1-2026.10.07.01';
var ACE_COMPLIANCE_DOMAIN_REGISTRY_V10_VERSION_ = 'ACE-CDR-v1.0-2026.10.07.01';
var ACE_V10_ARCHITECTURE_VERSION_ = 'ACE-v1.0-ARCH-2026.10.07.01';
var ACE_V10_TARGET_APP_VERSION_ = '2026.10.05.01';
var ACE_V10_BASELINE_GIT_SHA_ = '7df97d9644f048eaf8bfbf3b56b661d9e7090b8b';

var ACE_V10_DOMAIN_CONTROL_PREFIX_ = {
  AUTH_ACCESS:'AUT', REPORTING:'RPT', REVIEW:'REV', DISPOSISI:'DSP',
  PERIOD_CLOSING:'CLS', ALLOWANCE:'TUN', MONTHLY_ARCHIVE:'ARC',
  INDEX_INTEGRITY:'IDX', REMINDER_ESCALATION:'WRE', EXCEPTION_ACTION:'EAC',
  SYSTEM_HEALTH:'SYS', BACKUP_RECOVERY:'BDR', AI_GOVERNANCE:'AI', MAINTENANCE:'MNT'
};

var ACE_V10_ENTITY_TYPES_ = [
  'USER','REPORT','DISPOSITION','PERIOD','ALLOWANCE_BATCH','ARCHIVE','INDEX_RECORD',
  'INDEX_QUEUE_ITEM','RECOVERY_POINT','RECOVERY_CANDIDATE','DR_DRILL','MAINTENANCE_ACTION',
  'AI_RUN','EXTERNAL_FILE'
];

var ACE_V10_RULE_TYPES_ = [
  'DETERMINISTIC','STRUCTURAL','EVIDENCE','PROVENANCE','TIMELINESS',
  'HISTORICAL_HONESTY','CROSS_DOMAIN','WORKFLOW','IMMUTABILITY','INTEGRITY',
  'RECOVERY','PRIVACY','AUTHORIZATION'
];

var ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_ = {"registryVersion":"ACE-CDR-v1.0-2026.10.07.01","architectureVersion":"ACE-v1.0-ARCH-2026.10.07.01","targetAppVersion":"2026.10.05.01","stableSourceGitSha":"7df97d9644f048eaf8bfbf3b56b661d9e7090b8b","mode":"READ_ONLY","accessRoles":["LURAH","CARIK"],"resultEnum":["PASS","WARN","FAIL","UNKNOWN","NOT_APPLICABLE"],"severityEnum":["INFO","LOW","MEDIUM","HIGH","CRITICAL"],"evidenceIntegrityEnum":["VERIFIED","PARTIAL","MISSING","UNAVAILABLE"],"evidenceClasses":{"E1":"AUTHORITATIVE_EVENT","E2":"AUTHORITATIVE_STATE","E3":"SNAPSHOT_EVIDENCE","E4":"DERIVED_SIGNAL","E5":"EXTERNAL_EVIDENCE","E6":"LEGACY_RECONSTRUCTED"},"domains":[{"domainId":"AUTH_ACCESS","label":"Akses & Otorisasi","authority":["Audit_Log","Data_Pegawai","FunctionRegistry","maintainer gate"],"entities":["USER","MAINTENANCE_ACTION"],"sourceModules":["Kode.gs","FunctionRegistry.gs","GuardKontrakPraDeploy3B1B3.gs"],"controls":[{"controlId":"ACE-AUT-001","title":"Endpoint terlindungi memerlukan session valid","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E1","E2"]},{"controlId":"ACE-AUT-002","title":"Akses modul sensitif sesuai role","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-AUT-003","title":"Operasi maintenance hanya melalui maintainer gate","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E1"]},{"controlId":"ACE-AUT-004","title":"Secret tidak diekspos sebagai nilai audit","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E3"]}]},{"domainId":"REPORTING","label":"Pelaporan Kinerja","authority":["Rekap_Kinerja","Index_Laporan","Audit_Log"],"entities":["REPORT","USER","EXTERNAL_FILE"],"sourceModules":["Kode.gs","SheetSchema.gs"],"controls":[{"controlId":"ACE-RPT-001","title":"ID_LAPORAN unik dan tidak kosong","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-RPT-002","title":"ID_USER laporan dapat direkonsiliasi ke pegawai","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-RPT-003","title":"Periode resmi laporan konsisten dengan index/periode workflow","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-RPT-004","title":"Revisi memiliki lineage yang dapat ditelusuri","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E2","E1"]},{"controlId":"ACE-RPT-005","title":"Evidence visual/dokumen memiliki reference yang dapat ditelusuri bila diwajibkan","ruleType":"EVIDENCE","severityOnFail":"MEDIUM","evidenceRequired":["E2","E5"]},{"controlId":"ACE-RPT-006","title":"Legacy reconstructed report ditandai provenance-nya","ruleType":"PROVENANCE","severityOnFail":"MEDIUM","evidenceRequired":["E6"]}]},{"domainId":"REVIEW","label":"Review Laporan","authority":["Rekap_Kinerja","Index_Laporan","Audit_Log","WRE"],"entities":["REPORT","USER","PERIOD"],"sourceModules":["ReviewCenterAdminV10.gs","WorkflowReminderEscalationV10.gs"],"controls":[{"controlId":"ACE-REV-001","title":"Status review Rekap dan Index konsisten","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-REV-002","title":"Keputusan review memiliki waktu review/jejak actor yang tersedia","ruleType":"EVIDENCE","severityOnFail":"MEDIUM","evidenceRequired":["E1","E2"]},{"controlId":"ACE-REV-003","title":"Poin final konsisten dengan status review","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-REV-004","title":"Backlog review dipantau sesuai threshold WRE","ruleType":"TIMELINESS","severityOnFail":"MEDIUM","evidenceRequired":["E4"]},{"controlId":"ACE-REV-005","title":"Riwayat pengembalian/revisi tidak diberi umur palsu bila timestamp tidak tersedia","ruleType":"HISTORICAL_HONESTY","severityOnFail":"HIGH","evidenceRequired":["E1","E2"]}]},{"domainId":"DISPOSISI","label":"Disposisi","authority":["Disposisi_Surat","Disposisi_Penerima","Disposisi_Log","Disposisi_Petugas"],"entities":["DISPOSITION","USER","REPORT","EXTERNAL_FILE"],"sourceModules":["Kode.gs","SheetSchema.gs"],"controls":[{"controlId":"ACE-DSP-001","title":"Penerbitan disposisi memiliki actor dan mode input yang jelas","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E1","E2"]},{"controlId":"ACE-DSP-002","title":"Penerima disposisi dapat direkonsiliasi ke disposisi induk","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-DSP-003","title":"Operator atas nama pimpinan tercatat eksplisit","ruleType":"PROVENANCE","severityOnFail":"HIGH","evidenceRequired":["E1","E2"]},{"controlId":"ACE-DSP-004","title":"Laporan yang berasal dari disposisi memiliki linkage dua arah yang dapat ditelusuri","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E1","E2"]},{"controlId":"ACE-DSP-005","title":"Lampiran disposisi memiliki reference evidence bila ada","ruleType":"EVIDENCE","severityOnFail":"LOW","evidenceRequired":["E5"]}]},{"domainId":"PERIOD_CLOSING","label":"Periode & Penutupan Bulan","authority":["MonthlyClosingV10","Rekap_Kinerja","Rekap_Tunjangan_Bulanan"],"entities":["PERIOD","REPORT","ALLOWANCE_BATCH"],"sourceModules":["MonthlyClosingV10.gs"],"controls":[{"controlId":"ACE-CLS-001","title":"Periode hanya ditutup setelah prasyarat review terpenuhi","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-CLS-002","title":"Konfigurasi cutoff/periode valid","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2","E4"]},{"controlId":"ACE-CLS-003","title":"Status closing selaras dengan workflow tunjangan berikutnya","ruleType":"CROSS_DOMAIN","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-CLS-004","title":"Keterlambatan closing dipantau WRE tanpa mengubah state bisnis","ruleType":"TIMELINESS","severityOnFail":"MEDIUM","evidenceRequired":["E4"]}]},{"domainId":"ALLOWANCE","label":"Tunjangan Kinerja","authority":["Rekap_Tunjangan_Bulanan","Audit_Tunjangan","Master_Tunjangan"],"entities":["ALLOWANCE_BATCH","USER","PERIOD"],"sourceModules":["Kode.gs","TunjanganWorkflowDateBackfillV10.gs","KoreksiAdministratifTanggalPembayaranV10.gs"],"controls":[{"controlId":"ACE-TUN-001","title":"Satu batch aktif bisnis yang konsisten per periode","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-TUN-002","title":"Batch ID dan status seragam dalam satu batch","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-TUN-003","title":"Tidak ada pegawai duplikat dalam batch aktif","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-TUN-004","title":"Aritmetika nominal batch valid","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-TUN-005","title":"Transition workflow memiliki urutan status yang sah","ruleType":"WORKFLOW","severityOnFail":"HIGH","evidenceRequired":["E1","E2"]},{"controlId":"ACE-TUN-006","title":"Tanggal workflow menggunakan kejadian aktual dan backfill historis beralasan","ruleType":"PROVENANCE","severityOnFail":"HIGH","evidenceRequired":["E1","E2"]},{"controlId":"ACE-TUN-007","title":"Koreksi administratif mempertahankan nominal/status/penerima","ruleType":"IMMUTABILITY","severityOnFail":"CRITICAL","evidenceRequired":["E1","E2"]}]},{"domainId":"MONTHLY_ARCHIVE","label":"Arsip Bulanan","authority":["MonthlyArchive descriptor","manifest","checksum","archive files"],"entities":["ARCHIVE","PERIOD","EXTERNAL_FILE"],"sourceModules":["MonthlyArchiveV10.gs"],"controls":[{"controlId":"ACE-ARC-001","title":"Arsip final hanya dibuat ketika prasyarat workflow terpenuhi","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2","E3"]},{"controlId":"ACE-ARC-002","title":"Archive ID/period/batch ID konsisten","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E3"]},{"controlId":"ACE-ARC-003","title":"Manifest/checksum tersedia dan sesuai","ruleType":"INTEGRITY","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-ARC-004","title":"Integrity status arsip terverifikasi","ruleType":"INTEGRITY","severityOnFail":"HIGH","evidenceRequired":["E3"]},{"controlId":"ACE-ARC-005","title":"Gap histori kegagalan verifikasi yang tidak dipersistenkan ditandai UNKNOWN","ruleType":"HISTORICAL_HONESTY","severityOnFail":"MEDIUM","evidenceRequired":["E3"]}]},{"domainId":"INDEX_INTEGRITY","label":"Index & Integritas Laporan","authority":["Rekap_Kinerja","Index_Laporan","Index_Laporan_Sync_Queue","Audit_Index_Laporan"],"entities":["REPORT","INDEX_RECORD","INDEX_QUEUE_ITEM"],"sourceModules":["AuditPeriode.gs","MaintenanceOHICV101.gs","Kode.gs"],"controls":[{"controlId":"ACE-IDX-001","title":"Index memiliki mapping satu-ke-satu dengan laporan sumber","ruleType":"DETERMINISTIC","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-IDX-002","title":"Field kritis source/index konsisten","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-IDX-003","title":"Queue stale dibedakan dari queue yang benar-benar memerlukan sinkronisasi","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E2","E4"]},{"controlId":"ACE-IDX-004","title":"Audit_Index_Laporan diperlakukan sebagai snapshot, bukan ledger historis","ruleType":"PROVENANCE","severityOnFail":"MEDIUM","evidenceRequired":["E3"]}]},{"domainId":"REMINDER_ESCALATION","label":"Reminder & Eskalasi Workflow","authority":["WRE rules","Audit_Log WRE events","trigger state"],"entities":["PERIOD","REPORT","ALLOWANCE_BATCH","ARCHIVE"],"sourceModules":["WorkflowReminderEscalationV10.gs"],"controls":[{"controlId":"ACE-WRE-001","title":"Rule threshold menghasilkan severity yang deterministik","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E4"]},{"controlId":"ACE-WRE-002","title":"Recipient escalation sesuai rule dan role","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E4"]},{"controlId":"ACE-WRE-003","title":"Reminder audit mengikuti anti-spam cooldown","ruleType":"TIMELINESS","severityOnFail":"MEDIUM","evidenceRequired":["E1","E4"]},{"controlId":"ACE-WRE-004","title":"WRE tidak mengubah state bisnis","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E4"]}]},{"domainId":"EXCEPTION_ACTION","label":"Perlu Tindakan / EAC","authority":["EAC registry","source modules referenced by EAC"],"entities":["REPORT","PERIOD","ALLOWANCE_BATCH","ARCHIVE","RECOVERY_POINT"],"sourceModules":["ExceptionActionCenterV10.gs"],"controls":[{"controlId":"ACE-EAC-001","title":"Action code berasal dari registry yang dikenal","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E4"]},{"controlId":"ACE-EAC-002","title":"Priority derived dari business rule/WRE secara konsisten","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E4"]},{"controlId":"ACE-EAC-003","title":"EAC tidak menyimpan status selesai sendiri","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E4"]},{"controlId":"ACE-EAC-004","title":"Action mengarah ke modul sumber resmi","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E4"]}]},{"domainId":"SYSTEM_HEALTH","label":"Kesehatan & Integritas Sistem","authority":["OHIC","Function Registry","Binding","required sheets","source state"],"entities":["PERIOD","REPORT","INDEX_RECORD","ALLOWANCE_BATCH"],"sourceModules":["OperationalHealthV10.gs","MaintenanceOHICV101.gs","FunctionRegistry.gs","BindingAktif3B1B2.gs"],"controls":[{"controlId":"ACE-SYS-001","title":"Required core sheets tersedia","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-SYS-002","title":"Function contract/binding valid","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-SYS-003","title":"Employee identity integrity valid","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-SYS-004","title":"Master tunjangan valid","ruleType":"DETERMINISTIC","severityOnFail":"HIGH","evidenceRequired":["E2"]},{"controlId":"ACE-SYS-005","title":"Residual metadata dibedakan dari business data","ruleType":"DETERMINISTIC","severityOnFail":"MEDIUM","evidenceRequired":["E2","E4"]}]},{"domainId":"BACKUP_RECOVERY","label":"Backup & Disaster Recovery","authority":["BDR recovery point","BDR trigger state","stable Git SHA","DR drill record","evidence inventory"],"entities":["RECOVERY_POINT","RECOVERY_CANDIDATE","DR_DRILL","EXTERNAL_FILE"],"sourceModules":["BackupDisasterRecoveryV10.gs"],"controls":[{"controlId":"ACE-BDR-001","title":"RPO berada dalam target kebijakan","ruleType":"TIMELINESS","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-BDR-002","title":"Recovery point terakhir VERIFIED dan source stabil","ruleType":"INTEGRITY","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-BDR-003","title":"Tepat satu trigger backup otomatis aktif","ruleType":"STRUCTURAL","severityOnFail":"HIGH","evidenceRequired":["E3"]},{"controlId":"ACE-BDR-004","title":"Stable Git SHA dikonfigurasi valid","ruleType":"PROVENANCE","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-BDR-005","title":"DR Drill terbaru PASSED tanpa perubahan production pointer","ruleType":"RECOVERY","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-BDR-006","title":"Evidence inventory membedakan PARTIAL dari MISSING","ruleType":"EVIDENCE","severityOnFail":"HIGH","evidenceRequired":["E3","E5"]}]},{"domainId":"AI_GOVERNANCE","label":"AI & Provenance","authority":["AI_Logs","Rekap_Kinerja","Rekap_Bulanan"],"entities":["AI_RUN","REPORT","USER"],"sourceModules":["Kode.gs"],"controls":[{"controlId":"ACE-AI-001","title":"AI run dapat ditelusuri ke report/entity bila relevan","ruleType":"PROVENANCE","severityOnFail":"MEDIUM","evidenceRequired":["E2"]},{"controlId":"ACE-AI-002","title":"Model/status AI tercatat untuk run yang dipersistenkan","ruleType":"PROVENANCE","severityOnFail":"LOW","evidenceRequired":["E2"]},{"controlId":"ACE-AI-003","title":"AI tidak menjadi authority keputusan review final","ruleType":"STRUCTURAL","severityOnFail":"CRITICAL","evidenceRequired":["E2"]},{"controlId":"ACE-AI-004","title":"Konten prompt/response mengikuti redaction policy ACE","ruleType":"PRIVACY","severityOnFail":"HIGH","evidenceRequired":["E2"]}]},{"domainId":"MAINTENANCE","label":"Maintenance & Perubahan Terkendali","authority":["maintainer gate","maintenance audit","pre-maintenance backup","persistent snapshot"],"entities":["MAINTENANCE_ACTION","RECOVERY_POINT","PERIOD","ALLOWANCE_BATCH","INDEX_QUEUE_ITEM"],"sourceModules":["MaintenanceOHICV101.gs","BackupDisasterRecoveryV10.gs","maintenance helpers"],"controls":[{"controlId":"ACE-MNT-001","title":"Maintenance destructive hanya dapat dijalankan maintainer","ruleType":"AUTHORIZATION","severityOnFail":"CRITICAL","evidenceRequired":["E1"]},{"controlId":"ACE-MNT-002","title":"Operasi berisiko memiliki backup/snapshot sebelum perubahan bila diwajibkan","ruleType":"RECOVERY","severityOnFail":"CRITICAL","evidenceRequired":["E3"]},{"controlId":"ACE-MNT-003","title":"Dry-run/guard mendahului apply untuk workflow maintenance yang mendukungnya","ruleType":"WORKFLOW","severityOnFail":"HIGH","evidenceRequired":["E1","E3"]},{"controlId":"ACE-MNT-004","title":"Hasil maintenance dicatat SUCCESS/FAILED/BLOCKED secara dapat ditelusuri","ruleType":"PROVENANCE","severityOnFail":"HIGH","evidenceRequired":["E1"]},{"controlId":"ACE-MNT-005","title":"Rollback evidence tersedia untuk operasi yang mendukung rollback","ruleType":"RECOVERY","severityOnFail":"HIGH","evidenceRequired":["E3"]}]}],"knownLimitations":["Audit_Log historis tidak selalu memiliki entity ID terstruktur.","Audit_Index_Laporan adalah snapshot audit, bukan append-only event ledger.","Sebagian kegagalan verifikasi Monthly Archive belum dipersistenkan sebagai event historis.","Timestamp status Dikembalikan Lurah belum selalu tersedia untuk age calculation yang dapat dipertanggungjawabkan.","BDR evidence inventory dapat sah berstatus PARTIAL karena metadata budget per run.","Legacy backfill/reconstruction harus menghasilkan confidence lebih rendah daripada native structured events."]};

function aceV10DeepFreeze_(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(function (k) { aceV10DeepFreeze_(value[k]); });
  try { Object.freeze(value); } catch (e) { }
  return value;
}

(function aceV10FreezeRegistry_() {
  aceV10DeepFreeze_(ACE_V10_DOMAIN_CONTROL_PREFIX_);
  aceV10DeepFreeze_(ACE_V10_ENTITY_TYPES_);
  aceV10DeepFreeze_(ACE_V10_RULE_TYPES_);
  aceV10DeepFreeze_(ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_);
})();

var ACE_V10_REGISTRY_INDEX_CACHE_ = null;

function aceV10Registry_() {
  return ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_;
}

function aceV10RegistrySnapshot_() {
  return JSON.parse(JSON.stringify(ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_));
}

function aceV10BuildRegistryIndex_() {
  if (ACE_V10_REGISTRY_INDEX_CACHE_) return ACE_V10_REGISTRY_INDEX_CACHE_;
  var domains = Object.create(null), controls = Object.create(null), controlToDomain = Object.create(null);
  (ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_.domains || []).forEach(function (domain) {
    domains[String(domain.domainId || '')] = domain;
    (domain.controls || []).forEach(function (control) {
      var id = String(control.controlId || '');
      controls[id] = control;
      controlToDomain[id] = String(domain.domainId || '');
    });
  });
  ACE_V10_REGISTRY_INDEX_CACHE_ = { domains:domains, controls:controls, controlToDomain:controlToDomain };
  return ACE_V10_REGISTRY_INDEX_CACHE_;
}

function aceV10Domain_(domainId) {
  return aceV10BuildRegistryIndex_().domains[String(domainId || '').trim().toUpperCase()] || null;
}

function aceV10Control_(controlId) {
  return aceV10BuildRegistryIndex_().controls[String(controlId || '').trim().toUpperCase()] || null;
}

function aceV10ControlDomainId_(controlId) {
  return aceV10BuildRegistryIndex_().controlToDomain[String(controlId || '').trim().toUpperCase()] || '';
}

function aceV10ControlsForDomain_(domainId) {
  var d = aceV10Domain_(domainId);
  return d ? (d.controls || []).slice() : [];
}

function aceV10RegistrySummary_() {
  var r = ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_;
  var domains = r.domains || [], controls = 0, byRule = {}, bySeverity = {}, byEvidence = {};
  domains.forEach(function (d) {
    (d.controls || []).forEach(function (c) {
      controls++;
      var rule = String(c.ruleType || ''); byRule[rule] = (byRule[rule] || 0) + 1;
      var sev = String(c.severityOnFail || ''); bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      (c.evidenceRequired || []).forEach(function (e) { byEvidence[e] = (byEvidence[e] || 0) + 1; });
    });
  });
  return {
    registryVersion:String(r.registryVersion || ''), architectureVersion:String(r.architectureVersion || ''),
    targetAppVersion:String(r.targetAppVersion || ''), stableSourceGitSha:String(r.stableSourceGitSha || ''),
    mode:String(r.mode || ''), domainCount:domains.length, controlCount:controls,
    byRuleType:byRule, bySeverity:bySeverity, byEvidenceClass:byEvidence
  };
}

function aceV10RegistryCheck_(checks, name, ok, detail) {
  checks.push({ nama:String(name || ''), lulus:ok === true, detail:String(detail == null ? '' : detail) });
}

function aceV10ValidateRegistryObject_(registry) {
  var checks = [], r = registry || {}, domains = Array.isArray(r.domains) ? r.domains : [];
  var allowedResults = ['PASS','WARN','FAIL','UNKNOWN','NOT_APPLICABLE'];
  var allowedSeverity = ['INFO','LOW','MEDIUM','HIGH','CRITICAL'];
  var allowedIntegrity = ['VERIFIED','PARTIAL','MISSING','UNAVAILABLE'];
  var allowedEvidence = ['E1','E2','E3','E4','E5','E6'];
  var domainIds = Object.create(null), controlIds = Object.create(null), totalControls = 0;

  aceV10RegistryCheck_(checks,'REGISTRY_VERSION',String(r.registryVersion || '') === ACE_COMPLIANCE_DOMAIN_REGISTRY_V10_VERSION_,String(r.registryVersion || ''));
  aceV10RegistryCheck_(checks,'ARCHITECTURE_VERSION',String(r.architectureVersion || '') === ACE_V10_ARCHITECTURE_VERSION_,String(r.architectureVersion || ''));
  aceV10RegistryCheck_(checks,'TARGET_APP_VERSION',String(r.targetAppVersion || '') === ACE_V10_TARGET_APP_VERSION_,String(r.targetAppVersion || ''));
  aceV10RegistryCheck_(checks,'BASELINE_GIT_SHA',String(r.stableSourceGitSha || '') === ACE_V10_BASELINE_GIT_SHA_,String(r.stableSourceGitSha || ''));
  aceV10RegistryCheck_(checks,'READ_ONLY_MODE',String(r.mode || '') === 'READ_ONLY',String(r.mode || ''));
  aceV10RegistryCheck_(checks,'ACCESS_ROLE_LURAH',(r.accessRoles || []).indexOf('LURAH') !== -1,(r.accessRoles || []).join(','));
  aceV10RegistryCheck_(checks,'ACCESS_ROLE_CARIK',(r.accessRoles || []).indexOf('CARIK') !== -1,(r.accessRoles || []).join(','));
  aceV10RegistryCheck_(checks,'ACCESS_ROLE_ONLY_TWO',(r.accessRoles || []).length === 2,(r.accessRoles || []).join(','));
  aceV10RegistryCheck_(checks,'RESULT_ENUM',JSON.stringify(r.resultEnum || []) === JSON.stringify(allowedResults),(r.resultEnum || []).join(','));
  aceV10RegistryCheck_(checks,'SEVERITY_ENUM',JSON.stringify(r.severityEnum || []) === JSON.stringify(allowedSeverity),(r.severityEnum || []).join(','));
  aceV10RegistryCheck_(checks,'INTEGRITY_ENUM',JSON.stringify(r.evidenceIntegrityEnum || []) === JSON.stringify(allowedIntegrity),(r.evidenceIntegrityEnum || []).join(','));
  aceV10RegistryCheck_(checks,'EVIDENCE_CLASS_COUNT',Object.keys(r.evidenceClasses || {}).length === 6,Object.keys(r.evidenceClasses || {}).join(','));
  allowedEvidence.forEach(function (e) { aceV10RegistryCheck_(checks,'EVIDENCE_CLASS_'+e,!!(r.evidenceClasses || {})[e],String((r.evidenceClasses || {})[e] || '')); });
  aceV10RegistryCheck_(checks,'DOMAIN_COUNT_14',domains.length === 14,String(domains.length));

  domains.forEach(function (d, domainIndex) {
    var id = String(d.domainId || ''), prefix = ACE_V10_DOMAIN_CONTROL_PREFIX_[id] || '';
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_ID',!!id,'index='+domainIndex);
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_UNIQUE',!!id && !domainIds[id],id);
    domainIds[id] = true;
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_PREFIX',!!prefix,prefix);
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_LABEL',!!String(d.label || '').trim(),String(d.label || ''));
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_AUTHORITY',Array.isArray(d.authority) && d.authority.length > 0,String((d.authority || []).length));
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_ENTITIES',Array.isArray(d.entities) && d.entities.length > 0,String((d.entities || []).length));
    (d.entities || []).forEach(function (entity) {
      aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_ENTITY_'+entity,ACE_V10_ENTITY_TYPES_.indexOf(entity) !== -1,entity);
    });
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_MODULES',Array.isArray(d.sourceModules) && d.sourceModules.length > 0,String((d.sourceModules || []).length));
    aceV10RegistryCheck_(checks,'DOMAIN_'+id+'_CONTROLS',Array.isArray(d.controls) && d.controls.length > 0,String((d.controls || []).length));
    (d.controls || []).forEach(function (c) {
      totalControls++;
      var cid = String(c.controlId || ''), rule = String(c.ruleType || ''), sev = String(c.severityOnFail || '');
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_ID',/^ACE-[A-Z]{2,3}-\d{3}$/.test(cid),cid);
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_DOMAIN_PREFIX',!!prefix && cid.indexOf('ACE-'+prefix+'-') === 0,id+'>'+prefix);
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_UNIQUE',!!cid && !controlIds[cid],cid);
      controlIds[cid] = true;
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_TITLE',!!String(c.title || '').trim(),String(c.title || ''));
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_RULE',ACE_V10_RULE_TYPES_.indexOf(rule) !== -1,rule);
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_SEVERITY',allowedSeverity.indexOf(sev) !== -1,sev);
      aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_EVIDENCE_REQUIRED',Array.isArray(c.evidenceRequired) && c.evidenceRequired.length > 0,(c.evidenceRequired || []).join(','));
      (c.evidenceRequired || []).forEach(function (e) {
        aceV10RegistryCheck_(checks,'CONTROL_'+cid+'_EVIDENCE_'+e,allowedEvidence.indexOf(e) !== -1,e);
      });
    });
  });

  aceV10RegistryCheck_(checks,'CONTROL_COUNT_68',totalControls === 68,String(totalControls));
  aceV10RegistryCheck_(checks,'DOMAIN_ID_COUNT_14',Object.keys(domainIds).length === 14,String(Object.keys(domainIds).length));
  aceV10RegistryCheck_(checks,'CONTROL_ID_COUNT_68',Object.keys(controlIds).length === 68,String(Object.keys(controlIds).length));
  aceV10RegistryCheck_(checks,'KNOWN_LIMITATIONS_PRESENT',Array.isArray(r.knownLimitations) && r.knownLimitations.length > 0,String((r.knownLimitations || []).length));

  var failed = checks.filter(function (x) { return x.lulus !== true; });
  return {
    sukses:failed.length === 0, valid:failed.length === 0,
    versi:ACE_COMPLIANCE_DOMAIN_REGISTRY_V10_VERSION_, batchVersion:AUDIT_COMPLIANCE_EXPLORER_V10_BATCH_A_VERSION_,
    jumlah:checks.length, lulus:checks.length-failed.length, gagal:failed.length,
    summary:aceV10RegistrySummary_(), checks:checks
  };
}

function validasiComplianceDomainRegistryV10() {
  var out = aceV10ValidateRegistryObject_(ACE_V10_COMPLIANCE_DOMAIN_REGISTRY_);
  try { Logger.log(JSON.stringify(out, null, 2)); } catch (e) { }
  return out;
}
