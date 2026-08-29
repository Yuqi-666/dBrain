"use client";

import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import type { NodeDataType } from "@workspace/interfaces";
import { DataTypeList } from "@workspace/ui/components/menu/node/dataType-list";
import { SemanticList } from "@workspace/ui/components/menu/node/semantic-list";

export interface GraphContextMenuCanvasProps {
  onAddNode?: (nodeType: NodeDataType, semanticId: string, simX?: number, simY?: number, viewId?: string) => void;
  simX?: number;
  simY?: number;
  viewId?: string;
  onClose: () => void;
}

export function GraphContextMenuCanvas({
  onAddNode,
  simX,
  simY,
  viewId,
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
          <DropdownMenuSubContent>
            <SemanticList
              onSelect={(semanticId) => {
                onAddNode?.(nodeType, semanticId, simX, simY, viewId);
                onClose();
              }}
            />
          </DropdownMenuSubContent>
        )}
      </DataTypeList>
    </DropdownMenuSub>
  );
}
