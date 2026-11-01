(()=>{"use strict";
const $=s=>document.querySelector(s),Q="bn_visual_queue_v1",DB="bn_visual_studio_v1";
let queue=[],busy=false,stopRequested=false,reference=null,outputs=[],renderNumber=0;
const fields=["videoTitle","videoUrl","script","goal","style","tone","accent","language","variants","headline","subline","series","keywords","prompt"];
const clean=s=>String(s||"").trim();
const status=(msg,err=false)=>{$("#status").textContent=msg;$("#status").style.color=err?"#b33d51":"#46708e"};
const progress=(n,label)=>{$("#progressFill").style.width=n+"%";$("#percent").textContent=n+"%";$("#phase").textContent=label};
const slug=s=>clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64)||"youtube-visual";
function getJob(){const j=Object.fromEntries(fields.map(f=>[f,$("#"+f).value]));j.id=Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);j.at=Date.now();j.script=clean(j.script);if(j.script.length<40)throw Error("Hãy nhập script tối thiểu 40 ký tự để thiết kế ảnh sát nội dung.");if(j.script.length>60000)throw Error("Script tối đa 60.000 ký tự.");j.reference=reference?.data||null;return j}
function persist(){try{localStorage.setItem(Q,JSON.stringify(queue))}catch{throw Error("Không lưu được hàng đợi; hãy giảm script hoặc giải phóng dung lượng trình duyệt.")}}
function loadQueue(){try{queue=JSON.parse(localStorage.getItem(Q)||"[]");if(!Array.isArray(queue))queue=[]}catch{queue=[]}renderQueue()}
function renderQueue(){const root=$("#queue");root.replaceChildren();if(!queue.length){root.textContent="Hàng đợi trống.";return}
 queue.forEach((j,i)=>{const row=document.createElement("div");row.className="queue-item";const info=document.createElement("div"),t=document.createElement("strong"),sub=document.createElement("small");t.textContent="#"+(i+1)+" · "+(j.videoTitle||"Video chưa đặt tên");sub.textContent=new Date(j.at).toLocaleString("vi-VN")+" · "+j.goal;info.append(t,sub);
 const remove=document.createElement("button");remove.className="subtle";remove.textContent="Xóa";remove.onclick=()=>{queue=queue.filter(x=>x.id!==j.id);persist();renderQueue()};row.append(info,remove);root.append(row)})}
function fillJob(j){fields.forEach(f=>{if(j[f]!==undefined)$("#"+f).value=j[f]});$("#scriptCount").textContent=j.script.length.toLocaleString("vi-VN")+" ký tự"}
function headlineFrom(j){const text=clean(j.videoTitle)||j.script.split(/[.?!\n]/)[0];return text.replace(/^(hôm nay|trong video này|chúng ta sẽ)\s*/i,"").split(/\s+/).slice(0,7).join(" ").toLocaleUpperCase("vi-VN")}
function palette(j,variant){const palettes={editorial:["#071d37","#163b63"],tech:["#081b35","#075a76"],cinematic:["#0c152a","#38516d"],minimal:["#142e4d","#3b5c79"],bold:["#091d38","#095b93"]};const p=palettes[j.style]||palettes.editorial;return variant%2?[p[1],p[0]]:p}
function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
// Safe text bounds match the 10% guide drawn in preview-lab.css.
const SAFE_TEXT_INSET=.10,SAFE_TEXT_GUTTER=.015;
function safeTextBounds(w,h){const inset=SAFE_TEXT_INSET+SAFE_TEXT_GUTTER;return {left:w*inset,top:h*inset,right:w*(1-inset),bottom:h*(1-inset)}}
// Wrap every word; split a single oversize token rather than allowing overflow or silently discarding lines.
function wrapSafeText(c,text,width){
 const result=[];
 for(const paragraph of String(text||"").replace(/\r/g,"").split("\n")){
  if(!paragraph.trim()){if(result.length)result.push("");continue}
  let line="";
  for(const word of paragraph.trim().split(/\s+/)){
   const next=line?line+" "+word:word;
   if(c.measureText(next).width<=width){line=next;continue}
   if(line){result.push(line);line=""}
   if(c.measureText(word).width<=width){line=word;continue}
   // Unicode code points handle Vietnamese diacritics without cutting off text.
   let part="";
   for(const symbol of Array.from(word)){
    if(part&&c.measureText(part+symbol).width>width){result.push(part);part=symbol}
    else part+=symbol;
   }
   line=part;
  }
  if(line)result.push(line);
 }
 return result;
}
// Fit complete text to a finite rectangle with top-baseline placement, not Canvas maxWidth squashing.
function fitSafeText(c,text,rect,options={}){
 const maxFont=Math.max(1,Math.round(options.maxFont||32));
 const step=options.step||1.12,weight=options.weight||700;
 let best=null;
 for(let size=maxFont;size>=1;size--){
  c.font=weight+" "+size+"px system-ui,sans-serif";
  const lines=wrapSafeText(c,text,rect.width);
  const lineHeight=size*step;
  best={size,lines,lineHeight,rect};
  if(lines.length*lineHeight<=rect.height&&lines.every(x=>c.measureText(x).width<=rect.width+0.01))break;
 }
 return best;
}
function drawSafeText(c,text,rect,options={}){
 if(!String(text||"").trim())return null;
 const layout=fitSafeText(c,text,rect,options);
 c.save();c.beginPath();c.rect(rect.x,rect.y,rect.width,rect.height);c.clip();
 c.textBaseline="top";c.textAlign=options.align||"left";
 c.fillStyle=options.color||"#fff";
 c.shadowColor=options.shadowColor||"transparent";c.shadowBlur=options.shadowBlur||0;
 c.font=(options.weight||700)+" "+layout.size+"px system-ui,sans-serif";
 const x=options.align==="right"?rect.x+rect.width:rect.x;
 layout.lines.forEach((line,index)=>c.fillText(line,x,rect.y+index*layout.lineHeight));
 c.restore();
 return layout;
}
function renderCanvas(j,type,variant){const w=type==="thumbnail"?1280:1600,h=type==="thumbnail"?720:900;const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const c=canvas.getContext("2d");const [a,b]=palette(j,variant),acc=j.accent||"#3b8bff";
 const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,0,w,h);
 const artX=variant%2?w*.67:w*.72,artY=h*.48;const shape=c.createRadialGradient(artX,artY,10,artX,artY,w*.47);shape.addColorStop(0,acc+"b9");shape.addColorStop(.46,acc+"30");shape.addColorStop(1,"#00000000");c.fillStyle=shape;c.fillRect(0,0,w,h);
 // Abstract editorial artwork: orbit/data motif derived from general visual direction.
 c.save();c.translate(artX,artY);c.rotate(variant*.3);for(let n=0;n<7;n++){c.strokeStyle="rgba(186,228,255,"+(.11+n*.055)+")";c.lineWidth=n%2?3:1.5;c.beginPath();c.ellipse(0,0,w*(.13+n*.025),h*(.13+n*.022),.25+n*.17,0,Math.PI*2);c.stroke()}c.restore();
 const seed=(clean(j.script).length+variant*71)%19;for(let i=0;i<16;i++){let x=w*(.58+((i*7+seed)%40)/100),y=h*((i*13+seed)%100)/100;c.fillStyle=i%3?acc+"66":"#bfe8ff77";c.fillRect(x,y,5+(i%4)*3,5+(i%4)*3)}
 let readyResolve;const ready=new Promise(resolve=>{readyResolve=resolve});const completed=()=>{finish();readyResolve()};
 if(j.reference){const img=new Image();img.onload=()=>{c.save();c.beginPath();c.roundRect(w*.65,h*.15,w*.29,h*.7,28);c.clip();let k=Math.max(w*.29/img.width,h*.7/img.height),iw=img.width*k,ih=img.height*k;c.globalAlpha=.84;c.drawImage(img,w*.65+(w*.29-iw)/2,h*.15+(h*.7-ih)/2,iw,ih);c.restore();completed()};img.onerror=completed;img.src=j.reference}else completed();
 function finish(){
 // Shared 10% safe zone for preview, thumbnail PNG and cover PNG.
 // Text gets a further 1.5% breathing room inside the dashed boundary.
 const safe=safeTextBounds(w,h),safeW=safe.right-safe.left;
 const series=(j.series||"BLOGNAVER · INSIGHTS").toLocaleUpperCase();
 const head=clean(j.headline)||headlineFrom(j),sub=clean(j.subline)||clean(j.keywords);
 const titleBox={x:safe.left,y:h*.235,width:w*.625,height:h*.49};
 const seriesBox={x:safe.left,y:h*.132,width:safeW*.82,height:h*.055};
 const subBox={x:safe.left,y:h*.808,width:w*.575,height:h*.074};
 const footerBox={x:w*.717,y:h*.842,width:safe.right-w*.717,height:h*.038};
 c.fillStyle="rgba(0,0,0,.13)";c.fillRect(0,h*.79,w,h*.21);
 c.save();c.beginPath();c.rect(safe.left,safe.top,safeW,safe.bottom-safe.top);c.clip();
 drawSafeText(c,series,seriesBox,{weight:750,maxFont:Math.round(w*.017),color:"#c2e5ff"});
 drawSafeText(c,head,titleBox,{weight:900,maxFont:type==="thumbnail"?75:91,color:"#fff",shadowColor:"#00000066",shadowBlur:12});
 // Brand accent and captions remain INSIDE the same safe zone.
 roundedRect(c,safe.left,h*.777,w*.435,7,3);c.fillStyle=acc;c.fill();
 if(sub)drawSafeText(c,sub,subBox,{weight:650,maxFont:Math.round(w*.023),color:"#d6ecff"});
 drawSafeText(c,"BLOGNAVER / "+(type==="thumbnail"?"THUMBNAIL":"COVER"),footerBox,{weight:650,maxFont:Math.round(w*.011),align:"right",color:"#fff"});
 c.restore();
 }
 return {canvas,type,variant,job:j,ready}
}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("images",{keyPath:"id"});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function storeImage(obj){if(obj.savedBlob)return obj.savedBlob;await obj.ready;const blob=await new Promise(resolve=>obj.canvas.toBlob(resolve,"image/png"));if(!blob)throw Error("Không xuất được PNG.");const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction("images","readwrite");tx.objectStore("images").put({id:obj.id||(obj.id=crypto.randomUUID()),at:Date.now(),title:obj.job.videoTitle||headlineFrom(obj.job),kind:obj.type,variant:obj.variant,blob});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});d.close();obj.savedBlob=blob;window.BNVisualCloud?.sync(msg=>$("#githubSyncStatus").textContent=msg).catch(e=>$("#githubSyncStatus").textContent=e.message);return blob}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function resultCard(obj){const card=document.createElement("article");card.className="preview-card";const heading=document.createElement("div");heading.className="preview-content";const name=document.createElement("h3");name.textContent=(obj.type==="thumbnail"?"YouTube Thumbnail · 1280×720":"Cover Image · 1600×900")+" · #"+(obj.variant+1);
 const info=document.createElement("p");info.textContent=(obj.job.videoTitle||"Video")+". Ảnh canvas xuất PNG, không phải ảnh photorealistic AI.";const actions=document.createElement("div");actions.className="actions";const save=document.createElement("button");save.className="primary";save.textContent="Tải PNG ↓";save.onclick=async()=>{const blob=await storeImage(obj);download(blob,slug(obj.job.videoTitle)+"-"+obj.type+"-"+(obj.variant+1)+".png");refreshHistory()};
 const change=document.createElement("button");change.className="subtle";change.textContent="Tạo lại";change.onclick=async()=>{obj.variant=++renderNumber;const fresh=renderCanvas(obj.job,obj.type,obj.variant);card.replaceChild(fresh.canvas,card.querySelector("canvas"));obj.canvas=fresh.canvas;obj.ready=fresh.ready;obj.id=null;obj.savedBlob=null;try{await storeImage(obj);status("Biến thể mới đã tự lưu vào Gallery.")}catch(e){status("Không lưu được biến thể mới: "+e.message,true)}};
 actions.append(save,change);heading.append(name,info,actions);card.append(obj.canvas,heading);return card}
async function generate(j){if(busy)return false;busy=true;stopRequested=false;$("#generate").disabled=true;$("#runQueue").disabled=true;try{progress(15,"Phân tích script");await new Promise(r=>setTimeout(r,30));if(stopRequested)return false;
 const root=$("#results");root.replaceChildren();outputs=[];const types=j.goal==="both"?["thumbnail","cover"]:[j.goal],count=Number(j.variants)||1;let done=0;
 for(const type of types){for(let v=0;v<count;v++){if(stopRequested)break;const obj=renderCanvas(j,type,++renderNumber);outputs.push(obj);root.append(resultCard(obj));try{await storeImage(obj)}catch(e){status("Không lưu được ảnh vào Gallery: "+e.message,true);throw e}done++;progress(15+Math.round(done/(types.length*count)*85),"Đang dựng "+(type==="thumbnail"?"thumbnail":"cover"))}}
 if(!stopRequested){status("Đã tạo và tự lưu "+done+" biến thể vào Gallery. Bạn vẫn có thể tải PNG ngay tại đây.");$("#prompt").value=$("#prompt").value||"Editorial visual: "+(j.videoTitle||headlineFrom(j))+". Keywords: "+(j.keywords||j.script.slice(0,110))+". Clean focal point, brand-safe typography, strong contrast."}
 if(window.BNVisualCloud?.token())await window.BNVisualCloud.sync(msg=>$("#githubSyncStatus").textContent=msg);
 return !stopRequested
 }catch(e){status("Không thể tạo ảnh: "+e.message,true);return false}finally{busy=false;$("#generate").disabled=false;$("#runQueue").disabled=false}}
async function refreshHistory(){const root=$("#history");root.replaceChildren();try{const d=await db();const items=await new Promise((resolve,reject)=>{const tx=d.transaction("images","readonly"),r=tx.objectStore("images").getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();items.sort((a,b)=>b.at-a.at);if(!items.length){root.textContent="Chưa lưu ảnh nào vào thư viện.";return}
 for(const j of items.slice(0,30)){const item=document.createElement("div");item.className="history-item";const u=URL.createObjectURL(j.blob);const img=document.createElement("img");img.src=u;img.alt="Ảnh "+j.kind+" đã tạo";img.onload=()=>URL.revokeObjectURL(u);const info=document.createElement("div");info.className="info";const strong=document.createElement("strong");strong.textContent=j.title;const small=document.createElement("small");small.textContent=j.kind+" · "+new Date(j.at).toLocaleString("vi-VN");info.append(strong,small);const btn=document.createElement("button");btn.className="subtle";btn.textContent="Tải lại";btn.onclick=()=>download(j.blob,slug(j.title)+"-"+j.kind+".png");item.append(img,info,btn);root.append(item)}}
 catch(e){root.textContent="Không tải được lịch sử: "+e.message}}
$("#script").addEventListener("input",()=>$("#scriptCount").textContent=$("#script").value.length.toLocaleString("vi-VN")+" ký tự");
$("#suggestHeadline").onclick=()=>{const s=$("#script").value;$("#headline").value=headlineFrom({videoTitle:$("#videoTitle").value,script:s});status("Đã đề xuất headline từ tiêu đề/script.")};
$("#compactHeadline").onclick=()=>{$("#headline").value=$("#headline").value.split(/\s+/).slice(0,6).join(" ");status("Đã rút gọn headline.")};
$("#demo").onclick=()=>{$("#videoTitle").value="AI đang định hình lại ngành du lịch";$("#script").value="Trí tuệ nhân tạo đang thay đổi cách hành khách tìm kiếm chuyến bay và đặt phòng khách sạn. Video này phân tích cách các nền tảng trực tuyến cá nhân hóa trải nghiệm, áp lực lên công ty du lịch truyền thống và những lựa chọn của doanh nghiệp trước công nghệ mới.";$("#script").dispatchEvent(new Event("input"));$("#headline").value="AI THAY ĐỔI DU LỊCH";$("#subline").value="Ai sẽ thắng cuộc?"};
$("#reference").onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){status("Ảnh tối đa 5 MB.",true);return}const reader=new FileReader();reader.onload=()=>{reference={data:reader.result};status("Đã thêm ảnh tham chiếu vào bản thiết kế hiện tại.")};reader.readAsDataURL(file)};
$("#removeReference").onclick=()=>{reference=null;$("#reference").value="";status("Đã bỏ ảnh tham chiếu.")};
$("#copyPrompt").onclick=async()=>{try{await navigator.clipboard.writeText($("#prompt").value);status("Đã sao chép prompt.")}catch{status("Trình duyệt không cho sao chép tự động.",true)}};
$("#analyze").onclick=async()=>{const key=clean($("#groqKey").value),script=clean($("#script").value);if(!key||!script){status("Nhập Groq API key và script trước khi phân tích.",true);return}
 const btn=$("#analyze");btn.disabled=true;status("Groq đang phân tích script…");const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
 try{const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",signal:ctl.signal,headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:"openai/gpt-oss-20b",temperature:.5,max_completion_tokens:350,messages:[{role:"system",content:"You are a YouTube thumbnail editor. Return exactly 3 Vietnamese lines labeled HEADLINE:, SUBLINE:, VISUAL:. Avoid made-up facts."},{role:"user",content:"Video: "+$("#videoTitle").value+"\nScript:\n"+script.slice(0,15000)}]})});const d=await r.json();if(!r.ok)throw Error("Groq HTTP "+r.status+": "+(d.error?.message||"API không khả dụng"));const t=d.choices?.[0]?.message?.content||"";const line=k=>t.split("\n").find(x=>x.startsWith(k+":"))?.slice(k.length+1).trim()||"";$("#headline").value=line("HEADLINE")||$("#headline").value;$("#subline").value=line("SUBLINE")||$("#subline").value;$("#prompt").value=line("VISUAL")||t;$("#analysis").textContent="Groq đã trả ý tưởng visual. Ảnh cuối vẫn được dựng tại trình duyệt bằng canvas.";status("Đã phân tích xong; sẵn sàng dựng ảnh.")}
 catch(e){status("Groq không phân tích được: "+e.message+". Bạn vẫn có thể tạo ảnh offline.",true)}finally{clearTimeout(timer);btn.disabled=false}};
$("#generate").onclick=async()=>{try{await generate(getJob())}catch(e){status(e.message,true)}};
$("#rerender").onclick=async()=>{try{await generate(getJob())}catch(e){status(e.message,true)}};
$("#enqueue").onclick=()=>{try{if(queue.length>=12)throw Error("Tối đa 12 video đang chờ.");queue.push(getJob());persist();renderQueue();status("Đã xếp hàng, chưa chạy. Bấm Chạy hàng đợi khi sẵn sàng.");$("#script").value="";$("#scriptCount").textContent="0 ký tự"}catch(e){status(e.message,true)}};
$("#runQueue").onclick=async()=>{if(busy)return;stopRequested=false;while(queue.length&&!stopRequested){const j=queue[0];fillJob(j);const success=await generate(j);if(stopRequested||!success)break;queue.shift();persist();renderQueue()}};
$("#stop").onclick=()=>{stopRequested=true;status("Đã yêu cầu dừng sau bước đang xử lý. Hàng đợi chưa chạy vẫn giữ nguyên.")};
$("#refreshHistory").onclick=refreshHistory;
$("#clearHistory").onclick=async()=>{if(!confirm("Xóa toàn bộ ảnh đã lưu trong thư viện thiết bị?"))return;const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction("images","readwrite");tx.objectStore("images").clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});d.close();refreshHistory()};
$("#connectGithub").onclick=async()=>{const b=$("#connectGithub");b.disabled=true;try{await window.BNVisualCloud.connect($("#githubToken").value,msg=>$("#githubSyncStatus").textContent=msg);$("#githubToken").value="";$("#githubSyncStatus").textContent="GitHub đã kết nối; ảnh mới sẽ tự đồng bộ."}catch(e){$("#githubSyncStatus").textContent=e.message}finally{b.disabled=false}};
if(window.BNVisualCloud?.token()){ $("#githubSyncStatus").textContent="Đã tìm thấy GitHub token CMS. Đang đồng bộ ảnh cục bộ…";window.BNVisualCloud.sync(msg=>$("#githubSyncStatus").textContent=msg).catch(e=>$("#githubSyncStatus").textContent=e.message)}
loadQueue();refreshHistory();window.BNVisualCloud?.hydrate(msg=>$("#githubSyncStatus").textContent=msg).then(()=>refreshHistory()).catch(e=>$("#githubSyncStatus").textContent="Không thể tải Gallery từ GitHub: "+e.message);
})();