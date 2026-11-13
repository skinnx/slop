#!/usr/bin/env python3
"""Tạo lại 02-balance.md từ 02-balance.template.md + JSON + mô hình.
Chạy trong docs/design/tools: python3 fill_balance.py"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "..", "data")
sys.path.insert(0, HERE)
tab = subprocess.run([sys.executable, os.path.join(HERE, "gen_tables.py"), D], capture_output=True, text=True, check=True).stdout
parts = {}
for chunk in tab.split("\n### "):
    chunk = chunk.lstrip("# ").strip()
    name, _, body = chunk.partition("\n")
    parts[name.strip()] = body.strip()
dg = json.load(open(os.path.join(D, "dungeon.json"), encoding="utf-8"))
rows = ["| Chặng | Tên | Tầng | CP đề nghị | Lần đầu | Đánh lại |", "|---|---|---|---|---|---|"]
for s in dg["stages"]:
    fc = s["firstClear"]; rc = s["repeatClear"]
    rows.append(f"| {s['stage']} | {s['name']} | {s['firstFloor']}–{s['bossFloor']} | {s['recommendedCp']} | {fc['gold']} vàng, {fc['coral']} San Hô, {fc['tickets']} Vé | {rc['gold']} vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |")
parts["stages"] = "\n".join(rows)
sys.argv = ["check.py", D, "--quiet"]
import check
log, ms, stats = check.run(1)
rows = ["| Phút | Cấp NC | CP | Hero có | Ô đội | Cấp hero trong đội | Nấc | Chặng | Công trình (cấp) | Tuyển |", "|---|---|---|---|---|---|---|---|---|---|"]
short = {"storage": "Kho", "lumber_camp": "Gỗ", "tavern": "Quán", "ore_mine": "Mỏ", "training_yard": "Tập", "market": "Chợ", "dungeon_gate": "Cổng"}
for r in log:
    b = " ".join(f"{short[k]}{v}" for k, v in r["buildings"].items())
    rows.append(f"| {r['min']} | {r['plevel']} | {r['cp']} | {r['owned']} | {r['slots']} | {', '.join(map(str, r['lv']))} | {r['nodes']} | {r['stage']} | {b} | {r['draws']} |")
parts["model"] = "\n".join(rows)
t = open(os.path.join(HERE, "02-balance.template.md"), encoding="utf-8").read()
for k, v in parts.items():
    t = t.replace("{{" + k + "}}", v)
left = re.findall(r"\{\{[^}]+\}\}", t)
if left: raise SystemExit("placeholder chưa điền: %s" % left)
open(os.path.join(HERE, "..", "02-balance.md"), "w", encoding="utf-8").write(t)
print("02-balance.md ok")
