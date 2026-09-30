"use client";

/**
 * A kanban card: the visual body, and the draggable wrapper around it.
 *
 * The wrapper is where the two drag rules from `reui/kanban.tsx` are applied:
 *
 * - **The drag activator is the handle.** `KanbanItem` carries the ARIA
 *   attributes dnd-kit derives from `useSortable` (notably `tabIndex: 0`); the
 *   pointer/keyboard `listeners` live on `KanbanItemHandle`. Since a *nested*
 *   button (the card menu) cannot be excluded by dnd-kit's pointer sensor, the
 *   menu is rendered as a **sibling** of the handle, absolutely positioned over
 *   the card — a press on it never starts a drag, and a 10px press-and-move
 *   anywhere on the body still does.
 * - **A non-draggable board renders no handle at all** rather than `disabled`,
 *   because ReUI greys a disabled item out — and a read-only collection board
 *   should not look disabled, it simply cannot be dragged.
 *
 * The item's own `tabIndex` is dropped to `-1` so the card has a single tab
 * stop (the handle), which is also the element the keyboard sensor listens on.
 */
import { ExternalLink, MoreHorizontal, MoveRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";

import { KanbanItem, KanbanItemHandle } from "../reui/kanban";
import type { KanbanCard, KanbanCardField, KanbanLane } from "../core/board";

/** One extra field's value(s) on a card. */
function CardFieldRow({
  field,
  compact,
}: {
  field: KanbanCardField;
  compact: boolean;
}) {
  if (field.chips && field.chips.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {field.chips.map((chip) => (
          <span
            key={chip.optionId}
            title={`${field.name}：${chip.label}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: chip.color }}
            />
            <span className="truncate">{chip.label}</span>
          </span>
        ))}
      </div>
    );
  }

  // Compact cards drop the field name: the value alone keeps the card short.
  if (compact) {
    return (
      <p
        className="truncate text-[11px] text-muted-foreground"
        title={field.text}
      >
        {field.text}
      </p>
    );
  }

  return (
    <p className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="truncate text-muted-foreground">{field.name}</span>
      <span
        className="min-w-0 truncate text-right text-foreground/80 tabular-nums"
        title={field.text}
      >
        {field.text}
      </span>
    </p>
  );
}

/** The card's content box — also what the drag overlay renders. */
export function KanbanCardBody({
  card,
  compact,
  className,
}: {
  card: KanbanCard;
  compact: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-lg border border-border bg-card text-card-foreground shadow-xs transition-colors",
        compact ? "gap-1 p-2" : "gap-1.5 p-2.5",
        className,
      )}
    >
      <p
        className={cn(
          "pr-5 leading-snug font-medium",
          compact ? "text-xs" : "text-[13px]",
        )}
        title={card.title}
      >
        {card.title}
      </p>
      {card.fields.length > 0 && (
        <div className="flex flex-col gap-1">
          {card.fields.map((field) => (
            <CardFieldRow key={field.fieldId} field={field} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface KanbanCardItemProps {
  card: KanbanCard;
  compact: boolean;
  /** Drag is possible (editable select board, `allowDrag` on). */
  draggable: boolean;
  /** Lanes offered by 移动到; empty/absent removes the item. */
  moveTargets?: KanbanLane[];
  onOpen?: (card: KanbanCard) => void;
  onMove?: (card: KanbanCard, laneId: string) => void;
  /** Overlay sizing, applied by the drag preview. */
  className?: string;
}

export function KanbanCardItem({
  card,
  compact,
  draggable,
  moveTargets,
  onOpen,
  onMove,
  className,
}: KanbanCardItemProps) {
  const targets = moveTargets ?? [];
  const showMenu = Boolean(onOpen) || (Boolean(onMove) && targets.length > 0);
  const body = <KanbanCardBody card={card} compact={compact} />;

  const menu = showMenu ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`卡片操作：${card.title}`}
          className={cn(
            "absolute top-1 right-1 size-6 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
            // A touch/keyboard user has no hover, so the trigger is always there
            // on a coarse pointer or while focused.
            "pointer-coarse:opacity-100",
          )}
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {onOpen && (
          <DropdownMenuItem onSelect={() => onOpen(card)}>
            <ExternalLink className="size-4" />
            打开
          </DropdownMenuItem>
        )}
        {onOpen && onMove && targets.length > 0 && <DropdownMenuSeparator />}
        {onMove && targets.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MoveRight className="size-4" />
              移动到
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-44 overflow-y-auto">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                移动到泳道
              </DropdownMenuLabel>
              {targets.map((lane) => (
                <DropdownMenuItem
                  key={lane.id}
                  onSelect={() => onMove(card, lane.id)}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                  <span className="truncate">{lane.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (!draggable) {
    return (
      <div className={cn("group/card relative", className)}>
        {body}
        {menu}
      </div>
    );
  }

  return (
    <KanbanItem
      value={card.key}
      // One tab stop per card: the handle below, not the item wrapper.
      tabIndex={-1}
      className={cn("group/card relative", className)}
    >
      <KanbanItemHandle
        tabIndex={0}
        role="button"
        aria-label={`拖动卡片：${card.title}`}
        className="block cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        {body}
      </KanbanItemHandle>
      {menu}
    </KanbanItem>
  );
}
