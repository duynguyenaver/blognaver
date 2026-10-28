(()=>{'use strict';
const $=s=>document.querySelector(s), status=$('#excelStatus');
const sheets=[
 {name:'Ho so',rows:[['TRƯỜNG THÔNG TIN','GIÁ TRỊ'],['name','Nguyễn Văn A'],['headline','Production Planning Specialist'],['location','Ho Chi Minh City'],['email','example@email.com'],['linkedin',''],['github',''],['website',''],['avatar',''],['summary','Tóm tắt nghề nghiệp của bạn.']]},
 {name:'Kinh nghiem',rows:[['company','url','logo','role','dates','location','mode'],['Công ty ABC','','','Nhân viên kế hoạch','2024–2026','Đồng Nai','On-site']]},
 {name:'Hoc van',rows:[['school','url','logo','degree','dates'],['Đại học ABC','','','Cử nhân','2004–2008']]},
 {name:'Ky nang',rows:[['skill'],['Excel'],['Korean']]}
];
function book(){const w=XLSX.utils.book_new();for(const {name,rows} of sheets){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map((_,j)=>({wch:j===1&&name==='Ho so'?52:24}));XLSX.utils.book_append_sheet(w,ws,name)}return w}
$('#downloadExcel').addEventListener('click',()=>{if(!window.XLSX){status.textContent='Không tải được thư viện Excel. Hãy kiểm tra mạng.';return}XLSX.writeFile(book(),'BlogNaver-Resume-Template.xlsx')});
function rows(w,name){const ws=w.Sheets[name];if(!ws)throw Error('Thiếu sheet: '+name);return XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,String(v??'').trim()])))}
function clearAndFill(host,addButton,items){host.replaceChildren();for(const item of items){addButton.click();const last=host.lastElementChild;for(const inp of last.querySelectorAll('[data-key]')){inp.value=item[inp.dataset.key]||''}}if(!items.length)addButton.click()}
$('#uploadExcel').addEventListener('change',async ev=>{
 const file=ev.target.files?.[0];if(!file)return;
 if(!window.XLSX){status.textContent='Thư viện Excel chưa tải được. Vui lòng thử lại khi có mạng.';return}
 try{
  if(!/\.xlsx?$/i.test(file.name))throw Error('Chỉ hỗ trợ file Excel .xlsx hoặc .xls');
  const w=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const ws=w.Sheets['Ho so'];if(!ws)throw Error('Thiếu sheet Ho so');
  const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
  const personal={};for(const line of matrix.slice(1)){const key=String(line[0]||'').trim();if(key)personal[key]=String(line[1]??'').trim()}
  const ex=rows(w,'Kinh nghiem').filter(x=>Object.values(x).some(Boolean));
  const ed=rows(w,'Hoc van').filter(x=>Object.values(x).some(Boolean));
  const skills=rows(w,'Ky nang').map(x=>x.skill).filter(Boolean);
  if(!personal.name)throw Error('Sheet Ho so phải có trường name');
  if(!confirm('Nạp dữ liệu Excel sẽ thay thế các trường đang nhập trên màn hình. Tiếp tục?'))return;
  $('#newResumeBtn').click();
  for(const [key,val] of Object.entries(personal)){const control=document.querySelector('#form [name="'+CSS.escape(key)+'"]');if(control)control.value=val}
  clearAndFill($('#experiences'),$('#addexp'),ex);
  clearAndFill($('#educations'),$('#addedu'),ed);
  document.querySelector('#form [name="skills"]').value=skills.join(', ');
  status.textContent='Đã nhập '+ex.length+' công việc, '+ed.length+' mục học vấn và '+skills.length+' kỹ năng. Kiểm tra lại rồi nhấn Xem trước A4.';
  status.classList.remove('error');
 }catch(error){status.textContent='Không thể nhập Excel: '+error.message;status.classList.add('error')}
 finally{ev.target.value=''}
});
})();