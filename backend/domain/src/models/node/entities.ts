import type {
  NodeTagId,
  NodeSemanticId,
} from "@workspace/interfaces/models/node/base";
import type { RuleGroupType } from "@workspace/utils";
import type {
  SingleNodeDataType,
  ComplexNodeDataType,
  NodeDataType,
} from "@workspace/interfaces/models/node/types";

import {
  NodeId,
  Permission,
  NodeType,
  TextContent,
  ImageContent,
  PdfContent,
  VideoContent,
  AudioContent,
  WebpageContent,
  WebsiteContent,
  CollectionContent,
  RichTextContent,
} from "./value-objects";
import { FilterConfig } from "../filter/value-objects";

export interface NodeBaseProps {
  id: NodeId;
  title: string;
  abstract?: string;
  permission: Permission;
  semanticId: NodeSemanticId;
  tags: NodeTagId[];
  isPinned: boolean;
  stateData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export abstract class Node {
  protected readonly _id: NodeId;
  protected readonly _title: string;
  protected readonly _abstract: string | undefined;
  protected readonly _permission: Permission;
  protected readonly _semanticId: NodeSemanticId;
  protected readonly _tags: NodeTagId[];
  protected readonly _isPinned: boolean;
  protected readonly _stateData: Record<string, any> | undefined;
  protected readonly _createdAt: string;
  protected readonly _updatedAt: string;
  protected readonly _nodeType: NodeType;

  protected constructor(
    props: NodeBaseProps & { nodeType: NodeType<NodeDataType> },
  ) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error("Node title cannot be empty");
    }
    this._id = props.id;
    this._title = props.title;
    this._abstract = props.abstract;
    this._permission = props.permission;
    this._semanticId = props.semanticId;
    this._tags = [...props.tags];
    this._isPinned = props.isPinned;
    this._stateData = props.stateData ? { ...props.stateData } : undefined;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._nodeType = props.nodeType;
  }

  get id(): NodeId {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get abstract(): string | undefined {
    return this._abstract;
  }

  get permission(): Permission {
    return this._permission;
  }

  get semanticId(): NodeSemanticId {
    return this._semanticId;
  }

  get tags(): NodeTagId[] {
    return [...this._tags];
  }

  get isPinned(): boolean {
    return this._isPinned;
  }

  get stateData(): Record<string, any> | undefined {
    return this._stateData ? { ...this._stateData } : undefined;
  }

  get createdAt(): string {
    return this._createdAt;
  }

  get updatedAt(): string {
    return this._updatedAt;
  }

  get nodeType(): NodeType {
    return this._nodeType;
  }

  sameIdentityAs(other: Node): boolean {
    return this._id.equals(other._id);
  }

  updateTitle(title: string): Node {
    if (!title || title.trim().length === 0) {
      throw new Error("Node title cannot be empty");
    }
    return this.cloneWith({
      title,
      updatedAt: new Date().toISOString(),
    });
  }

  updateAbstract(abstract: string): Node {
    return this.cloneWith({
      abstract,
      updatedAt: new Date().toISOString(),
    });
  }

  updateTags(tags: NodeTagId[]): Node {
    return this.cloneWith({
      tags,
      updatedAt: new Date().toISOString(),
    });
  }

  updatePermission(permission: Permission): Node {
    return this.cloneWith({
      permission,
      updatedAt: new Date().toISOString(),
    });
  }

  pin(): Node {
    if (this._isPinned) return this;
    return this.cloneWith({
      isPinned: true,
      updatedAt: new Date().toISOString(),
    });
  }

  unpin(): Node {
    if (!this._isPinned) return this;
    return this.cloneWith({
      isPinned: false,
      updatedAt: new Date().toISOString(),
    });
  }

  updateStateData(stateData: Record<string, any>): Node {
    return this.cloneWith({
      stateData,
      updatedAt: new Date().toISOString(),
    });
  }

  protected abstract cloneWith(props: Partial<NodeBaseProps>): Node;
}

export class TextNode extends Node {
  protected readonly _content: TextContent;

  private constructor(props: NodeBaseProps & { content: TextContent }) {
    super({ ...props, nodeType: new NodeType<"text">("text") });
    this._content = props.content;
  }

  get content(): TextContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    content: TextContent;
    createdAt?: string;
    updatedAt?: string;
  }): TextNode {
    const now = new Date().toISOString();
    return new TextNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: TextContent): TextNode {
    return new TextNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): TextNode {
    return new TextNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class ImageNode extends Node {
  protected readonly _width: number;
  protected readonly _height: number;
  protected readonly _fileSize: number;
  protected readonly _location: string | undefined;
  protected readonly _shootingTime: string | undefined;
  protected readonly _content: ImageContent;

  private constructor(
    props: NodeBaseProps & {
      width: number;
      height: number;
      fileSize: number;
      location?: string;
      shootingTime?: string;
      content: ImageContent;
    },
  ) {
    super({ ...props, nodeType: new NodeType<"image">("image") });

    if (props.width <= 0) throw new Error("Image width must bever positive");
    if (props.height <= 0) throw new Error("Image height must be positive");
    if (props.fileSize <= 0)
      throw new Error("Image file size must be positive");

    this._width = props.width;
    this._height = props.height;
    this._fileSize = props.fileSize;
    this._location = props.location;
    this._shootingTime = props.shootingTime;
    this._content = props.content;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get location(): string | undefined {
    return this._location;
  }

  get shootingTime(): string | undefined {
    return this._shootingTime;
  }

  get content(): ImageContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    width: number;
    height: number;
    fileSize: number;
    location?: string;
    shootingTime?: string;
    content: ImageContent;
    createdAt?: string;
    updatedAt?: string;
  }): ImageNode {
    const now = new Date().toISOString();
    return new ImageNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      width: props.width,
      height: props.height,
      fileSize: props.fileSize,
      location: props.location,
      shootingTime: props.shootingTime,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: ImageContent): ImageNode {
    return new ImageNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      width: this._width,
      height: this._height,
      fileSize: this._fileSize,
      location: this._location,
      shootingTime: this._shootingTime,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): ImageNode {
    return new ImageNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      width: this._width,
      height: this._height,
      fileSize: this._fileSize,
      location: this._location,
      shootingTime: this._shootingTime,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class PdfNode extends Node {
  protected readonly _pageCount: number;
  protected readonly _fileSize: number;
  protected readonly _content: PdfContent;

  private constructor(
    props: NodeBaseProps & {
      pageCount: number;
      fileSize: number;
      content: PdfContent;
    },
  ) {
    super({ ...props, nodeType: new NodeType<"pdf">("pdf") });

    if (props.pageCount <= 0)
      throw new Error("PDF page count must be positive");
    if (props.fileSize <= 0) throw new Error("PDF file size must be positive");

    this._pageCount = props.pageCount;
    this._fileSize = props.fileSize;
    this._content = props.content;
  }

  get pageCount(): number {
    return this._pageCount;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get content(): PdfContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    pageCount: number;
    fileSize: number;
    content: PdfContent;
    createdAt?: string;
    updatedAt?: string;
  }): PdfNode {
    const now = new Date().toISOString();
    return new PdfNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      pageCount: props.pageCount,
      fileSize: props.fileSize,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: PdfContent): PdfNode {
    return new PdfNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      pageCount: this._pageCount,
      fileSize: this._fileSize,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): PdfNode {
    return new PdfNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      pageCount: this._pageCount,
      fileSize: this._fileSize,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class VideoNode extends Node {
  protected readonly _duration: number;
  protected readonly _source: "local" | "online";
  protected readonly _sourceUrl: string | undefined;
  protected readonly _fileSize: number | undefined;
  protected readonly _location: string | undefined;
  protected readonly _shootingTime: string | undefined;
  protected readonly _content: VideoContent;

  private constructor(
    props: NodeBaseProps & {
      duration: number;
      source: "local" | "online";
      sourceUrl?: string;
      fileSize?: number;
      location?: string;
      shootingTime?: string;
      content: VideoContent;
    },
  ) {
    super({ ...props, nodeType: new NodeType<"video">("video") });

    if (props.duration <= 0) throw new Error("Video duration must be positive");
    if (props.source !== "local" && props.source !== "online") {
      throw new Error("Video source must be 'local' or 'online'");
    }

    this._duration = props.duration;
    this._source = props.source;
    this._sourceUrl = props.sourceUrl;
    this._fileSize = props.fileSize;
    this._location = props.location;
    this._shootingTime = props.shootingTime;
    this._content = props.content;
  }

  get duration(): number {
    return this._duration;
  }

  get source(): "local" | "online" {
    return this._source;
  }

  get sourceUrl(): string | undefined {
    return this._sourceUrl;
  }

  get fileSize(): number | undefined {
    return this._fileSize;
  }

  get location(): string | undefined {
    return this._location;
  }

  get shootingTime(): string | undefined {
    return this._shootingTime;
  }

  get content(): VideoContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    duration: number;
    source: "local" | "online";
    sourceUrl?: string;
    fileSize?: number;
    location?: string;
    shootingTime?: string;
    content: VideoContent;
    createdAt?: string;
    updatedAt?: string;
  }): VideoNode {
    const now = new Date().toISOString();
    return new VideoNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      duration: props.duration,
      source: props.source,
      sourceUrl: props.sourceUrl,
      fileSize: props.fileSize,
      location: props.location,
      shootingTime: props.shootingTime,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: VideoContent): VideoNode {
    return new VideoNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      duration: this._duration,
      source: this._source,
      sourceUrl: this._sourceUrl,
      fileSize: this._fileSize,
      location: this._location,
      shootingTime: this._shootingTime,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): VideoNode {
    return new VideoNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      duration: this._duration,
      source: this._source,
      sourceUrl: this._sourceUrl,
      fileSize: this._fileSize,
      location: this._location,
      shootingTime: this._shootingTime,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class AudioNode extends Node {
  protected readonly _duration: number;
  protected readonly _fileSize: number;
  protected readonly _content: AudioContent;

  private constructor(
    props: NodeBaseProps & {
      duration: number;
      fileSize: number;
      content: AudioContent;
    },
  ) {
    super({ ...props, nodeType: new NodeType<"audio">("audio") });

    if (props.duration <= 0) throw new Error("Audio duration must be positive");
    if (props.fileSize <= 0)
      throw new Error("Audio file size must be positive");

    this._duration = props.duration;
    this._fileSize = props.fileSize;
    this._content = props.content;
  }

  get duration(): number {
    return this._duration;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get content(): AudioContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    duration: number;
    fileSize: number;
    content: AudioContent;
    createdAt?: string;
    updatedAt?: string;
  }): AudioNode {
    const now = new Date().toISOString();
    return new AudioNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      duration: props.duration,
      fileSize: props.fileSize,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: AudioContent): AudioNode {
    return new AudioNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      duration: this._duration,
      fileSize: this._fileSize,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): AudioNode {
    return new AudioNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      duration: this._duration,
      fileSize: this._fileSize,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class WebpageNode extends Node {
  protected readonly _content: WebpageContent;

  private constructor(props: NodeBaseProps & { content: WebpageContent }) {
    super({ ...props, nodeType: new NodeType<"webpage">("webpage") });
    this._content = props.content;
  }

  get content(): WebpageContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    content: WebpageContent;
    createdAt?: string;
    updatedAt?: string;
  }): WebpageNode {
    const now = new Date().toISOString();
    return new WebpageNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: WebpageContent): WebpageNode {
    return new WebpageNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): WebpageNode {
    return new WebpageNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class WebsiteNode extends Node {
  protected readonly _content: WebsiteContent;

  private constructor(props: NodeBaseProps & { content: WebsiteContent }) {
    super({ ...props, nodeType: new NodeType<"website">("website") });
    this._content = props.content;
  }

  get content(): WebsiteContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    content: WebsiteContent;
    createdAt?: string;
    updatedAt?: string;
  }): WebsiteNode {
    const now = new Date().toISOString();
    return new WebsiteNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  updateContent(content: WebsiteContent): WebsiteNode {
    return new WebsiteNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): WebsiteNode {
    return new WebsiteNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class CollectionNode extends Node {
  protected readonly _content: CollectionContent;

  private constructor(props: NodeBaseProps & { content: CollectionContent }) {
    super({ ...props, nodeType: new NodeType<"collection">("collection") });
    this._content = props.content;
  }

  get content(): CollectionContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    content: CollectionContent;
    createdAt?: string;
    updatedAt?: string;
  }): CollectionNode {
    const now = new Date().toISOString();
    return new CollectionNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  applyFilter(
    filterConfig: FilterConfig,
  ): CollectionNode {
    return new CollectionNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content: new CollectionContent(FilterConfig.create(filterConfig)),
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  clearFilter(): CollectionNode {
    return new CollectionNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content: new CollectionContent(FilterConfig.empty()),
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): CollectionNode {
    return new CollectionNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}

export class RichTextNode extends Node {
  protected readonly _content: RichTextContent;

  private constructor(props: NodeBaseProps & { content: RichTextContent }) {
    super({ ...props, nodeType: new NodeType<"rich-text">("rich-text") });
    this._content = props.content;
  }

  get content(): RichTextContent {
    return this._content;
  }

  static create(props: {
    id: NodeId;
    title: string;
    abstract?: string;
    permission: Permission;
    semanticId: NodeSemanticId;
    tags?: NodeTagId[];
    isPinned?: boolean;
    stateData?: Record<string, any>;
    content: RichTextContent;
    createdAt?: string;
    updatedAt?: string;
  }): RichTextNode {
    const now = new Date().toISOString();
    return new RichTextNode({
      id: props.id,
      title: props.title,
      abstract: props.abstract,
      permission: props.permission,
      semanticId: props.semanticId,
      tags: props.tags ?? [],
      isPinned: props.isPinned ?? false,
      stateData: props.stateData,
      content: props.content,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  addReference(nodeId: NodeId): RichTextNode {
    const currentRefs = this._content.referencedNodes;
    if (currentRefs.some((ref) => ref.equals(nodeId))) {
      return this;
    }
    const newRefs = [...currentRefs, nodeId];
    return new RichTextNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content: new RichTextContent(newRefs, this._content.docs),
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  removeReference(nodeId: NodeId): RichTextNode {
    const newRefs = this._content.referencedNodes.filter(
      (ref) => !ref.equals(nodeId),
    );
    if (newRefs.length === this._content.referencedNodes.length) {
      return this;
    }
    return new RichTextNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content: new RichTextContent(newRefs, this._content.docs),
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  updateContent(content: RichTextContent): RichTextNode {
    return new RichTextNode({
      id: this._id,
      title: this._title,
      abstract: this._abstract,
      permission: this._permission,
      semanticId: this._semanticId,
      tags: this._tags,
      isPinned: this._isPinned,
      stateData: this._stateData,
      content,
      createdAt: this._createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  protected cloneWith(props: Partial<NodeBaseProps>): RichTextNode {
    return new RichTextNode({
      id: props.id ?? this._id,
      title: props.title ?? this._title,
      abstract: props.abstract ?? this._abstract,
      permission: props.permission ?? this._permission,
      semanticId: props.semanticId ?? this._semanticId,
      tags: props.tags ?? this._tags,
      isPinned: props.isPinned ?? this._isPinned,
      stateData: props.stateData ?? this._stateData,
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: props.updatedAt ?? this._updatedAt,
    });
  }
}
