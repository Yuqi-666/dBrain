import type { FilterConfig } from "@workspace/interfaces/models/filter";
import { ViewId, VisualConfig } from "./value-objects";
import { LayoutType } from "../layout/value-objects";
interface ViewProps {
  id: ViewId;
  name: string;
  layout: LayoutType;
  visualConfig: VisualConfig;
  filterConfig: FilterConfig;
  isPinned: boolean;
}

/**
 * View entity - represents a graph view with layout and visual configuration
 * All properties are readonly - use update methods to create new instances
 */
export class View {
  readonly id: ViewId;
  readonly name: string;
  readonly layout: LayoutType;
  readonly visualConfig: VisualConfig;
  readonly filterConfig: FilterConfig;
  readonly isPinned: boolean;

  private constructor(props: ViewProps) {
    this.id = props.id;
    this.name = props.name;
    this.layout = props.layout;
    this.visualConfig = props.visualConfig;
    this.filterConfig = props.filterConfig;
    this.isPinned = props.isPinned ?? false;
  }

  /**
   * Creates a new View entity
   */
  static create(props: {
    id: string | ViewId;
    name: string;
    layout: LayoutType | string;
    visualConfig: VisualConfig;
    filterConfig: FilterConfig;
    isPinned?: boolean;
  }): View {
    const id =
      typeof props.id === "string" ? ViewId.create(props.id) : props.id;
    const layout =
      typeof props.layout === "string"
        ? LayoutType.fromString(props.layout)
        : props.layout;
    const visualConfig =
      props.visualConfig instanceof VisualConfig
        ? props.visualConfig
        : VisualConfig.create(props.visualConfig);

    return new View({
      id,
      name: props.name,
      layout,
      visualConfig,
      filterConfig: props.filterConfig,
      isPinned: props.isPinned ?? false,
    });
  }

  /**
   * Checks if this View has the same identity as another View
   */
  sameIdentityAs(other: View): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Creates a copy with updated name
   */
  updateName(name: string): View {
    return new View({
      id: this.id,
      name,
      layout: this.layout,
      visualConfig: this.visualConfig,
      filterConfig: this.filterConfig,
      isPinned: this.isPinned,
    });
  }

  /**
   * Creates a copy with updated layout
   */
  updateLayout(layout: LayoutType): View {
    return new View({
      id: this.id,
      name: this.name,
      layout,
      visualConfig: this.visualConfig,
      filterConfig: this.filterConfig,
      isPinned: this.isPinned,
    });
  }

  /**
   * Creates a copy with updated visual configuration
   */
  updateVisualConfig(config: VisualConfig): View {
    return new View({
      id: this.id,
      name: this.name,
      layout: this.layout,
      visualConfig: config,
      filterConfig: this.filterConfig,
      isPinned: this.isPinned,
    });
  }

  /**
   * Creates a copy with updated filter configuration
   */
  updateFilterConfig(config: FilterConfig): View {
    return new View({
      id: this.id,
      name: this.name,
      layout: this.layout,
      visualConfig: this.visualConfig,
      filterConfig: config,
      isPinned: this.isPinned,
    });
  }

  /**
   * Creates a pinned copy of this View
   */
  pin(): View {
    if (this.isPinned) return this;
    return new View({
      id: this.id,
      name: this.name,
      layout: this.layout,
      visualConfig: this.visualConfig,
      filterConfig: this.filterConfig,
      isPinned: true,
    });
  }

  /**
   * Creates an unpinned copy of this View
   */
  unpin(): View {
    if (!this.isPinned) return this;
    return new View({
      id: this.id,
      name: this.name,
      layout: this.layout,
      visualConfig: this.visualConfig,
      filterConfig: this.filterConfig,
      isPinned: false,
    });
  }

  /**
   * Checks if this View has active filter rules
   */
  hasActiveFilter(): boolean {
    return (
      (this.filterConfig.selectedNodes !== undefined &&
        this.filterConfig.selectedNodes.length > 0) ||
      this.filterConfig.ruleGroup !== undefined ||
      this.filterConfig.collectionType !== undefined
    );
  }
}
