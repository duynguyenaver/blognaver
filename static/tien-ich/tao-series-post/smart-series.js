(()=>{"use strict";
const $=id=>document.getElementById(id),source=$("sourceUrl"),transcript=$("transcript"),name=$("customSeries"),select=$("series"),status=$("seriesSuggestionStatus"),list=$("seriesSuggestionList");
if(!source||!transcript||!name||!select||!list)return;
let timer=0,request=0,manual=false;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slug=s=>norm(s).replace(/ +/g,"-");
const rules=[]; // Centralized, evidence-based categories are loaded from source-fidelity.js.
async function catalog(){const map=new Map();[...select.options].forEach(o=>map.set(slug(o.textContent),{id:o.value,name:o.textContent}));try{Object.entries(JSON.parse(localStorage.getItem("bn_series_custom_names_v1")||"{}")).forEach(([id,n])=>map.set(slug(n),{id,name:n}))}catch{}
try{const r=await fetch("https://raw.githubusercontent.com/duynguyenaver/blognaver/main/data/series.yaml",{cache:"no-store"});if(r.ok){const t=await r.text();for(const m of t.matchAll(/- id:\s*([^\n]+)\n\s*title:\s*["']?([^\n"']+)/g))map.set(slug(m[2]),{id:m[1].trim(),name:m[2].trim()})}}catch{}
return [...map.values()]}
function show(names,existing){list.replaceChildren();for(const proposed of names){const match=existing.find(x=>slug(x.name)===slug(proposed));const btn=document.createElement("button");btn.type="button";btn.className="ghost smart-series-option";btn.textContent=proposed+(match?" · Đã có":" · Gợi ý mới");btn.onclick=()=>{if(match&&[...select.options].some(o=>o.value===match.id)){select.value=match.id;name.value=""}else{window.BNSeriesCatalog?.register(match?.name||proposed,true);name.value=""}manual=false;status.textContent="Đã chọn: "+proposed+". Bạn có thể đổi tên trước khi đăng."};list.append(btn)}}
async function suggest(explicit){const seq=++request,text=[source.value,transcript.value].filter(Boolean).join("\n");if(text.trim().length<18){if(explicit)status.textContent="Cần thêm nội dung URL hoặc phụ đề để đề xuất.";return}if(manual&&!explicit)return;
status.textContent="Đang phân tích nội dung…";const existing=await catalog();if(seq!==request)return;
let context=text;
if(source.value.trim()&&transcript.value.trim().length<100){try{
 const u=new URL(source.value);if(/(^|\\.)(youtube\\.com|youtu\\.be)$/.test(u.hostname)){
 const ctl=new AbortController(),tid=setTimeout(()=>ctl.abort(),5000);
 try{const res=await fetch("https://noembed.com/embed?url="+encodeURIComponent(u.href),{signal:ctl.signal});if(res.ok){const data=await res.json();if(data.title)context+="\\nVideo title: "+data.title}}finally{clearTimeout(tid)}
 }}catch{}}
const classified=window.BNSourceFidelity?.classify(context);
const fallback=classified?.clear?[classified.label,...classified.ranked.filter(x=>x.score>=2&&x.id!==classified.topic).slice(0,2).map(x=>x.name)]:[];
const prompt="Phân tích chủ đề TRUNG TÂM của nội dung. KHÔNG phân loại chỉ vì từ travel hay booking xuất hiện ngẫu nhiên. Đề xuất 3 tên series blog BẰNG TIẾNG VIỆT CÓ DẤU, tự nhiên, bao quát; chỉ tái sử dụng series cũ khi cùng chủ đề. Chỉ trả về JSON array của 3 chuỗi.";
const input="Series hiện có: "+existing.map(x=>x.name).join("; ")+"\nNguồn:\n"+context.slice(0,10000);
const parse=text=>{const match=String(text||"").match(/\[[\s\S]*?\]/);if(!match)throw Error("AI không trả danh sách JSON");return [...new Set(JSON.parse(match[0]).filter(x=>typeof x==="string"&&x.trim().length>=5&&x.length<=90).map(x=>x.trim()))].slice(0,3)};
const groqKey=$("groqKey")?.value.trim(),geminiKey=$("geminiKey")?.value.trim();
let choices=[],provider="",failure="";
if(groqKey){try{
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);
 try{const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",signal:ctl.signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+groqKey},body:JSON.stringify({model:"openai/gpt-oss-20b",temperature:.2,max_completion_tokens:450,messages:[{role:"system",content:prompt},{role:"user",content:input}]})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error("HTTP "+r.status+" "+(d.error?.message||""));choices=parse(d.choices?.[0]?.message?.content);provider="Groq"}finally{clearTimeout(timer)}
}catch(e){failure="Groq: "+e.message}}
if(!choices.length&&geminiKey){try{
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),22000);
 try{const discovery=await fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(geminiKey),{signal:ctl.signal});const models=await discovery.json();if(!discovery.ok)throw Error("Models HTTP "+discovery.status);const available=(models.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent")&&/flash/i.test(m.name)&&!/preview|experimental|deprecated/i.test(m.name)).sort((a,b)=>b.name.localeCompare(a.name,undefined,{numeric:true}));if(!available.length)throw Error("Không tìm thấy Gemini Flash hoạt động");const r=await fetch("https://generativelanguage.googleapis.com/v1beta/"+available[0].name+":generateContent?key="+encodeURIComponent(geminiKey),{method:"POST",signal:ctl.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt+"\n"+input}]}],generationConfig:{temperature:.2,maxOutputTokens:450}})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error("HTTP "+r.status+" "+(d.error?.message||""));choices=parse((d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join(""));provider="Gemini"}finally{clearTimeout(timer)}
}catch(e){failure+=(failure?" | ":"")+"Gemini: "+e.message}}
if(seq!==request||(!explicit&&manual))return;
if(!choices.length)choices=fallback;
if(!choices.length){if(!manual){select.value="khac";name.value="";}status.textContent=failure?"AI gặp lỗi: "+failure+". Bộ phân loại dự phòng cũng chưa đủ thông tin.": "Chưa kết nối Groq/Gemini; hãy kết nối AI để phân tích ngữ nghĩa thay vì chỉ dùng từ khóa.";list.replaceChildren();return}
show(choices,existing);
status.textContent="Có "+choices.length+" gợi ý · "+(provider?"AI "+provider:"phân loại dự phòng")+(failure&&!provider?" · "+failure:"")+". Bấm chọn để sử dụng.";
}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>suggest(false),900)}
source.addEventListener("input",schedule);transcript.addEventListener("input",schedule);name.addEventListener("input",()=>manual=!!name.value.trim());$("suggestSeriesBtn").addEventListener("click",()=>{manual=false;suggest(true)});
})();