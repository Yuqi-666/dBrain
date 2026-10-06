import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { TimestampNote } from "./timestamp-note";

export interface AudioNodeData extends NodeBase, NodeType<"audio"> {
  duration: number;
  fileSize: number;

  content: AudioContent;
}

export interface AudioContent {
  url: string;
  /** Absent / empty means "no notes" — old records stay readable (media.md §4.1). */
  timestampNotes?: TimestampNote[];
}
