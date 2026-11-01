/**
 * BlogNaver · Chi phí tháng: private Google Sheets → GitHub encrypted snapshot.
 *
 * Install in the OWNER'S spreadsheet: Extensions → Apps Script.
 * Script properties (Project Settings):
 *   FINANCE_SYNC_TOKEN = strong randomly generated secret (>= 32 characters)
 *   GITHUB_DISPATCH_TOKEN = optional owner GitHub PAT, Actions: read/write, for fast onEdit dispatch.
 *
 * The same FINANCE_SYNC_TOKEN must be saved as GitHub Actions secret
 * MONTHLY_EXPENSES_APPS_SCRIPT_TOKEN.
 *
 * Deploy as Web app / Execute as: Me / Who has access: Anyone.
 * This endpoint is NOT public data: doGet returns no records and doPost
 * refuses missing/incorrect tokens. Keep deployment access to script editors restricted.
 */
const FINANCE_SHEET_ID = "1gxikPCOe62Be2_Lp5n3m6HMfCdnh-8WT5apJZeEvM7E";
const FINANCE_TABS = Object.freeze({
  chiphithang: { columns: 8, headers: ["Ngày", "Loại", "Danh mục", "Nội dung", "Số tiền (VND)", "Phương thức", "Ghi chú", "Mã giao dịch"] },
  ngansach: { columns: 3, headers: ["Tháng (YYYY-MM)", "Ngân sách (VND)", "Ghi chú"] }
});
const FINANCE_DISPATCH_URL = "https://api.github.com/repos/duynguyenaver/blognaver/actions/workflows/monthly-expenses-sync.yml/dispatches";

function financeJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return financeJson_({ ok: true, service: "BlogNaver finance bridge", data: "private" });
}

/** Constant-work comparison (requires same length); never log supplied/expected tokens. */
function financeMatches_(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  var mismatch = provided.length ^ expected.length;
  var limit = Math.max(provided.length, expected.length);
  for (var i = 0; i < limit; i++) {
    mismatch |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

/** POST JSON {"token": "..."}; token must never be sent in query parameters. */
function doPost(event) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty("FINANCE_SYNC_TOKEN") || "";
  if (expected.length < 32) return financeJson_({ ok: false, error: "not_configured" });
  if (!event || !event.postData || !event.postData.contents ||
      event.postData.contents.length > 4096) {
    return financeJson_({ ok: false, error: "invalid_request" });
  }
  var request;
  try { request = JSON.parse(event.postData.contents); }
  catch (_) { return financeJson_({ ok: false, error: "invalid_json" }); }
  if (!request || !financeMatches_(request.token, expected)) {
    return financeJson_({ ok: false, error: "unauthorized" });
  }

  try {
    var book = SpreadsheetApp.openById(FINANCE_SHEET_ID);
    var output = {};
    Object.keys(FINANCE_TABS).forEach(function(name) {
      var sheet = book.getSheetByName(name);
      if (!sheet) throw new Error("missing_tab");
      var spec = FINANCE_TABS[name];
      if (sheet.getLastRow() > 10001) throw new Error("too_many_rows");
      var values = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), spec.columns)
        .getDisplayValues();
      if (JSON.stringify(values[0]) !== JSON.stringify(spec.headers)) {
        throw new Error("headers_changed");
      }
      output[name] = values;
    });
    return financeJson_({ ok: true, schema: 1, spreadsheetId: FINANCE_SHEET_ID, tables: output });
  } catch (_) {
    // Never return spreadsheet values, credentials or exception details.
    return financeJson_({ ok: false, error: "sheet_read_failed" });
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Chi phí tháng")
    .addItem("Cài đặt tự đồng bộ GitHub", "installMonthlyExpensesTriggers")
    .addItem("Đồng bộ ngay", "dispatchMonthlyExpenses")
    .addToUi();
}

function installMonthlyExpensesTriggers() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== FINANCE_SHEET_ID) {
    throw new Error("Mở Apps Script từ đúng Google Sheet chiphithang.");
  }
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "monthlyExpensesOnEdit") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("monthlyExpensesOnEdit").forSpreadsheet(book).onEdit().create();
  SpreadsheetApp.getUi().alert(
    "Đã cài onEdit. Khi sửa tab chiphithang hoặc ngansach, script sẽ kích hoạt workflow " +
    "nếu đã lưu GITHUB_DISPATCH_TOKEN. Ngoài ra workflow GitHub vẫn kiểm tra 15 phút/lần."
  );
}

function monthlyExpensesOnEdit(event) {
  if (!event || !event.range) return;
  var sheet = event.range.getSheet();
  if (!FINANCE_TABS[sheet.getName()] ||
      sheet.getParent().getId() !== FINANCE_SHEET_ID) return;
  dispatchMonthlyExpenses();
}

function dispatchMonthlyExpenses() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("GITHUB_DISPATCH_TOKEN");
  if (!token) {
    console.log("No GITHUB_DISPATCH_TOKEN; scheduled GitHub Actions sync remains available.");
    return;
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1500)) return;
  try {
    var now = Date.now();
    var previous = Number(props.getProperty("last_finance_dispatch") || "0");
    if (now - previous < 60000) return;
    var response = UrlFetchApp.fetch(FINANCE_DISPATCH_URL, {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      payload: JSON.stringify({ ref: "main" }),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 204) {
      throw new Error("GitHub dispatch failed with HTTP " + response.getResponseCode());
    }
    props.setProperty("last_finance_dispatch", String(now));
    console.log("Finance workflow dispatched successfully.");
  } finally {
    lock.releaseLock();
  }
}
