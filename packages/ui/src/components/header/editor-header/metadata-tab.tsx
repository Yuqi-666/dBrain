"use client";

interface MetadataTabProps {
  node: any;
}

export function MetadataTab({ node }: MetadataTabProps) {
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标题</span>
        <p className="font-medium">{node.title || "未命名"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">类型</span>
        <p className="font-medium">{node.nodeType}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">创建时间</span>
        <p className="text-xs">{node.createdAt || "未知"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">更新时间</span>
        <p className="text-xs">{node.updatedAt || "未知"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">标签</span>
        <p className="text-xs">{node.tags?.join(", ") || "无"}</p>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">语义ID</span>
        <p className="text-xs font-mono">{node.semanticId || "无"}</p>
      </div>
    </div>
  );
}
