#!/usr/bin/env node
// Fact-based, idempotent, no LLM, no execution of untrusted PR code.
import {readFile} from "node:fs/promises";
import {appendFileSync} from "node:fs";
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
const labelSpecs={
  "fixbug:evidence-confirmed":{color:"0969da",description:"PR had failed CI, a later passing revision and verified deterministic log evidence"},
  "fixbug:published":{color:"1a7f37",description:"A verified Fix Bug 2026 blog article exists on main"},
  "fixbug:github-only":{color:"9a6700",description:"No public Fix Bug article was generated; see workflow log for reason"}
};
const statuses=Object.keys(labelSpecs);
function summary(kind,reason,url=""){
 const msg="FIXBUG STATUS: "+kind+" — "+reason+(url?" | "+url:"");
 console.log(msg);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   "### Fix Bug 2026 · PR #"+number+"\n\n**"+kind+"** — "+reason+
   (url?"\n\n[Bài blog / Markdown]("+url+")":"")+"\n\n");
}
async function mark(status){
 try{
   for(const [label,spec] of Object.entries(labelSpecs)){
     const exists=await api("/labels/"+encodeURIComponent(label),"GET",null,true);
     if(!exists){try{await api("/labels","POST",{name:label,...spec})}catch(e){if(!String(e).includes("422"))throw e}}
   }
   await api("/issues/"+number+"/labels","POST",{labels:[status]});
   for(const label of statuses.filter(x=>x!==status && !(status==="fixbug:published"&&x==="fixbug:evidence-confirmed"))){
     try{await api("/issues/"+number+"/labels/"+encodeURIComponent(label),"DELETE",null,true)}catch(e){console.warn("Could not clear old label:",e.message)}
   }
 }catch(e){console.warn("Could not update PR labels:",e.message)}
}
const skip=async reason=>{await mark("fixbug:github-only");summary("GITHUB ONLY / SKIPPED",reason);process.exit(0)};
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
if(pr.state!=="closed"||!pr.merged_at||!pr.merge_commit_sha)await skip("PR not merged");
if(pr.base.ref!=="main"||pr.head.repo?.full_name!==repo)await skip("PR not from this repository/main");
if(pr.user?.login==="github-actions[bot]"||/fixbug.2026/i.test(pr.title))await skip("Avoid automation loop");
if(await api("/contents/"+target+"?ref=main","GET",null,true)){await mark("fixbug:published");summary("PUBLISHED","Article already exists on main",web+"/blob/main/"+target);process.exit(0)}
const all=await pages("/actions/workflows/pr-bug-checker.yml/runs?event=pull_request",6);
const runs=all.filter(r=>{
 const explicit=(r.pull_requests||[]).some(x=>x.number===number);
 const fallback=!r.pull_requests?.length&&r.head_branch===pr.head.ref&&r.head_repository?.full_name===repo;
 return (explicit||fallback)&&ts(r.created_at)>=ts(pr.created_at)-60000&&ts(r.created_at)<=ts(pr.merged_at)+120000;
}).sort((a,b)=>ts(a.created_at)-ts(b.created_at));
const success=runs.filter(r=>r.status==="completed"&&r.conclusion==="success").at(-1);
if(!success)await skip("No successful linked Bug Checker run");
const failed=runs.filter(r=>r.conclusion==="failure"&&r.head_sha!==success.head_sha&&ts(r.created_at)<ts(success.created_at)).at(-1);
const commits=await pages("/pulls/"+number+"/commits",3);
const changes=await pages("/pulls/"+number+"/files",3);
const files=changes.filter(c=>c.filename&&c.status!=="removed").slice(0,12);
if(!files.length)await skip("No source files to describe");
const kb=JSON.parse(await readFile("data/ci/bug-knowledge.json","utf8"));
let symptom=null,log="",evidenceMode="ci-recovery";
if(failed&&commits.length>=2){
 const jobs=await pages("/actions/runs/"+failed.id+"/jobs",2);
 for(const job of jobs.filter(j=>j.conclusion==="failure").slice(0,2)){try{log+="\\n"+await readLog(job)}catch(e){console.warn("Log inaccessible:",e.message)}}
 const known=(kb.cases||[]).filter(c=>{try{return new RegExp(c.regex,"im").test(log)}catch{return false}});
 symptom=known.find(c=>c.kind==="deterministic")||null;
}
if(!symptom){
 // Separate evidence track: verified code change + passing CI + explicitly documented failure.
 // A single-commit PR may qualify, but only as an engineering postmortem (not a CI recovery).
 const body=String(pr.body||"");
 const documented=/(root cause|confirmed failure mechanism|reproduc(?:e|tion)|steps to reproduce|nguyên nhân|lỗi đã xác nhận|bug:)/i.test(body)
   && /(fix|repair|change|solution|khắc phục|đã sửa)/i.test(body);
 const sourceFiles=changes.filter(c=>/^(scripts\/|static\/|layouts\/|assets\/|\.github\/workflows\/)/.test(c.filename||"")
   && c.status!=="removed"&&c.changes>0);
 const tangible=sourceFiles.some(c=>(c.patch||"").includes("@@")&&/^[+-](?![+-])\S/m.test(c.patch||""));
 const defectScope=/(fix|hotfix|bug|repair)/i.test(pr.title||"");
 if(!documented||!tangible||!defectScope||!sourceFiles.length)await skip("No deterministic CI recovery or documented code-backed product defect");
 evidenceMode="engineering-postmortem";
 symptom={title:"Documented product defect and code repair",advice:"Review the attributed PR description, linked code diff and successful Bug Checker; no failing CI log was established."};
}
await mark("fixbug:evidence-confirmed");
summary("EVIDENCE CONFIRMED",evidenceMode==="ci-recovery"?"Failed and passing CI on different SHAs with deterministic log signature":"Documented defect, source diff and linked passing CI; no CI recovery claim");
const title="Fix Bug 2026: "+(evidenceMode==="ci-recovery"?clean(symptom.title,95):clean(pr.title,95))+" — PR #"+number;
const lines=[
"---",
"title: "+yaml(title),
"date: "+yaml(new Date(pr.merged_at).toISOString()),
"draft: false",
"slug: "+yaml("fixbug-2026-pr-"+number),
"description: "+yaml(evidenceMode==="ci-recovery"?"Bài học CI lỗi và chạy lại thành công sau bản sửa của PR #"+number:"Engineering postmortem dựa trên PR, code diff và CI thành công cho PR #"+number),
'categories: ["Công nghệ", "Fix Bug"]',
'tags: ["fixbug", "series", "GitHub Actions", "Debugging", "BlogNaver"]',
'series: ["fix-bug-2026"]',
"seriesOrder: "+number,
'author: "BlogNaver CI Reporter"',
"---","",
"*Fix Bug 2026 · Bài tự động tổng hợp từ GitHub PR, CI logs và Knowledge Base, không dùng AI tự tạo nguyên nhân.*","",
evidenceMode==="ci-recovery"?"Trong quá trình phát triển BlogNaver, [PR #"+number+"]("+web+"/pull/"+number+") từng không vượt qua kiểm tra CI. Sau khi mã thay đổi, một lượt kiểm tra khác đã hoàn tất thành công và PR được merge.":"[PR #"+number+"]("+web+"/pull/"+number+") ghi nhận một lỗi được tác giả PR mô tả và một thay đổi mã nhằm xử lý lỗi. PR đã vượt qua Bug Checker và được merge. Không có bằng chứng CI đỏ rồi xanh trên hai revision cho trường hợp này.","",
"## Bối cảnh và dấu hiệu lỗi","",
"**PR:** "+clean(pr.title,180)+".",
"",
"**Chế độ bằng chứng:** "+(evidenceMode==="ci-recovery"?"CI recovery":"Engineering postmortem")+". **Nhóm lỗi:** "+clean(symptom.title,130)+".",
"",
"**Hướng kiểm tra:** "+clean(symptom.advice,400)+".",
"",
evidenceMode==="ci-recovery"?"Chi tiết được lấy từ [CI run thất bại #"+failed.id+"]("+web+"/actions/runs/"+failed.id+"). Rule matching là bằng chứng về dấu hiệu, **chưa phải kết luận root cause**.":"Mô tả lỗi là tuyên bố trong PR: [xem nguồn gốc và cách sửa]("+web+"/pull/"+number+"). Không có log thất bại để xác minh độc lập nguyên nhân.",
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
...(evidenceMode==="ci-recovery"?["- CI từng lỗi: [run #"+failed.id+"]("+web+"/actions/runs/"+failed.id+")."]:["- Chưa xác minh được CI thất bại trước khi sửa."]),
"- CI chạy thành công sau bản sửa: [run #"+success.id+"]("+web+"/actions/runs/"+success.id+").",
"- Bản thay đổi đã merge: [PR #"+number+"]("+web+"/pull/"+number+").",
"",
evidenceMode==="ci-recovery"?"**Giới hạn:** Hai lượt CI ở hai SHA khác nhau cho thấy trạng thái kiểm thử đã đổi sau khi sửa source. CI xanh không thay thế kiểm chứng production.":"**Giới hạn:** Root cause do PR mô tả, chưa chứng minh được bằng CI lỗi trước đó. Diff và CI xanh chứng minh có thay đổi mã và kiểm thử qua, không chứng minh lỗi đã tái hiện/khắc phục trên production.",
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

const publishBranch="content/fixbug-2026-pr-"+number;
const existingRef=await api("/git/ref/heads/"+publishBranch,"GET",null,true);
if(!existingRef){
 const mainRef=await api("/git/ref/heads/main");
 await api("/git/refs","POST",{ref:"refs/heads/"+publishBranch,sha:mainRef.object.sha});
}
const article=await api("/contents/"+target+"?ref="+publishBranch,"GET",null,true);
if(!article)await api("/contents/"+target,"PUT",{
 branch:publishBranch,
 message:"content(fixbug): propose verified CI recovery PR #"+number,
 content:Buffer.from(content).toString("base64")
});
const openPRs=await api("/pulls?state=open&head="+encodeURIComponent(repo.split("/")[0]+":"+publishBranch)+"&base=main");
let proposed=openPRs[0];
if(!proposed)proposed=await api("/pulls","POST",{
 title:"content(fixbug): verified CI recovery PR #"+number,
 head:publishBranch,base:"main",draft:false,
 body:"Evidence-backed Fix Bug 2026 article for PR #"+number+". Publish only after CI passes through standard auto-merge."
});
console.log("CASE STUDY PR CREATED "+proposed.html_url);
summary("PR CREATED","Article awaits CI and auto-merge",proposed.html_url);
