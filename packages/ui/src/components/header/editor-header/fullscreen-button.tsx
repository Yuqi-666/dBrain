"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";
import { useUIStore } from "@workspace/store";

interface FullscreenButtonProps {
  className?: string;
}

export function FullscreenButton({ className }: FullscreenButtonProps) {
  const mainViewType = useUIStore((state) => state.mainViewType);
  const setMainViewType = useUIStore((state) => state.setMainViewType);

  const toggleFullscreen = () => {
    if (mainViewType === "editor") {
      setMainViewType("graph");
    } else {
      setMainViewType("editor");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className={className}
      aria-label={mainViewType === "editor" ? "退出全屏" : "进入全屏"}
    >
      {mainViewType === "editor" ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}
