"use client";

import { Position } from "@xyflow/react";
import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { RichTextNodeData } from "@workspace/interfaces";

export function RichTextNode(props: CustomNodeProps) {
  const source = props.data.source as RichTextNodeData;
  const refCount = source.content?.referencedNodes?.length ?? 0;
  return (
    <NodeErrorBoundary>
      <NodeShell
        {...props}
        handleLayout={{ target: Position.Top, source: Position.Bottom }}
      >
        <div className="min-w-[200px] max-w-[280px] rounded-md border bg-background p-2 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{source.title}</div>
              <div className="text-[11px] text-muted-foreground">Rich text</div>
            </div>
          </div>
          {refCount > 0 ? (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {refCount} referenced node{refCount === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}
