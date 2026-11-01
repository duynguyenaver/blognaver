#!/usr/bin/env python3
"""Finance Conflict Resolver: safe, whole-ciphertext PR reconciliation.

Designed for a PUBLIC repository containing encrypted (never plaintext) finance
snapshots. Never merge AES-GCM fields or force-push main. All PR writes are
restricted to owner-owned, single-file finance data branches.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REPO = os.environ.get("REPO", "duynguyenaver/blognaver")
OWNER = REPO.split("/", 1)[0]
PATH = "static/tien-ich/chi-phi-thang/data.enc.json"
TITLE = "data(finance): encrypted Google Sheets snapshot"
BRANCH = re.compile(r"^data/chi-phi-thang-[0-9]+(?:-[0-9]+)*$")


class FinanceError(Exception):
    pass


def command(*argv, allow_failure=False):
    proc = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode and not allow_failure:
        raise FinanceError(f"{argv[0]} command failed (code {proc.returncode}); did not force changes")
    return proc


def output(*argv):
    return command(*argv).stdout.strip()


def api(path):
    return json.loads(output("gh", "api", path))


def paginated(path):
    result = json.loads(output("gh", "api", "--paginate", "--slurp", path))
    return [item for page in result for item in page]


def validate(raw):
    try:
        obj = json.loads(raw)
        expected = {"version", "algorithm", "kdf", "iterations", "salt", "nonce", "ciphertext", "sourceHash", "updatedAt"}
        if not isinstance(obj, dict) or set(obj) != expected:
            raise ValueError("unexpected snapshot schema")
        if obj["version"] != 1 or obj["algorithm"] != "AES-256-GCM":
            raise ValueError("unsupported snapshot encryption")
        if obj["kdf"] != "PBKDF2-SHA256" or obj["iterations"] != 310000:
            raise ValueError("unsupported key derivation")
        if not re.fullmatch(r"[a-f0-9]{64}", obj["sourceHash"]):
            raise ValueError("invalid source fingerprint")
        if len(base64.b64decode(obj["salt"], validate=True)) != 16:
            raise ValueError("invalid salt")
        if len(base64.b64decode(obj["nonce"], validate=True)) != 12:
            raise ValueError("invalid nonce")
        if len(base64.b64decode(obj["ciphertext"], validate=True)) < 16:
            raise ValueError("invalid ciphertext")
        stamp = datetime.fromisoformat(obj["updatedAt"].replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            raise ValueError("missing timestamp time zone")
        obj["_time"] = stamp.astimezone(timezone.utc)
        return obj
    except (TypeError, ValueError, KeyError, base64.binascii.Error) as err:
        raise FinanceError("Encrypted snapshot failed metadata validation") from err


def decision(main, candidate, conflict=False):
    """Do not use different ciphertext bytes as evidence of new data."""
    if main is None:
        return "publish"
    if main["sourceHash"] == candidate["sourceHash"]:
        return "duplicate"
    if candidate["_time"] <= main["_time"]:
        return "stale"  # Cannot safely prove different content is newer.
    return "replace" if conflict else "publish"


def fetch_main():
    command("git", "fetch", "--no-tags", "origin",
            "+refs/heads/main:refs/remotes/origin/main")
    raw = command("git", "show", f"origin/main:{PATH}", allow_failure=True)
    return validate(raw.stdout) if raw.returncode == 0 else None


def fetch_head(ref):
    if not BRANCH.fullmatch(ref):
        raise FinanceError("Unexpected finance branch name")
    command("git", "fetch", "--no-tags", "origin",
            "+refs/heads/" + ref + ":refs/remotes/origin/" + ref)
    raw = command("git", "show", f"refs/remotes/origin/{ref}:{PATH}", allow_failure=True)
    return validate(raw.stdout) if raw.returncode == 0 else None


def clean_eligibility(pr):
    if pr.get("title") != TITLE or pr.get("base", {}).get("ref") != "main":
        return False
    head = pr.get("head") or {}
    if not BRANCH.fullmatch(head.get("ref") or ""):
        return False
    if (head.get("repo") or {}).get("full_name") != REPO:
        return False
    if (pr.get("user") or {}).get("login") != OWNER:
        return False
    return True


def safe_pr(pr):
    if not clean_eligibility(pr):
        return False
    number = pr["number"]
    files = paginated(f"repos/{REPO}/pulls/{number}/files?per_page=100")
    return len(files) == 1 and files[0].get("filename") == PATH and files[0].get("status") in ("added", "modified")


def open_finance_prs():
    result = []
    for pr in paginated(f"repos/{REPO}/pulls?state=open&base=main&per_page=100"):
        if clean_eligibility(pr):
            if not safe_pr(pr):
                print(f"Finance PR #{pr['number']} has unsafe file changes; manual review required")
                continue
            result.append(pr)
    return result


def conflict_with_main(ref):
    result = command("git", "merge-tree", "--write-tree",
                     "origin/main", "refs/remotes/origin/" + ref,
                     allow_failure=True)
    if result.returncode == 0:
        return False
    if result.returncode == 1:
        return True
    raise FinanceError("Cannot determine Git mergeability; no snapshot was replaced")


def owner_check():
    actor = output("gh", "api", "user", "--jq", ".login")
    if actor != OWNER:
        raise FinanceError("Only the repository owner token may change finance PRs")


def close_pr(pr, reason):
    number = pr["number"]
    # Re-read PR to avoid closing a newly merged or externally changed PR.
    latest = api(f"repos/{REPO}/pulls/{number}")
    if latest.get("state") != "open" or latest.get("head", {}).get("sha") != pr["head"]["sha"]:
        print(f"PR #{number} changed, skipped")
        return
    command("gh", "pr", "close", str(number), "-R", REPO, "--comment", reason)
    print(f"Closed finance PR #{number}: {reason}")


def create_pr(snapshot_raw, run_id):
    candidate = validate(snapshot_raw)
    latest = fetch_main()
    if decision(latest, candidate) != "publish":
        print("Main already has the same or a newer snapshot; no new PR.")
        return False

    branch = f"data/chi-phi-thang-{run_id}"
    if not BRANCH.fullmatch(branch):
        raise FinanceError("Invalid run identifier")
    # Preserve the generated ciphertext in memory while moving onto latest main.
    command("git", "reset", "--hard", "HEAD")
    command("git", "clean", "-f", "--", PATH)
    command("git", "config", "user.name", OWNER)
    command("git", "config", "user.email", OWNER + "@users.noreply.github.com")
    command("gh", "auth", "setup-git")
    command("git", "switch", "-c", branch, "origin/main")
    dest = Path(PATH)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(snapshot_raw, encoding="utf-8")
    command("git", "add", "--", PATH)
    if output("git", "diff", "--cached", "--name-only") != PATH:
        raise FinanceError("Unexpected staged files: refusing finance PR")
    command("git", "commit", "-m", "data(finance): sync encrypted Google Sheets snapshot")
    command("git", "push", "--set-upstream", "origin", branch)
    created = output("gh", "pr", "create", "-R", REPO, "--base", "main",
                     "--head", branch, "--title", TITLE,
                     "--body", "Owner-authorized encrypted snapshot only. AES-GCM ciphertext is indivisible. Automatically regenerated from a fresh main branch.")
    match = re.search(r"/pull/(\d+)", created)
    if not match:
        raise FinanceError("PR creation response unexpected; inspect branch/PR manually")
    number = match.group(1)
    print(f"Finance encrypted snapshot proposed as PR #{number}")
    auto = command("gh", "pr", "merge", "-R", REPO, "--auto", "--squash", number, allow_failure=True)
    if auto.returncode:
        print(f"Auto merge for PR #{number} deferred to repository CI/approval workflow.")
    return True


def publish(run_id):
    local = Path(PATH)
    if not local.is_file():
        raise FinanceError("No encrypted snapshot generated by sync pipeline")
    raw = local.read_text("utf-8")
    candidate = validate(raw)
    main = fetch_main()
    existing = open_finance_prs()

    if decision(main, candidate) == "duplicate":
        print("Finance sourceHash already on main; no new PR despite random AES salt/nonce.")
        for pr in existing:
            try:
                old = fetch_head(pr["head"]["ref"])
                if old and old["sourceHash"] == candidate["sourceHash"]:
                    close_pr(pr, "Duplicate encrypted snapshot; main already contains this sourceHash.")
            except FinanceError as err:
                print(f"Skipped PR #{pr['number']}: {err}")
        return
    if decision(main, candidate) == "stale":
        print("Latest main snapshot is newer than generated snapshot; leave main untouched.")
        return

    for pr in existing:
        old = fetch_head(pr["head"]["ref"])
        if old and old["sourceHash"] == candidate["sourceHash"] and not conflict_with_main(pr["head"]["ref"]):
            print(f"Same sourceHash already pending in mergeable PR #{pr['number']}; no duplicate PR.")
            return

    # Latest plaintext is obtained only in memory by sync-monthly-expenses.py.
    # Rebuild the entire ciphertext file from current main, never 3-way merge it.
    if create_pr(raw, run_id):
        for pr in existing:
            try:
                close_pr(pr, "Replaced by a fresh encrypted snapshot PR based on latest main (avoids ciphertext conflicts).")
            except FinanceError as err:
                print(f"Unable to close old finance PR #{pr['number']}: {err}")


def repair(run_id):
    main = fetch_main()
    existing = open_finance_prs()
    replaced = False
    for pr in existing:
        try:
            ref = pr["head"]["ref"]
            head = fetch_head(ref)
            if head is None:
                print(f"PR #{pr['number']}: missing data file; manual review")
                continue
            action = decision(main, head, conflict_with_main(ref))
            if action == "duplicate":
                close_pr(pr, "Duplicate of encrypted data already on main; different AES-GCM salts are expected.")
            elif action == "stale":
                close_pr(pr, "Main contains a later financial snapshot. Preserve newer main without merging ciphertext.")
            elif action == "replace":
                if replaced:
                    print("One replacement PR already proposed this run; will re-check next run.")
                    continue
                # Construct replacement from the entire checked head ciphertext.
                raw = command("git", "show", "refs/remotes/origin/" + ref + ":" + PATH).stdout
                if create_pr(raw, run_id + "-" + str(pr["number"])):
                    close_pr(pr, "Conflict repaired by a new PR with the complete ciphertext based on latest main.")
                    replaced = True
            else:
                print(f"PR #{pr['number']}: mergeable, retains its CI/auto-merge path.")
        except FinanceError as err:
            print(f"PR #{pr['number']}: safe resolver deferred ({err})")
    if not existing:
        print("No pending finance PRs need reconciliation.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("publish", "repair"))
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9]+", os.getenv("RUN_ID", "")):
        raise FinanceError("Missing valid RUN_ID")
    owner_check()
    run_id = os.environ["RUN_ID"] + "-" + os.environ.get("RUN_ATTEMPT", "1")
    if args.mode == "publish":
        publish(run_id)
    else:
        repair(run_id)


if __name__ == "__main__":
    try:
        main()
    except FinanceError as err:
        print("::error::Finance Conflict Resolver: " + str(err), file=sys.stderr)
        sys.exit(1)
