#!/usr/bin/env python3
"""In bảng markdown từ JSON trong data/ (dùng để cập nhật 02-balance.md). Chạy: python3 gen_tables.py ../data"""
import json, os, sys
D = sys.argv[1] if len(sys.argv) > 1 else "../data"
J = lambda n: json.load(open(os.path.join(D, n), encoding="utf-8"))
RN = {"N": "Thường", "R": "Hiếm", "E": "Sử Thi", "L": "Huyền Thoại"}
AT = {"STR": "Sức Mạnh", "AGI": "Nhanh Nhẹn", "INT": "Trí Tuệ"}
def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows: out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)
sk = {s["id"]: s for s in J("skills.json")["skills"]}
H = J("heroes.json")["heroes"]
print("### heroes\n")
print(table(["id", "Tên", "Hệ", "Hiếm", "Vai", "HP", "ATK", "Nhịp (s)", "Tầm", "Thu", "Kỹ năng", "CP cấp 1"],
  [[h["id"], h["name"], AT[h["attribute"]], RN[h["rarity"]], h["role"], h["baseHp"], h["baseAtk"], h["attackInterval"], h["attackRange"], h["gatherPower"],
    " / ".join(sk[s]["name"] for s in h["skills"]),
    round(4 * h["baseAtk"] / h["attackInterval"] * (1 + {"strike": .1, "cleave": .15, "nova": .15, "volley": .15, "heal": .25, "buff_atk": .1, "taunt": .05}[sk[h["skills"][0]]["type"]]) + h["baseHp"])] for h in H]))
print("\n### skills\n")
print(table(["id", "Tên", "Loại", "Hồi (s)", "Tham số (sao 1 / 2 / 3)"],
  [[s["id"], s["name"], s["type"], s["cooldownSec"], "; ".join(f"{k} {v}" for k, v in s["params"].items())] for s in sk.values()]))
HL = J("hero-levels.json")
print("\n### hero-levels\n")
rows = []
for r in HL["costs"]:
    f = r.get("fragments")
    rows.append([f'{r["from"]}→{r["to"]}', r["meat"], f"{f['N']}/{f['R']}/{f['E']}/{f['L']}" if f else ""])
print(table(["Cấp", "Thịt", "Mảnh N/R/E/L"], rows))
print("\nTổng thịt 1→30:", sum(r["meat"] for r in HL["costs"]), "; 1→25:", sum(r["meat"] for r in HL["costs"][:24]))
PL = J("player-levels.json")
print("\n### player-levels\n")
acc = 0; rows = []
for r in PL["levels"]:
    acc += r["exp"]; rows.append([f'{r["from"]}→{r["to"]}', r["exp"], acc])
print(table(["Cấp", "EXP", "EXP cộng dồn"], rows))
B = J("buildings.json")["buildings"]
print("\n### buildings\n")
for b in B:
    print(f"\n**{b['name']}** (`{b['id']}`), {b['footprint'][0]}×{b['footprint'][1]} ô, mở ở cấp người chơi {b['unlockPlayerLevel']}\n")
    rows = []
    for l in b["levels"]:
        e = l["effects"]
        eff = ("trần " + str(e["cap"]["wood"])) if "cap" in e else (f'{e["perHour"]}/giờ, đệm {e["perHour"]*8}' if "perHour" in e else ", ".join(f"{k}={v}" for k, v in e.items()))
        cost = ", ".join(f"{k} {v}" for k, v in l["cost"].items() if v) or "có sẵn"
        rows.append([l["level"], cost, l["buildSec"], l["reqPlayerLevel"], eff])
    print(table(["Cấp", "Chi phí", "Xây (s)", "Cần cấp NC", "Hiệu ứng"], rows))
TR = J("training-tree.json")
print("\n### training\n")
rows = []
for lv in range(1, 31):
    ns = [n for n in TR["nodes"] if n["reqPlayerLevel"] == lv]
    rows.append([lv, ", ".join(f'#{n["index"]} {n["stat"].upper()}+{n["value"]} ({n["ore"]})' for n in ns)])
print(table(["Cấp NC", "Nấc mở (giá quặng)"], rows))
print("\nTổng quặng cả cây:", sum(n["ore"] for n in TR["nodes"]))
print(table(["Ô đội", "San Hô Đỏ", "Cần Sân Tập cấp"], [[s["slot"], s["coral"], s["reqYardLevel"]] for s in TR["slotNodes"]]))
M = J("monsters.json")
print("\n### monsters\n")
print(table(["id", "Tên", "Loại", "HP gốc", "ATK gốc", "Nhịp", "Tầm", "Tốc độ", "Bán kính", "EXP", "Bảng rơi", "Kỹ năng"],
  [[m["id"], m["name"], m["kind"], m["baseHp"], m["baseAtk"], m["attackInterval"], m["attackRange"], m["moveSpeed"], m["radius"], m["exp"], m["dropTable"], ", ".join(m.get("abilities", []))] for m in M["monsters"]]))
DG = J("dungeon.json")
print("\n### floors\n")
rows = []
for f in DG["floors"]:
    g = "; ".join(f'{x["monster"]}×{x["count"]} {x["pattern"]}' + (f' +{x["delaySec"]}s' if x["delaySec"] else "") for x in f["groups"])
    rows.append([f["floor"], f["stage"], f["recommendedCp"], f["hpMult"], f["goldMult"], f["expMult"], f["clearGold"], g])
print(table(["Tầng", "Chặng", "CP đề nghị", "hp/atkMult", "goldMult", "expMult", "Vàng qua tầng", "Nhóm quái"], rows))
DR = J("drop-tables.json")
print("\n### drops\n")
rows = []
for k, t in DR["tables"].items():
    rows.append([k, "; ".join(f'{r["item"]} {r["min"]}-{r["max"]} @{int(r["chance"]*100)}%' for r in t["rolls"])])
print(table(["Bảng", "Dòng"], rows))
Q = J("quests.json")["quests"]
print("\n### quests\n")
print(table(["id", "Loại", "Tham số", "Chữ", "Thưởng", "Chỉ đường"],
  [[q["id"], q["type"], json.dumps(q["params"], ensure_ascii=False), q["text"], ", ".join(f"{k} {v}" for k, v in q["reward"].items()), q["hint"]] for q in Q]))
