"use client";

import { useTheme } from "next-themes";
import type { VisualConfig } from "@workspace/interfaces";
import {
  isViewColorSyncEnabled,
  resolveViewColors,
} from "@workspace/ui/lib/color-palette";

export function useViewColors(config?: VisualConfig) {
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme === "light" || resolvedTheme === "dark"
      ? resolvedTheme
      : undefined;
  return {
    ...resolveViewColors(config, theme),
    theme,
    colorsSyncTheme: isViewColorSyncEnabled(config),
  };
}
