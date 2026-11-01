/* BlogNaver Podcast Studio — workflow/UI orchestration.
 * Ghi chú: Không gửi audio ra mạng; chỉ IndexedDB tại thiết bị và tải file cục bộ.
 */
(() => {
"use strict";
const A=window.BNPodcastAudio,$=id=>document.getElementById(id);
if(!A)return;
const mkid=()=>crypto.randomUUID?.()||"id-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const deep=x=>JSON.parse(JSON.stringify(x));
const fmt=time=>{const v=Math.max(0,Number(time)||0),sec=Math.floor(v%60),min=Math.floor(v/60)%60,h=Math.floor(v/3600);return (h?String(h).padStart(2,"0")+":":"")+String(min).padStart(2,"0")+":"+String(sec).padStart(2,"0")};
const fmt10=time=>fmt(time)+"."+Math.floor((Math.max(0,time)%1)*10);
const toast=(message,error=false)=>{
 const t=$("toast");t.textContent=message;t.classList.toggle("error",error);t.hidden=false;
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,4300);
};
const metaFields=["showTitle","episodeTitle","hostName","category","language","description","script"];
const DSPFields=["highpass","compressor","normalize","master"];
const TRACKS=A.trackKeys;
const state={assets:new Map(),clips:[],tracks:A.tracksDefault(),selection:null,playPos:0,
 ctx:null,active:null,raf:0,playing:false,from:0,ctxFrom:0,playbackRate:1,
 recording:null,meterRaf:0,rendering:false,cancelRender:false,coverBlob:null,
 zoom:1,px:20,history:[],historyIndex:-1,loaded:false,savePending:false,saveTimer:null,saveChain:Promise.resolve(),db:null};
const currentMeta=()=>Object.fromEntries(metaFields.map(id=>[id,$(id).value]));
function settings(){return {highpass:$("highpass").checked,compressor:$("compressor").checked,normalize:$("normalize").checked,master:Number($("master").value)/100}}
const snapshot=()=>({clips:deep(state.clips),tracks:deep(state.tracks)});
function recordHistory(){
 if(!state.loaded)return;
 state.history.splice(state.historyIndex+1);
 state.history.push(snapshot());
 if(state.history.length>35)state.history.shift();
 state.historyIndex=state.history.length-1;historyButtons();dirty();
}
function historyButtons(){$("undo").disabled=state.historyIndex<=0;$("redo").disabled=state.historyIndex>=state.history.length-1}
function restore(item){
 stopAudio();state.clips=deep(item.clips);state.tracks=deep(item.tracks);
 if(!state.clips.some(c=>c.id===state.selection))state.selection=null;
 renderAll();dirty();
}
function historyMove(delta){
 const next=state.historyIndex+delta;
 if(next<0||next>=state.history.length)return;
 state.historyIndex=next;restore(state.history[next]);historyButtons();
}
function duration(){return A.durationOf(state.clips)}
function selected(){return state.clips.find(c=>c.id===state.selection)||null}
function updateStats(){
 const d=duration();$("assetCount").textContent=String(state.assets.size);
 $("totalClock").textContent=fmt10(d);$("releaseDuration").textContent=fmt(d);$("releaseClips").textContent=String(state.clips.length);
 $("scrubber").max=String(Math.max(d,.1));$("scrubber").value=String(Math.min(d,state.playPos));
 $("playClock").textContent=fmt10(state.playPos);
}
function mark(msg){$("saveState").textContent=msg}
function dirty(){
 if(!state.loaded)return;
 mark("● Có thay đổi · đang chờ lưu");state.savePending=true;
 clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>saveProject(false),1400);
}
function dbOpen(){
 if(!window.indexedDB)throw Error("Trình duyệt không hỗ trợ IndexedDB.");
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open("bn_podcast_studio_v1",1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains("media"))db.createObjectStore("media",{keyPath:"id"});
   if(!db.objectStoreNames.contains("projects"))db.createObjectStore("projects",{keyPath:"id"});
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function dbRead(store,key){
 return new Promise((resolve,reject)=>{
  const req=state.db.transaction(store,"readonly").objectStore(store).get(key);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function dbAll(store){
 return new Promise((resolve,reject)=>{
  const req=state.db.transaction(store,"readonly").objectStore(store).getAll();
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function dbPut(store,data){
 return new Promise((resolve,reject)=>{
  const tx=state.db.transaction(store,"readwrite");
  tx.objectStore(store).put(data);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
}
async function saveProject(manual=true){
 if(!state.loaded)return;
 clearTimeout(state.saveTimer);
 const payload={id:"active",schema:1,at:Date.now(),meta:currentMeta(),clips:deep(state.clips),
 tracks:deep(state.tracks),settings:settings(),coverBlob:state.coverBlob};
 state.saveChain=state.saveChain.catch(()=>{}).then(async()=>{
  if(!state.db)throw Error("Bộ nhớ IndexedDB không khả dụng.");
  mark("↥ Đang lưu dự án vào thiết bị...");
  await dbPut("projects",payload);
  state.savePending=false;mark("✓ Đã lưu cục bộ · "+new Date().toLocaleTimeString("vi-VN"));
  if(manual)toast("Đã lưu dự án trong IndexedDB trên thiết bị hiện tại.");
 }).catch(e=>{
  state.savePending=true;mark("⚠ Chưa lưu được · "+e.message);
  toast("Lưu dự án thất bại: "+e.message+". Hãy sao lưu file WAV và dữ liệu.",true);
 });
 await state.saveChain;
}
async function audioContext(){
 if(!state.ctx){const Constructor=window.AudioContext||window.webkitAudioContext;if(!Constructor)throw Error("Trình duyệt chưa hỗ trợ Web Audio.");state.ctx=new Constructor();}
 if(state.ctx.state==="suspended")await state.ctx.resume();
 return state.ctx;
}
async function decode(blob){
 const context=await audioContext();
 const buffer=await context.decodeAudioData(await blob.arrayBuffer());
 if(!buffer?.duration||!Number.isFinite(buffer.duration))throw Error("Audio hỏng hoặc codec không hỗ trợ.");
 return buffer;
}
function assetDurationTotal(){return [...state.assets.values()].reduce((sum,x)=>sum+(x.buffer?.duration||0),0)}
async function addAsset(blob,name,autoTrack=null,save=true){
 if(!blob||blob.size>90*1024*1024)throw Error("Mỗi file giới hạn 90 MB để bảo vệ bộ nhớ.");
 if(state.assets.size>=35)throw Error("Tối đa 35 file trong dự án.");
 const buffer=await decode(blob);
 if(buffer.duration>3600||assetDurationTotal()+buffer.duration>3600)throw Error("Tổng thời lượng audio nguồn tối đa 60 phút trong bản chỉnh sửa trên trình duyệt.");
 const entry={id:mkid(),blob,buffer,duration:buffer.duration,name:(name||"Audio clip").slice(0,160),peaks:A.makePeaks(buffer)};
 if(save&&state.db)await dbPut("media",{id:entry.id,name:entry.name,blob});
 state.assets.set(entry.id,entry);renderAssets();
 if(autoTrack)placeAsset(entry.id,autoTrack);
 dirty();
 return entry;
}
async function importFiles(files,targetTrack=null){
 if(!files?.length)return;
 for(const file of files){
  try{
   mark("Đang giải mã: "+file.name);
   await addAsset(file,file.name,targetTrack);
   toast("Đã thêm audio: "+file.name);
  }catch(e){toast(file.name+": "+e.message,true)}
 }
 renderAll();
}
function placeAsset(id,track="voice"){
 const a=state.assets.get(id);if(!a)return;
 stopAudio();
 const endOfTrack=state.clips.filter(c=>c.track===track).reduce((m,c)=>Math.max(m,c.start+c.out-c.in),0);
 const clip={id:mkid(),assetId:id,track,start:endOfTrack,in:0,out:a.duration,gain:1,fadeIn:0,fadeOut:0};
 state.clips.push(clip);state.selection=clip.id;
 recordHistory();renderAll();toast("Đã đưa "+a.name+" vào track "+state.tracks[track].name);
}
function renderAssets(){
 const list=$("assetList");list.replaceChildren();
 if(!state.assets.size){list.textContent="Chưa có audio. Hãy nhập file hoặc thu bằng microphone.";return}
 for(const a of state.assets.values()){
  const card=document.createElement("div");card.className="asset";
  const name=document.createElement("strong");name.textContent=a.name;name.title=a.name;
  const hint=document.createElement("small");hint.textContent=fmt(a.duration)+" · "+(a.blob.size/1024/1024).toFixed(1)+" MB";
  const row=document.createElement("div");row.className="asset-actions";
  for(const [id,label] of [["voice","Voice"],["guest","Guest"],["music","BGM"],["sfx","SFX"]]){
   const b=document.createElement("button");b.textContent="+"+label;b.title="Đặt vào track "+label;
   b.onclick=()=>placeAsset(a.id,id);row.append(b);
  }
  card.append(name,hint,row);list.append(card);
 }
}
function selectClip(id){state.selection=id;renderTimeline();renderInspector()}
function renderInspector(){
 const clip=selected();
 const asset=clip&&state.assets.get(clip.assetId);
 $("selectedName").textContent=asset?asset.name:"Chưa chọn clip";
 const inputs={clipOffset:clip?.start,clipGain:clip?.gain*100,clipIn:clip?.in,clipOut:clip?.out,
  clipFadeIn:clip?.fadeIn,clipFadeOut:clip?.fadeOut};
 for(const [id,val] of Object.entries(inputs)){
  $(id).disabled=!clip;$(id).value=clip?(Number(val).toFixed(2)):"";
 }
 for(const id of ["applyClip","deleteClip","duplicateClip","split","trimSilence"])$(id).disabled=!clip;
}
function applyInspector(){
 const clip=selected();if(!clip)return;
 const asset=state.assets.get(clip.assetId);if(!asset)return;
 const start=Number($("clipOffset").value),inside=Number($("clipIn").value),outside=Number($("clipOut").value),
  gain=Number($("clipGain").value),fi=Number($("clipFadeIn").value),fo=Number($("clipFadeOut").value);
 if([start,inside,outside,gain,fi,fo].some(x=>!Number.isFinite(x))||start<0||start>3599||inside<0||outside>asset.duration+.01||outside-inside<.05||gain<0||gain>200||fi<0||fo<0){
  toast("Thông số clip không hợp lệ. Out phải sau In ≥ 0,05 giây.",true);return;
 }
 stopAudio();
 Object.assign(clip,{start,in:inside,out:Math.min(asset.duration,outside),gain:gain/100,fadeIn:Math.min(fi,outside-inside),fadeOut:Math.min(fo,outside-inside)});
 recordHistory();renderAll();toast("Đã áp dụng thay đổi cho clip.");
}
function splitClip(){
 const clip=selected();if(!clip)return;
 const cut=state.playPos;
 if(cut<=clip.start+.05||cut>=clip.start+clip.out-clip.in-.05){toast("Đưa playhead vào giữa clip để cắt.",true);return}
 stopAudio();
 const originalOut=clip.out,splitIn=clip.in+(cut-clip.start);
 clip.out=splitIn;clip.fadeOut=0;
 const second={...clip,id:mkid(),start:cut,in:splitIn,out:originalOut,fadeIn:0};
 state.clips.push(second);state.selection=second.id;
 recordHistory();renderAll();toast("Đã split clip tại "+fmt10(cut));
}
function deleteClip(){
 const clip=selected();if(!clip)return;
 stopAudio();state.clips=state.clips.filter(c=>c.id!==clip.id);state.selection=null;
 recordHistory();renderAll();
}
function duplicateClip(){
 const clip=selected();if(!clip)return;
 stopAudio();const dupe={...clip,id:mkid(),start:clip.start+clip.out-clip.in};
 state.clips.push(dupe);state.selection=dupe.id;recordHistory();renderAll();
}
function trimSilence(){
 const clip=selected(),asset=clip&&state.assets.get(clip.assetId);if(!asset)return;
 const buf=asset.buffer,channel=buf.getChannelData(0),rate=buf.sampleRate;
 const step=256,threshold=.008,begin=Math.floor(clip.in*rate),end=Math.min(channel.length,Math.ceil(clip.out*rate));
 let left=begin,right=end;
 while(left<end){let peak=0;for(let p=left;p<Math.min(end,left+step);p++)peak=Math.max(peak,Math.abs(channel[p]));if(peak>threshold)break;left+=step}
 while(right>left){let peak=0;for(let p=Math.max(left,right-step);p<right;p++)peak=Math.max(peak,Math.abs(channel[p]));if(peak>threshold)break;right-=step}
 if(right-left<rate*.05){toast("Không tìm thấy đoạn thoại đủ lớn hơn ngưỡng -42 dB.",true);return}
 const before=clip.out-clip.in;clip.in=left/rate;clip.out=right/rate;
 recordHistory();renderAll();toast("Cắt im lặng đầu/cuối · "+(before-(clip.out-clip.in)).toFixed(2)+" giây.");
}
let px=20,timelineW=800;
function waveform(c,clip,asset){
 const w=Math.min(1200,Math.max(20,Math.round(c.clientWidth*2))),h=70;c.width=w;c.height=h;
 const g=c.getContext("2d");if(!g)return;
 g.clearRect(0,0,w,h);g.strokeStyle="#c2e7ffb8";g.lineWidth=1;
 const ch=asset.buffer.getChannelData(0),rate=asset.buffer.sampleRate;
 for(let x=0;x<w;x++){
  const start=Math.floor((clip.in+(clip.out-clip.in)*x/w)*rate),end=Math.floor((clip.in+(clip.out-clip.in)*(x+1)/w)*rate);
  let amp=0;
  const step=Math.max(1,Math.ceil((end-start)/12));
  for(let k=start;k<end;k+=step)amp=Math.max(amp,Math.abs(ch[Math.min(ch.length-1,k)]||0));
  const y=amp*h*.42;
  g.beginPath();g.moveTo(x,h/2-y);g.lineTo(x,h/2+y);g.stroke();
 }
}
function renderTimeline(){
 const total=Math.max(duration(),20),frame=$("timelineFrame");
 const labelWidth=window.innerWidth<=580?90:116;
 px=Math.max(14,(frame.clientWidth-labelWidth-22)/total)*state.zoom;
 timelineW=Math.max(450,Math.ceil(total*px));
 const root=$("timeline");root.replaceChildren();root.style.width=(labelWidth+timelineW)+"px";
 const ruler=$("ruler");ruler.replaceChildren();ruler.style.width=(labelWidth+timelineW)+"px";
 const unit=total>180?30:total>60?10:5;
 const first=document.createElement("span");first.textContent="TIME";first.style.position="sticky";first.style.left="4px";first.style.zIndex="4";ruler.append(first);
 for(let sec=0;sec<=total;sec+=unit){const tick=document.createElement("span");tick.className="tick";tick.style.left=(labelWidth+sec*px)+"px";tick.textContent=fmt(sec);ruler.append(tick)}
 for(const key of TRACKS){
  const t=state.tracks[key],row=document.createElement("div");row.className="track";
  const label=document.createElement("div");label.className="track-label";
  const name=document.createElement("strong");name.textContent=t.name;
  const buttons=document.createElement("div");buttons.className="track-actions";
  for(const [flag,text] of [["mute","M"],["solo","S"]]){
   const b=document.createElement("button");b.textContent=text;b.title=(flag==="mute"?"Mute":"Solo")+" "+t.name;b.classList.toggle("active",t[flag]);
   b.onclick=()=>{t[flag]=!t[flag];recordHistory();renderTimeline();if(state.playing)restartAudio()};
   buttons.append(b);
  }
  label.append(name,buttons);
  const lane=document.createElement("div");lane.className="track-canvas";lane.style.width=timelineW+"px";lane.style.minWidth=timelineW+"px";
  lane.addEventListener("click",event=>{if(event.target!==lane)return;seek(A.clamp(event.offsetX/px,0,duration()))});
  for(const clip of state.clips.filter(c=>c.track===key)){
   const asset=state.assets.get(clip.assetId);if(!asset)continue;
   const block=document.createElement("div");block.className="audio-block "+key+(clip.id===state.selection?" selected":"");
   block.style.left=(clip.start*px)+"px";block.style.width=Math.max(10,(clip.out-clip.in)*px)+"px";
   block.title=asset.name+" · "+fmt10(clip.out-clip.in)+" · "+Math.round(clip.gain*100)+"%";
   const title=document.createElement("span");title.className="clip-title";title.textContent=asset.name;
   const cv=document.createElement("canvas");block.append(cv,title);
   block.addEventListener("pointerdown",event=>{
    if(event.button!==0)return;event.stopPropagation();selectClip(clip.id);
    block.setPointerCapture(event.pointerId);
    block.dragInfo={x:event.clientX,start:clip.start,moved:false};block.style.cursor="grabbing";
   });
   block.addEventListener("pointermove",event=>{
    if(!block.dragInfo)return;
    const {x,start}=block.dragInfo;const delta=(event.clientX-x)/px;
    if(Math.abs(delta*px)>3)block.dragInfo.moved=true;
    if(block.dragInfo.moved){clip.start=Math.round(Math.max(0,start+delta)*10)/10;block.style.left=clip.start*px+"px";$("clipOffset").value=clip.start.toFixed(2)}
   });
   const finishDrag=()=>{
    if(!block.dragInfo)return;
    const moved=block.dragInfo.moved;block.dragInfo=null;block.style.cursor="grab";
    if(moved){stopAudio();recordHistory();renderAll()}
   };
   block.addEventListener("pointerup",finishDrag);block.addEventListener("pointercancel",finishDrag);
   block.addEventListener("click",event=>{event.stopPropagation();selectClip(clip.id)});
   lane.append(block);requestAnimationFrame(()=>{if(cv.isConnected)waveform(cv,clip,asset)});
  }
  row.append(label,lane);root.append(row);
 }
 updateStats();renderPlayhead();
}
function renderPlayhead(){
 const frame=$("timelineFrame"),head=$("playhead"),label=window.innerWidth<=580?90:116;
 head.style.left=(label+state.playPos*px-frame.scrollLeft)+"px";
 head.style.top="0";head.style.height=(frame.scrollHeight)+"px";
 $("playClock").textContent=fmt10(state.playPos);$("scrubber").value=state.playPos;
}
function renderAll(){renderAssets();renderTimeline();renderInspector();updateStats()}
function stopAudio(reset=false){
 if(state.active){state.active.stop();state.active=null}
 state.playing=false;cancelAnimationFrame(state.raf);state.raf=0;$("play").textContent="▶";
 if(reset)state.playPos=0;renderPlayhead();
}
async function play(){
 if(state.playing){stopAudio();return}
 if(!state.clips.length){toast("Thêm audio vào timeline trước khi phát.",true);return}
 if(state.playPos>=duration()-.03)state.playPos=0;
 try{
  const ctx=await audioContext();
  state.active=A.schedule(ctx,state.assets,state.clips,state.tracks,settings(),state.playPos,duration()-state.playPos,state.playbackRate);
  state.playing=true;state.from=state.playPos;state.ctxFrom=state.active.time0;
  $("play").textContent="Ⅱ";
  const tick=()=>{
   if(!state.playing)return;
   state.playPos=A.clamp(state.from+Math.max(0,ctx.currentTime-state.ctxFrom)*state.playbackRate,0,duration());
   renderPlayhead();
   if(state.playPos>=duration()-.02){stopAudio();state.playPos=0;renderPlayhead();return}
   state.raf=requestAnimationFrame(tick);
  };state.raf=requestAnimationFrame(tick);
 }catch(error){stopAudio();toast("Không phát được: "+error.message,true)}
}
function restartAudio(){if(!state.playing)return;stopAudio();play()}
function seek(pos){
 const was=state.playing;stopAudio();state.playPos=A.clamp(Number(pos)||0,0,duration());renderPlayhead();
 if(was)play();
}
function setStep(step){
 if(!["plan","record","edit","release"].includes(step))return;
 document.querySelectorAll("[data-step]").forEach(el=>el.classList.toggle("active",el.dataset.step===step));
 document.querySelectorAll("[data-panel]").forEach(el=>el.classList.toggle("active",el.dataset.panel===step));
 if(step==="edit")renderTimeline();
 if(step==="release"){drawCover();updateStats()}
}
function tinyFile(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
function txtFile(text,name,type="text/plain;charset=utf-8"){tinyFile(new Blob([text],{type}),name)}
const slug=x=>String(x||"podcast").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"podcast";
function notes(){
 const show=$("showTitle").value.trim()||"Podcast BlogNaver",episode=$("episodeTitle").value.trim()||"Tập mới";
 const description=$("description").value.trim(),host=$("hostName").value.trim(),script=$("script").value.trim();
 return show+"\n"+episode+"\n"+"=".repeat(38)+"\n\n"+"Host: "+host+"\nNgôn ngữ: "+$("language").value+"\nDanh mục: "+$("category").value+
  "\nThời lượng audio: "+fmt(duration())+"\n\nGIỚI THIỆU TẬP\n"+description+"\n\nSCRIPT / GHI CHÚ BIÊN TẬP\n"+script+
  "\n\n---\nTạo bởi BlogNaver Podcast Studio (ghi chú chưa được AI transcription).\n";
}
const escapeXml=s=>String(s||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[ch]));
function metadata(){
 return {show:$("showTitle").value.trim(),title:$("episodeTitle").value.trim(),host:$("hostName").value.trim(),
  language:$("language").value,category:$("category").value,description:$("description").value.trim(),
  duration:duration(),date:new Date().toISOString(),audioFormat:"WAV PCM 16-bit stereo",note:"Chưa xuất bản; cần tải tệp lên một podcast host hợp lệ."};
}
async function drawCover(){
 const cv=$("cover"),g=cv.getContext("2d");
 if(state.coverBlob){
  try{
   const bitmap=await createImageBitmap(state.coverBlob);
   g.clearRect(0,0,1200,1200);g.drawImage(bitmap,0,0,1200,1200);bitmap.close();return;
  }catch(e){state.coverBlob=null}
 }
 const w=1200,gradient=g.createLinearGradient(0,0,w,w);gradient.addColorStop(0,"#081c35");gradient.addColorStop(.55,"#243b7d");gradient.addColorStop(1,"#4f46e5");
 g.fillStyle=gradient;g.fillRect(0,0,w,w);
 g.save();g.strokeStyle="#9dd9ff45";for(let i=0;i<9;i++){g.lineWidth=3;g.beginPath();g.ellipse(880,510,170+i*29,300+i*24,i*.16,0,2*Math.PI);g.stroke()}g.restore();
 g.fillStyle="#a9d8ff";g.font="bold 27px system-ui";g.fillText("BLOGNAVER · ORIGINAL PODCAST",95,120);
 g.fillStyle="#f8fafc";g.font="900 86px system-ui";g.textBaseline="top";
 const wordWrap=(text,max)=>{
  const words=String(text).trim().split(/\s+/),out=[];let line="";
  for(const word of words){
   const test=line?line+" "+word:word;
   if(g.measureText(test).width>max&&line){out.push(line);line=word}else line=test;
  }if(line)out.push(line);return out;
 };
 let main=$("showTitle").value.trim()||"BLOGNAVER PODCAST";
 let size=86,lines=[];
 do{g.font="900 "+size+"px system-ui";lines=wordWrap(main,940);if(lines.length<=5)break;size-=4}while(size>24);
 g.fillStyle="#fff";lines.slice(0,5).forEach((line,i)=>g.fillText(line,92,285+i*size*1.2,950));
 g.fillStyle="#c5dbff";g.font="650 41px system-ui";
 let subtitle=$("episodeTitle").value.trim()||"Giọng nói · Ý tưởng · Góc nhìn";
 const subLines=wordWrap(subtitle,910);
 subLines.slice(0,3).forEach((line,i)=>g.fillText(line,95,935+i*52,910));
 g.fillStyle="#a5b4fc";g.fillRect(94,862,520,8);
 g.fillStyle="#dbeafe";g.font="650 24px system-ui";g.fillText($("hostName").value.trim()||"BLOGNAVER STUDIO",95,1115);
}
async function init(){
 try{state.db=await dbOpen();}catch(e){toast("Không mở được IndexedDB: "+e.message+". Có thể chỉnh tạm nhưng không lưu lâu dài.",true)}
 try{
  if(state.db){
   const saved=await dbRead("projects","active");
   const rows=await dbAll("media");
   for(const entry of rows){
    try{
     if(entry.id==="cover")continue;
     const buffer=await decode(entry.blob);
     state.assets.set(entry.id,{id:entry.id,name:entry.name,blob:entry.blob,duration:buffer.duration,buffer,peaks:A.makePeaks(buffer)});
    }catch(e){toast("Không khôi phục được audio "+entry.name+": "+e.message,true)}
   }
   if(saved){
    for(const id of metaFields){if(saved.meta?.[id]!=null)$(id).value=saved.meta[id]}
    state.tracks={...A.tracksDefault(),...saved.tracks};
    state.clips=(saved.clips||[]).filter(c=>state.assets.has(c.assetId));
    state.coverBlob=saved.coverBlob||null;
    for(const [id,val] of Object.entries(saved.settings||{})){
     if(!$(id))continue;if($(id).type==="checkbox")$(id).checked=Boolean(val);
     else if(id==="master")$(id).value=Number(val)*100;
    }
    toast("Đã phục hồi dự án podcast gần nhất trên thiết bị.");
   }
  }
 }catch(e){toast("Phục hồi dự án lỗi: "+e.message,true)}
 state.loaded=true;state.history=[snapshot()];state.historyIndex=0;
 updateTextStats();$("masterValue").textContent=$("master").value+"%";
 renderAll();drawCover();historyButtons();
 mark(state.db?"✓ Sẵn sàng · tự lưu IndexedDB":"⚠ Chế độ tạm · IndexedDB không khả dụng");
}
function updateTextStats(){
 $("scriptCount").textContent=$("script").value.trim().split(/\s+/).filter(Boolean).length.toLocaleString("vi-VN")+" từ";
}
async function devices(){
 if(!navigator.mediaDevices?.enumerateDevices){toast("Trình duyệt không hỗ trợ liệt kê microphone.",true);return}
 try{
  const list=await navigator.mediaDevices.enumerateDevices(),box=$("micDevice"),before=box.value;
  box.replaceChildren();const def=document.createElement("option");def.value="";def.textContent="Micro mặc định";box.append(def);
  list.filter(x=>x.kind==="audioinput").forEach((d,i)=>{
   const o=document.createElement("option");o.value=d.deviceId;o.textContent=d.label||"Micro "+(i+1);box.append(o);
  });box.value=[...box.options].some(x=>x.value===before)?before:"";
 }catch(e){toast("Không liệt kê được microphone: "+e.message,true)}
}
async function startRecord(){
 if(state.recording||state.rendering)return;
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
  toast("Cần HTTPS và trình duyệt hỗ trợ microphone/MediaRecorder.",true);return;
 }
 let stream,monitor,ctx;
 try{
  const requested=$("micDevice").value;
  const constraints={audio:{echoCancellation:$("noiseSuppression").checked,noiseSuppression:$("noiseSuppression").checked,autoGainControl:false,
    ...(requested?{deviceId:{ideal:requested}}:{})}};
  stream=await navigator.mediaDevices.getUserMedia(constraints);
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x));
  const recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:128000}:undefined);
  const chunks=[];recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  monitor=ctx.createAnalyser();monitor.fftSize=1024;
  ctx.createMediaStreamSource(stream).connect(monitor);
  state.recording={stream,ctx,monitor,recorder,chunks,started:performance.now(),
   name:$("takeName").value.trim()||"Podcast take",track:$("recordTrack").value};
  recorder.onerror=e=>toast("Lỗi ghi âm: "+(e.error?.message||"unknown"),true);
  recorder.onstop=async()=>{
   const rec=state.recording;state.recording=null;
   cancelAnimationFrame(state.meterRaf);rec.stream.getTracks().forEach(t=>t.stop());await rec.ctx.close().catch(()=>{});
   $("recCircle").classList.remove("active");$("startRecord").disabled=false;$("stopRecord").disabled=true;
   try{
    const blob=new Blob(chunks,{type:rec.recorder.mimeType||"audio/webm"});
    if(!blob.size)throw Error("Bản ghi rỗng.");
    const ext=/mp4/.test(blob.type)?"m4a":/ogg/.test(blob.type)?"ogg":"webm";
    await addAsset(blob,rec.name+"."+ext,rec.track);
    $("recordStatus").textContent="Đã lưu bản ghi vào dự án · "+(blob.size/1048576).toFixed(1)+" MB";
    $("takeName").value="Host · Take "+String(state.assets.size+1).padStart(2,"0");
    await devices();
   }catch(e){$("recordStatus").textContent="Ghi âm lỗi: "+e.message;toast(e.message,true)}
  };
  recorder.start(1000);$("startRecord").disabled=true;$("stopRecord").disabled=false;
  $("recCircle").classList.add("active");$("recordStatus").textContent="● Đang thu trên máy bạn";
  const drawMeter=()=>{
   if(!state.recording)return;
   $("recordClock").textContent=fmt((performance.now()-state.recording.started)/1000);
   const canvas=$("inputMeter"),g=canvas.getContext("2d"),data=new Uint8Array(monitor.fftSize);
   monitor.getByteTimeDomainData(data);g.clearRect(0,0,canvas.width,canvas.height);
   g.strokeStyle="#34d399";g.lineWidth=2;g.beginPath();
   data.forEach((b,i)=>{const x=(i/data.length)*canvas.width,y=(b/255)*canvas.height;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke();
   state.meterRaf=requestAnimationFrame(drawMeter);
  };drawMeter();
  await devices();
 }catch(e){
  stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});
  toast("Không thể ghi âm: "+e.message,true);
 }
}
function stopRecord(){
 if(!state.recording)return;
 const rec=state.recording;
 if(rec.recorder.state!=="inactive")rec.recorder.stop();
 $("recordStatus").textContent="Đang xử lý bản thu...";
 $("stopRecord").disabled=true;
}
async function exportWav(){
 if(state.rendering)return;
 if(!state.clips.length){toast("Timeline chưa có audio để xuất.",true);return}
 stopAudio();state.rendering=true;state.cancelRender=false;
 $("renderWav").disabled=true;$("cancelWav").disabled=false;
 $("exportProgress").style.width="0%";$("exportStatus").textContent="Đang khởi tạo Web Audio Offline...";
 try{
  const file=await A.renderWAV({assets:state.assets,clips:state.clips,tracks:state.tracks,
    settings:settings(),sampleRate:Number($("sampleRate").value),
    cancelled:()=>state.cancelRender,
    onProgress:percent=>{$("exportProgress").style.width=percent+"%";$("exportStatus").textContent="Đang mix và encode WAV · "+percent+"%"}
  });
  tinyFile(file,slug($("episodeTitle").value||"blognaver-podcast")+".wav");
  $("exportStatus").textContent="✓ Đã render WAV stereo PCM 16-bit · "+(file.size/1048576).toFixed(1)+" MB. Kiểm tra file trong thư mục Tải xuống.";
  toast("Đã xuất WAV Master thành công! Hãy nghe kiểm tra trước khi phát hành.");
 }catch(error){$("exportStatus").textContent="⚠ "+error.message;toast(error.message,true)}
 finally{state.rendering=false;$("renderWav").disabled=false;$("cancelWav").disabled=true}
}
function wire(){
 for(const b of document.querySelectorAll("[data-step]"))b.onclick=()=>setStep(b.dataset.step);
 for(const b of document.querySelectorAll("[data-go]"))b.onclick=()=>setStep(b.dataset.go);
 $("save").onclick=()=>saveProject(true);
 $("undo").onclick=()=>historyMove(-1);$("redo").onclick=()=>historyMove(1);
 $("openExport").onclick=()=>setStep("release");
 for(const id of metaFields){
  $(id).addEventListener("input",()=>{if(id==="script")updateTextStats();if(["showTitle","episodeTitle","hostName"].includes(id))drawCover();dirty()});
  $(id).addEventListener("change",dirty);
 }
 $("scriptTemplate").onclick=()=>{
  if($("script").value.trim()&&!confirm("Thêm khung kịch bản vào cuối nội dung hiện tại?"))return;
  $("script").value+=($("script").value?"\n\n":"")+"[HOOK / MỞ ĐẦU]\nMột câu hỏi khiến người nghe tò mò.\n\n[BỐI CẢNH]\nNhững thông tin đã được kiểm chứng.\n\n[PHẦN 1]\nLuận điểm chính và ví dụ thực tế.\n\n[PHẦN 2]\nGóc nhìn ngược, dữ kiện, caveat.\n\n[KẾT LUẬN / CTA]\nTóm tắt, câu hỏi cho khán giả và lời chào tự nhiên.";
  updateTextStats();dirty();toast("Đã chèn khung script để biên tập.");
 };
 $("copyScript").onclick=async()=>{try{await navigator.clipboard.writeText($("script").value);toast("Đã sao chép kịch bản.")}catch{toast("Không thể truy cập clipboard.",true)}};
 $("downloadScript").onclick=()=>txtFile($("script").value,slug($("episodeTitle").value||"podcast")+"-script.txt");
 for(const id of ["audioFiles","audioFiles2"])$(id).onchange=async e=>{await importFiles([...e.target.files]);e.target.value=""};
 const dz=$("dropzone");
 for(const event of ["dragover","dragenter"])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.add("dragover")});
 for(const event of ["dragleave","drop"])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.remove("dragover")});
 dz.addEventListener("drop",e=>{importFiles([...e.dataTransfer.files].filter(f=>f.type.startsWith("audio/")||/\.(wav|mp3|m4a|ogg|webm)$/i.test(f.name)))});
 $("refreshDevices").onclick=devices;$("startRecord").onclick=startRecord;$("stopRecord").onclick=stopRecord;
 $("play").onclick=play;$("stop").onclick=()=>stopAudio(true);
 $("scrubber").oninput=e=>seek(e.target.value);
 $("playRate").onchange=e=>{state.playbackRate=Number(e.target.value);restartAudio()};
 $("timelineZoom").onchange=e=>{state.zoom=Number(e.target.value);renderTimeline()};
 $("timelineFrame").onscroll=renderPlayhead;
 $("split").onclick=splitClip;$("deleteClip").onclick=deleteClip;$("duplicateClip").onclick=duplicateClip;
 $("trimSilence").onclick=trimSilence;$("applyClip").onclick=applyInspector;
 $("master").oninput=()=>{$("masterValue").textContent=$("master").value+"%";dirty();if(state.playing)restartAudio()};
 for(const id of ["highpass","compressor","normalize"])$(id).onchange=()=>{dirty();if(state.playing)restartAudio()};
 $("downloadNotes").onclick=()=>txtFile(notes(),slug($("episodeTitle").value||"podcast")+"-show-notes.txt");
 $("downloadMetadata").onclick=()=>txtFile(JSON.stringify(metadata(),null,2),slug($("episodeTitle").value||"podcast")+"-metadata.json","application/json");
 $("backupProject").onclick=()=>txtFile(JSON.stringify({version:1,note:"Metadata only; keep your original media files.",meta:currentMeta(),clips:state.clips,tracks:state.tracks,settings:settings(),
  assets:[...state.assets.values()].map(a=>({id:a.id,name:a.name,duration:a.duration}))},null,2),
  slug($("episodeTitle").value||"podcast")+"-project.json","application/json");
 $("renderWav").onclick=exportWav;$("cancelWav").onclick=()=>{state.cancelRender=true;$("exportStatus").textContent="Đang hủy khi chunk hiện tại kết thúc..."};
 $("downloadCover").onclick=()=>$("cover").toBlob(blob=>{if(blob)tinyFile(blob,slug($("showTitle").value||"podcast")+"-cover.png")},"image/png");
 $("coverFile").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>12*1024*1024){toast("Ảnh cover tối đa 12 MB.",true);return}
  state.coverBlob=file;await drawCover();dirty();toast("Đã áp dụng cover tùy chỉnh.");
 };
 document.addEventListener("keydown",event=>{
  const tag=document.activeElement?.tagName,editing=["INPUT","SELECT","TEXTAREA"].includes(tag);
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="z"){event.preventDefault();historyMove(event.shiftKey?1:-1)}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="y"){event.preventDefault();historyMove(1)}
  if(event.code==="Space"&&!editing&&!state.recording){event.preventDefault();play()}
  if(event.key==="Escape"&&state.playing)stopAudio();
 });
 window.addEventListener("pagehide",()=>{stopAudio();if(state.recording)stopRecord();state.ctx?.close().catch(()=>{})});
 window.addEventListener("resize",()=>{if(document.querySelector('[data-panel="edit"]').classList.contains("active"))renderTimeline()});
}
wire();init();
})();
