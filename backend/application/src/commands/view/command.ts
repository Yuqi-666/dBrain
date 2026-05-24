import type { FilterConfig } from "@workspace/interfaces";

export interface CreateViewCommand {
  id: string;
  name: string;
  layout: string;
  visualConfig?: {
    backgroundColor?: string;
    showLabels?: boolean;
    labelField?: string;
  };
  filterConfig?: FilterConfig;
  isPinned?: boolean;
  userId: string;
  sourceId?: string;
}

export interface UpdateViewCommand {
  id: string;
  name?: string;
  layout?: string;
  visualConfig?: {
    backgroundColor?: string;
    showLabels?: boolean;
    labelField?: string;
  };
  filterConfig?: {
    selectedNodes?: string[];
    ruleGroup?: any;
    collectionType?: string;
  };
  isPinned?: boolean;
  userId: string;
  sourceId?: string;
}

export interface DeleteViewCommand {
  id: string;
  userId: string;
  sourceId?: string;
}
