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
try{const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(k),{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error("HTTP "+r.status+" · "+String(d.error?.message||"API không khả dụng").slice(0,100));const models=(d.models||[]).filter(x=>(x.supportedGenerationMethods||[]).includes("generateContent"));if(!models.length)throw Error("Không có model generateContent");
const ranked=models.filter(x=>/flash/i.test(x.name)&&!/preview|experimental|exp-/i.test(x.name)).concat(models.filter(x=>!/flash/i.test(x.name)&&!/preview|experimental|exp-/i.test(x.name)));
let working=null,lastFailure="";
for(const model of ranked.slice(0,6)){
 const probe=await fetch("https://generativelanguage.googleapis.com/v1beta/"+model.name+":generateContent?key="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"Reply with OK."}]}],generationConfig:{maxOutputTokens:24}})});
 if(probe.ok){working=model.name;break}
 let msg="";try{const err=await probe.json();msg=String(err.error?.message||"")}catch{}
 lastFailure="HTTP "+probe.status+" "+msg.slice(0,130);
 if([401,403,429].includes(probe.status))break;
}
if(!working)throw Error("Đọc được model nhưng generateContent chưa hoạt động: "+lastFailure);
sessionStorage.setItem("bn_cms_v2_gemini_model",working);
key.dispatchEvent(new Event("change",{bubbles:true}));status(gem,"Đã kết nối",true);details.textContent="Đã gọi generateContent thành công với "+working+". Quota những lần gọi sau có thể thay đổi.";document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:true}}))}catch(e){status(gem,"Kết nối thất bại",false);details.textContent=e.message;document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:false}}))}finally{check.disabled=false}};
disconnect.onclick=()=>{key.value="";sessionStorage.removeItem("bn_cms_v2_gemini_key");sessionStorage.removeItem("bn_cms_v2_gemini_model");key.dispatchEvent(new Event("change",{bubbles:true}));status(gem,"Chưa kết nối",false);details.textContent="Đã ngắt Gemini trong CMS V2.";document.dispatchEvent(new CustomEvent("cmsv2:gemini-status",{detail:{connected:false}}))};
const original=document.getElementById("v2GeminiSuggest");if(original){original.addEventListener("click",e=>{if(gem.dataset.connected!=="true"){e.stopImmediatePropagation();document.querySelector('[data-page="integrations"]')?.click();details.textContent="Kết nối Gemini trước khi sử dụng phân loại AI.";key.focus()}},true)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()})();