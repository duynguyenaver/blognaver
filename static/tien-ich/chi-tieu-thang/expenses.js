(()=>{"use strict";
const $=id=>document.getElementById(id),KEY="bn_monthly_spending_v1",BK="bn_monthly_budgets_v1",money=n=>Math.round(Number(n)||0).toLocaleString("vi-VN")+" ₫",monthOf=d=>String(d||"").slice(0,7),today=()=>new Date().toLocaleDateString("en-CA");
let items=[],budgets={},deleted={};try{items=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(items))items=[]}catch{}try{budgets=JSON.parse(localStorage.getItem(BK)||"{}")}catch{}
$("date").value=today();$("month").value=today().slice(0,7);
const el=(tag,t,cls)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;if(cls)n.className=cls;return n};
const persist=async()=>{await window.BNFinanceStore.put("expenses",{items,budgets,deleted});window.dispatchEvent(new Event("bn:personal-cloud-change"))},sum=(rows,type)=>rows.filter(x=>x.type===type).reduce((a,x)=>a+Number(x.amount||0),0);
function reset(){ $("expenseForm").reset();$("date").value=today();$("editing").value=""}
function render(){const mo=$("month").value,rows=items.filter(x=>monthOf(x.date)===mo).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created),expenses=sum(rows,"expense"),income=sum(rows,"income");$("spent").textContent=money(expenses);$("income").textContent=money(income);$("balance").textContent=money(income-expenses);
const budget=Number(budgets[mo]||0);$("budget").value=budget||"";$("budgetText").textContent=budget?"Đã sử dụng "+money(expenses)+" / "+money(budget)+" · Còn "+money(budget-expenses):"Chưa đặt ngân sách cho tháng này.";$("budgetBar").style.width=(budget?Math.min(100,expenses/budget*100):0)+"%";$("budgetBar").style.background=budget&&expenses>budget?"#e47784":"#61b7ed";
const prior=new Date(mo+"-01T12:00:00");prior.setMonth(prior.getMonth()-1);const prev=prior.getFullYear()+"-"+String(prior.getMonth()+1).padStart(2,"0"),previous=sum(items.filter(x=>monthOf(x.date)===prev),"expense");$("comparison").textContent="Tháng "+prev+": "+money(previous)+" · "+(previous?"Tháng này "+(expenses>=previous?"tăng ":"giảm ")+money(Math.abs(expenses-previous))+" ("+Math.round(Math.abs(expenses-previous)/previous*100)+"%)":"Chưa có chi tiêu tháng trước để so sánh.");
const cats={};rows.filter(x=>x.type==="expense").forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));const insightsSummary=$("insightsSummary"),insightsAdvice=$("insightsAdvice");
if(insightsSummary&&insightsAdvice){
 insightsAdvice.replaceChildren();
 const addAdvice=(heading,message)=>{
  const row=el("article",undefined,"item"),title=el("h3",heading),copy=el("p",message);
  row.append(title,copy);insightsAdvice.append(row)
 };
 const prevRows=items.filter(x=>monthOf(x.date)===prev);
 const hasData=rows.length>0,priorExpense=sum(prevRows,"expense"),diff=expenses-priorExpense;
 if(!hasData){
  insightsSummary.textContent="Chưa có giao dịch trong tháng "+mo+". Hãy nhập giao dịch để nhận phân tích dựa trên số liệu.";
 }else{
  insightsSummary.textContent="Tháng "+mo+": "+rows.length+" giao dịch · Chi "+money(expenses)+" · Thu "+money(income)+" · Chênh lệch "+money(income-expenses)+".";
  if(budget>0){
   const ratio=expenses/budget;
   if(ratio>1)addAdvice("Vượt ngân sách","Bạn đã vượt "+money(expenses-budget)+" ("+Math.round((ratio-1)*100)+"%) so với mức "+money(budget)+". Hãy xem lại các khoản chi có thể trì hoãn.");
   else if(ratio>=.8)addAdvice("Gần chạm ngân sách","Đã sử dụng "+Math.round(ratio*100)+"% hạn mức. Phần còn lại là "+money(budget-expenses)+".");
   else addAdvice("Trong phạm vi ngân sách","Đã dùng "+Math.round(ratio*100)+"% hạn mức. Còn "+money(budget-expenses)+" để phân bổ.");
  }else addAdvice("Đặt ngân sách mục tiêu","Hãy đặt một hạn mức chi tiêu cho tháng để hệ thống theo dõi tỷ lệ sử dụng và cảnh báo vượt ngưỡng.");
  if(prevRows.length&&priorExpense>0){
   const pct=Math.round(Math.abs(diff)/priorExpense*100);
   addAdvice("Xu hướng so với tháng trước",diff===0?"Tổng chi bằng tháng trước.":diff>0?"Tổng chi tăng "+money(diff)+" ("+pct+"%). Hãy kiểm tra danh mục tăng mạnh nhất.":"Tổng chi giảm "+money(-diff)+" ("+pct+"%). Đây là mức giảm về tổng tiền, chưa đủ để kết luận hiệu quả chi tiêu.");
  }else addAdvice("Chưa đủ lịch sử so sánh","Không có dữ liệu chi của tháng trước; hệ thống sẽ nhận xét xu hướng khi bạn ghi nhận thêm giao dịch.");
  const byCategory={};rows.filter(x=>x.type==="expense").forEach(x=>{byCategory[x.category]=(byCategory[x.category]||0)+Number(x.amount)});
  const largest=Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];
  if(largest&&expenses>0)addAdvice("Danh mục chi nhiều nhất",largest[0]+" chiếm "+Math.round(largest[1]/expenses*100)+"% tổng chi ("+money(largest[1])+"). Xem từng giao dịch trước khi quyết định cắt giảm.");
  if(income>0&&expenses>income)addAdvice("Chi cao hơn thu","Chi đang vượt thu "+money(expenses-income)+" trong tháng được chọn. Ưu tiên rà soát các khoản không thiết yếu.");
  if(expenses===0)addAdvice("Chưa có khoản chi","Tháng này mới có giao dịch thu nhập hoặc chưa có khoản chi được ghi nhận.");
 }
}
const breakdown=$("breakdown");breakdown.replaceChildren();const ordered=Object.entries(cats).sort((a,b)=>b[1]-a[1]);if(!ordered.length)breakdown.textContent="Chưa có chi tiêu theo danh mục.";for(const [category,amount] of ordered){const bar=el("div",undefined,"bar"),name=el("span",category),track=el("div",undefined,"bar-track"),fill=el("div",undefined,"bar-fill");fill.style.width=(expenses?amount/expenses*100:0)+"%";track.append(fill);bar.append(name,track,el("span",money(amount)));breakdown.append(bar)}
const root=$("transactions");root.replaceChildren();const q=$("search").value.toLocaleLowerCase("vi-VN"),visible=rows.filter(x=>[x.category,x.note,x.merchant].join(" ").toLocaleLowerCase("vi-VN").includes(q));if(!visible.length)root.textContent="Tháng này chưa có giao dịch phù hợp.";for(const x of visible){const row=el("article",undefined,"item");row.append(el("h3",(x.type==="expense"?"− ":"+ ")+money(x.amount)),el("p",x.date+" · "+x.category+(x.merchant?" · "+x.merchant:"")),el("p",x.note||""));const buttons=el("div",undefined,"actions"),edit=el("button","Sửa","ghost"),del=el("button","Xóa","ghost danger");edit.onclick=()=>{for(const k of ["date","type","amount","category","merchant","note"])$(k).value=x[k]||"";$("editing").value=x.id;window.scrollTo({top:0,behavior:"smooth"})};del.onclick=async()=>{if(!confirm("Xóa giao dịch này?"))return;const previous=items,oldDeleted={...deleted};items=items.filter(i=>i.id!==x.id);deleted[x.id]=Date.now();try{await persist();render()}catch(err){items=previous;deleted=oldDeleted;$("status").textContent="Không lưu được thao tác xóa: "+err.message}};buttons.append(edit,del);row.append(buttons);root.append(row)}}
$("expenseForm").onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(["date","type","amount","category","merchant","note"].map(k=>[k,$(k).value.trim()]));const amount=Number(data.amount);if(!data.date||!Number.isFinite(amount)||amount<=0||!Number.isInteger(amount)){$("status").textContent="Số tiền phải là số nguyên VND lớn hơn 0.";return}data.amount=amount;try{const backup=structuredClone(items);const old=items.find(x=>x.id===$("editing").value);if(old)Object.assign(old,data,{updated:Date.now()});else items.push({...data,id:crypto.randomUUID(),created:Date.now(),updated:Date.now()});try{await persist()}catch(e){items=backup;throw e}$("month").value=monthOf(data.date);reset();render();$("status").textContent="Đã lưu giao dịch."}catch(err){$("status").textContent="Lưu thất bại: "+err.message}};
$("clear").onclick=reset;$("month").onchange=render;$("search").oninput=render;$("saveBudget").onclick=async()=>{const n=Number($("budget").value),mo=$("month").value;if(!mo||!Number.isFinite(n)||n<0){$("budgetText").textContent="Ngân sách không hợp lệ.";return}const prev=budgets[mo];budgets[mo]=Math.round(n);try{await persist();render();$("budgetSaveStatus").textContent="✓ Đã lưu ngân sách tháng "+mo+"."}catch(e){if(prev===undefined)delete budgets[mo];else budgets[mo]=prev;$("budgetSaveStatus").textContent="Không thể lưu ngân sách: "+e.message}};
window.BNPersonalData={read:()=>({items,budgets,deleted}),apply:async data=>{const next={items:data.items,budgets:data.budgets||{},deleted:data.deleted||{}};await window.BNFinanceStore.put("expenses",next);items=next.items;budgets=next.budgets;deleted=next.deleted;render()},ready:null};
window.BNPersonalData.ready=(async()=>{try{const data=await window.BNFinanceStore.get("expenses");if(data){items=Array.isArray(data.items)?data.items:items;budgets=data.budgets||budgets;deleted=data.deleted||{};}else{try{deleted=JSON.parse(localStorage.getItem("bn_cloud_deleted_expenses")||"{}")}catch{}await window.BNFinanceStore.put("expenses",{items,budgets,deleted})}render()}catch(e){$("status").textContent="Không thể khởi tạo kho dữ liệu: "+e.message;throw e}})();
render();
})();