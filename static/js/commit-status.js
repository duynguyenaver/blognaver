(() => {
  "use strict";
  const root = document.querySelector("[data-commit-status]");
  if (!root) return;
  const endpoint = "https://api.github.com/repos/duynguyenaver/blognaver/actions/runs?branch=main&per_page=6";
  const runsEl = root.querySelector("[data-runs]");
  const feedback = root.querySelector("[data-feedback]");
  const updated = root.querySelector("[data-updated]");
  const refresh = root.querySelector("[data-refresh]");
  const labels = {
    queued: "Đang xếp hàng", pending: "Đang chờ", waiting: "Chờ phê duyệt",
    requested: "Đã yêu cầu", in_progress: "Đang chạy",
    success: "Thành công", failure: "Thất bại", cancelled: "Đã hủy",
    timed_out: "Quá thời gian", action_required: "Cần xử lý",
    skipped: "Bỏ qua", neutral: "Hoàn tất"
  };
  let busy = false, lastSuccess = 0;
  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function validURL(value, type) {
    const prefix = type === "run"
      ? "https://github.com/duynguyenaver/blognaver/actions/runs/"
      : "https://github.com/duynguyenaver/blognaver/commit/";
    return typeof value === "string" && value.startsWith(prefix) ? value : null;
  }
  async function load() {
    if (busy || document.hidden) return;
    busy = true;
    refresh.disabled = true;
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) throw new Error("GitHub API đang giới hạn yêu cầu. Dữ liệu cũ được giữ lại.");
        throw new Error("Không lấy được trạng thái GitHub (HTTP " + response.status + ").");
      }
      const data = await response.json();
      if (!Array.isArray(data.workflow_runs)) throw new Error("Dữ liệu GitHub không hợp lệ.");
      const fragment = document.createDocumentFragment();
      for (const run of data.workflow_runs.slice(0, 6)) {
        const line = make("div", "bn-commit-run");
        const sha = typeof run.head_sha === "string" ? run.head_sha.slice(0, 8) : "—";
        const shaLink = make("a", "bn-commit-sha", sha);
        const commitHref = validURL("https://github.com/duynguyenaver/blognaver/commit/" + (run.head_sha || ""), "commit");
        if (commitHref) { shaLink.href = commitHref; shaLink.target = "_blank"; shaLink.rel = "noopener noreferrer"; }
        const info = make("div");
        const title = make("div", "bn-commit-title", run.display_title || run.head_commit?.message?.split("\n")[0] || "GitHub workflow");
        title.title = title.textContent;
        const meta = make("div", "bn-commit-meta", "#" + (run.run_number || run.id) + " · " + (run.head_branch || "main"));
        info.append(title, meta);
        const status = run.status === "completed" ? (run.conclusion || "neutral") : (run.status || "pending");
        const badge = make("a", "bn-commit-state", labels[status] || status);
        badge.dataset.state = status;
        const runHref = validURL(run.html_url, "run");
        if (runHref) { badge.href = runHref; badge.target = "_blank"; badge.rel = "noopener noreferrer"; }
        line.append(shaLink, info, badge);
        fragment.append(line);
      }
      runsEl.replaceChildren(fragment);
      feedback.textContent = data.workflow_runs.length ? "6 lần chạy gần nhất (hoặc ít hơn nếu chưa đủ dữ liệu)." : "Chưa có workflow runs.";
      lastSuccess = Date.now();
      updated.textContent = "Cập nhật: " + new Date(lastSuccess).toLocaleTimeString("vi-VN") + " · Tự làm mới mỗi 90 giây khi tab đang mở.";
    } catch (error) {
      feedback.textContent = error instanceof Error ? error.message : "Không thể kết nối GitHub API.";
      if (!lastSuccess) updated.textContent = "Mở GitHub Actions để kiểm tra trạng thái trực tiếp.";
    } finally {
      busy = false;
      refresh.disabled = false;
    }
  }
  refresh.addEventListener("click", load);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - lastSuccess > 45000) load();
  });
  load();
  setInterval(load, 90000);
})();