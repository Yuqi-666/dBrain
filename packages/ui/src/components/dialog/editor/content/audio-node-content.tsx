"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import type { AudioNodeData } from "@workspace/interfaces";

interface AudioNodeContentProps {
  node: AudioNodeData;
  className?: string;
}

export function AudioNodeContent({ node, className }: AudioNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);

  const url = node.content?.url;
  const hasUrl = !!url;

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

  if (!hasUrl) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept=".mp3,.wav,.ogg,.m4a,audio/*"
        variant="audio"
        className={cn("w-full h-full min-h-[100px]", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center p-4 w-full h-full", className)}>
      {mediaLoading && <LoadingPlaceholder variant="audio" />}
      <audio
        src={url}
        controls
        className={cn("w-full", mediaLoading ? "hidden" : "block")}
        onLoadedData={() => setMediaLoading(false)}
        onError={() => setMediaLoading(false)}
      />
    </div>
  );
}
