"use client";

import * as React from "react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Input } from "@workspace/ui/components/ui/input";
import { Search, Plus, Trash2 } from "lucide-react";
import { useGraphStore, useGraphUIStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
import type { NodeSemantic, NodeSemanticId } from "@workspace/interfaces";

export interface SemanticListProps {
  onSelect: (semanticId: string) => void;
}

export function SemanticList({ onSelect }: SemanticListProps) {
  const [search, setSearch] = React.useState("");
  const nodeSemanticsMap = useGraphStore((state) => state.nodeSemantics);
  const openDialog = useGraphUIStore((state) => state.openNodeSemanticDialog);

  const nodeSemantics = React.useMemo(
    () => Array.from(nodeSemanticsMap.values()),
    [nodeSemanticsMap],
  );

  const filteredSemantics = React.useMemo(() => {
    if (!search.trim()) return nodeSemantics;
    const lower = search.toLowerCase();
    return nodeSemantics.filter(
      (s: NodeSemantic) =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower),
    );
  }, [nodeSemantics, search]);

  const handleSelect = (semanticId: string) => {
    onSelect(semanticId);
    setSearch("");
  };

  const handleDelete = async (e: React.MouseEvent, id: NodeSemanticId) => {
    e.stopPropagation();
    try {
      await GraphCQRS.deleteNodeSemantic(id);
    } catch (error) {
      console.error("Failed to delete node semantic:", error);
    }
  };

  return (
    <div className="w-64 p-2">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search semantic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredSemantics.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No semantics found
          </div>
        ) : (
          filteredSemantics.map((semantic: NodeSemantic) => (
            <DropdownMenuItem
              key={semantic.id}
              onSelect={() => handleSelect(semantic.id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md group"
            >
              {semantic.icon && (
                <span className="size-4 flex items-center justify-center">
                  {semantic.icon}
                </span>
              )}
              <span className="flex-1 truncate">{semantic.name}</span>
              {semantic.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {semantic.description}
                </span>
              )}
              <button
                onClick={(e) => handleDelete(e, semantic.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-sm transition-opacity"
              >
                <Trash2 className="size-3" />
              </button>
            </DropdownMenuItem>
          ))
        )}
      </div>
      <DropdownMenuSeparator className="my-1.5" />
      <DropdownMenuItem
        onSelect={() => {
          setSearch("");
          openDialog();
        }}
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md text-primary"
      >
        <Plus className="size-4" />
        <span>Add new type</span>
      </DropdownMenuItem>
    </div>
  );
}
