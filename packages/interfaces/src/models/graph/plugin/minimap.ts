import type { BasePluginOptions, CardinalPlacement } from "./common";

export interface MinimapOptions extends BasePluginOptions {
  type: "minimap";
  className?: string;
  container?: HTMLElement | string;
  containerStyle?: Record<string, unknown>;
  delay?: number;
  filter?: (id: string, elementType: "node" | "edge" | "combo") => boolean;
  maskStyle?: Record<string, unknown>;
  padding?: number | number[];
  position?: [number, number] | CardinalPlacement;
  renderer?: unknown;
  shape?:
    | "key"
    | ((
        id: string,
        elementType: "node" | "edge" | "combo",
        element: unknown,
      ) => unknown);
  size?: [number, number];
}
