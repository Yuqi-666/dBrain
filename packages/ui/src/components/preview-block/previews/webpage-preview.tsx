"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import type { WebpageNodeData } from "@workspace/interfaces";
import { Code2 } from "lucide-react";

/** Longest source snippet the hover preview renders before truncating. */
const MAX_SNIPPET_CHARS = 800;

/**
 * Hover preview for webpage nodes. The node holds source and nothing else, so
 * this stays cheap: HTML is rendered fully sandboxed, and any other language is
 * truncated to a snippet rather than spun up in a full editor.
 */
export function WebpagePreview({ node }: { node: WebpageNodeData }) {
  const { t } = useI18n();

  const content = node.content;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {content.code.trim() ? (
          content.language === "html" ? (
            <iframe
              title={node.title || t("HTML 预览")}
              srcDoc={content.code}
              sandbox=""
              className="size-full border-0 bg-white"
            />
          ) : (
            <pre className="size-full overflow-hidden p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              <code>{content.code.slice(0, MAX_SNIPPET_CHARS)}</code>
            </pre>
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3">
            <Code2 className="size-10 text-muted-foreground" />
            <span className="w-full truncate text-center text-xs text-muted-foreground">
              {t("还没有源码")}{" "}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
