(()=>{"use strict";
const KEY="blognaver_visual_theme_v1",allowed=new Set(["editorial","hb"]);
function stored(){try{const v=localStorage.getItem(KEY)||"editorial";return allowed.has(v)?v:"editorial"}catch{return"editorial"}}
function apply(mode){const next=allowed.has(mode)?mode:"editorial";document.documentElement.dataset.bnVisualTheme=next;document.querySelectorAll(".bn-theme-option").forEach(button=>{const active=button.dataset.theme===next;button.setAttribute("aria-pressed",String(active));button.title=active?"Giao diện đang sử dụng":"Chuyển sang "+button.textContent});}
function boot(){if(document.getElementById("bnThemeSwitcher"))return;const nav=document.createElement("nav");nav.id="bnThemeSwitcher";nav.className="bn-theme-switcher";nav.setAttribute("aria-label","Chọn giao diện blog");
[["editorial","Editorial"],["hb","HB Style"]].forEach(([id,label])=>{const b=document.createElement("button");b.className="bn-theme-option";b.type="button";b.dataset.theme=id;b.textContent=label;b.addEventListener("click",()=>{try{localStorage.setItem(KEY,id)}catch{}apply(id)});nav.append(b)});document.body.append(nav);apply(stored());}
apply(stored());if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.addEventListener("storage",e=>{if(e.key===KEY)apply(stored())});
})();