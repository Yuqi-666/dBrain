import type {
  DocumentCover,
  IDocumentAnalyzer,
  IFileStore,
  IVideoTranscoder,
} from "@workspace/domain";
import type {
  AnalyzePdfCommand,
  AnalyzedPdfDTO,
  TranscodeVideoCommand,
  TranscodedVideoDTO,
} from "./command";
import { rewriteSegmentUrls } from "./hls-playlist";

/**
 * File upload use cases.
 *
 * Everything a browser cannot do with an uploaded blob happens here: parsing a
 * PDF's parameters, rendering its cover, and packaging a video as HLS in a codec
 * browsers decode. The service owns the ordering — fetch the blob, transform it,
 * store the results — while parsing, transcoding and blob I/O stay behind the
 * {@link IDocumentAnalyzer}, {@link IVideoTranscoder} and {@link IFileStore}
 * ports.
 *
 * Both use cases pull the blob through a temporary file rather than through
 * `download()`: an upload may be 2 GiB, and a video has to reach FFmpeg as a
 * path either way. The temp directory is always removed, on success and on
 * failure.
 */
export class FileCommandService {
  constructor(
    private readonly analyzer: IDocumentAnalyzer,
    private readonly fileStore: IFileStore,
    private readonly videoTranscoder: IVideoTranscoder,
    /**
     * Largest PDF the analyzer is allowed to open, in bytes. Injected from the
     * shared upload contract by the composition root so the client's "skip
     * analysis" rule and this guard can never disagree.
     */
    private readonly pdfAnalyzeMaxBytes: number,
  ) {}

  /**
   * Parses the PDF at `cmd.fileUrl` and stores a cover for its first page.
   *
   * Cover failures are absorbed (logged, `coverUrl: ""`): a missing thumbnail
   * degrades the node to its placeholder, whereas failing the whole call would
   * throw away perfectly good metadata. The call rejects only when the document
   * cannot be fetched, is larger than {@link pdfAnalyzeMaxBytes}, or cannot be
   * opened.
   */
  async analyzePdf(cmd: AnalyzePdfCommand): Promise<AnalyzedPdfDTO> {
    // Size first: the parser needs the whole document in memory, so a file the
    // parser may not open is never downloaded at all.
    const size = await this.fileStore.stat(cmd.fileUrl);
    if (size > this.pdfAnalyzeMaxBytes) {
      throw new Error(
        `PDF is ${size} bytes; analysis is limited to ${this.pdfAnalyzeMaxBytes} bytes`,
      );
    }

    const bytes = await this.fileStore.download(cmd.fileUrl);
    const analysis = await this.analyzer.analyzePdf(bytes);
    const coverUrl = await this.storeCover(analysis.cover);

    return {
      pageCount: analysis.pageCount,
      fileSize: analysis.fileSize,
      pageWidth: analysis.pageWidth,
      pageHeight: analysis.pageHeight,
      coverUrl,
      info: analysis.info,
    };
  }

  /**
   * Packages the video at `cmd.fileUrl` as HLS and stores it next to its source.
   *
   * A stream browsers already decode is copied, so an H.264 upload is merely
   * re-packaged; only a codec the browser cannot decode (HEVC from a phone, say)
   * is re-encoded. The order matters: every segment is stored first, because the
   * playlist has to name the addresses they ended up at.
   *
   * Rejects when the video cannot be fetched or read by the transcoder; the
   * caller keeps the original upload as the fallback source.
   */
  async transcodeVideo(
    cmd: TranscodeVideoCommand,
  ): Promise<TranscodedVideoDTO> {
    const fileName = fileNameFromUrl(cmd.fileUrl);
    // The store owns the temporary location: this layer decides what happens to
    // a file, never where it lives. The suffix keeps the extension FFmpeg picks
    // its demuxer by.
    const source = await this.fileStore.downloadToTempFile(
      cmd.fileUrl,
      sourceSuffix(fileName),
    );

    try {
      // FFmpeg reads the downloaded path directly, so a 2 GiB source is written
      // exactly once and never materialised on the heap.
      const result = await this.videoTranscoder.transcodeToHls({
        fileName,
        path: source.path,
      });

      const storedSegments: { fileName: string; url: string }[] = [];
      for (const segment of result.segments) {
        storedSegments.push({
          fileName: segment.fileName,
          url: await this.fileStore.upload(segment),
        });
      }

      const playlist = rewriteSegmentUrls(result.playlist, storedSegments);
      const hlsUrl = await this.fileStore.upload(playlist);
      const coverUrl = await this.storeCover(result.cover);

      return {
        hlsUrl,
        coverUrl,
        duration: result.duration,
        width: result.width,
        height: result.height,
        videoCodec: result.videoCodec,
        audioCodec: result.audioCodec,
        reencoded: result.reencoded,
      };
    } finally {
      await source.cleanup();
    }
  }

  private async storeCover(cover?: DocumentCover): Promise<string> {
    if (!cover) return "";

    try {
      return await this.fileStore.upload(cover);
    } catch (error) {
      console.warn("[FileCommandService] cover upload failed", error);
      return "";
    }
  }
}

/**
 * Name of the stored file a file-store address points at.
 *
 * The transcoder derives its artifact names from it, so the original name is
 * kept (PocketBase has already sanitized it on upload).
 */
function fileNameFromUrl(fileUrl: string): string {
  try {
    const pathname = new URL(fileUrl, "http://file.invalid").pathname;
    const last = pathname.split("/").pop() ?? "";
    return decodeURIComponent(last) || "video";
  } catch {
    return "video";
  }
}

/**
 * Turns a stored name into one safe path segment.
 *
 * The name only ever comes from this project's own file store, but it is joined
 * into a temporary path, so anything that could climb out of that directory is
 * replaced rather than trusted. The extension survives, which is the part the
 * demuxer is chosen by.
 */
function safeSegment(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "_");
  return cleaned || "video";
}

/**
 * The suffix of the temporary download, taken from the stored name.
 *
 * FFmpeg probes by content, but some demuxers are only picked by extension, and
 * the stored name is the only place the original extension survives.
 */
function sourceSuffix(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return ".bin";
  const suffix = safeSegment(fileName.slice(dot));
  return suffix.startsWith(".") && suffix.length > 1 ? suffix.slice(0, 12) : ".bin";
}
