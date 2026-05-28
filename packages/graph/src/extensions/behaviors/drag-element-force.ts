import { invokeLayoutMethod, register } from "@antv/g6";
import type { ID, IElementDragEvent, Point } from "@antv/g6";

import type { DragElementOptions } from "./drag-element";
import { DragElement } from "./drag-element";

function getLayoutProperty(layout: any, name: string) {
  if (name in layout) return layout[name];
  if ("instance" in layout) {
    const instance = layout.instance;
    if (name in instance) return instance[name];
  }
  return null;
}

export interface DragElementForceOptions
  extends Omit<DragElementOptions, "animation" | "dropEffect" | "shadow"> {
  fixed?: boolean;
}

export class DragElementForce extends DragElement {
  private get forceLayoutInstance() {
    return this.context.layout!.getLayoutInstance().find((layout: any) =>
      ["d3-force", "d3-force-3d"].includes(layout?.id)
    );
  }

  protected override validate(event: IElementDragEvent): boolean {
    if (!this.context.layout) return false;

    if (!this.forceLayoutInstance) {
      console.warn(
        "DragElementForce only works with d3-force or d3-force-3d layout"
      );
      return false;
    }

    return super.validate(event);
  }

  protected override async moveElement(ids: ID[], offset: Point) {
    const layout = this.forceLayoutInstance;
    this.context.graph.getNodeData(ids).forEach((element, index) => {
      const { x = 0, y = 0 } = element.style || {};
      const clampedOffset = this.clampByRotation(offset);
      const newX = +x + clampedOffset[0];
      const newY = +y + clampedOffset[1];
      if (layout)
        invokeLayoutMethod(layout, "setFixedPosition", ids[index], [newX, newY]);
    });
  }

  protected override onDragStart(event: IElementDragEvent) {
    if (this.ctrlPressed || this.altPressed) return;
    this.enable = this.validate(event);
    if (!this.enable) return;

    this.target = this.getSelectedNodeIDs([event.target.id]);
    this.hideEdge();
    this.context.graph.frontElement(this.target);

    const layout = this.forceLayoutInstance;
    if (layout) {
      const simulation = getLayoutProperty(layout, "simulation");
      if (simulation) {
        simulation.alphaTarget(0.3).restart();
      }
    }

    this.context.graph.getNodeData(this.target).forEach((element) => {
      const { x = 0, y = 0 } = element.style || {};
      const id = (element as any).id;
      if (layout && id) invokeLayoutMethod(layout, "setFixedPosition", id, [+x, +y]);
    });
  }

  protected override onDrag(event: IElementDragEvent) {
    if (this.ctrlPressed || this.altPressed) return;
    if (!this.enable) return;

    const delta = this.getDelta(event);
    this.moveElement(this.target, delta);
  }

  protected override onDragEnd() {
    const layout = this.forceLayoutInstance;
    if (layout) {
      const simulation = getLayoutProperty(layout, "simulation");
      if (simulation) {
        simulation.alphaTarget(0);
      }
    }

    if (this.options.fixed) return;

    this.context.graph.getNodeData(this.target).forEach((element) => {
      const id = (element as any).id;
      if (layout && id)
        invokeLayoutMethod(layout, "setFixedPosition", id, [null, null, null]);
    });
  }
}

