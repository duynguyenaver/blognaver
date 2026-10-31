/* UI-only PIN gate. Not a security boundary on a public static site. */
(() => {
  "use strict";
  // Set only by authenticated HTML responses of the private Worker gateway.
  if (window.__BN_OAUTH_AUTHENTICATED === true) return;
  const BASE = "/blognaver/";
  const HASH = "46eaa26621e4955c1675b55d446c6d03325f458b59a465f898d42924010e7286";
  const KEY = "blognaver.ui-gate.v1";
  const path = location.pathname;
  if (!path.startsWith(BASE)) return;
  const relative = path.slice(BASE.length).replace(/\/index\.html$/,"").replace(/\/+$/,"");
  const segments = relative.split("/").filter(Boolean);
  // Public: homepage, posts, published articles, Resume listings/details, and Resume CMS.
  // This only bypasses the UI PIN. GitHub write operations still require authentication.
  if (!segments.length || segments[0] === "posts" || segments[0] === "bai-viet" || segments[0] === "resume" || segments[0] === "cms" || (segments[0] === "page" && segments.length === 2 && /^[1-9][0-9]*$/.test(segments[1]))) return;
  document.documentElement.classList.add("bn-pin-protected");
  const unlock = () => document.documentElement.classList.remove("bn-pin-protected");
  // Legacy PIN fallback remains active only until a real OAuth gateway is provisioned.
  // An OAuth session on workers.dev cannot be faked by a stored PIN hash.
  function showLegacyPin() {
    try { if (sessionStorage.getItem(KEY) === HASH) { unlock(); return; } } catch (_) {}
    if (document.getElementById("bn-pin-gate")) return;
    const shell = document.createElement("div");
    shell.id = "bn-pin-gate";
    shell.setAttribute("role","dialog");
    shell.setAttribute("aria-modal","true");
    shell.setAttribute("aria-labelledby","bn-pin-title");
    shell.innerHTML = '<div class="bn-pin-box"><div class="bn-pin-brand">BLOGNAVER · PRIVATE TOOLS</div><h1 id="bn-pin-title">Nhập mã truy cập</h1><p>Trang này yêu cầu mã PIN. Trang chủ và các bài blog vẫn được truy cập công khai.</p><form id="bn-pin-form"><label for="bn-pin-value">Mã PIN</label><input id="bn-pin-value" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" required><button type="submit">Mở khóa</button></form><p id="bn-pin-message" role="status" aria-live="polite"></p><a href="/blognaver/">← Trở lại trang chủ</a><small>Đây là lớp khóa giao diện; dữ liệu của website tĩnh vẫn là dữ liệu công khai.</small></div>';
    document.body.append(shell);
    const form=shell.querySelector("form"),input=shell.querySelector("input"),status=shell.querySelector("#bn-pin-message");
    let attempts=0;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!crypto?.subtle) { status.textContent="Trình duyệt không hỗ trợ xác minh mã.";return; }
      const bytes = new TextEncoder().encode(input.value);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
      if (digest === HASH) { sessionStorage.setItem(KEY,HASH);shell.remove();unlock();return; }
      attempts++;status.textContent="Mã không đúng. Vui lòng thử lại.";input.value="";
      if(attempts>=5){status.textContent="Đã nhập sai nhiều lần. Vui lòng tải lại trang để thử tiếp.";input.disabled=true;form.querySelector("button").disabled=true;}
      else input.focus();
    });
    input.focus();
  }
  function showGithubSignIn(gateway) {
    if(document.getElementById("bn-pin-gate"))return;
    const shell=document.createElement("div");
    shell.id="bn-pin-gate";
    shell.setAttribute("role","dialog");
    shell.setAttribute("aria-modal","true");
    shell.innerHTML='<div class="bn-pin-box"><div class="bn-pin-brand">BLOGNAVER · GITHUB PRIVATE WORKSPACE</div>'+
      '<h1>Đăng nhập GitHub</h1><p>Truy cập Tiện ích và Resume CMS qua cổng đăng nhập GitHub. Không cần nhập PIN hay dán GitHub token.</p>'+
      '<button id="bn-login-github" type="button">Đăng nhập bằng GitHub</button>'+
      '<p id="bn-pin-message" role="status" aria-live="polite">Sau khi đăng nhập, trang được mở trên máy chủ bảo vệ thay vì GitHub Pages công khai.</p>'+
      '<a href="/blognaver/">← Trở lại trang chủ</a></div>';
    document.body.append(shell);
    shell.querySelector("#bn-login-github").addEventListener("click",()=>{
      const path=location.pathname+location.search;
      location.assign(gateway+"/auth/start?return_to="+encodeURIComponent(path));
    });
  }
  async function boot(){
    let gateway="";
    try {
      const response=await fetch(BASE+"auth-config.json",{cache:"no-store"});
      if(response.ok) {
        const cfg=await response.json();
        const url=new URL(cfg.gatewayOrigin||"");
        if(url.protocol==="https:" && url.origin===url.href.replace(/\/$/,"") &&
           !/github\.io$/i.test(url.hostname)) gateway=url.origin;
      }
    } catch (_) { /* OAuth not provisioned yet; preserve existing access path. */ }
    if(gateway)showGithubSignIn(gateway);
    else if(segments[0]==="resume-cms")unlock(); // Preserve the previously public CMS until real Worker cutover.
    else showLegacyPin();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();