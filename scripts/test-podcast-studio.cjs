// Automated regression: native Web Audio scheduling, WAV layout and Podcast Studio wiring.
// node scripts/test-podcast-studio.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const dir=path.join(__dirname,"../static/tien-ich/tao-podcast");
const source=fs.readFileSync(path.join(dir,"audio-engine.js"),"utf8");
const ui=fs.readFileSync(path.join(dir,"studio.js"),"utf8");
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
new vm.Script(ui,{filename:"studio.js"});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,"Duplicate HTML element id");
for(const [,id] of ui.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.includes(id),"Missing element id: "+id);
assert.match(html,/src="audio-engine\.js"/);
assert.match(html,/src="studio\.js"/);

const w={};
class FakeOfflineAudioContext{
 constructor(channels,frames,rate){this.numberOfChannels=channels;this.length=frames;this.sampleRate=rate;this.currentTime=0;this.destination={}}
 createGain(){return {gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createBufferSource(){return {playbackRate:{value:1},connect(){},start(){},stop(){}}}
 createBiquadFilter(){return {type:"",frequency:{value:0},connect(){}}}
 createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}}}
 async startRendering(){
  const data=new Float32Array(this.length);data.fill(.25);
  return {numberOfChannels:2,length:data.length,getChannelData:()=>data};
 }
}
const sandbox={window:w,OfflineAudioContext:FakeOfflineAudioContext,Blob,ArrayBuffer,DataView,
 Float32Array,Uint8Array,Uint8ClampedArray,Math,Set,Map,Number,Error,
 setTimeout,clearTimeout,Promise};
vm.runInNewContext(source,sandbox,{filename:"audio-engine.js"});
const A=w.BNPodcastAudio;
assert.deepEqual([...A.trackKeys],["voice","guest","music","sfx"]);
const clips=[{id:"a",assetId:"x",track:"voice",start:0,in:0,out:.5,gain:1,fadeIn:.1,fadeOut:.1}];
const assets=new Map([["x",{buffer:{duration:1}}]]);
assert.equal(A.durationOf(clips),.5);
assert.equal(A.envelope(clips[0],0),0);
assert.equal(A.envelope(clips[0],.2),1);
assert.equal(A.envelope(clips[0],.5),0);
(async()=>{
 const calls=[];
 const wav=await A.renderWAV({assets,clips,tracks:A.tracksDefault(),
  settings:{highpass:true,compressor:true,normalize:true,master:1},
  sampleRate:44100,onProgress:x=>calls.push(x)});
 assert.equal(wav.type,"audio/wav");
 assert.equal(wav.size,44+Math.ceil(.5*44100)*4);
 const header=new DataView(await wav.slice(0,44).arrayBuffer());
 assert.equal(header.getUint32(24,true),44100);
 assert.equal(header.getUint16(22,true),2);
 assert.equal(header.getUint16(34,true),16);
 assert.equal(header.getUint32(40,true),22050*4);
 assert.equal(calls[calls.length-1],100);
 console.log("PASS Podcast Studio IDs, syntax, envelopes, Offline WAV header/sample count");
})().catch(e=>{console.error(e);process.exitCode=1});
