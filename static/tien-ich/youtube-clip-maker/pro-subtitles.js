/* Import, edit and export true SRT timecodes for Clip Maker, without remote services. */
(() => {
  "use strict";
  const core=window.BNClipMakerCore, $=id=>document.getElementById(id);
  if(!core||!$("proSrtTools"))return;
  const ui={file:$("srtFile"),text:$("srtText"),apply:$("applySrt"),save:$("exportSrt"),load:$("editCurrentSrt"),status:$("srtStatus")};
  const say=(message,error=false)=>{
    ui.status.textContent=message;
    ui.status.classList.toggle("error",error);
  };
  function timeFromSrt(value){
    const match=value.trim().match(/^(\d{1,3}):([0-5]\d):([0-5]\d)[,.](\d{1,3})$/);
    if(!match)return NaN;
    return Number(match[1])*3600+Number(match[2])*60+Number(match[3])+Number(match[4].padEnd(3,"0"))/1000;
  }
  function timeToSrt(value){
    const ms=Math.max(0,Math.round(value*1000));
    const hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60;
    return String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+
      String(seconds).padStart(2,"0")+","+String(ms%1000).padStart(3,"0");
  }
  function parseSrt(input){
    if(typeof input!=="string"||input.length>2*1024*1024)throw Error("SRT tối đa 2 MB.");
    const blocks=input.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trim().split(/\n\s*\n/).filter(Boolean);
    const result=[];let invalid=0;
    const timeLine=/^(\d{1,3}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,3}:\d{2}:\d{2}[,.]\d{1,3})(?:\s+.*)?$/;
    for(const block of blocks){
      const lines=block.split("\n");
      const i=lines.findIndex(line=>timeLine.test(line.trim()));
      if(i<0||i>=lines.length-1){invalid++;continue;}
      const range=lines[i].trim().match(timeLine);
      const start=timeFromSrt(range[1]),end=timeFromSrt(range[2]);
      const text=lines.slice(i+1).join("\n").trim().replace(/<[^>]*>/g,"");
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!text){invalid++;continue;}
      result.push({start,end,text});
      if(result.length>=1200)break;
    }
    return {cues:result.sort((a,b)=>a.start-b.start),invalid};
  }
  function serializeSrt(cues){
    return cues.map((cue,index)=>(index+1)+"\n"+timeToSrt(cue.start)+" --> "+timeToSrt(cue.end)+"\n"+cue.text.replace(/\r\n?/g,"\n")).join("\n\n")+"\n";
  }
  function applySrt(){
    try{
      const {cues,invalid}=parseSrt(ui.text.value);
      if(!cues.length)throw Error("Không tìm thấy khối timecode hợp lệ. Dùng 00:00:01,000 --> 00:00:03,000.");
      core.setCues(cues);
      const max=core.getTimeline().duration,over=cues.filter(x=>x.end>max).length;
      say("Đã áp dụng "+cues.length+" phụ đề SRT."+(invalid?" Bỏ qua "+invalid+" khối lỗi.":"")+
        (over?" "+over+" phụ đề vượt thời lượng video; hãy chỉnh lại In/Out hoặc thời lượng.":""));
    }catch(error){say(error.message,true)}
  }
  async function importSrt(){
    const file=ui.file.files?.[0];
    if(!file)return;
    try{
      if(file.size>2*1024*1024)throw Error("File SRT vượt 2 MB.");
      ui.text.value=await file.text();
      applySrt();
    }catch(error){say("Nhập file SRT lỗi: "+error.message,true)}
    finally{ui.file.value=""}
  }
  function loadCurrent(){
    const cues=core.getCues();
    if(!cues.length){say("Chưa có phụ đề. Hãy nhập SRT hoặc tạo từ kịch bản.",true);return}
    ui.text.value=serializeSrt(cues);
    say("Đã nạp "+cues.length+" phụ đề đang dùng. Chỉnh timecode rồi bấm Áp dụng SRT.");
    $("proSrtTools").open=true;
  }
  function exportSrt(){
    const cues=core.getCues();
    if(!cues.length){say("Chưa có phụ đề để xuất.",true);return}
    const url=URL.createObjectURL(new Blob(["\uFEFF"+serializeSrt(cues)],{type:"application/x-subrip;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download="blognaver-clip-maker-"+Date.now()+".srt";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    say("Đã tạo SRT gồm "+cues.length+" phụ đề. Timecode từ tạo tự động vẫn chỉ là ước lượng.");
  }
  ui.file.addEventListener("change",importSrt);
  ui.apply.addEventListener("click",applySrt);
  ui.save.addEventListener("click",exportSrt);
  ui.load.addEventListener("click",loadCurrent);
  window.BNClipMakerSRT=Object.freeze({parseSrt,serializeSrt,timeFromSrt,timeToSrt});
})();
