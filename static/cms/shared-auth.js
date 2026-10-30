(()=>{"use strict";
const STORE="blognaver_github_auth_v1",SESSION="blognaver_github_auth_session_v1",REPO="duynguyenaver/blognaver";
function read(){let value="";try{value=sessionStorage.getItem(SESSION)||localStorage.getItem(STORE)||""}catch{}return value}
function forget(){try{localStorage.removeItem(STORE);sessionStorage.removeItem(SESSION)}catch{}}
function save(token,remember=true){if(!token)return false;try{(remember?localStorage:sessionStorage).setItem(remember?STORE:SESSION,token);if(remember)sessionStorage.removeItem(SESSION);else localStorage.removeItem(STORE);return true}catch(e){return false}}
async function validate(token){const r=await fetch("https://api.github.com/repos/"+REPO+"/contents/config/_default/params.toml?ref=main",{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},cache:"no-store"});if(!r.ok)throw Error("GitHub HTTP "+r.status+" · Kiểm tra token và quyền truy cập repository.");return true}
window.BNAuth={read,save,forget,validate,header:()=>read()?{Authorization:"Bearer "+read()}:{}};})();