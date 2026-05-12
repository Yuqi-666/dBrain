import type { IDomainEvent } from "../../event-bus";

export interface EdgeCreatedData {
  id: string;
  from: string;
  to: string;
  edgeType: string;
}

export interface EdgeDeletedData {
  id: string;
}

export type EdgeCreated = IDomainEvent<EdgeCreatedData> & {
  eventType: "EdgeCreated";
};

export type EdgeDeleted = IDomainEvent<EdgeDeletedData> & {
  eventType: "EdgeDeleted";
};
