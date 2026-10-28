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
    const chart=document.createDocumentFragment(),list=document.createDocumentFragment();
    for(const [index,run] of all.entries()){
      const s=status(run),g=group(s),url=linkForRun(run);
      const item=el("a",g);
      if(url){item.href=url;item.target="_blank";item.rel="noopener noreferrer"}
      item.title="#"+(run.run_number||run.id)+" · "+(labels[s]||s);
      item.style.height=(index%4===0?"97":index%4===1?"70":index%4===2?"88":"55")+"%";
      chart.append(item);
    }
    for(const run of all.slice(0,8)){
      const s=status(run),line=el("div","bn-commit-run");
      const sha=String(run.head_sha||"").slice(0,8),shaNode=el("a","bn-commit-sha",sha||"—");
      if(/^[a-f0-9]{7,40}$/i.test(run.head_sha||"")){shaNode.href="https://github.com/duynguyenaver/blognaver/commit/"+run.head_sha;shaNode.target="_blank";shaNode.rel="noopener noreferrer"}
      const info=el("div"),title=el("div","bn-commit-title",run.display_title||run.head_commit?.message?.split("\n")[0]||"Workflow");
      title.title=title.textContent;
      info.append(title,el("div","bn-commit-meta","#"+(run.run_number||run.id)+" · "+(run.head_branch||"main")));
      const badge=el("a","bn-commit-state",labels[s]||s);badge.dataset.state=s;
      const url=linkForRun(run);if(url){badge.href=url;badge.target="_blank";badge.rel="noopener noreferrer"}
      line.append(shaNode,info,badge);list.append(line);
    }
    $("[data-timeline]").replaceChildren(chart);
    $("[data-runs]").replaceChildren(list);
    $("[data-feedback]").textContent=all.length?"Hiển thị 8 workflow mới nhất (trên 20 lượt thống kê).":"Chưa có workflow.";
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