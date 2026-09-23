import type { PdfDocumentInfo } from "@workspace/domain";

/**
 * Asks the backend to parse an already-uploaded PDF and, on success, to store a
 * rendered first-page cover next to it.
 *
 * The blob itself never travels through this command — the client has just
 * uploaded it to the file store, so only its address is passed on.
 */
export interface AnalyzePdfCommand {
  /**
   * Address of the uploaded PDF, absolute (`http://…/api/files/files/<id>/x.pdf`)
   * or relative (`/api/files/files/<id>/x.pdf`). Addresses outside the file
   * store are rejected.
   */
  fileUrl: string;
}

/** Result of {@link AnalyzePdfCommand}. */
export interface AnalyzedPdfDTO {
  /** `/Pages /Count`. */
  pageCount: number;
  /** Byte length of the stored document. */
  fileSize: number;
  /** First page size in PDF points (1/72 inch). */
  pageWidth: number;
  pageHeight: number;
  /**
   * URL of the stored cover JPEG, or `""` when the first page could not be
   * rasterized or storing it failed. Cover generation is best-effort: the
   * metadata above is still returned.
   */
  coverUrl: string;
  /** Document-level parameters from the PDF Info dictionary. */
  info: PdfDocumentInfo;
}
