const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
for(const [name,path,start,end,fn] of [
 ['journal','static/tien-ich/diary-studio/diary.js','async function persist(){','\nfunction render','persist'],
 ['vocabulary','static/tien-ich/tu-vung-han-anh-viet/vocab.js','const save=async()=>{',',status=','save']]){
 const source=fs.readFileSync(path,'utf8');const code=source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)))+';globalThis.run='+fn;
 test(name+': local confirmation precedes GitHub and is absent on failed writes',async()=>{
  for(const failure of [false,true]){
   const local=deferred(),remote=deferred(),events=[];
   const scope={KEY:'test',entries:[],items:[],deleted:{},window:{BNDiaryStore:{set:()=>local.promise},BNFeedback:{toast:()=>events.push('local-success')},BNCloudSync:{isConnected:()=>true,saveNow:()=>{events.push('cloud-start');return remote.promise}}}};
   vm.runInNewContext(code,scope);const result=scope.run();assert.deepEqual(events,[]);
   if(failure){local.reject(Error('Storage full'));await assert.rejects(result,/Storage full/);assert.deepEqual(events,[])}
   else{local.resolve();await new Promise(r=>setImmediate(r));assert.deepEqual(events,['local-success','cloud-start']);remote.reject(Error('Offline'));assert.match(await result,/pending: Offline/)}
  }
 });
}
test('interview: a failed storage transaction produces no success toast',async()=>{
 const source=fs.readFileSync('static/tien-ich/interview-tracking/tracker.js','utf8');const a=source.indexOf('function persist(){'),b=source.indexOf('\n',a);const events=[];
 const scope={dirty:false,apps:[],STORE:'test',render:()=>{},status:()=>{},toast:()=>events.push('success'),window:{BNDiaryStore:{set:()=>Promise.reject(Error('Storage full'))},BNFeedback:{toast:(m,t)=>events.push(t)}}};
 vm.runInNewContext(source.slice(a,b)+';persist()',scope);await new Promise(r=>setImmediate(r));assert.deepEqual(events,['error']);
});
