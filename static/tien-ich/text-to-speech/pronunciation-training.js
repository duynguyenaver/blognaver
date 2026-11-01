/* BlogNaver Section 04 — owner-trained pronunciation rules.
 * Public merged dictionary is source of truth. GitHub writes ALWAYS via branch + PR + CI.
 * No token persisted by this module and no token ever committed or placed in a URL.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const REPO="duynguyenaver/blognaver";
  const FILE="static/tien-ich/text-to-speech/pronunciation-dictionary.json";
  const API="https://api.github.com/repos/"+REPO;
  const LIMIT=300, MAX_TERM=100, MAX_READING=180;
  const store=new Map(), submitted=new Map(), drafts=new Map();
  let loaded=false, saving=false;
  let readyResolve;
  const ready=new Promise(resolve=>{readyResolve=resolve});
  const key=term=>String(term||"").normalize("NFC").trim().toLocaleLowerCase("vi-VN");
  const normalized=s=>String(s||"").normalize("NFC").replace(/[ \t]+/g," ").trim();
  const isSafeText=s=>s && !/[\x00-\x1F\x7F<>]/u.test(s) && !/(?:https?:\/\/|www\.|@)/iu.test(s);
  const escapeRegExp=s=>s.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&");

  function validate(entry) {
    const term=normalized(entry.term),reading=normalized(entry.reading);
    const language=entry.language==="vi"?"vi":"en";
    const caseSensitive=entry.caseSensitive!==false;
    if(!isSafeText(term)||term.length>MAX_TERM)
      throw Error("Từ/cụm từ cần sửa phải dài 1–100 ký tự, không chứa HTML, đường dẫn hoặc xuống dòng.");
    if(!isSafeText(reading)||reading.length>MAX_READING)
      throw Error("Cách đọc phải dài 1–180 ký tự, không chứa HTML, đường dẫn hoặc xuống dòng.");
    if(key(term)===key(reading))
      throw Error("Từ gốc và cách đọc giống nhau; không cần thêm quy tắc.");
    return {term,reading,language,caseSensitive};
  }

  function sanitizeList(value) {
    if(!value||value.version!==1||!Array.isArray(value.entries))
      throw Error("Tệp từ điển GitHub không đúng định dạng version 1.");
    if(value.entries.length>LIMIT)throw Error("Từ điển vượt 300 quy tắc, không tự cắt dữ liệu.");
    const items=new Map();
    for(const candidate of value.entries){
      const entry=validate(candidate);
      if(items.has(key(entry.term)))throw Error("Từ điển GitHub có hai quy tắc trùng từ: "+entry.term);
      items.set(key(entry.term),entry);
    }
    return items;
  }

  function activeEntries(){
    const combined=new Map(store);
    for(const pending of [submitted,drafts])for(const [k,v] of pending){if(v===null)combined.delete(k);else combined.set(k,v)}
    return Array.from(combined.values()).sort((a,b)=>b.term.length-a.term.length ||
      a.term.localeCompare(b.term,"vi"));
  }
  function replacementRegex(entries){
    if(!entries.length)return null;
    // Longest tokens first, one-pass replacement prevents cascading learned corrections.
    const groups=entries.map(x=>"(?<r"+x.id+">"+escapeRegExp(x.term)+")").join("|");
    return new RegExp("(?<![\\p{L}\\p{N}_])(?:"+groups+")(?![\\p{L}\\p{N}_])","gu");
  }
  function apply(text){
    const original=String(text||""),entries=activeEntries();
    if(!entries.length)return original;
    const indexed=entries.map((r,id)=>({...r,id}));
    const byGroup=new Map(indexed.map(r=>["r"+r.id,r]));
    const re=replacementRegex(indexed);
    return original.replace(re,(matched,...args)=>{
      const groups=args.at(-1);
      if(!groups||typeof groups!=="object")return matched;
      const name=Object.keys(groups).find(n=>groups[n]!==undefined);
      const entry=byGroup.get(name);
      if(!entry)return matched;
      if(entry.caseSensitive && matched!==entry.term)return matched;
      // Preserve the original if another spelling differs only in case from this rule.
      return entry.reading;
    });
  }

  // Some browsers do not support case-insensitive groups with mixed case flags.
  // A second lowercased probe (using the same literal boundaries) handles rules opted into ignore-case,
  // without changing case-sensitive rules or touching text embedded inside another word.
  function applyAll(input){
    const text=String(input||""),entries=activeEntries();
    if(!entries.length)return text;
    const rules=entries.map((r,i)=>({...r,i}));
    const alternatives=rules.map(r=>"(?<p"+r.i+">"+escapeRegExp(r.term)+")").join("|");
    const pattern=new RegExp("(?<![\\p{L}\\p{N}_])(?:"+alternatives+")(?![\\p{L}\\p{N}_])","giu");
    const groups=new Map(rules.map(x=>["p"+x.i,x]));
    return text.replace(pattern,(match,...rest)=>{
      const capture=rest.at(-1);
      const hit=Object.keys(capture||{}).find(name=>capture[name]!==undefined);
      const r=groups.get(hit);
      if(!r||r.caseSensitive&&match!==r.term)return match;
      return r.reading;
    });
  }

  function status(message,error=false){
    const target=$("pronunciationTrainingStatus");
    if(!target)return;
    target.textContent=message;
    target.classList.toggle("bad",error);
  }
  function refresh(){
    const list=$("pronunciationRuleList");
    const count=$("pronunciationRuleCount");
    if(!list)return;
    list.replaceChildren();
    const items=activeEntries();
    if(count)count.textContent=items.length+" quy tắc · "+submitted.size+" đang chờ PR · "+drafts.size+" chưa gửi";
    for(const entry of items){
      const item=document.createElement("li");
      const label=document.createElement("span");
      label.className="pron-rule-label";
      const strong=document.createElement("strong");strong.textContent=entry.term;
      const reading=document.createElement("span");reading.textContent=" → "+entry.reading+" ";
      const note=document.createElement("small");
      note.textContent="("+(entry.language==="vi"?"Việt":"Anh")+(entry.caseSensitive?", đúng chữ hoa/thường":"")+")";
      label.append(strong,reading,note);
      const buttons=document.createElement("span");
      buttons.className="pron-rule-actions";
      const edit=document.createElement("button");
      edit.type="button";edit.className="secondary";edit.textContent="Sửa";edit.setAttribute("aria-label","Sửa cách đọc của "+entry.term);
      edit.addEventListener("click",()=>{
        $("pronunciationTerm").value=entry.term;
        $("pronunciationReading").value=entry.reading;
        $("pronunciationLanguage").value=entry.language;
        $("pronunciationCaseSensitive").checked=entry.caseSensitive;
        $("pronunciationTerm").focus();
        status("Chỉnh sửa quy tắc "+entry.term+" rồi nhấn Thêm / Cập nhật.");
      });
      const del=document.createElement("button");
      del.type="button";del.className="secondary";del.textContent="Xóa";
      del.setAttribute("aria-label","Xóa quy tắc "+entry.term);
      del.addEventListener("click",()=>{
        const k=key(entry.term);
        if(store.has(k)||submitted.has(k))drafts.set(k,null);else drafts.delete(k);
        refresh();preview();
        status("Đã đưa quy tắc "+entry.term+" vào thay đổi chờ PR. Chưa xóa khỏi GitHub.");
      });
      buttons.append(edit,del);item.append(label,buttons);list.append(item);
    }
    if(!items.length){const empty=document.createElement("li");empty.textContent="Chưa có quy tắc. Hãy thêm từ/cụm từ đầu tiên.";list.append(empty)}
  }
  function preview(){
    const input=$("pronunciationPreview"),result=$("pronunciationPreviewResult");
    if(input&&result)result.textContent=applyAll(input.value)||"Kết quả sẽ xuất hiện tại đây.";
  }
  function addRule(event){
    event?.preventDefault();
    try{
      const rule=validate({term:$("pronunciationTerm").value,reading:$("pronunciationReading").value,
        language:$("pronunciationLanguage").value,
        caseSensitive:$("pronunciationCaseSensitive").checked});
      const existing=store.get(key(rule.term));
      if(!existing && !drafts.has(key(rule.term)) && activeEntries().length>=LIMIT)
        throw Error("Đã đạt 300 quy tắc. Xóa quy tắc cũ trước khi thêm mới.");
      drafts.set(key(rule.term),rule);
      refresh();preview();
      status("Đã thêm/cập nhật "+rule.term+" → "+rule.reading+
        " (có hiệu lực khi tiền xử lý ở tab này). Bấm Lưu GitHub để tạo PR; chưa được lưu trên cloud.");
      $("pronunciationTerm").value="";
      $("pronunciationReading").value="";
      $("pronunciationTerm").focus();
    }catch(e){status(e.message,true)}
  }
  const apiHeaders=token=>({
    Accept:"application/vnd.github+json",
    Authorization:"Bearer "+token,
    "X-GitHub-Api-Version":"2022-11-28"
  });
  async function github(url,token,{method="GET",body}={}){
    const response=await fetch(API+url,{method,headers:{
      ...apiHeaders(token),...(body?{"Content-Type":"application/json"}:{})
    },body:body?JSON.stringify(body):undefined,cache:"no-store"});
    let data;
    try{data=await response.json()}catch{data={}}
    if(!response.ok){
      const detail=String(data.message||"Lỗi GitHub").slice(0,180);
      const cause=response.status===401?"Token GitHub không hợp lệ hoặc hết hạn.":
        response.status===403?"Token thiếu quyền Contents:write hoặc Pull requests:write, hoặc bị giới hạn truy cập.":
        response.status===422?"Nhánh/PR đã tồn tại hoặc dữ liệu chưa hợp lệ.":
        "GitHub HTTP "+response.status+": "+detail;
      throw Error(cause);
    }
    return data;
  }
  const bytesToBase64=s=>{
    const bytes=new TextEncoder().encode(s);
    let bin="";
    for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(bin);
  };
  const decodeUtf8=b64=>{
    const binary=atob(String(b64||"").replace(/\s/g,""));
    return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
  };

  async function saveGitHub(){
    if(saving)return;
    if(!drafts.size){status("Chưa có từ/cụm từ mới để lưu GitHub.",true);return}
    if(submitted.size){status("Đã có thay đổi trong PR đang chờ merge. Hãy xác minh merge/deploy và tải lại trang trước khi tạo PR mới để tránh bỏ sót quy tắc.",true);return}
    const token=$("ghToken")?.value.trim();
    if(!token){
      const details=$("ghToken")?.closest("details");
      if(details)details.open=true;
      status("Hãy điền GitHub token trong mục Đồng bộ WAV (Section 01) trước. Cần quyền Contents:write và Pull requests:write. Không lưu token vào từ điển hoặc GitHub.",true);
      $("ghToken")?.focus();return;
    }
    if(!$("pronunciationPublishConsent")?.checked){
      status("Hãy xác nhận các từ và cách đọc sẽ được công khai trong repository BlogNaver.",true);
      return;
    }
    saving=true;$("pronunciationSaveGithub").disabled=true;
    status("Đang đối chiếu dữ liệu mới nhất trên main trước khi tạo Pull Request…");
    try{
      const remote=await github("/contents/"+FILE+"?ref=main",token);
      if(remote.encoding!=="base64"||!remote.sha)throw Error("Không đọc được phiên bản JSON từ GitHub.");
      const latest=sanitizeList(JSON.parse(decodeUtf8(remote.content)));
      for(const [k,value] of drafts){
        const old=store.get(k),fresh=latest.get(k);
        if(JSON.stringify(old??null)!==JSON.stringify(fresh??null) &&
          JSON.stringify(value)!==JSON.stringify(fresh??null))
          throw Error("Quy tắc "+(fresh?.term||old?.term||k)+" đã thay đổi trên GitHub. Tải lại từ điển trước để tránh ghi đè thay đổi của người khác.");
        if(value===null)latest.delete(k);else latest.set(k,value);
      }
      if(latest.size>LIMIT)throw Error("Đã vượt 300 quy tắc. Không tự cắt dữ liệu.");
      const file=JSON.stringify({version:1,note:"Public owner-approved pronunciation rules for BlogNaver Text to Speech Studio. All changes require a Pull Request.",entries:Array.from(latest.values()).sort((a,b)=>a.term.localeCompare(b.term,"vi"))},null,2)+"\n";
      if(file.length>125000)throw Error("Từ điển quá lớn để lưu an toàn.");
      const branch="data/tts-pronunciation-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8);
      status("Đang tạo nhánh dữ liệu mới trên GitHub…");
      const main=await github("/git/ref/heads/main",token);
      const sha=main.object?.sha;
      if(!/^[a-f0-9]{40}$/i.test(sha||""))throw Error("Không lấy được SHA của nhánh main.");
      await github("/git/refs",token,{method:"POST",body:{ref:"refs/heads/"+branch,sha}});
      status("Đang commit từ điển lên nhánh riêng (không ghi trực tiếp main)…");
      await github("/contents/"+FILE,token,{method:"PUT",body:{
        message:"data(tts): train pronunciation corrections",
        content:bytesToBase64(file),sha:remote.sha,branch
      }});
      status("Đã commit lên nhánh riêng. Đang mở Pull Request chờ CI…");
      const pr=await github("/pulls",token,{method:"POST",body:{
        title:"data(tts): train "+drafts.size+" pronunciation correction(s)",
        head:branch,base:"main",draft:false,
        body:"Cập nhật từ điển phiên âm Anh/Việt được người dùng phê duyệt từ TTS Studio.\n\n- Chỉ lưu từ/cụm từ và phiên âm; không lưu nội dung blog hay token.\n- PR được CI kiểm tra và auto-merge nếu toàn bộ required checks xanh.\n- Dữ liệu chỉ xuất hiện trên website sau khi merge và triển khai Pages."
      }});
      const link=String(pr.html_url||"");
      if(!/^https:\/\/github\.com\/duynguyenaver\/blognaver\/pull\/\d+$/.test(link))
        throw Error("GitHub không trả về URL Pull Request hợp lệ; kiểm tra nhánh "+branch+".");
      const output=$("pronunciationPullRequest");
      if(output){output.href=link;output.textContent="Xem PR #"+pr.number+" · Chờ CI và auto-merge";output.hidden=false}
      // Changes are in the PR branch, NOT on main yet; keep a separate in-session overlay.
      for(const [k,v] of drafts)submitted.set(k,v);
      drafts.clear();
      refresh();preview();
      status("Đã lưu thay đổi lên GitHub trong PR #"+pr.number+". PR đang chờ CI/auto-merge; sau khi merge và deploy, các thiết bị khác sẽ nhận từ điển mới.");
    }catch(e){status("Chưa xác nhận lưu lên GitHub: "+(e.message||"Có lỗi xảy ra.")+" Bản chỉnh sửa trong tab vẫn được giữ.",true)}
    finally{saving=false;$("pronunciationSaveGithub").disabled=false}
  }

  async function load(){
    try{
      const response=await fetch("pronunciation-dictionary.json?version="+Date.now(),{cache:"no-store",credentials:"same-origin"});
      if(!response.ok)throw Error("HTTP "+response.status);
      const value=sanitizeList(await response.json());
      store.clear();for(const [k,v] of value)store.set(k,v);
      for(const [k,v] of submitted){
        const current=store.get(k)||null;
        if(JSON.stringify(current)===JSON.stringify(v))submitted.delete(k);
      }
      loaded=true;
      refresh();preview();
      status("Đã tải "+store.size+" quy tắc từ từ điển GitHub đã triển khai. Các mục bổ sung sẽ có hiệu lực trong tab này ngay khi thêm.");
    }catch(e){
      refresh();status("Không tải được từ điển đã xuất bản ("+e.message+"). Các quy tắc có sẵn trong mã vẫn hoạt động. Không xóa bản nháp.",true);
    }finally{readyResolve()}
  }
  const api=Object.freeze({apply:applyAll,validate,normalize:normalized,ready,activeEntries,
    stage:entry=>{const value=validate(entry);drafts.set(key(value.term),value);return value},
    list:()=>activeEntries().map(x=>({...x})),load});
  window.BNPronunciationTraining=api;
  if($("pronunciationTraining")){
    $("pronunciationEntryForm")?.addEventListener("submit",addRule);
    $("pronunciationSaveGithub")?.addEventListener("click",saveGitHub);
    $("pronunciationPreview")?.addEventListener("input",preview);
    $("pronunciationRefresh")?.addEventListener("click",()=>{
      if(drafts.size && !confirm("Tải lại từ điển đã xuất bản? Các mục đang soạn vẫn được giữ."))return;
      load();
    });
    load();
  }else{readyResolve()}
})();
