#!/usr/bin/env python3
"""Read-only evidence-based CI failure classifier for Hugo/Blowfish/GitHub Pages."""
import argparse,json,pathlib,re,sys
def main():
 p=argparse.ArgumentParser();p.add_argument("--log",required=True);p.add_argument("--kb",default="data/ci/bug-knowledge.json");p.add_argument("--out");a=p.parse_args()
 cases=json.loads(pathlib.Path(a.kb).read_text(encoding="utf-8"))["cases"]
 log=pathlib.Path(a.log).read_text(encoding="utf-8",errors="replace")[-250000:]
 matches=[]
 for case in cases:
  if re.search(case["regex"],log,re.I|re.M):
   matches.append({k:case[k] for k in ["id","title","kind","advice","source","evidence"]})
 report={"matches":matches,"status":"classified" if matches else "unclassified","log":pathlib.Path(a.log).name,"note":"Heuristic diagnosis; verify first failing root-cause line before fixing. No modifications executed."}
 content=json.dumps(report,ensure_ascii=False,indent=2)
 print(content)
 if a.out:pathlib.Path(a.out).write_text(content,encoding="utf-8")
 return 0
if __name__=="__main__":sys.exit(main())
