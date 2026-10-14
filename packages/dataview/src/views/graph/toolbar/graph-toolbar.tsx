"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

/**
 * The graph view's toolbar — its one control strip.
 *
 * Layout contract (same as every view): **configuration on the left, functions
 * on the right**, every control a button or a popover panel. The shell's 更多
 * menu is appended to the function group by `ViewToolbar`, so the tab strip stays
 * pure navigation.
 *
 * Left: 布局 (the two layouts `@workspace/graph` knows, with 流程图 disabled while
 * its implementation is a placeholder shell) and 视图 (the three backgrounds the
 * force renderer really paints). Right: nothing but the shell's 更多 — the graph
 * states its own extent on the canvas, so there is no readout to carry.
 *
 * The collection's filter is deliberately **not** here: it is the node content's,
 * not this view's config, and its entry lives in `collection-node-content.tsx`
 * beside the write path (see `graph-data-view.tsx`). Everything on this strip is
 * `GraphViewConfig`.
 */
import { LayoutGrid, Waypoints } from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/ui/toggle-group";
import type { GraphViewConfig } from "@workspace/interfaces";

import { PanelSection, SettingsPanel } from "../../../shared/settings-panel";
import { ViewToolbar } from "../../../shared/view-toolbar";
import {
  GRAPH_BACKGROUND_STYLES,
  GRAPH_FLOW_UNAVAILABLE_HINT,
  GRAPH_LAYOUT_MODES,
  resolveGraphBackgroundStyle,
  resolveGraphViewType,
} from "../core/config";

export interface GraphToolbarProps {
  config: GraphViewConfig;
  /** The host allows view management → every config write needs this. */
  canConfigure: boolean;
  onConfigChange?: (config: GraphViewConfig) => void;
  className?: string;
}

export function GraphToolbar({
  config,
  canConfigure,
  onConfigChange,
  className,
}: GraphToolbarProps) {
  const { t } = useI18n();

  const patch = (next: Partial<GraphViewConfig>) =>
    onConfigChange?.({ ...config, ...next });

  const viewType = resolveGraphViewType(config.viewType);
  const backgroundStyle = resolveGraphBackgroundStyle(config.visualConfig);

  return (
    <ViewToolbar className={className}>
      {/* ——————— 布局 ——————— */}
      <SettingsPanel
        label={t("布局")}
        icon={Waypoints}
        value={
          GRAPH_LAYOUT_MODES.find((mode) => mode.value === viewType)?.label
        }
        disabled={!canConfigure}
      >
        <PanelSection
          label={t("布局模式")}
          hint={t(GRAPH_FLOW_UNAVAILABLE_HINT)}
        >
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={viewType}
            disabled={!canConfigure}
            onValueChange={(next) => {
              if (!next) return;
              patch({ viewType: next as GraphViewConfig["viewType"] });
            }}
          >
            {GRAPH_LAYOUT_MODES.map((mode) => (
              <ToggleGroupItem
                key={mode.value}
                value={mode.value}
                disabled={mode.disabled}
                className="h-7 px-2 text-xs"
              >
                {mode.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </PanelSection>
      </SettingsPanel>

      {/* ——————— 视图 ——————— */}
      <SettingsPanel
        label={t("视图")}
        icon={LayoutGrid}
        value={
          GRAPH_BACKGROUND_STYLES.find(
            (style) => style.value === backgroundStyle,
          )?.label
        }
        disabled={!canConfigure}
      >
        <PanelSection label={t("背景")}>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={backgroundStyle}
            disabled={!canConfigure}
            onValueChange={(next) => {
              if (!next) return;
              // Only the style is persisted; the colours are the app's
              // light/dark tokens (see `core/config.ts`).
              patch({
                visualConfig: {
                  ...config.visualConfig,
                  backgroundStyle: next as NonNullable<
                    GraphViewConfig["visualConfig"]["backgroundStyle"]
                  >,
                },
              });
            }}
          >
            {GRAPH_BACKGROUND_STYLES.map((style) => (
              <ToggleGroupItem
                key={style.value}
                value={style.value}
                className="h-7 px-2 text-xs"
              >
                {style.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </PanelSection>
      </SettingsPanel>
    </ViewToolbar>
  );
}
