/* Run node --test scripts/test-youtube-clip-maker.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const html=readFileSync(new URL("../static/tien-ich/youtube-clip-maker/index.html",import.meta.url),"utf8");
const source=readFileSync(new URL("../static/tien-ich/youtube-clip-maker/editor.js",import.meta.url),"utf8");

function boot() {
 const elements=new Map(),events={};
 const ctx={fillRect(){},drawImage(){},save(){},restore(){},strokeText(){},fillText(){},measureText(s){return {width:s.length*10}}};
 let currentFormats=["video/webm;codecs=vp8","video/webm"];
 class Recorder{}
 Recorder.isTypeSupported=t=>currentFormats.includes(t);
 function node(id) {
  if(elements.has(id))return elements.get(id);
  const val={quality:"1080",aspect:"landscape",fps:"30",zoom:"1",fit:"cover",kenBurns:"in",transition:"fade",
    filter:"none",voiceVol:"1",bgmVol:".24",fontSize:"52",stillDuration:"10"};
  const e={id,value:val[id]??"",checked:["ducking","waveform","showSubs"].includes(id),disabled:false,
   style:{},files:[],children:[],textContent:"",classList:{add(){},remove(){}},
   handlers:{},addEventListener(k,fn){this.handlers[k]=fn},
   append(...kids){this.children.push(...kids)},
   replaceChildren(...kids){this.children=kids},
   click(){this.handlers.click?.()},
   getContext(){return ctx},
   get parentElement(){return {requestFullscreen(){}}},
   setAttribute(){}
  };
  elements.set(id,e);return e;
 }
 const document={getElementById:node,createElement:()=>node("element-"+Math.random()),fullscreenElement:null};
 const canvas=node("canvas");canvas.width=1920;canvas.height=1080;
 canvas.captureStream=()=>({getTracks:()=>[],addTrack(){}});
 const window={addEventListener(k,fn){events[k]=fn}};
 const url={createObjectURL:()=>"blob:testing",revokeObjectURL(){}};
 runInNewContext(source,{
  window,document,URL:url,MediaRecorder:Recorder,
  crypto:{randomUUID:()=>String(Math.random())},
  performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  setTimeout:()=>1,clearTimeout(){},navigator:{},console
 });
 return {node,window,changeFormats:next=>{currentFormats=next}};
}

test("editor HTML includes all four regions and linked tools",()=>{
 for(const id of ["assets","canvas","voiceFile","bgmFile","visualTrack","voiceTrack","bgmTrack","subtitleTrack",
  "importCover","generateSubs","export","progressPct","download"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/text-to-speech\//);
 assert.match(html,/youtube-thumbnail-cover-generator\//);
 assert.match(html,/editor\.js/);
});

test("subtitle splits sentences into short timed-caption text chunks",()=>{
 const {window}=boot();
 const chunks=window.BNClipMakerCore.makeCueLines("Một câu ngắn. Đây là câu tiếp theo có một số nội dung bổ sung để dựng video YouTube.");
 assert.ok(chunks.length>=2);
 assert.ok(chunks.every(chunk=>chunk.split(/\s+/).length<=8));
});

test("landscape, portrait and 720p resolution control",()=>{
 const {node}=boot();
 assert.deepEqual([node("canvas").width,node("canvas").height],[1920,1080]);
 node("aspect").value="portrait";node("aspect").handlers.change();
 assert.deepEqual([node("canvas").width,node("canvas").height],[1080,1920]);
 node("quality").value="720";node("quality").handlers.change();
 assert.deepEqual([node("canvas").width,node("canvas").height],[720,1280]);
});

test("codec selection uses actual browser support; no fake MP4 extension",()=>{
 const {window,changeFormats}=boot();
 assert.equal(window.BNClipMakerCore.chooseMime(),"video/webm;codecs=vp8");
 changeFormats(["video/mp4","video/webm"]);
 assert.equal(window.BNClipMakerCore.chooseMime(),"video/mp4");
 changeFormats([]);
 assert.equal(window.BNClipMakerCore.chooseMime(),null);
});

test("subtitle generated in timeline and source images are required for export",()=>{
 const {node}=boot();
 node("script").value="Chào mừng các bạn. Đây là video YouTube có phụ đề.";
 node("generateSubs").click();
 assert.equal(node("subtitleTrack").children.length,2);
 assert.match(node("exportStatus").textContent,/ước lượng/);
 node("export").click();
 assert.match(node("exportStatus").textContent,/Chưa có ảnh/);
});
