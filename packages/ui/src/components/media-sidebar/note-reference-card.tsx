"use client";

/**
 * A 节点引用 card: a note that points at a graph node instead of holding its own
 * content.
 *
 * The card is the reference and nothing else — the node's icon, its name, and
 * the way out. The rich-text draft the reference was made from stays on the
 * record (`TimestampNoteData.content`) but is not drawn: showing a body beside a
 * node would ask which of the two is the note. 「取消引用」 is therefore the only
 * decision on the card, and it removes the note from the timeline entirely (the
 * node it pointed at is untouched — the note was a pointer, the node is the
 * content).
 *
 * The node is read from the **store**, not carried on the note: a reference is
 * an id, so the name, the icon and even the node type have to be looked up at
 * render time — and that lookup is also what makes a renamed or restyled node
 * show through immediately. A reference to a node that is gone is a state the
 * card has to render, not an invariant to assume: it prints 「节点已删除」 instead
 * of an empty row.
 */
import { FileText, Unlink } from "lucide-react";

import { useDataStore } from "@workspace/store";

import { Button } from "@workspace/ui/components/ui/button";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/ui/tooltip";

import type { MediaController } from "../media-player/types";

import { NoteCardShell } from "./note-card-shell";

export interface NoteReferenceCardProps {
  noteId: string;
  /** The referenced node's id (`note.nodeId`). */
  nodeId: string;
  timeMs: number;
  controller: MediaController | null;
  focused: boolean;
  onLocate: () => void;
  /** Open the node's editor page. */
  onOpenNode: () => void;
  /** 「取消引用」 — removes this note (the node itself stays). */
  onUnreference: () => void;
  cardRef?: (element: HTMLDivElement | null) => void;
}

export function NoteReferenceCard({
  noteId,
  nodeId,
  timeMs,
  controller,
  focused,
  onLocate,
  onOpenNode,
  onUnreference,
  cardRef,
}: NoteReferenceCardProps) {
  const node = useDataStore((state) => state.getNode(nodeId));
  const TypeIcon = node ? NODE_TYPE_ICONS[node.nodeType] : FileText;
  const title = node?.title?.trim() || "未命名节点";

  return (
    <NoteCardShell
      noteId={noteId}
      timeMs={timeMs}
      disabled={!controller}
      focused={focused}
      onLocate={onLocate}
      cardRef={cardRef}
      header={
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <NodeIconView
            icon={node?.icon ?? undefined}
            fallback={
              <TypeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            }
            className="size-4 shrink-0 text-muted-foreground"
          />
          {node ? (
            <button
              type="button"
              onClick={onOpenNode}
              aria-label={`打开节点 ${title}`}
              title="打开节点"
              className="min-w-0 truncate rounded-sm text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
            </button>
          ) : (
            <span className="min-w-0 truncate text-sm text-muted-foreground italic">
              节点已删除
            </span>
          )}
        </span>
      }
      actions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onUnreference}
              aria-label="取消引用"
            >
              <Unlink aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">取消引用</TooltipContent>
        </Tooltip>
      }
    />
  );
}
