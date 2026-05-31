declare module 'd3-force' {
  export interface SimulationNodeDatum {
    id?: string;
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export interface ForceLink<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum> = SimulationLinkDatum<NodeDatum>> {
    (links: LinkDatum[]): this;
    id(): (d: LinkDatum) => string | number;
    id(id: (d: LinkDatum) => string | number): this;
    distance(): (d: LinkDatum) => number;
    distance(distance: number | ((d: LinkDatum) => number)): this;
    strength(): (d: LinkDatum) => number;
    strength(strength: number | ((d: LinkDatum) => number)): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> {
    (): this;
    strength(): (d: NodeDatum) => number;
    strength(strength: number | ((d: NodeDatum) => number)): this;
    theta(): number;
    theta(theta: number): this;
    distanceMin(): number;
    distanceMin(distance: number): this;
    distanceMax(): number;
    distanceMax(distance: number): this;
    sigma(): number;
    sigma(sigma: number): this;
  }

  export interface ForceCenter<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> {
    (): this;
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
  }

  export interface ForceCollide<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> {
    (): this;
    radius(): (d: NodeDatum) => number;
    radius(radius: number | ((d: NodeDatum) => number)): this;
    strength(): number;
    strength(strength: number): this;
    iterations(): number;
    strength(iterations: number): this;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum> = SimulationLinkDatum<NodeDatum>> {
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    node(id: number): NodeDatum | undefined;
    node(id: number, node: NodeDatum): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaMax(): number;
    alphaMax(max: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<NodeDatum>;
    force(name: string, force: Force<NodeDatum> | null): this;
    on(typenames: string): (this: Simulation<NodeDatum, LinkDatum>) => void;
    on(typenames: string, listener: (this: Simulation<NodeDatum, LinkDatum>) => void): this;
  }

  export interface Force<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> {
    (alpha: number): void;
    initialize?(nodes: NodeDatum[], random: () => number): void;
  }

  export function forceLink<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum> = SimulationLinkDatum<NodeDatum>>(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;
  export function forceManyBody(): ForceManyBody;
  export function forceCenter(x: number, y: number): ForceCenter;
  export function forceCollide(): ForceCollide;

  export function forceSimulation<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum> = SimulationLinkDatum<NodeDatum>>(nodes?: NodeDatum[]): Simulation<NodeDatum, LinkDatum>;
}
