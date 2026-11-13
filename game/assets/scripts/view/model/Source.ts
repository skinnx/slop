// What the view asks of the game. Two implementations:
//   CoreSource    - binds to the core (game/assets/scripts/core): real state, real rules.
//   StandInSource - fixed stand-in data for layout work and screenshots; contains NO game rules.
import {
  Mode, WorldV, FieldHudV, DungeonHudV, ViewEvent, BuildingPanelV, TavernV, RevealV, HeroCardV, HeroDetailV, SquadV,
  TrainingV, GateV, ResultV, BuildModeV, WelcomeV, SettingsV,
} from './ViewModel';
import type { RenderCfg } from '../world/WorldRenderer';

export type Cmd =
  | { t: 'title' }
  | { t: 'joystick'; x: number; y: number }
  | { t: 'portal' }
  | { t: 'enterBuild' } | { t: 'exitBuild' }
  | { t: 'place'; type: string; x: number; y: number }
  | { t: 'move'; uid: number; x: number; y: number }
  | { t: 'upgrade'; uid: number } | { t: 'cancelJob'; uid: number } | { t: 'collect'; uid: number }
  | { t: 'recruit'; count: number } | { t: 'refreshCards' } | { t: 'exchange'; id: string; heroId?: string }
  | { t: 'heroLevelUp'; id: string }
  | { t: 'squadAdd'; id: string } | { t: 'squadRemove'; id: string } | { t: 'squadSwap'; a: number; b: number } | { t: 'squadReplace'; slot: number; id: string }
  | { t: 'autoAssign' }
  | { t: 'trainingUnlock'; index: number } | { t: 'slotUnlock'; slot: number }
  | { t: 'enterDungeon'; stage: number } | { t: 'setAuto'; on: boolean } | { t: 'pause'; on: boolean } | { t: 'leaveDungeon' }
  | { t: 'resultContinue' }
  | { t: 'claimQuest' } | { t: 'guide' }
  | { t: 'setting'; key: 'music' | 'sfx'; on: boolean } | { t: 'resetSave' }
  | { t: 'collectAll' };

export interface CmdResult { ok: boolean; reason?: string; }

export interface Source {
  /** Short name for the debug object ('core' or 'stand-in'). */
  readonly kind: string;
  render(): RenderCfg;
  /** Advances the game by dt seconds of real time (fixed-step inside the core). */
  tick(dt: number): void;
  mode(): Mode;
  world(): WorldV;
  fieldHud(): FieldHudV;
  dungeonHud(): DungeonHudV;
  /** One-shot events since the last call. */
  drainEvents(): ViewEvent[];
  send(cmd: Cmd): CmdResult;

  // Queries used by panels (called when a panel opens and after each command it sends).
  building(uid: number): BuildingPanelV | null;
  buildingAt(x: number, y: number): number | null;
  tavern(): TavernV;
  lastReveal(): RevealV | null;
  heroes(): HeroCardV[];
  hero(id: string): HeroDetailV | null;
  squad(): SquadV;
  training(): TrainingV;
  gate(stage: number | null): GateV;
  result(): ResultV | null;
  buildMode(): BuildModeV;
  /** Validity of a footprint at cell (x, y) for a new building of `type` or for moving building `uid`. */
  canPlace(type: string, x: number, y: number, uid: number | null): CmdResult;
  /** Free cell nearest to (x, y) where `type` fits, or null when the village is full. */
  nearestFree(type: string, x: number, y: number): { x: number; y: number } | null;
  /** Target of the magnifier/guide (quest hint). */
  questHint(): { kind: 'world' | 'ui' | 'none'; x: number; y: number; ui: string };
  welcome(): WelcomeV | null;
  settings(): SettingsV;
  /** Free-form state for the harness debug object. */
  debug(): Record<string, unknown>;
}
