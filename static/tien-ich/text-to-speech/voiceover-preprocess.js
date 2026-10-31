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


  // STEP 1: remove UI fragments, frontmatter and source/footer sections.
  const stray=/^(?:trong|và|sê[\s-]?ri|series|thể loại|danh mục|chuyên mục|tags?|nguồn|đọc tiếp|xem thêm)[.!,;:\s]*$/iu;
  const byline=/^(?:(?:tác giả|author|đăng bởi)\s*[:：-]\s*)?(?:duy\s+nguyen|nguyễn\s+duy\s+khang)$/iu;
  const date=/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/;
  const quantity=/^\d[\d.,]*\s*(?:từ|chữ|words?|phút(?:\s*đọc)?|mins?|minutes?)$/iu;
  const meta=/^(?:tác giả|author|đăng bởi|ngày đăng|ngày xuất bản|published|updated|cập nhật|số từ|word count|thời gian đọc|reading time|thể loại|chuyên mục|danh mục|tags?|series|sê[\s-]?ri)\s*[:：-]\s*.*$/iu;
  const sourceHeading=/^(?:nguồn và phương pháp|nguồn tham khảo|video\s*\/\s*nguồn tiếng anh gốc|video gốc|tài liệu tham khảo|references?|disclaimer|bản quyền|copyright|credits?|đọc thêm)$/iu;
  const sourceLine=/^(?:coldfusion research|research studio|bài viết phân tích dựa trên phụ đề|ảnh nhận diện nguồn video|ảnh đại diện nguồn video|nguồn và phương pháp|video\s*\/\s*nguồn tiếng anh gốc|nguồn tham khảo|nguồn tiếng anh gốc|bản quyền|copyright|disclaimer|tuyên bố miễn trừ trách nhiệm)(?:\s|[.:：…—–-]|$)/iu;
  const ui=/^(?:chia sẻ|share|copy link|sao chép liên kết|mục lục|table of contents|bài viết liên quan|bài trước|bài sau|đăng ký|subscribe|xem video|mở video|về đầu trang|in bài viết)$/iu;
  function metaPart(s){const v=s.trim();return stray.test(v)||byline.test(v)||date.test(v)||quantity.test(v)||meta.test(v);}
  function isNoise(s,front) {
    if (!s||/^[-*_═─]{3,}$/.test(s))return true;
    if (stray.test(s)||byline.test(s)||meta.test(s)||ui.test(s)||sourceLine.test(s))return true;
    if (/^(?:©|all rights reserved)/iu.test(s)||/^(?:https?:\/\/|www\.)\S+$/iu.test(s))return true;
    if (front&&(date.test(s)||quantity.test(s)))return true;
    if (front&&/[·|•]/.test(s)&&s.split(/\s*[·|•]\s*/).every(metaPart))return true;
    return false;
  }
  function headingOf(s,beforeBlank,afterBlank) {
    const md=s.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if(md)return {level:md[1].length,text:md[2]};
    if(beforeBlank&&afterBlank&&s.length>=5&&s.length<=55&&s.split(/\s+/).length<=6
       &&/^[A-ZÀ-Ỹ0-9]/u.test(s)&&!/[,:;.!?…]$/u.test(s))return {level:2,text:s};
    return null;
  }
  function stripNoise(input) {
    const lines=normalizeInput(input).split("\n");
    const blocks=[];let pending=[],removedLines=0,front=true,inSources=false;
    const flush=()=>{
      const p=pending.join(" ").replace(/\s+/g," ").trim();pending=[];
      if(p){blocks.push({type:"paragraph",text:p});if(p.length>=28||p.split(/\s+/).length>=6)front=false;}
    };
    lines.forEach((raw,i)=>{
      const s=raw.trim(),prev=i===0||!lines[i-1].trim(),next=i===lines.length-1||!lines[i+1].trim();
      const heading=headingOf(s,prev,next);
      const label=(heading?heading.text:s).replace(/[.:：\s]+$/g,"");
      if(sourceHeading.test(label)){flush();inSources=true;removedLines++;return;}
      if(inSources&&heading&&heading.level<=2)inSources=false;
      if(inSources){removedLines++;return;}
      if(!s){flush();return;}
      if(isNoise(s,front)){removedLines++;return;}
      if(heading){flush();if(isNoise(heading.text,front)){removedLines++;return;}
        blocks.push({type:heading.level===1&&front?"title":"heading",text:heading.text});return;
      }
      const text=s.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/,"").trim();
      if(text)pending.push(text);
      if(next)flush();
    });
    flush();return {blocks,removedLines};
  }
  // STEP 2: Vietnamese number reading with 3-digit groups; never modify URLs or IDs.
  const DIGIT=["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  function triplet(n,higher=false){
    const h=Math.floor(n/100),t=Math.floor(n/10)%10,u=n%10,r=[];
    if(h)r.push(DIGIT[h],"trăm");else if(higher&&n<100)r.push("không","trăm");
    if(t>=2){r.push(DIGIT[t],"mươi");if(u)r.push(u===1?"mốt":u===5?"lăm":DIGIT[u]);}
    else if(t===1){r.push("mười");if(u)r.push(u===5?"lăm":DIGIT[u]);}
    else if(u){if(h||higher)r.push("linh");r.push(DIGIT[u]);}
    return r.join(" ");
  }
  const SCALES=["","nghìn","triệu","tỷ","nghìn tỷ","triệu tỷ"];
  function integerWords(value){
    if(!Number.isSafeInteger(value)||value<0||value>=1e18)return null;
    if(value===0)return DIGIT[0];
    const groups=[];let n=value;
    while(n){groups.unshift(n%1000);n=Math.floor(n/1000);}
    const pieces=[];
    for(let i=0;i<groups.length;i++){const g=groups[i];if(!g)continue;
      pieces.push(triplet(g,pieces.length>0&&g<100)+(SCALES[groups.length-1-i]?" "+SCALES[groups.length-1-i]:""));
    }
    return pieces.join(" ");
  }
  const terms=[
    ["Apricot Forest","A-pri-cot Pho-rét",true],["Internet of Things","In-tơ-nét off Thing-sơ",true],
    ["Santa Clara","San-ta Cờ-la-ra",true],["feet vuông","phít vuông",true],
    ["California","Ca-li-phót-ni-a",true],["Endeavor","En-đê-vơ",true],
    ["Voyager","Voi-ơ-jơ",true],["Nvidia","En-vi-đi-a",true],
    ["Gigabytes","Gi-ga-bay",true],["Gigabits","Gi-ga-bít",true],
    ["Terabits","Tê-ra-bít",true],["Bluetooth","Bơ-lu-tút",true],
    ["Wi-Fi","Quay-Phay",true],["Fudan","Phúc Đán",true],
    ["Intel","In-tel",true],["Drone","Đơ-ron",true],["feet","phít",true],
    ["3D","Ba Đê",true],["USD","đô-la Mỹ",false],
    ["MIT","Em-Ai-Ti",false],["DJI","Đi-Ji-Ai",false],["IoT","Ai-Ô-Tê",false],
    ["GPS","Gi-Pi-Ép",false],["VLC","Vê-Ép-Cê",false],["QR","Kiu-A",false],
    ["LED","Lét",false],["AI","Ei-Ai",false]
  ];
  function escapeRegex(s){return s.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&");}
  const rules=terms.map(([term,reading,ci])=>({reading,
    re:new RegExp("(?<![\\p{L}\\p{N}_])"+escapeRegex(term)+"(?![\\p{L}\\p{N}_])",ci?"giu":"gu")}));
  function applyPhonetics(s){
    let v=s;for(const r of rules)v=v.replace(r.re,()=>r.reading);return v;
  }
  function symbols(s){return s
    .replace(/(\d[\d.,]*)\s*°\s*C\b/giu,"$1 độ C")
    .replace(/(\d[\d.,]*)\s*°\s*F\b/giu,"$1 độ F")
    .replace(/\bkm\s*\/\s*h\b/giu,"ki lô mét trên giờ")
    .replace(/([A-Za-zÀ-ỹ]+(?:bits?|bytes?)?|TB|GB|MB)\s*\/\s*(?:giây|s)\b/giu,"$1 trên giây")
    .replace(/(\d[\d.,]*)\s*%/gu,"$1 phần trăm")
    .replace(/\s+&\s+/g," và ").replace(/\s*→\s*/g," sang ");
  }
  function numbers(s){
    let v=s.replace(/(?:ngày\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})/giu,(all,day,month,year)=>{
      const d=Number(day),m=Number(month),y=Number(year);
      if(d<1||d>31||m<1||m>12||y<1000||y>9999)return all;
      return "ngày "+integerWords(d)+" tháng "+integerWords(m)+" năm "+integerWords(y);
    });
    return v.replace(/(?<![\p{L}\p{N}_:/.-])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(?![\p{L}\p{N}_:/.-])/gu,
      (all,number,decimal)=>{
        const words=integerWords(Number(number.replace(/\./g,"")));
        return words?(decimal?words+" phẩy "+Array.from(decimal,n=>DIGIT[Number(n)]).join(" "):words):all;
      });
  }
  function outsideProtected(s,fn) {
    const pattern=/\x60{3}[\s\S]*?\x60{3}|\x60[^\x60\n]+\x60|(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
    let result="",last=0;
    for(const m of s.matchAll(pattern)){result+=fn(s.slice(last,m.index))+m[0];last=m.index+m[0].length;}
    return result+fn(s.slice(last));
  }
  function toSpoken(text){
    return outsideProtected(text,s=>numbers(applyPhonetics(symbols(s)))
      .replace(/[ \t]{2,}/g," ").replace(/\s+([,.;!?])/g,"$1").trim());
  }
  // STEP 3: narrate the actual body with contextual paragraph transitions.
  const transitions=/^(?:đầu tiên|trước hết|tiếp theo|bên cạnh đó|ngoài ra|mặt khác|cuối cùng|nhìn chung|tuy nhiên|vì vậy|do đó|đồng thời|tóm lại|nói về|dưới lăng kính|dưới góc độ|chuyển sang|theo đó)/iu;
  function makeTransition(heading,index){
    const h=(heading||"").toLocaleLowerCase("vi-VN");
    if(/^(?:kết luận|tổng kết|tóm lại|lời kết|nhìn chung)/iu.test(h))return "Tóm lại, ";
    if(/kiến trúc|trụ sở|tòa nhà|thiết kế|xây dựng/iu.test(h))return "Nói về kiến trúc, ";
    if(/tổ chức|văn hóa|nhân sự|đội ngũ|con người/iu.test(h))return "Dưới lăng kính phân tích tổ chức, ";
    if(/thách thức|khó khăn|rủi ro|trở ngại|hạn chế/iu.test(h))return "Tuy nhiên, ";
    if(index===0)return "Đầu tiên, ";
    return index%2?"Tiếp theo, ":"Bên cạnh đó, ";
  }
  function sentence(value) {
    const result=toSpoken(value).replace(/^(?:nhìn chung,\s*kết luận|tóm lại,\s*kết luận)[,.:]?\s*/iu,"Tóm lại, ")
      .replace(/[:：\s]+$/g,"").replace(/[ \t]{2,}/g," ").trim();
    if(!result||stray.test(result)||/^(?:tóm lại|nhìn chung)[,.;\s]*$/iu.test(result))return "";
    return /[.!?…]["”']?$/u.test(result)?result:result+".";
  }
  function lowerFirstForSpeech(text){
    // Lowercase ordinary sentence starts, never proper names or initialisms.
    if (/^(?:Nvidia|Santa Clara|California|Voyager|Endeavor|Intel|Fudan|Apricot Forest|Drone|Wi-Fi|Bluetooth|Terabits|Gigabits|Gigabytes|MIT|DJI|IoT|GPS|VLC|QR|LED|AI)(?=\s|[.,;:!?]|$)/u.test(text)) return text;
    if (/^[A-ZĐ]{2,}(?=\s|[.,;:!?]|$)/u.test(text)) return text;
    return text.charAt(0).toLocaleLowerCase("vi-VN")+text.slice(1);
  }
  function buildNarration(blocks){
    const paragraphs=blocks.filter(b=>b.type==="paragraph"),parts=[];
    const title=blocks.find(b=>b.type==="title");
    if(title)parts.push(sentence(title.text));
    let currentHeading="",index=0;
    for(const b of blocks){
      if(b.type==="heading"){currentHeading=b.text;continue;}
      if(b.type!=="paragraph")continue;
      let text=b.text.trim().replace(/^và\s+/iu,"");
      if (/^(?:chào mừng các bạn quay trở lại với góc nhìn công nghệ hôm nay|cảm ơn các bạn đã theo dõi)[.!?\s]*$/iu.test(text))continue;
      if(!transitions.test(text))text=makeTransition(currentHeading,index)+lowerFirstForSpeech(text);
      const spoken=sentence(text);if(spoken){parts.push(spoken);index++;}
      currentHeading="";
    }
    if(!paragraphs.length)return "";
    const body=parts.filter(Boolean).join("\n\n");
    const intro="Chào mừng các bạn quay trở lại với góc nhìn công nghệ hôm nay!";
    const outro="Cảm ơn các bạn đã theo dõi!";
    return [/^chào mừng các bạn quay trở lại/iu.test(body)?"":intro,body,
      /cảm ơn các bạn đã theo dõi[.!?\s]*$/iu.test(body)?"":outro].filter(Boolean).join("\n\n");
  }
  function cleanScript(value) {
    const cleaned=stripNoise(value);
    return {text:buildNarration(cleaned.blocks),removedLines:cleaned.removedLines,
      sections:cleaned.blocks.filter(x=>x.type==="heading").length};
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
