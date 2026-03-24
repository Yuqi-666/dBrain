import type { BaseLayout } from "./type";

// Link force configuration
export interface D3ForceLinkForce {
  id?: (edge: unknown, index: number, edges: unknown[]) => string;
  distance?:
    | number
    | ((edge: unknown, index: number, edges: unknown[]) => number);
  strength?:
    | number
    | ((edge: unknown, index: number, edges: unknown[]) => number);
  iterations?: number;
}

// Many-body force configuration (magnetic-like effect)
export interface D3ForceManyBodyForce {
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  theta?: number;
  distanceMin?: number;
  distanceMax?: number;
}

// Center force configuration
export interface D3ForceCenterForce {
  x?: number;
  y?: number;
  strength?: number;
}

// Collision force configuration
export interface D3ForceCollideForce {
  radius?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  strength?: number;
  iterations?: number;
}

// Radial force configuration
export interface D3ForceRadialForce {
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  radius?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  x?: number;
  y?: number;
}

// X-axis force configuration
export interface D3ForceXForce {
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  x?: number | ((node: unknown, index: number, nodes: unknown[]) => number);
}

// Y-axis force configuration
export interface D3ForceYForce {
  strength?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);
  y?: number | ((node: unknown, index: number, nodes: unknown[]) => number);
}

// D3-Force layout configuration
export interface D3ForceLayoutConfig extends Omit<BaseLayout, "nodeSize"> {
  layoutType: "d3-force";

  nodeSize?:
    | number
    | ((node: unknown, index: number, nodes: unknown[]) => number);

  alpha?: number;
  alphaMin?: number;
  alphaDecay?: number;
  alphaTarget?: number;
  velocityDecay?: number;

  link?: D3ForceLinkForce;
  manyBody?: D3ForceManyBodyForce;
  center?: D3ForceCenterForce;
  collide?: D3ForceCollideForce;
  radial?: D3ForceRadialForce;
  x?: D3ForceXForce;
  y?: D3ForceYForce;

  iterations?: number;
  forceSimulation?: unknown;
  randomSource?: () => number;
}
