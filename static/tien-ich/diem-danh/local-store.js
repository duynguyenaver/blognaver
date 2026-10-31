/* Encrypted localStorage is authoritative; IndexedDB is read only for migration. */
(()=>{'use strict';
function create({storage,key,encrypt,decrypt,readLegacy=async()=>null}){
 let expected=null,opened=false;
 async function open(code){const raw=storage.getItem(key);let data=null;if(raw!==null)data=await decrypt(JSON.parse(raw),code);else{const legacy=await readLegacy();if(legacy)data=await decrypt(legacy,code)}expected=raw;opened=true;return data}
 async function save(records,code){
  if(!opened)throw Error('Mở khóa dữ liệu trước khi lưu.');
  const before=expected;if(storage.getItem(key)!==before)throw Error('Dữ liệu đã thay đổi ở tab khác. Mở khóa lại để gộp bản mới nhất.');
  const snapshot=JSON.parse(JSON.stringify(records)),payload=await encrypt(snapshot,code),raw=JSON.stringify(payload);
  if(storage.getItem(key)!==before)throw Error('Tab khác vừa cập nhật dữ liệu. Không ghi đè.');
  try{storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Không xác nhận được dữ liệu localStorage.');const verified=await decrypt(JSON.parse(raw),code);if(JSON.stringify(verified)!==JSON.stringify(snapshot))throw Error('Kiểm tra bản mã local không khớp.');if(storage.getItem(key)!==raw)throw Error('Tab khác vừa cập nhật dữ liệu. Mở khóa lại để gộp.');expected=raw;return payload}
  catch(error){if(storage.getItem(key)===raw){if(before===null)storage.removeItem(key);else storage.setItem(key,before)}throw error}
 }
 // Explicitly confirmed local reset: preserve the previous ciphertext before replacement.
 async function reset(records,code,backupKey){const raw=storage.getItem(key),legacy=await readLegacy();storage.setItem(backupKey,JSON.stringify({version:1,at:new Date().toISOString(),local:raw===null?null:JSON.parse(raw),legacy}));expected=raw;opened=true;return save(records,code)}
 return {open,save,reset};
}
globalThis.BNAttendanceLocalStore={create};
})();
