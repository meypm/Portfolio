/*
  Google Apps Script для сбора данных KleverDi Student Portfolio в Google Sheets.

  Как подключить:
  1. Создайте Google Sheet.
  2. Extensions / Расширения -> Apps Script.
  3. Удалите старый код и вставьте этот файл.
  4. Deploy -> New deployment -> Web app.
  5. Execute as: Me. Who has access: Anyone.
  6. Скопируйте Web App URL и вставьте его в js/config.js в COLLECTOR_URL.
*/

const SPREADSHEET_ID = '1fLRAj1RjzlztqPTkjshtZ3e4eaAGSlKmMO6CncEJ8gk';
const SHEET_NAME = 'Студенты';

function doPost(e) {
  const sheet = getSheet_();
  const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  ensureHeaders_(sheet);

  sheet.appendRow([
    new Date(),
    payload.id || '',
    payload.fullName || '',
    payload.group || '',
    payload.course || '',
    payload.speciality || '',
    payload.phone || '',
    payload.email || '',
    payload.progress || 0,
    payload.counts ? payload.counts.works : 0,
    payload.counts ? payload.counts.projects : 0,
    payload.counts ? payload.counts.interests : 0,
    payload.counts ? payload.counts.diary : 0,
    payload.portfolio && payload.portfolio.kleverdi ? payload.portfolio.kleverdi.ideaTitle : '',
    JSON.stringify(payload)
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('KleverDi Student Portfolio collector is working')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Timestamp',
    'Student ID',
    'Full Name',
    'Group',
    'Course',
    'Speciality',
    'Phone',
    'Email',
    'Progress %',
    'Works Count',
    'Activities Count',
    'Interests Count',
    'Diary Count',
    'KleverDi Suggestion',
    'Full JSON Payload'
  ]);
}
