"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import type { AudioNodeData } from "@workspace/interfaces";

interface AudioNodeContentProps {
  node: AudioNodeData;
  className?: string;
}

export function AudioNodeContent({ node, className }: AudioNodeContentProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <audio
        src={node.content.url}
        controls
        className="w-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}