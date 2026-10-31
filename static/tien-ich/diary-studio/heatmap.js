/* Derived view only: saved journal entries remain the source of truth. */
(()=>{'use strict';
const DAY=86400000;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
function model(entries,endDate){
 if(!validDate(endDate))throw Error('Invalid heatmap end date');
 const end=Date.parse(endDate+'T12:00:00Z'),start=end-364*DAY,counts=new Map(),seen=new Set();
 for(const entry of Array.isArray(entries)?entries:[]){
  if(!entry||!validDate(entry.date)||typeof entry.text!=='string'||!entry.text.trim())continue;
  const time=Date.parse(entry.date+'T12:00:00Z');if(time<start||time>end)continue;
  const id=entry.id?'id:'+entry.id:'legacy:'+entry.date+'::'+String(entry.title||'');if(seen.has(id))continue;seen.add(id);
  counts.set(entry.date,(counts.get(entry.date)||0)+1);
 }
 const days=Array.from({length:365},(_,i)=>{const date=new Date(start+i*DAY).toISOString().slice(0,10),count=counts.get(date)||0;return {date,count,level:Math.min(4,count)}});
 const offset=(new Date(start).getUTCDay()+6)%7;
 return {days,offset,weeks:Math.ceil((offset+365)/7),total:days.reduce((n,d)=>n+d.count,0),active:days.filter(d=>d.count>0).length};
}
globalThis.BNDiaryHeatmapModel=model;
if(typeof document==='undefined')return;
const root=document.getElementById('diaryHeatmap');if(!root)return;
const grid=root.querySelector('.heatmap-grid'),months=root.querySelector('.heatmap-months'),tooltip=root.querySelector('[role=tooltip]'),detail=root.querySelector('.heatmap-selection');let signature='',buttons=[];
const dateLabel=date=>date.slice(8)+'/'+date.slice(5,7)+'/'+date.slice(0,4);
const describe=cell=>dateLabel(cell.dataset.date)+' · '+cell.dataset.count+' bài nhật ký';
function hideTooltip(){tooltip.hidden=true}
function inspect(cell){if(!cell?.matches('.heatmap-day'))return;detail.textContent=describe(cell);tooltip.textContent=describe(cell);tooltip.hidden=false;const r=cell.getBoundingClientRect(),t=tooltip.getBoundingClientRect();tooltip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,r.left+r.width/2-t.width/2))+'px';tooltip.style.top=(r.top>t.height+14?r.top-t.height-9:r.bottom+9)+'px'}
grid.addEventListener('pointerover',event=>inspect(event.target));grid.addEventListener('pointerleave',hideTooltip);
grid.addEventListener('focusin',event=>inspect(event.target));grid.addEventListener('focusout',hideTooltip);
grid.addEventListener('click',event=>{const cell=event.target.closest('.heatmap-day');if(!cell)return;for(const b of buttons)b.tabIndex=b===cell?0:-1;inspect(cell)});
grid.addEventListener('keydown',event=>{const index=buttons.indexOf(event.target);if(index<0)return;const moves={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1};let next;if(event.key in moves)next=Math.max(0,Math.min(364,index+moves[event.key]));else if(event.key==='Home')next=0;else if(event.key==='End')next=364;else if(event.key==='Escape'){hideTooltip();return}else return;event.preventDefault();buttons[index].tabIndex=-1;buttons[next].tabIndex=0;buttons[next].focus()});
root.querySelector('.heatmap-scroll').addEventListener('scroll',hideTooltip,{passive:true});window.addEventListener('scroll',hideTooltip,{passive:true});window.addEventListener('resize',hideTooltip,{passive:true});
function render(entries){
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),data=model(entries,today);
 const nextSignature=today+'|'+data.days.map(d=>d.count).join(',');if(nextSignature===signature)return;const firstRender=signature==='';signature=nextSignature;hideTooltip();
 root.style.setProperty('--heatmap-weeks',data.weeks);const fragment=document.createDocumentFragment();buttons=[];
 data.days.forEach((day,index)=>{const cell=document.createElement('button'),position=index+data.offset;cell.type='button';cell.className='heatmap-day level-'+day.level;cell.dataset.date=day.date;cell.dataset.count=day.count;cell.title=describe(cell);cell.setAttribute('aria-label',cell.title);cell.style.gridColumn=String(Math.floor(position/7)+1);cell.style.gridRow=String(position%7+1);cell.tabIndex=index===364?0:-1;buttons.push(cell);fragment.append(cell)});grid.replaceChildren(fragment);
 const labels=document.createDocumentFragment();let lastColumn=-5;
 data.days.forEach((day,index)=>{if(index!==0&&!day.date.endsWith('-01'))return;const col=Math.floor((index+data.offset)/7)+1;if(col-lastColumn<3||col>data.weeks-2)return;const label=document.createElement('span');label.textContent='Th'+Number(day.date.slice(5,7));label.style.gridColumn=col+'/span 3';labels.append(label);lastColumn=col});months.replaceChildren(labels);
 root.querySelector('.heatmap-summary').textContent=data.total+' bài viết · '+data.active+' ngày luyện viết';root.querySelector('.heatmap-range').textContent=dateLabel(data.days[0].date)+' – '+dateLabel(today);
 detail.textContent='Rê chuột, chạm hoặc dùng phím mũi tên để xem từng ngày.';if(firstRender)requestAnimationFrame(()=>{const scroll=root.querySelector('.heatmap-scroll');scroll.scrollLeft=scroll.scrollWidth});
}
globalThis.BNDiaryHeatmap={render};
})();
