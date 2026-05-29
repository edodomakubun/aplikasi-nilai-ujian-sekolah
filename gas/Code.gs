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
  } else if (action === 'saveGradesBatch') {
    return createJsonResponse(saveGradesBatch(data));
  } else if (action === 'deleteStudent') {
    return createJsonResponse(deleteStudent(data));
  } else if (action === 'login') {
    return createJsonResponse(loginUser(data));
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
  const nisIndex = headers.indexOf('NIS');
  
  if (nisIndex === -1) return {error: "Kolom 'NIS' tidak ditemukan di Sheet Siswa"};
  if (!data['NIS']) return {error: "NIS wajib diisi sebagai identitas unik"};
  
  let rowIndex = -1;
  for(let i=1; i<allData.length; i++) {
    // Treat as string for comparison
    if(String(allData[i][nisIndex]) === String(data['NIS'])) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const row = [];
  for(let i=0; i<headers.length; i++) {
    row.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
  }
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    return {success: true, message: "Data Siswa berhasil diperbarui"};
  } else {
    sheet.appendRow(row);
    return {success: true, message: "Data Siswa berhasil disimpan"};
  }
}

function deleteStudent(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Siswa');
  if(!sheet) return {error: "Sheet 'Siswa' tidak ditemukan"};
  
  const nis = data['NIS'];
  if (!nis) return {error: "NIS wajib disertakan untuk menghapus siswa"};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nisIndex = headers.indexOf('NIS');
  
  if (nisIndex === -1) return {error: "Kolom 'NIS' tidak ditemukan di Sheet Siswa"};
  
  let rowIndex = -1;
  for(let i=1; i<allData.length; i++) {
    if(String(allData[i][nisIndex]) === String(nis)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > -1) {
    sheet.deleteRow(rowIndex);
    return {success: true, message: "Data Siswa berhasil dihapus"};
  }
  
  return {error: "Data Siswa dengan NIS tersebut tidak ditemukan"};
}

// ==================== NILAI ====================
function getGrades() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const subjects = ['PENDIDIKAN AGAMA KRISTEN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];
  const result = [];
  
  subjects.forEach(subject => {
    const sheet = ss.getSheetByName(subject);
    if(sheet) {
      const data = sheet.getDataRange().getValues();
      if(data.length > 1) {
        const headers = data[0];
        for(let i = 1; i < data.length; i++) {
          let row = data[i];
          let obj = {};
          for(let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
          }
          obj['MATA PELAJARAN'] = subject; // Inject subject name for frontend
          result.push(obj);
        }
      }
    }
  });
  
  return {data: result};
}

function saveGrade(data) {
  const mapel = data['MATA PELAJARAN'];
  if(!mapel) return {error: "Kolom MATA PELAJARAN wajib disertakan"};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mapel);
  if(!sheet) return {error: "Sheet Mata Pelajaran '" + mapel + "' tidak ditemukan"};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nameIndex = headers.indexOf('NAMA SISWA');
  
  if (nameIndex === -1) return {error: "Kolom 'NAMA SISWA' tidak ditemukan di Sheet " + mapel};
  
  let rowIndex = -1;
  for(let i=1; i<allData.length; i++) {
    if(allData[i][nameIndex] === data['NAMA SISWA']) {
      rowIndex = i + 1; // 1-based index untuk Spreadsheet
      break;
    }
  }
  
  const row = [];
  for(let i=0; i<headers.length; i++) {
    row.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
  }
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    return {success: true, message: "Data Nilai berhasil diperbarui"};
  } else {
    sheet.appendRow(row);
    return {success: true, message: "Data Nilai berhasil disimpan"};
  }
}

function saveGradesBatch(batchData) {
  if (!batchData || batchData.length === 0) return {error: "Data kosong"};
  
  const mapel = batchData[0]['MATA PELAJARAN'];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mapel);
  if(!sheet) return {error: "Sheet Mata Pelajaran '" + mapel + "' tidak ditemukan"};
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const nameIndex = headers.indexOf('NAMA SISWA');
  
  if (nameIndex === -1) return {error: "Kolom 'NAMA SISWA' tidak ditemukan di Sheet " + mapel};
  
  batchData.forEach(data => {
    let rowIndex = -1;
    for(let i=1; i<allData.length; i++) {
      if(allData[i][nameIndex] === data['NAMA SISWA']) {
        rowIndex = i + 1; // 1-based index untuk Spreadsheet
        break;
      }
    }
    
    const row = [];
    for(let i=0; i<headers.length; i++) {
      row.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
    }
    
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      allData[rowIndex - 1] = row; // Update memori
    } else {
      sheet.appendRow(row);
      allData.push(row); 
    }
  });
  
  return {success: true, message: "Seluruh Data Nilai berhasil disimpan di Sheet " + mapel};
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
  
  const subjects = ['PENDIDIKAN AGAMA KRISTEN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];
  subjects.forEach(subject => {
    let sheetNilai = ss.getSheetByName(subject);
    if (!sheetNilai) {
      sheetNilai = ss.insertSheet(subject);
      sheetNilai.appendRow(['NO', 'NAMA SISWA', '7', '8', '9', '10', '11', 'JML', 'RATA-RATA NR', 'BOBOT 40%', 'Tulis', 'Praktik', 'Rata-Rata', 'BOBOT 60%', 'NILAI SEKOLAH']);
      try {
        sheetNilai.getRange('A1:O1').setFontWeight('bold').setBackground('#f3f3f3');
        sheetNilai.setFrozenRows(1);
      } catch(e) {}
    }
  });

  let sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('Users');
    sheetUsers.appendRow(['USERNAME', 'PASSWORD']);
    sheetUsers.appendRow(['admin', 'admin123']);
    try {
      sheetUsers.getRange('A1:B1').setFontWeight('bold').setBackground('#f3f3f3');
      sheetUsers.setFrozenRows(1);
    } catch(e) {}
  }
}

// ==================== AUTHENTICATION ====================
function loginUser(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if(!sheet) return {success: false, error: "Sheet 'Users' tidak ditemukan"};
  
  const allData = sheet.getDataRange().getValues();
  const username = data.username;
  const password = data.password;
  
  if(!username || !password) return {success: false, error: "Username dan Password wajib diisi"};

  for(let i=1; i<allData.length; i++) {
    if(allData[i][0] == username && allData[i][1] == password) {
      // Valid
      return {success: true, message: "Login berhasil", token: Utilities.base64Encode(username + ':' + new Date().getTime())};
    }
  }
  
  return {success: false, error: "Username atau Password salah"};
}
