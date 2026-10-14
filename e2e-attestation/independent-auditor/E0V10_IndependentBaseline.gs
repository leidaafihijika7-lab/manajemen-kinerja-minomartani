/**
 * E0V10 — Independent full-grid and Drive baseline for isolated E2E stage.
 * Install ONLY alongside SAV10 in a NEW AUDITOR project, never in the target.
 * Reads Sheets/Drive via authenticated REST. Writes JSON exclusively into the
 * separate, private evidence folder. No mutation of workbook or upload folder.
 */
var E0V10_POLICY_ = Object.freeze({
  VERSION:'PHA07B2-B2-E0V10-2026.10.14.1',
  DB:'1A4lzft_uV0hwCYroJnyNFIwx-WBzuQyvoIpFtKfDkic',
  PARENT:'1VWyLFAAC-E3C_XVc95UJnxDoPU2aCrpt',
  UPLOAD:'1SbkHmLXkCEPUqow8YtVpZqW7jS7yGJy0',
  EVIDENCE:'1x0CKHFGQ9rEXWTb_2BMtnqp7bO--pnrG',
  FROZEN:'1mpk7JAZo1fqUV7bYfJIYoYKHIoJTD_tGumtFQnQyagU',
  EXPECTED_SHEETS:[
    'MULAI_DI_SINI','SKENARIO_B0','Rekap_Kinerja','Index_Laporan',
    'Index_Laporan_Sync_Queue','Disposisi_Surat','Disposisi_Penerima',
    'Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0','Data_Pegawai',
    'Disposisi_Petugas'
  ],
  GRID_CHUNK_ROWS:500,
  MAX_ROW_COUNT:2000,
  MAX_COLUMN_COUNT:120,
  MAX_EVIDENCE_CHARACTERS:12000000,
  MARKER:'STAGE_PHA07B2_B2_E2E_ISOLATED_V1',
  AUTH:'E2E_PRIVATE_WEBAPP_WRITES_OPTIN_ONLY'
});

function e0v10DriveFileMeta_(id) {
  var fields='id,name,mimeType,parents,shared,trashed,size,md5Checksum,sha256Checksum,createdTime,modifiedTime,permissions(id,type,role,emailAddress,domain,allowFileDiscovery)';
  return sav10ApiGet_(
    'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) +
    '?supportsAllDrives=true&fields=' + encodeURIComponent(fields),'DRIVE_FILE_META');
}

function e0v10PublicPermission_(meta) {
  return !!(meta && (meta.shared === true ||
    !Array.isArray(meta.permissions) || meta.permissions.length !== 1 ||
    meta.permissions[0].type !== 'user' || meta.permissions[0].role !== 'owner' ||
    meta.permissions.some(function(p){ return p.type === 'anyone' || p.type === 'domain'; })));
}

function e0v10CompactDriveMeta_(m) {
  return {
    id:m.id,name:m.name,mimeType:m.mimeType,parents:m.parents || [],
    shared:m.shared === true,trashed:m.trashed === true,
    size:m.size || '',md5Checksum:m.md5Checksum || '',
    sha256Checksum:m.sha256Checksum || '',
    createdTime:m.createdTime || '',modifiedTime:m.modifiedTime || '',
    permissions:(m.permissions||[]).map(function(p){
      return {type:p.type||'',role:p.role||'',domain:p.domain||'',
        allowFileDiscovery:p.allowFileDiscovery===true};
    }).sort(function(a,b){return sav10StableJson_(a).localeCompare(sav10StableJson_(b));})
  };
}

function e0v10ListFolderAll_(folderId) {
  var files=[], token='';
  do {
    var params=[
      'q='+encodeURIComponent("'" + folderId + "' in parents and trashed = false"),
      'pageSize=1000',
      'fields='+encodeURIComponent('nextPageToken,incompleteSearch,files(id,name,mimeType,parents,shared,trashed,size,md5Checksum,modifiedTime,permissions(type,role))'),
      'supportsAllDrives=true','includeItemsFromAllDrives=true'
    ];
    if (token) params.push('pageToken='+encodeURIComponent(token));
    var response=sav10ApiGet_('https://www.googleapis.com/drive/v3/files?'+params.join('&'),'FOLDER_INVENTORY');
    if (response.incompleteSearch === true) throw new Error('E0_DRIVE_SEARCH_INCOMPLETE');
    (response.files||[]).forEach(function(f){files.push(f);});
    if (files.length > 2000) throw new Error('E0_DRIVE_INVENTORY_LIMIT_EXCEEDED');
    token=response.nextPageToken || '';
  } while(token);
  files.sort(function(a,b){return String(a.id).localeCompare(String(b.id));});
  return files;
}

function e0v10SheetsMetadata_() {
  var id=E0V10_POLICY_.DB;
  var m=sav10ApiGet_('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+
    '?includeGridData=false','SHEETS_METADATA');
  if (m.spreadsheetId !== id || !Array.isArray(m.sheets)) throw new Error('E0_SPREADSHEET_META_INVALID');
  return m;
}

function e0v10ReadSentinel_() {
  var id=E0V10_POLICY_.DB;
  var a1="'MULAI_DI_SINI'!A5:B20";
  var data=sav10ApiGet_(
    'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+
    encodeURIComponent(a1)+'?valueRenderOption=FORMATTED_VALUE','SHEETS_CONTROL');
  var r=data.values||[];
  function get(i,j){return r[i]&&r[i][j]!==undefined?String(r[i][j]):'';}
  if (get(0,0)!==E0V10_POLICY_.MARKER || get(3,0)!==E0V10_POLICY_.AUTH ||
      get(11,1)!==id || get(12,1)!==E0V10_POLICY_.UPLOAD ||
      get(13,1)!==E0V10_POLICY_.EVIDENCE ||
      get(14,1)!=='NOT_DEPLOYED' || get(15,1)!=='false') {
    throw new Error('E0_CONTROL_SENTINEL_INVALID');
  }
  return {marker:get(0,0),auth:get(3,0),deployment:get(14,1),writeFlag:get(15,1)};
}

function e0v10ColumnLetter_(n) {
  var str='';
  for(var q=n;q>0;q=Math.floor((q-1)/26))
    str=String.fromCharCode(65+(q-1)%26)+str;
  return str;
}

function e0v10GridChunk_(sheet,startRow,endRow,colCount) {
  var id=E0V10_POLICY_.DB;
  var title=String(sheet.properties.title).replace(/'/g,"''");
  var range="'"+title+"'!A"+(startRow+1)+":"+e0v10ColumnLetter_(colCount)+endRow;
  var fields='spreadsheetId,sheets(properties(sheetId,title),data(startRow,startColumn,' +
    'rowData(values(userEnteredValue,effectiveValue,formattedValue,userEnteredFormat,' +
    'effectiveFormat,note,dataValidation,hyperlink,textFormatRuns,chipRuns))))';
  var resource=sav10ApiGet_(
    'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+
    '?ranges='+encodeURIComponent(range)+'&fields='+encodeURIComponent(fields),
    'SHEETS_GRID_CHUNK');
  if (resource.spreadsheetId!==id || !Array.isArray(resource.sheets) ||
      resource.sheets.length!==1 ||
      Number(resource.sheets[0].properties.sheetId)!==Number(sheet.properties.sheetId)) {
    throw new Error('E0_GRID_CHUNK_INVALID');
  }
  var out=[],blocks=resource.sheets[0].data||[];
  blocks.forEach(function(block) {
    var rs=typeof block.startRow==='number'?block.startRow:startRow;
    var cs=typeof block.startColumn==='number'?block.startColumn:0;
    (block.rowData||[]).forEach(function(row,i){
      (row.values||[]).forEach(function(value,j) {
        if (value && Object.keys(value).length) {
          var r=rs+i,c=cs+j;
          if (r<startRow || r>=endRow || c<0 || c>=colCount)
            throw new Error('E0_GRID_DATA_OUT_OF_RANGE');
          out.push({row:r,col:c,cell:value});
        }
      });
    });
  });
  return out;
}

function e0v10CaptureSheet_(sheet) {
  var p=sheet.properties||{};
  var grid=p.gridProperties||{};
  var rows=Number(grid.rowCount),cols=Number(grid.columnCount);
  if (!p.title || !Number.isInteger(rows) || !Number.isInteger(cols) ||
      rows<1 || cols<1 || rows>E0V10_POLICY_.MAX_ROW_COUNT ||
      cols>E0V10_POLICY_.MAX_COLUMN_COUNT)
    throw new Error('E0_UNSUPPORTED_GRID_SIZE:'+String(p.title||'').slice(0,40));
  var cells=[],chunks=0;
  for (var from=0;from<rows;from+=E0V10_POLICY_.GRID_CHUNK_ROWS) {
    var to=Math.min(rows,from+E0V10_POLICY_.GRID_CHUNK_ROWS);
    var records=e0v10GridChunk_(sheet,from,to,cols);
    for(var i=0;i<records.length;i++)cells.push(records[i]);
    chunks++;
  }
  cells.sort(function(a,b){return a.row-b.row||a.col-b.col;});
  var body={sheetId:p.sheetId,title:p.title,rows:rows,columns:cols,
    recordedCells:cells};
  return {
    title:p.title,sheetId:p.sheetId,gridRows:rows,gridColumns:cols,
    chunks:chunks,recordedCellCount:cells.length,
    hash:sav10HexDigest_(sav10StableJson_(body)),
    cells:cells
  };
}

function e0v10VerifyAttestationFile_() {
  var p=PropertiesService.getScriptProperties();
  var id=String(p.getProperty('SAV10_PASSED_EVIDENCE_FILE_ID')||'').trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error('E0_SAV10_EVIDENCE_ID_MISSING');
  var f=DriveApp.getFileById(id);
  var parents=f.getParents(),isWithin=false;
  while(parents.hasNext()) {
    if (String(parents.next().getId())===E0V10_POLICY_.EVIDENCE) isWithin=true;
  }
  if (!isWithin || f.getSharingAccess()!==DriveApp.Access.PRIVATE)
    throw new Error('E0_PRIOR_ATTESTATION_FILE_UNSAFE');
  var content=f.getBlob().getDataAsString('UTF-8');
  var obj=JSON.parse(content);
  var c=sav10CheckConfig_();
  if (obj.status!=='SAV10_SOURCE_MATCH_PASS' || obj.targetScriptId!==c.targetId ||
      obj.referenceCommit!==SAV10_POLICY_.REFERENCE_COMMIT ||
      !Array.isArray(obj.observed) || obj.observed.length!==7 ||
      obj.observed.some(function(x){return x.same!==true;})) {
    throw new Error('E0_PRIOR_ATTESTATION_INVALID');
  }
  return {fileId:id,contentSha256:sav10HexDigest_(content),attestedAt:obj.verifiedAt||''};
}

function e0v10RunCaptureCore_() {
  var policy=E0V10_POLICY_;
  sav10CheckConfig_();
  var approved=e0v10VerifyAttestationFile_();
  var attBefore=sav10CompareSourceCore_();
  if (attBefore.status!=='SAV10_SOURCE_MATCH_PASS')
    throw new Error('E0_LIVE_SOURCE_ATTESTATION_BLOCKED');
  if (policy.DB===policy.FROZEN || policy.UPLOAD===policy.EVIDENCE)
    throw new Error('E0_UNSAFE_RESOURCE_COLLISION');
  var dbBefore=e0v10DriveFileMeta_(policy.DB);
  var upload=e0v10DriveFileMeta_(policy.UPLOAD);
  var evidence=e0v10DriveFileMeta_(policy.EVIDENCE);
  if (e0v10PublicPermission_(dbBefore) || e0v10PublicPermission_(upload) ||
      e0v10PublicPermission_(evidence)) throw new Error('E0_NONPRIVATE_ACL');
  if ((dbBefore.parents||[]).indexOf(policy.PARENT)<0 ||
      (upload.parents||[]).indexOf(policy.PARENT)<0 ||
      (evidence.parents||[]).indexOf(policy.PARENT)>=0)
    throw new Error('E0_RESOURCE_PARENT_MISMATCH');
  var initialUpload=e0v10ListFolderAll_(policy.UPLOAD);
  if (initialUpload.length) throw new Error('E0_UPLOAD_FOLDER_NOT_EMPTY');

  var sentinelBefore=e0v10ReadSentinel_();
  var metadata=e0v10SheetsMetadata_();
  var tabs=metadata.sheets||[];
  if (tabs.length!==12) throw new Error('E0_SHEET_COUNT_MISMATCH');
  var names=tabs.map(function(s){return s.properties&&s.properties.title||'';});
  if (sav10StableJson_(names.slice().sort()) !==
      sav10StableJson_(policy.EXPECTED_SHEETS.slice().sort()))
    throw new Error('E0_SHEET_NAMES_MISMATCH');
  var sheets=tabs.map(e0v10CaptureSheet_);
  var sentinelAfter=e0v10ReadSentinel_();
  var dbAfter=e0v10DriveFileMeta_(policy.DB);
  var uploadAfter=e0v10DriveFileMeta_(policy.UPLOAD);
  var lastUpload=e0v10ListFolderAll_(policy.UPLOAD);
  var attAfter=sav10CompareSourceCore_();
  if (attAfter.status!=='SAV10_SOURCE_MATCH_PASS')
    throw new Error('E0_SOURCE_CHANGED_DURING_CAPTURE');
  if (dbBefore.modifiedTime !== dbAfter.modifiedTime ||
      upload.modifiedTime !== uploadAfter.modifiedTime ||
      lastUpload.length!==0 ||
      sav10StableJson_(sentinelBefore)!==sav10StableJson_(sentinelAfter))
    throw new Error('E0_TARGET_STATE_CHANGED_DURING_CAPTURE');
  var doc={
    schema:'PHA07B2_B2_E0V10_TYPED_GRID_DRIVE_BASELINE_V1',
    version:policy.VERSION,createdAt:new Date().toISOString(),
    targetSpreadsheetId:policy.DB,targetUploadFolderId:policy.UPLOAD,
    independentEvidenceFolderId:policy.EVIDENCE,originalRc82FrozenId:policy.FROZEN,
    sourceAttestation:{
      prior:approved, before:attBefore,after:attAfter,
      canonicalReferenceCommit:SAV10_POLICY_.REFERENCE_COMMIT
    },
    sentinel:sentinelBefore,driveResources:{
      workbook:e0v10CompactDriveMeta_(dbBefore),
      upload:e0v10CompactDriveMeta_(upload),
      evidence:e0v10CompactDriveMeta_(evidence),
      uploadInventory:initialUpload
    },spreadsheet:{
      metadata:metadata,metadataSha256:sav10HexDigest_(sav10StableJson_(metadata)),
      sheets:sheets
    },captureCoverage:{
      grid:"all 12 sheets; all allocated rows and columns, in fixed read-only chunks",
      cellData:"user-entered/effective/format/note/validation/chips/links",
      drive:"upload root content empty; owner-only metadata readback",
      limits:"No Apps Script ScriptProperties, deployment IAM or production-write inventory was independently inspected"
    },
    targetWrites:0,productionReady:false
  };
  var raw=JSON.stringify(doc);
  if(raw.length>policy.MAX_EVIDENCE_CHARACTERS)throw new Error('E0_EVIDENCE_PAYLOAD_LIMIT_EXCEEDED');
  return {document:doc,rawSha256:sav10HexDigest_(raw)};
}

function e0v10CaptureBaselineV1() {
  var result;
  try {
    var captured=e0v10RunCaptureCore_();
    var saved=sav10SavePrivateJson_('E0V10_BASELINE',captured.document);
    if (saved.sha256!==captured.rawSha256)
      throw new Error('E0_PRIVATE_EVIDENCE_HASH_MISMATCH');
    var sheets=captured.document.spreadsheet.sheets;
    result={
      version:E0V10_POLICY_.VERSION,
      status:'E0V10_BASELINE_CAPTURED_READ_ONLY',
      targetSpreadsheetId:E0V10_POLICY_.DB,
      sheetCount:sheets.length,
      gridChunks:sheets.reduce(function(a,s){return a+s.chunks;},0),
      recordedCellCount:sheets.reduce(function(a,s){return a+s.recordedCellCount;},0),
      metadataSha256:captured.document.spreadsheet.metadataSha256,
      sheetRoots:sheets.map(function(s){return {title:s.title,sha256:s.hash};}),
      evidenceFileId:saved.fileId,e0EvidenceSha256:saved.sha256,
      sourceAttestation:'SAV10_SOURCE_MATCH_PASS_RECHECKED_TWICE',
      uploadInventoryCount:0,privateAclVerified:true,
      targetWrites:0,evidenceWrites:1,
      deployReady:false,productionReady:false,
      caveat:'E0 captures state but does NOT permit Web App deployment, runtime writes, or independent production-write claims.'
    };
  } catch(e) {
    result={version:E0V10_POLICY_.VERSION,status:'E0V10_BASELINE_BLOCKED',
      issues:[String(e&&e.message||e).slice(0,160)],targetWrites:0,
      productionReady:false};
  }
  console.log('E0V10_RESULT:\n'+JSON.stringify(result,null,2));
  return result;
}
