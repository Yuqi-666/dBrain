"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { SemanticList } from "@workspace/ui/components/list/node/semantic-list";
import { NODE_TYPE_LABELS } from "@workspace/ui/components/list/node/dataType-list";
import { Button } from "@workspace/ui/components/ui/button";
import { useGraph } from "@workspace/hooks";
import { useDataStore } from "@workspace/store";
import type { NodeDataType } from "@workspace/interfaces";
import { NODE_DATA_TYPES } from "@workspace/interfaces";

export interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNodeDialog({ open, onOpenChange }: AddNodeDialogProps) {
  const { onAddNode } = useGraph();
  const nodeSemanticsMap = useDataStore((state) => state.nodeSemantics);
  const [nodeType, setNodeType] = useState<NodeDataType | null>(null);
  const [semanticId, setSemanticId] = useState<string | null>(null);

  const semanticName = semanticId
    ? (nodeSemanticsMap.get(semanticId)?.name ?? null)
    : null;

  const handleConfirm = async () => {
    if (!nodeType || !semanticId) return;
    await onAddNode(nodeType, semanticId);
    setNodeType(null);
    setSemanticId(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNodeType(null);
    setSemanticId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
          <DialogDescription>
            Create a new node and pick its type and semantic.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Node Type
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start">
                  {nodeType ? NODE_TYPE_LABELS[nodeType] : "Select node type"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {NODE_DATA_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setNodeType(type);
                    }}
                  >
                    {NODE_TYPE_LABELS[type] || type}
                  </Button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Semantic
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-start">
                  {semanticName ?? "Select semantic"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-0">
                <SemanticList
                  onSelect={(id) => {
                    setSemanticId(id);
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={!nodeType || !semanticId} onClick={handleConfirm}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
