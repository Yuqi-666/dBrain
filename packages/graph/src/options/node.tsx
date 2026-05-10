import React from "react";
import type { NodeOptions, NodeData } from "@antv/g6";
import type { NodeStyle } from "@antv/g6/lib/spec/element/node";
import { createThemeOptions } from "./theme";
import { graphStore } from "@workspace/store";
import type { LayoutType } from "@workspace/interfaces";
import { createNodeComponent } from "../extensions/custom-nodes";

export interface NodeConfigOptions {
  layoutType?: LayoutType;
}

export function createNodeOptions(options?: NodeConfigOptions): NodeOptions {
  let isReactNode = false;
  const layoutType = options?.layoutType;
  if (
    layoutType === "dagre" ||
    layoutType === "compactBox" ||
    layoutType === "fishbone" ||
    layoutType === "mindmap"
  ) {
    isReactNode = true;
  }
  const getNodeSemantic = graphStore.getState().getNodeSemantic;

  if (!isReactNode) {
    return {
      type: "circle",
      style: (data: NodeData): NodeStyle => {
        const theme = createThemeOptions();
        const nodeSemantic = getNodeSemantic(data.semanticId!);
        return {
          fill: nodeSemantic?.color || theme.nodeColor,
          stroke: nodeSemantic?.color || theme.nodeColor,
          lineWidth: 2,
          radius: 8,
          labelText: data.title,
          labelFill: theme.labelColor,
          labelFontSize: 14,
          labelMaxWidth: 100,
          iconSrc: nodeSemantic?.icon,
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
        disabled: { fill: "#e5e7eb", stroke: "#d1d5db", labelFill: "#9ca3af" },
        neighborActive: {
          stroke: "#FFB266",
          lineWidth: 2.5,
          shadowColor: "rgba(255, 125, 0, 0.15)",
          shadowBlur: 5,
        },
        inactive: {
          stroke: "#9ca3af",
          lineWidth: 2,
          shadowColor: "transparent",
          shadowBlur: 0,
        },
      },
      animation: false,
    };
  } else {
    return {
      type: "react-node",
      style: {
        size: [120, 40],
        component: (data: NodeData) => {
          const NodeComponent = createNodeComponent(data.nodeType || "text");
          return <NodeComponent data={data} />;
        },
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
        disabled: { fill: "#e5e7eb", stroke: "#d1d5db", labelFill: "#9ca3af" },
        neighborActive: {
          stroke: "#FFB266",
          lineWidth: 2.5,
          shadowColor: "rgba(255, 125, 0, 0.15)",
          shadowBlur: 5,
        },
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
}
