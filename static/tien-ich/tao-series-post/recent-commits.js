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
async function load(){
 if(busy)return;
 busy=true;button.disabled=true;
 const call=++runId;
 status.textContent="Đang tìm bài commit gần nhất trên GitHub…";
 try{
  const commits=await request("/commits?sha=main&path=content%2Fposts&per_page=12");
  let latest=null;
  for(const commit of commits){
   const detail=await request("/commits/"+encodeURIComponent(commit.sha));
   const files=articlePaths(detail);
   if(files.length){latest={commit,file:files[0]};break}
  }
  if(call!==runId)return;
  if(!latest){list.replaceChildren();status.textContent="Chưa tìm thấy bài viết đã commit.";return}
  renderLatest(latest.file,latest.commit.sha);
 }catch(e){
  if(call===runId)status.textContent="Không tải được bài gần nhất: "+e.message;
 }finally{busy=false;button.disabled=false}
}
function renderLatest(file,sha){
 if(!file.startsWith("content/posts/")||!file.endsWith(".md"))return;
 details.open=true;
 const wrap=node("article","recent-commit-entry");
 wrap.append(node("strong","", "Bài vừa commit thành công"));
 const row=node("div","recent-article-links");
 row.append(link("Đọc bài · URL dự kiến",predictedUrl(file)));
 wrap.append(row);list.replaceChildren(wrap);
 status.textContent="Commit "+sha.slice(0,10)+" · Đã ghi trên GitHub main. Chờ Hugo deploy hoàn tất để truy cập URL.";
 lastLoaded=new Date();
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