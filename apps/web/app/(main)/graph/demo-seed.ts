import { trpcClient } from "@workspace/api-client";
import { runDevDemoSeed } from "@workspace/dev/MOCK";
import { useWorkspaceStore, useDataStore, useAuthStore } from "@workspace/store";
import { WorkspaceService } from "@workspace/services";

export async function seedDemoIntoCurrentWorkspace(): Promise<void> {
  const userId = useAuthStore.getState().getUserId();
  const wsStore = useWorkspaceStore.getState();
  const current = wsStore.getCurrentWorkspace();

  if (!userId || !current) {
    return;
  }

  await WorkspaceService.open(current.id);

  const dataStore = useDataStore.getState();
  const hasNodes = dataStore.nodes.size > 0;
  if (hasNodes) {
    return;
  }

  await runDevDemoSeed(
    trpcClient as unknown as Parameters<typeof runDevDemoSeed>[0],
    current.id,
  );

  await WorkspaceService.open(current.id);
}
