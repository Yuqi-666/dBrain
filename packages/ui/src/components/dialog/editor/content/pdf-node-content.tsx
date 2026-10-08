"use client";

/**
 * A `pdf` node: the self-drawn viewer, with the browser's own PDF plugin left in
 * place as the degradation path.
 *
 * The `<iframe>` is not dead code — it is what the node showed before this
 * viewer existed, and it is the only thing that still works when pdfjs cannot
 * run at all: an encrypted file, a corrupt one, a worker that failed to start,
 * or a cross-origin fetch the API refused. In all of those cases the iframe can
 * still *show* the document (it cannot annotate or search, which is exactly the
 * trade this viewer exists to buy), so the failure is reported here and the
 * viewer is replaced rather than left on a blank page.
 */
import { useCallback, useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { FileDropZone } from "./file-drop-zone";
import type { PdfNodeData } from "@workspace/interfaces";
import { resolveFileUrl } from "@workspace/api-client";
import { PdfViewer } from "@workspace/ui/components/pdf-viewer/pdf-viewer";
import type { PdfLoadFailure } from "@workspace/ui/components/pdf-viewer/types";

interface PdfNodeContentProps {
  node: PdfNodeData;
  className?: string;
}

export function PdfNodeContent({ node, className }: PdfNodeContentProps) {
  const url = resolveFileUrl(node.content?.url);
  const hasUrl = !!url;
  const [failure, setFailure] = useState<PdfLoadFailure | null>(null);

  /** A new file is a new attempt — the previous fallback must not stick to it. */
  useEffect(() => {
    setFailure(null);
  }, [url]);

  const handleError = useCallback((next: PdfLoadFailure) => {
    setFailure(next);
  }, []);

  if (!hasUrl) {
    return (
      <FileDropZone
        nodeId={node.id}
        accept=".pdf,application/pdf"
        variant="pdf"
        className={cn("w-full h-full min-h-[400px]", className)}
      />
    );
  }

  return (
    <div className={cn("flex p-4 w-full h-full", className)}>
      <div className="flex-1 min-w-0 rounded-lg overflow-hidden bg-muted/30">
        {failure ? (
          <iframe
            key={url}
            src={url}
            className="w-full h-full"
            title={node.title || "PDF文档"}
          />
        ) : (
          <PdfViewer
            key={url}
            url={url}
            title={node.title}
            onError={handleError}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
