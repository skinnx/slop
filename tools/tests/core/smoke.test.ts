import { describe, it, expect } from 'vitest';
import { newGame, teleport } from './helpers';

describe('smoke', () => {
  it('a new game starts in the village with Bàng and a storage', () => {
    const t = newGame();
    const g = t.game;
    expect(g.mode).toBe('world');
    expect(g.squad).toEqual(['bang']);
    expect(g.squadCp).toBe(1340);
    expect(g.resources.gold).toBe(100);
    expect(g.buildings.length).toBe(1);
    expect(g.buildings[0].type).toBe('storage');
    expect(g.leaderZone).toBe('village');
    expect(g.field.leader!.x).toBe(30);
    t.step(300);
    expect(g.tick).toBe(300);
  });

  it('the squad gathers wood from a tree when standing still next to it', () => {
    const t = newGame();
    const g = t.game;
    const tree = g.field.nodes.find((n) => n.kind === 'tree')!;
    teleport(g, tree.x + 1, tree.y);
    t.stepSec(30); // có một ổ chuột ngay cạnh: đội hạ chuột trước rồi mới chặt cây
    expect(g.resources.wood).toBeGreaterThan(0);
    expect(g.resources.wood).toBeGreaterThanOrEqual(6);
  });

  it('the squad kills a crab camp and gets meat and exp', () => {
    const t = newGame();
    const g = t.game;
    const camp = g.field.camps.find((c) => c.monsterId === 'cua_cat')!;
    teleport(g, camp.x + 2, camp.y);
    t.stepSec(40);
    expect(g.resources.meat).toBeGreaterThan(0);
    expect(g.player.level).toBeGreaterThan(1);
  });
});
