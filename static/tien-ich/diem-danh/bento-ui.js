/* Presentation and calendar-day metrics; encryption remains in attendance.js. */
(()=>{'use strict';
function metrics(records,today,year,month){
 const days=Object.keys(records).filter(date=>records[date]?.status==='work');
 const previous=date=>new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 let cursor=records[today]?.status==='work'?today:previous(today),streak=0;
 while(records[cursor]?.status==='work'){streak++;cursor=previous(cursor)}
 const counts=Array.from({length:12},(_,index)=>days.filter(date=>date.startsWith(year+'-'+String(index+1).padStart(2,'0')+'-')).length);
 return {streak,done:records[today]?.status==='work',monthly:counts[month],yearly:counts.reduce((a,b)=>a+b,0),total:days.length,counts};
}
globalThis.BNAttendanceMetrics=metrics;
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id),dialog=$('unlockDialog');let toastTimer;
const openUnlock=()=>{if(!dialog.open)dialog.showModal();$('unlockFeedback').textContent='';$('unlockCode').focus()};
const closeUnlock=()=>{dialog.close();$('unlockCode').type='password';const toggle=document.querySelector('[data-toggle-password="unlockCode"]');toggle.textContent='Hiện';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Hiện mật khẩu')};
for(const button of document.querySelectorAll('[data-open-unlock]'))button.onclick=openUnlock;
for(const button of document.querySelectorAll('[data-open-reset]'))button.onclick=()=>{if(dialog.open)closeUnlock();$('githubDetails').open=true;$('resetSettings').open=true;$('resetSettings').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$('newUnlockCode').focus({preventScroll:true})};
$('closeUnlock').onclick=closeUnlock;
dialog.addEventListener('close',()=>{$('unlockCode').type='password';const toggle=document.querySelector('[data-toggle-password="unlockCode"]');toggle.textContent='Hiện';toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Hiện mật khẩu')});
$('unlockForm').onsubmit=event=>{event.preventDefault();$('openLocal').click()};
for(const button of document.querySelectorAll('[data-toggle-password]'))button.onclick=()=>{const input=$(button.dataset.togglePassword),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Ẩn':'Hiện';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu')};
function toast(message,tone='success'){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').dataset.tone=tone;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true},5000)}
function update(records,today,year,month,ready){
 const data=metrics(records,today,year,month),state=!ready?'locked':data.done?'done':'pending';
 $('heroCard').dataset.state=state;$('todayDate').textContent=today.split('-').reverse().join('/');
 $('todayBadge').textContent=!ready?'◇ Chưa mở khóa':data.done?'✓ Đã điểm danh':'Chưa điểm danh';
 $('heroTitle').textContent=!ready?'Sẵn sàng cho hôm nay?':data.done?'Hôm nay, bạn đã có mặt.':'Thêm một ngày đều đặn.';
 $('heroHint').textContent=!ready?'Mở khóa để xem và ghi nhận ngày làm việc.':data.done?'Ngày đi làm đã được ghi nhận trong lịch của bạn.':'Một dấu tích nhỏ cho nhịp làm việc của riêng bạn.';
 $('streakCount').textContent=ready?data.streak:'—';
 $('checkInNow').disabled=ready&&data.done;$('checkInLabel').textContent=ready&&data.done?'Đã điểm danh hôm nay':'Điểm danh ngay';
 for(const [id,value] of [['total',data.total],['monthly',data.monthly],['yearly',data.yearly]])$(id).textContent=ready?value.toLocaleString('vi-VN'):'—';
 const bars=$('monthBars');bars.replaceChildren();
 data.counts.forEach((count,index)=>{const column=document.createElement('span');column.className='month-bar'+(index===month?' current':'');column.setAttribute('aria-hidden','true');const bar=document.createElement('i');bar.style.height=(ready?Math.max(3,count/31*55):3)+'px';const label=document.createElement('small');label.textContent=index+1;column.title=ready?'Tháng '+(index+1)+': '+count+' ngày':'Chưa mở khóa';column.append(bar,label);bars.append(column)});
 bars.setAttribute('aria-label',ready?'Ngày đi làm năm '+year+': '+data.counts.map((n,i)=>'tháng '+(i+1)+' '+n+' ngày').join(', '):'Mở khóa để xem thống kê');
 if(ready&&dialog.open)closeUnlock();
}
function cloud(message,tone){$('unlockFeedback').textContent=tone==='error'?message:'';if(tone==='error'&&!dialog.open)$('githubDetails').open=true;else if(tone==='success')$('githubDetails').open=false}
globalThis.BNAttendanceUI={update,openUnlock,toast,cloud};
})();
