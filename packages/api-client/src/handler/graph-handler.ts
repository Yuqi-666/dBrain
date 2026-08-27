import { useDataStore } from "@workspace/store";
import {
  NodeService,
  EdgeService,
  ViewService,
  NodeSemanticService,
  EdgeSemanticService,
  NodeTagService,
} from "@workspace/services";

type DomainEventHandler = { eventType: string; data: unknown };

function dataId(event: DomainEventHandler): string {
  return (event.data as { id: string }).id;
}

export async function handleNodeAdded(event: DomainEventHandler): Promise<void> {
  await NodeService.sync([dataId(event)]);
}

export async function handleNodeUpdated(event: DomainEventHandler): Promise<void> {
  await NodeService.sync([dataId(event)]);
}

export function handleNodeDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteNode(dataId(event));
}

export async function handleEdgeAdded(event: DomainEventHandler): Promise<void> {
  await EdgeService.sync([dataId(event)]);
}

export async function handleEdgeUpdated(event: DomainEventHandler): Promise<void> {
  await EdgeService.sync([dataId(event)]);
}

export function handleEdgeDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteEdge(dataId(event));
}

export async function handleViewAdded(event: DomainEventHandler): Promise<void> {
  await ViewService.sync([dataId(event)]);
}

export async function handleViewUpdated(event: DomainEventHandler): Promise<void> {
  await ViewService.sync([dataId(event)]);
}

export function handleViewDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteView(dataId(event));
}

export async function handleNodeSemanticAdded(event: DomainEventHandler): Promise<void> {
  await NodeSemanticService.sync([dataId(event)]);
}

export async function handleNodeSemanticUpdated(event: DomainEventHandler): Promise<void> {
  await NodeSemanticService.sync([dataId(event)]);
}

export function handleNodeSemanticDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteNodeSemantic(dataId(event));
}

export async function handleEdgeSemanticAdded(event: DomainEventHandler): Promise<void> {
  await EdgeSemanticService.sync([dataId(event)]);
}

export async function handleEdgeSemanticUpdated(event: DomainEventHandler): Promise<void> {
  await EdgeSemanticService.sync([dataId(event)]);
}

export function handleEdgeSemanticDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteEdgeSemantic(dataId(event));
}

export async function handleNodeTagAdded(event: DomainEventHandler): Promise<void> {
  await NodeTagService.sync([dataId(event)]);
}

export async function handleNodeTagUpdated(event: DomainEventHandler): Promise<void> {
  await NodeTagService.sync([dataId(event)]);
}

export function handleNodeTagDeleted(event: DomainEventHandler): void {
  useDataStore.getState().deleteNodeTag(dataId(event));
}
