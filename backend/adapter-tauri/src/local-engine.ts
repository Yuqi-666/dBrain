/** Desktop procedure adapter. Storage and the future sync transport stay outside this engine. */
export type Entity = Record<string, unknown> & { id: string };
export const collections = [
  "workspace",
  "node",
  "edge",
  "view",
  "nodeSemantic",
  "edgeSemantic",
  "nodeTag",
  "dashboard",
] as const;
export type Collection = (typeof collections)[number];
export interface PendingChange {
  sequence: number;
  collection: Collection;
  entityId: string;
  operation: "put" | "delete";
  value?: Entity;
  occurredAt: string;
}
export interface LocalState {
  version: 1;
  sequence: number;
  records: Record<Collection, Entity[]>;
  outbox: PendingChange[];
}
export const localUser = {
  id: "desktop-local",
  nickname: "本地用户",
  email: "",
  avatarUrl: null,
};
export function emptyState(): LocalState {
  return {
    version: 1,
    sequence: 0,
    records: {
      workspace: [],
      node: [],
      edge: [],
      view: [],
      nodeSemantic: [],
      edgeSemantic: [],
      nodeTag: [],
      dashboard: [],
    },
    outbox: [],
  };
}
export class LocalProcedureError extends Error {
  constructor(
    message: string,
    readonly code: "CONFLICT" | "BAD_REQUEST" | "NOT_FOUND" = "BAD_REQUEST",
  ) {
    super(message);
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new LocalProcedureError("Expected an object");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new LocalProcedureError("Expected a nonempty string");
  return value;
}
function put(
  state: LocalState,
  collection: Collection,
  value: Entity,
  now: string,
) {
  const records = state.records[collection];
  const index = records.findIndex((record) => record.id === value.id);
  if (index < 0) records.push(value);
  else records[index] = value;
  state.outbox.push({
    sequence: ++state.sequence,
    collection,
    entityId: value.id,
    operation: "put",
    value: structuredClone(value),
    occurredAt: now,
  });
}
function remove(
  state: LocalState,
  collection: Collection,
  id: string,
  now: string,
) {
  state.records[collection] = state.records[collection].filter(
    (record) => record.id !== id,
  );
  state.outbox.push({
    sequence: ++state.sequence,
    collection,
    entityId: id,
    operation: "delete",
    occurredAt: now,
  });
}
function workspace(state: LocalState, id: unknown) {
  const found = state.records.workspace.find(
    (record) => record.id === text(id),
  );
  if (!found) throw new LocalProcedureError("Workspace not found", "NOT_FOUND");
  return found;
}
function createWorkspace(
  state: LocalState,
  input: Record<string, unknown>,
  now: string,
): Entity {
  const value = {
    ...input,
    id: text(input.id),
    name: text(input.name),
    ownerId: localUser.id,
    createdAt: now,
    updatedAt: now,
  };
  if (state.records.workspace.some((record) => record.id === value.id))
    throw new LocalProcedureError("Workspace already exists", "CONFLICT");
  put(state, "workspace", value, now);
  put(
    state,
    "view",
    {
      id: crypto.randomUUID(),
      name: "全部",
      viewType: "Force",
      visualConfig: { showMinimap: true },
      filterConfig: {},
      isPinned: true,
      workspaceId: value.id,
    },
    now,
  );
  return value;
}

/** Mutates only the transaction's private snapshot. A thrown error must abort its commit. */
export function executeLocal(
  state: LocalState,
  path: string,
  rawInput?: unknown,
  now = new Date().toISOString(),
): unknown {
  const [name, action] = path.split(".");
  const input = rawInput === undefined ? {} : object(rawInput);
  if (name === "auth") {
    if (action === "me") return localUser;
    if (action === "logout") return { success: true };
    throw new LocalProcedureError(
      "Local mode does not use cloud authentication",
    );
  }
  if (name === "file")
    throw new LocalProcedureError(
      "此功能需要桌面文件处理适配器，目前可保留原始文件。",
    );
  if (!collections.includes(name as Collection))
    throw new LocalProcedureError(`Unsupported local procedure: ${path}`);
  const collection = name as Collection;
  const records = state.records[collection];
  if (collection === "workspace" && action === "provisionDefault") {
    return (
      records[0] ??
      createWorkspace(
        state,
        { id: crypto.randomUUID(), name: "本地工作空间" },
        now,
      )
    );
  }
  if (collection === "workspace" && action === "getMembers") {
    const ws = workspace(state, input.workspaceId);
    return [
      {
        id: `owner-${ws.id}`,
        workspaceId: ws.id,
        userId: localUser.id,
        role: "owner",
      },
    ];
  }
  if (collection === "dashboard") {
    workspace(state, input.workspaceId);
    const id = text(input.workspaceId);
    const current = records.find((record) => record.id === id);
    const saved = current?.state ?? {
      revision: 0,
      pages: [],
      candidates: [],
      activePageId: null,
    };
    if (action === "get") return saved;
    if (action === "save") {
      const next = object(input.state);
      if (next.revision !== object(saved).revision)
        throw new LocalProcedureError(
          "Dashboard revision conflict",
          "CONFLICT",
        );
      if (!Array.isArray(next.pages) || !Array.isArray(next.candidates))
        throw new LocalProcedureError("Invalid dashboard state");
      const value = { ...next, revision: Number(next.revision) + 1 };
      put(state, "dashboard", { id, workspaceId: id, state: value }, now);
      return value;
    }
  }
  if (action === "getById")
    return records.find((record) => record.id === input.id) ?? null;
  if (
    ["list", "listByUser", "listByWorkspace", "getPinned"].includes(
      action ?? "",
    )
  ) {
    if (action === "listByWorkspace") workspace(state, input.workspaceId);
    const filter =
      action === "getPinned"
        ? { isPinned: true }
        : action === "listByUser"
          ? {}
          : input;
    return records.filter((record) =>
      Object.entries(filter).every(
        ([key, value]) => value === undefined || record[key] === value,
      ),
    );
  }
  if (action === "add") {
    if (collection === "workspace") return createWorkspace(state, input, now);
    const id = text(input.id);
    if (records.some((record) => record.id === id))
      throw new LocalProcedureError("Entity already exists", "CONFLICT");
    workspace(state, input.workspaceId);
    let defaults: Record<string, unknown> = {};
    if (collection === "node")
      defaults = {
        title: "",
        permission: "private",
        tags: [],
        stateData: { client: {}, server: {} },
      };
    if (collection === "edge") {
      if (input.from === input.to)
        throw new LocalProcedureError("Edge cannot connect a node to itself");
      for (const endpoint of [input.from, input.to]) {
        if (
          !state.records.node.some(
            (node) =>
              node.id === endpoint && node.workspaceId === input.workspaceId,
          )
        )
          throw new LocalProcedureError(
            "Edge endpoint must belong to the same workspace",
          );
      }
      defaults = { stateData: { client: {}, server: {} } };
    }
    if (collection === "view")
      defaults = { filterConfig: {}, visualConfig: { showMinimap: true } };
    const value = { ...defaults, ...input, id, createdAt: now, updatedAt: now };
    put(state, collection, value, now);
    return value;
  }
  const current = records.find((record) => record.id === input.id);
  if (!current) throw new LocalProcedureError("Entity not found", "NOT_FOUND");
  if (action === "update") {
    const updates = object(input.updates);
    if (
      updates.workspaceId !== undefined &&
      updates.workspaceId !== current.workspaceId
    )
      throw new LocalProcedureError(
        "Moving entities between workspaces is unsupported",
      );
    const value: Entity = {
      ...current,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined),
      ),
      id: current.id,
      updatedAt: now,
    };
    for (const key of ["icon", "cover"])
      if (value[key] === null) delete value[key];
    put(state, collection, value, now);
    return value;
  }
  if (action === "delete") {
    if (collection === "workspace") {
      for (const key of collections) {
        if (key === "workspace") continue;
        for (const record of [...state.records[key]])
          if (record.workspaceId === current.id)
            remove(state, key, record.id, now);
      }
    }
    if (collection === "node") {
      for (const edge of [...state.records.edge])
        if (edge.from === current.id || edge.to === current.id)
          remove(state, "edge", edge.id, now);
    }
    remove(state, collection, current.id, now);
    return { success: true, id: current.id };
  }
  throw new LocalProcedureError(`Unsupported local procedure: ${path}`);
}
