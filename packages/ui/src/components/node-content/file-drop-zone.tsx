"use client";
import { translate } from "@workspace/ui/lib/i18n/runtime";
import { useI18n } from "@workspace/ui/lib/i18n";

import { useState } from "react";
import {
  MusicIcon,
  VideoIcon,
  ImageIcon,
  FileTextIcon,
  FileCode2Icon,
  ImagePlusIcon,
  SmileIcon,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { UploadMenu } from "@workspace/ui/components/menu/upload-menu";
import { Progress } from "@workspace/ui/components/ui/progress";
import { toast } from "@workspace/ui/components/ui/toast";
import {
  MAX_UPLOAD_BYTES,
  PDF_ANALYZE_MAX_BYTES,
  matchesAccept,
  useFileUpload,
  uploadFile,
  analyzePdf,
  transcodeVideo,
} from "@workspace/api-client";
import { languageFromFilename } from "@workspace/ui/components/code-editor/code-editor";
import { NodeService } from "@workspace/services";
import { useDataStore } from "@workspace/store";
import type {
  AudioContent,
  ImageContent,
  NodeData,
  PdfContent,
  VideoContent,
} from "@workspace/interfaces";
import { useNodeContentWriter } from "./use-node-content-writer";

/** Variants that store an uploaded blob. */
type UploadVariant = "audio" | "video" | "image" | "pdf";
/**
 * `webpage-source` is the odd one out: a source file is read locally into the
 * node's `code` field instead of being uploaded as a blob, because what the
 * editor needs is its text, not its address.
 */
type Variant = UploadVariant | "webpage-source" | DisplayVariant;

/**
 * Display-field variants (R4): the uploaded blob becomes the node's **top-level**
 * `icon` / `cover` (`{ icon: { kind: "image", value } }` /
 * `{ cover: { kind: "image", url } }`) rather than its `content`. Routing them
 * through the `image` branch would replace the node's content with the new
 * picture — the one way this component can corrupt data (sel §6.1).
 *
 * Shapes frozen by the main agent (`docs/plan/node-content-ui.md` §0-2);
 * **W1-B owns the branches** in `buildNodeUpdates`.
 */
type DisplayVariant = "icon" | "cover";

/**
 * Variants whose metadata is read in the browser. PDFs and videos are excluded:
 * both are measured by the backend, which is the only side that can parse a PDF
 * or decode a codec the browser cannot play.
 */
type LocalVariant = Exclude<UploadVariant, "pdf" | "video">;

interface FileDropZoneProps {
  nodeId: string;
  accept: string;
  variant: Variant;
  onUploadStart?: () => void;
  /** Fired after a successful upload / source read, so hosts can react. */
  onUploaded?: () => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

/** Row shape of {@link VARIANT_CONFIG}. */
interface VariantConfig {
  icon: LucideIcon;
  label: string;
  minHeight: string;
}

const VARIANT_CONFIG = {
  audio: {
    icon: MusicIcon,
    get label() {
      return translate("音频");
    },
    minHeight: "min-h-[100px]",
  },
  video: {
    icon: VideoIcon,
    get label() {
      return translate("视频");
    },
    minHeight: "min-h-[100px]",
  },
  image: {
    icon: ImageIcon,
    get label() {
      return translate("图片");
    },
    minHeight: "min-h-[100px]",
  },
  pdf: {
    icon: FileTextIcon,
    label: "PDF",
    minHeight: "min-h-[400px]",
  },
  "webpage-source": {
    icon: FileCode2Icon,
    get label() {
      return translate("HTML / 代码文件");
    },
    minHeight: "min-h-[300px]",
  },
  icon: {
    icon: SmileIcon,
    get label() {
      return translate("图标");
    },
    minHeight: "min-h-[100px]",
  },
  cover: {
    icon: ImagePlusIcon,
    get label() {
      return translate("封面");
    },
    minHeight: "min-h-[160px]",
  },
} as const satisfies Record<Variant, VariantConfig>;

/** Ceiling for locally read source files — past this the tab starts to stall. */
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/** Metadata read off the picked file. */
interface FilePreview {
  duration?: number;
  width?: number;
  height?: number;
}

/** Creates an object URL for `file`, runs `consume`, and always revokes it again. */
async function withObjectUrl<T>(
  file: File,
  consume: (url: string) => Promise<T>,
): Promise<T> {
  const url = URL.createObjectURL(file);
  try {
    return await consume(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readImageSize(file: File): Promise<FilePreview> {
  return withObjectUrl(
    file,
    (url) =>
      new Promise<FilePreview>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      }),
  );
}

function readAudioDuration(file: File): Promise<FilePreview> {
  return withObjectUrl(
    file,
    (url) =>
      new Promise<FilePreview>((resolve, reject) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.src = url;
        audio.onloadedmetadata = () =>
          resolve({
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          });
        audio.onerror = () => reject(new Error("Audio load failed"));
      }),
  );
}

/**
 * Best-effort metadata extraction. Never rejects: a missing preview only means
 * the node falls back to its placeholder rendering.
 *
 * Video is absent on purpose. Its cover used to be grabbed here from a canvas,
 * which only works for a codec the browser can decode — precisely what an upload
 * cannot be relied on to be. The backend now measures the video and renders its
 * cover while packaging it (`FileCommandService.transcodeVideo`).
 */
async function generatePreview(
  file: File,
  variant: LocalVariant,
): Promise<FilePreview> {
  try {
    switch (variant) {
      case "audio":
        return await readAudioDuration(file);
      case "image":
        return await readImageSize(file);
    }
  } catch (error) {
    console.warn(
      `[FileDropZone] preview generation failed (${variant})`,
      error,
    );
    return {};
  }
}

/**
 * One upload's contribution to its node: the **half** of `content` the variant
 * owns, plus the top-level fields written beside it.
 *
 * `content` here is the client's DTO object (`NodeData.content`), never the
 * PocketBase `nodes.content` column: the same column holds a `docs` object for
 * a text node but a bare url **string** for image / pdf / video / audio
 * (`backend/infrastructure/src/database/mappers/node.mapper.ts`), so a
 * column-shaped patch would stuff an object into a string column
 * (`docs/plan/node-content-ui.md` §M2.2-6).
 */
interface ContentPatch<C extends object> {
  contentHalf: Partial<C>;
  meta: Partial<NodeData>;
}

/** Base for the shared writer when the store has no live node to read. */
const NO_LIVE_CONTENT: Record<string, unknown> = {};

/**
 * Merges one upload's content half onto the node's **live** content and writes
 * it together with its sibling top-level fields.
 *
 * `NodeService.upsert` merges top-level keys only — `content` is replaced
 * wholesale — so the base must be read back from the store at write time
 * instead of taken from this render: a snapshot captured before another
 * writer's patch would silently drop the half that writer owns (PDF / image
 * `annotations`, a video's `timestamps`; plan §M2.2-6).
 */
async function writeContentPatch<C extends object>(
  nodeId: string,
  live: Record<string, unknown>,
  { contentHalf, meta }: ContentPatch<C>,
): Promise<void> {
  await NodeService.upsert(nodeId, {
    ...meta,
    content: { ...live, ...contentHalf },
  } as unknown as Partial<NodeData>);
}

/** Maps the stored file onto the node fields the matching node type expects. */
function buildNodeUpdates(
  variant: LocalVariant,
  url: string,
  file: File,
  preview: FilePreview,
): ContentPatch<ImageContent | AudioContent> {
  switch (variant) {
    case "image":
      return {
        contentHalf: { url },
        meta: {
          fileSize: file.size,
          width: preview.width ?? 0,
          height: preview.height ?? 0,
        },
      };
    case "audio":
      return {
        contentHalf: { url },
        meta: { fileSize: file.size, duration: preview.duration ?? 0 },
      };
  }
}

/**
 * Tells the user the upload and the node write both succeeded.
 *
 * Reached from the upload promise's closure, so it also runs when the dialog
 * that started the upload has already closed.
 */
function showUploadSuccessToast(file: File): void {
  toast({
    title: translate("上传成功"),
    description: file.name,
  });
}

/**
 * Parses a freshly uploaded PDF on the backend and returns the content half the
 * node should end up with.
 *
 * Best-effort on purpose: the blob is already stored, so a document the backend
 * cannot parse (password protected, corrupt) must still leave the node pointing
 * at its file — it just keeps `pageCount: 0` and no cover, which is what the
 * node renders before any metadata arrives.
 *
 * A document past the analysis cap is skipped without asking: the server would
 * have to stream the whole file to disk only to refuse it, and the node is
 * perfectly usable with the blob alone.
 */
async function analyzePdfUpload(
  url: string,
  file: File,
): Promise<ContentPatch<PdfContent>> {
  let coverUrl = "";
  let pageCount = 0;
  let fileSize = file.size;

  if (file.size > PDF_ANALYZE_MAX_BYTES) {
    console.warn(
      "[FileDropZone] PDF is larger than the analysis cap; keeping the file without parsing it",
      file.size,
    );
  } else {
    try {
      const analysis = await analyzePdf(url);
      coverUrl = analysis.coverUrl;
      pageCount = analysis.pageCount;
      fileSize = analysis.fileSize;
    } catch (error) {
      console.warn("[FileDropZone] PDF analysis failed", error);
    }
  }

  return {
    contentHalf: { url, coverUrl },
    meta: { fileSize, pageCount },
  };
}

/**
 * Packages a freshly uploaded video as HLS and returns the content half the node
 * should end up with.
 *
 * A transcode that fails must not lose the upload: the node then simply keeps
 * the original blob as its only representation — what every upload did before
 * the backend packaged videos — and the player reports the codec it cannot
 * decode instead of pretending to play it.
 */
async function packageVideoUpload(
  url: string,
  file: File,
): Promise<ContentPatch<VideoContent>> {
  try {
    const transcoded = await transcodeVideo(url);

    return {
      contentHalf: {
        url,
        coverUrl: transcoded.coverUrl,
        hlsUrl: transcoded.hlsUrl,
      },
      meta: {
        fileSize: file.size,
        duration: transcoded.duration,
        source: "local",
      },
    };
  } catch (error) {
    console.warn(
      "[FileDropZone] HLS packaging failed, keeping the original upload",
      error,
    );

    return {
      contentHalf: { url, coverUrl: "", hlsUrl: "" },
      meta: { fileSize: file.size, duration: 0, source: "local" },
    };
  }
}

/**
 * Picks a file and uploads it to PocketBase. Used by every media variant, all
 * of which store the blob they uploaded.
 */
function UploadDropZone({
  nodeId,
  accept,
  variant,
  onUploadStart,
  onUploaded,
  onUploadError,
  className,
}: FileDropZoneProps & { variant: UploadVariant }) {
  const { t } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  /** Set while the backend is packaging an uploaded video as HLS. */
  const [packaging, setPackaging] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  /**
   * The node's freshest `content`, read when a write is built. The write itself
   * stays an awaited `NodeService.upsert` (not the writer's `patchContent`)
   * because every media path below reports `onUploaded` / drops its `packaging`
   * note only once the node is really written, and because a failed write has
   * to reach `onUploadError`.
   */
  const { liveContent } = useNodeContentWriter<Record<string, unknown>>(
    nodeId,
    variant,
    NO_LIVE_CONTENT,
  );

  const { fileItems, uploadFiles, removeFileItem } = useFileUpload({
    // The pipeline's own ceiling, not a UI preference: above it the server
    // rejects the file, and below it the client would refuse a file the
    // resumable path could have delivered.
    maxSize: MAX_UPLOAD_BYTES,
    limit: 1,
    accept: accept,
    // Outlives this dialog: the key lets a reopened zone subscribe to the
    // upload that started before it unmounted.
    key: `${nodeId}:${variant}`,
    upload: uploadFile,
    // `file` comes straight from the uploader — reading `fileItems[0]` here
    // would see the pre-upload state and silently skip post-processing.
    onSuccess: async (url: string, file: File) => {
      try {
        if (variant === "pdf") {
          // Parsing happens on the server: it takes a PDF parser and a
          // rasterizer, neither of which belongs in the client bundle. The
          // blob is already stored, so only its address is sent over.
          const patch = await analyzePdfUpload(url, file);
          await writeContentPatch(nodeId, liveContent(), patch);
          onUploaded?.();
          showUploadSuccessToast(file);
          return;
        }

        if (variant === "video") {
          // Packaging happens on the server as well, and for a stronger reason
          // than for a PDF: the codec the file arrived in may be one this
          // browser cannot decode at all. The node only learns it can play the
          // video once the playlist is back, so the drop zone stays up with a
          // "packaging" note until then.
          setPackaging(true);
          try {
            const patch = await packageVideoUpload(url, file);
            await writeContentPatch(nodeId, liveContent(), patch);
          } finally {
            setPackaging(false);
          }
          onUploaded?.();
          showUploadSuccessToast(file);
          return;
        }

        const preview = await generatePreview(file, variant);

        const patch = buildNodeUpdates(variant, url, file, preview);
        await writeContentPatch(nodeId, liveContent(), patch);
        onUploaded?.();
        showUploadSuccessToast(file);
      } catch (error) {
        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      }
    },
    onError: (error) => {
      onUploadError?.(error);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleFilesSelected = (files: File[]) => {
    onUploadStart?.();
    uploadFiles(files);
  };

  if (fileItems.length === 0) {
    return (
      <>
        <div
          onClick={handleClick}
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            config.minHeight,
            className,
          )}
        >
          <Icon className="size-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t("点击添加")}
            {config.label}
          </span>
        </div>

        <UploadMenu
          position={menuPosition}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          accept={accept}
          allowPasteImage={variant === "image"}
          onFilesSelected={handleFilesSelected}
          onError={onUploadError}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      {fileItems.map((item) => (
        <div key={item.id} className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm truncate">{item.file.name}</span>
            <button
              onClick={() => removeFileItem(item.id)}
              disabled={item.status === "success"}
              className="p-1 hover:bg-muted rounded-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <X className="size-4" />
            </button>
          </div>
          <Progress value={packaging ? 100 : item.progress} />
          <span
            className="text-xs text-muted-foreground break-words"
            title={item.status === "error" ? item.error : undefined}
          >
            {item.status === "error"
              ? translate("上传失败：{value1}", {
                  value1: item.error ?? t("未知原因"),
                })
              : packaging
                ? t("正在转码为 HLS…")
                : `${item.progress}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Imports a source file by reading its text into the node's `code` field.
 *
 * There is no blob to store — the source *is* the content — so this skips the
 * uploader entirely and only reuses the picker UI (and the URL entry, which
 * still downloads the remote file once).
 */
function LocalTextDropZone({
  nodeId,
  accept,
  onUploaded,
  onUploadError,
  className,
}: FileDropZoneProps) {
  const { t } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = VARIANT_CONFIG["webpage-source"];
  const Icon = config.icon;

  /**
   * Reports a rejected or failed import to the host **and** inline.
   *
   * The zone is the last screen the user sees when an import does not produce a
   * node, so the message cannot depend on a host opting into `onUploadError`:
   * without the inline line every rejection looked like a click that did
   * nothing (a source file can be filtered, too large, empty, or the write can
   * fail).
   */
  const reportImportError = (message: string) => {
    setError(message);
    onUploadError?.(new Error(message));
  };

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);

    if (!matchesAccept(file, accept)) {
      reportImportError(
        translate("不支持的文件类型：{value1}（期望 {value2}）", {
          value1: file.name,
          value2: accept,
        }),
      );
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reportImportError(
        translate("源码文件超过 {value1}MB，无法载入编辑器", {
          value1: MAX_SOURCE_BYTES / 1024 / 1024,
        }),
      );
      return;
    }

    setReading(file.name);
    try {
      const code = await file.text();
      if (!code.trim()) throw new Error(t("文件内容为空"));

      await NodeService.upsert(nodeId, {
        content: {
          code,
          language: languageFromFilename(file.name),
        },
      });
      setError(null);
      onUploaded?.();
    } catch (cause) {
      reportImportError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("读取文件失败"),
      );
    } finally {
      setReading(null);
    }
  };

  if (reading) {
    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-lg",
          config.minHeight,
          className,
        )}
      >
        <Icon className="size-10 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("正在读取")} {reading}…
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setMenuOpen(true);
        }}
        className={cn(
          "w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
          config.minHeight,
          className,
        )}
      >
        <Icon className="size-12 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("点击导入")}
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground/70">
          {t("上传 .html 或代码文件，内容会载入源码编辑器")}{" "}
        </span>
        {error && (
          <span
            role="alert"
            className="max-w-[80%] text-center text-xs text-destructive"
          >
            {error}
          </span>
        )}
      </div>

      <UploadMenu
        position={menuPosition}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        accept={accept}
        urlDialogTitle={t("输入源码文件 URL")}
        urlDialogPlaceholder="https://example.com/index.html"
        onFilesSelected={handleFilesSelected}
        onError={onUploadError}
      />
    </>
  );
}

export function FileDropZone(props: FileDropZoneProps) {
  useI18n();

  if (props.variant === "webpage-source") {
    return <LocalTextDropZone {...props} />;
  }

  if (props.variant === "icon" || props.variant === "cover") {
    return <DisplayFieldDropZone {...props} variant={props.variant} />;
  }

  return <UploadDropZone {...props} variant={props.variant} />;
}

/**
 * The `icon` / `cover` variants of {@link FileDropZone}.
 *
 * Signature frozen by the main agent (`docs/plan/node-content-ui.md` §0-2) so
 * `SelectorUploadPane` can pass `variant="cover"`; **W1-B owns the body**: upload as
 * usual, then write only the top-level field —
 * `cover → { cover: { kind: "image", url } }`, `icon → { icon: { kind: "image", value: url } }`
 * — never `content`, and never `width` / `height` / `fileSize`.
 *
 * A branch of its own rather than a widening of {@link UploadDropZone} (plan
 * §M2.2-7): that component's `LocalVariant` constrains `buildNodeUpdates` to
 * the variants whose upload *is* the node's content, and reusing it would write
 * the picture into `content.url` — the one way this component can corrupt data
 * (sel §6.1).
 */
function DisplayFieldDropZone({
  nodeId,
  accept = "image/*",
  variant,
  onUploadStart,
  onUploaded,
  onUploadError,
  className,
}: FileDropZoneProps & { variant: DisplayVariant }) {
  const { t } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const { fileItems, uploadFiles, removeFileItem } = useFileUpload({
    maxSize: MAX_UPLOAD_BYTES,
    limit: 1,
    accept: accept,
    // Keyed by the display field too: one node can mount the icon and the
    // cover zone at the same time.
    key: `${nodeId}:${variant}`,
    upload: uploadFile,
    onSuccess: async (url: string, file: File) => {
      try {
        // Only the top-level display field is written; `content` is not touched
        // at all (sel §6.1). Nothing is cleared before the upload, so a failed
        // write leaves whatever icon / cover the node already had.
        //
        // The icon half merges over the **live** value: sel §7 names 「换图但保留
        // 底色」 as one of the two partial updates that must not lose a field, so
        // the stored `color` survives an upload. `cover` needs no merge — its
        // `{kind:"image"}` variant carries no field beyond `url`, and spreading a
        // `{kind:"node"}` cover into it would produce an invalid union member.
        const liveIcon = useDataStore.getState().getNode(nodeId)?.icon;
        const updates: Partial<NodeData> =
          variant === "cover"
            ? { cover: { kind: "image", url } }
            : { icon: { ...liveIcon, kind: "image", value: url } };

        await NodeService.upsert(nodeId, updates);
        onUploaded?.();
        showUploadSuccessToast(file);
      } catch (error) {
        onUploadError?.(
          error instanceof Error ? error : new Error("Upload failed"),
        );
      }
    },
    onError: (error) => {
      onUploadError?.(error);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleFilesSelected = (files: File[]) => {
    onUploadStart?.();
    uploadFiles(files);
  };

  if (fileItems.length === 0) {
    return (
      <>
        <div
          onClick={handleClick}
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
            config.minHeight,
            className,
          )}
        >
          <Icon className="size-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t("点击添加")}
            {config.label}
          </span>
        </div>

        <UploadMenu
          position={menuPosition}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          accept={accept}
          // The zone only ever takes a picture, so a pasted image is a valid
          // source for both variants (same reason `variant="image"` allows it).
          allowPasteImage
          onFilesSelected={handleFilesSelected}
          onError={onUploadError}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      {fileItems.map((item) => (
        <div key={item.id} className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm truncate">{item.file.name}</span>
            <button
              onClick={() => removeFileItem(item.id)}
              disabled={item.status === "success"}
              className="p-1 hover:bg-muted rounded-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <X className="size-4" />
            </button>
          </div>
          <Progress value={item.progress} />
          <span
            className="text-xs text-muted-foreground break-words"
            title={item.status === "error" ? item.error : undefined}
          >
            {item.status === "error"
              ? translate("上传失败：{value1}", {
                  value1: item.error ?? t("未知原因"),
                })
              : `${item.progress}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
