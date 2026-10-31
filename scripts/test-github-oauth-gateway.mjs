/* node --test scripts/test-github-oauth-gateway.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {webcrypto} from "node:crypto";

const source=readFileSync(new URL("../workers/github-oauth-gateway/worker.js",import.meta.url),"utf8")
  .replace("export default {","globalThis.__gateway = {");
const host="https://blognaver-private.example.workers.dev";
function setup(ownerId=349135289){
 const store=new Map(),calls=[];
 const kv={
   async get(k,mode){const row=store.get(k);return mode==="json"&&row?JSON.parse(row):row??null},
   async put(k,v){store.set(k,v)},
   async delete(k){store.delete(k)}
 };
 let assetReads=0;
 const env={
   PUBLIC_ORIGIN:host,GITHUB_CLIENT_ID:"example_client_id",
   GITHUB_CLIENT_SECRET:"example_server_secret",GITHUB_OWNER_ID:String(ownerId),
   TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,11).toString("base64"),
   SESSIONS:kv,ASSETS:{async fetch(){assetReads++;return new Response("private", {status:200,headers:{"Content-Type":"text/css"}})}}
 };
 const api=async(url,options={})=>{
   calls.push({url:String(url),method:options.method||"GET"});
   if(String(url).includes("login/oauth/access_token"))return Response.json({access_token:"ghu_example_test_token"});
   if(String(url).endsWith("/user"))return Response.json({id:349135289,login:"duynguyenaver"});
   return Response.json({message:"Not found"},{status:404});
 };
 const ctx={
   URL,Request,Response,Headers,TextEncoder,TextDecoder,crypto:webcrypto,fetch:api,
   atob,btoa,console,globalThis:null,HTMLRewriter:class{}
 };
 ctx.globalThis=ctx;
 runInNewContext(source,ctx);
 return {app:ctx.__gateway,env,calls,reads:()=>assetReads};
}
test("unauthenticated private HTML never reaches Worker assets",async()=>{
 const x=setup(),res=await x.app.fetch(new Request(host+"/blognaver/tien-ich/text-to-speech/"),x.env);
 assert.equal(res.status,302);
 assert.match(res.headers.get("location"),/\/auth\/start/);
 assert.equal(x.reads(),0);
 const cms=await x.app.fetch(new Request(host+"/blognaver/resume-cms/"),x.env);
 assert.equal(cms.status,302);assert.equal(x.reads(),0);
});
test("encoded route cannot bypass protected asset auth",async()=>{
 const x=setup();
 const response=await x.app.fetch(new Request(host+"/blognaver/%74ien-ich/text-to-speech/"),x.env);
 assert.equal(response.status,400);assert.equal(x.reads(),0);
});
test("OAuth start requires PKCE S256 and opaque state; callback authenticates owner",async()=>{
 const x=setup();
 const start=await x.app.fetch(new Request(host+"/auth/start?return_to=%2Fblognaver%2Ftien-ich%2F"),x.env);
 assert.equal(start.status,302);
 const destination=new URL(start.headers.get("location"));
 assert.equal(destination.host,"github.com");
 assert.equal(destination.searchParams.get("code_challenge_method"),"S256");
 const state=destination.searchParams.get("state");
 assert.ok(state?.length>=30);
 const header=start.headers.get("set-cookie");
 assert.match(header,/HttpOnly/);
 const callback=new Request(host+"/auth/callback?code=example&state="+state,{headers:{Cookie:header.split(";")[0]}});
 const res=await x.app.fetch(callback,x.env);
 assert.equal(res.status,302);
 assert.equal(res.headers.get("location"),"/blognaver/tien-ich/");
 assert.ok(!String(res.headers.get("set-cookie")).includes("ghu_example_test_token"));
 const cookies=typeof res.headers.getSetCookie==="function"?res.headers.getSetCookie():[res.headers.get("set-cookie")];
 const sid=cookies.find(c=>c.includes("__Host-bn_session="))?.match(/__Host-bn_session=([^;]+)/)?.[1];
 assert.ok(sid);
 const who=await x.app.fetch(new Request(host+"/api/session",{headers:{Cookie:"__Host-bn_session="+sid}}),x.env);
 assert.equal(who.status,200);
 const data=await who.json();assert.equal(data.login,"duynguyenaver");
 assert.ok(!JSON.stringify(data).includes("ghu_example_test_token"));
});
test("non-owner GitHub identity is never granted a session",async()=>{
 const x=setup(123456);
 const start=await x.app.fetch(new Request(host+"/auth/start"),x.env);
 const u=new URL(start.headers.get("location"));
 const res=await x.app.fetch(new Request(host+"/auth/callback?code=a&state="+u.searchParams.get("state"),{
   headers:{Cookie:start.headers.get("set-cookie").split(";")[0]}
 }),x.env);
 assert.equal(res.status,403);
});
test("write requests require a session, same origin and encrypted file path",async()=>{
 const x=setup();
 const payload={action:"write",path:"data/attendance/private.json",base64:"e30=",message:"test writing data"};
 const res=await x.app.fetch(new Request(host+"/api/github/contents",{
   method:"POST",headers:{"Origin":host,"Content-Type":"application/json"},body:JSON.stringify(payload)
 }),x.env);
 assert.equal(res.status,401);
 assert.equal(x.reads(),0);
});
test("unconfigured Worker fails closed",async()=>{
 const x=setup();x.env.GITHUB_CLIENT_SECRET="";
 const res=await x.app.fetch(new Request(host+"/blognaver/tien-ich/"),x.env);
 assert.equal(res.status,503);assert.equal(x.reads(),0);
});
