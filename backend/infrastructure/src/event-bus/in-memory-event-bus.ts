import type { IDomainEvent, IEventBus } from "@workspace/domain/event-bus";
import type { EventMetadata } from "@workspace/domain/event-bus/types";

type EventHandler<T = unknown> = (event: IDomainEvent<T>) => void;

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  publish<T>(event: IDomainEvent<T>): void {
    const eventHandlers = this.handlers.get(event.eventType);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            `Error in event handler for ${event.eventType}:`,
            error,
          );
        }
      });
    }
  }

  subscribe<T>(
    eventType: string,
    handler: EventHandler<T>,
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
    return () => this.unsubscribe(eventType);
  }

  unsubscribe(eventType: string): void {
    this.handlers.delete(eventType);
  }

  clear(): void {
    this.handlers.clear();
  }
}