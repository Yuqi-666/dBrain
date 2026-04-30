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
  nodeId: string;
  className?: string;
}

export function NodeContentEditor({ node, nodeId, className }: NodeContentEditorProps) {
  const nodeType = node?.nodeType;

  const contentComponent = useMemo(() => {
    switch (nodeType) {
      case "text":
        return <TextNodeContent node={node} nodeId={nodeId} />;
      case "image":
        return <ImageNodeContent node={node} nodeId={nodeId} />;
      case "pdf":
        return <PdfNodeContent node={node} nodeId={nodeId} />;
      case "video":
        return <VideoNodeContent node={node} nodeId={nodeId} />;
      case "audio":
        return <AudioNodeContent node={node} nodeId={nodeId} />;
      case "webpage":
        return <WebpageNodeContent node={node} nodeId={nodeId} />;
      case "website":
        return <WebsiteNodeContent node={node} nodeId={nodeId} />;
      case "rich-text":
        return <RichTextNodeContent node={node} nodeId={nodeId} />;
      case "collection":
        return <CollectionNodeContent node={node} nodeId={nodeId} />;
      default:
        return <div className="p-4 text-muted-foreground">Unsupported node type: {nodeType}</div>;
    }
  }, [nodeType, node, nodeId]);

  return (
    <div className={className}>
      {contentComponent}
    </div>
  );
}