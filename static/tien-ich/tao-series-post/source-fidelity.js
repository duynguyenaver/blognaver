(()=>{"use strict";
const groups=[
{id:"optics",name:"Khoa học thị giác và những hiện tượng quang học",terms:["lighthouse","ghost lighthouse","optical illusion","light beam","horizon","visual illusion","perception","reef","lady elliot","hai dang","ao giac","quang hoc"]},
{id:"aviation",name:"Giải mã ngành hàng không",terms:["airline","aircraft","airport","airfare","flight ticket","air ticket","aviation","hang hang khong"]},
{id:"ota",name:"Công nghệ đặt vé và du lịch trực tuyến",terms:["online booking","travel booking","online travel agency","ota","ticketing platform","booking platform","reservation system","rebooking","refund policy","dat ve truc tuyen"]},
{id:"ai",name:"Trí tuệ nhân tạo và tương lai",terms:["artificial intelligence","machine learning","neural network","large language model","generative ai","chatgpt"]},
{id:"cyber",name:"An ninh mạng và dữ liệu số",terms:["cyberattack","ransomware","data breach","cybersecurity"]},
{id:"environment",name:"Thiên nhiên và hệ sinh thái biển",terms:["coral reef","marine ecosystem","manta ray","sea turtle","marine conservation","san ho","he sinh thai bien"]}
];
const norm=s=>" "+String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" ";
function hit(src,term){return norm(src).includes(norm(term))}
function rank(source){return groups.map(g=>({...g,hits:g.terms.filter(t=>hit(source,t))})).map(g=>({...g,score:g.hits.length})).sort((a,b)=>b.score-a.score)}
function classify(source){const ranked=rank(source),top=ranked[0],second=ranked[1];return top.score>=2&&top.score>second.score?{topic:top.id,label:top.name,hits:top.hits,score:top.score,clear:true,ranked}: {topic:null,label:"Không đủ bằng chứng xác định chủ đề",hits:[],score:top.score,clear:false,ranked}}
function checkSeries(source,name){const c=classify(source),n=norm(name);if(!c.clear)return {ok:false,reason:"Chưa xác định được chủ đề chính của nguồn; cần xem lại trước khi xuất bản.",classification:c};
const seriesGroup=groups.find(g=>g.terms.some(t=>hit(n,t))||hit(n,g.name));
if(seriesGroup&&seriesGroup.id!==c.topic)return {ok:false,reason:"Series '"+name+"' không phù hợp nguồn (chủ đề: "+c.label+").",classification:c};
if(c.topic==="optics"&&/dat ve|booking|ota|hang khong|airline|aviation/.test(n))return {ok:false,reason:"Nguồn nói về quang học nhưng series đang nói về đặt vé/hàng không.",classification:c};
if(c.topic==="ota"&&/quang hoc|hai dang|ao giac/.test(n))return {ok:false,reason:"Nguồn nói về đặt vé nhưng series đang nói về quang học.",classification:c};
return {ok:true,classification:c}}
function fidelity(source,article){const c=classify(source),a=classify(article);if(!c.clear)return {ok:false,reason:"Nguồn chưa đủ tín hiệu để xác minh chủ đề.",source:c,article:a};if(!a.clear||a.topic!==c.topic)return {ok:false,reason:"Bài viết lệch chủ đề nguồn: "+c.label+".",source:c,article:a};
const important=c.hits.filter(t=>t.length>5).slice(0,8),matched=important.filter(t=>hit(article,t));if(important.length>=2&&matched.length<2)return {ok:false,reason:"Bài viết thiếu thực thể/khái niệm trọng tâm: "+important.join(", "),source:c,article:a};return {ok:true,source:c,article:a}}
window.BNSourceFidelity={classify,checkSeries,fidelity,rank};
})();