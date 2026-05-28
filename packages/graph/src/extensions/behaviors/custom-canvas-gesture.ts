import { CommonEvent } from "@antv/g6";
import { register, BaseBehavior } from "@antv/g6";
import type {
  RuntimeContext,
  IPointerEvent,
  Point,
  IDragEvent,
} from "@antv/g6";
import type { BaseBehaviorOptions } from "@antv/g6";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface CustomCanvasGestureOptions extends BaseBehaviorOptions {
  enable?: boolean | ((event: IDragEvent) => boolean);
  minScale?: number;
  maxScale?: number;
  sensitivity?: number;
}

export class CustomCanvasGesture extends BaseBehavior<CustomCanvasGestureOptions> {
  static defaultOptions: Partial<CustomCanvasGestureOptions> = {
    enable: (event: IDragEvent) => {
      if ("targetType" in event) return event.targetType === "canvas";
      return true;
    },
    minScale: 0.1,
    maxScale: 10,
    sensitivity: 1,
  };

  private isDragging = false;
  private ctrlPressed = false;
  private altPressed = false;
  private defaultCursor = "default";
  private container: HTMLElement | null = null;

  constructor(context: RuntimeContext, options: CustomCanvasGestureOptions) {
    super(
      context,
      Object.assign({}, CustomCanvasGesture.defaultOptions, options),
    );
    this.defaultCursor =
      (this.context.canvas.getConfig().cursor as string) || "default";
    this.container = context.canvas.getContainer() as HTMLElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Disable default touch actions to prevent browser gestures
    this.container.style.touchAction = "none";

    // Bind DOM events for wheel and pinch to properly prevent default
    this.container.addEventListener("wheel", this.onWheel, { passive: false });

    // Bind graph drag events
    const { graph } = this.context;
    graph.on(CommonEvent.DRAG_START, this.onDragStart);
    graph.on(CommonEvent.DRAG, this.onDrag);
    graph.on(CommonEvent.DRAG_END, this.onDragEnd);

    // Bind keyboard events for ctrl key detection
    this.container.addEventListener("keydown", this.onKeyDown);
    this.container.addEventListener("keyup", this.onKeyUp);

    // Also bind on window to catch ctrl key when focus is elsewhere
    window.addEventListener("keydown", this.onWindowKeyDown);
    window.addEventListener("keyup", this.onWindowKeyUp);
  }

  private unbindEvents(): void {
    if (!this.container) return;

    this.container.style.touchAction = "";

    this.container.removeEventListener("wheel", this.onWheel);

    // Unbind graph drag events
    const { graph } = this.context;
    graph.off(CommonEvent.DRAG_START, this.onDragStart);
    graph.off(CommonEvent.DRAG, this.onDrag);
    graph.off(CommonEvent.DRAG_END, this.onDragEnd);

    // Unbind keyboard events
    this.container.removeEventListener("keydown", this.onKeyDown);
    this.container.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("keydown", this.onWindowKeyDown);
    window.removeEventListener("keyup", this.onWindowKeyUp);
  }

  private validate(event: IDragEvent): boolean {
    if (this.destroyed) return false;
    const { enable } = this.options;
    if (typeof enable === "function") return enable(event);
    return !!enable;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Control" || event.key === "Ctrl") {
      this.ctrlPressed = true;
    }
    if (event.key === "Alt") {
      this.altPressed = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Control" || event.key === "Ctrl") {
      this.ctrlPressed = false;
    }
    if (event.key === "Alt") {
      this.altPressed = false;
    }
  };

  private onWindowKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Control" || event.key === "Ctrl") {
      this.ctrlPressed = true;
    }
    if (event.key === "Alt") {
      this.altPressed = true;
    }
  };

  private onWindowKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Control" || event.key === "Ctrl") {
      this.ctrlPressed = false;
    }
    if (event.key === "Alt") {
      this.altPressed = false;
    }
  };

  private onDragStart = (event: IDragEvent): void => {
    if (!this.validate(event)) return;

    // Stop dragging if not on canvas
    if (event.targetType !== "canvas") {
      return;
    }

    this.isDragging = true;
    this.context.canvas.setCursor("grabbing" as any);
  };

  private onDrag = (event: IDragEvent): void => {
    if (!this.isDragging || !this.validate(event)) return;

    // Stop dragging if ctrl or alt is pressed
    if (this.ctrlPressed || this.altPressed) return;

    const x = event.dx;
    const y = event.dy;

    if (x !== 0 || y !== 0) {
      this.context.graph.translateBy([x, y], false);
    }
  };

  private onDragEnd = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.context.canvas.setCursor(this.defaultCursor as any);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const { minScale, maxScale } = this.options;

    // macOS trackpad pinch: ctrlKey=true and deltaY has the pinch amount
    // deltaY < 0 = zoom in, deltaY > 0 = zoom out
    if (event.ctrlKey && event.deltaY !== 0) {
      const currentZoom = this.context.graph.getZoom();
      const delta = -event.deltaY;
      const ratio = 1 + delta / 100;
      const newZoom = clamp(
        currentZoom * ratio,
        minScale || 0.1,
        maxScale || 10,
      );
      const origin: Point = [event.clientX, event.clientY];
      this.context.graph.zoomTo(newZoom, false, origin);
      return;
    }

    // All other scroll events (two-finger swipe) -> pan
    const { deltaX, deltaY } = event;
    if (deltaX !== 0 || deltaY !== 0) {
      this.context.graph.translateBy([-deltaX, -deltaY], false);
    }
  };

  update(options: Partial<CustomCanvasGestureOptions>): void {
    this.unbindEvents();
    super.update(options);
    this.bindEvents();
  }

  destroy(): void {
    this.unbindEvents();
    this.isDragging = false;
    this.container = null;
    super.destroy();
  }
}
