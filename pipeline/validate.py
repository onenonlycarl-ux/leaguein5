#!/usr/bin/env python3
"""Check stories.json before it goes live.

Usage: python3 pipeline/validate.py [path/to/stories.json]
Exits non-zero and lists every problem if the edition is not ready to publish.
"""
import json
import re
import sys
from datetime import date

PATH = sys.argv[1] if len(sys.argv) > 1 else "stories.json"

DIVISIONS = {
    "AFC East": ["BUF", "MIA", "NE", "NYJ"],
    "AFC North": ["BAL", "CIN", "CLE", "PIT"],
    "AFC South": ["HOU", "IND", "JAX", "TEN"],
    "AFC West": ["DEN", "KC", "LV", "LAC"],
    "NFC East": ["DAL", "NYG", "PHI", "WAS"],
    "NFC North": ["CHI", "DET", "GB", "MIN"],
    "NFC South": ["ATL", "CAR", "NO", "TB"],
    "NFC West": ["ARI", "LAR", "SF", "SEA"],
}
CATS = ["Biggest Story", "Injury Report", "Player Spotlight", "Stat of the Day", "What's Next"]
BANNED = ["crucial", "pivotal", "testament", "showcase", "leverage"]

problems = []


def text_fields(obj, where):
    """Yield every human-readable string with its location."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("url", "abbr", "conf", "cat", "date"):
                continue
            yield from text_fields(v, f"{where}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from text_fields(v, f"{where}[{i}]")
    elif isinstance(obj, str):
        yield where, obj


def check_source(src, where):
    if not isinstance(src, dict) or not src.get("name"):
        problems.append(f"{where}: missing source name")
        return
    if not re.match(r"^https?://", src.get("url", "")):
        problems.append(f"{where}: source needs a full https link")


try:
    data = json.load(open(PATH, encoding="utf-8"))
except Exception as e:  # noqa: BLE001
    print(f"FAIL: cannot read {PATH}: {e}")
    sys.exit(1)

if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(data.get("date", ""))):
    problems.append("date must look like 2026-10-15")
elif data["date"] != date.today().isoformat():
    problems.append(f"date is {data['date']}, today is {date.today().isoformat()}")
if not data.get("week"):
    problems.append("week label missing (e.g. 'Week 6')")
if len(str(data.get("intro", ""))) < 80:
    problems.append("intro is missing or too short")

top = data.get("top", [])
if len(top) != 4:
    problems.append(f"top should have 4 stories, has {len(top)}")
for i, s in enumerate(top):
    for f in ("label", "headline", "dek"):
        if not s.get(f):
            problems.append(f"top[{i}] missing {f}")
    check_source(s.get("source"), f"top[{i}]")

divs = data.get("divisions", [])
names = [d.get("name") for d in divs]
if names != list(DIVISIONS):
    problems.append(f"divisions must be in this order: {list(DIVISIONS)}; got {names}")
for d in divs:
    want = DIVISIONS.get(d.get("name"), [])
    got = [t.get("abbr") for t in d.get("teams", [])]
    if got != want:
        problems.append(f"{d.get('name')}: teams should be {want}, got {got}")
    conf = "American Football Conference" if d.get("name", "").startswith("AFC") else "National Football Conference"
    if str(d.get("conf", "")).lower() != conf.lower():
        problems.append(f"{d.get('name')}: conf should be '{conf}'")
    for t in d.get("teams", []):
        ab = t.get("abbr")
        for f in ("name", "record", "headline"):
            if not t.get(f):
                problems.append(f"{ab}: missing {f}")
        if t.get("record") and not re.match(r"^\d{1,2}-\d{1,2}(-\d)?$", t["record"]):
            problems.append(f"{ab}: record '{t['record']}' should look like 4-1")
        stories = t.get("stories", [])
        cats = [s.get("cat") for s in stories]
        if cats != CATS:
            problems.append(f"{ab}: stories must be exactly {CATS}, got {cats}")
        for i, s in enumerate(stories):
            if not s.get("text") or not s.get("summary"):
                problems.append(f"{ab} story {i+1}: needs text and summary")
            elif len(s["summary"]) < 60:
                problems.append(f"{ab} story {i+1}: summary too thin")
            check_source(s.get("source"), f"{ab} story {i+1}")

for where, s in text_fields(data, "edition"):
    if "—" in s or "–" in s:
        problems.append(f"{where}: contains an em/en dash: {s[:70]}")
    for w in BANNED:
        if re.search(rf"\b{w}\w*", s, re.I):
            problems.append(f"{where}: banned word '{w}': {s[:70]}")

total = sum(len(t.get("stories", [])) for d in divs for t in d.get("teams", []))
if problems:
    print(f"FAIL: {len(problems)} problem(s)")
    for p in problems:
        print(" -", p)
    sys.exit(1)
print(f"OK: {data['date']} · {data['week']} · {total} stories across {sum(len(d['teams']) for d in divs)} teams")
