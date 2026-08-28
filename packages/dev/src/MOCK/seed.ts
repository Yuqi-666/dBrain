import { DEMO_NODE_SEMANTICS, DEMO_NODES, DEMO_EDGES, DEMO_EDGE_SEMANTICS, DEMO_VIEWS } from "./demo-data";
import type { DemoNodeSeed } from "./demo-data";

/**
 * A minimal client-shaped type that the seeded workspace needs. It mirrors the
 * nodes of `@workspace/api-client`'s `trpcClient` that the demo seed uses, so
 * the data definitions stay transport-agnostic (mock runs in-browser in dev).
 * The caller (web graph page) passes the live `trpcClient`.
 */
export interface DevSeedClient {
  node: {
    add: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
    listByWorkspace: {
      query: (input: { workspaceId: string }) => Promise<Array<{ id: string; title: string }>>;
    };
  };
  edge: {
    add: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
  };
  view: {
    add: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
    update: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
  };
  nodeSemantic: {
    add: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
    listByWorkspace: {
      query: (input: { workspaceId: string }) => Promise<Array<{ id: string; name: string }>>;
    };
  };
  edgeSemantic: {
    add: {
      mutate: (input: Record<string, unknown>) => Promise<{ id: string }>;
    };
    listByWorkspace: {
      query: (input: { workspaceId: string }) => Promise<Array<{ id: string; name: string }>>;
    };
  };
}

function nodePayload(seed: DemoNodeSeed, workspaceId: string): Record<string, unknown> {
  const base = {
    // `tmp_` prefix makes the backend repo use its CREATE branch (the repo
    // strips client ids and PocketBase generates a fresh 15-char id).
    id: `tmp_${seed.id}`,
    title: seed.title,
    abstract: seed.abstract,
    permission: seed.permission,
    semanticId: seed.semanticId,
    isPinned: seed.isPinned,
    stateData: seed.stateData,
    workspaceId,
  } as Record<string, unknown>;

  switch (seed.nodeType) {
    case "rich-text":
      return { ...base, nodeType: "rich-text" as const, content: { referencedNodes: seed.referencedNodes ?? [], docs: seed.docs ?? {} } };
    case "text":
      return { ...base, nodeType: "text" as const, content: { docs: seed.docs ?? {} } };
    case "website":
      return { ...base, nodeType: "website" as const, content: { url: seed.webUrl ?? "", faviconUrl: seed.faviconUrl } };
    case "image":
      return { ...base, nodeType: "image" as const, width: seed.width ?? 2048, height: seed.height ?? 1024, fileSize: 0, shootingTime: seed.shootingTime, content: { url: seed.imageUrl ?? "" } };
    case "pdf":
      return { ...base, nodeType: "pdf" as const, pageCount: seed.pageCount ?? 1, fileSize: 0, content: { url: seed.pdfUrl ?? "", coverUrl: seed.coverUrl ?? "" } };
    case "webpage":
      return { ...base, nodeType: "webpage" as const, content: { html: seed.webpageHtml ?? "", url: seed.webpageUrl ?? "", screenshotUrl: seed.screenshotUrl } };
    case "video":
      return { ...base, nodeType: "video" as const, duration: seed.duration ?? 0, source: seed.source ?? "online", fileSize: 0, content: { url: seed.videoUrl ?? "", coverUrl: seed.coverUrl ?? "" } };
    case "audio":
      return { ...base, nodeType: "audio" as const, duration: seed.duration ?? 0, fileSize: 0, content: { url: seed.audioUrl ?? "" } };
    case "collection":
      return { ...base, nodeType: "collection" as const, content: { filterConfig: null } };
    default:
      return base;
  }
}

/**
 * Seed a demo cognitive-graph into a workspace using the injected tRPC client.
 *
 * The backend repositories strip client-supplied `id` values and let PocketBase
 * generate real ids, so the demo's stable ids (`demo-node-*`, `demo-sem-*`) are
 * NOT preserved. We therefore capture every returned id and build a remap:
 * `nodeIdMap[demoId] → realId`, `semanticIdMap[seedName] → realId`, so edges,
 * node semanticIds and view `selectedNodes` all point at the real stored ids.
 *
 * Returned ids referenced here are 15-char PocketBase ids. Cross-refs are keyed
 * by the SEED's stable logical id (for nodes/edges) or the semantic NAME (for
 * semantics, which are matched by name for idempotency).
 */
export async function runDevDemoSeed(
  client: DevSeedClient,
  workspaceId: string,
): Promise<boolean> {
  // 1. Node semantics — match by NAME so re-running is idempotent and yields
  //    the same real id (no matter what id the backend generated). Semantics are
  //    workspace-scoped, so the lookup + creation are isolated to `workspaceId`.
  const existingSemantics = await client.nodeSemantic.listByWorkspace.query({ workspaceId });
  const semanticByName = new Map(
    existingSemantics.map((s) => [s.name, s.id]),
  );
  const semanticIdMap = new Map<string, string>();
  for (const sem of DEMO_NODE_SEMANTICS) {
    let realId = semanticByName.get(sem.name);
    if (!realId) {
      const created = await client.nodeSemantic.add.mutate({
        id: `tmp_nsem_${sem.id}`,
        name: sem.name,
        color: sem.color,
        workspaceId,
      });
      realId = created.id;
    }
    semanticIdMap.set(sem.id, realId);
  }

  // Edge semantics — same by-name idempotency, workspace-scoped.
  const existingEdgeSemantics = await client.edgeSemantic.listByWorkspace.query({ workspaceId });
  const edgeSemanticByName = new Map(
    existingEdgeSemantics.map((s) => [s.name, s.id]),
  );
  const edgeSemanticIdMap = new Map<string, string>();
  for (const esem of DEMO_EDGE_SEMANTICS) {
    let realId = edgeSemanticByName.get(esem.name);
    if (!realId) {
      const created = await client.edgeSemantic.add.mutate({
        id: `tmp_esem_${esem.id}`,
        name: esem.name,
        category: esem.category,
        color: esem.color,
        workspaceId,
      });
      realId = created.id;
    }
    edgeSemanticIdMap.set(esem.id, realId);
  }

  // 2. Nodes — need to be referenced deterministically for the edges, but the
  //    backend generates real ids. Build nodeIdMap[seedLogicalId] → realId.
  const nodeIdMap = new Map<string, string>();

  // Existing nodes in this workspace, keyed by title, for idempotency across
  // re-runs (the backend gives each created node a fresh id, so re-seeding
  // would otherwise duplicate the demo nodes).
  const existingNodes = await client.node.listByWorkspace.query({ workspaceId });
  const nodeByTitle = new Map(existingNodes.map((n) => [n.title, n.id]));
  for (const node of DEMO_NODES) {
    const existing = nodeByTitle.get(node.title);
    if (existing) {
      nodeIdMap.set(node.id, existing);
      continue;
    }

    const payload = nodePayload(node, workspaceId);
    // Node payload carries the seed semanticId; remap to the real semantic id.
    payload.semanticId = semanticIdMap.get(node.semanticId) ?? node.semanticId;
    try {
      const created = await client.node.add.mutate(payload);
      nodeIdMap.set(node.id, created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate|already/i.test(msg)) {
        console.warn("[dev-seed] node add skipped:", msg);
      }
    }
  }

  // 3. Edges — remap from/to and semanticId via the id maps.
  for (const edge of DEMO_EDGES) {
    const from = nodeIdMap.get(edge.from) ?? edge.from;
    const to = nodeIdMap.get(edge.to) ?? edge.to;
    const semanticId =
      edgeSemanticIdMap.get(edge.semanticId) ?? edge.semanticId;
    try {
      await client.edge.add.mutate({
        id: `tmp_${edge.id}`,
        from,
        to,
        direction: edge.direction,
        semanticId,
        stateData: { client: {}, server: { weight: edge.weight } },
        workspaceId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate|already/i.test(msg)) {
        console.warn("[dev-seed] edge add skipped:", msg);
      }
    }
  }

  // 4. Views — a view's `filterConfig.selectedNodes` references nodes; remap
  //    them to real ids. The tRPC `view.add` schema reads the filter via
  //    `filter`, not `filterConfig`. `visualConfig` is not accepted by `add`,
  //    so it is applied via `view.update` after creation.
  for (const view of DEMO_VIEWS) {
    const filter = { ...view.filterConfig };
    if (filter.selectedNodes) {
      filter.selectedNodes = filter.selectedNodes.map(
        (nodeId) => nodeIdMap.get(nodeId) ?? nodeId,
      );
    }
    try {
      const created = await client.view.add.mutate({
        id: `tmp_view_${view.name}`,
        name: view.name,
        viewType: view.viewType,
        filter,
        isPinned: view.isPinned,
        workspaceId,
      });
      if (view.visualConfig) {
        await client.view.update.mutate({
          id: created.id,
          updates: { visualConfig: view.visualConfig },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate|already/i.test(msg)) {
        console.warn("[dev-seed] view add skipped:", msg);
      }
    }
  }

  return true;
}
