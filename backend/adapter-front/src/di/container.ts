/**
 * Dependency Injection Container for adapter-front
 *
 * Provides singleton instances of:
 * - PocketBase client (initialized once at startup)
 * - Repositories (via adapter-back factory)
 * - Application services (command + query services)
 * - InMemoryEventBus for domain event handling
 *
 * Usage:
 * ```typescript
 * // Initialize once at app startup
 * await AppContainer.initialize('http://127.0.0.1:8090');
 *
 * // Get the singleton instance anywhere in the app
 * const container = AppContainer.getInstance();
 * const nodeService = container.nodeCommandService;
 * ```
 */

import { createPocketBaseClient, getPocketBaseClient, InMemoryEventBus } from "@workspace/infrastructure";
import {
  createNodeDao,
  createEdgeDao,
  createViewDao,
  createUserDao,
  createNodeSemanticDao,
  createEdgeSemanticDao,
  createNodeTagDao,
} from "@workspace/adapter-back/factory";
import {
  NodeCommandService,
  NodeQueryService,
  EdgeCommandService,
  EdgeQueryService,
  ViewCommandService,
  ViewQueryService,
  SemanticCommandService,
  SemanticQueryService,
} from "@workspace/application";
import { initializeEventBridge } from "./event-bridge";

export class AppContainer {
  private static _instance: AppContainer | null = null;

  // PocketBase client (singleton via infrastructure)
  readonly pb = getPocketBaseClient();

  // Event Bus (singleton instance)
  readonly eventBus: InMemoryEventBus;

  // DAOs (singletons via adapter-back factory)
  readonly nodeDao = createNodeDao();
  readonly edgeDao = createEdgeDao();
  readonly viewDao = createViewDao();
  readonly userDao = createUserDao();
  readonly nodeSemanticDao = createNodeSemanticDao();
  readonly edgeSemanticDao = createEdgeSemanticDao();
  readonly nodeTagDao = createNodeTagDao();

  // Application Command Services (require repository + eventBus)
  readonly nodeCommandService: NodeCommandService;
  readonly edgeCommandService: EdgeCommandService;
  readonly viewCommandService: ViewCommandService;
  readonly semanticCommandService: SemanticCommandService;

  // Application Query Services (require repository only)
  readonly nodeQueryService: NodeQueryService;
  readonly edgeQueryService: EdgeQueryService;
  readonly viewQueryService: ViewQueryService;
  readonly semanticQueryService: SemanticQueryService;

  private constructor() {
    this.eventBus = new InMemoryEventBus();

    this.nodeCommandService = new NodeCommandService(
      this.nodeDao,
      this.eventBus,
    );
    this.edgeCommandService = new EdgeCommandService(
      this.edgeDao,
      this.eventBus,
    );
    this.viewCommandService = new ViewCommandService(
      this.viewDao,
      this.eventBus,
    );
    this.semanticCommandService = new SemanticCommandService(
      this.nodeSemanticDao,
      this.edgeSemanticDao,
      this.nodeTagDao,
      this.eventBus,
    );

    this.nodeQueryService = new NodeQueryService(this.nodeDao);
    this.edgeQueryService = new EdgeQueryService(this.edgeDao);
    this.viewQueryService = new ViewQueryService(this.viewDao);
    this.semanticQueryService = new SemanticQueryService(
      this.nodeSemanticDao,
      this.edgeSemanticDao,
      this.nodeTagDao,
    );
  }

  /**
   * Get the singleton instance
   * @throws Error if not initialized
   */
  static getInstance(): AppContainer {
    if (!AppContainer._instance) {
      throw new Error(
        "AppContainer not initialized. Call AppContainer.initialize(pbUrl) first.",
      );
    }
    return AppContainer._instance;
  }

  /**
   * Initialize the container with PocketBase URL
   * Must be called once at application startup before any other operations
   *
   * @param pbUrl - PocketBase server URL (e.g., 'http://127.0.0.1:8090')
   * @returns The initialized AppContainer singleton
   */
  static async initialize(pbUrl: string): Promise<AppContainer> {
    if (AppContainer._instance) {
      console.warn("AppContainer already initialized. Returning existing instance.");
      return AppContainer._instance;
    }

    createPocketBaseClient({ url: pbUrl });
    AppContainer._instance = new AppContainer();
    initializeEventBridge();

    return AppContainer._instance;
  }

  /**
   * Check if container has been initialized
   */
  static isInitialized(): boolean {
    return AppContainer._instance !== null;
  }

  /**
   * Reset container (for testing purposes only)
   */
  static reset(): void {
    AppContainer._instance = null;
  }
}

// Export singleton accessor for convenience
export const container = AppContainer.getInstance;
