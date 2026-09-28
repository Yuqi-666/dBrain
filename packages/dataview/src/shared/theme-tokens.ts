"use client";

import { useTheme } from "next-themes";

/**
 * Theme tokens third-party renderers map onto their own theme objects
 * (VTable theme, FullCalendar CSS variables, VChart theme, …).
 *
 * Values are literal CSS colors rather than `var(--token)` references because
 * canvas engines (VTable, VChart) cannot resolve CSS variables themselves.
 */
export interface DataViewThemeTokens {
  mode: "light" | "dark";
  background: string;
  foreground: string;
  border: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  selection: string;
  danger: string;
  fontFamily: string;
  fontSize: number;
  rowHeight: number;
}

const LIGHT_TOKENS: DataViewThemeTokens = {
  mode: "light",
  background: "#ffffff",
  foreground: "#0a0a0a",
  border: "#e5e5e5",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  accent: "#171717",
  accentForeground: "#fafafa",
  selection: "rgba(23, 23, 23, 0.08)",
  danger: "#dc2626",
  fontFamily: "inherit",
  fontSize: 12,
  rowHeight: 32,
};

const DARK_TOKENS: DataViewThemeTokens = {
  mode: "dark",
  background: "#0a0a0a",
  foreground: "#fafafa",
  border: "#262626",
  muted: "#171717",
  mutedForeground: "#a3a3a3",
  accent: "#fafafa",
  accentForeground: "#171717",
  selection: "rgba(250, 250, 250, 0.12)",
  danger: "#ef4444",
  fontFamily: "inherit",
  fontSize: 12,
  rowHeight: 32,
};

/** Resolves literal tokens from a concrete mode. */
export function getDataViewThemeTokens(
  mode: "light" | "dark",
): DataViewThemeTokens {
  return mode === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
}

/**
 * Resolves tokens for a view config `theme` value: `auto` follows
 * `next-themes`, anything else is taken at face value.
 */
export function useDataViewThemeTokens(
  theme: "light" | "dark" | "auto" = "auto",
): DataViewThemeTokens {
  const { resolvedTheme } = useTheme();
  const mode =
    theme === "auto" ? (resolvedTheme === "dark" ? "dark" : "light") : theme;
  return getDataViewThemeTokens(mode);
}
