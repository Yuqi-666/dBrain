"use client";
import { translate } from "@workspace/ui/lib/i18n/runtime";

import type { Command } from "./command";
import { AddNodeDialog } from "@workspace/ui/components/dialog/add-node-dialog";

export const addNodeCommand: Command = {
  id: "add-node",
  get title() {
    return translate("Add Node");
  },
  keywords: ["add", "node", "create", "new"],
  requiresArgs: true,
  renderForm: (ctx) => (
    <AddNodeDialog open={ctx.open} onOpenChange={ctx.onOpenChange} />
  ),
};
