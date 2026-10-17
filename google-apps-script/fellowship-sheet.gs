/**
 * Philanthropel Fellowship — review sheet receiver.
 *
 * Bound to the review Google Sheet (Extensions → Apps Script). The form's
 * server POSTs each application here as { secret, headers, row }; this
 * script checks the secret and appends the row. Column order is decided by
 * the form (lib/fellowship.ts), so this script never needs editing when a
 * question changes.
 *
 * The secret lives in Script Properties, not in this file:
 *   Project Settings → Script properties → FELLOWSHIP_SECRET
 * It must match FELLOWSHIP_SHEET_SECRET in the form's environment.
 *
 * Setup steps: see FELLOWSHIP-SETUP.md in the catalyst-form repository.
 */

var SHEET_NAME = 'Applications';

function doPost(e) {
  try {
    var expected = PropertiesService.getScriptProperties().getProperty('FELLOWSHIP_SECRET');
    var data = JSON.parse(e.postData.contents);

    if (!expected || data.secret !== expected) {
      return json_({ ok: false, error: 'unauthorised' });
    }
    if (!Array.isArray(data.headers) || !Array.isArray(data.row) || data.headers.length !== data.row.length) {
      return json_({ ok: false, error: 'malformed row' });
    }

    // Two applications arriving together must not interleave their writes.
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var book = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(data.headers);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, data.headers.length).setFontWeight('bold');
      }
      sheet.appendRow(data.row);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
