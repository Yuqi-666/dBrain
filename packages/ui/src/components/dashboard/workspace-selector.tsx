"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@workspace/store";
import { WorkspaceService } from "@workspace/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";

export function DashboardWorkspaceSelector() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Select
        value={workspaceId ?? undefined}
        disabled={loading}
        onValueChange={(id) => {
          setLoading(true);
          setError(null);
          void WorkspaceService.open(id)
            .catch(() => setError("工作空间加载失败，请重新选择。"))
            .finally(() => setLoading(false));
        }}
      >
        <SelectTrigger className="w-40" aria-label="工作空间">
          <SelectValue placeholder="选择工作空间" />
        </SelectTrigger>
        <SelectContent>
          {Array.from(workspaces.values()).map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
