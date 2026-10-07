"use client";

import { useState } from "react";
import { FileAudio } from "lucide-react";
import type { AudioNodeData } from "@workspace/interfaces";

import { AudioPlayer } from "@workspace/ui/components/media-player/audio-player/audio-player";
import { cn } from "@workspace/ui/lib/utils";
import { resolveFileUrl } from "@workspace/api-client";

import { FileDropZone } from "./file-drop-zone";
import { MediaNodeLayout } from "./media-node-layout";
import { useMediaTimestamps } from "./use-media-timestamps";

interface AudioNodeContentProps {
  node: AudioNodeData;
  className?: string;
}

/**
 * An audio node: the video.js v10 `<AudioPlayer>` beside the timestamp sidebar
 * (design `node-content/README.md` §1.3, plan `media.md` §M6.1-5).
 *
 * The self-drawn transport M6 shipped is gone: the audio preset of video.js v10
 * provides the progress bar the timestamp layer needs (its `TimeSlider` is the
 * component the ticks are drawn into), so the two players differ only in their
 * media element and their control layout, not in how a note is anchored or
 * reached.
 *
 * The host's whole job is composition and persistence — `MediaNodeLayout` and
 * `useMediaTimestamps` — plus the one failure screen an `<audio>` element needs.
 * M6's loading skeleton is gone: the skin's own buffering indicator covers it,
 * and the skeleton used to hide the control bar until `loadeddata`.
 */
export function AudioNodeContent({ node, className }: AudioNodeContentProps) {
  const [failed, setFailed] = useState(false);

  const url = resolveFileUrl(node.content?.url);
  const hasUrl = !!url;

  // A record with no content half is malformed, not the normal case; the
  // fallback keeps the timestamp layer from reading through `undefined`.
  const content = node.content ?? { url: "" };

  const timestamps = useMediaTimestamps(node, content);

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

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-6 text-center",
          className,
        )}
      >
        <FileAudio className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          音频加载失败，可能是网络或文件本身的问题。
        </p>
        <a
          href={url}
          download
          className="text-sm text-primary underline underline-offset-4 hover:no-underline"
        >
          下载原文件
        </a>
      </div>
    );
  }

  return (
    <MediaNodeLayout
      className={className}
      timestamps={timestamps.timestamps}
      onTimestampsChange={timestamps.onTimestampsChange}
      controller={timestamps.controller}
      addRequest={timestamps.addRequest}
      focusRequest={timestamps.focusRequest}
      onConvertNote={timestamps.onCreateNodeFromNote}
      onOpenNode={timestamps.onOpenNode}
      onKeyDown={timestamps.onKeyDown}
    >
      {/*
        The bar sits in the middle of the column, not at the top: the shipped
        audio skin is `height: auto !important` — it hugs the control bar — so
        anchoring it to the top would only park it under the header and leave the
        rest of the pane empty. `flex-1` takes the column's height and
        `justify-center` centres the bar in it (the default `align-items:
        stretch` keeps the bar full-width; `items-center` would shrink it to its
        content instead).
      */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-center">
        <AudioPlayer
          src={url}
          onMediaController={timestamps.onMediaController}
          onError={() => setFailed(true)}
          notes={timestamps.notes}
          onAddNoteRequest={timestamps.onAddNoteRequest}
          onActivateNote={timestamps.onActivateNote}
        />
      </div>
    </MediaNodeLayout>
  );
}
