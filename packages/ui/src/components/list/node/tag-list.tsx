"use client";

import * as React from "react";
import { useGraphStore } from "@workspace/store";
import type { NodeTag, NodeTagId } from "@workspace/interfaces";
import {
  Popover,
  PopoverContent,
} from "@workspace/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command";
import { CheckIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface TagListProps {
  appliedTagIds: NodeTagId[];
  onToggleTag: (tagId: NodeTagId) => void;
  onDeleteTag: (tagId: NodeTagId) => void;
  onCreateTag: (name: string) => Promise<NodeTag | null>;
}

export function TagList({
  appliedTagIds,
  onToggleTag,
  onDeleteTag,
  onCreateTag,
}: TagListProps) {
  const [search, setSearch] = React.useState("");
  const nodeTagsMap = useGraphStore((state) => state.nodeTags);
  const allTags = React.useMemo(
    () => Array.from(nodeTagsMap.values()),
    [nodeTagsMap],
  );

  const filteredTags = React.useMemo(() => {
    return allTags.filter(
      (tag) =>
        !appliedTagIds.includes(tag.id) &&
        tag.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allTags, appliedTagIds, search]);

  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === search.toLowerCase(),
  );

  const handleCreateAndApply = async () => {
    if (!search.trim()) return;
    const newTag = await onCreateTag(search.trim());
    if (newTag) {
      onToggleTag(newTag.id);
    }
    setSearch("");
  };

  return (
    <PopoverContent className="w-64 p-0" align="start">
      <Command>
        <CommandInput
          placeholder="搜索或创建标签..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
            {search ? (
              <span>按 Enter 创建 "{search}"</span>
            ) : (
                <span>无匹配标签</span>
              )}
            </CommandEmpty>
            {filteredTags.length > 0 && (
              <CommandGroup heading="可用标签">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.id}
                    onSelect={() => {
                      onToggleTag(tag.id);
                      setSearch("");
                    }}
                    className="flex items-center gap-2"
                  >
                    {tag.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    <span className="flex-1">{tag.name}</span>
                    <CheckIcon className="size-3 opacity-0 group-selected:opacity-100" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTag(tag.id);
                      }}
                      className="rounded-sm p-0.5 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search &&
              !exactMatch && (
                <CommandGroup heading="创建">
                  <CommandItem
                    value={`__create__${search}`}
                    onSelect={handleCreateAndApply}
                    className="flex items-center gap-2"
                  >
                    <Plus className="size-3" />
                    <span>创建 "{search}"</span>
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
  );
}

export function TagPill({
  tag,
  tagId,
  onRemove,
}: {
  tag?: NodeTag;
  tagId: NodeTagId;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
        "bg-muted/80 hover:bg-muted transition-all",
        "ring-1 ring-transparent hover:ring-destructive/20 cursor-default"
      )}
    >
      {tag?.color && (
        <div
          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: tag.color }}
        />
      )}
      <span className="font-medium">{tag?.name || tagId}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "ml-0.5 rounded-full p-0.5",
          "opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive",
          "transition-all"
        )}
        aria-label={`Remove ${tag?.name || tagId}`}
      >
        <Trash2 className="size-3" />
      </button>
    </span>
  );
}
