(()=>{"use strict";
const KEY="blognaver.codex.quota.snapshots.v1";
const MAX_RECORDS=50, MAX_BYTES=120000;
let volatileRecords=null;
const $=id=>document.getElementById(id);
function windowData(obj){if(!obj||!Number.isFinite(obj.usedPercent)||obj.usedPercent<0||obj.usedPercent>100)return null;const seconds=Number(obj.resetsAt);return {remaining:Math.round((100-obj.usedPercent)*10)/10,reset:Number.isFinite(seconds)&&seconds>0?new Date(seconds*1000).toISOString():null};}
function parse(value){const root=value?.rateLimits;if(!root)throw Error("Không có dữ liệu rateLimits.");return {five:windowData(root.primary?.windowDurationMins===300?root.primary:root.secondary?.windowDurationMins===300?root.secondary:null),week:windowData(root.primary?.windowDurationMins===10080?root.primary:root.secondary?.windowDurationMins===10080?root.secondary:null)};}
function compact(records){
 return records.filter(x=>x&&typeof x.at==="string").slice(0,MAX_RECORDS).map(x=>({
  at:x.at,
  five:x.five?{remaining:x.five.remaining,reset:x.five.reset||null}:null,
  week:x.week?{remaining:x.week.remaining,reset:x.week.reset||null}:null
 }));
}
function read(){
 if(volatileRecords!==null)return compact(volatileRecords);
 try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?compact(v):[]}
 catch{return []}
}
function persist(records){
 let subset=compact(records);
 while(subset.length){
  const raw=JSON.stringify(subset);
  if(raw.length>MAX_BYTES){subset=subset.slice(0,Math.max(0,Math.floor(subset.length/2)));continue}
  try{localStorage.setItem(KEY,raw);volatileRecords=null;return true}
  catch(error){
   if(error?.name!=="QuotaExceededError"&&error?.name!=="NS_ERROR_DOM_QUOTA_REACHED"){
    console.warn("Quota snapshot storage unavailable:",error);break;
   }
   subset=subset.slice(0,Math.floor(subset.length/2));
  }
 }
 volatileRecords=compact(records).slice(0,MAX_RECORDS);
 console.warn("Quota snapshots stored in memory only; browser storage is full or unavailable.");
 return false;
}
function pct(x){return x==null?"—":String(Number(x.toFixed(1)))+"%";}
function update(prefix,data){const value=data?.remaining??null;$(prefix+"Remain").textContent=pct(value);$(prefix+"Reset").textContent=data?.reset?"Reset: "+new Date(data.reset).toLocaleString("vi-VN",{dateStyle:"short",timeStyle:"short"}):"Chưa có thời điểm reset";const bar=$(prefix+"Bar");bar.style.width=(value??0)+"%";bar.className="fill"+(value!==null&&value<10?" danger":value!==null&&value<25?" warn":"");}
function render(){const a=read(),last=a[0];update("five",last?.five);update("week",last?.week);$("freshness").textContent=last?"Cập nhật: "+new Date(last.at).toLocaleString("vi-VN"):"Chưa cập nhật";const history=$("history");history.replaceChildren();for(const record of a.slice(0,15)){const li=document.createElement("li");li.textContent=new Date(record.at).toLocaleString("vi-VN")+" · 5 giờ: "+pct(record.five?.remaining)+" · 7 ngày: "+pct(record.week?.remaining);history.append(li)}if(!a.length){const li=document.createElement("li");li.textContent="Chưa có bản ghi.";history.append(li)}}
window.BNQuotaStore={save(data){const windows=parse(data);if(!windows.five&&!windows.week)throw Error("Không có hạn mức 5 giờ hoặc 7 ngày.");const records=read();records.unshift({at:new Date().toISOString(),...windows});const stored=persist(records);render();return stored;},render};
$("clearHistory").addEventListener("click",()=>{if(confirm("Xóa lịch sử quota trên trình duyệt này?")){volatileRecords=[];try{localStorage.removeItem(KEY)}catch(error){console.warn("Unable to clear persisted quota history",error)}render()}});
render();
})();