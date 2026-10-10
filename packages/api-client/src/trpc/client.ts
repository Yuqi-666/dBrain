import {
  createTRPCClient,
  wsLink,
  createWSClient,
  type TRPCWebSocketClient,
} from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/adapter-front";
import { useSourceIdStore } from "@workspace/store";
import { isTokenExpired } from "pocketbase";
import {
  setAuthSession,
  clearAuthSession,
  decodeJwtPayload,
} from "../auth/session";
import { resolveBackendUrls } from "../backend-urls";
import { localLink } from "./local-link";

const isDesktop = process.env.NEXT_PUBLIC_DBRAIN_PLATFORM === "desktop";

const TOKEN_COOKIE = "pb_token";

function readToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const match = document.cookie.match(/pb_token=([^;]+)/);
  if (!match?.[1]) {
    return undefined;
  }
  return decodeURIComponent(match[1]);
}

function getConnectionParams() {
  const sourceId = useSourceIdStore.getState().getSourceId();
  const token = readToken();
  const params: { token?: string; sourceId: string } = { sourceId };
  if (token) {
    params.token = token;
  }
  return params;
}

const wsClient: TRPCWebSocketClient | undefined = isDesktop
  ? undefined
  : createWSClient({
      // Loopback → ws://localhost:3001; proxied origin → wss://<host>/trpc.
      // See ../backend-urls.ts.
      url: resolveBackendUrls().trpc,
      connectionParams: getConnectionParams,
    });

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: isDesktop
      ? [localLink]
      : [
          wsLink({
            client: wsClient!,
            transformer: superjson,
          }),
        ],
  });
}

export const trpcClient = createClient();

/**
 * Close the underlying WebSocket so the next operation re-handshakes with the
 * freshly set/cleared cookie. Call after login/register/logout.
 */
export function reconnectTRPCClient(): void {
  return void wsClient?.close();
}

/**
 * Silently renew the auth token before it lapses.
 * PocketBase `token` is a JWT with an `exp` claim; when it is within the renewal
 * window, call `auth.refresh`, persist the new token to the same cookie, and
 * reconnect the WS so the new token is used for subsequent operations.
 */
export function scheduleTokenRefresh(token: string): number {
  if (isTokenExpired(token)) {
    return NaN;
  }
  const payload = decodeJwtPayload(token) as { exp?: number };
  if (typeof payload.exp !== "number") {
    return NaN;
  }
  const msUntilExpiry = payload.exp * 1000 - Date.now();
  const delay = Math.max(msUntilExpiry - 60_000, 5_000);
  return window.setTimeout(async () => {
    try {
      const res = await trpcClient.auth.refresh.mutate();
      if (res?.token) {
        setAuthSession(res.token);
        reconnectTRPCClient();
        scheduleTokenRefresh(res.token);
      }
    } catch {
      // Session exhausted; clear client state so the UI redirects to login.
      clearAuthSession();
      window.location.href = "/login";
    }
  }, delay);
}
