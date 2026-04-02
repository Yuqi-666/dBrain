export const DEFAULT_NODE_STYLE = {
  fill: "#165DFF",
  stroke: "#ffffff",
  lineWidth: 2,
  radius: 8,
  fontSize: 12,
  labelColor: "#333333",
};

export const SELECTED_NODE_STYLE = {
  stroke: "#FF7D00",
  lineWidth: 3,
  shadowColor: "rgba(255, 125, 0, 0.3)",
  shadowBlur: 10,
};

export const HOVER_NODE_STYLE = {
  stroke: "#4080FF",
  lineWidth: 2.5,
  cursor: "pointer",
};

export const DEFAULT_EDGE_STYLE = {
  stroke: "#91caff",
  lineWidth: 2,
  endArrow: {
    path: "M 0,0 L 8,4 L 8,-4 Z",
    fill: "#91caff",
  },
  cursor: "pointer",
};

export const SELECTED_EDGE_STYLE = {
  stroke: "#FF7D00",
  lineWidth: 3,
  endArrow: {
    path: "M 0,0 L 8,4 L 8,-4 Z",
    fill: "#FF7D00",
  },
  shadowColor: "rgba(255, 125, 0, 0.3)",
  shadowBlur: 10,
};

export const HOVER_EDGE_STYLE = {
  stroke: "#4080FF",
  lineWidth: 2.5,
  endArrow: {
    path: "M 0,0 L 8,4 L 8,-4 Z",
    fill: "#4080FF",
  },
};
