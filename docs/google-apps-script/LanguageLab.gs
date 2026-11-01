/**
 * BlogNaver Language Lab — optional Apps Script bound to the owner's viethananh Sheet.
 * Install in Extensions > Apps Script, run installLanguageLabTriggers once.
 * Project Settings > Script properties:
 * GITHUB_DISPATCH_TOKEN = fine-grained PAT with Actions:Read/Write for blognaver.
 * NEVER put tokens in this source, the public Sheet or the public BlogNaver repo.
 */
const BN_SHEET_ID = "19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk";
const BN_TAB = "Sheet1";
const BN_SNAPSHOT = "https://duynguyenaver.github.io/blognaver/tien-ich/hoc-tieng-viet-han-anh/vocabulary.json";
const BN_DISPATCH = "https://api.github.com/repos/duynguyenaver/blognaver/actions/workflows/trilingual-vocabulary-sync.yml/dispatches";
const BN_WRITEBACK_INTERVAL_MS = 2 * 60 * 1000; // effective ~2-minute polling

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Language Lab")
    .addItem("Cài đặt tự đồng bộ", "installLanguageLabTriggers")
    .addItem("Ghi ngữ cảnh Gemini vào cột D–E", "languageLabWriteBack")
    .addToUi();
}

function installLanguageLabTriggers() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== BN_SHEET_ID) throw new Error("Mở Apps Script từ đúng Google Sheets viethananh.");
  for (const t of ScriptApp.getProjectTriggers()) {
    if (["languageLabOnEdit", "languageLabWriteBack", "languageLabWriteBackTick"].includes(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
    }
  }
  ScriptApp.newTrigger("languageLabOnEdit").forSpreadsheet(book).onEdit().create();
  // everyMinutes(2) is invalid in Apps Script; run a 1-minute clock with an elapsed-time gate.
  ScriptApp.newTrigger("languageLabWriteBackTick").timeBased().everyMinutes(1).create();
  SpreadsheetApp.getUi().alert("Đã cài trigger: sửa cột A–C sẽ yêu cầu GitHub đồng bộ (nếu đã thiết lập token); khoảng mỗi 2 phút ghi kết quả Gemini có sẵn vào D–E. Token phải lưu trong Script properties.");
}

function languageLabOnEdit(event) {
  if (!event || !event.range) return;
  const range = event.range, sheet = range.getSheet();
  if (sheet.getName() !== BN_TAB || sheet.getParent().getId() !== BN_SHEET_ID
      || range.getLastRow() < 2 || range.getColumn() > 3) return;
  const settings = PropertiesService.getScriptProperties();
  const token = settings.getProperty("GITHUB_DISPATCH_TOKEN");
  if (!token) {
    console.log("No dispatch token. Public reading of A–C still works; scheduled GitHub sync will enrich later.");
    return;
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;
  try {
    const now = Date.now(), last = Number(settings.getProperty("last_language_dispatch") || "0");
    if (now - last < 30000) return;
    const response = UrlFetchApp.fetch(BN_DISPATCH, {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      payload: JSON.stringify({ref: "main"}),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 204) {
      throw new Error("GitHub workflow dispatch HTTP " + response.getResponseCode()
        + " " + response.getContentText().slice(0, 140));
    }
    settings.setProperty("last_language_dispatch", String(now));
  } finally {
    lock.releaseLock();
  }
}

/** Installed timer runs every minute; effective writeback at most once per 2 minutes.
 * The Sheets menu keeps calling languageLabWriteBack() directly to allow manual checks.
 * Script timers are best-effort; they do not guarantee second-precise delivery.
 */
function languageLabWriteBackTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const last = Number(props.getProperty("last_language_writeback_poll") || "0");
    if (now - last < BN_WRITEBACK_INTERVAL_MS) return;
    props.setProperty("last_language_writeback_poll", String(now));
  } finally {
    lock.releaseLock();
  }
  languageLabWriteBack();
}

function languageLabWriteBack() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book || book.getId() !== BN_SHEET_ID) throw new Error("Wrong spreadsheet");
  const sheet = book.getSheetByName(BN_TAB);
  if (!sheet) throw new Error("Missing Sheet1");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const header = sheet.getRange(1, 1, 1, 5).getDisplayValues()[0].map(v => v.trim().toLowerCase());
    if (!header[0].startsWith("việt") || !header[1].startsWith("hàn")
        || !header[2].startsWith("anh") || !header[3].startsWith("context")
        || !header[4].startsWith("ngữ pháp")) {
      throw new Error("Headers changed: refusing writeback");
    }
    const answer = UrlFetchApp.fetch(BN_SNAPSHOT + "?v=" + Date.now(), {
      muteHttpExceptions: true, headers: {"Cache-Control": "no-cache"}
    });
    if (answer.getResponseCode() !== 200) throw new Error("Snapshot HTTP " + answer.getResponseCode());
    const data = JSON.parse(answer.getContentText());
    if (!data || !Array.isArray(data.items)) throw new Error("Snapshot is invalid");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const cells = sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues();
    const sourceRows = new Map();
    for (const item of data.items) {
      if (item.sheetId !== BN_SHEET_ID || item.tabTitle !== BN_TAB
          || item.aiStatus !== "ready" || !item.context || !item.grammar) continue;
      if (!Number.isInteger(item.row) || item.row < 2 || item.row > lastRow) continue;
      sourceRows.set(item.row, item);
    }
    let updated = 0;
    for (const [row, item] of sourceRows) {
      const values = cells[row - 2];
      if ([item.vi, item.ko, item.en].some((value, index) =>
        String(value || "").trim() !== values[index].trim())) continue;
      const examples = item.examples || {};
      const sample = ["vi", "ko", "en"].filter(k => examples[k])
        .map(k => ({vi: "VI", ko: "KR", en: "EN"})[k] + ": " + examples[k]).join("\n");
      if (!values[3].trim()) {
        sheet.getRange(row, 4).setValue(String(item.context));
        updated++;
      }
      if (!values[4].trim()) {
        sheet.getRange(row, 5).setValue(String(item.grammar) + (sample ? "\n\n" + sample : ""));
        updated++;
      }
    }
    PropertiesService.getScriptProperties().setProperty(
      "last_language_writeback", JSON.stringify({at: new Date().toISOString(), updatedCells: updated})
    );
    console.log("Language Lab writeback completed; filled cells: " + updated);
  } finally {
    lock.releaseLock();
  }
}
