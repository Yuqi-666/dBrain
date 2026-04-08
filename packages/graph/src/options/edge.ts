import type { EdgeOptions, EdgeData } from "@antv/g6";
import { getThemeConfig } from "./theme";
// TODO: 改造为数据驱动样式，为一部分样式配备样式函数，输入数据字段，输出对应样式值
export const DEFAULT_EDGE_CONFIG: EdgeOptions = {
  type: "line",
  style: (data: EdgeData) => {
    const theme = getThemeConfig();
    return {
      stroke: theme.edgeColor,
      lineWidth: 2,
      endArrow: true,
      endArrowSize: 8,
      startArrow: false,
      lineCap: "round",
      cursor: "pointer",
      labelText: data.name,
      labelFill: theme.labelColor,
      labelFontSize: 12,
      labelBackground: true,
      labelBackgroundColor: theme.background,
      labelBackgroundPadding: [2, 4],
      labelBackgroundRadius: 4,
    };
  },
  state: {
    selected: {
      stroke: "#FF7D00",
      lineWidth: 3,
      shadowColor: "rgba(255, 125, 0, 0.3)",
      shadowBlur: 5,
    },
    hover: {
      stroke: "#4080FF",
      lineWidth: 2.5,
      shadowColor: "rgba(22, 93, 255, 0.2)",
      shadowBlur: 3,
    },
    disabled: {
      stroke: "#d1d5db",
      labelFill: "#9ca3af",
      endArrowFill: "#d1d5db",
    },
  },
  animation: false,
};

export function getEdgeConfig(theme?: "light" | "dark"): EdgeOptions {
  const themeConfig = getThemeConfig(theme);
  const baseStyle = DEFAULT_EDGE_CONFIG.style as (data: EdgeData) => any;

  return {
    ...DEFAULT_EDGE_CONFIG,
    style: (data: EdgeData) => {
      return {
        ...baseStyle(data),
        stroke: themeConfig.edgeColor,
        labelFill: themeConfig.labelColor,
        labelBackgroundColor: themeConfig.background,
      };
    },
  };
}
