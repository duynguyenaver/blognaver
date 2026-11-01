(()=>{
"use strict";
const $=id=>document.getElementById(id),limit=28;
let all=[],snapshot=[],display=[],meta={},page=0,card=0,shown=false,reviewed=new Set(),liveLoading=false;
const normal=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
const complete=x=>!!(x.context&&x.grammar&&(x.aiStatus==="ready"||x.aiStatus==="sheet"));
const languageNames={vi:"TIẾNG VIỆT",ko:"한국어",en:"ENGLISH"};
const safeLink=s=>typeof s==="string"&&/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/.test(s);
function setState(kind,title,detail){$("dot").className="dot "+kind;$("stateTitle").textContent=title;$("stateText").textContent=detail}
function prettyDate(s){const d=new Date(s);return s&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Ho_Chi_Minh"}).format(d):"chưa xác định"}
function select(){
 const q=normal($("query").value),filter=$("filter").value;
 display=all.filter(x=>(filter==="all"||(filter==="ready"?complete(x):!complete(x)))&&normal([x.vi,x.ko,x.en,x.content,x.context,x.grammar,x.examples?.vi,x.examples?.ko,x.examples?.en,x.sheetTitle,x.tabTitle].join(" ")).includes(q));
 page=0;card=0;shown=false;render();
}
function render(){
 $("total").textContent=all.length.toLocaleString("vi-VN");
 $("sheets").textContent=(meta.sources||[]).length;
 $("enriched").textContent=all.filter(complete).length.toLocaleString("vi-VN");
 $("reviewed").textContent=reviewed.size;
 $("count").textContent=display.length.toLocaleString("vi-VN")+" từ";
 const root=$("list");root.replaceChildren();
 const sliced=display.slice(page*limit,(page+1)*limit);
 if(!sliced.length)root.append(element("div",all.length?"Không tìm thấy từ phù hợp.":"Chưa có dữ liệu từ Google Sheets. Thêm từ vựng vào bảng nguồn rồi chạy đồng bộ.","empty"));
 for(const x of sliced){
  const article=element("article",undefined,"word"),head=element("div",undefined,"wordtop"),title=element("div");
  const korean=element("h3",x.ko||x.vi||x.en||x.content);korean.lang=x.ko?"ko":"vi";
  const trans=element("p",undefined,"trans");for(const [k,v] of [["vi",x.vi],["en",x.en]]){if(v){const span=element("span",v);span.lang=k;trans.append(span)}}title.append(korean,trans);
  const from=element("span",[x.sheetTitle,x.tabTitle].filter(Boolean).join(" / "),"origin");head.append(title,from);article.append(head);
  article.append(element("span",complete(x)?(x.aiStatus==="sheet"?"✓ ĐÃ CÓ NỘI DUNG TRONG SHEETS":x.aiProvider==="groq"?"✦ GROQ AI · ĐÃ BỔ SUNG":"✦ GEMINI AI · ĐÃ BỔ SUNG"):"◷ ĐANG CHỜ AI (GEMINI / GROQ)","ai-status"+(complete(x)?"":" pending")));
  const detail=element("details"),summary=element("summary","Xem ngữ cảnh và ví dụ ngữ pháp ▾");
  detail.append(summary);
  if(complete(x)){
   detail.append(element("p","Ngữ cảnh sử dụng: "+x.context));
   detail.append(element("p","Ngữ pháp & lưu ý: "+x.grammar));
   const examples=element("div",undefined,"examples");
   for(const [k,label] of [["vi","VI"],["ko","KR"],["en","EN"]]){if(x.examples?.[k]){const line=element("div"),b=element("b",label),span=element("span",x.examples[k]);span.lang=k;line.append(b,span);examples.append(line)}}
   detail.append(examples);
   if(Array.isArray(x.references)&&x.references.length){
    const refs=element("p","Nguồn tham khảo: ");
    for(const u of x.references.slice(0,4)){if(!/^https:\/\//.test(u))continue;try{const a=element("a",new URL(u).hostname+" ↗");a.href=u;a.target="_blank";a.rel="noopener noreferrer";refs.append(a,document.createTextNode(" · "))}catch{}}
    detail.append(refs);
   }
  }else detail.append(element("p","AI chưa bổ sung thông tin. Hệ thống sẽ thử Gemini hoặc Groq ở lượt đồng bộ tiếp theo. Từ vựng gốc vẫn được giữ."));
  article.append(detail);root.append(article);
 }
 const totalPages=Math.max(1,Math.ceil(display.length/limit));
 $("pagination").textContent="Trang "+(page+1)+" / "+totalPages;
 $("prev").disabled=page===0;$("next").disabled=page+1>=totalPages;
 renderCard();
}
function renderCard(){
 const x=display[card],lang=$("language").value;
 $("frontLabel").textContent=languageNames[lang];
 $("position").textContent=display.length?(card+1)+" / "+display.length:"0 / 0";
 $("frontWord").textContent=x?(x[lang]||x.ko||x.vi||x.en||x.content):"Chưa có từ vựng";
 $("frontWord").lang=lang;
 $("answer").hidden=!shown;$("hint").hidden=shown;
 if(x){
  const ans=[["vi","Tiếng Việt"],["ko","한국어"],["en","English"]].filter(([k])=>k!==lang&&x[k]).map(([k,label])=>label+": "+x[k]).join("\n");
  $("answer").textContent=ans+(shown&&complete(x)?"\n\nVí dụ: "+(x.examples[lang]||x.examples.ko||x.examples.vi):"");
 }else $("answer").textContent="";
 $("reveal").textContent=shown?"Ẩn nghĩa":"Hiện nghĩa";
 for(const id of ["reveal","speak","previousCard","mark","nextCard"])$(id).disabled=!x;
}
function cardMove(d){if(!display.length)return;card=(card+d+display.length)%display.length;shown=false;renderCard()}
async function load(){
 $("reload").disabled=true;setState("","Đang tải bản đồng bộ…","Đọc dữ liệu đã xác nhận từ GitHub Pages.");
 try{
  const res=await fetch("./vocabulary.json?nocache="+Date.now(),{cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status);
  const payload=await res.json();
  if(!Array.isArray(payload.items)||!Array.isArray(payload.sources))throw new Error("Định dạng dữ liệu không hợp lệ");
  all=payload.items.filter(x=>x&&typeof x==="object"&&(x.vi||x.ko||x.en||x.content));snapshot=all.slice();
  meta=payload;reviewed.clear();
  const list=$("sources");list.replaceChildren();
  for(const s of payload.sources){const row=element("div",undefined,"source"),a=element("a",s.title||"Google Sheet");
   if(safeLink(s.url)){a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";row.append(a)}else row.textContent=s.title||"Google Sheet";
   row.append(element("span"," · "+(s.count??0)+" từ"));list.append(row)}
  if(!payload.sources.length)list.append(element("p","Chưa có bảng tính được đồng bộ thành công."));
  if(payload.syncError)setState("bad","Đồng bộ gần nhất có cảnh báo",payload.syncError+" · Bản lưu hiện tại: "+prettyDate(payload.updatedAt));
  else if(!payload.updatedAt)setState("","Chờ đồng bộ lần đầu","Google Sheets mẫu đã kết nối; dữ liệu sẽ xuất hiện sau khi nguồn có hàng hợp lệ và tác vụ chạy thành công.");
  else setState("good","Đã đồng bộ Google Sheets","Cập nhật: "+prettyDate(payload.updatedAt)+". "+all.length+" mục từ "+payload.sources.length+" bảng tính.");
  select();
  await refreshLive();
 }catch(e){setState("bad","Không thể tải dữ liệu",e.message+". Kiểm tra việc triển khai dữ liệu GitHub Pages.");$("list").replaceChildren(element("div","Không thể tải bản dữ liệu. Vui lòng thử lại sau.","empty"))}
 finally{$("reload").disabled=false}
}
async function refreshLive(){
 if(liveLoading||document.hidden||!window.BNLiveVocabulary)return;
 liveLoading=true;
 try{
  const rows=await window.BNLiveVocabulary.query();
  all=window.BNLiveVocabulary.merge(rows,snapshot);
  const sheetId=window.BNLiveVocabulary.sheetId;
  const source=meta.sources?.find(s=>s.id===sheetId);
  if(source)source.count=rows.length;
  setState("good","Google Sheets · Đã đọc dữ liệu trực tiếp",
    "Đã xác nhận "+rows.length+" hàng trên Sheet1 lúc "+new Date().toLocaleTimeString("vi-VN")+
    ". Ngữ cảnh/AI được cập nhật sau khi GitHub Actions hoàn thành. Không có sync_id cho mỗi lần lưu.");
  select();
 }catch(e){
  if(snapshot.length||meta.updatedAt)setState("","Đang dùng bản GitHub gần nhất",
    "Không xác nhận được dữ liệu live từ Google Sheets ("+e.message+"). Kiểm tra quyền chia sẻ hoặc thử Tải lại.");
  else setState("bad","Chưa đọc được Google Sheets",
    e.message+". Dữ liệu có thể cần vài phút để được đồng bộ qua GitHub Actions.");
 }finally{liveLoading=false}
}
$("reload").addEventListener("click",load);
$("query").addEventListener("input",select);$("filter").addEventListener("change",select);
$("prev").addEventListener("click",()=>{if(page>0){page--;render()}});
$("next").addEventListener("click",()=>{if((page+1)*limit<display.length){page++;render()}});
$("language").addEventListener("change",()=>{shown=false;renderCard()});
$("reveal").addEventListener("click",()=>{shown=!shown;renderCard()});
$("previousCard").addEventListener("click",()=>cardMove(-1));$("nextCard").addEventListener("click",()=>cardMove(1));
$("mark").addEventListener("click",()=>{if(display[card])reviewed.add(display[card].id);$("reviewed").textContent=reviewed.size;cardMove(1)});
$("speak").addEventListener("click",()=>{if(!window.speechSynthesis||!display[card])return;window.speechSynthesis.cancel();const lang=$("language").value,u=new SpeechSynthesisUtterance(display[card][lang]||display[card].content||"");u.lang={vi:"vi-VN",ko:"ko-KR",en:"en-US"}[lang];u.rate=.86;window.speechSynthesis.speak(u)});
window.addEventListener("pageshow",e=>{if(e.persisted)load()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshLive()});
setInterval(()=>{if(!document.hidden)refreshLive()},30000);
load();
})();