import type { RuleGroupType } from "@workspace/utils";
import type {
  NodeId as NodeIdType,
  NodeTagId,
  NodeSemanticId,
} from "@workspace/interfaces/models/node/base";
import type {
  NodeDataType,
  SingleNodeDataType,
  ComplexNodeDataType,
} from "@workspace/interfaces/models/node/types";
import { FilterConfig } from "../filter/value-objects";

/**
 * Value Object representing a Node ID.
 * Immutable wrapper for node identifier with validation.
 */
export class NodeId {
  private readonly _value: NodeIdType;

  constructor(value: NodeIdType) {
    if (!value || value.trim().length === 0) {
      throw new Error("NodeId cannot be empty");
    }
    this._value = value;
  }

  get value(): NodeIdType {
    return this._value;
  }

  equals(other: NodeId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * Value Object representing node permission level.
 * Encapsulates permission logic and validation.
 */
export class Permission {
  private readonly _value: "private" | "public" | "restricted";

  constructor(value: "private" | "public" | "restricted") {
    if (value !== "private" && value !== "public" && value !== "restricted") {
      throw new Error(`Invalid permission: ${value}`);
    }
    this._value = value;
  }

  static private(): Permission {
    return new Permission("private");
  }

  static public(): Permission {
    return new Permission("public");
  }

  static restricted(): Permission {
    return new Permission("restricted");
  }

  get value(): "private" | "public" | "restricted" {
    return this._value;
  }

  isPrivate(): boolean {
    return this._value === "private";
  }

  isPublic(): boolean {
    return this._value === "public";
  }

  isRestricted(): boolean {
    return this._value === "restricted";
  }

  equals(other: Permission): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * Value Object representing the type discriminator for nodes.
 * Provides type-safe node type discrimination.
 */
export class NodeType<T extends NodeDataType = NodeDataType> {
  private readonly _value: T;

  constructor(value: T) {
    const validTypes = [
      "text",
      "image",
      "pdf",
      "video",
      "audio",
      "webpage",
      "website",
      "collection",
      "rich-text",
    ] as const;
    const isValid = validTypes.some((t) => t === value);
    if (!isValid) {
      throw new Error(`Invalid node type: ${value}`);
    }
    this._value = value;
  }

  get value(): T {
    return this._value;
  }

  equals(other: NodeType<T>): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * Content Value Objects for all node types.
 * All content value objects are immutable.
 */

/**
 * Text node content.
 */
export class TextContent {
  private readonly _docs: Record<string, any>;

  constructor(docs: Record<string, any>) {
    this._docs = Object.freeze({ ...docs });
  }

  get docs(): Record<string, any> {
    return { ...this._docs };
  }

  equals(other: TextContent): boolean {
    return JSON.stringify(this._docs) === JSON.stringify(other._docs);
  }
}

/**
 * Image node content.
 */
export class ImageContent {
  private readonly _url: string;

  constructor(url: string) {
    if (!url || url.trim().length === 0) {
      throw new Error("Image URL cannot be empty");
    }
    this._url = url;
  }

  get url(): string {
    return this._url;
  }

  equals(other: ImageContent): boolean {
    return this._url === other._url;
  }
}

/**
 * PDF node content.
 */
export class PdfContent {
  private readonly _url: string;
  private readonly _coverUrl: string;

  constructor(url: string, coverUrl: string) {
    if (!url || url.trim().length === 0) {
      throw new Error("PDF URL cannot be empty");
    }
    if (!coverUrl || coverUrl.trim().length === 0) {
      throw new Error("PDF cover URL cannot be empty");
    }
    this._url = url;
    this._coverUrl = coverUrl;
  }

  get url(): string {
    return this._url;
  }

  get coverUrl(): string {
    return this._coverUrl;
  }

  equals(other: PdfContent): boolean {
    return this._url === other._url && this._coverUrl === other._coverUrl;
  }
}

/**
 * Video node content.
 */
export class VideoContent {
  private readonly _url: string;
  private readonly _coverUrl: string;

  constructor(url: string, coverUrl: string) {
    if (!url || url.trim().length === 0) {
      throw new Error("Video URL cannot be empty");
    }
    if (!coverUrl || coverUrl.trim().length === 0) {
      throw new Error("Video cover URL cannot be empty");
    }
    this._url = url;
    this._coverUrl = coverUrl;
  }

  get url(): string {
    return this._url;
  }

  get coverUrl(): string {
    return this._coverUrl;
  }

  equals(other: VideoContent): boolean {
    return this._url === other._url && this._coverUrl === other._coverUrl;
  }
}

/**
 * Audio node content.
 */
export class AudioContent {
  private readonly _url: string;

  constructor(url: string) {
    if (!url || url.trim().length === 0) {
      throw new Error("Audio URL cannot be empty");
    }
    this._url = url;
  }

  get url(): string {
    return this._url;
  }

  equals(other: AudioContent): boolean {
    return this._url === other._url;
  }
}

/**
 * Webpage node content.
 */
export class WebpageContent {
  private readonly _html: string;
  private readonly _url: string;
  private readonly _screenshotUrl?: string;

  constructor(html: string, url: string, screenshotUrl?: string) {
    if (!html || html.trim().length === 0) {
      throw new Error("Webpage HTML cannot be empty");
    }
    if (!url || url.trim().length === 0) {
      throw new Error("Webpage URL cannot be empty");
    }
    this._html = html;
    this._url = url;
    this._screenshotUrl = screenshotUrl;
  }

  get html(): string {
    return this._html;
  }

  get url(): string {
    return this._url;
  }

  get screenshotUrl(): string | undefined {
    return this._screenshotUrl;
  }

  equals(other: WebpageContent): boolean {
    return (
      this._html === other._html &&
      this._url === other._url &&
      this._screenshotUrl === other._screenshotUrl
    );
  }
}

/**
 * Website node content.
 */
export class WebsiteContent {
  private readonly _url: string;
  private readonly _faviconUrl?: string;

  constructor(url: string, faviconUrl?: string) {
    if (!url || url.trim().length === 0) {
      throw new Error("Website URL cannot be empty");
    }
    this._url = url;
    this._faviconUrl = faviconUrl;
  }

  get url(): string {
    return this._url;
  }

  get faviconUrl(): string | undefined {
    return this._faviconUrl;
  }

  equals(other: WebsiteContent): boolean {
    return this._url === other._url && this._faviconUrl === other._faviconUrl;
  }
}

/**
 * Collection node content.
 */
export class CollectionContent {
  private readonly _filterConfig: FilterConfig | undefined;

  constructor(
    filterConfig: FilterConfig | undefined,
  ) {
    this._filterConfig = filterConfig;
  }

  get filterConfig(): FilterConfig | undefined {
    return this._filterConfig;
  }

  equals(other: CollectionContent): boolean {
    if (!this._filterConfig && !other._filterConfig) {
      return true;
    }
    if (!this._filterConfig || !other._filterConfig) {
      return false;
    }
    return this._filterConfig.equals(other._filterConfig);
  }
}

/**
 * Rich text node content.
 */
export class RichTextContent {
  private readonly _referencedNodes: NodeId[];
  private readonly _docs: Record<string, any>;

  constructor(referencedNodes: NodeId[], docs: Record<string, any>) {
    this._referencedNodes = [...referencedNodes];
    this._docs = Object.freeze({ ...docs });
  }

  get referencedNodes(): NodeId[] {
    return [...this._referencedNodes];
  }

  get docs(): Record<string, any> {
    return { ...this._docs };
  }

  equals(other: RichTextContent): boolean {
    if (this._referencedNodes.length !== other._referencedNodes.length) {
      return false;
    }
    for (let i = 0; i < this._referencedNodes.length; i++) {
      const thisNode = this._referencedNodes[i];
      const otherNode = other._referencedNodes[i];
      if (!thisNode || !otherNode || !thisNode.equals(otherNode)) {
        return false;
      }
    }
    return JSON.stringify(this._docs) === JSON.stringify(other._docs);
  }
}
