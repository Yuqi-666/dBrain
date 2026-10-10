"use client";

import { useDataStore } from "@workspace/store";
import type { NodeData } from "@workspace/interfaces";
import { FileText } from "lucide-react";
import { NodeIconView } from "@workspace/ui/components/node-media/node-icon-view";
import { NODE_TYPE_ICONS } from "@workspace/ui/components/node-media/node-type-icons";

export function PreviewHeader({ node }: { node: NodeData }) {
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const semantic = nodeSemantics.get(node.semanticId);
  const Icon = NODE_TYPE_ICONS[node.nodeType] ?? FileText;

  return (
    <div className="px-4 pt-4 pb-2 pr-12">
      <div className="flex items-start gap-2">
        <NodeIconView
          icon={node.icon ?? undefined}
          fallback={<Icon className="size-4 text-muted-foreground" />}
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {node.title || "未命名节点"}
          </h3>
          {semantic && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {semantic.name}
            </p>
          )}
        </div>
      </div>
      {node.abstract && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {node.abstract}
        </p>
      )}
    </div>
  );
}
