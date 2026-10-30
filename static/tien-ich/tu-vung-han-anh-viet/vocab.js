(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="bn_vocab_trilingual_v1";
let items=[],deleted={};try{items=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(items))items=[]}catch{}
const today=()=>new Date().toISOString().slice(0,10),norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const save=async()=>{await window.BNDiaryStore.set(KEY,{items,deleted});if(window.BNCloudSync?.isConnected()){try{await window.BNCloudSync.saveNow();return "cloud"}catch(e){return "pending: "+e.message}}return "device"},status=s=>{$("status").textContent=s};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const due=x=>!x.next||x.next<=today();
function clear(){ $("vocabForm").reset();$("editing").value="";$("save").textContent="Lưu từ vựng"}
function review(item){
 const root=$("review");root.replaceChildren();$("next").disabled=!items.length;
 if(!item){const empty=el("div",undefined,"empty-state");empty.append(el("strong","Bắt đầu với từ đầu tiên"),el("p","Ghi một từ mới ở mục 01 để tạo bộ flashcard của riêng bạn."));root.append(empty);return}
 const card=el("div",undefined,"flashcard"),inner=el("div",undefined,"flashcard-inner");
 const front=el("div",undefined,"flashcard-face flashcard-front"),back=el("div",undefined,"flashcard-face flashcard-back");
 front.append(el("span","TIẾNG HÀN","card-kicker"));const word=el("h3",item.ko);word.lang="ko";front.append(word,el("span","Bạn còn nhớ nghĩa của từ này?","card-hint"));
 back.append(el("span","NGHĨA CỦA TỪ","card-kicker"));const vi=el("p",item.vi,"meaning"),en=el("p",item.en||"Chưa có nghĩa tiếng Anh","english");vi.lang="vi";en.lang="en";back.append(vi,en);if(item.example)back.append(el("p",item.example,"example"));
 back.id="flashcardAnswer";back.setAttribute("aria-hidden","true");back.inert=true;inner.append(front,back);card.append(inner);
 const show=el("button","Hiện nghĩa ↻","primary reveal-button");show.type="button";show.setAttribute("aria-expanded","false");show.setAttribute("aria-controls","flashcardAnswer");
 show.onclick=()=>{const flipped=card.classList.toggle("is-flipped");front.setAttribute("aria-hidden",String(flipped));front.inert=flipped;back.setAttribute("aria-hidden",String(!flipped));back.inert=!flipped;show.setAttribute("aria-expanded",String(flipped));show.textContent=flipped?"Ẩn nghĩa ↻":"Hiện nghĩa ↻"};
 const actions=el("div",undefined,"review-actions");
 for(const [label,days] of [["↻ Chưa thuộc",1],["✓ Đã thuộc",7]]){const button=el("button",label,days===7?"primary review-known":"ghost review-again");button.type="button";button.onclick=async()=>{for(const b of actions.children)b.disabled=true;item.known=days===7;const d=new Date();d.setDate(d.getDate()+days);item.next=d.toISOString().slice(0,10);item.updated=Date.now();try{const target=await save();status(target==="cloud"?"✓ Đã đồng bộ tiến độ học lên GitHub.":"Đã lưu tạm; GitHub chưa đồng bộ.")}catch(e){status("Lưu thất bại: "+e.message)}render();$("review").querySelector(".reveal-button")?.focus({preventScroll:true})};actions.append(button)}
 root.append(card,show,actions)
}
function render(keepReview=false){
 const q=norm($("search").value),filter=$("filter").value,shown=items.filter(x=>(filter==="all"||filter==="due"&&due(x)||filter==="known"&&x.known)&&norm([x.ko,x.en,x.vi,x.example,x.source,x.category].join(" ")).includes(q));
 $("total").textContent=items.length;$("due").textContent=items.filter(due).length;$("learned").textContent=items.filter(x=>x.known).length;$("resultCount").textContent=shown.length+" / "+items.length+" từ";
 const root=$("list");root.replaceChildren();
 if(!shown.length){const empty=el("div",undefined,"empty-state");empty.append(el("strong",items.length?"Chưa tìm thấy từ phù hợp":"Kho từ đang chờ bạn"),el("p",items.length?"Thử từ khóa khác hoặc đổi bộ lọc tiến độ.":"Thêm từ vựng đầu tiên ở mục Ghi từ vựng mới."));root.append(empty)}
 for(const x of shown.slice().reverse()){
  const row=el("article",undefined,"item"),heading=el("div",undefined,"word-heading"),word=el("h3",x.ko);word.lang="ko";heading.append(word);row.append(heading);
  const translations=el("p",undefined,"word-translations"),en=el("span",x.en||"—"),vi=el("span",x.vi);en.lang="en";vi.lang="vi";translations.append(en,vi);row.append(translations);
  const badges=el("div",undefined,"word-badges");badges.append(el("span",x.category,"pill"),el("span",x.known?"✓ Đã thuộc":"Đang học",x.known?"pill pill-known":"pill"));if(due(x))badges.append(el("span","↻ Cần ôn","pill pill-due"));row.append(badges);
  if(x.example)row.append(el("p",x.example,"example"));if(x.source)row.append(el("p","Nguồn: "+x.source,"source"));
  const actions=el("div",undefined,"actions"),edit=el("button","Chỉnh sửa","ghost"),del=el("button","Xóa","ghost danger");edit.type=del.type="button";
  edit.setAttribute("aria-label","Chỉnh sửa từ "+x.ko);del.setAttribute("aria-label","Xóa từ "+x.ko);
  edit.onclick=()=>{for(const field of ["ko","en","vi","example","category","source"])$(field).value=x[field]||"";$("editing").value=x.id;$("save").textContent="Lưu thay đổi";$("entryPanel").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});$("ko").focus({preventScroll:true})};
  del.onclick=async()=>{if(!confirm("Xóa từ này khỏi sổ từ vựng?"))return;items=items.filter(i=>i.id!==x.id);deleted[x.id]=Date.now();try{const target=await save();status(target==="cloud"?"✓ Đã xóa và đồng bộ GitHub.":"Đã xóa trong phiên, lưu tạm để đồng bộ.")}catch(e){status("Lưu thất bại: "+e.message)}render()};actions.append(edit,del);row.append(actions);root.append(row)
 }
 if(!keepReview)review(items.find(due)||items[0])
}
$("vocabForm").onsubmit=async e=>{e.preventDefault();const input=Object.fromEntries(["ko","en","vi","example","category","source"].map(k=>[k,$(k).value.trim()]));if(!input.ko||!input.vi)return;const id=$("editing").value;const duplicate=items.find(x=>norm(x.ko)===norm(input.ko)&&x.id!==id);if(duplicate){status("Từ tiếng Hàn đã tồn tại. Hãy chỉnh sửa mục cũ.");return}try{const old=items.find(x=>x.id===id);if(old)Object.assign(old,input,{updated:Date.now()});else items.push({...input,id:crypto.randomUUID(),created:Date.now(),updated:Date.now(),known:false,next:today()});const target=await save();clear();render();status(target==="cloud"?"✓ Đã lưu từ vựng lên GitHub.":target.startsWith("pending:")?"Đã lưu bản tạm, chưa lên GitHub: "+target.slice(9):"Đã lưu bản dự phòng. Kết nối GitHub để đồng bộ.")}catch(err){status("Không thể lưu: "+err.message)}};
$("clear").onclick=clear;$("search").oninput=()=>render(true);$("filter").onchange=()=>render(true);$("next").onclick=()=>{const candidates=items.filter(due);if(!candidates.length){review(items[Math.floor(Math.random()*items.length)]);return}review(candidates[Math.floor(Math.random()*candidates.length)])};
window.BNPersonalData={read:()=>({items,deleted}),apply:async data=>{await window.BNDiaryStore.set(KEY,{items:data.items,deleted:data.deleted||{}});items=data.items;deleted=data.deleted||{};render()},ready:null};window.BNPersonalData.ready=(async()=>{const previous=await window.BNDiaryStore.get(KEY);if(previous){const oldItems=Array.isArray(previous)?previous:previous.items||[];const map=new Map();for(const item of [...oldItems,...items])map.set(item.id,item);items=[...map.values()];deleted=previous.deleted||{}}else{try{deleted=JSON.parse(localStorage.getItem("bn_cloud_deleted_vocabulary")||"{}")}catch{}}await window.BNDiaryStore.set(KEY,{items,deleted});render()})();
new MutationObserver(()=>{if(/^(Không thể|Đồng bộ thất bại|GitHub đã lưu thành công nhưng bộ nhớ)/.test($("backupStatus").textContent))$("cloudSyncDetails").open=true}).observe($("backupStatus"),{childList:true,subtree:true,characterData:true});
render();
})();