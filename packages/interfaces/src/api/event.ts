/**
 * Unified Domain Event type
 * data only contains entity ID, full data fetched via GraphCQRS.syncXxx()
 */
export interface DomainEvent<T = unknown> {
  eventType: string;
  aggregateId: string;
  metadata: {
    occurredAt: string;
    eventVersion: 1;
    userId: string;
  };
  data: T;
}

export type NodeAddedEvent = DomainEvent<{ id: string }> & { eventType: "NodeCreated" };
export type NodeUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "NodeUpdated" };
export type NodeDeletedEvent = DomainEvent<{ id: string }> & { eventType: "NodeDeleted" };

export type EdgeAddedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeCreated" };
export type EdgeUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeUpdated" };
export type EdgeDeletedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeDeleted" };

export type ViewAddedEvent = DomainEvent<{ id: string }> & { eventType: "ViewCreated" };
export type ViewUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "ViewUpdated" };
export type ViewDeletedEvent = DomainEvent<{ id: string }> & { eventType: "ViewDeleted" };

export type NodeSemanticAddedEvent = DomainEvent<{ id: string }> & { eventType: "NodeSemanticCreated" };
export type NodeSemanticUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "NodeSemanticUpdated" };
export type NodeSemanticDeletedEvent = DomainEvent<{ id: string }> & { eventType: "NodeSemanticDeleted" };

export type EdgeSemanticAddedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeSemanticCreated" };
export type EdgeSemanticUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeSemanticUpdated" };
export type EdgeSemanticDeletedEvent = DomainEvent<{ id: string }> & { eventType: "EdgeSemanticDeleted" };

export type NodeTagAddedEvent = DomainEvent<{ id: string }> & { eventType: "NodeTagCreated" };
export type NodeTagUpdatedEvent = DomainEvent<{ id: string }> & { eventType: "NodeTagUpdated" };
export type NodeTagDeletedEvent = DomainEvent<{ id: string }> & { eventType: "NodeTagDeleted" };

export type IDomainEvent =
  | NodeAddedEvent
  | NodeUpdatedEvent
  | NodeDeletedEvent
  | EdgeAddedEvent
  | EdgeUpdatedEvent
  | EdgeDeletedEvent
  | ViewAddedEvent
  | ViewUpdatedEvent
  | ViewDeletedEvent
  | NodeSemanticAddedEvent
  | NodeSemanticUpdatedEvent
  | NodeSemanticDeletedEvent
  | EdgeSemanticAddedEvent
  | EdgeSemanticUpdatedEvent
  | EdgeSemanticDeletedEvent
  | NodeTagAddedEvent
  | NodeTagUpdatedEvent
  | NodeTagDeletedEvent;