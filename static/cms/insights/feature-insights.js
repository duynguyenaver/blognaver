(()=>{'use strict';const root=document.getElementById('featureStats'),note=document.getElementById('featureInsightNote');if(!root)return;
const categories=[
 ['Resume & CV',/resume|\bcv\b|portrait|avatar|word import|excel import|pdf|print/i],
 ['CMS & biên tập',/\bcms\b|editor|quill|site.manager|menu|insights/i],
 ['Giao diện & UX',/\bux\b|\bui\b|layout|style|css|theme|home|sidebar|header|footer|branding|navigation|toc/i],
 ['Bài viết & SEO',/post|article|blog|news|seo|taxonomy|category|tags|bilingual/i],
 ['Deploy & hạ tầng',/deploy|workflow|actions|hugo|build|github|pipeline|ci\b|script|cache/i],
 ['Tiện ích & dữ liệu',/import|export|data|analytics|sync|api|search|tool/i]
];
const tokenize=s=>String(s||'').replace(/[_/\\.-]/g,' ');
async function load(){
 try{
  const headers={Accept:'application/vnd.github+json'};const auth=window.BNAuth?.read();if(auth){const token=typeof auth==='string'?auth:auth.token;if(token)headers.Authorization='Bearer '+token}
  const response=await fetch('https://api.github.com/repos/duynguyenaver/blognaver/commits?sha=main&per_page=100',{headers,cache:'no-store'});if(!response.ok)throw Error('GitHub API '+response.status);
  const commits=await response.json();if(!Array.isArray(commits))throw Error('Dữ liệu commit không hợp lệ');
  const counts=new Map(categories.map(([name])=>[name,0]));counts.set('Khác',0);
  for(const commit of commits){const message=tokenize(commit.commit?.message?.split('\n')[0]);const group=categories.find(([,pattern])=>pattern.test(message))?.[0]||'Khác';counts.set(group,counts.get(group)+1)}
  const sorted=[...counts].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);root.replaceChildren();
  for(const [name,count] of sorted){const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:minmax(120px,1fr) minmax(120px,3fr) 55px;gap:12px;align-items:center;margin:10px 0';const label=document.createElement('span');label.textContent=name;const bar=document.createElement('div');bar.style.cssText='height:12px;border-radius:10px;background:#182944;overflow:hidden';const fill=document.createElement('div');fill.style.cssText='height:100%;background:#397be0;border-radius:10px;width:'+((count/commits.length)*100)+'%';bar.append(fill);const value=document.createElement('strong');value.textContent=count+' · '+Math.round(count/commits.length*100)+'%';value.style.cssText='font-size:12px;text-align:right';row.append(label,bar,value);root.append(row)}
  note.textContent='Đã phân tích '+commits.length+' commit gần nhất của main. Tính theo thông điệp commit, mỗi commit chỉ được tính một lần; commit không có từ khóa nằm trong “Khác”.';
 }catch(e){root.textContent='Không tải được lịch sử commit: '+e.message;note.textContent='Bạn có thể thử làm mới sau; dữ liệu này phụ thuộc hạn mức GitHub API.'}
}
load();document.getElementById('refreshInsights')?.addEventListener('click',load);
})();