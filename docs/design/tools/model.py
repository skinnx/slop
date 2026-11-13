"""Mô hình giải tích chiến đấu dùng chung cho build_data.py và check.py.
Không phải mô phỏng thời gian thực; chỉ ước lượng bậc độ lớn để đặt số."""
import math

ATT_SHARE = 0.45      # tỉ lệ CP nằm ở phần tấn công của một đội điển hình
HP_SHARE = 0.55
SKILL_DPS = 1.25      # kỹ năng cộng thêm ~25% sát thương
EFF = 0.75            # hiệu suất (di chuyển, đánh thừa, đổi mục tiêu)
WIN_HP_FRACTION = 0.6 # đội "đủ mạnh" nếu tổng sát thương nhận <= 60% tổng HP
SLAM_DODGE = 0.6      # tỉ lệ đòn Đập Đất người chơi/bot né được
EXPECTED_SLOTS = {1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8}

def squad_dps(C):
    return ATT_SHARE * C / 4.0 * SKILL_DPS

def squad_hp(C):
    return HP_SHARE * C

def engaged_cap(n):
    return 4 + 3 * n

def mob_damage(N, h, a_dps, C, n):
    """Sát thương đội nhận khi giết N quái (máu h, dps a_dps mỗi con)."""
    if N <= 0: return 0.0, 0.0
    D = squad_dps(C) * EFF
    T = N * h / D
    E = min(N, engaged_cap(n))
    dmg = a_dps * E * T * (1 - E / (2.0 * N))
    return dmg, T

def floor_K(groups, monsters, n, M, abilities):
    """Trả về sát thương nhận ở C=1 với hệ số M (để tỉ lệ)."""
    return floor_damage(groups, monsters, n, M, abilities, 1.0)[0]

def floor_damage(groups, monsters, n, M, abilities, C):
    mobs = [g for g in groups if monsters[g["monster"]]["kind"] != "boss"]
    bosses = [g for g in groups if monsters[g["monster"]]["kind"] == "boss"]
    N = sum(g["count"] for g in mobs)
    if N:
        h = sum(monsters[g["monster"]]["baseHp"] * g["count"] for g in mobs) / N * M
        a = sum(monsters[g["monster"]]["baseAtk"] / monsters[g["monster"]]["attackInterval"] * g["count"] for g in mobs) / N * M
        dmg, T = mob_damage(N, h, a, C, n)
    else:
        dmg, T = 0.0, 0.0
    for g in bosses:
        b = monsters[g["monster"]]
        hp = b["baseHp"] * M; atk = b["baseAtk"] * M
        Tb = hp / (squad_dps(C) * 0.85)
        dps = atk / b["attackInterval"]
        if "slam" in b.get("abilities", []):
            s = abilities["slam"]; dps += atk * s["mult"] * min(n, 4) / s["cooldownSec"] * (1 - SLAM_DODGE)
        if "charge" in b.get("abilities", []):
            c = abilities["charge"]; dps += atk * c["mult"] * 2 / c["cooldownSec"] * (1 - SLAM_DODGE)
        dmg += dps * Tb
        T += Tb
    return dmg, T

def required_cp(groups, monsters, n, M, abilities):
    """CP nhỏ nhất để dmg <= WIN_HP_FRACTION * HP. dmg tỉ lệ 1/C, HP tỉ lệ C."""
    K = floor_damage(groups, monsters, n, M, abilities, 1.0)[0]  # dmg*C
    return math.sqrt(K / (WIN_HP_FRACTION * HP_SHARE))

def solve_M(groups, monsters, n, target_cp, abilities):
    # required_cp tỉ lệ tuyến tính với M
    r1 = required_cp(groups, monsters, n, 1.0, abilities)
    return target_cp / r1

def clear_time(groups, monsters, n, M, abilities, C):
    return floor_damage(groups, monsters, n, M, abilities, C)[1]
