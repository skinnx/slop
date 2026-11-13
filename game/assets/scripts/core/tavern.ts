// Quán Mỏ Neo: tạo bộ thẻ và rút thẻ (01 mục 9). Hàm thuần, nhận RNG từ ngoài.
import { GameData, OddsRow, RARITIES, Rarity } from './data';
import { Rng } from './rng';

function rollRarity(rng: Rng, odds: OddsRow): Rarity {
  let r = rng.next();
  for (const rar of RARITIES) {
    r -= odds[rar];
    if (r < 0) return rar;
  }
  // sai số cộng dồn: lấy độ hiếm cuối cùng có tỉ lệ > 0
  for (let i = RARITIES.length - 1; i >= 0; i--) if (odds[RARITIES[i]] > 0) return RARITIES[i];
  return 'N';
}

/**
 * Tạo một bộ thẻ: mỗi thẻ tung độ hiếm theo `odds`, trong độ hiếm đó chọn hero theo trọng số
 * (chưa có = unownedWeight, đã có = ownedWeight), không trùng hero trong bộ. Độ hiếm hết hero thì tung lại.
 */
export function generateCards(data: GameData, rng: Rng, odds: OddsRow, owned: { [id: string]: boolean }): string[] {
  const rec = data.recruit;
  const cards: string[] = [];
  for (let c = 0; c < rec.cardCount; c++) {
    let picked = '';
    for (let tries = 0; tries < 200 && !picked; tries++) {
      const rar = rollRarity(rng, odds);
      let total = 0;
      for (const h of data.heroes) {
        if (h.rarity !== rar || cards.indexOf(h.id) >= 0) continue;
        total += owned[h.id] ? rec.ownedWeight : rec.unownedWeight;
      }
      if (total <= 0) continue; // độ hiếm này hết hero chưa dùng: tung lại
      let r = rng.next() * total;
      for (const h of data.heroes) {
        if (h.rarity !== rar || cards.indexOf(h.id) >= 0) continue;
        r -= owned[h.id] ? rec.ownedWeight : rec.unownedWeight;
        picked = h.id;
        if (r < 0) break;
      }
    }
    if (!picked) {
      // không thể xảy ra với dữ liệu đã kiểm tra; vẫn bảo đảm đủ thẻ
      for (const h of data.heroes) if (cards.indexOf(h.id) < 0) { picked = h.id; break; }
    }
    cards.push(picked);
  }
  return cards;
}

/** Một lượt tuyển: chọn đều 1 trong các thẻ. Trả về chỉ số thẻ. */
export function drawCardIndex(rng: Rng, cardCount: number): number {
  return rng.int(0, cardCount - 1);
}
