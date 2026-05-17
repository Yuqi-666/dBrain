import { router, protectedProcedure, eventEmitter } from "../server";
import { observable } from "@trpc/server/observable";
import type { IDomainEvent } from "@workspace/domain/event-bus";

export const eventRouter = router({
  onEvent: protectedProcedure.subscription(() => {
    return observable<IDomainEvent>((emit) => {
      const handler = (event: IDomainEvent) => {
        emit.next(event);
      };
      const unsubscribe = eventEmitter.subscribe(handler);
      return () => unsubscribe();
    });
  }),
});