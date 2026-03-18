import type { BaseMetadata } from "./base";

export type SemanticType = string;

export type CustomPropertyFieldType =
  | "text"
  | "number"
  | "date"
  | "singleSelect"
  | "multiSelect";

export interface CustomProperty {
  key: string;
  value: string | number | boolean | string[];
  fieldType: CustomPropertyFieldType;
}

export interface SemanticMetadata {
  type: SemanticType;
  tags?: string[];
  customProperties?: Record<string, CustomProperty>;
}

export function createDefaultSemanticMetadata(
  type: SemanticType = "text",
  partial?: Partial<SemanticMetadata>,
): SemanticMetadata {
  return {
    type,
    tags: undefined,
    customProperties: undefined,
    ...partial,
  };
}

export function mergeWithBaseMetadata(
  base: BaseMetadata,
  semantic: SemanticMetadata,
): BaseMetadata & SemanticMetadata {
  return {
    ...base,
    ...semantic,
  };
}
