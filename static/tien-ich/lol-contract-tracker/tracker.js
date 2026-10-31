(()=>{"use strict";
const $=id=>document.getElementById(id),BASE="https://docs.google.com/spreadsheets/d/1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o/pubhtml";
const PAGE=25,CODES=new Set(["LCK","LPL","LEC","LCS","LCP","CBLOL","OTHER"]),state={base:[],rows:[],filtered:[],changes:[],events:[],snapshot:null,page:0,manual:false,eventFilter:"all"};
const clean=x=>String(x??"").trim().normalize("NFC"),norm=x=>clean(x).toLowerCase(),num=new Intl.NumberFormat("vi-VN");
const dom=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e};
function https(u){try{const v=new URL(u);return v.protocol==="https:"?v.href:""}catch{return ""}}
function source(u){const link=https(u);return link&&new URL(link).hostname==="docs.google.com"&&link.includes("/spreadsheets/")?link:BASE}
function iso(x){
 const s=clean(x);let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
 if(!m){m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)m=[m[0],m[3],m[2],m[1]]}
 if(!m)m=s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
 if(!m){const named=s.match(/^(\d{1,2})[- ]([A-Za-z]{3,9})[- ,]+(\d{4})$/);
   if(named){const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
     const month=months[named[2].slice(0,3).toLowerCase()];if(month)m=[s,named[3],String(month),named[1]]}}
 if(!m)return "";let y=+m[1],mo=+m[2],d=+m[3];
 if(mo>12&&d<=12){const old=mo;mo=d;d=old}
 const v=new Date(Date.UTC(y,mo-1,d));
 if(y<2000||y>2100||v.getUTCFullYear()!==y||v.getUTCMonth()!==mo-1||v.getUTCDate()!==d)return "";
 return [String(y),String(mo).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
}
function showDate(x){const v=iso(x);return v?new Date(v+"T00:00:00Z").toLocaleDateString("vi-VN",{timeZone:"UTC"}):"Chưa rõ"}
function days(x,now=new Date()){const v=iso(x);if(!v)return null;return Math.ceil((Date.parse(v+"T00:00:00Z")-Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))/86400000)}
function status(r,now=new Date()){const d=days(r.endDate,now);return d===null?{key:"unknown",label:"Chưa rõ hạn"}:d<0?{key:"expired",label:"Ngày GCD đã qua"}:d<=60?{key:"soon",label:"Sắp đến hạn"}:{key:"future",label:"Còn thời hạn"}}
function safeRow(r){if(!r||typeof r!=="object")return null;const name=clean(r.handle||r.player||r.name).slice(0,120),team=clean(r.team).slice(0,150);
 if(!name||!team)return null;const league=clean(r.league).toUpperCase();
 return {id:clean(r.id)||[league,team,name].join("/"),handle:name,team,league:CODES.has(league)?league:"OTHER",legalName:clean(r.legalName).slice(0,140),position:clean(r.position||r.role).slice(0,80),endDate:iso(r.endDate),sourceUrl:source(r.sourceUrl),sourceType:r.sourceType==="manual"?"manual":"official"}
}
function snapshot(payload){if(!payload||!Array.isArray(payload.rows)||payload.rows.length>20000)throw Error("Snapshot không hợp lệ");
 const rows=payload.rows.map(safeRow).filter(Boolean);if(payload.rows.length&&rows.length<payload.rows.length*.7)throw Error("Dòng GCD thiếu thông tin");
 return {rows,regions:Array.isArray(payload.regions)?payload.regions:[],fetchedAt:payload.fetchedAt||null};
}
function teams(){const chosen=$("team").value,league=$("league").value,all=[...new Set(state.rows.filter(r=>!league||r.league===league).map(x=>x.team))].sort((a,b)=>a.localeCompare(b));
 const s=$("team");s.replaceChildren(new Option("Tất cả đội",""));all.forEach(t=>s.add(new Option(t,t)));s.value=all.includes(chosen)?chosen:"";
}
function summary(){const rows=state.rows,date=state.snapshot?.fetchedAt;
 $("statPlayers").textContent=num.format(rows.length);$("statExpiring").textContent=num.format(rows.filter(r=>status(r).key==="soon").length);
 $("statLeagues").textContent=num.format(new Set(rows.map(x=>x.league)).size);
 $("statDate").textContent=state.manual?"CSV vừa nhập":date?showDate(date.slice(0,10)):"Chưa có";
 $("snapshotMeta").textContent=state.manual?"Dữ liệu tạm, không tải lên GitHub":date?"Lấy lúc "+new Date(date).toLocaleString("vi-VN")+"; "+(state.snapshot.regions||[]).length+" tab GCD":"Chờ đồng bộ Riot GCD";
}
function filter(){
 const q=norm($("search").value),league=$("league").value,team=$("team").value,st=$("status").value,sort=$("sort").value;
 state.filtered=state.rows.filter(r=>(!q||norm([r.handle,r.legalName,r.team,r.league,r.position].join(" ")).includes(q))&&(!league||r.league===league)&&(!team||r.team===team)&&(!st||status(r).key===st));
 state.filtered.sort((a,b)=>{if(sort==="name")return a.handle.localeCompare(b.handle);
 if(sort==="team")return a.team.localeCompare(b.team)||a.handle.localeCompare(b.handle);
 const x=a.endDate?Date.parse(a.endDate):Infinity,y=b.endDate?Date.parse(b.endDate):Infinity;return (sort==="recent"?y-x:x-y)||a.handle.localeCompare(b.handle)});
 state.page=Math.min(state.page,Math.max(0,Math.ceil(state.filtered.length/PAGE)-1));render();
}
function render(){const tbody=$("contractRows");tbody.replaceChildren();const list=state.filtered;
 if(!list.length){const tr=dom("tr"),td=dom("td","empty",state.rows.length?"Không tìm thấy hồ sơ phù hợp.":"Chưa có snapshot đã kiểm chứng. Mở Riot GCD hoặc nhập CSV bên dưới.");td.colSpan=7;tr.append(td);tbody.append(tr)}
 for(const r of list.slice(state.page*PAGE,(state.page+1)*PAGE)){const tr=dom("tr"),td=dom("td");td.append(dom("strong","",r.handle));if(r.legalName)td.append(dom("div","role",r.legalName));
 const s=status(r),badge=dom("td");badge.append(dom("span","tag "+s.key,s.label));
 const src=dom("td"),a=dom("a","",r.sourceType==="manual"?"Đối chiếu Riot ↗":"Riot GCD ↗");a.href=r.sourceUrl;a.target="_blank";a.rel="noopener noreferrer";src.append(a);
 tr.append(td,dom("td","",r.team),dom("td","",r.league),dom("td","",r.position||"—"),dom("td","",showDate(r.endDate)),badge,src);tbody.append(tr)}
 $("resultCount").textContent=num.format(list.length)+" kết quả";$("pageInfo").textContent=list.length?(state.page+1)+"/"+Math.ceil(list.length/PAGE):"0/0";
 $("prevPage").disabled=state.page===0;$("nextPage").disabled=(state.page+1)*PAGE>=list.length;
}
function card(root,title,detail,date,label,link,cls){const item=dom("article","event"),head=dom("header");head.append(dom("h3","",title),dom("span","tag "+cls,label));item.append(head);
 if(date)item.append(dom("time","",date));if(detail)item.append(dom("p","",detail));
 const u=https(link);if(u){const a=dom("a","","Xem nguồn ↗");a.href=u;a.target="_blank";a.rel="noopener noreferrer";item.append(a)}root.append(item);
}
function changes(){const root=$("changesList");root.replaceChildren();if(!state.changes.length){root.append(dom("p","muted","Chưa có hai bản GCD để so sánh. Thay đổi ngày chưa được mặc định coi là gia hạn."));return}
 state.changes.slice(0,25).forEach(x=>{const types={end_date:"GCD đổi ngày hết hạn",team:"GCD đổi đội đăng ký",added:"Mới xuất hiện trong GCD",removed:"Không còn trong snapshot"};
 card(root,types[x.type]||"Biến động dữ liệu",[x.handle,x.team,x.before&&"Trước: "+x.before,x.after&&"Sau: "+x.after].filter(Boolean).join(" · "),clean(x.detectedAt).slice(0,10),"Cần kiểm chứng",BASE,"unknown")});
}
function transfers(){const root=$("transfersList");root.replaceChildren();const items=state.events.filter(x=>state.eventFilter==="all"||state.eventFilter===x.status).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 if(!items.length)root.append(dom("p","muted","Chưa có thông báo có nguồn phù hợp. Không suy đoán hợp đồng từ tin đồn."));
 const labels={confirmed:"Chuyển nhượng xác nhận",renewed:"Gia hạn xác nhận",rumor:"Tin đồn có nguồn"};
 items.forEach(x=>card(root,clean(x.player)+" · "+[x.fromTeam,x.toTeam].filter(Boolean).join(" → "),clean(x.note),showDate(x.date),labels[x.status],x.sourceUrl,x.status==="confirmed"?"confirmed":x.status==="renewed"?"future":"rumor"));
 document.querySelectorAll("[data-event]").forEach(b=>b.classList.toggle("active",b.dataset.event===state.eventFilter));
}
function parseCSV(text){const result=[];let row=[],cell="",quoted=false;const s=String(text).replace(/^\uFEFF/,"");
 for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
 else if(ch===","&&!quoted){row.push(cell);cell=""}
 else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&s[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))result.push(row);row=[];cell=""}
 else cell+=ch}if(quoted)throw Error("CSV có dấu nháy chưa đóng.");row.push(cell);if(row.some(x=>x.trim()))result.push(row);return result;
}
function columns(row){const names=row.map(s=>norm(s).replace(/[\s\W_]+/gu,""));const find=(terms)=>names.findIndex(v=>terms.some(t=>v===t||v.includes(t)));
 return {player:find(["ingamename","summonername","playername","playerid","handle","ign","nickname"]),team:find(["teamname","team","organization"]),end:find(["contractenddate","contractexpirydate","contractexpiration","expirationdate","expirydate","enddate","contractend"]),legal:find(["realname","legalname","fullname"]),position:find(["position","lane","role"])}}
function parseContractsCSV(csv,league,src=BASE){const tables=parseCSV(csv),index=tables.findIndex(row=>{const c=columns(row);return c.player>=0&&c.team>=0&&c.end>=0});if(index<0)throw Error("Thiếu header Player/IGN, Team hoặc Contract End Date.");
 const c=columns(tables[index]),get=(row,i)=>i<0?"":clean(row[i]),found=[],unique=new Set();
 tables.slice(index+1).forEach(row=>{const name=get(row,c.player),team=get(row,c.team);if(!name||!team||/^(team|player|total|notes|last updated)$/i.test(name))return;
 const r=safeRow({handle:name,team,league,legalName:get(row,c.legal),position:get(row,c.position),endDate:get(row,c.end),sourceUrl:src,sourceType:"manual"});
 if(r&&!unique.has(r.id)){unique.add(r.id);found.push(r)}});
 if(!found.length)throw Error("Không đọc được hồ sơ hợp lệ.");return found;
}
async function importFile(){const f=$("importFile").files[0];if(!f){$("importMessage").textContent="Chọn file CSV trước.";return}if(f.size>12e6){$("importMessage").textContent="CSV quá 12 MB.";return}
 try{const league=$("importLeague").value,records=parseContractsCSV(await f.text(),league);
 state.rows=[...state.rows.filter(r=>r.league!==league),...records];state.manual=true;state.page=0;teams();filter();summary();
 $("importMessage").textContent="Đọc "+num.format(records.length)+" hồ sơ "+league+" trong trình duyệt. CSV người dùng chưa xác minh. Không upload lên GitHub."}
 catch(e){$("importMessage").textContent="Không đọc được CSV: "+e.message}}
function exportCSV(){const esc=v=>'"'+String(v??"").replaceAll('"','""')+'"';const values=[["Player","Team","League","Role","GCD End Date","Status","Source URL"]];
 state.filtered.forEach(r=>values.push([r.handle,r.team,r.league,r.position,r.endDate,status(r).label,r.sourceUrl]));
 const out="\uFEFF"+values.map(row=>row.map(esc).join(",")).join("\r\n");
 const href=URL.createObjectURL(new Blob([out],{type:"text/csv;charset=utf-8"}));const a=dom("a");a.href=href;a.download="blognaver-lol-contracts.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),3000);
}
async function load(){try{const [data,news]=await Promise.all([fetch("gcd.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}),
 fetch("transfers.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})]);
 state.snapshot=snapshot(data);state.base=state.snapshot.rows;state.rows=[...state.base];state.changes=Array.isArray(data.changes)?data.changes:[];
 state.events=Array.isArray(news.events)?news.events.filter(x=>x&&https(x.sourceUrl)&&["confirmed","renewed","rumor"].includes(x.status)):[];
 $("datasetStatus").textContent=state.rows.length?"Đang hiển thị "+num.format(state.rows.length)+" hồ sơ. Các tab có thể có ngày cập nhật khác nhau.":"Chưa có snapshot Riot mới. Mở GCD hoặc nhập CSV chính thức.";
 }catch(e){$("datasetStatus").textContent="Chưa tải được dữ liệu GCD ("+e.message+"). Mở GCD chính thức hoặc nhập CSV."}
 teams();filter();summary();changes();transfers();
}
["search","league","team","status","sort"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",()=>{if(id==="league")teams();state.page=0;filter()}));
$("prevPage").onclick=()=>{if(state.page>0){state.page--;render()}};$("nextPage").onclick=()=>{if((state.page+1)*PAGE<state.filtered.length){state.page++;render()}};
$("importNow").onclick=importFile;$("downloadCsv").onclick=exportCSV;
$("resetImported").onclick=()=>{state.rows=[...state.base];state.manual=false;state.page=0;teams();filter();summary();$("importMessage").textContent="Đã trở về snapshot."};
document.querySelectorAll("[data-event]").forEach(b=>b.onclick=()=>{state.eventFilter=b.dataset.event;transfers()});
window.BNLoLContracts=Object.freeze({iso,days,parseCSV,parseContractsCSV,status,snapshot});
load();
})();