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
    "pronunciationPreviewResult","pronunciationRefresh","pronunciationPullRequest","ghToken",
    "pronunciationSelectAll","pronunciationSelectNone","pronunciationPreviewAudio",
    "voice","rate","pitch","stop"];
  const nodes=new Map((withUI?ids:[]).map(id=>[id,node(id)]));
  if(withUI){
    nodes.get("pronunciationLanguage").value="en";
    nodes.get("ghToken").value="TOKEN-TEST-NOT-FOR-PUBLIC";
    nodes.get("pronunciationPreview").value="Gen.G chiến thắng";
    nodes.get("voice").value="0";
    nodes.get("rate").value="1";
    nodes.get("pitch").value="1";
    nodes.get("stop").disabled=true;
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
  const speechCalls=[];
  const window={
    speechSynthesis:{
      cancel:()=>speechCalls.push({event:"cancel"}),
      speak:utterance=>speechCalls.push({event:"speak",text:utterance.text,
        voice:utterance.voice,rate:utterance.rate,pitch:utterance.pitch}),
      getVoices:()=>[{name:"Microsoft Hoai My Online (Natural)",lang:"vi-VN"}]
    },
    SpeechSynthesisUtterance:class SpeechSynthesisUtterance{
      constructor(text){this.text=text}
    }
  };
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
  return {api:window.BNPronunciationTraining,nodes,calls,speechCalls};
}

test("Section 04 is optional, collapsible and has clear GitHub PR status",()=>{
  assert.match(page,/<details id="pronunciationTraining"/);
  for(const id of ["pronunciationTerm","pronunciationReading","pronunciationRuleList",
    "pronunciationSaveGithub","pronunciationPublishConsent","pronunciationTrainingStatus",
    "pronunciationSelectAll","pronunciationSelectNone","pronunciationPreviewAudio"])
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


test("Only checked pending corrections are included in GitHub PR; unselected stay local",async()=>{
  const {api,nodes,calls}=environment(true);await api.ready;
  api.stage({term:"KSV",reading:"kây ét vi",language:"en",caseSensitive:false});
  api.stage({term:"Esports",reading:"i-spót",language:"en",caseSensitive:false});
  assert.equal(api.pending().filter(x=>x.selected).length,2);
  assert.equal(api.select("KSV",false),true);
  assert.equal(api.pending().filter(x=>x.selected).length,1);
  nodes.get("pronunciationPublishConsent").checked=true;
  await nodes.get("pronunciationSaveGithub").listeners.click();
  const commits=calls.filter(c=>c.method==="PUT");
  assert.equal(commits.length,1);
  const written=JSON.parse(Buffer.from(commits[0].body.content,"base64").toString("utf8"));
  assert.ok(written.entries.some(x=>x.term==="Esports"&&x.reading==="i-spót"));
  assert.ok(!written.entries.some(x=>x.term==="KSV"),"Unselected correction was written");
  assert.ok(written.entries.some(x=>x.term==="Gen.G"),"Existing remote rules disappeared");
  assert.deepEqual(api.pending().map(x=>x.term),["ksv"],"Unselected draft was lost");
  assert.equal(api.list().find(x=>x.term==="KSV")?.reading,"kây ét vi");
});

test("An already-saved identical correction never creates a redundant PR",async()=>{
  const {api,nodes,calls}=environment(true);await api.ready;
  const same=seed.entries.find(x=>x.term==="Gen.G");
  api.stage({...same});
  assert.equal(api.pending().length,0);
  nodes.get("pronunciationPublishConsent").checked=true;
  await nodes.get("pronunciationSaveGithub").listeners.click();
  assert.equal(calls.filter(c=>c.method==="POST"&&c.url.endsWith("/pulls")).length,0);
  assert.match(nodes.get("pronunciationTrainingStatus").textContent,/Chưa chọn/);
});

test("Bỏ chọn tất cả prevents any GitHub write, then Chọn tất cả restores selection",async()=>{
  const {api,nodes,calls}=environment(true);await api.ready;
  api.stage({term:"Demo",reading:"đem mô",language:"en",caseSensitive:false});
  nodes.get("pronunciationSelectNone").listeners.click();
  assert.equal(api.pending()[0].selected,false);
  nodes.get("pronunciationPublishConsent").checked=true;
  await nodes.get("pronunciationSaveGithub").listeners.click();
  assert.equal(calls.filter(c=>c.method==="PUT").length,0);
  nodes.get("pronunciationSelectAll").listeners.click();
  assert.equal(api.pending()[0].selected,true);
});

test("Each rule offers accessible Sync and Nghe thử controls directly in Section 04",async()=>{
  const {api,nodes}=environment(true);await api.ready;
  api.stage({term:"Esports",reading:"i-spót",language:"en",caseSensitive:false});
  const list=nodes.get("pronunciationRuleList");
  const esportsRow=list.children.find(item=>item.children.some(child=>child.children?.some(c=>c.textContent==="Esports")));
  assert.ok(esportsRow,"New rule not rendered in Section 04");
  const controls=esportsRow.children.find(c=>c.className==="pron-rule-actions");
  assert.ok(controls);
  const checkbox=controls.children[0].children[0];
  assert.equal(checkbox.type,"checkbox");
  assert.equal(checkbox.checked,true);
  assert.equal(checkbox.disabled,false);
  checkbox.checked=false;
  checkbox.listeners.change();
  assert.equal(api.pending().find(x=>x.term==="esports").selected,false);
  const savedRow=list.children.find(item=>item.children.some(child=>child.children?.some(c=>c.textContent==="Gen.G")));
  const savedCheckbox=savedRow.children.find(c=>c.className==="pron-rule-actions").children[0].children[0];
  assert.equal(savedCheckbox.checked,false);
  assert.equal(savedCheckbox.disabled,true);
});

test("Per-word audio uses corrected Vietnamese reading and selected Hoai My voice",async()=>{
  const {api,speechCalls,nodes}=environment(true);await api.ready;
  assert.equal(api.previewSpeech("den di"),true);
  const played=speechCalls.find(x=>x.event==="speak");
  assert.equal(played.text,"den di");
  assert.equal(played.voice?.name,"Microsoft Hoai My Online (Natural)");
  assert.equal(played.rate,1);
  assert.equal(played.pitch,1);
  assert.ok(speechCalls.some(x=>x.event==="cancel"));
  nodes.get("stop").disabled=false;
  const before=speechCalls.length;
  assert.equal(api.previewSpeech("đội hình"),false);
  assert.equal(speechCalls.length,before,"Audio preview interrupted ongoing Section 01 recording");
});

test("Pronunciation preview reads an uncommitted correction without Section 01",async()=>{
  const {nodes,speechCalls,api}=environment(true);await api.ready;
  nodes.get("pronunciationReading").value="đỉnh thế giới";
  await nodes.get("pronunciationPreviewAudio").listeners.click();
  assert.ok(speechCalls.some(x=>x.event==="speak"&&x.text==="đỉnh thế giới"));
  assert.equal(api.pending().length,0,"Listening should not automatically create a draft");
});
