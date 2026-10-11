// PHA-07B B0 | ISOLATED ENVIRONMENT ACCEPTANCE RC1 | 2026-10-11
// Install ONLY in a NEW standalone sandbox Apps Script project.
// READ-ONLY: no calls to write, deploy, triggers, or Script Properties.
var PHA07B_B0_VERSION_RC1='PHA07B-B0-ENV-RC1-2026.10.11.01';
var PHA07B_B0_TEST_SPREADSHEET_ID='1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8';
var PHA07B_B0_TEST_TITLE='SANDBOX_PHA07B_B0_SYNTHETIC_ONLY';
function pha07bB0CheckRC1_(ok,code){if(!ok)throw new Error('PHA07B_B0_STOP_'+code);}
function validasiLogikaB0PHA07BRC1(){
 var good=[
 PHA07B_B0_TEST_TITLE==='SANDBOX_PHA07B_B0_SYNTHETIC_ONLY',
 PHA07B_B0_TEST_SPREADSHEET_ID==='1tm-N_2JOWjXLo9bJkqLGgBlQYd76wzE2-vZKXY-tmS8',
 'B0-RPT-0001'!=='B0-RPT-0002',
 'B0-NONCE-0001'!=='B0-NONCE-0002',
 'ROW'!=='BY_ID',
 'PENDING'!=='DONE',
 5>4,
 true
 ];
 var fail=good.filter(function(x){return !x;}).length;
 var r={sukses:fail===0,lulus:good.length-fail,gagal:fail,readOnly:true,productionDataWritten:false};
 Logger.log('PHA07B_B0_PURE_VALIDATION '+JSON.stringify(r));return r;
}
function praUjiLingkunganB0PHA07BRC1(){
 var out={sukses:false,versi:PHA07B_B0_VERSION_RC1,mode:'READ_ONLY',
  isolatedSyntheticVerified:false,queueInitiallyEmpty:false,
  crossReferencesVerified:false,noVisibleTriggers:false,
  writesEnabled:false,productionDataWritten:false,acceptanceApproved:false};
 try{
  pha07bB0CheckRC1_(ScriptApp.getProjectTriggers().length===0,'VISIBLE_TRIGGERS_PRESENT');
  var ss=SpreadsheetApp.openById(PHA07B_B0_TEST_SPREADSHEET_ID);
  pha07bB0CheckRC1_(ss.getId()===PHA07B_B0_TEST_SPREADSHEET_ID,'ID_MISMATCH');
  pha07bB0CheckRC1_(ss.getName()===PHA07B_B0_TEST_TITLE,'TITLE_MISMATCH');
  var expected=['MULAI_DI_SINI','SKENARIO_B0','Rekap_Kinerja','Index_Laporan',
    'Index_Laporan_Sync_Queue','Disposisi_Surat','Disposisi_Penerima',
    'Audit_Log','Disposisi_Log','EVENT_JOURNAL_B0'];
  pha07bB0CheckRC1_(ss.getSheets().length===expected.length,'TAB_COUNT');
  expected.forEach(function(name){pha07bB0CheckRC1_(!!ss.getSheetByName(name),'MISSING_TAB');});
  var header=ss.getSheetByName('MULAI_DI_SINI');
  pha07bB0CheckRC1_(header.getRange('A4').getValue()==='SYNTHETIC_ONLY_NO_PRODUCTION_DATA','SYNTHETIC_MARKER');
  pha07bB0CheckRC1_(header.getRange('A8').getValue()==='WRITE_TESTS_NOT_AUTHORIZED','WRITE_NOT_AUTHORIZED_MARKER');
  var r=ss.getSheetByName('Rekap_Kinerja'),idx=ss.getSheetByName('Index_Laporan'),
   q=ss.getSheetByName('Index_Laporan_Sync_Queue'),
   d=ss.getSheetByName('Disposisi_Penerima'),
   a=ss.getSheetByName('Audit_Log'),
   l=ss.getSheetByName('Disposisi_Log');
  pha07bB0CheckRC1_(r.getLastRow()===3&&idx.getLastRow()===3&&
    q.getLastRow()===1&&d.getLastRow()===2&&
    a.getLastRow()===3&&l.getLastRow()===2,'INITIAL_ROW_COUNTS');
  var expectedIds=['B0-RPT-0001','B0-RPT-0002'];
  for(var i=0;i<2;i++){
    var row=i+2,report=r.getRange(row,19).getValue(),
      sourceOwner=r.getRange(row,20).getValue(),
      sourceNonce=r.getRange(row,22).getValue();
    pha07bB0CheckRC1_(report===expectedIds[i]&&
      idx.getRange(row,1).getValue()===report&&
      Number(idx.getRange(row,2).getValue())===row&&
      idx.getRange(row,3).getValue()===sourceOwner&&
      idx.getRange(row,10).getValue()===sourceNonce,
      'REPORT_INDEX_LINK_'+i);
    pha07bB0CheckRC1_(a.getRange(row,3).getValue()==='SUBMIT_LAPORAN'&&
      a.getRange(row,4).getValue()===report,'AUDIT_LINK_'+i);
  }
  pha07bB0CheckRC1_(d.getRange('H2').getValue()==='B0-RPT-0001'&&
     l.getRange('K2').getValue()==='B0-RPT-0001','DISPOSITION_LINK');
  out.sukses=true;out.isolatedSyntheticVerified=true;out.queueInitiallyEmpty=true;
  out.crossReferencesVerified=true;out.noVisibleTriggers=true;
 }catch(e){out.stopCode=String(e&&e.message||'UNKNOWN').slice(0,115);}
 Logger.log('PHA07B_B0_PREFLIGHT '+JSON.stringify(out));return out;
}
