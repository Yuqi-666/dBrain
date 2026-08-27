"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@workspace/store";
import { trpc } from "@workspace/api-client";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();

  // Always verify the session against the server. `me` is protected → its
  // context is server-verified from the WS token, so this is the source of
  // truth even when zustand was rehydrated from localStorage.
  const { data: currentUser, isError } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  useEffect(() => {
    if (isError) {
      // Server rejected the token (expired, revoked, or absent): clear client
      // state and redirect to login.
      useAuthStore.getState().clearAuth();
      router.push("/login");
    }
  }, [isError, router]);

  if (!isAuthenticated && !currentUser) {
    return null;
  }
  return children;
}
