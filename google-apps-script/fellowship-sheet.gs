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
 * It also sends the team's email alerts. A request with action "notify"
 * carries { secret, action, subject, body } and is mailed, as plain text,
 * from the account that owns this script to DEFAULT_RECIPIENTS below, or to
 * the comma-separated addresses in the NOTIFY_EMAILS script property if set.
 * Alerts come from both the Fellowship form and the Catalyst intake form.
 *
 * A request with action "confirm" carries { secret, action, to, subject, body }
 * and is mailed to that one applicant, confirming their application arrived.
 *
 * Setup steps: see FELLOWSHIP-SETUP.md in the catalyst-form repository.
 */

var SHEET_NAME = 'Applications';

// Who receives alerts unless the NOTIFY_EMAILS script property overrides it.
var DEFAULT_RECIPIENTS = 'anmol@philanthropel.com, srishti@philanthropel.com';

function doPost(e) {
  try {
    var expected = PropertiesService.getScriptProperties().getProperty('FELLOWSHIP_SECRET');
    var data = JSON.parse(e.postData.contents);

    if (!expected || data.secret !== expected) {
      return json_({ ok: false, error: 'unauthorised' });
    }
    if (data.action === 'notify') {
      return json_(notify_(data));
    }
    if (data.action === 'confirm') {
      return json_(confirm_(data));
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

/** Email an alert to the team. Plain text only, so applicant answers cannot inject markup. */
function notify_(data) {
  if (typeof data.subject !== 'string' || typeof data.body !== 'string' || !data.subject) {
    return { ok: false, error: 'malformed alert' };
  }
  var configured = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAILS');
  var to = configured || DEFAULT_RECIPIENTS;
  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  MailApp.sendEmail({
    to: to,
    subject: data.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
    body: data.body + '\n\nReview sheet: ' + sheetUrl,
    name: 'Philanthropel forms',
  });
  return { ok: true };
}

/** Email one applicant to confirm their application arrived. One address only, plain text. */
function confirm_(data) {
  var to = typeof data.to === 'string' ? data.to.trim() : '';
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) {
    return { ok: false, error: 'malformed recipient' };
  }
  if (typeof data.subject !== 'string' || typeof data.body !== 'string' || !data.subject) {
    return { ok: false, error: 'malformed email' };
  }

  MailApp.sendEmail({
    to: to,
    subject: data.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
    body: data.body,
    name: 'Philanthropel',
  });
  return { ok: true };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
