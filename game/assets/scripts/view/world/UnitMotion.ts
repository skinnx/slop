// "Moves and attacks without animation frames" (04-placeholder-art.md section 2): one sprite per unit, moved,
// tilted, scaled and tinted from its state. Keeps only presentation state (timers, smoothed velocity) per unit id.
import { UnitV } from '../model/ViewModel';
import { isoX, isoY } from './Iso';
import type { WorldRenderer } from './WorldRenderer';

interface M {
  px: number; py: number; vx: number; vy: number; face: number;
  atkT: number; atkDx: number; atkDy: number; ranged: boolean;
  hitT: number; deadT: number; seen: boolean; last: UnitV | null;
}
export interface Pose { dx: number; dy: number; sx: number; sy: number; rot: number; face: number; alpha: number; flash: boolean; grey: boolean; weaponRot: number | null; }

const pose: Pose = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, face: 1, alpha: 1, flash: false, grey: false, weaponRot: null };

export class UnitMotion {
  private m = new Map<number, M>();
  private corpses: { u: UnitV; t0: number; face: number }[] = [];

  clear(): void { this.m.clear(); this.corpses.length = 0; }

  private get(id: number, u?: UnitV): M {
    let s = this.m.get(id);
    if (!s) {
      s = { px: u?.x ?? 0, py: u?.y ?? 0, vx: 0, vy: 0, face: 1, atkT: -9, atkDx: 0, atkDy: 0, ranged: false, hitT: -9, deadT: -9, seen: true, last: u ?? null };
      this.m.set(id, s);
    }
    return s;
  }

  attack(id: number, t: number, dx: number, dy: number, ranged: boolean): void {
    const s = this.get(id);
    s.atkT = t; s.atkDx = dx; s.atkDy = dy; s.ranged = ranged;
  }
  hit(id: number, t: number): void { this.get(id).hitT = t; }
  die(id: number, t: number): void { const s = this.get(id); if (s.deadT < 0) s.deadT = t; }

  /** Updates smoothed velocities; units that vanished after dying become 1 s corpses. */
  sync(units: UnitV[], t: number, dt: number): void {
    for (const s of this.m.values()) s.seen = false;
    for (const u of units) {
      const s = this.get(u.id, u);
      s.seen = true;
      if (dt > 0) {
        const k = Math.min(1, dt * 12);
        s.vx += ((u.x - s.px) / dt - s.vx) * k;
        s.vy += ((u.y - s.py) / dt - s.vy) * k;
      }
      s.px = u.x; s.py = u.y; s.last = u;
      if (u.act === 'dead' && s.deadT < 0) s.deadT = t;
      if (u.act !== 'dead' && s.deadT >= 0 && u.kind === 'hero') s.deadT = -9; // revived
    }
    for (const [id, s] of this.m) {
      if (s.seen) continue;
      if (s.deadT >= 0 && s.last && s.last.kind !== 'hero' && t - s.deadT < 1) this.corpses.push({ u: s.last, t0: s.deadT, face: s.face });
      this.m.delete(id);
    }
  }

  drawCorpses(r: WorldRenderer, t: number): void {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      const k = t - c.t0;
      if (k >= 1) { this.corpses.splice(i, 1); continue; }
      r.drawCorpse(c.u.art, c.u.tint, c.u.kind, c.u.x, c.u.y, 90 * c.face, 1 - k, c.face);
    }
  }

  pose(u: UnitV, t: number): Pose {
    const s = this.get(u.id, u);
    const p = pose;
    p.dx = 0; p.dy = 0; p.sx = 1; p.sy = 1; p.rot = 0; p.alpha = 1; p.flash = false; p.grey = false; p.weaponRot = null;
    const phase = u.id * 0.37;
    // Facing: screen-space velocity, threshold 0.05 cell/s; when attacking, face the target.
    const svx = isoX(s.vx, s.vy) / 60;
    if (u.tx !== undefined && (u.act === 'windup' || u.act === 'attack' || t - s.atkT < 0.3)) {
      const fx = isoX(u.tx, u.ty!) - isoX(u.x, u.y);
      if (Math.abs(fx) > 1) s.face = fx < 0 ? -1 : 1;
    } else if (Math.abs(svx) > 0.05) s.face = svx < 0 ? -1 : 1;
    p.face = s.face;

    if (u.act === 'dead' || s.deadT >= 0) {
      const k = Math.min(1, (t - s.deadT) / 0.2);
      p.rot = 90 * k * s.face;
      if (u.kind === 'hero') { p.grey = true; p.alpha = 0.7; } else { p.alpha = Math.max(0, 1 - (t - s.deadT)); }
      return p;
    }
    const speed = Math.hypot(s.vx, s.vy);
    const moving = u.act === 'move' || speed > 0.2;
    if (moving) {
      const hero = u.kind === 'hero';
      const f = hero ? 4 : 3, amp = hero ? 6 : 4;
      const w = Math.sin(2 * Math.PI * f * t + phase);
      p.dy = Math.abs(w) * amp;
      p.rot = -w * 6;
    } else {
      p.sy = 1 + 0.02 + 0.02 * Math.sin(2 * Math.PI * t + phase);
    }
    if (u.act === 'windup') {
      const ddx = isoX(u.tx ?? u.x, u.ty ?? u.y) - isoX(u.x, u.y), ddy = isoY(u.tx ?? u.x, u.ty ?? u.y) - isoY(u.x, u.y);
      const l = Math.hypot(ddx, ddy) || 1;
      p.dx -= (ddx / l) * 4; p.dy -= (ddy / l) * 4; p.sy = 0.92;
    }
    const at = t - s.atkT;
    if (at >= 0 && at < 0.16) {
      const ddx = isoX(s.atkDx, s.atkDy), ddy = isoY(s.atkDx, s.atkDy);
      const l = Math.hypot(ddx, ddy) || 1;
      if (s.ranged) {
        const k = at < 0.05 ? at / 0.05 : 1 - (at - 0.05) / 0.11;
        p.dx -= (ddx / l) * 6 * k; p.dy -= (ddy / l) * 6 * k;
      } else {
        const k = at < 0.06 ? at / 0.06 : 1 - (at - 0.06) / 0.1;
        p.dx += (ddx / l) * 20 * k; p.dy += (ddy / l) * 20 * k;
        if (at < 0.12) p.weaponRot = -60 + 120 * (at / 0.12);
      }
    }
    if (t - s.hitT < 0.1) p.flash = true;
    return p;
  }
}
