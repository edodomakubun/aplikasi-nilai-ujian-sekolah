function doGet(e) {
  ensureSheetsExist();
  let action = e.parameter.action;
  
  if (action === 'getStudents') {
    return createJsonResponse(getStudents());
  } else if (action === 'getGrades') {
    return createJsonResponse(getGrades());
  }
  
  return createJsonResponse({error: 'Invalid action'});
}

function doPost(e) {
  ensureSheetsExist();
  let action = e.parameter.action;
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return createJsonResponse({error: 'Invalid JSON'});
  }

  if (action === 'saveStudent') {
    return createJsonResponse(saveStudent(data));
  } else if (action === 'saveGrade') {
    return createJsonResponse(saveGrade(data));
  }
  
  return createJsonResponse({error: 'Invalid action'});
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== SISWA ====================
function getStudents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Siswa');
  if(!sheet) return {error: "Sheet 'Siswa' tidak ditemukan"};
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return {data: []};
  
  const headers = data[0];
  const result = [];
  for(let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};
    for(let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return {data: result};
}

function saveStudent(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Siswa');
  if(!sheet) return {error: "Sheet 'Siswa' tidak ditemukan"};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  const row = [];
  for(let i=0; i<headers.length; i++) {
    row.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
  }
  
  sheet.appendRow(row);
  return {success: true, message: "Data Siswa berhasil disimpan"};
}

// ==================== NILAI ====================
function getGrades() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Nilai');
  if(!sheet) return {error: "Sheet 'Nilai' tidak ditemukan"};
  const data = sheet.getDataRange().getValues();
  if(data.length <= 1) return {data: []};
  
  const headers = data[0];
  const result = [];
  for(let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};
    for(let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return {data: result};
}

function saveGrade(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Nilai');
  if(!sheet) return {error: "Sheet 'Nilai' tidak ditemukan"};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nameIndex = headers.indexOf('NAMA SISWA');
  
  if (nameIndex === -1) return {error: "Kolom 'NAMA SISWA' tidak ditemukan di Sheet Nilai"};
  
  let rowIndex = -1;
  for(let i=1; i<allData.length; i++) {
    if(allData[i][nameIndex] === data['NAMA SISWA']) {
      rowIndex = i + 1; // 1-based index untuk Spreadsheet
      break;
    }
  }
  
  const row = [];
  for(let i=0; i<headers.length; i++) {
    // Jika data adalah null/undefined, biarkan kosong. Tapi jika ada, gunakan.
    row.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
  }
  
  if (rowIndex > -1) {
    // Update data jika NAMA SISWA sudah ada
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    return {success: true, message: "Data Nilai berhasil diperbarui"};
  } else {
    // Insert baru
    sheet.appendRow(row);
    return {success: true, message: "Data Nilai berhasil disimpan"};
  }
}

// ==================== AUTO SETUP ====================
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheetSiswa = ss.getSheetByName('Siswa');
  if (!sheetSiswa) {
    sheetSiswa = ss.insertSheet('Siswa');
    sheetSiswa.appendRow(['NO URUT', 'NIS', 'NISN', 'NO PESERTA UJIAN', 'NO ABSEN', 'NAMA PESERTA', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'NAMA ORANG TUA']);
    try {
      sheetSiswa.getRange('A1:J1').setFontWeight('bold').setBackground('#f3f3f3');
      sheetSiswa.setFrozenRows(1);
    } catch(e) {}
  }
  
  let sheetNilai = ss.getSheetByName('Nilai');
  if (!sheetNilai) {
    sheetNilai = ss.insertSheet('Nilai');
    sheetNilai.appendRow(['NO', 'NAMA SISWA', '7', '8', '9', '10', '11', 'JML', 'RATA-RATA NR', 'BOBOT 40%', 'Tulis', 'Praktik', 'Rata-Rata', 'BOBOT 60%', 'NILAI SEKOLAH']);
    try {
      sheetNilai.getRange('A1:O1').setFontWeight('bold').setBackground('#f3f3f3');
      sheetNilai.setFrozenRows(1);
    } catch(e) {}
  }
}
