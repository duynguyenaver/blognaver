(()=>{'use strict';
const owner='duynguyenaver',repo='blognaver',branch='main',base='https://duynguyenaver.github.io/blognaver/';
let token='', loadedSlug='', loadedSha='';
const $=s=>document.querySelector(s), form=$('#form'),exp=$('#experiences'),edu=$('#educations'),status=$('#status');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64encode=s=>{const bytes=new TextEncoder().encode(s);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)};
const b64decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const safeURL=s=>{s=String(s||'').trim();return !s||/^https:\/\//i.test(s)?s:''};
let portraitData='';
let portraitOriginal=null;
const cropState={zoom:1,x:0,y:0};
function cropPortrait(){
 if(!portraitOriginal)return;
 const img=portraitOriginal,canvas=document.createElement('canvas');
 canvas.width=480;canvas.height=600;
 const ctx=canvas.getContext('2d');
 const scale=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight)*cropState.zoom;
 const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
 const maxX=Math.max(0,(dw-canvas.width)/2),maxY=Math.max(0,(dh-canvas.height)/2);
 const dx=(canvas.width-dw)/2+cropState.x*maxX/100;
 const dy=(canvas.height-dh)/2+cropState.y*maxY/100;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(img,dx,dy,dw,dh);
 portraitData=canvas.toDataURL('image/jpeg',.86);
 $('#portraitPreview').src=portraitData;
 $('#portraitPreview').style.display='block';
 $('#portraitStatus').textContent='Ảnh đã cắt 4:5, sẵn sàng xem trước và lưu cùng CV.';
}
$('#portraitFile').addEventListener('change',async ev=>{
 const file=ev.target.files?.[0];portraitData='';portraitOriginal=null;
 if(!file){$('#portraitCropControls').hidden=true;$('#portraitPreview').style.display='none';return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024){$('#portraitStatus').textContent='Chỉ nhận JPEG, PNG, WebP tối đa 3 MB.';ev.target.value='';return}
 try{
   const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Không đọc được ảnh'));reader.readAsDataURL(file)});
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src});
   portraitOriginal=img;cropState.zoom=1;cropState.x=0;cropState.y=0;
   $('#portraitZoom').value='1';$('#portraitOffsetX').value='0';$('#portraitOffsetY').value='0';
   $('#portraitCropControls').hidden=false;cropPortrait();
 }catch(err){$('#portraitStatus').textContent=err.message;ev.target.value='';$('#portraitCropControls').hidden=true;}
});
for(const [id,key] of [['portraitZoom','zoom'],['portraitOffsetX','x'],['portraitOffsetY','y']]){
 document.getElementById(id).addEventListener('input',e=>{cropState[key]=Number(e.target.value);cropPortrait()});
}
$('#clearPortrait').addEventListener('click',()=>{
 portraitData='';portraitOriginal=null;$('#portraitFile').value='';$('#portraitPreview').style.display='none';$('#portraitCropControls').hidden=true;$('#portraitStatus').textContent='Đã xóa ảnh được chọn.';
});
async function publishPortrait(slug){
 const file=$('#portraitFile').files?.[0];if(!file||!portraitData)return null;
 const ext='jpg'; // Cropped photograph is normalized to JPEG.
 const path='static/images/resumes/'+slug+'/portrait.'+ext;
 let existing=null;try{existing=(await api('contents/'+path+'?ref=main')).sha}catch(e){if(!String(e.message).includes('Not Found'))throw e}
 const result=await api('contents/'+path,'PUT',{message:'feat(resume): upload portrait for '+slug,content:portraitData.split(',')[1],branch,...(existing?{sha:existing}:{})});
 return base+'images/resumes/'+encodeURIComponent(slug)+'/portrait.'+ext+'?v='+result.content.sha.slice(0,10);
}

function notify(s,error=false){status.textContent=s;status.className='status'+(error?' error':'')}
async function api(path,method='GET',data){if(!token)throw Error('Hãy kết nối GitHub trước.');const res=await fetch('https://api.github.com/repos/'+owner+'/'+repo+'/'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});let result=await res.json().catch(()=>({}));if(!res.ok)throw Error((result.message||'GitHub HTTP '+res.status)+(res.status===401?' — token không hợp lệ.':'')+(res.status===403?' — kiểm tra quyền Contents: Read and write.':''));return result}
let entryFieldId=0;
const templates={experience:[['company','Công ty · 근무처'],['url','Website URL'],['logo','Logo URL'],['role','Chức danh · 직위'],['dates','Thời gian · 근무기간 (YYYY.MM–YYYY.MM)'],['employmentType','Hình thức · 정규/계약'],['salary','Mức lương (tùy chọn; không bắt buộc công khai)'],['location','Địa điểm'],['mode','Remote / Hybrid / On-site'],['description','Nhiệm vụ / Thành tích · 주요 업무']],education:[['school','Trường · 학교명'],['level','Bậc học · 학력 (THPT/ĐH/ThS/TS)'],['start','Nhập học · 입학년월'],['end','Tốt nghiệp · 졸업년월'],['major','Chuyên ngành · 전공'],['graduation','Tình trạng tốt nghiệp · 졸업구분'],['gpa','Điểm trung bình · 학점'],['url','Website URL'],['logo','Logo URL'],['degree','Bằng cấp / khóa học'],['dates','Năm (dữ liệu cũ)']]};
function addEntry(kind,data={}){const host=kind==='experience'?exp:edu;const item=document.createElement('div');item.className='entry';const head=document.createElement('div');head.className='labelrow';head.innerHTML='<h4>'+(kind==='experience'?'Công việc':'Học vấn')+'</h4>';const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Xóa mục';remove.onclick=()=>item.remove();head.append(remove);item.append(head);const grid=document.createElement('div');grid.className='grid';for(const [name,label] of templates[kind]){const field=document.createElement('div');field.className='field';const lbl=document.createElement('label');lbl.textContent=label;const input=document.createElement(name==='description'?'textarea':'input');if(name==='description'){field.classList.add('wide');input.rows=5;input.placeholder='Mỗi trách nhiệm hoặc thành tích một dòng…'}input.id=kind+'-'+(++entryFieldId)+'-'+name;lbl.htmlFor=input.id;input.dataset.key=name;input.value=data[name]||'';if(name==='url'||name==='logo')input.type='url';field.append(lbl,input);grid.append(field)}item.append(grid);host.append(item)}
function entries(host){return Array.from(host.querySelectorAll('.entry')).map(el=>Object.fromEntries(Array.from(el.querySelectorAll('[data-key]')).map(inp=>[inp.dataset.key,inp.value.trim()]))).filter(x=>Object.values(x).some(Boolean))}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,65).replace(/-+$/,'')||'resume'}
function fields(preview=false){const f=new FormData(form);const name=String(f.get('name')||'').trim();if(!name&&!preview)throw Error('Vui lòng nhập họ tên để xuất bản.');const slug=loadedSlug||slugify(name);const r={};for(const key of ['name','headline','location','summary','email','phone','linkedin','github','website','avatar','cvTemplate','targetRole','koreanName','englishName','birthDate','nationality','gender','preferredLocation','address','availableDate','applicationDate','certifications','languages','military','employmentPreference','awardsTraining','research','achievements','growth','personality','socialLife','motivation','futureGoals','careerDetails','otherDetails'])r[key]=String(f.get(key)||'').trim();for(const key of ['linkedin','github','website','avatar'])if(r[key]&&!safeURL(r[key]))throw Error(key+' chỉ chấp nhận URL HTTPS.');const ex=entries(exp),ed=entries(edu);for(const item of [...ex,...ed])for(const key of ['url','logo'])if(item[key]&&!safeURL(item[key]))throw Error('URL logo/website phải dùng HTTPS.');r.experience=ex;r.education=ed;r.skills=String(f.get('skills')||'').split(',').map(s=>s.trim()).filter(Boolean);return {slug,resume:r}}
function contentOf(res){return '---\ntitle: '+JSON.stringify(res.resume.name)+'\ntype: "resume"\nlayout: "single"\ndraft: false\nresume: '+JSON.stringify(res.resume)+'\n---\n'}
function fill(data){HTMLFormElement.prototype.reset.call(form);portraitData='';portraitOriginal=null;$('#portraitCropControls').hidden=true;$('#portraitPreview').style.display='none';for(const [key,value] of Object.entries(data.resume||{})){const el=form.elements.namedItem(key);if(el&&el.tagName)el.value=Array.isArray(value)?value.join(', '):value??''}if(data.resume?.avatar){$('#portraitPreview').src=data.resume.avatar;$('#portraitPreview').style.display='block';$('#portraitStatus').textContent='Ảnh đang lưu trong CV. Chọn ảnh mới nếu muốn thay.';}$('#slug').value=data.slug;exp.innerHTML='';edu.innerHTML='';(data.resume.experience||[]).forEach(x=>addEntry('experience',x));(data.resume.education||[]).forEach(x=>addEntry('education',x))}
function reset(){HTMLFormElement.prototype.reset.call(form);portraitData='';portraitOriginal=null;$('#portraitCropControls').hidden=true;$('#portraitPreview').removeAttribute('src');$('#portraitPreview').style.display='none';$('#portraitStatus').textContent='Chưa chọn ảnh.';exp.innerHTML='';edu.innerHTML='';addEntry('experience');addEntry('education');loadedSlug='';loadedSha='';$('#result').textContent='';notify('Tạo hồ sơ mới.')}
$('#newResumeBtn').onclick=reset;$('#addexp').onclick=()=>addEntry('experience');$('#addedu').onclick=()=>addEntry('education');
$('#connect').onclick=async()=>{token=$('#token').value.trim();$('#token').value='';try{const r=await api('contents/README.md?ref=main');$('#authstatus').textContent='Đã kết nối · quyền đọc được xác nhận. Quyền ghi sẽ được kiểm tra khi lưu.';await refresh()}catch(e){token='';$('#authstatus').textContent=e.message}};
$('#disconnect').onclick=()=>{token='';$('#token').value='';$('#authstatus').textContent='Đã ngắt kết nối';$('#saved').textContent='';};
async function refresh(){const container=$('#saved');container.textContent='Đang tải...';try{const files=await api('contents/content/resume?ref=main');const folders=files.filter(x=>x.type==='dir');container.textContent='';if(!folders.length)container.textContent='Chưa có resume.';for(const folder of folders){const box=document.createElement('div');box.className='saved';const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent=folder.name;btn.style.margin='6px 6px 6px 0';btn.onclick=()=>load(folder.name);const link=document.createElement('a');link.href=base+'resume/'+encodeURIComponent(folder.name)+'/';link.target='_blank';link.rel='noopener';link.textContent='Xem ↗';box.append(btn,link);container.append(box)}}catch(e){container.textContent=e.message}}
$('#refresh').onclick=()=>refresh();
async function load(slug){try{notify('Đang tải '+slug+'...');const path='contents/content/resume/'+slug+'/index.md?ref=main';const file=await api(path);const source=b64decode(file.content);const match=source.match(/^resume:\s*(\{[^\n]*\})/m);if(!match)throw Error('Không tìm thấy dữ liệu resume ở YAML frontmatter.');const data=JSON.parse(match[1]);fill({slug,resume:data});loadedSlug=slug;loadedSha=file.sha;notify('Đã mở hồ sơ '+slug+'. Có thể sửa và nhấn Lưu.');window.scrollTo({top:0,behavior:'smooth'})}catch(e){notify(e.message,true)}}
async function existingSha(slug){try{const file=await api('contents/content/resume/'+slug+'/index.md?ref=main');return file.sha}catch(e){if(String(e.message).includes('Not Found'))return null;throw e}}
function resultLink(slug){const url=base+'resume/'+encodeURIComponent(slug)+'/';const out=$('#result');out.textContent='URL sau khi deploy: ';const a=document.createElement('a');a.href=url;a.textContent=url;a.target='_blank';a.rel='noopener';out.append(a)}
form.addEventListener('submit',async event=>{event.preventDefault();let r;try{r=fields();if(!token)throw Error('Hãy kết nối GitHub trước.');$('#publish').disabled=true;notify('Đang kiểm tra và gửi nội dung lên GitHub...');let sha=loadedSlug?loadedSha:null;if(!loadedSlug){const baseSlug=r.slug;let counter=1;while(await existingSha(r.slug)){counter++;r.slug=baseSlug+'-'+counter;if(counter>50)throw Error('Không thể tạo đường dẫn CV duy nhất.')} }const photoURL=await publishPortrait(r.slug);if(photoURL){r.resume.avatar=photoURL;form.elements.namedItem('avatar').value=photoURL}const payload={message:(sha?'fix(resume): update ':'feat(resume): publish ')+r.slug,content:b64encode(contentOf(r)),branch,...(sha?{sha}:{})};const saved=await api('contents/content/resume/'+r.slug+'/index.md','PUT',payload);loadedSlug=r.slug;loadedSha=saved.content.sha;form.dispatchEvent(new Event('change',{bubbles:true}));notify('Đã commit: '+saved.commit.sha.slice(0,12)+'. GitHub Actions sẽ build; URL hoạt động sau khi deploy thành công.');resultLink(r.slug);await refresh()}catch(e){notify(e.message,true)}finally{$('#publish').disabled=false}});
$('#preview').onclick=()=>{try{const r=fields(true);if(portraitData)r.resume.avatar=portraitData;$('#previewFrame').srcdoc=window.renderSamsungCV(r.resume);$('#resumePreview').showModal()}catch(e){notify(e.message,true)}};
$('#closeResumePreview').onclick=()=>$('#resumePreview').close();
$('#printResumePreview').onclick=()=>{const frame=$('#previewFrame');if(!frame.srcdoc){notify('Hãy xem trước CV trước khi in.',true);return}frame.contentWindow?.focus();frame.contentWindow?.print()};
$('#resumePreview').addEventListener('close',()=>{$('#previewFrame').removeAttribute('srcdoc')});
reset();
for(const label of form.querySelectorAll('.field>label')){const input=label.parentElement.querySelector('input,textarea,select');if(input){if(!input.id)input.id='cv-field-'+(input.name||++entryFieldId);label.htmlFor=input.id}}
// Only CV form fields are exposed to the local draft adapter; credentials stay outside.
window.BNResumeEditor={capture(){return {fields:Object.fromEntries([...new FormData(form)].filter(([,v])=>typeof v==='string')),experience:entries(exp),education:entries(edu),slug:loadedSlug,sha:loadedSha}},restore(draft){const data={...draft.fields,experience:draft.experience,education:draft.education,skills:String(draft.fields.skills||'').split(',').map(x=>x.trim()).filter(Boolean)};fill({slug:draft.slug,resume:data});loadedSlug=draft.slug;loadedSha=draft.sha}};
})();