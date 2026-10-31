(()=>{"use strict";
const endpoint="http://127.0.0.1:19474/quota";
const button=document.getElementById("syncLive"),state=document.getElementById("liveState"),status=document.getElementById("liveUpdated"),help=document.getElementById("bridgeHelp");
let busy=false;
async function refresh(){
 if(busy||document.hidden)return;
 busy=true;button.disabled=true;state.textContent="Đang kết nối…";
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),21000);
  let response;
  try{response=await fetch(endpoint,{mode:"cors",cache:"no-store",credentials:"omit",signal:controller.signal});}
  finally{clearTimeout(timeout)}
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"Bridge không trả dữ liệu quota");
  const stored=window.BNQuotaStore.save(data);
  state.textContent="Đã kết nối";status.textContent=stored?"Quota đã cập nhật trực tiếp từ Codex trên Mac.":"Quota đã cập nhật; bộ nhớ trình duyệt đầy nên lịch sử mới chỉ lưu tạm trong phiên này.";help.open=false;
 }catch(error){
  state.textContent="Chưa kết nối";
  status.textContent="Không thể đọc quota: "+(error instanceof TypeError?"Kiểm tra cầu nối và quyền localhost trong trình duyệt.":error.message);
  help.open=true;
 }finally{busy=false;button.disabled=false}
}
button.addEventListener("click",refresh);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
setInterval(()=>{if(!document.hidden)refresh()},90000);
refresh();
})();