/* BlogNaver Podcast Studio — core audio engine, Web Audio only.
 * All decoding, mixing and WAV rendering occur client-side.
 */
(() => {
"use strict";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const trackKeys=["voice","guest","music","sfx"];
const tracksDefault=()=>({
 voice:{name:"🎙 Voice",gain:1,mute:false,solo:false},
 guest:{name:"👥 Guest",gain:1,mute:false,solo:false},
 music:{name:"♫ BGM",gain:.28,mute:false,solo:false},
 sfx:{name:"✦ Intro / SFX",gain:.75,mute:false,solo:false}
});
function durationOf(clips){return clips.reduce((m,c)=>Math.max(m,c.start+Math.max(0,c.out-c.in)),0)}
function makePeaks(buffer,limit=1200){
 const samples=buffer.getChannelData(0),step=Math.max(1,Math.ceil(samples.length/limit)),out=[];
 for(let i=0;i<samples.length;i+=step){
   let peak=0;for(let j=i;j<Math.min(i+step,samples.length);j++)peak=Math.max(peak,Math.abs(samples[j]));
   out.push(Math.round(peak*255));
 }
 return out;
}
function envelope(c,t) {
 const begin=c.start,end=c.start+c.out-c.in;
 const fi=c.fadeIn>0?clamp((t-begin)/c.fadeIn,0,1):1;
 const fo=c.fadeOut>0?clamp((end-t)/c.fadeOut,0,1):1;
 return clamp(Math.min(fi,fo),0,1);
}
function schedule(ctx,assets,clips,tracks,settings,from,seconds,playbackRate=1){
 const time0=ctx.currentTime+.04;
 const master=ctx.createGain();master.gain.value=clamp(Number(settings.master??1),0,1.5);
 master.connect(ctx.destination);
 const solos=trackKeys.some(k=>tracks[k]?.solo);
 const sources=[];
 const rangeEnd=from+seconds;
 for(const clip of clips){
   const asset=assets.get(clip.assetId);
   const track=tracks[clip.track];
   if(!asset?.buffer||!track||track.mute||(solos&&!track.solo))continue;
   const begin=Math.max(from,clip.start),end=Math.min(rangeEnd,clip.start+clip.out-clip.in);
   if(end-begin<.002)continue;
   const localStart=clip.in+begin-clip.start;
   const remaining=Math.min((end-begin),Math.max(0,asset.buffer.duration-localStart));
   if(remaining<.002)continue;
   const node=ctx.createBufferSource();node.buffer=asset.buffer;node.playbackRate.value=playbackRate;
   const fade=ctx.createGain();
   const base=clamp(Number(clip.gain??1)*Number(track.gain??1),0,4);
   const when=time0+(begin-from)/playbackRate;
   const ending=when+remaining/playbackRate;
   const g=fade.gain;
   g.setValueAtTime(base*envelope(clip,begin),when);
   const breakpoints=[clip.start,clip.start+clip.fadeIn,clip.start+clip.out-clip.in-clip.fadeOut,clip.start+clip.out-clip.in];
   if(clip.fadeIn>0&&clip.fadeOut>0){
     const a=clip.start,b=clip.start+clip.out-clip.in;
     breakpoints.push((clip.fadeIn*b+clip.fadeOut*a)/(clip.fadeIn+clip.fadeOut));
   }
   for(const t of [...new Set(breakpoints)].filter(t=>t>begin+.0001&&t<end-.0001).sort((a,b)=>a-b))
     g.linearRampToValueAtTime(base*envelope(clip,t),when+(t-begin)/playbackRate);
   g.linearRampToValueAtTime(base*envelope(clip,end),ending);
   let last=node;
   if(settings.highpass&&["voice","guest"].includes(clip.track)){
     const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=80;last.connect(hp);last=hp;
   }
   if(settings.compressor&&["voice","guest"].includes(clip.track)){
     const comp=ctx.createDynamicsCompressor();comp.threshold.value=-22;comp.knee.value=16;
     comp.ratio.value=3;comp.attack.value=.005;comp.release.value=.22;
     last.connect(comp);last=comp;
   }
   last.connect(fade);fade.connect(master);
   node.start(when,localStart,remaining);
   sources.push(node);
 }
 return {sources,time0,master,stop(){sources.forEach(n=>{try{n.stop()}catch{}});master.disconnect()}};
}
// Explicitly use a header-only blob part for PCM WAV, no whole-project Float32 buffer in RAM.
function wavHeader(bytes,sampleRate,channels=2){
 const array=new ArrayBuffer(44),view=new DataView(array);
 const label=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
 label(0,"RIFF");view.setUint32(4,bytes+36,true);label(8,"WAVEfmt ");
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels*2,true);
 view.setUint16(32,channels*2,true);view.setUint16(34,16,true);
 label(36,"data");view.setUint32(40,bytes,true);
 return array;
}
function packPCM(audio,volume){
 const channels=Math.min(2,audio.numberOfChannels);
 const left=audio.getChannelData(0),right=channels>1?audio.getChannelData(1):left;
 const samples=new ArrayBuffer(left.length*4),view=new DataView(samples);
 let peak=0;
 for(let i=0;i<left.length;i++){
  const l=clamp(left[i]*volume,-1,1),r=clamp(right[i]*volume,-1,1);
  view.setInt16(i*4,l<0?Math.round(l*32768):Math.round(l*32767),true);
  view.setInt16(i*4+2,r<0?Math.round(r*32768):Math.round(r*32767),true);
  peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
 }
 return {pcm:samples,peak};
}
async function renderWAV({assets,clips,tracks,settings,sampleRate=48000,onProgress=()=>{},cancelled=()=>false}){
 const total=durationOf(clips);
 if(total<=0)throw Error("Timeline chưa có clip âm thanh để xuất.");
 if(total>3600)throw Error("Giới hạn 60 phút cho WAV trực tiếp trên trình duyệt. Hãy xuất từng tập ngắn hơn.");
 if(total*sampleRate*4>750*1024*1024)throw Error("File WAV dự kiến quá 750 MB. Hãy giảm sample rate hoặc độ dài.");
 if(typeof OfflineAudioContext==="undefined")throw Error("Trình duyệt thiếu OfflineAudioContext.");
 const chunkSeconds=20,wholeFrames=Math.ceil(total*sampleRate),chunks=Math.ceil(wholeFrames/(chunkSeconds*sampleRate));
 const normalize=!!settings.normalize;
 let maxPeak=0;
 // First pass measures the global peak to apply consistent gain, never per-chunk normalization.
 const rounds=normalize?2:1;
 const pcmParts=[];
 for(let pass=0;pass<rounds;pass++){
   for(let i=0;i<chunks;i++){
     if(cancelled())throw Error("Đã hủy xuất WAV.");
     const startFrame=i*chunkSeconds*sampleRate;
     const frameCount=Math.min(chunkSeconds*sampleRate,wholeFrames-startFrame);
     const from=startFrame/sampleRate,seconds=frameCount/sampleRate;
     const context=new OfflineAudioContext(2,frameCount,sampleRate);
     schedule(context,assets,clips,tracks,{...settings,master:settings.master??1},from,seconds);
     const rendered=await context.startRendering();
     if(pass===0&&normalize){
       for(let ch=0;ch<2;ch++){
         const values=rendered.getChannelData(ch);
         for(let p=0;p<values.length;p++)maxPeak=Math.max(maxPeak,Math.abs(values[p]));
       }
     }else{
       const gain=normalize&&maxPeak>0?Math.min(4,Math.pow(10,-1/20)/maxPeak):1;
       pcmParts.push(new Blob([packPCM(rendered,gain).pcm]));
     }
     onProgress(Math.round(((pass*chunks+i+1)/(rounds*chunks))*100));
     await new Promise(r=>setTimeout(r,0));
   }
 }
 const dataBytes=wholeFrames*4;
 return new Blob([wavHeader(dataBytes,sampleRate,2),...pcmParts],{type:"audio/wav"});
}
window.BNPodcastAudio=Object.freeze({clamp,trackKeys,tracksDefault,durationOf,makePeaks,envelope,schedule,wavHeader,renderWAV});
})();
