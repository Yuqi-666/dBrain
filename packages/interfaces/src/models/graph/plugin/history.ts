import type { BasePluginOptions, Command } from "./common";

export interface HistoryOptions extends BasePluginOptions {
  type: "history";
  afterAddCommand?: (cmd: Command, revert: boolean) => void;
  beforeAddCommand?: (cmd: Command, revert: boolean) => boolean | void;
  executeCommand?: (cmd: Command) => void;
  stackSize?: number;
}
