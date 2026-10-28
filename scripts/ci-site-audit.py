#!/usr/bin/env python3
"""Read-only Hugo/Blowfish build audit. No source modifications or AI-generated patches."""
import json, os, pathlib, re, subprocess, sys, urllib.parse
from collections import Counter
ROOT=pathlib.Path(".")
OUT=ROOT/"public"
BASE="/blognaver/"
errors=[]
def fail(category, explanation):
    errors.append({"category":category,"message":explanation})
def check_file(path):
    file=OUT/path
    if not file.is_file() or file.stat().st_size == 0:
        fail("missing-output",str(path))
    return file
pages=["index.html","posts/index.html","resume/index.html","cms/index.html","resume-cms/index.html"]
for path in pages:
    file=check_file(path)
    if file.is_file() and "<html" not in file.read_text(encoding="utf-8",errors="replace").lower():
        fail("invalid-html",path)
# Validate outputs for published article permalinks, without assuming individual slugs.
articles=list(OUT.glob("bai-viet/*/index.html"))
source_posts=list((ROOT/"content/posts").glob("**/*.md")) if (ROOT/"content/posts").exists() else []
if source_posts and not articles:
    fail("permalink","Published article pages missing under /bai-viet/")
# Verify local stylesheet/script references on critical pages, respecting Hugo pathprefix.
for path in ["index.html","posts/index.html"]:
    file=OUT/path
    if not file.is_file():continue
    html=file.read_text(encoding="utf-8",errors="replace")
    refs=re.findall(r'(?:src|href)\s*=\s*["\']([^"\']+)["\']',html,re.I)
    for raw in refs:
        url=urllib.parse.urlsplit(raw)
        if url.scheme or url.netloc or raw.startswith(("#","data:","mailto:","tel:")):continue
        if not re.search(r"\.(js|css)(?:$|\?)",url.path,re.I):continue
        local=url.path
        if local.startswith(BASE):local=local[len(BASE):]
        elif local.startswith("/"):continue
        else:local=urllib.parse.urljoin("/"+str(path),local).lstrip("/")
        if not (OUT/urllib.parse.unquote(local)).is_file():
            fail("missing-asset",str(path)+": "+raw)
# Check JS syntax of changed first-party scripts only. No external npm dependency needed.
try:
    base=subprocess.run(["git","merge-base","origin/main","HEAD"],capture_output=True,text=True,check=True).stdout.strip()
    paths=subprocess.run(["git","diff","--name-only","--diff-filter=ACM",base,"HEAD"],capture_output=True,text=True,check=True).stdout.splitlines()
    for name in paths:
        if name.endswith((".js",".mjs",".cjs")) and pathlib.Path(name).is_file() and not name.endswith(".min.js"):
            result=subprocess.run(["node","--check",name],capture_output=True,text=True)
            if result.returncode:fail("js-syntax",name+": "+result.stderr[-500:])
except (subprocess.CalledProcessError,FileNotFoundError) as e:
    fail("tooling","JS diff audit unavailable: "+str(e))
report={"pass":not errors,"metrics":{"article_pages":len(articles),"source_markdown":len(source_posts),"checked_pages":len(pages)},"errors":errors}
path=pathlib.Path(os.environ.get("RUNNER_TEMP","/tmp"))/"blognaver-bug-report.json"
path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if not errors else 1)
