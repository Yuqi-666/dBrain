"use client";

import { Suspense } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import type {
  DataView,
  DataViewConfig,
  DataViewSource,
} from "@workspace/interfaces";

import { getDataViewDescriptor } from "../registry";

export interface DataViewConfigPanelProps {
  view: DataView;
  source: DataViewSource;
  readOnly?: boolean;
  /** Fires with the next config for `view.id`. */
  onConfigChange?: (viewId: string, config: DataViewConfig) => void;
  className?: string;
}

/**
 * Collapsible side panel that hosts the active view's own config editor.
 *
 * The editor is resolved from the registry and lazily loaded, exactly like the
 * renderer, so a view type's config UI travels with its implementation.
 */
export function DataViewConfigPanel({
  view,
  source,
  readOnly,
  onConfigChange,
  className,
}: DataViewConfigPanelProps) {
  const descriptor = getDataViewDescriptor(view.type);
  const ConfigEditor = descriptor.configEditor;

  return (
    <aside
      data-dataview-config-panel={view.type}
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-hidden border-l border-border",
        className,
      )}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{descriptor.label}</span>
        <span>视图配置</span>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
        >
          <ConfigEditor
            config={view.config}
            source={source}
            readOnly={readOnly}
            onChange={(config) => onConfigChange?.(view.id, config)}
          />
        </Suspense>
      </div>
    </aside>
  );
}
