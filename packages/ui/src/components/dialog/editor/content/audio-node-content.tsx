"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AudioContent,
  AudioNodeData,
  TimestampNote,
} from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";

import { cn } from "@workspace/ui/lib/utils";
import { LoadingPlaceholder } from "@workspace/ui/components/dialog/editor/loading-placeholder";
import { AudioPlayer } from "@workspace/ui/components/media/audio-player";
import {
  TimestampNoteMarks,
  TimestampNotes,
} from "@workspace/ui/components/media/timestamp-notes";
import type {
  MediaController,
  TimestampAddRequest,
} from "@workspace/ui/components/media/types";

import { FileDropZone } from "./file-drop-zone";
import { normalizeNotes } from "./doc-normalize";
import { useNodeContentWriter } from "./use-node-content-writer";

interface AudioNodeContentProps {
  node: AudioNodeData;
  className?: string;
}

/**
 * An audio node: a self-drawn transport plus the shared timestamp notes
 * (design `node-content/README.md` §1.3, plan `media.md` §M6.1-5).
 *
 * The host's whole job is composition and persistence:
 *
 * - `<AudioPlayer>` owns the `<audio>` element and reports its
 *   `MediaController` up; the notes layer reads the playhead and seeks through
 *   that one controller, so the box has exactly one timeline.
 * - A note change is one gesture → one write through the shared writer
 *   (`patchContent({ timestampNotes })`), which merges onto the **live** content
 *   half. Writing `content` wholesale here would wipe `url` (design §0.3-3).
 * - `Mod-Enter` is captured on this content box, never on `document`: the editor
 *   dialog and the quick panel own their own keys (plan §M6.2-④).
 */
export function AudioNodeContent({ node, className }: AudioNodeContentProps) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const [controller, setController] = useState<MediaController | null>(null);
  const [addRequest, setAddRequest] = useState<TimestampAddRequest | null>(
    null,
  );

  const url = resolveFileUrl(node.content?.url);
  const hasUrl = !!url;

  const { patchContent } = useNodeContentWriter<AudioContent>(
    node.id,
    "audio",
    node.content,
  );

  // `?? []` before the normalizer: a record that never had a note is the normal
  // case, not a malformed one, and `normalizeNotes` warns about non-arrays.
  const notes = useMemo(
    () => normalizeNotes(node.content?.timestampNotes ?? []),
    [node.content?.timestampNotes],
  );

  useEffect(() => {
    if (hasUrl) {
      setMediaLoading(true);
    }
  }, [hasUrl]);

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
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-col gap-3 p-4 w-full h-full min-h-0 outline-none",
        className,
      )}
    >
      <div className="relative shrink-0">
        {mediaLoading && <LoadingPlaceholder variant="audio" />}
        <AudioPlayer
          src={url}
          className={cn(mediaLoading ? "hidden" : "block")}
          onMediaController={setController}
          onLoadedData={() => setMediaLoading(false)}
          onError={() => setMediaLoading(false)}
          marks={<TimestampNoteMarks notes={notes} controller={controller} />}
        />
      </div>

      <TimestampNotes
        notes={notes}
        controller={controller}
        onNotesChange={writeNotes}
        addRequest={addRequest}
        className="flex-1 min-h-0 overflow-y-auto"
      />
    </div>
  );
}
