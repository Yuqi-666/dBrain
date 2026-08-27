import type { Command, CommandId } from "./command";
import { addNodeCommand } from "./add-node-command";

export const COMMANDS: Command[] = [addNodeCommand];

export function getCommand(id: CommandId): Command | undefined {
  return COMMANDS.find((command) => command.id === id);
}
