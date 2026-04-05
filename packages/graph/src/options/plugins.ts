export const GRID_PLUGIN = {
  type: "grid-line",
  size: 20,
  visible: true,
};

export const MINIMAP_PLUGIN = {
  type: "minimap",
  size: [200, 120],
  position: "bottom-right",
  visible: true,
};

export const FISHEYE_PLUGIN = {
  type: "fisheye",
  d: 100,
  r: 200,
};

export function getPluginsConfig(
  enableMinimap = true,
  enableGrid = true,
  enableFisheye = false,
): object[] {
  const plugins: object[] = [];
  if (enableGrid) plugins.push(GRID_PLUGIN);
  if (enableMinimap) plugins.push(MINIMAP_PLUGIN);
  if (enableFisheye) plugins.push(FISHEYE_PLUGIN);
  return plugins;
}
