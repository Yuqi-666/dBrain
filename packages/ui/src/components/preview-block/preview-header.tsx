"use client";

import * as React from "react";
import { useDataStore } from "@workspace/store";
import type { NodeData } from "@workspace/interfaces";
import {
  FileText,
  Image,
  Video,
  FileType,
  Volume,
  Globe,
  Folder,
  FileEdit,
  Table,
} from "lucide-react";

const nodeTypeIcons = {
  text: FileText,
  image: Image,
  video: Video,
  pdf: FileType,
  audio: Volume,
  webpage: Globe,
  website: Globe,
  collection: Folder,
  "rich-text": FileEdit,
  database: Table,
};

export function PreviewHeader({ node }: { node: NodeData }) {
  const nodeSemantics = useDataStore((state) => state.nodeSemantics);
  const semantic = nodeSemantics.get(node.semanticId);
  const Icon = nodeTypeIcons[node.nodeType] || FileText;

  return (
    <div className="border-b px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate text-sm">{node.title}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {semantic && (
          <>
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: semantic.color
                  ? `${semantic.color}20`
                  : undefined,
                color: semantic.color || undefined,
              }}
            >
              {semantic.name}
            </span>
            <span className="truncate max-w-[150px]">
              {semantic.description}
            </span>
          </>
        )}
      </div>
      {node.abstract && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
          {node.abstract}
        </p>
      )}
    </div>
  );
}
