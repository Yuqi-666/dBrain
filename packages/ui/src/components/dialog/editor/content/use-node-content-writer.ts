"use client";

import { useCallback, useRef } from "react";
import type { NodeData, NodeDataType, NodeId } from "@workspace/interfaces";
import { NodeService } from "@workspace/services";
import { useDataStore } from "@workspace/store";

/** What {@link useNodeContentWriter} hands back to a node-content host. */
export interface NodeContentWriter<C> {
  /** The freshest content, read back from the store (never this render's snapshot). */
  liveContent(): C;
  /** Queue a content-half patch; patches raised in the same tick merge into one write. */
  patchContent(patch: Partial<C>): void;
}

/**
 * The shared content writer every node-content host uses.
 *
 * `database-node-content.tsx` and `collection-node-content.tsx` carried this
 * logic twice; this hook is a **dedup**, not a refactor. The concurrency
 * semantics are load-bearing and must stay verbatim: one gesture is one write,
 * several patches raised in the same tick merge into a single upsert, and the
 * drain keeps emptying the queue while it is running.
 *
 * Two rules make content persistence safe:
 *
 * 1. **Patch the freshest content, never the render's copy.** One gesture can
 *    report two changes (adding a field writes its column config _and_ the
 *    field), and a patch built from a snapshot taken before the first write
 *    silently drops it. {@link NodeContentWriter.liveContent} therefore reads
 *    the node back from the store; `NodeService.upsert` updates the store
 *    optimistically and synchronously, so the second read sees the first write.
 * 2. **Serialize the writes.** Two writes for the same node must never be in
 *    flight together: PocketBase's SDK cancels a pending request when another
 *    one for the same record starts (the repositories pass the record id as the
 *    `requestKey`), which used to abort the first half of a gesture and roll the
 *    store back — the new row of an empty table flashed and vanished with
 *    `TRPCClientError: The request was aborted (most likely autocancelled…)`.
 *    A microtask-queued drain merges every patch raised in the same tick into a
 *    single upsert, then awaits it before sending the next.
 *
 * @param nodeId   the node whose `content` is being written
 * @param nodeType guards `liveContent` against reading another node type's content
 * @param fallback this render's content, used only when the store has no live node
 * @param label    prefix for the error log; defaults to `nodeType`
 */
export function useNodeContentWriter<C>(
  nodeId: NodeId,
  nodeType: NodeDataType,
  fallback: C,
  label?: string,
): NodeContentWriter<C> {
  const liveContent = useCallback((): C => {
    const live = useDataStore.getState().nodes.get(nodeId);
    return live?.nodeType === nodeType ? (live.content as C) : fallback;
  }, [fallback, nodeId, nodeType]);

  /** Patches queued for the current drain; merged one write at a time. */
  const pendingPatches = useRef<Partial<C>[]>([]);
  const draining = useRef(false);
  const drainScheduled = useRef(false);

  const drainWrites = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      // Re-checks the queue every round, so a patch raised while a write is in
      // flight is picked up instead of being left to a later gesture.
      while (pendingPatches.current.length > 0) {
        const merged = Object.assign(
          {},
          ...pendingPatches.current.splice(0),
        ) as Partial<C>;
        const current = liveContent();
        try {
          // `C` is the content half of one node type; TypeScript cannot see that
          // through the generic, so assert at this single boundary.
          await NodeService.upsert(nodeId, {
            content: { ...current, ...merged },
          } as unknown as Partial<NodeData>);
        } catch (error) {
          console.error(
            `[${label ?? nodeType} content] Failed to persist content`,
            error,
          );
        }
      }
    } finally {
      draining.current = false;
    }
  }, [label, liveContent, nodeId, nodeType]);

  const patchContent = useCallback(
    (patch: Partial<C>) => {
      pendingPatches.current.push(patch);
      if (draining.current || drainScheduled.current) return;
      drainScheduled.current = true;
      queueMicrotask(() => {
        drainScheduled.current = false;
        void drainWrites();
      });
    },
    [drainWrites],
  );

  return { liveContent, patchContent };
}
