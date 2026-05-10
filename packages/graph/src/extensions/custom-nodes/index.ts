import React from "react";
import type { NodeData } from "@antv/g6";
import { TextNodeComponent } from "./text-node";
import { ImageNodeComponent } from "./img-node";
import { RichTextNodeComponent } from "./rich-text-node";
import { VideoNodeComponent } from "./video-node";

export function createNodeComponent(
  nodeType: string,
): React.FC<{ data: NodeData }> {
  switch (nodeType) {
    case "text":
      return TextNodeComponent;
    case "image":
      return ImageNodeComponent;
    case "video":
      return VideoNodeComponent;
    case "rich-text":
      return RichTextNodeComponent;
    default:
      return TextNodeComponent;
  }
}

export {
  TextNodeComponent,
  ImageNodeComponent,
  RichTextNodeComponent,
  VideoNodeComponent,
};
