import React, { useState } from "react";
import type { NodeData } from "@antv/g6";
import { graphStore } from "@workspace/store";
import { createThemeOptions } from "../options/theme";

export interface VideoNodeProps {
  data: NodeData;
}

export const VideoNodeComponent = ({ data }: VideoNodeProps) => {
  const [imageError, setImageError] = useState(false);
  const getNodeSemantic = graphStore.getState().getNodeSemantic;
  const theme = createThemeOptions();
  const nodeSemantic = getNodeSemantic(data.semanticId!);

  const thumbnailUrl = (data as any).thumbnail || (data as any).poster;
  const duration = (data as any).duration;

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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "75%",
          backgroundColor: theme.background,
        }}
      >
        {thumbnailUrl && !imageError ? (
          <img
            src={thumbnailUrl}
            alt={data.title as string}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "24px", opacity: 0.5 }}>🎬</span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
          }}
        >
          ▶
        </div>
        {duration && (
          <span
            style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "#fff",
              fontSize: "10px",
              padding: "2px 4px",
              borderRadius: "2px",
            }}
          >
            {duration}
          </span>
        )}
      </div>
      <span
        style={{
          color: theme.labelColor,
          fontSize: "10px",
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