(()=>{"use strict";
const $=s=>document.querySelector(s),root=$("#researchPostsList"),status=$("#researchPostsStatus"),refresh=$("#refreshResearchPostsBtn");
if(!root||!status||!refresh)return;
const REPO="duynguyenaver/blognaver",API="https://api.github.com/repos/"+REPO,BASE="https://duynguyenaver.github.io/blognaver";
const headers=()=>({Accept:"application/vnd.github+json",...(window.BNAuth?.read?.()?{Authorization:"Bearer "+window.BNAuth.read()}:{})});
async function get(path){const r=await fetch(API+path,{headers:headers(),cache:"no-store"});if(!r.ok)throw Error("GitHub HTTP "+r.status);return r.json()}
function make(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e}
function anchor(label,url){const a=make("a","ghost",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function field(text,key){const m=text.match(new RegExp("^"+key+":\\s*(.+)$","m"));if(!m)return"";try{return JSON.parse(m[1])}catch{return m[1].replace(/^["']|["']$/g,"")}}
function meta(raw){const m=raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!m)return null;const y=m[1];if(!/^researchStudio:\s*\{/m.test(y)&&!/^researchStudio:\s*true\s*$/m.test(y))return null;return {title:field(y,"title"),slug:field(y,"slug"),date:field(y,"date"),draft:field(y,"draft")}}
const canonical=s=>BASE+"/bai-viet/"+encodeURIComponent(s)+"/";
async function checkLive(url){try{const r=await fetch(url,{method:"HEAD",cache:"no-store"});return r.ok}catch{return false}}
let inFlight=false;
async function load(){if(inFlight)return;inFlight=true;refresh.disabled=true;status.textContent="Đang tìm 10 bài Research Studio mới nhất…";root.replaceChildren();
try{
 const commits=await get("/commits?sha=main&path=content%2Fposts&per_page=65"),found=[],seen=new Set();let checked=0;
 for(const entry of commits){if(found.length>=10)break;const c=await get("/commits/"+entry.sha);checked++;
 const paths=(c.files||[]).filter(f=>/^content\/posts\/.+\.md$/.test(f.filename)&&!f.filename.endsWith("/_index.md")&&f.status!=="removed").map(f=>f.filename);
 for(const path of paths){if(seen.has(path))continue;seen.add(path);
 try{const file=await get("/contents/"+path+"?ref=main");if(!file.content)continue;
 const binary=atob(file.content.replace(/\s/g,""));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const md=new TextDecoder().decode(bytes);const m=meta(md);if(!m||m.draft===true)continue;
 const slug=String(m.slug||path.replace(/^content\/posts\//,"").replace(/\/index\.md$|\.md$/,"")).trim();
 found.push({title:m.title||slug,slug,sha:entry.sha,date:m.date||entry.commit?.committer?.date||"",path});if(found.length===10)break
 }catch(e){if(e.message.includes("HTTP 403"))throw e}}
 }
 let workflows=[];try{const r=await get("/actions/workflows/hugo.yml/runs?branch=main&per_page=50");workflows=r.workflow_runs||[]}catch{}
 await Promise.all(found.map(async p=>{p.url=canonical(p.slug);p.live=await checkLive(p.url);p.run=workflows.find(x=>x.head_sha===p.sha)||null}));
 for(const [i,p] of found.entries()){const item=make("article","studio-post-card"),heading=make("h3","",String(i+1).padStart(2,"0")+" · "+p.title),sub=make("p","studio-post-caption",p.date?new Date(p.date).toLocaleDateString("vi-VN"):""),grid=make("div","studio-post-meta");
 const predicted=make("div","studio-post-meta-row"),real=make("div","studio-post-meta-row");
 predicted.append(make("strong","studio-post-meta-label","URL dự kiến"),anchor(p.url,p.url));
 real.append(make("strong","studio-post-meta-label",p.live?"URL thực · Đã truy cập được":"URL thực · Chưa xác nhận"));
 if(p.live)real.append(anchor(p.url,p.url));else real.append(make("span","studio-link-pending","Chưa xác nhận trang đã deploy. Giữ URL dự kiến ở trên."));
 grid.append(real,predicted);const actions=make("div","studio-post-actions");
 actions.append(anchor("Xem GitHub commit ↗","https://github.com/"+REPO+"/commit/"+p.sha),anchor("Action chi tiết ↗",p.run?.html_url||"https://github.com/"+REPO+"/actions?query="+encodeURIComponent(p.sha)),anchor("CMS · Tất cả bài ↗","../../cms/posts/"));
 item.append(heading,sub,grid,actions);root.append(item)}
 if(!found.length)root.append(make("p","studio-empty","Chưa tìm thấy bài có metadata Research Studio trong các commit gần nhất."));
 status.textContent="Đã kiểm tra "+checked+" commit · tìm thấy "+found.length+" bài Research Studio. URL thực chỉ hiển thị khi website trả phản hồi thành công.";
}catch(e){status.textContent="Không tải được bài Research Studio: "+e.message;root.append(make("p","studio-empty","Có thể GitHub API đã hết hạn mức. Hãy kết nối GitHub token hoặc thử làm mới sau."))}
finally{inFlight=false;refresh.disabled=false}}
refresh.addEventListener("click",load);window.addEventListener("bn:research-article-committed",()=>load());load();
})();