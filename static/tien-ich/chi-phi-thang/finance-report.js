/* BlogNaver Finance Report — zero external chart dependencies, local decrypted data only. */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const COLOURS = ["#087d6c", "#4075bb", "#735fba", "#d8a149", "#cb6778", "#3aa6b1", "#65768d"];
  const rawMoney = value => Math.round(Number(value) || 0).toLocaleString("vi-VN") + " ₫";
  const monthValid = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

  function financialSummary(month, transactions, budgets, current = new Date()) {
    if (!monthValid(month)) throw new Error("Invalid report month");
    const periodRows = transactions.filter(row => row.date.slice(0, 7) === month);
    const spent = periodRows.filter(row => row.type === "Chi").reduce((s, x) => s + x.amount, 0);
    const income = periodRows.filter(row => row.type === "Thu").reduce((s, x) => s + x.amount, 0);
    const [year, m] = month.split("-").map(Number);
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const thisMonth = current.getFullYear() + "-" + String(current.getMonth() + 1).padStart(2, "0");
    const elapsed = month > thisMonth ? 0 : month === thisMonth ? Math.min(days, current.getDate()) : days;
    const dateTotals = new Map();
    const byCategory = new Map();
    for (const row of periodRows) {
      const d = Number(row.date.slice(-2));
      if (d < 1 || d > days) continue;
      const amount = row.type === "Thu" ? row.amount : -row.amount;
      dateTotals.set(d, (dateTotals.get(d) || 0) + amount);
      if (row.type === "Chi") byCategory.set(row.category, (byCategory.get(row.category) || 0) + row.amount);
    }
    const daily = [{ day: 0, total: 0 }];
    let total = 0;
    for (let d = 1; d <= days; d++) {
      total += dateTotals.get(d) || 0;
      daily.push({ day: d, total });
    }
    const cats = [...byCategory].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"));
    return {
      month, spent, income, net: income - spent, days, elapsed,
      average: elapsed > 0 ? spent / elapsed : null,
      savingsRate: income > 0 ? 100 * (income - spent) / income : null,
      budget: Number(budgets[month] || 0),
      transactions: periodRows.length, daily, cats
    };
  }

  const s = (name, attrs = {}, content) => {
    const node = document.createElementNS(NS, name);
    for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, String(val));
    if (content !== undefined) node.textContent = String(content);
    return node;
  };
  const set = (id, str) => { const node = $(id); if (node) node.textContent = str; };
  const compact = value => {
    const n = Math.abs(value);
    const sign = value < 0 ? "−" : "";
    return sign + (n >= 1000000000 ? (n / 1000000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tỷ"
      : n >= 1000000 ? (n / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr"
      : n >= 1000 ? (n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + "k" : n.toLocaleString("vi-VN"));
  };

  function renderCashflow(data) {
    const svg = $("cashflowChart");
    if (!svg) return;
    svg.replaceChildren();
    const hasRows = data.transactions > 0;
    $("cashflowEmpty").hidden = hasRows;
    svg.hidden = !hasRows;
    set("cashflowPeriod", "Tháng " + data.month.slice(5) + "/" + data.month.slice(0, 4));
    set("cashflowAxisStart", "01/" + data.month.slice(5));
    set("cashflowAxisEnd", String(data.days).padStart(2, "0") + "/" + data.month.slice(5));
    if (!hasRows) return;

    const points = data.daily;
    const W = 760, H = 240, L = 62, R = 18, T = 18, B = 35;
    const lo = Math.min(0, ...points.map(x => x.total));
    const hi = Math.max(0, ...points.map(x => x.total));
    const span = Math.max(1, hi - lo);
    const pad = span * 0.15;
    const minY = lo - pad, maxY = hi + pad, range = maxY - minY;
    const xp = d => L + d / data.days * (W - L - R);
    const yp = v => T + (maxY - v) / range * (H - T - B);
    const zero = yp(0);
    const labels = [0, 0.25, 0.5, 0.75, 1];

    const title = s("title", {}, "Dòng tiền ròng tích lũy trong tháng " + data.month + ": " + rawMoney(data.net));
    const defs = s("defs"), grad = s("linearGradient", { id: "bnFinanceAreaGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
    grad.append(s("stop", { offset: "0%", "stop-color": "#119c87", "stop-opacity": ".27" }),
                s("stop", { offset: "100%", "stop-color": "#119c87", "stop-opacity": ".015" }));
    defs.append(grad);
    svg.append(title, defs);
    for (const ratio of labels) {
      const value = minY + ratio * range;
      const y = yp(value);
      svg.append(s("line", { x1: L, x2: W - R, y1: y, y2: y, class: "cash-grid-line" }));
      svg.append(s("text", { x: L - 11, y: y + 4, "text-anchor": "end", class: "cash-axis-text" }, compact(value)));
    }
    svg.append(s("line", { x1: L, x2: W - R, y1: zero, y2: zero, class: "cash-zero-line" }));
    const path = points.map((pt, i) => (i ? "L" : "M") + xp(pt.day).toFixed(2) + " " + yp(pt.total).toFixed(2)).join(" ");
    const area = path + " L" + xp(data.days).toFixed(2) + " " + zero.toFixed(2) + " L" + L + " " + zero.toFixed(2) + " Z";
    svg.append(s("path", { d: area, fill: "url(#bnFinanceAreaGradient)" }));
    svg.append(s("path", { d: path, class: "cash-line" }));
    const last = points[points.length - 1];
    const dot = s("circle", { cx: xp(last.day), cy: yp(last.total), r: 5.5, class: "cash-end-dot" });
    dot.append(s("title", {}, "Dòng tiền ròng cuối tháng: " + rawMoney(last.total)));
    svg.append(dot);
    for (const day of [1, Math.ceil(data.days / 2), data.days]) {
      svg.append(s("text", { x: xp(day), y: H - 8, "text-anchor": day === 1 ? "start" : day === data.days ? "end" : "middle", class: "cash-axis-text" }, String(day).padStart(2, "0")));
    }
  }

  function renderDonut(data) {
    const svg = $("categoryDonut");
    if (!svg) return;
    for (const item of svg.querySelectorAll(".donut-segment")) item.remove();
    set("donutTotal", compact(data.spent) + " ₫");
    if (!data.spent || !data.cats.length) {
      svg.setAttribute("aria-label", "Chưa có chi phí để phân bổ theo danh mục");
      return;
    }
    const take = data.cats.length > COLOURS.length ? COLOURS.length - 1 : COLOURS.length;
    const visible = data.cats.slice(0, take);
    if (data.cats.length > take) visible.push(["Khác", data.cats.slice(take).reduce((a, x) => a + x[1], 0)]);
    const r = 67, circumference = 2 * Math.PI * r;
    let start = 0;
    for (let i = 0; i < visible.length; i++) {
      const [name, amount] = visible[i];
      const length = circumference * amount / data.spent;
      const circle = s("circle", {
        cx: 100, cy: 100, r, fill: "none", stroke: COLOURS[i],
        "stroke-width": 25, "stroke-dasharray": length + " " + (circumference - length),
        "stroke-dashoffset": -start, transform: "rotate(-90 100 100)", class: "donut-segment"
      });
      circle.append(s("title", {}, name + ": " + rawMoney(amount) + " (" + Math.round(100 * amount / data.spent) + "%)"));
      svg.append(circle);
      start += length;
    }
    svg.setAttribute("aria-label", "Phân bổ " + rawMoney(data.spent) + " trên " + data.cats.length + " danh mục");
  }

  function render(payload) {
    const { month, transactions, budgets } = payload;
    const data = financialSummary(month, transactions, budgets);
    const format = payload.money || rawMoney;
    set("reportPeriod", "tháng " + month.slice(5) + "/" + month.slice(0, 4));
    set("reportUpdated", payload.updatedAt ? new Date(payload.updatedAt).toLocaleString("vi-VN") : "Bản mới nhất đã mở khóa");
    set("cashIn", format(data.income));
    set("cashOut", format(data.spent));
    set("cashNet", format(data.net));
    set("sixMonthSpent", format(Array.from({ length: 6 }, (_, i) => {
      const m = payload.monthOffset(month, i - 5);
      return transactions.filter(r => r.date.slice(0, 7) === m && r.type === "Chi")
        .reduce((n, r) => n + r.amount, 0);
    }).reduce((n, v) => n + v, 0)));
    set("sixMonthIncome", format(Array.from({ length: 6 }, (_, i) => {
      const m = payload.monthOffset(month, i - 5);
      return transactions.filter(r => r.date.slice(0, 7) === m && r.type === "Thu")
        .reduce((n, r) => n + r.amount, 0);
    }).reduce((n, v) => n + v, 0)));
    set("savingsRate", data.savingsRate == null ? "—" : data.savingsRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "%");
    set("savingsRateNote", data.income ? "Tỷ lệ (Thu − Chi) / Thu" : "Chỉ tính khi có thu nhập trong tháng");
    set("averageDaily", data.average == null ? "—" : format(data.average));
    set("averageDailyNote", data.elapsed ? "Tính trên " + data.elapsed + " ngày của kỳ báo cáo" : "Tháng tương lai chưa bắt đầu");
    set("topCategory", data.cats.length ? data.cats[0][0] : "—");
    set("topCategoryNote", data.cats.length ? format(data.cats[0][1]) + " · " + Math.round(100 * data.cats[0][1] / data.spent) + "% tổng chi" : "Chưa có khoản chi");
    if (data.transactions === 0) {
      set("financialPulse", "Chưa có giao dịch trong tháng này. Các chỉ số sẽ tự tính từ dữ liệu Google Sheets sau đồng bộ.");
    } else if (data.budget > 0 && data.spent > data.budget) {
      set("financialPulse", "Cảnh báo: tổng chi đang vượt ngân sách " + format(data.spent - data.budget) + ". Xem danh mục và sổ giao dịch để rà soát.");
    } else if (data.income > 0) {
      set("financialPulse", data.net >= 0
        ? "Dòng tiền thuần đang dương " + format(data.net) + ". Chi tiêu chiếm " + Math.round(100 * data.spent / data.income) + "% thu nhập."
        : "Dòng tiền thuần đang âm " + format(-data.net) + ". Chi tiêu trong kỳ cao hơn thu nhập được ghi nhận.");
    } else {
      set("financialPulse", "Đã ghi nhận " + data.transactions + " giao dịch, nhưng chưa có khoản thu. Dòng tiền được tính trên dữ liệu đã nhập.");
    }
    renderCashflow(data);
    renderDonut(data);
  }

  window.BNFinanceReport = { render, financialSummary };
})();