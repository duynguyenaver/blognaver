/* BlogNaver YouTube Clip Maker Lab — local Canvas + Web Audio + MediaRecorder.
 * No backend or upload. Recording runs at realtime media duration.
 */
(() => {
 "use strict";
 const $ = id => document.getElementById(id);
 const ui = {};
 for (const id of ["canvas","emptyCanvas","imageFiles","imageDrop","importCover","assets","voiceFile","bgmFile",
  "voiceInfo","bgmInfo","voiceElement","bgmElement","aspect","fps","quality","resolutionLabel","play","pause",
  "restart","fullscreen","scrubber","clock","export","cancelExport","download","progressFill","progressPct",
  "exportStatus","zoom","zoomValue","fit","kenBurns","transition","filter","voiceVol","voiceVolValue",
  "bgmVol","bgmVolValue","brightness","brightnessValue","contrast","contrastValue","saturation","saturationValue","ducking","waveform","script","showSubs","generateSubs","fontSize","fontSizeValue",
  "stillDuration","timelineHint","durationLabel","visualTrack","voiceTrack","bgmTrack","subtitleTrack"]) {
   ui[id] = $(id);
 }
 const canvas=ui.canvas,ctx=canvas.getContext("2d",{alpha:false});
 const voice=ui.voiceElement,bgm=ui.bgmElement;
 let assets=[],voiceURL=null,bgmURL=null,outputURL=null,cues=[],manualCueTiming=false,duration=10,position=0,playing=false,
     exporting=false,exportAbort=false,frame=0,origin=0,playBase=0,selectedAsset=null,activeVideo=null;
 let audioCtx=null,audioDest=null,voiceGain=null,bgmGain=null,voiceAnalyser=null;
 let recorder=null,capture=null,recordedChunks=[];
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const fmt=t=>{const s=Math.floor(Math.max(0,t)),m=Math.floor(s/60);return String(m).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
 const report=(text,bad=false)=>{ui.exportStatus.textContent=text;ui.exportStatus.style.color=bad?"#fca5a5":""};
 const progress=p=>{const n=clamp(Math.round(p),0,100);ui.progressFill.style.width=n+"%";ui.progressPct.textContent=n+"%"};
 const revoke=u=>{if(u)URL.revokeObjectURL(u)};
 const userURL=blob=>URL.createObjectURL(blob);
 const isImage=a=>a&&a.type==="image";
 const filterMap={none:"none",cinema:"contrast(1.15) saturate(.82) brightness(.91)",warm:"sepia(.16) saturate(1.16) brightness(1.03)",mono:"grayscale(1) contrast(1.12)"};
 function dimensions(){
   const hd=ui.quality.value==="1080",portrait=ui.aspect.value==="portrait";
   return portrait?(hd?[1080,1920]:[720,1280]):(hd?[1920,1080]:[1280,720]);
 }
 function sizeCanvas(){
   const [w,h]=dimensions();canvas.width=w;canvas.height=h;
   ui.resolutionLabel.textContent=w+" × "+h;
   draw(position);
 }
 function syncDuration(){
   const voiceLen=Number(voice.duration);
   const totalVideo=assets.reduce((a,x)=>a+(x.type==="video"&&Number.isFinite(x.duration)?x.duration:0),0);
   const base=clamp(Number(ui.stillDuration.value)||10,3,300);
   duration=Number.isFinite(voiceLen)&&voiceLen>0?voiceLen:(totalVideo>0?totalVideo:base);
   duration=Math.max(.2,duration);
   ui.scrubber.max=String(duration);
   ui.clock.textContent=fmt(position)+" / "+fmt(duration);
   ui.durationLabel.textContent=fmt(duration);
   ui.timelineHint.textContent=voiceLen>0&&Number.isFinite(voiceLen)
     ?"Auto-Fit: video khớp "+duration.toFixed(1)+" giây voiceover."
     :"Chưa có voiceover: dùng thời lượng video nền hoặc thời lượng ảnh mặc định.";
   if(ui.script.value.trim()&&!manualCueTiming)createCues(false);
   refreshTimeline();
   window.BNClipMakerPro?.onAssetsChanged?.();
 }
 function imgLoad(asset){
   return new Promise((resolve,reject)=>{
     const image=new Image();image.onload=()=>{asset.media=image;resolve(asset)};image.onerror=()=>reject(Error("Không giải mã được ảnh "+asset.name));image.src=asset.url;
   });
 }
 function videoLoad(asset){
   return new Promise((resolve,reject)=>{
     const v=document.createElement("video");v.src=asset.url;v.preload="auto";v.muted=true;v.playsInline=true;v.loop=false;
     const timer=setTimeout(()=>reject(Error("Không tải metadata video "+asset.name)),18000);
     v.onloadedmetadata=()=>{clearTimeout(timer);asset.media=v;asset.duration=Number.isFinite(v.duration)?v.duration:0;resolve(asset)};
     v.onerror=()=>{clearTimeout(timer);reject(Error("Không đọc được video "+asset.name))};
     v.load();
   });
 }
 async function addAsset(blob,name){
   if(assets.length>=40)throw Error("Tối đa 40 ảnh/video trên timeline.");
   const type=blob.type.startsWith("image/")?"image":blob.type.startsWith("video/")?"video":"";
   if(!type)throw Error("Chỉ hỗ trợ ảnh JPG/PNG/WebP hoặc video MP4/WebM.");
   if(blob.size>200*1024*1024)throw Error("Một asset không vượt quá 200 MB.");
   const asset={id:crypto.randomUUID(),name:name||"Cover BlogNaver",blob,type,url:userURL(blob),media:null,duration:0};
   try{await (type==="image"?imgLoad(asset):videoLoad(asset))}catch(e){revoke(asset.url);throw e}
   assets.push(asset);
   window.BNClipMakerPro?.onAssetsChanged?.();
   ui.emptyCanvas.classList.add("hidden");
   position=0;draw(position);renderAssets();syncDuration();
 }
 async function addFiles(files){
   if(exporting)return;
   for(const file of files){
     try{await addAsset(file,file.name)}catch(e){report(e.message,true)}
   }
 }
 ui.imageFiles.addEventListener("change",async()=>{await addFiles([...ui.imageFiles.files]);ui.imageFiles.value=""});
 for(const event of ["dragenter","dragover"]){ui.imageDrop.addEventListener(event,e=>{e.preventDefault();ui.imageDrop.classList.add("hover")})}
 for(const event of ["dragleave","drop"]){ui.imageDrop.addEventListener(event,e=>{e.preventDefault();ui.imageDrop.classList.remove("hover")})}
 ui.imageDrop.addEventListener("drop",async e=>{await addFiles([...e.dataTransfer.files])});
 ui.importCover.addEventListener("click",async()=>{
   ui.importCover.disabled=true;
   try{
     const db=await new Promise((ok,no)=>{const req=indexedDB.open("bn_visual_studio_v1",1);req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});
     const records=await new Promise((ok,no)=>{const req=db.transaction("images","readonly").objectStore("images").getAll();req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)});
     db.close();
     const latest=records.filter(x=>x.blob instanceof Blob)
       .sort((a,b)=>(b.kind==="cover")-(a.kind==="cover")||Number(b.at||0)-Number(a.at||0))[0];
     if(!latest)throw Error("Gallery chưa có ảnh lưu trên thiết bị. Hãy mở Thumbnail Generator tạo Cover hoặc upload PNG.");
     await addAsset(latest.blob,(latest.title||"BlogNaver Cover")+".png");
     report("Đã lấy ảnh từ Thumbnail Generator Gallery.");
   }catch(e){report("Nhập Cover: "+e.message,true)}
   finally{ui.importCover.disabled=false}
 });
 function renderAssets(){
   ui.assets.replaceChildren();
   assets.forEach((asset,index)=>{
     const card=document.createElement("div");card.className="asset";card.draggable=true;
     const thumb=document.createElement(asset.type==="video"?"video":"img");
     thumb.src=asset.url;if(asset.type==="video"){thumb.muted=true;thumb.preload="metadata"}else thumb.alt=asset.name;
     const title=document.createElement("strong");title.textContent=asset.name;title.title=asset.name;
     const actions=document.createElement("div");actions.className="order";
     for(const [label,delta] of [["↑",-1],["↓",1]]){
       const btn=document.createElement("button");btn.type="button";btn.textContent=label;btn.title="Đổi vị trí";
       btn.disabled=exporting || index+delta<0 || index+delta>=assets.length;
       btn.onclick=()=>moveAsset(index,index+delta);actions.append(btn);
     }
     const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.title="Xóa";
     remove.disabled=exporting;remove.onclick=()=>removeAsset(index);actions.append(remove);
     card.append(thumb,title,actions);
     window.BNClipMakerPro?.decorateAssetCard?.(card,asset);
     card.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",String(index)));
     card.addEventListener("dragover",e=>e.preventDefault());
     card.addEventListener("drop",e=>{e.preventDefault();const from=Number(e.dataTransfer.getData("text/plain"));if(Number.isInteger(from))moveAsset(from,index)});
     ui.assets.append(card);
   });
 }
 function moveAsset(from,to){
   if(exporting||from<0||to<0||from>=assets.length||to>=assets.length)return;
   assets.splice(to,0,assets.splice(from,1)[0]);position=0;draw(0);renderAssets();refreshTimeline();
   window.BNClipMakerPro?.onAssetsChanged?.();
 }
 function removeAsset(index){
   if(exporting)return;
   const [a]=assets.splice(index,1);if(!a)return;
   window.BNClipMakerPro?.onRemoveAsset?.(a);
   if(a.media?.pause)a.media.pause();
   if(a.type==="image"&&a.media)a.media.src="";
   revoke(a.url);
   if(!assets.length)ui.emptyCanvas.classList.remove("hidden");
   position=0;renderAssets();syncDuration();draw(0);
 }
 async function acceptAudio(file,kind){
   if(!file||exporting)return;
   if(!file.type.startsWith("audio/")&&!/\.(wav|mp3|m4a)$/i.test(file.name)){report("Chỉ nhận WAV, MP3 hoặc M4A.",true);return}
   const el=kind==="voice"?voice:bgm;
   const url=userURL(file),old=kind==="voice"?voiceURL:bgmURL;
   el.pause();el.src=url;el.load();
   try{
     await new Promise((ok,no)=>{
       const t=setTimeout(()=>no(Error("Không đọc được metadata âm thanh.")),16000);
       const ready=()=>{clearTimeout(t);el.removeEventListener("error",fail);ok()};
       const fail=()=>{clearTimeout(t);el.removeEventListener("loadedmetadata",ready);no(Error("File âm thanh lỗi hoặc codec không được hỗ trợ."))};
       el.addEventListener("loadedmetadata",ready,{once:true});
       el.addEventListener("error",fail,{once:true});
       if(el.readyState>=1){clearTimeout(t);ok()}
     });
   }catch(e){el.removeAttribute("src");el.load();revoke(url);report(e.message,true);return}
   revoke(old);
   if(kind==="voice"){voiceURL=url;ui.voiceInfo.textContent=file.name+" · "+fmt(el.duration);position=0}
   else{bgmURL=url;ui.bgmInfo.textContent=file.name+" · "+fmt(el.duration)}
   syncDuration();draw(position);report("Đã nhập "+file.name);
 }
 ui.voiceFile.addEventListener("change",()=>{acceptAudio(ui.voiceFile.files?.[0],"voice");ui.voiceFile.value=""});
 ui.bgmFile.addEventListener("change",()=>{acceptAudio(ui.bgmFile.files?.[0],"bgm");ui.bgmFile.value=""});
 function makeCueLines(input){
   const tokens=input.replace(/\r\n?/g,"\n").split(/\n+/).map(x=>x.trim()).filter(Boolean);
   const sentences=[];
   for(const paragraph of tokens){
     const matches=paragraph.match(/[^.!?…]+(?:[.!?…]+|$)/gu)||[paragraph];
     for(const piece of matches){
       const words=piece.trim().split(/\s+/).filter(Boolean);
       for(let i=0;i<words.length;i+=8){
         const text=words.slice(i,i+8).join(" ");
         if(text)sentences.push(text);
       }
     }
   }
   return sentences.slice(0,1200);
 }
 function createCues(showMessage=true){
   manualCueTiming=false;
   const chunks=makeCueLines(ui.script.value);
   cues=[];if(chunks.length){
     const weights=chunks.map(x=>Math.max(1,x.trim().split(/\s+/).length));
     const sum=weights.reduce((a,b)=>a+b,0);let t=0;
     chunks.forEach((text,i)=>{const end=i===chunks.length-1?duration:t+duration*weights[i]/sum;cues.push({start:t,end,text});t=end});
   }
   refreshTimeline();
   if(showMessage)report(cues.length?"Đã chia "+cues.length+" đoạn phụ đề, thời điểm chỉ là ước lượng.":"Chưa có kịch bản để tạo phụ đề.",!cues.length);
 }
 ui.generateSubs.addEventListener("click",()=>createCues(true));
 function refreshTimeline(){
   ui.visualTrack.replaceChildren();
   if(!assets.length)ui.visualTrack.textContent="Thêm ảnh / video nền.";
   else assets.forEach((asset,i)=>{
     const x=document.createElement("div");x.className="clip";x.style.flexGrow="1";
     x.title=asset.name+" · "+(duration/assets.length).toFixed(1)+" giây";
     const t=document.createElement("span");t.textContent=String(i+1)+". "+asset.name;x.append(t);
     x.onclick=()=>seek(i*duration/assets.length);ui.visualTrack.append(x);
   });
   ui.voiceTrack.textContent=voiceURL?"🎙 Voiceover · "+fmt(duration)+" · Auto-Fit":"🎙 Voiceover · Chưa có WAV/MP3";
   ui.bgmTrack.textContent=bgmURL?"♫ BGM · lặp theo timeline":"♫ BGM · Chưa có nhạc nền";
   ui.subtitleTrack.replaceChildren();
   if(!cues.length)ui.subtitleTrack.textContent="Dán kịch bản và tạo phụ đề.";
   else {let cursor=0;
   for(const c of cues){
     if(c.start>cursor){const space=document.createElement("span");space.className="subtitle-gap";space.style.flex=""+(c.start-cursor)+" 1 0";ui.subtitleTrack.append(space)}
     const clip=document.createElement("div");clip.className="clip subs-clip";clip.style.flexGrow=String(Math.max(.1,c.end-c.start));
     const span=document.createElement("span");span.textContent=c.text;clip.title=fmt(c.start)+"–"+fmt(c.end)+": "+c.text;clip.append(span);
     clip.onclick=()=>seek(c.start);ui.subtitleTrack.append(clip);
     cursor=Math.max(cursor,c.end);
   }
   if(duration>cursor){const tail=document.createElement("span");tail.className="subtitle-gap";tail.style.flex=""+(duration-cursor)+" 1 0";ui.subtitleTrack.append(tail)}
   }
 }
 function currentSlide(t){
   const unit=duration/Math.max(assets.length,1);
   const index=clamp(Math.floor(t/Math.max(unit,.001)),0,assets.length-1);
   return {index,local:clamp((t-index*unit)/unit,0,1),elapsed:t-index*unit,unit};
 }
 function drawAsset(asset,local,opacity=1){
   if(!asset?.media)return;
   const media=asset.media;
   const width=asset.type==="image"?media.naturalWidth:media.videoWidth, height=asset.type==="image"?media.naturalHeight:media.videoHeight;
   if(!width||!height||asset.type==="video"&&media.readyState<2)return;
   const w=canvas.width,h=canvas.height;
   const fill=ui.fit.value==="cover";
   const ratio=fill?Math.max(w/width,h/height):Math.min(w/width,h/height);
   const zoom=Number(ui.zoom.value);
   const ken=ui.kenBurns.value;
   const dynamic=ken==="in"?1+local*.11:ken==="out"?1.11-local*.11:1;
   const scale=ratio*zoom*dynamic;
   const dw=width*scale,dh=height*scale;
   const offset=ken==="off"?0:(local-.5)*Math.min(w,h)*.025;
   ctx.save();ctx.globalAlpha=opacity;
   ctx.filter=(filterMap[ui.filter.value]==="none"?"":(filterMap[ui.filter.value]||"")+" ") +
     "brightness("+Number(ui.brightness.value)+"%) contrast("+Number(ui.contrast.value)+"%) saturate("+Number(ui.saturation.value)+"%)";
   ctx.drawImage(media,(w-dw)/2+offset,(h-dh)/2-offset*.55,dw,dh);
   ctx.restore();
 }
 function frameVideo(asset,local,unit){
   if(asset?.type!=="video")return;
   const video=asset.media;
   if(video.readyState<2)return;
   const target=clamp(local*unit,0,Math.max(0,(video.duration||unit)-.08));
   if(!Number.isFinite(video.duration))return;
   if(Math.abs(video.currentTime-target)>.33){
     try{video.currentTime=target}catch{}
   }
 }
 function waveformDraw(){
   if(!ui.waveform.checked||!voiceURL||!voiceAnalyser)return;
   const arr=new Uint8Array(voiceAnalyser.frequencyBinCount);
   voiceAnalyser.getByteFrequencyData(arr);
   const bins=42,w=canvas.width,h=canvas.height;
   const barW=Math.max(5,w*.006),gap=barW*.7;
   const start=(w-bins*(barW+gap))/2;
   ctx.save();
   ctx.fillStyle="#38bdf8cc";
   for(let i=0;i<bins;i++){
     const v=arr[Math.min(arr.length-1,Math.floor(i*arr.length/(bins*2)))];
     const amplitude=Math.max(5,(v/255)*h*.085);
     ctx.fillRect(start+i*(barW+gap),h*.78-amplitude/2,barW,amplitude);
   }
   ctx.restore();
 }
 function wrapText(text,maxWidth){
   const words=text.split(/\s+/),lines=[];let line="";
   for(const word of words){
     const candidate=line?line+" "+word:word;
     if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word}
     else line=candidate;
   }if(line)lines.push(line);
   return lines.slice(0,3);
 }
 function drawSubtitles(t){
   if(!ui.showSubs.checked||!cues.length)return;
   const cue=cues.find(x=>t>=x.start&&t<x.end);if(!cue)return;
   const w=canvas.width,h=canvas.height,fontSize=Number(ui.fontSize.value)*(ui.aspect.value==="portrait"?w/1080:w/1920);
   ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="800 "+Math.max(18,fontSize)+"px system-ui, sans-serif";
   const lines=wrapText(cue.text,w*.82);
   const gap=fontSize*1.18;
   const base=h*.88-(lines.length-1)*gap;
   lines.forEach((line,i)=>{
     const x=w/2,y=base+i*gap;
     ctx.lineJoin="round";ctx.lineWidth=Math.max(3,fontSize*.13);ctx.strokeStyle="#020617";
     ctx.strokeText(line,x,y);ctx.fillStyle="#fff";ctx.fillText(line,x,y);
   });ctx.restore();
 }
 function draw(t){
   const w=canvas.width,h=canvas.height;
   ctx.fillStyle="#050916";ctx.fillRect(0,0,w,h);
   if(assets.length){
     const slide=currentSlide(t),a=assets[slide.index];
     if(a.type==="video")frameVideo(a,slide.elapsed,slide.unit);
     const fade=ui.transition.value==="fade"&&slide.index>0&&slide.elapsed<Math.min(.45,slide.unit*.2);
     if(fade){
       const previous=assets[slide.index-1];
       drawAsset(previous,1,1);
       drawAsset(a,slide.local,clamp(slide.elapsed/.45,0,1));
     }else drawAsset(a,slide.local);
     // Toggle active background video decoding/playback only for current slide.
     if(activeVideo!==a){
       if(activeVideo?.type==="video")activeVideo.media.pause();
       activeVideo=a;
       if(playing&&a.type==="video"&&a.media.paused)a.media.play().catch(()=>{});
     }
   }
   waveformDraw();drawSubtitles(t);
 }
 function labelSettings(){
   ui.zoomValue.textContent=Number(ui.zoom.value).toFixed(2)+"×";
   ui.voiceVolValue.textContent=Math.round(Number(ui.voiceVol.value)*100)+"%";
   ui.bgmVolValue.textContent=Math.round(Number(ui.bgmVol.value)*100)+"%";
   ui.fontSizeValue.textContent=ui.fontSize.value;
   for(const id of ["brightness","contrast","saturation"])ui[id+"Value"].textContent=ui[id].value+"%";
 }
 function ensureAudioGraph(){
   if(audioCtx)return audioCtx.resume();
   const AudioContext=window.AudioContext||window.webkitAudioContext;
   if(!AudioContext)throw Error("Trình duyệt không hỗ trợ Web Audio.");
   audioCtx=new AudioContext();
   audioDest=audioCtx.createMediaStreamDestination();
   const voiceSource=audioCtx.createMediaElementSource(voice);
   const bgmSource=audioCtx.createMediaElementSource(bgm);
   voiceGain=audioCtx.createGain();bgmGain=audioCtx.createGain();voiceAnalyser=audioCtx.createAnalyser();
   voiceAnalyser.fftSize=2048;
   voiceSource.connect(voiceAnalyser);voiceAnalyser.connect(voiceGain);
   voiceGain.connect(audioDest);voiceGain.connect(audioCtx.destination);
   bgmSource.connect(bgmGain);bgmGain.connect(audioDest);bgmGain.connect(audioCtx.destination);
   window.BNClipMakerPro?.connect?.(audioCtx,audioDest);
   setMixer();return audioCtx.resume();
 }
 function setMixer(){
   if(!audioCtx)return;
   const level=Number(ui.voiceVol.value),music=Number(ui.bgmVol.value);
   voiceGain.gain.setTargetAtTime(level,audioCtx.currentTime,.025);
   let target=music;
   if(ui.ducking.checked&&voiceURL&&playing){
     const array=new Uint8Array(voiceAnalyser.fftSize);
     voiceAnalyser.getByteTimeDomainData(array);
     let sum=0;for(const v of array){const n=(v-128)/128;sum+=n*n}
     const rms=Math.sqrt(sum/array.length);
     if(rms>.016)target=music*.23;
   }
   bgmGain.gain.setTargetAtTime(target,audioCtx.currentTime,.12);
 }
 function seek(t){
   const target=clamp(Number(t)||0,0,duration);
   position=target;
   if(voiceURL)try{voice.currentTime=Math.min(target,Math.max(0,voice.duration-.03))}catch{}
   if(bgmURL&&Number.isFinite(bgm.duration)&&bgm.duration>0)
     try{bgm.currentTime=target%bgm.duration}catch{}
   if(playing&&!voiceURL){playBase=target;origin=performance.now()}
   ui.scrubber.value=target;ui.clock.textContent=fmt(target)+" / "+fmt(duration);draw(target);
   window.BNClipMakerPro?.sync?.(target,playing);
 }
 function stopLoop(){if(frame)cancelAnimationFrame(frame);frame=0;playing=false;voice.pause();bgm.pause();if(activeVideo?.type==="video")activeVideo.media.pause();window.BNClipMakerPro?.stop?.()}
 function tick(){
   if(!playing)return;
   if(voiceURL)position=clamp(voice.currentTime,0,duration);
   else position=clamp(playBase+(performance.now()-origin)/1000,0,duration);
   if(audioCtx)setMixer();
   window.BNClipMakerPro?.sync?.(position,true);
   draw(position);
   ui.scrubber.value=position;
   ui.clock.textContent=fmt(position)+" / "+fmt(duration);
   if(exporting){progress(95*position/duration);report("Đang render theo thời gian thực · "+fmt(position)+" / "+fmt(duration))}
   if(position>=duration-.025){completePlayback();return}
   frame=requestAnimationFrame(tick);
 }
 async function startPlayback(fromStart=false){
   if(playing)return;
   if(!assets.length){report("Hãy nhập ít nhất một ảnh hoặc video nền.",true);return}
   if(fromStart||position>=duration-.1)seek(0);
   try{
     if(voiceURL||bgmURL||window.BNClipMakerPro?.hasAudio?.())await ensureAudioGraph();
     if(voiceURL){await voice.play()}
     if(bgmURL){await bgm.play()}
     playing=true;ui.play.disabled=true;ui.pause.disabled=exporting;
     window.BNClipMakerPro?.sync?.(position,true);
     playBase=position;origin=performance.now();
     if(activeVideo?.type==="video")activeVideo.media.play().catch(()=>{});
     frame=requestAnimationFrame(tick);
   }catch(e){stopLoop();ui.play.disabled=false;ui.pause.disabled=true;throw e}
 }
 function pausePlayback(){
   if(!playing)return;
   stopLoop();ui.play.disabled=false;ui.pause.disabled=true;
   report("Đã tạm dừng ở "+fmt(position)+".");
 }
 function completePlayback(){
   stopLoop();ui.play.disabled=false;ui.pause.disabled=true;
   position=duration;draw(position);ui.scrubber.value=duration;ui.clock.textContent=fmt(duration)+" / "+fmt(duration);
   if(exporting&&recorder?.state==="recording")recorder.stop();
 }
 voice.addEventListener("ended",()=>{if(playing)completePlayback()});
 ui.play.addEventListener("click",()=>startPlayback().catch(e=>report("Không phát được: "+e.message,true)));
 ui.pause.addEventListener("click",()=>{if(!exporting)pausePlayback()});
 ui.restart.addEventListener("click",()=>{if(exporting)return;seek(0)});
 ui.scrubber.addEventListener("input",()=>{if(!exporting)seek(ui.scrubber.value)});
 ui.fullscreen.addEventListener("click",()=>{const el=canvas.parentElement;if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.()});
 for(const id of ["aspect","quality"]){ui[id].addEventListener("change",()=>{if(exporting)return;sizeCanvas();draw(position)})}
 for(const id of ["zoom","fit","kenBurns","transition","filter","brightness","contrast","saturation","waveform","showSubs","fontSize"]){
   ui[id].addEventListener("input",()=>{labelSettings();if(!playing)draw(position)});
 }
 for(const id of ["voiceVol","bgmVol","ducking"]){ui[id].addEventListener("input",()=>{labelSettings();setMixer()})}
 ui.stillDuration.addEventListener("input",()=>{if(!exporting)syncDuration()});
 ui.script.addEventListener("input",()=>{manualCueTiming=false;cues=[];refreshTimeline()});
 function chooseMime(){
   const withAudio=!window.BNClipMakerPro?.isSilentExport?.() && Boolean(voiceURL||bgmURL||window.BNClipMakerPro?.hasAudio?.());
   const types=withAudio?["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4",
     "video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]:
     ["video/mp4;codecs=avc1.42E01E","video/mp4",
     "video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
   return types.find(x=>MediaRecorder.isTypeSupported(x))||null;
 }
 function setExportLock(lock){
   for(const id of ["export","aspect","quality","fps","stillDuration","imageFiles","voiceFile","bgmFile","importCover"]){
     ui[id].disabled=lock;
   }
   ui.cancelExport.disabled=!lock;
   ui.pause.disabled=lock || !playing;
   ui.restart.disabled=lock;
   ui.scrubber.disabled=lock;
   renderAssets();
   window.BNClipMakerPro?.setLock?.(lock);
 }
 function finishCapture(){
   if(capture){capture.getTracks().forEach(t=>t.stop());capture=null}
 }
 function finalizeExport(cancelled=false){
   stopLoop();finishCapture();exporting=false;setExportLock(false);
   ui.play.disabled=false;ui.pause.disabled=true;
   if(cancelled){recordedChunks=[];progress(0);report("Đã hủy render. Không có video mới.");return}
   if(!recordedChunks.length){report("Không có dữ liệu video từ MediaRecorder.",true);progress(0);return}
   const format=recorder?.mimeType||recordedChunks[0]?.type||"video/webm";
   const videoBlob=new Blob(recordedChunks,{type:format});recordedChunks=[];
   if(!videoBlob.size){report("File video rỗng. Hãy thử định dạng hoặc trình duyệt khác.",true);progress(0);return}
   const ext=/mp4/i.test(format)?"mp4":"webm";
   revoke(outputURL);outputURL=URL.createObjectURL(videoBlob);
   ui.download.href=outputURL;ui.download.download="blognaver-"+(ui.aspect.value==="portrait"?"shorts":"youtube")+"-"+Date.now()+"."+ext;
   ui.download.textContent="↓ Tải video "+ext.toUpperCase()+" · "+(videoBlob.size/1048576).toFixed(1)+" MB";
   ui.download.classList.remove("hidden");
   progress(100);report("Đã tạo video "+ext.toUpperCase()+" thành công. Bấm Tải video để lưu về máy.");
 }
 ui.export.addEventListener("click",async()=>{
   if(exporting)return;
   if(!assets.length){report("Chưa có ảnh hoặc video nền để xuất.",true);return}
   if(!canvas.captureStream||typeof MediaRecorder==="undefined"){report("Trình duyệt thiếu Canvas CaptureStream / MediaRecorder.",true);return}
   const mime=chooseMime();
   if(!mime){report("Trình duyệt chưa hỗ trợ codec xuất video MP4/WebM. Hãy thử Chrome hoặc Edge.",true);return}
   const estimatedPixels=canvas.width*canvas.height*(Number(ui.fps.value)===60?2:1);
   if(estimatedPixels>9e6){report("Cấu hình render quá lớn cho trình duyệt.",true);return}
   exportAbort=false;exporting=true;setExportLock(true);
   ui.download.classList.add("hidden");progress(0);recordedChunks=[];
   const fps=Number(ui.fps.value);
   report("Đang chuẩn bị bộ mã hóa "+mime.split(";")[0]+"…");
   try{
     pausePlayback();seek(0); // freeze before capturing for deterministic start
     if(voiceURL||bgmURL||window.BNClipMakerPro?.hasAudio?.())await ensureAudioGraph();
     draw(0);
     capture=canvas.captureStream(fps);
     if(audioDest && !window.BNClipMakerPro?.isSilentExport?.() && (voiceURL||bgmURL||window.BNClipMakerPro?.hasAudio?.())){
       const track=audioDest.stream.getAudioTracks()[0];
       if(track)capture.addTrack(track);
     }
     const recordingOptions={mimeType:mime,videoBitsPerSecond:ui.quality.value==="1080"?(fps===60?14000000:9500000):5000000};
     if(audioDest&&!window.BNClipMakerPro?.isSilentExport?.()&&(voiceURL||bgmURL||window.BNClipMakerPro?.hasAudio?.()))recordingOptions.audioBitsPerSecond=192000;
     recorder=new MediaRecorder(capture,recordingOptions);
     recorder.ondataavailable=e=>{if(e.data?.size)recordedChunks.push(e.data)};
     recorder.onerror=e=>{exportAbort=true;report("Lỗi bộ ghi video: "+(e.error?.message||"unknown"),true)};
     recorder.onstop=()=>finalizeExport(exportAbort);
     recorder.start(1000);
     await startPlayback(true);
     if(!playing)throw Error("Không thể bắt đầu phát clip.");
   }catch(e){
     exportAbort=true;
     if(recorder?.state==="recording")recorder.stop();
     else finalizeExport(true);
     report("Không thể xuất: "+e.message,true);
   }
 });
 ui.cancelExport.addEventListener("click",()=>{
   if(!exporting)return;
   exportAbort=true;
   stopLoop();if(recorder?.state==="recording")recorder.stop();else finalizeExport(true);
 });
 window.addEventListener("pagehide",()=>{
   stopLoop();if(recorder?.state==="recording"){exportAbort=true;recorder.stop()}
   finishCapture();revoke(outputURL);revoke(voiceURL);revoke(bgmURL);
   for(const item of assets)revoke(item.url);
   audioCtx?.close().catch(()=>{});
 });
 window.BNClipMakerCore=Object.freeze({makeCueLines,chooseMime,fmt,seek,refreshTimeline,renderAssets,
   getCues:()=>cues.map(c=>({...c})),
   setCues:items=>{
     if(!Array.isArray(items))throw Error("Invalid subtitle cues.");
     manualCueTiming=true;
     cues=items.slice(0,1200).map(c=>({start:Number(c.start),end:Number(c.end),text:String(c.text||"").trim()}))
       .filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&c.text)
       .sort((a,b)=>a.start-b.start);
     refreshTimeline();draw(position);
   },
   getAssets:()=>assets,getTimeline:()=>({duration,position,playing,exporting}),
   getAudioPipeline:()=>({context:audioCtx,destination:audioDest})});
 sizeCanvas();labelSettings();syncDuration();
 report("Sẵn sàng. Nhập ảnh, voiceover và bấm phát để xem trước.");
 try {
   const incoming=sessionStorage.getItem("blognaver.clipmaker.script.v1");
   if(incoming) {
     ui.script.value=incoming;
     createCues(false);
     sessionStorage.removeItem("blognaver.clipmaker.script.v1");
     report("Đã nhận "+incoming.length.toLocaleString("vi-VN")+" ký tự kịch bản từ TTS. Hãy kiểm tra phụ đề và nhập file WAV/MP3.");
   }
 } catch(e) { /* Storage may be disabled: manual paste remains available. */ }
})();
