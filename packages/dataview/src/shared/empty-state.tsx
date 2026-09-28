"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Shared empty state for data views: no rows, missing required fields, or a
 * renderer that is still a placeholder.
 */
export function DataViewEmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center",
        className,
      )}
    >
      <Icon className="size-10 text-muted-foreground/70" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-xs text-muted-foreground/70">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
