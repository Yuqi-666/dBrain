import type { BasePluginOptions, LabelPlacement } from "./common";

export interface BubbleSetsOptions extends BasePluginOptions {
  type: "bubble-sets";
  members: string[];
  avoidMembers?: string[];
  label?: boolean;
  labelPlacement?: LabelPlacement;
  labelBackground?: boolean;
  labelPadding?: number | number[];
  labelCloseToPath?: boolean;
  labelAutoRotate?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelMaxWidth?: number;
  labelText?: string;
  maxRoutingIterations?: number;
  maxMarchingIterations?: number;
  pixelGroup?: number;
  edgeR0?: number;
  edgeR1?: number;
  nodeR0?: number;
  nodeR1?: number;
  morphBuffer?: number;
  threshold?: number;
  memberInfluenceFactor?: number;
  edgeInfluenceFactor?: number;
  nonMemberInfluenceFactor?: number;
  virtualEdges?: boolean;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  lineWidth?: number;
}
