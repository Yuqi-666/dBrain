import type { BaseMetadata } from "./metadata/base";
import type { SemanticMetadata } from "./metadata/semantic";
import type { SystemMetadata } from "./metadata/system";

export interface NodeMetadata
  extends BaseMetadata, SemanticMetadata, SystemMetadata { }

export interface NodeBase {
  metadata: NodeMetadata;
}
