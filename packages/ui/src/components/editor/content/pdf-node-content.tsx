"use client";

import { useState, useEffect } from "react";
import { useNodeEditor } from "@workspace/hooks";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { cn } from "@workspace/ui/lib/utils";
import { FileTextIcon, ExternalLinkIcon } from "lucide-react";
import type { NodeData } from "@workspace/interfaces";

interface PdfNodeContentProps {
  node: NodeData;
  nodeId: string;
  className?: string;
}

/**
 * PdfNodeContent - PDF node editor
 * Layout: Basic info + PDF preview area
 */
export function PdfNodeContent({ node, nodeId, className }: PdfNodeContentProps) {
  const { updateTitle, updateField } = useNodeEditor();

  const [title, setTitle] = useState(node.title || "");
  const [pdfUrl, setPdfUrl] = useState((node as any).content?.url || "");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setTitle(node.title || "");
    setPdfUrl((node as any).content?.url || "");
  }, [node.title, node.content]);

  const handleTitleBlur = () => {
    if (title !== node.title) updateTitle(title);
  };

  const handleUrlBlur = () => {
    const currentUrl = (node as any).content?.url || "";
    if (pdfUrl !== currentUrl) {
      updateField("content" as any, { url: pdfUrl });
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">标题</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="输入标题..."
          className="text-lg font-semibold"
        />
      </div>

      {/* PDF Source */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">PDF 源</Label>
        <Input
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://example.com/document.pdf"
          className="text-sm"
        />
      </div>

      {/* PDF Preview */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">预览</Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>第 {currentPage} 页</span>
          </div>
        </div>

        <div className="border rounded-lg min-h-[400px] flex items-center justify-center bg-muted/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[400px] rounded-lg"
              title={title || "PDF Preview"}
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileTextIcon className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">输入 PDF URL 预览</p>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                >
                  <ExternalLinkIcon className="size-3" />
                  在新窗口打开
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}