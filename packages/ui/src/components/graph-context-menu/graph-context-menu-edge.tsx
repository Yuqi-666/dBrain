"use client";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import type { EdgeId, EdgeDirection } from "@workspace/interfaces";
import { useGraphStore } from "@workspace/store";
import { EdgeSemanticList } from "@workspace/ui/components/list/edge/semantic-list";

function directionToFlags(direction: EdgeDirection): [boolean, boolean] {
  switch (direction) {
    case "forward":
      return [true, false];
    case "reverse":
      return [false, true];
    case "bidirectional":
      return [true, true];
    case "undirected":
      return [false, false];
  }
}

function flagsToDirection(showFromTo: boolean, showToFrom: boolean): EdgeDirection {
  if (showFromTo && showToFrom) return "bidirectional";
  if (showFromTo) return "forward";
  if (showToFrom) return "reverse";
  return "undirected";
}

export interface GraphContextMenuEdgeProps {
  edgeId: EdgeId;
  onDeleteEdge?: (edgeId: EdgeId) => void;
  onChangeEdgeDirection?: (edgeId: EdgeId, direction: EdgeDirection) => void;
  onChangeEdgeSemantic?: (edgeId: EdgeId, semanticId: string) => void;
  onClose: () => void;
}

export function GraphContextMenuEdge({
  edgeId,
  onDeleteEdge,
  onChangeEdgeDirection,
  onChangeEdgeSemantic,
  onClose,
}: GraphContextMenuEdgeProps) {
  const edge = useGraphStore((state) => state.edges.get(edgeId));
  const currentDirection = edge?.direction ?? "forward";
  const [showFromTo, showToFrom] = directionToFlags(currentDirection);

  const toggleFromTo = () => {
    const newDirection = flagsToDirection(!showFromTo, showToFrom);
    onChangeEdgeDirection?.(edgeId, newDirection);
  };

  const toggleToFrom = () => {
    const newDirection = flagsToDirection(showFromTo, !showToFrom);
    onChangeEdgeDirection?.(edgeId, newDirection);
  };

  const handleSemanticSelect = (semanticId: string) => {
    onChangeEdgeSemantic?.(edgeId, semanticId);
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
            <span className="text-sm">Semantic</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <EdgeSemanticList onSelect={handleSemanticSelect} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <div className="flex items-center gap-1">
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={toggleToFrom}
            className={`flex-1 flex items-center justify-center size-8 cursor-pointer rounded-md ${showToFrom
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-accent hover:text-accent-foreground"
              }`}
            title="Toggle to ← from arrow"
          >
            <ArrowLeft className="size-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={toggleFromTo}
            className={`flex-1 flex items-center justify-center size-8 cursor-pointer rounded-md ${showFromTo
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-accent hover:text-accent-foreground"
              }`}
            title="Toggle from → to arrow"
          >
            <ArrowRight className="size-4" />
          </DropdownMenuItem>
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          onDeleteEdge?.(edgeId);
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
