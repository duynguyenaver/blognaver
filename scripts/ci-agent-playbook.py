#!/usr/bin/env python3
"""Read-only CI decision engine. AGENTS.md is advisory documentation, never executable."""
import argparse,json,pathlib,re,sys
p=argparse.ArgumentParser()
p.add_argument("--diagnosis",required=True)
p.add_argument("--attempt",type=int,required=True)
a=p.parse_args()
report=json.loads(pathlib.Path(a.diagnosis).read_text(encoding="utf-8"))
matches=report.get("matches",[])
classes={x.get("kind","") for x in matches}
deterministic=any(x in classes for x in ("deterministic","permissions"))
transient=any(x in classes for x in ("transient","infrastructure","transient-or-deterministic"))
# Unclassified failures must not trigger unlimited retry; initial 3 attempts max.
should_retry=(not deterministic) and (a.attempt< (5 if transient else 3))
print("### Diagnosis after attempt "+str(a.attempt))
for case in matches:
    print("- **"+case.get("title","Unknown")+"** ("+case.get("kind","unknown")+"): "+case.get("advice","Inspect log"))
if not matches:print("- Unknown failure: review the first relevant error, not only the final summary.")
if a.attempt>=3:
    text=pathlib.Path("AGENTS.md").read_text(encoding="utf-8",errors="replace")
    headings=list(re.finditer(r"(?m)^#{2,4} (.+)$",text))
    target=("ci","bug","incident","knowledge","repair","fix","retry","check","module","history")
    shown=0
    print("\n### AGENTS.md: verified project guidance (read-only)")
    for i,m in enumerate(headings):
        heading=m.group(1)
        if not any(key in heading.lower() for key in target):continue
        end=headings[i+1].start() if i+1<len(headings) else len(text)
        excerpt=re.sub(r"\s+"," ",text[m.end():end]).strip()[:350]
        if excerpt:
            print("- **"+heading+"**: "+excerpt)
            shown+=1
        if shown==5:break
    print("- This is documentation guidance, not an automatic source patch.")
if deterministic:print("- Deterministic failure: stop. No retries of unchanged source.")
elif not should_retry:print("- Retry budget reached or unclassified issue: stop, inspect original logs.")
else:print("- Transient candidate: retry allowed with backoff.")
sys.exit(0 if should_retry else 2)
