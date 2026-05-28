import { CommonEvent } from "@antv/g6";
import { register, BaseBehavior } from "@antv/g6";
import type {
  RuntimeContext,
  IPointerEvent,
  IElementDragEvent,
  Point,
  Vector2,
  ID,
  State,
  EdgeDirection,
} from "@antv/g6";
import type { BaseBehaviorOptions } from "@antv/g6";
import type { ShortcutKey } from "@antv/g6";
import { Shortcut } from "@antv/g6";
import { idOf } from "@antv/g6";

function isFunction(fn: unknown): fn is Function {
  return typeof fn === "function";
}

function divide(a: Point, b: number): Point {
  return [a[0] / b, a[1] / b];
}

function rotate(a: Point, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [a[0] * cos - a[1] * sin, a[0] * sin + a[1] * cos] as Vector2;
}

/**
 * <zh/> 拖拽元素交互配置项
 *
 * <en/> Drag element behavior options
 */
export interface DragElementOptions
  extends BaseBehaviorOptions,
  Record<string, unknown> {
  /**
   * <zh/> 是否启用拖拽动画
   *
   * <en/> Whether to enable drag animation
   * @defaultValue true
   */
  animation?: boolean;
  enable?: boolean | ((event: IElementDragEvent) => boolean);
  trigger?: ShortcutKey;
  state?: State;
  hideEdge?: "none" | "all" | EdgeDirection;
  onFinish?: (ids: ID[]) => void;
  cursor?: {
    default?: string;
    grab: string;
    grabbing: string;
  };
}

/**
 * <zh/> 拖拽元素交互
 *
 * <en/> Drag element behavior
 */
export class DragElement extends BaseBehavior<DragElementOptions> {
  static defaultOptions: Partial<DragElementOptions> = {
    animation: true,
    enable: (event: IElementDragEvent) => event.targetType === "node",
    trigger: [],
    state: "selected",
    hideEdge: "none",
    cursor: {
      default: "default",
      grab: "grab",
      grabbing: "grabbing",
    },
  };

  protected enable: boolean = false;

  private enableElements = ["node"];

  protected target: ID[] = [];

  private hiddenEdges: ID[] = [];

  private isDragging = false;

  private shortcut: Shortcut;

  protected ctrlPressed = false;

  protected altPressed = false;

  private container: HTMLElement | null = null;

  private defaultCursor = "default";

  constructor(context: RuntimeContext, options: DragElementOptions) {
    super(context, Object.assign({}, DragElement.defaultOptions, options));
    this.shortcut = new Shortcut(context.graph);
    this.container = context.canvas.getContainer() as HTMLElement;
    this.defaultCursor =
      (this.context.canvas.getConfig().cursor as string) || "default";

    this.onDragStart = this.onDragStart.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);

    this.bindEvents();
  }

  /**
   * <zh/> 更新元素拖拽配置
   *
   * <en/> Update the element dragging configuration
   * @param options - <zh/> 配置项 | <en/> options
   * @internal
   */
  public update(options: Partial<DragElementOptions>): void {
    this.unbindEvents();
    super.update(options);
    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.container) return;

    const { graph } = this.context;

    // Bind keyboard events for ctrl/alt key detection
    this.container.addEventListener("keydown", this.onKeyDown);
    this.container.addEventListener("keyup", this.onKeyUp);

    // Also bind on window to catch ctrl/alt key when focus is elsewhere
    window.addEventListener("keydown", this.onWindowKeyDown);
    window.addEventListener("keyup", this.onWindowKeyUp);

    this.enableElements.forEach((type) => {
      graph.on(`${type}:${CommonEvent.DRAG_START}`, this.onDragStart);
      graph.on(`${type}:${CommonEvent.DRAG}`, this.onDrag);
      graph.on(`${type}:${CommonEvent.DRAG_END}`, this.onDragEnd);
      graph.on(`${type}:${CommonEvent.POINTER_ENTER}`, this.setCursor);
      graph.on(`${type}:${CommonEvent.POINTER_LEAVE}`, this.setCursor);
    });
  }

  private unbindEvents(): void {
    if (!this.container) return;

    const { graph } = this.context;

    this.container.removeEventListener("keydown", this.onKeyDown);
    this.container.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("keydown", this.onWindowKeyDown);
    window.removeEventListener("keyup", this.onWindowKeyUp);

    this.enableElements.forEach((type) => {
      graph.off(`${type}:${CommonEvent.DRAG_START}`, this.onDragStart);
      graph.off(`${type}:${CommonEvent.DRAG}`, this.onDrag);
      graph.off(`${type}:${CommonEvent.DRAG_END}`, this.onDragEnd);
      graph.off(`${type}:${CommonEvent.POINTER_ENTER}`, this.setCursor);
      graph.off(`${type}:${CommonEvent.POINTER_LEAVE}`, this.setCursor);
    });
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

  /**
   * <zh/> 获取当前选中的节点 id 集合
   *
   * <en/> Get the id collection of the currently selected node
   * @param currTarget - <zh/> 当前拖拽目标元素 id 集合 | <en/> The id collection of the current drag target element
   * @returns <zh/> 当前选中的节点 id 集合 | <en/> The id collection of the currently selected node
   * @internal
   */
  protected getSelectedNodeIDs(currTarget: ID[]) {
    return Array.from(
      new Set(
        this.context.graph
          .getElementDataByState("node", this.options.state)
          .map((node) => node.id)
          .concat(currTarget),
      ),
    );
  }

  /**
   * Get the delta of the drag
   * @param event - drag event object
   * @returns delta
   * @internal
   */
  protected getDelta(event: IElementDragEvent) {
    const zoom = this.context.graph.getZoom();
    return divide([event.dx, event.dy], zoom);
  }

  /**
   * <zh/> 拖拽开始时的回调
   *
   * <en/> Callback when dragging starts
   * @param event - <zh/> 拖拽事件对象 | <en/> drag event object
   * @internal
   */
  protected onDragStart(event: IElementDragEvent) {
    if (this.ctrlPressed || this.altPressed) return;
    if (!this.validate(event)) return;

    const { batch, canvas, graph } = this.context;
    canvas.setCursor((this.options.cursor?.grabbing || "grabbing") as any);
    this.isDragging = true;
    batch!.startBatch();

    const id = event.target.id;
    const states = graph.getElementState(id);
    if (states.includes(this.options.state!))
      this.target = this.getSelectedNodeIDs([id]);
    else this.target = [id];

    this.hideEdge();
    this.context.graph.frontElement(this.target);
  }

  protected onDrag(event: IElementDragEvent) {
    if (this.ctrlPressed || this.altPressed) return;
    if (!this.validate(event)) return;

    const delta = this.getDelta(event);
    this.moveElement(this.target, delta);
  }

  protected onDragEnd() {
    if (!this.validate({ target: {} as any } as IElementDragEvent)) return;
    this.showEdges();
    this.options.onFinish?.(this.target);
    const { batch, canvas } = this.context;
    batch!.endBatch();
    canvas.setCursor((this.options.cursor?.grab || "grab") as any);
    this.isDragging = false;
    this.target = [];
  }

  private setCursor = (event: IPointerEvent) => {
    if (this.isDragging) return;
    const { type } = event;
    const { canvas } = this.context;
    const { cursor } = this.options;

    if (type === CommonEvent.POINTER_ENTER)
      canvas.setCursor((cursor?.grab || "grab") as any);
    else canvas.setCursor((cursor?.default || "default") as any);
  };

  /**
   * <zh/> 当前按键是否和 trigger 配置一致
   *
   * <en/> Is the current key consistent with the trigger configuration
   * @returns <zh/> 是否一致 | <en/> Is consistent
   * @internal
   */
  protected isKeydown(): boolean {
    const { trigger } = this.options;
    if (!trigger?.length) return true;
    return this.shortcut.match(trigger);
  }

  /**
   * <zh/> 验证元素是否允许拖拽
   *
   * <en/> Verify if the element is allowed to be dragged
   * @param event - <zh/> 拖拽事件对象 | <en/> drag event object
   * @returns <zh/> 是否允许拖拽 | <en/> Whether to allow dragging
   * @internal
   */
  protected validate(event: IElementDragEvent): boolean {
    if (this.destroyed) return false;
    if (!this.isKeydown()) return false;
    const { enable } = this.options;
    if (isFunction(enable)) return enable(event);
    return !!enable;
  }

  protected clampByRotation([dx, dy]: Point): Vector2 {
    const rotation = this.context.graph.getRotation();
    return rotate([dx ?? 0, dy ?? 0], (rotation * Math.PI) / 180);
  }

  /**
   * <zh/> 移动元素
   *
   * <en/> Move the element
   * @param ids - <zh/> 元素 id 集合 | <en/> element id collection
   * @param offset <zh/> 偏移量 | <en/> offset
   * @internal
   */
  protected moveElement(ids: ID[], offset: Point): void {
    const { graph, model } = this.context;

    ids.forEach((id) => model.refreshComboData(id));
    graph.translateElementBy(
      Object.fromEntries(ids.map((id) => [id, this.clampByRotation(offset)])),
      false,
    );
  }

  private showEdges(): void {
    if (this.hiddenEdges.length === 0) return;
    this.context.graph.showElement(this.hiddenEdges);
    this.hiddenEdges = [];
  }

  protected hideEdge(): void {
    const { hideEdge } = this.options;
    if (hideEdge === "none") return;
    const { graph } = this.context;
    if (hideEdge === "all")
      this.hiddenEdges = graph.getEdgeData().map(idOf);
    else {
      this.hiddenEdges = Array.from(
        new Set(
          this.target
            .map((id) => graph.getRelatedEdgesData(id, hideEdge).map(idOf))
            .flat(),
        ),
      );
    }
    graph.hideElement(this.hiddenEdges);
  }

  public destroy(): void {
    this.unbindEvents();
    this.container = null;
    super.destroy();
  }
}

