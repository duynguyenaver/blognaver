// Regression guard: CMS V2 navigation must operate on all sections, not one Element.
// Run: node scripts/test-cms-v2-router.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const code=fs.readFileSync("static/tien-ich/cms-v2/v2.js","utf8");
const begin=code.indexOf("const validPages="),end=code.indexOf('\n$("[data-page]").forEach(b=>b.onclick',begin);
assert.ok(begin>=0&&end>begin,"Route implementation exists");
const route=code.slice(begin,end);
const names=["dashboard","posts","editor","media","templates","collections","transcripts","history","publishing","bilingual","integrations"];
const views=names.map(name=>({dataset:{view:name},hidden:name!=="dashboard"}));
const buttons=names.map(name=>({dataset:{page:name},classList:{toggle(cls,on){this.active=on}},setAttribute(k,v){this[k]=v}}));
const tools={open:false};
let hash="",loaded=[];
const context={
 $$:selector=>selector==="[data-view]"?views:selector==="[data-page]"?buttons:[],
 document:{getElementById:id=>id==="v2ToolsMenu"?tools:null},
 location:{get hash(){return hash}},
 history:{pushState(_s,_t,url){hash=url}},
 window:{scrollTo(){}},loadPosts(){loaded.push("posts")},loadMedia(){loaded.push("media")}
};
vm.createContext(context);vm.runInContext(route+";globalThis.activate=page;",context);
for(const name of names){context.activate(name);assert.equal(hash,"#"+name,"deep link "+name);assert.equal(views.filter(x=>!x.hidden).length,1,"exactly one visible view");assert.equal(views.find(x=>!x.hidden).dataset.view,name,"active view "+name);assert.equal(buttons.find(x=>x.dataset.page===name).classList.active,true,"active navigation "+name)}
assert.equal(tools.open,true,"TOOLS opened for its child route");
context.activate("not-a-page");assert.equal(views.find(x=>!x.hidden).dataset.view,"dashboard","invalid route falls back");
assert.ok(loaded.includes("media")&&loaded.includes("posts"),"page initializers fire");
console.log("PASS: CMS V2 router covers "+names.length+" permalinks and navigation.");
