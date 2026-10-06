"use client";

import { useEffect, type ReactNode } from "react";
import { TRPCReactProvider } from "@workspace/api-client";
import { useGraphSubscriptions } from "@workspace/api-client";
import { createPocketbaseClient, resolveBackendUrls } from "@workspace/api-client";

function GraphSubscriptionProvider(): ReactNode {
  useGraphSubscriptions();
  return null;
}

function PocketbaseInitializer({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    // Loopback → http://localhost:8090; proxied origin → <origin>/pb.
    // See packages/api-client/src/backend-urls.ts.
    createPocketbaseClient({ url: resolveBackendUrls().pocketbase });
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }): ReactNode {
  return (
    <PocketbaseInitializer>
      <TRPCReactProvider>
        <GraphSubscriptionProvider />
        {children}
      </TRPCReactProvider>
    </PocketbaseInitializer>
  );
}
