(()=>{'use strict';
const $=s=>document.querySelector(s),status=$('#wordStatus');
const sections=[
 ['HỒ SƠ CÁ NHÂN',['name: Nguyễn Văn A','headline: Production Planning Specialist','location: Ho Chi Minh City','email: example@email.com','phone: 0900000000','linkedin:','github:','website:','avatar:','summary: Mô tả ngắn kinh nghiệm và mục tiêu nghề nghiệp.']],
 ['KINH NGHIỆM',['Mỗi công việc một dòng, ngăn cách các cột bằng dấu |','company | role | dates | location | mode | description','Công ty ABC | Chuyên viên kế hoạch | 2024–2026 | Đồng Nai | On-site | Điều phối kế hoạch sản xuất và báo cáo tiến độ.']],
 ['HỌC VẤN',['school | degree | dates','Đại học ABC | Cử nhân | 2018–2022']],
 ['KỸ NĂNG',['Mỗi dòng một kỹ năng','Excel','Korean','Production planning']]
];
$('#downloadWord').onclick=async()=>{
 try{
 const d=window.docx;if(!d)throw Error('Không tải được thư viện tạo Word. Kiểm tra mạng và thử lại.');
 const paragraphs=[];
 for(const [heading,lines] of sections){paragraphs.push(new d.Paragraph({text:heading,heading:d.HeadingLevel.HEADING_1}));for(const line of lines)paragraphs.push(new d.Paragraph({text:line,spacing:{after:100}}));}
 const doc=new d.Document({sections:[{properties:{},children:paragraphs}]});
 const blob=await d.Packer.toBlob(doc);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='BlogNaver-Resume-Template.docx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='Đã tạo mẫu Word. Hãy giữ nguyên tên các trường và các dấu | giữa cột.';
 }catch(e){status.textContent=e.message}
};
$('#uploadWord').onchange=async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
 if(!/\.docx$/i.test(file.name))throw Error('Hãy chọn file .docx');
 if(!window.mammoth)throw Error('Thư viện đọc Word chưa tải được.');
 const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
 const lines=result.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 let section='',ex=[],ed=[],skills=[],personal={};
 for(const line of lines){
  const upper=line.toLocaleUpperCase('vi');
  if(['HỒ SƠ CÁ NHÂN','KINH NGHIỆM','HỌC VẤN','KỸ NĂNG'].includes(upper)){section=upper;continue}
  if(section==='HỒ SƠ CÁ NHÂN'){
   const i=line.indexOf(':');if(i<0)continue;const key=line.slice(0,i).trim().toLowerCase();if(['name','headline','location','email','phone','linkedin','github','website','avatar','summary'].includes(key))personal[key]=line.slice(i+1).trim();
  }else if(section==='KINH NGHIỆM'&&line.includes('|')&&!line.toLowerCase().startsWith('company')){
   const [company,role,dates,location,mode,description]=line.split('|').map(x=>x.trim());if(company)ex.push({company,role,dates,location,mode,description});
  }else if(section==='HỌC VẤN'&&line.includes('|')&&!line.toLowerCase().startsWith('school')){
   const [school,degree,dates]=line.split('|').map(x=>x.trim());if(school)ed.push({school,degree,dates});
  }else if(section==='KỸ NĂNG'&&!line.toLowerCase().startsWith('mỗi dòng'))skills.push(line);
 }
 if(!personal.name)throw Error('Không thấy trường name: trong phần HỒ SƠ CÁ NHÂN. Hãy dùng file mẫu Word.');
 if(!confirm('Nhập Word sẽ thay thế các dữ liệu hiện đang điền. Tiếp tục?'))return;
 $('#newResumeBtn').click();
 for(const [key,value] of Object.entries(personal)){const el=document.querySelector('#form [name="'+key+'"]');if(el)el.value=value}
 const fillList=(host,add,items)=>{host.replaceChildren();for(const row of items){add.click();for(const inp of host.lastElementChild.querySelectorAll('[data-key]'))inp.value=row[inp.dataset.key]||''}if(!items.length)add.click()};
 fillList($('#experiences'),$('#addexp'),ex);fillList($('#educations'),$('#addedu'),ed);
 document.querySelector('#form [name="skills"]').value=skills.join(', ');
 status.textContent='Đã nhập Word: '+ex.length+' công việc, '+ed.length+' học vấn, '+skills.length+' kỹ năng. Hãy kiểm tra rồi xem trước A4.';
 }catch(e){status.textContent='Lỗi nhập Word: '+e.message}finally{event.target.value=''}
};
})();