"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useCallback, useState } from "react";
import { Code2, Eye, Pencil, UploadIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WebpageContent, WebpageNodeData } from "@workspace/interfaces";
import { NodeService } from "@workspace/services";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import {
  CODE_LANGUAGES,
  CodeEditor,
} from "@workspace/ui/components/code-editor/code-editor";
import { EmptyHint } from "./empty-hint";
import { toast } from "@workspace/ui/components/ui/toast";
import { FileDropZone } from "./file-drop-zone";

/**
 * Types the "导入文件" picker accepts — HTML first, then common code.
 *
 * `text/*` is included so a remote import whose URL has no filename (and whose
 * only signal is the response MIME type) still passes validation.
 */
const SOURCE_ACCEPT = [
  ".html",
  ".htm",
  ".xhtml",
  ".vue",
  ".svelte",
  ".css",
  ".scss",
  ".less",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".xml",
  ".svg",
  ".md",
  ".markdown",
  ".py",
  ".sql",
  ".txt",
  "text/*",
].join(",");

interface WebpageNodeContentProps {
  node: WebpageNodeData;
  className?: string;
}

/** Persists the source. The editor always writes both fields together. */
type WriteContent = (next: WebpageContent, debounce?: boolean | number) => void;

/**
 * Node content editor for `webpage` nodes.
 *
 * A webpage node holds source and nothing else, so this editor has no
 * initialization step: it opens on the source it stores and edits that one
 * field. The toolbar switches between rendering the source as a page and
 * editing it, `language` decides which of the two it is, and 「导入文件」 loads
 * a local file into the very same field. A live address is a `website` node's
 * job and a screenshot is an `image` node's, so neither is offered here.
 */
export function WebpageNodeContent({
  node,
  className,
}: WebpageNodeContentProps) {
  const { t } = useI18n();

  const content = node.content;
  const [importing, setImporting] = useState(false);
  const [view, setView] = useState<"preview" | "edit">(
    content.code.trim() ? "preview" : "edit",
  );

  const write = useCallback<WriteContent>(
    (next, debounce = true) => {
      void NodeService.upsert(node.id, { content: next }, { debounce });
    },
    [node.id],
  );

  const hasSource = content.code.trim().length > 0;
  // The language field is the single source of truth for "is this a page":
  // picking `text` on an HTML file shows its source, picking `HTML` renders it.
  const rendersAsPage = content.language === "html";

  if (importing) {
    return (
      <div className={cn("relative h-full min-h-[380px] p-4", className)}>
        <FileDropZone
          nodeId={node.id}
          accept={SOURCE_ACCEPT}
          variant="webpage-source"
          onUploaded={() => {
            setImporting(false);
            setView("preview");
          }}
          // The zone also shows the reason inline, but the import screen can be
          // replaced as soon as the read finishes, so the host raises the toast
          // for a failure the user must not miss.
          onUploadError={(error) => {
            toast({
              title: t("导入文件失败"),
              description: error.message,
              variant: "destructive",
            });
          }}
          className="h-full w-full"
        />
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 text-xs"
          onClick={() => setImporting(false)}
        >
          {t("取消")}{" "}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-[380px] flex-col gap-2 p-4", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md bg-muted/40 p-0.5">
          <ViewTab
            active={view === "preview"}
            icon={Eye}
            label={t("预览")}
            onClick={() => setView("preview")}
          />
          <ViewTab
            active={view === "edit"}
            icon={Pencil}
            label={t("编辑")}
            onClick={() => setView("edit")}
          />
        </div>

        <Select
          value={content.language}
          onValueChange={(language) =>
            write({ code: content.code, language }, false)
          }
        >
          <SelectTrigger size="sm" className="h-8 w-[130px] text-xs">
            <SelectValue placeholder={t("语言")} />
          </SelectTrigger>
          <SelectContent>
            {CODE_LANGUAGES.map(({ id, label }) => (
              <SelectItem key={id} value={id} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 px-2 text-xs"
          onClick={() => setImporting(true)}
        >
          <UploadIcon className="size-3.5" />
          {t("导入文件")}{" "}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {view === "edit" ? (
          <CodeEditor
            value={content.code}
            language={content.language}
            placeholder={t(
              "在此编写 HTML 或代码，或点上方「导入文件」载入本地文件…",
            )}
            onChange={(code) => write({ code, language: content.language })}
            className="size-full"
          />
        ) : !hasSource ? (
          <EmptyHint
            icon={Code2}
            title={t("还没有源码")}
            description={t(
              "切到「编辑」直接编写，或点「导入文件」载入本地 HTML / 代码文件。",
            )}
          />
        ) : rendersAsPage ? (
          <iframe
            title={node.title || t("HTML 预览")}
            srcDoc={content.code}
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
            className="size-full border-0 bg-white"
          />
        ) : (
          <CodeEditor
            value={content.code}
            language={content.language}
            readOnly
            className="size-full"
          />
        )}
      </div>
    </div>
  );
}

/** Preview / edit switch for the source above it. */
function ViewTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  useI18n();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
