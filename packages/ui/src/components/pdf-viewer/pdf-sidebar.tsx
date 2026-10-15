"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

/**
 * The viewer's left rail: page thumbnails and the document outline.
 *
 * Both lists share one panel, so the two entry points in the toolbar are a tab
 * strip rather than two independently movable panes — one rail is all a dialog
 * that is 80vh tall can afford.
 *
 * Thumbnails are rendered *only when scrolled near*, at the width they are
 * displayed at: a 500-page document would otherwise paint 500 canvases before
 * the first one is looked at.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { FileWarning, X } from "lucide-react";

import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { pdfSpreadStep, type PdfSpread } from "./types";
import type {
  PdfOutlineEntry,
  PdfPageMetrics,
  PdfRenderTask,
  PdfSidebarTab,
} from "./types";

export interface PdfSidebarProps {
  tab: PdfSidebarTab;
  /** The leading page of the slot on screen; see `pdfSlotStartPage`. */
  page: number;
  pageCount: number;
  /** 双页 lights up both halves of the spread that is showing. */
  spread: PdfSpread;
  metrics: ReadonlyMap<number, PdfPageMetrics>;
  getPage: (page: number) => Promise<PDFPageProxy | null>;
  outline: readonly PdfOutlineEntry[] | null;
  onSelectPage: (page: number) => void;
  onTabChange: (tab: PdfSidebarTab) => void;
  onClose: () => void;
  className?: string;
}

const THUMB_WIDTH = 132;

function PdfThumbnail({
  page,
  metrics,
  active,
  getPage,
  onSelect,
}: {
  page: number;
  metrics: PdfPageMetrics;
  active: boolean;
  getPage: (page: number) => Promise<PDFPageProxy | null>;
  onSelect: (page: number) => void;
}) {
  useI18n();

  const holderRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(
    metrics.width > 0 ? metrics.height / metrics.width : Math.SQRT2,
  );

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );
    observer.observe(holder);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: PdfRenderTask | null = null;

    const paint = async () => {
      const proxy = await getPage(page);
      if (!proxy || cancelled) return;
      const base = proxy.getViewport({ scale: 1 });
      const viewport = proxy.getViewport({ scale: THUMB_WIDTH / base.width });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setRatio(viewport.height / viewport.width);

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      task = proxy.render({
        canvasContext: context,
        viewport,
        intent: "display",
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      });
      await task.promise;
    };

    void paint().catch((error: unknown) => {
      if ((error as { name?: string })?.name !== "AbortException") {
        // A thumbnail that cannot be painted is not worth a message; the page
        // itself reports the real failure.
      }
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, page, getPage]);

  return (
    <button
      ref={holderRef}
      type="button"
      onClick={() => onSelect(page)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full flex-col items-center gap-1 rounded-md p-1 transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted",
      )}
    >
      <span
        className={cn(
          // The page is white paper in both themes, so its hairline is a fixed
          // black — `ring-border`/`ring-foreground` would be a *white* line on
          // white paper under the dark theme.
          "relative block overflow-hidden rounded-sm bg-white ring-1",
          active ? "ring-2 ring-primary" : "ring-black/10",
        )}
        style={{
          width: `${THUMB_WIDTH}px`,
          height: `${THUMB_WIDTH * ratio}px`,
        }}
      >
        {!visible && <Skeleton className="absolute inset-0 rounded-none" />}
        <canvas ref={canvasRef} className="block" />
      </span>
      <span
        className={cn(
          "text-xs tabular-nums",
          active ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {page}
      </span>
    </button>
  );
}

function OutlineList({
  entries,
  depth,
  activePages,
  onSelectPage,
}: {
  entries: readonly PdfOutlineEntry[];
  depth: number;
  activePages: ReadonlySet<number>;
  onSelectPage: (page: number) => void;
}) {
  useI18n();

  return (
    <ul className={cn("flex flex-col", depth > 0 && "pl-3")}>
      {entries.map((entry, index) => (
        <li key={`${entry.title}-${index}`} className="flex flex-col">
          <button
            type="button"
            disabled={entry.page === null}
            onClick={() => entry.page !== null && onSelectPage(entry.page)}
            className={cn(
              "truncate rounded-sm px-2 py-1 text-left text-sm transition-colors",
              entry.page === null
                ? "cursor-default text-muted-foreground/60"
                : "hover:bg-muted",
              entry.page !== null && activePages.has(entry.page)
                ? "bg-primary/10 font-medium"
                : undefined,
            )}
            title={entry.title}
          >
            {entry.title}
          </button>
          {entry.items.length > 0 && (
            <OutlineList
              entries={entry.items}
              depth={depth + 1}
              activePages={activePages}
              onSelectPage={onSelectPage}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function PdfSidebar({
  tab,
  page,
  pageCount,
  spread,
  metrics,
  getPage,
  outline,
  onSelectPage,
  onTabChange,
  onClose,
  className,
}: PdfSidebarProps) {
  const { t } = useI18n();

  const pagesPerSlot = pdfSpreadStep(spread);
  /** The pages the viewer is actually showing, not just the reported one. */
  const activePages = new Set(
    Array.from({ length: pagesPerSlot }, (_, index) => page + index),
  );

  return (
    <aside
      data-pdf-sidebar
      className={cn(
        "flex h-full w-52 shrink-0 flex-col border-r bg-background",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-1.5">
        <Button
          type="button"
          size="sm"
          variant={tab === "thumbs" ? "secondary" : "ghost"}
          aria-pressed={tab === "thumbs"}
          className="h-7 px-2 text-xs"
          onClick={() => onTabChange("thumbs")}
        >
          {t("缩略图")}{" "}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "outline" ? "secondary" : "ghost"}
          aria-pressed={tab === "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => onTabChange("outline")}
        >
          {t("大纲")}{" "}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("收起侧栏")}
          className="ml-auto"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {tab === "thumbs" ? (
          <div className="flex flex-col items-center gap-2 p-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (number) => (
                <PdfThumbnail
                  key={number}
                  page={number}
                  metrics={metrics.get(number) ?? { width: 595, height: 842 }}
                  active={activePages.has(number)}
                  getPage={getPage}
                  onSelect={onSelectPage}
                />
              ),
            )}
          </div>
        ) : (
          <div className="p-2">
            {outline && outline.length > 0 ? (
              <OutlineList
                entries={outline}
                depth={0}
                activePages={activePages}
                onSelectPage={onSelectPage}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <FileWarning className="size-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("这个 PDF 没有大纲")}{" "}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
