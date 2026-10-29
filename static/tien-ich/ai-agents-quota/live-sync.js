(()=>{"use strict";
const endpoint="http://127.0.0.1:19473/quota";
const button=document.getElementById("syncLive"),state=document.getElementById("liveState"),updated=document.getElementById("liveUpdated");
if(!button||!state||!updated)return;
let busy=false,lastError="";
async function refresh(manual=false){
  if(busy||document.hidden)return;
  busy=true;button.disabled=true;state.textContent="Đang kết nối…";
  try{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),21000);
    let response;
    try{response=await fetch(endpoint,{method:"GET",mode:"cors",cache:"no-store",credentials:"omit",signal:controller.signal});}
    finally{clearTimeout(timeout);}
    const result=await response.json();
    if(!response.ok||!result.rateLimits)throw new Error(result.error||"Bridge không trả dữ liệu quota");
    const raw=document.getElementById("json"),importButton=document.getElementById("import");
    // Use the existing validated parser/snapshot store. Never pass account credentials.
    raw.value=JSON.stringify({rateLimits:result.rateLimits});
    importButton.click();
    state.textContent="Đã kết nối Codex";
    updated.textContent="Đồng bộ từ Codex App Server: "+new Date().toLocaleTimeString("vi-VN");
    lastError="";
  }catch(e){
    state.textContent="Chưa kết nối";
    lastError=e.message||"Không thể kết nối";
    updated.textContent=(manual?"Không đồng bộ được: ":"Bridge chưa hoạt động. ")+lastError+". Chạy python3 scripts/codex-quota-bridge.py trên Mac.";
  }finally{busy=false;button.disabled=false;}
}
button.addEventListener("click",()=>refresh(true));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(!document.hidden)refresh();},90000);
refresh();
})();