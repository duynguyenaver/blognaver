import {readdir,readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const root="content/posts";
function value(fm,key){
 const line=fm.split(/\r?\n/).find(l=>new RegExp("^"+key+"\\s*:").test(l));if(!line)return "";
 const raw=line.slice(line.indexOf(":")+1).trim();
 try{return JSON.parse(raw)}catch{return raw.replace(/^['"]|['"]$/g,"")}
}
async function main(){
 const entries=await readdir(root,{withFileTypes:true}), posts=[];
 for(const entry of entries){
   if(!entry.isDirectory()&&!(entry.isFile()&&entry.name.endsWith(".md")))continue;
   if(entry.name==="_index.md")continue;
   const isFolder=entry.isDirectory();
   const filename=isFolder?join(root,entry.name,"index.md"):join(root,entry.name);
   const slug=isFolder?entry.name:entry.name.replace(/\\.md$/,"");
   let source;
   try{source=await readFile(filename,"utf8")}catch{continue}
   const match=source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
   if(!match)continue;
   const fm=match[1], body=source.slice(match[0].length).trim();
   const rawCategories=value(fm,"categories"),rawTags=value(fm,"tags");
   posts.push({
     slug,title:value(fm,"title")||slug,
     draft:String(value(fm,"draft")).toLowerCase()==="true",
     category:Array.isArray(rawCategories)?rawCategories:(rawCategories?[rawCategories]:[]),
     tags:Array.isArray(rawTags)?rawTags:(rawTags?[rawTags]:[]),
     cover:value(fm,"featureimage")||value(fm,"featureImage")||"",
     date:value(fm,"date")||"",words:body.split(/\s+/u).filter(Boolean).length,
     source:filename.replace(/\\\\/g,"/")
   });
 }
 posts.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 await mkdir("public/cms",{recursive:true});
 await writeFile("public/cms/posts-index.json",JSON.stringify({generatedAt:new Date().toISOString(),count:posts.length,posts},null,2)+"\n","utf8");
 console.log("CMS index generated: "+posts.length+" posts (including drafts)");
}
await main();
