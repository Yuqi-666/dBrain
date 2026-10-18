"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { STORAGE_CATEGORIES } from "@workspace/api-client";
import type { StorageLimits, StorageUsage } from "@workspace/api-client";
import { Progress } from "@workspace/ui/components/ui/progress";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryIcon, categoryLabel } from "./resource-category";
import { formatBytes, formatPercent } from "./format-bytes";

/** Percentage of the quota past which the storage bar turns destructive. */
const CRITICAL_PERCENT = 90;

/**
 * The storage panel: the owner's total occupation against the deployment
 * quota, then the same bytes split over the five categories.
 *
 * The usage also counts the artifacts the server derived from a resource
 * (covers, HLS playlists, segments): the library hides their cards, but their
 * bytes are charged against the quota.
 *
 * A record without a recorded size still counts as a resource but adds no
 * bytes, so `usage.total` can understate the number of records on screen; that
 * is deliberate, because the quota is charged on bytes the server recorded.
 */
export function StorageUsagePanel({
  usage,
  limits,
}: {
  usage: StorageUsage;
  limits: StorageLimits;
}) {
  const { t } = useI18n();

  const quota = limits.userQuotaBytes;
  const unlimited = quota <= 0;
  const percent = unlimited ? 0 : (usage.total / quota) * 100;
  const critical = !unlimited && percent > CRITICAL_PERCENT;
  const usedLabel = formatBytes(usage.total);
  const quotaLabel = unlimited ? t("不限") : formatBytes(quota);
  const remainingLabel = unlimited
    ? t("不限")
    : formatBytes(Math.max(0, quota - usage.total));
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <section
      aria-labelledby="resource-storage-title"
      className="mt-6 rounded-xl border bg-card p-5 text-card-foreground shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="resource-storage-title"
          className="text-sm font-medium tracking-tight"
        >
          {t("存储空间")}
        </h2>
        <span
          className={cn(
            "text-xs tabular-nums",
            critical ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {unlimited
            ? t("不限")
            : t("已用 {value1}%", { value1: formatPercent(percent) })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {usedLabel}
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {quotaLabel}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {t("剩余 {value1}", { value1: remainingLabel })}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={t("存储空间占用")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedPercent)}
        className="mt-2"
      >
        <Progress
          value={clampedPercent}
          className={cn("h-2.5", critical && "[&>div]:bg-destructive")}
        />
      </div>
      {critical ? (
        <p className="mt-2 text-xs text-destructive" role="status">
          {t("存储空间已用超过 90%。")}
        </p>
      ) : null}

      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          {t("按类型")}
        </p>
        <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
          {STORAGE_CATEGORIES.map((category) => {
            const bytes = usage.byCategory[category];
            const share = usage.total > 0 ? (bytes / usage.total) * 100 : 0;
            return (
              <div key={category} className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <CategoryIcon
                    category={category}
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{categoryLabel(category, t)}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                    {formatBytes(bytes)}
                  </span>
                </div>
                {/* Decorative: the byte count beside it is the accessible value. */}
                <div aria-hidden="true" className="mt-1.5">
                  <Progress value={Math.min(100, share)} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
