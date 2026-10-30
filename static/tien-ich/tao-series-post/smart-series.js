(()=>{"use strict";
const $=id=>document.getElementById(id),source=$("sourceUrl"),transcript=$("transcript"),name=$("customSeries"),select=$("series"),status=$("seriesSuggestionStatus"),list=$("seriesSuggestionList");
if(!source||!transcript||!name||!select||!list)return;
let timer=0,request=0,manual=false;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const slug=s=>norm(s).replace(/ +/g,"-");
const rules=[
["Công nghệ đặt vé và du lịch trực tuyến","ota","booking","ticket","refund","travel","reservation","dat ve","du lich"],
["Giải mã công nghệ hàng không","airline","aviation","flight","airport","airfare","may bay","hang khong"],
["Trí tuệ nhân tạo và tương lai","artificial intelligence","openai","machine learning","gemini","chatgpt","tri tue nhan tao"],
["An ninh mạng và dữ liệu số","cyber","hacker","privacy","security","data breach"],
["WeChat và hệ sinh thái Trung Quốc","wechat","weixin","tencent"],
["Hàn Quốc qua góc nhìn công nghệ","korea","korean","seoul","samsung"],
["Kinh tế và chiến lược doanh nghiệp","economy","investment","business","market","startup"],
["Chuyển đổi số và công nghệ","digital","software","cloud","automation","technology"]
];
async function catalog(){const map=new Map();[...select.options].forEach(o=>map.set(slug(o.textContent),{id:o.value,name:o.textContent}));try{Object.entries(JSON.parse(localStorage.getItem("bn_series_custom_names_v1")||"{}")).forEach(([id,n])=>map.set(slug(n),{id,name:n}))}catch{}
try{const r=await fetch("https://raw.githubusercontent.com/duynguyenaver/blognaver/main/data/series.yaml",{cache:"no-store"});if(r.ok){const t=await r.text();for(const m of t.matchAll(/- id:\s*([^\n]+)\n\s*title:\s*["']?([^\n"']+)/g))map.set(slug(m[2]),{id:m[1].trim(),name:m[2].trim()})}}catch{}
return [...map.values()]}
function show(names,existing){list.replaceChildren();for(const proposed of names){const match=existing.find(x=>slug(x.name)===slug(proposed));const btn=document.createElement("button");btn.type="button";btn.className="ghost smart-series-option";btn.textContent=proposed+(match?" · Đã có":" · Gợi ý mới");btn.onclick=()=>{if(match&&[...select.options].some(o=>o.value===match.id)){select.value=match.id;name.value=""}else{name.value=match?.name||proposed}manual=false;status.textContent="Đã chọn: "+proposed+". Bạn có thể đổi tên trước khi đăng."};list.append(btn)}}
async function suggest(explicit){const seq=++request,text=[source.value,transcript.value].filter(Boolean).join("\n");if(text.trim().length<18){if(explicit)status.textContent="Cần thêm nội dung URL hoặc phụ đề để đề xuất.";return}if(manual&&!explicit)return;
status.textContent="Đang phân tích nội dung…";const existing=await catalog();if(seq!==request)return;
const input=norm(text).slice(0,22000);let choices=rules.map(r=>({name:r[0],score:r.slice(1).reduce((v,t)=>v+(input.includes(norm(t))?1:0),0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).map(x=>x.name).slice(0,3);
const key=$("groqKey")?.value.trim();
if(key&&explicit){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);try{
const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",signal:ctl.signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:"openai/gpt-oss-20b",max_completion_tokens:200,temperature:.3,messages:[{role:"system",content:"Đề xuất đúng 3 tên series blog tiếng Việt có dấu, không suy diễn dữ kiện. Ưu tiên tái dùng series có sẵn nếu phù hợp. Trả về JSON array 3 chuỗi, không thêm văn bản."},{role:"user",content:"Series có sẵn: "+existing.map(x=>x.name).join("; ")+"\nURL và phụ đề:\n"+text.slice(0,6000)}]})});
if(res.ok){const data=await res.json(),txt=data.choices?.[0]?.message?.content||"",match=txt.match(/\[[\s\S]*?\]/);if(match){const arr=JSON.parse(match[0]);if(Array.isArray(arr))choices=[...arr.filter(x=>typeof x==="string"&&x.length>=4&&x.length<=90),...choices].slice(0,3)}}}catch{}finally{clearTimeout(timer)}}
if(seq!==request||(!explicit&&manual))return;choices=[...new Set(choices)];if(!choices.length){status.textContent="Chưa đủ tín hiệu để gợi ý. Có thể nhập tên thủ công.";list.replaceChildren();return}show(choices,existing);status.textContent="Có "+choices.length+" gợi ý. Bấm chọn để sử dụng."}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>suggest(false),900)}
source.addEventListener("input",schedule);transcript.addEventListener("input",schedule);name.addEventListener("input",()=>manual=!!name.value.trim());$("suggestSeriesBtn").addEventListener("click",()=>{manual=false;suggest(true)});
})();