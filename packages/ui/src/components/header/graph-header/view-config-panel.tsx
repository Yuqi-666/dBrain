"use client";

import { useDataStore, useUIStore } from "@workspace/store";
import { ViewService } from "@workspace/services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  CheckIcon,
  PaletteIcon,
  Grid3X3Icon,
  LayoutIcon,
  RadiusIcon,
  SettingsIcon,
} from "lucide-react";
import type { VisualConfig, ViewType } from "@workspace/interfaces";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Slider } from "@workspace/ui/components/ui/slider";
import {
  DENSITY_SLIDER_STEPS,
  NODE_DENSITY,
  densityScaleLabel,
  densityToPosition,
  positionToDensity,
} from "./node-density";

const BACKGROUND_COLORS = [
  { label: "默认白", value: "#ffffff" },
  { label: "浅灰", value: "#f8f9fa" },
  { label: "深灰", value: "#343a40" },
  { label: "深蓝", value: "#1a365d" },
  { label: "黑色", value: "#000000" },
];

const GRID_STYLES = [
  { label: "网格", value: "grid" },
  { label: "点阵", value: "dots" },
  { label: "无", value: "none" },
];

const VIEW_TYPES = [
  { label: "力导向视图", value: "Force" },
  { label: "工作流视图", value: "Flow" },
] as const;

interface ViewConfigPanelProps {
  className?: string;
}

/**
 * 视图配置面板 - 配置当前视图的视觉样式
 */
export function ViewConfigPanel({ className }: ViewConfigPanelProps) {
  const currentViewId = useUIStore((state) => state.currentViewId);
  const views = useDataStore((state) => state.views);

  const currentView = currentViewId ? views.get(currentViewId) : null;
  const visualConfig = currentView?.visualConfig || {};

  /** 未设置时滑杆停在渲染器的默认密度上。 */
  const nodeDensity = visualConfig.nodeDensity ?? NODE_DENSITY.default;
  const densityPosition = densityToPosition(nodeDensity);

  const handleUpdateVisualConfig = (updates: Partial<VisualConfig>) => {
    if (!currentViewId) return;
    void ViewService.upsert(
      currentViewId,
      {
        visualConfig: { ...visualConfig, ...updates },
      },
      { debounce: true },
    );
  };

  const handleUpdateViewType = (viewType: ViewType) => {
    if (!currentViewId) return;
    void ViewService.upsert(currentViewId, { viewType }, { debounce: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ViewConfigButton className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>视图配置</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon className="size-4 mr-2" />
            <span>背景颜色</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-32">
            {BACKGROUND_COLORS.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() =>
                  handleUpdateVisualConfig({ backgroundColor: color.value })
                }
              >
                <span
                  className="size-4 rounded mr-2 border"
                  style={{ backgroundColor: color.value }}
                />
                <span>{color.label}</span>
                {visualConfig.backgroundColor === color.value && (
                  <CheckIcon className="size-3 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Grid3X3Icon className="size-4 mr-2" />
            <span>网格样式</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-28">
            {GRID_STYLES.map((style) => (
              <DropdownMenuItem
                key={style.value}
                onClick={() =>
                  handleUpdateVisualConfig({
                    backgroundStyle:
                      style.value as VisualConfig["backgroundStyle"],
                  })
                }
              >
                <span>{style.label}</span>
                {visualConfig.backgroundStyle === style.value && (
                  <CheckIcon className="size-3 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <RadiusIcon className="size-4 mr-2" />
            <span>节点密度</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <div className="px-2 py-1.5" title="仅「力导向」布局生效">
              <div className="mb-1 text-center text-xs text-muted-foreground">
                {densityScaleLabel(nodeDensity)}
              </div>
              <Slider
                aria-label="节点密度"
                min={0}
                max={DENSITY_SLIDER_STEPS}
                step={1}
                value={[densityPosition]}
                onValueChange={([position]) => {
                  if (position === undefined) return;
                  handleUpdateVisualConfig({
                    nodeDensity: positionToDensity(position),
                  });
                }}
                className="min-h-7"
              />
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LayoutIcon className="size-4 mr-2" />
            <span>视图类型</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-32">
            {VIEW_TYPES.map((viewType) => (
              <DropdownMenuItem
                key={viewType.value}
                onClick={() => handleUpdateViewType(viewType.value as ViewType)}
              >
                <span>{viewType.label}</span>
                {currentView?.viewType === viewType.value && (
                  <CheckIcon className="size-3 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
