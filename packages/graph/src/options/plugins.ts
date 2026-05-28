import type { PluginOptions } from "@antv/g6";

export interface PluginConfigOptions { }

export function createPluginOptions(
  options?: PluginConfigOptions,
): PluginOptions {
  const PLUGINS: PluginOptions = [
    // {
    //   type: "grid-line",
    //   size: 20,
    //   visible: true,
    // },
    {
      key: "minimap",
      type: "minimap",
      size: [200, 120],
      position: "bottom-left",
      visible: true,
    },
    // {
    //   type: "fisheye",
    //   d: 100,
    //   r: 200,
    // },
  ];
  return PLUGINS;
}
