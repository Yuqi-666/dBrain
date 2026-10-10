"use client";

import type { ReactNode } from "react";
import { TRPCReactProvider } from "@workspace/api-client";

export function Providers({ children }: { children: ReactNode }) {
  return <TRPCReactProvider>{children}</TRPCReactProvider>;
}
