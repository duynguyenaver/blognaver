(()=>{"use strict";
const clean=s=>String(s||"").replace(/\u00a0/g," ").trim();
function gridFromText(raw){
 const text=String(raw||"").replace(/\r/g,"").trim(),lines=text.split("\n").map(clean).filter(Boolean);
 if(!lines.length)return null;
 if(lines.some(l=>l.includes("\t"))){const rows=lines.map(l=>l.split("\t").map(clean));const n=Math.max(...rows.map(r=>r.length));return n>=2&&rows.length>=2&&rows.every(r=>r.length===n)?rows:null}
 if(lines.every(l=>l.startsWith("|")&&l.endsWith("|"))){const rows=lines.map(l=>l.slice(1,-1).split("|").map(clean)).filter(r=>!r.every(x=>/^:?-{3,}:?$/.test(x)));return rows.length>=2&&rows.every(r=>r.length===rows[0].length)?rows:null}
 const header=lines.slice(0,3).map(x=>x.toLocaleLowerCase());
 if(header.join("|")==="tiếng hàn|tiếng việt|english"&&lines.length>=9&&(lines.length-3)%3===0){const rows=[lines.slice(0,3)];for(let i=3;i<lines.length;i+=3)rows.push(lines.slice(i,i+3));return rows}
 return null;
}
function gridFromHTML(source){
 if(!source||!/<table[\s>]/i.test(source))return null;
 const parsed=new DOMParser().parseFromString(source,"text/html"),table=parsed.querySelector("table");if(!table)return null;
 const rows=[...table.querySelectorAll("tr")].map(tr=>[...tr.children].filter(el=>/^(TD|TH)$/.test(el.tagName)).map(el=>clean(el.textContent)));
 return rows.length>=2&&rows[0].length>=2&&rows.every(r=>r.length===rows[0].length)?rows:null;
}
function html(rows){const t=document.createElement("table");t.className="bn-data-table";t.setAttribute("role","table");for(let i=0;i<rows.length;i++){const tr=document.createElement("tr");for(const val of rows[i]){const cell=document.createElement(i===0?"th":"td");cell.textContent=val;tr.append(cell)}t.append(tr)}return t.outerHTML}
function markdown(rows){return "| "+rows[0].map(x=>x.replace(/\|/g,"\\|")).join(" | ")+" |\n| "+rows[0].map(()=>"---").join(" | ")+" |\n"+rows.slice(1).map(row=>"| "+row.map(x=>x.replace(/\|/g,"\\|").replace(/\n/g," ")).join(" | ")+" |").join("\n")}
function register(){
 if(!window.Quill)return;
 const BlockEmbed=Quill.import("blots/block/embed");
 class DataTable extends BlockEmbed{
  static blotName="bnTable";static tagName="div";static className="bn-table-wrap";
  static create(value){const node=super.create();const rows=Array.isArray(value?.rows)?value.rows:[];node.innerHTML=html(rows);node.setAttribute("contenteditable","false");return node}
  static value(node){return{rows:[...node.querySelectorAll("tr")].map(tr=>[...tr.children].map(td=>td.textContent))}}
 }
 Quill.register(DataTable,true);
}
function setup(){
 const root=document.querySelector("#editor");if(!root||!window.Quill)return;
 let n=0;const timer=setInterval(()=>{const q=Quill.find(root);if(!q&&++n<80)return;clearInterval(timer);if(!q)return;
 root.addEventListener("paste",event=>{const cb=event.clipboardData,rows=gridFromHTML(cb?.getData("text/html"))||gridFromText(cb?.getData("text/plain"));if(!rows)return;event.preventDefault();event.stopImmediatePropagation();const range=q.getSelection(true)||{index:q.getLength()-1};q.insertEmbed(range.index,"bnTable",{rows},"user");q.setSelection(range.index+1,0,"silent")},true);
 const td=window.TurndownService?.prototype;if(td&&!window.__bnTableTurndown){const original=td.constructor;window.__bnTableTurndown=true;}
 const btn=document.querySelector("#insertTableBtn");if(btn)btn.addEventListener("click",()=>{const raw=prompt("Dán dữ liệu bảng (các cột cách nhau bằng Tab, hoặc bảng Markdown). Ví dụ: Tiếng Hàn [Tab] Tiếng Việt [Tab] English");if(!raw)return;const rows=gridFromText(raw);if(!rows){alert("Không nhận dạng được bảng. Hãy dán tối thiểu 2 hàng, mỗi hàng có ít nhất 2 cột.");return}const range=q.getSelection(true)||{index:q.getLength()-1};q.insertEmbed(range.index,"bnTable",{rows},"user");q.setSelection(range.index+1,0,"silent")});
 },250)
}
window.BlogNaverTable={gridFromText,gridFromHTML,markdown,html};
register();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();