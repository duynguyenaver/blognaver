/* Public Google Sheets live-read bridge. No API keys or browser-side write privileges. */
(()=>{
"use strict";
const SHEET="19nL6wtouHV-0OumsQR2jF-5xWA1cpbpivRUIsm7hDgk",GID="0";
const callbackPrefix="__bn_vocab_gviz_";
let sequence=0;
const tidy=x=>String(x??"").trim();
function cell(row,col){
 const c=row?.c?.[col];
 if(!c)return "";
 return tidy(typeof c.v==="string"||typeof c.v==="number"?c.v:c.f??"");
}
function normalizeResponse(body){
 if(!body||body.status!=="ok"||!Array.isArray(body.table?.rows))throw new Error("Google Sheets chưa trả dữ liệu bảng hợp lệ");
 const columns=(body.table.cols||[]).map(x=>tidy(x.label||x.id||"").toLowerCase());
 const first=body.table.rows.map((r,i)=>({row:i+2,values:[0,1,2,3,4].map(j=>cell(r,j))}));
 if(first.length&&/^(việt|viet)\s*$/i.test(first[0].values[0]))first.shift();
 return first.filter(x=>x.values.slice(0,3).some(Boolean)).map(x=>({
  vi:x.values[0],ko:x.values[1],en:x.values[2],context:x.values[3],grammar:x.values[4],
  row:x.row,tabTitle:"Sheet1",sheetId:SHEET,sheetTitle:"viethananh",
  content:"",id:"live-"+SHEET+"-0-"+x.row,aiStatus:x.values[3]&&x.values[4]?"sheet":"pending",
  source:"Google Sheets · trực tiếp"
 }));
}
function query(){
 return new Promise((resolve,reject)=>{
  const callback=callbackPrefix+(++sequence),script=document.createElement("script");
  const timer=setTimeout(()=>finish(new Error("Google Sheets không phản hồi trong 12 giây")),12000);
  let done=false;
  function finish(error,data){
   if(done)return;
   done=true;clearTimeout(timer);delete window[callback];script.remove();
   if(error)reject(error);else resolve(data);
  }
  window[callback]=response=>{try{finish(null,normalizeResponse(response))}catch(e){finish(e)}};
  script.onerror=()=>finish(new Error("Không đọc được Google Sheets công khai; kiểm tra quyền Viewer và kết nối mạng"));
  const params=new URLSearchParams({
   gid:GID,headers:"1",tq:"select A,B,C,D,E",
   tqx:"out:json;responseHandler:"+callback,
   _:String(Date.now())
  });
  script.src="https://docs.google.com/spreadsheets/d/"+SHEET+"/gviz/tq?"+params;
  script.async=true;
  document.head.append(script);
 });
}
function same(a,b){return ["vi","ko","en"].every(k=>tidy(a[k])===tidy(b[k]))}
function merge(rows,cached){
 const old=Array.isArray(cached)?cached:[];
 const result=old.filter(x=>x.sheetId!==SHEET);
 for(const x of rows){
  // Use the original GitHub enrichment only when the THREE SOURCE cells are identical.
  const previous=old.find(y=>y.sheetId===SHEET&&y.row===x.row&&same(y,x))
      ||old.find(y=>y.sheetId===SHEET&&same(y,x));
  const updated=previous?{...previous,...x,id:previous.id,examples:previous.examples,
   references:previous.references,inputHash:previous.inputHash,
   context:x.context||previous.context||"",grammar:x.grammar||previous.grammar||"",
   aiStatus:x.context&&x.grammar?"sheet":previous.aiStatus||"pending"}:x;
  // A previous offline release wrote generic notes into Google D/E.
  // A stale template must never hide a real AI result or be shown as complete.
  const stale=x.context.startsWith("Tham khảo offline:")
    &&x.grammar.startsWith("Gợi ý kiểm tra:");
  if(stale){
   const valid=previous?.aiStatus==="ready"
      &&["groq","gemini"].includes(previous?.aiProvider);
   updated.context=valid?previous.context:"";
   updated.grammar=valid?previous.grammar:"";
   updated.aiStatus=valid?"ready":"pending";
   if(!valid){
    delete updated.aiProvider;delete updated.aiModel;
    delete updated.reviewRecommended;
   }
  }
  result.push(updated);
 }
 return result;
}
window.BNLiveVocabulary={sheetId:SHEET,query,merge};
})();