/**
 * BlogNaver Private Gateway — Cloudflare Worker.
 * Protects actual HTTP delivery of /blognaver/tien-ich/ and /blognaver/resume-cms/.
 * GitHub Pages must NOT remain a public alternative once migration is complete.
 *
 * Required env:
 *  ASSETS (Cloudflare static assets), SESSIONS (Workers KV),
 *  GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_OWNER_ID, TOKEN_ENCRYPTION_KEY,
 *  PUBLIC_ORIGIN (exact HTTPS Worker origin).
 *
 * OAuth callback: PUBLIC_ORIGIN + "/auth/callback".
 * No client secret / GitHub access token is ever returned to browser JS.
 */
const BASE="/blognaver/";
const GITHUB_REPO="duynguyenaver/blognaver";
const SESSION_COOKIE="__Host-bn_session";
const STATE_COOKIE="__Host-bn_oauth_state";
const MAX_SESSION_AGE=30*24*60*60;
const URL_BASE="https://api.github.com";
const encoder=new TextEncoder();
const decoder=new TextDecoder();

const headers={ "Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff" };
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,"Content-Type":"application/json; charset=utf-8",...extra}});
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function fromBase64(input){const raw=atob(input.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,ch=>ch.charCodeAt(0))}
function random(n=32){return b64url(crypto.getRandomValues(new Uint8Array(n)))}
function cookie(req,key){const all=req.headers.get("Cookie")||"";return all.split(";").map(s=>s.trim()).find(s=>s.startsWith(key+"="))?.slice(key.length+1)||""}
function setCookie(name,value,age){return name+"="+value+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age="+age}
function redirect(path,extraHeaders={}){return new Response(null,{status:302,headers:{...headers,Location:path,...extraHeaders}})}
function isPrivate(path){return /^\/blognaver\/(?:tien-ich(?:\/|$)|resume-cms(?:\/|$))/.test(path)}
function safeReturnPath(value) {
  if(!value||typeof value!=="string"||value.startsWith("//")||value.includes("\\")||/%2f|%5c|%0a|%0d/i.test(value))return "/blognaver/tien-ich/";
  if(!isPrivate(value.split("?")[0])||!value.startsWith("/")||value.includes("#"))return "/blognaver/tien-ich/";
  return value;
}
function origin(env) {
  const value=new URL(env.PUBLIC_ORIGIN);
  if(value.protocol!=="https:"||value.pathname!=="/"||value.search||value.hash)throw Error("PUBLIC_ORIGIN must be bare HTTPS origin");
  return value.origin;
}
async function sha256(data){return new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(data)))}
async function key(env) {
  const keyBytes=fromBase64(env.TOKEN_ENCRYPTION_KEY);
  if(keyBytes.length!==32)throw Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return crypto.subtle.importKey("raw",keyBytes,"AES-GCM",false,["encrypt","decrypt"]);
}
async function encrypt(env,text) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const sealed=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(env),encoder.encode(text));
  return b64url(iv)+"."+b64url(new Uint8Array(sealed));
}
async function decrypt(env,cipher) {
  const [iv,ct]=String(cipher||"").split(".");
  if(!iv||!ct)throw Error("Invalid sealed session");
  const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(iv)},await key(env),fromBase64(ct));
  return decoder.decode(plaintext);
}
async function github(path,token,method="GET",body){
  const response=await fetch(URL_BASE+path,{
    method,headers:{
      "Accept":"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"BlogNaver-Private-Gateway",
      "Authorization":"Bearer "+token,
      ...(body!==undefined?{"Content-Type":"application/json"}:{})
    },
    ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  return response;
}
async function session(req,env) {
  const id=cookie(req,SESSION_COOKIE);
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(id))return null;
  const record=await env.SESSIONS.get("session:"+id,"json");
  if(!record||record.id!==Number(env.GITHUB_OWNER_ID)||record.expiresAt<Date.now())return null;
  try{return {...record,token:await decrypt(env,record.token)}}catch{return null}
}
function requireOrigin(req,env){
  const source=req.headers.get("Origin");
  // The same-origin Worker UI is the sole permitted writer; no cross-site writes.
  return source===origin(env);
}
function validContentPath(path){
  return typeof path==="string"&&path.length<240&&/^data\/[a-zA-Z0-9_/-]+\.enc\.json$/.test(path)&&!path.includes("..")&&!path.includes("//");
}
async function authStart(req,env,url){
  const state=random(),verifier=random(40);
  const digest=await sha256(verifier),returnPath=safeReturnPath(url.searchParams.get("return_to"));
  await env.SESSIONS.put("oauth:"+state,JSON.stringify({verifier,returnPath}),{expirationTtl:600});
  const authorize=new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id",env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri",origin(env)+"/auth/callback");
  authorize.searchParams.set("scope","public_repo");
  authorize.searchParams.set("state",state);
  authorize.searchParams.set("code_challenge",b64url(digest));
  authorize.searchParams.set("code_challenge_method","S256");
  return redirect(authorize.toString(),{"Set-Cookie":setCookie(STATE_COOKIE,state,600)});
}
async function authCallback(req,env,url){
  const state=url.searchParams.get("state")||"",code=url.searchParams.get("code")||"";
  const expected=cookie(req,STATE_COOKIE);
  if(!state||state!==expected||!code)return json({error:"Invalid OAuth state or code"},400,{"Set-Cookie":setCookie(STATE_COOKIE,"",0)});
  const previous=await env.SESSIONS.get("oauth:"+state,"json");
  if(!previous)return json({error:"Expired OAuth state"},400,{"Set-Cookie":setCookie(STATE_COOKIE,"",0)});
  await env.SESSIONS.delete("oauth:"+state);
  const exchange=await fetch("https://github.com/login/oauth/access_token",{
    method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json","User-Agent":"BlogNaver-Private-Gateway"},
    body:JSON.stringify({
      client_id:env.GITHUB_CLIENT_ID,
      client_secret:env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri:origin(env)+"/auth/callback",
      code_verifier:previous.verifier
    })
  });
  if(!exchange.ok)return json({error:"GitHub OAuth exchange failed"},502);
  const payload=await exchange.json();
  if(!payload.access_token)return json({error:"GitHub denied OAuth authorization"},401);
  const check=await github("/user",payload.access_token);
  if(!check.ok)return json({error:"Failed to verify GitHub identity"},401);
  const profile=await check.json();
  if(profile.id!==Number(env.GITHUB_OWNER_ID))return json({error:"GitHub account is not authorized for this workspace"},403,{"Set-Cookie":setCookie(STATE_COOKIE,"",0)});
  const sid=random(),expiresAt=Date.now()+MAX_SESSION_AGE*1000;
  await env.SESSIONS.put("session:"+sid,JSON.stringify({
    id:profile.id,login:profile.login,expiresAt,token:await encrypt(env,payload.access_token)
  }),{expirationTtl:MAX_SESSION_AGE});
  const h=new Headers({...headers,Location:previous.returnPath});
  h.append("Set-Cookie",setCookie(STATE_COOKIE,"",0));
  h.append("Set-Cookie",setCookie(SESSION_COOKIE,sid,MAX_SESSION_AGE));
  return new Response(null,{status:302,headers:h});
}
async function githubContents(req,env,user){
  if(!requireOrigin(req,env))return json({error:"Origin mismatch"},403);
  let payload;
  try{payload=await req.json()}catch{return json({error:"Expected JSON payload"},400)}
  if(!validContentPath(payload.path))return json({error:"Path is not an allowed data file"},400);
  const action=payload.action;
  if(action!=="read"&&action!=="write")return json({error:"Invalid action"},400);
  const dataBranches=/^(?:main|personal-cloud-backups|attendance-backups)$/;
  const contentPath=payload.path.split("/").map(encodeURIComponent).join("/");
  const pathname="/repos/"+GITHUB_REPO+"/contents/"+contentPath;
  if(action==="read"){
    if(!dataBranches.test(payload.branch||"main"))return json({error:"Unsupported data branch"},400);
    const res=await github(pathname+"?ref="+encodeURIComponent(payload.branch||"main"),user.token);
    return json(await res.json().catch(()=>({error:"Invalid upstream response"})),res.status);
  }
  if(typeof payload.base64!=="string"||payload.base64.length>5_500_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.base64))
    return json({error:"Invalid base64 content or file too large"},400);
  if(typeof payload.sha!=="undefined"&&!/^[a-f0-9]{40}$/.test(payload.sha))return json({error:"Invalid expected blob SHA"},400);
  if(typeof payload.message!=="string"||payload.message.length>160||payload.message.length<5)return json({error:"Invalid commit message"},400);
  const allowedBranch=payload.branch||"main";
  if(!dataBranches.test(allowedBranch))return json({error:"Only designated encrypted data branches supported"},400);
  if(allowedBranch!=="main"){
    const branchStatus=await github("/repos/"+GITHUB_REPO+"/git/ref/heads/"+allowedBranch,user.token);
    if(branchStatus.status===404){
      const base=await github("/repos/"+GITHUB_REPO+"/git/ref/heads/main",user.token);
      if(!base.ok)return json({error:"Cannot read main for data branch"},base.status);
      const created=await github("/repos/"+GITHUB_REPO+"/git/refs",user.token,"POST",{ref:"refs/heads/"+allowedBranch,sha:(await base.json()).object.sha});
      if(!created.ok&&created.status!==422)return json({error:"Cannot create encrypted data branch"},created.status);
    }else if(!branchStatus.ok)return json({error:"Cannot inspect encrypted data branch"},branchStatus.status);
  }
  const requestBody={message:payload.message,content:payload.base64,branch:allowedBranch};
  if(payload.sha)requestBody.sha=payload.sha;
  const res=await github(pathname,user.token,"PUT",requestBody);
  return json(await res.json().catch(()=>({error:"Invalid upstream response"})),res.status);
}
async function archiveWav(req,env,user){
  if(!requireOrigin(req,env))return json({error:"Origin mismatch"},403);
  const raw=await req.arrayBuffer();
  if(!raw.byteLength||raw.byteLength>8*1024*1024)return json({error:"WAV exceeds 8 MB limit"},413);
  const bytes=new Uint8Array(raw);
  if(String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WAVE")
    return json({error:"Only a valid RIFF/WAVE file is accepted"},400);
  const branch="tts-audio-archive";
  let ref=await github("/repos/"+GITHUB_REPO+"/git/ref/heads/"+branch,user.token);
  if(ref.status===404){
    const main=await github("/repos/"+GITHUB_REPO+"/git/ref/heads/main",user.token);
    if(!main.ok)return json({error:"Cannot read main branch"},main.status);
    const sha=(await main.json()).object.sha;
    const create=await github("/repos/"+GITHUB_REPO+"/git/refs",user.token,"POST",{ref:"refs/heads/"+branch,sha});
    if(!create.ok&&create.status!==422)return json({error:"Cannot create audio archive branch"},create.status);
  }else if(!ref.ok)return json({error:"Cannot inspect audio archive branch"},ref.status);
  let b64="";
  for(let offset=0;offset<bytes.length;offset+=8192)b64+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  const name="voice-"+new Date().toISOString().replace(/[:.]/g,"-")+"-"+random(5)+".wav";
  const file="data/tts-audio/"+name;
  const res=await github("/repos/"+GITHUB_REPO+"/contents/"+file,user.token,"PUT",{
    message:"archive(tts): "+name,content:btoa(b64),branch
  });
  if(!res.ok)return json({error:"GitHub rejected audio archive",status:res.status},res.status);
  return json({ok:true,path:file,branch,url:"https://github.com/"+GITHUB_REPO+"/blob/"+branch+"/"+file});
}
async function protectedAsset(req,env,url){
  const owner=await session(req,env);
  if(!owner)return redirect("/auth/start?return_to="+encodeURIComponent(url.pathname+url.search));
  const target=new URL(req.url);
  target.pathname=url.pathname.replace(/^\/blognaver/,"")||"/";
  const response=await env.ASSETS.fetch(new Request(target,req));
  const h=new Headers(response.headers);
  Object.entries(headers).forEach(([k,v])=>h.set(k,v));
  h.set("X-Frame-Options","DENY");
  const result=new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
  if(h.get("Content-Type")?.includes("text/html")){
    return new HTMLRewriter().on("head",{element(e){
      e.prepend('<script>window.__BN_OAUTH_AUTHENTICATED=true;</script>',{html:true});
    }}).transform(result);
  }
  return result;
}
export default {
 async fetch(req,env){
  try{
    if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.GITHUB_OWNER_ID||!env.TOKEN_ENCRYPTION_KEY||!env.SESSIONS||!env.ASSETS||!env.PUBLIC_ORIGIN)
      return json({error:"OAuth gateway is not provisioned"},503);
    const url=new URL(req.url),path=url.pathname;
    // Reject encoded path tricks that could evade isPrivate() while ASSETS decodes them.
    if(/%[0-9a-f]{2}/i.test(path)||path.includes("\\"))return json({error:"Encoded routes are not supported"},400);
    if(path==="/auth/start"&&req.method==="GET")return authStart(req,env,url);
    if(path==="/auth/callback"&&req.method==="GET")return authCallback(req,env,url);
    if(path==="/auth/logout"&&req.method==="POST"){
      if(!requireOrigin(req,env))return json({error:"Origin mismatch"},403);
      const sid=cookie(req,SESSION_COOKIE);
      if(sid)await env.SESSIONS.delete("session:"+sid);
      return json({ok:true},200,{"Set-Cookie":setCookie(SESSION_COOKIE,"",0)});
    }
    if(path==="/api/session"){
      const owner=await session(req,env);
      return owner?json({authenticated:true,id:owner.id,login:owner.login}):json({authenticated:false},401);
    }
    if(path==="/api/github/contents"&&req.method==="POST"){
      const user=await session(req,env);
      return user?githubContents(req,env,user):json({error:"Login required"},401);
    }
    if(path==="/api/github/archive-wav"&&req.method==="POST"){
      const user=await session(req,env);
      return user?archiveWav(req,env,user):json({error:"Login required"},401);
    }
    if(isPrivate(path)&&(req.method==="GET"||req.method==="HEAD"))return protectedAsset(req,env,url);
    // Only known shared bootstrap assets are public on the Worker origin.
    if(new Set(["/blognaver/access-gate.js","/blognaver/access-gate.css","/blognaver/github-auth.js","/blognaver/auth-config.json"]).has(path) && req.method==="GET"){
      const publicAsset=new URL(req.url);publicAsset.pathname=path.replace(/^\/blognaver/,"");
      return env.ASSETS.fetch(new Request(publicAsset,req));
    }
    if(path==="/")return redirect("/auth/start");
    return json({error:"Not found"},404);
  }catch(e){return json({error:"Gateway request failed"},500)}
 }
};
