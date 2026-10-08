"use client";

/**
 * An `image` node: the picture, plus the pen layer over it.
 *
 * This file is the **host** of `<AnnotationLayer />`, and the split of duties
 * follows `docs/node-content/annotation.md` §1.2 exactly:
 *
 * - the layer knows nothing about this node — it gets the marks (`items`), a way
 *   to report new ones (`onItemsChange`) and a rectangle to draw into
 *   (`getBaseRect`);
 * - the **persistence** happens here, through the M1 shared writer
 *   (`use-node-content-writer.ts`), which merges the content half onto the live
 *   node and serializes the writes. One finished gesture is one serialized write
 *   of the whole `annotations` object — the plan's `debounce: 2_000`
 *   (`annotation.md` §5.1) predates the shared writer and is deliberately not
 *   reproduced on top of it (`docs/plan/annotation.md` §M5.2 records the call).
 *
 * The base rectangle is the letterbox arithmetic the browser will not do for us:
 * the `<img>` is `object-contain`, so its element box is not the painted box
 * (design §3.4). `naturalWidth/naturalHeight` come from a decoded image and
 * therefore already carry the EXIF orientation the browser applied, which is what
 * makes a rotated photo line up (G5 #9).
 *
 * ## Gestures
 *
 * This host owns the **one** viewport transform for the whole stack: pan (one
 * finger, or the wheel / middle button on a desktop), pinch (two fingers,
 * ctrl/⌘-wheel), 恢复位置大小 (单指双击, the 恢复位置大小 button, or `0` on a
 * keyboard) and — through the ink canvas that covers the photo — 双指轻点撤回 /
 * 三指轻点重做. See `packages/ui/src/components/pan-zoom/`.
 *
 * The button is rendered here rather than inside the annotation layer for the
 * same reason the transform is: the layer is host-agnostic, and "the base moved"
 * is the host's own state.
 *
 * The photo is transformed with `transformToCss(transform)` while the ink layer
 * is handed `applyTransform(letterbox, transform, origin)`; both come from the
 * same numbers, which is the mechanical reason the two cannot drift apart. A pdf
 * host would do exactly the same with its own `getBounds`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Annotation,
  ImageContent,
  ImageNodeData,
} from "@workspace/interfaces";
import { NodeService } from "@workspace/services";
import { useUIStore } from "@workspace/store";
import { resolveFileUrl } from "@workspace/api-client";
import { AnnotationLayer } from "@workspace/ui/components/annotation/annotation-layer";
import { containRect } from "@workspace/ui/components/annotation/geometry";
import type { BaseRect } from "@workspace/ui/components/annotation/types";
import {
  applyTransform,
  transformToCss,
} from "@workspace/ui/components/pan-zoom/transform";
import { usePanZoom } from "@workspace/ui/components/pan-zoom/use-pan-zoom";
import { PanZoomResetButton } from "@workspace/ui/components/pan-zoom/reset-button";
import type { ViewportBounds } from "@workspace/ui/components/pan-zoom/types";
import { cn } from "@workspace/ui/lib/utils";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import { FileDropZone } from "./file-drop-zone";
import { useNodeContentWriter } from "./use-node-content-writer";

interface ImageNodeContentProps {
  node: ImageNodeData;
  className?: string;
}

export function ImageNodeContent({ node, className }: ImageNodeContentProps) {
  const url = resolveFileUrl(node.content?.url);
  const hasUrl = !!url;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mediaLoading, setMediaLoading] = useState(hasUrl);
  /** Natural size of the decoded image — EXIF already applied by the browser. */
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { patchContent } = useNodeContentWriter<ImageContent>(
    node.id,
    "image",
    node.content,
  );

  /**
   * Dialog mode has 80vh to work with, so the toolbar starts folded (design §2.4).
   * Read here rather than inside the layer: the layer is host-agnostic by
   * construction and must not learn what a `mainViewType` is.
   */
  const compact = useUIStore((state) => state.mainViewType !== "editor");

  /**
   * The shared viewport. The photo is painted with `transformToCss(transform)`
   * and the ink layer is handed `applyTransform(fit, transform, origin)` — the
   * *same* four numbers — so pan and zoom can never separate the two (see
   * `pan-zoom/types.ts`).
   *
   * `getBounds` measures the letterbox arithmetic and the transform's own origin.
   * It is deliberately a callback rather than state: a gesture must see the box
   * as it is *now*, and the container is the one element our transform does not
   * touch, so measuring it during a gesture is stable.
   */
  const getBounds = useCallback((): ViewportBounds | null => {
    const container = containerRef.current;
    if (!container || !natural) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    // The `<img>` is `h-full w-full` inside this `relative` container, so its
    // layout box is exactly the container's content box (padding excluded).
    // Measured from computed style rather than `offsetLeft`, which rounds to
    // whole pixels — a one-pixel error here would show up as ink that is a
    // pixel off the photo.
    const style = getComputedStyle(container);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderX = borderLeft + (parseFloat(style.borderRightWidth) || 0);
    const borderY = borderTop + (parseFloat(style.borderBottomWidth) || 0);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const padX = padLeft + (parseFloat(style.paddingRight) || 0);
    const padY = padTop + (parseFloat(style.paddingBottom) || 0);

    const origin = {
      x: rect.left + borderLeft + padLeft,
      y: rect.top + borderTop + padTop,
    };
    const content = containRect(
      {
        left: origin.x,
        top: origin.y,
        width: rect.width - borderX - padX,
        height: rect.height - borderY - padY,
      },
      natural.width,
      natural.height,
    );

    return {
      content,
      // The clamp box is the *padding* box, not the content box: once zoomed, the
      // photo is allowed to fill the editor edge to edge instead of stopping at
      // the 16px gutter it was laid out with.
      viewport: {
        left: rect.left,
        top: rect.top,
        width: rect.width - borderX,
        height: rect.height - borderY,
      },
      origin,
    };
  }, [natural]);

  const { transform, controller } = usePanZoom({
    containerRef,
    getBounds,
    // The container only exists once there is a url, so a node that starts empty
    // and is then uploaded into has to re-bind the wheel listener when it appears.
    enabled: hasUrl,
  });

  useEffect(() => {
    if (!hasUrl) {
      setMediaLoading(false);
      setNatural(null);
      return;
    }

    setMediaLoading(true);
    // The decoded size belongs to the *previous* url. This host is not keyed by
    // `node.id` yet (that is M10's `key={node.id}`), so opening another image node in
    // the same Dialog keeps the component mounted: without this reset the letterbox
    // would be measured against the last picture's aspect ratio until the new one
    // decodes. `null` makes `getBaseRect` return `null`, i.e. no ink until the new
    // size is known — a missing layer for a few frames beats ink on the wrong box.
    setNatural(null);
    const image = new Image();
    image.onload = () => {
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
      setMediaLoading(false);
    };
    image.onerror = () => {
      setNatural(null);
      setMediaLoading(false);
    };
    image.src = url;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [hasUrl, url]);

  // The photo moved to a new url: the transform belongs to the old picture, not
  // to the new one, and neither does its decoded size.
  useEffect(() => {
    controller.reset();
  }, [controller, url]);

  /**
   * The painted rectangle, in viewport CSS pixels, or `null` while it does not
   * exist yet.
   *
   * Identity is a contract: the layer re-measures whenever this callback changes,
   * so it must be re-created exactly when the base can have moved — the image
   * finished loading, its natural size changed, **or the viewport transform
   * changed**. The last one is why this is derived from `getBounds()` +
   * `applyTransform` instead of reading the `<img>` element: the element is the
   * thing being transformed, and re-measuring it every frame would put the ink a
   * frame behind the photo.
   */
  const getBaseRect = useCallback((): BaseRect | null => {
    const bounds = getBounds();
    if (!bounds) return null;
    return applyTransform(bounds.content, transform, bounds.origin);
  }, [getBounds, transform]);

  /**
   * One gesture → one write. `patchContent` merges this half onto the **live**
   * node, so the `url` written by an upload can never be rolled back by an
   * annotation (and vice versa, which is what M2's half-merge bought us).
   */
  const handleItemsChange = useCallback(
    (items: Annotation[]) => {
      patchContent({ annotations: { version: 1, items } });
    },
    [patchContent],
  );

  /**
   * The two "leave now" moments (plan §M5.1 item 8). With the shared writer a
   * finished gesture is already a queued write, so this is about the *last*
   * microtask: a flush here cannot lose a stroke that the user drew a millisecond
   * before closing the dialog.
   */
  useEffect(() => {
    const flush = () => {
      void NodeService.flushPendingUpdate(node.id);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [node.id]);

  if (!hasUrl) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept="image/*"
        variant="image"
        className={cn("w-full h-full", className)}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center p-4 w-full h-full overflow-hidden",
        className,
      )}
    >
      {mediaLoading && (
        <div className="absolute inset-0 z-10">
          <LoadingPlaceholder variant="image" />
        </div>
      )}
      <img
        src={url}
        alt={node.title || "图片"}
        draggable={false}
        // `object-contain` on a full-size box: the element box is the container's
        // content box and the *painted* box is `containRect(...)`, which is exactly
        // the rectangle the annotation layer is handed. Anything else would put the
        // ink where the image is not.
        //
        // The transform is the shared viewport, applied here and *derived* (not
        // re-measured) for the ink: `transform-origin: 0 0` is what
        // `pan-zoom/transform.ts` assumes, and `getBounds().origin` names the same
        // point in viewport coordinates.
        style={{
          transform: transformToCss(transform),
          transformOrigin: "0 0",
          willChange: "transform",
        }}
        className={cn(
          "aspect-auto h-full w-full rounded-sm object-contain transition-opacity duration-300",
          mediaLoading ? "opacity-0" : "opacity-100",
        )}
      />
      <AnnotationLayer
        items={node.content?.annotations?.items}
        onItemsChange={handleItemsChange}
        getBaseRect={getBaseRect}
        panZoom={controller}
        compact={compact}
      />
      {/*
        The mouse's 恢复位置大小. It is a *sibling* of the layer rather than a
        child so it stays out of the layer's contract: `panZoom` is the whole
        interface it needs, and the pdf host that reuses `pan-zoom/` gets the
        same control by rendering this one line. It draws nothing at fit, and it
        sits above the ink canvas (`z-20` vs `z-10`) while taking pointers only
        on the pill itself.
      */}
      <PanZoomResetButton transform={transform} controller={controller} />
    </div>
  );
}
