"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type {
  DataViewConfig,
  DataViewSource,
  DataViewType,
} from "@workspace/interfaces";

import { DataViewEmptyState } from "./empty-state";

export interface DataViewPlaceholderProps {
  type: DataViewType;
  icon: LucideIcon;
  /** Human label, e.g. "表格视图". */
  label: string;
  description: string;
  /** Libraries this view is planned to be built on (README §9.1). */
  plannedDependencies?: string[];
  source: DataViewSource;
  config: DataViewConfig;
  readOnly?: boolean;
  className?: string;
}

/**
 * The shared body every not-yet-implemented data view renders.
 *
 * A view becomes real by replacing its own `*-data-view.tsx` body with the
 * actual renderer (VTable, FullCalendar, VChart, …) while keeping the same
 * props contract — this placeholder exists so the shell, registry, routing and
 * host integration can be built and reviewed independently of the eight
 * heavyweight libraries the views will eventually pull in.
 */
export function DataViewPlaceholder({
  type,
  icon: Icon,
  label,
  description,
  plannedDependencies,
  source,
  config,
  readOnly,
  className,
}: DataViewPlaceholderProps) {
  return (
    <div
      data-dataview-placeholder={type}
      className={cn(
        "flex h-full min-h-0 w-full flex-col gap-3 overflow-auto p-4",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
          {label}
        </span>
        <span className="rounded-md border border-dashed border-border px-2 py-0.5">
          占位未实现
        </span>
        <span>
          {source.rows.length} 行 · {source.fields.length} 字段 · 数据源{" "}
          {source.kind}
        </span>
        {readOnly && (
          <span className="rounded-md bg-muted px-2 py-0.5">只读</span>
        )}
      </header>

      <DataViewEmptyState
        icon={Icon}
        title={`${label}尚未实现`}
        description={description}
      />

      {plannedDependencies && plannedDependencies.length > 0 && (
        <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-1.5">
          {plannedDependencies.map((dependency) => (
            <code
              key={dependency}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {dependency}
            </code>
          ))}
        </div>
      )}

      <details className="rounded-lg border border-border bg-card/40">
        <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
          当前视图配置（只读预览）
        </summary>
        <pre className="max-h-64 overflow-auto px-3 pb-3 text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(config, null, 2)}
        </pre>
      </details>
    </div>
  );
}
