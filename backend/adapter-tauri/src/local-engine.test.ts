import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  executeLocal,
  LocalProcedureError,
} from "./local-engine.ts";

const create = (state: ReturnType<typeof emptyState>, id: string) =>
  executeLocal(state, "workspace.add", { id, name: id });
const addNode = (
  state: ReturnType<typeof emptyState>,
  id: string,
  workspaceId: string,
) =>
  executeLocal(state, "node.add", {
    id,
    workspaceId,
    nodeType: "text",
    semanticId: "s",
    content: { docs: {} },
  });

test("offline provisioning is idempotent and creates a usable global view", () => {
  const state = emptyState();
  executeLocal(state, "workspace.provisionDefault");
  executeLocal(state, "workspace.provisionDefault");
  assert.equal(state.records.workspace.length, 1);
  assert.equal(state.records.view.length, 1);
  assert.equal(
    state.records.view[0]?.workspaceId,
    state.records.workspace[0]?.id,
  );
});
test("restart snapshot retains rich content and queries isolate workspaces", () => {
  const state = emptyState();
  create(state, "a");
  create(state, "b");
  addNode(state, "n", "a");
  addNode(state, "other", "b");
  const content = {
    docs: {
      main: { type: "doc", content: [{ type: "paragraph", text: "离线内容" }] },
    },
  };
  executeLocal(state, "node.update", { id: "n", updates: { content } });
  const restarted = JSON.parse(JSON.stringify(state));
  const nodes = executeLocal(restarted, "node.listByWorkspace", {
    workspaceId: "a",
  }) as { id: string; content: unknown }[];
  assert.deepEqual(
    nodes.map((node) => node.id),
    ["n"],
  );
  assert.deepEqual(nodes[0]?.content, content);
});
test("cross-workspace edges and entity moves are rejected", () => {
  const state = emptyState();
  create(state, "a");
  create(state, "b");
  addNode(state, "n", "a");
  addNode(state, "m", "b");
  assert.throws(
    () =>
      executeLocal(state, "edge.add", {
        id: "e",
        from: "n",
        to: "m",
        workspaceId: "a",
      }),
    LocalProcedureError,
  );
  assert.throws(
    () =>
      executeLocal(state, "node.update", {
        id: "n",
        updates: { workspaceId: "b" },
      }),
    LocalProcedureError,
  );
});
test("workspace deletion cascades all scoped entities and records tombstones", () => {
  const state = emptyState();
  create(state, "a");
  create(state, "b");
  addNode(state, "n", "a");
  addNode(state, "m", "a");
  addNode(state, "other", "b");
  executeLocal(state, "edge.add", {
    id: "e",
    from: "n",
    to: "m",
    workspaceId: "a",
  });
  executeLocal(state, "nodeSemantic.add", {
    id: "s",
    name: "类型",
    workspaceId: "a",
  });
  executeLocal(state, "dashboard.save", {
    workspaceId: "a",
    state: { revision: 0, pages: [], candidates: [], activePageId: null },
  });
  executeLocal(state, "workspace.delete", { id: "a" });
  for (const records of Object.values(state.records))
    assert.equal(
      records.some((record) => record.workspaceId === "a" || record.id === "a"),
      false,
    );
  assert.equal(state.records.node[0]?.id, "other");
  for (const id of ["a", "n", "m", "e", "s"])
    assert.ok(
      state.outbox.some(
        (change) => change.entityId === id && change.operation === "delete",
      ),
    );
});
test("dashboard optimistic revisions prevent stale overwrites", () => {
  const state = emptyState();
  create(state, "a");
  const input = {
    workspaceId: "a",
    state: { revision: 0, pages: [], candidates: [], activePageId: null },
  };
  executeLocal(state, "dashboard.save", input);
  assert.throws(
    () => executeLocal(state, "dashboard.save", input),
    (error: unknown) =>
      error instanceof LocalProcedureError && error.code === "CONFLICT",
  );
  assert.equal(
    (
      executeLocal(state, "dashboard.get", { workspaceId: "a" }) as {
        revision: number;
      }
    ).revision,
    1,
  );
});
test("outbox snapshots are immutable and sequences remain monotonic", () => {
  const state = emptyState();
  create(state, "a");
  addNode(state, "n", "a");
  executeLocal(state, "node.update", { id: "n", updates: { title: "edited" } });
  const changes = state.outbox.filter((change) => change.entityId === "n");
  assert.equal(changes[0]?.value?.title, "");
  assert.equal(changes[1]?.value?.title, "edited");
  assert.deepEqual(
    state.outbox.map((change) => change.sequence),
    state.outbox.map((_, index) => index + 1),
  );
});
