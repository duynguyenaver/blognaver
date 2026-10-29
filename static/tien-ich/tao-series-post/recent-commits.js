(()=>{"use strict";
const REPO="duynguyenaver/blognaver",API="https://api.github.com/repos/"+REPO,BASE="https://duynguyenaver.github.io/blognaver";
const $=s=>document.querySelector(s);
const details=$("#recentCommitsDisclosure"),list=$("#recentCommitsList"),status=$("#recentCommitsStatus"),button=$("#recentCommitsRefresh");
if(!details||!list||!status||!button)return;
let timer=null,busy=false,lastLoaded=null,runId=0;
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
async function load(){
 if(busy||!details.open||document.hidden)return;
 busy=true;button.disabled=true;
 const call=++runId;
 status.textContent="Đang đồng bộ commit và GitHub Actions…";
 try{
  const [commits,runs]=await Promise.all([
   request("/commits?sha=main&path=content%2Fposts&per_page=20"),
   request("/actions/workflows/hugo.yml/runs?branch=main&per_page=60")
  ]);
  if(call!==runId)return;
  const runBySha=new Map();
  for(const r of runs.workflow_runs||[]){if(!runBySha.has(r.head_sha))runBySha.set(r.head_sha,r)}
  // The per-file commit endpoint includes unrelated changes only when the same commit
  // also changes a post. Inspect the diff and only show those that added/modified posts.
  const detail=await Promise.allSettled(commits.slice(0,12).map(c=>request("/commits/"+encodeURIComponent(c.sha))));
  if(call!==runId)return;
  const entries=detail.flatMap((d,i)=>{
   if(d.status!=="fulfilled")return [];
   const files=articlePaths(d.value);if(!files.length)return [];
   return [{commit:commits[i],files,run:runBySha.get(commits[i].sha)}];
  }).slice(0,8);
  const fragment=document.createDocumentFragment();
  for(const entry of entries){
   const {commit,files,run}=entry;
   const wrap=node("article","recent-commit-entry");
   const top=node("div","recent-commit-top");
   top.append(node("strong","",commit.commit.message.split("\n")[0]),node("span","recent-commit-date",new Date(commit.commit.committer?.date||commit.commit.author?.date||0).toLocaleString("vi-VN")));
   wrap.append(top);
   const state=runState(run),pill=node("span","recent-deploy-pill "+state.cls,state.label);
   const links=node("div","recent-commit-links");links.append(link("Commit "+commit.sha.slice(0,8),commit.html_url),pill);
   if(run)links.append(link("Theo dõi Actions",run.html_url));
   wrap.append(links);
   for(const file of files){
    const row=node("div","recent-article-links");
    row.append(node("span","recent-source-name",file.split("/").pop()),link("URL bài dự kiến",predictedUrl(file)));
    wrap.append(row);
   }
   fragment.append(wrap);
  }
  if(!entries.length)fragment.append(node("p","recent-empty","Không tìm thấy commit bài viết trong những thay đổi gần đây."));
  list.replaceChildren(fragment);
  lastLoaded=new Date();
  const skipped=detail.filter(d=>d.status==="rejected").length;
  status.textContent="Đã kiểm tra "+lastLoaded.toLocaleTimeString("vi-VN")+" · "+entries.length+" commit liên quan bài viết"+(skipped?" · "+skipped+" commit chưa đọc được chi tiết":"");
 }catch(e){
  status.textContent="Không thể làm mới: "+e.message+(lastLoaded?" · Giữ dữ liệu lần tải "+lastLoaded.toLocaleTimeString("vi-VN"):"");
 }finally{busy=false;button.disabled=false}
}
function manage(){
 clearInterval(timer);timer=null;
 if(details.open){load();timer=setInterval(load,500000)}
}
details.addEventListener("toggle",manage);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&details.open)load()});
button.addEventListener("click",load);
if(details.open)manage();
})();