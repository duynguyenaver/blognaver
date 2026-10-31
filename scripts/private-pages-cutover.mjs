/* Replace public GitHub Pages copies of private tools with tiny OAuth redirects.
 * Run only AFTER Worker auth/assets are deployed and tested:
 *    node scripts/private-pages-cutover.mjs https://your-worker.workers.dev
 */
import { readdir, rm, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const publicRoot=path.join(root,"public");
const originArg=process.argv[2];
let origin;
try{
  const parsed=new URL(originArg);
  if(parsed.protocol!=="https:"||parsed.pathname!=="/"||parsed.search||parsed.hash)
    throw Error("Exact HTTPS origin expected");
  origin=parsed.origin;
}catch{
  console.error("Private Pages cutover requires a valid HTTPS OAuth Worker origin.");
  process.exit(1);
}
async function collectDirectoriesWithIndex(directory,rel=""){
  const out=[];
  let entries;
  try{entries=await readdir(directory,{withFileTypes:true})}catch{return out}
  if(entries.some(e=>e.isFile()&&e.name==="index.html"))out.push(rel);
  for(const e of entries){
    if(e.isDirectory())out.push(...await collectDirectoriesWithIndex(path.join(directory,e.name),path.join(rel,e.name)));
  }
  return out;
}
const folders=["tien-ich","resume-cms"];
let rewritten=0;
for(const folder of folders){
  const directory=path.join(publicRoot,folder);
  try{if(!(await stat(directory)).isDirectory())throw Error(folder+" not a directory")}
  catch{throw Error("Expected generated public/"+folder+" directory is missing; refusing partial cutover.")}
  const routes=await collectDirectoriesWithIndex(directory);
  if(!routes.length)throw Error("Expected private HTML pages under public/"+folder+"; refusing incomplete cutover.");
  await rm(directory,{recursive:true,force:true});
  for(const suffix of routes){
    const destination=path.join(directory,suffix,"index.html");
    await mkdir(path.dirname(destination),{recursive:true});
    // The source route has already been removed; only a redirect shell is shipped publicly.
    const route="/blognaver/"+folder+(suffix?"/"+suffix.split(path.sep).join("/"):"")+"/";
    const authLink=origin+"/auth/start?return_to="+encodeURIComponent(route);
    const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập GitHub — BlogNaver</title></head><body><p>Công cụ này đã chuyển sang khu vực bảo vệ bằng GitHub OAuth.</p><p><a id="login" href="'+authLink+'">Đăng nhập GitHub để tiếp tục</a></p><script>location.replace('+JSON.stringify(origin+"/auth/start?return_to=")+'+encodeURIComponent(location.pathname+location.search));</script></body></html>';
    await writeFile(destination,html,"utf8");rewritten++;
  }
}
console.log("Private Pages cutover: replaced "+rewritten+" private HTML pages with OAuth redirect shells.");
