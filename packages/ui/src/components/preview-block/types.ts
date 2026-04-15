import type { NodeData, NodeDataType } from "@workspace/interfaces";

export interface PreviewBlockProps {
  node: NodeData;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
}

export interface PreviewPosition {
  left: number;
  top: number;
}

export const PREVIEW_WIDTH = 320;
export const PREVIEW_MAX_HEIGHT = 280;
export const PREVIEW_MARGIN = 12;
