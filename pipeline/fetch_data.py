#!/usr/bin/env python3
"""Refresh data/standings.json and data/schedules.json from ESPN's public NFL feed.

Runs on GitHub Actions (see .github/workflows/refresh-data.yml). No AI involved.
The script refuses to write anything unless the numbers pass its own checks:
32 teams, sane records, and each team's completed games match its win-loss record.

Usage: python3 pipeline/fetch_data.py [season]
"""
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")
SEASON = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
BASE = "https://site.api.espn.com/apis"
ABBR_FIX = {"WSH": "WAS", "JAC": "JAX", "LA": "LAR"}  # ESPN spelling -> ours
TEAMS = ("BUF MIA NE NYJ BAL CIN CLE PIT HOU IND JAX TEN DEN KC LV LAC "
         "DAL NYG PHI WAS CHI DET GB MIN ATL CAR NO TB ARI LAR SF SEA").split()
ESPN_SLUG = {"WAS": "wsh", "JAX": "jax", "LAR": "lar"}  # team-endpoint spelling


def get(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "leaguein5-data/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (attempt + 1))
    raise SystemExit(f"FAIL: could not fetch {url}: {last}")


def fix(abbr):
    return ABBR_FIX.get(abbr, abbr)


def stat(entry, name, default=None):
    for s in entry.get("stats", []):
        if s.get("name") == name:
            return s.get("value"), s.get("displayValue")
    return default, default


def build_standings():
    data = get(f"{BASE}/v2/sports/football/nfl/standings?season={SEASON}")
    teams = {}
    for conf in data.get("children", []):
        for e in conf.get("standings", {}).get("entries", []):
            ab = fix(e["team"]["abbreviation"])
            w, _ = stat(e, "wins", 0)
            l, _ = stat(e, "losses", 0)
            t, _ = stat(e, "ties", 0)
            pf, _ = stat(e, "pointsFor", 0)
            pa, _ = stat(e, "pointsAgainst", 0)
            seed, _ = stat(e, "playoffSeed", None)
            _, streak = stat(e, "streak", "")
            teams[ab] = {
                "w": int(w or 0), "l": int(l or 0), "t": int(t or 0),
                "pf": int(pf or 0), "pa": int(pa or 0),
                "seed": int(seed) if seed else None,
                "streak": streak or "",
            }
    return teams


def build_schedule(abbr):
    slug = ESPN_SLUG.get(abbr, abbr.lower())
    data = get(f"{BASE}/site/v2/sports/football/nfl/teams/{slug}/schedule?season={SEASON}&seasontype=2")
    games = []
    for ev in data.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        me = opp = None
        for c in comp.get("competitors", []):
            ab = fix(c.get("team", {}).get("abbreviation", ""))
            if ab == abbr:
                me = c
            else:
                opp = c
        if not me or not opp:
            continue
        done = bool(comp.get("status", {}).get("type", {}).get("completed"))
        game = {
            "week": ev.get("week", {}).get("number"),
            "date": ev.get("date"),
            "opp": fix(opp["team"]["abbreviation"]),
            "home": me.get("homeAway") == "home",
            "network": ((comp.get("broadcasts") or [{}])[0].get("media", {}) or {}).get("shortName", ""),
            "done": done,
        }
        if done:
            ms = int(float((me.get("score") or {}).get("value", 0)))
            os_ = int(float((opp.get("score") or {}).get("value", 0)))
            game["us"], game["them"] = ms, os_
            game["result"] = "W" if ms > os_ else "L" if ms < os_ else "T"
        games.append(game)
    games.sort(key=lambda g: g["week"] or 0)
    weeks = {g["week"] for g in games}
    season_weeks = max(weeks) if weeks else 18
    bye = [w for w in range(1, season_weeks + 1) if w not in weeks]
    return games, bye


def main():
    standings = build_standings()
    problems = []
    if sorted(standings) != sorted(TEAMS):
        problems.append(f"standings teams mismatch: missing {sorted(set(TEAMS) - set(standings))}")
    schedules = {}
    for ab in TEAMS:
        games, bye = build_schedule(ab)
        schedules[ab] = {"bye": bye, "games": games}
        s = standings.get(ab)
        if not s:
            continue
        played = sum(1 for g in games if g["done"])
        record_games = s["w"] + s["l"] + s["t"]
        if played != record_games:
            problems.append(f"{ab}: schedule shows {played} games played, standings say {record_games}")
        wins = sum(1 for g in games if g.get("result") == "W")
        if wins != s["w"]:
            problems.append(f"{ab}: schedule shows {wins} wins, standings say {s['w']}")
        if len(games) < 16:
            problems.append(f"{ab}: only {len(games)} games on the schedule")
        if record_games > 18:
            problems.append(f"{ab}: {record_games} games played is impossible")
    if problems:
        print(f"FAIL: {len(problems)} problem(s), nothing written")
        for p in problems:
            print(" -", p)
        sys.exit(1)

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(OUT, exist_ok=True)
    for name, payload in (("standings", {"teams": standings}), ("schedules", {"teams": schedules})):
        path = os.path.join(OUT, f"{name}.json")
        new = {"season": SEASON, **payload}
        # Keep the old file (and its timestamp) when nothing changed, so no empty commits.
        try:
            old = json.load(open(path, encoding="utf-8"))
            if {k: v for k, v in old.items() if k != "updated"} == new:
                continue
        except Exception:  # noqa: BLE001
            pass
        new["updated"] = stamp
        with open(path, "w", encoding="utf-8") as f:
            json.dump(new, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
    print(f"OK: standings and schedules for {len(TEAMS)} teams, season {SEASON}")


if __name__ == "__main__":
    main()
