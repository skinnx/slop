#!/usr/bin/env python3
"""Sinh toàn bộ bảng số liệu cân bằng (JSON) cho docs/design/data/.
Chạy: python3 build_data.py <thư mục đích>
Mọi con số cân bằng nằm trong file này; tài liệu .md trích từ JSON sinh ra."""
import json, math, os, random, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)

def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")

def r50(x):
    return int(round(x / 50.0) * 50)

def rnice(x):
    """Làm tròn 'đẹp': <100 -> đơn vị, <1000 -> bội 5, còn lại bội 10/50."""
    if x < 100: return int(round(x))
    if x < 1000: return int(round(x / 5.0) * 5)
    if x < 10000: return int(round(x / 10.0) * 10)
    return int(round(x / 50.0) * 50)

# ---------------------------------------------------------------- tuning
TUNING = {
  "version": 1,
  "sim": {"fixedStepSec": 0.0333333, "stepsPerSec": 30, "rng": "mulberry32",
          "rngNote": "Một RNG có seed cho mỗi phiên chơi; dungeon run dùng RNG con seed = hash(seedGame, runIndex)."},
  "world": {
    "mapW": 60, "mapH": 60, "cellUnit": "ô (1 ô = 1 đơn vị lõi)",
    "villageCenter": [30, 30],
    "villageGrid": {"x0": 20, "y0": 20, "w": 20, "h": 20},
    "zones": [
      {"id": "village", "name": "Làng Bến Neo", "dMin": 0, "dMax": 10},
      {"id": "z1", "name": "Bãi Vỏ Sò", "dMin": 10, "dMax": 17},
      {"id": "z2", "name": "Rừng Dừa Rậm", "dMin": 17, "dMax": 24},
      {"id": "z3", "name": "Gò Đá Lam", "dMin": 24, "dMax": 30}
    ],
    "zoneRule": "d = max(|x-30|, |y-30|) theo ô; zone là vùng có dMin < d <= dMax (village: d <= 10).",
    "mapEdgeBlocked": 1
  },
  "render": {"cellW": 120, "cellH": 60, "checkerBlock": 2,
             "spriteScale": {"hero": 4, "monster": 3, "elite": 5, "boss": 10, "node": 4, "pickup": 2},
             "groundColorsField": ["#5DBB63", "#52A957"], "groundColorsVillage": ["#6CC46F", "#60B565"],
             "groundColorsDungeon": ["#3B3F5C", "#34374F"], "pathColor": "#D9B07A",
             "cameraFollowLerp": 0.15},
  "squad": {
    "moveSpeed": 3.0, "followerSpeedMult": 1.25, "followerArriveDist": 0.15,
    "heroRadius": 0.35, "separationDist": 0.6, "leashRadius": 4.0,
    "aggroRadius": 5.0, "gatherRadius": 3.0, "attackOnlyWhenIdle": True,
    "idleAfterReleaseSec": 0.15, "startSlots": 3, "maxSlots": 8,
    "formationOffsets": [[0, 0], [-0.9, -0.5], [0.5, -0.9], [-1.4, -1.3], [-0.2, -1.6], [0.9, -1.9], [-1.0, -2.3], [0.3, -2.7]],
    "formationNote": "Offset theo ô, cộng vào vị trí thủ lĩnh, KHÔNG xoay theo hướng đi. Chỉ số 0 là thủ lĩnh."
  },
  "combat": {
    "monsterRadius": 0.35, "bossRadius": 1.2, "meleeRange": 0.9,
    "attackWindupSec": 0.2, "projectileVisualSec": 0.15,
    "damageFormula": "dmg = max(1, round(ATK * mult))",
    "healFormula": "heal = round(ATK * mult), không vượt maxHP",
    "monsterAggroRadiusField": 4.0, "monsterAggroRadiusDungeon": 99,
    "monsterLeashField": 7.0, "monsterRegenOutOfCombatPctPerSec": 0.2,
    "hitFlashSec": 0.1, "knockbackCells": 0.15,
    "retargetSec": 0.5, "hitRangeTolerance": 0.5, "healThresholdPct": 0.85,
    "joystickDeadZonePct": 0.1, "bossAbilityStartCooldownPct": 0.5, "spatialHashCell": 2.0
  },
  "pickup": {"magnetRadius": 2.5, "autoCollectSec": 6.0, "flySpeed": 10.0, "scatterRadius": 0.6,
             "maxObjectsPerType": 5, "toastMergeSec": 1.0},
  "save": {"key": "tidecrew.save.v1", "autosaveSec": 15, "welcomeBackMinSec": 60},
  "field": {"heroReviveSec": 8, "wipeRespawnSec": 3, "monsterRespawnSec": 20, "eliteRespawnSec": 120,
            "treeRespawnSec": 30, "rockRespawnSec": 45, "storageFullToastCooldownSec": 30,
            "collectRadius": 1.5, "heroRegenPctPerSec": 0.02, "outOfCombatDelaySec": 5,
            "campRadius": 1.5, "wanderSpeedMult": 0.4, "wanderRetargetSec": [2, 4], "campAggroShared": True},
  "dungeon": {
    "roomW": 16, "roomH": 24, "startPos": [8, 2], "exitPos": [8, 21],
    "maxAlive": 60, "healBetweenFloorsPct": 0.3, "floorExitDelaySec": 1.5,
    "floorsPerStage": 5, "stages": 6,
    "streakTimeoutSec": 3.0, "streakMilestone": 20, "streakBonusGoldBase": 10,
    "exitTouchRadius": 1.0, "floorFadeSec": 0.5, "bossMinionsDespawnOnDeath": True,
    "defeatKeepsLootPct": 1.0, "ringSpawnRadius": [6.0, 8.0], "spawnMinDistFromHero": 4.0,
    "difficultyLabels": [
      {"minRatio": 1.2, "label": "Dễ", "color": "#7CFC7C"},
      {"minRatio": 0.9, "label": "Vừa", "color": "#FFD34D"},
      {"minRatio": 0.0, "label": "Khó", "color": "#C77DFF"}
    ],
    "difficultyNote": "ratio = CP đội / CP đề nghị của tầng boss trong chặng."
  },
  "economy": {
    "startResources": {"gold": 100, "meat": 0, "wood": 0, "ore": 0, "coral": 0, "tickets": 0},
    "uncapped": ["gold", "coral", "tickets"],
    "builderSlots": 2, "offlineCapHours": 8, "productionBufferHours": 8,
    "offlineNote": "Khi mở game: offlineSec = min(now - lastSaveTime, 8h). Chạy production, timer xây, timer quán bằng offlineSec. Không mô phỏng chiến đấu."
  },
  "hero": {"maxLevel": 30, "growthPerLevel": 0.03,
           "rarityMult": {"N": 1.0, "R": 1.2, "E": 1.45, "L": 1.75},
           "rarityColor": {"N": "#9AA0A6", "R": "#3D8BFF", "E": "#B455F5", "L": "#FFB020"},
           "attrColor": {"STR": "#E5484D", "AGI": "#46C35A", "INT": "#F2C230"}},
  "cp": {"atkWeight": 4, "hpWeight": 1, "refAttackInterval": 1.0,
         "formula": "CP_hero = round(4 * ATK * (1.0 / attackInterval) * (1 + skillCpBonus) + HP); CP_đội = tổng CP_hero trong đội"},
  "player": {"maxLevel": 30},
}

# ---------------------------------------------------------------- skills
# type: strike | cleave | nova | volley | heal | buff_atk | taunt
SKILLS = [
 # id, name, type, cd, unlockLv, params per star [mult, radius/count, extra]
 ("khien_dap", "Khiên Đập", "strike", 6, {"mult": [1.8, 2.2, 2.6]}, "Đập khiên vào mục tiêu, gây sát thương."),
 ("ho_vang", "Hô Vang", "taunt", 10, {"radius": [3.0, 3.5, 4.0], "durationSec": [3, 4, 5]}, "Quái trong bán kính đổi mục tiêu sang hero này."),
 ("vung_neo", "Vung Neo", "cleave", 7, {"mult": [1.6, 1.9, 2.2], "radius": [1.5, 1.7, 1.9]}, "Quét neo, sát thương vùng quanh mục tiêu."),
 ("dap_dat", "Đạp Đất", "nova", 9, {"mult": [1.4, 1.7, 2.0], "radius": [2.0, 2.3, 2.6]}, "Sát thương vùng quanh bản thân."),
 ("mai_sat", "Mai Sắt", "taunt", 9, {"radius": [3.5, 4.0, 4.5], "durationSec": [4, 5, 6]}, "Kéo quái quanh mình."),
 ("song_dong", "Sóng Đồng", "nova", 8, {"mult": [1.6, 1.9, 2.2], "radius": [2.2, 2.5, 2.8]}, "Dậm đất tạo sóng."),
 ("kinh_ngu", "Kình Ngư Nộ", "buff_atk", 14, {"pct": [0.2, 0.25, 0.3], "durationSec": [5, 6, 7]}, "Cả đội +ATK trong thời gian ngắn."),
 ("ha_kinh", "Hải Kình Giáng", "cleave", 8, {"mult": [2.4, 2.8, 3.2], "radius": [2.0, 2.2, 2.4]}, "Đòn nặng vùng quanh mục tiêu."),
 ("ban_doi", "Bắn Đôi", "volley", 6, {"mult": [1.2, 1.4, 1.6], "count": [2, 2, 3]}, "Bắn tên vào các quái gần nhất."),
 ("mua_ten", "Mưa Tên", "volley", 11, {"mult": [1.0, 1.2, 1.4], "count": [4, 5, 6]}, "Mưa tên vào nhiều quái."),
 ("dao_xoay", "Dao Xoáy", "nova", 6, {"mult": [1.3, 1.5, 1.7], "radius": [1.6, 1.8, 2.0]}, "Xoay dao quanh mình."),
 ("muc_den", "Mực Đen", "strike", 8, {"mult": [2.5, 3.0, 3.5]}, "Đòn chí mạng vào một mục tiêu."),
 ("lao_xuyen", "Lao Xuyên", "volley", 7, {"mult": [1.5, 1.8, 2.1], "count": [3, 3, 4]}, "Phóng lao trúng nhiều quái."),
 ("gio_bien", "Gió Biển", "buff_atk", 15, {"pct": [0.15, 0.2, 0.25], "durationSec": [6, 7, 8]}, "Cả đội +ATK."),
 ("dieu_hau", "Diều Hâu Lao", "strike", 7, {"mult": [3.0, 3.5, 4.0]}, "Một mũi tên rất mạnh."),
 ("bao_long", "Bão Lông Vũ", "volley", 10, {"mult": [1.3, 1.5, 1.7], "count": [6, 7, 8]}, "Bắn tỏa vào nhiều quái."),
 ("tay_lanh", "Tay Lành", "heal", 5, {"mult": [1.8, 2.2, 2.6], "count": [1, 1, 2]}, "Hồi máu đồng đội máu thấp nhất."),
 ("suong_mat", "Sương Mát", "heal", 12, {"mult": [0.8, 1.0, 1.2], "count": [8, 8, 8]}, "Hồi máu cả đội."),
 ("lua_den", "Lửa Hải Đăng", "cleave", 7, {"mult": [1.8, 2.1, 2.4], "radius": [1.6, 1.8, 2.0]}, "Cầu lửa nổ vùng."),
 ("chop_sang", "Chớp Sáng", "volley", 9, {"mult": [1.4, 1.6, 1.8], "count": [3, 4, 5]}, "Tia sáng nhảy nhiều quái."),
 ("san_ho_hoi", "San Hô Hồi", "heal", 4, {"mult": [2.0, 2.4, 2.8], "count": [2, 2, 3]}, "Hồi máu 2 đồng đội máu thấp nhất."),
 ("ken_bao_ve", "Kén Bảo Vệ", "heal", 14, {"mult": [1.2, 1.4, 1.6], "count": [8, 8, 8]}, "Hồi máu cả đội."),
 ("song_than", "Sóng Thần", "nova", 9, {"mult": [2.2, 2.6, 3.0], "radius": [3.0, 3.3, 3.6]}, "Sóng lớn quanh bản thân."),
 ("trieu_cuong", "Triều Cường", "cleave", 6, {"mult": [2.0, 2.4, 2.8], "radius": [2.0, 2.2, 2.4]}, "Cột nước nổ quanh mục tiêu."),
]
skills_json = []
for sid, name, typ, cd, params, desc in SKILLS:
    skills_json.append({"id": sid, "name": name, "type": typ, "cooldownSec": cd,
                        "params": params, "desc": desc})
# cpBonus theo loại kỹ năng (đã mở) - dùng trong công thức CP
SKILL_CP_BONUS = {"strike": 0.10, "cleave": 0.15, "nova": 0.15, "volley": 0.15,
                  "heal": 0.25, "buff_atk": 0.10, "taunt": 0.05}
TUNING["cp"]["skillCpBonusByType"] = SKILL_CP_BONUS
TUNING["cp"]["skillCpBonusNote"] = "skillCpBonus = tổng bonus của các kỹ năng đã mở; mỗi sao thêm sau sao 1 cộng thêm 0.05."

# ---------------------------------------------------------------- heroes
ROLE = {  # Normal Lv1
 "tank":    dict(hp=900, atk=110, interval=1.1, range=0.9),
 "bruiser": dict(hp=700, atk=150, interval=1.0, range=0.9),
 "archer":  dict(hp=450, atk=170, interval=0.9, range=4.0),
 "rogue":   dict(hp=550, atk=100, interval=0.6, range=0.9),
 "mage":    dict(hp=480, atk=230, interval=1.4, range=3.5),
 "healer":  dict(hp=520, atk=120, interval=1.2, range=3.5),
}
HEROES = [
 # id, name, attr, rarity, role, skills, gatherPower, sprite, tint, flavor
 ("bang", "Bàng", "STR", "N", "tank", ["khien_dap", "ho_vang"], 1, "td:0097", "#FFFFFF", "Thủy thủ khiên gỗ, người đầu tiên theo bạn ra khơi."),
 ("do_neo", "Đô Neo", "STR", "R", "bruiser", ["vung_neo", "dap_dat"], 2, "td:0087", "#FFFFFF", "Lực sĩ bến cảng, vác mỏ neo làm vũ khí. Chặt cây nhanh."),
 ("rua_sat", "Rùa Sắt", "STR", "E", "tank", ["mai_sat", "song_dong"], 1, "td:0096", "#9FE3C9", "Hiệp sĩ áo giáp mai rùa."),
 ("kinh_vuong", "Kình Vương", "STR", "L", "bruiser", ["kinh_ngu", "ha_kinh"], 1, "td:0086", "#8FB8FF", "Gã khổng lồ lớn lên giữa đàn cá voi."),
 ("se", "Sẻ", "AGI", "N", "archer", ["ban_doi", "mua_ten"], 1, "td:0088", "#FFFFFF", "Cô bé cung thủ chợ cá."),
 ("muc", "Mực", "AGI", "R", "rogue", ["dao_xoay", "muc_den"], 1, "td:0112", "#FFFFFF", "Kẻ trộm hai dao, nhanh như mực phun."),
 ("en", "Én", "AGI", "E", "archer", ["lao_xuyen", "gio_bien"], 2, "td:0098", "#7FE0FF", "Thợ săn phóng lao trên vách đá. Đào quặng nhanh."),
 ("dieu", "Diều", "AGI", "L", "archer", ["dieu_hau", "bao_long"], 1, "td:0099", "#FFE08A", "Xạ thủ bay theo cánh diều."),
 ("lan", "Lan", "INT", "N", "healer", ["tay_lanh", "suong_mat"], 1, "td:0100", "#FFFFFF", "Bà lang làng chài."),
 ("dang", "Đăng", "INT", "R", "mage", ["lua_den", "chop_sang"], 1, "td:0084", "#FFFFFF", "Người giữ hải đăng, phóng lửa từ đèn lồng."),
 ("san", "San", "INT", "E", "healer", ["san_ho_hoi", "ken_bao_ve"], 1, "td:0085", "#FF9FB0", "Thầy thuốc dùng phép san hô."),
 ("trieu", "Triều", "INT", "L", "mage", ["song_than", "trieu_cuong"], 1, "td:0111", "#7FA8FF", "Bà đồng điều khiển thủy triều."),
]
heroes_json = []
for hid, name, attr, rar, role, sk, gp, spr, tint, flavor in HEROES:
    b = ROLE[role]; m = TUNING["hero"]["rarityMult"][rar]
    heroes_json.append({"id": hid, "name": name, "attribute": attr, "rarity": rar, "role": role,
        "baseHp": int(round(b["hp"] * m)), "baseAtk": int(round(b["atk"] * m)),
        "attackInterval": b["interval"], "attackRange": b["range"],
        "ranged": b["range"] > 1.0, "gatherPower": gp, "skills": sk,
        "sprite": spr, "tint": tint, "flavor": flavor})

# ---------------------------------------------------------------- hero levels
FRAG_TABLE = {"N": [5, 10, 15, 20, 25], "R": [4, 8, 12, 16, 20], "E": [3, 6, 9, 12, 15], "L": [2, 4, 6, 8, 10]}
hero_levels = []
for L in range(1, 30):
    meat = rnice(15 * 1.106 ** (L - 1))
    row = {"from": L, "to": L + 1, "meat": meat}
    if L % 5 == 0:
        idx = L // 5 - 1
        row["fragments"] = {k: v[idx] for k, v in FRAG_TABLE.items()}
    hero_levels.append(row)
MILESTONES = [
  {"level": 1, "type": "skill_unlock", "skillSlot": 0, "desc": "Mở kỹ năng 1 (1 sao)"},
  {"level": 5, "type": "owned_hp", "pct": 0.05, "desc": "Hero cùng hệ +5% HP (hiệu ứng sở hữu)"},
  {"level": 10, "type": "skill_unlock", "skillSlot": 1, "desc": "Mở kỹ năng 2 (1 sao)"},
  {"level": 15, "type": "owned_atk", "pct": 0.05, "desc": "Hero cùng hệ +5% ATK (hiệu ứng sở hữu)"},
  {"level": 20, "type": "skill_star", "skillSlot": 0, "desc": "Kỹ năng 1 lên 2 sao"},
  {"level": 25, "type": "owned_hp", "pct": 0.05, "desc": "Hero cùng hệ +5% HP (hiệu ứng sở hữu)"},
  {"level": 30, "type": "skill_star", "skillSlot": 1, "desc": "Kỹ năng 2 lên 2 sao"},
]
dump("hero-levels.json", {"version": 1, "maxLevel": 30, "costs": hero_levels, "milestones": MILESTONES,
     "note": "Lên từ cấp L tốn meat; ở L = 5,10,15,20,25 cần thêm fragments theo độ hiếm. Sao 3 của kỹ năng: để sau M1."})

# ---------------------------------------------------------------- player levels
EXP_A, EXP_P = 10, 2.3
player_levels = []
for L in range(1, 30):
    player_levels.append({"from": L, "to": L + 1, "exp": rnice(EXP_A * L ** EXP_P)})
dump("player-levels.json", {"version": 1, "maxLevel": 30, "levels": player_levels})

# ---------------------------------------------------------------- training tree
tree = []
for k in range(90):
    req = k // 3 + 1  # 3 nấc mỗi cấp người chơi
    kind = "hp" if k % 2 == 0 else "atk"
    tree.append({"index": k, "stat": kind, "value": 12 if kind == "hp" else 3,
                 "ore": rnice(6 * 1.07 ** k), "reqPlayerLevel": req})
SLOT_NODES = [
  {"slot": 4, "coral": 2, "reqYardLevel": 2},
  {"slot": 5, "coral": 4, "reqYardLevel": 3},
  {"slot": 6, "coral": 6, "reqYardLevel": 4},
  {"slot": 7, "coral": 9, "reqYardLevel": 5},
  {"slot": 8, "coral": 12, "reqYardLevel": 6},
]
dump("training-tree.json", {"version": 1, "nodes": tree, "slotNodes": SLOT_NODES,
     "note": "Nấc phải mở theo thứ tự index. stat cộng phẳng vào MỌI hero (sở hữu), tính trước % hiệu ứng sở hữu."})

# ---------------------------------------------------------------- buildings
def lv_rows(n, cost_fn, sec_list, req_list, eff_fn):
    rows = []
    for L in range(1, n + 1):
        rows.append({"level": L, "cost": cost_fn(L), "buildSec": sec_list[L - 1],
                     "reqPlayerLevel": req_list[L - 1], "effects": eff_fn(L)})
    return rows

SEC10 = [10, 30, 60, 120, 240, 420, 600, 900, 1200, 1800]
CAPS = [300, 500, 800, 1300, 2000, 3200, 5000, 8000, 12000, 18000]
def cost_wood_ore(base_w, base_o, g, ore_from=2):
    def f(L):
        w = rnice(base_w * g ** (L - 1))
        o = rnice(base_o * g ** (L - 1)) if L >= ore_from else 0
        c = {"wood": w}
        if o: c["ore"] = o
        return c
    return f

buildings = [
 {"id": "storage", "name": "Nhà Kho", "footprint": [3, 3], "maxCount": 1, "unlockPlayerLevel": 1, "prePlaced": [21, 21],
  "desc": "Chứa thịt, gỗ, quặng. Nâng cấp để tăng sức chứa.",
  "levels": lv_rows(10, lambda L: {"wood": 0} if L == 1 else {"wood": rnice(90 * 1.55 ** (L - 2)), **({"ore": rnice(40 * 1.55 ** (L - 3))} if L >= 3 else {})},
                    [0] + SEC10[1:], [1, 2, 4, 6, 8, 11, 14, 17, 20, 23],
                    lambda L: {"cap": {"meat": CAPS[L - 1], "wood": CAPS[L - 1], "ore": CAPS[L - 1]}})},
 {"id": "lumber_camp", "name": "Trại Gỗ", "footprint": [2, 2], "maxCount": 1, "unlockPlayerLevel": 1,
  "desc": "Tự sản xuất gỗ. Đi lại gần hoặc bấm Thu để lấy.",
  "levels": lv_rows(10, cost_wood_ore(30, 20, 1.6, 3), SEC10, [1, 3, 5, 7, 9, 12, 15, 18, 21, 24],
                    lambda L: {"resource": "wood", "perHour": [60, 90, 130, 180, 240, 310, 390, 480, 580, 700][L - 1]})},
 {"id": "tavern", "name": "Quán Mỏ Neo", "footprint": [3, 3], "maxCount": 1, "unlockPlayerLevel": 2,
  "desc": "Tuyển hero, đổi Vé Quán lấy mảnh hero.",
  "levels": lv_rows(5, lambda L: {"wood": [60, 300, 900, 2400, 5600][L - 1], **({"ore": [0, 120, 400, 1100, 2600][L - 1]} if L > 1 else {})},
                    [20, 120, 600, 1200, 1800], [2, 6, 11, 16, 21],
                    lambda L: {"oddsTier": L})},
 {"id": "ore_mine", "name": "Mỏ Quặng", "footprint": [2, 2], "maxCount": 1, "unlockPlayerLevel": 3,
  "desc": "Tự sản xuất quặng lam.",
  "levels": lv_rows(10, lambda L: {"wood": rnice(60 * 1.6 ** (L - 1)), **({"ore": rnice(25 * 1.6 ** (L - 1))} if L >= 3 else {})},
                    SEC10, [3, 4, 6, 8, 10, 13, 16, 19, 22, 25],
                    lambda L: {"resource": "ore", "perHour": [30, 45, 65, 90, 120, 155, 195, 240, 290, 350][L - 1]})},
 {"id": "training_yard", "name": "Sân Tập", "footprint": [3, 3], "maxCount": 1, "unlockPlayerLevel": 4,
  "desc": "Mở cây nâng cấp toàn đội bằng quặng và ô đội bằng San Hô Đỏ.",
  "levels": lv_rows(6, lambda L: {"wood": [100, 400, 1000, 2000, 3600, 6000][L - 1], **({"ore": [0, 150, 450, 900, 1600, 2800][L - 1]} if L > 1 else {})},
                    [30, 300, 900, 1500, 2400, 3600], [4, 7, 10, 14, 18, 22],
                    lambda L: {"maxSquadSlotsUnlockable": L + 2})},
 {"id": "market", "name": "Chợ Bến", "footprint": [2, 2], "maxCount": 1, "unlockPlayerLevel": 5,
  "desc": "Tự sản xuất vàng.",
  "levels": lv_rows(10, cost_wood_ore(80, 30, 1.6, 2), SEC10, [5, 6, 8, 10, 12, 14, 17, 20, 23, 26],
                    lambda L: {"resource": "gold", "perHour": [40, 60, 85, 115, 150, 190, 235, 285, 340, 400][L - 1]})},
 {"id": "dungeon_gate", "name": "Cổng Xoáy", "footprint": [3, 3], "maxCount": 1, "unlockPlayerLevel": 6,
  "desc": "Mở cổng vào Hang Xoáy. Cấp cổng = chặng cao nhất được vào.",
  "levels": lv_rows(6, lambda L: {"wood": [150, 600, 1500, 3000, 5000, 8000][L - 1], **({"ore": [0, 250, 700, 1300, 2400, 4000][L - 1]} if L > 1 else {})},
                    [30, 300, 900, 1500, 2400, 3600], [6, 8, 11, 15, 19, 23],
                    lambda L: {"maxStage": L})},
]
for b in buildings:
    b["collectableBufferHours"] = 8 if b["id"] in ("lumber_camp", "ore_mine", "market") else None
    if b["collectableBufferHours"] is None: del b["collectableBufferHours"]
dump("buildings.json", {"version": 1, "buildings": buildings,
     "note": "level 1 = chi phí và thời gian để XÂY MỚI; level L>1 = chi phí nâng từ L-1 lên L. buildSec tính bằng giây. Nhà Kho cấp 1 có sẵn khi bắt đầu."})

# ---------------------------------------------------------------- recruit
RECRUIT = {
  "version": 1, "costGold": 100, "multi": [1, 2, 3], "cardCount": 3,
  "refreshSec": 1800, "manualRefreshGold": 50,
  "drawRule": "Mỗi lượt: chọn ngẫu nhiên đều 1 trong 3 thẻ (seeded RNG). 2x/3x = 2/3 lượt độc lập, trả 200/300 vàng.",
  "fragmentsPerDuplicate": 5,
  "newHeroGivesFragments": 0,
  "odds": [  # theo cấp Quán Mỏ Neo
    {"tier": 1, "N": 0.62, "R": 0.30, "E": 0.07, "L": 0.01},
    {"tier": 2, "N": 0.55, "R": 0.33, "E": 0.10, "L": 0.02},
    {"tier": 3, "N": 0.48, "R": 0.35, "E": 0.14, "L": 0.03},
    {"tier": 4, "N": 0.42, "R": 0.36, "E": 0.17, "L": 0.05},
    {"tier": 5, "N": 0.36, "R": 0.37, "E": 0.20, "L": 0.07}],
  "bonusOdds": {"N": 0.0, "R": 0.50, "E": 0.38, "L": 0.12},
  "bonusEvery": 10,
  "bonusRule": "Mỗi lượt +1 vào thanh BONUS. Khi đạt 10: bộ thẻ làm mới NGAY bằng bonusOdds, thanh về 0, đồng hồ làm mới đặt lại 30 phút.",
  "unownedWeight": 2, "ownedWeight": 1,
  "heroPickRule": "Trong một độ hiếm: chọn hero theo trọng số (chưa có = 3, đã có = 1). Ba thẻ trong một bộ không trùng hero; nếu độ hiếm đó hết hero chưa dùng thì rút lại độ hiếm từ bảng odds.",
  "ticketsPerDraw": 1,
  "ticketExchange": [
    {"id": "frag5", "desc": "5 mảnh của 1 hero ĐÃ CÓ tùy chọn", "tickets": 8},
    {"id": "unlockN", "desc": "Mở 1 hero Thường chưa có", "tickets": 15},
    {"id": "unlockR", "desc": "Mở 1 hero Hiếm chưa có", "tickets": 30},
    {"id": "unlockE", "desc": "Mở 1 hero Sử Thi chưa có", "tickets": 80},
    {"id": "unlockL", "desc": "Mở 1 hero Huyền Thoại chưa có", "tickets": 150}],
  "firstRecruitScript": "Lượt tuyển đầu tiên trong đời save luôn ra hero 'se' (Sẻ, cung thủ) để người mới có tầm xa; bộ thẻ đầu tiên là [lan, se, dang] hiển thị NEW."
}
dump("recruit.json", RECRUIT)

# ---------------------------------------------------------------- monsters
MON = [
 # id, name, kind, baseHp, baseAtk, interval, range, speed, radius, exp, drop, sprite, tint, scaleKey
 ("cua_cat", "Cua Cát", "normal", 260, 30, 1.2, 0.8, 1.6, 0.35, 4, "field_meat", "td:0110", "#FFFFFF", "monster"),
 ("chuot_ben", "Chuột Bến", "normal", 200, 26, 1.0, 0.8, 2.2, 0.3, 4, "field_gold", "td:0124", "#FFFFFF", "monster"),
 ("sua_nhay", "Sứa Nhầy", "normal", 330, 38, 1.3, 0.8, 1.3, 0.35, 5, "field_meat", "td:0108", "#9FD8FF", "monster"),
 ("doi_hang", "Dơi Hang", "normal", 220, 34, 0.9, 0.8, 2.8, 0.3, 5, "field_gold", "td:0120", "#FFFFFF", "monster"),
 ("nhen_ran", "Nhện Rạn", "normal", 300, 44, 1.1, 0.8, 2.0, 0.35, 6, "field_meat", "td:0122", "#FFFFFF", "monster"),
 ("ma_bien", "Hồn Ma Biển", "normal", 240, 40, 1.4, 3.0, 1.6, 0.35, 6, "field_gold", "td:0121", "#BFFFF0", "monster"),
 ("cua_thep", "Cua Càng Thép", "elite", 2600, 90, 1.5, 1.1, 1.4, 0.8, 40, "field_elite", "td:0110", "#C0C8D8", "elite"),
 # dungeon
 ("d_chuot", "Chuột Hang", "normal", 200, 26, 1.0, 0.8, 2.2, 0.3, 3, "dungeon_mob", "td:0124", "#C8B8A0", "monster"),
 ("d_doi", "Dơi Hang", "normal", 160, 30, 0.9, 0.8, 2.8, 0.3, 3, "dungeon_mob", "td:0120", "#FFFFFF", "monster"),
 ("d_nhen", "Nhện Rạn", "normal", 260, 34, 1.1, 0.8, 2.0, 0.35, 3, "dungeon_mob", "td:0122", "#FFFFFF", "monster"),
 ("d_nhay", "Sứa Nhầy", "normal", 360, 30, 1.3, 0.8, 1.3, 0.35, 3, "dungeon_mob", "td:0108", "#9FD8FF", "monster"),
 ("d_ma", "Hồn Ma Biển", "normal", 200, 32, 1.4, 3.0, 1.6, 0.35, 3, "dungeon_mob", "td:0121", "#BFFFF0", "monster"),
]
BOSSES = [
 # id, name, hp, atk, interval, speed, sprite, tint, abilities
 ("b_ruong", "Rương Nhai", 9000, 70, 1.6, 1.2, "td:0092", "#FFFFFF", ["slam"]),
 ("b_cua", "Cua Càng Thép Chúa", 9000, 70, 1.5, 1.4, "td:0110", "#C0C8D8", ["slam", "charge"]),
 ("b_mat", "Mắt Đá", 9500, 72, 1.7, 1.0, "td:0109", "#B8B8B8", ["slam", "summon"]),
 ("b_ran", "Rắn Biển Rạn", 8500, 75, 1.4, 1.3, "td:0123", "#7FFFD4", ["slam", "charge", "summon"]),
 ("b_thuyentruong", "Thuyền Trưởng Ma", 9500, 75, 1.4, 1.5, "td:0121", "#FF8080", ["slam", "charge", "summon"]),
 ("b_vuanhen", "Vua Nhện Rạn", 10000, 78, 1.3, 1.6, "td:0122", "#FF5050", ["slam", "charge", "summon"]),
]
ABILITIES = {
 "slam":   {"name": "Đập Đất", "telegraph": "circle", "radius": 3.0, "telegraphSec": 1.5, "mult": 3.0, "cooldownSec": 7.0,
            "rule": "Vòng đỏ tâm tại vị trí boss lúc bắt đầu, lớn dần trong telegraphSec; hết giờ: mọi hero còn trong vòng nhận dmg = ATK boss * mult. Boss đứng yên khi gồng."},
 "charge": {"name": "Húc Lao", "telegraph": "rect", "length": 7.0, "width": 1.6, "telegraphSec": 1.2, "mult": 2.0, "cooldownSec": 11.0,
            "rule": "Hình chữ nhật đỏ từ boss hướng về hero gần nhất (khóa hướng lúc bắt đầu); hết giờ boss lao hết chiều dài trong 0.4 s, hero trong hình chữ nhật nhận dmg = ATK * mult."},
 "summon": {"name": "Gọi Bầy", "telegraph": "none", "count": 8, "cooldownSec": 15.0,
            "rule": "Gọi 8 quái thường của tầng quanh boss bán kính 2 ô (tôn trọng maxAlive)."},
}
mon_json = []
for m in MON:
    mid, name, kind, hp, atk, itv, rng, spd, rad, exp, drop, spr, tint, sk = m
    mon_json.append({"id": mid, "name": name, "kind": kind, "baseHp": hp, "baseAtk": atk, "attackInterval": itv,
                     "attackRange": rng, "ranged": rng > 1.0, "moveSpeed": spd, "radius": rad, "exp": exp,
                     "dropTable": drop, "sprite": spr, "tint": tint, "scaleKey": sk})
for b in BOSSES:
    bid, name, hp, atk, itv, spd, spr, tint, ab = b
    mon_json.append({"id": bid, "name": name, "kind": "boss", "baseHp": hp, "baseAtk": atk, "attackInterval": itv,
                     "attackRange": 1.6, "ranged": False, "moveSpeed": spd, "radius": 1.2, "exp": 60,
                     "dropTable": "boss", "sprite": spr, "tint": tint, "scaleKey": "boss", "abilities": ab})
FIELD_ZONE_MULT = {"z1": 0.6, "z2": 2.0, "z3": 5.0}
dump("monsters.json", {"version": 1, "monsters": mon_json, "abilities": ABILITIES,
     "fieldZoneMult": FIELD_ZONE_MULT,
     "statRule": "Ngoài đồng: HP = round(baseHp * fieldZoneMult[zone]), ATK = round(baseAtk * fieldZoneMult[zone]), EXP = round(exp * drop-tables.zoneAmountMult[zone]). Trong dungeon: HP = round(baseHp * floor.hpMult), ATK = round(baseAtk * floor.atkMult), EXP = round(exp * floor.expMult)."})

# ---------------------------------------------------------------- drop tables
DROPS = {
 "field_meat": {"rolls": [{"item": "meat", "min": 1, "max": 2, "chance": 1.0}, {"item": "gold", "min": 1, "max": 1, "chance": 0.3}]},
 "field_gold": {"rolls": [{"item": "gold", "min": 1, "max": 2, "chance": 1.0}, {"item": "meat", "min": 1, "max": 1, "chance": 0.3}]},
 "field_elite": {"rolls": [{"item": "meat", "min": 15, "max": 20, "chance": 1.0}, {"item": "gold", "min": 30, "max": 40, "chance": 1.0}, {"item": "coral", "min": 1, "max": 1, "chance": 0.25}]},
 "dungeon_mob": {"rolls": [{"item": "gold", "min": 1, "max": 1, "chance": 0.35}, {"item": "meat", "min": 1, "max": 1, "chance": 0.15}]},
 "boss": {"rolls": [{"item": "gold", "min": 0, "max": 0, "chance": 1.0}]},
}
dump("drop-tables.json", {"version": 1, "tables": DROPS,
     "zoneAmountMult": {"z1": 1.0, "z2": 1.5, "z3": 2.0},
     "dungeonGoldMult": "dungeon_mob: lượng vàng nhân floor.goldMult (làm tròn xuống, tối thiểu 1).",
     "rule": "Mỗi roll độc lập: nếu rng < chance thì rơi số lượng nguyên đều trong [min,max] (rồi nhân hệ số zone, làm tròn). Mỗi đơn vị vật phẩm là một pickup riêng, tối đa 5 pickup/loại/lần chết (gộp số lượng)."})

# ---------------------------------------------------------------- dungeon
STAGE_NAMES = ["Hang Rương Cũ", "Hang Càng Thép", "Hang Mắt Đá", "Hang Rắn Biển", "Hang Tàu Ma", "Hang Vua Nhện"]
STAGE_MOBS = [["d_chuot", "d_doi"], ["d_chuot", "d_nhen", "d_doi"], ["d_nhen", "d_nhay", "d_doi"],
              ["d_nhay", "d_ma", "d_nhen"], ["d_ma", "d_doi", "d_nhay"], ["d_nhen", "d_ma", "d_nhay"]]
# recommended CP curve (tầng boss) — chốt bởi mô hình tiến độ trong check.py
REC_BASE = 3100.0
REC_G = 1.0995
def rec_cp(f):
    return REC_BASE * REC_G ** (f - 1)

# Mô hình giải tích để suy hệ số quái từ CP đề nghị (xem check.py, hàm floor_damage_ratio)
floors = []
for s in range(6):
    for i in range(5):
        f = s * 5 + i + 1
        mobs = STAGE_MOBS[s]
        if i < 4:
            total = [40, 48, 54, 60][i]
            pattern = ["ring", "front", "ring+front", "waves"][i]
            groups = []
            if pattern == "ring":
                per = total // len(mobs)
                for k, mid in enumerate(mobs):
                    groups.append({"monster": mid, "count": per + (total - per * len(mobs) if k == 0 else 0), "pattern": "ring", "delaySec": 0})
            elif pattern == "front":
                per = total // len(mobs)
                for k, mid in enumerate(mobs):
                    groups.append({"monster": mid, "count": per + (total - per * len(mobs) if k == 0 else 0), "pattern": "front", "delaySec": 0})
            elif pattern == "ring+front":
                groups.append({"monster": mobs[0], "count": total // 2, "pattern": "front", "delaySec": 0})
                groups.append({"monster": mobs[-1], "count": total - total // 2, "pattern": "ring", "delaySec": 4})
            else:
                for w in range(3):
                    groups.append({"monster": mobs[w % len(mobs)], "count": 20, "pattern": "ring", "delaySec": w * 8})
        else:
            groups = [{"monster": BOSSES[s][0], "count": 1, "pattern": "boss", "delaySec": 0},
                      {"monster": mobs[0], "count": 15, "pattern": "front", "delaySec": 0},
                      {"monster": mobs[-1], "count": 15, "pattern": "ring", "delaySec": 10}]
        floors.append({"floor": f, "stage": s + 1, "isBoss": i == 4, "groups": groups})

import model
MONMAP = {m["id"]: m for m in mon_json}
FIRST_GOLD = [300, 500, 700, 1000, 1400, 1900]
FIRST_CORAL = [2, 3, 4, 5, 6, 7]
FIRST_TICKETS = [3, 4, 5, 6, 8, 10]
for fl in floors:
    f = fl["floor"]; s = fl["stage"]; n = model.EXPECTED_SLOTS[s]
    M = model.solve_M(fl["groups"], MONMAP, n, rec_cp(f), ABILITIES)
    fl["recommendedCp"] = r50(rec_cp(f))
    fl["hpMult"] = round(M, 3)
    fl["atkMult"] = round(M, 3)
    fl["goldMult"] = round(1.05 ** (f - 1), 3)
    fl["expMult"] = round(1.06 ** (f - 1), 3)
    fl["clearGold"] = 0 if fl["isBoss"] else rnice(25 * 1.08 ** (f - 1))
    fl["estClearSec"] = round(model.clear_time(fl["groups"], MONMAP, n, M, ABILITIES, rec_cp(f)), 1)
stages = []
for s in range(6):
    bossFloor = floors[s * 5 + 4]
    stages.append({"stage": s + 1, "name": STAGE_NAMES[s], "firstFloor": s * 5 + 1, "bossFloor": s * 5 + 5,
                   "recommendedCp": bossFloor["recommendedCp"], "reqGateLevel": s + 1,
                   "firstClear": {"gold": FIRST_GOLD[s], "coral": FIRST_CORAL[s], "tickets": FIRST_TICKETS[s]},
                   "repeatClear": {"gold": FIRST_GOLD[s] // 4, "coralChance": 0.35, "coralPityEvery": 3, "tickets": 1},
                   "rewardIcons": ["gold", "coral", "tickets"]})
DUNGEON = {"version": 1, "dungeonName": "Hang Xoáy", "stages": stages, "floors": floors,
           "recCurve": {"formula": "recommendedCp(f) = round50(%g * %g^(f-1))" % (REC_BASE, REC_G)},
           "spawnPatterns": {
             "ring": "Rải đều trên vòng tròn tâm = vị trí thủ lĩnh, bán kính ngẫu nhiên trong ringSpawnRadius, kẹp trong phòng, cách hero >= spawnMinDistFromHero.",
             "front": "Cụm quái ở nửa trên phòng: x ngẫu nhiên [2, roomW-2], y ngẫu nhiên [14, roomH-2].",
             "waves": "Như ring nhưng mỗi nhóm xuất hiện sau delaySec tính từ lúc vào tầng.",
             "boss": "Boss xuất hiện tại (roomW/2, roomH-5), quay mặt về đội."},
           "runRule": "Một lượt = 5 tầng của một chặng, liên tiếp. Hết quái của tầng -> cửa ra hiện ở exitPos; thủ lĩnh chạm cửa (hoặc tự động sau 1.5 s nếu bật AUTO) -> tầng kế. Hết tầng boss -> thắng chặng."}
dump("dungeon.json", DUNGEON)
zone_rec = {}
for z, zm in FIELD_ZONE_MULT.items():
    mids = {"z1": ["cua_cat", "chuot_ben"], "z2": ["sua_nhay", "doi_hang"], "z3": ["nhen_ran", "ma_bien"]}[z]
    groups = [{"monster": mids[0], "count": 3}, {"monster": mids[1], "count": 3}]
    zone_rec[z] = r50(model.required_cp(groups, MONMAP, 3, zm, ABILITIES) * 1.0)
TUNING["world"]["zoneRecommendedCp"] = zone_rec
dump("skills.json", {"version": 1, "skills": skills_json})
dump("heroes.json", {"version": 1, "heroes": heroes_json})
dump("tuning.json", TUNING)
print("ok")

# ---------------------------------------------------------------- field layout
NODE_TYPES = {
 "tree_z1": {"resource": "wood", "durability": 6, "yieldPerHit": 2, "respawnSec": 30, "sprite": "urban:0260", "zone": "z1"},
 "tree_z2": {"resource": "wood", "durability": 6, "yieldPerHit": 2, "respawnSec": 30, "sprite": "urban:0291", "zone": "z2"},
 "tree_z3": {"resource": "wood", "durability": 8, "yieldPerHit": 2, "respawnSec": 30, "sprite": "urban:0346", "zone": "z3"},
 "rock_z1": {"resource": "ore", "durability": 6, "yieldPerHit": 1, "respawnSec": 45, "sprite": "composite:rock", "zone": "z1"},
 "rock_z2": {"resource": "ore", "durability": 5, "yieldPerHit": 2, "respawnSec": 45, "sprite": "composite:rock", "zone": "z2"},
 "rock_z3": {"resource": "ore", "durability": 7, "yieldPerHit": 2, "respawnSec": 45, "sprite": "composite:rock", "zone": "z3"},
}
ZONE_SPEC = {  # groves, trees per grove, rock clusters, rocks per cluster, camps [(monster,count)]
 "z1": dict(groves=5, tpg=5, rclus=4, rpc=4, camps=[("cua_cat", 4)] * 4 + [("chuot_ben", 4)] * 4),
 "z2": dict(groves=6, tpg=5, rclus=5, rpc=4, camps=[("sua_nhay", 4)] * 5 + [("doi_hang", 4)] * 5),
 "z3": dict(groves=6, tpg=5, rclus=6, rpc=4, camps=[("nhen_ran", 5)] * 6 + [("ma_bien", 4)] * 6 + [("cua_thep", 1)] * 2),
}
rng = random.Random(20261113)
ZBAND = {"z1": (11, 16.5), "z2": (18, 23.5), "z3": (25, 28.5)}
placed = []
def cheb(x, y): return max(abs(x - 30), abs(y - 30))
def free(x, y, d):
    return all((x - px) ** 2 + (y - py) ** 2 >= d * d for px, py in placed)
def pick(z, d, near=None, spread=2.5):
    lo, hi = ZBAND[z]
    for _ in range(5000):
        if near:
            x = near[0] + rng.uniform(-spread, spread); y = near[1] + rng.uniform(-spread, spread)
        else:
            x = rng.uniform(1.5, 58.5); y = rng.uniform(1.5, 58.5)
        x = round(x, 1); y = round(y, 1)
        if lo <= cheb(x, y) <= hi and free(x, y, d):
            placed.append((x, y)); return [x, y]
    if near:
        return pick(z, d, None)
    raise SystemExit("layout fail " + z)
layout = {"nodes": [], "camps": [], "signposts": []}
nid = 0
for z, sp in ZONE_SPEC.items():
    for g in range(sp["groves"]):
        c = pick(z, 3.0)
        for t in range(sp["tpg"]):
            p = c if t == 0 else pick(z, 1.4, c, 2.2)
            layout["nodes"].append({"id": "n%03d" % nid, "type": "tree_" + z, "pos": p}); nid += 1
    for g in range(sp["rclus"]):
        c = pick(z, 3.0)
        for t in range(sp["rpc"]):
            p = c if t == 0 else pick(z, 1.4, c, 2.0)
            layout["nodes"].append({"id": "n%03d" % nid, "type": "rock_" + z, "pos": p}); nid += 1
    for k, (mid, cnt) in enumerate(sp["camps"]):
        c = pick(z, 3.0)
        layout["camps"].append({"id": "c_%s_%02d" % (z, k), "zone": z, "monster": mid, "count": cnt, "pos": c,
                                "radius": 1.5, "respawnSec": 120 if mid == "cua_thep" else 20})
for z, (lo, hi) in ZBAND.items():
    layout["signposts"].append({"zone": z, "pos": [30, 30 + lo - 0.5], "recommendedCp": TUNING["world"]["zoneRecommendedCp"][z]})
layout["startPos"] = [30, 30]
layout["wipeRespawnPos"] = [30, 30]
layout["paths"] = [[[30, 20], [30, 2]], [[20, 30], [2, 30]], [[40, 30], [58, 30]], [[30, 40], [30, 58]]]
layout["pathNote"] = "Đường đất trang trí, rộng 1 ô, không ảnh hưởng luật."
dump("field-layout.json", {"version": 1, "nodeTypes": NODE_TYPES, **layout})
print("layout nodes", len(layout["nodes"]), "camps", len(layout["camps"]))

# ---------------------------------------------------------------- quests
Q = [
 ("gather", {"resource": "wood", "count": 10}, "Chặt cây lấy 10 gỗ", {"gold": 50}, "node:tree"),
 ("kill", {"monster": "cua_cat", "count": 3}, "Hạ 3 Cua Cát", {"meat": 15}, "camp:cua_cat"),
 ("hero_level", {"level": 2}, "Nâng một hero lên cấp 2", {"meat": 20}, "ui:hero_list"),
 ("build", {"building": "lumber_camp"}, "Xây: Trại Gỗ", {"wood": 40}, "ui:build_button"),
 ("gather", {"resource": "ore", "count": 10}, "Đập đá lấy 10 quặng", {"gold": 50}, "node:rock"),
 ("build", {"building": "tavern"}, "Xây: Quán Mỏ Neo", {"gold": 100}, "ui:build_button"),
 ("recruit", {"count": 1}, "Tuyển 1 hero ở Quán Mỏ Neo", {"wood": 50}, "building:tavern"),
 ("auto_assign", {}, "Mở Xếp đội và bấm TỰ XẾP", {"meat": 30}, "ui:squad_button"),
 ("kill", {"monster": "chuot_ben", "count": 5}, "Hạ 5 Chuột Bến", {"gold": 60}, "camp:chuot_ben"),
 ("build", {"building": "ore_mine"}, "Xây: Mỏ Quặng", {"ore": 30}, "ui:build_button"),
 ("collect", {"building": "lumber_camp", "count": 1}, "Thu gỗ ở Trại Gỗ", {"wood": 30}, "building:lumber_camp"),
 ("upgrade", {"building": "storage", "level": 2}, "Nâng Nhà Kho lên cấp 2", {"ore": 30}, "building:storage"),
 ("recruit", {"count": 2}, "Tuyển thêm 2 lượt", {"gold": 100}, "building:tavern"),
 ("hero_level", {"level": 5}, "Nâng một hero lên cấp 5", {"meat": 40}, "ui:hero_list"),
 ("build", {"building": "training_yard"}, "Xây: Sân Tập", {"ore": 40}, "ui:build_button"),
 ("training", {"count": 2}, "Mở 2 nấc ở Sân Tập", {"ore": 40}, "building:training_yard"),
 ("build", {"building": "market"}, "Xây: Chợ Bến", {"gold": 100}, "ui:build_button"),
 ("kill", {"zone": "z1", "count": 20}, "Hạ 20 quái ở Bãi Vỏ Sò", {"meat": 50}, "zone:z1"),
 ("build", {"building": "dungeon_gate"}, "Xây: Cổng Xoáy", {"gold": 100}, "ui:build_button"),
 ("clear_floor", {"floor": 1}, "Vượt tầng 1 Hang Xoáy", {"gold": 100}, "building:dungeon_gate"),
 ("clear_floor", {"floor": 5}, "Hạ boss tầng 5: Rương Nhai", {"tickets": 3}, "building:dungeon_gate"),
 ("slots", {"count": 4}, "Mở ô đội thứ 4 ở Sân Tập", {"wood": 200}, "building:training_yard"),
 ("upgrade", {"building": "lumber_camp", "level": 3}, "Nâng Trại Gỗ lên cấp 3", {"ore": 100}, "building:lumber_camp"),
 ("kill", {"monster": "sua_nhay", "count": 10}, "Hạ 10 Sứa Nhầy ở Rừng Dừa Rậm", {"meat": 80}, "camp:sua_nhay"),
 ("upgrade", {"building": "dungeon_gate", "level": 2}, "Nâng Cổng Xoáy lên cấp 2", {"gold": 150}, "building:dungeon_gate"),
 ("clear_floor", {"floor": 10}, "Hạ boss tầng 10: Cua Càng Thép Chúa", {"coral": 1}, "building:dungeon_gate"),
 ("hero_level", {"level": 10}, "Nâng một hero lên cấp 10", {"meat": 150}, "ui:hero_list"),
 ("upgrade", {"building": "tavern", "level": 2}, "Nâng Quán Mỏ Neo lên cấp 2", {"tickets": 5}, "building:tavern"),
 ("kill", {"monster": "doi_hang", "count": 20}, "Hạ 20 Dơi Hang", {"gold": 200}, "camp:doi_hang"),
 ("training", {"count": 30}, "Mở tổng cộng 30 nấc ở Sân Tập", {"ore": 300}, "building:training_yard"),
 ("upgrade", {"building": "storage", "level": 5}, "Nâng Nhà Kho lên cấp 5", {"wood": 400}, "building:storage"),
 ("clear_floor", {"floor": 15}, "Hạ boss tầng 15: Mắt Đá", {"coral": 2}, "building:dungeon_gate"),
 ("slots", {"count": 5}, "Mở ô đội thứ 5", {"tickets": 5}, "building:training_yard"),
 ("kill", {"monster": "nhen_ran", "count": 20}, "Hạ 20 Nhện Rạn ở Gò Đá Lam", {"meat": 200}, "camp:nhen_ran"),
 ("kill", {"monster": "cua_thep", "count": 1}, "Hạ Cua Càng Thép (quái tinh anh)", {"coral": 1}, "camp:cua_thep"),
 ("upgrade", {"building": "dungeon_gate", "level": 4}, "Nâng Cổng Xoáy lên cấp 4", {"gold": 300}, "building:dungeon_gate"),
 ("clear_floor", {"floor": 20}, "Hạ boss tầng 20: Rắn Biển Rạn", {"coral": 2}, "building:dungeon_gate"),
 ("hero_level", {"level": 20}, "Nâng một hero lên cấp 20", {"meat": 300}, "ui:hero_list"),
 ("slots", {"count": 6}, "Mở ô đội thứ 6", {"tickets": 10}, "building:training_yard"),
 ("clear_floor", {"floor": 25}, "Hạ boss tầng 25: Thuyền Trưởng Ma", {"coral": 3}, "building:dungeon_gate"),
 ("clear_floor", {"floor": 30}, "Hạ boss tầng 30: Vua Nhện Rạn", {"gold": 1000}, "building:dungeon_gate"),
]
quests = []
for i, (typ, params, text, reward, hint) in enumerate(Q):
    quests.append({"id": "q%02d" % (i + 1), "type": typ, "params": params, "text": text, "reward": reward, "hint": hint})
dump("quests.json", {"version": 1, "quests": quests,
     "endText": "Hoàn thành Chương 1! Cứ tiếp tục luyện đội.",
     "progressRule": "gather, kill, recruit, collect, auto_assign: đếm sự kiện xảy ra SAU khi nhiệm vụ được kích hoạt. build, upgrade, hero_level, clear_floor (tầng cao nhất đã vượt), slots (số ô đội hiện có), training (tổng số nấc đã mở): so trạng thái hiện tại, nên có thể xong ngay khi kích hoạt."})
print("quests", len(quests))
