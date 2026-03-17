import type { BaseMetadata } from "../../common/metadata/base";
import type { SemanticMetadata } from "../../common/metadata/semantic";
import type { SystemMetadata } from "../../common/metadata/system";

export interface NodeMetadata
  extends BaseMetadata, SemanticMetadata, SystemMetadata {}

export interface NodeBase {
  metadata: NodeMetadata;
}
