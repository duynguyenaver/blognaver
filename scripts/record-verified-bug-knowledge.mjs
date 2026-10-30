#!/usr/bin/env node
// Promote a VERIFIED bug fix to AGENTS.md and the CI knowledge base via PR only.
// A merged PR and green CI alone do not establish a root cause or a browser fix.
import {readFile} from 'node:fs/promises';
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
const number=Number(process.env.PR_NUMBER);
if(!repo||!token||!Number.isInteger(number)||number<1)throw Error('Missing credentials or PR');
const [owner,name]=repo.split('/');
const base='https://api.github.com/repos/'+repo;
async function api(path,method='GET',payload){
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
 if(!r.ok)throw Error('GitHub '+r.status+' '+path);
 return r.status===204?{}:r.json();
}
const pr=await api('/pulls/'+number);
if(!pr.merged_at||pr.base.ref!=='main'||pr.head.repo.full_name!==repo)process.exit(0);
if(pr.user.login==='github-actions[bot]'||/knowledge|case.study|fixbug/i.test(pr.title))process.exit(0);
const body=String(pr.body||'');
const fields={};
for(const key of ['Symptoms','Root Cause','Solution','Verification','Category','Severity','Tags']){
 const match=body.match(new RegExp('^'+key+':\\s*(.+)$','im'));
 if(match)fields[key]=match[1].trim();
}
if(['Symptoms','Root Cause','Solution','Verification'].some(k=>!fields[k])) {
 console.log('No complete structured evidence in PR body: skip knowledge publication');process.exit(0);
}
if(!/^(?:verified|passed)\b/i.test(fields.Verification)){
 console.log('Verification field does not affirm independently verified fix');process.exit(0);
}
const runs=await api('/actions/workflows/pr-bug-checker.yml/runs?event=pull_request&per_page=100');
const confirmed=(runs.workflow_runs||[]).some(r=>r.head_sha===pr.head.sha&&r.status==='completed'&&r.conclusion==='success'&&
 ((r.pull_requests||[]).some(p=>p.number===number)||r.head_branch===pr.head.ref));
if(!confirmed){console.log('No verified green Bug Checker on PR head SHA');process.exit(0)}
const date=pr.merged_at.slice(0,10);
const id='bug-'+date+'-'+String(number).padStart(3,'0');
const kb=JSON.parse(await readFile('data/ci/bug-knowledge.json','utf8'));
if(kb.cases.some(c=>c.id===id)){console.log('Already recorded');process.exit(0)}
const safe=(text,max=500)=>String(text||'').replace(/[\r\n]/g,' ').slice(0,max).trim();
const severity=['Low','Medium','High','Critical'].find(x=>x.toLowerCase()===(fields.Severity||'').toLowerCase());
if(!severity){console.log('Missing valid Severity: Low, Medium, High or Critical');process.exit(0)}
const entry={id,date,category:safe(fields.Category||'Bug Fix',80),severity,symptom:safe(fields.Symptoms),root_cause:safe(fields['Root Cause']),fix_solution:safe(fields.Solution),pr_url:pr.html_url,tags:(fields.Tags||'verified,bugfix').split(',').map(x=>safe(x,35)).filter(Boolean).slice(0,8),
 title:'Verified bug fix PR #'+number,regex:'(?!)',kind:'verified-postmortem',advice:safe(fields.Solution),source:pr.html_url,evidence:'PR #'+number+'; '+safe(fields.Verification)};
kb.cases.push(entry);kb.updated=date;
const notes='\n### '+id+' ('+date+')\n- **Symptoms:** '+entry.symptom+'\n- **Root Cause:** '+entry.root_cause+'\n- **Solution:** '+entry.fix_solution+'\n- **Verification:** '+safe(fields.Verification)+' — '+pr.html_url+'\n';
const ag=await readFile('AGENTS.md','utf8');
const branch='knowledge/verified-pr-'+number;
const branchInfo=await api('/git/ref/heads/main');
try{await api('/git/refs','POST',{ref:'refs/heads/'+branch,sha:branchInfo.object.sha})}
catch(e){console.log('Knowledge branch already exists or unavailable: '+e.message);process.exit(0)}
async function write(path,text){
 await api('/contents/'+path,'PUT',{branch,message:'docs(knowledge): record verified fix PR #'+number,content:Buffer.from(text).toString('base64')});
}
await write('data/ci/bug-knowledge.json',JSON.stringify(kb,null,2)+'\n');
await write('AGENTS.md',ag+'\n'+notes);
const created=await api('/pulls','POST',{title:'docs(knowledge): verified bug case PR #'+number,head:branch,base:'main',draft:false,body:'Automatically documented verified postmortem for '+pr.html_url+'. CI must validate both records before auto-merge.'});
console.log('Knowledge PR: '+created.html_url);
