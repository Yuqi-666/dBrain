import { useI18n } from "@workspace/ui/lib/i18n";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import { uploadAttachment } from "@workspace/api-client";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import clsx from "clsx";
import { Dialog, DialogContent } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { getFileUrl, loadExcalidrawData } from "./excalidraw-utils";
import { ExcalidrawWrapper } from "./excalidraw-wrapper";

/**
 * Nodes saved before the preview existed point `src` at the scene JSON
 * (`diagram.excalidraw.json`). An `<img>` can never render that, so such a node
 * is treated as "no preview": the placeholder shows and the scene is recovered
 * from the JSON on open instead of a broken image.
 */
function isLegacyJsonSource(src: string | null | undefined): boolean {
  return typeof src === "string" && src.toLowerCase().endsWith(".json");
}

export default function ExcalidrawView(props: NodeViewProps) {
  const { t } = useI18n();

  const { node, updateAttributes, editor, selected } = props;
  const { src, title, width, data } = node.attrs;

  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [excalidrawData, setExcalidrawData] =
    useState<ExcalidrawInitialDataState | null>(null);
  const [opened, setOpened] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpen = async () => {
    if (!editor.isEditable) {
      return;
    }

    try {
      if (data) {
        const jsonData = JSON.parse(data);
        const elements = jsonData.elements || [];
        const files = jsonData.files || {};

        setExcalidrawData({ elements, files });
      } else if (isLegacyJsonSource(src)) {
        // A node written before the raster preview existed kept its scene in a
        // JSON attachment and no `data`; recover it so the block stays editable
        // instead of rendering a broken image.
        setExcalidrawData(await loadExcalidrawData(src));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOpened(true);
    }
  };

  const handleClose = () => {
    setOpened(false);
  };

  const handleSave = async () => {
    if (!excalidrawAPI) {
      return;
    }

    // The scene JSON stays in `data`: it is the editable source of truth, so
    // the block survives even when the preview upload below fails.
    const jsonString = JSON.stringify({
      elements: excalidrawAPI.getSceneElements(),
      files: excalidrawAPI.getFiles(),
    });

    try {
      // The node view renders an <img>, so `src` must point at a raster image.
      // Render one from the live scene (a JSON file can never be displayed)
      // and upload that as the preview.
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
      });
      const previewFile = new File([blob], "diagram.png", {
        type: "image/png",
      });
      const attachment = await uploadAttachment(previewFile);

      updateAttributes({
        data: jsonString,
        src: attachment.url,
        title: attachment.fileName,
        size: attachment.fileSize,
        attachmentId: attachment.id,
      });
    } catch (error) {
      console.error("Failed to save Excalidraw preview:", error);
      // Keep the scene editable and leave any existing preview untouched.
      updateAttributes({ data: jsonString });
    }

    setOpened(false);
  };

  // A legacy JSON `src` is not an image: fall back to the placeholder, while
  // `handleOpen` still recovers the scene from it.
  const previewSrc = src && !isLegacyJsonSource(src) ? getFileUrl(src) : "";
  // The stored `width` is the layout string "100%"; only a real pixel number
  // belongs in the img width attribute (a bad value draws a thin strip).
  const numericWidth = Number(width);
  const imgWidth =
    Number.isFinite(numericWidth) && numericWidth > 0
      ? numericWidth
      : undefined;

  return (
    <NodeViewWrapper>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent
          showCloseButton={false}
          className={clsx(
            // The same shell as the node editor dialog: one window size for
            // every "open a node" surface, so a diagram does not open a second,
            // differently proportioned dialog.
            "p-0 gap-0 sm:max-w-[80%] w-[1200px] h-[80vh] flex flex-col",
            "rounded-2xl bg-popover",
            "ring-1 ring-foreground/5 shadow-2xl shadow-foreground/5",
          )}
        >
          <div className="flex items-center justify-end gap-2 p-2 shrink-0">
            <Button onClick={handleSave} size="sm">
              {t("Save & Exit")}{" "}
            </Button>
            <Button onClick={handleClose} variant="destructive" size="sm">
              {t("Exit")}{" "}
            </Button>
          </div>
          <div className="flex-1 min-h-0 p-1 pt-0">
            {isMounted && (
              <ExcalidrawWrapper
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={{
                  elements: excalidrawData?.elements || [],
                  files: excalidrawData?.files || {},
                  scrollToContent: true,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/*
        One gesture for both states — double-click opens the editor on the image
        and on the placeholder alike, so the little pencil button is gone. The
        image gets the placeholder's affordance in exchange: a hairline that
        appears on hover, and a ring while the block is selected.
      */}
      {previewSrc ? (
        <div
          onDoubleClick={handleOpen}
          className={clsx(
            "relative w-fit max-w-full cursor-pointer rounded-md ring-1 ring-transparent transition-colors",
            "hover:ring-border",
            selected ? "ProseMirror-selectednode ring-2 ring-primary" : "",
          )}
        >
          <img
            src={previewSrc}
            alt={title}
            width={imgWidth}
            className="alignCenter block max-w-full h-auto rounded-md"
          />
        </div>
      ) : (
        <div
          onDoubleClick={handleOpen}
          className={clsx(
            "flex items-center justify-center p-4 rounded-md border border-dashed cursor-pointer",
            "hover:bg-muted/50 hover:border-muted-foreground/60 transition-colors",
            selected
              ? "ProseMirror-selectednode border-primary ring-2 ring-primary/30"
              : "",
          )}
        >
          <span className="text-muted-foreground">
            {t("Double-click to edit Excalidraw diagram")}{" "}
          </span>
        </div>
      )}
    </NodeViewWrapper>
  );
}
