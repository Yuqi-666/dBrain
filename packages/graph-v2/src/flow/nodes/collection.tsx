"use client";

import { NodeShell, type CustomNodeProps } from "./NodeShell";
import { NodeErrorBoundary } from "./ErrorBoundary";
import type { CollectionNodeData } from "@workspace/interfaces";

export function CollectionNode(props: CustomNodeProps) {
  const source = props.data.source as CollectionNodeData;
  const { filterConfig } = source.content;
  const ruleCount = countRules(filterConfig?.ruleGroup);
  return (
    <NodeErrorBoundary>
      <NodeShell {...props}>
        <div className="min-w-[200px] max-w-[280px] rounded-md border border-dashed bg-background p-2 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">⊕</span>
            <div className="min-w-0">
              <div className="truncate font-medium">{source.title}</div>
              <div className="text-[11px] text-muted-foreground">
                Collection
                {ruleCount > 0 ? ` • ${ruleCount} rule${ruleCount === 1 ? "" : "s"}` : ""}
              </div>
            </div>
          </div>
        </div>
      </NodeShell>
    </NodeErrorBoundary>
  );
}

function countRules(rg: unknown): number {
  if (!rg || typeof rg !== "object") return 0;
  const rules = (rg as { rules?: unknown[] }).rules;
  if (!Array.isArray(rules)) return 0;
  let n = 0;
  for (const r of rules) {
    if (r && typeof r === "object" && "rules" in r) {
      n += countRules(r);
    } else {
      n += 1;
    }
  }
  return n;
}
