/**
 * Dependency Injection Factory for Adapter-Back
 * Provides singleton instances of repositories and factory functions for DAOs.
 */

import {
  createPocketBaseClient,
  getPocketBaseClient,
  PocketBaseNodeRepository,
  PocketBaseEdgeRepository,
  PocketBaseViewRepository,
  PocketBaseNodeSemanticRepository,
  PocketBaseEdgeSemanticRepository,
  PocketBaseNodeTagRepository,
} from "@workspace/infrastructure";

import type {
  INodeRepository,
  IEdgeRepository,
  IViewRepository,
  INodeSemanticRepository,
  IEdgeSemanticRepository,
  INodeTagRepository,
} from "@workspace/domain/repositories";

import { NodeDao, EdgeDao, ViewDao } from "./dao";

let nodeRepository: INodeRepository | null = null;
let edgeRepository: IEdgeRepository | null = null;
let viewRepository: IViewRepository | null = null;
let nodeSemanticRepository: INodeSemanticRepository | null = null;
let edgeSemanticRepository: IEdgeSemanticRepository | null = null;
let nodeTagRepository: INodeTagRepository | null = null;

export const createNodeRepository = (): INodeRepository => {
  if (!nodeRepository) {
    const pb = getPocketBaseClient();
    nodeRepository = new PocketBaseNodeRepository(pb);
  }
  return nodeRepository;
};

export const createEdgeRepository = (): IEdgeRepository => {
  if (!edgeRepository) {
    edgeRepository = new PocketBaseEdgeRepository();
  }
  return edgeRepository;
};

export const createViewRepository = (): IViewRepository => {
  if (!viewRepository) {
    viewRepository = new PocketBaseViewRepository();
  }
  return viewRepository;
};

export const createNodeSemanticRepository = (): INodeSemanticRepository => {
  if (!nodeSemanticRepository) {
    const pb = getPocketBaseClient();
    nodeSemanticRepository = new PocketBaseNodeSemanticRepository(pb);
  }
  return nodeSemanticRepository;
};

export const createEdgeSemanticRepository = (): IEdgeSemanticRepository => {
  if (!edgeSemanticRepository) {
    edgeSemanticRepository = new PocketBaseEdgeSemanticRepository();
  }
  return edgeSemanticRepository;
};

export const createNodeTagRepository = (): INodeTagRepository => {
  if (!nodeTagRepository) {
    nodeTagRepository = new PocketBaseNodeTagRepository();
  }
  return nodeTagRepository;
};

export const createNodeDao = (): NodeDao => {
  return new NodeDao(createNodeRepository());
};

export const createEdgeDao = (): EdgeDao => {
  return new EdgeDao(createEdgeRepository());
};

export const createViewDao = (): ViewDao => {
  return new ViewDao(createViewRepository());
};

export const createAll = () => ({
  nodeRepository: createNodeRepository(),
  edgeRepository: createEdgeRepository(),
  viewRepository: createViewRepository(),
  nodeSemanticRepository: createNodeSemanticRepository(),
  edgeSemanticRepository: createEdgeSemanticRepository(),
  nodeTagRepository: createNodeTagRepository(),
  nodeDao: createNodeDao(),
  edgeDao: createEdgeDao(),
  viewDao: createViewDao(),
});

export { createPocketBaseClient, getPocketBaseClient } from "@workspace/infrastructure";
