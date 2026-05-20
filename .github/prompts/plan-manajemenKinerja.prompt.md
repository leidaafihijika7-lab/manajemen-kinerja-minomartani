# Code Refactoring Plan: Manajemen Kinerja Minomartani

## Project Overview
- **Type**: Google Apps Script + Web App (PWA)
- **Total Lines**: ~5000+ (Kode.js ~2000 + Index.html ~2800)
- **Main Issues**: Code duplication, hardcoded magic numbers, poor separation of concerns, accessibility gaps

---

## PART 1: BACKEND (Kode.js) - Refactoring Plan

### 1.1 [SELESAI] Extract Magic Numbers to Constants

**Current State**:
```javascript
CacheService.getScriptCache().put(token, idUser, 21600);  // What is 21600?
if (jumlahGagal >= 5) { ... }  // Why 5?
var DEFAULT_TUNJANGAN_CUTOFF_DAY = 25;
```

**Goal**: Define all magic numbers in a single CONFIG object at top of file

**New Structure**:
```javascript
const CONFIG = {
  CACHE: {
    SESSION_TIMEOUT_SECONDS: 21600,  // 6 hours
    SCRIPT_CACHE_TTL: 1800,          // 30 minutes
    LOGIN_FAILURE_TTL: 600           // 10 minutes
  },
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    PASSWORD_HASH_ALGO: 'SHA_256'
  },
  TUNJANGAN: {
    DEFAULT_CUTOFF_DAY: 25,
    MIN_CUTOFF_DAY: 1,
    MAX_CUTOFF_DAY: 30
  },
  FILE_LIMITS: {
    MAX_FILE_B64: 4500000,
    MAX_PDF_B64: Math.ceil((3 * 1024 * 1024) * 4 / 3) + 2048,
    MAX_TOTAL_B64: 12000000
  }
};
```

**Files to Change**: `Kode.js` (lines 1-50)
**Effort**: 1-2 hours
**Impact**: High - easier to configure, single source of truth

---

### 1.2 [SELESAI] Create Sheet Column Index Constants

**Current State**:
```javascript
data[i][0]   // Unknown - tanggal? ID?
data[i][19]  // Unknown - id user?
row[30]      // Unknown?
```

**Goal**: Define column positions as named constants to avoid hardcoded indices

**New File**: Create `SheetSchema.gs`
```javascript
const SHEET_COLUMNS = {
  DATA_PEGAWAI: {
    ID: 0,
    USERNAME: 1,
    NAMA: 2,
    JABATAN: 3,
    PIN_HASH: 4,
    AKSES: 5
  },
  REKAP_KINERJA: {
    TANGGAL_LAPORAN: 0,
    NAMA: 1,
    JABATAN: 2,
    KATEGORI: 3,
    DESKRIPSI: 4,
    // ... continue for all 20 columns
  },
  REKAP_TUNJANGAN_BULANAN: {
    PERIODE: 0,
    ID_USER: 1,
    NAMA: 2,
    JABATAN: 3,
    KELOMPOK: 4,
    JUMLAH_LAPORAN_DISETUJUI: 5,
    // ... continue for all 34 columns
  }
};
```

**Usage**:
```javascript
// Before:
var rowId = data[i][19].toString().trim();

// After:
var rowId = data[i][SHEET_COLUMNS.REKAP_KINERJA.ID_USER].toString().trim();
```

**Files to Change**: Create new file + update all references
**Effort**: 2-3 hours (tedious but straightforward)
**Impact**: High - eliminates magic numbers, improves readability

---

### 1.3 [SELESAI] De-Duplicate Jabatan Checking Functions

**Current State**: 5 similar functions checking jabatan string
```javascript
function isCarik_(jabatan) { ... }  // indexOf("carik")
function isLurah_(jabatan) { ... }  // indexOf("lurah")
function isBendaharaDanarta_(jabatan) { ... }  // indexOf("danarta")
// Plus logic repeated in getTunjanganPegawai_(), identifikasiKelompok_(), etc
```

**Goal**: Create single jabatan role checker with factory pattern

**New Structure**:
```javascript
const JABATAN_ROLES = {
  CARIK: { keywords: ['carik', 'sekretaris'], group: 'Carik & Kasi' },
  LURAH: { keywords: ['lurah'], group: 'Lurah' },
  KAUR: { keywords: ['kaur', 'kepala urusan'], group: 'Kaur' },
  DUKUH: { keywords: ['dukuh'], group: 'Dukuh' },
  STAF: { keywords: ['staf'], group: 'Staf' },
  PHL: { keywords: ['phl', 'lepas'], group: 'PHL' }
};

function getJabatanRole_(jabatan) {
  var normalized = normalizeJabatan_(jabatan);
  for (var roleKey in JABATAN_ROLES) {
    var role = JABATAN_ROLES[roleKey];
    for (var i = 0; i < role.keywords.length; i++) {
      if (normalized.indexOf(role.keywords[i]) !== -1) {
        return roleKey;
      }
    }
  }
  return null;
}

// Usage instead of isCarik_():
function isCarik_(jabatan) {
  return getJabatanRole_(jabatan) === 'CARIK';
}
```

**Consolidate Into**:
- `getTunjanganPegawai_()` - use factory
- `identifikasiKelompok_()` - use factory
- `hitungHakPasal33UntukBulanHak_()` - use factory
- `cekHakAksesCarikTunjangan()` - use factory

**Files to Change**: `Kode.js` (lines 600-900)
**Effort**: 2 hours
**Impact**: Medium - reduces duplication, easier to add new roles

---

### 1.4 [SELESAI] Refactor `getMasterTunjanganMap_()` Performance

**Current Issue**: Nested loops = O(n²) complexity
```javascript
for (var key in master.byJabatan) {  // O(n)
  if (jabKey.indexOf(key) !== -1) {  // Substring search
    return master.byJabatan[key];    // Can return wrong match
  }
}
```

**Solution**: Build reverse keyword map during initialization
```javascript
var JABATAN_ALIASES = {
  "carik": { obj, priority: 1 },
  "sekretaris": { obj, priority: 1 },
  "kepala urusan danarta": { obj, priority: 2 },
  "danarta": { obj, priority: 3 },  // Lower priority
};

// Lookup becomes O(1):
var alias = JABATAN_ALIASES[jabKey];
if (alias) return alias.obj;
```

**Files to Change**: `Kode.js` lines 800-950
**Effort**: 1.5 hours
**Impact**: High - critical performance improvement

---

### 1.5 [SELESAI] Consolidate Error Handling Pattern

**Current State**: Inconsistent error responses
```javascript
catch(e) { Logger.log("..."); }  // Silent fail
catch(e) { return { sukses: false, pesan: e.message }; }  // Sometimes
catch(e) { throw new Error("..."); }  // Inconsistent
```

**Goal**: Create error handling utility
```javascript
function handleError(functionName, error, defaultReturn) {
  var msg = error && error.message ? error.message : String(error);
  Logger.log("ERROR in " + functionName + ": " + msg);
  
  if (typeof defaultReturn === "undefined") {
    defaultReturn = { sukses: false, pesan: msg };
  }
  
  logAudit("SYSTEM", "ERROR_" + functionName, msg);
  return defaultReturn;
}

// Usage:
try {
  // ... logic
} catch(e) {
  return handleError("simpanDataKinerja", e);
}
```

**Files to Change**: `Kode.js` (add utility section)
**Effort**: 1 hour
**Impact**: Medium - better debugging, consistent error response

---

### 1.6 [SELESAI] Extract Pasal 33 Logic to Separate Module

**Current Issue**: `evaluasiPasal33Hak_()` is 120+ lines of nested conditionals
```javascript
function evaluasiPasal33Hak_(periodeLaporan, tanggalAcuan, tanggalSubmit) {
  // ... 50 lines of if/else nesting
}
```

**Goal**: Break into testable components
```javascript
const PASAL_33_MINGGU = [
  { days: [1, 7], poin: 20, label: "Minggu pertama" },
  { days: [8, 14], poin: 15, label: "Terlambat 1 minggu" },
  { days: [15, 21], poin: 10, label: "Terlambat 2 minggu" },
  { days: [22, 28], poin: 5, label: "Terlambat 3 minggu" },
  { days: [29, 31], poin: 0, label: "Terlambat 4 minggu" }
];

function hitungPoinBerdasarTanggal_(dayOfMonth, statusLaporanDiajukan) {
  // Simplified logic - find matching week
  for (var i = 0; i < PASAL_33_MINGGU.length; i++) {
    var week = PASAL_33_MINGGU[i];
    if (dayOfMonth >= week.days[0] && dayOfMonth <= week.days[1]) {
      return week.poin;
    }
  }
  return 0;
}
```

**Files to Change**: `Kode.js` (lines 300-400)
**Effort**: 1.5 hours
**Impact**: Medium - easier to test & maintain complex logic

---

## PART 2: FRONTEND (Index.html) - Refactoring Plan

### 2.1 Split Single File into Multiple Files

**Current**: `Index.html` = 2800 lines (HTML + CSS + JS mixed)

**Target Structure**:
```
index.html           (400 lines) - Structure only
styles/
  ├── main.css       (1500 lines) - All styles
  ├── responsive.css (300 lines) - Media queries
  └── variables.css  (100 lines) - CSS variables
scripts/
  ├── constants.js   (50 lines) - APP_VERSION, KATEGORI_LAP, etc
  ├── ui.js          (300 lines) - DOM manipulation, event handlers
  ├── form.js        (200 lines) - Form validation & submission
  └── sync.js        (100 lines) - Version checking, data sync
```

**Template for index.html**:
```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta name="viewport" content="...">
  <link rel="stylesheet" href="styles/variables.css">
  <link rel="stylesheet" href="styles/main.css">
  <link rel="stylesheet" href="styles/responsive.css">
</head>
<body>
  <!-- Structure only, no inline styles -->
  <div id="halamanLogin" class="login-page">...</div>
  <div id="aplikasiUtama" class="app-main">...</div>
  
  <!-- Include JS at bottom -->
  <script src="scripts/constants.js"></script>
  <script src="scripts/ui.js"></script>
  <script src="scripts/form.js"></script>
  <script src="scripts/sync.js"></script>
</body>
</html>
```

**Challenge**: Google Apps Script may not support external JS/CSS
**Solution**: Use `<?!= include('file') ?>` template syntax in GAS or concatenate during build

**Files to Create**: 6 new files
**Effort**: 4-5 hours (mostly copy/paste + cleanup)
**Impact**: High - maintainability, reusability

---

### 2.2 Fix CSS Cascade & Remove !important

**Current State**: 72 `!important` declarations
```css
@media (max-width: 768px) {
  .sidebar { position: fixed !important; bottom: 0 !important; ... }
}
```

**Strategy**: Refactor media query to use proper CSS hierarchy
```css
/* Base styles - desktop first */
.sidebar {
  position: absolute;
  width: 260px;
}

/* Mobile override - no !important needed */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    bottom: 0;
    width: 100%;
    height: var(--mobile-nav-height);
  }
}
```

**Key Principle**: Use CSS inheritance & cascade properly instead of force overrides

**Effort**: 3-4 hours (careful testing needed)
**Impact**: High - better maintainability, better rendering performance

---

### 2.3 De-Duplicate Form Field References

**Current State**: 80+ hardcoded field IDs scattered in JS
```javascript
// 20+ functions reference:
document.getElementById('fKategori')
document.getElementById('fBukti')
document.getElementById('fDeskripsi')
// etc
```

**Solution**: Create form schema object
```javascript
const FORM_FIELDS = {
  INPUT: {
    KATEGORI: 'fKategori',
    BUKTI: 'fBukti',
    DESKRIPSI: 'fDeskripsi',
    // ... all 80+ fields
  },
  // Getters
  get(fieldKey) {
    return document.getElementById(this.INPUT[fieldKey]);
  },
  getValue(fieldKey) {
    var el = this.get(fieldKey);
    return el ? el.value : '';
  },
  setValue(fieldKey, value) {
    var el = this.get(fieldKey);
    if (el) el.value = value;
  }
};

// Usage before: document.getElementById('fKategori').value
// Usage after: FORM_FIELDS.getValue('KATEGORI')
```

**Effort**: 2 hours
**Impact**: Medium - easier refactoring later

---

### 2.4 Create Modal Component Factory

**Current State**: 5 hardcoded modal divs (~200 lines)
```html
<div id="modalSetujuAdmin" class="modal-overlay">
<div id="modalTolakAdmin" class="modal-overlay">
<div id="modalRevisi" class="modal-overlay">
<!-- ... repeated patterns -->
```

**Goal**: Generic modal component with factory pattern
```javascript
const ModalFactory = {
  templates: {
    confirm: function(title, content, onConfirm, onCancel) { ... },
    input: function(label, placeholder, onConfirm) { ... },
    textArea: function(label, rows, onConfirm) { ... }
  },
  
  create: function(type, config) {
    var template = this.templates[type];
    if (!template) throw new Error("Unknown modal type");
    return template(config);
  },
  
  show: function(modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
};

// Usage:
var modal = ModalFactory.create('confirm', {
  title: 'Setujui Laporan?',
  content: '...',
  onConfirm: function() { ... }
});
ModalFactory.show(modal);
```

**Effort**: 2 hours
**Impact**: Medium - easier to add new modals

---

### 2.5 De-Duplicate Button & Badge Styles

**Current State**: 8+ button variants with similar styling
```css
.btn-unduh { background: linear-gradient(...) }
.btn-submit { background: linear-gradient(...) }
.btn-notif-wajib { background: linear-gradient(...) }
```

**Solution**: Utility class system (Tailwind-like)
```css
/* Base button */
.btn {
  border: none;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

/* Variants */
.btn-primary { background: linear-gradient(135deg, var(--primary), #3b82f6); }
.btn-secondary { background: #f1f5f9; color: var(--text-main); }
.btn-danger { background: linear-gradient(135deg, #b91c1c, #dc2626); }
.btn-success { background: linear-gradient(135deg, #16a34a, #15803d); }

.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.65; }
```

**HTML**: 
```html
<button class="btn btn-primary">Kirim</button>
<button class="btn btn-danger">Tolak</button>
```

**Effort**: 1 hour
**Impact**: Medium - reduces CSS size by 30%

---

### 2.6 Add ARIA Labels & Keyboard Support

**Current Gap**: No keyboard support for modals, minimal ARIA labels

**Implementation**:
```html
<!-- Before -->
<div id="modalSetujuAdmin" class="modal-overlay">

<!-- After -->
<div id="modalSetujuAdmin" class="modal-overlay" 
     role="dialog" 
     aria-labelledby="modalSetujuTitle"
     aria-hidden="true">
  <h2 id="modalSetujuTitle">Setujui Laporan</h2>
  <!-- content -->
</div>
```

```javascript
// Add Escape key support
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeCurrentModal();
  }
});
```

**Files to Change**: Index.html throughout
**Effort**: 2 hours
**Impact**: Medium - improves accessibility

---

### 2.7 [SELESAI] Improve Form Validation

**Current State**: Minimal validation
```javascript
if (!paket.nama || !paket.jabatan || !paket.kategori || (!paket.deskripsi && !paket.detailWajibPamong)) {
  return "❌ GAGAL: Data tidak lengkap...";
}
```

**Solution**: Create validation schema
```javascript
const FORM_VALIDATION = {
  fKategori: { required: true, type: 'select' },
  fBukti: { required: true, type: 'file', maxSize: 5 * 1024 * 1024 },
  fDeskripsi: { required: true, type: 'textarea', minLength: 20 },
  fTanggal: { required: true, type: 'date' },
};

function validateForm(formData, schema) {
  var errors = [];
  for (var fieldKey in schema) {
    var rule = schema[fieldKey];
    var value = formData[fieldKey];
    
    if (rule.required && !value) {
      errors.push(fieldKey + " wajib diisi");
    }
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(fieldKey + " minimal " + rule.minLength + " karakter");
    }
    if (rule.maxSize && value.size > rule.maxSize) {
      errors.push(fieldKey + " terlalu besar");
    }
  }
  return errors;
}
```

**Effort**: 1.5 hours
**Impact**: Medium - better UX, fewer form errors

---

## PART 3: Shared Constants (De-Duplication)

### 3.1 [SELESAI] Create Shared Constants File

**Current Issue**: Constants defined in both `Kode.js` AND `Index.html`
```javascript
// Kode.js:
var KATEGORI_LAP = { PROD: "Laporan Produktifitas", ... }

// Index.html:
const KATEGORI_LAP = { PROD: "Laporan Produktifitas", ... }
```

**Solution**: Create single source of truth

**Backend Option - Use PropertiesService**:
```javascript
// Kode.js - During deployment/initialization:
function initializeAppConstants() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("APP_CONSTANTS", JSON.stringify({
    KATEGORI_LAP: { PROD: "Laporan Produktifitas", ... },
    REVIEW_STATUS: { MENUNGGU: "Menunggu Review", ... },
    TUNJANGAN_STATUS: { DRAFT: "Draft", ... }
  }));
}

// Then frontend can fetch:
google.script.run.withSuccessHandler(function(constants) {
  window.APP_CONSTANTS = constants;
}).ambilConstantAplikasi();
```

**Frontend Call**:
```javascript
function ambilConstantAplikasi() {
  var props = PropertiesService.getScriptProperties();
  var constants = props.getProperty("APP_CONSTANTS");
  return constants ? JSON.parse(constants) : {};
}
```

**Effort**: 1 hour
**Impact**: High - single source of truth prevents sync issues

---

## PART 4: Testing & QA Plan

### 4.1 Manual Testing Checklist
- [ ] Login with correct PIN
- [ ] Login with incorrect PIN (5 attempts block)
- [ ] Submit various laporan types
- [ ] Verify file upload size validation
- [ ] Check mobile responsiveness (768px, 360px)
- [ ] Test modal open/close
- [ ] Verify Pasal 33 calculation with edge dates
- [ ] Check Tunjangan recap generation
- [ ] Test Admin review workflow

### 4.2 Browser Testing
- Chrome (latest)
- Firefox (latest)
- Safari (macOS + iOS)
- Edge
- Mobile browsers (Android Chrome, iOS Safari)

---

## PART 5: Implementation Timeline

| Week | Task | Files Changed |
|------|------|---------------|
| **Week 1** | Extract magic numbers & sheet columns | Kode.js + SheetSchema.gs |
| **Week 1** | De-duplicate jabatan checking | Kode.js |
| **Week 2** | Split Index.html into 6 files | index.html, styles/*, scripts/* |
| **Week 2** | Fix CSS cascade | styles/main.css |
| **Week 3** | Create form field factory | scripts/form.js |
| **Week 3** | Create modal factory | scripts/ui.js |
| **Week 4** | Add validation & ARIA labels | index.html + scripts/* |
| **Week 4** | Deploy & comprehensive QA | All files |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking existing functionality | Medium | High | Thorough manual testing, Git version control |
| Performance regression | Low | Medium | Benchmark before/after, lazy load where possible |
| Compatibility issues (GAS limits) | Low | High | Test with actual Google Sheets API |
| User confusion from UI changes | Low | Low | Avoid UI changes in refactor phase |

---

## Success Metrics

- ✅ All tests pass
- ✅ Page load time < 2s
- ✅ Zero hardcoded magic numbers
- ✅ 0 `!important` in CSS
- ✅ 80% code covered by JSDoc comments
- ✅ Accessibility score > 90 (Lighthouse)
- ✅ All forms validate properly
- ✅ Mobile responsive verified on 5+ devices
