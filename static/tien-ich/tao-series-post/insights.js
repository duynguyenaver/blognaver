(()=>{"use strict";
/* Repo is the source of truth for published records. Local browser records only
 * supplement duration, token usage and drafts, which GitHub cannot reconstruct. */
const REPO="duynguyenaver/blognaver",API="https://api.github.com/repos/"+REPO,STORE="bn_series_research_history_v1";
const SITE="https://duynguyenaver.github.io/blognaver/",$=s=>document.querySelector(s);
let rows=[],connected=false,busy=false,lastSync=0;
try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");rows=Array.isArray(v)?v:[]}catch{}
const fmtTime=ms=>{const seconds=Math.round(ms/1000);if(seconds<60)return (Math.round(ms/6000)/10).toLocaleString("vi-VN")+" phút";const min=Math.floor(seconds/60),sec=seconds%60;return min+" phút"+(sec?" "+sec+" giây":"")};
const cell=(tr,value)=>{const td=document.createElement("td");td.textContent=String(value);tr.append(td);return td};
function save(){try{localStorage.setItem(STORE,JSON.stringify(rows.slice(0,200)))}catch{}}
function note(text,error=false){const e=$("#insightsConnection");e.textContent=text;e.classList.toggle("error",error)}
function render(){
 $("#insightsDrafts").textContent=rows.filter(x=>x.state==="draft"&&!x.sha).length;
 $("#insightsCommits").textContent=rows.filter(x=>x.sha).length;
 $("#insightsLive").textContent=rows.filter(x=>x.live===true).length;
 const completed=rows.filter(x=>Number.isFinite(x.durationMs)&&x.durationMs>=0);
 $("#insightsAverage").textContent=completed.length?fmtTime(completed.reduce((a,x)=>a+x.durationMs,0)/completed.length):"—";
 const tbody=$("#insightsRows");tbody.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr");cell(tr,connected?"Chưa tìm thấy bài do Research Studio commit trên GitHub.":"Chưa có dữ liệu. Kết nối GitHub để tải lịch sử bài viết.").colSpan=5;tbody.append(tr);return}
 for(const x of rows.slice().sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,70)){
  const tr=document.createElement("tr"),first=cell(tr,x.title||x.slug||"Bản thảo"),slug=x.slug||"";
  if(slug&&x.sha){
   const a=document.createElement("a");a.href=SITE+"bai-viet/"+encodeURIComponent(slug)+"/";a.textContent=x.live?"Mở bài đã xác nhận live ↗":"URL dự kiến · chưa xác nhận live ↗";a.target="_blank";a.rel="noopener noreferrer";first.append(document.createElement("br"),a)
  }
  cell(tr,x.series==="lex-fridman"?"Lex Fridman":x.series==="cold-fusion"?"ColdFusion":x.series||"—");
  cell(tr,x.commitAt?new Date(x.commitAt).toLocaleString("vi-VN",{dateStyle:"short",timeStyle:"medium"}):x.sha?"Chưa xác nhận thời điểm commit":"Chưa commit");
  cell(tr,Array.isArray(x.models)&&x.models.length?x.models.join(" · "):"Chưa ghi model (bài cũ)");
  const status=cell(tr,x.live?"Live ✓":x.sha?"Đã commit · Chờ xác nhận live":"Bản thảo");
  if(x.sha){const a=document.createElement("a");a.href="https://github.com/"+REPO+"/commit/"+x.sha;a.target="_blank";a.rel="noopener noreferrer";a.textContent=" · Commit ↗";status.append(a)}
  tbody.append(tr)
 }
}
function record(entry){if(!entry?.slug)return;const existing=rows.find(x=>x.slug===entry.slug);
 if(existing)Object.assign(existing,entry);else rows.unshift({...entry,at:Date.now()});
 save();render()
}
async function api(path,token){
 const response=await fetch(API+"/"+path,{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},cache:"no-store"});
 if(!response.ok){const e=Error("GitHub HTTP "+response.status);e.code=response.status;throw e}
 return response.json()
}
const decode=value=>{const raw=atob(String(value||"").replace(/\s/g,""));return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))};
const frontValue=(md,key)=>{
 const front=md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
 if(!front)return "";
 const line=front[1].split(/\r?\n/).find(x=>x.startsWith(key+":"));
 if(!line)return "";
 const value=line.slice(key.length+1).trim();
 try{return JSON.parse(value)}catch{return value.replace(/^['"]|['"]$/g,"")}
};
async function verifyLive(entry){
 if(!entry.sha||!entry.slug)return;
 try{
  const response=await fetch(SITE+"bai-viet/"+encodeURIComponent(entry.slug)+"/",{cache:"no-store"});
  if(!response.ok)return;
  const text=await response.text();
  // Some hosting fallback pages return HTTP 200. Require article markup plus title.
  if(/<article\b/i.test(text)&&(text.includes(entry.title)||text.includes("property=\"og:type\" content=\"article\"")))entry.live=true;
 }catch{}
}
async function sync(){
 if(busy)return;
 const token=window.BNAuth?.read?.();if(!token){setConnection(false);return}
 try{await window.BNAuth.validate(token);connected=true}catch(e){setConnection(false);note("GitHub token chưa hợp lệ hoặc đã hết quyền. Kết nối lại token trước khi đồng bộ.",true);return}
 busy=true;$("#refreshInsights").disabled=true;note("Đang đối chiếu lịch sử commit và file bài viết trên GitHub…");
 try{
  const tree=await api("git/trees/main?recursive=1",token);
  const known=new Set((tree.tree||[]).filter(x=>x.type==="blob"&&/^content\/posts\/(?:cold-fusion|lex-fridman)-[a-z0-9-]+\.md$/.test(x.path)).map(x=>x.path));
  const commits=[];let truncated=false;
  for(let page=1;page<=5;page++){
   const batch=await api("commits?path=content/posts&per_page=100&page="+page,token);
   if(!Array.isArray(batch))throw Error("GitHub trả về danh sách commit không hợp lệ");
   for(const c of batch){
    const line=(c.commit?.message||"").split("\n")[0];
    const match=line.match(/^content\(series-ai\): publish (cold-fusion|lex-fridman) research ([a-z0-9-]+)$/);
    if(match){
     const file="content/posts/"+match[2]+".md";
     if(known.has(file))commits.push({sha:c.sha,path:file,slug:match[2],series:match[1],at:Date.parse(c.commit?.committer?.date||"")||0,commitAt:c.commit?.committer?.date||null});
    }
   }
   if(batch.length<100)break;
   if(page===5)truncated=true;
  }
  const latest=new Map();
  for(const entry of commits){if(!latest.has(entry.slug))latest.set(entry.slug,entry)}
  const selected=[...latest.values()].slice(0,60);
  let failedDetails=0;
  for(const entry of selected){
   try{
    const content=await api("contents/"+entry.path+"?ref=main",token);
    const md=decode(content.content);
    const title=frontValue(md,"title")||entry.slug.replace(/-/g," ");
    const realSlug=frontValue(md,"slug")||entry.slug;
    const realSeries=frontValue(md,"series");
    const publishedMetrics=frontValue(md,"researchStudio");
    // Older posts may not contain metrics. Never manufacture exact time or token
    // values from GitHub timestamps or a different article's quota samples.
    const recovered=publishedMetrics&&typeof publishedMetrics==="object"?publishedMetrics:null;
    const modelList=recovered?.models||frontValue(md,"aiModels");
    if(Array.isArray(realSeries)&&!realSeries.includes(entry.series))continue;
    const previous=rows.find(x=>x.slug===realSlug||x.slug===entry.slug);
    const item={...(previous||{}),slug:realSlug,title,series:entry.series,sha:entry.sha,at:entry.at||Date.now(),commitAt:entry.commitAt||previous?.commitAt||null,state:"committed",fromGitHub:true};
    if(Array.isArray(modelList)&&modelList.length)item.models=[...new Set(modelList.filter(x=>typeof x==="string"))];
    if(recovered){
      if(Number.isFinite(Number(recovered.durationMs))&&Number(recovered.durationMs)>=0)item.durationMs=Number(recovered.durationMs);
      if(Number.isFinite(Number(recovered.geminiRequests))&&Number(recovered.geminiRequests)>=0){
        item.quota={requests:Number(recovered.geminiRequests),tokens:Number(recovered.geminiTokens)||0,inputTokens:Number(recovered.inputTokens)||0,outputTokens:Number(recovered.outputTokens)||0};
      }
    }
    if(previous)Object.assign(previous,item);else rows.push(item);
   }catch{failedDetails++}
  }
  save();render();
  const liveCandidates=rows.filter(x=>x.sha&&!x.live).slice(0,12);
  await Promise.all(liveCandidates.map(verifyLive));save();render();
  lastSync=Date.now();
  note("Đồng bộ với GitHub hoàn tất: "+selected.length+" bài từ commit và Markdown trên main"+(truncated?" · chỉ quét 500 commit gần nhất":"")+(failedDetails?" · "+failedDetails+" file chưa đọc được":"")+". Cập nhật "+new Date(lastSync).toLocaleTimeString("vi-VN")+".");
 }catch(e){
  note("Không thể đồng bộ GitHub: "+e.message+". Dữ liệu cục bộ vẫn được giữ lại; kiểm tra token và thử làm mới.",true)
 }finally{busy=false;$("#refreshInsights").disabled=!connected}
}
function setConnection(ok){
 connected=Boolean(ok);
 $("#refreshInsights").hidden=!connected;$("#refreshInsights").disabled=!connected||busy;
 if(!connected)note("Chưa kết nối GitHub API. Hãy kết nối GitHub token chung trong mục Kết nối AI & GitHub để đồng bộ lịch sử từ main.",true);
 else note("Đã xác thực GitHub. Đang chuẩn bị đồng bộ lịch sử bài đăng…");
 render();
}
$("#refreshInsights").onclick=async()=>{await sync()};
window.BNSeriesInsights={record,render,sync,setConnection,checkLive:async()=>{if(connected)await sync()}};
setConnection(false);
})();