import type { IDomainEvent } from "../../event-bus";

export interface NodeSemanticCreatedData {
  id: string;
  name: string;
}

export interface EdgeSemanticCreatedData {
  id: string;
  name: string;
  category: string;
}

export interface NodeTagCreatedData {
  id: string;
  name: string;
}

export type NodeSemanticCreated = IDomainEvent<NodeSemanticCreatedData> & {
  eventType: "NodeSemanticCreated";
};
export type EdgeSemanticCreated = IDomainEvent<EdgeSemanticCreatedData> & {
  eventType: "EdgeSemanticCreated";
};
export type NodeTagCreated = IDomainEvent<NodeTagCreatedData> & {
  eventType: "NodeTagCreated";
};
