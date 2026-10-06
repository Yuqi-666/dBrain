"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@workspace/store";
import { trpc, clearAuthSession } from "@workspace/api-client";
import { DynamicIslandHost } from "@/components/dynamic-island-host";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setUser } = useAuthStore();

  // Always verify the session against the server. `me` is protected → its
  // context is server-verified from the WS token, so this is the source of
  // truth even when zustand was rehydrated from localStorage.
  const { data: currentUser, isError, isLoading } = trpc.auth.me.useQuery(
    undefined,
    { retry: false },
  );

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  useEffect(() => {
    if (isError) {
      // Server rejected the token (user deleted, expired, revoked, or absent):
      // clear client state AND the `pb_token` cookie. Clearing the cookie is
      // essential — the edge middleware only checks JWT expiry, so an uncleared
      // cookie keeps bouncing /login back to /graph, leaving this layout stuck
      // on a blank screen.
      useAuthStore.getState().clearAuth();
      clearAuthSession();
      router.push("/login");
    }
  }, [isError, router]);

  // Gate on the server-confirmed user, never on the persisted `isAuthenticated`
  // (which can read stale `true` after the DB user was deleted). While the
  // server is still verifying, show a loading state instead of a blank screen.
  if (!currentUser) {
    if (isError) {
      // The redirect effect above navigates to /login; render nothing to avoid
      // a flash of the authenticated shell.
      return null;
    }
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  // The island is mounted **inside** the authenticated branch: an unauthenticated
  // visitor must never see the capsule, and the confirmation must not flash it
  // (docs/plan/dynamic-island.md §M4.2-1).
  return (
    <>
      {children}
      <DynamicIslandHost />
    </>
  );
}
