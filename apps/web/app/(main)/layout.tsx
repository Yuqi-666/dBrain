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
  const { user, setUser, isAuthenticated } = useAuthStore();

  const { data: currentUser, isError } = trpc.auth.me.useQuery(undefined, {
    enabled: !isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  useEffect(() => {
    if (isError || !isAuthenticated) {
      router.push("/login");
    }
  }, [isError, isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
