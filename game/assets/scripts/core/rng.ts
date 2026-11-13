// Bộ sinh số ngẫu nhiên có seed (mulberry32). Lõi không bao giờ dùng Math.random.

export class Rng {
  state: number;
  constructor(seed: number) { this.state = seed >>> 0; }

  /** Số thực đều trong [0, 1). */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Số thực đều trong [a, b). */
  range(a: number, b: number): number { return a + (b - a) * this.next(); }
  /** Số nguyên đều trong [a, b] (gồm cả hai đầu). */
  int(a: number, b: number): number { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p: number): boolean { return this.next() < p; }
}

/** Trộn hai số nguyên thành một seed 32 bit (seed con cho mỗi lượt dungeon). */
export function hashSeed(a: number, b: number): number {
  let h = (a ^ 0x9E3779B9) >>> 0;
  h = Math.imul(h ^ (b + 0x7F4A7C15), 0x85EBCA6B) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xC2B2AE35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
