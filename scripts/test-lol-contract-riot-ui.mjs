/* node --test scripts/test-lol-contract-riot-ui.mjs
 * Regression contract for fan-made LoL-inspired visual skin and stable data UI.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = new URL("../static/tien-ich/lol-contract-tracker/", import.meta.url);
const html = readFileSync(new URL("index.html",root),"utf8");
const css = readFileSync(new URL("riot-theme.css",root),"utf8");
const tracker = readFileSync(new URL("tracker.js",root),"utf8");
const archive = readFileSync(new URL("archive.js",root),"utf8");
test("local theme CSS layers over stable stylesheet",()=>{
 const base=html.indexOf('href="tracker.css"'),skin=html.indexOf('href="riot-theme.css"'),app=html.indexOf('src="tracker.js"');
 assert.ok(base>=0&&skin>base&&app>skin,"skin must load after base and before app JS");
 assert.ok(html.includes('src="archive.js"'));
 assert.ok(css.includes("Original geometric art"));
 assert.ok(html.includes("NOT AFFILIATED WITH RIOT GAMES"));
});
test("all JavaScript-referenced DOM IDs remain unique",()=>{
 const ids=[...new Set([...tracker.matchAll(/\$\("([a-zA-Z][a-zA-Z0-9]+)"\)/g),...archive.matchAll(/\$\("([a-zA-Z][a-zA-Z0-9]+)"\)/g)].map(m=>m[1]))];
 for(const id of ids)assert.equal([...html.matchAll(new RegExp('\\bid="'+id+'"','g'))].length,1,"Broken ID "+id);
 assert.ok(ids.length>=25);
});
test("all navigation anchors target existing sections",()=>{
 for(const id of ["contracts","changes","transfers","historical","manualImport"]){
  assert.ok(html.includes('href="#'+id+'"'));
  assert.ok(html.includes('id="'+id+'"'));
 }
 assert.ok(html.includes('id="downloadCsv"'));
 assert.ok(html.includes('id="sourceDates"'));
});
test("actual runtime status classes are themed",()=>{
 for(const x of ["future","soon","expired","unknown","confirmed","rumor"])
  assert.ok(css.includes(".tag."+x),"Missing .tag."+x);
 for(const x of [".hero-graphic",".hero h1",".table-scroll thead th",".archive-workspace",".source-tag",".stat",".pager",".event",".tab.active",".notice",".archive-day"])
  assert.ok(css.includes(x),"Missing style "+x);
 assert.ok(css.includes("position:sticky"));
});
test("small screen and accessibility requirements",()=>{
 assert.match(css,/@media\s*\(max-width:790px\)/);
 assert.match(css,/@media\s*\(max-width:475px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.ok(html.includes('aria-live="polite"'));
});
test("source status never misrepresents community archive as official Riot contracts",()=>{
 assert.ok(html.includes("docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o"));
 assert.ok(html.includes("lol.fandom.com/wiki/Archive:Global_Contract_Database"));
 assert.ok(html.includes("Wiki cộng đồng"));
 assert.ok(html.includes("không đồng nghĩa"));
});
