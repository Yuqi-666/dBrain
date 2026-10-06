"use client";

/**
 * `IconSelectorPopover` — the node icon picker (sel §2 / §4 / §5, plan §M2.1 #4).
 *
 * Three boundaries, copied verbatim from sel §2:
 *
 * 1. **Controlled** — `value` / `onChange`, no store, no router. `nodeId` is
 *    only forwarded as the upload context (`MediaDropPane` → `FileDropZone`).
 * 2. **Never writes the database** — the popover only produces a new `NodeIcon`;
 *    the host (the editor-header button) calls `NodeService.upsert`. The one
 *    exception is upload: `FileDropZone` writes its own `icon` variant today, so
 *    the displayed value comes back through the host's store subscription.
 * 3. **No business judgement** — `disabledReason` is the host's; when given, the
 *    trigger is `aria-disabled` + `title`, clicking does not open, and it wears
 *    the spec's `disabled:opacity-50` (written as `aria-disabled:opacity-50`
 *    because the trigger deliberately stays focusable instead of using the
 *    native `disabled` attribute).
 *
 * Write rules (sel §7), which is where most of the subtlety lives:
 *
 * - **One gesture, one write.** Every discrete pick calls `onChange` exactly
 *   once; there is no debounce, because there is no per-keystroke path. The one
 *   text control is the `Or add via URL` draft, which is local state and commits
 *   only on Enter / blur (`MediaUrlRow`).
 * - **Always based on the live value.** Picking a glyph or a colour rebuilds the
 *   whole `NodeIcon` from the current `value` prop (never a `{ color }`-only
 *   object), so `kind` / `value` survive a recolour and the previous colour
 *   survives a glyph change. `NodeService.upsert` is optimistic and rolls back on
 *   failure, so `value` can briefly flash backwards — that is expected.
 *
 * Keyboard (sel §5): `Enter` / `Space` open and focus lands in the search box
 * (`MediaSearchInput autoFocus`), typing filters the active tab (the query lives
 * in `MediaPopoverShell`'s `Command`, so switching tabs keeps it), `↑`/`↓` walk
 * the items (cmdk native) while the grid itself is one tab stop with a roving
 * tabindex (W1-A's `MediaGrid`), `Enter` picks, `Tab` keeps the browser's focus
 * order, and `Esc` closes and returns focus to the trigger — Radix's
 * dismissable-layer stack makes the popover the highest layer, so the keydown
 * never reaches the editor's outer `Dialog`.
 *
 * Not in this file:
 *
 * - **最近使用** (sel §5, P2). When it lands it belongs here: `localStorage` key
 *   `dbrain:icon-recent`, at most 24 entries deduped by `kind:value`, rendered as
 *   an extra group only when non-empty. It must be read **inside an effect** —
 *   never during render — so the server and the first client pass agree.
 * - **The category strip** from sel §2's skeleton. The frozen `MediaGrid` is a
 *   flat, single-grid atom and owns filtering + the empty state (its `label` /
 *   `keywords` per item are the filter text), so `emoji-set.ts`'s categories are
 *   flattened into one grid — the category name rides along as a keyword — and
 *   the bottom `CommandGroup` anchor bar is deferred; see the report.
 * - **The node-type fallback.** §4's props have no `nodeType`, so the default
 *   trigger can only fall back to a neutral glyph; a host that wants the type
 *   glyph passes its own trigger through `children`.
 */

import { cloneElement, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { NodeIcon } from "@workspace/interfaces";
import { Ban, SmilePlus } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { CommandList } from "@workspace/ui/components/ui/command";
import { cn } from "@workspace/ui/lib/utils";
import { EMOJI_CATEGORIES } from "@workspace/ui/components/node-media/emoji-set";
import { MediaDropPane } from "@workspace/ui/components/node-media/media/media-drop-pane";
import { MediaGrid } from "@workspace/ui/components/node-media/media/media-grid";
import type { MediaGridItem } from "@workspace/ui/components/node-media/media/media-grid";
import { MediaPopoverShell } from "@workspace/ui/components/node-media/media/media-popover-shell";
import type { MediaPopoverTab } from "@workspace/ui/components/node-media/media/media-popover-shell";
import { MediaSearchInput } from "@workspace/ui/components/node-media/media/media-search-input";
import { MediaUrlRow } from "@workspace/ui/components/node-media/media/media-url-row";
import {
  LUCIDE_ICON_ENTRIES,
  NodeIconView,
} from "@workspace/ui/components/node-media/node-icon-view";

/** The three tab ids of sel §5. `url` is not a tab — it is the tail of `upload`. */
type IconSelectorTab = "emoji" | "icon" | "upload";

const TABS: MediaPopoverTab[] = [
  { value: "emoji", label: "Emoji" },
  { value: "icon", label: "图标" },
  { value: "upload", label: "上传" },
];

/**
 * 8 swatches + 「无」. Copied — not imported — from
 * `packages/dataview/src/shared/field-meta.tsx`'s `OPTION_COLORS` (sel §5
 * 颜色/底色: "色板取 shared/field-meta.tsx 的既有调色板以保持一致"), minus its
 * neutral `#94a3b8` first entry, which is the one value that would read as
 * "no colour" and leave exactly the eight chromatic swatches the design asks for.
 */
const EMOJI_KEY_PREFIX = "emoji:";
const ICON_KEY_PREFIX = "icon:";

const ICON_COLORS: readonly { value: string; label: string }[] = [
  { value: "#ef4444", label: "红" },
  { value: "#f97316", label: "橙" },
  { value: "#eab308", label: "黄" },
  { value: "#22c55e", label: "绿" },
  { value: "#14b8a6", label: "青" },
  { value: "#3b82f6", label: "蓝" },
  { value: "#8b5cf6", label: "紫" },
  { value: "#ec4899", label: "粉" },
];

export interface IconSelectorPopoverProps {
  nodeId: string;
  /** Controlled; `undefined` means "no icon set". */
  value?: NodeIcon;
  /** Discrete picks fire immediately; the URL row fires on Enter / blur. */
  onChange: (next: NodeIcon | undefined) => void;
  /** When given, 「移除」 calls this instead of `onChange(undefined)`. */
  onRemove?: () => void;
  /** Given → disabled trigger (aria-disabled + title), the popover never opens. */
  disabledReason?: string;
  /** Upload `accept`; defaults to `image/*`. */
  accept?: string;
  /** The trigger; a 36×36 button is rendered when absent. */
  children?: ReactNode;
  /** Extra classes for the popover panel. */
  className?: string;
}

export function IconSelectorPopover({
  nodeId,
  value,
  onChange,
  onRemove,
  disabledReason,
  accept = "image/*",
  children,
  className,
}: IconSelectorPopoverProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<IconSelectorTab>("emoji");
  const [urlDraft, setUrlDraft] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const disabled = Boolean(disabledReason);

  /** Every glyph pick keeps the current colour (sel §7 「换图但保留底色」). */
  const commit = (icon: NodeIcon) => {
    onChange(value?.color ? { ...icon, color: value.color } : icon);
  };

  /**
   * The grid item's `key` is `<kind>:<payload>` (the Emoji character from
   * `emoji-set.ts`, or the Lucide name from `LUCIDE_ICON_ENTRIES`); the active
   * tab is the discriminant. The tab cannot be `upload` here — that body renders
   * no grid.
   */
  const handleSelect = (item: MediaGridItem) => {
    if (tab === "emoji") {
      commit({
        kind: "emoji",
        value: item.key.slice(EMOJI_KEY_PREFIX.length),
      });
      return;
    }
    commit({ kind: "icon", value: item.key.slice(ICON_KEY_PREFIX.length) });
  };

  /**
   * Rebuilds the whole icon from the live value — never `{ color }` alone.
   *
   * `color` is written **even when clearing** (G2-r1 第 2 条). The host merges the
   * value it receives onto a freshly re-read live icon (`{ ...live, ...next }`,
   * sel §7), so a `next` that merely *omits* the key is indistinguishable from
   * "leave the colour alone" and the old colour survived 无底色 — the key must be
   * present and `undefined` for the write to mean "no background". It
   * serialises away at the PocketBase boundary (`JSON.stringify` drops
   * `undefined` members), and the domain's `clearIcon`/`updateIcon` path is only
   * reached for a real icon, so the wire shape stays `{ kind, value }`.
   */
  const handleColor = (color: string | undefined) => {
    if (!value) return;
    onChange({ kind: value.kind, value: value.value, color });
  };

  const handleUrlSubmit = (url: string) => {
    commit({ kind: "image", value: url });
    setUrlDraft("");
  };

  const handleRemove = () => {
    if (onRemove) onRemove();
    else onChange(undefined);
  };

  const baseTrigger = children ?? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={value ? "更换图标" : "设置图标"}
    >
      <NodeIconView
        icon={value}
        className="size-5 text-base"
        fallback={<SmilePlus className="size-5" />}
      />
    </Button>
  );

  const selectedNoColor = Boolean(value) && !value?.color;

  /**
   * The 底色 row is **pinned chrome**, not part of the body: it goes through the
   * shell's `footer` slot so a 46-row grid cannot push it under the fold (that
   * was G2-r1's 「底色只在上传 tab 有了」). It must stay always-rendered and merely
   * `disabled` when there is no icon — a control that appears and disappears
   * pushes its left-hand neighbours around (sel §5 清除).
   */
  const colorRow = (
    <div
      role="group"
      aria-label="底色"
      className="flex shrink-0 items-center gap-1 border-t border-border/60 p-1"
    >
      <span className="px-1 text-xs text-muted-foreground">底色</span>
      {ICON_COLORS.map((entry) => {
        const selected = value?.color === entry.value;
        return (
          <Button
            key={entry.value}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`底色 ${entry.label}`}
            aria-pressed={selected}
            disabled={!value}
            className={cn(
              "p-0 hover:opacity-90",
              // `--primary` = 用户已激活 (sel §0.3-8); it never means "has icon".
              selected &&
                "ring-2 ring-primary ring-offset-1 ring-offset-popover",
            )}
            style={{ backgroundColor: entry.value }}
            onClick={() => handleColor(entry.value)}
          />
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="无底色"
        aria-pressed={selectedNoColor}
        disabled={!value}
        className={cn(
          "hover:opacity-90",
          selectedNoColor &&
            "ring-2 ring-primary ring-offset-1 ring-offset-popover",
        )}
        onClick={() => handleColor(undefined)}
      >
        <Ban className="size-4" />
      </Button>
    </div>
  );

  return (
    <MediaPopoverShell
      open={open && !disabled}
      onOpenChange={(next) => {
        if (disabled && next) return;
        setOpen(next);
      }}
      trigger={withTriggerDisabledState(baseTrigger, disabled, disabledReason)}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(next) => setTab(next as IconSelectorTab)}
      width={320}
      bodyMaxHeight="min(384px, 52vh)"
      className={className}
      footer={colorRow}
      actions={
        // Always rendered, merely disabled when empty: a control that appears and
        // disappears pushes its left-hand neighbours around (sel §5 清除).
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="移除图标"
          disabled={!value}
          onClick={handleRemove}
        >
          移除
        </Button>
      }
    >
      {/* Only the grid tabs filter, so the search row only exists there. `autoFocus`
          is what puts the caret in it when the popover opens (sel §5 keyboard);
          its query belongs to the shell's `Command`, so it survives a tab switch. */}
      {tab === "upload" ? null : <MediaSearchInput autoFocus />}
      {tab === "upload" ? (
        // No `overflow-y-auto` of its own: the shell caps the body and lets either
        // the body wrapper or the `CommandList` scroll it, so a second viewport in
        // here would either be dead or clip the drop pane.
        <div className="flex flex-col gap-1 p-1">
          <MediaDropPane
            nodeId={nodeId}
            variant="icon"
            accept={accept}
            onUploadStart={() => setUploadError(null)}
            onError={(error) => setUploadError(error.message)}
          />
          <MediaUrlRow
            value={urlDraft}
            onValueChange={setUrlDraft}
            onSubmit={handleUrlSubmit}
          />
          {uploadError ? (
            <p role="alert" className="px-1 text-xs text-destructive">
              {uploadError}
            </p>
          ) : null}
        </div>
      ) : (
        <CommandList>
          <MediaGrid
            items={tab === "emoji" ? EMOJI_ITEMS : ICON_ITEMS}
            onSelect={handleSelect}
            columns={8}
            emptyState={
              <p className="py-6 text-center text-sm text-muted-foreground">
                没有匹配的结果
              </p>
            }
          />
        </CommandList>
      )}
    </MediaPopoverShell>
  );
}

/**
 * Puts the disabled affordances on whatever element is used as the trigger.
 *
 * The trigger comes from `children` (or the default button), and Radix needs a
 * single element — so it is cloned rather than wrapped, which also keeps
 * `Popover`'s "return focus to the trigger on close" pointing at the real
 * button. Opening itself is blocked by the controlled `open` guard above; this
 * only carries `aria-disabled` / `title` / the dimming.
 */
function withTriggerDisabledState(
  node: ReactNode,
  disabled: boolean,
  reason?: string,
): ReactNode {
  if (!isValidElement(node)) return node;
  const props = node.props as { className?: string; title?: string };
  return cloneElement(node as ReactElement<Record<string, unknown>>, {
    "aria-disabled": disabled || undefined,
    title: disabled ? reason : props.title,
    className: cn(props.className, disabled && "aria-disabled:opacity-50"),
  });
}

// ---------------------------------------------------------------------------
// P0 curated sets
// ---------------------------------------------------------------------------

/**
 * W1-A's `emoji-set.ts` (sel §3.1) — the Emoji tab's only data source, consumed
 * the way that module documents (`EMOJI_CATEGORIES` → `MediaGridItem`), except
 * that its categories are **flattened into one `MediaGrid`**: the frozen
 * `MediaGrid` is a flat atom that owns filtering and the empty state, so one
 * grid per `CommandGroup` would draw one empty state per category while
 * searching. Every item still carries its category name as a filter keyword, and
 * the bottom 分类条 anchor bar is deferred with it (sel §2's skeleton).
 */
const EMOJI_ITEMS: MediaGridItem[] = EMOJI_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({
    key: `${EMOJI_KEY_PREFIX}${item.emoji}`,
    label: item.name,
    keywords: [category.label, ...item.keywords],
    content: <span className="text-lg leading-none">{item.emoji}</span>,
  })),
);

/**
 * The `图标` tab renders W1-A's `LUCIDE_ICON_ENTRIES` — the **same** table
 * `NodeIconView` resolves persisted names against (sel §3.2 / plan §M2.2-3): a
 * second list here would drift from it and every name missing there would fall
 * back to the type glyph after a pick. Names only; `key` carries a prefix so an
 * icon key can never collide with an Emoji character.
 */
const ICON_ITEMS: MediaGridItem[] = LUCIDE_ICON_ENTRIES.map((entry) => ({
  key: `${ICON_KEY_PREFIX}${entry.name}`,
  label: entry.name,
  keywords: entry.keywords,
  content: <entry.Icon className="size-4" aria-hidden />,
}));
