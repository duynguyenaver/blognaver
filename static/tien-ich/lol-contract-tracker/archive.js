/* BlogNaver historical LoL contract archive.
 * Leaguepedia/Fandom is an UNOFFICIAL archived mirror, not the Riot GCD.
 * Read-only metadata: dated page links, no bulk republication of wiki data.
 */
(()=>{
"use strict";
const BASE="https://lol.fandom.com/wiki/Archive:Global_Contract_Database";
const CODES=new Set(["KR","CN","EMEA","AME","APAC","VN"]);
const $=id=>document.getElementById(id);
const mk=(name,className,content)=>{
  const el=document.createElement(name);
  if(className)el.className=className;
  if(content!==undefined)el.textContent=String(content);
  return el;
};
const validDate=date=>typeof date==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&
  !Number.isNaN(Date.parse(date+"T00:00:00Z"))&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
const archiveURL=(code,date)=>{
 if(!CODES.has(code)||!validDate(date))return "";
 return BASE+"/"+code+"/"+date;
};
function validateArchive(doc){
 if(!doc||doc.version!==1||doc.sourceType!=="unofficial-community-history"||!Array.isArray(doc.regions))throw Error("Nguồn lưu trữ không hợp lệ.");
 const regions=[];
 for(const raw of doc.regions){
  if(!raw||!CODES.has(raw.code)||!Array.isArray(raw.dates))continue;
  const unique=[...new Set(raw.dates.filter(validDate))].sort().reverse().slice(0,36);
  regions.push({code:raw.code,name:String(raw.name||raw.code).slice(0,90),league:String(raw.league||"").slice(0,80),dates:unique,lastIndexedAt:raw.lastIndexedAt||null});
 }
 if(!regions.length)throw Error("Không có vùng được nhận dạng.");
 return {regions,checkedAt:doc.checkedAt||null};
}
let model=null;
function updateYears(){
 const region=$("archiveRegion").value;
 const active=$("archiveYear").value;
 const obj=model?.regions.find(r=>r.code===region);
 const years=[...new Set((obj?.dates||[]).map(v=>v.slice(0,4)))].sort().reverse();
 const select=$("archiveYear");
 select.replaceChildren(new Option("Tất cả năm",""));
 years.forEach(y=>select.add(new Option(y,y)));
 select.value=years.includes(active)?active:"";
}
function render(){
 const root=$("archiveList");root.replaceChildren();
 const region=$("archiveRegion").value,year=$("archiveYear").value,search=$("archiveSearch").value.trim();
 const row=model?.regions.find(r=>r.code===region);
 const indexURL=BASE+"/"+region;
 $("archiveIndex").href=indexURL;
 if(!row){
  $("archiveCount").textContent="Chưa có danh mục dữ liệu";
  root.append(mk("p","muted","Nguồn lịch sử chưa được tải. Bạn vẫn có thể mở Leaguepedia trực tiếp."));
  return;
 }
 const matches=row.dates.filter(d=>(!year||d.startsWith(year))&&(!search||d.includes(search))).slice(0,36);
 $("archiveCount").textContent=matches.length+" bản lưu tìm thấy · "+row.name;
 if(!matches.length){
  root.append(mk("p","muted","Chưa có ngày lưu trữ phù hợp trong danh mục đã đồng bộ. Bấm “Mở danh mục bản lưu” để xem đầy đủ tại Leaguepedia."));
 } else {
  for(const date of matches){
   const a=mk("a","archive-day");
   a.href=archiveURL(row.code,date);a.rel="noopener noreferrer";a.target="_blank";
   a.append(mk("strong","",date),mk("span","","Bản lưu "+row.league+" · Leaguepedia (không chính thức)"),mk("span","archive-arrow","↗"));
   root.append(a);
  }
 }
 const fullCount=row.dates.length;
 const sync=model.checkedAt?"Danh mục lấy từ trang lịch sử công khai ngày "+new Date(model.checkedAt).toLocaleDateString("vi-VN")+". ":"";
 $("archiveStatus").textContent=sync+"Đang lưu "+fullCount+" ngày bản lưu đã xác thực đường dẫn cho khu vực "+row.name+
  ". Đây là chỉ mục liên kết, không phải nội dung hợp đồng trực tiếp và không phải dữ liệu Riot thời gian thực.";
}
async function init(){
 try{
  const response=await fetch("archive.json",{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  model=validateArchive(await response.json());
  updateYears();render();
 }catch(error){
  $("archiveStatus").textContent="Không tải được danh mục Leaguepedia: "+error.message+". Nguồn Riot GCD vẫn hoạt động độc lập.";
  render();
 }
}
$("archiveRegion").addEventListener("change",()=>{updateYears();render()});
$("archiveYear").addEventListener("change",render);
$("archiveSearch").addEventListener("input",render);
window.BNLoLArchive=Object.freeze({archiveURL,validateArchive,validDate});
init();
})();