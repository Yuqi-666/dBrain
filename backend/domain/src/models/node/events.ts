import type { IDomainEvent } from "../../event-bus";

export interface NodeCreatedData {
  id: string;
  nodeType: string;
  title: string;
}

export interface NodeDeletedData {
  id: string;
}

export type NodeCreated = IDomainEvent<NodeCreatedData> & {
  eventType: "NodeCreated";
};

export type NodeDeleted = IDomainEvent<NodeDeletedData> & {
  eventType: "NodeDeleted";
};
