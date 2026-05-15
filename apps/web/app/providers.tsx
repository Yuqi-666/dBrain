"use client";

import { useEffect, type ReactNode } from "react";
import { TRPCReactProvider } from "@workspace/api-client";
import { useGraphSubscriptions } from "@workspace/api-client";
import { createPocketbaseClient } from "@workspace/api-client";

function GraphSubscriptionProvider(): ReactNode {
  useGraphSubscriptions();
  return null;
}

function PocketbaseInitializer({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    createPocketbaseClient({ url: "http://localhost:8090" });
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
