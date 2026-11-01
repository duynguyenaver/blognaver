/* CMUdict-assisted English -> Vietnamese approximate audio-script transcription.
 * Pronunciations: Carnegie Mellon University CMU US English Dictionary,
 * https://github.com/cmusphinx/cmudict (Copyright CMU, unrestricted use).
 * Only the public dictionary is downloaded; NO article text is transmitted.
 * Learned Section 04 rules and existing explicit brand/tech readings take priority.
 * English pronunciation cannot be fully standardized by rule-based transliteration.
 */
(()=>{
"use strict";
const CMU_URL="https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict";
const CMU_STRESS=/[012]$/;
const known=new Map();
let loaded=false,loading=null,loadFailure=null;
const status=()=>({loaded,entries:known.size,error:loadFailure});
const CMU_CONSONANTS={
 B:"b",CH:"ch",D:"đ",DH:"đ",F:"ph",G:"g",HH:"h",JH:"d",K:"k",
 L:"l",M:"m",N:"n",NG:"ng",P:"p",R:"r",S:"s",SH:"s",T:"t",TH:"th",
 V:"v",W:"u",Y:"i",Z:"d",ZH:"gi"
};
const CMU_VOWELS={
 AA:"a",AE:"e",AH:"ơ",AO:"o",AW:"ao",AY:"ai",EH:"e",ER:"ơ",
 EY:"ây",IH:"i",IY:"i",OW:"âu",OY:"oi",UH:"u",UW:"u"
};
const special=Object.freeze({
 "worlds":"uơ-đờ","world":"uơ-đờ","league":"lích","legends":"le-gen",
 "samsung":"sam sung","galaxy":"ga-la-xi","esports":"e-sờ-pót",
 "gaming":"gây-ming","playoffs":"pờ-lây-óp","roster":"rót-tơ",
 "meta":"mê-ta","season":"si-dần","summer":"săm-mơ","spring":"sờ-pring",
 "championship":"chăm-pi-ần-síp","champions":"chăm-pi-ần",
 "tournament":"tua-na-mần","finals":"phai-nồ","final":"phai-nồ",
 "group":"gụp","stage":"sờ-tây","team":"tim","teams":"tim",
 "stream":"sờ-trim","streaming":"sờ-tri-ming","online":"on-lai",
 "offline":"óp-lai","game":"gêm","games":"gêm","worldwide":"uơ-đờ-quai",
 "winner":"uy-nơ","record":"rẹ-co","career":"ca-ria","brand":"bờ-ren",
 "youtube":"du-túp","google":"gu-gồ","facebook":"phây-búc",
 "microsoft":"mai-crô-sóp","english":"in-lít","korean":"co-ri-ần",
 "lck":"eo-xi-kây","lpl":"eo-pi-eo","msi":"em-ét-ai",
 "t1":"ti-oăn","skt":"ét-kây-ti","blg":"bi-eo-di",
 "gen.g":"den di","geng":"den di","gen-g":"den di"
});
const EN_LEXICON=new Set(Object.keys(special).concat(
 "analysis competition champion roster gaming live streaming coach coaches " +
 "player players winner winner title titles match matches best final finals " +
 "world global technology social online offline computer hardware software " +
 "artificial intelligence future business company innovation research " +
 "design system website browser internet source news official media " +
 "video podcast studio creator content training vocabulary pronunciation " +
 "sponsor sponsors generation professional performance tournament schedule " +
 "contract contracts transfer season spring summer winter team teams skill " +
 "release update concept series history organization".split(/\s+/)));
const VI_COMMON=new Set(("anh em trong trang nay day do la cua va voi cho tu doi den tren duoi " +
 "nhung cac mot hai ba bon nam sau truoc giua tren trong do se da duoc " +
 "mot thu ten gioi nhat luc quy du kien ban pham dan hau thi con " +
 "chu tieng minh viet bang doc theo dung can ngan cach phan").split(/\s+/));
const letters=Object.freeze({
 A:"ây",B:"bi",C:"xi",D:"đi",E:"i",F:"ép",G:"di",H:"ây-ch",I:"ai",
 J:"dây",K:"kây",L:"eo",M:"em",N:"en",O:"âu",P:"pi",Q:"kiu",
 R:"a",S:"ét",T:"ti",U:"iu",V:"vi",W:"đắp-bồ-iu",X:"ếch",Y:"quai",Z:"di"
});

function arpabetToVietnamese(phonemes){
  const parts=String(phonemes||"").trim().split(/\s+/);
  if(parts.length>16||!parts.length)return "";
  const out=[];
  let pending="",vowels=0;
  for(let part of parts){
    const p=part.replace(CMU_STRESS,"");
    const vowel=CMU_VOWELS[p];
    if(vowel){
      vowels++;
      if(out.length && pending){
        out[out.length-1]+=(pending.length>2?"-"+pending:pending);
        pending="";
      }
      out.push((pending||"")+vowel);pending="";
    }else if(CMU_CONSONANTS[p]!==undefined){
      pending+=CMU_CONSONANTS[p];
    }else return "";
  }
  if(!vowels)return "";
  if(pending)out[out.length-1]+=pending.length>2?"-"+pending:pending;
  return out.join("-").replace(/-+/g,"-");
}
function learnCMU(raw){
  const words=new Map();
  const lines=String(raw||"").split(/\r?\n/);
  for(const line of lines){
    const m=line.match(/^([a-z][a-z'._-]*)\s+([A-Z0-9 ]+)$/i);
    if(!m)continue;
    const word=m[1].toLowerCase().replace(/\(\d+\)$/,"");
    if(words.has(word))continue;
    const phonetic=arpabetToVietnamese(m[2]);
    if(phonetic)words.set(word,phonetic);
  }
  return words;
}
async function load(){
 if(loaded)return status();
 if(loading)return loading;
 loading=(async()=>{
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),16000);
   try{
     const response=await fetch(CMU_URL,{signal:controller.signal,cache:"force-cache",credentials:"omit"});
     if(!response.ok)throw Error("CMU HTTP "+response.status);
     const raw=await response.text();
     if(raw.length>6000000||raw.length<1000000)throw Error("Kích thước từ điển CMU không hợp lệ.");
     const entries=learnCMU(raw);
     if(entries.size<50000)throw Error("Từ điển CMU chưa đủ dữ liệu.");
     for(const [word,pronunciation] of entries)known.set(word,pronunciation);
     loaded=true;loadFailure=null;
   }finally{clearTimeout(timeout)}
  }catch(e){loadFailure=e.message||String(e)}
  return status();
 })();
 return loading;
}

function isVietnameseDiacriticWord(token){
  return /[À-ỹà-ỹĐđ]/u.test(token);
}
function eligible(token,previous="",next="",englishContext=false){
 const word=token.toLowerCase();
 if(special[word])return true;
 if(token.length===1 && /^[A-Z]$/.test(token))return true;
 if(isVietnameseDiacriticWord(token)||VI_COMMON.has(word))return false;
 if(/^[A-Z]{2,8}$/.test(token))return true;
 if(EN_LEXICON.has(word))return true;
 if(englishContext&&word.length>=3)return true;
 if(/^[A-Z][a-z]{3,}$/.test(token) && !VI_COMMON.has(word) && known.has(word))return true;
 return false;
}

function transcribeSegment(value){
  // Keep diacritics in actual Vietnamese prose; never reinterpret the entire text as English.
  const source=String(value||"");
  const rows=source.split(/(\n+)/);
  return rows.map(row=>{
    if(!row.trim()||/^\n+$/.test(row))return row;
    const englishContext=!/[À-ỹà-ỹĐđ]/u.test(row) &&
      /\b(?:the|and|from|with|about|between|because|this|that|there|these|where|which|of|for)\b/i.test(row) &&
      (row.match(/[A-Za-z]{3,}/g)||[]).length>=5;
    return row.replace(/(?<![\p{L}\p{N}_])(?:[A-Z]{2,8}|[A-Za-z]{2,}(?:[.][A-Za-z]+)*|[A-Z])(?![\p{L}\p{N}_])/gu,
      (term,offset,all)=>{
        const lower=term.toLowerCase();
        if(special[lower])return special[lower];
        if(term.length===1 && /^[A-Z]$/.test(term))return letters[term]||term;
        if(/^[A-Z]{2,8}$/.test(term) && !special[lower] &&
          !EN_LEXICON.has(lower) && !known.has(lower))
          return term.split("").map(c=>letters[c]||c).join("-");
        if(!eligible(term,all.slice(Math.max(0,offset-30),offset),all.slice(offset+term.length,offset+term.length+30),englishContext))return term;
        return known.get(lower)||term;
      });
  }).join("");
}
function toVietnamese(text){
  const value=String(text||"");
  const protectedPattern=/\x60{3}[\s\S]*?\x60{3}|\x60[^\x60\n]+\x60|(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
  let result="",last=0;
  for(const token of value.matchAll(protectedPattern)){
    result+=transcribeSegment(value.slice(last,token.index))+token[0];
    last=token.index+token[0].length;
  }
  return result+transcribeSegment(value.slice(last));
}
window.BNEnglishVietnamese=Object.freeze({load,status,toVietnamese,arpabetToVietnamese,learnCMU});
if(typeof window.addEventListener==="function"){
  // Warm up in parallel; do not send article text anywhere or block the first paint.
  window.addEventListener("load",()=>{load()},{once:true});
}
})();
