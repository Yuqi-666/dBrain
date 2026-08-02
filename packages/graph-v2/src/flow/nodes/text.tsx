"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { TextNodeData } from "@workspace/interfaces";

/**
 * Text node — displays a short title + content preview.
 */
export function TextNode(props: CustomNodeProps) {
  const source = props.data.source as TextNodeData;
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="min-w-[160px] max-w-[240px] rounded-md border bg-background p-2 text-xs shadow-sm">
          <div className="truncate font-medium">{source.title}</div>
          <TextPreview source={source} />
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}

function TextPreview({ source }: { source: TextNodeData }) {
  const docs = source.content?.docs;
  const summary = describeDocs(docs);
  if (!summary) return null;
  return <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{summary}</div>;
}


function describeDocs(docs: unknown): string {
  if (!docs || typeof docs !== "object") return "";
  try {
    return Object.keys(docs as Record<string, unknown>).join(" • ");
  } catch {
    return "";
  }
}
