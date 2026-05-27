"use client";

import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import type { NodeDataType } from "@workspace/interfaces";
import { DataTypeList } from "../list/node/dataType-list";
import { SemanticList } from "../list/node/semantic-list";

export interface GraphContextMenuCanvasProps {
  onAddNode?: (nodeType: NodeDataType, semanticId: string) => void;
  onClose: () => void;
}

export function GraphContextMenuCanvas({
  onAddNode,
  onClose,
}: GraphContextMenuCanvasProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md">
        <Plus className="size-4" />
        <span>Add Node</span>
      </DropdownMenuSubTrigger>
      <DataTypeList>
        {(nodeType) => (
          <SemanticList
            onSelect={(semanticId) => {
              onAddNode?.(nodeType, semanticId);
            }}
            onClose={onClose}
          />
        )}
      </DataTypeList>
    </DropdownMenuSub>
  );
}
