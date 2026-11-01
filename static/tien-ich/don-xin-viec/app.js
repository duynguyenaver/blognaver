(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const ENCRYPTED = "data.enc.json";
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/17PL7m0_NTkZdWzptHkVewuqPcnTHul5KFIeT0MCHd0A/edit";
  const safe = value => value == null ? "" : String(value);
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = safe(text);
    if (cls) node.className = cls;
    return node;
  };
  let envelope = null;
  let currentKey = "";
  let currentHash = "";
  let fetching = false;
  let previewOnly = false;

  function status(title, description, kind = "") {
    $("syncTitle").textContent = title;
    $("syncDetail").textContent = description;
    $("statusDot").className = "status-dot" + (kind ? " " + kind : "");
  }
  function textOrBlank(value) {
    return safe(value).trim() || " ";
  }
  function writeCell(tr, tag, value, cls, span) {
    const cell = el(tag, textOrBlank(value), cls);
    if (span) cell.colSpan = span;
    tr.append(cell);
    return cell;
  }
  function profileRow(pairs) {
    const row = el("tr");
    pairs.forEach(pair => {
      writeCell(row, "th", pair[0]);
      writeCell(row, "td", pair[1]);
    });
    $("profileRows").append(row);
  }
  function makeProfile(p) {
    $("profileRows").replaceChildren();
    profileRow([["성명 · Họ tên", p.fullName], ["영문성명", p.englishName], ["지원직무", p.targetRole]]);
    profileRow([["생년월일", p.birthDate], ["성별", p.gender], ["국적", p.nationality]]);
    profileRow([["핸드폰", p.phone], ["e-mail", p.email], ["Portfolio", p.portfolio]]);
    const addr = el("tr", undefined, "address");
    writeCell(addr, "th", "주소 · Địa chỉ");
    writeCell(addr, "td", p.address, "", 5);
    $("profileRows").append(addr);
  }
  function tableRows(target, rows, keys, placeholderCount = 1) {
    const tbody = $(target);
    tbody.replaceChildren();
    const list = Array.isArray(rows) && rows.length ? rows : Array.from({length: placeholderCount}, () => ({}));
    for (const item of list) {
      const tr = el("tr");
      keys.forEach((key, i) => writeCell(tr, "td", typeof key === "function" ? key(item) : item[key], i === 0 ? "left" : ""));
      tbody.append(tr);
    }
  }
  function makeEducation(data) {
    const entries = Array.isArray(data) ? data : [];
    const rows = entries.length ? entries : [
      {level: "고등학교"}, {level: "대학교"}, {level: "대학교 (석사)"}, {level: "대학원 (박사)"}
    ];
    tableRows("educationRows", rows, ["level", "start", "end", "school", "major", "graduation", "location"], 4);
    const notes = $("theses"); notes.replaceChildren();
    for (const item of entries) {
      if (item.thesis || item.lab) notes.append(el("div", (item.level || "Học vấn") + " · 졸업논문: " + safe(item.thesis) + "  LAB: " + safe(item.lab), "thesis-line"));
    }
  }
  function makeCareer(data) {
    tableRows("careerRows", data, [
      item => [item.start, item.end].filter(Boolean).join(" ~ "),
      "company", item => item.title || item.role,
      item => item.summary || item.role
    ], 5);
  }
  function makeCertificates(rows) {
    tableRows("certRows", rows, ["name", "grade"], 4);
  }
  function makeLanguages(rows) {
    tableRows("languageRows", rows, [
      "language", item => [item.score, item.exam, item.level].filter(Boolean).join(" · ")
    ], 4);
  }
  function makeMilitary(profile) {
    const rows = [
      ["병역구분", profile.militaryStatus],
      ["면제사유", profile.exemptionReason],
      ["군별", profile.serviceBranch],
      ["보훈여부", profile.veteranStatus]
    ];
    const tbody = $("militaryRows"); tbody.replaceChildren();
    for (const [label, value] of rows) {
      const tr = el("tr");
      writeCell(tr, "th", label);
      writeCell(tr, "td", value);
      tbody.append(tr);
    }
  }
  function sectionTable(headers, values) {
    const table = el("table", undefined, "sheet-table");
    const head = el("thead"), top = el("tr");
    headers.forEach(v => writeCell(top, "th", v));
    head.append(top);
    const body = el("tbody"), r = el("tr");
    values.forEach(v => writeCell(r, "td", v));
    body.append(r); table.append(head, body);
    return table;
  }
  function makeResearch(data) {
    const root = $("researchCards"); root.replaceChildren();
    const items = Array.isArray(data) && data.length ? data : [{}, {}, {}];
    items.forEach(row => {
      const card = el("article", undefined, "research-card");
      card.append(sectionTable(["지원기관명 · Đơn vị", "연구 기간 · Thời gian", "연구 제목 · Đề tài"],
        [row.institution, [row.start, row.end].filter(Boolean).join(" ~ "), row.topic]));
      card.append(el("div", textOrBlank(row.details), "research-desc"));
      root.append(card);
    });
  }
  function makeAwards(data) {
    const root = $("achievements"); root.replaceChildren();
    if (!Array.isArray(data) || !data.length) {
      root.append(el("div", " ", "award-item")); return;
    }
    data.forEach(row => {
      const title = [row.type, row.name, row.year].filter(Boolean).join(" · ");
      const description = [row.issuer, row.description, row.url].filter(Boolean).join("\n");
      root.append(el("div", [title, description].filter(Boolean).join("\n"), "award-item"));
    });
  }
  function makeExperience(data) {
    const root = $("experienceCards"); root.replaceChildren();
    const items = Array.isArray(data) && data.length ? data : [{}, {}, {}, {}];
    items.forEach(row => {
      const card = el("article", undefined, "exp-card");
      card.append(sectionTable(["회사명 · Công ty", "근무 기간 · Thời gian", "주요 업무 · Công việc chính"],
        [row.company, [row.start, row.end].filter(Boolean).join(" ~ "), row.role || row.title]));
      const description = [row.summary, row.details, row.achievements ? "THÀNH TỰU\n" + row.achievements : ""].filter(Boolean).join("\n\n");
      card.append(el("div", textOrBlank(description), "exp-details"));
      root.append(card);
    });
  }
  function makeAdditional(profile, data) {
    const root = $("additional"); root.replaceChildren();
    const items = [
      {title: "자기소개 · Giới thiệu bản thân", body: profile.summary},
      {title: "지원동기 · Mục tiêu nghề nghiệp", body: profile.careerObjective},
      {title: "추가사항 · Ghi chú", body: profile.additional}
    ].filter(item => item.body);
    (Array.isArray(data) ? data : []).forEach(item => items.push(item));
    if (!items.length) {root.append(el("p", " ")); return;}
    items.forEach(item => {
      const block = el("section", undefined, "additional-entry");
      block.append(el("h3", item.title || "기타 · Thông tin khác"));
      block.append(el("p", item.body));
      root.append(block);
    });
  }
  function render(data, blank = false) {
    const profile = blank ? {} : (data.profile || {});
    makeProfile(profile);
    makeEducation(blank ? [] : data.HocVan);
    makeCareer(blank ? [] : data.KinhNghiem);
    makeCertificates(blank ? [] : data.ChungChi);
    makeLanguages(blank ? [] : data.NgoaiNgu);
    makeMilitary(profile);
    makeResearch(blank ? [] : data.NghienCuu);
    makeAwards(blank ? [] : data.ThanhTuu);
    makeExperience(blank ? [] : data.KinhNghiem);
    makeAdditional(profile, blank ? [] : data.BoSung);
    $("cvDocument").hidden = false;
    $("print").disabled = false;
    previewOnly = blank;
    const count = blank ? 0 : [profile.fullName, data.HocVan?.length, data.KinhNghiem?.length].filter(Boolean).length;
    $("previewInfo").textContent = blank ? "Mẫu trắng theo trang 2–5 của PDF Samsung. Nhập dữ liệu trong Google Sheets rồi mở khóa để điền tự động." :
      (count ? "Dữ liệu CV đã đồng bộ · Có thể in hoặc lưu thành PDF A4." : "Nguồn Google Sheets còn trống; hiển thị bố cục chuẩn để bắt đầu nhập dữ liệu.");
  }
  const b64 = val => Uint8Array.from(atob(val), ch => ch.charCodeAt(0));
  async function decrypt(doc, password) {
    if (!doc || doc.version !== 1 || doc.algorithm !== "AES-256-GCM" || !doc.salt || !doc.nonce || !doc.ciphertext) {
      throw Error("Snapshot không đúng phiên bản hoặc bị hỏng.");
    }
    const passkey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const aes = await crypto.subtle.deriveKey({
      name: "PBKDF2", hash: "SHA-256", salt: b64(doc.salt), iterations: doc.iterations || 310000
    }, passkey, {name: "AES-GCM", length: 256}, false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({name: "AES-GCM", iv: b64(doc.nonce)}, aes, b64(doc.ciphertext));
    const data = JSON.parse(new TextDecoder().decode(raw));
    if (data.version !== 1 || !data.profile || !Array.isArray(data.KinhNghiem)) throw Error("Định dạng hồ sơ không hợp lệ");
    return data;
  }
  async function apply(password, remember = false) {
    const data = await decrypt(envelope, password);
    currentKey = password;
    currentHash = envelope.sourceHash || "";
    render(data);
    $("unlockPanel").hidden = true;
    $("lock").hidden = false;
    $("unlockError").textContent = "";
    if (remember && window.BNDeviceSecrets) await window.BNDeviceSecrets.save("don-xin-viec-passphrase", password);
    status("Đã đồng bộ và mở khóa Đơn xin việc", "Bản mã hóa: " + (envelope.updatedAt || "Chưa rõ thời gian") + ". Nguồn duy nhất: Google Sheets.", "ok");
  }
  async function fetchEnvelope() {
    if (fetching) return;
    fetching = true;
    try {
      if (!currentKey) status("Đang kiểm tra bản đồng bộ...", "Kiểm tra snapshot mã hóa được phát hành trên GitHub Pages.");
      const response = await fetch(ENCRYPTED + "?v=" + Date.now(), {cache: "no-store"});
      if (!response.ok) throw Error(response.status === 404 ?
        "Chưa có snapshot. Cần cấu hình 2 GitHub Secrets, chia sẻ Sheet với Service Account và chạy workflow." :
        "GitHub Pages trả HTTP " + response.status);
      const received = await response.json();
      if (!received || received.version !== 1 || !received.ciphertext) throw Error("Bản mã hóa không hợp lệ.");
      envelope = received;
      if (currentKey) {
        if (currentHash === received.sourceHash) {
          status("Đã kiểm tra · Chưa có bản dữ liệu mới", "Đang xem bản mới nhất được phát hành. GitHub Actions kiểm tra định kỳ, không phải thời gian thực.", "ok");
          return;
        }
        try { await apply(currentKey); }
        catch { currentKey = ""; $("unlockPanel").hidden = false; status("Bản mã hóa mới cần mở khóa", "Hãy nhập lại mật khẩu.", "bad"); }
        return;
      }
      status("Đã tìm thấy bản Đơn xin việc mã hóa", "Cập nhật: " + (received.updatedAt || "—") + ". Hãy mở khóa để xem CV.", "ok");
      if (window.BNDeviceSecrets) {
        const remembered = await window.BNDeviceSecrets.read("don-xin-viec-passphrase");
        if (remembered) {
          try { await apply(remembered); } catch {
            status("Bản đã có nhưng chưa mở khóa", "Mật khẩu đã nhớ không giải mã được snapshot hiện tại.", "bad");
          }
        }
      }
    } catch (error) {
      status("Chưa thể tải dữ liệu Đơn xin việc", error.message, "bad");
    } finally { fetching = false; }
  }
  $("refresh").addEventListener("click", fetchEnvelope);
  $("blankPreview").addEventListener("click", () => {
    render({}, true);
    if (!currentKey) status("Đang xem mẫu Đơn xin việc trống", "Không có thông tin cá nhân được hiển thị trong bản mẫu.", "ok");
    $("cvDocument").scrollIntoView({behavior: "smooth", block: "start"});
  });
  $("print").addEventListener("click", () => {
    if (!$("cvDocument").hidden) window.print();
  });
  $("unlockForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!envelope) {
      $("unlockError").textContent = "Chưa có dữ liệu mã hóa. Hãy chạy GitHub Actions sau khi cấu hình Service Account.";
      return;
    }
    const form = event.currentTarget, button = form.querySelector("button");
    button.disabled = true;
    try {
      await apply($("passphrase").value, $("remember").checked);
      $("passphrase").value = "";
    } catch {
      $("unlockError").textContent = "Mật khẩu không đúng hoặc bản mã hóa bị lỗi.";
    } finally {button.disabled = false;}
  });
  $("lock").addEventListener("click", async () => {
    currentKey = ""; currentHash = ""; previewOnly = false;
    $("cvDocument").hidden = true; $("print").disabled = true;
    $("unlockPanel").hidden = false; $("lock").hidden = true;
    $("remember").checked = false; $("passphrase").value = "";
    if (window.BNDeviceSecrets) await window.BNDeviceSecrets.forget("don-xin-viec-passphrase");
    status("Đã khóa và quên mật khẩu Đơn xin việc", "Không còn hiển thị thông tin hồ sơ cá nhân.", "ok");
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchEnvelope(); });
  setInterval(() => { if (!document.hidden) fetchEnvelope(); }, 45000);
  fetchEnvelope();
})();