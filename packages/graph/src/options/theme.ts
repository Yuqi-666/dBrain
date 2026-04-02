export interface ThemeConfig {
  background: string;
  gridColor: string;
  nodeColor: string;
  edgeColor: string;
  labelColor: string;
}

export const LIGHT_THEME: ThemeConfig = {
  background: "#ffffff",
  gridColor: "#f0f0f0",
  nodeColor: "#165DFF",
  edgeColor: "#91caff",
  labelColor: "#333333",
};

export const DARK_THEME: ThemeConfig = {
  background: "#1a1a1a",
  gridColor: "#333333",
  nodeColor: "#4080FF",
  edgeColor: "#69b1ff",
  labelColor: "#e5e5e5",
};

export function getThemeConfig(theme: "light" | "dark" = "light"): ThemeConfig {
  return theme === "dark" ? DARK_THEME : LIGHT_THEME;
}
