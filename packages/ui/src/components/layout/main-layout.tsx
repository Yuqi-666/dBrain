"use client";

import { useUIStore } from "@workspace/store";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef } from "react";

interface CognitiveGraphLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

/** Matches an open dropdown menu rendered in a portal (outside the sidebar). */
const MENU_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-radix-menu-content]",
  "[data-slot='dropdown-menu-content']",
  "[data-slot='dropdown-menu-sub-content']",
].join(",");

export function MainLayout({
  children,
  sidebar,
}: CognitiveGraphLayoutProps) {
  const sidebarMode = useUIStore((state) => state.sidebarMode);
  const closeSidebar = useUIStore((state) => state.closeSidebar);
  const showTempSidebar = useUIStore((state) => state.showTempSidebar);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnterEdge = () => {
    if (sidebarMode === "closed") {
      showTempSidebar();
    }
  };

  /**
   * temp 面板保持显示 ⟺ 指针在 sidebar 上 ∨ 其弹出的菜单仍打开。
   * 条件派生自 DOM 实况（elementFromPoint + 菜单存在性），并在两类
   * 状态变化时重估：指针移动，以及菜单开/关——菜单关闭不产生
   * pointermove，但必产生 DOM 增删，故用 MutationObserver 观察。
   */
  useEffect(() => {
    if (sidebarMode !== "temp") return;

    let lastX = -1;
    let lastY = -1;

    const keepOpen = () => {
      if (document.querySelector(MENU_SELECTOR)) return true;
      const el = document.elementFromPoint(lastX, lastY);
      return !!el && !!sidebarRef.current?.contains(el);
    };

    const evaluate = () => {
      if (!keepOpen()) closeSidebar();
    };

    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      evaluate();
    };

    const observer = new MutationObserver((mutations) => {
      const menuChanged = mutations.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (n) => n instanceof Element && n.matches(MENU_SELECTOR),
        ),
      );
      if (menuChanged) evaluate();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
    };
  }, [sidebarMode, closeSidebar]);

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

      <div
        ref={sidebarRef}
        className={cn(
          "h-full shrink-0 transition-all duration-200 ease-in-out",
          isFixedMode && "w-64 relative z-30",
          isTempMode && "fixed left-0 top-0 z-40 w-64 shadow-lg",
          sidebarMode === "closed" && "hidden",
        )}
      >
        {sidebar}
      </div>

      <main className="relative flex-1">{children}</main>
    </div>
  );
}
