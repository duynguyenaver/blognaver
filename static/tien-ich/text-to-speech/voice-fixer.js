/* BlogNaver Voice Fixer — client-only pronunciation and pacing for browser TTS. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const input = $("voiceFixerInput"), output = $("voiceFixerOutput");
  const pace = $("voiceFixerPacing"), english = $("voiceFixerEnglish");
  const fetchPrevious = $("voiceFixerFromSection2"), process = $("voiceFixerProcess");
  const transfer = $("voiceFixerToTts"), listen = $("voiceFixerListen");
  const info = $("voiceFixerStatus"), tts = $("script");
  const maxTtsChars = Number(tts?.dataset?.maxChars) || 50000;
  if (![input, output, pace, english, fetchPrevious, process, transfer, listen, info, tts].every(Boolean)) return;

  // Spaces are often read more smoothly than syllable-joining dashes.
  // Keep AI case-sensitive so the Vietnamese word "ai" is not altered.
  const terms = [
    // Gen.G: pronounce the English G like "di" (/dʒiː/), not Vietnamese "dê".
    {term:"Gen.G", reading:"den di", ci:true},
    {term:"Gen G", reading:"den di", ci:true},
    {term:"Gen-G", reading:"den di", ci:true},
    {term:"GenG", reading:"den di", ci:true},
    {term:"G", reading:"di", ci:false},
    {term:"Gigabytes", reading:"gi ga bai", ci:true},
    {term:"Gigabyte", reading:"gi ga bai", ci:true},
    {term:"Terabits", reading:"tê ra bít", ci:true},
    {term:"Terabit", reading:"tê ra bít", ci:true},
    {term:"Bluetooth", reading:"bơ lu tút", ci:true},
    {term:"Wi-Fi", reading:"quai phai", ci:true},
    {term:"WiFi", reading:"quai phai", ci:true},
    {term:"Drone", reading:"đơ ron", ci:true},
    {term:"IoT", reading:"ai ô tê", ci:true},
    {term:"AI", reading:"ây ai", ci:false},
    {term:"USB", reading:"iu ét bi", ci:false},
    {term:"CPU", reading:"xi pi iu", ci:false},
    {term:"GPU", reading:"gi pi iu", ci:false}
  ];
  const escapeRegExp = s => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  const dict = terms.map(t => ({
    reading:t.reading,
    regex:new RegExp("(?<![\\p{L}\\p{N}_])" + escapeRegExp(t.term) + "(?![\\p{L}\\p{N}_])", t.ci ? "giu" : "gu")
  }));
  function applyTerms(segment) {
    let result = segment;
    for (const entry of dict) result = result.replace(entry.regex, () => entry.reading);
    return result;
  }
  function pronounceEnglish(text) {
    // Protect URLs, email addresses and inline/fenced code.
    const guarded = /\x60{3}[\s\S]*?\x60{3}|\x60[^\x60\n]+\x60|(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
    let result = "", last = 0;
    for (const m of text.matchAll(guarded)) {
      result += applyTerms(text.slice(last, m.index)) + m[0];
      last = m.index + m[0].length;
    }
    return result + applyTerms(text.slice(last));
  }
  function naturalPacing(value) {
    return value.replace(/[ \t]{2,}/g, " ").replace(/\s+—\s+/g, ", ")
      .replace(/\s+([,;.!?])/g, "$1")
      .split(/\n{2,}/).map(part => {
        let p = part.trim();
        // Commas only at safe discourse connectives, not random word positions.
        p = p.replace(
          /(^|[.!?]\s+)(Tuy nhiên|Bên cạnh đó|Ngoài ra|Do đó|Vì vậy|Trước hết|Cuối cùng|Mặt khác|Tiếp theo)(?=\s)(?!\s*[,;:])/gimu,
          (_, before, word) => before + word + ","
        );
        if (p.length >= 120) {
          p = p.replace(
            /([^,;:.!?\n])\s+(trong khi đó|đặc biệt là|chẳng hạn|nhờ đó|đáng chú ý là)(?=\s)(?!\s*[,;:])/giu,
            (_, before, word) => before + ", " + word
          );
        }
        return p;
      }).filter(Boolean).join("\n\n");
  }
  function fixText(value, opts = {pacing:true, english:true}) {
    let result = String(value || "").normalize("NFC").replace(/\r\n?/g, "\n")
      .replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ")
      .replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    if (opts.english) result = pronounceEnglish(result);
    if (opts.pacing) result = naturalPacing(result);
    return result;
  }
  function message(value, bad = false) {
    info.textContent = value;
    info.classList.toggle("bad", bad);
  }
  function sendToTTS({ask = true, scroll = true} = {}) {
    const value = output.value.trim();
    if (!value) {message("Chưa có kịch bản đã tối ưu.", true);return false;}
    if (value.length > maxTtsChars) {
      message("Kịch bản " + value.length.toLocaleString("vi-VN") +
        " ký tự vượt giới hạn TTS " + maxTtsChars.toLocaleString("vi-VN") +
        ". Hãy rút gọn trước; hệ thống không tự cắt nội dung.", true);
      return false;
    }
    if ($("stop")?.disabled === false) {
      message("TTS đang phát hoặc ghi WAV. Bấm Dừng trước khi chuyển nội dung.", true);
      return false;
    }
    if (ask && tts.value && tts.value !== value &&
        !confirm("Thay thế nội dung hiện tại trong khung TTS bằng bản Voice Fixer?")) {
      message("Bản tối ưu vẫn ở Section 3; nội dung TTS chưa thay đổi.");
      return false;
    }
    tts.value = value;
    tts.dispatchEvent(new Event("input", {bubbles:true}));
    if (scroll) {
      tts.scrollIntoView({behavior:"smooth", block:"center"});
      tts.focus({preventScroll:true});
    }
    message("Đã chuyển sang khung đọc TTS. Bấm Phát âm thanh để nghe thử.");
    return true;
  }
  fetchPrevious.addEventListener("click", () => {
    const from = $("voiceoverOutput")?.value.trim();
    if (!from) {message("Section 2 chưa có kết quả. Hãy xử lý bài viết tại Section 2 trước.", true);return;}
    if (input.value && input.value !== from &&
        !confirm("Thay văn bản trong Voice Fixer bằng kết quả Section 2?")) return;
    input.value = from;
    message("Đã lấy " + from.length.toLocaleString("vi-VN") + " ký tự từ Section 2.");
  });
  process.addEventListener("click", () => {
    if (!input.value.trim()) {message("Nhập kịch bản hoặc lấy từ Section 2 trước.", true);input.focus();return;}
    try {
      output.value = fixText(input.value, {pacing:pace.checked, english:english.checked});
      transfer.disabled = listen.disabled = !output.value;
      if (sendToTTS({ask:true, scroll:false})) {
        message("Đã tối ưu và tự chuyển vào Section 1. Có thể phát âm thanh hoặc tải WAV.");
      }
    } catch (error) {message("Voice Fixer thất bại: " + error.message, true);}
  });
  output.addEventListener("input", () => {transfer.disabled = listen.disabled = !output.value.trim();});
  transfer.addEventListener("click", () => sendToTTS({ask:true,scroll:true}));
  listen.addEventListener("click", () => {
    if (sendToTTS({ask:true,scroll:true})) $("listen")?.click();
  });
  window.BNVoiceFixer = Object.freeze({fixText, pronounceEnglish, naturalPacing});
})();
