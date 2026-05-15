import { createTRPCClient, wsLink, createWSClient } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/adapter-front";

const wsClient = createWSClient({
  url: "ws://localhost:3001",
});

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      wsLink({
        client: wsClient,
        transformer: superjson,
      }),
    ],
  });
}

export const trpcClient = createClient();
