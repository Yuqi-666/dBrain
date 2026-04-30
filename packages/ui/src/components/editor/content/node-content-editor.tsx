"use client";

import { useMemo } from "react";
import type { NodeData } from "@workspace/interfaces";

import { TextNodeContent } from "./text-node-content";
import { ImageNodeContent } from "./image-node-content";
import { PdfNodeContent } from "./pdf-node-content";
import { VideoNodeContent } from "./video-node-content";
import { AudioNodeContent } from "./audio-node-content";
import { WebpageNodeContent } from "./webpage-node-content";
import { WebsiteNodeContent } from "./website-node-content";
import { RichTextNodeContent } from "./rich-text-node-content";
import { CollectionNodeContent } from "./collection-node-content";

interface NodeContentEditorProps {
  node: NodeData;
  className?: string;
}

export function NodeContentEditor({ node, className }: NodeContentEditorProps) {
  const nodeType = node?.nodeType;

  const contentComponent = useMemo(() => {
    switch (nodeType) {
      case "text":
        return <TextNodeContent node={node} />;
      case "image":
        return <ImageNodeContent node={node} />;
      case "pdf":
        return <PdfNodeContent node={node} />;
      case "video":
        return <VideoNodeContent node={node} />;
      case "audio":
        return <AudioNodeContent node={node} />;
      case "webpage":
        return <WebpageNodeContent node={node} />;
      case "website":
        return <WebsiteNodeContent node={node} />;
      case "rich-text":
        return <RichTextNodeContent node={node} />;
      case "collection":
        return <CollectionNodeContent node={node} />;
      default:
        return <div className="p-4 text-muted-foreground">Unsupported node type: {nodeType}</div>;
    }
  }, [nodeType, node]);

  return (
    <div className={className}>
      {contentComponent}
    </div>
  );
}
