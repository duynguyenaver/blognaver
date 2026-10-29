(()=>{"use strict";
const STORE="blognaver_interview_tracker_v1",SELECTION="blognaver_interview_selected_v1";
const params=new URLSearchParams(location.search),id=params.get("id");
const $=s=>document.querySelector(s);
const now=()=>new Date().toISOString();
const uuid=()=>globalThis.crypto?.randomUUID?.()||("job-"+Date.now()+"-"+Math.random().toString(36).slice(2));
const form=$("#appForm");let apps=[];
try{const parsed=JSON.parse(localStorage.getItem(STORE)||"[]");apps=Array.isArray(parsed)?parsed:[]}catch{apps=[]}
const original=id?apps.find(a=>a.id===id):null;
if(id&&!original){$("#formError").hidden=false;$("#formError").textContent="Không tìm thấy hồ sơ này trên thiết bị. Có thể bạn cần tải dữ liệu từ GitHub ở trang kết quả.";form.querySelector('button[type="submit"]').disabled=true;return}
if(original){$("#formTitle").textContent="Chỉnh sửa · "+original.company;
for(const key of ["company","role","appliedDate","location","jobUrl","source","salary","contact","notes"]){form.elements.namedItem(key).value=original[key]||""}}
else form.elements.namedItem("appliedDate").value=new Date().toLocaleDateString("en-CA");
form.addEventListener("submit",e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());
data.company=data.company.trim();data.role=data.role.trim();
if(!data.company||!data.role){$("#formError").hidden=false;$("#formError").textContent="Vui lòng nhập công ty và vị trí.";return}
try{
let target=original;
if(target)Object.assign(target,data,{updatedAt:now()});
else{const timestamp=now();target={...data,id:uuid(),stage:"applied",createdAt:timestamp,updatedAt:timestamp,nextAction:"",nextActionDate:"",history:[{stage:"applied",at:data.appliedDate?data.appliedDate+"T12:00:00":timestamp,note:"Đã tạo hồ sơ ứng tuyển"}]};apps.unshift(target)}
localStorage.setItem(STORE,JSON.stringify(apps));sessionStorage.setItem(SELECTION,target.id);
location.assign("../?selected="+encodeURIComponent(target.id));
}catch(error){$("#formError").hidden=false;$("#formError").textContent="Không lưu được hồ sơ: "+error.message}
});
})();