import type { EdgeOptions, EdgeData } from "@antv/g6";
import { getThemeConfig } from "./theme";
import type { EdgeSemantic, EdgeSemanticId } from "@workspace/interfaces";
import type { EdgeStyle } from "@antv/g6/lib/spec/element/edge";
import { graphStore } from "@workspace/store";

export function getEdgeConfig(
): EdgeOptions {
  const getEdgeSemantic = graphStore.getState().getEdgeSemantic;
  return {
    type: (data: EdgeData) => {
      const semantic = getEdgeSemantic(data.semanticId!);
      const direction = data.direction || "forward";
      if (direction === "bidirectional") return "cubic";
      switch (data.category) {
        case "hierarchy":
          return "polyline";
        case "flow":
          return "quadratic";
        case "interaction":
          return "cubic";
        default:
          return "line";
      }
    },
    style: (data: EdgeData): EdgeStyle => {
      const theme = getThemeConfig();
      const semantic = getEdgeSemantic(data.semanticId!);
      const direction = data.direction || "forward";
      return {
        stroke: semantic?.color || theme.edgeColor,
        lineWidth: 2,
        lineCap: "round",
        cursor: "pointer",
        endArrow: direction === "reverse" ? false : true,
        endArrowSize: 8,
        startArrow: direction === "forward" ? false : true,
        startArrowSize: 8,
        labelText: semantic?.name,
        labelFill: theme.labelColor,
        labelFontSize: 10,
        labelMaxWidth: 100,
        labelBackground: true,
        labelBackgroundColor: theme.background,
        labelBackgroundPadding: [2, 4],
        labelBackgroundRadius: 4,
        lineDash: data.category === "association" ? [6, 4] : undefined,
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
      },
    },
    animation: false,
  };
}
