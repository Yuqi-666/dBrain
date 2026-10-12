"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import * as React from "react";

import { ISLAND_FORMS } from "./forms";
import { IslandNav } from "./nav";
import type { IslandExpandedPanel, IslandNavItem } from "./types";

export interface IslandPlaceholderProps {
  form: IslandExpandedPanel;
  nav: readonly IslandNavItem[];
}

/**
 * What an expanded form draws before its real body exists.
 *
 * It is not an error state — muted copy, no destructive colour, no icon — and it
 * is sized by the form's own box, so an empty island and a full one are
 * indistinguishable in shape. The navigation stays reachable while expanded
 * (labelled icons on a wide screen, icons only under 640px); a form the host
 * supplies stops rendering this branch entirely, because it brings its own
 * chrome.
 */
export function IslandPlaceholder({
  form,
  nav,
}: IslandPlaceholderProps): React.ReactNode {
  useI18n();

  return (
    <div data-island-placeholder={form} className="flex h-full w-full flex-col">
      <IslandNav
        nav={nav}
        labels
        className="w-full shrink-0 justify-start rounded-none border-b border-border/60 px-2 py-1.5"
      />
      {form === "agent" ? (
        <IslandAgentBody />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain p-6 text-center text-sm text-muted-foreground">
          {ISLAND_FORMS[form].placeholder}
        </div>
      )}
    </div>
  );
}

/**
 * The agent form's built-in body.
 *
 * The only thing it has to get right today is **reserving both containers**: a
 * conversation area that absorbs whatever height the form leaves, and a fixed
 * input row. Rendered as a single line of copy, the island would change shape a
 * second time when the real panel lands — and a form should change shape for a
 * reason the user can see.
 */
function IslandAgentBody(): React.ReactNode {
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain rounded-xl bg-muted/40 px-4 text-center text-sm text-muted-foreground">
        {t("agent 面板将在 M9 接入")}{" "}
      </div>
      <div className="flex h-16 shrink-0 items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
        {t("输入区将在 M9 接入")}{" "}
      </div>
    </div>
  );
}
