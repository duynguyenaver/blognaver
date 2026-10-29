/* CV renderer shared by local Resume CMS preview; published Hugo template uses same fields/layout. */
(function(){
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const v=(x)=>esc(x||"—");
 const lines=(value)=>String(value||"").split("\n").map(s=>s.trim()).filter(Boolean);
 const td=(s,label=false)=>"<"+(label?"th":"td")+">"+v(s)+"</"+(label?"th":"td")+">";
 function table(head,rows){return '<table class="cv-table"><thead><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>td(x)).join('')+'</tr>').join('')+'</tbody></table>'}
 function section(title,inner,sub=""){return '<section class="cv-section"><h2>'+esc(title)+'</h2>'+(sub?'<p class="cv-section-sub">'+esc(sub)+'</p>':'')+inner+'</section>'}
 function essay(label,value){if(!String(value||"").trim())return '';return '<div class="cv-essay"><div class="cv-essay-title">'+esc(label)+'</div><div class="cv-essay-body">'+esc(value)+'</div></div>'}
 window.renderSamsungCV=function(res){
   const heavy=res.cvTemplate==="heavy";
   const edu=(res.education||[]).map(x=>[x.level||"",x.start||x.dates||"",x.end||"",x.school||"",x.major||x.degree||"",x.graduation||"",x.gpa||""]);
   const exp=(res.experience||[]).map(x=>[x.dates||"",x.company||"",x.role||"",x.description||"",x.employmentType||x.mode||""]);
   const photo=res.avatar?'<img class="cv-photo" alt="Ảnh chân dung" src="'+esc(res.avatar)+'">':'<span class="cv-photo-placeholder">Ảnh chân dung<br>증명사진</span>';
   const name=res.koreanName||res.name;
   let out='<div class="cv-utility"><a href="./">← Resume CMS</a><button onclick="window.print()">In / Xuất PDF A4</button></div>';
   out+='<main class="cv-paper"><header class="cv-head"><div><div class="cv-brand">CORPORATE APPLICATION</div><h1>입사지원서 · HỒ SƠ ỨNG TUYỂN</h1><p>'+(heavy?'Bố cục tham khảo Samsung Heavy Industries':'Bố cục tham khảo Samsung Electronics')+' · mẫu cá nhân không phải biểu mẫu chính thức</p></div><div class="cv-meta">작성일: '+v(res.applicationDate)+'<br>입사가능일: '+v(res.availableDate)+'</div></header>';
   out+=section("01 · 인적사항 | THÔNG TIN CÁ NHÂN",'<table class="cv-table"><tbody><tr><th class="cv-pair-label">성명</th><td class="cv-pair-value">'+v(name)+'</td><th class="cv-pair-label">영문성명</th><td>'+v(res.englishName||res.name)+'</td><td class="cv-photo-cell" rowspan="5">'+photo+'</td></tr><tr><th>지원직무</th><td>'+v(res.targetRole||res.headline)+'</td><th>희망 근무지</th><td>'+v(res.preferredLocation||res.location)+'</td></tr><tr><th>생년월일</th><td>'+v(res.birthDate)+'</td><th>국적 / 성별</th><td>'+v([res.nationality,res.gender].filter(Boolean).join(" · "))+'</td></tr><tr><th>핸드폰</th><td>'+v(res.phone)+'</td><th>e-mail</th><td>'+v(res.email)+'</td></tr><tr><th>주소</th><td colspan="3">'+v(res.address||res.location)+'</td></tr></tbody></table>');
   out+=section("02 · 학력사항 | HỌC VẤN",table(["학력","입학년월","졸업년월","학교명","전공","졸업구분","학점"],edu.length?edu:[["","","","","","",""]]));
   out+=section("03 · 경력사항 | KINH NGHIỆM",table(["근무기간","근무처","최종직급","직무(담당업무)","정규/계약"],exp.length?exp:[["","","","",""]]));
   out+=section("04 · 자격/어학 | CHỨNG CHỈ & NGOẠI NGỮ",'<div class="cv-split">'+table(["자격사항 / Chứng chỉ"],lines(res.certifications).map(x=>[x]).length?lines(res.certifications).map(x=>[x]):[[""]])+table(["어학사항 / Ngoại ngữ"],lines(res.languages).map(x=>[x]).length?lines(res.languages).map(x=>[x]):[[""]])+'</div>');
   if(res.military||res.employmentPreference)out+=section("05 · 기타 | THÔNG TIN KHÁC",table(["병역 / Quân ngũ","근무형태 / Hình thức"],[[res.military||"",res.employmentPreference||""]]));
   if(res.summary)out+=essay("PROFESSIONAL SUMMARY",res.summary);
   if(heavy || [res.growth,res.personality,res.socialLife,res.motivation,res.futureGoals].some(Boolean)){
     out+=section("자기소개서 | BÀI TỰ GIỚI THIỆU",
       essay("성장과정 · Quá trình trưởng thành",res.growth)+essay("성격 · Tính cách",res.personality)+essay("학교생활 / 사회생활 · Học tập và xã hội",res.socialLife)+essay("지원동기 / 이직사유 · Lý do ứng tuyển",res.motivation)+essay("입사 후 포부 · Mục tiêu sau khi gia nhập",res.futureGoals));
   }
   let details='';
   for(const x of res.experience||[]){if(!x.description)continue;details+='<div class="cv-timeline"><div class="cv-timeline-header">'+esc([x.company,x.dates,x.role].filter(Boolean).join("  ·  "))+'</div><div class="cv-timeline-body">'+esc(x.description)+'</div></div>'}
   if(res.careerDetails)details+=essay("경력사항 기술 · Mô tả dự án / Vai trò",res.careerDetails);
   if(details)out+=section("경력 사항 기술 | CHI TIẾT SỰ NGHIỆP",details);
   const extras=[["수상/교육 · Giải thưởng & đào tạo",res.awardsTraining],["연구/논문/특허 · Nghiên cứu",res.research],["주요 성과 · Thành tích",res.achievements],["기타 · Thông tin khác",res.otherDetails],["SKILLS",Array.isArray(res.skills)?res.skills.join(", "):res.skills]].filter(x=>x[1]);
   if(extras.length)out+=section("OTHER INFORMATION | THÔNG TIN BỔ SUNG",extras.map(x=>essay(x[0],x[1])).join(''));
   out+='<p class="cv-notice">Biểu mẫu CV cá nhân lấy cảm hứng từ tài liệu do người dùng cung cấp, không thuộc hay đại diện Samsung. Không đưa bí mật kinh doanh, thông tin nhạy cảm hoặc người tham chiếu lên trang công khai nếu chưa được phép.</p></main>';
   return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>CV · '+esc(res.name)+'</title><link rel="stylesheet" href="../css/samsung-resume.css"></head><body>'+out+'</body></html>';
 };
})();
