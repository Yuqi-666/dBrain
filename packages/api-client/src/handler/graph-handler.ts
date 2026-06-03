import type { IDomainEvent } from "@workspace/interfaces";
import { GraphCQRS } from "../cqrs/graph-cqrs";

export async function handleNodeAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNode([event.data.id as string]);
}

export async function handleNodeUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNode([event.data.id as string]);
}

export function handleNodeDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteNode(event.data.id as string);
}

export async function handleEdgeAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncEdge([event.data.id as string]);
}

export async function handleEdgeUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncEdge([event.data.id as string]);
}

export function handleEdgeDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteEdge(event.data.id as string);
}

export async function handleViewAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncView([event.data.id as string]);
}

export async function handleViewUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncView([event.data.id as string]);
}

export function handleViewDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteView(event.data.id as string);
}

export async function handleNodeSemanticAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNodeSemantic([event.data.id as string]);
}

export async function handleNodeSemanticUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNodeSemantic([event.data.id as string]);
}

export function handleNodeSemanticDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteNodeSemantic(event.data.id as string);
}

export async function handleEdgeSemanticAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncEdgeSemantic([event.data.id as string]);
}

export async function handleEdgeSemanticUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncEdgeSemantic([event.data.id as string]);
}

export function handleEdgeSemanticDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteEdgeSemantic(event.data.id as string);
}

export async function handleNodeTagAdded(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNodeTag([event.data.id as string]);
}

export async function handleNodeTagUpdated(event: IDomainEvent): Promise<void> {
  await GraphCQRS.syncNodeTag([event.data.id as string]);
}

export function handleNodeTagDeleted(event: IDomainEvent): void {
  const { useDataStore } = require("@workspace/store");
  useDataStore.getState().deleteNodeTag(event.data.id as string);
}