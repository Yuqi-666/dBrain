import React from "react";
import type { NodeData } from "@antv/g6";
import { useDataStore } from "@workspace/store";
import { createThemeOptions } from "../../options/theme";

export interface RichTextNodeProps {
  data: NodeData;
}

export const RichTextNodeComponent = ({ data }: RichTextNodeProps) => {
  const getNodeSemantic = useDataStore.getState().getNodeSemantic;
  const theme = createThemeOptions();
  const nodeSemantic = getNodeSemantic(data.semanticId!);

  const content = (data as any).content || (data as any).richText || "";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: nodeSemantic?.color || theme.nodeColor,
        borderRadius: "8px",
        padding: "8px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          color: theme.labelColor,
          fontSize: "12px",
          lineHeight: "1.4",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        {content}
      </div>
      <span
        style={{
          color: theme.labelColor,
          fontSize: "10px",
          textAlign: "center",
          opacity: 0.7,
          marginTop: "4px",
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
