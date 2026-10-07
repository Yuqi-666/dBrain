"use client";

/**
 * The self-drawn audio transport (`docs/plan/media.md` §M6.1-2, design
 * `node-content/README.md` §1.3).
 *
 * The component owns one `<audio>` element (no `controls` — the browser already
 * hides a control-less element) and therefore owns the timeline: it is the only
 * place that builds a `MediaController`, and it hands that controller upwards
 * through `onMediaController` so the host's notes layer can read and seek the
 * same playhead. Nothing else in this file touches `currentTime` or listens for
 * `timeupdate`: the controller's `subscribe` is the one transport observer, and
 * the readouts below are just its last report.
 *
 * Two decisions are load-bearing and easy to undo by accident:
 *
 * 1. **The keyboard lives on the root box, never on `document`.** A global
 *    listener would fight the editor dialog and the quick panel, which is why
 *    the repo's media key ownership is scoped to the content box (plan §M6.2-④).
 * 2. **The track is a plain positioned box.** `marks` is an `absolute inset-0`
 *    layer supplied by the host, so it must render inside the track's own box or
 *    the markers and the fill stop sharing a coordinate system (plan §M6.1-2).
 */
import * as React from "react";
import { Pause, Play } from "lucide-react";

import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import type { AudioPlayerProps, MediaController } from "./types";
import { createMediaController, formatTimeMs } from "./types";

/** The speeds the menu offers; `1` is the element's own default. */
const PLAYBACK_RATES: readonly number[] = [0.75, 1, 1.25, 1.5, 2];

/** One arrow press, and one with `Shift` held (design §1.3 交互表). */
const SKIP_MS = 5_000;
const SKIP_LARGE_MS = 30_000;

/**
 * A text-entry target keeps the caret keys: an arrow inside an `input` /
 * `textarea` / `[contenteditable]` moves the caret, never the playhead.
 */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/**
 * `Space` is the one key a focusable control owns natively: on a `Button` it is
 * that button's activation (a play/pause button would toggle twice if the
 * transport also handled it), and on a `Select` it opens the picker.
 *
 * The direction keys are deliberately **not** narrowed this way. Focus lands on
 * the play/pause button after the very first click, and `←` / `→` are the
 * primary seek path (design §1.3) — gating them on "not a button" would kill
 * seeking exactly when the user just clicked the player.
 */
function ownsSpace(target: EventTarget | null): boolean {
  if (isTextEntry(target)) return false;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === "BUTTON" || tag === "SELECT") return false;
  }
  return true;
}

export function AudioPlayer(props: AudioPlayerProps) {
  const { src, className, marks, onMediaController, onLoadedData, onError } =
    props;

  const audioRef = React.useRef<HTMLAudioElement>(null);
  // The controller is built once per element (effect deps `[]`), so the report
  // callback must be read through a ref: a host that re-creates its handler on
  // every render must not tear the controller down and build a second one.
  const onMediaControllerRef = React.useRef(onMediaController);
  onMediaControllerRef.current = onMediaController;

  const [controller, setController] = React.useState<MediaController | null>(
    null,
  );
  const [currentMs, setCurrentMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);
  const [paused, setPaused] = React.useState(true);
  const [rate, setRate] = React.useState(1);
  const draggingRef = React.useRef(false);

  React.useEffect(() => {
    const element = audioRef.current;
    if (!element) return;

    const next = createMediaController(element);
    setController(next);

    // `subscribe` is the only transport observer: it forwards every transport
    // event (metadata, duration, play/pause, seek) and, while playing, one
    // report per animation frame. The controller is deliberately not in a
    // dependency array — it is created here and released here.
    const unsubscribe = next.subscribe((timeMs) => {
      setCurrentMs(timeMs);
      setDurationMs(next.getDurationMs());
      setPaused(next.isPaused());
    });

    onMediaControllerRef.current?.(next);

    return () => {
      unsubscribe();
      onMediaControllerRef.current?.(null);
    };
  }, []);

  const toggle = () => {
    if (!controller) return;
    if (controller.isPaused()) controller.play();
    else controller.pause();
  };

  const seekTo = (timeMs: number) => {
    // No duration yet means no meaningful ratio; seeking before metadata is
    // dropped by the browser anyway, so the gesture is a no-op rather than a
    // division by zero.
    if (durationMs <= 0) return;
    controller?.seek(timeMs);
  };

  const seekFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (durationMs <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    seekTo(Math.round(clamped * durationMs));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (durationMs <= 0) return;
    // No `preventDefault()` here: the root box has to be able to take focus
    // from the gesture (plan §M6.1-2).
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    seekFromPointer(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromPointer(event);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const applyRate = (value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if (!controller) return;

    const step = event.shiftKey ? SKIP_LARGE_MS : SKIP_MS;

    if (event.key === " " || event.key === "Spacebar") {
      // A focused button / select keeps its own `Space`.
      if (!ownsSpace(event.target)) return;
      event.preventDefault();
      toggle();
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      // Only a caret wins over a seek; a focused `Button` does not.
      if (isTextEntry(event.target)) return;
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -step : step;
      controller.seek(controller.getCurrentTimeMs() + delta);
    }
  };

  const percent =
    durationMs > 0
      ? Math.min(100, Math.max(0, (currentMs / durationMs) * 100))
      : 0;

  return (
    <div
      role="group"
      aria-label="音频播放器"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border border-border/60 p-2 outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      {/* No `controls`: the browser hides a control-less media element by
          itself, and `className="hidden"` would not survive a host's reset. */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedData={onLoadedData}
        onError={onError}
      />

      <div className="flex w-full items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={paused ? "播放" : "暂停"}
          onClick={toggle}
        >
          {paused ? <Play /> : <Pause />}
        </Button>

        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTimeMs(currentMs)}
        </span>

        <div
          data-media-track
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative h-2 flex-1 touch-none cursor-pointer rounded-full bg-muted"
        >
          <div
            data-media-progress
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
          {/* The host's marks layer is `absolute inset-0`; it must share this
              box with the fill so a marker's `timeMs / duration` lands on the
              same pixel as the progress bar. */}
          {marks}
        </div>

        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTimeMs(durationMs)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`播放速率 ${rate}×`}
              className="tabular-nums"
            >
              {rate}×
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-28">
            <DropdownMenuLabel>播放速率</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(rate)}
              onValueChange={applyRate}
            >
              {PLAYBACK_RATES.map((value) => (
                <DropdownMenuRadioItem key={value} value={String(value)}>
                  {value}×
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
