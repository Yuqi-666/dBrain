/**
 * The media layer's pure half, pinned. Run with:
 *
 * ```sh
 * pnpm --filter=@workspace/ui test
 * ```
 *
 * M6 stores a timeline position as an integer millisecond and shows it as
 * `mm:ss`; both halves of that conversion are here, and neither is visible in a
 * screenshot until it is wrong (a note that reads `1:29` when the playhead says
 * `1:30`, or two notes captured in the same millisecond swapping places on every
 * reload). `createMediaController` is intentionally not covered: it is a thin
 * wrapper over an `HTMLMediaElement`, which `node --test` has no DOM for — the
 * browser probe in `docs/plan/gates.md` §6 covers it instead.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createTimestampNote, formatTimeMs, sortTimestampNotes } from "./types.ts";

test("formatTimeMs: minutes below an hour, seconds floored", () => {
  assert.equal(formatTimeMs(0), "0:00");
  assert.equal(formatTimeMs(1), "0:00");
  assert.equal(formatTimeMs(9_999), "0:09");
  assert.equal(formatTimeMs(90_000), "1:30");
  assert.equal(formatTimeMs(89_999), "1:29");
  assert.equal(formatTimeMs(3_599_000), "59:59");
});

test("formatTimeMs: hours appear past 3600s and the minutes get padded", () => {
  assert.equal(formatTimeMs(3_600_000), "1:00:00");
  assert.equal(formatTimeMs(7_265_000), "2:01:05");
});

test("formatTimeMs: unusable input reads 0:00 instead of NaN", () => {
  assert.equal(formatTimeMs(Number.NaN), "0:00");
  assert.equal(formatTimeMs(Number.POSITIVE_INFINITY), "0:00");
  assert.equal(formatTimeMs(-5_000), "0:00");
});

test("sortTimestampNotes: by time, then createdAt, then id — input untouched", () => {
  const source = [
    {
      id: "b",
      timeMs: 2_000,
      text: "b",
      createdAt: "2026-01-01T00:00:02Z",
      updatedAt: "",
    },
    {
      id: "c",
      timeMs: 1_000,
      text: "c",
      createdAt: "2026-01-01T00:00:02Z",
      updatedAt: "",
    },
    {
      id: "a",
      timeMs: 1_000,
      text: "a",
      createdAt: "2026-01-01T00:00:01Z",
      updatedAt: "",
    },
    {
      id: "a2",
      timeMs: 1_000,
      text: "a2",
      createdAt: "2026-01-01T00:00:01Z",
      updatedAt: "",
    },
  ];
  const snapshot = source.map((note) => note.id);

  const sorted = sortTimestampNotes(source);

  assert.deepEqual(
    sorted.map((note) => note.id),
    ["a", "a2", "c", "b"],
  );
  assert.deepEqual(
    source.map((note) => note.id),
    snapshot,
    "the caller's array must not be reordered in place",
  );
  assert.notEqual(sorted, source);
});

test("createTimestampNote: note_ id, rounded ms, ISO stamps, empty text by default", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");
  const note = createTimestampNote(1_234.6, "台词", now);

  assert.match(note.id, /^note_/);
  assert.equal(note.timeMs, 1_235);
  assert.equal(note.text, "台词");
  assert.equal(note.createdAt, "2026-10-07T12:00:00.000Z");
  assert.equal(note.updatedAt, note.createdAt);

  const blank = createTimestampNote(-10, "", now);
  assert.equal(blank.timeMs, 0);
  assert.equal(blank.text, "");
  assert.notEqual(blank.id, note.id);
});
