"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { SettingsIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/ui/button";

interface ViewConfigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

/**
 * 视图配置按钮 - 触发视图配置面板
 */
export const ViewConfigButton = forwardRef<
  HTMLButtonElement,
  ViewConfigButtonProps
>(({ className, ...props }, ref) => {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      ref={ref}
      className={className}
      aria-label="视图配置"
      {...props}
    >
      <SettingsIcon />
    </Button>
  );
});

ViewConfigButton.displayName = "ViewConfigButton";
