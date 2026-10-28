(() => {
  "use strict";
  const root = document.querySelector("[data-commit-status]");
  if (!root) return;
  const details = root.querySelector("details");
  const endpoint = "https://api.github.com/repos/duynguyenaver/blognaver/actions/runs?branch=main&per_page=20";
  const $ = (sel) => root.querySelector(sel);
  const labels = { queued:"Xếp hàng",pending:"Chờ",waiting:"Chờ duyệt",in_progress:"Đang chạy",success:"Thành công",failure:"Thất bại",cancelled:"Đã hủy",timed_out:"Quá hạn",action_required:"Cần xử lý",skipped:"Bỏ qua",neutral:"Hoàn tất"};
  let busy=false,lastSuccess=0;
  function el(tag,cls,text) {
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(text!==undefined) node.textContent=String(text);
    return node;
  }
  function status(run){return run.status==="completed"?(run.conclusion||"neutral"):(run.status||"pending")}
  function group(s){return s==="success"?"success":(["failure","timed_out","action_required"].includes(s)?"failure":"other")}
  function linkForRun(run){
    return Number.isSafeInteger(run.id) && run.id>0?"https://github.com/duynguyenaver/blognaver/actions/runs/"+run.id:null;
  }
  function render(runs) {
    const all=runs.slice(0,20),success=all.filter(r=>group(status(r))==="success").length,fail=all.filter(r=>group(status(r))==="failure").length,other=all.length-success-fail,done=success+fail;
    const pct=done?Math.round(success/done*100):0;
    $("[data-total]").textContent=all.length;
    $("[data-success]").textContent=success;
    $("[data-failed]").textContent=fail;
    $("[data-rate]").textContent=done?pct+"%":"—";
    const latest=all[0],latestState=latest?status(latest):"pending";
    const compact=$("[data-compact-state]");
    compact.textContent=latest?(labels[latestState]||latestState):"Chưa có dữ liệu";
    compact.dataset.state=group(latestState);
    $("[data-headline]").textContent=latest?"Workflow mới nhất · "+String(latest.head_sha||"").slice(0,8):"Chưa có workflow trên nhánh main";
    const donut=$("[data-donut]");
    if(all.length){
      const a=success/all.length*100,b=fail/all.length*100;
      donut.style.background="conic-gradient(#62d1aa 0 "+a+"%,#fa8090 "+a+"% "+(a+b)+"%,#75a7e3 "+(a+b)+"% 100%)";
      donut.setAttribute("aria-label",success+" thành công, "+fail+" thất bại, "+other+" đang chạy hoặc trạng thái khác");
    } else donut.style.background="#294965";
    $("[data-donut-number]").textContent=done?pct+"%":"—";
    $("[data-legend-success]").textContent=success;
    $("[data-legend-failure]").textContent=fail;
    $("[data-legend-other]").textContent=other;
    const chart=document.createDocumentFragment();
    for(const [index,run] of all.entries()){
      const s=status(run),g=group(s),url=linkForRun(run);
      const item=el("a",g);
      if(url){item.href=url;item.target="_blank";item.rel="noopener noreferrer"}
      item.title="#"+(run.run_number||run.id)+" · "+(labels[s]||s);
      item.style.height=(index%4===0?"97":index%4===1?"70":index%4===2?"88":"55")+"%";
      chart.append(item);
    }
    // Verified historical incidents only. Never infer root causes from run titles alone.
    const known = [
      {title:"Stack: cấu hình theme và ngày đăng không tương thích", description:"Chẩn đoán đã xác minh từ log: colorScheme và dateFormat còn dùng cấu trúc Blowfish, gây lỗi render với Stack.", solution:"Đã sửa schema colorScheme và dateFormat trong cấu hình Hugo; bản build sau đó thành công.", failure:40781677019, success:40781833677},
      {title:"Prism: thiếu Dart Sass executable", description:"Log xác nhận thiếu Dart Sass binary hoặc giao thức CLI không tương thích trong bước build Prism.", solution:"Đã thay bằng bản Dart Sass executable chính thức; CI kiểm tra hai theme thành công.", failure:40782828081, success:40783106998}
    ];
    const insights=document.createDocumentFragment();
    for(const item of known){
      const card=el("article","bn-failure-insight");
      const heading=el("div","bn-failure-heading");
      heading.append(el("strong","",item.title),el("span","bn-failure-fixed","Đã xử lý · lịch sử"));
      const reason=el("p","",item.description);
      const remedy=el("p","bn-failure-remedy","Giải pháp đã dùng: "+item.solution);
      const refs=el("div","bn-failure-refs");
      for(const [label,id] of [["Log lỗi",item.failure],["Build thành công",item.success]]){
        const link=el("a","",label+" ↗");
        link.href="https://github.com/duynguyenaver/blognaver/actions/runs/"+id;
        link.target="_blank";link.rel="noopener noreferrer";refs.append(link);
      }
      card.append(heading,reason,remedy,refs);insights.append(card);
    }
    const recentFailed=all.filter(run=>group(status(run))==="failure");
    const overview=el("p","",recentFailed.length
      ? recentFailed.length+" / "+all.length+" lượt gần nhất thất bại. Không thể xác định nguyên nhân từ trạng thái API; cần xem log từng run."
      : "Không có lượt thất bại trong "+all.length+" workflow gần nhất. Dưới đây là các ca lỗi lịch sử đã xác minh.");
    if(recentFailed.length){
      const box=el("div","bn-failure-recent");
      box.append(el("strong","","Lượt thất bại gần đây (chưa xác minh nguyên nhân)"));
      for(const run of recentFailed.slice(0,5)){
        const link=el("a","",("#"+(run.run_number||run.id))+" · Xem log ↗");
        link.href=linkForRun(run);link.target="_blank";link.rel="noopener noreferrer";box.append(link);
      }
      box.append(el("p","","Đề xuất: mở log bước Build site/Deploy, so khớp lỗi với các ca đã xử lý ở dưới. Không tự suy diễn nguyên nhân hoặc chạy sửa lỗi."));
      insights.prepend(box);
    }
    $("[data-failure-overview]").replaceChildren(overview);
    $("[data-failure-insights]").replaceChildren(insights);
    $("[data-timeline]").replaceChildren(chart);
    $("[data-feedback]").textContent="Phân tích chỉ đọc · 2 ca lỗi đã xác minh";
  }
  async function load(){
    if(busy||document.hidden||!details.open)return;
    busy=true;const button=$("[data-refresh]");button.disabled=true;
    try{
      const response=await fetch(endpoint,{headers:{Accept:"application/vnd.github+json"},cache:"no-store"});
      if(!response.ok)throw new Error(response.status===403||response.status===429?"GitHub API bị giới hạn. Giữ lại dữ liệu gần nhất.":"Không thể tải GitHub Actions (HTTP "+response.status+").");
      const data=await response.json();if(!Array.isArray(data.workflow_runs))throw new Error("Dữ liệu GitHub không hợp lệ.");
      render(data.workflow_runs);
      lastSuccess=Date.now();
      $("[data-updated]").textContent="Cập nhật: "+new Date(lastSuccess).toLocaleString("vi-VN")+" · Tự đồng bộ khi dashboard đang mở.";
    }catch(e){$("[data-feedback]").textContent=e instanceof Error?e.message:"Lỗi kết nối GitHub."}
    finally{busy=false;button.disabled=false}
  }
  details.addEventListener("toggle",()=>{if(details.open&&Date.now()-lastSuccess>45000)load()});
  $("[data-refresh]").addEventListener("click",load);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&details.open&&Date.now()-lastSuccess>60000)load()});
  setInterval(()=>{if(details.open)load()},90000);
})();