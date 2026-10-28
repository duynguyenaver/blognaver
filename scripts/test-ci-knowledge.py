#!/usr/bin/env python3
"""Self-test classifier against representative public CI errors. No network access."""
import json,pathlib,re
kb=json.loads(pathlib.Path("data/ci/bug-knowledge.json").read_text())
samples={
 "hugo-template-schema":"can't evaluate field published in type string",
 "dart-sass":"no Dart Sass binary found in $PATH",
 "hugo-module":"failed to download modules",
 "javascript":"SyntaxError: Unexpected token",
 "missing-output":"missing-output public/posts/index.html",
 "github-permissions":"Resource not accessible by integration",
 "network-rate":"429 Too Many Requests",
 "merge-conflict":"CONFLICT (modify/delete): layouts/_partials/footer/custom.html"
}
for expected,line in samples.items():
 matches=[c["id"] for c in kb["cases"] if re.search(c["regex"],line,re.I|re.M)]
 assert expected in matches,(expected,matches)
print("PASS: "+str(len(samples))+" known CI failure fixtures classified")
