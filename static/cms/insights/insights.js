(()=>{"use strict";
const API="https://api.github.com/repos/duynguyenaver/blognaver",SITE="https://duynguyenaver.github.io/blognaver/",KEY="blognaver_cms_activity_v1",PENDING="blognaver_cms_last_publish";
const $=s=>document.querySelector(s);
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
function activity(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function showActivity(){const area=$("#activityList");area.replaceChildren();const acts=activity();if(!acts.length){area.append(el("p","muted","Chưa có thao tác được lưu trên trình duyệt này."));return}for(const a of acts.slice(0,80)){const line=el("div","activity-item"),icon=el("div","activity-icon",a.type==="publish"?"↗":a.type==="draft"?"✎":"•"),info=el("div");info.append(el("strong","",a.message||a.type),el("small","",a.detail||""));const t=el("time","",new Date(a.time).toLocaleString("vi-VN"));line.append(icon,info,t);area.append(line)}}
const fmt=x=>new Date(x).toLocaleDateString("vi-VN");
function front(src){const m=src.match(/^---\s*\n([\s\S]*?)\n---/);return m?{fm:m[1],body:src.slice(m[0].length)}:{fm:"",body:src}}
function field(fm,name){const m=fm.match(new RegExp("^"+name+":\\s*(.*)$","m"));if(!m)return "";try{return JSON.parse(m[1].trim())}catch{return m[1].trim().replace(/^['"]|['"]$/g,"")}}
function decode(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)))}
async function fetchJSON(url){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);try{const res=await fetch(url,{headers:{Accept:"application/vnd.github+json",...(window.BNAuth?.header()||{})},cache:"no-store",signal:ctrl.signal});if(!res.ok)throw Error("GitHub API HTTP "+res.status+(res.status===403?" · Có thể đã chạm rate limit":""));return await res.json()}finally{clearTimeout(timer)}}
function metric(k,v){const e=document.querySelector('[data-stat="'+k+'"]');if(e)e.textContent=String(v)}
function pendingNotice(runs){let obj;try{obj=JSON.parse(sessionStorage.getItem(PENDING)||"null")}catch{}if(!obj)return;const box=$("#publishNotice");box.hidden=false;box.replaceChildren();const heading=el("strong","", "Đã tạo commit cho bài: "+(obj.title||obj.slug));box.append(heading);const sha=String(obj.sha||"");let run=runs.find(r=>r.head_sha===sha);const desc=el("p","",run?"Workflow: "+(run.status==="completed"?(run.conclusion==="success"?"Deploy thành công":"Đã kết thúc: "+run.conclusion):run.status==="in_progress"?"Đang chạy":"Đang chờ"):"Đang chờ GitHub tạo workflow cho commit.");box.append(desc);const a=el("a","","Xem commit ↗");a.href="https://github.com/duynguyenaver/blognaver/commit/"+encodeURIComponent(sha);a.target="_blank";a.rel="noopener noreferrer";box.append(a);if(run?.conclusion==="success"){const link=el("a",""," · Mở bài trên website ↗");link.href=SITE+"posts/"+encodeURIComponent(obj.slug)+"/";link.target="_blank";link.rel="noopener noreferrer";box.append(link)}}
let workflowRetryAfter=0;
async function workflows(){
 const cacheKey="blognaver_insights_workflows_v1";
 let runs=null,stale=false;
 if(Date.now()<workflowRetryAfter){try{runs=JSON.parse(localStorage.getItem(cacheKey)||"null")}catch{}stale=true}
 if(!runs){
  try{const data=await fetchJSON(API+"/actions/runs?branch=main&per_page=8");runs=data.workflow_runs||[];try{localStorage.setItem(cacheKey,JSON.stringify(runs))}catch{}}
  catch(e){workflowRetryAfter=Date.now()+15*60*1000;stale=true;try{runs=JSON.parse(localStorage.getItem(cacheKey)||"null")}catch{}if(!runs){try{const response=await fetch("../workflows-snapshot.json",{cache:"no-store"});if(response.ok){const snapshot=await response.json();if(Array.isArray(snapshot.workflow_runs))runs=snapshot.workflow_runs}}catch{}}if(!runs){const node=$("#workflowList");node.replaceChildren();const msg=el("p","muted","GitHub đang giới hạn API và chưa có bản dữ liệu dự phòng.");const a=el("a","","Xem trạng thái trực tiếp trên GitHub Actions ↗");a.href="https://github.com/duynguyenaver/blognaver/actions";a.target="_blank";a.rel="noopener noreferrer";node.append(msg,a);metric("running","—");pendingNotice([]);return}}
 }
 if(stale){const note=$("#workflowList");note.setAttribute("data-stale","true")}else $("#workflowList").removeAttribute("data-stale");
 metric("running",runs.filter(r=>r.status!=="completed").length);const node=$("#workflowList");node.replaceChildren();if(stale)node.append(el("p","muted","Đang hiển thị lịch sử workflow gần nhất (cache/snapshot). GitHub API sẽ được thử lại sau 15 phút."));for(const r of runs.slice(0,7)){const status=r.status==="completed"?(r.conclusion||"neutral"):r.status;const row=el("div","workflow-item"),box=el("div");const a=el("a","",String(r.head_sha||"").slice(0,8)+" · "+(r.display_title||"Workflow"));a.href=r.html_url;a.target="_blank";a.rel="noopener noreferrer";box.append(a,el("small","",("#"+r.run_number)+" · "+(r.created_at?new Date(r.created_at).toLocaleString("vi-VN"):"")));const pill=el("span","status-pill",({success:"Thành công",failure:"Thất bại",in_progress:"Đang chạy",pending:"Đang chờ",queued:"Xếp hàng",cancelled:"Đã hủy"})[status]||status);pill.dataset.status=status;row.append(box,pill);node.append(row)}pendingNotice(runs)}
async function posts(){
 const cacheKey="blognaver_insights_posts_v2";
 let data=null,stale=false;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let response;try{response=await fetch("../posts-index.json",{cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error("HTTP "+response.status);
  data=await response.json();
  if(!Array.isArray(data.posts))throw Error("Chỉ mục bài viết không hợp lệ");
  try{localStorage.setItem(cacheKey,JSON.stringify(data))}catch{}
 }catch(e){
  try{data=JSON.parse(localStorage.getItem(cacheKey)||"null")}catch{}
  if(!data?.posts)throw Error("Không tải được chỉ mục bài viết. Chờ deploy mới hoàn tất rồi tải lại trang.");
  stale=true;
 }
 const items=data.posts;
 metric("total",items.length);
 metric("published",items.filter(x=>!x.draft).length);
 metric("drafts",items.filter(x=>x.draft).length);
 const denominator=items.length||1;
 $("#wordsAverage").textContent=items.length?Math.round(items.reduce((a,x)=>a+(Number(x.words)||0),0)/denominator).toLocaleString("vi-VN"):"—";
 $("#coverRate").textContent=items.length?Math.round(items.filter(x=>x.cover).length/denominator*100)+"%":"—";
 $("#tagRate").textContent=items.length?Math.round(items.filter(x=>Array.isArray(x.tags)&&x.tags.length).length/denominator*100)+"%":"—";
 const counts={};for(const x of items){for(const c of Array.isArray(x.category)?x.category:[]){counts[c]=(counts[c]||0)+1}}
 $("#categoryCount").textContent=Object.keys(counts).length;
 const graph=$("#categoriesChart");graph.replaceChildren();
 for(const [name,n] of Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8)){
  const line=el("div","category-line");line.append(el("span","",name));const track=el("div","category-track"),bar=el("div","category-fill");
  bar.style.width=(100*n/Math.max(1,items.length))+"%";track.append(bar);line.append(track,el("span","",n));graph.append(line)
 }
 if(!graph.childNodes.length)graph.append(el("p","muted","Chưa có category."));
 $("#samplingNote").textContent="Hiển thị đầy đủ "+items.length+" bài kể cả bản nháp. "+(stale?"Đang dùng dữ liệu lưu trên thiết bị.":"Chỉ mục được tạo khi deploy lúc "+new Date(data.generatedAt).toLocaleString("vi-VN")+".");
 const tbody=$("#articleRows");tbody.replaceChildren();
 for(const x of items){
  const tr=el("tr");
  tr.append(el("td","",x.title),el("td","",x.draft?"Bản nháp (chưa xuất bản)":"Đã bật xuất bản (draft: false)"),el("td","",(x.category||[]).join(", ")||"—"),el("td","",x.date&&!isNaN(Date.parse(x.date))?fmt(x.date):"—"));
  const cell=el("td");
  const a=el("a","",x.draft?"Sửa trong CMS ↗":"Mở bài ↗");
  a.href=x.draft?"../?post="+encodeURIComponent(x.slug):SITE+"posts/"+encodeURIComponent(x.slug)+"/";
  a.target="_blank";a.rel="noopener noreferrer";cell.append(a);tr.append(cell);tbody.append(tr)
 }
 if(!items.length){const tr=el("tr"),td=el("td","","Chưa có bài viết trong repository.");td.colSpan=5;tr.append(td);tbody.append(tr)}
 return stale?"Danh sách bài đang dùng dữ liệu lưu gần nhất.":"";
}
async function refresh(){const b=$("#refreshInsights");b.disabled=true;$("#lastSync").textContent="Đang đồng bộ GitHub…";const results=await Promise.allSettled([workflows(),posts()]);const errors=results.filter(x=>x.status==="rejected").map(x=>x.reason.message);$("#lastSync").textContent=(errors.length?"Một phần dữ liệu chưa cập nhật: "+errors.join("; "):"Đã tải thống kê lúc "+new Date().toLocaleTimeString("vi-VN"))+" · Danh sách bài lấy từ bản deploy mới nhất; workflow theo GitHub API.";b.disabled=false}
function showAuth(){const has=!!window.BNAuth?.read();const label=$("#authState"),button=$("#insightsDisconnect");if(label)label.textContent=has?"● Đang dùng GitHub của CMS":"Chưa đăng nhập GitHub · vẫn đọc được bài viết";if(button)button.hidden=!has}
$("#insightsDisconnect")?.addEventListener("click",()=>{if(confirm("Xóa GitHub token đã ghi nhớ trên thiết bị?")){window.BNAuth?.forget();showAuth();workflowRetryAfter=0;refresh()}});
showAuth();$("#refreshInsights").addEventListener("click",refresh);$("#clearActivity").addEventListener("click",()=>{if(confirm("Xóa Activity đã ghi trên thiết bị này?")){localStorage.removeItem(KEY);showActivity()}});document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});showActivity();refresh();setInterval(()=>{if(!document.hidden)refresh()},90000);
})();