/* node --test scripts/test-lol-contract-tracker.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL("../static/tien-ich/lol-contract-tracker/tracker.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../static/tien-ich/lol-contract-tracker/index.html",import.meta.url),"utf8");
const bootstrap=JSON.parse(readFileSync(new URL("../static/tien-ich/lol-contract-tracker/gcd.json",import.meta.url),"utf8"));
function boot(){
  const elements=new Map();
  const node=id=>{
    if(elements.has(id))return elements.get(id);
    const e={value:"",textContent:"",style:{},dataset:{},classList:{toggle(){}},addEventListener(){},replaceChildren(){},append(){},remove(){},disabled:false,files:[]};
    elements.set(id,e);return e;
  };
  const context={window:{},document:{getElementById:node,querySelectorAll:()=>[],createElement:tag=>node("node-"+Math.random())},setTimeout(){},URL,console};
  // Do not start async fetch during pure-function unit tests. UI rendering is covered by CI smoke/build.
  const isolated=source.replace(/\bload\(\);\s*\}\)\(\);$/,"})();");
  assert.notEqual(isolated,source,"Could not isolate startup");
  runInNewContext(isolated,context);
  return context.window.BNLoLContracts;
}
const core=boot();
test("page exposes official GCD source and required interactive controls",()=>{
  for(const id of ["search","league","team","status","sort","contractRows","changesList","transfersList","importFile","downloadCsv"])
    assert.ok(html.includes('id="'+id+'"'),"Missing "+id);
  assert.ok(html.includes("1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o"));
  assert.ok(html.includes("../../access-gate.js"));
});
test("CSV handles quotes, commas, line breaks and limits ambiguity",()=>{
  const rows=core.parseCSV('Team,Player Name,Contract End Date\n"Test, Team","A""B",2027-11-15\n');
  assert.equal(rows[1][0],"Test, Team");assert.equal(rows[1][1],'A"B');
  assert.throws(()=>core.parseCSV('Team,Name\n"unfinished'),/chưa đóng/);
});
test("recognizes official contract columns and rejects missing headers",()=>{
  const csv='Updated,2026-10-01\nTeam Name,Player Name,End Date,Role\nT1,Faker,2029-11-19,Mid\nT1,Peyz,2028-11-20,ADC\n';
  const rows=core.parseContractsCSV(csv,"LCK");
  assert.equal(rows.length,2);assert.equal(rows[0].handle,"Faker");assert.equal(rows[0].endDate,"2029-11-19");
  assert.throws(()=>core.parseContractsCSV("abc,def\nx,y","LCK"),/Thiếu header/);
});
test("date-based status never asserts free agency, renewal or transfer",()=>{
  const now=new Date("2026-11-01T00:00:00Z");
  assert.equal(core.status({endDate:"2026-11-16"},now).key,"soon");
  assert.equal(core.status({endDate:"2028-11-20"},now).key,"future");
  assert.equal(core.status({endDate:"2025-11-15"},now).label,"Ngày GCD đã qua");
  assert.equal(core.status({endDate:""},now).key,"unknown");
  assert.ok(!core.status({endDate:"2025-11-15"},now).label.includes("Free Agent"));
});
test("snapshot is validated; false dates become unspecified rather than fabricated",()=>{
  const rows=core.snapshot({rows:[{handle:"Test",team:"T1",league:"LCK",endDate:"2026-02-30"}]});
  assert.equal(rows.rows[0].endDate,"");
  assert.throws(()=>core.snapshot({rows:"bad"}),/không hợp lệ/);
  assert.ok(Array.isArray(bootstrap.rows));
  if(bootstrap.rows.length){
    assert.ok(bootstrap.fetchedAt,"Real snapshot must disclose retrieval time");
    assert.ok(bootstrap.regions?.length>=1,"Real snapshot must list tab sources");
    assert.ok(bootstrap.rows.every(r=>r.sourceUrl.startsWith("https://docs.google.com/spreadsheets/")));
    assert.ok(bootstrap.rows.every(r=>r.handle&&r.team&&r.league));
  }
});
