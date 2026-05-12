/**
 * Domain value object representing layout type for node graph visualization.
 * Provides type-safe creation and classification of layout algorithms.
 */
export class LayoutType {
  private static readonly VALID_LAYOUTS = [
    "dagre",
    "radial",
    "compactBox",
    "D3force",
    "fishbone",
    "mindmap",
  ] as const;

  private static readonly LABELS: Record<string, string> = {
    dagre: "Dagre (Hierarchical)",
    radial: "Radial (Circular)",
    compactBox: "Compact Box",
    D3force: "D3 Force",
    fishbone: "Fishbone",
    mindmap: "Mind Map",
  };

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static dagre(): LayoutType {
    return new LayoutType("dagre");
  }

  static radial(): LayoutType {
    return new LayoutType("radial");
  }

  static compactBox(): LayoutType {
    return new LayoutType("compactBox");
  }

  static D3force(): LayoutType {
    return new LayoutType("D3force");
  }

  static fishbone(): LayoutType {
    return new LayoutType("fishbone");
  }

  static mindmap(): LayoutType {
    return new LayoutType("mindmap");
  }

  static fromString(value: string): LayoutType {
    if (!LayoutType.VALID_LAYOUTS.includes(value as any)) {
      throw new Error(
        `Invalid layout type: ${value}. Valid values are: ${LayoutType.VALID_LAYOUTS.join(", ")}`,
      );
    }
    return new LayoutType(value);
  }

  getValue(): string {
    return this.value;
  }

  getLabel(): string {
    return LayoutType.LABELS[this.value] || this.value;
  }

  equals(other: LayoutType): boolean {
    return this.value === other.value;
  }

  isForceBased(): boolean {
    return this.value === "D3force";
  }

  isTreeBased(): boolean {
    return ["dagre", "compactBox", "fishbone", "mindmap"].includes(this.value);
  }

  isRadial(): boolean {
    return this.value === "radial";
  }
}
