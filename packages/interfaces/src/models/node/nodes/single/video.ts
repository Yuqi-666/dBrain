import type { NodeBase } from "../../base";
import type { NodeType } from "../../types";

export type VideoSource = "local" | "online";

export interface VideoNodeData extends NodeBase, NodeType<"video"> {
  duration: number;
  source: VideoSource;
  sourceUrl?: string;
  fileSize?: number;
  location?: string;
  shootingTime?: string;

  content: VideoContent;
}

export interface VideoContent {
  /** The uploaded/remote file itself, played when no HLS rendition exists. */
  url: string;
  coverUrl: string;
  /**
   * HLS playlist (`.m3u8`) the backend packaged the video into, when it has
   * been transcoded. Browsers cannot decode every codec a recording device
   * writes (HEVC being the common one), so a node that has this plays the
   * playlist and only falls back to {@link url} when it does not.
   */
  hlsUrl?: string;
}
