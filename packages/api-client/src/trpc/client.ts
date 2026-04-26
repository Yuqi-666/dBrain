import { createTRPCClient, httpBatchLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '@workspace/backend-adapter-front';
import type { AnyRouter } from '@trpc/server';

const wsClient = createWSClient({
  url: 'ws://localhost:3001',
});

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({ url: 'http://localhost:3001/trpc' }),
      }),
    ],
  });
}

export const trpcClient = createClient();
