(()=>{"use strict";
const STORE="bn_series_research_history_v1",SITE="https://duynguyenaver.github.io/blognaver/";
const $=s=>document.querySelector(s);let rows=[];
try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");rows=Array.isArray(v)?v:[]}catch{}
const fmtTime=ms=>{const seconds=Math.round(ms/1000);if(seconds<60)return (Math.round(ms/6000)/10).toLocaleString("vi-VN")+" phút";const min=Math.floor(seconds/60),sec=seconds%60;return min+" phút"+(sec?" "+sec+" giây":"")};
const cell=(tr,value)=>{const td=document.createElement("td");td.textContent=String(value);tr.append(td);return td};
function save(){try{localStorage.setItem(STORE,JSON.stringify(rows.slice(0,150)))}catch{}}
function render(){
 $("#insightsDrafts").textContent=rows.filter(x=>x.state==="draft").length;
 $("#insightsCommits").textContent=rows.filter(x=>x.sha).length;
 $("#insightsLive").textContent=rows.filter(x=>x.live===true).length;
 const completed=rows.filter(x=>Number.isFinite(x.durationMs)&&x.durationMs>=0);$("#insightsAverage").textContent=completed.length?fmtTime(completed.reduce((a,x)=>a+x.durationMs,0)/completed.length):"—";
 const target=$("#insightsRows");target.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr");cell(tr,"Chưa có bài được ghi nhận trên thiết bị này.").colSpan=5;target.append(tr);return}
 for(const x of rows.slice(0,50)){
  const tr=document.createElement("tr"),first=cell(tr,x.title||x.slug||"Bản thảo"),slug=x.slug||"";
  if(slug){const link=document.createElement("a");link.href=SITE+"bai-viet/"+encodeURIComponent(slug)+"/";link.textContent="Xem URL live ↗";link.target="_blank";link.rel="noopener noreferrer";first.append(document.createElement("br"),link)}
  cell(tr,x.series==="lex-fridman"?"Lex Fridman":"ColdFusion");
  cell(tr,Number.isFinite(x.durationMs)?fmtTime(x.durationMs):"—");
  cell(tr,x.quota?.requests?Number(x.quota.tokens||0).toLocaleString("vi-VN")+" tokens · "+x.quota.requests+" requests":"—");
  const st=cell(tr,x.live?"Live ✓":x.sha?"Đã commit · Chờ live":"Bản thảo");
  if(x.sha){const a=document.createElement("a");a.href="https://github.com/duynguyenaver/blognaver/commit/"+x.sha;a.target="_blank";a.rel="noopener noreferrer";a.textContent=" · Commit ↗";st.append(a)}
  target.append(tr)
 }
}
function record(entry){if(!entry?.slug)return;const id=entry.slug;const match=rows.find(x=>x.slug===id);
 if(match)Object.assign(match,entry);else rows.unshift({...entry,at:Date.now()});
 save();render()
}
async function checkLive(){const candidates=rows.filter(x=>x.sha&&!x.live);$("#refreshInsights").disabled=true;
 try{for(const x of candidates.slice(0,30)){try{
  const response=await fetch(SITE+"bai-viet/"+encodeURIComponent(x.slug)+"/",{method:"GET",cache:"no-store"});
  if(response.ok){const html=await response.text();if(html.includes("<article")||html.includes(x.title))x.live=true}
 }catch{}}save();render()}finally{$("#refreshInsights").disabled=false}}
$("#refreshInsights").onclick=checkLive;
window.BNSeriesInsights={record,render,checkLive};render();
})();