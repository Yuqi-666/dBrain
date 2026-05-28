import { register, ExtensionCategory } from "@antv/g6";
import { ReactNode } from "@antv/g6-extension-react";
import { CustomCanvasGesture, CreateEdge, DragElement, DragElementForce } from "./behaviors";

let extensionsRegistered = false;

export function registerExtensions() {
  if (extensionsRegistered) return;
  extensionsRegistered = true;

  register(ExtensionCategory.BEHAVIOR, "custom-canvas-gesture", CustomCanvasGesture);
  register(ExtensionCategory.BEHAVIOR, "create-edge", CreateEdge);
  register(ExtensionCategory.NODE, "react-node", ReactNode);
  register(ExtensionCategory.BEHAVIOR, "custom-drag-element-force", DragElementForce);
  register(ExtensionCategory.BEHAVIOR, "custom-drag-element", DragElement);
}
