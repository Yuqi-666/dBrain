"use client";

import * as React from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Edit, Trash2 } from "lucide-react";

export interface GraphContextMenuEdgeProps {
  targetObj: { type: "node" | "edge"; id: string };
  onEditEdge?: (target: { type: "node" | "edge"; id: string }) => void;
  onDeleteEdge?: (target: { type: "node" | "edge"; id: string }) => void;
  onClose: () => void;
}

export function GraphContextMenuEdge({
  targetObj,
  onEditEdge,
  onDeleteEdge,
  onClose,
}: GraphContextMenuEdgeProps) {
  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          onEditEdge?.(targetObj);
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
          onDeleteEdge?.(targetObj);
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
