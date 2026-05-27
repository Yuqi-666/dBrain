"use client";

import * as React from "react";
import {
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Input } from "@workspace/ui/components/ui/input";
import { Search } from "lucide-react";
import { useGraphStore } from "@workspace/store";
import type { EdgeSemantic } from "@workspace/interfaces";

export interface EdgeSemanticListProps {
  onSelect: (semanticId: string) => void;
  onClose: () => void;
}

export function EdgeSemanticList({
  onSelect,
  onClose,
}: EdgeSemanticListProps) {
  const [search, setSearch] = React.useState("");
  const edgeSemanticsMap = useGraphStore((state) => state.edgeSemantics);

  const edgeSemantics = React.useMemo(
    () => Array.from(edgeSemanticsMap.values()),
    [edgeSemanticsMap],
  );

  const filteredSemantics = React.useMemo(() => {
    if (!search.trim()) return edgeSemantics;
    const lower = search.toLowerCase();
    return edgeSemantics.filter(
      (s: EdgeSemantic) =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower),
    );
  }, [edgeSemantics, search]);

  const handleSelect = (semanticId: string) => {
    onSelect(semanticId);
    onClose();
    setSearch("");
  };

  return (
    <DropdownMenuSubContent
      className="w-64 p-2"
      sideOffset={0}
      alignOffset={0}
    >
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
          filteredSemantics.map((semantic: EdgeSemantic) => (
            <DropdownMenuItem
              key={semantic.id}
              onClick={() => handleSelect(semantic.id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
            >
              {semantic.color && (
                <span
                  className="size-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: semantic.color }}
                />
              )}
              <span>{semantic.name}</span>
              {semantic.description && (
                <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                  {semantic.description}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </div>
    </DropdownMenuSubContent>
  );
}
