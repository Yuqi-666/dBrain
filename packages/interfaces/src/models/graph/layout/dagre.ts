import type {
  BaseLayout,
  LayoutDirection,
  DagreRanker,
  DagreAlign,
} from "./type";

export interface DagreLayoutConfig extends BaseLayout {
  layoutType: "dagre";

  rankdir?: LayoutDirection;
  align?: DagreAlign;
  nodesep?: number;
  ranksep?: number;
  ranker?: DagreRanker;
  controlPoints?: boolean;
}
