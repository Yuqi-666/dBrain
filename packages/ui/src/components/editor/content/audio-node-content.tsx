"use client";

import { useState, useEffect } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useGraphStore } from "@workspace/store";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/loading-placeholder";
import { useUploadState } from "@workspace/ui/hooks/use-upload-state";
import type { AudioNodeData } from "@workspace/interfaces";

interface AudioNodeContentProps {
  node: AudioNodeData;
  className?: string;
}

export function AudioNodeContent({ node, className }: AudioNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const updateNode = useGraphStore((state) => state.updateNode);

  const url = node.content?.url;
  const hasUrl = !!url;

  const { isLoading: uploadLoading, handlers } = useUploadState({
    nodeId: node.id,
    onUploadComplete: (attachment) => {
      updateNode(node.id, { content: { url: attachment.url } });
    },
  });

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

  const isLoading = uploadLoading || mediaLoading;

  if (!hasUrl) {
    return (
      <FileDropZone
        accept="audio/*"
        variant="audio"
        onUploadStart={handlers.onUploadStart}
        onUploadComplete={handlers.onUploadComplete}
        onUploadError={handlers.onUploadError}
        className={cn("w-full", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center p-4 w-full h-full", className)}>
      {isLoading && <LoadingPlaceholder variant="audio" />}
      <audio
        src={url}
        controls
        className={cn("w-full", isLoading ? "hidden" : "block")}
        onLoadedData={() => setMediaLoading(false)}
        onError={() => setMediaLoading(false)}
      />
    </div>
  );
}
