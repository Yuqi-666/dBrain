import type { DocumentCover } from "./document-analysis";

/**
 * Video transcoding port.
 *
 * Uploaded videos arrive in whatever codec the recording device chose — a
 * modern phone writes HEVC/H.265, which most desktop browsers cannot decode at
 * all: the `<video>` element plays the AAC track and reports
 * `videoWidth === 0`, i.e. sound with no picture. Storing the upload as-is
 * therefore produced nodes that only ever played their audio.
 *
 * The fix is the one every video site uses: re-package the upload into HLS
 * (an `.m3u8` playlist plus MPEG-TS segments) with a video codec browsers do
 * decode. A stream that is already browser-playable is copied rather than
 * re-encoded, so an H.264 upload is re-packaged in seconds at no quality cost;
 * only a codec the browser cannot decode is transcoded.
 *
 * As with {@link IDocumentAnalyzer}, the adapter hands back bytes and never
 * touches the file store: the application layer decides what gets stored, and
 * this port stays a pure "bytes in → bytes out" boundary.
 */

/** One file a transcode produced, ready to be handed to an `IFileStore`. */
export interface TranscodedArtifact {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

/**
 * The source video handed to a transcode.
 *
 * Exactly one of the two bodies is present. `bytes` is the original in-memory
 * form, kept for small inputs and for tests. `path` is the streaming form: a
 * 2 GiB upload reaches FFmpeg through the file system, because reading it into
 * the process heap would end the process instead of the upload.
 */
export type HlsTranscodeSource =
  | {
      /** Name of the uploaded file; drives the names of every artifact. */
      fileName: string;
      bytes: Uint8Array;
      path?: undefined;
    }
  | {
      fileName: string;
      /** Absolute path of the downloaded source file. */
      path: string;
      bytes?: undefined;
    };

/**
 * An HLS package produced from one source video.
 *
 * The playlist still refers to its media segments by bare file name
 * (`segment00000.ts`): a segment's URL only exists once it has been stored, so
 * the caller uploads the segments first and then rewrites the playlist.
 * {@link TranscodedArtifact} makes the ordering explicit rather than leaving the
 * playlist with addresses that are already stale.
 */
export interface HlsTranscodeResult {
  /** `index.m3u8`, using bare segment file names. */
  playlist: TranscodedArtifact;
  /** Media segments referred to by {@link playlist}, in order. */
  segments: TranscodedArtifact[];
  /** Poster frame taken from the start of the video; absent when it failed. */
  cover?: DocumentCover;
  /** Duration in seconds, `0` when the container does not declare one. */
  duration: number;
  /** Dimensions of the produced video, in pixels. */
  width: number;
  height: number;
  /** Video codec of the source (e.g. `hevc`). */
  videoCodec: string;
  /** Audio codec of the source, absent when the source has no audio stream. */
  audioCodec?: string;
  /**
   * True when the video stream had to be re-encoded, because the source codec
   * is not one browsers decode.
   */
  reencoded: boolean;
}

/** Turns an uploaded video into an HLS package. */
export interface IVideoTranscoder {
  /**
   * Re-packages `source` as HLS, copying streams that browsers already decode.
   *
   * Rejects when the source cannot be read by the transcoder at all; a source
   * that opens but whose poster frame cannot be extracted still resolves, with
   * {@link HlsTranscodeResult.cover} left undefined.
   */
  transcodeToHls(source: HlsTranscodeSource): Promise<HlsTranscodeResult>;
}
