export interface CreateViewCommand {
  id: string;
  name: string;
  layout: string;
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
}

export interface DeleteViewCommand {
  id: string;
}