(()=>{"use strict";
const $=s=>document.querySelector(s),api="https://api.github.com/repos/duynguyenaver/blognaver/",dir="static/images/research-gallery/",site="/blognaver/";
const gallery=$("#imageGallery"),posts=$("#imagePosts"),status=$("#imageStatus"),search=$("#imageSearch"),save=$("#imageSave");
let added=[],existing=[],list=[],chosen="",head="",busy=false;
const auth=()=>window.BNAuth?.read?.()||$("#githubManual")?.value.trim();
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
async function gh(url,method="GET",body){
 const t=auth();if(!t)throw Error("Cần GitHub token tại mục Kết nối AI & GitHub.");
 const r=await fetch(api+url,{method,headers:{Authorization:"Bearer "+t,Accept:"application/vnd.github+json",...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error("GitHub "+r.status+": "+(d.message||"Lỗi API"));return d;
}
const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
function meta(s,key){const m=s.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!m)return"";const l=m[1].split(/\r?\n/).find(v=>v.startsWith(key+":"));if(!l)return"";const raw=l.slice(key.length+1).trim();try{const v=JSON.parse(raw);return Array.isArray(v)?v.join(", "):String(v)}catch{return raw}}
function urlOf(p){return site+p.replace(/^static\//,"")}
function renderGallery(){gallery.replaceChildren();for(const a of [...added,...existing]){const b=document.createElement("button");b.type="button";b.className="image-tile";b.setAttribute("aria-pressed",String(chosen===a.path));const image=document.createElement("img");image.src=a.url;image.alt=a.name;image.loading="lazy";const caption=document.createElement("small");caption.textContent=a.name+(a.base64?" · chờ Save":"");b.append(image,caption);b.onclick=()=>{chosen=a.path;renderGallery();status.textContent="Đã chọn ảnh "+a.name};gallery.append(b)}refresh()}
function refresh(){save.disabled=busy||(!added.length&&!list.some(p=>p.checkbox.checked));}
function filter(){
 const q=norm(search.value.trim()),matched=list.map((p,i)=>({p,i})).filter(x=>!q||[x.p.title,x.p.series,x.p.youtube,x.p.path].some(v=>norm(v).includes(q)));
 matched.sort((a,b)=>{const score=x=>norm(x.title)===q?0:norm(x.title).startsWith(q)?1:norm(x.title).includes(q)?2:3;return q?score(a.p)-score(b.p)||a.i-b.i:a.i-b.i});
 const active=new Set(matched.map(x=>x.p));for(const p of list)p.row.hidden=!active.has(p);
 for(const x of matched)posts.append(x.p.row);
 $("#imageCount").textContent=matched.length+" bài phù hợp / "+list.length+" bài";
 $("#imageSelectAll").checked=matched.length>0&&matched.every(x=>x.p.checkbox.checked);refresh();
}
async function convert(file){
 if(!file.type.startsWith("image/")||file.size>15e6)throw Error("Ảnh không hợp lệ hoặc vượt 15 MB: "+file.name);
 const bmp=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bmp.width,bmp.height)),canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext("2d").drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
 const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error("Không tạo được WebP")),"image/webp",.82));
 if(blob.size>4e6)throw Error("Ảnh WebP vẫn vượt 4MB");
 const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(blob)});
 const name=Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)+".webp";return{name,path:dir+name,url:data,base64:data.split(",")[1]};
}
$("#imageUpload").onchange=async e=>{try{for(const file of e.target.files)added.push(await convert(file));renderGallery();status.textContent="Đã resize "+added.length+" ảnh. Chọn một ảnh và bài cần chèn, sau đó Save."}catch(err){status.textContent=err.message}e.target.value=""};
async function load(){
 if(busy)return;busy=true;$("#imageLoad").disabled=true;status.textContent="Đang tải dữ liệu…";
 try{
  head=(await gh("git/ref/heads/main")).object.sha;const t=await gh("git/trees/"+head+"?recursive=1"),files=t.tree||[];
  existing=files.filter(x=>x.type==="blob"&&x.path.startsWith(dir)&&x.path.endsWith(".webp")).map(x=>({path:x.path,name:x.path.split("/").pop(),url:urlOf(x.path)}));
  const names=files.filter(x=>x.type==="blob"&&/^content\/posts\/[^/]+\.md$/.test(x.path)).map(x=>x.path);list=[];
  for(let i=0;i<names.length;i+=5){
   const chunk=await Promise.all(names.slice(i,i+5).map(async path=>{try{const d=await gh("contents/"+path+"?ref="+head),source=decode(d.content);return{path,source,title:meta(source,"title"),series:meta(source,"series"),youtube:meta(source,"sourceUrl")}}catch{return null}}));list.push(...chunk.filter(Boolean));
   status.textContent="Đã tải "+Math.min(i+5,names.length)+"/"+names.length+" bài…";
  }
  posts.replaceChildren();for(const p of list){const row=document.createElement("div");row.className="image-post-row";const label=document.createElement("label"),cb=document.createElement("input");cb.type="checkbox";cb.onchange=filter;p.checkbox=cb;const t=document.createElement("strong");t.textContent=p.title||p.path;label.append(cb,t);const small=document.createElement("small");small.textContent=p.path+" · "+p.series;const select=document.createElement("select");for(const [v,l] of [["top","Đầu bài"],["bottom","Cuối bài"]]){const o=document.createElement("option");o.value=v;o.textContent=l;select.append(o)}p.position=select;row.append(label,small,select);p.row=row;posts.append(row)}
  renderGallery();filter();status.textContent="Đã tải "+list.length+" bài và "+existing.length+" ảnh.";
 }catch(e){status.textContent="Không thể tải: "+e.message}finally{busy=false;$("#imageLoad").disabled=false;refresh()}
}
function insert(text,img,pos){const link=urlOf(img),line="\n\n![Ảnh minh họa]("+link+")\n\n";if(text.includes("]("+link+")"))return text;const head=text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);if(!head)throw Error("Không tìm thấy front matter.");return pos==="top"?text.slice(0,head[0].length)+line+text.slice(head[0].length):text.trimEnd()+line}
async function saveAll(){
 if(busy)return;const selected=list.filter(p=>p.checkbox.checked);if(selected.length&&!chosen){status.textContent="Hãy chọn ảnh trong Gallery.";return}
 busy=true;save.disabled=true;
 try{
  const ref=await gh("git/ref/heads/main");if(ref.object.sha!==head)throw Error("main đã đổi, hãy tải lại trước khi Save.");
  const parent=await gh("git/commits/"+head),entries=[];
  for(const a of added){const blob=await gh("git/blobs","POST",{content:a.base64,encoding:"base64"});entries.push({path:a.path,mode:"100644",type:"blob",sha:blob.sha})}
  for(const p of selected){const text=insert(p.source,chosen,p.position.value);if(text!==p.source)entries.push({path:p.path,mode:"100644",type:"blob",content:text})}
  if(!entries.length)throw Error("Không có thay đổi mới.");
  const tree=await gh("git/trees","POST",{base_tree:parent.tree.sha,tree:entries}),commit=await gh("git/commits","POST",{message:"content(images): batch gallery upload and post insert",tree:tree.sha,parents:[head]});
  await gh("git/refs/heads/main","PATCH",{sha:commit.sha,force:false});
  head=commit.sha;added=[];chosen="";list=[];posts.replaceChildren();status.textContent="Đã lưu "+entries.length+" file trong MỘT commit "+head.slice(0,12)+". Tải lại để tiếp tục.";renderGallery();
 }catch(e){status.textContent="Chưa commit: "+e.message+"; thay đổi trên trang vẫn được giữ."}finally{busy=false;refresh()}
}
$("#imageLoad").onclick=load;search.oninput=filter;$("#imageSelectAll").onchange=e=>{list.filter(p=>!p.row.hidden).forEach(p=>p.checkbox.checked=e.target.checked);filter()};save.onclick=saveAll;
})();