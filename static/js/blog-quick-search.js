(()=>{"use strict";
document.addEventListener("DOMContentLoaded",()=>{
 const header=document.querySelector("#header,body > header,header");if(!header)return;
 const button=document.createElement("button");button.type="button";button.className="bn-quick-search-btn";button.textContent="⌕";button.setAttribute("aria-label","Tìm kiếm nhanh");button.title="Tìm bài viết (Ctrl/⌘ + K)";
 const nav=header.querySelector("nav")||header;nav.appendChild(button);
 const dialog=document.createElement("dialog");dialog.className="bn-quick-search-dialog";
 dialog.innerHTML='<form method="dialog" class="bn-search-head"><label for="bn-quick-query">Tìm bài viết</label><button type="submit" aria-label="Đóng tìm kiếm">✕</button></form><input id="bn-quick-query" type="search" autocomplete="off" placeholder="Tiêu đề hoặc nội dung bài viết…"><p id="bn-search-info" role="status">Nhập từ khóa để tìm bài viết.</p><div id="bn-search-results" aria-live="polite"></div>';
 document.body.appendChild(dialog);const query=dialog.querySelector("#bn-quick-query"),info=dialog.querySelector("#bn-search-info"),results=dialog.querySelector("#bn-search-results");
 let articles=null,loading=null;
 async function load(){
   if(articles)return articles;if(loading)return loading;
   loading=(async()=>{const root=document.querySelector('link[rel="canonical"]')?.href||location.href;const base=new URL("/blognaver/posts/index.xml",root);const response=await fetch(base,{cache:"force-cache"});if(!response.ok)throw Error("RSS HTTP "+response.status);const xml=new DOMParser().parseFromString(await response.text(),"application/xml");if(xml.querySelector("parsererror"))throw Error("RSS XML không hợp lệ");articles=Array.from(xml.querySelectorAll("item")).map(x=>({title:x.querySelector("title")?.textContent||"",description:x.querySelector("description")?.textContent.replace(/<[^>]+>/g," ").slice(0,500)||"",link:x.querySelector("link")?.textContent||""})).filter(x=>x.link&&new URL(x.link,location.href).origin===location.origin);return articles})();
   try{return await loading}finally{loading=null}
 }
 function render(){
  if(!articles)return;const q=query.value.trim().toLocaleLowerCase("vi");results.replaceChildren();if(!q){info.textContent="Nhập từ khóa để lọc bài viết.";return}
  const found=articles.filter(x=>(x.title+" "+x.description).toLocaleLowerCase("vi").includes(q)).slice(0,15);info.textContent=found.length?"Có "+found.length+" kết quả đầu tiên":"Không tìm thấy bài phù hợp.";
  for(const item of found){const a=document.createElement("a");a.href=item.link;a.className="bn-search-result";a.textContent=item.title;results.appendChild(a)}
 }
 button.addEventListener("click",async()=>{dialog.showModal();query.focus();info.textContent="Đang tải danh sách bài viết…";try{await load();render()}catch(e){info.textContent="Chưa tải được chỉ mục tìm kiếm. Dùng trang Tìm kiếm của blog để thử lại."}});
 query.addEventListener("input",render);document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();button.click()}if(e.key==="Escape"&&dialog.open)dialog.close()});
});
})();
