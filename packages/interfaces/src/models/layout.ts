
export type LayoutType = "d3-force" | "dagre" | "fishbone" | "mindmap"
export interface LayoutConfig {
  d3: D3LayoutConfig;
  dagre: DagreLayoutConfig;
  fishbone: FishBoneLayoutConfig;
  mindmap: MindMapLayoutConfig;

}
export interface D3LayoutConfig { }
export interface DagreLayoutConfig { }
export interface FishBoneLayoutConfig { }
export interface MindMapLayoutConfig { }
