/* Resume-only local draft. Never captures auth controls or uploaded files. */
(()=>{'use strict';
const KEY='blognaver_resume_form_draft_v1',MAX=200000;
function valid(x){return x&&x.version===1&&x.data&&x.data.fields&&typeof x.data.fields==='object'&&!Array.isArray(x.data.fields)&&Object.values(x.data.fields).every(v=>typeof v==='string')&&['experience','education'].every(k=>Array.isArray(x.data[k])&&x.data[k].length<=100&&x.data[k].every(row=>row&&typeof row==='object'&&Object.values(row).every(v=>typeof v==='string')))&&typeof x.data.slug==='string'&&(!x.data.slug||/^[a-z0-9-]{1,100}$/.test(x.data.slug))&&typeof x.data.sha==='string'&&(!x.data.sha||/^[a-f0-9]{40}$/.test(x.data.sha))}
globalThis.BNResumeDraftSchema={valid,KEY,MAX};
if(typeof document==='undefined')return;
const form=document.getElementById('form'),editor=window.BNResumeEditor,status=document.getElementById('draftStatus');if(!form||!editor||!status)return;
let timer,known=null,pending=false,available=true;
function report(message,error=false){status.textContent=message;status.dataset.tone=error?'error':'success'}
try{known=localStorage.getItem(KEY);if(known){if(known.length>MAX)throw Error('Nháp vượt giới hạn an toàn.');const draft=JSON.parse(known);if(!valid(draft))throw Error('Nháp không đúng định dạng; bản gốc vẫn được giữ trên máy.');editor.restore(draft.data);report('Đã khôi phục nháp trên máy · '+new Date(draft.savedAt).toLocaleString('vi-VN'))}else report('Sẵn sàng tự lưu nháp trên máy sau khi nhập liệu.')}catch(e){report('Chưa khôi phục được nháp: '+e.message,true)}
function save(){clearTimeout(timer);if(!pending)return;try{const current=localStorage.getItem(KEY);if(current!==known)throw Error('Nháp đã thay đổi ở tab khác. Nội dung đang nhập vẫn còn trong biểu mẫu; mở tab kia để đối chiếu trước khi lưu tiếp.');const record={version:1,savedAt:new Date().toISOString(),data:editor.capture()};if(!valid(record))throw Error('Nội dung nháp không hợp lệ.');const text=JSON.stringify(record);if(text.length>MAX)throw Error('Nháp quá lớn (tối đa 200.000 ký tự). Giảm nội dung hoặc xuất bản có kiểm tra.');localStorage.setItem(KEY,text);known=text;pending=false;available=true;report('✓ Đã lưu nháp trên máy · '+new Date().toLocaleTimeString('vi-VN')+' · chưa xuất bản GitHub.')}catch(e){available=false;report('Chưa lưu được nháp: '+e.message,true)}}
function queue(){pending=true;clearTimeout(timer);report('Đang lưu nháp trên máy…');timer=setTimeout(save,600)}
form.addEventListener('input',queue);form.addEventListener('change',queue);
const observer=new MutationObserver(queue);for(const id of ['experiences','educations'])observer.observe(document.getElementById(id),{childList:true});
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
window.addEventListener('beforeunload',event=>{save();if(pending&&!available){event.preventDefault();event.returnValue=''}});
document.getElementById('clearLocalDraft').addEventListener('click',()=>{try{if(localStorage.getItem(KEY)!==known)throw Error('Nháp đã thay đổi ở tab khác; không xóa bản nháp đó.');localStorage.removeItem(KEY);known=null;clearTimeout(timer);pending=false;report('Đã xóa nháp trên máy. Nội dung biểu mẫu vẫn còn; chỉnh sửa tiếp sẽ tạo nháp mới.')}catch(e){report('Không xóa được nháp: '+e.message,true)}});
})();
