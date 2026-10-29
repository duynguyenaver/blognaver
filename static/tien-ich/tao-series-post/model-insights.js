(()=>{"use strict";
const KEY="bn_series_model_request_outcomes_v1",LIMIT=2000;
const $=q=>document.querySelector(q);
function read(){try{const d=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(d)?d.filter(x=>x&&typeof x==="object"):[]}catch{return []}}
function record(provider,model,success,status=0){
 if(!["Gemini","Groq"].includes(provider)||!model)return;
 const records=read();records.push({at:Date.now(),provider,model,success:Boolean(success),status:Number(status)||0});
 try{localStorage.setItem(KEY,JSON.stringify(records.slice(-LIMIT)))}catch{}
 render();
}
function render(){
 const body=$("#modelInsightsRows");if(!body)return;
 const days=$("#modelInsightsPeriod")?.value||"30",cutoff=days==="all"?0:Date.now()-Number(days)*86400000;
 const grouped=new Map();
 for(const row of read()){
  if(row.at<cutoff)continue;
  const id=row.provider+" · "+row.model;
  const item=grouped.get(id)||{name:id,yes:0,no:0,quota:0};
  if(row.success)item.yes++;else{item.no++;if(row.status===429)item.quota++}
  grouped.set(id,item);
 }
 const all=[...grouped.values()].sort((a,b)=>{
  const ta=a.yes+a.no,tb=b.yes+b.no;
  return (b.yes/tb-a.yes/ta)||tb-ta||a.name.localeCompare(b.name);
 });
 body.replaceChildren();
 let good=0,total=0;
 for(const r of all){
  const count=r.yes+r.no,rate=Math.round(100*r.yes/count);
  total+=count;good+=r.yes;
  const tr=document.createElement("tr");
  for(const value of [r.name,String(r.yes),String(r.no),rate+"% ("+count+" request)",String(r.quota)]){
   const td=document.createElement("td");td.textContent=value;tr.append(td);
  }
  body.append(tr);
 }
 if(!all.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Chưa có request viết bài được ghi nhận. Tỷ lệ sẽ xuất hiện khi các model bắt đầu xử lý.";tr.append(td);body.append(tr)}
 $("#modelInsightsSummary").textContent=total?total+" request viết bài · "+good+" thành công · "+Math.round(100*good/total)+"% thành công tổng thể":"Chưa có dữ liệu request tạo nội dung trên thiết bị này.";
 const best=all.filter(x=>x.yes+x.no>=5)[0];
 $("#modelInsightsBest").textContent=best?"Gợi ý dựa trên ≥5 request: "+best.name+" ("+Math.round(100*best.yes/(best.yes+best.no))+"% thành công). Hãy đối chiếu thêm quota và loại công việc trước khi chọn.":"Chưa đủ dữ liệu (ít nhất 5 request/model) để gợi ý model.";
}
function ranked(provider,modelIds){
 const cutoff=Date.now()-30*86400000,stats=new Map();
 for(const row of read()){
  if(row.at<cutoff||row.provider!==provider)continue;
  const cur=stats.get(row.model)||{ok:0,total:0};cur.total++;if(row.success)cur.ok++;stats.set(row.model,cur);
 }
 return [...new Set(modelIds)].filter(Boolean).sort((a,b)=>{
  const x=stats.get(a)||{ok:0,total:0},y=stats.get(b)||{ok:0,total:0};
  return ((y.total?y.ok/y.total:0)-(x.total?x.ok/x.total:0))||(y.total-x.total)||a.localeCompare(b);
 });
}
window.BNModelInsights={record,render,ranked};
$("#modelInsightsPeriod")?.addEventListener("change",render);
$("#modelInsightsRefresh")?.addEventListener("click",render);
render();
})();