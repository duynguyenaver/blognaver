(()=>{"use strict";
/* Lightweight browser-side estimates. Official Google per-project quota is NOT exposed here. */
const root=document.querySelector("#quotaWidget");if(!root)return;
const $=s=>document.querySelector(s),STORE="bn_gemini_quota_estimate_v1",LIMITS="bn_gemini_quota_limits_v1";
let entries=[],until=0,timer=null;
try{const data=JSON.parse(sessionStorage.getItem(STORE)||"{}");entries=Array.isArray(data.entries)?data.entries:[];until=Number(data.until)||0}catch{}
const day=86400000,minute=60000,now=()=>Date.now(),wait=()=>Math.max(0,Math.ceil((until-now())/1000));
function persist(){try{sessionStorage.setItem(STORE,JSON.stringify({entries:entries.slice(-800),until}))}catch{}}
function limits(){return ["rpm","tpm","rpd"].map(k=>Number($("#"+k+"Limit").value)||0)}
function counts(){const time=now();entries=entries.filter(x=>x.at>time-day);return [entries.filter(x=>x.at>time-minute).length,entries.filter(x=>x.at>time-minute).reduce((sum,x)=>sum+x.tokens,0),entries.length]}
function status(){const cs=counts(),ls=limits(),fractions=cs.map((n,i)=>ls[i]?n/ls[i]:0),max=Math.max(...fractions),blocked=until>now();return {cs,ls,blocked,max}}
function draw(){
 const s=status(),badge=$("#quotaBadge");
 const severity=s.blocked?"danger":s.max>=0.7?"warning":"ok";
 badge.dataset.status=severity;badge.textContent=s.blocked?"429 · Chờ "+wait()+"s":severity==="warning"?"Cảnh báo quota":"Bình thường · ước lượng";
 [["rpm",0],["tpm",1],["rpd",2]].forEach(([name,i])=>{
  $("#"+name+"Value").textContent=s.cs[i].toLocaleString("vi-VN")+" / "+(s.ls[i]?s.ls[i].toLocaleString("vi-VN"):"?");
  $("#"+name+"Bar").style.width=(s.ls[i]?Math.min(100,100*s.cs[i]/s.ls[i]):0)+"%";
 });
 const cd=$("#quotaCountdown");cd.hidden=!s.blocked;
 cd.textContent=s.blocked?"Gemini đang giới hạn request. Thử lại sau "+wait()+" giây.":"";
 persist();
 if(!s.blocked&&timer){clearInterval(timer);timer=null}
}
function refreshCountdown(){if(!timer)timer=setInterval(draw,1000);draw()}
function set429(retrySeconds){until=now()+Math.max(1,Math.min(3600,Number(retrySeconds)||60))*1000;refreshCountdown()}
function record(tokens=0){entries.push({at:now(),tokens:Math.max(0,Number(tokens)||0)});draw()}
function canSend(estimated=0){
 const s=status();if(s.blocked)throw Error("Gemini đang giới hạn request. Chờ "+wait()+" giây rồi thử lại.");
 if(s.ls[0]&&s.cs[0]>=s.ls[0])throw Error("Đã chạm mức RPM ước lượng do bạn cấu hình. Chờ một phút.");
 if(s.ls[1]&&s.cs[1]+estimated>s.ls[1])throw Error("Có thể vượt TPM ước lượng. Hãy giảm nguồn hoặc chỉnh đúng mức quota.");
 if(s.ls[2]&&s.cs[2]>=s.ls[2])throw Error("Đã chạm RPD ước lượng của trình duyệt này.");
}
async function countTokens(model,contents,key,signal){
 if(!model||!key)return 0;
 try{
 const r=await fetch("https://generativelanguage.googleapis.com/v1beta/"+model+":countTokens",{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({contents}),signal});
 if(!r.ok)return 0;
 const data=await r.json();return Number(data.totalTokens)||0;
 }catch{return 0}
}
function estimateError(err,response,data){if(response?.status!==429)return;let secs=Number(response.headers.get("Retry-After"));if(!Number.isFinite(secs)||secs<1){
 const retry=(data?.error?.details||[]).find(x=>x.retryDelay)?.retryDelay;
 secs=retry?Math.ceil(Number.parseFloat(retry)):60;
 }set429(secs);err.retryAfter=secs}
$("#quotaBadge").onclick=()=>{const open=$("#quotaDetails").hidden;$("#quotaDetails").hidden=!open;$("#quotaBadge").setAttribute("aria-expanded",String(open))};
$("#quotaRefresh").onclick=()=>{document.querySelector("#testAI")?.click()};
try{const v=JSON.parse(localStorage.getItem(LIMITS)||"{}");for(const name of ["rpm","tpm","rpd"])if(v[name])$("#"+name+"Limit").value=v[name]}catch{}
for(const name of ["rpm","tpm","rpd"])$("#"+name+"Limit").addEventListener("change",()=>{const v=Object.fromEntries(["rpm","tpm","rpd"].map(k=>[k,Number($("#"+k+"Limit").value)||0]));localStorage.setItem(LIMITS,JSON.stringify(v));draw()});
window.BNQuota={canSend,record,estimateError,countTokens,refresh:draw};
if(until>now())refreshCountdown();draw();
})();