(()=>{"use strict";
const BASE="https://api.github.com/repos/duynguyenaver/blognaver";
const $=id=>document.getElementById(id);
function node(t,text,cl){const e=document.createElement(t);if(text!=null)e.textContent=String(text);if(cl)e.className=cl;return e}
function link(text,url){const a=node("a",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function row(title,url,subtitle,status){const e=node("div",null,"workflow-item"),info=node("div");info.append(link(title,url),node("small",subtitle));e.append(info,node("span",status,"status-pill"));return e}
async function get(path){const headers={Accept:"application/vnd.github+json"};const auth=window.BNAuth?.header?.();if(auth)Object.assign(headers,auth);const res=await fetch(BASE+path,{headers,cache:"no-store"});if(!res.ok)throw Error("GitHub API HTTP "+res.status);return res.json()}
function info(id,v){$(id).textContent=String(v)}
function status(r){return r.status==="completed"?(r.conclusion||"neutral"):(r.status||"pending")}
const bad=new Set(["failure","timed_out","action_required"]);let inflight=false;
async function update(){if(inflight||document.hidden)return;inflight=true;try{
 let runs;
 try{const result=await get("/actions/runs?branch=main&per_page=20");runs=result.workflow_runs||[];localStorage.setItem("bn_insights_commit_runs",JSON.stringify(runs))}
 catch(error){runs=JSON.parse(localStorage.getItem("bn_insights_commit_runs")||"null");if(!runs)throw error;info("commitNote","Dữ liệu lưu gần nhất; GitHub hiện không phản hồi.")}
 const good=runs.filter(r=>status(r)==="success").length,failed=runs.filter(r=>bad.has(status(r))).length,other=runs.length-good-failed;
 info("commitSuccess",good);info("commitFailed",failed);info("commitPending",other);info("commitRate",good+failed?Math.round(100*good/(good+failed))+"%":"—");
 if(!$("commitNote").textContent.startsWith("Dữ liệu lưu"))info("commitNote","20 workflow gần nhất trên main · Cập nhật "+new Date().toLocaleTimeString("vi-VN"));
 const cr=$("commitRuns");cr.replaceChildren();runs.slice(0,8).forEach(r=>cr.append(row((r.display_title||"Workflow").slice(0,110),r.html_url||BASE.replace("api.github.com/repos","github.com")+"/actions",String(r.head_sha||"").slice(0,8)+" · "+new Date(r.created_at).toLocaleString("vi-VN"),status(r))));
 if(!runs.length)cr.append(node("p","Chưa có workflow.","muted"));
 }catch(e){info("commitNote","Không tải được Commit Status: "+e.message)}
 try{
 const prs=await get("/pulls?state=all&sort=updated&direction=desc&per_page=100");
 const auto=prs.filter(p=>(p.user?.type==="Bot"||/\[bot\]$/i.test(p.user?.login||"")||/(^|[^a-z])(auto[- ]?pr|automated|dependabot|renovate)([^a-z]|$)/i.test(p.title||"")||(p.labels||[]).some(l=>/^(automation|auto-pr|dependencies|automated)$/i.test(l.name||""))));
 const results=await Promise.all(auto.slice(0,15).map(async p=>{
  let failedCheck=null,reason="";
  if(!p.merged_at){
   try{const checks=await get("/commits/"+encodeURIComponent(p.head.sha)+"/check-runs?per_page=100");failedCheck=(checks.check_runs||[]).find(c=>bad.has(c.conclusion));if(failedCheck)reason="Check thất bại: "+failedCheck.name}
   catch(err){reason="Chưa đọc được check-runs ("+err.message+")"}
  }
  return {p,failedCheck,reason}
 }));
 const merged=auto.filter(p=>!!p.merged_at).length,fail=results.filter(x=>x.failedCheck).length;
 info("autoPrSuccess",merged);info("autoPrFailed",fail);info("autoPrOther",Math.max(0,auto.length-merged-fail));
 info("autoPrNote","Phát hiện "+auto.length+" Auto PR trong tối đa 100 PR cập nhật gần nhất. Lý do kỹ thuật cần xem log của check thất bại.");
 const box=$("autoPrList");box.replaceChildren();
 results.forEach(({p,failedCheck,reason})=>{
  const label=p.merged_at?"Đã merge":failedCheck?"CI failed":p.state==="closed"?"Đóng, chưa merge":"Đang mở / chờ CI";
  const item=row("#"+p.number+" · "+p.title,p.html_url,p.user?.login+" · "+new Date(p.updated_at).toLocaleString("vi-VN"),label);
  if(reason){const extra=node("small",reason);item.firstChild.append(extra);if(failedCheck?.html_url)item.firstChild.append(link("Xem check lỗi ↗",failedCheck.html_url));}
  box.append(item)
 });
 if(!results.length)box.append(node("p","Chưa tìm thấy PR tự động trong dữ liệu GitHub gần đây.","muted"));
 }catch(e){info("autoPrNote","Không tải được Auto PR: "+e.message)}
 finally{inflight=false}
}
document.getElementById("refreshInsights")?.addEventListener("click",update);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)update()});
setInterval(()=>{if(!document.hidden)update()},120000);update();
})();