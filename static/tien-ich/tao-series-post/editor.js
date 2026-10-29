(()=>{"use strict";
const REPO="duynguyenaver/blognaver",API="https://api.github.com/repos/"+REPO;
const $=q=>document.querySelector(q);
const editor=$("#editorItems"),mini=$("#miniCmsList"),editorStatus=$("#editorStatus"),miniStatus=$("#miniCmsStatus");
const enc=text=>{const arr=new TextEncoder().encode(text);let raw="";for(const byte of arr)raw+=String.fromCharCode(byte);return btoa(raw)};
const dec=text=>new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,"")),x=>x.charCodeAt(0)));
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const slugify=s=>normalize(s).replace(/[^a-z0-9]+/g,"-").replace(/^-|-+$/g,"").slice(0,75);
const token=()=>window.BNAuth?.read?.()||$("#githubManual")?.value.trim()||"";
let posts=[],loaded=false,active=false;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
async function req(url,method="GET",body){
 const t=token();if(!t)throw Error("Kết nối GitHub token chung để quản lý bài.");
 const res=await fetch(API+url,{method,headers:{Authorization:"Bearer "+t,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error("GitHub HTTP "+res.status+": "+String(data.message||"API error"));
 return data;
}
function fmValue(src,key){
 const match=src.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!match)return "";
 const line=match[1].split(/\r?\n/).find(x=>x.startsWith(key+":"));if(!line)return "";
 const raw=line.slice(key.length+1).trim();
 try{return JSON.parse(raw)}catch{return raw.replace(/^['"]|['"]$/g,"")}
}
function setFront(src,key,value){
 const fm=src.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!fm)throw Error("Thiếu YAML front matter");
 const lines=fm[1].split(/\r?\n/),index=lines.findIndex(x=>x.startsWith(key+":"));
 const line=key+": "+JSON.stringify(value);
 if(index<0)lines.push(line);else lines[index]=line;
 return src.replace(fm[0],"---\n"+lines.join("\n")+"\n---");
}
function postTitle(p){return String(fmValue(p.source,"title")||p.path.split("/").pop())}
function isResearch(p){return /^researchStudio:\s*/m.test(p.source.split("---").slice(1,2).join("---"))}
function clear(elm){elm.replaceChildren()}
async function load(){
 if(active)return;active=true;$("#editorLoad").disabled=true;$("#miniCmsReload").disabled=true;
 editorStatus.textContent="Đang tải bài Research Studio…";miniStatus.textContent="Đang tải bài…";
 try{
  const tree=await req("/git/trees/main?recursive=1");
  const paths=(tree.tree||[]).filter(x=>x.type==="blob"&&/^content\/posts\/.+\.md$/.test(x.path)&&!x.path.endsWith("/_index.md")).map(x=>x.path);
  const found=[];
  for(let i=0;i<paths.length;i+=5){
   const batch=await Promise.all(paths.slice(i,i+5).map(async path=>{
    try{const file=await req("/contents/"+path+"?ref=main");const source=dec(file.content);
     return /^researchStudio:\s*/m.test((source.match(/^---\r?\n([\s\S]*?)\r?\n---/)||[])[1]||"")?{path,source,sha:file.sha,seriesName:String(fmValue(source,"seriesName")||(fmValue(source,"series")||[])[0]||""),title:String(fmValue(source,"title")||"")}:null
    }catch{return null}
   }));
   found.push(...batch.filter(Boolean));
  }
  posts=found;loaded=true;
  editorStatus.textContent="Đã tải "+posts.length+" bài Research Studio. Nhập tên series rồi tạo PR.";
  miniStatus.textContent="Đã tải "+posts.length+" bài. Chỉnh sửa hoặc xóa sẽ mở Pull Request, không thay đổi main ngay.";
  drawEditor();drawMini();
 }catch(e){editorStatus.textContent="Không tải được: "+e.message;miniStatus.textContent=editorStatus.textContent}
 finally{active=false;$("#editorLoad").disabled=false;$("#miniCmsReload").disabled=false}
}
function drawEditor(){
 clear(editor);const query=normalize($("#editorSearch").value);let count=0;
 posts.forEach(p=>{
  if(query&&!normalize(p.title+" "+p.seriesName+" "+p.path).includes(query))return;count++;
  const card=el("article",undefined,"editor-card");
  const name=el("strong",p.title);const label=el("label","Tên series");
  const input=el("input");input.type="text";input.placeholder="Ví dụ: Công nghệ tương lai";input.value=p.editSeries??p.seriesName;
  const hint=el("small");const update=()=>{p.editSeries=input.value;hint.textContent="Slug tự động: "+(slugify(input.value)||"—");updateSave()};update();
  input.addEventListener("input",update);
  label.append(input);card.append(name,label,hint);editor.append(card);
 });
 $("#editorSearchCount").textContent=count+" bài phù hợp";updateSave();
}
function updateSave(){
 const changed=posts.filter(p=>p.editSeries?.trim()&&p.editSeries.trim()!==p.seriesName);
 $("#editorSave").disabled=active||!changed.length;
 $("#editorSummary").textContent=changed.length+" bài đổi series · "+posts.length+" bài Research Studio";
}
async function propose(changes,message,title){
 if(active)throw Error("Đang thực hiện thay đổi khác.");
 active=true;const nonce=Date.now().toString(36),branch="cms/research-studio-"+nonce;
 try{
  const base=await req("/git/ref/heads/main");const baseSha=base.object.sha;
  await req("/git/refs","POST",{ref:"refs/heads/"+branch,sha:baseSha});
  for(const c of changes){
   if(c.remove)await req("/contents/"+c.path,"DELETE",{message:message+" "+c.path,sha:c.sha,branch});
   else await req("/contents/"+c.path,"PUT",{message:message+" "+c.path,content:enc(c.content),sha:c.sha,branch});
  }
  const pr=await req("/pulls","POST",{title,head:branch,base:"main",body:"Đề xuất từ Research Studio mini CMS. Cần chủ repo duyệt và merge PR trước khi thay đổi xuất hiện trên website."});
  window.open(pr.html_url,"_blank","noopener,noreferrer");
  return pr.html_url;
 }finally{active=false}
}
$("#editorSave").onclick=async()=>{
 const changes=posts.filter(p=>p.editSeries?.trim()&&p.editSeries.trim()!==p.seriesName);
 if(!changes.length)return;
 try{
  $("#editorSave").disabled=true;editorStatus.textContent="Đang tạo PR cập nhật series…";
  const edits=changes.map(p=>{
   const name=p.editSeries.trim(),id=slugify(name);if(!id)throw Error("Tên series không hợp lệ.");
   let content=setFront(p.source,"series",[id]);content=setFront(content,"seriesName",name);
   return {path:p.path,sha:p.sha,content};
  });
  const url=await propose(edits,"content(series): edit series","content(series): update "+changes.length+" Research Studio series");
  editorStatus.textContent="Đã tạo PR: "+url+" (cần duyệt trước khi thay đổi).";
 }catch(e){editorStatus.textContent="Không thể tạo PR: "+e.message}finally{updateSave()}
};
function drawMini(){
 clear(mini);const query=normalize($("#miniCmsSearch").value);
 const filtered=posts.filter(p=>normalize(p.title+" "+p.seriesName).includes(query));
 for(const p of filtered){
  const card=el("article",undefined,"editor-card");
  card.append(el("strong",p.title),el("small","Series: "+(p.seriesName||"—")));
  const actions=el("div",undefined,"editor-toolbar");
  const edit=el("button","Chỉnh nội dung","ghost"),remove=el("button","Xóa bài (tạo PR)","ghost");
  edit.type=remove.type="button";actions.append(edit,remove);card.append(actions);
  const detail=el("div",undefined,"mini-cms-edit");detail.hidden=true;
  const label=el("label","Markdown toàn bài (giữ nguyên YAML front matter)");
  const textarea=el("textarea");textarea.rows=12;textarea.value=p.source;label.append(textarea);
  const save=el("button","Tạo PR lưu chỉnh sửa");save.type="button";detail.append(label,save);card.append(detail);
  edit.onclick=()=>{detail.hidden=!detail.hidden};
  save.onclick=async()=>{
   try{if(!textarea.value.startsWith("---\n")||!textarea.value.includes("\n---"))throw Error("Phải giữ nguyên YAML front matter.");if(textarea.value===p.source)throw Error("Nội dung chưa thay đổi.");
    miniStatus.textContent="Đang tạo PR chỉnh bài…";
    const url=await propose([{path:p.path,sha:p.sha,content:textarea.value}],"content(studio): edit post","content(studio): edit "+p.title);
    miniStatus.textContent="Đã tạo PR: "+url;
   }catch(e){miniStatus.textContent="Không thể sửa: "+e.message}
  };
  remove.onclick=async()=>{
   if(!confirm('Tạo PR để xóa bài "'+p.title+'"? Bài chỉ bị xóa sau khi PR được duyệt và merge.'))return;
   try{miniStatus.textContent="Đang tạo PR xóa bài…";const url=await propose([{path:p.path,sha:p.sha,remove:true}],"content(studio): delete post","content(studio): remove "+p.title);miniStatus.textContent="Đã tạo PR xóa bài: "+url}
   catch(e){miniStatus.textContent="Không thể tạo PR xóa: "+e.message}
  };
  mini.append(card);
 }
 if(!filtered.length)mini.append(el("p","Không có bài Research Studio phù hợp."));
}
$("#editorLoad").onclick=load;$("#miniCmsReload").onclick=load;
$("#editorSearch").addEventListener("input",drawEditor);
$("#miniCmsSearch").addEventListener("input",drawMini);
document.querySelector("#studioMiniCms details")?.addEventListener("toggle",e=>{if(e.target.open&&!loaded)load()});
document.querySelector("#batchEditor details")?.addEventListener("toggle",e=>{if(e.target.open&&!loaded)load()});
})();