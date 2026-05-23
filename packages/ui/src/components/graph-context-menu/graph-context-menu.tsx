"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Edit, Trash2, Plus, Link2 } from "lucide-react";
import { useGraphContextMenu } from "./useGraphContextMenu";

export interface GraphContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  target: { type: "node" | "edge" | "canvas"; id?: string } | null;
  onClose: () => void;
}

const GraphContextMenu = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  GraphContextMenuProps
>(
  (
    {
      x,
      y,
      visible,
      target,
      onClose,
    },
    ref,
  ) => {
    if (!visible || !target) return null;
    const isNode = target.type === "node";
    const isEdge = target.type === "edge";
    const isCanvas = target.type === "canvas";

    const { onEditNode, onDeleteNode, onAddNode, onEditEdge, onDeleteEdge, onAddEdge } =
      useGraphContextMenu();

    const getTarget = (): { type: "node" | "edge"; id: string } | null => {
      if (!target.id) return null;
      if (target.type === "canvas") return null;
      return { type: target.type, id: target.id };
    };

    const targetObj = getTarget();

    return (
      <DropdownMenu open={visible} onOpenChange={(open) => !open && onClose()}>
        <DropdownMenuContent
          ref={ref}
          style={{
            position: "absolute",
            left: x,
            top: y,
          }}
          className="w-48 p-1 shadow-lg rounded-lg border bg-popover text-popover-foreground"
          onEscapeKeyDown={onClose}
          onPointerDownOutside={onClose}
        >
          {isNode && targetObj && (
            <>
              <DropdownMenuItem
                onClick={() => { onEditNode?.(targetObj); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <Edit className="size-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              {/* <DropdownMenuItem */}
              {/*   onClick={() => onDuplicate?.(targetObj)} */}
              {/*   className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md" */}
              {/* > */}
              {/*   <Copy className="size-4" /> */}
              {/*   <span>Duplicate</span> */}
              {/* </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem */}
              {/*   onClick={() => onAddChild?.(target.id!)} */}
              {/*   className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md" */}
              {/* > */}
              {/*   <Plus className="size-4" /> */}
              {/*   <span>Add Child</span> */}
              {/* </DropdownMenuItem> */}
              <DropdownMenuItem
                onClick={() => { onAddEdge?.(target.id!); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <Link2 className="size-4" />
                <span>Connect To</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { onDeleteNode?.(targetObj); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}

          {isEdge && targetObj && (
            <>
              <DropdownMenuItem
                onClick={() => { onEditEdge?.(targetObj); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <Edit className="size-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { onDeleteEdge?.(targetObj); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}

          {isCanvas && (
            <>
              <DropdownMenuItem
                onClick={() => { onAddNode(); onClose() }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <Plus className="size-4" />
                <span>Add Node</span>
              </DropdownMenuItem>
              {/* <DropdownMenuItem */}
              {/*   onClick={onPaste} */}
              {/*   className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md" */}
              {/* > */}
              {/*   <ClipboardPaste className="size-4" /> */}
              {/*   <span>Paste</span> */}
              {/* </DropdownMenuItem> */}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

GraphContextMenu.displayName = "GraphContextMenu";

export { GraphContextMenu };
