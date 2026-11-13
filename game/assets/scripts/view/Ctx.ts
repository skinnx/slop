// What screens and panels get from GameView: the data source and navigation.
import type { Source, Cmd, CmdResult } from './model/Source';
import type { Panel } from './kit/Panel';

export interface Ctx {
  src: Source;
  /** Sends a command; on failure shows the reason as an error toast. Returns the result. */
  send(cmd: Cmd): CmdResult;
  open(p: Panel): void;
  close(p: Panel): void;
  closeAll(): void;
  /** Top-most open panel, if any. */
  top(): Panel | null;
}
