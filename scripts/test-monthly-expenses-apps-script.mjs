// Regression coverage for Apps Script triggers; no Google/GitHub credentials needed.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sheetId = "1gxikPCOe62Be2_Lp5n3m6HMfCdnh-8WT5apJZeEvM7E";
const triggers = [];
const requests = [];
const properties = new Map([["GITHUB_DISPATCH_TOKEN", "test-token-only"]]);
let clock = 1_800_000_000_000;
const MockDate = class extends Date { static now() { return clock; } };
const sourceBook = { getId: () => sheetId };
const sourceSheet = { getName: () => "chiphithang", getParent: () => sourceBook };
const otherSheet = { getName: () => "unrelated", getParent: () => sourceBook };
const scriptApp = {
  getProjectTriggers: () => [...triggers],
  deleteTrigger: trigger => {
    const i = triggers.indexOf(trigger);
    if (i >= 0) triggers.splice(i, 1);
  },
  newTrigger: handler => {
    const trigger = { getHandlerFunction: () => handler, handler };
    const builder = {
      forSpreadsheet: () => builder,
      onEdit: () => builder,
      onChange: () => builder,
      timeBased: () => builder,
      after: ms => { assert.ok(ms >= 60000); return builder; },
      create: () => { triggers.push(trigger); return trigger; }
    };
    return builder;
  }
};
const context = vm.createContext({
  Date: MockDate,
  console: { log: () => {} },
  ScriptApp: scriptApp,
  SpreadsheetApp: {
    getActiveSpreadsheet: () => sourceBook,
    getUi: () => ({ alert: () => {} })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: name => properties.get(name) || null,
      setProperty: (name, value) => { properties.set(name, value); }
    })
  },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
  UrlFetchApp: {
    fetch: (url, options) => {
      assert.ok(url.endsWith("/monthly-expenses-sync.yml/dispatches"));
      assert.equal(options.method, "post");
      assert.equal(JSON.parse(options.payload).ref, "main");
      requests.push({ url, options });
      return { getResponseCode: () => 204 };
    }
  },
  ContentService: { MimeType: { JSON: "json" } }
});
vm.runInContext(fs.readFileSync("docs/google-apps-script/MonthlyExpenses.gs", "utf8"), context);

vm.runInContext("installMonthlyExpensesTriggers()", context);
assert.deepEqual(triggers.map(x => x.handler).sort(),
  ["monthlyExpensesOnChange", "monthlyExpensesOnEdit"]);

context.onEditEvent = { range: { getSheet: () => sourceSheet } };
context.unrelatedEdit = { range: { getSheet: () => otherSheet } };
context.changeEvent = { source: sourceBook, changeType: "INSERT_ROW" };
vm.runInContext("monthlyExpensesOnEdit(onEditEvent)", context);
assert.equal(requests.length, 1, "first existing-row edit must dispatch");

clock += 1000;
vm.runInContext("monthlyExpensesOnEdit(onEditEvent)", context);
vm.runInContext("monthlyExpensesOnEdit(onEditEvent)", context);
assert.equal(requests.length, 1, "burst must coalesce");
assert.equal(triggers.filter(x => x.handler === "flushMonthlyExpensesDispatch").length, 1,
  "burst must queue a single trailing dispatch");

vm.runInContext("flushMonthlyExpensesDispatch()", context);
assert.equal(requests.length, 2, "queued edit must dispatch, not disappear");
assert.equal(triggers.filter(x => x.handler === "flushMonthlyExpensesDispatch").length, 0,
  "trailing trigger must be deleted after use");

clock += 1000;
vm.runInContext("monthlyExpensesOnChange(changeEvent)", context);
assert.equal(triggers.filter(x => x.handler === "flushMonthlyExpensesDispatch").length, 1,
  "structural change should also schedule sync");

vm.runInContext("monthlyExpensesOnEdit(unrelatedEdit)", context);
assert.equal(triggers.filter(x => x.handler === "flushMonthlyExpensesDispatch").length, 1,
  "unrelated tab must not add work");

vm.runInContext("dispatchMonthlyExpenses()", context);
assert.equal(requests.length, 3, "manual sync menu must bypass the edit throttle");
console.log("Monthly expenses onEdit/onChange and trailing dispatch regression checks passed.");
