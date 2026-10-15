import { useI18n } from "@workspace/ui/lib/i18n";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import { uploadAttachment } from "@workspace/api-client";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { IAttachment } from "@workspace/interfaces";
import clsx from "clsx";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent } from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { getFileUrl } from "./excalidraw-utils";
import { ExcalidrawWrapper } from "./excalidraw-wrapper";

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

    const jsonData = {
      elements: excalidrawAPI.getSceneElements(),
      files: excalidrawAPI.getFiles(),
    };

    const jsonString = JSON.stringify(jsonData);
    const fileName = "diagram.excalidraw.json";
    const excalidrawFile = new File([jsonString], fileName, {
      type: "application/json",
    });

    let attachment: IAttachment | null = null;
    try {
      attachment = await uploadAttachment(excalidrawFile);
    } catch (error) {
      console.error("Failed to save Excalidraw diagram:", error);
      return;
    }

    updateAttributes({
      data: jsonString,
      src: attachment.url,
      title: attachment.fileName,
      size: attachment.fileSize,
      attachmentId: attachment.id,
    });

    setOpened(false);
  };

  return (
    <NodeViewWrapper>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent
          showCloseButton={false}
          className="p-0 gap-0 sm:max-w-2xl flex flex-col"
          style={{ height: "90vh", width: "90vw" }}
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

      {src ? (
        <div className="relative">
          <img
            onClick={(e) => e.detail === 2 && handleOpen()}
            src={getFileUrl(src)}
            alt={title}
            width={width}
            className={clsx(
              selected ? "ProseMirror-selectednode" : "",
              "alignCenter max-w-full h-auto rounded-md",
            )}
          />

          {selected && (
            <Button
              onClick={handleOpen}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          onClick={(e) => e.detail === 2 && handleOpen()}
          className={clsx(
            "flex items-center justify-center p-4 rounded-md border border-dashed cursor-pointer",
            "hover:bg-muted/50 transition-colors",
            selected ? "ProseMirror-selectednode" : "",
          )}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Pencil className="size-4" />
            </Button>
            <span className="text-muted-foreground">
              {t("Double-click to edit Excalidraw diagram")}{" "}
            </span>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
