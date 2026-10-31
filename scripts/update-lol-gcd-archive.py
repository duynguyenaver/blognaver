#!/usr/bin/env python3
"""Index dated Leaguepedia GCD archive *links*, never mirror full wiki pages.
Community archive is NOT an official Riot source. The index is historical only.
Network failures fail closed and preserve the previously reviewed snapshot.
"""
from __future__ import annotations
import argparse
import datetime as dt
import html
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

OUT = pathlib.Path("static/tien-ich/lol-contract-tracker/archive.json")
BASE = "https://lol.fandom.com/wiki/Archive:Global_Contract_Database"
PORTAL = BASE
USER_AGENT = "BlogNaverLoLArchive/1.0 (public historical index; 5 index pages max; no personal data)"
REGIONS = {
    "KR": ("Hàn Quốc", "LCK"),
    "CN": ("Trung Quốc", "LPL"),
    "EMEA": ("EMEA", "LEC/ERL"),
    "AME": ("Châu Mỹ", "LCS/CBLOL"),
    "APAC": ("Châu Á–TBD", "LCP"),
    "VN": ("Việt Nam (lịch sử)", "VCS"),
}
DATE = re.compile(r"\b20\d{2}-\d{2}-\d{2}\b")
MAX_PER_REGION = 36


def index_url(region: str) -> str:
    if region not in REGIONS:
        raise ValueError("Region not recognized")
    return f"{BASE}/{region}"


def history_url(region: str, date: str) -> str:
    if region not in REGIONS or not DATE.fullmatch(date):
        raise ValueError("Invalid region/date")
    dt.date.fromisoformat(date)
    return f"{BASE}/{region}/{date}"


def parse_archive_index(page: str, region: str) -> list[str]:
    """Extract only genuine dated archive page links for the requested region."""
    if region not in REGIONS:
        raise ValueError("Invalid region")
    # Decode percent-encoded wiki titles, not arbitrary calendar strings from ads.
    decoded = urllib.parse.unquote(html.unescape(page).replace("\\/", "/"))
    pattern = re.compile(
        r"Archive:Global_Contract_Database/" + re.escape(region) +
        r"/(20\d{2}-\d{2}-\d{2})(?=[\"'\s<>#?&/]|$)",
        re.IGNORECASE,
    )
    dates = set()
    for match in pattern.finditer(decoded):
        date = match.group(1)
        try:
            dt.date.fromisoformat(date)
        except ValueError:
            continue
        dates.add(date)
    return sorted(dates, reverse=True)[:MAX_PER_REGION]


def empty_archive() -> dict:
    return {
        "version": 1,
        "source": "Leaguepedia/Fandom Global Contract Database Archive",
        "sourceType": "unofficial-community-history",
        "sourceUrl": PORTAL,
        "license": "CC BY-SA 3.0 for wiki content; this index stores only page links/dates",
        "checkedAt": None,
        "regions": [{
            "code": code,
            "name": name,
            "league": league,
            "indexUrl": index_url(code),
            "currentMirrorUrl": index_url(code) + "/Current",
            "dates": [],
            "lastIndexedAt": None,
        } for code, (name, league) in REGIONS.items()],
        "notes": "Archive index and historical dates are third-party pointers, never official contract confirmation.",
    }


def update_index(previous: dict, discovered: dict[str, list[str]], timestamp: str) -> dict | None:
    if not discovered:
        return None
    current = json.loads(json.dumps(previous))
    regions = current.get("regions", [])
    existing = {r.get("code"): r for r in regions if isinstance(r, dict)}
    updated = False
    for code, dates in discovered.items():
        if code not in REGIONS or not dates:
            continue
        record = existing.get(code)
        if not record:
            continue
        # Never erase prior archive references if the wiki omits old links.
        merged = sorted(set(record.get("dates") or []) | set(dates), reverse=True)[:MAX_PER_REGION]
        if merged != record.get("dates", []):
            record["dates"] = merged
            record["lastIndexedAt"] = timestamp
            updated = True
    if not updated:
        return None
    current["checkedAt"] = timestamp
    return current


def robot_allowed():
    robots = urllib.robotparser.RobotFileParser()
    robots.set_url("https://lol.fandom.com/robots.txt")
    robots.read()
    # Be conservative: no attempts at browser impersonation or bypass.
    return robots.can_fetch(USER_AGENT, index_url("KR"))


def download_index(region: str) -> str:
    request = urllib.request.Request(index_url(region),
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read(1_500_001)
        if len(data) > 1_500_000:
            raise ValueError("Archive page above 1.5 MB cap")
        return data.decode("utf-8", "replace")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Probe sources and parse dates; no file writes")
    parser.add_argument("--output", default=str(OUT))
    args = parser.parse_args()
    path = pathlib.Path(args.output)
    previous = json.loads(path.read_text(encoding="utf-8")) if path.exists() else empty_archive()
    try:
        if not robot_allowed():
            print("SKIP: Fandom robots.txt does not permit this crawler; no archive data overwritten.")
            return
    except (OSError, UnicodeError) as error:
        print("SKIP: could not verify robots.txt permissions: " + str(error)[:160])
        return
    found = {}
    for code in REGIONS:
        try:
            dates = parse_archive_index(download_index(code), code)
            if dates:
                found[code] = dates
                print("OK", code, len(dates), "latest", dates[0])
            else:
                print("WARN", code, "no verified dated links; keeping previous data")
        except (urllib.error.URLError, OSError, ValueError) as error:
            print("WARN", code, "unavailable:", str(error)[:140], file=sys.stderr)
        time.sleep(0.6)
    print("CHECK", len(found), "regions", sum(map(len, found.values())), "dated pointers")
    if args.check:
        return
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    updated = update_index(previous, found, now)
    if updated is None:
        print("NO CHANGE: historical index unchanged or inaccessible")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("UPDATED", path, "historical link index only; no wiki content or unofficial contract data copied")


if __name__ == "__main__":
    main()
