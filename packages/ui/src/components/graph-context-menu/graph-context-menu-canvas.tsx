"use client";

import * as React from "react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Input } from "@workspace/ui/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useGraphStore } from "@workspace/store";
import type { NodeDataType, NodeSemantic } from "@workspace/interfaces";
import { NODE_DATA_TYPES } from "@workspace/interfaces";

export interface GraphContextMenuCanvasProps {
  onAddNode?: (nodeType: NodeDataType, semanticId: string) => void;
  onClose: () => void;
}

const NodeTypeLabel: Record<string, string> = {
  text: "Text",
  image: "Image",
  pdf: "PDF",
  video: "Video",
  audio: "Audio",
  webpage: "Webpage",
  website: "Website",
  collection: "Collection",
  "rich-text": "Rich Text",
};

interface SemanticSubMenuProps {
  nodeType: NodeDataType;
  onAddNode: (nodeType: NodeDataType, semanticId: string) => void;
  onClose: () => void;
}

function SemanticSubMenu({ nodeType, onAddNode, onClose }: SemanticSubMenuProps) {
  const [search, setSearch] = React.useState("");
  const nodeSemanticsMap = useGraphStore((state) => state.nodeSemantics);

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
    onAddNode(nodeType, semanticId);
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
          filteredSemantics.map((semantic: NodeSemantic) => (
            <DropdownMenuItem
              key={semantic.id}
              onClick={() => handleSelect(semantic.id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
            >
              {semantic.icon && (
                <span className="size-4 flex items-center justify-center">
                  {semantic.icon}
                </span>
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
      <DropdownMenuSubContent className="w-48" sideOffset={0} alignOffset={0}>
        {NODE_DATA_TYPES.map((type) => (
          <DropdownMenuSub key={type}>
            <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md">
              <span>{NodeTypeLabel[type] || type}</span>
            </DropdownMenuSubTrigger>
            <SemanticSubMenu
              nodeType={type}
              onAddNode={onAddNode!}
              onClose={onClose}
            />
          </DropdownMenuSub>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
