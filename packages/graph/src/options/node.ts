import type { NodeOptions, NodeData } from "@antv/g6";
import { getThemeConfig } from "./theme";
import type { LayoutType, NodeSemantic, NodeSemanticId } from "@workspace/interfaces";
import type { NodeStyle } from "@antv/g6/lib/spec/element/node";

export function getNodeConfig(nodeSemantics: Map<NodeSemanticId, NodeSemantic>, layoutType?: LayoutType): NodeOptions {
  if (layoutType == 'D3force' || 'radio') {
    return {
      type: "circle",
      style: (data: NodeData): NodeStyle => {
        const theme = getThemeConfig();
        let nodeSemantic = nodeSemantics.get(data.semanticId!);
        return {
          fill: nodeSemantic?.color || theme.nodeColor,
          stroke: nodeSemantic?.color || theme.nodeColor,
          lineWidth: 2,
          radius: 8,
          // size: [120, 40],
          // lable
          labelText: data.title,
          labelFill: theme.labelColor,
          labelFontSize: 14,
          labelMaxWidth: 100,
          //icon
          iconSrc: nodeSemantic?.icon,
          //badge
          // badges: [{
          //   text: data.tag,
          //   placement: 'right-bottom',
          //   background: true,
          //   backgroundFill: "#ffffff",
          //   fill: "#000000",
          // }]
        };
      },
      state: {
        selected: {
          stroke: "#FF7D00",
          lineWidth: 3,
          shadowColor: "rgba(255, 125, 0, 0.3)",
          shadowBlur: 10,
        },
        hover: {
          stroke: "#4080FF",
          lineWidth: 2.5,
          shadowColor: "rgba(22, 93, 255, 0.2)",
          shadowBlur: 5,
        },
        disabled: {
          fill: "#e5e7eb",
          stroke: "#d1d5db",
          labelFill: "#9ca3af",
        },
      },
      animation: false,
    };
  } else {
    return {
      type: "react-node",
      style: {
        component: (data: NodeData) => {
          switch (data.nodeType) {
            //后续根据节点数据类型引入自定义节点react组件
            case 'text':
              break;
            case 'image':
              break;
            case 'pdf':
              break;
            case 'video':
              break;
            case 'audio':
              break;
            case 'webpage':
              break;
            case 'website':
              break;
            case 'collection':
              break;
            case 'rich-text':
              break;
          }
        }
      }
    }
  }
}
