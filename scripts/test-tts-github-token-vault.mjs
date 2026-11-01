/* Run: node --test scripts/test-tts-github-token-vault.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {webcrypto} from "node:crypto";
import {TextEncoder,TextDecoder} from "node:util";

const root=new URL("../static/tien-ich/text-to-speech/",import.meta.url);
const source=readFileSync(new URL("github-credential-vault.js",root),"utf8");
const page=readFileSync(new URL("index.html",root),"utf8");
const pron=readFileSync(new URL("pronunciation-training.js",root),"utf8");

function fakeIndexedDB(){
  const stores=new Map();
  const db={
    objectStoreNames:{contains:name=>stores.has(name)},
    createObjectStore(name){stores.set(name,new Map())},
    transaction(name){
      const map=stores.get(name),tx={oncomplete:null,onerror:null,onabort:null};
      tx.objectStore=()=>({
        get(k){
          const req={result:undefined,onsuccess:null,onerror:null};
          queueMicrotask(()=>{req.result=map.get(k);req.onsuccess?.()});
          return req;
        },
        put(value,key){
          queueMicrotask(()=>{map.set(key,value);tx.oncomplete?.()});
        },
        delete(key){
          queueMicrotask(()=>{map.delete(key);tx.oncomplete?.()});
        }
      });
      return tx;
    }
  };
  return {
    data:stores,
    open(_name,version){
      assert.equal(version,1);
      const req={result:db,error:null,onupgradeneeded:null,onsuccess:null,onerror:null};
      queueMicrotask(()=>{
        if(!stores.has("keys"))req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }
  };
}
function mockEl(){
  return {
    value:"",disabled:false,checked:true,textContent:"",dataset:{},classList:{toggle(){}},
    handlers:{},addEventListener(kind,cb){this.handlers[kind]=cb}
  };
}
function run(indexedDB=fakeIndexedDB(),{secure=true,apiStatus=200}={}){
  const ids=["ghToken","ghCredentialStatus","ghConnectRemember","ghForgetDevice","ghRememberDevice"];
  const controls=new Map(ids.map(id=>[id,mockEl()]));
  const calls=[];
  const window={indexedDB,crypto:webcrypto,isSecureContext:secure};
  const fetch=async(url,opt={})=>{
    calls.push({url,method:opt.method||"GET",headers:opt.headers});
    return {ok:apiStatus>=200&&apiStatus<300,status:apiStatus,
      json:async()=>apiStatus===200?{login:"test-github-user"}:{message:"Unauthorized"}};
  };
  runInNewContext(source,{
    window,document:{getElementById:id=>controls.get(id)||null},fetch,
    TextEncoder,TextDecoder,Uint8Array,Error,Array,Promise
  });
  return {vault:window.BNGithubTokenVault,controls,calls,indexedDB};
}
const TOKEN="ghp_TEST_NOT_REAL_0123456789_abcdefghijklmnopqrstuvwxyz";

test("TTS shows a remembered connection state without expanding optional settings",()=>{
  const i=page.indexOf('id="ghCredentialStatus"');
  const disclosure=page.indexOf('<details id="githubConnectionSettings">');
  assert.ok(i>0 && i<disclosure);
  for(const id of ["ghToken","ghRememberDevice","ghConnectRemember","ghForgetDevice"])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.ok(page.includes('<script src="github-credential-vault.js?v='));
  assert.match(page,/#ghCredentialStatus\[data-state="connected"\]/);
  assert.match(page,/id="ghCredentialStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.ok(page.indexOf('src="github-credential-vault.js')<page.indexOf('src="dynamic-voice.js'));
  assert.match(page,/await window\.BNGithubTokenVault\?\.ready/);
  assert.match(page,/rememberAfterSuccess/);
  assert.match(pron,/await window\.BNGithubTokenVault\?\.ready/);
  assert.match(pron,/await window\.BNGithubTokenVault\?\.rememberAfterSuccess/);
});

test("Validated token survives a reload in encrypted IndexedDB, not plaintext",async()=>{
  const db=fakeIndexedDB(),first=run(db);await first.vault.ready;
  first.controls.get("ghToken").value=TOKEN;
  assert.equal(await first.vault.connect(),true);
  assert.equal(first.calls.length,1);
  assert.equal(first.calls[0].url,"https://api.github.com/user");
  assert.match(first.controls.get("ghCredentialStatus").textContent,/Đã kết nối GitHub thành công · @test-github-user/);
  assert.equal(first.controls.get("ghCredentialStatus").dataset.state,"connected");
  const encrypted=db.data.get("credentials").get("github");
  assert.equal(encrypted.version,1);
  assert.equal(encrypted.provider,"github");
  assert.ok(Array.isArray(encrypted.cipher));
  assert.ok(!JSON.stringify(encrypted).includes(TOKEN));
  const key=db.data.get("keys").get("device-aes-gcm-v1");
  assert.equal(key.extractable,false);
  const reopened=run(db);await reopened.vault.ready;
  assert.equal(reopened.controls.get("ghToken").value,TOKEN);
  const reopenedStatus=reopened.controls.get("ghCredentialStatus");
  assert.match(reopenedStatus.textContent,/Đã kết nối GitHub thành công · @test-github-user/);
  assert.match(reopenedStatus.textContent,/Tự kết nối lại/);
  assert.equal(reopenedStatus.dataset.state,"connected");
  assert.equal(reopened.calls.length,1,"restoring requires one GitHub verification, not manual token entry");
});

test("Successful WAV/PR action can securely remember a pasted token automatically",async()=>{
  const db=fakeIndexedDB(),first=run(db);await first.vault.ready;
  first.controls.get("ghToken").value=TOKEN;
  assert.equal(await first.vault.rememberAfterSuccess(),true);
  const reopened=run(db);await reopened.vault.ready;
  assert.equal(await reopened.vault.token(),TOKEN);
});

test("Forget removes the saved token without deleting any GitHub data",async()=>{
  const db=fakeIndexedDB(),first=run(db);await first.vault.ready;
  first.controls.get("ghToken").value=TOKEN;
  await first.vault.rememberAfterSuccess();
  assert.equal(await first.vault.forget(),true);
  assert.equal(first.controls.get("ghToken").value,"");
  const reopened=run(db);await reopened.vault.ready;
  assert.equal(reopened.controls.get("ghToken").value,"");
  assert.equal(db.data.get("credentials").has("github"),false);
});

test("Opting out means session-only token, no permanent copy",async()=>{
  const db=fakeIndexedDB(),first=run(db);await first.vault.ready;
  first.controls.get("ghToken").value=TOKEN;
  first.controls.get("ghRememberDevice").checked=false;
  assert.equal(await first.vault.connect(),true);
  assert.equal(db.data.get("credentials").has("github"),false);
  assert.equal(await first.vault.rememberAfterSuccess(),false);
  assert.equal(first.controls.get("ghCredentialStatus").dataset.state,"connected");
});

test("Never store invalid tokens or create localStorage-based secret copies",async()=>{
  const db=fakeIndexedDB(),first=run(db);await first.vault.ready;
  first.controls.get("ghToken").value="abc";
  assert.equal(await first.vault.connect(),false);
  assert.equal(db.data.get("credentials").has("github"),false);
  assert.ok(!/localStorage\.setItem|sessionStorage\.setItem|document\.cookie\s*=/.test(source));
  assert.ok(!/extractable:\s*true/.test(source));
  assert.ok(source.includes("AES-GCM"));
});

test("Unavailable persistent browser storage never claims token was saved",async()=>{
  const ctx=run(null,{secure:false});
  await ctx.vault.ready;
  ctx.controls.get("ghToken").value=TOKEN;
  assert.equal(await ctx.vault.rememberAfterSuccess(),false);
  assert.match(ctx.controls.get("ghCredentialStatus").textContent,/không lưu được token/i);
});

test("Rejected or revoked token never appears as successfully connected",async()=>{
  const db=fakeIndexedDB();
  const initial=run(db);await initial.vault.ready;
  initial.controls.get("ghToken").value=TOKEN;
  assert.equal(await initial.vault.connect(),true);
  const reopened=run(db,{apiStatus:401});await reopened.vault.ready;
  const banner=reopened.controls.get("ghCredentialStatus");
  assert.equal(banner.dataset.state,"error");
  assert.doesNotMatch(banner.textContent,/Đã kết nối GitHub thành công/);
  assert.match(banner.textContent,/GitHub từ chối token/);
  assert.equal(reopened.controls.get("ghToken").value,TOKEN,"Token can be replaced without manual recovery");
});

test("A GitHub authentication failure shows an error banner, not a green connected state",async()=>{
  const ctx=run(fakeIndexedDB(),{apiStatus:401});await ctx.vault.ready;
  ctx.controls.get("ghToken").value=TOKEN;
  assert.equal(await ctx.vault.connect(),false);
  assert.equal(ctx.controls.get("ghCredentialStatus").dataset.state,"error");
  assert.match(ctx.controls.get("ghCredentialStatus").textContent,/Kết nối GitHub thất bại/);
});

test("After successful sync, connection banner shows success even without pressing Connect",async()=>{
  const ctx=run();await ctx.vault.ready;
  ctx.controls.get("ghToken").value=TOKEN;
  assert.equal(await ctx.vault.rememberAfterSuccess(),true);
  assert.equal(ctx.controls.get("ghCredentialStatus").dataset.state,"connected");
  assert.match(ctx.controls.get("ghCredentialStatus").textContent,/Đã kết nối GitHub thành công/);
});

test("Changing or forgetting token immediately clears the green connected state",async()=>{
  const ctx=run();await ctx.vault.ready;
  ctx.controls.get("ghToken").value=TOKEN;
  await ctx.vault.connect();
  ctx.controls.get("ghToken").value="new_invalid_token";
  ctx.controls.get("ghToken").handlers.input();
  assert.equal(ctx.controls.get("ghCredentialStatus").dataset.state,"idle");
  await ctx.vault.forget();
  assert.equal(ctx.controls.get("ghCredentialStatus").dataset.state,"idle");
  assert.doesNotMatch(ctx.controls.get("ghCredentialStatus").textContent,/Đã kết nối GitHub thành công/);
});
