import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync("static/tien-ich/chi-phi-thang/finance-report.js", "utf8");
const window = {};
vm.runInNewContext(source, { window, document: {} }, { filename: "finance-report.js" });
const analyze = window.BNFinanceReport.financialSummary;
const month = "2026-11";
const data = [
  { date: "2026-11-01", type: "Thu", amount: 5000000, category: "Lương" },
  { date: "2026-11-03", type: "Chi", amount: 1000000, category: "Ăn uống" },
  { date: "2026-11-03", type: "Chi", amount: 1000000, category: "Ăn uống" },
  { date: "2026-10-30", type: "Chi", amount: 900000, category: "Khác" }
];
const report = analyze(month, data, { "2026-11": 3000000 }, new Date(2026, 10, 7));
assert.equal(report.income, 5000000);
assert.equal(report.spent, 2000000);
assert.equal(report.net, 3000000);
assert.equal(report.budget, 3000000);
assert.equal(report.savingsRate, 60);
assert.equal(report.elapsed, 7);
assert.equal(Math.round(report.average), 285714);
assert.equal(report.daily[0].total, 0);
assert.equal(report.daily[2].total, 5000000);
assert.equal(report.daily[3].total, 3000000);
assert.equal(report.daily[30].total, 3000000);
assert.equal(report.cats[0][0], "Ăn uống");
assert.equal(report.cats[0][1], 2000000);
assert.equal(report.transactions, 3);
const future = analyze("2026-12", data, {}, new Date(2026, 10, 7));
assert.equal(future.average, null);
assert.equal(future.savingsRate, null);
assert.equal(future.transactions, 0);
const leap = analyze("2028-02", [{ date: "2028-02-29", type: "Chi", amount: 1, category: "A" }], {}, new Date(2028, 2, 2));
assert.equal(leap.days, 29);
assert.equal(leap.daily[29].total, -1);
assert.throws(() => analyze("2026-13", [], {}));
console.log("Finance report analytics regression checks passed.");
