"use client";

import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import type { NodeDataType } from "@workspace/interfaces";
import { useUIStore } from "@workspace/store";
import { NodeDataTypeSelector } from "@workspace/ui/components/selector/node-data-type-selector";
import { NodeSemanticSelector } from "@workspace/ui/components/selector/node-semantic-selector";

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
  const openNodeSemanticDialog = useUIStore(
    (state) => state.openNodeSemanticDialog,
  );

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md">
        <Plus className="size-4" />
        <span>Add Node</span>
      </DropdownMenuSubTrigger>
      <NodeDataTypeSelector>
        {(nodeType) => (
          <DropdownMenuSubContent>
            <NodeSemanticSelector
              onSelect={(semanticId) => {
                onAddNode?.(nodeType, semanticId, simX, simY, viewId);
                onClose();
              }}
              onCreateRequest={() =>
                openNodeSemanticDialog(null, {
                  kind: "create",
                  nodeType,
                  simX,
                  simY,
                  viewId,
                })
              }
            />
          </DropdownMenuSubContent>
        )}
      </NodeDataTypeSelector>
    </DropdownMenuSub>
  );
}
