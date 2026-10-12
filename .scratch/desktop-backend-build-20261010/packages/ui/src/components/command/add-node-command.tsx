"use client";

import type { Command } from "./command";
import { AddNodeDialog } from "@workspace/ui/components/dialog/add-node-dialog";

export const addNodeCommand: Command = {
  id: "add-node",
  title: "Add Node",
  keywords: ["add", "node", "create", "new"],
  requiresArgs: true,
  renderForm: (ctx) => (
    <AddNodeDialog open={ctx.open} onOpenChange={ctx.onOpenChange} />
  ),
};
