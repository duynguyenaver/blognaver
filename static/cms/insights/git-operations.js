(()=>{"use strict";
const API="https://api.github.com/repos/duynguyenaver/blognaver";
const $=id=>document.getElementById(id);
const bad=new Set(["failure","timed_out","action_required","startup_failure"]);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
function link(title,url){const a=el("a",title);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function card(title,url,detail,status){const n=el("div",null,"workflow-item"),desc=el("div");desc.append(link(title,url),el("small",detail));const pill=el("span",status,"status-pill");pill.dataset.status=status==="success"?"success":status==="failure"?"failure":"pending";n.append(desc,pill);return n}
function set(id,v){if($(id))$(id).textContent=String(v)}
const opts=()=>({headers:{Accept:"application/vnd.github+json",...(window.BNAuth?.header?.()||{})},cache:"no-store"});
async function fetchPage(path){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(API+path,{...opts(),signal:controller.signal});if(!r.ok)throw Error("GitHub API HTTP "+r.status+(r.status===403||r.status===429?" · rate limit hoặc token không đủ quyền":""));return r.json()}finally{clearTimeout(timer)}}
async function cached(key,loader){try{const data=await loader();try{localStorage.setItem(key,JSON.stringify({at:Date.now(),data}))}catch{}return {data,stale:false}}catch(e){let cache;try{cache=JSON.parse(localStorage.getItem(key)||"null")}catch{}if(cache?.data)return {data:cache.data,stale:true,error:e.message};throw e}}
async function pullStats(){
 const {data:prs,stale,error}=await cached("bn_pr_insights_v3",async()=>{
   const one=await fetchPage("/pulls?state=all&sort=updated&direction=desc&per_page=100&page=1");
   if(!Array.isArray(one))throw Error("Dữ liệu PR không hợp lệ");
   const next=one.length===100?await fetchPage("/pulls?state=all&sort=updated&direction=desc&per_page=100&page=2"):[];return [...one,...next];
 });
 const merged=prs.filter(p=>Boolean(p.merged_at)),unmerged=prs.filter(p=>!p.merged_at),open=unmerged.filter(p=>p.state==="open");
 // GitHub human-created PRs can be auto-merged by workflows. This is the actual PR count, not bot-only.
 set("autoPrTotal",prs.length);set("autoPrSuccess",merged.length);set("autoPrOther",unmerged.length);
 let failed=[];let unable=0;
 for(const p of unmerged.slice(0,12)){
   try{const x=await fetchPage("/commits/"+encodeURIComponent(p.head.sha)+"/check-runs?per_page=100");const checks=(x.check_runs||[]).filter(c=>bad.has(c.conclusion));if(checks.length)failed.push({p,checks})}
   catch{unable++}
 }
 set("autoPrFailed",unable?"—":failed.length);
 set("autoPrNote",prs.length+" PR gần nhất: "+merged.length+" đã merge, "+open.length+" đang mở, "+unmerged.filter(x=>x.state==="closed").length+" đóng chưa merge. "+(stale?"Bản lưu, dữ liệu có thể cũ. ":"")+(error||"")+(unable?" · Không kiểm tra được "+unable+" nhóm CI; số failed chưa thể xác nhận.":"")+" Chỉ kiểm tra CI của tối đa 12 PR chưa merge.");
 const root=$("autoPrList");root.replaceChildren();
 for(const p of prs.slice(0,18)){const f=failed.find(x=>x.p.number===p.number),status=p.merged_at?"success":f?"failure":p.state==="open"?"open":"closed";
  const n=card("#"+p.number+" · "+p.title,p.html_url,(p.user?.login||"")+" · "+new Date(p.updated_at).toLocaleString("vi-VN"),status);
  if(f){n.firstChild.append(el("small","CI lỗi: "+f.checks.map(c=>c.name).join(", ")));for(const c of f.checks.slice(0,2))if(c.html_url)n.firstChild.append(link(" Xem check ↗",c.html_url))}
  root.append(n);
 }
}
async function runStats(){
 const {data:runs,stale,error}=await cached("bn_deploy_history_v3",async()=>{
   let out=[];for(let page=1;page<=3;page++){const r=await fetchPage("/actions/runs?per_page=100&page="+page);if(!Array.isArray(r.workflow_runs))throw Error("Dữ liệu Actions không hợp lệ");out.push(...r.workflow_runs);if(r.workflow_runs.length<100)break;}return out;
 });
 const finished=runs.filter(r=>r.status==="completed"),success=finished.filter(r=>r.conclusion==="success"),failed=finished.filter(r=>bad.has(r.conclusion));
 const recovered=failed.map(f=>({failed:f,nextSuccess:runs.filter(s=>s.name===f.name&&s.conclusion==="success"&&new Date(s.created_at)>new Date(f.created_at)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))[0]}));
 set("deployAllCount",runs.length);set("deploySuccessCount",success.length);set("deployFailureCount",failed.length);set("deployRecoveryCount",recovered.filter(x=>x.nextSuccess).length);
 set("deployHistoryNote",(stale?"Dữ liệu cache, có thể đã cũ. ":"")+(error?error+" · ":"")+"Lịch sử GitHub Actions tối đa 3 trang, lọc theo kết quả thực tế; các lượt CI PR cũng được tính. 'Chạy thành công sau đó' không chứng minh cùng nguyên nhân đã được sửa.");
 const root=$("deployFailureList");root.replaceChildren();
 const list=recovered.slice(0,18);
 if(!list.length){root.append(el("p",runs.length?"Không thấy workflow thất bại trong phạm vi đã đọc.":"Chưa có dữ liệu workflow.","muted"));return}
 for(const {failed:f,nextSuccess:s} of list){
  const n=card((f.name||"Workflow")+" · #"+f.run_number,f.html_url, new Date(f.created_at).toLocaleString("vi-VN")+" · "+(f.head_branch||""),"failure");
  n.firstChild.append(el("small","Lý do cụ thể: cần đọc log job — không suy đoán từ tên workflow."));
  if(s){const note=el("small","Có lượt "+s.name+" thành công sau đó: #"+s.run_number+" ("+new Date(s.created_at).toLocaleString("vi-VN")+")");n.firstChild.append(note,link(" Mở run thành công ↗",s.html_url))}
  else n.firstChild.append(el("small","Chưa thấy lượt cùng workflow thành công sau đó trong dữ liệu đã tải."));
  root.append(n);
 }
}
let loading=false;
async function refresh(){if(loading||document.hidden)return;loading=true;const states=await Promise.allSettled([pullStats(),runStats()]);if(states[0].status==="rejected"){set("autoPrNote","Không đọc được PR: "+states[0].reason.message+" · Không hiển thị 0 thay cho dữ liệu lỗi.");}if(states[1].status==="rejected"){set("deployHistoryNote","Không đọc được Actions: "+states[1].reason.message+" · Không hiển thị 0 thay cho dữ liệu lỗi.");}loading=false}
$("refreshInsights")?.addEventListener("click",refresh);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
refresh();setInterval(()=>{if(!document.hidden)refresh()},120000);
})();
