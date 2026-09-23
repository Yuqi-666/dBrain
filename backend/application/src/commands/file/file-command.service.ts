import type {
  IDocumentAnalyzer,
  IFileStore,
  PdfDocumentAnalysis,
} from "@workspace/domain";
import type { AnalyzePdfCommand, AnalyzedPdfDTO } from "./command";

/**
 * File upload use cases.
 *
 * Reading a PDF's parameters is a server-side job: the browser has neither a
 * PDF parser nor a rasterizer worth shipping, and doing it here keeps the two
 * in step for every client (web, desktop). The service owns the ordering —
 * fetch the blob, parse it, store the cover — while the actual parsing and blob
 * I/O stay behind the {@link IDocumentAnalyzer} / {@link IFileStore} ports.
 */
export class FileCommandService {
  constructor(
    private readonly analyzer: IDocumentAnalyzer,
    private readonly fileStore: IFileStore,
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
    const coverUrl = await this.storeCover(analysis);

    return {
      pageCount: analysis.pageCount,
      fileSize: analysis.fileSize,
      pageWidth: analysis.pageWidth,
      pageHeight: analysis.pageHeight,
      coverUrl,
      info: analysis.info,
    };
  }

  private async storeCover(analysis: PdfDocumentAnalysis): Promise<string> {
    if (!analysis.cover) return "";

    try {
      return await this.fileStore.upload(analysis.cover);
    } catch (error) {
      console.warn("[FileCommandService] cover upload failed", error);
      return "";
    }
  }
}
