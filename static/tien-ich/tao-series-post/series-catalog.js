(()=>{"use strict";
const select=document.getElementById("series"),field=document.getElementById("customSeries"),newName=document.getElementById("newSeriesName"),add=document.getElementById("addSeriesToCatalog"),list=document.getElementById("seriesCatalogList"),status=document.getElementById("seriesCatalogStatus");
if(!select||!newName||!add)return;
const KEY="bn_series_custom_names_v1";
const slug=text=>String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-+$/g,"").slice(0,75);
const stored=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}};
const write=value=>{localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new CustomEvent("bn:series-catalog-updated"))};
function register(name,choose=false){name=String(name||"").trim().replace(/\s+/g," ");const id=slug(name);if(name.length<3||!id||id.length<2)throw Error("Tên series phải có tối thiểu 3 ký tự hợp lệ.");
let option=[...select.options].find(o=>o.value===id);if(!option){option=document.createElement("option");option.value=id;select.append(option)}option.textContent=name;
const names=stored();names[id]=name;write(names);if(choose){select.value=id;field.value=""}render();return id}
function render(){const names=stored();list.replaceChildren();const ul=document.createElement("ul");ul.className="bn-series-catalog-list";for(const [id,name] of Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1],"vi"))){const li=document.createElement("li"),btn=document.createElement("button");btn.className="ghost";btn.type="button";btn.textContent=name;btn.onclick=()=>{select.value=id;field.value="";status.textContent="Đã chọn "+name+" cho bài tiếp theo."};li.append(btn);ul.append(li)}list.append(ul)}
for(const [id,name] of Object.entries(stored())){let option=[...select.options].find(o=>o.value===id);if(!option){option=document.createElement("option");option.value=id;option.textContent=name;select.append(option)}}
if(![...select.options].some(o=>o.value==="khac")){const other=document.createElement("option");other.value="khac";other.textContent="Khác";select.append(other)}
add.onclick=()=>{try{const id=register(newName.value,true);newName.value="";status.textContent="Đã thêm "+select.selectedOptions[0].textContent+" vào dropdown (mã: "+id+")."}catch(e){status.textContent=e.message}};
window.BNSeriesCatalog={register,slug};
window.addEventListener("bn:series-catalog-updated",render);render();
})();