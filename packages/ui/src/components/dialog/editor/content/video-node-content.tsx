"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactEventHandler } from "react";
import { VideoOff } from "lucide-react";
import type {
  TimestampNote,
  VideoContent,
  VideoNodeData,
} from "@workspace/interfaces";

import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import { VideoPlayer } from "@workspace/ui/components/video-player/video-player";
import {
  TimestampNoteMarks,
  TimestampNotes,
} from "@workspace/ui/components/media/timestamp-notes";
import type {
  MediaController,
  TimestampAddRequest,
} from "@workspace/ui/components/media/types";
import { resolveFileUrl } from "@workspace/api-client";

import { normalizeNotes } from "./doc-normalize";
import { useNodeContentWriter } from "./use-node-content-writer";

interface VideoNodeContentProps {
  node: VideoNodeData;
  className?: string;
}

/**
 * A video node: the existing HLS-aware `<VideoPlayer>` with the shared timestamp
 * notes underneath (design `node-content/README.md` §1.4, plan `media.md`
 * §M6.1-5).
 *
 * Two deliberate boundaries:
 *
 * - **The player keeps its native transport.** `<VideoPlayer>` is still
 *   `controls`; `Space` / `←` / `→` stay the browser's. Only the time outlet is
 *   new (`onMediaController`) and it is bound to the same `<video>` element for
 *   both the progressive and the HLS path, so a note cannot land on a second
 *   timeline (plan §M6.2-⑤/⑥).
 * - **The marks layer gets its own track.** The player's root *is* the `<video>`,
 *   so an overlay would change that element's box; the timeline is a sibling
 *   instead (plan §M6.2-⑥).
 *
 * Like the audio host, the only content write is `patchContent`, so `url`,
 * `hlsUrl` and `coverUrl` survive every note edit.
 */
export function VideoNodeContent({ node, className }: VideoNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const [undecodable, setUndecodable] = useState(false);
  const [controller, setController] = useState<MediaController | null>(null);
  const [addRequest, setAddRequest] = useState<TimestampAddRequest | null>(
    null,
  );

  const url = resolveFileUrl(node.content?.url);
  const hlsUrl = resolveFileUrl(node.content?.hlsUrl);
  // Either representation makes the node playable: the HLS playlist the backend
  // packaged, or the original upload it was packaged from.
  const hasSource = !!url || !!hlsUrl;

  const { patchContent } = useNodeContentWriter<VideoContent>(
    node.id,
    "video",
    node.content,
  );

  const notes = useMemo(
    () => normalizeNotes(node.content?.timestampNotes ?? []),
    [node.content?.timestampNotes],
  );

  useEffect(() => {
    if (hasSource) {
      setMediaLoading(true);
    }
  }, [hasSource]);

  // A new source deserves a fresh verdict. Without this the "cannot decode"
  // screen is terminal for the component instance — it renders no `<video>`, so
  // nothing can ever clear the flag — while the attributes sidebar can point the
  // node at a different file without remounting it (the node editor only keys on
  // `node.id`). Pre-existing; found by the M6 probe (G6-8).
  useEffect(() => {
    setUndecodable(false);
  }, [url, hlsUrl]);

  const isLoading = mediaLoading;

  const writeNotes = useCallback(
    (next: TimestampNote[]) => {
      patchContent({ timestampNotes: next });
    },
    [patchContent],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      const timeMs = controller ? controller.getCurrentTimeMs() : 0;
      setAddRequest((previous) => ({
        timeMs,
        token: (previous?.token ?? 0) + 1,
      }));
    },
    [controller],
  );

  if (!hasSource) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept=".mp4,.webm,.mov,video/*"
        variant="video"
        className={cn("w-full h-full min-h-[200px]", className)}
      />
    );
  }

  const handleLoadedData: ReactEventHandler<HTMLVideoElement> = (event) => {
    const video = event.currentTarget;
    // An element that decoded audio but no video reports 0×0: it renders a bare
    // control bar, which is what an unplayable codec looks like.
    setUndecodable(video.videoWidth === 0 && video.videoHeight === 0);
    setMediaLoading(false);
  };

  if (undecodable) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-6 text-center",
          className,
        )}
      >
        <VideoOff className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          当前浏览器无法解码该视频的编码，只有音轨可以播放。
        </p>
        {url && (
          <a
            href={url}
            download
            className="text-sm text-primary underline underline-offset-4 hover:no-underline"
          >
            下载原文件
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-col gap-3 p-4 w-full h-full min-h-0 outline-none",
        className,
      )}
    >
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        {isLoading && <LoadingPlaceholder variant="video" />}
        <VideoPlayer
          src={url}
          hlsSrc={hlsUrl}
          poster={node.content?.coverUrl}
          controls
          className={cn(
            "max-h-full w-full object-contain",
            isLoading ? "hidden" : "block",
          )}
          onLoadedData={handleLoadedData}
          onError={() => setMediaLoading(false)}
          onMediaController={setController}
        />
      </div>

      <div className="relative h-2 w-full shrink-0 rounded-full bg-muted">
        <TimestampNoteMarks notes={notes} controller={controller} />
      </div>

      <TimestampNotes
        notes={notes}
        controller={controller}
        onNotesChange={writeNotes}
        addRequest={addRequest}
        className="max-h-[45%] shrink-0 overflow-y-auto"
      />
    </div>
  );
}
