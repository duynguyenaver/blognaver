(()=>{"use strict";
const $=s=>document.querySelector(s);
const state={lastAutoSummary:"",lastAutoTags:"",lastAutoCategory:"",manual:{summary:false,tags:false,category:false},timer:0,ready:false,loading:false};
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const sentenceSplit=s=>clean(s).split(/(?<=[.!?。！？])\s+|\n+/u).map(clean).filter(Boolean);
const size=s=>Array.from(s).length;
function editor(){try{return window.Quill?.find($("#editor"))||null}catch{return null}}
function content(){return clean(editor()?.getText()||"")}
function summarize(title,body){
 const parts=sentenceSplit(body).filter(s=>s.length>=28&&!/^(https?:\/\/|#+\s)/.test(s));
 let selected=[];let count=0;
 for(const part of parts){if(count>=150)break;let next=part.slice(0,160-count);if(next.length<part.length){const at=next.lastIndexOf(" ");if(at>55)next=next.slice(0,at)}selected.push(next);count+=size(next)+1;if(count>=110)break}
 let result=clean(selected.join(" "));
 if(!result&&title)result=clean(title+". "+body.slice(0,140));
 if(result.length>160){result=result.slice(0,160);const last=result.lastIndexOf(" ");if(last>110)result=result.slice(0,last)}
 return result;
}
const tax=[
 ["Hàng không",/hàng không|máy bay|đặt vé|chuyến bay|airline|aviation|항공|항공권/i,["Hàng không","Vé máy bay"]],
 ["Du lịch",/du lịch|visa|khách sạn|điểm đến|travel|tourism|여행/i,["Du lịch"]],
 ["Tiếng Hàn",/tiếng hàn|topik|한국어|한국어능력시험/i,["Tiếng Hàn","TOPIK"]],
 ["Công nghệ",/hugo|blowfish|github|cms|javascript|website|phần mềm|công nghệ|software|technology|\bapi\b/i,["Công nghệ"]],
 ["Hướng dẫn",/hướng dẫn|how to|tutorial|cách làm/i,["Hướng dẫn"]]
];
function suggest(title,body){
 const text=title+" "+body.slice(0,9000), hits=tax.map(([cat,re,tags])=>({cat,n:(text.match(new RegExp(re.source,"gi"))||[]).length,tags})).sort((a,b)=>b.n-a.n);
 const best=hits[0];const category=best.n?best.cat:"Cuộc sống";
 const topicTerms=[["Hugo",/hugo/i],["Blowfish",/blowfish/i],["GitHub Pages",/github pages/i],["GitHub",/github/i],["CMS",/\bcms\b/i],["SEO",/\bseo\b/i],["AI",/trí tuệ nhân tạo|\bai\b/i],["TOPIK",/topik/i],["Visa",/visa/i],["JavaScript",/javascript/i]];
 let tags=topicTerms.filter(([_,re])=>re.test(text)).map(([t])=>t).slice(0,6);if(!tags.length&&best.n)tags=best.tags;
 return {category,tags};
}
function score(){
 const title=clean($("#title")?.value),body=content(),summary=clean($("#summary")?.value),slug=clean($("#slug")?.value),tags=clean($("#tags")?.value),category=clean($("#category")?.value),cover=clean($("#cover")?.value);
 const words=body?body.split(/\s+/u).length:0;
 const html=editor()?.root?.innerHTML||"";
 const checks=[
 {name:"Tiêu đề rõ ràng (25–65 ký tự)",weight:15,ok:size(title)>=25&&size(title)<=65},
 {name:"Mô tả phù hợp (110–160 ký tự)",weight:20,ok:size(summary)>=110&&size(summary)<=160},
 {name:"Đường dẫn ngắn, dễ đọc",weight:10,ok:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=75},
 {name:"Có category",weight:10,ok:!!category},
 {name:"Có ít nhất một tag",weight:5,ok:!!tags},
 {name:"Nội dung từ 300 từ",weight:15,ok:words>=300},
 {name:"Có heading phân cấp",weight:10,ok:/<h[23]\b/i.test(html)},
 {name:"Có liên kết tham khảo",weight:5,ok:/<a\b/i.test(html)},
 {name:"Có ảnh bìa",weight:5,ok:/^https:\/\//i.test(cover)},
 {name:"Có chiều sâu (600 từ trở lên)",weight:5,ok:words>=600}
 ];
 const points=checks.reduce((n,c)=>n+(c.ok?c.weight:0),0);
 const el=$("#seoScore"),bar=$("#seoMeter"),rating=$("#seoRating");if(el)el.textContent=String(points);
 if(bar){bar.style.width=points+"%";bar.dataset.level=points>=80?"good":points>=50?"medium":"low"}
 if(rating)rating.textContent=points>=80?"Tốt":points>=50?"Cần cải thiện":words||title?"Còn thiếu thông tin":"Chưa đủ dữ liệu";
 const audit=$("#seoAudit");if(audit){audit.replaceChildren();let heading=document.createElement("strong");heading.textContent="SEO Checklist · "+checks.filter(c=>c.ok).length+"/"+checks.length+" tiêu chí";audit.append(heading);const list=document.createElement("ul");for(const c of checks){const li=document.createElement("li");li.className=c.ok?"pass":"pending";li.textContent=(c.ok?"✓ ":"○ ")+c.name+" (+"+c.weight+")";list.append(li)}audit.append(list)}
}
function setAuto(field,value){
 const node=$("#"+field);if(!node||state.manual[field]||!value)return;
 if(node.value===value)return;
 // Respect existing manually-authored metadata when editing historical posts.
 if(state.lastAutoSummary===""&&field==="summary"&&node.value.trim()&&!state.loading){state.manual.summary=true;return}
 if(field==="tags"&&node.value.trim()&&state.lastAutoTags===""){state.manual.tags=true;return}
 if(field==="category"&&node.value.trim()&&state.lastAutoCategory===""){state.manual.category=true;return}
 node.value=value;
 if(field==="summary")state.lastAutoSummary=value;
 if(field==="tags")state.lastAutoTags=value;
 if(field==="category")state.lastAutoCategory=value;
 node.dispatchEvent(new Event("input",{bubbles:true}));
}
function generate(){
 if(!$("#seoAuto")?.checked){score();return}
 const title=clean($("#title")?.value),body=content();
 if(!title&&!body){score();return}
 const tax=suggest(title,body);
 if(body.length>=45)setAuto("summary",summarize(title,body));
 setAuto("category",tax.category);
 if(tax.tags.length)setAuto("tags",tax.tags.join(", "));
 const mode=$("#seoMode");if(mode)mode.textContent="Đang tự cập nhật từ tiêu đề và nội dung. Bạn có thể chỉnh thủ công bất kỳ lúc nào.";
 score();
}
function queue(){clearTimeout(state.timer);state.timer=setTimeout(generate,500)}
function init(){
 if(!$("#seoScore"))return;
 for(const field of ["summary","tags","category"]){const node=$("#"+field);node?.addEventListener("input",()=>{if(!$("#seoAuto")?.checked)return;const last=field==="summary"?state.lastAutoSummary:field==="tags"?state.lastAutoTags:state.lastAutoCategory;if(node.value!==last&&state.ready)state.manual[field]=true})}
 $("#seoAuto")?.addEventListener("change",()=>{if($("#seoAuto").checked){state.manual={summary:false,tags:false,category:false};state.lastAutoSummary="";state.lastAutoTags="";state.lastAutoCategory="";$("#seoMode").textContent="Đã bật tự động SEO. Chỉ điền trường đang trống hoặc do hệ thống tạo.";queue()}else $("#seoMode").textContent="Đã tắt tự động SEO. Các trường có thể chỉnh thủ công."});
 ["title","slug","cover"].forEach(id=>$("#"+id)?.addEventListener("input",queue));
 $("#newBtn")?.addEventListener("click",()=>{state.manual={summary:false,tags:false,category:false};state.lastAutoSummary="";state.lastAutoTags="";state.lastAutoCategory="";queue()});
 let retries=0;const interval=setInterval(()=>{const ed=editor();if(!ed&&++retries<80)return;clearInterval(interval);ed?.on("text-change",queue);state.ready=true;queue()},150);
 window.addEventListener("beforeunload",()=>clearTimeout(state.timer));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();