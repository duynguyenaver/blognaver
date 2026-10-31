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

# Fix Bug 2026 casebook must stay advisory and preserve classifier taxonomy.
import subprocess,tempfile
casebook=kb.get("series_casebook",{})
lessons=casebook.get("lessons",[])
expected={54,124,227,232,237,244,249,258}
assert len(lessons)==len(expected)==casebook.get("lesson_count")
ids=set()
known_cases={case["id"] for case in kb["cases"]}
for lesson in lessons:
    for field in ("id","evidence_mode","title","observed_signal","reusable_action",
                  "regression_check","classifier_case_ids","pr_url","article_path","passing_ci_url","evidence_limit"):
        assert field in lesson and lesson[field] is not None,(lesson.get("id"),field)
    assert lesson["id"] not in ids,lesson["id"]
    ids.add(lesson["id"])
    n=int(lesson["id"].rsplit("-",1)[1])
    assert n in expected,n
    assert lesson["evidence_mode"] in ("ci-recovery","engineering-postmortem")
    assert set(lesson["classifier_case_ids"]).issubset(known_cases)
    assert lesson["article_path"]=="content/posts/fixbug-2026-pr-"+str(n)+".md"
    article=pathlib.Path(lesson["article_path"])
    assert article.is_file(),article
    assert "PR #"+str(n) in article.read_text(encoding="utf-8"),article
    assert lesson["pr_url"].endswith("/pull/"+str(n))
    assert lesson["passing_ci_url"].startswith("https://github.com/duynguyenaver/blognaver/actions/runs/")
    if n in (54,124,227):
        assert lesson["evidence_mode"]=="ci-recovery" and lesson.get("failed_ci_url")
    else:
        assert lesson["evidence_mode"]=="engineering-postmortem" and not lesson.get("failed_ci_url")
assert {int(i.rsplit("-",1)[1]) for i in ids}==expected

# Existing evidence signatures still classify errors; historical casebook may only
# supply advice, not change retry safety or execute source edits.
with tempfile.TemporaryDirectory() as directory:
    diagnosis=pathlib.Path(directory)/"diagnosis.json"
    diagnosis.write_text(json.dumps({"matches":[{
        "id":"javascript","title":"JavaScript parse error","kind":"deterministic",
        "advice":"Run node --check","source":"nodejs.org","evidence":"general"
    }]}),encoding="utf-8")
    proc=subprocess.run(["python3","scripts/ci-agent-playbook.py",
                         "--diagnosis",str(diagnosis),"--attempt","1"],
                        capture_output=True,text=True,check=False)
    assert proc.returncode==2,proc.stdout+"\n"+proc.stderr
    assert "Fix Bug 2026" in proc.stdout,proc.stdout
    assert "fixbug-2026-pr-54" in proc.stdout,proc.stdout
    assert "fixbug-2026-pr-227" in proc.stdout,proc.stdout
    assert "Deterministic failure: stop" in proc.stdout,proc.stdout
print("PASS: "+str(len(lessons))+" evidence-rated Fix Bug 2026 lessons; read-only deterministic advice")
