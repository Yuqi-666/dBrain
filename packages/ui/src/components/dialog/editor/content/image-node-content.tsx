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
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Annotation, ImageContent, ImageNodeData } from "@workspace/interfaces";
import { NodeService } from "@workspace/services";
import { useUIStore } from "@workspace/store";
import { resolveFileUrl } from "@workspace/api-client";
import { AnnotationLayer } from "@workspace/ui/components/annotation/annotation-layer";
import { containRect } from "@workspace/ui/components/annotation/geometry";
import type { BaseRect } from "@workspace/ui/components/annotation/types";
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

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [mediaLoading, setMediaLoading] = useState(hasUrl);
  /** Natural size of the decoded image — EXIF already applied by the browser. */
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  );

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

  useEffect(() => {
    if (!hasUrl) {
      setMediaLoading(false);
      setNatural(null);
      return;
    }

    setMediaLoading(true);
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

  /**
   * The painted rectangle, in viewport CSS pixels, or `null` while it does not
   * exist yet.
   *
   * Identity is a contract: the layer re-measures whenever this callback changes,
   * so it must be re-created exactly when the base can have moved (the image
   * finished loading, or its natural size changed). It reads the element's box at
   * call time, so a container resize does **not** need a new identity — the layer's
   * own `ResizeObserver` calls back into it.
   */
  const getBaseRect = useCallback((): BaseRect | null => {
    const image = imageRef.current;
    if (!image || !natural) return null;
    const rect = image.getBoundingClientRect();
    return containRect(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      natural.width,
      natural.height,
    );
  }, [natural]);

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
        ref={imageRef}
        src={url}
        alt={node.title || "图片"}
        className={cn(
          // `object-contain` on a full-size box: the element box is the container's
          // content box and the *painted* box is `containRect(...)`, which is exactly
          // the rectangle the annotation layer is handed. Anything else would put the
          // ink where the image is not.
          "aspect-auto h-full w-full rounded-sm object-contain transition-opacity duration-300",
          mediaLoading ? "opacity-0" : "opacity-100",
        )}
      />
      <AnnotationLayer
        items={node.content?.annotations?.items}
        onItemsChange={handleItemsChange}
        getBaseRect={getBaseRect}
        compact={compact}
      />
    </div>
  );
}
