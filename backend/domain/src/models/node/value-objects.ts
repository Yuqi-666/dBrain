import type {
  NodeId as NodeIdType,
} from "@workspace/interfaces/models/node/base";
import type {
  NodeDataType,
} from "@workspace/interfaces/models/node/types";
import type { WebpageContent as WebpageContentData } from "@workspace/interfaces/models/node/nodes/single/webpage";
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
 *
 * `hlsUrl` is the HLS playlist the backend packaged the upload into. It is
 * optional because a video that has not been transcoded yet (or whose
 * transcode was refused) is still a valid node: the player then falls back to
 * `url`, which is all an existing record has.
 */
export class VideoContent {
  private readonly _url: string;
  private readonly _coverUrl: string;
  private readonly _hlsUrl: string;

  constructor(url: string, coverUrl: string, hlsUrl = "") {
    this._url = url;
    this._coverUrl = coverUrl;
    this._hlsUrl = hlsUrl;
  }

  get url(): string {
    return this._url;
  }

  get coverUrl(): string {
    return this._coverUrl;
  }

  get hlsUrl(): string {
    return this._hlsUrl;
  }

  equals(other: VideoContent): boolean {
    return (
      this._url === other._url &&
      this._coverUrl === other._coverUrl &&
      this._hlsUrl === other._hlsUrl
    );
  }
}

/**
 * Audio node content.
 */
export class AudioContent {
  private readonly _url: string;

  constructor(url: string) {
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
 * Webpage node content: the page source and the language it is written in.
 *
 * Source is the only representation a webpage node holds — a live address
 * belongs to a `website` node, and a screenshot is just an uploaded `image`,
 * so there is no mode to discriminate on any more.
 */
export class WebpageContent {
  private readonly _code: string;
  private readonly _language: string;

  constructor(data: WebpageContentData) {
    this._code = data.code;
    this._language = data.language;
  }

  get code(): string {
    return this._code;
  }

  get language(): string {
    return this._language;
  }

  equals(other: WebpageContent): boolean {
    return this._code === other._code && this._language === other._language;
  }
}

/**
 * Website node content.
 */
export class WebsiteContent {
  private readonly _url: string;
  private readonly _faviconUrl?: string;

  constructor(url: string, faviconUrl?: string) {
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
