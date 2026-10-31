/* BlogNaver expressive speech planning. Client-only, pure sentence classifiers.
 * Prosody is approximate: browser voices can ignore rate/pitch settings.
 */
(() => {
  "use strict";
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const LABELS={
    hook:"Mở đầu / Gợi tò mò",
    narrative:"Kể chuyện",
    dramatic:"Dẫn dắt / Kịch tính",
    emphasis:"Số liệu / Nhấn mạnh",
    question:"Câu hỏi",
    exclamation:"Cảm thán",
    aside:"Chú thích / Giải thích",
    cta:"Lời kết / CTA"
  };
  function splitSentences(text){
    const value=String(text||"");
    const segments=[];
    const paragraphRegex=/[^\n]+/g;
    const splitter=typeof Intl.Segmenter==="function"?new Intl.Segmenter("vi",{granularity:"sentence"}):null;
    let match,paragraphIndex=0;
    while((match=paragraphRegex.exec(value))){
      const paragraph=match[0];
      if(!paragraph.trim())continue;
      const candidates=splitter
        ?Array.from(splitter.segment(paragraph),part=>({value:part.segment,offset:part.index}))
        :Array.from(paragraph.matchAll(/[^.!?…]+(?:[.!?…]+(?=\s|$)|$)\s*/gu),part=>({value:part[0],offset:part.index}));
      for(const candidate of candidates){
        const start=match.index+candidate.offset;
        const left=candidate.value.length-candidate.value.trimStart().length;
        const right=candidate.value.trimEnd().length;
        const content=candidate.value.trim();
        if(content)segments.push({text:content,start:start+left,end:start+right,paragraphIndex});
      }
      paragraphIndex++;
    }
    return segments;
  }
  function classify(sentence,index,total){
    const s=sentence.text.trim();
    const low=s.toLocaleLowerCase("vi-VN");
    const cta=/cảm ơn|hẹn gặp lại|bình luận|chia sẻ góc nhìn|theo bạn|đừng quên|đăng ký kênh|kết thúc|tóm lại/iu.test(low);
    const hook=index<=1 && (/[?！!]\s*$/.test(s)||/bạn có bao giờ|vì sao|điều gì|liệu|đằng sau/iu.test(low));
    const question=/[?？]\s*$/.test(s);
    const emphatic=/[!！]\s*$/.test(s);
    const parenthetical=/[()]/.test(s)||/\s[—–-]\s/.test(s);
    const numbers=/(?:\d+|phần trăm|nghìn tỷ|triệu|tỷ|giếng trời|tòa nhà|Ba Đê|Hai Đê|Em-Ai-Ti|En-vi-đi-a|San-ta Cờ-la-ra|đô-la Mỹ)/iu.test(s);
    const dramatic=/bất ngờ|tuy nhiên|thế nhưng|đột nhiên|nghịch lý|không ngờ|cao trào|dồn dập/iu.test(low);
    let category="narrative",rate=1,pitch=1;
    if(parenthetical){category="aside";rate=1.1;pitch=.9;}
    if(dramatic){category="dramatic";rate=1.08;pitch=1;}
    if(numbers){category="emphasis";rate=.9;pitch=.95;}
    if(hook){category="hook";rate=.95;pitch=1.15;}
    if(question){category="question";rate=hook?.95:1;pitch=1.2;}
    if(emphatic){category="exclamation";rate=1.1;pitch=1.2;}
    if(cta && index>=Math.max(0,total-4)){category="cta";rate=.95;pitch=1;}
    return {category,label:LABELS[category],rate:clamp(rate,.6,1.6),pitch:clamp(pitch,.7,1.3)};
  }
  function buildPlan(text){
    const segments=splitSentences(text);
    return segments.map((part,index)=>{
      const voice=classify(part,index,segments.length);
      return {...part,index,...voice};
    });
  }
  window.BNDynamicVoice=Object.freeze({splitSentences,classify,buildPlan});
})();
