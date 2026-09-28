"use client";

import { Suspense } from "react";
import { X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/ui/tooltip";
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
  /** Closes the panel; when absent the panel renders no close affordance. */
  onClose?: () => void;
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
  onClose,
  className,
}: DataViewConfigPanelProps) {
  const descriptor = getDataViewDescriptor(view.type);
  const ConfigEditor = descriptor.configEditor;

  return (
    <TooltipProvider delayDuration={400}>
      <aside
        data-dataview-config-panel={view.type}
        className={cn(
          "flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-background",
          className,
        )}
      >
        <header className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border px-2">
          <span className="truncate text-xs font-medium">
            {descriptor.label}
          </span>
          <span className="text-xs text-muted-foreground">视图配置</span>
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="关闭配置面板"
                  className="ml-auto text-muted-foreground"
                  onClick={onClose}
                >
                  <X className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">关闭面板</TooltipContent>
            </Tooltip>
          )}
        </header>
        <ScrollArea className="min-h-0 flex-1">
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
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}
