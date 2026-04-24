import { register, ExtensionCategory } from "@antv/g6";
import { ReactNode } from "@antv/g6-extension-react";

let extensionsRegistered = false;

export function registerExtensions() {
  if (extensionsRegistered) return;
  extensionsRegistered = true;

  register(ExtensionCategory.NODE, "react-node", ReactNode);
}
