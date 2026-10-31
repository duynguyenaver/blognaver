(()=>{"use strict";const $=id=>document.getElementById(id);
function start(){const host=$("intGeminiHost"),key=$("v2GeminiKey"),gh=$("intGithubState"),gem=$("intGeminiState");if(!host||!key)return;
const field=key.closest("label");if(field){host.append(field);field.classList.add("int-key-label")}
const details=$("intGeminiDetails"),check=$("intGeminiCheck"),disconnect=$("intGeminiDisconnect");
function status(el,text,ok){el.textContent=text;el.dataset.connected=ok?"true":"false"}
function github(){status(gh,$("connection")?.textContent.includes("đã kết nối")?"Đã kết nối":"Chưa kết nối",$("connection")?.textContent.includes("đã kết nối"))}
document.addEventListener("cmsv2:github-status",e=>status(gh,e.detail.connected?"Đã kết nối":"Chưa kết nối",!!e.detail.connected));github();
status(gem,key.value.trim()?"Chưa xác minh":"Chưa kết nối",false);
key.addEventListener("input",()=>{status(gem,key.value.trim()?"Chưa xác minh":"Chưa kết nối",false);details.textContent="Chưa kiểm tra key hiện tại.";});
check.onclick=async()=>{const k=key.value.trim();if(!k){status(gem,"Chưa kết nối",false);details.textContent="Nhập Gemini API key trong Integration.";return}
check.disabled=true;details.textContent="Đang kiểm tra Gemini models…";status(gem,"Đang kiểm tra",false);
try{const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(k),{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error("HTTP "+r.status+" · "+String(d.error?.message||"API không khả dụng").slice(0,100));const models=(d.models||[]).filter(x=>(x.supportedGenerationMethods||[]).includes("generateContent"));if(!models.length)throw Error("Không có model generateContent");key.dispatchEvent(new Event("change",{bubbles:true}));status(gem,"Đã kết nối",true);details.textContent="API key hợp lệ · "+models.length+" model generateContent. Quota sinh nội dung chưa được bảo đảm.";document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:true}}))}catch(e){status(gem,"Kết nối thất bại",false);details.textContent=e.message;document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:false}}))}finally{check.disabled=false}};
disconnect.onclick=()=>{key.value="";sessionStorage.removeItem("bn_cms_v2_gemini_key");key.dispatchEvent(new Event("change",{bubbles:true}));status(gem,"Chưa kết nối",false);details.textContent="Đã ngắt Gemini trong CMS V2.";document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:false}}))};
const original=document.getElementById("v2GeminiSuggest");if(original){original.addEventListener("click",()=>{if(!key.value.trim()){document.querySelector('[data-page="integrations"]')?.click();details.textContent="Kết nối Gemini trước khi sử dụng phân loại AI.";key.focus()}},true)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()})();