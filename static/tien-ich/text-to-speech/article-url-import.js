/* Public article URL -> voiceover -> Voice Fixer -> TTS.
 * Same-origin HTML is fetched directly. External article links first use CORS and,
 * with explicit consent only, a third-party public article reader as fallback.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const form = $("blogArticleImportForm");
  const urlInput = $("blogArticleUrl");
  const button = $("blogArticleImportButton");
  const status = $("blogArticleImportStatus");
  const sourceLink = $("blogArticleSourceLink");
  const BLOG_ORIGIN = "https://duynguyenaver.github.io";
  const BLOG_PATH = /^\/blognaver\/(?:bai-viet|posts)\/[^/]+\/?$/i;
  const READER_ENDPOINT = "https://r.jina.ai/";
  const MAX_RAW_CHARS = 100000;
  const MIN_ARTICLE_CHARS = 90;
  const SECTIONS = ["voiceoverRaw", "voiceoverOutput", "voiceFixerInput", "voiceFixerOutput", "script"];

  function normalizeArticleUrl(input, pageUrl = window.location.href) {
    const value=String(input||"").trim();
    if(!value)throw Error("Hãy nhập URL bài viết công khai.");
    let parsed;
    try{parsed=new URL(value,pageUrl)}catch{throw Error("URL không hợp lệ. Hãy dán URL đầy đủ đến bài viết.");}
    if(parsed.protocol!=="https:")throw Error("Chỉ chấp nhận URL HTTPS của bài viết công khai.");
    if(parsed.username||parsed.password)throw Error("URL không được chứa tên đăng nhập hoặc mật khẩu.");
    if(parsed.port && parsed.port!=="443")throw Error("URL không được sử dụng cổng mạng tùy ý.");
    const hostname=parsed.hostname.toLocaleLowerCase("en-US").replace(/\.$/,"");
    if(hostname==="localhost"||hostname.endsWith(".localhost")||hostname.endsWith(".local")||
      hostname.endsWith(".internal")||hostname.endsWith(".test")||
      hostname==="0.0.0.0"||hostname==="::1"||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)||
      hostname.startsWith("[")||/^(?:10|127|169\.254|192\.168)\./.test(hostname))
      throw Error("Không hỗ trợ URL nội bộ, địa chỉ IP hoặc máy chủ cục bộ.");
    if(!parsed.pathname||parsed.pathname==="/")
      throw Error("Hãy nhập đường dẫn bài báo cụ thể, không phải trang chủ.");
    if(parsed.origin===BLOG_ORIGIN && parsed.pathname.startsWith("/blognaver/") &&
       !BLOG_PATH.test(parsed.pathname))
      throw Error("Hãy chọn URL bài viết thay vì URL tiện ích hay trang quản trị BlogNaver.");
    parsed.hash="";
    return parsed.href;
  }

  function stripReaderMetadata(markdown) {
    const raw=String(markdown||"").replace(/\r\n?/g,"\n");
    const lines=raw.split("\n");
    const marker=lines.findIndex(l=>/^Markdown Content:\s*$/i.test(l.trim()));
    const body=marker>=0?lines.slice(marker+1).join("\n"):raw;
    return body.replace(/^\s*(?:Title|URL Source|Published Time|Crawled Time):[^\n]*\n/gim,"")
      .replace(/!\[[^\]]*]\((?:https?:\/\/)[^)]+\)/g,"")
      .replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]+\)/g,"$1")
      .replace(/^\s*(?:Share|Log in|Sign in|Subscribe|Menu|Advertisement|Cookie settings)\s*$/gim,"")
      .replace(/\n{3,}/g,"\n\n").trim();
  }

  function readerArticle(body,title) {
    const raw=stripReaderMetadata(body);
    if(raw.length<MIN_ARTICLE_CHARS)
      throw Error("Dịch vụ đọc URL chỉ lấy được tiêu đề hoặc nội dung quá ngắn.");
    if(raw.length>MAX_RAW_CHARS)
      throw Error("Bài viết ngoài BlogNaver quá 100.000 ký tự. Không tự cắt bài.");
    return {raw,title:tidy(title||"Bài viết từ URL")};
  }

  async function fetchArticle(url,signal) {
    const origin=new URL(url).origin;
    const own=origin===window.location.origin;
    let directError=null;
    try {
      const response=await fetch(url,{method:"GET",credentials:own?"same-origin":"omit",mode:"cors",cache:"no-store",signal});
      if(!response.ok)throw Error("HTTP "+response.status);
      const type=response.headers.get("content-type")||"";
      if(!/text\/html/i.test(type))throw Error("Đường dẫn không trả HTML bài viết.");
      const html=await response.text();
      if(html.length>1200000)throw Error("HTML quá lớn để xử lý trong trình duyệt.");
      const finalUrl=normalizeArticleUrl(response.url||url);
      if(new URL(finalUrl).origin!==origin)
        throw Error("Đường dẫn chuyển hướng sang tên miền khác, vui lòng dùng URL đích.");
      return extractArticle(new DOMParser().parseFromString(html,"text/html"));
    }catch(error){
      directError=error;
      if(own)throw Error("Không tải được bài BlogNaver: "+error.message);
    }
    if(!$("externalReaderConsent")?.checked)
      throw Error("Trang ngoài chặn đọc trực tiếp (CORS hoặc cấu trúc bài). Hãy bật tùy chọn cho phép Jina Reader lấy bài công khai rồi thử lại.");
    // Public third-party reader only when user explicitly consents. Never forward tokens/cookies.
    const endpoint=READER_ENDPOINT+url;
    const response=await fetch(endpoint,{
      method:"GET",mode:"cors",credentials:"omit",cache:"no-store",
      headers:{"Accept":"application/json","X-Respond-With":"markdown"},signal
    }).catch(e=>{throw Error("Jina Reader không thể truy cập từ trình duyệt ("+e.message+"). Có thể do CORS, mạng hoặc hạn mức; hãy dán văn bản thủ công.");});
    if(!response.ok)
      throw Error("Dịch vụ đọc bài ngoài báo HTTP "+response.status+". Trang có thể chặn thu thập hoặc dịch vụ hết hạn mức.");
    const json=await response.json().catch(()=>{throw Error("Dịch vụ Reader không trả JSON hợp lệ.");});
    const data=json?.data||json;
    const article=readerArticle(data.content||data.markdown||"",data.title||"");
    return article;
  }

  function tidy(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t\n\r]+/g, " ").trim();
  }

  function buildNarration(title, blocks) {
    const chunks = [];
    if (title) chunks.push("# " + tidy(title));
    for (const item of blocks) {
      const value = tidy(item.text);
      if (!value) continue;
      const tag = String(item.tag || "p").toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        if (value.toLocaleLowerCase("vi") === tidy(title).toLocaleLowerCase("vi")) continue;
        chunks.push("#".repeat(Math.min(Number(tag.slice(1)) + 1, 6)) + " " + value);
      } else if (tag === "li") {
        chunks.push("- " + value);
      } else {
        chunks.push(value);
      }
    }
    return chunks.join("\n\n").trim();
  }

  function extractArticle(doc) {
    // Current BlogNaver theme: article.page.single > .content.
    // Other selectors allow safe fallback if the site's blog theme changes.
    const selectors = [
      "article.page.single .content",
      "article.single .content",
      "article .post-content",
      "article .article-content",
      "main article [itemprop='articleBody']",
      "main .post-content",
      "main article .content",
      "main article"
    ];
    let root = null;
    for (const selector of selectors) {
      const candidate = doc.querySelector(selector);
      if (candidate && tidy(candidate.textContent).length >= MIN_ARTICLE_CHARS) {
        root = candidate;
        break;
      }
    }
    if (!root) throw Error("Không tìm thấy nội dung bài viết trong trang. Kiểm tra URL và thử lại.");
    const title = tidy(
      doc.querySelector("article.page.single h1.single-title, article.single h1, main article h1")?.textContent ||
      doc.querySelector("meta[property='og:title']")?.getAttribute("content") ||
      doc.querySelector("h1.single-title")?.textContent || ""
    ).replace(/\s*[|–—]\s*BlogNaver\s*$/i, "");

    const safe = root.cloneNode(true);
    safe.querySelectorAll(
      "script,style,noscript,nav,footer,aside,form,button,pre,svg," +
      "[hidden],[aria-hidden='true'],.toc,.table-of-contents,.post-meta,.post-footer," +
      ".page-footer,.post-info,.post-reward,.post-tags,.post-categories,.bn-series-identification," +
      ".post-share,.share,.social,.related,.comments,.comment,.pagination,.post-nav," +
      ".highlight,.copy-button,.code-copy,.advertisement,.ad-container"
    ).forEach(node => node.remove());

    const blocks = [];
    const elements = safe.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,tr,figcaption");
    for (const element of elements) {
      const tag = element.tagName.toLowerCase();
      // Paragraphs inside list items and table cells are represented by their parents.
      if (tag === "p" && element.parentElement?.closest("li,tr")) continue;
      let text;
      if (tag === "tr") {
        text = Array.from(element.querySelectorAll("th,td")).map(cell => tidy(cell.textContent)).filter(Boolean).join("; ");
      } else if (tag === "li") {
        const item = element.cloneNode(true);
        item.querySelectorAll("ul,ol").forEach(nested => nested.remove());
        text = item.textContent;
      } else {
        text = element.textContent;
      }
      if (tidy(text)) blocks.push({tag, text});
    }
    if (!blocks.length) blocks.push({tag:"p",text:safe.textContent});
    const raw = buildNarration(title, blocks);
    if (raw.length < MIN_ARTICLE_CHARS)
      throw Error("Nội dung trích xuất quá ngắn; không tự lấy phần menu hay tiêu đề để thay thế bài viết.");
    if (raw.length > MAX_RAW_CHARS)
      throw Error("Bài viết dài hơn 100.000 ký tự ở phần văn bản gốc; dữ liệu chưa được thay thế để tránh cắt nội dung.");
    return {title,raw};
  }

  function message(value, bad = false) {
    if (!status) return;
    status.textContent = value;
    status.classList.toggle("bad", bad);
  }

  async function importArticle() {
    if (!form || button.disabled) return;
    let safeUrl;
    try { safeUrl = normalizeArticleUrl(urlInput.value); }
    catch(error) { message(error.message,true); return; }
    const fields = SECTIONS.map($);
    if (fields.some(field => !field)) { message("Các Section của TTS chưa tải đầy đủ. Vui lòng tải lại trang.",true); return; }
    if ($("stop")?.disabled === false) {
      message("TTS đang phát hoặc ghi WAV. Bấm Dừng trước khi nhập bài viết mới.",true); return;
    }
    button.disabled = true;
    button.setAttribute("aria-busy","true");
    sourceLink.hidden = true;
    message("Đang tải và trích xuất nội dung chính của bài viết…");
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    try {
      const article = await fetchArticle(safeUrl,abort.signal);
      const preprocess = window.BNVoiceoverPreprocessor?.cleanScript;
      const fixer = window.BNVoiceFixer?.fixText;
      if (typeof preprocess !== "function" || typeof fixer !== "function")
        throw Error("Bộ tiền xử lý/Voice Fixer chưa sẵn sàng. Hãy tải lại trang.");
      const prepared = preprocess(article.raw).text;
      if (!prepared?.trim()) throw Error("Bài viết không còn nội dung sau khi lọc metadata.");
      const fixed = fixer(prepared,{
        pacing:$("voiceFixerPacing")?.checked !== false,
        english:$("voiceFixerEnglish")?.checked !== false
      });
      if (!fixed?.trim()) throw Error("Voice Fixer trả kết quả trống.");

      if (fields.some(field => field.value.trim()) &&
          !window.confirm("Thay dữ liệu đang có trong các Section bằng nội dung từ URL này?")) {
        message("Đã hủy nhập URL; nội dung đang soạn được giữ nguyên."); return;
      }
      // All processing is complete before mutating any field. Never silently truncate.
      const maxTts = Number($("script").dataset.maxChars) || 50000;
      $("voiceoverRaw").value = article.raw;
      $("voiceoverOutput").value = prepared;
      $("voiceFixerInput").value = prepared;
      $("voiceFixerOutput").value = fixed;
      for (const id of ["voiceoverOutput","voiceFixerOutput"]) {
        $(id).dispatchEvent(new Event("input",{bubbles:true}));
      }
      $("voiceoverCopy").disabled = $("voiceoverToTts").disabled = !prepared.trim();
      $("voiceFixerToTts").disabled = $("voiceFixerListen").disabled = !fixed.trim();
      if (fixed.length <= maxTts) {
        $("script").value = fixed;
        $("script").dispatchEvent(new Event("input",{bubbles:true}));
      }
      $("voiceoverStatus").textContent = "Đã nhập URL bài viết và tiền xử lý " + prepared.length.toLocaleString("vi-VN") + " ký tự.";
      $("voiceoverStatus").classList.remove("bad");
      $("voiceFixerStatus").textContent = "Đã tối ưu nhịp điệu tự nhiên từ URL. Bạn có thể chỉnh sửa trước khi phát.";
      $("voiceFixerStatus").classList.remove("bad");

      sourceLink.href = safeUrl;
      sourceLink.textContent = "Xem bài gốc: " + (article.title || "BlogNaver");
      sourceLink.hidden = false;
      if (fixed.length > maxTts) {
        message("Đã điền Section 02 và 03, nhưng bản đọc " +
          fixed.length.toLocaleString("vi-VN") + " ký tự vượt mức " +
          maxTts.toLocaleString("vi-VN") + ". Section 01 được giữ nguyên, KHÔNG cắt văn bản.",true);
      } else {
        message("Đã lấy bài \"" + (article.title || "bài viết") +
          "\", tự điền đủ 3 Section. Bản đọc " + fixed.length.toLocaleString("vi-VN") +
          " / " + maxTts.toLocaleString("vi-VN") + " ký tự. Bạn có thể bấm Phát âm thanh.");
      }
    } catch(error) {
      message(error.name === "AbortError" ? "Kết nối quá thời gian (20 giây). Hãy thử lại." :
        "Không nhập được bài từ URL: " + (error.message || "Lỗi không xác định."),true);
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }

  // Export pure helpers for regression tests, even when the UI is not mounted.
  window.BNBlogArticleImport = Object.freeze({normalizeArticleUrl,extractArticle,buildNarration,importArticle,readerArticle,fetchArticle});
  if (!form || !urlInput || !button || !status || !sourceLink) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    importArticle();
  });
})();
