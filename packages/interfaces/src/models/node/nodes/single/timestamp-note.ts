/**
 * A note anchored to a point on an audio/video timeline.
 *
 * `timeMs` is relative to the **start of the media the node actually plays**
 * (the HLS rendition when one exists), not to the original file — see
 * `media.md` §0.3-10 for the timeline-offset caveat.
 */
export interface TimestampNote {
  id: string;
  /** Milliseconds from the start of the played media. */
  timeMs: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}
