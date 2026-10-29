(()=>{"use strict";
const root=document.getElementById("bn-feature-list"),note=document.getElementById("bn-feature-updated");if(!root)return;
const endpoint="https://api.github.com/repos/duynguyenaver/blognaver/pulls?state=closed&sort=updated&direction=desc&per_page=100";
const cacheKey="blognaver_recent_features_v1";
const fallback=[
 {number:42,title:"Interview Tracking: trang nhập liệu riêng và Smart Insights",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/42"},
 {number:40,title:"Interview Tracking: quản lý toàn bộ vòng đời ứng tuyển",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/40"},
 {number:39,title:"Smart Insights: biểu đồ PR, Actions và deploy",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/39"},
 {number:38,title:"Resume CMS: hai bố cục hồ sơ Samsung và ảnh chân dung",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/38"},
 {number:37,title:"Thumbnail cho điều hướng bài trước và tiếp theo",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/37"},
 {number:35,title:"Gợi ý bài ngẫu nhiên trong nội dung blog",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/35"},
 {number:33,title:"SERIES Smart Insights có tìm kiếm và lọc",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/33"},
 {number:32,title:"Bài liên quan: thumbnail và tag series",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/32"},
 {number:31,title:"Thư viện SERIES và thống kê các kỳ nghiên cứu",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/31"},
 {number:29,title:"Navbar: nền xanh nhạt cho mục điều hướng",merged_at:"2026-10-29",html_url:"https://github.com/duynguyenaver/blognaver/pull/29"}
];
const routeFrom=pr=>{
 const title=(pr.title||"").toLowerCase();
 if(/all.posts|tất cả bài viết|content.library|dedicated.*posts/.test(title))return "/blognaver/cms/posts/";
 if(/interview.track|interview.*life.cycle|interview.*application|interview.*insights/.test(title))return "/blognaver/tien-ich/interview-tracking/";
 if(/resume.*cms|samsung.*resume|samsung.*application/.test(title))return "/blognaver/resume-cms/";
 if(/insights.*actions|restore.*insights|pr.*deploy.*insights/.test(title))return "/blognaver/cms/insights/";
 if(/series.*smart|series.*library|series.*nav|series.*tags|series.*insights/.test(title))return "/blognaver/series/";
 if(/nav.*background|navbar|navigation.*thumb|post.*recommend|random.*recommend|thumbnail.*footer/.test(title))return "/blognaver/posts/";
 return pr.html_url;
};
function cleanTitle(raw){return String(raw||"").replace(/^(?:feat|fix|style|hotfix|ux|content|ci)(?:\([^)]+\))?:?\s*/i,"").replace(/[#*]/g,"").trim()}
function show(data,stale=false){
 root.replaceChildren();
 for(const [idx,pr] of data.slice(0,10).entries()){
  const li=document.createElement("li"),a=document.createElement("a"),rank=document.createElement("span"),copy=document.createElement("span"),strong=document.createElement("strong"),small=document.createElement("small");
  a.href=routeFrom(pr);rank.className="bn-feature-rank";rank.textContent=String(idx+1).padStart(2,"0");
  copy.className="bn-feature-item";strong.textContent=cleanTitle(pr.title)||"Cập nhật BlogNaver";
  const when=pr.merged_at?new Date(pr.merged_at).toLocaleDateString("vi-VN"):null;
  small.textContent="#"+pr.number+(when?" · "+when:"");copy.append(strong,small);a.append(rank,copy);li.append(a);root.append(li);
 }
 note.textContent=stale?"Danh sách dự phòng · kiểm tra GitHub để xem mới nhất":"Từ GitHub · cập nhật khi mở trang";
}
function valid(x){return x&&Number.isInteger(x.number)&&x.merged_at&&typeof x.title==="string"&&typeof x.html_url==="string"}
function eligible(x){return valid(x)&&!/^ci[:(]|^docs[:(]|^chore[:(]|^test[:(]|^refactor[:(]/i.test(x.title)&&!/dependabot|renovate/i.test(x.user?.login||"")&&!/revert|rollback/i.test(x.title)}
async function fetchLatest(){
 let controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{const response=await fetch(endpoint,{signal:controller.signal,cache:"no-store",headers:{Accept:"application/vnd.github+json"}});
 if(!response.ok)throw Error("GitHub HTTP "+response.status);
 const all=await response.json();if(!Array.isArray(all))throw Error("Malformed PR data");
 const list=all.filter(eligible).sort((a,b)=>new Date(b.merged_at)-new Date(a.merged_at)).slice(0,10);
 if(!list.length)throw Error("No recent merged feature PRs");
 try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),items:list}))}catch{}
 show(list,false);
 }catch(e){let stored;try{stored=JSON.parse(localStorage.getItem(cacheKey)||"null")?.items}catch{}
 show(Array.isArray(stored)&&stored.length?stored:fallback,true);
 }finally{clearTimeout(timeout)}
}
show(fallback,true);fetchLatest();
})();