import type { EdgeOptions, EdgeData } from "@antv/g6";
import { createThemeOptions } from "./theme";
import type { EdgeSemantic, EdgeSemanticId } from "@workspace/interfaces";
import type { EdgeStyle } from "@antv/g6/lib/spec/element/edge";
import { useDataStore } from "@workspace/store";

export interface EdgeConfigOptions { }

export function createEdgeOptions(options?: EdgeConfigOptions): EdgeOptions {
  const getEdgeSemantic = useDataStore.getState().getEdgeSemantic;
  return {
    type: (data: EdgeData) => {
      const semantic = getEdgeSemantic(data.semanticId!);
      const direction = data.direction || "forward";
      if (direction === "bidirectional") return "cubic";
      switch (data.edgeType) {
        case "hierarchy":
          return "line";
        case "flow":
          return "quadratic";
        case "interaction":
          return "cubic";
        default:
          return "line";
      }
    },
    style: (data: EdgeData): EdgeStyle => {
      const theme = createThemeOptions();
      const semantic = getEdgeSemantic(data.semanticId!);
      const direction = data.direction || "forward";
      return {
        stroke: semantic?.color || theme.edgeColor,
        lineWidth: 2,
        lineCap: "round",
        cursor: "pointer",
        endArrow: direction === "reverse" || direction === "undirected" ? false : true,
        endArrowSize: 8,
        startArrow: direction === "forward" || direction === "undirected" ? false : true,
        startArrowSize: 8,
        labelText: semantic?.name,
        labelFill: theme.labelColor,
        labelFontSize: 10,
        labelMaxWidth: 100,
        labelBackground: true,
        labelBackgroundColor: theme.background,
        labelBackgroundPadding: [2, 4],
        labelBackgroundRadius: 4,
        lineDash: data.edgeType === "association" ? [6, 4] : undefined,
      };
    },
    state: {
      active: {
        stroke: "#FF7D00",
        lineWidth: 3,
        shadowColor: "rgba(255, 125, 0, 0.3)",
        shadowBlur: 5,
      },
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
        shadowBlur: 5,
      },
      disabled: {
        fill: "#e5e7eb",
        stroke: "#d1d5db",
        labelFill: "#9ca3af",
      },
      // 新增：相邻元素激活时的状态（如地图/图表中相邻高亮）
      neighborActive: {
        stroke: "#FFB266", // 比 active 稍浅的橙色
        lineWidth: 2.5,
        shadowColor: "rgba(255, 125, 0, 0.15)",
        shadowBlur: 5,
      },
      // 新增：默认未激活状态
      inactive: {
        stroke: "#9ca3af",
        lineWidth: 2,
        shadowColor: "transparent",
        shadowBlur: 0,
      },
    },
    animation: false,
  };
}
