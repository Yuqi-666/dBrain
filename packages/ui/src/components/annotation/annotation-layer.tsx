"use client";

/**
 * The assembly point: `<AnnotationLayer />` is what a node-content host mounts
 * over its base image, and the only file that knows how the pieces fit together.
 *
 * Design §1.2's three boundaries are the whole reason this file is small:
 *
 * 1. **It never learns who its host is.** Everything it knows about the base layer
 *    arrives through {@link AnnotationLayerProps.getBaseRect} — a callback the host
 *    re-creates whenever the base actually changes (image loaded, container
 *    resized). Nothing here imports the image node content, the store or the route.
 * 2. **It never persists.** A finished gesture becomes a new `items` array, which is
 *    handed to `onItemsChange`; the host decides what that means (for an image node:
 *    `patchContent({ annotations })` through the shared M1 writer).
 * 3. **It registers no global keyboard.** The one `onKeyDown` lives on its own
 *    root element, so it only fires while a gesture or a toolbar button has focus
 *    (the ink canvas is `tabIndex={0}`, which is also what makes ⌘Z work right
 *    after drawing). Nothing is added to `window`/`document` for keys.
 *
 * Stacking follows design §4.2 exactly, because that table is what keeps the
 * canvas from eating the rest of the editor: this root is `pointer-events-none`,
 * the ink canvas (L1) and the toolbar (L3) are the only two things that take
 * pointers, and they are **siblings** — the toolbar floats in its own corner rather
 * than inside the canvas, so a click on a button never reaches the state machine.
 *
 * ## Viewport gestures live one level down
 *
 * Pan / pinch / 恢复位置大小 (单指双击) are the host's *transform* (`panZoom`), and
 * 双指轻点撤回 / 三指轻点重做 are this layer's *history* (`undo` / `redo`). Both
 * are recognised on the ink canvas — the only element a pointer ever lands on —
 * by `use-annotation-input.ts`, which then either drives the controller or calls
 * the two callbacks forwarded here. The layer itself never holds a viewport: it
 * stays host-agnostic, which is why a pdf host can mount it later with its own
 * controller and get the same gestures for free.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Annotation } from "@workspace/interfaces";
import { cn } from "@workspace/ui/lib/utils";

import { AnnotationCanvas } from "./annotation-canvas";
import { AnnotationToolbar } from "./annotation-toolbar";
import { toLayerBox } from "./geometry";
import type {
  AnnotationColorKey,
  AnnotationLayerProps,
  AnnotationOperation,
  AnnotationTool,
  BaseRect,
  LayerBox,
} from "./types";
import {
  ANNOTATION_SIZES,
  DEFAULT_ANNOTATION_COLOR,
  DEFAULT_ANNOTATION_SIZE,
  DEFAULT_ANNOTATION_TOOL,
} from "./types";

const NO_ITEMS: Annotation[] = [];

/** How many gestures can be taken back. Generous, because an item is small. */
const HISTORY_LIMIT = 200;

/**
 * One gesture, in the form ⌘Z needs.
 *
 * The persisted `items` array is the truth; a history entry is only enough
 * information to move that array one gesture in either direction. `add` needs the
 * item, `remove` needs each item **and where it was**, so undo restores the
 * original z-order instead of appending an erased highlight back on top.
 */
type HistoryEntry =
  | { kind: "add"; item: Annotation }
  | { kind: "remove"; removed: { item: Annotation; index: number }[] };

interface History {
  entries: HistoryEntry[];
  /** How many entries are currently applied (`canUndo = index > 0`). */
  index: number;
}

const EMPTY_HISTORY: History = { entries: [], index: 0 };

/** Two rects are the same measurement — used to skip a re-render, not to compare. */
function sameRect(a: BaseRect | null, b: BaseRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Identity comparison for the `items` prop.
 *
 * The host is allowed (and likely) to hand over a freshly built array every
 * render; comparing references would then look like "someone else changed the
 * annotations" on every keystroke and wipe the undo stack. Ids in order are the
 * cheap, honest comparison: same ids means same set, and only a real edit — ours
 * or another client's — changes them.
 */
function sameItems(
  a: readonly Annotation[],
  b: readonly Annotation[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]!.id !== b[i]!.id) return false;
  }
  return true;
}

export function AnnotationLayer({
  items: itemsProp,
  onItemsChange,
  getBaseRect,
  defaultTool = DEFAULT_ANNOTATION_TOOL,
  compact,
  readOnly = false,
  panZoom,
  className,
}: AnnotationLayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // `items` is controlled when the host can persist it, and mirrored locally when
  // it cannot (a read-only view with no writer) so the layer is still usable.
  const [localItems, setLocalItems] = useState<Annotation[]>(
    itemsProp ?? NO_ITEMS,
  );
  const items = onItemsChange ? (itemsProp ?? NO_ITEMS) : localItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [tool, setTool] = useState<AnnotationTool>(defaultTool);
  const [color, setColor] = useState<AnnotationColorKey>(
    DEFAULT_ANNOTATION_COLOR,
  );
  const [size, setSize] = useState<number>(DEFAULT_ANNOTATION_SIZE);
  const [hidden, setHidden] = useState(false);
  const [touchDraws, setTouchDraws] = useState(false);
  const [active, setActive] = useState(false);

  /**
   * The base rectangle (viewport), its box (the ink origin, in the layer root's
   * own pixels) and the root's layout size (the canvas element's box) — always in
   * one read, so they cannot describe different frames.
   */
  const [geometry, setGeometry] = useState<{
    rect: BaseRect;
    box: LayerBox;
    canvas: { width: number; height: number };
  } | null>(null);

  /**
   * Re-measure the base layer.
   *
   * Both rectangles come out of the same tick so they cannot describe different
   * frames: `getBaseRect()` is the host's answer (the image's drawn rect, letterbox
   * excluded) and the root's own rect turns it into the canvas's local box.
   *
   * The root's **layout** size goes along with it: `getBoundingClientRect()` bakes
   * in any ancestor transform, and the node editor's Dialog opens with
   * `zoom-in-95`, so a measurement taken inside that 100 ms window would otherwise
   * be 5% small forever — a transform is invisible to `ResizeObserver`. See
   * {@link toLayerBox}, which re-expresses the whole measurement in the space the
   * canvas element is laid out in (and is pinned by `geometry.test.ts`).
   */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = getBaseRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      setGeometry((previous) => (previous === null ? previous : null));
      return;
    }
    const origin = root.getBoundingClientRect();
    const canvas = { width: root.offsetWidth, height: root.offsetHeight };
    const box = toLayerBox(
      rect,
      {
        left: origin.left,
        top: origin.top,
        width: origin.width,
        height: origin.height,
      },
      canvas,
    );
    setGeometry((previous) =>
      previous &&
      sameRect(previous.rect, rect) &&
      sameRect(previous.box, box) &&
      previous.canvas.width === canvas.width &&
      previous.canvas.height === canvas.height
        ? previous
        : { rect, box, canvas },
    );
  }, [getBaseRect]);

  // A layout effect for the first measurement (the ink must not appear one frame
  // late), then the three things that can move the base: the container resizing,
  // the window resizing, and any ancestor scrolling (`scroll` does not bubble, so
  // it is captured).
  useLayoutEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const onScrollOrResize = () => measure();
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [measure]);

  /**
   * The other half of the transform story: an animation or transition that ends on
   * the layer root **or on one of its ancestors** — the Dialog's open animation is
   * the one that matters today — re-measures when it settles.
   *
   * `toLayerBox` already makes a *scale* measurement exact while it is running, so
   * this is not what fixes the reported defect; it is the cheap safety net for the
   * transforms the ratio cannot describe (a rotation, a skew, a scale applied to
   * the image but not to the root) and it keeps the layer correct if a host
   * animates something other than a uniform scale. The listener is filtered to the
   * layer's own ancestor chain so the Dialog's hover transitions cannot turn into a
   * measurement per frame.
   */
  useEffect(() => {
    const onSettled = (event: Event) => {
      const root = rootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node)) return;
      if (target === root || target.contains(root) || root.contains(target)) {
        measure();
      }
    };
    document.addEventListener("transitionend", onSettled, true);
    document.addEventListener("animationend", onSettled, true);
    return () => {
      document.removeEventListener("transitionend", onSettled, true);
      document.removeEventListener("animationend", onSettled, true);
    };
  }, [measure]);

  /**
   * External-change detection. When the host swaps the whole layer — another node
   * opened in the same dialog, an upload that replaced the content, a remote
   * write — the undo stack describes edits that are no longer on screen and must
   * be thrown away rather than replayed onto someone else's data.
   */
  const emittedRef = useRef<readonly Annotation[] | null>(null);
  useEffect(() => {
    const incoming = itemsProp ?? NO_ITEMS;
    if (sameItems(incoming, emittedRef.current ?? itemsRef.current)) return;
    emittedRef.current = incoming;
    setHistory(EMPTY_HISTORY);
    setLocalItems(incoming);
  }, [itemsProp]);

  const commit = useCallback(
    (next: Annotation[], entry: HistoryEntry) => {
      emittedRef.current = next;
      // A new gesture discards the redo tail — there is no redo of "the future
      // that never happened".
      setHistory((previous) => {
        const entries = [
          ...previous.entries.slice(0, previous.index),
          entry,
        ].slice(-HISTORY_LIMIT);
        return { entries, index: entries.length };
      });
      if (onItemsChange) onItemsChange(next);
      else setLocalItems(next);
    },
    [onItemsChange],
  );

  /** One finished gesture → a new array + one undo step (design §0.3-7). */
  const handleOperation = useCallback(
    (operation: AnnotationOperation) => {
      const current = itemsRef.current;
      if (operation.kind === "add") {
        commit([...current, operation.item], {
          kind: "add",
          item: operation.item,
        });
        return;
      }
      if (operation.items.length === 0) return;

      const removedIds = new Set(operation.items.map((item) => item.id));
      const removed = current
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => removedIds.has(item.id));
      if (removed.length === 0) return;

      commit(
        current.filter((item) => !removedIds.has(item.id)),
        { kind: "remove", removed },
      );
    },
    [commit],
  );

  const canUndo = history.index > 0;
  const canRedo = history.index < history.entries.length;

  // Both directions read the entry from state rather than from inside a state
  // updater: an updater may run twice (StrictMode), and handing the host a write
  // from inside one would persist the same edit twice.
  const undo = useCallback(() => {
    if (history.index === 0) return;
    const entry = history.entries[history.index - 1]!;
    const current = itemsRef.current;
    const next =
      entry.kind === "add"
        ? current.filter((item) => item.id !== entry.item.id)
        : reinsert(current, entry.removed);
    emittedRef.current = next;
    setHistory({ entries: history.entries, index: history.index - 1 });
    if (onItemsChange) onItemsChange(next);
    else setLocalItems(next);
  }, [history, onItemsChange]);

  const redo = useCallback(() => {
    if (history.index >= history.entries.length) return;
    const entry = history.entries[history.index]!;
    const current = itemsRef.current;
    const next =
      entry.kind === "add"
        ? [...current, entry.item]
        : current.filter(
            (item) =>
              !entry.removed.some(({ item: gone }) => gone.id === item.id),
          );
    emittedRef.current = next;
    setHistory({ entries: history.entries, index: history.index + 1 });
    if (onItemsChange) onItemsChange(next);
    else setLocalItems(next);
  }, [history, onItemsChange]);

  const clear = useCallback(() => {
    const current = itemsRef.current;
    if (current.length === 0) return;
    // 清除 is a normal operation, not a special case: it goes on the stack, so one
    // ⌘Z brings everything back (design §2.1's 清除 row).
    commit([], {
      kind: "remove",
      removed: current.map((item, index) => ({ item, index })),
    });
  }, [commit]);

  const stepSize = useCallback((direction: number) => {
    setSize((current) => {
      const at = ANNOTATION_SIZES.indexOf(current);
      const next = Math.min(
        Math.max((at === -1 ? 1 : at) + direction, 0),
        ANNOTATION_SIZES.length - 1,
      );
      return ANNOTATION_SIZES[next]!;
    });
  }, []);

  /**
   * Keyboard, scoped to the layer's own subtree (boundary 3).
   *
   * The digit shortcuts the design lists for tools (`1`, `3`) collide with the ones
   * it lists for colours (`0`–`5`), so colours are toolbar-only; the letters are
   * unambiguous and both are offered.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier || event.altKey) return;

      switch (event.key) {
        case "p":
        case "P":
        case "1":
          setTool("pen");
          return;
        case "e":
        case "E":
        case "3":
          setTool("eraser");
          return;
        case "[":
          stepSize(-1);
          return;
        case "]":
          stepSize(1);
          return;
        case "\\":
          setHidden((current) => !current);
          return;
        // 恢复位置大小, the keyboard twin of the single-finger double tap and of
        // the host's reset button. `0` is free: the
        // design's digit shortcuts for colours were never implemented (the layer
        // registers no global keyboard and colours are toolbar-only), and the
        // letters above are what the toolbar lists.
        case "0":
          panZoom?.reset();
          return;
        default:
          return;
      }
    },
    [panZoom, readOnly, redo, stepSize, undo],
  );

  const toolbar = useMemo(
    () =>
      readOnly ? null : (
        <AnnotationToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onClear={clear}
          hidden={hidden}
          onToggleHidden={() => setHidden((current) => !current)}
          touchDraws={touchDraws}
          onToggleTouchDraws={() => setTouchDraws((current) => !current)}
          itemCount={items.length}
          compact={compact}
          className="absolute left-2 top-2 z-30 max-w-[calc(100%-1rem)]"
        />
      ),
    [
      canRedo,
      canUndo,
      clear,
      color,
      compact,
      hidden,
      items.length,
      readOnly,
      redo,
      size,
      tool,
      touchDraws,
      undo,
    ],
  );

  return (
    <div
      ref={rootRef}
      data-annotation-layer
      data-annotation-active={active ? "true" : undefined}
      onKeyDown={handleKeyDown}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {geometry && (
        <AnnotationCanvas
          box={geometry.box}
          canvas={geometry.canvas}
          rect={geometry.rect}
          items={items}
          tool={tool}
          size={size}
          color={color}
          touchDraws={touchDraws}
          hidden={hidden}
          panZoom={panZoom}
          onUndo={undo}
          onRedo={redo}
          onOperation={handleOperation}
          onActiveChange={setActive}
        />
      )}
      {toolbar}
    </div>
  );
}

/** Put erased items back where they were, so z-order survives undo. */
function reinsert(
  items: readonly Annotation[],
  removed: readonly { item: Annotation; index: number }[],
): Annotation[] {
  const next = [...items];
  for (const { item, index } of [...removed].sort(
    (a, b) => a.index - b.index,
  )) {
    next.splice(Math.min(index, next.length), 0, item);
  }
  return next;
}
