import React, { useState } from "react";
import type { NodeData } from "@antv/g6";
import { graphStore } from "@workspace/store";
import { createThemeOptions } from "../../options/theme";

export interface ImageNodeProps {
  data: NodeData;
}

export const ImageNodeComponent = ({ data }: ImageNodeProps) => {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = createThemeOptions();
  const nodeSemantic = getNodeSemantic(data.semanticId!);

  const imageUrl = (data as any).imageUrl || (data as any).thumbnail;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: nodeSemantic?.color || theme.nodeColor,
        borderRadius: "8px",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={data.title as string}
          style={{
            width: "100%",
            height: "80%",
            objectFit: "cover",
          }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.background,
          }}
        >
          <span style={{ fontSize: "24px", opacity: 0.5 }}>🖼</span>
        </div>
      )}
      <span
        style={{
          color: theme.labelColor,
          fontSize: "12px",
          textAlign: "center",
          padding: "4px",
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
