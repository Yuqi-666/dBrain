import type { IDomainEvent } from "../../event-bus";

export interface ViewCreatedData {
  id: string;
  name: string;
  layout: string;
}

export interface ViewDeletedData {
  id: string;
}

export type ViewCreated = IDomainEvent<ViewCreatedData> & {
  eventType: "ViewCreated";
};
export type ViewDeleted = IDomainEvent<ViewDeletedData> & {
  eventType: "ViewDeleted";
};
