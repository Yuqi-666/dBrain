import type { IDomainEvent } from "@workspace/interfaces";
import { useDataStore } from "@workspace/store";
import {
  NodeService,
  EdgeService,
  ViewService,
  NodeSemanticService,
  EdgeSemanticService,
  NodeTagService,
} from "@workspace/services";

export async function handleNodeAdded(event: IDomainEvent): Promise<void> {
  await NodeService.sync([event.data.id as string]);
}

export async function handleNodeUpdated(event: IDomainEvent): Promise<void> {
  await NodeService.sync([event.data.id as string]);
}

export function handleNodeDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteNode(event.data.id as string);
}

export async function handleEdgeAdded(event: IDomainEvent): Promise<void> {
  await EdgeService.sync([event.data.id as string]);
}

export async function handleEdgeUpdated(event: IDomainEvent): Promise<void> {
  await EdgeService.sync([event.data.id as string]);
}

export function handleEdgeDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteEdge(event.data.id as string);
}

export async function handleViewAdded(event: IDomainEvent): Promise<void> {
  await ViewService.sync([event.data.id as string]);
}

export async function handleViewUpdated(event: IDomainEvent): Promise<void> {
  await ViewService.sync([event.data.id as string]);
}

export function handleViewDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteView(event.data.id as string);
}

export async function handleNodeSemanticAdded(event: IDomainEvent): Promise<void> {
  await NodeSemanticService.sync([event.data.id as string]);
}

export async function handleNodeSemanticUpdated(event: IDomainEvent): Promise<void> {
  await NodeSemanticService.sync([event.data.id as string]);
}

export function handleNodeSemanticDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteNodeSemantic(event.data.id as string);
}

export async function handleEdgeSemanticAdded(event: IDomainEvent): Promise<void> {
  await EdgeSemanticService.sync([event.data.id as string]);
}

export async function handleEdgeSemanticUpdated(event: IDomainEvent): Promise<void> {
  await EdgeSemanticService.sync([event.data.id as string]);
}

export function handleEdgeSemanticDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteEdgeSemantic(event.data.id as string);
}

export async function handleNodeTagAdded(event: IDomainEvent): Promise<void> {
  await NodeTagService.sync([event.data.id as string]);
}

export async function handleNodeTagUpdated(event: IDomainEvent): Promise<void> {
  await NodeTagService.sync([event.data.id as string]);
}

export function handleNodeTagDeleted(event: IDomainEvent): void {
  useDataStore.getState().deleteNodeTag(event.data.id as string);
}
