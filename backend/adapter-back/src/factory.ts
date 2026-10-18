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
  PocketBaseUserRepository,
  PocketBaseWorkspaceRepository,
  PocketBaseDashboardRepository,
  PocketBaseWorkspaceMemberRepository,
  PdfDocumentAnalyzer,
  PocketBaseFileStore,
  PocketBaseStorageUsage,
  PocketBaseMediaAnalysis,
  FileUploadSessionStore,
  FfmpegVideoTranscoder,
} from "@workspace/infrastructure";

import type {
  INodeRepository,
  IEdgeRepository,
  IViewRepository,
  INodeSemanticRepository,
  IEdgeSemanticRepository,
  INodeTagRepository,
  IUserRepository,
  IWorkspaceRepository,
  IDashboardRepository,
  IWorkspaceMemberRepository,
  IDocumentAnalyzer,
  IFileStore,
  IStorageUsageReader,
  IMediaAnalysisStore,
  IUploadSessionStore,
  IVideoTranscoder,
} from "@workspace/domain";

import {
  NodeDao,
  EdgeDao,
  ViewDao,
  UserDao,
  NodeSemanticDao,
  EdgeSemanticDao,
  NodeTagDao,
} from "./dao";

let nodeRepository: INodeRepository | null = null;
let edgeRepository: IEdgeRepository | null = null;
let viewRepository: IViewRepository | null = null;
let nodeSemanticRepository: INodeSemanticRepository | null = null;
let edgeSemanticRepository: IEdgeSemanticRepository | null = null;
let nodeTagRepository: INodeTagRepository | null = null;
let userRepository: IUserRepository | null = null;
let workspaceRepository: IWorkspaceRepository | null = null;
let workspaceMemberRepository: IWorkspaceMemberRepository | null = null;

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

export const createUserRepository = (): IUserRepository => {
  if (!userRepository) {
    const pb = getPocketBaseClient();
    userRepository = new PocketBaseUserRepository(pb);
  }
  return userRepository;
};

export const createWorkspaceRepository = (): IWorkspaceRepository => {
  if (!workspaceRepository) {
    workspaceRepository = new PocketBaseWorkspaceRepository();
  }
  return workspaceRepository;
};

export const createWorkspaceMemberRepository =
  (): IWorkspaceMemberRepository => {
    if (!workspaceMemberRepository) {
      workspaceMemberRepository = new PocketBaseWorkspaceMemberRepository();
    }
    return workspaceMemberRepository;
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

export const createUserDao = (): UserDao => {
  return new UserDao(createUserRepository());
};

export const createNodeSemanticDao = (): NodeSemanticDao => {
  return new NodeSemanticDao(createNodeSemanticRepository());
};

export const createEdgeSemanticDao = (): EdgeSemanticDao => {
  return new EdgeSemanticDao(createEdgeSemanticRepository());
};

export const createNodeTagDao = (): NodeTagDao => {
  return new NodeTagDao(createNodeTagRepository());
};

let documentAnalyzer: IDocumentAnalyzer | null = null;
let fileStore: IFileStore | null = null;

export const createDocumentAnalyzer = (): IDocumentAnalyzer => {
  if (!documentAnalyzer) {
    documentAnalyzer = new PdfDocumentAnalyzer();
  }
  return documentAnalyzer;
};

export const createFileStore = (): IFileStore => {
  if (!fileStore) {
    fileStore = new PocketBaseFileStore(getPocketBaseClient());
  }
  return fileStore;
};

let uploadSessionStore: IUploadSessionStore | null = null;

/**
 * Chunk spool for the resumable upload path. Unlike the other factories this one
 * takes its root directory from the caller, because the spool has to be able to
 * live somewhere other than the system temporary directory (a deployment may
 * mount a dedicated volume for it); `rootDir` therefore only applies to the
 * first call, and the remaining calls share the singleton the process resolved.
 */
export const createFileUploadSessionStore = (
  rootDir?: string,
): IUploadSessionStore => {
  if (!uploadSessionStore) {
    uploadSessionStore = new FileUploadSessionStore(rootDir);
  }
  return uploadSessionStore;
};

let storageUsageReader: IStorageUsageReader | null = null;

/**
 * Per-user byte total for the quota check. Reads the `files` collection through
 * the request-scoped PocketBase client, so it sees exactly the records the
 * current caller is allowed to write.
 */
export const createStorageUsageReader = (): IStorageUsageReader => {
  if (!storageUsageReader) {
    storageUsageReader = new PocketBaseStorageUsage(getPocketBaseClient());
  }
  return storageUsageReader;
};

let mediaAnalysisStore: IMediaAnalysisStore | null = null;

/**
 * The analysis cache on a resource record. Reads and writes go through the
 * request-scoped client, so the collection rules decide who may cache: the
 * owner stores, a workspace teammate only reads.
 */
export const createMediaAnalysisStore = (): IMediaAnalysisStore => {
  if (!mediaAnalysisStore) {
    mediaAnalysisStore = new PocketBaseMediaAnalysis(getPocketBaseClient());
  }
  return mediaAnalysisStore;
};

let videoTranscoder: IVideoTranscoder | null = null;

export const createVideoTranscoder = (): IVideoTranscoder => {
  if (!videoTranscoder) {
    videoTranscoder = new FfmpegVideoTranscoder();
  }
  return videoTranscoder;
};

export const createAll = () => ({
  nodeRepository: createNodeRepository(),
  edgeRepository: createEdgeRepository(),
  viewRepository: createViewRepository(),
  nodeSemanticRepository: createNodeSemanticRepository(),
  edgeSemanticRepository: createEdgeSemanticRepository(),
  nodeTagRepository: createNodeTagRepository(),
  workspaceRepository: createWorkspaceRepository(),
  workspaceMemberRepository: createWorkspaceMemberRepository(),
  nodeDao: createNodeDao(),
  edgeDao: createEdgeDao(),
  viewDao: createViewDao(),
  userDao: createUserDao(),
  nodeSemanticDao: createNodeSemanticDao(),
  edgeSemanticDao: createEdgeSemanticDao(),
  nodeTagDao: createNodeTagDao(),
  documentAnalyzer: createDocumentAnalyzer(),
  fileStore: createFileStore(),
  storageUsageReader: createStorageUsageReader(),
  mediaAnalysisStore: createMediaAnalysisStore(),
  videoTranscoder: createVideoTranscoder(),
});

export {
  createPocketBaseClient,
  getPocketBaseClient,
} from "@workspace/infrastructure";

/** Dashboard persistence uses the verified request identity rather than global auth. */
export const createDashboardRepository = (
  token: string,
): IDashboardRepository =>
  new PocketBaseDashboardRepository(getPocketBaseClient(), token);
