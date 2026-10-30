(()=>{"use strict";
const DB="blognaver_personal_finance",STORE="state";
let handle;
function db(){if(handle)return handle;handle=new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error("IndexedDB unavailable"))});return handle}
async function get(key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readonly"),r=t.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function put(key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(value,key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error("IndexedDB transaction aborted"))})}
window.BNFinanceStore={get,put};
})();