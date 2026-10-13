"use client";
import { ColorPicker } from "@workspace/ui/components/selector/color-picker";

import { translate } from "@workspace/ui/lib/i18n/runtime";
import { useI18n } from "@workspace/ui/lib/i18n";

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

const GRID_STYLES = [
  {
    get label() {
      return translate("网格");
    },
    value: "grid",
  },
  {
    get label() {
      return translate("点阵");
    },
    value: "dots",
  },
  {
    get label() {
      return translate("无");
    },
    value: "none",
  },
];

const VIEW_TYPES = [
  {
    get label() {
      return translate("力导向视图");
    },
    value: "Force",
  },
  {
    get label() {
      return translate("工作流视图");
    },
    value: "Flow",
  },
] as const;

interface ViewConfigPanelProps {
  className?: string;
}

/**
 * 视图配置面板 - 配置当前视图的视觉样式
 */
export function ViewConfigPanel({ className }: ViewConfigPanelProps) {
  const { t } = useI18n();

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
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <ViewConfigButton className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        style={{ direction: "ltr" }}
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel>{t("视图配置")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon className="size-4 mr-2" />
            <span>{t("背景颜色")}</span>
            <span
              aria-hidden
              className="ml-auto size-4 rounded-sm border border-foreground/10"
              style={{ background: visualConfig.backgroundColor ?? "#ffffff" }}
            />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            style={{ direction: "ltr" }}
            className="w-72 rounded-xl p-0"
          >
            <ColorPicker
              value={visualConfig.backgroundColor ?? "#ffffff"}
              onChange={(backgroundColor) =>
                handleUpdateVisualConfig({ backgroundColor })
              }
              aria-label={t("背景颜色")}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Grid3X3Icon className="size-4 mr-2" />
            <span>{t("网格样式")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style={{ direction: "ltr" }} className="w-36">
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
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>{t("网格颜色")}</span>
                <span
                  aria-hidden
                  className="ml-auto size-4 rounded-sm border border-foreground/10"
                  style={{ background: visualConfig.gridColor ?? "#e5e7eb" }}
                />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                style={{ direction: "ltr" }}
                className="w-72 rounded-xl p-0"
              >
                <ColorPicker
                  value={visualConfig.gridColor ?? "#e5e7eb"}
                  onChange={(gridColor) =>
                    handleUpdateVisualConfig({ gridColor })
                  }
                  onClear={() =>
                    handleUpdateVisualConfig({ gridColor: "#e5e7eb" })
                  }
                  clearLabel={t("默认颜色")}
                  aria-label={t("网格颜色")}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <RadiusIcon className="size-4 mr-2" />
            <span>{t("节点密度")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style={{ direction: "ltr" }} className="w-48">
            <div className="px-2 py-1.5" title={t("仅「力导向」布局生效")}>
              <div className="mb-1 text-center text-xs text-muted-foreground">
                {densityScaleLabel(nodeDensity)}
              </div>
              <Slider
                aria-label={t("节点密度")}
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
            <span>{t("视图类型")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style={{ direction: "ltr" }} className="w-32">
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
  const { t } = useI18n();

  return (
    <Button
      variant="outline"
      size="icon-lg"
      ref={ref}
      className={className}
      aria-label={t("视图配置")}
      {...props}
    >
      <SettingsIcon />
    </Button>
  );
});

ViewConfigButton.displayName = "ViewConfigButton";
