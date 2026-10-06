"use client";

/**
 * The node preview's **body** — the type-specific half of `PreviewBlock`.
 *
 * Frozen shape (`docs/plan/node-content-ui.md` §0-2; **W1-C owns the body** —
 * R1 moves the existing `PreviewHeader` + `previews/*` ten-way dispatch here so
 * the stale-check for M8 has one stable landmark to grep for:
 * `grep -rn "NodePreviewBody" packages/ui/src`).
 *
 * It deliberately carries **no positioning, no hover chrome and no
 * `data-preview-block` shell** — those stay in `preview-block.tsx`.
 */
import type { ReactNode } from "react";
import type { NodeData } from "@workspace/interfaces";

export interface PreviewBodyProps {
  node: NodeData;
  className?: string;
}

export function NodePreviewBody({ node }: PreviewBodyProps): ReactNode {
  // TODO(W1-C): move `PreviewHeader` + the `previews/*` dispatch out of
  // `preview-block.tsx` (its `:68-93` switch) behind this signature, unchanged.
  void node;
  return null;
}
