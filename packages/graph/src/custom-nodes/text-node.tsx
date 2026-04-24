import React from "react";
import type { NodeData } from "@antv/g6";
import { graphStore } from "@workspace/store";
import { createThemeOptions } from "../options/theme";

export interface TextNodeProps {
  data: NodeData;
}

export const TextNodeComponent = ({ data }: TextNodeProps) => {
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = createThemeOptions();
  const nodeSemantic = getNodeSemantic(data.semanticId!);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: nodeSemantic?.color || theme.nodeColor,
        borderRadius: "8px",
        padding: "8px",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          color: theme.labelColor,
          fontSize: "14px",
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {data.title}
      </span>
    </div>
  );
};