(()=>{"use strict";
const STAGES={saved:"Cân nhắc",applied:"Đã nộp",screening:"Screening",hr:"HR",technical:"Technical",final:"Final",offer:"Offer",accepted:"Nhận offer",onboarding:"Onboarding",onboarded:"Onboarded",rejected:"Từ chối",withdrawn:"Rút hồ sơ",onhold:"Tạm hoãn"};
const $=id=>document.getElementById(id);
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=String(txt);if(cls)n.className=cls;return n};
function bar(root,label,value,max,detail){const row=el("div",undefined,"insight-bar"),heading=el("div",undefined,"insight-bar-top");heading.append(el("span",label),el("strong",detail??value));const track=el("div",undefined,"insight-track"),fill=el("div",undefined,"insight-fill");fill.style.width=(max?Math.max(0,Math.min(100,100*value/max)):0)+"%";track.append(fill);row.append(heading,track);root.append(row)}
function pct(a,b){return b?Math.round(a/b*100)+"%":"—"}
function lastDate(a){return a.history?.map(e=>e.at).sort().at(-1)||a.updatedAt||""}
function render(apps){
const total=apps.length;
const hit=(a,names)=>Array.isArray(a.history)&&a.history.some(e=>names.includes(e.stage))||names.includes(a.stage);
const responded=apps.filter(a=>hit(a,["screening","hr","technical","final","offer","accepted","onboarding","onboarded","rejected"])).length;
const interviewed=apps.filter(a=>hit(a,["hr","technical","final","offer","accepted","onboarding","onboarded"])).length;
const offered=apps.filter(a=>hit(a,["offer","accepted","onboarding","onboarded"])).length;
$("siResponse").textContent=pct(responded,total);$("siInterview").textContent=pct(interviewed,total);$("siOffer").textContent=offered;
const durations=apps.map(a=>{if(!a.appliedDate)return null;const first=(a.history||[]).filter(e=>e.stage!=="applied"&&e.stage!=="saved").map(e=>new Date(e.at).getTime()).filter(Number.isFinite).sort((a,b)=>a-b)[0];if(!first)return null;const days=(first-new Date(a.appliedDate+"T00:00:00").getTime())/86400000;return days>=0?days:null}).filter(n=>n!==null);
$("siTime").textContent=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length)+" ngày":"—";
const funnel=$("siFunnel");funnel.replaceChildren();for(const [label,n] of [["Đã nộp",apps.filter(a=>hit(a,["applied","screening","hr","technical","final","offer","accepted","onboarding","onboarded","rejected"])).length],["Có phản hồi",responded],["Đã phỏng vấn",interviewed],["Offer",offered],["Onboard",apps.filter(a=>a.stage==="onboarded").length]])bar(funnel,label,n,total);
const count={};for(const a of apps)count[a.stage]=(count[a.stage]||0)+1;const states=$("siStages");states.replaceChildren();if(!total)states.append(el("p","Chưa có dữ liệu.","insight-note"));for(const [stage,n] of Object.entries(count).sort((a,b)=>b[1]-a[1]))bar(states,STAGES[stage]||stage,n,total,n+" · "+pct(n,total));
const months={};for(const a of apps){if(!a.appliedDate)continue;const m=a.appliedDate.slice(0,7);if(/^\d{4}-\d{2}$/.test(m))months[m]=(months[m]||0)+1}const chart=$("siMonths");chart.replaceChildren();const pairs=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);if(!pairs.length)chart.append(el("p","Chưa có ngày ứng tuyển.","insight-note"));for(const [m,n] of pairs)bar(chart,m,n,Math.max(...pairs.map(x=>x[1])));
const now=new Date().toLocaleDateString("en-CA"),due=apps.filter(a=>a.nextAction&&a.nextActionDate&&a.nextActionDate<=now&&!["rejected","withdrawn","onboarded"].includes(a.stage)).sort((a,b)=>a.nextActionDate.localeCompare(b.nextActionDate));const priority=$("siPriorities");priority.replaceChildren();if(!due.length)priority.append(el("p","Không có công việc quá hạn hoặc đến hạn hôm nay.","insight-note"));for(const a of due.slice(0,6)){const line=el("div",undefined,"insight-priority"),txt=el("span");txt.append(el("strong",a.company),el("small",a.nextAction+" · "+a.nextActionDate));line.append(txt);const action=el("a","Xem hồ sơ ↗");action.href="?selected="+encodeURIComponent(a.id)+"#detail";line.append(action);priority.append(line)}
}
window.BNInterviewInsights={render};
})();