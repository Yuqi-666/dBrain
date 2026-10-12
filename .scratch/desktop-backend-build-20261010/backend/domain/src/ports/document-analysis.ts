/**
 * Document Analysis Ports
 *
 * Contracts for turning an uploaded blob into structured metadata. Like the
 * repository ports they live in the domain layer so that the application layer
 * can depend on them and the infrastructure layer can implement them:
 *
 * - `IDocumentAnalyzer` — pure parsing, no I/O beyond the bytes it is handed.
 * - `IFileStore`        — blob I/O against the backing store (PocketBase).
 *
 * Parsing happens on the server, never in the browser: a PDF requires a real
 * parser (and a rasterizer for its cover), and keeping it here means the web
 * client does not have to ship one.
 */

/** A rendered cover image produced by an analyzer, ready to be stored. */
export interface DocumentCover {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

/**
 * Document-level parameters read out of the PDF trailer / Info dictionary.
 * Every field is optional because PDF producers are free to omit all of them.
 */
export interface PdfDocumentInfo {
  /** `/Info /Title`. */
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  /** Producing application (e.g. `Skia/PDF m152`). */
  creator?: string;
  /** Library that wrote the file (e.g. `pdfTeX`). */
  producer?: string;
  /** Raw PDF date string, e.g. `D:20260923010212+00'00'`. */
  creationDate?: string;
  modDate?: string;
  /** PDF header version, e.g. `1.7`. */
  pdfVersion?: string;
  /** Document language from the catalog, when declared. */
  language?: string;
  /** True when the file carries an encryption dictionary. */
  isEncrypted: boolean;
}

/** Everything the backend extracts from one PDF. */
export interface PdfDocumentAnalysis {
  /** `numPages` of the document. */
  pageCount: number;
  /** Byte length of the analysed document. */
  fileSize: number;
  /** First page size in PDF points (1/72 inch), unscaled. */
  pageWidth: number;
  pageHeight: number;
  info: PdfDocumentInfo;
  /** Absent when the first page could not be rasterized. */
  cover?: DocumentCover;
}

/** Parses a file into its metadata. */
export interface IDocumentAnalyzer {
  /**
   * Parses `bytes` as a PDF.
   *
   * Rejects only when the document cannot be opened at all; a document that
   * opens but whose first page cannot be rasterized still resolves, with
   * {@link PdfDocumentAnalysis.cover} left undefined.
   */
  analyzePdf(bytes: Uint8Array): Promise<PdfDocumentAnalysis>;
}

/** A blob on its way into the store. */
export interface StoredBlob {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

/** Blob storage abstraction used by the upload flow. */
export interface IFileStore {
  /**
   * Reads a previously uploaded blob back out of the store.
   *
   * `fileUrl` may be absolute or relative; only URLs that point at this store's
   * own file endpoint are accepted, so a caller can never make the server fetch
   * an arbitrary address.
   */
  download(fileUrl: string): Promise<Uint8Array>;

  /**
   * Stores `blob` and resolves to the URL it can be read from afterwards.
   *
   * @throws when the store rejects the write.
   */
  upload(blob: StoredBlob): Promise<string>;
}
