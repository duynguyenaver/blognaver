(()=>{"use strict";
const repo="duynguyenaver/blognaver",api="https://api.github.com/repos/"+repo;
const $=s=>document.querySelector(s),items=$("#editorItems"),status=$("#editorStatus"),save=$("#editorSave"),all=$("#editorSelectAll");
let records=[],busy=false,baseHead="";

const search=$("#editorSearch"),searchCount=$("#editorSearchCount");
const searchNormalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function applyEditorSearch(){
 const q=searchNormalize(search.value),matches=[];
 records.forEach((r,index)=>{
  const fields=[r.original.title,r.original.series,r.original.sourceUrl,r.path,...(r.fields||[]).map(f=>f.value)];
  const ok=!q||fields.some(v=>searchNormalize(v).includes(q));
  r.card.hidden=!ok;
  if(ok){const t=searchNormalize(r.original.title);matches.push({r,index,score:!q?0:t===q?0:t.startsWith(q)?1:t.includes(q)?2:3})}
 });
 matches.sort((a,b)=>a.score-b.score||a.index-b.index);
 matches.forEach(x=>items.append(x.r.card));
 searchCount.textContent=q?matches.length+" bài phù hợp":records.length+" bài đã tải";
 updateCount();
}
search.addEventListener("input",applyEditorSearch);

const getToken=()=>window.BNAuth?.read?.()||$("#githubManual")?.value.trim()||"";
async function request(path,method="GET",data){
 const token=getToken();if(!token)throw Error("Vui lòng kết nối GitHub token ở phần Kết nối AI & GitHub.");
 const res=await fetch(api+"/"+path,{method,headers:{"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(data?{"Content-Type":"application/json"}:{})},body:data?JSON.stringify(data):undefined,cache:"no-store"});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw Error("GitHub "+res.status+": "+(body.message||"API error"));return body;
}
const decode64=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
const enc64=s=>{const a=new TextEncoder().encode(s);let b="";for(const n of a)b+=String.fromCharCode(n);return btoa(b)};
const extract=(source,key)=>{
 const header=source.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!header)return"";
 const line=header[1].split(/\r?\n/).find(x=>x.startsWith(key+": "));if(!line)return"";
 const raw=line.slice(key.length+2).trim();
 try{const val=JSON.parse(raw);return Array.isArray(val)?val.join(", "):String(val)}catch{return raw.replace(/^["']|["']$/g,"")}
};
function replaceMeta(source,key,value,isArray=false){
 const yamlValue=JSON.stringify(isArray?value.split(",").map(x=>x.trim()).filter(Boolean):value);
 const header=source.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!header)throw Error("Bài không có Hugo front matter.");
 const old=header[1],lines=old.split(/\r?\n/);
 const idx=lines.findIndex(x=>x.startsWith(key+": "));
 if(idx>=0)lines[idx]=key+": "+yamlValue;else lines.push(key+": "+yamlValue);
 return source.replace(header[0],"---\n"+lines.join("\n")+"\n---");
}
function rowInput(label,key,value,tag="input"){
 const wrapper=document.createElement("label");wrapper.textContent=label;
 const el=document.createElement(tag);el.dataset.field=key;el.value=value;
 if(tag==="input")el.type="text";el.addEventListener("input",updateCount);
 wrapper.append(el);return wrapper;
}
function updateCount(){
 const chosen=records.filter(r=>r.checkbox?.checked);
 const visible=records.filter(r=>r.card&&!r.card.hidden);
 all.checked=Boolean(visible.length)&&visible.every(r=>r.checkbox?.checked);
 const changed=chosen.filter(r=>r.fields.some(f=>f.value!==r.original[f.dataset.field]));
 $("#editorSummary").textContent=records.length+" bài đã tải · "+chosen.length+" đã chọn · "+changed.length+" có thay đổi";
 save.disabled=busy||!changed.length;
}
function render(){
 items.replaceChildren();
 records.forEach(r=>{
  const card=document.createElement("article");card.className="editor-card";
  const top=document.createElement("div");top.className="editor-card-head";
  const check=document.createElement("input");check.type="checkbox";check.checked=false;check.addEventListener("change",updateCount);r.checkbox=check;
  const name=document.createElement("strong");name.textContent=r.original.title||r.path.split("/").pop();
  top.append(check,name);card.append(top);
  const tiny=document.createElement("small");tiny.textContent=r.path;card.append(tiny);
  const grid=document.createElement("div");grid.className="editor-fields";
  const labels={title:"Tiêu đề",description:"Mô tả SEO",series:"Tên series",sourceUrl:"YouTube URL gốc",tags:"Tags (phân cách bằng dấu phẩy)",categories:"Danh mục (phân cách bằng dấu phẩy)"};
  r.fields=[];
  for(const key of Object.keys(labels)){
   const w=rowInput(labels[key],key,r.original[key],key==="description"?"textarea":"input");
   const el=w.querySelector("[data-field]");r.fields.push(el);grid.append(w);
  }
  card.append(grid);r.card=card;items.append(card);
 });
 applyEditorSearch();
}
async function load(){
 if(busy)return;busy=true;$("#editorLoad").disabled=true;status.textContent="Đang đọc danh sách bài đã commit từ GitHub…";
 try{
  const branch=await request("git/ref/heads/main");baseHead=branch.object.sha;
  const tree=await request("git/trees/"+baseHead+"?recursive=1");
  const paths=(tree.tree||[]).filter(x=>x.type==="blob"&&/^content\/posts\/.+\.md$/.test(x.path)).map(x=>x.path);
  records=[];let checked=0;
  for(let i=0;i<paths.length;i+=5){
   const group=paths.slice(i,i+5);
   const found=await Promise.all(group.map(async path=>{
    try{
     const res=await request("contents/"+path+"?ref=main"),source=decode64(res.content);
     if(!source.startsWith("---"))return null;
     const original={title:extract(source,"title"),description:extract(source,"description"),series:extract(source,"series"),sourceUrl:extract(source,"sourceUrl"),tags:extract(source,"tags"),categories:extract(source,"categories")};
     if(!original.sourceUrl){const m=source.match(/\[Video \/ nguồn tiếng Anh gốc\]\((https?:\/\/[^)\n]+)\)/);original.sourceUrl=m?.[1]||""}
     return {path,source,original};
    }catch{return null}
   }));
   records.push(...found.filter(Boolean));checked+=group.length;
   status.textContent="Đã đọc "+checked+"/"+paths.length+" bài…";
  }
  render();status.textContent="Đã tải "+records.length+" bài. Chọn ít nhất một bài muốn chỉnh, có thể chọn đồng thời 5 bài hoặc nhiều hơn. Chỉ một commit cho tất cả bài đã chọn và có thay đổi.";
 }catch(e){status.textContent="Không tải được: "+e.message}finally{busy=false;$("#editorLoad").disabled=false;updateCount()}
}
function apply(r){
 let output=r.source;
 for(const f of r.fields){
  const k=f.dataset.field,value=f.value.trim();
  if(value===r.original[k])continue;
  if(k==="sourceUrl"){
   if(value&&!/^https:\/\//i.test(value))throw Error("YouTube URL phải dùng HTTPS: "+r.path);
   if(value&&!/(?:youtube\.com|youtu\.be)/i.test(new URL(value).hostname))throw Error("Chỉ chấp nhận YouTube URL: "+r.path);
   const old=r.original.sourceUrl;
   if(old)output=output.split("[Video / nguồn tiếng Anh gốc]("+old+")").join(value?"[Video / nguồn tiếng Anh gốc]("+value+")":"Phụ đề tiếng Anh do người biên tập cung cấp (không có URL nguồn)");
   else if(value)output=output.replace("Phụ đề tiếng Anh do người biên tập cung cấp (không có URL nguồn)","[Video / nguồn tiếng Anh gốc]("+value+")");
  }
  if(k==="series"){
   if(!value)throw Error("Tên series không được để trống: "+r.path);
   const id=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-+$/g,"").slice(0,75);
   if(!id)throw Error("Tên series không hợp lệ: "+r.path);
   output=replaceMeta(output,"series",id,true);
   output=replaceMeta(output,"seriesName",value);
  }else if(k!=="sourceUrl")output=replaceMeta(output,k,value,k==="tags"||k==="categories");
  else output=replaceMeta(output,"sourceUrl",value);
 }
 return output;
}
async function commit(){
 if(busy)return;
 const changed=records.filter(r=>r.checkbox.checked&&r.fields.some(f=>f.value!==r.original[f.dataset.field]));
 if(!changed.length)return;busy=true;save.disabled=true;$("#editorLoad").disabled=true;
 try{
  status.textContent="Đang chuẩn bị "+changed.length+" bài cho một commit…";
  const treeItems=changed.map(r=>({path:r.path,mode:"100644",type:"blob",content:apply(r)}));
  const head=await request("git/ref/heads/main");
  if(head.object.sha!==baseHead)throw Error("Nhánh main vừa thay đổi. Hãy tải lại danh sách bài trước khi Save để tránh ghi đè dữ liệu mới.");
  const parent=await request("git/commits/"+baseHead);
  const tree=await request("git/trees","POST",{base_tree:parent.tree.sha,tree:treeItems});
  const next=await request("git/commits","POST",{message:"content(series): batch edit "+changed.length+" published posts",tree:tree.sha,parents:[baseHead]});
  await request("git/refs/heads/main","PATCH",{sha:next.sha,force:false});
  status.textContent="Đã tạo đúng 1 commit cho "+changed.length+" bài: "+next.sha.slice(0,12)+". GitHub Pages sẽ triển khai qua Actions.";
  records=[];items.replaceChildren();$("#editorSummary").textContent="Đã lưu · tải lại để chỉnh tiếp";
 }catch(e){status.textContent="Chưa commit: "+e.message+". Các chỉnh sửa vẫn còn trên trang; kiểm tra lại trước khi Save."}
 finally{busy=false;$("#editorLoad").disabled=false;updateCount()}
}
$("#editorLoad").addEventListener("click",load);
all.addEventListener("change",()=>{records.filter(r=>r.card&&!r.card.hidden).forEach(r=>{r.checkbox.checked=all.checked});updateCount()});
save.addEventListener("click",commit);
})();