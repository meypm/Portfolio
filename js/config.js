/*
  KleverDi Student Portfolio — frontend-only settings.

  1) Проект работает без сервера: данные сохраняются в localStorage браузера.
  2) Чтобы реально собирать данные всех студентов в одну таблицу,
     вставьте сюда Google Apps Script Web App URL в COLLECTOR_URL.
     Код Apps Script лежит в папке google-apps-script/Code.gs
*/
window.PORTFOLIO_CONFIG = {
  APP_NAME: 'KleverDi Student Portfolio',
  TEACHER_PASSWORD: 'admin2026',
  STORAGE_KEY: 'kleverdi_student_portfolio_v3',
  SESSION_KEY: 'kleverdi_student_portfolio_session_v3',
  COLLECTOR_URL: 'https://script.google.com/macros/s/AKfycbzzZvqcZuh5DWsWI1ftk3W4ZnNnhH8JSV2BdOEGHTefARFd2ae5xZ1cJATfxV2c79ttmg/exec',
  AUTO_COLLECT_ON_SAVE: false
};
