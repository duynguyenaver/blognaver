#!/usr/bin/env python3
"""Sync official Riot LoL GCD public tab CSVs into a static BlogNaver snapshot.
Read-only HTTP requests; never invent players/expiry dates or upload sensitive data.
The scheduled Action creates a Pull Request, NEVER commits data to main.
"""
from __future__ import annotations
import argparse
import csv
import datetime as dt
import html
from html.parser import HTMLParser
import io
import json
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SHEET_ID = "1Y7k5kQ2AegbuyiGwEPsa62e883FYVtHqr6UVut9RC4o"
BASE = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
PUBLIC_URL = BASE + "/pubhtml"
OUTPUT = pathlib.Path("static/tien-ich/lol-contract-tracker/gcd.json")
USER_AGENT = "Mozilla/5.0 (compatible; BlogNaver-Contract-Index/1.0; read-only)"
# Confirmed tab pointers discovered from published community links.
# Labels from the actual HTML tab menu override these fallback guesses.
KNOWN_GIDS = {"940656680": "LCK", "594163931": "LPL"}
REGIONS = ("LCK", "LPL", "LEC", "LCS", "CBLOL", "LCP", "OTHER")


def get(url: str) -> str:
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT, "Accept": "text/csv,text/html,*/*"
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError("Google Sheet response exceeds 8 MB limit")
        return data.decode("utf-8-sig", errors="replace")


def league_from_label(label: str) -> str:
    s = label.casefold().strip()
    if re.search(r"\b(korea|lck|kr)\b|한국", s): return "LCK"
    if re.search(r"\b(china|lpl|cn)\b|中国|中國|中国", s): return "LPL"
    if re.search(r"\b(emea|lec|europe)\b", s): return "LEC"
    if re.search(r"\b(americas|america|lcs|north america|na)\b", s): return "LCS"
    if re.search(r"\b(brazil|cblol|br)\b", s): return "CBLOL"
    if re.search(r"\b(pacific|apac|lcp|asia)\b", s): return "LCP"
    return "OTHER"


class SheetLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag != "a": return
        href = dict(attrs).get("href", "")
        match = re.search(r"(?:#|[?&])gid=(\d+)", href)
        if match: self.current = [match.group(1), ""]

    def handle_data(self, data):
        if self.current: self.current[1] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.current:
            self.links.append(tuple(self.current))
            self.current = None


def discover_tabs(page: str):
    parser = SheetLinks()
    parser.feed(page)
    links = parser.links
    # Some published Google Sheets list menu labels in JavaScript rather than anchors.
    if not links:
        for m in re.finditer(r"(?:gid=|\\\"gid\\\"\s*:\s*\\\")(\d{5,12})", page):
            links.append((m.group(1), ""))
    tabs = {}
    for gid, name in links:
        if gid not in tabs:
            region = league_from_label(html.unescape(name))
            tabs[gid] = region if region != "OTHER" else KNOWN_GIDS.get(gid, "OTHER")
    # Fallback two published, independently linked GIDs. No guessing about additional IDs.
    for gid, region in KNOWN_GIDS.items(): tabs.setdefault(gid, region)
    return tabs


def normal(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).casefold())


def locate_header(rows):
    synonyms = {
        "handle": ("ingamename", "summonername", "playername", "playerid", "handle", "ign", "nickname", "gamename"),
        "team": ("teamname", "team", "organization"),
        "endDate": ("contractenddate", "contractexpirydate", "contractexpiration", "expirationdate", "expirydate", "enddate", "contractend"),
        "legalName": ("realname", "legalname", "fullname"),
        "position": ("position", "lane", "role"),
    }
    for idx, line in enumerate(rows[:24]):
        labels = [normal(x) for x in line]
        cols = {}
        for key, words in synonyms.items():
            cols[key] = next((i for i, h in enumerate(labels) if any(w == h or w in h for w in words)), -1)
        if all(cols[x] >= 0 for x in ("handle", "team", "endDate")):
            return idx, cols
    raise ValueError("Missing GCD player/team/contract-end header")


def parse_date(value: str) -> str:
    v = value.strip()
    if not v or v.casefold() in ("n/a", "tbd", "-", "unknown"): return ""
    formats = ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y",
               "%B %d, %Y", "%d %B %Y", "%d.%m.%Y", "%Y/%m/%d")
    for fmt in formats:
        try:
            date = dt.datetime.strptime(v, fmt).date()
            if 2000 <= date.year <= 2100: return date.isoformat()
        except ValueError:
            continue
    return ""


def rows_from_csv(text: str, region: str, source: str):
    rows = list(csv.reader(io.StringIO(text)))
    header, cols = locate_header(rows)
    found = {}
    for line in rows[header + 1:]:
        def cell(key):
            i = cols[key]
            return line[i].strip() if i >= 0 and i < len(line) else ""
        handle, team = cell("handle"), cell("team")
        if not handle or not team or len(handle) > 120 or len(team) > 150: continue
        if normal(handle) in ("player", "name", "total", "notes", "lastupdated"): continue
        key = "|".join((region, handle.casefold(), team.casefold()))
        found[key] = {"id": key, "league": region, "team": team,
                      "handle": handle, "legalName": cell("legalName"),
                      "position": cell("position"), "endDate": parse_date(cell("endDate")),
                      "sourceUrl": source}
    return list(found.values())


def fetch_tab(gid: str, region: str):
    source = PUBLIC_URL + "#gid=" + gid
    attempts = (
        BASE + "/pub?gid=" + gid + "&single=true&output=csv",
        BASE + "/gviz/tq?tqx=out%3Acsv&gid=" + gid,
        BASE + "/export?format=csv&gid=" + gid
    )
    failures = []
    for endpoint in attempts:
        try:
            text = get(endpoint)
            if "<html" in text[:300].casefold() or "<!doctype" in text[:300].casefold():
                raise ValueError("HTML returned instead of CSV")
            parsed = rows_from_csv(text, region, source)
            if len(parsed) < 5: raise ValueError("Too few valid records: " + str(len(parsed)))
            return parsed
        except (OSError, ValueError, csv.Error) as exc:
            failures.append(type(exc).__name__ + ": " + str(exc)[:140])
    raise RuntimeError("All Riot CSV endpoints failed for gid=" + gid + ": " + "; ".join(failures))


def compare(old_rows, current_rows, now):
    # Compare within league; GCD removals may be clerical and never prove free agency.
    def keys(rows):
        result = {}
        for row in rows:
            key = row["league"] + "|" + row["handle"].casefold()
            # A duplicate same-name entry is ambiguous: do not infer a transfer.
            if key in result: result[key] = None
            else: result[key] = row
        return result
    previous, present = keys(old_rows), keys(current_rows)
    changes = []
    for key in sorted(set(previous) | set(present)):
        a, b = previous.get(key), present.get(key)
        if a is None or b is None:
            if a is None and key in previous or b is None and key in present: continue
            row = a or b
            if not row: continue
            changes.append({"type": "added" if b else "removed", "handle": row["handle"],
                            "team": row["team"], "before": a["team"] if a else "",
                            "after": b["team"] if b else "", "detectedAt": now})
        elif a["team"] != b["team"]:
            changes.append({"type": "team", "handle": b["handle"], "team": b["team"],
                            "before": a["team"], "after": b["team"], "detectedAt": now})
        elif a.get("endDate") != b.get("endDate"):
            changes.append({"type": "end_date", "handle": b["handle"], "team": b["team"],
                            "before": a.get("endDate", ""), "after": b.get("endDate", ""), "detectedAt": now})
    return changes


def build_snapshot(previous, collected, metadata, today):
    if not collected:
        raise ValueError("Zero GCD records; refusing to publish an empty snapshot")
    current = sorted(collected, key=lambda x:(x["league"], x["team"].casefold(), x["handle"].casefold()))
    old = previous.get("rows") or []
    # Do not generate PRs solely because a daily fetch was attempted.
    def comparable(items):
        return [{k: v for k,v in row.items() if k != "sourceUpdatedAt"} for row in items]
    if comparable(old) == comparable(current):
        return None
    if old:
        old_regions = {row["league"] for row in old}
        new_regions = {row["league"] for row in current}
        missing = old_regions - new_regions
        if missing:
            raise ValueError("Some previously indexed leagues vanished: " + ", ".join(sorted(missing)))
        if len(current) < .70 * len(old):
            raise ValueError("More than 30% of registrations vanished; suspect parse error")
    delta = compare(old, current, today) if old else []
    known = previous.get("changes") or []
    return {
        "version": 1, "source": "Riot Games LoL Esports League-Recognized Global Contract Database",
        "sourceUrl": PUBLIC_URL, "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "regions": metadata, "rows": current,
        "changes": (delta + known)[:100],
        "notice": "GCD is a registered contract list, not proof of a completed transfer or free agency."
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check public availability and report without writing")
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()
    previous_file = pathlib.Path(args.output)
    previous = json.loads(previous_file.read_text(encoding="utf-8")) if previous_file.exists() else {"rows": [], "changes": []}
    tabs = discover_tabs(get(PUBLIC_URL))
    all_rows, metadata, issues = [], [], []
    # Deduplicate a league if Google advertises separate informational tabs with similar names.
    found_regions = set()
    for gid, region in tabs.items():
        if region not in REGIONS or region == "OTHER" or region in found_regions:
            continue
        try:
            records = fetch_tab(gid, region)
            found_regions.add(region)
            all_rows.extend(records)
            metadata.append({"league": region, "gid": gid, "count": len(records), "url": PUBLIC_URL+"#gid="+gid})
            print("OK", region, gid, len(records))
        except RuntimeError as exc:
            issues.append(str(exc))
            print("WARN", region, gid, str(exc)[:300], file=sys.stderr)
    if not all_rows:
        raise RuntimeError("No official contracts collected. " + " | ".join(issues))
    if args.check:
        print("CHECK", len(all_rows), "rows", len(metadata), "regions; no file changed.")
        return
    now = dt.datetime.now(dt.timezone.utc).date().isoformat()
    updated = build_snapshot(previous, all_rows, metadata, now)
    if updated is None:
        print("NO CHANGE: GCD matches last snapshot; no new PR required.")
        return
    previous_file.parent.mkdir(parents=True, exist_ok=True)
    previous_file.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("UPDATED", previous_file, len(updated["rows"]), "rows", len(updated["changes"]), "recent deltas")


if __name__ == "__main__":
    main()
