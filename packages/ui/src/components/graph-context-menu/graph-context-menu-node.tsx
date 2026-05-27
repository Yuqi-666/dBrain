"use client";

import * as React from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Edit, Trash2, Link2 } from "lucide-react";

export interface GraphContextMenuNodeProps {
  nodeId: string;
  onEditNode?: (id: string) => void;
  onAddEdge?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onClose: () => void;
}

export function GraphContextMenuNode({
  nodeId,
  onEditNode,
  onAddEdge,
  onDeleteNode,
  onClose,
}: GraphContextMenuNodeProps) {
  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          onEditNode?.(nodeId);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
      >
        <Edit className="size-4" />
        <span>Edit</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          onAddEdge?.(nodeId);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
      >
        <Link2 className="size-4" />
        <span>Connect To</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          onDeleteNode?.(nodeId);
          onClose();
        }}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md"
      >
        <Trash2 className="size-4" />
        <span>Delete</span>
      </DropdownMenuItem>
    </>
  );
}
