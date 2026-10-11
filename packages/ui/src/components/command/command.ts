import type { ReactNode } from "react";

export type CommandId = string;

export interface CommandFormContext {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandBase {
  id: CommandId;
  title: string;
  keywords: string[];
  icon?: "command";
}

export interface NoArgCommand extends CommandBase {
  requiresArgs: false;
  run: () => void;
}

export interface ArgCommand extends CommandBase {
  requiresArgs: true;
  renderForm: (ctx: CommandFormContext) => ReactNode;
}

export type Command = NoArgCommand | ArgCommand;
