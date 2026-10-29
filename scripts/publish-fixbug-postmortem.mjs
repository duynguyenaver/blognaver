#!/usr/bin/env node
// Fact-based, idempotent, no LLM, no execution of untrusted PR code.
import {readFile} from "node:fs/promises";
const repo=process.env.GITHUB_REPOSITORY||"duynguyenaver/blognaver";
const token=process.env.GITHUB_TOKEN,number=Number(process.env.PR_NUMBER);
if(!token||!Number.isInteger(number)||number<=0)throw Error("GITHUB_TOKEN / PR_NUMBER missing");
const [owner,name]=repo.split("/");
const base="https://api.github.com/repos/"+owner+"/"+name,web="https://github.com/"+repo;
const target="content/posts/fixbug-2026-pr-"+number+".md";
const clean=(s,n=160)=>String(s||"").replace(/gh[pousr]_[a-z0-9_]+|github_pat_[a-z0-9_]+/gi,"[REDACTED]").replace(/[\r\n\t<>[\]{}|]/g," ").replace(/\s+/g," ").slice(0,n).trim();
const yaml=s=>JSON.stringify(String(s||""));
const ts=s=>Date.parse(s||"")||0;
async function api(path,method="GET",body=null,missing=false){
 const r=await fetch(base+path,{method,headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28",...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,redirect:"manual"});
 if(missing&&r.status===404)return null;
 if(!r.ok)throw Error("GitHub API "+r.status+" "+path);
 if(r.status===204)return {};
 return r.json();
}
async function pages(path,limit=5){
 const all=[];
 for(let p=1;p<=limit;p++){
  const response=await api(path+(path.includes("?")?"&":"?")+"per_page=100&page="+p);
  const part=Array.isArray(response)?response:response.workflow_runs||response.jobs||[];
  all.push(...part);if(part.length<100)break;
 }
 return all;
}
const skip=s=>{console.log("SKIPPED: "+s);process.exit(0)};
async function readLog(job){
 const r=await fetch(base+"/actions/jobs/"+job.id+"/logs",{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json"},redirect:"manual"});
 if([301,302,303,307].includes(r.status)){
  const url=r.headers.get("location");
  if(!url||!url.startsWith("https://"))throw Error("Invalid log redirect");
  const log=await fetch(url); // never forward token to external log URL
  if(!log.ok)throw Error("Log download failed "+log.status);
  return (await log.text()).slice(-250000);
 }
 if(!r.ok)throw Error("Log download failed "+r.status);
 return (await r.text()).slice(-250000);
}
const pr=await api("/pulls/"+number);
if(pr.state!=="closed"||!pr.merged_at||!pr.merge_commit_sha)skip("PR not merged");
if(pr.base.ref!=="main"||pr.head.repo?.full_name!==repo)skip("PR not from this repository/main");
if(pr.user?.login==="github-actions[bot]"||/fixbug.2026/i.test(pr.title))skip("Avoid automation loop");
if(await api("/contents/"+target+"?ref=main","GET",null,true))skip("Post already exists");
const all=await pages("/actions/workflows/pr-bug-checker.yml/runs?event=pull_request",6);
const runs=all.filter(r=>{
 const explicit=(r.pull_requests||[]).some(x=>x.number===number);
 const fallback=!r.pull_requests?.length&&r.head_branch===pr.head.ref&&r.head_repository?.full_name===repo;
 return (explicit||fallback)&&ts(r.created_at)>=ts(pr.created_at)-60000&&ts(r.created_at)<=ts(pr.merged_at)+120000;
}).sort((a,b)=>ts(a.created_at)-ts(b.created_at));
const success=runs.filter(r=>r.status==="completed"&&r.conclusion==="success").at(-1);
if(!success)skip("No successful linked Bug Checker run");
const failed=runs.filter(r=>r.conclusion==="failure"&&r.head_sha!==success.head_sha&&ts(r.created_at)<ts(success.created_at)).at(-1);
if(!failed)skip("No earlier failure on a different tested revision");
const commits=await pages("/pulls/"+number+"/commits",3);
if(commits.length<2)skip("No fix revision in PR commit history");
const jobs=await pages("/actions/runs/"+failed.id+"/jobs",2);
let log="";
for(const job of jobs.filter(j=>j.conclusion==="failure").slice(0,2)){try{log+="\n"+await readLog(job)}catch(e){console.warn("Log inaccessible:",e.message)}}
if(!log)skip("No failed-job log");
const kb=JSON.parse(await readFile("data/ci/bug-knowledge.json","utf8"));
const known=(kb.cases||[]).filter(c=>{try{return new RegExp(c.regex,"im").test(log)}catch{return false}});
const symptom=known.find(c=>c.kind==="deterministic");
if(!symptom)skip("No deterministic evidence recognized in knowledge base");
const changes=await pages("/pulls/"+number+"/files",3);
const files=changes.filter(c=>c.filename&&c.status!=="removed").slice(0,12);
if(!files.length)skip("No source files to describe");
const title="Fix Bug 2026: "+clean(symptom.title,95)+" — PR #"+number;
const lines=[
"---",
"title: "+yaml(title),
"date: "+yaml(new Date(pr.merged_at).toISOString()),
"draft: false",
"slug: "+yaml("fixbug-2026-pr-"+number),
"description: "+yaml("Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #"+number),
'categories: ["Công nghệ", "Fix Bug"]',
'tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]',
'series: ["fix-bug-2026"]',
"seriesOrder: "+number,
'author: "BlogNaver CI Reporter"',
"---","",
"*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, CI logs và Knowledge Base, không dùng AI tự tạo nguyên nhân.*","",
"Trong quá trình phát triển BlogNaver, [PR #"+number+"]("+web+"/pull/"+number+") từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge. Bài ghi lại những tín hiệu có thể kiểm chứng, không khẳng định đã chứng minh được một dòng mã gây lỗi cụ thể.","",
"## Bối cảnh và dấu hiệu lỗi","",
"**PR:** "+clean(pr.title,180)+".",
"",
"**Nhóm lỗi nhận diện bằng quy tắc:** "+clean(symptom.title,130)+".",
"",
"**Hướng kiểm tra từ Knowledge Base:** "+clean(symptom.advice,400)+".",
"",
"Chi tiết được lấy từ [CI run thất bại #"+failed.id+"]("+web+"/actions/runs/"+failed.id+"). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.",
"",
"## Những file có thay đổi trong PR","",
...files.map(x=>"- "+clean(x.filename,150)+" ("+x.status+", +"+x.additions+"/-"+x.deletions+")"),
"",
"Danh sách trên là phạm vi thay đổi được ghi nhận, không chứng minh tất cả các file đều liên quan trực tiếp đến sự cố. Xem [diff của PR]("+web+"/pull/"+number+"/files) để đối chiếu.",
"",
"## Các commit để đối chiếu","",
...commits.slice(-8).map(c=>"- ["+c.sha.slice(0,10)+"]("+web+"/commit/"+c.sha+"): "+clean(c.commit?.message?.split("\n")[0],140)),
"",
"## Kết quả kiểm chứng","",
"- CI từng lỗi: [run #"+failed.id+"]("+web+"/actions/runs/"+failed.id+").",
"- CI chạy thành công sau bản sửa: [run #"+success.id+"]("+web+"/actions/runs/"+success.id+").",
"- Bản thay đổi đã merge: [PR #"+number+"]("+web+"/pull/"+number+").",
"",
"**Giới hạn:** Hai lượt CI ở hai SHA khác nhau cho thấy trạng thái kiểm thử đã đổi sau khi sửa source. Để nói chính xác lỗi được sửa bởi dòng nào, cần đối chiếu failed log với commit diff. CI xanh cũng không thay thế kiểm chứng production trên trình duyệt.",
"",
"## Bài học có thể tái sử dụng","",
"1. Lưu và kiểm tra log thất bại trước khi sửa.",
"2. Phân loại deterministic và transient; không coi retry là repair.",
"3. So sánh diff giữa các revision và kiểm tra lỗi bằng lệnh phù hợp.",
"4. Chỉ đưa thay đổi lên main sau khi CI hiện hành thành công.",
"5. Kiểm tra GitHub Pages và UI sau deploy, không tuyên bố hoàn thành chỉ từ CI xanh.",
"",
"## Nguồn tham khảo","",
"- [Knowledge Base của BlogNaver]("+web+"/blob/main/data/ci/bug-knowledge.json)",
"- [PR Bug Checker]("+web+"/blob/main/.github/workflows/pr-bug-checker.yml)",
"- [Lịch sử PR]("+web+"/pull/"+number+")",
"",
"*Bài được tạo tự động, không đăng raw CI log hay dữ liệu bí mật. Nội dung nhằm ghi nhận thực nghiệm kỹ thuật, không thay thế hướng dẫn xác minh từng dự án.*",""
];
const content=lines.join("\n");
if(process.env.DRY_RUN==="1"){console.log("DRY RUN: "+target+" chars="+content.length);process.exit(0)}
let saved=null;
for(let i=0;i<3;i++){
 if(await api("/contents/"+target+"?ref=main","GET",null,true))skip("Already published on retry");
 try{saved=await api("/contents/"+target,"PUT",{branch:"main",message:"content(fixbug): publish verified CI recovery PR #"+number,content:Buffer.from(content).toString("base64")});break}
 catch(e){if(i===2||!/\b409\b|\b422\b/.test(String(e)))throw e;await new Promise(r=>setTimeout(r,(i+1)*800))}
}
console.log("PUBLISHED "+target+" @ "+saved.commit.sha);
// GITHUB_TOKEN commit does not trigger push workflows. workflow_dispatch is an exception.
await api("/actions/workflows/hugo.yml/dispatches","POST",{ref:"main"});
console.log("DEPLOY DISPATCHED for "+target);
