import { createTRPCClient, wsLink, createWSClient } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/adapter-front";

function getConnectionParams() {
  if (typeof document === "undefined") return {};
  const tokenMatch = document.cookie.match(/pb_token=([^;]+)/);
  const userIdMatch = document.cookie.match(/pb_userId=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : undefined;
  const userId = userIdMatch ? userIdMatch[1] : undefined;
  return { token, userId };
}

const wsClient = createWSClient({
  url: "ws://localhost:3001",
  connectionParams: getConnectionParams,
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
