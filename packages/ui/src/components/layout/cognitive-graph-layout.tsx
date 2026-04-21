"use client";

import { useUIStore } from "@workspace/store";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback } from "react";

interface CognitiveGraphLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function CognitiveGraphLayout({
  children,
  sidebar,
}: CognitiveGraphLayoutProps) {
  const sidebarMode = useUIStore((state) => state.sidebarMode);
  const closeSidebar = useUIStore((state) => state.closeSidebar);
  const showTempSidebar = useUIStore((state) => state.showTempSidebar);

  const handleMouseEnterEdge = useCallback(() => {
    if (sidebarMode === "closed") {
      showTempSidebar();
    }
  }, [sidebarMode, showTempSidebar]);

  const handleMouseLeaveSidebar = useCallback(() => {
    if (sidebarMode === "temp") {
      closeSidebar();
    }
  }, [sidebarMode, closeSidebar]);

  const isSidebarVisible = sidebarMode !== "closed";
  const isFixedMode = sidebarMode === "fixed";
  const isTempMode = sidebarMode === "temp";

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {!isFixedMode && (
        <div
          className="absolute left-0 top-0 z-30 h-full w-3 "
          onMouseEnter={handleMouseEnterEdge}
        />
      )}

      {isSidebarVisible && (
        <div
          className={cn(
            "h-full shrink-0 transition-all duration-200 ease-in-out",
            isFixedMode && "w-70 relative z-30",
            isTempMode && "fixed left-0 top-0 z-40 w-70 shadow-lg",
          )}
          onMouseLeave={handleMouseLeaveSidebar}
        >
          {sidebar}
        </div>
      )}

      <main className="relative flex-1">{children}</main>
    </div>
  );
}
