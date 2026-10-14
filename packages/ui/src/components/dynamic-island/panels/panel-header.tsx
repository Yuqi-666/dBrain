import type { ReactNode } from "react";

export function IslandPanelHeader({ title }: { title: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1">
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
