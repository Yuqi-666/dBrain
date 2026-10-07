/**
 * The media layer's frozen contract — M6 (`docs/plan/media.md` §M6.1-1, §M6.2).
 *
 * Everything the audio player, the video player's time outlet and the shared
 * timestamp-note components agree on lives here, so the three of them can be
 * built in parallel (plan `README.md` §3.2 W5) without inventing a second
 * vocabulary. Two rules keep this file cheap to depend on:
 *
 * 1. **No React runtime.** The only React import is `type { ReactNode }`, which
 *    is erased at compile time — so this module is loadable from `node --test`.
 * 2. **One time unit.** Every duration/position crossing a boundary is an
 *    **integer millisecond** (`timeMs`), never the float seconds of
 *    `HTMLMediaElement.currentTime` (design `node-content/README.md` §0.3-10).
 */
import type { ReactNode } from "react";

import type { TimestampNote } from "@workspace/interfaces";

/**
 * The transport surface a media host exposes to its notes layer.
 *
 * The owning component (the audio player, or `<VideoPlayer>` on the video side)
 * creates one over its own media element with {@link createMediaController} and
 * hands it out through `onMediaController`. Consumers (the marks layer, the
 * notes list, the node-content host) only ever call these seven methods, so the
 * audio and video sides stay interchangeable.
 */
export interface MediaController {
  /**
   * The playhead in integer milliseconds.
   *
   * `0` before metadata is known; never `NaN` (a media element reports `NaN`
   * for `currentTime` until then, and a note anchored to `NaN` is unreadable).
   */
  getCurrentTimeMs(): number;
  /**
   * The total duration in integer milliseconds, or `0` while metadata has not
   * loaded (and for a live stream, whose `duration` is `Infinity`).
   */
  getDurationMs(): number;
  /** Whether the element is paused (`true` before the first play, too). */
  isPaused(): boolean;
  /**
   * Start playback. A rejected `play()` (autoplay policy, source not ready) is
   * swallowed: the transport button is a user gesture in practice, and an
   * unhandled rejection in the console is not worth the fidelity.
   */
  play(): void;
  /** Pause playback. */
  pause(): void;
  /**
   * Seek to `timeMs`, **clamped to `[0, duration]`** once the duration is
   * known. Before metadata loads it clamps to `>= 0` only, because the browser
   * would drop an out-of-range assignment on the floor anyway.
   */
  seek(timeMs: number): void;
  /**
   * Subscribe to playhead changes.
   *
   * The listener is called with {@link MediaController.getCurrentTimeMs} on
   * every transport event (`loadedmetadata` / `durationchange` / `timeupdate` /
   * `play` / `pause` / `ended` / `seeking` / `seeked`) and, while playing,
   * once per animation frame, so a progress bar follows the audio instead of
   * stepping 4 times a second. Returns the unsubscribe function.
   *
   * A subscription must be released on unmount: {@link createMediaController}
   * stops its animation-frame loop when the last listener is gone, and a leaked
   * listener keeps a rAF loop alive for the life of the element.
   */
  subscribe(listener: (timeMs: number) => void): () => void;
}

/** What a media-owning component reports upwards (and `null` on unmount). */
export type MediaControllerCallback = (
  controller: MediaController | null,
) => void;

/** Round to an integer millisecond and squeeze `NaN` / `Infinity` to `0`. */
function toMs(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0;
}

/**
 * Bind a {@link MediaController} to a media element.
 *
 * Self-cleaning: it attaches its transport listeners to the element once (a
 * listener on a removed element is collected with it), and its animation-frame
 * loop runs only while the element is playing **and** at least one listener is
 * subscribed. There is deliberately no `dispose()` — releasing every
 * subscription is enough, which keeps the frozen interface at the seven methods
 * the design named.
 */
export function createMediaController(
  element: HTMLMediaElement,
): MediaController {
  const listeners = new Set<(timeMs: number) => void>();
  let frame: number | null = null;

  const currentTimeMs = (): number => toMs(element.currentTime);

  const notify = (): void => {
    const ms = currentTimeMs();
    for (const listener of listeners) listener(ms);
  };

  const stopFrames = (): void => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  const tick = (): void => {
    frame = null;
    if (element.paused || listeners.size === 0) return;
    notify();
    frame = requestAnimationFrame(tick);
  };

  const ensureFrames = (): void => {
    if (element.paused || listeners.size === 0 || frame !== null) return;
    frame = requestAnimationFrame(tick);
  };

  const onTransportEvent = (): void => {
    notify();
    ensureFrames();
  };

  const events = [
    "loadedmetadata",
    "durationchange",
    "timeupdate",
    "play",
    "playing",
    "pause",
    "ended",
    "seeking",
    "seeked",
  ] as const;

  for (const event of events) {
    element.addEventListener(event, onTransportEvent);
  }

  return {
    getCurrentTimeMs: currentTimeMs,
    getDurationMs: () => toMs(element.duration),
    isPaused: () => element.paused,
    play: () => {
      void element.play()?.catch(() => {});
      ensureFrames();
    },
    pause: () => {
      element.pause();
      stopFrames();
    },
    seek: (timeMs: number) => {
      const durationMs = toMs(element.duration);
      const target = Math.min(
        Math.max(timeMs, 0),
        durationMs > 0 ? durationMs : Infinity,
      );
      if (!Number.isFinite(target)) return;
      element.currentTime = target / 1000;
      notify();
    },
    subscribe: (listener: (timeMs: number) => void) => {
      listeners.add(listener);
      ensureFrames();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopFrames();
      };
    },
  };
}

/**
 * Format a millisecond position as `mm:ss`, or `h:mm:ss` past an hour.
 *
 * The display half of design §0.3-10: `timeMs` is the storage format, this is
 * the only place that turns it into text. Seconds are floored (never rounded
 * up: a note captured at 89 999 ms reads `1:29`, matching the playhead the user
 * saw). `0`, a negative value and `NaN` all read `0:00`.
 */
export function formatTimeMs(ms: number): string {
  const totalSeconds = Number.isFinite(ms)
    ? Math.max(0, Math.floor(ms / 1000))
    : 0;
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/**
 * Order notes the way every consumer displays them: by `timeMs` ascending,
 * then by `createdAt` ascending as an explicit tiebreaker (two notes captured
 * inside the same millisecond keep the order they were made in — `Array.sort`
 * stability is not relied on), then by `id` so the order is total.
 *
 * Always returns a new array, so callers can hand the result to a render or a
 * write without aliasing their input.
 */
export function sortTimestampNotes(
  notes: readonly TimestampNote[],
): TimestampNote[] {
  return [...notes].sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Mint a note anchored at `timeMs` (design §M6.2-⑦: `note_<uuid>`, with the
 * dataview-style timestamp+random fallback where `crypto.randomUUID` is absent).
 *
 * `now` is injectable so a test can pin `createdAt` / `updatedAt`.
 */
export function createTimestampNote(
  timeMs: number,
  text = "",
  now: Date = new Date(),
): TimestampNote {
  const globalCrypto = globalThis.crypto;
  const id =
    globalCrypto && typeof globalCrypto.randomUUID === "function"
      ? `note_${globalCrypto.randomUUID()}`
      : `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const stamp = now.toISOString();
  return {
    id,
    timeMs: Math.max(0, Math.round(timeMs)),
    text,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * A host's request for "start a note here" (the `Mod-Enter` path).
 *
 * `token` makes repeats work: pressing `Mod-Enter` twice at the same position
 * produces the same `timeMs`, and only a changed `token` tells the list that
 * this is a second request. The host owns the counter.
 */
export interface TimestampAddRequest {
  /** The position captured from the controller when the key was pressed. */
  timeMs: number;
  /** Monotonically increasing; a new value means "run the request again". */
  token: number;
}

/**
 * Props of the self-drawn audio transport (`media/audio-player.tsx`).
 *
 * The player owns the `<audio>` element (the browser hides a control-less
 * element by itself) and therefore owns the controller; the host learns it
 * through {@link AudioPlayerProps.onMediaController}.
 */
export interface AudioPlayerProps {
  /** A ready-to-use URL — the host runs `resolveFileUrl` before passing it. */
  src: string;
  className?: string;
  /**
   * The mark layer, rendered **inside the timeline track's own box** (a
   * positioned container), so an `absolute inset-0` layer lines up with the
   * fill. The host passes `<TimestampNoteMarks … />`.
   */
  marks?: ReactNode;
  /** The controller, or `null` on unmount. */
  onMediaController?: MediaControllerCallback;
  /**
   * Fired once the element has data (the old `<audio onLoadedData>` hook the
   * skeleton screen hangs off) and when the source cannot be played.
   */
  onLoadedData?: () => void;
  onError?: () => void;
}

/**
 * Props of the shared notes list (`media/timestamp-notes.tsx`).
 *
 * The list is the **only** writer of notes: it mints, edits and deletes them
 * and reports the complete next array through
 * {@link TimestampNotesProps.onNotesChange}, which the host persists through
 * `useNodeContentWriter`'s `patchContent` (one gesture, one write).
 */
export interface TimestampNotesProps {
  /** The persisted notes; the component sorts them for display itself. */
  notes: readonly TimestampNote[];
  /** `null` until the player reports one; controls disable themselves then. */
  controller: MediaController | null;
  /** The complete next array — the host writes it verbatim. */
  onNotesChange: (notes: TimestampNote[]) => void;
  /**
   * The `Mod-Enter` request. A changed `token` starts a new draft at
   * `addRequest.timeMs` and focuses the composer; the list does not report it
   * through `onNotesChange` until the user commits.
   */
  addRequest?: TimestampAddRequest | null;
  /** Host-supplied sizing (the host owns the scroll box, e.g. `max-h-… overflow-y-auto`). */
  className?: string;
  /** Composer placeholder; defaults to a plain "记一句…". */
  placeholder?: string;
}

/**
 * Props of the timeline mark layer (`media/timestamp-notes.tsx`).
 *
 * It fills a **positioned parent** (the host's, or the audio player's, track)
 * and draws one marker per note at `timeMs / duration`, plus the playhead at
 * the current position. Clicking a marker seeks through the controller.
 */
export interface TimestampNoteMarksProps {
  notes: readonly TimestampNote[];
  controller: MediaController | null;
  className?: string;
  /** Highlights one marker (the list's active row). */
  activeNoteId?: string | null;
}
