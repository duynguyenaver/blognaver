/* Run: node --test scripts/test-tts-pronunciation-training.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {TextEncoder,TextDecoder} from "node:util";

const base=new URL("../static/tien-ich/text-to-speech/",import.meta.url);
const engine=readFileSync(new URL("pronunciation-training.js",base),"utf8");
const page=readFileSync(new URL("index.html",base),"utf8");
const pre=readFileSync(new URL("voiceover-preprocess.js",base),"utf8");
const fixer=readFileSync(new URL("voice-fixer.js",base),"utf8");
const seed=JSON.parse(readFileSync(new URL("pronunciation-dictionary.json",base),"utf8"));

const REPO="https://api.github.com/repos/duynguyenaver/blognaver";
const FILE="static/tien-ich/text-to-speech/pronunciation-dictionary.json";
const fakeSha="a".repeat(40);
const base64=s=>Buffer.from(s,"utf8").toString("base64");

function node(id){
  return {id,value:"",checked:true,disabled:false,hidden:true,href:"",textContent:"",dataset:{},
    listeners:{},children:[],open:false,style:{},classList:{toggle(){},add(){},remove(){}},
    addEventListener(type,cb){this.listeners[type]=cb},
    setAttribute(){},removeAttribute(){},replaceChildren(){this.children=[]},
    append(...nodes){this.children.push(...nodes)},focus(){},closest(){return {open:false}}
  };
}
function environment(withUI=false){
  const ids=["pronunciationTraining","pronunciationEntryForm","pronunciationTerm",
    "pronunciationReading","pronunciationLanguage","pronunciationCaseSensitive",
    "pronunciationPublishConsent","pronunciationSaveGithub","pronunciationRuleList",
    "pronunciationRuleCount","pronunciationTrainingStatus","pronunciationPreview",
    "pronunciationPreviewResult","pronunciationRefresh","pronunciationPullRequest","ghToken"];
  const nodes=new Map((withUI?ids:[]).map(id=>[id,node(id)]));
  if(withUI){
    nodes.get("pronunciationLanguage").value="en";
    nodes.get("ghToken").value="TOKEN-TEST-NOT-FOR-PUBLIC";
    nodes.get("pronunciationPreview").value="Gen.G chiến thắng";
  }
  const calls=[];
  const fakeFetch=async (url,options={})=>{
    const method=options.method||"GET";
    calls.push({url,method,body:options.body?JSON.parse(options.body):null,headers:options.headers});
    const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
    if(String(url).startsWith("pronunciation-dictionary.json?"))return response(seed);
    if(url===REPO+"/contents/"+FILE+"?ref=main")
      return response({encoding:"base64",content:base64(JSON.stringify(seed)),sha:"b".repeat(40)});
    if(url===REPO+"/git/ref/heads/main")return response({object:{sha:fakeSha}});
    if(url===REPO+"/git/refs" && method==="POST")return response({ref:"created"},201);
    if(url===REPO+"/contents/"+FILE && method==="PUT")return response({commit:{sha:fakeSha}},201);
    if(url===REPO+"/pulls" && method==="POST")
      return response({number:321,html_url:"https://github.com/duynguyenaver/blognaver/pull/321"},201);
    throw Error("Unmocked request "+method+" "+url);
  };
  const window={};
  runInNewContext(engine,{
    window,document:{
      getElementById:id=>nodes.get(id)||null,
      createElement:tag=>node(tag)
    },
    fetch:fakeFetch,TextEncoder,TextDecoder,
    btoa:s=>Buffer.from(s,"binary").toString("base64"),
    atob:s=>Buffer.from(s,"base64").toString("binary"),
    crypto:{randomUUID:()=>"abcdef12-1234-1234-1234-123456789abc"},
    Date,confirm:()=>true
  });
  return {api:window.BNPronunciationTraining,nodes,calls};
}

test("Section 04 is optional, collapsible and has clear GitHub PR status",()=>{
  assert.match(page,/<details id="pronunciationTraining"/);
  for(const id of ["pronunciationTerm","pronunciationReading","pronunciationRuleList",
    "pronunciationSaveGithub","pronunciationPublishConsent","pronunciationTrainingStatus"])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/pronunciation-training\.js[^"]*" defer><\/script><script src="voiceover-preprocess\.js/);
  assert.ok(page.includes("50.000"),"Existing TTS character cap remains visible");
});

test("GitHub dictionary respects each owner's pronunciation and case preference",async()=>{
  const {api}=environment(true);await api.ready;
  assert.equal(api.list().length,seed.entries.length);
  for(const entry of seed.entries){
    assert.equal(api.list().find(item=>item.term===entry.term)?.reading,entry.reading);
  }
  const genG=seed.entries.find(entry=>entry.term==="Gen.G");
  if(genG){
    assert.equal(api.apply("Gen.G chiến thắng."),genG.reading+" chiến thắng.");
    const upperExpected=genG.caseSensitive===false?genG.reading:"GEN.G";
    assert.equal(api.apply("GEN.G tiếp tục."),upperExpected+" tiếp tục.");
  }
});

test("Train exact English and Vietnamese words without changing embedded substrings",async()=>{
  const {api}=environment(true);
  await api.ready;
  api.stage({term:"Gen.G",reading:"den di",language:"en",caseSensitive:false});
  api.stage({term:"G",reading:"di",language:"en",caseSensitive:true});
  api.stage({term:"hiểu nhầm",reading:"hiểu nhầm chuẩn",language:"vi",caseSensitive:false});
  assert.equal(api.apply("G giọng nói, 5G, Gaming, g"),"di giọng nói, 5G, Gaming, g");
  assert.equal(api.apply("Tôi HIỂU NHẦM rồi."),"Tôi hiểu nhầm chuẩn rồi.");
  assert.equal(api.apply("https://blognaver.example/Gen.G hello@Gen.G.com \`Gen.G\` Gen.G"),
    "https://blognaver.example/Gen.G hello@Gen.G.com \`Gen.G\` den di");
});

test("Reject malformed/unsafe entries rather than turning into regex or commands",()=>{
  const {api}=environment();
  for(const term of ["<img>","https://example.com","hi\nthere",""]){
    assert.throws(()=>api.stage({term,reading:"đúng"}));
  }
  assert.throws(()=>api.stage({term:"Gen.G",reading:"Gen.G"}));
  assert.throws(()=>api.stage({term:"a".repeat(101),reading:"đúng"}));
  assert.throws(()=>api.stage({term:"AI",reading:"a".repeat(181)}));
});

test("preprocessing and Voice Fixer consult learned rules before built-in phonetics",()=>{
  assert.match(pre,/BNPronunciationTraining\?\.apply\?\.\(s\)/);
  assert.match(fixer,/BNPronunciationTraining\?\.apply\?\.\(segment\)/);
  assert.ok(page.includes("new SpeechSynthesisUtterance(spoken)"));
});

test("Save uses GitHub branch -> contents commit -> PR; never commits directly to main",async()=>{
  const {api,nodes,calls}=environment(true);
  await api.ready;
  api.stage({term:"Esports",reading:"i-spót",language:"en",caseSensitive:false});
  nodes.get("pronunciationPublishConsent").checked=true;
  await nodes.get("pronunciationSaveGithub").listeners.click();
  const commits=calls.filter(x=>x.method==="PUT");
  const refs=calls.filter(x=>x.method==="POST"&&x.url.endsWith("/git/refs"));
  const prs=calls.filter(x=>x.method==="POST"&&x.url.endsWith("/pulls"));
  assert.equal(refs.length,1);
  assert.equal(commits.length,1);
  assert.equal(prs.length,1);
  assert.ok(refs[0].body.ref.startsWith("refs/heads/data/tts-pronunciation-"));
  assert.equal(commits[0].body.branch,refs[0].body.ref.slice("refs/heads/".length));
  assert.equal(prs[0].body.base,"main");
  assert.equal(prs[0].body.head,commits[0].body.branch);
  assert.equal(nodes.get("pronunciationPullRequest").hidden,false);
  assert.ok(nodes.get("pronunciationTrainingStatus").textContent.includes("chờ CI/auto-merge"));
  assert.ok(!JSON.stringify(commits[0].body).includes("TOKEN-TEST-NOT-FOR-PUBLIC"));
  assert.equal(calls.filter(x=>x.method==="PUT"&&x.body?.branch==="main").length,0);
});

test("Do not make GitHub requests to save without public consent",async()=>{
  const {api,nodes,calls}=environment(true);await api.ready;
  api.stage({term:"KSV",reading:"kây ét vi",language:"en",caseSensitive:false});
  nodes.get("pronunciationPublishConsent").checked=false;
  const n=calls.length;
  await nodes.get("pronunciationSaveGithub").listeners.click();
  assert.equal(calls.length,n);
  assert.match(nodes.get("pronunciationTrainingStatus").textContent,/xác nhận/);
});
