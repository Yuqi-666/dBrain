import type { NodeOptions, NodeData } from "@antv/g6";
import { getThemeConfig } from "./theme";

// TODO: 改造为数据驱动样式，为一部分样式配备样式函数，输入数据字段，输出对应样式值
export const DEFAULT_NODE_CONFIG: NodeOptions = {
  type: "circle",
  style: (data: NodeData) => {
    const theme = getThemeConfig();
    return {
      fill: theme.nodeColor,
      stroke: theme.nodeColor,
      lineWidth: 2,
      radius: 8,
      size: [120, 40],
      labelText: data.title || data.id,
      labelFill: theme.labelColor,
      labelFontSize: 14,
      labelMaxWidth: 100,
    };
  },
  state: {
    selected: {
      stroke: "#FF7D00",
      lineWidth: 3,
      shadowColor: "rgba(255, 125, 0, 0.3)",
      shadowBlur: 10,
    },
    hover: {
      stroke: "#4080FF",
      lineWidth: 2.5,
      shadowColor: "rgba(22, 93, 255, 0.2)",
      shadowBlur: 5,
    },
    disabled: {
      fill: "#e5e7eb",
      stroke: "#d1d5db",
      labelFill: "#9ca3af",
    },
  },
  animation: false,
};

export function getNodeConfig(theme?: "light" | "dark"): NodeOptions {
  const themeConfig = getThemeConfig(theme);
  const baseStyle = DEFAULT_NODE_CONFIG.style as (data: NodeData) => any;

  return {
    ...DEFAULT_NODE_CONFIG,
    style: (data: NodeData) => {
      return {
        ...baseStyle(data),
        fill: themeConfig.nodeColor,
        stroke: themeConfig.nodeColor,
        labelFill: themeConfig.labelColor,
      };
    },
  };
}
