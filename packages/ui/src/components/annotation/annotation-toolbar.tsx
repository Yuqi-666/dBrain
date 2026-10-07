"use client";

/**
 * L3 of the annotation stack — the toolbar (design §1.2 / §2).
 *
 * Three things are load-bearing here and easy to undo by accident:
 *
 * 1. **It is presentational.** Every value arrives as a prop and every change
 *    leaves as a callback; the one piece of local state is the two-stage
 *    confirmation of 清除 (design §2.1 allows an `AlertDialog` "或两段式按钮"
 *    and this repo has no `alert-dialog` primitive). It never reads the store
 *    and never learns whether its host is an image or a pdf.
 * 2. **The scoped `TooltipProvider` is not optional.** Radix's tooltip context
 *    has no default value, so a `<Tooltip>` without a provider throws and takes
 *    the whole subtree down with it; nothing in this repository mounts a
 *    provider at the root (the same note lives on `dynamic-island/nav.tsx`).
 * 3. **The DOM anchors are a contract.** `data-annotation-*` below is what the
 *    automated probes query (`docs/plan/annotation.md` §M5), so the attribute
 *    names and the tool values are spelled out rather than derived.
 *
 * **P0 ships 笔 + 橡皮 only** (R20): the rest of design §2.1's tool table
 * (荧光笔 / 套索 / 文本框 / 箭头 / 矩形·椭圆) is M7, and a button that draws
 * nothing would be worse than no button. The tooltip text still documents the
 * shortcuts the layer registers, because the layer already registers them.
 *
 * `readOnly` does not reach this file: `annotation-layer.tsx` renders no
 * toolbar at all in that mode (design §2.4), so there is no hidden variant to
 * keep in sync here.
 */
import * as React from "react";
import {
  Check,
  Ellipsis,
  Eraser,
  Eye,
  EyeOff,
  Pen,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";

import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { Separator } from "@workspace/ui/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import type { AnnotationTool, AnnotationToolbarProps } from "./types";
import {
  ANNOTATION_COLORS,
  ANNOTATION_SIZES,
  DEFAULT_ANNOTATION_SIZE,
} from "./types";

/**
 * 32×32 under a mouse, ≥44×44 where the pointer is a finger (WCAG 2.2 §2.5.8).
 * `pointer-coarse` is a Tailwind v4.1 built-in variant, so the growth is a
 * stylesheet decision rather than a JS media query.
 */
const HIT_AREA = "size-8 pointer-coarse:size-11";

/**
 * The same box for a `ToggleGroupItem`, whose base variant also sets `h-9`,
 * `min-w-9` and `px-2` — `size-8` only covers `h`/`w`, so the minimum and the
 * padding have to be named as well or the item keeps its 36px floor.
 */
const TOGGLE_HIT_AREA =
  "size-8 min-w-8 p-0 pointer-coarse:size-11 pointer-coarse:min-w-11";

/**
 * The **selected** state, styled from `aria-pressed` rather than `data-state`.
 *
 * Every item in this toolbar is wrapped in `TooltipTrigger asChild`, and Radix's
 * tooltip writes its own `data-state` (`"closed"` / `"delayed-open"` /
 * `"instant-open"`) onto that same element, landing *after* the toggle's
 * `data-state="on"` and winning — measured in the browser: a selected tool reports
 * `data-state="instant-open"`, so `data-[state=on]:bg-accent` (and the base
 * variant's `data-[state=on]:bg-muted`) never matches and the current tool was
 * indistinguishable from the other one (reported at G5). `aria-pressed` is set by
 * us, is what a screen reader announces, and the tooltip does not touch it.
 */
const SELECTED_AREA = "aria-pressed:bg-accent aria-pressed:text-foreground";

/**
 * The nib row inside the 更多 menu (compact only) is a menu *body*, not an icon
 * strip, so it is allowed to be wider than the 32px square above — but it keeps
 * the same 44px floor for a coarse pointer.
 */
const TOGGLE_MENU_AREA =
  "h-8 min-w-11 px-2 pointer-coarse:h-11 pointer-coarse:min-w-12";

const TOOL_LABEL: Record<AnnotationTool, string> = {
  pen: "笔",
  eraser: "橡皮",
};

/** The keys `annotation-layer.tsx` listens for, printed in the tooltip. */
const TOOL_SHORTCUT: Record<AnnotationTool, readonly string[]> = {
  pen: ["P", "1"],
  eraser: ["E", "3"],
};

const SIZE_LABEL: readonly string[] = ["细", "中", "粗"];
const SIZE_DOT: readonly string[] = ["size-1.5", "size-2", "size-2.5"];

/** How long 清除 waits for its second click before forgetting the first. */
const CLEAR_CONFIRM_MS = 3_000;

/** The nib's index, with an unknown prop falling back to the default nib. */
function sizeIndexOf(size: number): number {
  const index = ANNOTATION_SIZES.indexOf(size);
  if (index !== -1) return index;
  return Math.max(0, ANNOTATION_SIZES.indexOf(DEFAULT_ANNOTATION_SIZE));
}

function Shortcut({ keys }: { keys: readonly string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((key) => (
        <kbd
          key={key}
          data-slot="kbd"
          className="bg-background/20 px-1 text-[10px]"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

interface ToolbarButtonProps extends React.ComponentProps<typeof Button> {
  /** Accessible name, and the tooltip's title. */
  label: string;
  /** Shortcuts the layer registers for this action. */
  shortcut?: readonly string[];
}

/** An icon button that always carries its own tooltip and hit area. */
function ToolbarButton({
  label,
  shortcut,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn(HIT_AREA, className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        <span>{label}</span>
        {shortcut ? <Shortcut keys={shortcut} /> : null}
      </TooltipContent>
    </Tooltip>
  );
}

interface SizeToggleGroupProps {
  /** The nib currently selected, by index into {@link ANNOTATION_SIZES}. */
  sizeIndex: number;
  onSizeChange: (size: number) => void;
  /**
   * Rendered inside the 更多 menu. The anchors are identical either way — only
   * the box and the tooltips change, because a tooltip inside an open menu is
   * noise and the row is not a menu item.
   */
  inMenu?: boolean;
}

/** The three nib widths, the one control that has to appear in both layouts. */
function SizeToggleGroup({
  sizeIndex,
  onSizeChange,
  inMenu = false,
}: SizeToggleGroupProps) {
  return (
    <ToggleGroup
      type="single"
      value={String(sizeIndex)}
      onValueChange={(value) => {
        if (value === "") return;
        const next = ANNOTATION_SIZES[Number(value)];
        if (next !== undefined) onSizeChange(next);
      }}
      aria-label="粗细"
      className={cn("gap-0.5", inMenu && "w-full justify-between")}
    >
      {ANNOTATION_SIZES.map((value, index) => {
        const item = (
          <ToggleGroupItem
            value={String(index)}
            data-annotation-size={String(index)}
            aria-label={SIZE_LABEL[index]!}
            aria-pressed={sizeIndex === index}
            className={cn(
              inMenu ? TOGGLE_MENU_AREA : TOGGLE_HIT_AREA,
              "text-muted-foreground",
              SELECTED_AREA,
            )}
          >
            <span
              aria-hidden
              className={cn("block rounded-full bg-current", SIZE_DOT[index]!)}
            />
          </ToggleGroupItem>
        );

        if (inMenu) return <React.Fragment key={value}>{item}</React.Fragment>;

        return (
          <Tooltip key={value}>
            <TooltipTrigger asChild>{item}</TooltipTrigger>
            <TooltipContent side="top">
              <span>{SIZE_LABEL[index]!}</span>
              <Shortcut keys={["[", "]"]} />
            </TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}

export function AnnotationToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  hidden,
  onToggleHidden,
  touchDraws,
  onToggleTouchDraws,
  itemCount,
  compact = false,
  className,
}: AnnotationToolbarProps): React.ReactNode {
  const [confirmingClear, setConfirmingClear] = React.useState(false);

  // The confirmation is a three-second offer, not a mode: `Escape` (below), a
  // blur, and this timer each end it, and so does the menu closing for any
  // other reason.
  React.useEffect(() => {
    if (!confirmingClear) return;
    const timer = window.setTimeout(
      () => setConfirmingClear(false),
      CLEAR_CONFIRM_MS,
    );
    return () => window.clearTimeout(timer);
  }, [confirmingClear]);

  const sizeIndex = sizeIndexOf(size);
  const empty = itemCount === 0;
  const colorVar = `var(${ANNOTATION_COLORS.find((spec) => spec.key === color)?.cssVar ?? ANNOTATION_COLORS[0]!.cssVar})`;

  // Folded layout (design §2.4, `compact`): 笔 + 橡皮 + 撤销 + 颜色 + 更多.
  // Both tools stay in the row — 粗细 / 隐藏批注 / 重做 are what the fold removes
  // (they move into 更多 below). Dropping the pen while the eraser is selected
  // leaves `P` / `1` as the only way back, which a finger cannot press: the tool
  // row is exactly the control a touch device has. (Reported at G5.)
  const tools: readonly AnnotationTool[] = ["pen", "eraser"];

  // Radix reports "" when the active single-toggle is pressed again; a tool is
  // never "none", so the empty report is dropped and the button stays on.
  const handleToolChange = (value: string) => {
    if (value === "pen" || value === "eraser") onToolChange(value);
  };

  // Escape reaches this handler even from the portalled menu, because React
  // propagates events through the React tree rather than the DOM tree.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && confirmingClear) setConfirmingClear(false);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!confirmingClear) return;
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next)) return;
    setConfirmingClear(false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-annotation-toolbar
        role="toolbar"
        aria-label="批注工具栏"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        // `pointer-events-auto` re-arms what the L1 canvas's `pointer-events:
        // none` root disarmed; `touch-auto` keeps a finger panning the tool row
        // instead of falling into the ink layer (design §4.2). Position comes
        // from the host's `className` — this file never pins itself.
        className={cn(
          "pointer-events-auto absolute top-2 left-2 z-30 flex w-fit max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-lg border border-border/60 bg-popover/95 p-1 text-popover-foreground shadow-md ring-1 ring-foreground/5 backdrop-blur-sm",
          "touch-auto",
          className,
        )}
      >
        <ToggleGroup
          type="single"
          value={tool}
          onValueChange={handleToolChange}
          aria-label="批注工具"
          className="gap-0.5"
        >
          {tools.map((value) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={value}
                  data-annotation-tool={value}
                  aria-label={TOOL_LABEL[value]}
                  aria-pressed={tool === value}
                  className={cn(
                    TOGGLE_HIT_AREA,
                    "text-muted-foreground",
                    SELECTED_AREA,
                  )}
                >
                  {value === "pen" ? <Pen /> : <Eraser />}
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>{TOOL_LABEL[value]}</span>
                <Shortcut keys={TOOL_SHORTCUT[value]} />
              </TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarButton
          data-annotation-undo
          label="撤销"
          shortcut={["⌘Z"]}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 />
        </ToolbarButton>

        {!compact && (
          <ToolbarButton
            data-annotation-redo
            label="重做"
            shortcut={["⌘⇧Z"]}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 />
          </ToolbarButton>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <Popover>
          {/* No tooltip on this trigger on purpose: `TooltipTrigger asChild >
              PopoverTrigger asChild > Button` is three slots deep and no other
              file in this repo composes two `asChild` triggers on one element,
              so the frozen `data-annotation-color-trigger` anchor keeps the
              ordinary two-level shadcn shape and carries its own `aria-label`. */}
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-annotation-color-trigger
              aria-label={`颜色（${ANNOTATION_COLORS.find((spec) => spec.key === color)?.label ?? ""}）`}
              className={HIT_AREA}
            >
              <span
                aria-hidden
                className="size-4 rounded-full ring-1 ring-foreground/25"
                style={{ backgroundColor: colorVar }}
              />
            </Button>
          </PopoverTrigger>
          {/* No close on pick: the palette is a repeat gesture (design §2.1
              lists the six swatches as one control), and `popover.tsx` exports
              no `Close`, so the panel is dismissed by clicking away. */}
          <PopoverContent align="start" sideOffset={6} className="w-auto p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {ANNOTATION_COLORS.map((spec) => (
                <button
                  key={spec.key}
                  type="button"
                  data-annotation-color={spec.key}
                  aria-label={spec.label}
                  aria-pressed={color === spec.key}
                  title={spec.label}
                  onClick={() => onColorChange(spec.key)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full outline-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11",
                    color === spec.key
                      ? "ring-2 ring-foreground ring-offset-1 ring-offset-popover"
                      : "ring-1 ring-foreground/20",
                  )}
                  // The swatch is the token, never a hex: the same key resolves
                  // per theme (`--annotation-1..6`, design §2.3).
                  style={{ backgroundColor: `var(${spec.cssVar})` }}
                >
                  {color === spec.key ? (
                    <Check className="size-4 text-background" />
                  ) : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {!compact && (
          <>
            <SizeToggleGroup
              sizeIndex={sizeIndex}
              onSizeChange={onSizeChange}
            />

            <ToolbarButton
              data-annotation-hide
              label={hidden ? "显示批注" : "隐藏批注"}
              shortcut={["\\"]}
              aria-pressed={hidden}
              onClick={onToggleHidden}
              className="aria-pressed:bg-accent aria-pressed:text-foreground"
            >
              {hidden ? <EyeOff /> : <Eye />}
            </ToolbarButton>
          </>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) setConfirmingClear(false);
          }}
        >
          {/* Same reason as the colour trigger: the `data-annotation-more`
              anchor is a plain two-level `DropdownMenuTrigger asChild > Button`
              rather than a stack of two `asChild` triggers. */}
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-annotation-more
              aria-label="更多"
              className={HIT_AREA}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={compact ? "end" : "start"}
            sideOffset={6}
            className="min-w-44"
          >
            <DropdownMenuItem
              data-annotation-clear
              data-annotation-clear-confirm={
                confirmingClear ? "true" : undefined
              }
              variant={confirmingClear ? "destructive" : "default"}
              disabled={empty}
              aria-label={confirmingClear ? "确认清除全部批注" : "清除全部批注"}
              onSelect={(event) => {
                if (!confirmingClear) {
                  // Keep the menu open: the second click *is* the
                  // confirmation, and a menu that closes on the first cannot
                  // offer one.
                  event.preventDefault();
                  setConfirmingClear(true);
                  return;
                }
                setConfirmingClear(false);
                onClear();
              }}
            >
              <Trash2 />
              <span>{confirmingClear ? "确认清除？" : "清除"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              data-annotation-touch-draws
              checked={touchDraws}
              onCheckedChange={() => onToggleTouchDraws()}
            >
              手指=书写
            </DropdownMenuCheckboxItem>
            {/* The folded row only has room for 当前工具 + 橡皮 + 撤销 + 颜色 +
                更多 (design §2.4), which would leave 粗细 and 隐藏批注 with no
                entry at all in the Dialog form. They move in here rather than
                disappear, and the width/visibility anchors are identical to the
                row's so a probe finds exactly one of each in either layout. */}
            {compact && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>粗细</DropdownMenuLabel>
                <div className="px-1 pb-1">
                  <SizeToggleGroup
                    sizeIndex={sizeIndex}
                    onSizeChange={onSizeChange}
                    inMenu
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  data-annotation-hide
                  checked={hidden}
                  onCheckedChange={() => onToggleHidden()}
                >
                  {hidden ? "显示批注" : "隐藏批注"}
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem
                  data-annotation-redo
                  disabled={!canRedo}
                  onSelect={() => onRedo()}
                >
                  <Redo2 />
                  <span>重做</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
