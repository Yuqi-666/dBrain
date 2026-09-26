"use client";

import * as React from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Edit, Trash2, Link2 } from "lucide-react";
import { useDataStore, useUIStore } from "@workspace/store";
import { SemanticList } from "@workspace/ui/components/menu/node/semantic-list";

export interface GraphContextMenuNodeProps {
  nodeId: string;
  onEditNode?: (id: string) => void;
  onStartAddEdge?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onChangeNodeSemantic?: (nodeId: string, semanticId: string) => void;
  onClose: () => void;
}

export function GraphContextMenuNode({
  nodeId,
  onEditNode,
  onStartAddEdge,
  onDeleteNode,
  onChangeNodeSemantic,
  onClose,
}: GraphContextMenuNodeProps) {
  const node = useDataStore((state) => state.nodes.get(nodeId));
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const openNodeSemanticDialog = useUIStore(
    (state) => state.openNodeSemanticDialog,
  );
  const currentSemantic = node?.semanticId ? nodeSemantics.get(node.semanticId) : undefined;

  const handleSemanticSelect = (semanticId: string) => {
    onChangeNodeSemantic?.(nodeId, semanticId);
    onClose();
  };

  return (
    <>
      <div className="flex flex-col gap-1 px-2 py-1.5">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
            onClick={(e) => e.preventDefault()}
          >
            {currentSemantic ? (
              <>
                {currentSemantic.color && (
                  <span
                    className="size-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentSemantic.color }}
                  />
                )}
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {currentSemantic.name}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">请选择类型</span>
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <SemanticList
              onSelect={handleSemanticSelect}
              onCreateRequest={() =>
                openNodeSemanticDialog(null, { kind: "assign", nodeId })
              }
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </div>
      <DropdownMenuSeparator />
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
        onSelect={(e) => {
          e.preventDefault();
          onStartAddEdge?.(nodeId);
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
