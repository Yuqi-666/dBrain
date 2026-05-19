"use client";

import { useGraphStore, useUIStore } from "@workspace/store";
import { GraphCQRS } from "@workspace/api-client";
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
import { Button } from "@workspace/ui/components/ui/button";
import { ViewConfigButton } from "./view-config-button";
import {
  CheckIcon,
  PaletteIcon,
  Grid3X3Icon,
  MapIcon,
  LayoutIcon,
} from "lucide-react";
import type { VisualConfig, LayoutType } from "@workspace/interfaces";

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

const LAYOUTS = [
  { label: "力导向", value: "D3force" },
  { label: "层级布局", value: "dagre" },
  { label: "辐射布局", value: "radial" },
  { label: "紧凑盒", value: "compactBox" },
  { label: "鱼骨图", value: "fishbone" },
  { label: "思维导图", value: "mindmap" },
] as const;

interface ViewConfigPanelProps {
  className?: string;
}

/**
 * 视图配置面板 - 配置当前视图的视觉样式
 */
export function ViewConfigPanel({ className }: ViewConfigPanelProps) {
  const currentViewId = useUIStore((state) => state.currentViewId);
  const views = useGraphStore((state) => state.views);

  const currentView = currentViewId ? views.get(currentViewId) : null;
  const visualConfig = currentView?.visualConfig || {};

  const handleUpdateVisualConfig = async (updates: Partial<VisualConfig>) => {
    if (!currentViewId) return;
    await GraphCQRS.upsertView(currentViewId, {
      visualConfig: { ...visualConfig, ...updates },
    });
  };

  const handleUpdateLayout = async (layout: LayoutType) => {
    if (!currentViewId) return;
    await GraphCQRS.upsertView(currentViewId, { layout });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ViewConfigButton />
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
            <LayoutIcon className="size-4 mr-2" />
            <span>布局方式</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-32">
            {LAYOUTS.map((layout) => (
              <DropdownMenuItem
                key={layout.value}
                onClick={() => handleUpdateLayout(layout.value)}
              >
                <span>{layout.label}</span>
                {currentView?.layout === layout.value && (
                  <CheckIcon className="size-3 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem
          onClick={() =>
            handleUpdateVisualConfig({ showMinimap: !visualConfig.showMinimap })
          }
        >
          <MapIcon className="size-4 mr-2" />
          <span>显示小地图</span>
          {visualConfig.showMinimap && <CheckIcon className="size-3 ml-auto" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() =>
            handleUpdateVisualConfig({ snapToGrid: !visualConfig.snapToGrid })
          }
        >
          <span>吸附到网格</span>
          {visualConfig.snapToGrid && <CheckIcon className="size-3 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
