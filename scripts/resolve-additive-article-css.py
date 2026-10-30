#!/usr/bin/env python3
"""Trusted-only three-way resolution for insertion-only article CSS conflicts.
Refuse any replacement, deletion, or nonallowlisted conflict.
"""
import difflib, pathlib, subprocess, sys
path = "static/css/article-justified-prose.css"
def lines(n):
    return subprocess.check_output(["git","show",f":{n}:{path}"], text=True).splitlines(True)
def insertions(base, other):
    out = {}
    for action, i, j, k, l in difflib.SequenceMatcher(None,base,other,autojunk=False).get_opcodes():
        if action == "equal": continue
        if action != "insert" or i != j: raise ValueError(f"Unsafe {action} in CSS")
        out.setdefault(i, []).extend(other[k:l])
    return out
base,head,main=(lines(n) for n in (1,2,3))
h,m=insertions(base,head),insertions(base,main)
out=[]
for i in range(len(base)+1):
    a,b=m.get(i,[]),h.get(i,[])
    out+=a
    if b and b!=a:out+=b
    if i<len(base):out.append(base[i])
result="".join(out)
if "<<<<<<<" in result or ">>>>>>>" in result:raise SystemExit("Unresolved markers")
pathlib.Path(path).write_text(result)
subprocess.check_call(["git","add","--",path])
print("Merged safe insertion-only article CSS conflict")
