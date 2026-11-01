/* BlogNaver shared provider credential vault — v1.
 * Non-extractable AES-GCM key and encrypted tokens are stored in IndexedDB
 * on the current browser profile/device. Never put secrets in localStorage,
 * sessionStorage, cookies, URLs, GitHub commits or logs.
 * Site scripts can still access the token after unlock: this does NOT protect
 * against malicious same-origin JavaScript, compromised browser or extensions.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const tokenInput = $("ghToken");
  const statusEl = $("ghCredentialStatus");
  const connectButton = $("ghConnectRemember");
  const forgetButton = $("ghForgetDevice");
  const rememberInput = $("ghRememberDevice");
  const DB_NAME = "blognaver-provider-credential-vault-v1";
  const CRYPTO_KEY = "device-aes-gcm-v1";
  const GITHUB = "github";
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let edited = false;
  let busy = false;
  let cachedDB;
  // The connection state is always visible above the collapsed GitHub settings.
  const status = (message, state="idle") => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
    statusEl.classList.toggle("bad",state==="error");
  };
  const connected = (login, detail) => status(
    "Đã kết nối GitHub thành công"+(login?" · @"+login:"")+" — "+detail,"connected"
  );

  function requireStorage() {
    if (!window.indexedDB || !window.crypto?.subtle || !window.isSecureContext)
      throw Error("Trình duyệt này không hỗ trợ lưu token mã hóa bền vững. Token chỉ dùng được trong tab hiện tại.");
  }
  async function database() {
    requireStorage();
    if (cachedDB) return cachedDB;
    cachedDB = new Promise((resolve,reject) => {
      let request;
      try {request = window.indexedDB.open(DB_NAME,1)}
      catch(error){reject(error);return}
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("keys"))
          db.createObjectStore("keys");
        if (!db.objectStoreNames.contains("credentials"))
          db.createObjectStore("credentials");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || Error("Không thể mở kho lưu trữ."));
      request.onblocked = () => reject(Error("Kho lưu trữ đang được dùng ở tab khác."));
    }).catch(error=>{cachedDB=null;throw error});
    return cachedDB;
  }
  async function read(store,key) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,"readonly");
      const req=tx.objectStore(store).get(key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error("Không đọc được dữ liệu thiết bị."));
    });
  }
  async function write(store,key,value) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,"readwrite");
      tx.objectStore(store).put(value,key);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error||Error("Không lưu được dữ liệu thiết bị."));
      tx.onabort=()=>reject(tx.error||Error("Kho dữ liệu đã hủy giao dịch."));
    });
  }
  async function remove(store,key) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,"readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error||Error("Không xóa được dữ liệu thiết bị."));
      tx.onabort=()=>reject(tx.error||Error("Kho dữ liệu đã hủy giao dịch."));
    });
  }
  async function keyForDevice(create=false) {
    const existing=await read("keys",CRYPTO_KEY);
    if(existing)return existing;
    if(!create)return null;
    const key=await window.crypto.subtle.generateKey(
      {name:"AES-GCM",length:256},false,["encrypt","decrypt"]
    );
    await write("keys",CRYPTO_KEY,key);
    return key;
  }
  function normalizeToken(value) {
    const token=String(value||"").trim();
    if(!token||/\s/.test(token)||token.length<15||token.length>512)
      throw Error("Token không hợp lệ hoặc trống. Hãy nhập GitHub PAT đầy đủ.");
    return token;
  }
  async function persist(value) {
    const token=normalizeToken(value);
    const key=await keyForDevice(true);
    const iv=window.crypto.getRandomValues(new Uint8Array(12));
    const cipher=await window.crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(token));
    await write("credentials",GITHUB,{
      version:1,provider:GITHUB,iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))
    });
    return true;
  }
  async function restore() {
    const record=await read("credentials",GITHUB);
    if(!record)return "";
    if(record.version!==1||record.provider!==GITHUB||
       !Array.isArray(record.iv)||record.iv.length!==12||
       !Array.isArray(record.cipher)||record.cipher.length<16)
      throw Error("Dữ liệu token đã lưu bị hỏng.");
    const key=await keyForDevice(false);
    if(!key)throw Error("Thiếu khóa giải mã thiết bị. Hãy nhập lại token.");
    const plaintext=await window.crypto.subtle.decrypt(
      {name:"AES-GCM",iv:new Uint8Array(record.iv)},key,new Uint8Array(record.cipher)
    );
    return normalizeToken(decoder.decode(plaintext));
  }
  async function verifyGitHub(token) {
    const response=await fetch("https://api.github.com/user",{
      headers:{
        "Authorization":"Bearer "+normalizeToken(token),
        "Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28"
      },cache:"no-store",credentials:"omit"
    });
    if(response.status===401)throw Error("GitHub từ chối token (401). Hãy nhập token mới.");
    if(response.status===403)throw Error("GitHub từ chối quyền hoặc đang giới hạn API (403).");
    if(!response.ok)throw Error("Không xác thực được với GitHub (HTTP "+response.status+").");
    const data=await response.json();
    if(!data?.login)throw Error("GitHub không trả về danh tính tài khoản.");
    return String(data.login);
  }
  async function rememberAfterSuccess() {
    if(!tokenInput)return false;
    // This is called only after GitHub accepted a WAV or dictionary write.
    if(rememberInput?.checked!==true){
      connected("", "Đang dùng trong tab này; không lưu token trên thiết bị.");
      return false;
    }
    try {
      await persist(tokenInput.value);
      connected("", "Token đã mã hóa trên thiết bị và sẽ được tự khôi phục khi tải lại trang.");
      return true;
    } catch(error) {
      status("GitHub đã xử lý tác vụ thành công nhưng không lưu được token trên thiết bị: "+(error.message||"Lỗi lưu trữ."),"error");
      return false;
    }
  }
  async function connect() {
    if(busy)return false;
    busy=true;
    if(connectButton)connectButton.disabled=true;
    try {
      await ready;
      status("Đang xác thực token và tài khoản GitHub…","checking");
      const token=normalizeToken(tokenInput?.value);
      const login=await verifyGitHub(token);
      if(rememberInput?.checked) {
        try {
          await persist(token);
          connected(login,"Token đã lưu mã hóa trên thiết bị. Tự kết nối lại sau khi tải trang.");
        } catch(error) {
          status("Đã xác thực GitHub thành công · @"+login+", nhưng không ghi nhớ được token: "+(error.message||"Lỗi lưu trữ."),"error");
          return false;
        }
      } else {
        try{await remove("credentials",GITHUB)}
        catch(error){
          status("Đã xác thực GitHub thành công · @"+login+", nhưng không xóa được bản lưu trước: "+(error.message||"Lỗi lưu trữ."),"error");
          return false;
        }
        connected(login,"Kết nối chỉ trong tab này; không lưu token.");
      }
      edited=false;
      return true;
    } catch(error) {
      status("Kết nối GitHub thất bại: "+(error.message||"Lỗi xác thực.")+" Kiểm tra token và quyền truy cập rồi thử lại.","error");
      return false;
    } finally {
      busy=false;
      if(connectButton)connectButton.disabled=false;
    }
  }
  async function forget() {
    try {
      await ready;
      await remove("credentials",GITHUB);
      if(tokenInput)tokenInput.value="";
      edited=false;
      status("Chưa kết nối GitHub — Đã xóa token khỏi thiết bị này. Dữ liệu trên GitHub không bị ảnh hưởng.","idle");
      return true;
    } catch(error) {
      status("Không xóa được token thiết bị: "+(error.message||"Lỗi bộ nhớ."),"error");
      return false;
    }
  }

  const ready=(async()=>{
    if(!tokenInput)return;
    try{
      status("Đang kiểm tra kết nối GitHub đã lưu trên thiết bị…","checking");
      const token=await restore();
      if(edited)return; // Do not overwrite a token the user is currently editing.
      if(!token) {
        status("Chưa kết nối GitHub — Dán token và bấm Kết nối & ghi nhớ.","idle");
        return;
      }
      tokenInput.value=token;
      if(rememberInput)rememberInput.checked=true;
      status("Đã tìm thấy token trên thiết bị. Đang xác minh lại kết nối GitHub…","checking");
      try {
        const login=await verifyGitHub(token);
        if(!edited && tokenInput.value.trim()===token)
          connected(login,"Tự kết nối lại từ token mã hóa trên thiết bị; không cần dán lại.");
      } catch(error) {
        if(!edited && tokenInput.value.trim()===token)
          status("Đã khôi phục token nhưng chưa kết nối GitHub: "+(error.message||"Không thể xác thực.")+" Token vẫn còn trên thiết bị.","error");
      }
    }catch(error){
      if(!edited)status("Không khôi phục được token đã lưu: "+(error.message||"Lỗi bộ nhớ.")+" Bạn vẫn có thể dán token để kết nối.","error");
    }
  })();
  if(tokenInput){
    tokenInput.addEventListener("input",()=>{
      edited=true;
      status("Token đã thay đổi — Bấm Kết nối & ghi nhớ để xác nhận tài khoản GitHub.","idle");
    });
    connectButton?.addEventListener("click",()=>{void connect()});
    forgetButton?.addEventListener("click",()=>{void forget()});
    // The owner's request explicitly opts into persistent storage for this browser.
    if(rememberInput)rememberInput.checked=true;
  }
  window.BNGithubTokenVault=Object.freeze({
    ready,persist,restore,connect,forget,rememberAfterSuccess,
    token:async()=>{await ready;return tokenInput?.value.trim()||""}
  });
})();
