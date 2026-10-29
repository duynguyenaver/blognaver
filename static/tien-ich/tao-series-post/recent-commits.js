(()=>{"use strict";
const REPO="duynguyenaver/blognaver",API="https://api.github.com/repos/"+REPO,BASE="https://duynguyenaver.github.io/blognaver";
const $=s=>document.querySelector(s);
const details=$("#recentCommitsDisclosure"),list=$("#recentCommitsList"),status=$("#recentCommitsStatus"),button=$("#recentCommitsRefresh");
if(!details||!list||!status||!button)return;
let busy=false,lastLoaded=null,runId=0;
function headers(){
 const token=window.BNAuth?.read?.()||"";
 return {Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(token?{Authorization:"Bearer "+token}:{})};
}
async function request(path){
 const response=await fetch(API+path,{headers:headers(),cache:"no-store"});
 if(!response.ok)throw Error("GitHub HTTP "+response.status+(response.status===403?" · có thể đã chạm giới hạn API":""));
 return response.json();
}
function node(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;return el}
function link(label,href){const a=node("a","",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a}
function runState(run){
 if(!run)return {label:"Chưa tìm thấy workflow",cls:"neutral"};
 if(run.status!=="completed")return {label:run.status==="queued"?"Đang xếp lịch deploy":"Đang build/deploy",cls:"pending"};
 if(run.conclusion==="success")return {label:"Deploy thành công",cls:"success"};
 return {label:"Deploy "+(run.conclusion||"không rõ"),cls:"error"};
}
function articlePaths(commit){
 return (commit.files||[]).filter(f=>/^content\/posts\/.+\.md$/i.test(f.filename)&&!f.filename.endsWith("/_index.md")&&f.status!=="removed").map(f=>f.filename);
}
function predictedUrl(path){
 const short=path.slice("content/posts/".length).replace(/\.md$/i,"").replace(/\/index$/i,"");
 return BASE+"/bai-viet/"+short.split("/").map(encodeURIComponent).join("/")+"/";
}
function prettyTitle(file){
 const raw=file.slice("content/posts/".length).replace(/\\.md$/i,"").replace(/^(?:cold-fusion|ota-travel|lex-fridman)-/,"").replace(/-20\\d{2}-\\d{2}-\\d{2}$/,"");
 return raw.split("-").filter(Boolean).join(" ").replace(/^./,c=>c.toUpperCase());
}
function renderLatest(file,sha,title="",deploy=null){
 if(!file.startsWith("content/posts/")||!file.endsWith(".md"))return;
 details.open=true;
 const wrap=node("article","recent-commit-entry recent-latest-card");
 const eyebrow=node("div","recent-latest-eyebrow","BÀI VIẾT MỚI NHẤT");
 wrap.append(eyebrow,node("h3","recent-latest-title",title||prettyTitle(file)));
 const actions=node("div","recent-latest-actions");
 const articleLink=link("Đọc bài viết ↗",predictedUrl(file));
 articleLink.className="recent-latest-primary";
 actions.append(articleLink);
 const deployStatus=deploy?runState(deploy):{label:"Đã commit · Chờ xác nhận deploy",cls:"pending"};
 const label=node("span","recent-deploy-pill "+deployStatus.cls,deployStatus.label);
 actions.append(label);
 wrap.append(actions);
 const meta=node("p","recent-latest-meta","Commit "+sha.slice(0,10)+" · GitHub main");
 wrap.append(meta);
 list.replaceChildren(wrap);
 status.textContent="Đường dẫn dự kiến · Bài có thể chưa truy cập được trước khi Hugo deploy hoàn tất.";
 lastLoaded=new Date();
}
async function load(){
 if(busy)return;
 busy=true;button.disabled=true;
 const call=++runId;
 status.textContent="Đang kiểm tra bài viết gần nhất…";
 try{
  const commits=await request("/commits?sha=main&path=content%2Fposts&per_page=8");
  let latest=null;
  for(const commit of commits){
   const detail=await request("/commits/"+encodeURIComponent(commit.sha));
   const files=articlePaths(detail);
   if(files.length){latest={commit,file:files[0]};break}
  }
  if(call!==runId)return;
  if(!latest){list.replaceChildren();status.textContent="Chưa tìm thấy bài được commit.";return}
  let title="",deploy=null;
  try{
   const file=await request("/contents/"+latest.file+"?ref=main");
   const decoded=decodeURIComponent(Array.from(atob(String(file.content||"").replace(/\\s/g,"")),c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0")).join(""));
   const match=decoded.match(/^title:\\s*["']?([^\\r\\n"']+)/m);
   title=match?.[1]||"";
  }catch{}
  try{
   const runs=await request("/actions/workflows/hugo.yml/runs?branch=main&per_page=15");
   deploy=(runs.workflow_runs||[]).find(run=>run.head_sha===latest.commit.sha)||null;
  }catch{}
  if(call===runId)renderLatest(latest.file,latest.commit.sha,title,deploy);
 }catch(e){if(call===runId)status.textContent="Không thể kiểm tra bài gần nhất: "+e.message;}
 finally{busy=false;button.disabled=false}
}
// A verified commit updates Section 08 without a full-page reload or API scan.
window.addEventListener("bn:research-article-committed",event=>{
 const proof=event.detail||{};
 if(typeof proof.sha==="string"&&typeof proof.path==="string"){
  runId++;renderLatest(proof.path,proof.sha);
 }
});
// Fetch once on load and on user refresh; keep only the latest commit.
button.addEventListener("click",load);
load();
})();