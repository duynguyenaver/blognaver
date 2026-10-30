#!/usr/bin/env python3
"""Safely combine insertion-only changes to layouts/baseof.html.

Reads Git merge stages 1=base, 2=PR head, 3=main. Rejects deletions,
replacements, or other ambiguous edits. Never executes PR-provided code.
"""
import difflib
import subprocess
import sys
from pathlib import Path

PATH = "layouts/baseof.html"

def stage(number):
    return subprocess.check_output(["git", "show", f":{number}:{PATH}"], text=True).splitlines(keepends=True)

def additions(base, variant):
    matcher = difflib.SequenceMatcher(a=base, b=variant, autojunk=False)
    patches = {}
    for tag, i, j, k, l in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag != "insert" or i != j:
            raise ValueError(f"Unsafe {tag} in {PATH} at {i}:{j}")
        patches.setdefault(i, []).extend(variant[k:l])
    return patches

def main():
    base, ours, theirs = stage(1), stage(2), stage(3)
    own_add = additions(base, ours)
    main_add = additions(base, theirs)
    result = []
    for i in range(len(base) + 1):
        current = main_add.get(i, [])
        incoming = own_add.get(i, [])
        result.extend(current)
        if incoming and incoming != current:
            result.extend(incoming)
        if i < len(base):
            result.append(base[i])
    text = "".join(result)
    if any(token in text for token in ("<<<<<<<", "=======", ">>>>>>>")):
        raise ValueError("Conflict markers found")
    if not text.count("</html>") == 1:
        raise ValueError("Invalid HTML document boundary")
    Path(PATH).write_text(text)
    subprocess.check_call(["git", "add", "--", PATH])
    print(f"Resolved additive-only {PATH}; retained head and main insertions")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"Unsafe conflict; leaving PR unmerged: {exc}", file=sys.stderr)
        sys.exit(1)
