import {writeFile,mkdir} from "node:fs/promises";
const url="https://api.github.com/repos/duynguyenaver/blognaver/actions/runs?branch=main&per_page=12";
const headers={Accept:"application/vnd.github+json","User-Agent":"BlogNaver-Deploy"};
if(process.env.GITHUB_TOKEN)headers.Authorization="Bearer "+process.env.GITHUB_TOKEN;
try{
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("GitHub HTTP "+response.status);
 const json=await response.json();
 const runs=(json.workflow_runs||[]).map(({id,head_sha,display_title,status,conclusion,run_number,created_at,html_url})=>({id,head_sha,display_title,status,conclusion,run_number,created_at,html_url}));
 await mkdir("public/cms",{recursive:true});
 await writeFile("public/cms/workflows-snapshot.json",JSON.stringify({generatedAt:new Date().toISOString(),workflow_runs:runs})+"\n");
 console.log("Generated fallback workflow snapshot:",runs.length,"runs");
}catch(error){console.warn("Workflow snapshot unavailable:",error.message)}
