"use client";

/**
 * Common shell for all 9 flow-mode node variants.
 *
 * Responsibilities:
 *   - Place `<Handle>` components (target: Left, source: Right by default;
 *     overridable via `handleLayout`).
 *   - Apply the `node-shell` container className (consumed by the host
 *     app's global stylesheet) and ReactFlow's built-in `rf-selected`
 *     class when the node is part of the ReactFlow selection.
 *
 * The shell is a *pure presentation* component — variant components decide
 * how to render the inner content. The data the variant sees is
 * `data.source: NodeData` (the original domain object).
 *
 * Flow mode does not express UI state — there is no `node-state-*` class
 * here. The 7-state `UiState` enum is force-mode private.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RenderableNode } from "../transform";

export type CustomNodeProps = NodeProps<RenderableNode>;
export type CustomNodeComponent = React.ComponentType<CustomNodeProps>;

export interface NodeShellProps extends CustomNodeProps {
  handleLayout?: {
    source?: Position;
    target?: Position;
  };
  children?: React.ReactNode;
}

export const NodeShell = memo(function NodeShell(props: NodeShellProps) {
  const { selected, handleLayout, children } = props;
  const targetPos = handleLayout?.target ?? Position.Left;
  const sourcePos = handleLayout?.source ?? Position.Right;

  return (
    <div
      className={["node-shell", selected ? "rf-selected" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle
        type="target"
        position={targetPos}
        id="default-target"
        className="!h-2 !w-2 !rounded-full !bg-blue-500"
      />
      <Handle
        type="source"
        position={sourcePos}
        id="default-source"
        className="!h-2 !w-2 !rounded-full !bg-blue-500"
      />
      {children}
    </div>
  );
});
