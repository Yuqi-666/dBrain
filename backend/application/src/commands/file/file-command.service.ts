import type {
  DocumentCover,
  IDocumentAnalyzer,
  IFileStore,
  IVideoTranscoder,
  TranscodedArtifact,
} from "@workspace/domain";
import type {
  AnalyzePdfCommand,
  AnalyzedPdfDTO,
  TranscodeVideoCommand,
  TranscodedVideoDTO,
} from "./command";

/**
 * File upload use cases.
 *
 * Everything a browser cannot do with an uploaded blob happens here: parsing a
 * PDF's parameters, rendering its cover, and packaging a video as HLS in a codec
 * browsers decode. The service owns the ordering — fetch the blob, transform it,
 * store the results — while parsing, transcoding and blob I/O stay behind the
 * {@link IDocumentAnalyzer}, {@link IVideoTranscoder} and {@link IFileStore}
 * ports.
 */
export class FileCommandService {
  constructor(
    private readonly analyzer: IDocumentAnalyzer,
    private readonly fileStore: IFileStore,
    private readonly videoTranscoder: IVideoTranscoder,
  ) {}

  /**
   * Parses the PDF at `cmd.fileUrl` and stores a cover for its first page.
   *
   * Cover failures are absorbed (logged, `coverUrl: ""`): a missing thumbnail
   * degrades the node to its placeholder, whereas failing the whole call would
   * throw away perfectly good metadata. The call rejects only when the document
   * cannot be fetched or opened.
   */
  async analyzePdf(cmd: AnalyzePdfCommand): Promise<AnalyzedPdfDTO> {
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
    const bytes = await this.fileStore.download(cmd.fileUrl);
    const result = await this.videoTranscoder.transcodeToHls({
      fileName: fileNameFromUrl(cmd.fileUrl),
      bytes,
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
 * Rewrites a playlist's bare segment file names into the paths the store handed
 * back, so each `#EXTINF` line points at the blob that was just written.
 *
 * The rewrite keeps the path root-relative (`/api/files/…`) rather than the
 * absolute URL: a playlist is always fetched from the same origin as its
 * segments, so the stored file keeps working when the PocketBase address
 * changes — the same reason the client has `resolveFileUrl`.
 *
 * Unmapped lines are left untouched: a stray URI in the playlist (an fMP4 init
 * map, say) is passed through rather than silently dropped.
 */
function rewriteSegmentUrls(
  playlist: TranscodedArtifact,
  segments: { fileName: string; url: string }[],
): TranscodedArtifact {
  if (segments.length === 0) return playlist;

  const pathsByName = new Map(
    segments.map((segment) => [segment.fileName, toStorePath(segment.url)]),
  );

  const decoded = new TextDecoder().decode(playlist.bytes);
  const lines = decoded.split("\n").map((line) => {
    const uri = line.trim();
    return pathsByName.get(uri) ?? line;
  });

  return {
    ...playlist,
    bytes: new TextEncoder().encode(lines.join("\n")),
  };
}

/** Turns an absolute store URL into a root-relative path, leaving others alone. */
function toStorePath(url: string): string {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url;

  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
