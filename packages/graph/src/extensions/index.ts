import { register, ExtensionCategory } from "@antv/g6";
import { ReactNode } from "@antv/g6-extension-react";
import { CustomCanvasGesture } from "./behaviors";

let extensionsRegistered = false;

export function registerExtensions() {
  if (extensionsRegistered) return;
  extensionsRegistered = true;

  register('behavior', 'custom-canvas-gesture', CustomCanvasGesture);
  register(ExtensionCategory.NODE, "react-node", ReactNode);
}
