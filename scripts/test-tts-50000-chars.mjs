/* Regression coverage: 50k TTS intake and lossless utterance queue.
 * Run: node --test scripts/test-tts-50000-chars.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const dir=new URL("../static/tien-ich/text-to-speech/",import.meta.url);
const page=readFileSync(new URL("index.html",dir),"utf8");
const dynamicSource=readFileSync(new URL("dynamic-voice.js",dir),"utf8");
const fixerSource=readFileSync(new URL("voice-fixer.js",dir),"utf8");
const preprocessSource=readFileSync(new URL("voiceover-preprocess.js",dir),"utf8");

test("UI accepts 50,000 without browser silently truncating longer pasted text",()=>{
  assert.match(page,/id="script"[^>]*data-max-chars="50000"/);
  assert.doesNotMatch(page,/id="script"[^>]*maxlength=/);
  assert.match(page,/const MAX_TTS_CHARS=Number\(els\.script\.dataset\.maxChars\)\|\|50000/);
  assert.match(page,/if\(text\.length>MAX_TTS_CHARS\)/);
  assert.match(page,/const segments=window\.BNDynamicVoice\?\.splitSentences\(text\)/);
  assert.match(page,/if\(els\.script\.value\.trim\(\)\.length>MAX_TTS_CHARS\)/);
});

const dynamicWindow={};
runInNewContext(dynamicSource,{window:dynamicWindow,Intl});
const {splitSentences,buildPlan}=dynamicWindow.BNDynamicVoice;

test("50,000 characters become bounded utterances without dropping any text",()=>{
  const phrase="Một chương trình theo dõi lịch sử của các đội tuyển có nhiều tình tiết mới ";
  const source=phrase.repeat(Math.ceil(50000/phrase.length)).slice(0,50000);
  assert.equal(source.length,50000);
  const parts=splitSentences(source);
  assert.ok(parts.length>200);
  let previous=0,rebuilt="";
  for(const part of parts){
    assert.ok(part.text.length>0 && part.text.length<=220);
    assert.ok(part.start>=previous && part.end<=source.length);
    assert.equal(source.slice(part.start,part.end),part.text);
    rebuilt+=source.slice(previous,part.start)+part.text;
    previous=part.end;
  }
  rebuilt+=source.slice(previous);
  assert.equal(rebuilt,source);
  assert.equal(buildPlan(source).length,parts.length);
});

test("huge unbroken token is split at safe utterance length without deletion",()=>{
  const source="x".repeat(1000);
  const parts=splitSentences(source);
  assert.ok(parts.every(part=>part.text.length<=220));
  assert.equal(parts.map(x=>x.text).join(""),source);
});

function domFixture(ids){
  const nodes=new Map();
  for(const id of ids){
    const handlers={};
    nodes.set(id,{
      value:"",disabled:true,checked:true,textContent:"",dataset:{},handlers,
      classList:{toggle(){}},addEventListener(type,fn){handlers[type]=fn;},
      dispatchEvent(){},scrollIntoView(){},focus(){},select(){}
    });
  }
  const script=nodes.get("script");
  script.dataset.maxChars="50000";
  return {nodes,document:{getElementById:id=>nodes.get(id)||null}};
}

test("Voice Fixer forwards 25,364 chars fully; rejects >50k without altering TTS",()=>{
  const {nodes,document}=domFixture([
    "script","voiceFixerInput","voiceFixerOutput","voiceFixerPacing",
    "voiceFixerEnglish","voiceFixerFromSection2","voiceFixerProcess",
    "voiceFixerToTts","voiceFixerListen","voiceFixerStatus","stop"
  ]);
  const win={};
  runInNewContext(fixerSource,{window:win,document,Event:class Event {},confirm:()=>true});
  const text="Đây là văn bản dài để thử giọng đọc. ".repeat(800).slice(0,25364);
  assert.equal(win.BNVoiceFixer.fixText(text,{pacing:false,english:false}),text);
  nodes.get("voiceFixerOutput").value=text;
  nodes.get("voiceFixerToTts").handlers.click();
  assert.equal(nodes.get("script").value,text);
  const huge="z".repeat(50001);
  nodes.get("voiceFixerOutput").value=huge;
  nodes.get("voiceFixerToTts").handlers.click();
  assert.equal(nodes.get("script").value,text);
  assert.match(nodes.get("voiceFixerStatus").textContent,/50.000/);
});

test("Voiceover Section 2 also transfers 25,364 chars unchanged",()=>{
  const {nodes,document}=domFixture([
    "script","voiceoverRaw","voiceoverOutput","voiceoverProcess",
    "voiceoverCopy","voiceoverToTts","voiceoverStatus","stop"
  ]);
  runInNewContext(preprocessSource,{
    window:{},document,Event:class Event {},confirm:()=>true,Intl
  });
  const text="Nội dung kể chuyện dài. ".repeat(1500).slice(0,25364);
  nodes.get("voiceoverOutput").value=text;
  nodes.get("voiceoverToTts").handlers.click();
  assert.equal(nodes.get("script").value,text);
  nodes.get("voiceoverOutput").value="x".repeat(50001);
  nodes.get("voiceoverToTts").handlers.click();
  assert.equal(nodes.get("script").value,text);
  assert.match(nodes.get("voiceoverStatus").textContent,/50.000/);
});
