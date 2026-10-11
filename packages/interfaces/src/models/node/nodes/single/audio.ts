import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";
import type { TimestampData } from "./timestamp-data";

export interface AudioNodeData extends NodeBase, NodeType<"audio"> {
  duration: number;
  fileSize: number;

  content: AudioContent;
}

export interface AudioContent {
  url: string;
  /**
   * The node's timeline: its notes and its transcript, one array.
   *
   * Absent / empty means "no timestamps" — old records stay readable
   * (media.md §4.1). The reader splits the two kinds by `type`; the storage is
   * one column so a record can never hold notes without its cues (see
   * `VideoContent.timestamps`).
   */
  timestamps?: TimestampData[];
}
