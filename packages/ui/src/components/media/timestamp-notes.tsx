"use client";

/**
 * M6 §M6.1-3 — the shared timestamp-note components (`docs/plan/media.md`).
 *
 * Two named exports, one file, no host knowledge:
 *
 * - {@link TimestampNoteMarks} draws one marker per note plus the playhead.
 *   It fills a **positioned parent** the caller already owns (`absolute
 *   inset-0`): the audio player renders it inside its timeline track
 *   (`AudioPlayerProps.marks`, `media/types.ts:275`) and the video host renders
 *   it in the bar under its `<video>`. It subscribes to no DOM event itself —
 *   the playhead comes from `controller.subscribe`, released on unmount (a
 *   leaked listener keeps `createMediaController`'s rAF loop alive,
 *   `media/types.ts:70`).
 * - {@link TimestampNotes} is the **only writer** of notes. Mint / edit /
 *   delete each build a complete next array and hand it to `onNotesChange`,
 *   which the host persists through `patchContent`. `props.notes` is sorted
 *   for display, never mutated (`sortTimestampNotes` returns a new array,
 *   `media/types.ts:206`); every write is sorted too, so what reaches the
 *   store is already in §1.3's reading order.
 *
 * Sizing: the root is `cn("flex flex-col gap-2", className)` and the host owns
 * the box and its scrolling. Nothing here uses `h-full` / `100vh` / a fixed
 * height, and nothing here adds `overflow` — node-content is mounted both in a
 * `w-[1200px] h-[80vh]` dialog and full-screen, so those are the host's calls
 * (`node-content/README.md` §0.3-9, gate G6-7).
 *
 * Keys (`node-content/README.md` §1.3): `Mod-Enter` opens one draft per
 * `addRequest.token` and focuses it; in the shared editor `Enter` commits,
 * `Shift-Enter` is a newline, `Esc` cancels; `↑`/`↓` walk the rows' time
 * buttons (the arrows stay the caret's inside a `Textarea`). Nothing is
 * captured on `document` (§M6.2-④ — the host owns the `Mod-Enter` listener on
 * its root box).
 */
import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { TimestampNote } from "@workspace/interfaces";

import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { createTimestampNote, formatTimeMs, sortTimestampNotes } from "./types";
import type { TimestampNoteMarksProps, TimestampNotesProps } from "./types";

/** Clamp a position to `[0, 100]`; only called with a known positive duration. */
function percentOf(timeMs: number, durationMs: number): number {
  const percent = (timeMs / durationMs) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * The mark layer: one tick per note, plus a vertical playhead.
 *
 * Markers are real buttons (`tabIndex={-1}`: the list is the keyboard surface,
 * so the markers stay out of the tab order) so a click can seek; only they opt
 * back into pointer events, because the layer itself must not steal the track's
 * drag gesture.
 *
 * `durationMs === 0` means "metadata not here yet" (or a live stream) — no
 * marker and no playhead is drawn then, so nothing divides by zero and nothing
 * escapes the track (`MediaController.getDurationMs`, `types.ts:37`).
 */
export function TimestampNoteMarks({
  notes,
  controller,
  className,
  activeNoteId,
}: TimestampNoteMarksProps) {
  const [clock, setClock] = React.useState({ currentMs: 0, durationMs: 0 });

  React.useEffect(() => {
    if (!controller) {
      setClock({ currentMs: 0, durationMs: 0 });
      return;
    }

    // The listener also fires on `durationchange`, so the duration is re-read
    // here rather than only once on mount.
    const sync = (timeMs: number) => {
      setClock({ currentMs: timeMs, durationMs: controller.getDurationMs() });
    };

    sync(controller.getCurrentTimeMs());
    return controller.subscribe(sync);
  }, [controller]);

  const { currentMs, durationMs } = clock;
  const ready = durationMs > 0;

  // Recomputed per frame while playing, so the markers are memoized and only
  // the playhead re-renders.
  const marks = React.useMemo(
    () =>
      ready
        ? notes.map((note, index) => (
            <button
              // Dirty data can repeat an id (`normalizeNotes` synthesizes
              // `note-<timeMs>`), so the index keeps the key unique.
              key={`${note.id}:${index}`}
              type="button"
              tabIndex={-1}
              title={formatTimeMs(note.timeMs)}
              aria-label={`跳到 ${formatTimeMs(note.timeMs)}`}
              onClick={() => controller?.seek(note.timeMs)}
              style={{ left: `${percentOf(note.timeMs, durationMs)}%` }}
              className={cn(
                // `ring-background` is the contrast outline that keeps the tick
                // readable on the opaque fill as well as on the empty track —
                // today `bg-primary` over `bg-muted` in `audio-player.tsx`'s
                // `data-media-track` box. Emphasis therefore grows the tick
                // instead of swapping the ring colour, which would drop the
                // outline exactly when it is needed.
                "pointer-events-auto absolute top-0 h-full w-[3px] -translate-x-1/2 cursor-pointer rounded-full bg-foreground ring-1 ring-background hover:ring-2 focus-visible:outline-2 focus-visible:outline-ring",
                activeNoteId === note.id && "w-[5px] ring-2",
              )}
            />
          ))
        : null,
    [ready, notes, controller, durationMs, activeNoteId],
  );

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      data-slot="timestamp-note-marks"
    >
      {marks}
      {ready ? (
        <div
          aria-hidden
          style={{ left: `${percentOf(currentMs, durationMs)}%` }}
          className="pointer-events-none absolute top-0 h-full w-px -translate-x-1/2 bg-foreground"
        />
      ) : null}
    </div>
  );
}

/** A draft is not a note yet: it has no id and must not reach the store. */
interface DraftState {
  timeMs: number;
  text: string;
}

/** One rendered line: a persisted note, or the open draft. */
interface NoteRow {
  /** React key; the draft uses a constant so it keeps its identity while typed. */
  key: string;
  timeMs: number;
  text: string;
  /** `null` for the draft row. */
  note: TimestampNote | null;
}

const DRAFT_KEY = "__timestamp-note-draft__";

/**
 * The notes list — composer, inline editor, delete.
 *
 * `controller === null` (before the player reports one) disables 加笔记 and the
 * time buttons: there is no position to capture and nothing to seek.
 */
export function TimestampNotes({
  notes,
  controller,
  onNotesChange,
  addRequest,
  className,
  placeholder,
}: TimestampNotesProps) {
  const [draft, setDraft] = React.useState<DraftState | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [focusToken, setFocusToken] = React.useState(0);
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const handledTokenRef = React.useRef<number | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const sorted = React.useMemo(() => sortTimestampNotes(notes), [notes]);

  // `Mod-Enter`: a changed token opens exactly one draft and asks for focus.
  // The token guard also survives StrictMode's double effect and a re-render
  // where the same request is still in props (types.ts:248).
  React.useEffect(() => {
    if (!addRequest) return;
    if (handledTokenRef.current === addRequest.token) return;
    handledTokenRef.current = addRequest.token;
    if (!controller) return;
    setEditingId(null);
    setDraft({ timeMs: addRequest.timeMs, text: "" });
    setFocusToken((token) => token + 1);
  }, [addRequest, controller]);

  // Focus after the editor has mounted — the state update above only schedules
  // the render, so `editorRef` is null until the next commit.
  React.useEffect(() => {
    if (focusToken === 0) return;
    editorRef.current?.focus();
  }, [focusToken]);

  const openDraftAtPlayhead = () => {
    if (!controller) return;
    setEditingId(null);
    setDraft({ timeMs: controller.getCurrentTimeMs(), text: "" });
    setFocusToken((token) => token + 1);
  };

  const cancelDraft = () => setDraft(null);

  /** Empty text discards the draft without a write (plan §M6.1-3). */
  const commitDraft = () => {
    if (!draft) return;
    const text = draft.text.trim();
    setDraft(null);
    if (!text) return;
    onNotesChange(
      sortTimestampNotes([...notes, createTimestampNote(draft.timeMs, text)]),
    );
  };

  const beginEdit = (note: TimestampNote) => {
    setDraft(null);
    setEditingId(note.id);
    setEditingText(note.text);
    setFocusToken((token) => token + 1);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  /** An empty edit is a cancel, not a delete: the note keeps its old text. */
  const commitEdit = (note: TimestampNote) => {
    const text = editingText.trim();
    if (!text) {
      cancelEdit();
      return;
    }
    setEditingId(null);
    setEditingText("");
    const updatedAt = new Date().toISOString();
    onNotesChange(
      sortTimestampNotes(
        notes.map((item) =>
          item.id === note.id ? { ...item, text, updatedAt } : item,
        ),
      ),
    );
  };

  const removeNote = (note: TimestampNote) => {
    onNotesChange(
      sortTimestampNotes(notes.filter((item) => item.id !== note.id)),
    );
  };

  const onEditorKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    commit: () => void,
    cancel: () => void,
  ) => {
    if (event.key === "Escape") {
      // Keep `Esc` from reaching the node-editor dialog: cancelling the editor
      // must not also close the host.
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
  };

  /**
   * ↑/↓ walks the rows' time buttons (design §1.3's "上下移动笔记焦点").
   *
   * The time buttons are focusable on their own, so no `tabIndex` is added
   * here. Inside a `Textarea` the arrows stay the caret's — the browser's
   * native caret handling must win, and the check is on the event target
   * rather than on our state so it also covers the draft. Focus does not wrap:
   * ↓ past the last row and ↑ before the first leave focus where it is.
   */
  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (event.target instanceof HTMLTextAreaElement) return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        // `:not(:disabled)`: before a controller exists every time button is
        // disabled and unfocusable, so the handler must fall through (and let
        // the host's scroll box keep the arrows) instead of swallowing them.
        "[data-note-time]:not(:disabled)",
      ) ?? [],
    );
    if (buttons.length === 0) return;
    event.preventDefault();
    const active = document.activeElement;
    const current =
      active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;
    if (current === -1) {
      const edge = event.key === "ArrowDown" ? buttons[0] : buttons.at(-1);
      edge?.focus();
      return;
    }
    buttons[current + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
  };

  // The draft is injected at its sorted position, so the user types where the
  // note will land rather than at the end of the list.
  const rows = React.useMemo<NoteRow[]>(() => {
    const base: NoteRow[] = sorted.map((note, index) => ({
      // Ids can repeat in dirty data, hence the index (`normalizeNotes`).
      key: `${note.id}:${index}`,
      timeMs: note.timeMs,
      text: note.text,
      note,
    }));
    if (!draft) return base;
    const index = base.findIndex((row) => row.timeMs > draft.timeMs);
    const at = index === -1 ? base.length : index;
    const draftRow: NoteRow = {
      key: DRAFT_KEY,
      timeMs: draft.timeMs,
      text: draft.text,
      note: null,
    };
    return [...base.slice(0, at), draftRow, ...base.slice(at)];
  }, [sorted, draft]);

  return (
    <div
      ref={listRef}
      onKeyDown={onListKeyDown}
      className={cn("flex flex-col gap-2", className)}
      data-slot="timestamp-notes"
    >
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!controller}
          onClick={openDraftAtPlayhead}
          aria-label="在当前时间加一条笔记"
          title="在当前时间加一条笔记"
        >
          <Plus aria-hidden />
          加笔记
        </Button>
      </div>

      {sorted.length === 0 && !draft ? (
        <p className="text-xs text-muted-foreground">
          还没有笔记 · 播放时按 ⌘/Ctrl + Enter 记一句
        </p>
      ) : null}

      {rows.map((row) => {
        const note = row.note;
        const isDraft = note === null;
        const isEditing = note !== null && editingId === note.id;
        const editing = isDraft || isEditing;
        const value = isEditing ? editingText : row.text;
        const commit = () => (note ? commitEdit(note) : commitDraft());
        const cancel = () => (isDraft ? cancelDraft() : cancelEdit());

        return (
          <div
            key={row.key}
            className={cn(
              "group flex items-start gap-2 rounded-md px-1 py-1",
              isEditing && "bg-muted/50",
            )}
          >
            <button
              type="button"
              data-note-time
              disabled={!controller}
              onClick={() => controller?.seek(row.timeMs)}
              title={`跳到 ${formatTimeMs(row.timeMs)}`}
              aria-label={`跳到 ${formatTimeMs(row.timeMs)}`}
              className="mt-0.5 shrink-0 rounded-sm px-1 text-xs tabular-nums text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {formatTimeMs(row.timeMs)}
            </button>

            {editing ? (
              <Textarea
                ref={editorRef}
                value={value}
                rows={2}
                placeholder={isDraft ? (placeholder ?? "记一句…") : "编辑笔记…"}
                onChange={(event) => {
                  const text = event.target.value;
                  if (isDraft) {
                    setDraft((current) =>
                      current ? { ...current, text } : current,
                    );
                  } else {
                    setEditingText(text);
                  }
                }}
                onKeyDown={(event) => onEditorKeyDown(event, commit, cancel)}
                onBlur={() => {
                  // Blur never writes: it only drops an empty editor, so a
                  // non-empty draft survives a click elsewhere.
                  if (!value.trim()) cancel();
                }}
                className="min-h-9 flex-1 resize-none px-2 py-1 text-xs md:text-xs"
              />
            ) : (
              <p className="min-w-0 flex-1 text-xs break-words whitespace-pre-wrap">
                {row.text}
              </p>
            )}

            {note && !isEditing ? (
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="编辑笔记"
                  title="编辑"
                  onClick={() => beginEdit(note)}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="删除笔记"
                  title="删除"
                  onClick={() => removeNote(note)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
