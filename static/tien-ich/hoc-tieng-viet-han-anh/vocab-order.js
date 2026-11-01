/* Deterministic newest-first vocabulary ordering. No external dependencies. */
(function(root){
"use strict";
const nonempty = value => value !== undefined && value !== null && value !== "";
const rowNo = x => {const n=Number(x?.row);return Number.isSafeInteger(n)&&n>0?n:0;};
const originKey = x => [String(x?.sheetId||""),String(x?.tabTitle||""),String(x?.row||"")].join("/");
const explicitTime = x => {
  // Never treat the entire snapshot's updatedAt as a word's creation time.
  for(const field of ["createdAt","addedAt","sourceCreatedAt"]){
    if(!nonempty(x?.[field]))continue;
    const timestamp=Date.parse(String(x[field]));
    if(Number.isFinite(timestamp))return timestamp;
  }
  return 0;
};
function newestFirst(input){
 const rows=Array.isArray(input)?input:[];
 return rows.map((item,index)=>({item,index})).sort((left,right)=>{
  const a=left.item,b=right.item;
  // For records in the SAME Google worksheet, the last appended row is newest.
  // Correct even when the GitHub snapshot is delayed and lacks per-row timestamps.
  if(a.sheetId&&a.sheetId===b.sheetId&&a.tabTitle===b.tabTitle&&rowNo(a)&&rowNo(b)){
    const delta=rowNo(b)-rowNo(a);
    if(delta)return delta;
  }
  const ta=explicitTime(a),tb=explicitTime(b);
  if(ta!==tb)return tb-ta;
  // Across sheets without row-level timestamps only a best-effort order exists.
  const delta=rowNo(b)-rowNo(a);
  if(delta)return delta;
  return left.index-right.index;
 }).map(x=>x.item);
}
function containsNewRows(next,current){
 const known=new Set((current||[]).map(originKey));
 return (next||[]).some(x=>!known.has(originKey(x)));
}
function contentChanged(next,current){
 if(next.length!==current.length)return true;
 for(let i=0;i<next.length;i++){
  const a=next[i],b=current[i];
  if(originKey(a)!==originKey(b))return true;
  for(const key of ["vi","ko","en","content","context","grammar","aiStatus","aiProvider"]){
   if(String(a[key]??"")!==String(b[key]??""))return true;
  }
 }
 return false;
}
root.BNVocabOrdering={newestFirst,containsNewRows,contentChanged};
})(typeof window==="undefined"?globalThis:window);
