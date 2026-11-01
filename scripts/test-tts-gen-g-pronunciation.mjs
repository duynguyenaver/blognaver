/* Run: node --test scripts/test-tts-gen-g-pronunciation.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const folder = new URL("../static/tien-ich/text-to-speech/", import.meta.url);
const fixerJs = readFileSync(new URL("voice-fixer.js",folder),"utf8");
const preprocessJs = readFileSync(new URL("voiceover-preprocess.js",folder),"utf8");
const page = readFileSync(new URL("index.html",folder),"utf8");

function nodesForFixer(){
  const nodes = new Map();
  for(const id of [
    "voiceFixerInput","voiceFixerOutput","voiceFixerPacing","voiceFixerEnglish",
    "voiceFixerFromSection2","voiceFixerProcess","voiceFixerToTts","voiceFixerListen",
    "voiceFixerStatus","script"
  ])nodes.set(id,{value:"",dataset:{maxChars:"50000"},checked:true,
    addEventListener(){},classList:{toggle(){}}});
  return {getElementById:id=>nodes.get(id)||null};
}
const fixerWindow={};
runInNewContext(fixerJs,{window:fixerWindow,document:nodesForFixer()});
const {fixText,pronounceEnglish}=fixerWindow.BNVoiceFixer;

const preWindow={};
runInNewContext(preprocessJs,{window:preWindow,document:{getElementById:()=>null}});
const {cleanScript}=preWindow.BNVoiceoverPreprocessor;

test("Gen.G and common spellings sound 'den di', not 'dê'",()=>{
  for(const spelling of ["Gen.G","GEN.G","gen.g","Gen G","Gen-G","GenG"]){
    assert.equal(pronounceEnglish(spelling),"den di",spelling);
    assert.equal(fixText(spelling,{pacing:false,english:true}),"den di",spelling);
  }
});

test("standalone uppercase English G sounds 'di', without changing unrelated words",()=>{
  assert.equal(pronounceEnglish("Chữ G được đọc theo tiếng Anh."),"Chữ di được đọc theo tiếng Anh.");
  assert.equal(pronounceEnglish("GPU, GPS, Gigabytes, Gen.G."),"gi pi iu, GPS, gi ga bai, den di.");
  assert.equal(pronounceEnglish("giọng gió, 5g, Gen.Gaming, Agency"),
    "giọng gió, 5g, Gen.Gaming, Agency");
});

test("URL, email and code remain unchanged",()=>{
  const source="Xem https://example.com/Gen.G và admin@Gen.G.com, code \`Gen.G\`, còn Gen.G thi đấu.";
  assert.equal(pronounceEnglish(source),
    "Xem https://example.com/Gen.G và admin@Gen.G.com, code \`Gen.G\`, còn den di thi đấu.");
});

test("Section 02 preprocessor uses identical Gen.G pronunciation as Voice Fixer",()=>{
  const raw="# Lịch sử Gen.G\n\nGen.G là một đội tuyển Liên Minh Huyền Thoại của Hàn Quốc. Gen.G từng được biết đến với tên KSV.\n\n## Đội tuyển\n\nChữ G trong tên Gen.G phải được đọc theo tiếng Anh.";
  const result=cleanScript(raw).text;
  assert.match(result,/den di/);
  assert.ok(!/Gen\.G/i.test(result),"preprocessor left an unspoken Gen.G");
  assert.ok(!/\bdê\b/iu.test(result),"unexpected Vietnamese G pronunciation");
});

test("Direct Section 01 playback applies the pronunciation without rewriting editor text",()=>{
  assert.match(page,/window\.BNVoiceFixer\?\.pronounceEnglish\?\.\(part\.text\)/);
  assert.match(page,/new SpeechSynthesisUtterance\(spoken\)/);
  assert.match(page,/voice-fixer\.js\?v=20261101-g-pronunciation/);
});
