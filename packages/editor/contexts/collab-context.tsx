"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MockCollabProvider } from "@workspace/editor/lib/mock-collab";
import { Doc as YDoc } from "yjs";
import {
  fetchCollabToken,
  getUrlParam,
  TIPTAP_COLLAB_DOC_PREFIX,
} from "@workspace/editor/lib/tiptap-collab-utils";

export type CollabContextValue = {
  provider: MockCollabProvider | null;
  ydoc: YDoc;
  hasCollab: boolean;
  setupError: boolean;
};

export const CollabContext = createContext<CollabContextValue>({
  hasCollab: false,
  provider: null,
  ydoc: new YDoc(),
  setupError: false,
});

export const CollabConsumer = CollabContext.Consumer;
export const useCollab = (): CollabContextValue => {
  const context = useContext(CollabContext);
  if (!context) {
    throw new Error("useCollab must be used within an CollabProvider");
  }
  return context;
};

export const useCollaboration = (room: string) => {
  const [provider, setProvider] = useState<MockCollabProvider | null>(null);
  const [collabToken, setCollabToken] = useState<string | null>(null);
  const [hasCollab, setHasCollab] = useState<boolean>(true);
  const [setupError, setSetupError] = useState<boolean>(false);
  const ydoc = useMemo(() => new YDoc(), []);

  useEffect(() => {
    const noCollabParam = getUrlParam("noCollab");
    setHasCollab(parseInt(noCollabParam || "0") !== 1);
  }, []);

  useEffect(() => {
    if (!hasCollab) return;

    const getToken = async () => {
      const token = await fetchCollabToken();
      setCollabToken(token);
      // If hasCollab is true but token is null, there's a setup error
      if (!token) {
        setSetupError(true);
      }
    };

    getToken();
  }, [hasCollab]);

  useEffect(() => {
    if (!hasCollab || !collabToken) return;

    const docPrefix = TIPTAP_COLLAB_DOC_PREFIX;
    const documentName = room ? `${docPrefix}${room}` : docPrefix;

    const newProvider = new MockCollabProvider({
      name: documentName,
      document: ydoc,
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
  }, [collabToken, ydoc, room, hasCollab]);

  return { provider, ydoc, hasCollab, setupError };
};

export function CollabProvider({
  children,
  room,
}: Readonly<{
  children: React.ReactNode;
  room: string;
}>) {
  const { hasCollab, provider, ydoc, setupError } = useCollaboration(room);

  const value = useMemo<CollabContextValue>(
    () => ({
      hasCollab,
      provider,
      ydoc,
      setupError,
    }),
    [hasCollab, provider, ydoc, setupError],
  );

  return (
    <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
  );
}
