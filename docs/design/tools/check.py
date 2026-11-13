#!/usr/bin/env python3
"""Kiểm tra số học bảng số liệu và mô hình tiến độ theo phút.
Chạy: python3 check.py <thư mục JSON> [--quiet]
Đây là mô hình kinh tế thô (bước 60 s), KHÔNG thay thế bot mô phỏng trong game."""
import json, math, os, random, sys
import model

D = sys.argv[1] if len(sys.argv) > 1 else "out"
QUIET = "--quiet" in sys.argv
J = lambda n: json.load(open(os.path.join(D, n), encoding="utf-8"))
T = J("tuning.json"); H = J("heroes.json")["heroes"]; SK = {s["id"]: s for s in J("skills.json")["skills"]}
HL = J("hero-levels.json"); PL = J("player-levels.json"); TR = J("training-tree.json")
B = {b["id"]: b for b in J("buildings.json")["buildings"]}; RC = J("recruit.json")
MON = {m["id"]: m for m in J("monsters.json")["monsters"]}; MJ = J("monsters.json")
DR = J("drop-tables.json"); DG = J("dungeon.json"); FL = J("field-layout.json")
QS = J("quests.json")["quests"] if os.path.exists(os.path.join(D, "quests.json")) else []
HM = {h["id"]: h for h in H}
problems = []
def prob(msg): problems.append(msg)

# ------------------------------------------------------------ hero math
def skill_bonus(h, lvl):
    b = 0.0
    sk = h["skills"]
    if lvl >= 1: b += T["cp"]["skillCpBonusByType"][SK[sk[0]]["type"]]
    if lvl >= 10: b += T["cp"]["skillCpBonusByType"][SK[sk[1]]["type"]]
    if lvl >= 20: b += 0.05
    if lvl >= 30: b += 0.05
    return b

def owned_effects(owned):
    eff = {"STR": [0, 0], "AGI": [0, 0], "INT": [0, 0]}  # hp%, atk%
    for hid, lv in owned.items():
        a = HM[hid]["attribute"]
        if lv >= 5: eff[a][0] += 0.05
        if lv >= 15: eff[a][1] += 0.05
        if lv >= 25: eff[a][0] += 0.05
    return eff

def hero_stats(hid, lvl, flat_hp, flat_atk, eff):
    h = HM[hid]; g = 1 + T["hero"]["growthPerLevel"] * (lvl - 1)
    hp = (round(h["baseHp"] * g) + flat_hp) * (1 + eff[h["attribute"]][0])
    atk = (round(h["baseAtk"] * g) + flat_atk) * (1 + eff[h["attribute"]][1])
    return round(hp), round(atk)

def hero_cp(hid, lvl, flat_hp, flat_atk, eff):
    hp, atk = hero_stats(hid, lvl, flat_hp, flat_atk, eff)
    h = HM[hid]
    return round(4 * atk * (1.0 / h["attackInterval"]) * (1 + skill_bonus(h, lvl)) + hp)

# ------------------------------------------------------------ static checks
caps = [(lv["level"], lv["reqPlayerLevel"], lv["effects"]["cap"]["wood"]) for lv in B["storage"]["levels"]]
def cap_at_player_level(pl):
    c = 0
    for lv, req, cap in caps:
        if req <= pl: c = max(c, cap)
    return c
for b in B.values():
    for lv in b["levels"]:
        for res, amt in lv["cost"].items():
            if res in ("wood", "ore", "meat"):
                cap = cap_at_player_level(lv["reqPlayerLevel"])
                if b["id"] == "storage" and lv["level"] > 1:
                    cap = B["storage"]["levels"][lv["level"] - 2]["effects"]["cap"]["wood"]
                if amt > cap:
                    prob(f"{b['id']} L{lv['level']} cần {amt} {res} > sức chứa {cap} tại cấp người chơi {lv['reqPlayerLevel']}")
for row in HL["costs"]:
    # meat cost phải <= sức chứa kho ở cấp người chơi tương ứng tối thiểu (giả định hero L ~ player L)
    if row["meat"] > cap_at_player_level(max(1, row["from"] - 5)):
        prob(f"hero L{row['from']} cần {row['meat']} thịt > kho")
for n in TR["nodes"]:
    if n["ore"] > cap_at_player_level(n["reqPlayerLevel"]):
        prob(f"training node {n['index']} cần {n['ore']} quặng > kho ở cấp {n['reqPlayerLevel']}")

# ------------------------------------------------------------ resource flow (dead-end)
sources = {"gold": set(), "meat": set(), "wood": set(), "ore": set(), "coral": set(), "tickets": set(), "fragments": set(), "exp": set()}
sinks = {k: set() for k in sources}
for t in DR["tables"].values():
    for r in t["rolls"]:
        if r["max"] > 0: sources[r["item"]].add("drop")
for nt in FL["nodeTypes"].values(): sources[nt["resource"]].add("node")
for b in B.values():
    for lv in b["levels"]:
        e = lv["effects"]
        if "resource" in e: sources[e["resource"]].add("building:" + b["id"])
        for res in lv["cost"]:
            if lv["cost"][res] > 0: sinks[res].add("building:" + b["id"])
for st in DG["stages"]:
    for k, v in st["firstClear"].items():
        if v: sources[k].add("dungeon")
sources["exp"].add("monsters"); sinks["exp"].add("playerLevel")
sources["fragments"].add("recruit duplicate"); sources["fragments"].add("ticket exchange")
sources["tickets"].add("recruit")
sinks["gold"].add("recruit"); sinks["meat"].add("hero level"); sinks["ore"].add("training")
sinks["coral"].add("squad slot"); sinks["tickets"].add("exchange"); sinks["fragments"].add("hero breakthrough")
for q in QS:
    for k, v in q.get("reward", {}).items(): sources.setdefault(k, set()).add("quest")
for k in sources:
    if not sources[k]: prob(f"tài nguyên {k} không có nguồn")
    if not sinks[k]: prob(f"tài nguyên {k} không có chỗ tiêu (dead-end)")

coral_src_first = sum(s["firstClear"]["coral"] for s in DG["stages"])
coral_quest = sum(q.get("reward", {}).get("coral", 0) for q in QS)
coral_sink = sum(n["coral"] for n in TR["slotNodes"])

# ------------------------------------------------------------ max CP check
all_owned = {h["id"]: 30 for h in H}
eff = owned_effects(all_owned)
fh = sum(n["value"] for n in TR["nodes"] if n["stat"] == "hp"); fa = sum(n["value"] for n in TR["nodes"] if n["stat"] == "atk")
maxcp = sorted((hero_cp(h["id"], 30, fh, fa, eff) for h in H), reverse=True)[:8]
MAX_CP = sum(maxcp)
for f in DG["floors"]:
    if f["recommendedCp"] > MAX_CP:
        prob(f"tầng {f['floor']} đề nghị {f['recommendedCp']} > CP tối đa M1 {MAX_CP}")

# ------------------------------------------------------------ progression model
FIELD_MIX = {"tree": 0.35, "rock": 0.25, "mob": 0.40}
TRAVEL = 2.5

def run(seed=1, minutes=600, verbose=False):
    rng = random.Random(seed)
    S = dict(T["economy"]["startResources"]); S["frag"] = {}
    owned = {"bang": 1}
    built = {"storage": 1}; jobs = []  # (id, target_level, finish_min)
    plevel = 1; exp = 0; node_idx = 0; slots = T["squad"]["startSlots"]
    best_stage = 0; draws = 0; bonus = 0; tickets = 0
    repeat_count = {}; last_repeat = -999
    log = []; milestones = {}
    tavern_cards = None; refresh_t = 0
    flat_hp = flat_atk = 0
    stats = {"field_min": 0, "dungeon_min": 0}
    quest_i = 0; qbase = None
    C = {"wood": 0, "ore": 0, "kills": {}, "recruit": 0, "collect": 0, "floor": 0, "auto": 1}
    stats["questDoneAt"] = {}

    def cap(res):
        if res in T["economy"]["uncapped"]: return 10 ** 12
        return B["storage"]["levels"][built["storage"] - 1]["effects"]["cap"][res]

    src = {}
    tag = ["?"]
    def add(res, amt):
        if res == "gold": src[tag[0]] = src.get(tag[0], 0) + amt
        if res == "exp":
            nonlocal_exp[0] += amt; return
        S[res] = min(cap(res), S.get(res, 0) + amt)

    nonlocal_exp = [0]

    def squad():
        e = owned_effects(owned)
        cps = sorted(((hero_cp(h, l, flat_hp, flat_atk, e), h) for h, l in owned.items()), reverse=True)
        return cps[:slots]

    def squad_cp():
        return sum(c for c, _ in squad())

    def squad_dps_real():
        e = owned_effects(owned); d = 0; g = 0
        for c, h in squad():
            hp, atk = hero_stats(h, owned[h], flat_hp, flat_atk, e)
            d += atk / HM[h]["attackInterval"] * 1.2
            g += HM[h]["gatherPower"] / HM[h]["attackInterval"]
        return d, g

    def roll_cards():
        tier = built.get("tavern", 1)
        odds = RC["odds"][tier - 1]
        return draw_set(odds)

    def draw_set(odds):
        cards = []
        for _ in range(3):
            for _try in range(20):
                x = rng.random(); acc = 0; rar = "N"
                for r in "NREL":
                    acc += odds[r]
                    if x < acc: rar = r; break
                pool = [h for h in H if h["rarity"] == rar and h["id"] not in cards]
                if pool: break
            w = [RC["unownedWeight"] if h["id"] not in owned else RC["ownedWeight"] for h in pool]
            cards.append(rng.choices(pool, weights=w)[0]["id"])
        return cards

    def frag_need(hid, lvl):
        if lvl % 5 != 0: return 0
        return HL["costs"][lvl - 1]["fragments"][HM[hid]["rarity"]]

    def can_afford(cost):
        return all(S.get(k, 0) >= v for k, v in cost.items())

    def pay(cost):
        for k, v in cost.items(): S[k] -= v

    BUILD_ORDER = ["lumber_camp", "tavern", "ore_mine", "training_yard", "market", "dungeon_gate"]
    for t in range(minutes):
        # --- finish jobs
        for j in list(jobs):
            if j[2] <= t:
                built[j[0]] = j[1]; jobs.remove(j)
        tag[0] = "production"
        # --- production (collected continuously in model)
        for bid in ("lumber_camp", "ore_mine", "market"):
            if bid in built:
                e = B[bid]["levels"][built[bid] - 1]["effects"]
                add(e["resource"], e["perHour"] / 60.0)
        # --- player level
        while plevel < 30 and nonlocal_exp[0] >= PL["levels"][plevel - 1]["exp"]:
            nonlocal_exp[0] -= PL["levels"][plevel - 1]["exp"]; plevel += 1
        # --- construction decisions
        def try_job(bid, lvl):
            if len(jobs) >= T["economy"]["builderSlots"]: return False
            if any(j[0] == bid for j in jobs): return False
            L = B[bid]["levels"][lvl - 1]
            if L["reqPlayerLevel"] > plevel: return False
            if not can_afford(L["cost"]): return False
            pay(L["cost"]); jobs.append((bid, lvl, t + max(1, math.ceil(L["buildSec"] / 60.0)))); return True
        for bid in BUILD_ORDER:
            if bid not in built and B[bid]["unlockPlayerLevel"] <= plevel:
                try_job(bid, 1)
        # upgrade priority: cheapest first among wanted
        want = []
        for bid, lv in built.items():
            if lv < len(B[bid]["levels"]):
                if bid == "dungeon_gate" and lv > best_stage + 1: continue
                if bid == "training_yard" and lv >= slots - 1 and lv >= 2 and S.get("coral", 0) < 2: pass
                c = B[bid]["levels"][lv]["cost"]
                want.append((c.get("wood", 0) + 2 * c.get("ore", 0), bid, lv + 1))
        want.sort()
        # sân tập ưu tiên khi đủ san hô cho ô kế tiếp
        nxt_slot = next((sn for sn in TR["slotNodes"] if sn["slot"] == slots + 1), None)
        if nxt_slot and S.get("coral", 0) >= nxt_slot["coral"] and built.get("training_yard", 0) and built["training_yard"] < nxt_slot["reqYardLevel"]:
            want.insert(0, (0, "training_yard", built["training_yard"] + 1))
        # cổng xoáy ưu tiên khi đội đã đủ CP cho chặng kế
        if built.get("dungeon_gate", 0) == best_stage and best_stage < 6 and squad_cp() >= DG["stages"][best_stage]["recommendedCp"]:
            want.insert(0, (0, "dungeon_gate", best_stage + 1))
        if want and want[0][0] == 0:
            c = B[want[0][1]]["levels"][want[0][2] - 1]["cost"]
            if any(c.get(r, 0) > cap(r) for r in ("wood", "ore")) and built["storage"] < 10:
                want.insert(0, (0, "storage", built["storage"] + 1))
        for _, bid, lv in want:
            ok = try_job(bid, lv)
            if bid in ("dungeon_gate", "training_yard", "storage") and _ == 0 and not ok and len(jobs) < T["economy"]["builderSlots"] and not any(j[0] == "dungeon_gate" for j in jobs):
                break  # để dành cho Cổng Xoáy
        # --- slots
        for sn in TR["slotNodes"]:
            if sn["slot"] == slots + 1 and built.get("training_yard", 0) >= sn["reqYardLevel"] and S.get("coral", 0) >= sn["coral"]:
                S["coral"] -= sn["coral"]; slots += 1
        # --- training (keep ore reserve for the cheapest pending building upgrade)
        reserve = min([c for c, _, _ in want], default=0) // 3 if want else 0
        while "training_yard" in built and node_idx < len(TR["nodes"]):
            n = TR["nodes"][node_idx]
            if n["reqPlayerLevel"] > plevel or S["ore"] - n["ore"] < reserve: break
            S["ore"] -= n["ore"]; node_idx += 1
            if n["stat"] == "hp": flat_hp += n["value"]
            else: flat_atk += n["value"]
        # --- recruit
        if "tavern" in built:
            if tavern_cards is None or t >= refresh_t:
                tavern_cards = (["lan", "se", "dang"] if draws == 0 else roll_cards()); refresh_t = t + 30
            while S["gold"] >= RC["costGold"]:
                S["gold"] -= RC["costGold"]
                pick = "se" if draws == 0 else rng.choice(tavern_cards)
                draws += 1; tickets += 1; bonus += 1; C["recruit"] += 1
                if pick in owned: S["frag"][pick] = S["frag"].get(pick, 0) + RC["fragmentsPerDuplicate"]
                else: owned[pick] = 1
                if bonus >= RC["bonusEvery"]:
                    bonus = 0; tavern_cards = draw_set(RC["bonusOdds"]); refresh_t = t + 30
            # tickets: unlock unowned cheapest-by-value, else frag for squad hero blocked
            for ex in ("unlockL", "unlockE", "unlockR", "unlockN"):
                rar = ex[-1]; cost = next(e["tickets"] for e in RC["ticketExchange"] if e["id"] == ex)
                un = [h["id"] for h in H if h["rarity"] == rar and h["id"] not in owned]
                if un and tickets >= cost and ex in ("unlockE", "unlockL"):
                    tickets -= cost; owned[un[0]] = 1
        # --- hero levels (squad only), lowest level first
        sq = [h for _, h in squad()]
        progressed = True
        while progressed:
            progressed = False
            for h in sorted(sq, key=lambda x: owned[x]):
                L = owned[h]
                if L >= 30: continue
                cost = HL["costs"][L - 1]["meat"]; fn = frag_need(h, L)
                if fn and S["frag"].get(h, 0) < fn:
                    if tickets >= 8: tickets -= 8; S["frag"][h] = S["frag"].get(h, 0) + 5
                    continue
                if S["meat"] >= cost:
                    S["meat"] -= cost
                    if fn: S["frag"][h] -= fn
                    owned[h] = L + 1; progressed = True
        C["collect"] += 1 if "lumber_camp" in built else 0
        def qval(q):
            p = q["params"]; ty = q["type"]
            if ty == "gather": return C[p["resource"]]
            if ty == "kill": return C["kills"].get(p.get("monster") or p.get("zone"), 0)
            if ty == "recruit": return C["recruit"]
            if ty == "collect": return C["collect"]
            if ty == "auto_assign": C["auto"] += 1; return C["auto"]
            return None
        while quest_i < len(QS):
            q = QS[quest_i]; p = q["params"]; ty = q["type"]
            if qbase is None: qbase = qval(q)
            done = False
            if ty in ("gather", "kill", "recruit", "collect", "auto_assign"):
                done = qval(q) - qbase >= p.get("count", 1)
            elif ty in ("build", "upgrade"): done = built.get(p["building"], 0) >= p.get("level", 1)
            elif ty == "hero_level": done = max(owned.values()) >= p["level"]
            elif ty == "clear_floor": done = C["floor"] >= p["floor"]
            elif ty == "slots": done = slots >= p["count"]
            elif ty == "training": done = node_idx >= p["count"]
            if not done: break
            for k, v in q["reward"].items():
                if k == "tickets": tickets += v
                else:
                    tag[0] = "quest"; add(k, v)
            stats["questDoneAt"][q["id"]] = t
            quest_i += 1; qbase = None
        cp = squad_cp()
        # --- activity
        nxt = best_stage + 1
        did_dungeon = False
        tag[0] = "dungeon"
        if nxt <= 6 and built.get("dungeon_gate", 0) >= nxt:
            st = DG["stages"][nxt - 1]
            if cp >= st["recommendedCp"]:
                # run takes ~ sum floor times*3 + overhead
                dur = sum(f["estClearSec"] * 3 + 15 for f in DG["floors"] if f["stage"] == nxt) / 60.0
                for f in DG["floors"]:
                    if f["stage"] == nxt:
                        N = sum(g["count"] for g in f["groups"])
                        add("gold", N * 0.35 * f["goldMult"] + f["clearGold"] + 30 * f["goldMult"])
                        add("meat", N * 0.15)
                        nonlocal_exp[0] += N * 3 * f["expMult"] + 60 * f["expMult"] * f["isBoss"]
                for k, v in st["firstClear"].items():
                    if k == "tickets": tickets += v
                    else: add(k, v)
                best_stage = nxt; did_dungeon = True; C["floor"] = nxt * 5; stats["dungeon_min"] += dur
                milestones["stage%d" % nxt] = t
        if not did_dungeon and best_stage >= 1 and t - last_repeat >= 30 and t > 0:
            # repeat highest stage for coral/gold every 30 min
            st = DG["stages"][best_stage - 1]
            if cp >= st["recommendedCp"]:
                last_repeat = t
                k = repeat_count.get(best_stage, 0) + 1; repeat_count[best_stage] = k
                if k % 3 == 0 or rng.random() < st["repeatClear"]["coralChance"]: add("coral", 1)
                add("gold", st["repeatClear"]["gold"]); tickets += 1
                for f in DG["floors"]:
                    if f["stage"] == best_stage:
                        N = sum(g["count"] for g in f["groups"])
                        add("gold", N * 0.35 * f["goldMult"]); nonlocal_exp[0] += N * 3 * f["expMult"]
                stats["dungeon_min"] += 4
        if not did_dungeon:
            stats["field_min"] += 1; tag[0] = "field"
            zr = T["world"]["zoneRecommendedCp"]
            z = "z3" if cp >= zr["z3"] else ("z2" if cp >= zr["z2"] else "z1")
            if quest_i < len(QS) and QS[quest_i]["type"] == "kill":
                qp = QS[quest_i]["params"]
                qz = qp.get("zone") or next(c["zone"] for c in FL["camps"] if c["monster"] == qp["monster"])
                if cp >= zr[qz] * 0.8: z = qz
            dps, gath = squad_dps_real()
            tree = FL["nodeTypes"]["tree_" + z]; rock = FL["nodeTypes"]["rock_" + z]
            trees = min(4, 60 * FIELD_MIX["tree"] / (TRAVEL + tree["durability"] / gath))
            rocks = min(3, 60 * FIELD_MIX["rock"] / (TRAVEL + rock["durability"] / gath))
            add("wood", trees * tree["durability"] * tree["yieldPerHit"]); C["wood"] += trees * tree["durability"] * tree["yieldPerHit"]
            add("ore", rocks * rock["durability"] * rock["yieldPerHit"]); C["ore"] += rocks * rock["durability"] * rock["yieldPerHit"]
            mids = {"z1": ["cua_cat", "chuot_ben"], "z2": ["sua_nhay", "doi_hang"], "z3": ["nhen_ran", "ma_bien"]}[z]
            zm = MJ["fieldZoneMult"][z]; am = DR["zoneAmountMult"][z]
            hp_m = sum(MON[m]["baseHp"] for m in mids) / 2 * zm
            kills = min(10, 60 * FIELD_MIX["mob"] / (0.6 + hp_m / (0.75 * dps)))
            # field_meat avg: 1.5 meat + .3*1.5 gold ; field_gold: 3 gold + .3 meat
            def avg(tab, item):
                return sum(r["chance"] * (r["min"] + r["max"]) / 2 for r in DR["tables"][tab]["rolls"] if r["item"] == item)
            add("meat", kills * 0.5 * (avg("field_meat", "meat") + avg("field_gold", "meat")) * am)
            add("gold", kills * 0.5 * (avg("field_meat", "gold") + avg("field_gold", "gold")) * am)
            nonlocal_exp[0] += kills * sum(MON[m]["exp"] for m in mids) / 2 * am
            for m in mids: C["kills"][m] = C["kills"].get(m, 0) + kills / 2
            C["kills"][z] = C["kills"].get(z, 0) + kills
            if z == "z3" and t % 3 == 0 and cp >= 16000: C["kills"]["cua_thep"] = C["kills"].get("cua_thep", 0) + 1
        if verbose and t in (5, 30, 60, 120, 240, 360, 600) or (t + 1) % 60 == 0 and verbose:
            pass
        if (t + 1) in (5, 30, 60, 120, 180, 240, 360, 480, 600):
            log.append({"min": t + 1, "plevel": plevel, "cp": cp, "owned": len(owned), "slots": slots,
                        "lv": sorted((owned[h] for _, h in squad()), reverse=True),
                        "nodes": node_idx, "stage": best_stage, "buildings": dict(built),
                        "gold": int(S["gold"]), "meat": int(S["meat"]), "wood": int(S["wood"]), "ore": int(S["ore"]),
                        "coral": S.get("coral", 0), "tickets": tickets, "draws": draws})
    stats["goldSources"] = {k: int(v) for k, v in src.items()}
    return log, milestones, stats

if __name__ == "__main__":
    print("== Kiểm tra tĩnh ==")
    print("CP tối đa M1 (8 hero mạnh nhất Lv30, đủ 90 nấc tập):", MAX_CP, "; tầng 30 đề nghị:", DG["floors"][-1]["recommendedCp"])
    print("San Hô Đỏ: nguồn cố định (lần đầu dọn chặng)", coral_src_first, "+ nhiệm vụ", coral_quest, "; tiêu cho ô đội", coral_sink)
    print("Dòng tài nguyên:")
    for k in sources: print("  ", k, "nguồn:", sorted(sources[k]), "| tiêu:", sorted(sinks[k]))
    allres = []
    for seed in range(1, 6):
        log, ms, stats = run(seed)
        allres.append((log, ms, stats))
    log, ms, stats = allres[0]
    print("== Mô hình tiến độ (seed 1) ==")
    for r in log:
        print({k: v for k, v in r.items() if k != "buildings"})
        print("    ", r["buildings"])
    print("mốc chặng (phút) theo seed:")
    for log, ms, stats in allres:
        print("  ", ms, stats)
    print("== Vấn đề ==")
    for p in problems: print("  -", p)
    if not problems: print("  không có")
