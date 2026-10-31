/* Live Studio enhancement; never changes existing publish or GitHub auth code. */
(()=>{"use strict";
const KEY="blognaver_studio_draft_v1",BLOB_LIMIT=2*1024*1024;
const $=s=>document.querySelector(s);
function boot(){
 const editor=$("#editor"),main=$(".main-col"),settings=$(".settings");if(!editor||!main||!settings)return;
 const panel=document.createElement("section");panel.className="studio-preview-card";panel.setAttribute("aria-label","Xem trước trực tiếp");panel.innerHTML='<h2>LIVE PREVIEW · BẢN NHÁP</h2><article class="studio-preview-output" id="studioLivePreview" aria-live="off"></article>';
 main.after(panel);settings.style.gridColumn="1/-1";
 const zone=document.createElement("div");zone.className="studio-drop-zone";zone.tabIndex=0;zone.innerHTML='<strong>Thả ảnh vào đây để chèn vào bài</strong><small>PNG / JPEG / WebP / GIF · tối đa 2 MB · xem trước trên máy, cần GitHub để xuất bản</small>';
 editor.parentElement.append(zone);
 const toast=document.createElement("div");toast.className="studio-toaster";toast.hidden=true;toast.setAttribute("role","status");document.body.append(toast);let toastTimer;
 function notify(msg){toast.textContent=msg;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3500)}
 let dirty=false,ready=false,last="",sessionImages=[];
 const fields=["title","slug","category","tags","summary","date","cover"];
 function snapshot(){return {editing:new URLSearchParams(location.search).get("post")||"",...Object.fromEntries(fields.map(k=>[k,$("#"+k)?.value||""])),html:window.DOMPurify?.sanitize(editor.querySelector(".ql-editor")?.innerHTML||"",{USE_PROFILES:{html:true}})||""}}
 function render(){const dest=$("#studioLivePreview");const t=$("#title")?.value||"Tiêu đề bài viết";const h=document.createElement("h1");h.textContent=t;const article=document.createElement("div");article.innerHTML=window.DOMPurify?.sanitize(editor.querySelector(".ql-editor")?.innerHTML||"",{USE_PROFILES:{html:true}})||"";dest.replaceChildren(h,article)}
 function mark(){dirty=true;render()}
 editor.addEventListener("input",mark);
 fields.forEach(id=>$("#"+id)?.addEventListener("input",mark));
 const observe=new MutationObserver(()=>{if(editor.querySelector(".ql-editor")){render();if(!ready){ready=true;observe.disconnect()}}});observe.observe(editor,{childList:true,subtree:true});render();
 setInterval(()=>{if(!dirty)return;try{const data=JSON.stringify(snapshot());if(data===last){dirty=false;return}localStorage.setItem(KEY,data);if(localStorage.getItem(KEY)!==data)throw Error("Không thể xác minh bản nháp");last=data;dirty=false;const stamp=new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});notify("Đã tự động lưu nháp lúc "+stamp+" 🌟");$("#autosaveStatus")&&($("#autosaveStatus").textContent="Lưu cục bộ "+stamp)}catch(e){notify("Không lưu được bản nháp trên máy: "+e.message)}},5000);
 async function addFiles(files){for(const file of [...files]){if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>BLOB_LIMIT){notify("Ảnh không hợp lệ hoặc vượt 2 MB");continue}if(!window.Quill||!window.DOMPurify){notify("Trình biên tập chưa sẵn sàng");return}const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});const q=window.Quill.find(editor);if(!q){notify("Trình biên tập chưa sẵn sàng");return}const pos=q.getSelection(true)?.index??q.getLength();q.insertEmbed(pos,"image",image,"user");q.setSelection(pos+1);mark();notify("Đã chèn ảnh xem trước; cần upload ảnh lên GitHub trước khi xuất bản")}}
 zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("drag-over")});zone.addEventListener("dragleave",()=>zone.classList.remove("drag-over"));zone.addEventListener("drop",e=>{e.preventDefault();zone.classList.remove("drag-over");addFiles(e.dataTransfer.files).catch(()=>notify("Không đọc được ảnh"))});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
