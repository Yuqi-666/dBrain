import type { FilterConfig } from "@workspace/interfaces";

export interface CreateViewCommand {
  id: string;
  name: string;
  viewType: string;
  visualConfig?: {
    backgroundColor?: string;
    showLabels?: boolean;
    labelField?: string;
  };
  filterConfig?: FilterConfig;
  isPinned?: boolean;
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface UpdateViewCommand {
  id: string;
  name?: string;
  viewType?: string;
  visualConfig?: {
    backgroundColor?: string;
    backgroundStyle?: "solid" | "grid" | "dots" | "none";
    gridSpacing?: number;
    gridColor?: string;
    snapToGrid?: boolean;
    showMinimap?: boolean;
    nodeDensity?: number;
  };
  filterConfig?: {
    selectedNodes?: string[];
    ruleGroup?: any;
    collectionType?: string;
  };
  isPinned?: boolean;
  userId: string;
  sourceId?: string;
  workspaceId?: string;
}

export interface DeleteViewCommand {
  id: string;
  userId: string;
  sourceId?: string;
}
