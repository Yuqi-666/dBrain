"use client";

/**
 * The upload pane both selectors share: the picker UI only.
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2 — W1-A owns the body).
 *
 * It passes the display variant through to `FileDropZone`, whose `icon` / `cover`
 * branches write the **top-level** field (`{ icon: { kind: "image", value } }` /
 * `{ cover: { kind: "image", url } }`) instead of `content` — reusing
 * `variant="image"` here would replace the node's content with the new picture
 * (sel §6.1 / plan §M2.2-7).
 *
 * Boundaries this file keeps (sel §2):
 *
 * - **No store, no write.** Reading the node back is the host's job; this pane
 *   never touches `NodeService`. `onUploaded` deliberately carries no url — the
 *   displayed value arrives through the host's own store subscription.
 * - **Upload is the one sanctioned exception** to "the selector does not write":
 *   P0 keeps `FileDropZone`'s self-write (`file-drop-zone.tsx`) and folds it into
 *   the `icon` / `cover` variants, so a successful upload lands in the node
 *   without the popover having to round-trip the url.
 * - **Failure changes nothing.** `onError` only bubbles the message up to the
 *   popover's error strip; the pane must not write, and must not clear the value
 *   the node already had (sel §6.1).
 *
 * The pane takes `nodeId`, not the whole node, because that is all
 * `FileDropZone` needs to attach the blob to the right record.
 */
import type { ReactNode } from "react";
import { FileDropZone } from "@workspace/ui/components/dialog/editor/content/file-drop-zone";

export interface MediaDropPaneProps {
  nodeId: string;
  /** Which display field the upload lands in. */
  variant: "icon" | "cover";
  /** Defaults to `image/*`. */
  accept?: string;
  onUploadStart?: () => void;
  /** Fired after a successful upload; the url is written by `FileDropZone`. */
  onUploaded?: () => void;
  /** Upload failure bubbles here — the pane must not write or clear the value. */
  onError?: (error: Error) => void;
  className?: string;
}

export function MediaDropPane({
  nodeId,
  variant,
  accept = "image/*",
  onUploadStart,
  onUploaded,
  onError,
  className,
}: MediaDropPaneProps): ReactNode {
  return (
    <FileDropZone
      nodeId={nodeId}
      variant={variant}
      accept={accept}
      onUploadStart={onUploadStart}
      onUploaded={onUploaded}
      onUploadError={onError}
      className={className}
    />
  );
}
