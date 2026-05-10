"use client";
import GraphIcon from "../../../img/icon/graph.svg";
import { Button } from "@workspace/ui/components/ui/button";
import { useUIStore } from "@workspace/store";

interface BackToGraphButtonProps {
  className?: string;
  onClick?: () => void;
}

/**
 * 返回节点图按钮 - 从编辑器返回到节点图视图
 */
export function BackToGraphButton({
  className,
  onClick,
}: BackToGraphButtonProps) {
  const setMainViewType = useUIStore((state) => state.setMainViewType);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={className}
      aria-label="返回节点图"
    >
      <img src={GraphIcon.src} alt="返回节点图" className="" />
    </Button>
  );
}
