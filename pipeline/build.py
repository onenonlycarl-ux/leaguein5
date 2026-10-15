#!/usr/bin/env python3
"""Assemble stories.json from pipeline/work/*.json.

Needs pipeline/work/edition.json ({"date","week","intro","top"}) plus the eight
division files. Writes stories.json at the repo root.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
ROOT = os.path.dirname(HERE)
ORDER = ["afc-east", "afc-north", "afc-south", "afc-west",
         "nfc-east", "nfc-north", "nfc-south", "nfc-west"]

edition = json.load(open(os.path.join(WORK, "edition.json"), encoding="utf-8"))
edition["divisions"] = [
    json.load(open(os.path.join(WORK, f"{slug}.json"), encoding="utf-8")) for slug in ORDER
]
with open(os.path.join(ROOT, "stories.json"), "w", encoding="utf-8") as f:
    json.dump(edition, f, ensure_ascii=False, indent=1)
    f.write("\n")
print("Wrote stories.json")
