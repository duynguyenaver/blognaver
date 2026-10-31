/* BlogNaver shared GitHub OAuth client — no GitHub token in browser memory/storage.
 * Private Worker origin exposes /api/session and server-scoped /api/github/*.
 */
(() => {
 "use strict";
 const runningOnGateway=()=>window.__BN_OAUTH_AUTHENTICATED===true;
 const sameOrigin=path=>new URL(path,location.origin).toString();
 async function session(){
   if(!runningOnGateway())return {authenticated:false,reason:"outside_private_gateway"};
   const response=await fetch(sameOrigin("/api/session"),{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)return {authenticated:false,status:response.status};
   return response.json();
 }
 async function logout(){
   if(!runningOnGateway())return false;
   const res=await fetch(sameOrigin("/auth/logout"),{
     method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"
   });
   if(res.ok){location.replace("/blognaver/");return true}
   return false;
 }
 async function request(path,options={}){
   if(!runningOnGateway())throw Error("GitHub OAuth gateway chưa kích hoạt. Hãy đăng nhập từ cổng riêng.");
   const res=await fetch(sameOrigin(path),{
     credentials:"same-origin",
     cache:"no-store",
     ...options
   });
   const body=await res.json().catch(()=>({}));
   if(!res.ok){const error=new Error(body.error||"GitHub gateway HTTP "+res.status);error.status=res.status;throw error}
   return body;
 }
 async function readData(path,branch="main"){
   return request("/api/github/contents",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:"read",path,branch})
   });
 }
 async function writeData({path,branch="main",base64,sha,message}){
   return request("/api/github/contents",{
     method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:"write",path,branch,base64,sha,message})
   });
 }
 async function uploadWav(wav){
   if(!(wav instanceof Blob)||!wav.size)throw Error("File WAV chưa được tạo.");
   return request("/api/github/archive-wav",{
     method:"POST",headers:{"Content-Type":"audio/wav"},body:wav
   });
 }
 window.BNGitHubOAuth=Object.freeze({isAuthenticatedOrigin:runningOnGateway,session,logout,readData,writeData,uploadWav});
 if(runningOnGateway()){
   document.addEventListener("DOMContentLoaded",async()=>{
     const data=await session().catch(()=>({authenticated:false}));
     if(!data.authenticated)return;
     const panel=document.createElement("div");
     panel.setAttribute("role","status");
     panel.style.cssText="position:fixed;bottom:12px;right:12px;z-index:2147483000;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:12px;padding:8px 12px;font:12px system-ui;box-shadow:0 10px 24px #0004";
     const label=document.createElement("span");label.textContent="GitHub ✓ "+data.login+" · ";
     const signout=document.createElement("button");signout.type="button";signout.textContent="Đăng xuất";
     signout.style.cssText="border:none;background:none;color:#a5b4fc;cursor:pointer;font:inherit";
     signout.addEventListener("click",()=>logout().catch(()=>{}));
     panel.append(label,signout);document.body.append(panel);
   });
 }
})();
