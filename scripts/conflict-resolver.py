#!/usr/bin/env python3
"""Trusted scanner: bounded additive repairs, normal merge commits, fresh CI."""
import difflib
import json
import os
from pathlib import Path
import subprocess

ALLOWED = {'layouts/baseof.html', 'static/css/article-justified-prose.css'}
MARKER = 'fix(ci): reconcile safe additive conflicts'


def git(*args, check=True):
    return subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', *args],
                          check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path]))


def combine(base, head, main):
    if any(len(x) > 5000 or sum(map(len, x)) > 250000 for x in (base, head, main)):
        raise ValueError('file exceeds bounded resolver size')
    def additions(other):
        result = {}
        for op, i, j, k, l in difflib.SequenceMatcher(None, base, other, autojunk=False).get_opcodes():
            if op == 'equal':
                continue
            if op != 'insert':
                raise ValueError('replacement/deletion requires review')
            result[i] = other[k:l]
        return result
    h, m = additions(head), additions(main)
    output = []
    for i in range(len(base) + 1):
        a, b = m.get(i, []), h.get(i, [])
        output.extend(a)
        if b != a:
            output.extend(b)
        if i < len(base):
            output.append(base[i])
    text = ''.join(output)
    if any(line.startswith(('<<<<<<<', '=======', '>>>>>>>')) for line in text.splitlines()):
        raise ValueError('conflict markers remain')
    return text


def resolve_index():
    paths = git('diff', '--name-only', '--diff-filter=U', '-z').decode().split('\0')[:-1]
    if not paths or not set(paths) <= ALLOWED:
        raise ValueError('unsupported conflict paths; no changes pushed')
    resolved = {}
    for path in paths:
        stages = []
        for n in (1, 2, 3):
            entry = git('ls-files', '--stage', '--', path).decode().splitlines()
            if not any(x.startswith('100644 ') and x.split()[2] == str(n) for x in entry):
                raise ValueError('only regular three-way text conflicts are supported')
            stages.append(git('show', f':{n}:{path}').decode().splitlines(keepends=True))
        result = combine(*stages)
        if path.endswith('.html') and result.count('</html>') != 1:
            raise ValueError('invalid HTML boundary')
        resolved[path] = result
    # Resolve atomically only after every conflicting path is validated. Write blobs
    # directly to the index: never follow a PR-controlled filesystem symlink.
    for path, result in resolved.items():
        blob = subprocess.check_output(['git', 'hash-object', '-w', '--stdin'], input=result.encode()).decode().strip()
        git('update-index', '--cacheinfo', f'100644,{blob},{path}')
    return paths


def dispatch(repo, pr):
    # Dispatch on the repaired branch so run.head_sha identifies exactly what CI tests.
    subprocess.run(['gh', 'workflow', 'run', 'pr-bug-checker.yml', '--repo', repo,
                    '--ref', pr['head']['ref']], check=True)


def scan():
    repo = os.environ['REPOSITORY']
    rows = []
    failed = False
    prs = json.loads(subprocess.check_output(['gh', 'api', '--paginate', '--slurp',
        f'repos/{repo}/pulls?state=open&base=main&per_page=100']))
    for item in [p for page in prs for p in page]:
        number = item['number']
        try:
            pr = api(f'repos/{repo}/pulls/{number}')
            if pr['draft'] or pr['head']['repo']['full_name'] != repo or pr['base']['ref'] != 'main':
                rows.append((number, 'excluded: draft/fork/base'))
                continue
            # Git itself is the source of truth; unknown API mergeability cannot skip repair.
            sha = pr['head']['sha']
            git('fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main', sha)
            git('checkout', '--detach', '--force', sha)
            if git('log', '-1', '--format=%s').decode().strip() == MARKER:
                runs = api(f'repos/{repo}/actions/workflows/pr-bug-checker.yml/runs?head_sha={sha}&per_page=100')
                if not runs['workflow_runs']:
                    dispatch(repo, pr)
                    rows.append((number, 'recovered missing CI dispatch'))
            merged = subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', 'merge',
                                     '--no-ff', '--no-commit', 'origin/main'],
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if merged.returncode == 0:
                rows.append((number, 'no conflict'))
                continue
            try:
                paths = resolve_index()
            except ValueError as exc:
                rows.append((number, 'unsupported: ' + str(exc)))
                continue
            latest = api(f'repos/{repo}/pulls/{number}')
            if latest['state'] != 'open' or latest['head']['sha'] != sha or latest['draft']:
                rows.append((number, 'branch changed; retry next scan'))
                continue
            git('-c', 'user.name=github-actions[bot]', '-c',
                'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', MARKER)
            git('push', 'origin', f'HEAD:refs/heads/{pr["head"]["ref"]}')
            dispatch(repo, pr)
            rows.append((number, 'resolved; fresh CI dispatched: ' + ', '.join(paths)))
        except (subprocess.CalledProcessError, KeyError, UnicodeError) as exc:
            failed = True
            # Do not dump command output, credentials or PR-controlled text into Actions logs.
            rows.append((number, 'FAILED: ' + type(exc).__name__ + '; retry next scan'))
        finally:
            git('reset', '--hard', 'HEAD', check=False)
            git('checkout', '--detach', '--force', 'origin/main', check=False)
    summary = '| PR | Result |\n| --- | --- |\n' + '\n'.join(f'| #{n} | {s} |' for n, s in rows)
    print(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
            f.write('## Conflict resolver\n' + summary + '\n')
    if failed:
        raise SystemExit('Some PR operations failed; see summary. No forced updates were used.')


if __name__ == '__main__':
    scan()
