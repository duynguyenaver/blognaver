/* node --test scripts/test-lol-contract-archive.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const root=new URL("../static/tien-ich/lol-contract-tracker/",import.meta.url);
const source=readFileSync(new URL("archive.js",root),"utf8");
const html=readFileSync(new URL("index.html",root),"utf8");
const dataset=JSON.parse(readFileSync(new URL("archive.json",root),"utf8"));
const elements=new Map();
function element(id){
 if(elements.has(id))return elements.get(id);
 const v={textContent:"",value:"KR",href:"",classList:{toggle(){}},replaceChildren(){},append(){},addEventListener(){},add(){},style:{}};
 elements.set(id,v);return v;
}
const context={window:{},document:{getElementById:element,createElement:()=>({textContent:"",className:"",append(){}})},Option:function(){},URL,console};
const isolated=source.replace(/\binit\(\);\s*\}\)\(\);\s*$/,"})();");
assert.notEqual(isolated,source,"Failed to isolate async UI startup");
runInNewContext(isolated,context);
const core=context.window.BNLoLArchive;
test("archive has explicit provenance and separate historical UI",()=>{
 assert.equal(dataset.sourceType,"unofficial-community-history");
 assert.ok(html.includes('id="historical"'));
 assert.ok(html.includes('id="archiveRegion"'));
 assert.ok(html.includes('src="archive.js"'));
 assert.ok(html.includes("CC BY-SA 3.0"));
 assert.ok(dataset.regions.some(r=>r.code==="VN" && r.dates.length));
});
test("history date is validated; path and bogus dates rejected",()=>{
 assert.equal(core.validDate("2026-02-29"),false);
 assert.equal(core.validDate("2024-02-29"),true);
 assert.equal(core.archiveURL("../KR","2026-01-19"),"");
 assert.equal(core.archiveURL("KR","javascript:alert(1)"),"");
 assert.equal(core.archiveURL("KR","2026-01-19"),"https://lol.fandom.com/wiki/Archive:Global_Contract_Database/KR/2026-01-19");
});
test("deduplicates dates and drops unrecognized or malformed region entries",()=>{
 const output=core.validateArchive({version:1,sourceType:"unofficial-community-history",regions:[
   {code:"KR",dates:["2026-01-19","2026-01-19","2026-02-30","2025-01-01"]},
   {code:"../../../evil",dates:["2026-01-19"]}
 ]});
 assert.deepEqual(Array.from(output.regions[0].dates),["2026-01-19","2025-01-01"]);
 assert.equal(output.regions.length,1);
 assert.throws(()=>core.validateArchive({version:2,regions:[]}),/không hợp lệ/);
});
