"use client";

/**
 * Per-node error boundary. Wraps every variant so that a single
 * failing node cannot crash the whole ReactFlow canvas.
 */

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class NodeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    console.error("[NodeErrorBoundary] caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-500"
            title={this.state.error?.message}
          >
            Node render error
          </div>
        )
      );
    }
    return this.props.children;
  }
}
