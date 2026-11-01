/* Regression tests: URL source ingestion for the BlogNaver voiceover pipeline.
 * Run: node --test scripts/test-tts-url-import.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const source=readFileSync(new URL("../static/tien-ich/text-to-speech/article-url-import.js",import.meta.url),"utf8");
const page=readFileSync(new URL("../static/tien-ich/text-to-speech/index.html",import.meta.url),"utf8");
const HOME="https://duynguyenaver.github.io/blognaver/tien-ich/text-to-speech/";
const ARTICLE="https://duynguyenaver.github.io/blognaver/bai-viet/gen-g-samsung-galaxy-ksv-lich-su-thanh-lap-lck-2026/";

function fixtureDocument(paragraph="Lịch sử Gen.G từ Samsung Galaxy đến KSV đánh dấu một cuộc chuyển đổi thương hiệu quan trọng của esports Hàn Quốc năm 2017."){
  const rows=[
    {tagName:"H2",textContent:"Samsung Galaxy và KSV",parentElement:{closest:()=>null}},
    {tagName:"P",textContent:paragraph,parentElement:{closest:()=>null}}
  ];
  const root={textContent:rows.map(n=>n.textContent).join(" "),cloneNode:()=>({
    textContent:rows.map(n=>n.textContent).join(" "),
    querySelectorAll:query=>query.startsWith("script,style")?[]:rows
  })};
  return {querySelector(selector){
    if(selector==="article.page.single .content")return root;
    if(selector.startsWith("article.page.single h1"))return {textContent:"Lịch sử Gen.G"};
    return null;
  }};
}

function makeNodes(){
  const ids=[
    "blogArticleImportForm","blogArticleUrl","blogArticleImportButton",
    "blogArticleImportStatus","blogArticleSourceLink",
    "voiceoverRaw","voiceoverOutput","voiceFixerInput","voiceFixerOutput","script",
    "voiceoverCopy","voiceoverToTts","voiceFixerToTts","voiceFixerListen",
    "voiceFixerPacing","voiceFixerEnglish","voiceoverStatus","voiceFixerStatus","stop"
  ];
  const nodes=new Map(ids.map(id=>[id,{
    value:"",disabled:false,checked:true,hidden:true,href:"",textContent:"",dataset:{},
    handlers:{},classList:{toggle(){},remove(){}},
    addEventListener(kind,fn){this.handlers[kind]=fn;},
    setAttribute(){},removeAttribute(){},dispatchEvent(){}
  }]));
  nodes.get("script").dataset.maxChars="50000";
  nodes.get("stop").disabled=true;
  nodes.get("blogArticleUrl").value=ARTICLE;
  return nodes;
}

function load({paragraph, prepared, fixed, responseOk=true,confirm=true}={}){
  const nodes=makeNodes();
  const doc=fixtureDocument(paragraph);
  const win={
    location:{href:HOME},
    confirm:()=>confirm,
    BNVoiceoverPreprocessor:{cleanScript:s=>({text:prepared??s})},
    BNVoiceFixer:{fixText:s=>fixed??s}
  };
  let called=0;
  const context={
    window:win,document:{getElementById:id=>nodes.get(id)||null},URL,AbortController,
    setTimeout,clearTimeout,Event:class Event{},
    fetch:async url=>{
      called++;
      return {
        ok:responseOk,status:responseOk?200:404,url,
        headers:{get:()=>"text/html; charset=utf-8"},
        text:async()=>"<html><article><div class='content'>Gen.G</div></article></html>"
      };
    },
    DOMParser:class DOMParser {parseFromString(){return doc;}}
  };
  runInNewContext(source,context);
  return {nodes,api:win.BNBlogArticleImport,getFetchCount:()=>called};
}

test("URL source form and ordered script loading exist",()=>{
  for(const id of ["blogArticleImportForm","blogArticleUrl","blogArticleImportStatus","blogArticleSourceLink"])
    assert.ok(page.includes('id="'+id+'"'));
  assert.match(page,/voiceover-preprocess\.js[^"]*" defer><\/script><script src="voice-fixer\.js" defer><\/script><script src="article-url-import\.js[^"]*" defer>/);
});

test("accepts only on-site article URL and strips tracking query/anchor",()=>{
  const {api}=load();
  assert.equal(api.normalizeArticleUrl(ARTICLE+"?utm_source=mail#story"),ARTICLE);
  assert.equal(api.normalizeArticleUrl("/blognaver/bai-viet/gen-g/"),"https://duynguyenaver.github.io/blognaver/bai-viet/gen-g/");
  for(const invalid of [
    "https://evil.example/blognaver/bai-viet/suspicious/",
    "https://duynguyenaver.github.io.evil.example/blognaver/bai-viet/fake/",
    "https://duynguyenaver.github.io/blognaver/tien-ich/text-to-speech/",
    "javascript:alert(1)",
    "https://duynguyenaver.github.io/blognaver/",
    "https://user:pass@duynguyenaver.github.io/blognaver/bai-viet/gen-g/"
  ]) assert.throws(()=>api.normalizeArticleUrl(invalid),Error,invalid);
});

test("extracts title and main blog body, not chrome",()=>{
  const {api}=load();
  const article=api.extractArticle(fixtureDocument());
  assert.ok(article.raw.startsWith("# Lịch sử Gen.G"));
  assert.match(article.raw,/Samsung Galaxy và KSV/);
  assert.match(article.raw,/cuộc chuyển đổi thương hiệu/);
  assert.doesNotMatch(article.raw,/menu đăng nhập|đăng ký nhận tin/);
});

test("imports article and fills all three sections in order",async()=>{
  const {nodes,api,getFetchCount}=load();
  await api.importArticle();
  assert.equal(getFetchCount(),1);
  const raw=nodes.get("voiceoverRaw").value;
  assert.match(raw,/Samsung Galaxy/);
  assert.equal(nodes.get("voiceoverOutput").value,raw);
  assert.equal(nodes.get("voiceFixerInput").value,raw);
  assert.equal(nodes.get("voiceFixerOutput").value,raw);
  assert.equal(nodes.get("script").value,raw);
  assert.equal(nodes.get("voiceoverCopy").disabled,false);
  assert.equal(nodes.get("voiceFixerListen").disabled,false);
  assert.equal(nodes.get("blogArticleSourceLink").href,ARTICLE);
  assert.equal(nodes.get("blogArticleSourceLink").hidden,false);
});

test("keeps all text in Sections 02 and 03 but refuses >50,000 in Section 01",async()=>{
  const {nodes,api}=load({prepared:"N".repeat(50001),fixed:"F".repeat(50001)});
  nodes.get("script").value="Kịch bản cũ cần giữ nguyên";
  await api.importArticle();
  assert.equal(nodes.get("voiceoverOutput").value.length,50001);
  assert.equal(nodes.get("voiceFixerOutput").value.length,50001);
  assert.equal(nodes.get("script").value,"Kịch bản cũ cần giữ nguyên");
  assert.match(nodes.get("blogArticleImportStatus").textContent,/KHÔNG cắt văn bản/);
});

test("a declined replacement preserves all five editable fields",async()=>{
  const {nodes,api}=load({confirm:false});
  for(const id of ["voiceoverRaw","voiceoverOutput","voiceFixerInput","voiceFixerOutput","script"])nodes.get(id).value="Giữ nguyên";
  await api.importArticle();
  for(const id of ["voiceoverRaw","voiceoverOutput","voiceFixerInput","voiceFixerOutput","script"])assert.equal(nodes.get(id).value,"Giữ nguyên");
});

test("404 does not overwrite the user's draft",async()=>{
  const {nodes,api}=load({responseOk:false});
  nodes.get("script").value="Draft hiện tại";
  await api.importArticle();
  assert.equal(nodes.get("script").value,"Draft hiện tại");
  assert.match(nodes.get("blogArticleImportStatus").textContent,/HTTP 404/);
});

test("blocks changing any field during active speech or WAV capture",async()=>{
  const {nodes,api,getFetchCount}=load();
  nodes.get("stop").disabled=false;
  await api.importArticle();
  assert.equal(getFetchCount(),0);
  assert.match(nodes.get("blogArticleImportStatus").textContent,/Bấm Dừng/);
});
