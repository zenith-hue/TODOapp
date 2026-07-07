// 시트 컬럼 구성(1행은 헤더): id | text | completed
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName('Sheet1') || ss.getSheets()[0];
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).filter(function (row) {
    return row[0];
  });
  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getSheet_();
  const payload = JSON.parse(e.postData.contents);

  if (payload.type === 'add') {
    sheet.appendRow([payload.id, payload.text, payload.completed ? 'TRUE' : 'FALSE']);
  } else if (payload.type === 'update') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === payload.id) {
        sheet.getRange(i + 1, 3).setValue(payload.completed ? 'TRUE' : 'FALSE');
        break;
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
