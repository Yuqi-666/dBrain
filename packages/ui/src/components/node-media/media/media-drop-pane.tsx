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
 * (sel §6.1). The write itself stays inside `FileDropZone` for P0, so the
 * selector's displayed value comes from the host's store subscription, not from
 * a callback.
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
