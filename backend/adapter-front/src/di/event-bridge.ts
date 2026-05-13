import type { IDomainEvent } from "@workspace/domain/event-bus";
import { container } from "./container";
import {
  nodeAddedEmitter,
  nodeUpdatedEmitter,
  nodeDeletedEmitter,
  edgeAddedEmitter,
  edgeUpdatedEmitter,
  edgeDeletedEmitter,
  nodeSemanticAddedEmitter,
  nodeSemanticUpdatedEmitter,
  nodeSemanticDeletedEmitter,
  edgeSemanticAddedEmitter,
  edgeSemanticUpdatedEmitter,
  edgeSemanticDeletedEmitter,
  viewAddedEmitter,
  viewUpdatedEmitter,
  viewDeletedEmitter,
} from "../trpc/server";

const eventToEmitterMap = [
  { eventType: "NodeCreated", emitter: nodeAddedEmitter },
  { eventType: "NodeUpdated", emitter: nodeUpdatedEmitter },
  { eventType: "NodeDeleted", emitter: nodeDeletedEmitter },
  { eventType: "EdgeCreated", emitter: edgeAddedEmitter },
  { eventType: "EdgeUpdated", emitter: edgeUpdatedEmitter },
  { eventType: "EdgeDeleted", emitter: edgeDeletedEmitter },
  { eventType: "NodeSemanticCreated", emitter: nodeSemanticAddedEmitter },
  { eventType: "NodeSemanticUpdated", emitter: nodeSemanticUpdatedEmitter },
  { eventType: "NodeSemanticDeleted", emitter: nodeSemanticDeletedEmitter },
  { eventType: "EdgeSemanticCreated", emitter: edgeSemanticAddedEmitter },
  { eventType: "EdgeSemanticUpdated", emitter: edgeSemanticUpdatedEmitter },
  { eventType: "EdgeSemanticDeleted", emitter: edgeSemanticDeletedEmitter },
  { eventType: "ViewCreated", emitter: viewAddedEmitter },
  { eventType: "ViewUpdated", emitter: viewUpdatedEmitter },
  { eventType: "ViewDeleted", emitter: viewDeletedEmitter },
] as const;

const unsubscribers: Array<() => void> = [];

export function initializeEventBridge(): void {
  const eventBus = container().eventBus;

  for (const { eventType, emitter } of eventToEmitterMap) {
    const unsubscribe = eventBus.subscribe(eventType, (event: IDomainEvent) => {
      const userId = (event.data as { userId?: string }).userId ?? "system";
      const timestamp = new Date(event.metadata.occurredAt).getTime();
      emitter.emit({ ...event.data, userId, timestamp });
    });
    unsubscribers.push(unsubscribe);
  }
}

export function destroyEventBridge(): void {
  for (const unsubscribe of unsubscribers) {
    unsubscribe();
  }
  unsubscribers.length = 0;
}
