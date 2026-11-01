(()=>{"use strict";
const $=id=>document.getElementById(id),ENC="data.enc.json",PER_PAGE=10;
let envelope=null,transactions=[],budgets={},currentKey="",page=1,currentHash="",fetchInFlight=false;
const todayMonth=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
const money=n=>Math.round(Number(n)||0).toLocaleString("vi-VN")+" ₫";
const text=(node,value)=>{node.textContent=String(value)};
const rowsOf=month=>transactions.filter(r=>r.date.slice(0,7)===month);
const total=(rows,type)=>rows.filter(x=>x.type===type).reduce((n,x)=>n+x.amount,0);
const setStatus=(name,detail,kind="")=>{text($("syncTitle"),name);text($("syncDetail"),detail);$("syncDot").className="dot"+(kind?" "+kind:"")};
const b64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
async function decrypt(doc,password){
 if(!doc||doc.version!==1||doc.algorithm!=="AES-256-GCM"||!doc.salt||!doc.nonce||!doc.ciphertext)throw Error("Bản đồng bộ mã hóa không hợp lệ");
 const root=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
 const key=await crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:b64(doc.salt),iterations:doc.iterations||310000},root,{name:"AES-GCM",length:256},false,["decrypt"]);
 const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(doc.nonce)},key,b64(doc.ciphertext));
 const value=JSON.parse(new TextDecoder().decode(raw));
 if(!Array.isArray(value.transactions)||!value.budgets||typeof value.budgets!=="object")throw Error("Định dạng dữ liệu không đúng");
 return value;
}
function safeRows(data){
 return data.transactions.filter(x=>x&&/^\d{4}-\d\d-\d\d$/.test(x.date)&&["Chi","Thu"].includes(x.type)&&Number.isSafeInteger(x.amount)&&x.amount>=0).map(x=>({
  date:x.date,type:x.type,amount:x.amount,category:String(x.category||"Khác"),description:String(x.description||""),method:String(x.method||""),note:String(x.note||""),id:String(x.id||"")
 }));
}
function monthOffset(month,n){const [y,m]=month.split("-").map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
function el(tag,value,className){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(className)n.className=className;return n}
function renderTable(){
 const month=$("month").value,query=$("search").value.trim().toLocaleLowerCase("vi-VN"),type=$("typeFilter").value;
 const rows=rowsOf(month).filter(x=>(type==="all"||x.type===type)&&[x.category,x.description,x.note,x.method,x.id].join(" ").toLocaleLowerCase("vi-VN").includes(query)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 const max=Math.max(1,Math.ceil(rows.length/PER_PAGE));page=Math.min(page,max);const display=rows.slice((page-1)*PER_PAGE,page*PER_PAGE),tbody=$("transactions");
 tbody.replaceChildren();for(const x of display){
  const tr=el("tr"),a=el("td",x.date),b=el("td"),badge=el("span",x.type,"tx-type"+(x.type==="Thu"?" income":""));b.append(badge);
  const c=el("td"),label=el("b",x.category),desc=el("small",x.description+(x.note?" · "+x.note:""));c.append(label,desc);
  const d=el("td",x.method||"—"),e=el("td",(x.type==="Thu"?"+ ":"− ")+money(x.amount),"number "+(x.type==="Thu"?"amount-income":"amount-expense"));
  tr.append(a,b,c,d,e);tbody.append(tr);
 }
 $("tableEmpty").hidden=rows.length>0;
 $("rowCount").textContent=rows.length+" giao dịch";
 $("pageLabel").textContent="Trang "+page+" / "+max;
 $("prev").disabled=page<=1;$("next").disabled=page>=max;
}
function render(){
 const month=$("month").value,rows=rowsOf(month),spent=total(rows,"Chi"),income=total(rows,"Thu"),budget=Number(budgets[month]||0);
 text($("spent"),money(spent));text($("income"),money(income));text($("net"),money(income-spent));
 text($("expenseCount"),rows.filter(r=>r.type==="Chi").length+" khoản chi");text($("incomeCount"),rows.filter(r=>r.type==="Thu").length+" khoản thu");
 text($("remaining"),budget>0?money(budget-spent):"—");
 text($("budgetHint"),budget>0?"Hạn mức "+money(budget):"Chưa khai báo ngân sách");
 const ratio=budget>0?spent/budget:0,percent=Math.round(ratio*100);
 text($("budgetUsed"),budget>0?percent+"% ngân sách đã dùng":"Chưa đặt ngân sách");
 text($("budgetDescription"),budget>0?money(spent)+" / "+money(budget)+(spent>budget?" · Đã vượt "+money(spent-budget):" · Còn "+money(budget-spent)):"Nhập ngân sách tháng tại tab ngansach của Google Sheets.");
 $("budgetFill").style.width=Math.min(100,percent)+"%";$("budgetMeter").classList.toggle("over",ratio>1);$("budgetMeter").setAttribute("aria-valuenow",String(Math.min(100,percent)));
 const cats=new Map();rows.filter(r=>r.type==="Chi").forEach(r=>cats.set(r.category,(cats.get(r.category)||0)+r.amount));
 $("categories").replaceChildren();if(!cats.size)$("categories").append(el("p","Chưa có chi tiêu trong tháng này."));
 else for(const [cat,sum] of [...cats].sort((a,b)=>b[1]-a[1])){
  const item=el("div"),head=el("div",undefined,"category-head"),track=el("div",undefined,"category-track"),fill=el("div",undefined,"category-fill");
  head.append(el("span",cat),el("strong",money(sum)));fill.style.width=(spent?100*sum/spent:0)+"%";track.append(fill);item.append(head,track);$("categories").append(item);
 }
 const last=monthOffset(month,-1),previous=total(rowsOf(last),"Chi"),delta=spent-previous;
 text($("comparison"),previous>0?(delta===0?"Chi tiêu bằng tháng trước.":"Chi tiêu "+(delta>0?"tăng ":"giảm ")+money(Math.abs(delta))+" ("+Math.round(Math.abs(delta)/previous*100)+"%) so với "+last+"."):"Chưa có khoản chi tháng "+last+" để so sánh.");
 text($("advice"),budget>0?(ratio>1?"Đã vượt hạn mức. Kiểm tra các giao dịch theo danh mục để điều chỉnh.":ratio>=.8?"Đã sử dụng ít nhất 80% ngân sách.":"Chi tiêu đang trong hạn mức tháng."): "Bạn có thể đặt ngân sách tháng trong tab ngansach để nhận cảnh báo.");
 const months=Array.from({length:6},(_,i)=>monthOffset(month,i-5)),trend=$("trend"),ceiling=Math.max(1,...months.flatMap(m=>[total(rowsOf(m),"Chi"),total(rowsOf(m),"Thu")]));
 trend.replaceChildren();for(const m of months){
  const exp=total(rowsOf(m),"Chi"),inc=total(rowsOf(m),"Thu"),item=el("div",undefined,"trend-row"),bars=el("div",undefined,"trend-bars"),e=el("div",undefined,"exp"),i=el("div");
  e.style.width=(100*exp/ceiling)+"%";i.style.width=(100*inc/ceiling)+"%";e.title="Chi "+money(exp);i.title="Thu "+money(inc);bars.append(e,i);item.append(el("span",m.slice(5)+"/"+m.slice(2,4)),bars,el("strong",money(exp)));trend.append(item);
 }
 renderTable();
 if(window.BNFinanceReport&&typeof window.BNFinanceReport.render==="function"){
  window.BNFinanceReport.render({month,rows,transactions,budgets,spent,income,budget,money,monthOffset});
 }
}
async function apply(password,remember){
 const data=await decrypt(envelope,password);transactions=safeRows(data);budgets={};
 for(const [m,amount] of Object.entries(data.budgets))if(/^\d{4}-\d{2}$/.test(m)&&Number.isFinite(Number(amount)))budgets[m]=Number(amount);
 currentKey=password;currentHash=envelope.sourceHash||"";$("dashboard").hidden=false;$("unlockPanel").hidden=true;
 if(remember&&window.BNDeviceSecrets)await window.BNDeviceSecrets.save("monthly-expenses-passphrase",password);
 $("unlockError").textContent="";setStatus("Đã giải mã · "+transactions.length+" giao dịch","Bản đồng bộ được mã hóa · "+(envelope.updatedAt||"Không rõ thời điểm"),"good");
 text($("lastUpdated"),"Cập nhật dữ liệu mã hóa: "+(envelope.updatedAt||"—"));render();
}
async function fetchEncrypted(){
 if(fetchInFlight)return;
 fetchInFlight=true;
 try{
  setStatus("Đang kiểm tra dữ liệu mã hóa…","Đọc bản đã phát hành trên GitHub Pages.");
  const response=await fetch(ENC+"?v="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw Error(response.status===404?"Chưa có bản dữ liệu mã hóa. Cần kích hoạt workflow đồng bộ Google Sheets.":"HTTP "+response.status);
  const data=await response.json();
  if(data.version!==1)throw Error("Phiên bản dữ liệu chưa được hỗ trợ.");
  if(currentKey){if(data.sourceHash===currentHash){setStatus("Đang xem bản đã phát hành mới nhất","Chưa có bản dữ liệu mới trên GitHub Pages. Thay đổi ở Google Sheets cần qua Actions, PR và triển khai Pages.","good");return}
   envelope=data;try{await apply(currentKey,false)}catch(e){currentKey="";$("dashboard").hidden=true;$("unlockPanel").hidden=false;setStatus("Đã có bản đồng bộ mới","Hãy nhập mật khẩu mới để giải mã.","bad")}
  }else{envelope=data;setStatus("Đã tìm thấy bản dữ liệu mã hóa","Mở khóa để xem số liệu · "+(data.updatedAt||""),"good");
    if(window.BNDeviceSecrets){const saved=await window.BNDeviceSecrets.read("monthly-expenses-passphrase");if(saved){try{await apply(saved,false)}catch{setStatus("Cần mở khóa lại","Mật khẩu đã nhớ không giải mã được bản này.","bad")}}}
  }
 }catch(e){setStatus("Chưa thể tải bản đồng bộ",e.message,"bad");$("unlockError").textContent="Chưa có dữ liệu để mở. Kiểm tra GitHub Actions và quyền đọc Google Sheets."}
 finally{fetchInFlight=false}
}
$("month").value=todayMonth();$("refresh").addEventListener("click",fetchEncrypted);
$("unlockForm").addEventListener("submit",async e=>{e.preventDefault();if(!envelope){$("unlockError").textContent="Chưa có bản dữ liệu mã hóa từ GitHub Actions.";return}
 const button=$("unlockButton");button.disabled=true;try{await apply($("passphrase").value,$("remember").checked);$("passphrase").value=""}
 catch{$("unlockError").textContent="Mật khẩu không đúng hoặc dữ liệu bị lỗi. Kiểm tra lại mật khẩu trong Actions secret."}finally{button.disabled=false}});
$("lock").addEventListener("click",async()=>{currentKey="";transactions=[];budgets={};$("dashboard").hidden=true;$("unlockPanel").hidden=false;$("passphrase").value="";$("remember").checked=false;if(window.BNDeviceSecrets)await window.BNDeviceSecrets.forget("monthly-expenses-passphrase");setStatus("Đã khóa dữ liệu","Mật khẩu lưu trên thiết bị đã bị xóa.","good")});
$("month").addEventListener("change",()=>{page=1;render()});$("search").addEventListener("input",()=>{page=1;render()});$("typeFilter").addEventListener("change",()=>{page=1;render()});
$("prev").addEventListener("click",()=>{page=Math.max(1,page-1);renderTable()});$("next").addEventListener("click",()=>{page++;renderTable()});
$("exportCsv").addEventListener("click",()=>{
 const list=rowsOf($("month").value);const cells=[["Ngày","Loại","Danh mục","Nội dung","Số tiền (VND)","Phương thức","Ghi chú","Mã giao dịch"],...list.map(x=>[x.date,x.type,x.category,x.description,String(x.amount),x.method,x.note,x.id])];
 const csv="\uFEFF"+cells.map(row=>row.map(s=>'"'+String(s??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="chi-phi-thang-"+$("month").value+".csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
fetchEncrypted();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)fetchEncrypted()});
setInterval(()=>{if(!document.hidden)fetchEncrypted()},60*1000);
})();