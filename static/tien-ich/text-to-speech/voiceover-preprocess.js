/* BlogNaver Voiceover Preprocessor — deterministic client-side, no Gemini/API. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const raw = $("voiceoverRaw");
  const output = $("voiceoverOutput");
  const run = $("voiceoverProcess");
  const copy = $("voiceoverCopy");
  const send = $("voiceoverToTts");
  const feedback = $("voiceoverStatus");
  const tts = $("script");
  if (!raw || !output || !run || !copy || !send || !feedback || !tts) return;

  function normalizeInput(text) {
    let result = String(text || "").normalize("NFC")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ");

    // Support pasted HTML source without executing it.
    if (/<(?:article|p|div|section|h[1-6]|br|script|style)\b/i.test(result)) {
      result = result.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<(?:br|hr)\s*\/?\s*>/gi, "\n")
        .replace(/<\/(?:p|div|section|article|h[1-6]|li)>/gi, "\n\n");
      const parsed = new DOMParser().parseFromString(result, "text/html");
      result = parsed.body.textContent || "";
    }
    return result
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
      .replace(/^\s*\[\^?\d+\]\s*:\s*.*$/gm, "")
      .replace(/\[\^?\d+\](?=[\s.,;!?]|$)/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/^`{3}[\s\S]*?^`{3}\s*$/gm, "")
      .replace(/^`?([^\n`]+)`?$/gm, "$1");
  }

  const dateRe = /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}(?:\s+\d{1,2}:\d{2})?$/;
  const wordCountRe = /^\d[\d.,]*\s*(?:từ|chữ|words?)$/i;
  const readingTimeRe = /^(?:\d+\s*(?:phút|minutes?|mins?)(?:\s*đọc)?|thời gian đọc\s*:?\s*\d+\s*phút)$/i;
  const titleMetaRe = /^(?:tác giả|author|đăng bởi|biên tập|ngày đăng|ngày xuất bản|published|updated|cập nhật|số từ|word count|thời gian đọc|reading time|chuyên mục|danh mục|tags?|series)\s*[:：-]\s*.+$/i;
  const sourceLineRe = /^(?:ảnh nhận diện nguồn video|ảnh đại diện nguồn video|video\s*\/\s*nguồn tiếng anh gốc|video gốc|nguồn tiếng anh gốc|coldfusion research|nguồn và phương pháp|nguồn tham khảo|tuyên bố miễn trừ trách nhiệm|disclaimer|bản quyền|copyright)(?:\s*[:：–—-].*)?$/i;
  const sourceSectionRe = /^(?:nguồn và phương pháp|nguồn tham khảo|video\s*\/\s*nguồn tiếng anh gốc|video gốc|tài liệu tham khảo|references?|disclaimer|bản quyền|credits?|đọc thêm)$/i;
  const uiLineRe = /^(?:chia sẻ|share|copy link|sao chép liên kết|đọc tiếp|xem thêm|quay lại|về đầu trang|mục lục|table of contents|bài viết liên quan|bài trước|bài sau|đăng ký|subscribe|xem video|mở video|trở về trang chủ|trang chủ|in bài viết|print|mở rộng|thu gọn)$/i;
  const onlyLabelRe = /^(?:series|tags?|categories|danh mục|chuyên mục|nguồn|source)\s*[:：]?$/i;

  function isMetaPart(segment) {
    const s = segment.trim();
    return dateRe.test(s) || wordCountRe.test(s) || readingTimeRe.test(s)
      || /^(?:duy\s+nguyen|nguyễn\s+duy\s+khang)$/i.test(s)
      || /^(?:series|coldfusion research|nguồn|source)$/i.test(s);
  }

  function isNoise(line, index) {
    const s = line.replace(/^(?:>\s*)+/, "").trim();
    if (!s || /^[-*_═─]{3,}$/.test(s)) return true;
    if (sourceLineRe.test(s) || uiLineRe.test(s) || onlyLabelRe.test(s)) return true;
    if (/^\s*(?:©|all rights reserved\b)/i.test(s)) return true;
    if (titleMetaRe.test(s)) return true;
    if (/^(?:https?:\/\/|www\.)\S+$/i.test(s)) return true;
    // Dates and bylines are metadata only in the article's opening.
    if (index < 24) {
      if (isMetaPart(s)) return true;
      const pieces = s.split(/\s*[·|•]\s*/);
      if (pieces.length > 1 && pieces.every(isMetaPart)) return true;
      if (/^SERIES\s+[A-Z\d\s-]{2,}$/i.test(s) && s.length < 72) return true;
    }
    return false;
  }

  function spokenSymbols(value) {
    return value
      .replace(/(\d[\d.,]*)\s*°\s*C\b/gi, "$1 độ C")
      .replace(/(\d[\d.,]*)\s*°\s*F\b/gi, "$1 độ F")
      .replace(/\bkm\s*\/\s*h\b/gi, "ki lô mét trên giờ")
      .replace(/\b([A-Za-zÀ-ỹ]+(?:bits?|bytes?)?|TB|GB|MB|Gb|Mb)\s*\/\s*(?:giây|s)\b/gi, "$1 trên giây")
      .replace(/(\d[\d.,]*)\s*%/g, "$1 phần trăm")
      .replace(/\s+&\s+/g, " và ")
      .replace(/\s*→\s*/g, " sang ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .trim();
  }

  function textSentence(value) {
    const text = spokenSymbols(value);
    if (!text) return "";
    return /[.!?…]["”']?$/.test(text) ? text : text + ".";
  }

  function headingNarration(title, index, total) {
    const t = spokenSymbols(title.replace(/[#:]+$/g, ""));
    if (!t) return "";
    const lower = t.charAt(0).toLocaleLowerCase("vi-VN") + t.slice(1);
    if (/^(?:kết luận|tổng kết|nhìn chung|lời kết)/i.test(t)) return "Nhìn chung, " + lower + ".";
    if (/^(?:thách thức|rủi ro|khó khăn)/i.test(t)) return "Một vấn đề đáng chú ý là " + lower + ".";
    if (index === 0) return "Đầu tiên là " + lower + ".";
    if (index === total - 1 && total >= 3) return "Cuối cùng là " + lower + ".";
    return index % 2 ? "Tiếp theo là " + lower + "." : "Chuyển sang " + lower + ".";
  }

  function cleanScript(text) {
    const input = normalizeInput(text);
    const lines = input.split("\n");
    const blocks = [];
    let buffer = [];
    let omitted = 0;
    let skippingSources = false;
    const flush = () => {
      const paragraph = buffer.join(" ").replace(/\s+/g, " ").trim();
      if (paragraph) blocks.push({ kind: "paragraph", text: paragraph });
      buffer = [];
    };

    lines.forEach((rawLine, lineIndex) => {
      const trimmed = rawLine.trim();
      const h = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      const headingText = h?.[2]?.trim() || "";
      if (h) {
        flush();
        if (sourceSectionRe.test(headingText)) {
          skippingSources = true; omitted++; return;
        }
        if (skippingSources && h[1].length <= 2) skippingSources = false;
        if (skippingSources) { omitted++; return; }
        if (isNoise(headingText, lineIndex)) { omitted++; return; }
        blocks.push({ kind: h[1].length === 1 ? "title" : "heading", text: headingText });
        return;
      }
      if (sourceSectionRe.test(trimmed)) {
        flush(); skippingSources = true; omitted++; return;
      }
      if (skippingSources) {
        omitted++; return;
      }
      if (!trimmed) { flush(); return; }
      if (isNoise(trimmed, lineIndex)) { omitted++; return; }
      // Markdown bullet lines are kept as separate voiced sentences, not discarded.
      const withoutBullet = trimmed.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "");
      buffer.push(withoutBullet);
    });
    flush();

    const headingCount = blocks.filter(b => b.kind === "heading").length;
    const paragraphCount = blocks.filter(b => b.kind === "paragraph").length;
    let headingIndex = 0, paragraphIndex = 0;
    const narration = [];
    for (const b of blocks) {
      if (b.kind === "title") {
        narration.push(textSentence(b.text));
      } else if (b.kind === "heading") {
        narration.push(headingNarration(b.text, headingIndex++, headingCount));
      } else {
        let paragraph = spokenSymbols(b.text);
        // Conservative connective phrases, only for longer standalone paragraphs
        // without headings and only if the paragraph has no existing transition.
        const startsWithTransition = /^(?:đầu tiên|trước hết|tiếp theo|bên cạnh đó|ngoài ra|mặt khác|cuối cùng|nhìn chung|tuy nhiên|vì vậy|do đó|đồng thời|theo đó)\b/i.test(paragraph);
        if (!headingCount && paragraphCount >= 3 && paragraph.length >= 65 && !startsWithTransition) {
          if (paragraphIndex === 1) paragraph = "Tiếp theo, " + paragraph.charAt(0).toLocaleLowerCase("vi-VN") + paragraph.slice(1);
          else if (paragraphIndex === paragraphCount - 1 && /^(?:kết luận|tóm lại|tổng kết|như vậy)/i.test(paragraph)) paragraph = "Nhìn chung, " + paragraph.charAt(0).toLocaleLowerCase("vi-VN") + paragraph.slice(1);
        }
        narration.push(textSentence(paragraph));
        paragraphIndex++;
      }
    }
    return { text: narration.filter(Boolean).join("\n\n").trim(), removedLines: omitted, sections: headingCount };
  }

  function message(value, isError = false) {
    feedback.textContent = value;
    feedback.classList.toggle("bad", isError);
  }
  run.addEventListener("click", () => {
    const text = raw.value.trim();
    if (!text) { message("Hãy dán nội dung bài viết trước.", true); raw.focus(); return; }
    try {
      const result = cleanScript(text);
      if (!result.text) {
        output.value = ""; copy.disabled = send.disabled = true;
        message("Không tìm thấy phần nội dung bài viết. Hãy kiểm tra dữ liệu đầu vào.", true); return;
      }
      output.value = result.text;
      copy.disabled = send.disabled = false;
      message("Đã xử lý " + result.text.length.toLocaleString("vi-VN") + " ký tự, lọc " + result.removedLines + " dòng nhiễu. Kiểm tra và chỉnh sửa trước khi đưa sang TTS.");
    } catch (error) { message("Không thể tiền xử lý: " + error.message, true); }
  });
  output.addEventListener("input", () => {
    const hasText = Boolean(output.value.trim());
    copy.disabled = send.disabled = !hasText;
  });
  copy.addEventListener("click", async () => {
    if (!output.value.trim()) return;
    try {
      await navigator.clipboard.writeText(output.value);
      message("Đã sao chép kịch bản vào bộ nhớ tạm.");
    } catch {
      output.focus(); output.select();
      message("Trình duyệt không cho sao chép tự động. Nhấn ⌘C hoặc Ctrl+C để sao chép.");
    }
  });
  send.addEventListener("click", () => {
    const value = output.value.trim();
    if (!value) { message("Chưa có kịch bản sau xử lý.", true); return; }
    if (value.length > tts.maxLength) {
      message("Kịch bản " + value.length.toLocaleString("vi-VN") + " ký tự vượt giới hạn TTS " + tts.maxLength.toLocaleString("vi-VN") + ". Hãy rút gọn trước; hệ thống không tự cắt nội dung.", true);
      return;
    }
    if ($("stop")?.disabled === false) {
      message("Đang phát hoặc ghi âm. Hãy bấm Dừng trước khi gửi kịch bản mới.", true);
      return;
    }
    if (tts.value && tts.value !== value &&
        !confirm("Thay thế kịch bản đang có trong khung TTS bằng nội dung đã xử lý?")) return;
    tts.value = value;
    tts.dispatchEvent(new Event("input", { bubbles: true }));
    tts.scrollIntoView({ behavior: "smooth", block: "center" });
    tts.focus({ preventScroll: true });
    message("Đã gửi kịch bản sang khung TTS. Chọn giọng và bấm Phát âm thanh.");
  });
  // Expose a pure function for independent unit testing; no network or storage.
  window.BNVoiceoverPreprocessor = Object.freeze({ cleanScript });
})();
